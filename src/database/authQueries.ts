// Query database untuk autentikasi pengguna — auth via Supabase Auth (aman)
// Catatan: Password hashing lokal (SHA-256 + static salt) telah dihapus karena tidak aman.
// Semua autentikasi ditangani oleh Supabase Auth yang menggunakan bcrypt + per-user salt.
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { clearAllData } from './schema';

export interface UserRecord {
    id: string;
    name: string;
    email: string;
    avatar_color: string;
    created_at: number;
}

const SECURE_SESSION_KEY = 'tabungin_session_v2';

/**
 * Hapus Akun User: Hapus data di Cloud dan Lokal
 */
export async function deleteUserAccount(): Promise<void> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Hapus data di Supabase (RLS akan membatasi ke data user sendiri)
            // Menggunakan neq('id', '0...') adalah trik untuk 'delete all' yang valid syntaxnya
            await Promise.all([
                supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('saving_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
                supabase.from('budgets').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
            ]);
        }
    } catch (e) {
        console.error('Error deleting cloud data:', e);
        // Lanjut hapus lokal meskipun cloud gagal, agar perangkat tetap bersih
    }

    // Hapus data lokal
    await clearAllData();

    // Hapus session
    await clearSession();
    await supabase.auth.signOut();
}

export async function saveSession(user: UserRecord): Promise<void> {
    await SecureStore.setItemAsync(SECURE_SESSION_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<UserRecord | null> {
    try {
        const raw = await SecureStore.getItemAsync(SECURE_SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as UserRecord;
    } catch {
        return null;
    }
}

export async function clearSession(): Promise<void> {
    await SecureStore.deleteItemAsync(SECURE_SESSION_KEY);
}
