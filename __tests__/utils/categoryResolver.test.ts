import {
    resolveCategoriesForType,
    resolveCategoryByKey,
} from '../../src/utils/categoryResolver';
import type { TransactionCategory } from '../../src/database/categoryQueries';

const storedExpense: TransactionCategory = {
    id: 'custom-expense',
    name: 'Kopi',
    icon: 'coffee',
    color: '#ABCDEF',
    type: 'expense',
    is_default: false,
} as TransactionCategory;

const storedIncome: TransactionCategory = {
    id: 'custom-income',
    name: 'Bonus',
    icon: 'gift',
    color: '#FEDCBA',
    type: 'income',
    is_default: false,
} as TransactionCategory;

describe('resolveCategoriesForType', () => {
    it('returns expense fallback categories when no stored categories', () => {
        const result = resolveCategoriesForType('expense');
        expect(result.length).toBeGreaterThan(0);
        expect(result.every((c) => c.type === 'expense')).toBe(true);
        expect(result.every((c) => c.is_default === true)).toBe(true);
    });

    it('returns income fallback categories when no stored categories', () => {
        const result = resolveCategoriesForType('income');
        expect(result.length).toBeGreaterThan(0);
        expect(result.every((c) => c.type === 'income')).toBe(true);
    });

    it('merges stored categories of the matching type', () => {
        const result = resolveCategoriesForType('expense', [storedExpense, storedIncome]);
        const custom = result.find((c) => c.id === 'custom-expense');
        expect(custom).toBeDefined();
        expect(custom?.is_default).toBe(false);
        // kategori income tidak boleh bocor ke daftar expense
        expect(result.find((c) => c.id === 'custom-income')).toBeUndefined();
    });

    it('includes stored categories with type "both"', () => {
        const both = {
            id: 'both-cat',
            name: 'Umum',
            icon: 'tag',
            color: '#123456',
            type: 'both',
            is_default: false,
        } as unknown as TransactionCategory;

        const expenseList = resolveCategoriesForType('expense', [both]);
        const incomeList = resolveCategoriesForType('income', [both]);

        expect(expenseList.find((c) => c.id === 'both-cat')).toBeDefined();
        expect(incomeList.find((c) => c.id === 'both-cat')).toBeDefined();
    });

    it('does not duplicate stored categories that share a name with fallback', () => {
        const result = resolveCategoriesForType('expense', [
            { ...storedExpense, id: 'food' } as TransactionCategory,
        ]);
        const ids = result.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('normalizes unknown icons to a valid glyph', () => {
        const result = resolveCategoriesForType('expense', [
            { ...storedExpense, icon: 'not-a-real-icon' } as TransactionCategory,
        ]);
        const custom = result.find((c) => c.id === 'custom-expense');
        expect(custom?.icon).toBe('tag');
    });
});

describe('resolveCategoryByKey', () => {
    it('finds a category by id across all categories', () => {
        expect(resolveCategoryByKey('food')?.name).toBe('Makan & Minum');
    });

    it('returns undefined for unknown key', () => {
        expect(resolveCategoryByKey('nope')).toBeUndefined();
    });

    it('prefers stored categories over fallback', () => {
        const resolved = resolveCategoryByKey('custom-expense', [storedExpense]);
        expect(resolved?.name).toBe('Kopi');
    });

    it('resolves stored category by name (case-insensitive)', () => {
        const resolved = resolveCategoryByKey('kopi', [storedExpense]);
        expect(resolved?.id).toBe('custom-expense');
    });

    it('resolves legacy category by name', () => {
        expect(resolveCategoryByKey('makan & minum')?.id).toBe('food');
    });
});
