// Hook untuk notifications lokal dengan expo-notifications
import { useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import type { SavingGoal } from '../types/saving';

// Konfigurasi default handler notifikasi
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function useNotification() {

    /**
     * Minta izin notifikasi dari pengguna
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    }, []);

    /**
     * Jadwalkan notifikasi reminder tabungan untuk satu goal
     */
    const scheduleGoalReminder = useCallback(async (goal: SavingGoal): Promise<string | null> => {
        if (!goal.reminder_enabled || !goal.reminder_time) return null;

        const [hour, minute] = (goal.reminder_time ?? '08:00').split(':').map(Number);
        const hasPermission = await requestPermission();
        if (!hasPermission) return null;

        // Batalkan notifikasi lama jika ada (identifikasi by goal id sebagai channel)
        await cancelGoalReminder(goal.id);

        const periodLabel = goal.period_type === 'daily' ? 'hari ini'
            : goal.period_type === 'weekly' ? 'minggu ini' : 'bulan ini';

        const trigger =
            goal.period_type === 'daily'
                ? { hour, minute, repeats: true }
                : goal.period_type === 'weekly'
                    ? { weekday: 2, hour, minute, repeats: true } // Senin
                    : { day: 1, hour, minute, repeats: true };     // Tanggal 1 tiap bulan

        const id = await Notifications.scheduleNotificationAsync({
            identifier: `goal-${goal.id}`,
            content: {
                title: `💰 Waktunya nabung untuk ${goal.name}!`,
                body: `Jangan lupa sisihkan ${periodLabel} untuk mewujudkan impianmu 🎯`,
                data: { goalId: goal.id },
                sound: true,
            },
            trigger: trigger as any,
        });

        return id;
    }, []);

    /**
     * Batalkan reminder untuk satu goal
     */
    const cancelGoalReminder = useCallback(async (goalId: string): Promise<void> => {
        await Notifications.cancelScheduledNotificationAsync(`goal-${goalId}`);
    }, []);

    /**
     * Kirim notifikasi selamat saat goal tercapai
     */
    const sendCompletionNotification = useCallback(async (goalName: string): Promise<void> => {
        const hasPermission = await requestPermission();
        if (!hasPermission) return;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: '🎉 Selamat! Target Tercapai!',
                body: `Target "${goalName}" sudah tercapai! Kamu luar biasa! 🏆`,
                sound: true,
            },
            trigger: null, // tampilkan langsung
        });
    }, []);

    /**
     * Jadwalkan reminder harian untuk mencatat pengeluaran
     */
    const scheduleDailyReminder = useCallback(async (hour: number = 21, minute: number = 0): Promise<string> => {
        await Notifications.cancelScheduledNotificationAsync('daily-reminder');

        const id = await Notifications.scheduleNotificationAsync({
            identifier: 'daily-reminder',
            content: {
                title: '📝 Jangan lupa catat keuanganmu!',
                body: 'Catat pengeluaran hari ini sebelum tidur untuk menjaga keuangan tetap terkontrol',
                sound: true,
            },
            trigger: { hour, minute, repeats: true },
        });

        return id;
    }, []);

    /**
     * Batalkan semua notifikasi terjadwal
     */
    const cancelAllNotifications = useCallback(async (): Promise<void> => {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }, []);

    return {
        requestPermission,
        scheduleGoalReminder,
        cancelGoalReminder,
        sendCompletionNotification,
        scheduleDailyReminder,
        cancelAllNotifications,
    };
}
