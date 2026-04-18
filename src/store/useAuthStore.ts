import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { clearAllData, getInitializedDatabase } from '../database/schema';
import { clearSyncState, syncDatabase } from '../database/sync';
import { v4 as uuidv4 } from 'uuid';
import { useProfileStore } from './useProfileStore';
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { TabParamList } from '../types/navigation';
import { Colors } from '../constants/colors';

const SETTINGS_KEY = '@tabungin_settings_v2';
const SESSION_MODE_KEY = 'sessionMode';
const GUEST_PROFILE_NAME_KEY = 'guestProfileName';
const GUEST_MERGE_RESOLUTION_KEY = 'guestMergeResolution';
const GUEST_USER_ID = 'guest-local-user';
const GUEST_AVATAR_COLOR = Colors.primary;

function isInvalidRefreshTokenError(error: unknown): boolean {
    return String(error ?? '').includes('Invalid Refresh Token');
}

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

export type SessionStatus = 'authenticated' | 'guest' | 'anonymous-none';
export interface DataCountSummary {
    wallets: number;
    transactions: number;
    savingGoals: number;
    budgets: number;
}

export interface GuestMergeResolution {
    local: DataCountSummary;
    remote: DataCountSummary;
}

export type PostAuthRedirect = NavigatorScreenParams<TabParamList>;

interface AuthState {
    user: AuthUser | null;
    isLoggedIn: boolean;
    isAuthenticated: boolean;
    hasAppAccess: boolean;
    isLoading: boolean;
    authError: string | null;
    sessionStatus: SessionStatus;
    canSync: boolean;
    canUseCloudCollaboration: boolean;
    pendingGuestMergeResolution: GuestMergeResolution | null;
    postAuthRedirect: PostAuthRedirect | null;

    login: (email: string, password: string) => Promise<boolean>;
    register: (name: string, email: string, password: string) => Promise<boolean>;
    continueAsGuest: () => Promise<void>;
    resolveGuestMergeResolution: (strategy: 'merge_local' | 'cloud_only') => Promise<void>;
    setPostAuthRedirect: (redirect: PostAuthRedirect | null) => void;
    clearPostAuthRedirect: () => void;
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
        avatarColor: sessionUser.user_metadata?.avatar_color || Colors.primary,
    };
}

function mapSession(session: any): AuthUser | null {
    if (!session?.user) return null;
    return mapSessionUser(session.user);
}

function buildGuestUser(name?: string): AuthUser {
    return {
        id: GUEST_USER_ID,
        name: name?.trim() || 'Guest Lokal',
        email: '',
        avatarColor: GUEST_AVATAR_COLOR,
    };
}

async function adoptGuestLocalDataForUser(userId: string): Promise<void> {
    const db = await getInitializedDatabase();
    const now = Date.now();

    await db.withTransactionAsync(async () => {
        const activeProfileId = useProfileStore.getState().activeProfileId;

        await db.runAsync(
            `UPDATE profiles
             SET user_id = ?, updated_at = ?, sync_status = CASE WHEN sync_status = 'synced' THEN 'pending_update' ELSE sync_status END
             WHERE user_id IS NULL OR user_id = ?`,
            [userId, now, GUEST_USER_ID],
        );

        if (activeProfileId) {
            await db.runAsync(
                `UPDATE profiles
                 SET user_id = ?, updated_at = ?, sync_status = CASE WHEN sync_status = 'synced' THEN 'pending_update' ELSE sync_status END
                 WHERE id = ?`,
                [userId, now, activeProfileId],
            );
        }

        await db.runAsync(
            `UPDATE saving_goals
             SET owner_user_id = ?,
                 created_by_user_id = COALESCE(NULLIF(created_by_user_id, ''), ?),
                 updated_at = ?,
                 sync_status = CASE WHEN sync_status = 'synced' THEN 'pending_update' ELSE sync_status END
             WHERE owner_user_id IS NULL OR owner_user_id = ? OR created_by_user_id IS NULL OR created_by_user_id = ? OR created_by_user_id = ''`,
            [userId, userId, now, GUEST_USER_ID, GUEST_USER_ID],
        );

        const userBoundTables = ['transaction_categories', 'recurring_transactions', 'app_reminders', 'notifications'];
        for (const tableName of userBoundTables) {
            await db.runAsync(
                `UPDATE ${tableName}
                 SET user_id = ?, updated_at = ?, sync_status = CASE WHEN sync_status = 'synced' THEN 'pending_update' ELSE sync_status END
                 WHERE user_id IS NULL OR user_id = ? OR user_id = ''`,
                [userId, now, GUEST_USER_ID],
            );
        }
    });

    await useProfileStore.getState().loadProfiles();
}

