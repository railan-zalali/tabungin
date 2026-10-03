// Query database untuk tabel debts dan debt_payments
import { getInitializedDatabase } from './schema';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import type { Debt, DebtPayment, DebtType, DebtStatus, DebtSummary } from '../types/debt';

/**
 * Ambil semua debt untuk profile tertentu
 */
export async function fetchDebts(
    profileId?: string,
    filter?: 'active' | 'paid' | 'all',
): Promise<Debt[]> {
    const db = await getInitializedDatabase();
    let query = "SELECT * FROM debts WHERE sync_status != 'pending_delete'";
    const params: (string | number)[] = [];

    if (profileId) {
        query += ' AND profile_id = ?';
        params.push(profileId);
    }

    if (filter === 'active') {
        query += " AND status = 'active'";
    } else if (filter === 'paid') {
        query += " AND status = 'paid'";
    }

    query += ' ORDER BY created_at DESC';
    const rows = await db.getAllAsync<Debt>(query, params);
    return rows;
}

/**
 * Ambil single debt by id
 */
export async function fetchDebtById(id: string): Promise<Debt | null> {
    const db = await getInitializedDatabase();
    const row = await db.getFirstAsync<Debt>(
        "SELECT * FROM debts WHERE id = ? AND sync_status != 'pending_delete'",
        [id],
    );
    return row ?? null;
}

/**
 * Ambil semua payments untuk debt tertentu
 */
export async function fetchDebtPayments(debtId: string): Promise<DebtPayment[]> {
    const db = await getInitializedDatabase();
    const rows = await db.getAllAsync<DebtPayment>(
        "SELECT * FROM debt_payments WHERE debt_id = ? AND sync_status != 'pending_delete' ORDER BY date DESC",
        [debtId],
    );
    return rows;
}

/**
 * Insert debt baru
 */
export async function insertDebt(
    data: Omit<Debt, 'id' | 'created_at' | 'updated_at' | 'remaining_amount'> & { remaining_amount?: number },
): Promise<Debt> {
    const db = await getInitializedDatabase();
    const id = uuidv4();
    const now = Date.now();
    const remaining_amount = data.remaining_amount ?? data.amount;

    await db.runAsync(
        `INSERT INTO debts (id, user_id, type, counterparty, counterparty_email, amount, remaining_amount, interest_rate, due_date, note, status, wallet_id, profile_id, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
        [id, data.user_id, data.type, data.counterparty, data.counterparty_email, data.amount, remaining_amount, data.interest_rate, data.due_date, data.note, data.status, data.wallet_id, data.profile_id, now, now],
    );

    return { ...data, id, remaining_amount, created_at: now, updated_at: now };
}

/**
 * Update debt
 */
export async function updateDebt(
    id: string,
    data: Partial<Omit<Debt, 'id' | 'created_at'>>,
): Promise<void> {
    const db = await getInitializedDatabase();
    const now = Date.now();
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    const updatable: Record<string, boolean> = {
        type: true,
        counterparty: true,
        counterparty_email: true,
        amount: true,
        remaining_amount: true,
        interest_rate: true,
        due_date: true,
        note: true,
        status: true,
        wallet_id: true,
        profile_id: true,
    };

    for (const [key, value] of Object.entries(data)) {
        if (updatable[key]) {
            fields.push(`${key} = ?`);
            params.push(value as any);
        }
    }

    if (fields.length === 0) return;

    fields.push("updated_at = ?");
    fields.push("sync_status = 'pending_update'");
    params.push(now);
    params.push(id);

    await db.runAsync(
        `UPDATE debts SET ${fields.join(', ')} WHERE id = ?`,
        params,
    );
}

/**
 * Soft delete debt
 */
export async function deleteDebt(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    const now = Date.now();
    await db.runAsync(
        "UPDATE debts SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
        [now, id],
    );
    // Also soft-delete all payments
    await db.runAsync(
        "UPDATE debt_payments SET sync_status = 'pending_delete', updated_at = ? WHERE debt_id = ?",
        [now, id],
    );
}

/**
 * Insert payment untuk debt
 */
export async function insertDebtPayment(
    data: Omit<DebtPayment, 'id' | 'created_at' | 'updated_at'>,
): Promise<DebtPayment> {
    const db = await getInitializedDatabase();
    const id = uuidv4();
    const now = Date.now();

    await db.runAsync(
        `INSERT INTO debt_payments (id, debt_id, amount, date, note, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
        [id, data.debt_id, data.amount, data.date, data.note, now, now],
    );

    // Update remaining_amount pada debt
    await db.runAsync(
        `UPDATE debts SET remaining_amount = remaining_amount - ?, updated_at = ?, sync_status = 'pending_update' WHERE id = ?`,
        [data.amount, now, data.debt_id],
    );

    // Auto-mark as paid if remaining_amount reaches 0
    await db.runAsync(
        `UPDATE debts SET status = 'paid', updated_at = ? WHERE id = ? AND remaining_amount <= 0 AND status = 'active'`,
        [now, data.debt_id],
    );

    return { ...data, id, created_at: now, updated_at: now };
}

/**
 * Delete payment dan restore remaining_amount
 */
export async function deleteDebtPayment(paymentId: string, debtId: string, amount: number): Promise<void> {
    const db = await getInitializedDatabase();
    const now = Date.now();

    await db.runAsync(
        "UPDATE debt_payments SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
        [now, paymentId],
    );

    // Restore remaining_amount
    await db.runAsync(
        `UPDATE debts SET remaining_amount = remaining_amount + ?, updated_at = ?, sync_status = 'pending_update', status = 'active' WHERE id = ?`,
        [amount, now, debtId],
    );
}

/**
 * Hitung summary debt untuk profile
 */
export async function fetchDebtSummary(profileId?: string): Promise<DebtSummary> {
    const db = await getInitializedDatabase();
    let query = "SELECT type, status, COALESCE(SUM(remaining_amount), 0) as total FROM debts WHERE sync_status != 'pending_delete'";
    const params: (string | number)[] = [];

    if (profileId) {
        query += ' AND profile_id = ?';
        params.push(profileId);
    }

    query += ' GROUP BY type, status';
    const rows = await db.getAllAsync<{ type: DebtType; status: DebtStatus; total: number }>(query, params);

    let totalDebt = 0;
    let totalReceivable = 0;
    let activeCount = 0;
    let paidCount = 0;

    const now = Date.now();
    for (const r of rows) {
        if (r.type === 'debt') totalDebt += r.total;
        else totalReceivable += r.total;

        if (r.status === 'active') activeCount++;
        if (r.status === 'paid') paidCount++;
    }

    // Count overdue
    let overdueQuery = "SELECT COUNT(*) as count FROM debts WHERE sync_status != 'pending_delete' AND status = 'active' AND due_date IS NOT NULL AND due_date < ?";
    const overdueParams: (string | number)[] = [now];
    if (profileId) {
        overdueQuery += ' AND profile_id = ?';
        overdueParams.push(profileId);
    }
    const overdueRow = await db.getFirstAsync<{ count: number }>(overdueQuery, overdueParams);

    return {
        totalDebt,
        totalReceivable,
        activeCount,
        paidCount,
        overdueCount: overdueRow?.count ?? 0,
    };
}
