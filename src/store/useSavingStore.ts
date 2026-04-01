// Zustand store untuk manajemen saving goals dan logs
import { create } from 'zustand';
import type { GoalSharingActivity, GoalSharingMember, SavingGoal, SavingLog } from '../types/saving';
import {
    fetchSavingGoals,
    fetchSavingGoalById,
    insertSavingGoal,
    updateSavingGoal,
    deleteSavingGoal,
    fetchSavingLogs,
    insertSavingLog,
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
    clearJustCompleted: () => void;
    setGoalPermission: (goalId: string, userEmail: string, permissionLevel: string) => Promise<void>;
    revokeGoalSharing: (goalId: string, userEmail: string) => Promise<void>;
    loadSharingDetails: (goalId: string) => Promise<void>;
    loadSharingActivity: (goalId: string) => Promise<void>;
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
    },

    setGoalPermission: async (goalId: string, userEmail: string, permissionLevel: string) => {
        try {
            await setGoalPermission(goalId, userEmail, permissionLevel);
            // Refresh goals to update sharing status
            await get().loadGoals();
            await get().loadSharingDetails(goalId);
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
    },

    addSavingLog: async (data) => {
        const log = await insertSavingLog(data);

        // Reload goal untuk cek apakah baru saja selesai
        const updatedGoal = await fetchSavingGoalById(data.goal_id);
        if (updatedGoal?.is_completed) {
            const wasAlreadyCompleted = get().goals.find((g) => g.id === data.goal_id)?.is_completed;
            if (!wasAlreadyCompleted) {
                set({ justCompletedGoalId: data.goal_id });
                // Kirim notifikasi goal tercapai dan cancel reminder-nya
                await sendGoalCompletedNotification(updatedGoal);
                await cancelGoalReminder(data.goal_id);
            }
        }

        await get().loadGoals();
        await get().loadGoalById(data.goal_id);
        await get().loadLogs(data.goal_id);
        await get().loadSharingDetails(data.goal_id);
        return log;
    },

    clearJustCompleted: () => set({ justCompletedGoalId: null }),
}));
