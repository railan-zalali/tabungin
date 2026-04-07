// Zustand store untuk manajemen saving goals dan logs
import { create } from 'zustand';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { GoalSharingActivity, GoalSharingMember, SavingGoal, SavingLog } from '../types/saving';
import {
    fetchSavingGoals,
    fetchSavingGoalById,
    insertSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    fetchSavingLogs,
    insertSavingLog,
    updateSavingLog,
    deleteSavingLog,
    setGoalPermission,
    revokeGoalSharing,
    getGoalSharingStatus,
    getSharingActivityLog,
} from '../database/savingQueries';
import {
    scheduleGoalReminder,
    cancelGoalReminder,
    rescheduleAllReminders,
    sendGoalCompletedNotification,
} from '../utils/notificationService';
import { useProfileStore } from './useProfileStore';
import { useAuthStore } from './useAuthStore';
import { useWalletStore } from './useWalletStore';
import { supabase } from '../lib/supabase';
import { handleRealtimePayload, syncDatabase } from '../database/sync';

function triggerBackgroundSyncIfAllowed() {
    if (!useAuthStore.getState().canSync) return;
    syncDatabase().catch(console.error);
}

function resolveGoalIdFromRealtimePayload(payload: any): string | null {
    if (!payload) return null;
    return payload.new?.goal_id ?? payload.old?.goal_id ?? payload.new?.id ?? payload.old?.id ?? null;
}

async function refreshContributionState(goalId: string, previousWasCompleted?: boolean): Promise<SavingGoal | null> {
    const updatedGoal = await fetchSavingGoalById(goalId);

    if (updatedGoal?.is_completed && !previousWasCompleted) {
        await sendGoalCompletedNotification(updatedGoal);
        await cancelGoalReminder(goalId);
    } else if (updatedGoal && !updatedGoal.is_completed && previousWasCompleted) {
        if (updatedGoal.reminder_enabled) {
            await scheduleGoalReminder(updatedGoal);
        }
    }

    return updatedGoal;
}

interface SavingState {
    goals: SavingGoal[];
    activeGoals: SavingGoal[];
    completedGoals: SavingGoal[];
    currentGoal: SavingGoal | null;
    currentLogs: SavingLog[];
    sharingMembers: GoalSharingMember[];
    sharingActivity: GoalSharingActivity[];
    isLoading: boolean;
    justCompletedGoalId: string | null; // untuk trigger konfeti

    // Actions
    loadGoals: () => Promise<void>;
    loadGoalById: (id: string) => Promise<void>;
    loadLogs: (goalId: string) => Promise<void>;
    addGoal: (data: Omit<SavingGoal, 'id' | 'created_at'>) => Promise<SavingGoal>;
    editGoal: (id: string, data: Partial<Omit<SavingGoal, 'id' | 'created_at'>>) => Promise<void>;
    removeGoal: (id: string) => Promise<void>;
    addSavingLog: (data: Omit<SavingLog, 'id' | 'created_at'>) => Promise<SavingLog>;
    editSavingLog: (id: string, data: Partial<Pick<SavingLog, 'amount' | 'note' | 'date'>>) => Promise<SavingLog>;
    removeSavingLog: (id: string) => Promise<void>;
    clearJustCompleted: () => void;
    setGoalPermission: (goalId: string, userEmail: string, permissionLevel: string) => Promise<void>;
    revokeGoalSharing: (goalId: string, userEmail: string) => Promise<void>;
    loadSharingDetails: (goalId: string) => Promise<void>;
    loadSharingActivity: (goalId: string) => Promise<void>;
    realtimeChannels: RealtimeChannel[];
    initRealtime: () => void;
    stopRealtime: () => void;
}

