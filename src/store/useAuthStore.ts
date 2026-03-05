// Zustand store untuk autentikasi dan profil pengguna
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
}

interface AuthState {
    user: UserProfile | null;
    isLoggedIn: boolean;
    isOfflineMode: boolean;
    isLoading: boolean;

    // Actions
    login: (email: string, name: string) => Promise<void>;
    loginOffline: () => Promise<void>;
    register: (name: string, email: string) => Promise<void>;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    loadSession: () => Promise<void>;

    // Settings
    isDarkMode: boolean;
    textSize: 'normal' | 'large' | 'xlarge';
    hapticEnabled: boolean;
    setDarkMode: (value: boolean) => void;
    setTextSize: (size: 'normal' | 'large' | 'xlarge') => void;
    setHapticEnabled: (value: boolean) => void;
}

const STORAGE_KEY = '@tabungin_auth';
const SETTINGS_KEY = '@tabungin_settings';

function generateAvatarColor(): string {
    const colors = ['#1DB954', '#F5A623', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isLoggedIn: false,
    isOfflineMode: false,
    isLoading: true,

    isDarkMode: false,
    textSize: 'normal',
    hapticEnabled: true,

    loadSession: async () => {
        try {
            const [authData, settingsData] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEY),
                AsyncStorage.getItem(SETTINGS_KEY),
            ]);

            if (authData) {
                const parsed = JSON.parse(authData);
                set({ user: parsed.user, isLoggedIn: true, isOfflineMode: parsed.isOfflineMode ?? false });
            }

            if (settingsData) {
                const settings = JSON.parse(settingsData);
                set({
                    isDarkMode: settings.isDarkMode ?? false,
                    textSize: settings.textSize ?? 'normal',
                    hapticEnabled: settings.hapticEnabled ?? true,
                });
            }
        } catch (e) {
            console.error('Gagal memuat sesi:', e);
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (email: string, name: string) => {
        const user: UserProfile = {
            id: email,
            name,
            email,
            avatarColor: generateAvatarColor(),
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isOfflineMode: false }));
        set({ user, isLoggedIn: true, isOfflineMode: false });
    },

    loginOffline: async () => {
        const user: UserProfile = {
            id: 'offline_user',
            name: 'Pengguna',
            email: '',
            avatarColor: '#1DB954',
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isOfflineMode: true }));
        set({ user, isLoggedIn: true, isOfflineMode: true });
    },

    register: async (name: string, email: string) => {
        const user: UserProfile = {
            id: email,
            name,
            email,
            avatarColor: generateAvatarColor(),
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isOfflineMode: false }));
        set({ user, isLoggedIn: true, isOfflineMode: false });
    },

    logout: async () => {
        await AsyncStorage.removeItem(STORAGE_KEY);
        set({ user: null, isLoggedIn: false, isOfflineMode: false });
    },

    updateProfile: async (data: Partial<UserProfile>) => {
        const current = get().user;
        if (!current) return;
        const updated = { ...current, ...data };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updated, isOfflineMode: get().isOfflineMode }));
        set({ user: updated });
    },

    setDarkMode: async (value: boolean) => {
        set({ isDarkMode: value });
        const current = get();
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
            isDarkMode: value,
            textSize: current.textSize,
            hapticEnabled: current.hapticEnabled,
        }));
    },

    setTextSize: async (size: 'normal' | 'large' | 'xlarge') => {
        set({ textSize: size });
        const current = get();
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
            isDarkMode: current.isDarkMode,
            textSize: size,
            hapticEnabled: current.hapticEnabled,
        }));
    },

    setHapticEnabled: async (value: boolean) => {
        set({ hapticEnabled: value });
        const current = get();
        await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
            isDarkMode: current.isDarkMode,
            textSize: current.textSize,
            hapticEnabled: value,
        }));
    },
}));