async function countLocalRows(tableName: string): Promise<number> {
    const db = await getInitializedDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE sync_status != ?`,
        ['pending_delete'],
    );
    return row?.count ?? 0;
}

async function getLocalDataSummary(): Promise<DataCountSummary> {
    const [wallets, transactions, savingGoals, budgets] = await Promise.all([
        countLocalRows('wallets'),
        countLocalRows('transactions'),
        countLocalRows('saving_goals'),
        countLocalRows('budgets'),
    ]);

    return { wallets, transactions, savingGoals, budgets };
}

async function getRemoteDataSummary(userId: string): Promise<DataCountSummary> {
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userId);

    if (profilesError || !profiles?.length) {
        return { wallets: 0, transactions: 0, savingGoals: 0, budgets: 0 };
    }

    const profileIds = profiles.map((profile) => profile.id);
    const countQuery = async (tableName: string) => {
        const { count } = await supabase
            .from(tableName)
            .select('id', { count: 'exact', head: true })
            .in('profile_id', profileIds);
        return count ?? 0;
    };

    const [wallets, transactions, savingGoals, budgets] = await Promise.all([
        countQuery('wallets'),
        countQuery('transactions'),
        countQuery('saving_goals'),
        countQuery('budgets'),
    ]);

    return { wallets, transactions, savingGoals, budgets };
}

function getSummaryTotal(summary: DataCountSummary): number {
    return summary.wallets + summary.transactions + summary.savingGoals + summary.budgets;
}

async function buildGuestMergeResolution(userId: string): Promise<GuestMergeResolution | null> {
    const [local, remote] = await Promise.all([getLocalDataSummary(), getRemoteDataSummary(userId)]);
    return getSummaryTotal(local) > 0 && getSummaryTotal(remote) > 0 ? { local, remote } : null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoggedIn: false,
    isAuthenticated: false,
    hasAppAccess: false,
    isLoading: true,
    authError: null,
    sessionStatus: 'anonymous-none',
    canSync: false,
    canUseCloudCollaboration: false,
    pendingGuestMergeResolution: null,
    postAuthRedirect: null,

    isDarkMode: false,
    textSize: 'normal',
    hapticEnabled: true,

    loadSession: async () => {
        try {
            await loadSettingsCache();

            const { data: { session } } = await supabase.auth.getSession();
            const persistedSessionMode = readSettingSync<SessionStatus>(SESSION_MODE_KEY, 'anonymous-none');
            const guestProfileName = readSettingSync<string>(GUEST_PROFILE_NAME_KEY, 'Guest Lokal');
            const pendingGuestMergeResolution = readSettingSync<GuestMergeResolution | null>(GUEST_MERGE_RESOLUTION_KEY, null);

            if (session?.user) {
                set({
                    user: mapSessionUser(session.user),
                    isLoggedIn: true,
                    isAuthenticated: true,
                    hasAppAccess: true,
                    sessionStatus: 'authenticated',
                    canSync: true,
                    canUseCloudCollaboration: true,
                    pendingGuestMergeResolution,
                    postAuthRedirect: get().postAuthRedirect,
                });
                await persistSetting(SESSION_MODE_KEY, 'authenticated');
            } else if (persistedSessionMode === 'guest') {
                set({
                    user: buildGuestUser(guestProfileName),
                    isLoggedIn: true,
                    isAuthenticated: false,
                    hasAppAccess: true,
                    sessionStatus: 'guest',
                    canSync: false,
                    canUseCloudCollaboration: false,
                    pendingGuestMergeResolution: null,
                    postAuthRedirect: get().postAuthRedirect,
                });
            }

            set({
                isDarkMode: readSettingSync('isDarkMode', false),
                textSize: readSettingSync<'normal' | 'large' | 'xlarge'>('textSize', 'normal'),
                hapticEnabled: readSettingSync('hapticEnabled', true),
            });
        } catch (error) {
            if (isInvalidRefreshTokenError(error)) {
                console.warn('[Auth] Refresh token lokal sudah tidak valid. Membersihkan sesi lokal.');
                try {
                    await supabase.auth.signOut();
                } catch {
                    // Best effort cleanup only.
                }
                await persistSetting(SESSION_MODE_KEY, 'anonymous-none');
                set({
                    user: null,
                    isLoggedIn: false,
                    isAuthenticated: false,
                    hasAppAccess: false,
                    authError: null,
                    sessionStatus: 'anonymous-none',
                    canSync: false,
                    canUseCloudCollaboration: false,
                    pendingGuestMergeResolution: null,
                    postAuthRedirect: null,
                });
                return;
            }
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
                const wasGuest = get().sessionStatus === 'guest';
                let pendingGuestMergeResolution: GuestMergeResolution | null = null;
                if (wasGuest) {
                    await adoptGuestLocalDataForUser(data.user.id);
                    pendingGuestMergeResolution = await buildGuestMergeResolution(data.user.id);
                    await persistSetting(GUEST_MERGE_RESOLUTION_KEY, pendingGuestMergeResolution);
                }
                set({
                    user: mapSessionUser(data.user),
                    isLoggedIn: true,
                    isAuthenticated: true,
                    hasAppAccess: true,
                    sessionStatus: 'authenticated',
                    canSync: true,
                    canUseCloudCollaboration: true,
                    pendingGuestMergeResolution,
                    postAuthRedirect: get().postAuthRedirect,
                });
                await persistSetting(SESSION_MODE_KEY, 'authenticated');
                if (!pendingGuestMergeResolution) {
                    setTimeout(() => syncDatabase({ forceFullPull: true }), 500);
                }
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
                        avatar_color: Colors.primary,
                    },
                },
            });

            if (error) {
                set({ authError: error.message });
                return false;
            }

            if (data.user) {
                await ensureProfileExists(data.user.id, name, email);
                const wasGuest = get().sessionStatus === 'guest';
                let pendingGuestMergeResolution: GuestMergeResolution | null = null;
                if (wasGuest) {
                    await adoptGuestLocalDataForUser(data.user.id);
                    pendingGuestMergeResolution = await buildGuestMergeResolution(data.user.id);
                    await persistSetting(GUEST_MERGE_RESOLUTION_KEY, pendingGuestMergeResolution);
                }
                
                set({
                    user: {
                        id: data.user.id,
                        name,
                        email,
                        avatarColor: Colors.primary,
                    },
                    isLoggedIn: true,
                    isAuthenticated: true,
                    hasAppAccess: true,
                    sessionStatus: 'authenticated',
                    canSync: true,
                    canUseCloudCollaboration: true,
                    pendingGuestMergeResolution,
                    postAuthRedirect: get().postAuthRedirect,
                });
                await persistSetting(SESSION_MODE_KEY, 'authenticated');
                if (!pendingGuestMergeResolution) {
                    setTimeout(() => syncDatabase({ forceFullPull: true }), 500);
                }
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

    continueAsGuest: async () => {
        const guestName = readSettingSync<string>(GUEST_PROFILE_NAME_KEY, 'Guest Lokal');
        await persistSetting(SESSION_MODE_KEY, 'guest');
        set({
            user: buildGuestUser(guestName),
            isLoggedIn: true,
            isAuthenticated: false,
            hasAppAccess: true,
            isLoading: false,
            authError: null,
            sessionStatus: 'guest',
            canSync: false,
            canUseCloudCollaboration: false,
            pendingGuestMergeResolution: null,
            postAuthRedirect: get().postAuthRedirect,
        });
    },

    resolveGuestMergeResolution: async (strategy) => {
        const userId = get().user?.id;
        if (!userId || get().sessionStatus !== 'authenticated') return;

        if (strategy === 'cloud_only') {
            await clearSyncState(userId);
            await clearAllData();
            await useProfileStore.getState().loadProfiles();
        }

        await persistSetting(GUEST_MERGE_RESOLUTION_KEY, null);
        set({ pendingGuestMergeResolution: null });
        await syncDatabase({ forceFullPull: strategy === 'cloud_only' });
    },

    setPostAuthRedirect: (redirect) => set({ postAuthRedirect: redirect }),
    clearPostAuthRedirect: () => set({ postAuthRedirect: null }),

    logout: async () => {
        const userId = get().user?.id;
        if (get().isAuthenticated) {
            await clearSyncState(userId);
            await supabase.auth.signOut();
            await clearAllData();
        }
        await persistSetting(SESSION_MODE_KEY, 'anonymous-none');
        set({
            user: null,
            isLoggedIn: false,
            isAuthenticated: false,
            hasAppAccess: false,
            authError: null,
            sessionStatus: 'anonymous-none',
            canSync: false,
            canUseCloudCollaboration: false,
            pendingGuestMergeResolution: null,
            postAuthRedirect: null,
        });
    },

    updateProfile: async (data) => {
        const current = get().user;
        if (!current) return;

        set({ user: { ...current, ...data } });

        if (get().sessionStatus === 'guest') {
            if (data.name) {
                await persistSetting(GUEST_PROFILE_NAME_KEY, data.name);
            }
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
        if (get().sessionStatus !== 'authenticated') {
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
        if (get().sessionStatus !== 'authenticated' && !email.trim()) {
            return { success: false, error: 'Masukkan email akun yang valid.' };
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
