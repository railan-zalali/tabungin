// Recurring Transactions Queries
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { runSerializedSyncTask } from './syncQueue';

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  wallet_id: string | null;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  note: string | null;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: number;
  end_date: number | null;
  next_occurrence: number;
  is_active: boolean;
  last_generated_at: number | null;
  reminder_enabled: boolean;
  reminder_offset_minutes: number;
  created_at: number;
  updated_at: number;
}

type LocalRecurringRow = Omit<RecurringTransaction, 'is_active'> & {
  is_active: number | boolean;
  sync_status?: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
};

const activeRecurringSyncs = new Map<string, Promise<void>>();

function mapLocalRecurringRow(row: LocalRecurringRow): RecurringTransaction {
  return {
    ...row,
    is_active: Boolean(row.is_active),
    reminder_enabled: Boolean((row as any).reminder_enabled),
    reminder_offset_minutes: Number((row as any).reminder_offset_minutes ?? 60),
  };
}

async function pushPendingRecurringTransactions(userId: string): Promise<void> {
  const db = await getInitializedDatabase();
  const pendingUpserts = await db.getAllAsync<LocalRecurringRow>(
    `SELECT * FROM recurring_transactions
     WHERE user_id = ? AND sync_status IN ('pending_create', 'pending_update')`,
    [userId],
  );

  if (pendingUpserts.length > 0) {
    const payload = pendingUpserts.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      wallet_id: row.wallet_id,
      category: row.category,
      amount: row.amount,
      type: row.type,
      note: row.note,
      frequency: row.frequency,
      day_of_month: row.day_of_month,
      day_of_week: row.day_of_week,
      start_date: row.start_date,
      end_date: row.end_date,
      next_occurrence: row.next_occurrence,
      is_active: row.is_active ? 1 : 0,
      last_generated_at: row.last_generated_at,
      reminder_enabled: row.reminder_enabled ? 1 : 0,
      reminder_offset_minutes: row.reminder_offset_minutes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    const { error } = await supabase.from('recurring_transactions').upsert(payload);
    if (error) {
      console.error('[Recurring Sync] Failed to push pending recurring transactions:', error);
      throw error;
    }

    const ids = pendingUpserts.map((row) => row.id);
    await db.runAsync(
      `UPDATE recurring_transactions
       SET sync_status = 'synced'
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }

  const pendingDeletes = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM recurring_transactions
     WHERE user_id = ? AND sync_status = 'pending_delete'`,
    [userId],
  );

  if (pendingDeletes.length > 0) {
    const ids = pendingDeletes.map((row) => row.id);
    const { error } = await supabase.from('recurring_transactions').delete().in('id', ids);
    if (error) {
      console.error('[Recurring Sync] Failed to delete pending recurring transactions:', error);
      throw error;
    }

    await db.runAsync(
      `DELETE FROM recurring_transactions WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }
}

// Local queries
export async function fetchLocalRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const db = await getInitializedDatabase();
  const rows = await db.getAllAsync<LocalRecurringRow>(
    `SELECT * FROM recurring_transactions
     WHERE user_id = ? AND sync_status != 'pending_delete'
     ORDER BY next_occurrence ASC`,
    [userId]
  );
  return rows.map(mapLocalRecurringRow);
}

export async function fetchActiveRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const db = await getInitializedDatabase();
  const rows = await db.getAllAsync<LocalRecurringRow>(
    `SELECT * FROM recurring_transactions
     WHERE user_id = ? AND is_active = 1 AND sync_status != 'pending_delete'
     ORDER BY next_occurrence ASC`,
    [userId]
  );
  return rows.map(mapLocalRecurringRow);
}

export async function insertRecurringTransaction(transaction: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringTransaction> {
  const db = await getInitializedDatabase();
  const id = uuidv4();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO recurring_transactions (
      id, user_id, wallet_id, category, amount, type, note, frequency,
      day_of_month, day_of_week, start_date, end_date, next_occurrence,
      is_active, last_generated_at, reminder_enabled, reminder_offset_minutes, created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
    [
      id,
      transaction.user_id,
      transaction.wallet_id,
      transaction.category,
      transaction.amount,
      transaction.type,
      transaction.note,
      transaction.frequency,
      transaction.day_of_month,
      transaction.day_of_week,
      transaction.start_date,
      transaction.end_date,
      transaction.next_occurrence,
      transaction.is_active ? 1 : 0,
      transaction.last_generated_at,
      transaction.reminder_enabled ? 1 : 0,
      transaction.reminder_offset_minutes,
      now,
      now,
    ]
  );

  return { ...transaction, id, created_at: now, updated_at: now };
}

export async function updateRecurringTransaction(id: string, updates: Partial<RecurringTransaction>): Promise<void> {
  const db = await getInitializedDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note);
  }
  if (updates.frequency !== undefined) {
    fields.push('frequency = ?');
    values.push(updates.frequency);
  }
  if (updates.day_of_month !== undefined) {
    fields.push('day_of_month = ?');
    values.push(updates.day_of_month);
  }
  if (updates.day_of_week !== undefined) {
    fields.push('day_of_week = ?');
    values.push(updates.day_of_week);
  }
  if (updates.end_date !== undefined) {
    fields.push('end_date = ?');
    values.push(updates.end_date);
  }
  if (updates.next_occurrence !== undefined) {
    fields.push('next_occurrence = ?');
    values.push(updates.next_occurrence);
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.is_active ? 1 : 0);
  }
  if (updates.last_generated_at !== undefined) {
    fields.push('last_generated_at = ?');
    values.push(updates.last_generated_at);
  }
  if (updates.reminder_enabled !== undefined) {
    fields.push('reminder_enabled = ?');
    values.push(updates.reminder_enabled ? 1 : 0);
  }
  if (updates.reminder_offset_minutes !== undefined) {
    fields.push('reminder_offset_minutes = ?');
    values.push(updates.reminder_offset_minutes);
  }

  fields.push('updated_at = ?');
  fields.push(`sync_status = CASE
    WHEN sync_status = 'pending_create' THEN 'pending_create'
    ELSE 'pending_update'
  END`);
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = await getInitializedDatabase();
  const existing = await db.getFirstAsync<{ sync_status: string }>(
    'SELECT sync_status FROM recurring_transactions WHERE id = ?',
    [id],
  );

  if (!existing) return;

  if (existing.sync_status === 'pending_create') {
    await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
    return;
  }

  await db.runAsync(
    `UPDATE recurring_transactions
     SET sync_status = 'pending_delete', updated_at = ?
     WHERE id = ?`,
    [Date.now(), id],
  );
}

export function calculateNextOccurrence(
  transaction: RecurringTransaction
): number {
  const now = Date.now();
  const current = new Date(transaction.last_generated_at || transaction.start_date);

  switch (transaction.frequency) {
    case 'daily':
      return new Date(current.getTime() + 24 * 60 * 60 * 1000).getTime();

    case 'weekly':
      return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000).getTime();

    case 'biweekly':
      return new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000).getTime();

    case 'monthly': {
      const nextDate = new Date(current);
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (transaction.day_of_month) {
        nextDate.setDate(transaction.day_of_month);
      }
      return nextDate.getTime();
    }

    case 'yearly': {
      const nextDate = new Date(current);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      return nextDate.getTime();
    }

    default:
      return now + 30 * 24 * 60 * 60 * 1000; // Default to 30 days
  }
}

// Remote sync
export async function syncRemoteRecurringTransactions(userId: string): Promise<void> {
  const activeSync = activeRecurringSyncs.get(userId);
  if (activeSync) {
    return activeSync;
  }

  const syncPromise = runSerializedSyncTask(async () => {
    await pushPendingRecurringTransactions(userId);

    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('next_occurrence', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return;
    }

    const db = await getInitializedDatabase();
    try {
      await db.withTransactionAsync(async () => {
        for (const tx of data) {
          const existing = await db.getFirstAsync<{ sync_status: string }>(
            'SELECT sync_status FROM recurring_transactions WHERE id = ?',
            [tx.id],
          );

          if (existing && existing.sync_status !== 'synced') {
            continue;
          }

          await db.runAsync(
            `INSERT OR REPLACE INTO recurring_transactions
             (id, user_id, wallet_id, category, amount, type, note, frequency,
             day_of_month, day_of_week, start_date, end_date, next_occurrence,
              is_active, last_generated_at, reminder_enabled, reminder_offset_minutes, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            [
              tx.id,
              tx.user_id,
              tx.wallet_id,
              tx.category,
              tx.amount,
              tx.type,
              tx.note,
              tx.frequency,
              tx.day_of_month,
              tx.day_of_week,
              tx.start_date,
              tx.end_date,
              tx.next_occurrence,
              tx.is_active ? 1 : 0,
              tx.last_generated_at,
              tx.reminder_enabled ? 1 : 0,
              tx.reminder_offset_minutes ?? 60,
              tx.created_at,
              tx.updated_at,
            ]
          );
        }
      });
    } catch (syncError) {
      console.error('[Recurring Sync] Failed to persist remote recurring transactions locally:', syncError);
      throw syncError;
    }
  }).finally(() => {
    activeRecurringSyncs.delete(userId);
  });

  activeRecurringSyncs.set(userId, syncPromise);
  return syncPromise;
}

export async function fetchRecurringReminderCandidates(userId: string): Promise<RecurringTransaction[]> {
  const db = await getInitializedDatabase();
  const rows = await db.getAllAsync<LocalRecurringRow>(
    `SELECT * FROM recurring_transactions
     WHERE user_id = ? AND sync_status != 'pending_delete' AND is_active = 1 AND reminder_enabled = 1
     ORDER BY next_occurrence ASC`,
    [userId],
  );
  return rows.map(mapLocalRecurringRow);
}

