import { create } from 'zustand';
import type { Notification } from '../types/notification';
import {
  fetchLocalNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  insertNotification,
  syncRemoteNotifications,
  createRemoteNotification,
  updateRemoteNotificationAsRead,
  updateRemoteAllAsRead,
  deleteRemoteNotification,
} from '../database/notificationQueries';
import { useAuthStore } from './useAuthStore';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;

  loadNotifications: () => Promise<void>;
  loadUnreadCount: () => Promise<void>;
  readNotification: (id: string) => Promise<void>;
  readAllNotifications: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  loadNotifications: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;

      await syncRemoteNotifications(userId);
      const notifications = await fetchLocalNotifications(userId);
      set({ notifications });
    } catch (error) {
      console.error('[NotificationStore] Gagal memuat notifikasi:', error);
      set({ notifications: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadUnreadCount: async () => {
    try {
      const userId = useAuthStore.getState().user?.id;
      if (!userId) return;
      const count = await fetchUnreadCount(userId);
      set({ unreadCount: count });
    } catch (error) {
      console.error('[NotificationStore] Gagal memuat jumlah notifikasi:', error);
      set({ unreadCount: 0 });
    }
  },

  readNotification: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await markAsRead(id);
    await updateRemoteNotificationAsRead(id);

    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  readAllNotifications: async () => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await markAllAsRead(userId);
    await updateRemoteAllAsRead(userId);

    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  removeNotification: async (id) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await deleteNotification(id);
    await deleteRemoteNotification(id);

    const notification = get().notifications.find(n => n.id === id);
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id),
      unreadCount: notification && !notification.is_read
        ? Math.max(0, state.unreadCount - 1)
        : state.unreadCount,
    }));
  },

  createNotification: async (notification) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await createRemoteNotification({ ...notification, user_id: userId });
    const newNotification = await insertNotification({ ...notification, user_id: userId });

    set((state) => ({
      notifications: [newNotification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
