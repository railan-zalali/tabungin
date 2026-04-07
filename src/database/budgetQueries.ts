// Query database untuk tabel budgets (anggaran per kategori per bulan)
import { getInitializedDatabase } from './schema';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

async function resolveBudgetScope() {
    const { useProfileStore } = await import('../store/useProfileStore');
    return {
        profileId: useProfileStore.getState().activeProfileId ?? null,
    };
}

export interface Budget {
    id: string;
    category: string;
    amount: number;
    month: number;  // 1-12
    year: number;
    reminder_enabled: boolean;
    reminder_time: string | null;
    created_at: number;
}

export interface BudgetWithSpent extends Budget {
    spent: number;
    remaining: number;
    percentage: number;
}

/**
 * Ambil semua budget untuk bulan & tahun tertentu, serta hitung pengeluaran aktual
 * Filter out pending_delete
 */
export async function fetchBudgetsWithSpent(month: number, year: number): Promise<BudgetWithSpent[]> {
    const db = await getInitializedDatabase();
    const { profileId } = await resolveBudgetScope();

    // Hitung rentang tanggal bulan ini dalam ms
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    let budgetQuery = "SELECT * FROM budgets WHERE month = ? AND year = ? AND sync_status != 'pending_delete' AND wallet_id IS NULL";
    const budgetParams: (string | number)[] = [month, year];

    if (profileId) {
        budgetQuery += " AND (profile_id = ? OR profile_id IS NULL)";
        budgetParams.push(profileId);
    }

    budgetQuery += ' ORDER BY amount DESC';
    const rows = await db.getAllAsync<Budget>(budgetQuery, budgetParams);

    const result: BudgetWithSpent[] = [];
    for (const budgetRow of rows) {
        const b = {
            ...budgetRow,
            reminder_enabled: Boolean((budgetRow as any).reminder_enabled),
            reminder_time: (budgetRow as any).reminder_time ?? null,
        };
        let spentQuery = `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
             WHERE type = 'expense' AND category = ? AND date >= ? AND date <= ? AND sync_status != 'pending_delete'`;
        const spentParams: (string | number)[] = [b.category, startDate, endDate];

        if (profileId) {
            spentQuery += " AND (profile_id = ? OR profile_id IS NULL)";
            spentParams.push(profileId);
        }

        const spentRow = await db.getFirstAsync<{ total: number }>(
            spentQuery,
            spentParams
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
    year: number,
    options?: {
        reminder_enabled?: boolean;
        reminder_time?: string | null;
    }
): Promise<Budget> {
    const db = await getInitializedDatabase();
    const { profileId } = await resolveBudgetScope();
    const existing = await db.getFirstAsync<Budget>(
        `SELECT * FROM budgets
         WHERE category = ? AND month = ? AND year = ?
           AND sync_status != 'pending_delete'
           AND wallet_id IS NULL
           AND (? IS NULL OR profile_id = ? OR profile_id IS NULL)`,
        [category, month, year, profileId, profileId]
    );

    if (existing) {
        const nextReminderEnabled = options?.reminder_enabled ?? existing.reminder_enabled;
        const nextReminderTime = options?.reminder_time ?? existing.reminder_time;
        await db.runAsync(
            "UPDATE budgets SET amount = ?, reminder_enabled = ?, reminder_time = ?, profile_id = ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?",
            [amount, nextReminderEnabled ? 1 : 0, nextReminderTime || null, profileId, Date.now(), existing.id]
        );
        return {
            ...existing,
            amount,
            reminder_enabled: nextReminderEnabled,
            reminder_time: nextReminderTime,
        };
    }

    const id = uuidv4();
    const created_at = Date.now();
    const updated_at = created_at;
    const sync_status = 'pending_create';
    
    await db.runAsync(
        'INSERT INTO budgets (id, category, amount, month, year, reminder_enabled, reminder_time, created_at, updated_at, sync_status, wallet_id, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, category, amount, month, year, options?.reminder_enabled ? 1 : 0, options?.reminder_time || null, created_at, updated_at, sync_status, null, profileId]
    );
    return {
        id,
        category,
        amount,
        month,
        year,
        reminder_enabled: options?.reminder_enabled ?? false,
        reminder_time: options?.reminder_time ?? null,
        created_at,
    };
}

/**
 * Hapus budget
 */
export async function deleteBudget(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    
    const row = await db.getFirstAsync<{ sync_status: string }>('SELECT sync_status FROM budgets WHERE id = ?', [id]);
    
    if (row?.sync_status === 'pending_create') {
        await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
    } else {
        await db.runAsync(
            "UPDATE budgets SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
            [Date.now(), id]
        );
    }
}

/**
 * Ambil total anggaran dan pengeluaran bulan ini untuk summary dashboard
 */
export async function fetchBudgetSummary(month: number, year: number): Promise<{
    totalBudget: number;
    totalSpent: number;
    categoriesOver: number;
}> {
    const db = await getInitializedDatabase();
    const { profileId } = await resolveBudgetScope();
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    const budgetTotal = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM budgets
         WHERE month = ? AND year = ? AND sync_status != 'pending_delete' AND wallet_id IS NULL
           AND (? IS NULL OR profile_id = ? OR profile_id IS NULL)`,
        [month, year, profileId, profileId]
    );

    const spentTotal = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
         WHERE type = 'expense' AND date >= ? AND date <= ? AND sync_status != 'pending_delete'
           AND (? IS NULL OR profile_id = ? OR profile_id IS NULL)`,
        [startDate, endDate, profileId, profileId]
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

export async function fetchBudgetReminderCandidates(month: number, year: number): Promise<Budget[]> {
    const db = await getInitializedDatabase();
    const { profileId } = await resolveBudgetScope();
    const rows = await db.getAllAsync<any>(
        `SELECT * FROM budgets
         WHERE month = ? AND year = ? AND sync_status != 'pending_delete' AND reminder_enabled = 1 AND wallet_id IS NULL
           AND (? IS NULL OR profile_id = ? OR profile_id IS NULL)
         ORDER BY category ASC`,
        [month, year, profileId, profileId],
    );

    return rows.map((row) => ({
        ...row,
        reminder_enabled: Boolean(row.reminder_enabled),
        reminder_time: row.reminder_time ?? null,
    }));
}

