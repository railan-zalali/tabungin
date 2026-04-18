import { create } from 'zustand';
import type { RecurringTransaction, RecurringFrequency } from '../database/recurringQueries';
import {
  fetchLocalRecurringTransactions,
  fetchActiveRecurringTransactions,
  insertRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  calculateNextOccurrence,
  syncRemoteRecurringTransactions,
} from '../database/recurringQueries';
import { useAuthStore } from './useAuthStore';
import { rescheduleCrossFeatureReminders } from '../utils/notificationService';

interface RecurringState {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;

  loadRecurringTransactions: () => Promise<void>;
  loadActiveRecurringTransactions: () => Promise<void>;
  addRecurringTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateRecurringTransaction: (id: string, updates: Partial<RecurringTransaction>) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  toggleRecurringTransaction: (id: string) => Promise<void>;
  generateNextOccurrence: (transaction: RecurringTransaction) => number;
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  recurringTransactions: [],
  isLoading: false,

  loadRecurringTransactions: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;

      try {
        await syncRemoteRecurringTransactions(userId);
      } catch (error) {
        console.warn('Recurring sync skipped, falling back to local cache:', error);
      }
      const transactions = await fetchLocalRecurringTransactions(userId);
      set({ recurringTransactions: transactions });
    } finally {
      set({ isLoading: false });
    }
  },

  loadActiveRecurringTransactions: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;

      try {
        await syncRemoteRecurringTransactions(userId);
      } catch (error) {
        console.warn('Recurring sync skipped, falling back to local cache:', error);
      }
      const transactions = await fetchActiveRecurringTransactions(userId);
      set({ recurringTransactions: transactions });
    } finally {
      set({ isLoading: false });
    }
  },

  addRecurringTransaction: async (transaction) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const newTransaction = await insertRecurringTransaction({
      ...transaction,
      user_id: userId,
    });
    syncRemoteRecurringTransactions(userId).catch((error) => {
      console.warn('Recurring background sync failed after add:', error);
    });
    rescheduleCrossFeatureReminders().catch((error) => {
      console.warn('Recurring reminder reschedule failed after add:', error);
    });

    set((state) => ({
      recurringTransactions: [...state.recurringTransactions, newTransaction].sort(
        (a, b) => a.next_occurrence - b.next_occurrence
      ),
    }));
  },

  updateRecurringTransaction: async (id, updates) => {
    await updateRecurringTransaction(id, updates);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      syncRemoteRecurringTransactions(userId).catch((error) => {
        console.warn('Recurring background sync failed after update:', error);
      });
    }
    rescheduleCrossFeatureReminders().catch((error) => {
      console.warn('Recurring reminder reschedule failed after update:', error);
    });

    set((state) => ({
      recurringTransactions: state.recurringTransactions.map((tx) =>
        tx.id === id ? { ...tx, ...updates } : tx
      ).sort((a, b) => a.next_occurrence - b.next_occurrence),
    }));
  },

  deleteRecurringTransaction: async (id) => {
    await deleteRecurringTransaction(id);
    const userId = useAuthStore.getState().user?.id;
    if (userId) {
      syncRemoteRecurringTransactions(userId).catch((error) => {
        console.warn('Recurring background sync failed after delete:', error);
      });
    }
    rescheduleCrossFeatureReminders().catch((error) => {
      console.warn('Recurring reminder reschedule failed after delete:', error);
    });

    set((state) => ({
      recurringTransactions: state.recurringTransactions.filter((tx) => tx.id !== id),
    }));
  },

  toggleRecurringTransaction: async (id) => {
    const transaction = get().recurringTransactions.find((tx) => tx.id === id);
    if (!transaction) return;

    const isActive = !transaction.is_active;
    await updateRecurringTransaction(id, { is_active: isActive });
    rescheduleCrossFeatureReminders().catch((error) => {
      console.warn('Recurring reminder reschedule failed after toggle:', error);
    });

    set((state) => ({
      recurringTransactions: state.recurringTransactions.map((tx) =>
        tx.id === id ? { ...tx, is_active: isActive } : tx
      ),
    }));
  },

  generateNextOccurrence: (transaction) => {
    return calculateNextOccurrence(transaction);
  },
}));
