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
import type { AppReminder } from '../database/reminderQueries';
import { fetchEnabledAppReminders } from '../database/reminderQueries';
import { fetchBudgetReminderCandidates } from '../database/budgetQueries';
import { fetchRecurringReminderCandidates, type RecurringTransaction } from '../database/recurringQueries';

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
        const { status: existingStatus } = await getPermissionsAsync();
        if (existingStatus === 'granted') return true;
        const { status } = await requestPermissionsAsync();
        return status === 'granted';
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

function toTimeParts(timeText: string | null | undefined, fallbackHour = 8, fallbackMinute = 0) {
    if (!timeText) {
        return { hour: fallbackHour, minute: fallbackMinute };
    }

    const [hourText, minuteText] = timeText.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);
    return {
        hour: Number.isFinite(hour) ? hour : fallbackHour,
        minute: Number.isFinite(minute) ? minute : fallbackMinute,
    };
}

export async function scheduleBudgetReminder(reminder: {
    id: string;
    category: string;
    month: number;
    year: number;
    reminder_time: string | null;
}): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const { hour, minute } = toTimeParts(reminder.reminder_time, 9, 0);

    await cancelScheduledNotificationAsync(`budget_reminder_${reminder.id}`);
    await scheduleNotificationAsync({
        identifier: `budget_reminder_${reminder.id}`,
        content: {
            title: 'Budget Reminder',
            body: `Pantau budget kategori ${reminder.category} untuk ${reminder.month}/${reminder.year}.`,
            data: {
                category: reminder.category,
                reminderId: reminder.id,
                targetScreen: 'Budget',
            },
            sound: true,
        },
        trigger: {
            type: SchedulableTriggerInputTypes.MONTHLY,
            day: 1,
            hour,
            minute,
        } as any,
    });
}

export async function scheduleRecurringReminder(recurring: RecurringTransaction): Promise<void> {
    const granted = await requestNotificationPermission();
    if (!granted) return;

    const triggerDate = new Date(
        recurring.next_occurrence - Math.max(5, recurring.reminder_offset_minutes) * 60 * 1000,
    );
    const scheduledAt = triggerDate.getTime();
    if (scheduledAt <= Date.now()) return;

    await cancelScheduledNotificationAsync(`recurring_reminder_${recurring.id}`);
    await scheduleNotificationAsync({
        identifier: `recurring_reminder_${recurring.id}`,
        content: {
            title: 'Pengingat transaksi berulang',
            body: `${recurring.category} akan dijalankan sebentar lagi.`,
            data: {
                recurringId: recurring.id,
                targetScreen: 'RecurringTransaction',
            },
            sound: true,
        },
        trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
        } as any,
    });
}

export async function scheduleManualReminder(reminder: AppReminder): Promise<void> {
    if (!reminder.is_enabled) return;

    const granted = await requestNotificationPermission();
    if (!granted) return;

    await cancelScheduledNotificationAsync(`manual_reminder_${reminder.id}`);

    if (reminder.frequency === 'once') {
        await scheduleNotificationAsync({
            identifier: `manual_reminder_${reminder.id}`,
            content: {
                title: reminder.title,
                body: reminder.note || 'Pengingat dari Tabungin',
                data: {
                    reminderId: reminder.id,
                    targetScreen: reminder.target_screen,
                    ...reminder.target_params,
                },
                sound: true,
            },
            trigger: {
                type: SchedulableTriggerInputTypes.DATE,
                date: new Date(reminder.trigger_at),
            } as any,
        });
        return;
    }

    const { hour, minute } = toTimeParts(reminder.time_of_day, 8, 0);
    const baseContent = {
        title: reminder.title,
        body: reminder.note || 'Pengingat dari Tabungin',
        data: {
            reminderId: reminder.id,
            targetScreen: reminder.target_screen,
            ...reminder.target_params,
        },
        sound: true,
    };

    if (reminder.frequency === 'daily') {
        await scheduleNotificationAsync({
            identifier: `manual_reminder_${reminder.id}`,
            content: baseContent,
            trigger: {
                type: SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
            },
        });
        return;
    }

    if (reminder.frequency === 'weekly') {
        await scheduleNotificationAsync({
            identifier: `manual_reminder_${reminder.id}`,
            content: baseContent,
            trigger: {
                type: SchedulableTriggerInputTypes.WEEKLY,
                weekday: (reminder.day_of_week ?? 1) + 1,
                hour,
                minute,
            } as any,
        });
        return;
    }

    await scheduleNotificationAsync({
        identifier: `manual_reminder_${reminder.id}`,
        content: baseContent,
        trigger: {
            type: SchedulableTriggerInputTypes.MONTHLY,
            day: reminder.day_of_month ?? 1,
            hour,
            minute,
        } as any,
    });
}

export async function rescheduleCrossFeatureReminders(): Promise<void> {
    try {
        const user = useAuthStore.getState().user;
        if (!user?.id) return;

        const now = new Date();
        const budgets = await fetchBudgetReminderCandidates(now.getMonth() + 1, now.getFullYear());
        const recurring = await fetchRecurringReminderCandidates(user.id);
        const manualReminders = await fetchEnabledAppReminders(user.id);

        const scheduled = await getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            if (
                notification.identifier.startsWith('budget_reminder_') ||
                notification.identifier.startsWith('recurring_reminder_') ||
                notification.identifier.startsWith('manual_reminder_')
            ) {
                await cancelScheduledNotificationAsync(notification.identifier);
            }
        }

        for (const budget of budgets) {
            await scheduleBudgetReminder({
                id: budget.id,
                category: budget.category,
                month: budget.month,
                year: budget.year,
                reminder_time: budget.reminder_time,
            });
        }

        for (const recurringItem of recurring) {
            await scheduleRecurringReminder(recurringItem);
        }

        for (const reminder of manualReminders) {
            await scheduleManualReminder(reminder);
        }
    } catch (error) {
        console.warn('[Notifikasi] Gagal menyiapkan reminder lintas fitur:', error);
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
    type: 'goal_reminder' | 'goal_completed' | 'budget_warning' | 'budget_reminder' | 'recurring_reminder' | 'manual_reminder' | 'wallet_invite' | 'app_update_available',
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
