// Zustand store untuk manajemen budget per kategori
import { create } from 'zustand';
import {
    fetchBudgetsWithSpent,
    upsertBudget,
    deleteBudget,
    fetchBudgetSummary,
    type BudgetWithSpent,
} from '../database/budgetQueries';
import { rescheduleCrossFeatureReminders } from '../utils/notificationService';

interface BudgetState {
    budgets: BudgetWithSpent[];
    isLoading: boolean;
    currentMonth: number;
    currentYear: number;
    totalBudget: number;
    totalSpent: number;
    categoriesOver: number;

    loadBudgets: (month?: number, year?: number) => Promise<void>;
    saveBudget: (
        category: string,
        amount: number,
        month?: number,
        year?: number,
        options?: { reminder_enabled?: boolean; reminder_time?: string | null }
    ) => Promise<void>;
    removeBudget: (id: string) => Promise<void>;
    refreshSummary: () => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set, get) => {
    const now = new Date();
    return {
        budgets: [],
        isLoading: false,
        currentMonth: now.getMonth() + 1,
        currentYear: now.getFullYear(),
        totalBudget: 0,
        totalSpent: 0,
        categoriesOver: 0,

        loadBudgets: async (month?: number, year?: number) => {
            const m = month ?? get().currentMonth;
            const y = year ?? get().currentYear;
            set({ isLoading: true, currentMonth: m, currentYear: y });
            try {
                const data = await fetchBudgetsWithSpent(m, y);
                set({ budgets: data });
                const summary = await fetchBudgetSummary(m, y);
                set({
                    totalBudget: summary.totalBudget,
                    totalSpent: summary.totalSpent,
                    categoriesOver: summary.categoriesOver,
                });
            } finally {
                set({ isLoading: false });
            }
        },

        saveBudget: async (category, amount, month?, year?, options?) => {
            const m = month ?? get().currentMonth;
            const y = year ?? get().currentYear;
            await upsertBudget(category, amount, m, y, options);
            await get().loadBudgets(m, y);
            await rescheduleCrossFeatureReminders();
        },

        removeBudget: async (id) => {
            await deleteBudget(id);
            set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }));
            await get().refreshSummary();
            await rescheduleCrossFeatureReminders();
        },

        refreshSummary: async () => {
            const { currentMonth: m, currentYear: y } = get();
            const summary = await fetchBudgetSummary(m, y);
            set({
                totalBudget: summary.totalBudget,
                totalSpent: summary.totalSpent,
                categoriesOver: summary.categoriesOver,
            });
        },
    };
});
