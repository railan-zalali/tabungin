import { create } from 'zustand';
import type { TransactionCategory, CategoryType } from '../database/categoryQueries';
import {
  fetchLocalCategories,
  insertCategory,
  updateCategory,
  deleteCategory,
  syncRemoteCategories,
  initializeDefaultCategories,
} from '../database/categoryQueries';
import { useAuthStore } from './useAuthStore';

interface CategoryState {
  categories: TransactionCategory[];
  incomeCategories: TransactionCategory[];
  expenseCategories: TransactionCategory[];
  isLoading: boolean;

  loadCategories: () => Promise<void>;
  loadCategoriesByType: (type: CategoryType) => Promise<void>;
  addCategory: (category: Omit<TransactionCategory, 'id' | 'created_at' | 'is_default'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<TransactionCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  initializeDefaultCategories: () => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  incomeCategories: [],
  expenseCategories: [],
  isLoading: false,

  loadCategories: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      const canSync = useAuthStore.getState().canSync;
      if (!userId) return;

      if (canSync) {
        try {
          await syncRemoteCategories(userId);
        } catch (error) {
          console.warn('Category sync skipped, falling back to local cache:', error);
        }
      }
      const categories = await fetchLocalCategories(userId);

      set({
        categories,
        incomeCategories: categories.filter((c) => c.type === 'income' || c.type === 'both'),
        expenseCategories: categories.filter((c) => c.type === 'expense' || c.type === 'both'),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  loadCategoriesByType: async (type) => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      const canSync = useAuthStore.getState().canSync;
      if (!userId) return;

      if (canSync) {
        try {
          await syncRemoteCategories(userId);
        } catch (error) {
          console.warn('Category sync skipped, falling back to local cache:', error);
        }
      }
      const categories = await fetchLocalCategories(userId, type);

      set({
        categories,
        incomeCategories: categories.filter((c) => c.type === 'income' || c.type === 'both'),
        expenseCategories: categories.filter((c) => c.type === 'expense' || c.type === 'both'),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  addCategory: async (category) => {
    const userId = useAuthStore.getState().user?.id;
    const canSync = useAuthStore.getState().canSync;
    if (!userId) return;

    const newCategory = await insertCategory({ ...category, user_id: userId });
    if (canSync) {
      syncRemoteCategories(userId).catch((error) => {
        console.warn('Category background sync failed after add:', error);
      });
    }

    set((state) => {
      const updated = [...state.categories, newCategory];
      return {
        categories: updated,
        incomeCategories: updated.filter((c) => c.type === 'income' || c.type === 'both'),
        expenseCategories: updated.filter((c) => c.type === 'expense' || c.type === 'both'),
      };
    });
  },

  updateCategory: async (id, updates) => {
    await updateCategory(id, updates);
    const userId = useAuthStore.getState().user?.id;
    const canSync = useAuthStore.getState().canSync;
    if (userId && canSync) {
      syncRemoteCategories(userId).catch((error) => {
        console.warn('Category background sync failed after update:', error);
      });
    }

    set((state) => {
      const updated = state.categories.map((cat) =>
        cat.id === id ? { ...cat, ...updates } : cat
      );

      return {
        categories: updated,
        incomeCategories: updated.filter((c) => c.type === 'income' || c.type === 'both'),
        expenseCategories: updated.filter((c) => c.type === 'expense' || c.type === 'both'),
      };
    });
  },

  deleteCategory: async (id) => {
    await deleteCategory(id);
    const userId = useAuthStore.getState().user?.id;
    const canSync = useAuthStore.getState().canSync;
    if (userId && canSync) {
      syncRemoteCategories(userId).catch((error) => {
        console.warn('Category background sync failed after delete:', error);
      });
    }

    set((state) => {
      const updated = state.categories.filter((cat) => cat.id !== id);

      return {
        categories: updated,
        incomeCategories: updated.filter((c) => c.type === 'income' || c.type === 'both'),
        expenseCategories: updated.filter((c) => c.type === 'expense' || c.type === 'both'),
      };
    });
  },

  initializeDefaultCategories: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await initializeDefaultCategories(userId);
    await get().loadCategories();
  },
}));
