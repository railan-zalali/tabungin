import { v4 as uuidv4 } from 'uuid';
import type { SavingGoal } from '../types/saving';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { AppReminder } from '../database/reminderQueries';
import type { RecurringTransaction } from '../database/recurringQueries';

type NotificationType =
    | 'goal_reminder'
    | 'goal_completed'
    | 'budget_warning'
    | 'budget_reminder'
    | 'recurring_reminder'
    | 'manual_reminder'
    | 'wallet_invite'
    | 'app_update_available';

export async function requestNotificationPermission(): Promise<boolean> {
    return false;
}

export async function scheduleGoalReminder(_goal: SavingGoal): Promise<void> {}

export async function cancelGoalReminder(_goalId: string): Promise<void> {}

export async function rescheduleAllReminders(_goals: SavingGoal[]): Promise<void> {}

export async function scheduleBudgetReminder(_reminder: {
    id: string;
    category: string;
    month: number;
    year: number;
    reminder_time: string | null;
}): Promise<void> {}

export async function scheduleRecurringReminder(_recurring: RecurringTransaction): Promise<void> {}

export async function scheduleManualReminder(_reminder: AppReminder): Promise<void> {}

export async function rescheduleCrossFeatureReminders(): Promise<void> {}

export async function sendGoalCompletedNotification(goal: SavingGoal): Promise<void> {
    await saveNotificationToDatabase(
        'goal_completed',
        'Target Tercapai!',
        `Selamat! Kamu berhasil mencapai target ${goal.emoji} ${goal.name}!`,
        { goalId: goal.id },
    );
}

export async function sendBudgetWarningNotification(
    category: string,
    categoryName: string,
    percentage: number,
): Promise<void> {
    const title = percentage >= 100 ? 'Budget Melebihi Batas!' : 'Budget Hampir Habis';
    const body =
        percentage >= 100
            ? `Budget kategori ${categoryName} sudah terlampaui (${Math.round(percentage)}%)`
            : `Budget kategori ${categoryName} sudah ${Math.round(percentage)}% terpakai`;

    await saveNotificationToDatabase('budget_warning', title, body, { category, categoryName, percentage });
}

export async function sendWalletInviteNotification(walletName: string, sharedBy: string): Promise<void> {
    await saveNotificationToDatabase(
        'wallet_invite',
        'Undangan Dompet Baru',
        `${sharedBy} mengundang kamu untuk bergabung ke dompet "${walletName}"`,
        { walletName, sharedBy },
    );
}

async function saveNotificationToDatabase(
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, unknown>,
): Promise<void> {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || !useAuthStore.getState().canSync) return;

    try {
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
    } catch (error) {
        console.warn('[Web Notifications] Failed to save notification:', error);
    }
}
