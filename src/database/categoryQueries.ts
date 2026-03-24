// Transaction Categories Queries
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { resolveMaterialIcon } from '../utils/materialIcon';

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

// Local queries
export async function fetchLocalCategories(userId: string, type?: CategoryType): Promise<TransactionCategory[]> {
  const db = await getInitializedDatabase();

  if (type) {
    const categories = await db.getAllAsync<TransactionCategory>(
      `SELECT * FROM transaction_categories
       WHERE user_id = ? AND (type = ? OR type = 'both')
       ORDER BY is_default DESC, name ASC`,
      [userId, type]
    );
    return categories.map(normalizeCategoryIcon);
  }

  const categories = await db.getAllAsync<TransactionCategory>(
    `SELECT * FROM transaction_categories
     WHERE user_id = ?
     ORDER BY is_default DESC, name ASC`,
    [userId]
  );
  return categories.map(normalizeCategoryIcon);
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
      normalizedCategory.updated_at,
    ]
  );

  return { ...normalizedCategory, id, created_at: now, is_default: false };
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
  values.push(Date.now());
  values.push(id);

  await db.runAsync(
    `UPDATE transaction_categories SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getInitializedDatabase();
  await db.runAsync('DELETE FROM transaction_categories WHERE id = ?', [id]);
}

// Remote sync
export async function syncRemoteCategories(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('transaction_categories')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;

  const db = await getInitializedDatabase();
  await db.withTransactionAsync(async () => {
    for (const cat of (data ?? [])) {
      const normalizedCategory = normalizeCategoryIcon(cat);
      await db.runAsync(
        `INSERT OR REPLACE INTO transaction_categories
         (id, user_id, name, type, icon, color, is_default, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
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

