// Registrasi token push (roadmap Fase 3 / P2-05, task PN-4).
//
// Perubahan penting dari versi sebelumnya:
//  1. TIDAK lagi meminta izin notifikasi otomatis saat login. Izin hanya
//     diminta saat user menyalakan toggle "Notifikasi push" di Settings
//     (on-demand), sesuai prinsip roadmap §5.1 aksi #5.
//  2. Kegagalan upsert TIDAK ditelan diam-diam — dikembalikan sebagai nilai
//     dan dicatat. Sebelumnya tabel user_devices tidak ada sehingga setiap
//     registrasi gagal tanpa seorang pun tahu (audit temuan P0-2).
//  3. `updated_at` dikirim sebagai epoch ms (kolom BIGINT), bukan string ISO.

import { useCallback, useEffect, useState } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/** Status izin push saat ini, tanpa memicu prompt. */
export async function getPushPermission(): Promise<boolean> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        return status === 'granted';
    } catch {
        return false;
    }
}

/**
 * Ambil token Expo Push. Hanya dipanggil setelah izin diberikan — fungsi ini
 * tidak lagi meminta izin sendiri agar tidak memunculkan prompt tak terduga.
 */
async function fetchExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
        console.warn('[push] Token push hanya tersedia di perangkat fisik (bukan emulator).');
        return null;
    }

    try {
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        return token ?? null;
    } catch (error) {
        console.warn(`[push] Gagal mengambil token Expo: ${String(error)}`);
        return null;
    }
}

/**
 * Simpan token ke tabel `user_devices` (migrasi PN-1).
 * Mengembalikan true bila token benar-benar tersimpan di server.
 */
export async function registerDeviceToken(): Promise<boolean> {
    const user = useAuthStore.getState().user;
    if (!user?.id) return false;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1DB954',
        });
    }

    const token = await fetchExpoPushToken();
    if (!token) return false;

    try {
        const { error } = await supabase.from('user_devices').upsert(
            {
                user_id: user.id,
                push_token: token,
                device_os: Platform.OS,
                updated_at: Date.now(),
            },
            { onConflict: 'push_token' },
        );

        if (error) {
            console.warn(`[push] Gagal menyimpan token ke server: ${error.message} (${error.code})`);
            return false;
        }
        return true;
    } catch (error) {
        console.warn(`[push] Exception saat menyimpan token: ${String(error)}`);
        return false;
    }
}

/**
 * Alur on-demand: minta izin, lalu daftarkan token bila izin diberikan.
 * Dipanggil dari toggle "Notifikasi push" di Settings.
 */
export async function optInPushNotifications(): Promise<boolean> {
    try {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
            const requested = await Notifications.requestPermissionsAsync();
            finalStatus = requested.status;
        }
        if (finalStatus !== 'granted') return false;

        return await registerDeviceToken();
    } catch (error) {
        console.warn(`[push] opt-in gagal: ${String(error)}`);
        return false;
    }
}

/** Buka pengaturan sistem (untuk menonaktifkan izin — JS tidak bisa mencabut izin). */
export function openSystemNotificationSettings(): void {
    Linking.openSettings().catch(() => {
        console.warn('[push] Tidak dapat membuka pengaturan sistem.');
    });
}

/**
 * Mendaftarkan token HANYA bila izin sudah diberikan — tidak pernah memaksa
 * prompt. Aman dipanggil di RootNavigator untuk semua sesi login.
 */
export function usePushNotifications() {
    const user = useAuthStore((state) => state.user);
    const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
    const [pushGranted, setPushGranted] = useState(false);

    const refreshPermission = useCallback(async () => {
        setPushGranted(await getPushPermission());
    }, []);

    useEffect(() => {
        refreshPermission();
    }, [refreshPermission]);

    useEffect(() => {
        if (!isLoggedIn || !user?.id || !pushGranted) return;

        registerDeviceToken().then((ok) => {
            if (!ok) console.warn('[push] Token perangkat ini belum terdaftar di server.');
        });
    }, [isLoggedIn, user?.id, pushGranted]);

    return { pushGranted, refreshPermission };
}
