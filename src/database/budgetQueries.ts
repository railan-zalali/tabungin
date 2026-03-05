// Query database untuk tabel budgets (anggaran per kategori per bulan)
import { getDatabase } from './schema';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Budget {
    id: string;
    category: string;
    amount: number;
    month: number;  // 1-12
    year: number;
    created_at: number;
}

export interface BudgetWithSpent extends Budget {
    spent: number;
    remaining: number;
    percentage: number;
}

/**
 * Ambil semua budget untuk bulan & tahun tertentu, serta hitung pengeluaran aktual
 */
export async function fetchBudgetsWithSpent(month: number, year: number): Promise<BudgetWithSpent[]> {
    const db = await getDatabase();

    // Hitung rentang tanggal bulan ini dalam ms
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    const rows = await db.getAllAsync<Budget>(
        'SELECT * FROM budgets WHERE month = ? AND year = ? ORDER BY amount DESC',
        [month, year]
    );

    const result: BudgetWithSpent[] = [];
    for (const b of rows) {
        const spentRow = await db.getFirstAsync<{ total: number }>(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
             WHERE type = 'expense' AND category = ? AND date >= ? AND date <= ?`,
            [b.category, startDate, endDate]
        );
        const spent = spentRow?.total ?? 0;
        const remaining = Math.max(0, b.amount - spent);
        const percentage = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
        result.push({ ...b, spent, remaining, percentage });
    }
    return result;
}

/**
 * Upsert budget (insert atau update jika sudah ada untuk kategori + bulan + tahun)
 */
export async function upsertBudget(
    category: string,
    amount: number,
    month: number,
    year: number
): Promise<Budget> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<Budget>(
        'SELECT * FROM budgets WHERE category = ? AND month = ? AND year = ?',
        [category, month, year]
    );

    if (existing) {
        await db.runAsync(
            'UPDATE budgets SET amount = ? WHERE id = ?',
            [amount, existing.id]
        );
        return { ...existing, amount };
    }

    const id = uuidv4();
    const created_at = Date.now();
    await db.runAsync(
        'INSERT INTO budgets (id, category, amount, month, year, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, category, amount, month, year, created_at]
    );
    return { id, category, amount, month, year, created_at };
}

/**
 * Hapus budget
 */
export async function deleteBudget(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
}

/**
 * Ambil total anggaran dan pengeluaran bulan ini untuk summary dashboard
 */
export async function fetchBudgetSummary(month: number, year: number): Promise<{
    totalBudget: number;
    totalSpent: number;
    categoriesOver: number;
}> {
    const db = await getDatabase();
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    const budgetTotal = await db.getFirstAsync<{ total: number }>(
        'SELECT COALESCE(SUM(amount), 0) as total FROM budgets WHERE month = ? AND year = ?',
        [month, year]
    );

    const spentTotal = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE type = 'expense' AND date >= ? AND date <= ?`,
        [startDate, endDate]
    );

    // Hitung berapa kategori yang melebihi budget
    const budgets = await fetchBudgetsWithSpent(month, year);
    const categoriesOver = budgets.filter((b) => b.spent > b.amount).length;

    return {
        totalBudget: budgetTotal?.total ?? 0,
        totalSpent: spentTotal?.total ?? 0,
        categoriesOver,
    };
}
