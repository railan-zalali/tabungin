// Transaction Categories Queries
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { resolveMaterialIcon } from '../utils/materialIcon';
import { runSerializedSyncTask } from './syncQueue';

export type CategoryType = 'income' | 'expense' | 'both';

export interface TransactionCategory {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: boolean;
  created_at: number;
  updated_at: number | null;
}

type LocalCategoryRow = Omit<TransactionCategory, 'is_default'> & {
  is_default: number | boolean;
  sync_status?: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';
};

const activeCategorySyncs = new Map<string, Promise<void>>();

function normalizeCategoryIcon<
  T extends Pick<TransactionCategory, 'icon'> & Partial<Pick<TransactionCategory, 'is_default'>>
>(category: T): T {
  const normalizedCategory = {
    ...category,
    icon: resolveMaterialIcon(category.icon),
  };

  if (category.is_default !== undefined) {
    return {
      ...normalizedCategory,
      is_default: Boolean(category.is_default),
    };
  }

  return normalizedCategory;
}

function mapLocalCategoryRow(row: LocalCategoryRow): TransactionCategory {
  return normalizeCategoryIcon({
    ...row,
    is_default: Boolean(row.is_default),
  });
}

async function pushPendingCategories(userId: string): Promise<void> {
  const db = await getInitializedDatabase();
  const pendingUpserts = await db.getAllAsync<LocalCategoryRow>(
    `SELECT * FROM transaction_categories
     WHERE user_id = ? AND sync_status IN ('pending_create', 'pending_update')`,
    [userId],
  );

  if (pendingUpserts.length > 0) {
    const payload = pendingUpserts.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      icon: resolveMaterialIcon(row.icon),
      color: row.color,
      is_default: row.is_default ? 1 : 0,
      created_at: row.created_at,
      updated_at: row.updated_at ?? row.created_at,
    }));

    const { error } = await supabase.from('transaction_categories').upsert(payload);
    if (error) {
      console.error('[Category Sync] Failed to push pending categories:', error);
      throw error;
    }

    const ids = pendingUpserts.map((row) => row.id);
    await db.runAsync(
      `UPDATE transaction_categories
       SET sync_status = 'synced'
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }

  const pendingDeletes = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM transaction_categories
     WHERE user_id = ? AND sync_status = 'pending_delete'`,
    [userId],
  );

  if (pendingDeletes.length > 0) {
    const ids = pendingDeletes.map((row) => row.id);
    const { error } = await supabase.from('transaction_categories').delete().in('id', ids);
    if (error) {
      console.error('[Category Sync] Failed to delete pending categories:', error);
      throw error;
    }

    await db.runAsync(
      `DELETE FROM transaction_categories WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids,
    );
  }
}

// Local queries
export async function fetchLocalCategories(userId: string, type?: CategoryType): Promise<TransactionCategory[]> {
  const db = await getInitializedDatabase();

  if (type) {
    const categories = await db.getAllAsync<LocalCategoryRow>(
      `SELECT * FROM transaction_categories
       WHERE user_id = ?
         AND sync_status != 'pending_delete'
         AND (type = ? OR type = 'both')
       ORDER BY is_default DESC, name ASC`,
      [userId, type]
    );
    return categories.map(mapLocalCategoryRow);
  }

  const categories = await db.getAllAsync<LocalCategoryRow>(
    `SELECT * FROM transaction_categories
     WHERE user_id = ?
       AND sync_status != 'pending_delete'
     ORDER BY is_default DESC, name ASC`,
    [userId]
  );
  return categories.map(mapLocalCategoryRow);
}

export async function insertCategory(category: Omit<TransactionCategory, 'id' | 'created_at' | 'is_default'>): Promise<TransactionCategory> {
  const db = await getInitializedDatabase();
  const id = uuidv4();
  const now = Date.now();
  const normalizedCategory = normalizeCategoryIcon(category);

  await db.runAsync(
    `INSERT INTO transaction_categories (
      id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending_create')`,
    [
      id,
      normalizedCategory.user_id,
      normalizedCategory.name,
      normalizedCategory.type,
      normalizedCategory.icon,
      normalizedCategory.color,
      now,
      now,
    ]
  );

  return { ...normalizedCategory, id, created_at: now, updated_at: now, is_default: false };
}

export async function updateCategory(id: string, updates: Partial<Omit<TransactionCategory, 'id' | 'user_id' | 'created_at' | 'is_default'>>): Promise<void> {
  const db = await getInitializedDatabase();
  const normalizedUpdates = updates.icon === undefined
    ? updates
    : { ...updates, icon: resolveMaterialIcon(updates.icon) };

  const fields: string[] = [];
  const values: any[] = [];

  if (normalizedUpdates.name !== undefined) {
    fields.push('name = ?');
    values.push(normalizedUpdates.name);
  }
  if (normalizedUpdates.type !== undefined) {
    fields.push('type = ?');
    values.push(normalizedUpdates.type);
  }
  if (normalizedUpdates.icon !== undefined) {
    fields.push('icon = ?');
    values.push(normalizedUpdates.icon);
  }
  if (normalizedUpdates.color !== undefined) {
    fields.push('color = ?');
    values.push(normalizedUpdates.color);
  }

  fields.push('updated_at = ?');
  fields.push(`sync_status = CASE
    WHEN sync_status = 'pending_create' THEN 'pending_create'
    ELSE 'pending_update'
  END`);
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE transaction_categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getInitializedDatabase();
  const existing = await db.getFirstAsync<{ sync_status: string }>(
    'SELECT sync_status FROM transaction_categories WHERE id = ?',
    [id],
  );

  if (!existing) return;

  if (existing.sync_status === 'pending_create') {
    await db.runAsync('DELETE FROM transaction_categories WHERE id = ?', [id]);
    return;
  }

  await db.runAsync(
    `UPDATE transaction_categories
     SET sync_status = 'pending_delete', updated_at = ?
     WHERE id = ?`,
    [Date.now(), id],
  );
}

// Remote sync
export async function syncRemoteCategories(userId: string): Promise<void> {
  const activeSync = activeCategorySyncs.get(userId);
  if (activeSync) {
    return activeSync;
  }

  const syncPromise = runSerializedSyncTask(async () => {
    await pushPendingCategories(userId);

    const { data, error } = await supabase
      .from('transaction_categories')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return;
    }

    const db = await getInitializedDatabase();
    try {
      await db.withTransactionAsync(async () => {
        for (const cat of data) {
          const existing = await db.getFirstAsync<{ sync_status: string }>(
            'SELECT sync_status FROM transaction_categories WHERE id = ?',
            [cat.id],
          );

          if (existing && existing.sync_status !== 'synced') {
            continue;
          }

          const normalizedCategory = normalizeCategoryIcon(cat);
          await db.runAsync(
            `INSERT OR REPLACE INTO transaction_categories
             (id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
            [
              normalizedCategory.id,
              normalizedCategory.user_id,
              normalizedCategory.name,
              normalizedCategory.type,
              normalizedCategory.icon,
              normalizedCategory.color,
              normalizedCategory.is_default ? 1 : 0,
              normalizedCategory.created_at,
              normalizedCategory.updated_at,
            ]
          );
        }
      });
    } catch (syncError) {
      console.error('[Category Sync] Failed to persist remote categories locally:', syncError);
      throw syncError;
    }
  }).finally(() => {
    activeCategorySyncs.delete(userId);
  });

  activeCategorySyncs.set(userId, syncPromise);
  return syncPromise;
}

// Initialize default categories for new user
export async function initializeDefaultCategories(userId: string): Promise<void> {
  const { error } = await supabase.rpc('insert_default_categories_for_user', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Failed to initialize default categories:', error);
  }

  // Also sync to local
  await syncRemoteCategories(userId);
}

