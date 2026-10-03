import { useCategoryStore } from '../../src/store/useCategoryStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import type { TransactionCategory } from '../../src/database/categoryQueries';

jest.mock('../../src/database/categoryQueries', () => ({
    fetchLocalCategories: jest.fn().mockResolvedValue([]),
    insertCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
    syncRemoteCategories: jest.fn().mockResolvedValue(undefined),
    initializeDefaultCategories: jest.fn().mockResolvedValue(undefined),
}));

// Muat referensi mock untuk assert
// eslint-disable-next-line @typescript-eslint/no-var-requires
const queryMocks = require('../../src/database/categoryQueries') as {
    fetchLocalCategories: jest.Mock;
    insertCategory: jest.Mock;
    updateCategory: jest.Mock;
    deleteCategory: jest.Mock;
    syncRemoteCategories: jest.Mock;
    initializeDefaultCategories: jest.Mock;
};

const expenseCat = {
    id: 'c1',
    name: 'Makan',
    icon: 'food',
    color: '#F59E0B',
    type: 'expense',
    is_default: false,
    user_id: 'u1',
    created_at: 1,
} as unknown as TransactionCategory;

const incomeCat = {
    id: 'c2',
    name: 'Gaji',
    icon: 'briefcase',
    color: '#1DB954',
    type: 'income',
    is_default: false,
    user_id: 'u1',
    created_at: 1,
} as unknown as TransactionCategory;

describe('useCategoryStore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useCategoryStore.setState({
            categories: [],
            incomeCategories: [],
            expenseCategories: [],
            isLoading: false,
        });
        // user login
        useAuthStore.setState({ user: { id: 'u1', email: 'a@b.c' } as never });
    });

    it('loadCategories populates income/expense buckets', async () => {
        queryMocks.fetchLocalCategories.mockResolvedValue([expenseCat, incomeCat]);

        await useCategoryStore.getState().loadCategories();

        expect(useCategoryStore.getState().categories).toHaveLength(2);
        expect(useCategoryStore.getState().expenseCategories).toHaveLength(1);
        expect(useCategoryStore.getState().incomeCategories).toHaveLength(1);
        expect(useCategoryStore.getState().isLoading).toBe(false);
    });

    it('loadCategories is a no-op when logged out', async () => {
        useAuthStore.setState({ user: null });
        await useCategoryStore.getState().loadCategories();
        expect(queryMocks.fetchLocalCategories).not.toHaveBeenCalled();
        expect(useCategoryStore.getState().isLoading).toBe(false);
    });

    it('loadCategories clears loading flag even when fetch fails', async () => {
        queryMocks.fetchLocalCategories.mockRejectedValue(new Error('db down'));
        const err = jest.spyOn(console, 'error').mockImplementation(() => {});

        await expect(useCategoryStore.getState().loadCategories()).rejects.toThrow('db down');
        expect(useCategoryStore.getState().isLoading).toBe(false);

        err.mockRestore();
    });

    it('loadCategories still succeeds when remote sync fails', async () => {
        queryMocks.syncRemoteCategories.mockRejectedValue(new Error('offline'));
        queryMocks.fetchLocalCategories.mockResolvedValue([expenseCat]);
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await useCategoryStore.getState().loadCategories();

        expect(useCategoryStore.getState().categories).toHaveLength(1);
        warn.mockRestore();
    });

    it('loadCategoriesByType filters by requested type', async () => {
        await useCategoryStore.getState().loadCategoriesByType('expense');
        expect(queryMocks.fetchLocalCategories).toHaveBeenCalledWith('u1', 'expense');
    });

    it('addCategory appends and re-buckets categories', async () => {
        queryMocks.insertCategory.mockResolvedValue(expenseCat);

        await useCategoryStore.getState().addCategory({
            name: 'Makan',
            icon: 'food',
            color: '#F59E0B',
            type: 'expense',
            user_id: 'u1',
        } as never);

        expect(useCategoryStore.getState().categories).toHaveLength(1);
        expect(useCategoryStore.getState().expenseCategories).toHaveLength(1);
        expect(useCategoryStore.getState().incomeCategories).toHaveLength(0);
    });

    it('addCategory is a no-op when logged out', async () => {
        useAuthStore.setState({ user: null });
        await useCategoryStore.getState().addCategory({ type: 'expense' } as never);
        expect(queryMocks.insertCategory).not.toHaveBeenCalled();
    });

    it('updateCategory patches the matching category', async () => {
        useCategoryStore.setState({ categories: [expenseCat] });
        queryMocks.updateCategory.mockResolvedValue(undefined);

        await useCategoryStore.getState().updateCategory('c1', { name: 'Makan Baru' });

        expect(useCategoryStore.getState().categories[0].name).toBe('Makan Baru');
        expect(queryMocks.updateCategory).toHaveBeenCalledWith('c1', { name: 'Makan Baru' });
    });

    it('updateCategory leaves other categories untouched', async () => {
        useCategoryStore.setState({ categories: [expenseCat, incomeCat] });
        await useCategoryStore.getState().updateCategory('c1', { name: 'X' });
        expect(useCategoryStore.getState().categories[1].name).toBe('Gaji');
    });

    it('deleteCategory removes the matching category', async () => {
        useCategoryStore.setState({ categories: [expenseCat, incomeCat] });
        queryMocks.deleteCategory.mockResolvedValue(undefined);

        await useCategoryStore.getState().deleteCategory('c1');

        expect(useCategoryStore.getState().categories).toHaveLength(1);
        expect(useCategoryStore.getState().categories[0].id).toBe('c2');
    });

    it('initializeDefaultCategories seeds then reloads', async () => {
        await useCategoryStore.getState().initializeDefaultCategories();
        expect(queryMocks.initializeDefaultCategories).toHaveBeenCalledWith('u1');
        expect(queryMocks.fetchLocalCategories).toHaveBeenCalled();
    });

    it('initializeDefaultCategories is a no-op when logged out', async () => {
        useAuthStore.setState({ user: null });
        await useCategoryStore.getState().initializeDefaultCategories();
        expect(queryMocks.initializeDefaultCategories).not.toHaveBeenCalled();
    });
});
