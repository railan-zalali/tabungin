// Integration test transactionQueries di atas SQLite fake in-memory.
// Menguji perilaku yang terikat SQL: filter, scope akses per profile,
// hard vs soft delete, dan penyesuaian saldo dompet.
import { FakeSqlite } from '../../testUtils/fakeSqlite';
import { getInitializedDatabase } from '../../src/database/schema';
import {
    insertTransaction,
    fetchTransactions,
    fetchTransactionById,
    fetchRecentTransactions,
    deleteTransaction,
    updateTransaction,
    fetchMonthlySummary,
    fetchCategorySummary,
    fetchMonthlyData,
} from '../../src/database/transactionQueries';

jest.mock('../../src/database/schema', () => ({
    getInitializedDatabase: jest.fn(),
}));

// uuid unik per transaksi (mock global di jest.setup mengembalikan string tetap).
jest.mock('uuid', () => {
    let counter = 0;
    return { v4: jest.fn(() => `tx-${(counter += 1)}`) };
});

const db = new FakeSqlite();
const mockGetDb = getInitializedDatabase as jest.Mock;

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

const wallet = (over: Record<string, unknown> = {}) => ({
    id: 'w1',
    profile_id: 'p1',
    name: 'Dompet Utama',
    balance: 1000000,
    sync_status: 'synced',
    updated_at: NOW,
    ...over,
});

const expense = (over: Record<string, unknown> = {}) => ({
    type: 'expense' as const,
    amount: 50000,
    category: 'Makan & Minum',
    note: 'Nasi goreng',
    date: NOW - 2 * DAY,
    wallet_id: null as string | null,
    profile_id: 'p1',
    ...over,
});

beforeEach(() => {
    jest.clearAllMocks();
    db.transactions = [];
    db.wallets = [wallet()];
    mockGetDb.mockResolvedValue(db);
});

describe('insertTransaction', () => {
    it('stores a pending_create row and returns the generated id', async () => {
        const created = await insertTransaction(expense() as never);

        expect(created.id).toBe('tx-1');
        expect(db.transactions).toHaveLength(1);
        expect(db.transactions[0]).toMatchObject({
            id: 'tx-1',
            type: 'expense',
            amount: 50000,
            sync_status: 'pending_create',
            profile_id: 'p1',
        });
    });

    it('deduces the profile from the wallet and debits the balance', async () => {
        await insertTransaction(expense({ wallet_id: 'w1', profile_id: undefined }) as never);

        expect(db.transactions[0].profile_id).toBe('p1');
        expect(db.wallets[0].balance).toBe(950000);
    });

    it('credits the balance for income', async () => {
        await insertTransaction(
            expense({ type: 'income', amount: 250000, wallet_id: 'w1' }) as never,
        );

        expect(db.wallets[0].balance).toBe(1250000);
    });

    it('does not touch any balance when there is no wallet', async () => {
        await insertTransaction(expense() as never);

        expect(db.wallets[0].balance).toBe(1000000);
    });
});

describe('fetchTransactions', () => {
    beforeEach(async () => {
        await insertTransaction(
            expense({ date: NOW - 1 * DAY, category: 'Transport', note: 'Bensin' }) as never,
        );
        await insertTransaction(
            expense({ type: 'income', date: NOW - 3 * DAY, amount: 700000, category: 'Gaji' }) as never,
        );
        await insertTransaction(
            expense({ date: NOW - 10 * DAY, category: 'Lainnya', note: 'Hadiah' }) as never,
        );
    });

    it('returns rows newest first', async () => {
        const rows = await fetchTransactions();
        expect(rows).toHaveLength(3);
        expect(rows[0].category).toBe('Transport');
        expect(rows[2].category).toBe('Lainnya');
    });

    it('filters by transaction type', async () => {
        const income = await fetchTransactions({ type: 'income' });
        expect(income).toHaveLength(1);
        expect(income[0].amount).toBe(700000);
    });

    it('filters by a custom date range', async () => {
        const rows = await fetchTransactions({
            period: 'custom',
            startDate: NOW - 5 * DAY,
            endDate: NOW,
        });
        expect(rows).toHaveLength(2);
        expect(rows.map((row) => row.category)).not.toContain('Lainnya');
    });

    it('matches note or category with a search query', async () => {
        const byNote = await fetchTransactions({ searchQuery: 'Bensin' });
        expect(byNote).toHaveLength(1);

        const byCategory = await fetchTransactions({ searchQuery: 'Gaji' });
        expect(byCategory).toHaveLength(1);
    });

    it('restricts results to the active profile', async () => {
        await insertTransaction(
            expense({ date: NOW - 1 * DAY, category: 'Milik profile lain', profile_id: 'p2' }) as never,
        );

        const mine = await fetchTransactions({ profile_id: 'p1' });
        expect(mine.map((row) => row.category)).not.toContain('Milik profile lain');

        const theirs = await fetchTransactions({ profile_id: 'p2' });
        expect(theirs).toHaveLength(1);
        expect(theirs[0].profile_id).toBe('p2');
    });
});

