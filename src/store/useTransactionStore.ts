// Zustand store untuk manajemen state transaksi
import { create } from 'zustand';
import type { Transaction, TransactionFilter, DailySummary, CategorySummary, MonthlySummary } from '../types/transaction';
import {
    fetchTransactions,
    fetchTransactionById,
    fetchRecentTransactions,
    insertTransaction,
    updateTransaction,
    deleteTransaction,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchMonthlyData,
} from '../database/transactionQueries';
import { isSameDay, startOfDay, endOfDay } from '../utils/date';
import { useWalletStore } from './useWalletStore';
import { useProfileStore } from './useProfileStore';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../lib/supabase';
import { handleRealtimePayload, syncDatabase } from '../database/sync';
import { RealtimeChannel } from '@supabase/supabase-js';
interface TransactionState {
    transactions: Transaction[];
    recentTransactions: Transaction[];
    isLoading: boolean;
    filter: TransactionFilter;
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;

    // Actions
    loadTransactions: (filter?: TransactionFilter) => Promise<void>;
    loadRecent: () => Promise<void>;
    addTransaction: (data: Omit<Transaction, 'id' | 'created_at'> & { wallet_id?: string }) => Promise<Transaction>;
    editTransaction: (id: string, data: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    setFilter: (filter: TransactionFilter) => void;
    refreshSummary: () => Promise<void>;
    getCategorySummary: (type: 'expense' | 'income', start: number, end: number) => Promise<CategorySummary[]>;
    getMonthlyData: () => Promise<MonthlySummary[]>;
    getTransactionById: (id: string) => Promise<Transaction | null>;
    
    // Realtime
    realtimeChannel: RealtimeChannel | null;
    initRealtime: () => void;
    stopRealtime: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
    transactions: [],
    recentTransactions: [],
    isLoading: false,
    filter: { type: 'all', period: 'month' },
    totalIncome: 0,
    totalExpense: 0,
    currentBalance: 0,

    loadTransactions: async (filter?: TransactionFilter) => {
        set({ isLoading: true });
        try {
            const profileId = useProfileStore.getState().activeProfileId;
            const userEmail = useAuthStore.getState().user?.email;
            const f = { ...filter ?? get().filter, profile_id: profileId || undefined, userEmail: userEmail || undefined };
            const data = await fetchTransactions(f);
            set({ transactions: data, filter: f });
        } finally {
            set({ isLoading: false });
        }
    },

    loadRecent: async () => {
        const profileId = useProfileStore.getState().activeProfileId;
        const userEmail = useAuthStore.getState().user?.email;
        const data = await fetchRecentTransactions(5, profileId || undefined, userEmail || undefined);
        set({ recentTransactions: data });
    },

    addTransaction: async (data) => {
        const transaction = await insertTransaction(data);
        await get().loadTransactions();
        await get().loadRecent();
        await get().refreshSummary();
        // Refresh saldo wallet
        await useWalletStore.getState().loadWallets();
        syncDatabase().catch(console.error);
        return transaction;
    },

    editTransaction: async (id, data) => {
        await updateTransaction(id, data);
        await get().loadTransactions();
        await get().loadRecent();
        await get().refreshSummary();
        // Refresh saldo wallet (jika ada perubahan wallet atau amount - TODO: handle complex logic)
        await useWalletStore.getState().loadWallets();
        syncDatabase().catch(console.error);
    },

    removeTransaction: async (id) => {
        await deleteTransaction(id);
        set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
            recentTransactions: state.recentTransactions.filter((t) => t.id !== id),
        }));
        await get().refreshSummary();
        // Refresh saldo wallet
        await useWalletStore.getState().loadWallets();
        syncDatabase().catch(console.error);
    },

    setFilter: (filter) => {
        set({ filter });
        get().loadTransactions(filter);
    },

    refreshSummary: async () => {
        const profileId = useProfileStore.getState().activeProfileId;
        const userEmail = useAuthStore.getState().user?.email;
        const summary = await fetchMonthlySummary(profileId || undefined, userEmail || undefined);
        set({
            totalIncome: summary.totalIncome,
            totalExpense: summary.totalExpense,
            currentBalance: summary.totalIncome - summary.totalExpense,
        });
    },

    getCategorySummary: (type, start, end) => {
        const profileId = useProfileStore.getState().activeProfileId;
        const userEmail = useAuthStore.getState().user?.email;
        return fetchCategorySummary(type, start, end, profileId || undefined, userEmail || undefined);
    },

    getMonthlyData: () => {
        const profileId = useProfileStore.getState().activeProfileId;
        const userEmail = useAuthStore.getState().user?.email;
        return fetchMonthlyData(profileId || undefined, userEmail || undefined);
    },

    getTransactionById: (id) => {
        const profileId = useProfileStore.getState().activeProfileId;
        const userEmail = useAuthStore.getState().user?.email;
        return fetchTransactionById(id, profileId || undefined, userEmail || undefined);
    },

    realtimeChannel: null,
    initRealtime: () => {
        const channel = get().realtimeChannel;
        if (channel) return;

        console.log('[Realtime] Initializing transactions channel...');
        const newChannel = supabase
            .channel('public:transactions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'transactions' },
                async (payload) => {
                    const changed = await handleRealtimePayload('transactions', payload);
                    if (changed) {
                        get().loadTransactions();
                        get().loadRecent();
                        get().refreshSummary();
                        useWalletStore.getState().loadWallets();
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Connected to transactions channel');
                }
            });

        set({ realtimeChannel: newChannel });
    },
    stopRealtime: () => {
        const channel = get().realtimeChannel;
        if (channel) {
            supabase.removeChannel(channel);
            set({ realtimeChannel: null });
            console.log('[Realtime] Disconnected transactions channel');
        }
    }
}));
