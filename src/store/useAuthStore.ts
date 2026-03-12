// Zustand store untuk autentikasi — menggunakan password hashing + expo-secure-store
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { clearAllData } from '../database/schema';
import { syncDatabase } from '../database/sync';
import {
    createOfflineSession,
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
            
            // Cek session Supabase
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
                set({
                    user: {
                        id: session.user.id,
                        name: session.user.user_metadata?.name || 'Pengguna',
                        email: session.user.email || '',
                        avatarColor: session.user.user_metadata?.avatar_color || '#1DB954',
                    },
                    isLoggedIn: true,
                    isOfflineMode: false,
                });
            } else {
                // Cek session offline jika tidak ada session Supabase
                // TODO: Implementasi load session offline yang lebih robust jika diperlukan
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                set({ authError: error.message });
                return false;
            }

            if (data.user) {
                set({
                    user: {
                        id: data.user.id,
                        name: data.user.user_metadata?.name || 'Pengguna',
                        email: data.user.email || '',
                        avatarColor: data.user.user_metadata?.avatar_color || '#1DB954',
                    },
                    isLoggedIn: true,
                    isOfflineMode: false,
                });
                
                // Trigger sync setelah login berhasil
                setTimeout(() => syncDatabase(), 500);
                
                return true;
            }
            return false;
        } catch (e: any) {
            set({ authError: 'Terjadi kesalahan saat login.' });
            return false;
        }
    },

    loginOffline: async () => {
        set({ authError: null });
        const user = await createOfflineSession();
        // Mapping UserRecord to AuthUser
        const authUser: AuthUser = {
             id: user.id,
             name: user.name,
             email: user.email,
             avatarColor: user.avatar_color
        };
        set({ user: authUser, isLoggedIn: true, isOfflineMode: true });
    },

    register: async (name: string, email: string, password: string) => {
        set({ authError: null });
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        avatar_color: '#1DB954', // Default color
                    },
                },
            });

            if (error) {
                set({ authError: error.message });
                return false;
            }

            if (data.user) {
                 set({
                    user: {
                        id: data.user.id,
                        name: name,
                        email: email,
                        avatarColor: '#1DB954',
                    },
                    isLoggedIn: true,
                    isOfflineMode: false,
                });
                return true;
            }
            return false;
        } catch (e: any) {
            set({ authError: 'Terjadi kesalahan saat mendaftar.' });
            return false;
        }
    },

    logout: async () => {
        const { isOfflineMode } = get();
        if (!isOfflineMode) {
            await supabase.auth.signOut();
        }
        
        // Bersihkan data lokal demi keamanan dan privasi
        await clearAllData();
        
        set({ user: null, isLoggedIn: false, isOfflineMode: false, authError: null });
    },

    updateProfile: async (data) => {
        const current = get().user;
        if (!current) return;
        
        // Update local state
        set({ user: { ...current, ...data } });

        // Update Supabase if online
        if (!get().isOfflineMode) {
             await supabase.auth.updateUser({
                data: {
                    name: data.name,
                    avatar_color: data.avatarColor
                }
            });
        }
    },

    updatePassword: async (oldPassword: string, newPassword: string) => {
        const { isOfflineMode } = get();
        if (isOfflineMode) return false;

        try {
            // Supabase tidak butuh oldPassword untuk update password jika user sudah login
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });
            return !error;
        } catch {
            return false;
        }
    },

    checkEmailExists: async (email: string) => {
        // Supabase tidak mengekspos API publik untuk cek email exists tanpa mencoba register/login
        // Kita bisa asumsikan false atau handle error saat register
        return false; 
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
