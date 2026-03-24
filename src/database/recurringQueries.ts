// Recurring Transactions Queries
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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
  created_at: number;
  updated_at: number;
}

// Local queries
export async function fetchLocalRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const db = await getInitializedDatabase();
  return db.getAllAsync<RecurringTransaction>(
    `SELECT * FROM recurring_transactions
     WHERE user_id = ?
     ORDER BY next_occurrence ASC`,
    [userId]
  );
}

export async function fetchActiveRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const db = await getInitializedDatabase();
  return db.getAllAsync<RecurringTransaction>(
    `SELECT * FROM recurring_transactions
     WHERE user_id = ? AND is_active = 1
     ORDER BY next_occurrence ASC`,
    [userId]
  );
}

export async function insertRecurringTransaction(transaction: Omit<RecurringTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringTransaction> {
  const db = await getInitializedDatabase();
  const id = uuidv4();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO recurring_transactions (
      id, user_id, wallet_id, category, amount, type, note, frequency,
      day_of_month, day_of_week, start_date, end_date, next_occurrence,
      is_active, last_generated_at, created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
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

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE recurring_transactions SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = await getInitializedDatabase();
  await db.runAsync('DELETE FROM recurring_transactions WHERE id = ?', [id]);
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
  const { data, error } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('next_occurrence', { ascending: true });

  if (error) throw error;

  const db = await getInitializedDatabase();
  await db.withTransactionAsync(async () => {
    for (const tx of (data ?? [])) {
      await db.runAsync(
        `INSERT OR REPLACE INTO recurring_transactions
         (id, user_id, wallet_id, category, amount, type, note, frequency,
          day_of_month, day_of_week, start_date, end_date, next_occurrence,
          is_active, last_generated_at, created_at, updated_at, sync_status)
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
          tx.created_at,
          tx.updated_at,
        ]
      );
    }
  });
}

