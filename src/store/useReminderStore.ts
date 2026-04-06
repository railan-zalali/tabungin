import { create } from 'zustand';
import type { AppReminder } from '../database/reminderQueries';
import {
    deleteAppReminder,
    fetchAppReminders,
    insertAppReminder,
    updateAppReminder,
} from '../database/reminderQueries';
import { useAuthStore } from './useAuthStore';
import { rescheduleCrossFeatureReminders } from '../utils/notificationService';
import { syncDatabase } from '../database/sync';

interface ReminderState {
    reminders: AppReminder[];
    isLoading: boolean;
    loadReminders: () => Promise<void>;
    addReminder: (reminder: Omit<AppReminder, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => Promise<void>;
    editReminder: (id: string, updates: Partial<Omit<AppReminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<void>;
    removeReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
    reminders: [],
    isLoading: false,

    loadReminders: async () => {
        set({ isLoading: true });
        try {
            const userId = useAuthStore.getState().user?.id;
            if (!userId) return;

            await syncDatabase().catch(() => undefined);
            const reminders = await fetchAppReminders(userId);
            set({ reminders });
        } finally {
            set({ isLoading: false });
        }
    },

    addReminder: async (reminder) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;

        const created = await insertAppReminder({
            ...reminder,
            user_id: userId,
        });

        set((state) => ({
            reminders: [...state.reminders, created].sort((a, b) => a.trigger_at - b.trigger_at),
        }));

        await rescheduleCrossFeatureReminders();
        syncDatabase().catch(() => undefined);
    },

    editReminder: async (id, updates) => {
        await updateAppReminder(id, updates);
        set((state) => ({
            reminders: state.reminders.map((reminder) =>
                reminder.id === id ? { ...reminder, ...updates, updated_at: Date.now() } : reminder,
            ),
        }));
        await rescheduleCrossFeatureReminders();
        syncDatabase().catch(() => undefined);
    },

    removeReminder: async (id) => {
        await deleteAppReminder(id);
        set((state) => ({
            reminders: state.reminders.filter((reminder) => reminder.id !== id),
        }));
        await rescheduleCrossFeatureReminders();
        syncDatabase().catch(() => undefined);
    },
}));
