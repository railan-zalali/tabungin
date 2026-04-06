// Notification Queries - Database operations for notifications
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType =
  | 'goal_reminder'
  | 'goal_completed'
  | 'budget_warning'
  | 'budget_reminder'
  | 'recurring_reminder'
  | 'manual_reminder'
  | 'wallet_invite'
  | 'app_update_available';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: number;
}

function parseNotificationRow(row: any): Notification {
  return {
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data || '{}') : row.data || {},
    is_read: Boolean(row.is_read),
  };
}

// Local queries
export async function fetchLocalNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
  const db = await getInitializedDatabase();
  const rows = await db.getAllAsync<Notification>(
    `SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows.map(parseNotificationRow);
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const db = await getInitializedDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM notifications
     WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return result?.count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const db = await getInitializedDatabase();
  await db.runAsync(
    `UPDATE notifications SET is_read = 1 WHERE id = ?`,
    [notificationId]
  );
}

export async function markAllAsRead(userId: string): Promise<void> {
  const db = await getInitializedDatabase();
  await db.runAsync(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
    [userId]
  );
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const db = await getInitializedDatabase();
  await db.runAsync(
    `DELETE FROM notifications WHERE id = ?`,
    [notificationId]
  );
}

export async function insertNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
  const db = await getInitializedDatabase();
  const id = uuidv4();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO notifications (id, user_id, type, title, body, data, is_read, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'synced')`,
    [id, notification.user_id, notification.type, notification.title, notification.body,
     JSON.stringify(notification.data), now]
  );

  return parseNotificationRow({ ...notification, id, created_at: now, is_read: false });
}

// Remote sync
export async function syncRemoteNotifications(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;

  const db = await getInitializedDatabase();
  await db.withTransactionAsync(async () => {
    for (const notif of (data ?? [])) {
      await db.runAsync(
        `INSERT OR REPLACE INTO notifications
         (id, user_id, type, title, body, data, is_read, created_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
        [notif.id, notif.user_id, notif.type, notif.title, notif.body,
         JSON.stringify(notif.data), notif.is_read, notif.created_at]
      );
    }
  });
}

// Remote operations
export async function createRemoteNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<void> {
  const id = uuidv4();
  const now = Date.now();

  await supabase.from('notifications').insert({
    id,
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    is_read: false,
    created_at: now,
  });
}

export async function updateRemoteNotificationAsRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function updateRemoteAllAsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);
}

export async function deleteRemoteNotification(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);
}
