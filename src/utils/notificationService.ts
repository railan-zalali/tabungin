import {
    IosAuthorizationStatus,
    type NotificationPermissionsStatus,
} from 'expo-notifications/build/NotificationPermissions.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { v4 as uuidv4 } from 'uuid';
import type { SavingGoal } from '../types/saving';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

function hasGrantedPermission(response: NotificationPermissionsStatus): boolean {
    const normalized = response as NotificationPermissionsStatus & {
        status?: string;
        granted?: boolean;
    };

    return (
        normalized.granted === true ||
        normalized.status === 'granted' ||
        response.ios?.status === IosAuthorizationStatus.AUTHORIZED ||
        response.ios?.status === IosAuthorizationStatus.PROVISIONAL ||
        response.ios?.status === IosAuthorizationStatus.EPHEMERAL
    );
}

export async function requestNotificationPermission(): Promise<boolean> {
    try {
        const existing = await getPermissionsAsync();
        if (hasGrantedPermission(existing)) return true;

        const requested = await requestPermissionsAsync();
        return hasGrantedPermission(requested);
    } catch {
        return false;
    }
}

export async function scheduleGoalReminder(goal: SavingGoal): Promise<void> {
    if (!goal.reminder_enabled || !goal.reminder_time) return;

    const [hourStr, minuteStr] = goal.reminder_time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return;

    await cancelGoalReminder(goal.id);

    const granted = await requestNotificationPermission();
    if (!granted) return;

    const progressPercent =
        goal.target_amount > 0
            ? Math.round((goal.current_amount / goal.target_amount) * 100)
            : 0;

    try {
        await scheduleNotificationAsync({
            content: {
                title: 'Waktunya menabung',
                body: `${goal.name} sudah ${progressPercent}% tercapai. Yuk lanjutkan progress hari ini.`,
                data: { goalId: goal.id },
                sound: true,
            },
            trigger: {
                type: SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
            },
        });
    } catch (error) {
        console.warn('[Notifikasi] Gagal menjadwalkan reminder goal:', error);
    }
}

export async function cancelGoalReminder(goalId: string): Promise<void> {
    try {
        const scheduled = await getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            if (notification.content.data?.goalId === goalId) {
                await cancelScheduledNotificationAsync(notification.identifier);
            }
        }
    } catch {
        // Ignore if there is no scheduled reminder for this goal.
    }
}

export async function rescheduleAllReminders(goals: SavingGoal[]): Promise<void> {
    try {
        const scheduled = await getAllScheduledNotificationsAsync();
        for (const notification of scheduled) {
            if (notification.content.data?.goalId) {
                await cancelScheduledNotificationAsync(notification.identifier);
            }
        }

        const activeWithReminder = goals.filter((goal) => !goal.is_completed && goal.reminder_enabled);
        for (const goal of activeWithReminder) {
            await scheduleGoalReminder(goal);
        }
    } catch (error) {
        console.warn('[Notifikasi] Gagal me-reset reminder:', error);
    }
}

export async function sendGoalCompletedNotification(goal: SavingGoal): Promise<void> {
    const granted = await requestNotificationPermission();

    const title = 'Target tercapai';
    const body = `Selamat, target ${goal.name} berhasil dicapai.`;

    if (granted) {
        try {
            await scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    data: { goalId: goal.id },
                    sound: true,
                },
                trigger: null,
            });
        } catch (error) {
            console.warn('[Notifikasi] Gagal menampilkan notifikasi target tercapai:', error);
        }
    }

    await saveNotificationToDatabase('goal_completed', title, body, { goalId: goal.id });
}

export async function sendBudgetWarningNotification(
    category: string,
    categoryName: string,
    percentage: number,
): Promise<void> {
    const granted = await requestNotificationPermission();

    const title = percentage >= 100 ? 'Budget melebihi batas' : 'Budget hampir habis';
    const body =
        percentage >= 100
            ? `Budget kategori ${categoryName} sudah terlampaui (${Math.round(percentage)}%).`
            : `Budget kategori ${categoryName} sudah ${Math.round(percentage)}% terpakai.`;

    if (granted) {
        try {
            await scheduleNotificationAsync({
                content: { title, body, sound: true },
                trigger: null,
            });
        } catch (error) {
            console.warn('[Notifikasi] Gagal menampilkan notifikasi budget:', error);
        }
    }

    await saveNotificationToDatabase('budget_warning', title, body, { category, categoryName, percentage });
}

export async function sendWalletInviteNotification(walletName: string, sharedBy: string): Promise<void> {
    const granted = await requestNotificationPermission();

    const title = 'Undangan dompet baru';
    const body = `${sharedBy} mengundang kamu untuk bergabung ke dompet "${walletName}".`;

    if (granted) {
        try {
            await scheduleNotificationAsync({
                content: { title, body, sound: true },
                trigger: null,
            });
        } catch (error) {
            console.warn('[Notifikasi] Gagal menampilkan notifikasi undangan dompet:', error);
        }
    }

    await saveNotificationToDatabase('wallet_invite', title, body, { walletName, sharedBy });
}

async function saveNotificationToDatabase(
    type: 'goal_reminder' | 'goal_completed' | 'budget_warning' | 'wallet_invite',
    title: string,
    body: string,
    data?: Record<string, unknown>,
): Promise<void> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    await supabase.from('notifications').insert({
        id: uuidv4(),
        user_id: userId,
        type,
        title,
        body,
        data: data ?? {},
        is_read: false,
        created_at: Date.now(),
    });
}
