// Query database untuk autentikasi pengguna — menggunakan password hashing (SHA-256)
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { getInitializedDatabase } from './schema';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface UserRecord {
    id: string;
    name: string;
    email: string;
    avatar_color: string;
    created_at: number;
}

const SECURE_SESSION_KEY = 'tabungin_session_v2';
const AVATAR_COLORS = ['#1DB954', '#F5A623', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

function randomAvatarColor(): string {
    return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Hash password menggunakan SHA-256 via expo-crypto
 */
export async function hashPassword(password: string): Promise<string> {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password + 'tabungin_salt_v1' // static salt — untuk production gunakan per-user random salt
    );
}

/**
 * Daftarkan pengguna baru ke SQLite dengan password hash
 */
export async function registerUser(
    name: string,
    email: string,
    password: string
): Promise<UserRecord> {
    const db = await getInitializedDatabase();
    const id = uuidv4();
    const password_hash = await hashPassword(password);
    const avatar_color = randomAvatarColor();
    const created_at = Date.now();

    await db.runAsync(
        `INSERT INTO users (id, name, email, password_hash, avatar_color, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, name.trim(), email.toLowerCase().trim(), password_hash, avatar_color, created_at]
    );

    const user: UserRecord = { id, name: name.trim(), email: email.toLowerCase().trim(), avatar_color, created_at };
    await saveSession(user);
    return user;
}

/**
 * Login pengguna — verifikasi password hash
 */
export async function loginUser(email: string, password: string): Promise<UserRecord | null> {
    const db = await getInitializedDatabase();
    const password_hash = await hashPassword(password);

    const row = await db.getFirstAsync<UserRecord & { password_hash: string }>(
        'SELECT * FROM users WHERE email = ? AND password_hash = ?',
        [email.toLowerCase().trim(), password_hash]
    );

    if (!row) return null;

    const user: UserRecord = {
        id: row.id,
        name: row.name,
        email: row.email,
        avatar_color: row.avatar_color,
        created_at: row.created_at,
    };
    await saveSession(user);
    return user;
}

/**
 * Perbarui profil pengguna
 */
export async function updateUserProfile(
    id: string,
    data: Partial<Pick<UserRecord, 'name' | 'avatar_color'>>
): Promise<void> {
    const db = await getInitializedDatabase();
    const allowed: Record<string, string> = {};
    if (data.name !== undefined) allowed['name'] = data.name.trim();
    if (data.avatar_color !== undefined) allowed['avatar_color'] = data.avatar_color;
    if (Object.keys(allowed).length === 0) return;
    const fields = Object.keys(allowed).map((k) => `${k} = ?`).join(', ');
    await db.runAsync(`UPDATE users SET ${fields} WHERE id = ?`, [...Object.values(allowed), id]);
}

/**
 * Ganti password pengguna
 */
export async function changePassword(
    id: string,
    oldPassword: string,
    newPassword: string
): Promise<boolean> {
    const db = await getInitializedDatabase();
    const oldHash = await hashPassword(oldPassword);
    const row = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM users WHERE id = ? AND password_hash = ?',
        [id, oldHash]
    );
    if (!row) return false;
    const newHash = await hashPassword(newPassword);
    await db.runAsync('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, id]);
    return true;
}

/**
 * Cek apakah email sudah terdaftar
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
    const db = await getInitializedDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
    );
    return (row?.count ?? 0) > 0;
}

import { supabase } from '../lib/supabase';
import { clearAllData } from './schema';

// ... existing imports

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

