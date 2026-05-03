// Notification Service — Scheduling push notification untuk reminder tabungan
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { v4 as uuidv4 } from 'uuid';

import type { SavingGoal } from '../types/saving';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

// Konfigurasi bagaimana notifikasi ditampilkan saat app foreground
setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Minta izin notifikasi dari pengguna
 * Returns true jika izin diberikan
 */
export async function requestNotificationPermission(): Promise<boolean> {
    try {
        const existingStatus = await getPermissionsAsync();
        if (existingStatus.granted) return true;
        const status = await requestPermissionsAsync();
        return status.granted;
    } catch {
        return false;
    }
}

/**
 * Schedule reminder harian untuk satu saving goal
 * Gunakan identifier = goal.id agar mudah di-cancel
 */
export async function scheduleGoalReminder(goal: SavingGoal): Promise<void> {
    if (!goal.reminder_enabled || !goal.reminder_time) return;

    const [hourStr, minuteStr] = goal.reminder_time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) return;

    await cancelGoalReminder(goal.id);

    const granted = await requestNotificationPermission();
    if (!granted) return;

    const progressPercent = goal.target_amount > 0
        ? Math.round((goal.current_amount / goal.target_amount) * 100)
        : 0;

    await scheduleNotificationAsync({
        identifier: `goal_reminder_${goal.id}`,
        content: {
            title: `💰 Waktunya menabung!`,
            body: `${goal.emoji} ${goal.name} — ${progressPercent}% tercapai. Yuk nabung hari ini!`,
            data: { goalId: goal.id },
            sound: true,
        },
        trigger: {
            type: SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        },
    });
}

/**
 * Cancel reminder untuk satu goal
 */
export async function cancelGoalReminder(goalId: string): Promise<void> {
    try {
        await cancelScheduledNotificationAsync(`goal_reminder_${goalId}`);
    } catch {
        // Ignore jika tidak ada
    }
}

/**
 * Re-schedule semua goal aktif yang memiliki reminder (dipanggil saat app start)
 */
export async function rescheduleAllReminders(goals: SavingGoal[]): Promise<void> {
    try {
        const scheduled = await getAllScheduledNotificationsAsync();
        for (const notif of scheduled) {
            if (notif.identifier.startsWith('goal_reminder_')) {
                await cancelScheduledNotificationAsync(notif.identifier);
            }
        }
        const activeWithReminder = goals.filter((g) => !g.is_completed && g.reminder_enabled);
        for (const goal of activeWithReminder) {
            await scheduleGoalReminder(goal);
        }
    } catch (e) {
        console.warn('[Notifikasi] Gagal re-schedule reminder:', e);
    }
}

/**
 * Kirim notifikasi langsung (untuk konfirmasi goal tercapai)
 */
export async function sendGoalCompletedNotification(goal: SavingGoal): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    await scheduleNotificationAsync({
        identifier: `goal_completed_${goal.id}_${Date.now()}`,
        content: {
            title: `🎉 Target Tercapai!`,
            body: `Selamat! Kamu berhasil mencapai target ${goal.emoji} ${goal.name}!`,
            data: { goalId: goal.id },
            sound: true,
        },
        trigger: null,
    });

    // Save to database
    await saveNotificationToDatabase('goal_completed', `🎉 Target Tercapai!`, `Selamat! Kamu berhasil mencapai target ${goal.emoji} ${goal.name}!`, { goalId: goal.id });
}

/**
 * Kirim notifikasi peringatan budget (ketika >80% budget habis)
 */
export async function sendBudgetWarningNotification(
    category: string,
    categoryName: string,
    percentage: number
): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const emoji = percentage >= 100 ? '🚨' : '⚠️';
    const title = percentage >= 100 ? `${emoji} Budget Melebihi Batas!` : `${emoji} Budget Hampir Habis`;
    const body = percentage >= 100
        ? `Budget kategori ${categoryName} sudah terlampaui (${Math.round(percentage)}%)`
        : `Budget kategori ${categoryName} sudah ${Math.round(percentage)}% terpakai`;

    await scheduleNotificationAsync({
        identifier: `budget_warning_${category}_${Date.now()}`,
        content: { title, body, sound: true },
        trigger: null,
    });

    // Save to database
    await saveNotificationToDatabase('budget_warning', title, body, { category, categoryName, percentage });
}

/**
 * Kirim notifikasi undangan dompet
 */
export async function sendWalletInviteNotification(walletName: string, sharedBy: string): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const title = '📥 Undangan Dompet Baru';
    const body = `${sharedBy} mengundang kamu untuk bergabung ke dompet "${walletName}"`;

    await scheduleNotificationAsync({
        identifier: `wallet_invite_${Date.now()}`,
        content: { title, body, sound: true },
        trigger: null,
    });

    // Save to database
    await saveNotificationToDatabase('wallet_invite', title, body, { walletName, sharedBy });
}

/**
 * Helper untuk menyimpan notifikasi ke database
 */
async function saveNotificationToDatabase(
    type: 'goal_reminder' | 'goal_completed' | 'budget_warning' | 'wallet_invite',
    title: string,
    body: string,
    data?: any
): Promise<void> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await supabase.from('notifications').insert({
        id: uuidv4(),
        user_id: userId,
        type,
        title,
        body,
        data: data || {},
        is_read: false,
        created_at: Date.now(),
    });
}
