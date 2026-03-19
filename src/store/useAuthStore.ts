import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase, oauthRedirectUrl } from '../lib/supabase';
import { clearAllData } from '../database/schema';
import { syncDatabase } from '../database/sync';

const SETTINGS_KEY = '@tabungin_settings_v2';
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

function parseAuthCallbackParams(url: string): Record<string, string> {
    try {
        const parsedUrl = new URL(url);
        const params = new URLSearchParams(parsedUrl.search);
        const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));

        for (const [key, value] of hashParams.entries()) {
            if (!params.has(key)) {
                params.set(key, value);
            }
        }

        return Object.fromEntries(params.entries());
    } catch {
        return {};
    }
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
    loginWithGoogle: () => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'avatarColor'>>) => Promise<void>;
    updatePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
    checkEmailExists: (email: string) => Promise<boolean>;
    loadSession: () => Promise<void>;
    completeOAuthSession: (url: string) => Promise<boolean>;
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

            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
                await get().completeOAuthSession(initialUrl);
            }

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

    loginWithGoogle: async () => {
        set({ authError: null });
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: oauthRedirectUrl,
                    skipBrowserRedirect: true,
                },
            });

            if (error || !data?.url) {
                set({ authError: error?.message || 'Gagal memulai login Google.' });
                return false;
            }

            const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectUrl);
            if (result.type !== 'success' || !result.url) {
                return false;
            }

            return await get().completeOAuthSession(result.url);
        } catch (error: any) {
            console.error('Google OAuth gagal:', error);
            set({ authError: error.message || 'Terjadi kesalahan saat login dengan Google.' });
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

            return false;
        } catch (error) {
            console.error('Register gagal:', error);
            set({ authError: 'Terjadi kesalahan saat mendaftar.' });
            return false;
        }
    },

    completeOAuthSession: async (url: string) => {
        try {
            const params = parseAuthCallbackParams(url);
            const callbackError = params.error_description || params.error || params.error_code;

            if (callbackError) {
                throw new Error(callbackError);
            }

            const accessToken = typeof params.access_token === 'string' ? params.access_token : '';
            const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : '';
            const authCode = typeof params.code === 'string' ? params.code : '';

            let sessionUser: any = null;

            if (authCode) {
                const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
                if (error || !data.session?.user) {
                    throw error || new Error('Kode login Google tidak valid.');
                }

                sessionUser = data.session.user;
            } else if (accessToken && refreshToken) {
                const { data, error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                });

                if (error || !data.session?.user) {
                    throw error || new Error('Sesi Google tidak valid.');
                }

                sessionUser = data.session.user;
            } else {
                return false;
            }

            set({
                user: mapSessionUser(sessionUser),
                isLoggedIn: true,
                authError: null,
            });

            setTimeout(() => syncDatabase(), 500);
            return true;
        } catch (error: any) {
            console.error('Gagal menyelesaikan sesi OAuth:', error);
            set({ authError: error.message || 'Gagal menyelesaikan login Google.' });
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
