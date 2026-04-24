import { create } from 'zustand';
import {
    getSupabaseUnavailableMessage,
    isSupabaseConfigured,
    isSupabaseNetworkError,
    supabase,
    warnIfSupabaseUnavailable,
} from '../lib/supabase';
import { clearAllData } from '../database/schema';
import { syncDatabase } from '../database/sync';
import { v4 as uuidv4 } from 'uuid';

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

    loadSession: async () => {
        if (!isSupabaseConfigured) {
            warnIfSupabaseUnavailable('auth.loadSession');
            set({
                user: null,
                isLoggedIn: false,
                isLoading: false,
                authError: null,
            });
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                set({
                    user: mapSessionUser(session.user),
                    isLoggedIn: true,
                });
            }
        } catch (error) {
            if (isSupabaseNetworkError(error)) {
                console.warn('[Auth] Tidak bisa memuat sesi dari jaringan saat ini:', error);
            } else {
                console.error('Gagal memuat sesi:', error);
            }
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (email: string, password: string) => {
        set({ authError: null });

        if (!isSupabaseConfigured) {
            const message = getSupabaseUnavailableMessage('Login');
            warnIfSupabaseUnavailable('auth.login');
            set({ authError: message });
            return false;
        }

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
            set({
                authError: isSupabaseNetworkError(error)
                    ? 'Tidak bisa terhubung ke server. Periksa koneksi internet atau konfigurasi Supabase.'
                    : 'Terjadi kesalahan saat login.',
            });
            return false;
        }
    },

    register: async (name: string, email: string, password: string) => {
        set({ authError: null });

        if (!isSupabaseConfigured) {
            const message = getSupabaseUnavailableMessage('Pendaftaran akun');
            warnIfSupabaseUnavailable('auth.register');
            set({ authError: message });
            return false;
        }

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
            set({
                authError: isSupabaseNetworkError(error)
                    ? 'Tidak bisa terhubung ke server. Periksa koneksi internet atau konfigurasi Supabase.'
                    : 'Terjadi kesalahan saat mendaftar.',
            });
            return false;
        }
    },

    logout: async () => {
        if (isSupabaseConfigured) {
            try {
                await supabase.auth.signOut();
            } catch (error) {
                console.warn('[Auth] Sign out remote gagal, melanjutkan pembersihan lokal:', error);
            }
        }

        await clearAllData();
        set({ user: null, isLoggedIn: false, authError: null });
    },

    updateProfile: async (data) => {
        const current = get().user;
        if (!current) return;

        set({ user: { ...current, ...data } });

        if (!isSupabaseConfigured) {
            warnIfSupabaseUnavailable('auth.updateProfile');
            return;
        }

        await supabase.auth.updateUser({
            data: {
                name: data.name,
                avatar_color: data.avatarColor,
            },
        });
    },

    updatePassword: async (_oldPassword: string, newPassword: string) => {
        if (!isSupabaseConfigured) {
            warnIfSupabaseUnavailable('auth.updatePassword');
            return false;
        }

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
        if (!isSupabaseConfigured) {
            const message = getSupabaseUnavailableMessage('Reset password');
            warnIfSupabaseUnavailable('auth.sendResetPassword');
            return { success: false, error: message };
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'tabungin://reset-password',
            });

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: isSupabaseNetworkError(error)
                    ? 'Tidak bisa terhubung ke server. Periksa koneksi internet atau konfigurasi Supabase.'
                    : error.message || 'Terjadi kesalahan.',
            };
        }
    },

    clearError: () => set({ authError: null }),
}));
