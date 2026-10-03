// Zustand store untuk manajemen debt tracking (utang & piutang)
import { create } from 'zustand';
import type { Debt, DebtPayment, DebtSummary } from '../types/debt';
import {
    fetchDebts,
    fetchDebtById,
    fetchDebtPayments,
    insertDebt,
    updateDebt,
    deleteDebt,
    insertDebtPayment,
    deleteDebtPayment,
    fetchDebtSummary,
} from '../database/debtQueries';
import { useProfileStore } from './useProfileStore';
import { useAuthStore } from './useAuthStore';

interface DebtState {
    debts: Debt[];
    activeDebts: Debt[];
    paidDebts: Debt[];
    currentDebt: Debt | null;
    currentPayments: DebtPayment[];
    summary: DebtSummary | null;
    isLoading: boolean;

    loadDebts: (filter?: 'active' | 'paid' | 'all') => Promise<void>;
    loadDebtById: (id: string) => Promise<void>;
    loadPayments: (debtId: string) => Promise<void>;
    loadSummary: () => Promise<void>;
    addDebt: (data: Omit<Debt, 'id' | 'created_at' | 'updated_at' | 'remaining_amount'> & { remaining_amount?: number }) => Promise<Debt>;
    editDebt: (id: string, data: Partial<Omit<Debt, 'id' | 'created_at'>>) => Promise<void>;
    removeDebt: (id: string) => Promise<void>;
    addPayment: (data: Omit<DebtPayment, 'id' | 'created_at' | 'updated_at'>) => Promise<DebtPayment>;
    removePayment: (paymentId: string, debtId: string, amount: number) => Promise<void>;
}

export const useDebtStore = create<DebtState>((set, get) => ({
    debts: [],
    activeDebts: [],
    paidDebts: [],
    currentDebt: null,
    currentPayments: [],
    summary: null,
    isLoading: false,

    loadDebts: async (filter = 'all') => {
        set({ isLoading: true });
        try {
            const profileId = useProfileStore.getState().activeProfileId;
            const all = await fetchDebts(profileId || undefined, filter);
            set({
                debts: all,
                activeDebts: all.filter((d) => d.status === 'active'),
                paidDebts: all.filter((d) => d.status === 'paid'),
            });
        } finally {
            set({ isLoading: false });
        }
    },

    loadDebtById: async (id: string) => {
        set({ isLoading: true });
        try {
            const debt = await fetchDebtById(id);
            set({ currentDebt: debt });
        } finally {
            set({ isLoading: false });
        }
    },

    loadPayments: async (debtId: string) => {
        const payments = await fetchDebtPayments(debtId);
        set({ currentPayments: payments });
    },

    loadSummary: async () => {
        const profileId = useProfileStore.getState().activeProfileId;
        const summary = await fetchDebtSummary(profileId || undefined);
        set({ summary });
    },

    addDebt: async (data) => {
        const userId = useAuthStore.getState().user?.id ?? '';
        const debt = await insertDebt({ ...data, user_id: data.user_id || userId });
        await get().loadDebts();
        await get().loadSummary();
        return debt;
    },

    editDebt: async (id, data) => {
        await updateDebt(id, data);
        await get().loadDebts();
        await get().loadSummary();
    },

    removeDebt: async (id) => {
        await deleteDebt(id);
        await get().loadDebts();
        await get().loadSummary();
    },

    addPayment: async (data) => {
        const payment = await insertDebtPayment(data);
        // Reload current debt to reflect updated remaining_amount
        const currentDebt = get().currentDebt;
        if (currentDebt?.id === data.debt_id) {
            await get().loadDebtById(data.debt_id);
            await get().loadPayments(data.debt_id);
        }
        await get().loadDebts();
        await get().loadSummary();
        return payment;
    },

    removePayment: async (paymentId, debtId, amount) => {
        await deleteDebtPayment(paymentId, debtId, amount);
        await get().loadDebtById(debtId);
        await get().loadPayments(debtId);
        await get().loadDebts();
        await get().loadSummary();
    },
}));
