// Zustand store untuk manajemen state transaksi
import { create } from 'zustand';
import type { Transaction, TransactionFilter, DailySummary, CategorySummary, MonthlySummary } from '../types/transaction';
import {
    fetchTransactions,
    fetchRecentTransactions,
    insertTransaction,
    updateTransaction,
    deleteTransaction,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchMonthlyData,
} from '../database/transactionQueries';
import { isSameDay, startOfDay, endOfDay } from '../utils/date';

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
    addTransaction: (data: Omit<Transaction, 'id' | 'created_at'>) => Promise<Transaction>;
    editTransaction: (id: string, data: Partial<Omit<Transaction, 'id' | 'created_at'>>) => Promise<void>;
    removeTransaction: (id: string) => Promise<void>;
    setFilter: (filter: TransactionFilter) => void;
    refreshSummary: () => Promise<void>;
    getCategorySummary: (type: 'expense' | 'income', start: number, end: number) => Promise<CategorySummary[]>;
    getMonthlyData: () => Promise<MonthlySummary[]>;
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
            const f = filter ?? get().filter;
            const data = await fetchTransactions(f);
            set({ transactions: data, filter: f });
        } finally {
            set({ isLoading: false });
        }
    },

    loadRecent: async () => {
        const data = await fetchRecentTransactions(5);
        set({ recentTransactions: data });
    },

    addTransaction: async (data) => {
        const transaction = await insertTransaction(data);
        await get().loadTransactions();
        await get().loadRecent();
        await get().refreshSummary();
        return transaction;
    },

    editTransaction: async (id, data) => {
        await updateTransaction(id, data);
        await get().loadTransactions();
        await get().loadRecent();
        await get().refreshSummary();
    },

    removeTransaction: async (id) => {
        await deleteTransaction(id);
        set((state) => ({
            transactions: state.transactions.filter((t) => t.id !== id),
            recentTransactions: state.recentTransactions.filter((t) => t.id !== id),
        }));
        await get().refreshSummary();
    },

    setFilter: (filter) => {
        set({ filter });
        get().loadTransactions(filter);
    },

    refreshSummary: async () => {
        const summary = await fetchMonthlySummary();
        set({
            totalIncome: summary.totalIncome,
            totalExpense: summary.totalExpense,
            currentBalance: summary.totalIncome - summary.totalExpense,
        });
    },

    getCategorySummary: (type, start, end) => fetchCategorySummary(type, start, end),

    getMonthlyData: () => fetchMonthlyData(),
}));