export const useSavingStore = create<SavingState>((set, get) => ({
    goals: [],
    activeGoals: [],
    completedGoals: [],
    currentGoal: null,
    currentLogs: [],
    sharingMembers: [],
    sharingActivity: [],
    isLoading: false,
    justCompletedGoalId: null,
    realtimeChannels: [],

    loadGoals: async () => {
        set({ isLoading: true });
        try {
            const profileId = useProfileStore.getState().activeProfileId;
            const userEmail = useAuthStore.getState().user?.email;
            const all = await fetchSavingGoals('all', profileId || undefined, userEmail || undefined);
            set({
                goals: all,
                activeGoals: all.filter((g) => !g.is_completed),
                completedGoals: all.filter((g) => g.is_completed),
            });
            // Re-schedule semua reminder untuk goals aktif
            await rescheduleAllReminders(all);
        } finally {
            set({ isLoading: false });
        }
    },

    loadGoalById: async (id: string) => {
        const goal = await fetchSavingGoalById(id);
        set({ currentGoal: goal });
    },

    loadLogs: async (goalId: string) => {
        const logs = await fetchSavingLogs(goalId);
        set({ currentLogs: logs });
    },

    loadSharingDetails: async (goalId: string) => {
        try {
            const [sharingMembers, sharingActivity] = await Promise.all([
                getGoalSharingStatus(goalId).catch((error) => {
                    console.error('Error loading goal sharing status:', error);
                    return [];
                }),
                getSharingActivityLog(goalId).catch((error) => {
                    console.error('Error loading sharing activity:', error);
                    return [];
                }),
            ]);

            set({ sharingMembers, sharingActivity });
        } catch (error) {
            console.error('Error loading sharing details:', error);
            set({ sharingMembers: [], sharingActivity: [] });
        }
    },

    addGoal: async (data) => {
        const profileId = useProfileStore.getState().activeProfileId;
        const goal = await insertSavingGoal({
            ...data,
            profile_id: data.profile_id || profileId || undefined,
        });
        if (goal.reminder_enabled) {
            await scheduleGoalReminder(goal);
        }
        await get().loadGoals();
        triggerBackgroundSyncIfAllowed();
        return goal;
    },

    editGoal: async (id, data) => {
        await updateSavingGoal(id, data);
        // Re-schedule / cancel reminder berdasarkan setting terbaru
        const updated = await fetchSavingGoalById(id);
        if (updated) {
            if (updated.reminder_enabled) {
                await scheduleGoalReminder(updated);
            } else {
                await cancelGoalReminder(id);
            }
        }
        await get().loadGoals();
        if (get().currentGoal?.id === id) {
            await get().loadGoalById(id);
        }
        triggerBackgroundSyncIfAllowed();
    },

    setGoalPermission: async (goalId: string, userEmail: string, permissionLevel: string) => {
        try {
            await setGoalPermission(goalId, userEmail, permissionLevel);
            // Refresh goals to update sharing status
            await get().loadGoals();
            await get().loadSharingDetails(goalId);
            triggerBackgroundSyncIfAllowed();
        } catch (error) {
            console.error('Error setting goal permission:', error);
            throw error;
        }
    },

    revokeGoalSharing: async (goalId: string, userEmail: string) => {
        try {
            await revokeGoalSharing(goalId, userEmail);
            await get().loadGoals();
            await get().loadSharingDetails(goalId);
            triggerBackgroundSyncIfAllowed();
        } catch (error) {
            console.error('Error revoking goal sharing:', error);
            throw error;
        }
    },

    loadSharingActivity: async (goalId: string) => {
        try {
            const activity = await getSharingActivityLog(goalId);
            set({ sharingActivity: activity });
        } catch (error) {
            console.error('Error loading sharing activity:', error);
            set({ sharingActivity: [] });
        }
    },

    removeGoal: async (id) => {
        await cancelGoalReminder(id);
        await deleteSavingGoal(id);
        set((state) => ({
            goals: state.goals.filter((g) => g.id !== id),
            activeGoals: state.activeGoals.filter((g) => g.id !== id),
            completedGoals: state.completedGoals.filter((g) => g.id !== id),
        }));
        await useWalletStore.getState().loadWallets();
        triggerBackgroundSyncIfAllowed();
    },

    addSavingLog: async (data) => {
        const log = await insertSavingLog(data);
        const wasAlreadyCompleted = get().goals.find((g) => g.id === data.goal_id)?.is_completed;

        const updatedGoal = await refreshContributionState(data.goal_id, wasAlreadyCompleted);
        if (updatedGoal?.is_completed) {
            if (!wasAlreadyCompleted) {
                set({ justCompletedGoalId: data.goal_id });
            }
        }

        await get().loadGoals();
        await get().loadGoalById(data.goal_id);
        await get().loadLogs(data.goal_id);
        await get().loadSharingDetails(data.goal_id);
        await useWalletStore.getState().loadWallets();
        triggerBackgroundSyncIfAllowed();
        return log;
    },

    editSavingLog: async (id, data) => {
        const activeGoalId = get().currentGoal?.id;
        const previousWasCompleted = get().currentGoal?.is_completed;
        const log = await updateSavingLog(id, data);
        const updatedGoal = await refreshContributionState(log.goal_id, previousWasCompleted);

        if (updatedGoal?.is_completed && !previousWasCompleted) {
            set({ justCompletedGoalId: log.goal_id });
        }

        await get().loadGoals();
        await get().loadGoalById(log.goal_id);
        await get().loadLogs(log.goal_id);
        await get().loadSharingDetails(log.goal_id);
        await useWalletStore.getState().loadWallets();

        if (activeGoalId && activeGoalId !== log.goal_id) {
            await get().loadGoalById(activeGoalId);
        }

        triggerBackgroundSyncIfAllowed();
        return log;
    },

    removeSavingLog: async (id) => {
        const goalId = get().currentGoal?.id;
        if (!goalId) {
            throw new Error('Target aktif tidak ditemukan.');
        }

        const previousWasCompleted = get().currentGoal?.is_completed;
        await deleteSavingLog(id);
        await refreshContributionState(goalId, previousWasCompleted);
        await get().loadGoals();
        await get().loadGoalById(goalId);
        await get().loadLogs(goalId);
        await get().loadSharingDetails(goalId);
        await useWalletStore.getState().loadWallets();
        triggerBackgroundSyncIfAllowed();
    },

    clearJustCompleted: () => set({ justCompletedGoalId: null }),
    initRealtime: () => {
        if (!useAuthStore.getState().canSync) return;
        if (get().realtimeChannels.length > 0) return;

        const handleRefresh = async (payload: any) => {
            const goalId = resolveGoalIdFromRealtimePayload(payload);
            await get().loadGoals();

            const activeGoalId = get().currentGoal?.id;
            if (activeGoalId && (goalId === activeGoalId || payload?.new?.goal_id === activeGoalId || payload?.old?.goal_id === activeGoalId)) {
                await get().loadGoalById(activeGoalId);
                await get().loadLogs(activeGoalId);
                await get().loadSharingDetails(activeGoalId);
            }

            await useWalletStore.getState().loadWallets();
        };

        const goalsChannel = supabase
            .channel('public:saving_goals')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'saving_goals' }, async (payload) => {
                const changed = await handleRealtimePayload('saving_goals', payload);
                if (changed) {
                    await handleRefresh(payload);
                }
            })
            .subscribe();

        const logsChannel = supabase
            .channel('public:saving_logs')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'saving_logs' }, async (payload) => {
                const changed = await handleRealtimePayload('saving_logs', payload);
                if (changed) {
                    await handleRefresh(payload);
                }
            })
            .subscribe();

        set({ realtimeChannels: [goalsChannel, logsChannel] });
    },
    stopRealtime: () => {
        for (const channel of get().realtimeChannels) {
            supabase.removeChannel(channel);
        }
        set({ realtimeChannels: [] });
    },
}));
