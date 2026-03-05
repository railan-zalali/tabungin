// Query database untuk tabel transactions
import { getDatabase } from './schema';
import type { Transaction, TransactionFilter, DailySummary, MonthlySummary, CategorySummary } from '../types/transaction';
import { startOfDay, endOfDay, startOfMonth } from '../utils/date';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tambah transaksi baru
 */
export async function insertTransaction(
    data: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = Date.now();

    await db.runAsync(
        'INSERT INTO transactions (id, type, amount, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, data.type, data.amount, data.category, data.note || null, data.date, created_at]
    );

    return { id, created_at, ...data };
}

/**
 * Ambil semua transaksi dengan filter opsional
 */
export async function fetchTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    const db = await getDatabase();

    let query = 'SELECT * FROM transactions WHERE 1=1';
    const params: (string | number)[] = [];

    if (filter?.type && filter.type !== 'all') {
        query += ' AND type = ?';
        params.push(filter.type);
    }

    if (filter?.period) {
        const now = Date.now();
        const today = new Date();
        if (filter.period === 'today') {
            query += ' AND date >= ? AND date <= ?';
            params.push(startOfDay(today).getTime(), endOfDay(today).getTime());
        } else if (filter.period === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(today.getDate() - 7);
            query += ' AND date >= ?';
            params.push(weekAgo.getTime());
        } else if (filter.period === 'month') {
            query += ' AND date >= ?';
            params.push(startOfMonth().getTime());
        } else if (filter.period === 'custom' && filter.startDate && filter.endDate) {
            query += ' AND date >= ? AND date <= ?';
            params.push(filter.startDate, filter.endDate);
        }
    }

    if (filter?.searchQuery) {
        query += ' AND (note LIKE ? OR category LIKE ?)';
        const s = `%${filter.searchQuery}%`;
        params.push(s, s);
    }

    query += ' ORDER BY date DESC, created_at DESC';

    return await db.getAllAsync<Transaction>(query, params);
}

/**
 * Ambil 5 transaksi terbaru
 */
export async function fetchRecentTransactions(limit = 5): Promise<Transaction[]> {
    const db = await getDatabase();
    return await db.getAllAsync<Transaction>(
        'SELECT * FROM transactions ORDER BY date DESC, created_at DESC LIMIT ?',
        [limit]
    );
}

/**
 * Hapus transaksi berdasarkan ID
 */
export async function deleteTransaction(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

/**
 * Update transaksi
 * Hanya kolom yang ada di whitelist yang boleh diupdate (mencegah SQL injection)
 */
const TRANSACTION_UPDATABLE_FIELDS: ReadonlySet<string> = new Set([
    'type', 'amount', 'category', 'note', 'date',
]);

export async function updateTransaction(
    id: string,
    data: Partial<Omit<Transaction, 'id' | 'created_at'>>
): Promise<void> {
    const db = await getDatabase();
    const safeEntries = Object.entries(data).filter(([key]) => TRANSACTION_UPDATABLE_FIELDS.has(key));
    if (safeEntries.length === 0) return;
    const fields = safeEntries.map(([key]) => `${key} = ?`).join(', ');
    const values = [...safeEntries.map(([, val]) => val), id];
    await db.runAsync(`UPDATE transactions SET ${fields} WHERE id = ?`, values as (string | number | null)[]);
}

/**
 * Hitung ringkasan bulan ini
 */
export async function fetchMonthlySummary(): Promise<{ totalIncome: number; totalExpense: number }> {
    const db = await getDatabase();
    const start = startOfMonth().getTime();

    const income = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ?",
        [start]
    );
    const expense = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?",
        [start]
    );

    return {
        totalIncome: income?.total ?? 0,
        totalExpense: expense?.total ?? 0,
    };
}

/**
 * Hitung ringkasan per kategori untuk laporan
 */
export async function fetchCategorySummary(
    type: 'expense' | 'income',
    startDate: number,
    endDate: number
): Promise<CategorySummary[]> {
    const db = await getDatabase();

    const rows = await db.getAllAsync<{ category: string; total: number; count: number }>(
        `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE type = ? AND date >= ? AND date <= ?
     GROUP BY category
     ORDER BY total DESC`,
        [type, startDate, endDate]
    );

    const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

    return rows.map((r) => ({
        category: r.category,
        total: r.total,
        count: r.count,
        percentage: grandTotal > 0 ? (r.total / grandTotal) * 100 : 0,
    }));
}

/**
 * Ambil data per bulan untuk 6 bulan terakhir
 */
export async function fetchMonthlyData(): Promise<MonthlySummary[]> {
    const db = await getDatabase();
    const results: MonthlySummary[] = [];

    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        d.setHours(0, 0, 0, 0);

        const endD = new Date(d);
        endD.setMonth(endD.getMonth() + 1);
        endD.setDate(0);
        endD.setHours(23, 59, 59, 999);

        const income = await db.getFirstAsync<{ total: number }>(
            "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ? AND date <= ?",
            [d.getTime(), endD.getTime()]
        );
        const expense = await db.getFirstAsync<{ total: number }>(
            "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ? AND date <= ?",
            [d.getTime(), endD.getTime()]
        );

        const totalIncome = income?.total ?? 0;
        const totalExpense = expense?.total ?? 0;

        results.push({
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
        });
    }

    return results;
}
