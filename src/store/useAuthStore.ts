import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { clearAllData } from '../database/schema';
import { syncDatabase } from '../database/sync';
import { v4 as uuidv4 } from 'uuid';

const SETTINGS_KEY = '@tabungin_settings_v2';

async function ensureProfileExists(userId: string, name: string, email: string): Promise<void> {
    try {
        const { data: existing, error: existingError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (existingError) {
            console.error('[Auth] Failed to fetch profile:', existingError);
            return;
        }
        
        if (!existing) {
            const timestamp = Date.now();
            await supabase.from('profiles').insert({
                id: uuidv4(),
                user_id: userId,
                name: name,
                created_at: timestamp,
                updated_at: timestamp,
            });
            console.log('[Auth] Profile created for user:', userId);
        }
    } catch (error) {
        console.error('[Auth] Failed to ensure profile exists:', error);
    }
}

let cachedSettings: Record<string, unknown> | null = null;

async function loadSettingsCache(): Promise<void> {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        cachedSettings = raw ? JSON.parse(raw) : {};
    } catch {
        cachedSettings = {};
    }
}

async function persistSetting<T>(key: string, value: T): Promise<void> {
    if (!cachedSettings) cachedSettings = {};
    cachedSettings[key] = value;
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(cachedSettings));
}

function readSettingSync<T>(key: string, fallback: T): T {
    if (!cachedSettings) return fallback;
    const value = cachedSettings[key];
    return value !== undefined ? (value as T) : fallback;
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
    isLoading: boolean;
    authError: string | null;

    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'avatarColor'>>) => Promise<void>;
    updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    checkEmailExists: (email: string) => Promise<boolean>;
    sendResetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
    loadSession: () => Promise<void>;
    clearError: () => void;

    isDarkMode: boolean;
    textSize: 'normal' | 'large' | 'xlarge';
    hapticEnabled: boolean;
    setDarkMode: (value: boolean) => void;
    setTextSize: (size: 'normal' | 'large' | 'xlarge') => void;
    setHapticEnabled: (value: boolean) => void;
}

function mapSessionUser(sessionUser: any): AuthUser {
    return {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.name || 'Pengguna',
        email: sessionUser.email || '',
        avatarColor: sessionUser.user_metadata?.avatar_color || '#1DB954',
    };
}

function mapSession(session: any): AuthUser | null {
    if (!session?.user) return null;
    return mapSessionUser(session.user);
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoggedIn: false,
    isLoading: true,
    authError: null,

    isDarkMode: false,
    textSize: 'normal',
    hapticEnabled: true,

    loadSession: async () => {
        try {
            await loadSettingsCache();

            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                set({
                    user: mapSessionUser(session.user),
                    isLoggedIn: true,
                });
            }

            set({
                isDarkMode: readSettingSync('isDarkMode', false),
                textSize: readSettingSync<'normal' | 'large' | 'xlarge'>('textSize', 'normal'),
                hapticEnabled: readSettingSync('hapticEnabled', true),
            });
        } catch (error) {
            console.error('Gagal memuat sesi:', error);
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
                    user: mapSessionUser(data.user),
                    isLoggedIn: true,
                });

                setTimeout(() => syncDatabase(), 500);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Login gagal:', error);
            set({ authError: 'Terjadi kesalahan saat login.' });
            return false;
        }
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
                        avatar_color: '#1DB954',
                    },
                },
            });

            if (error) {
                set({ authError: error.message });
                return false;
            }

            if (data.user) {
                await ensureProfileExists(data.user.id, name, email);
                
                set({
                    user: {
                        id: data.user.id,
                        name,
                        email,
                        avatarColor: '#1DB954',
                    },
                    isLoggedIn: true,
                });
                return true;
            }

            if (data.session === null && data.user !== null) {
                set({ authError: 'Silakan cek email untuk konfirmasi sebelum login.' });
                return false;
            }

            return false;
        } catch (error) {
            console.error('Register gagal:', error);
            set({ authError: 'Terjadi kesalahan saat mendaftar.' });
            return false;
        }
    },

    logout: async () => {
        await supabase.auth.signOut();
        await clearAllData();
        set({ user: null, isLoggedIn: false, authError: null });
    },

    updateProfile: async (data) => {
        const current = get().user;
        if (!current) return;

        set({ user: { ...current, ...data } });

        await supabase.auth.updateUser({
            data: {
                name: data.name,
                avatar_color: data.avatarColor,
            },
        });
    },

    updatePassword: async (_oldPassword: string, newPassword: string) => {
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            return !error;
        } catch {
            return false;
        }
    },

    checkEmailExists: async (_email: string) => {
        return false;
    },

    sendResetPassword: async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'tabungin://reset-password',
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Terjadi kesalahan.' };
        }
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