describe('fetchTransactionById / fetchRecentTransactions', () => {
    beforeEach(async () => {
        await insertTransaction(expense({ date: NOW - 1 * DAY }) as never);
        await insertTransaction(expense({ date: NOW - 2 * DAY }) as never);
        await insertTransaction(expense({ date: NOW - 3 * DAY, profile_id: 'p2' }) as never);
    });

    it('hides transactions outside the requested profile scope', async () => {
        const foreign = db.transactions.find((row) => row.profile_id === 'p2')!;

        expect(await fetchTransactionById(foreign.id, 'p1')).toBeNull();
        expect((await fetchTransactionById(foreign.id, 'p2'))?.id).toBe(foreign.id);
    });

    it('honours the requested limit', async () => {
        const recent = await fetchRecentTransactions(2, 'p1');
        expect(recent).toHaveLength(2);
        expect(recent[0].date).toBeGreaterThan(recent[1].date);
    });
});

describe('deleteTransaction', () => {
    it('hard-deletes a row that never synced and reverts the balance', async () => {
        const created = await insertTransaction(
            expense({ amount: 150000, wallet_id: 'w1' }) as never,
        );
        expect(db.wallets[0].balance).toBe(850000);

        await deleteTransaction(created.id);

        expect(db.transactions).toHaveLength(0);
        expect(db.wallets[0].balance).toBe(1000000);
    });

    it('soft-deletes an already-synced row and reverts the balance', async () => {
        const created = await insertTransaction(
            expense({ amount: 150000, wallet_id: 'w1' }) as never,
        );
        db.transactions[0].sync_status = 'synced';

        await deleteTransaction(created.id);

        expect(db.transactions).toHaveLength(1);
        expect(db.transactions[0].sync_status).toBe('pending_delete');
        expect(db.wallets[0].balance).toBe(1000000);
    });

    it('ignores unknown ids', async () => {
        await deleteTransaction('missing');
        expect(db.transactions).toHaveLength(0);
    });
});

describe('updateTransaction', () => {
    it('adjusts the wallet balance when the amount changes', async () => {
        const created = await insertTransaction(
            expense({ amount: 100000, wallet_id: 'w1' }) as never,
        );
        expect(db.wallets[0].balance).toBe(900000);

        // Baris yang sudah terlanjur tersinkron -> perubahan jadi pending_update.
        db.transactions[0].sync_status = 'synced';
        await updateTransaction(created.id, { amount: 40000 });

        expect(db.transactions[0].amount).toBe(40000);
        expect(db.transactions[0].sync_status).toBe('pending_update');
        expect(db.wallets[0].balance).toBe(960000);
    });

    it('keeps pending_create status for rows that have not synced', async () => {
        const created = await insertTransaction(expense() as never);

        await updateTransaction(created.id, { note: 'Diperbaiki' });

        expect(db.transactions[0].sync_status).toBe('pending_create');
        expect(db.transactions[0].note).toBe('Diperbaiki');
    });

    it('drops non-whitelisted fields instead of writing them', async () => {
        const created = await insertTransaction(expense() as never);

        await updateTransaction(created.id, {
            category: 'Transport',
            id: 'hacked',
            sync_status: 'synced',
            created_at: 1,
        } as never);

        expect(db.transactions[0].category).toBe('Transport');
        expect(db.transactions[0].id).toBe(created.id);
        expect(db.transactions[0].created_at).toBe(created.created_at);
        expect(db.transactions[0].sync_status).toBe('pending_create');
    });

    it('does nothing when there is nothing safe to update', async () => {
        const created = await insertTransaction(expense() as never);
        const before = { ...db.transactions[0] };

        await updateTransaction(created.id, { id: 'hacked' } as never);

        expect(db.transactions[0]).toEqual(before);
    });

    it('ignores unknown ids', async () => {
        await expect(updateTransaction('missing', { amount: 1 })).resolves.toBeUndefined();
    });
});

describe('reports', () => {
    beforeEach(async () => {
        await insertTransaction(expense({ type: 'income', amount: 900000, category: 'Gaji', date: NOW }) as never);
        await insertTransaction(expense({ amount: 300000, category: 'Makan & Minum', date: NOW }) as never);
        await insertTransaction(expense({ amount: 200000, category: 'Makan & Minum', date: NOW - 1 * DAY }) as never);
        await insertTransaction(expense({ amount: 999999, category: 'Lama', date: NOW - 120 * DAY }) as never);
    });

    it('sums only this month for the monthly summary', async () => {
        const summary = await fetchMonthlySummary('p1');

        expect(summary.totalIncome).toBe(900000);
        expect(summary.totalExpense).toBe(500000);
    });

    it('groups category totals with percentages that add up to 100', async () => {
        const rows = await fetchCategorySummary('expense', NOW - 121 * DAY, NOW, 'p1');

        // Diurutkan dari total terbesar.
        expect(rows.map((row) => row.category)).toEqual(['Lama', 'Makan & Minum']);
        expect(rows[0]).toMatchObject({ total: 999999, count: 1 });
        expect(rows[1]).toMatchObject({ total: 500000, count: 2 });

        const totalPercentage = rows.reduce((sum, row) => sum + row.percentage, 0);
        expect(totalPercentage).toBeCloseTo(100, 5);
        expect(rows[1].percentage).toBeCloseTo((500000 / 1499999) * 100, 5);
    });

    it('returns six months of balances', async () => {
        const monthly = await fetchMonthlyData('p1');

        expect(monthly).toHaveLength(6);
        const current = monthly[monthly.length - 1];
        expect(current.totalIncome).toBe(900000);
        expect(current.totalExpense).toBe(500000);
        expect(current.balance).toBe(400000);
        // Bulan-bulan sebelumnya kosong (tak ada transaksi di rentang itu).
        expect(monthly.slice(0, 5).every((month) => month.totalIncome === 0)).toBe(true);
    });
});
