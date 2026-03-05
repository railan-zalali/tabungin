// Zustand store untuk autentikasi — menggunakan password hashing + expo-secure-store
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    registerUser,
    loginUser,
    updateUserProfile,
    changePassword,
    loadSession,
    clearSession,
    createOfflineSession,
    isEmailRegistered,
    type UserRecord,
} from '../database/authQueries';

// Settings Key di AsyncStorage
const SETTINGS_KEY = '@tabungin_settings_v2';
let _cachedSettings: Record<string, unknown> | null = null;

async function loadSettingsCache(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        _cachedSettings = raw ? JSON.parse(raw) : {};
    } catch {
        _cachedSettings = {};
    }
}
async function persistSetting<T>(key: string, value: T): Promise<void> {
    if (!_cachedSettings) _cachedSettings = {};
    _cachedSettings[key] = value;
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(_cachedSettings));
}
function readSettingSync<T>(key: string, fallback: T): T {
    if (!_cachedSettings) return fallback;
    const v = _cachedSettings[key];
    return v !== undefined ? (v as T) : fallback;
}

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
}

interface AuthState {
    user: AuthUser | null;
    isLoggedIn: boolean;
    isOfflineMode: boolean;
    isLoading: boolean;
    authError: string | null;

    // Actions
    login: (email: string, password: string) => Promise<boolean>;
    loginOffline: () => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'avatarColor'>>) => Promise<void>;
    updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    checkEmailExists: (email: string) => Promise<boolean>;
    loadSession: () => Promise<void>;
    clearError: () => void;

    // Settings (persisted via AsyncStorage)
    isDarkMode: boolean;
    textSize: 'normal' | 'large' | 'xlarge';
    hapticEnabled: boolean;
    setDarkMode: (value: boolean) => void;
    setTextSize: (size: 'normal' | 'large' | 'xlarge') => void;
    setHapticEnabled: (value: boolean) => void;
}

function userRecordToAuthUser(r: UserRecord): AuthUser {
    return { id: r.id, name: r.name, email: r.email, avatarColor: r.avatar_color };
}


export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoggedIn: false,
    isOfflineMode: false,
    isLoading: true,
    authError: null,

    isDarkMode: false,
    textSize: 'normal' as 'normal' | 'large' | 'xlarge',
    hapticEnabled: true,

    loadSession: async () => {
        try {
            await loadSettingsCache();
            const user = await loadSession();
            if (user) {
                set({
                    user: userRecordToAuthUser(user),
                    isLoggedIn: true,
                    isOfflineMode: user.id.startsWith('offline_'),
                });
            }
            set({
                isDarkMode: readSettingSync('isDarkMode', false),
                textSize: readSettingSync<'normal' | 'large' | 'xlarge'>('textSize', 'normal'),
                hapticEnabled: readSettingSync('hapticEnabled', true),
            });
        } catch (e) {
            console.error('Gagal memuat sesi:', e);
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (email: string, password: string) => {
        set({ authError: null });
        try {
            const user = await loginUser(email, password);
            if (!user) {
                set({ authError: 'Email atau password salah.' });
                return false;
            }
            set({ user: userRecordToAuthUser(user), isLoggedIn: true, isOfflineMode: false });
            return true;
        } catch (e: any) {
            set({ authError: 'Terjadi kesalahan saat login.' });
            return false;
        }
    },

    loginOffline: async () => {
        set({ authError: null });
        const user = await createOfflineSession();
        set({ user: userRecordToAuthUser(user), isLoggedIn: true, isOfflineMode: true });
    },

    register: async (name: string, email: string, password: string) => {
        set({ authError: null });
        try {
            const exists = await isEmailRegistered(email);
            if (exists) {
                set({ authError: 'Email sudah terdaftar. Silakan login.' });
                return false;
            }
            const user = await registerUser(name, email, password);
            set({ user: userRecordToAuthUser(user), isLoggedIn: true, isOfflineMode: false });
            return true;
        } catch (e: any) {
            // Tangkap error duplikat dari SQLite
            if (e?.message?.includes('UNIQUE')) {
                set({ authError: 'Email sudah terdaftar. Silakan login.' });
            } else {
                set({ authError: 'Terjadi kesalahan saat mendaftar.' });
            }
            return false;
        }
    },

    logout: async () => {
        await clearSession();
        set({ user: null, isLoggedIn: false, isOfflineMode: false, authError: null });
    },

    updateProfile: async (data) => {
        const current = get().user;
        if (!current) return;
        await updateUserProfile(current.id, {
            name: data.name,
            avatar_color: data.avatarColor,
        });
        set({ user: { ...current, ...data } });
        // Update session di secure store
        const { loadSession: load } = get();
        // Re-read updated session implicitly handled by userRecordToAuthUser
        const sessionData = { ...current, ...data };
        const { saveSession } = await import('../database/authQueries');
        await saveSession({
            id: sessionData.id,
            name: sessionData.name,
            email: sessionData.email,
            avatar_color: sessionData.avatarColor,
            created_at: Date.now(),
        });
    },

    updatePassword: async (oldPassword: string, newPassword: string) => {
        const current = get().user;
        if (!current) return false;
        const { changePassword: change } = await import('../database/authQueries');
        return await change(current.id, oldPassword, newPassword);
    },

    checkEmailExists: async (email: string) => {
        return await isEmailRegistered(email);
    },

    clearError: () => set({ authError: null }),

    setDarkMode: (value) => {
        set({ isDarkMode: value });
        persistSetting('isDarkMode', value);
    },
    setTextSize: (size) => {
        set({ textSize: size });
        persistSetting('textSize', size);
    },
    setHapticEnabled: (value) => {
        set({ hapticEnabled: value });
        persistSetting('hapticEnabled', value);
    },
}));
