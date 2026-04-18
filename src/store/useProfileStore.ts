import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProfiles, insertProfile, type Profile } from '../database/profileQueries';
import { syncDatabase } from '../database/sync';

interface ProfileState {
    profiles: Profile[];
    activeProfileId: string | null;
    isLoading: boolean;
    
    loadProfiles: () => Promise<void>;
    setActiveProfile: (id: string) => void;
    addProfile: (name: string, icon?: string, color?: string) => Promise<void>;
}

const PROFILE_STORAGE_KEY = 'profile-storage';

async function triggerBackgroundSyncIfAllowed() {
    const { useAuthStore } = await import('./useAuthStore');
    if (!useAuthStore.getState().canSync) return;
    syncDatabase().catch(console.error);
}

async function persistActiveProfileId(activeProfileId: string | null) {
    try {
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ state: { activeProfileId } }));
    } catch (error) {
        console.warn('[Profile] Failed to persist active profile:', error);
    }
}

export const useProfileStore = create<ProfileState>()((set, get) => ({
    profiles: [],
    activeProfileId: null,
    isLoading: false,

    loadProfiles: async () => {
        set({ isLoading: true });
        try {
            const profiles = await fetchProfiles();
            set({ profiles });

            const currentId = get().activeProfileId;
            if (!currentId || !profiles.find((p) => p.id === currentId)) {
                if (profiles.length > 0) {
                    const nextId = profiles[0].id;
                    set({ activeProfileId: nextId });
                    void persistActiveProfileId(nextId);
                }
            }
        } catch (error) {
            console.error('Failed to load profiles:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    setActiveProfile: (id) => {
        set({ activeProfileId: id });
        void persistActiveProfileId(id);
    },

    addProfile: async (name, icon, color) => {
        set({ isLoading: true });
        try {
            const newProfile = await insertProfile(name, icon, color);
            await get().loadProfiles();
            set({ activeProfileId: newProfile.id });
            await persistActiveProfileId(newProfile.id);
            void triggerBackgroundSyncIfAllowed();
        } catch (error) {
            console.error('Failed to add profile:', error);
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },
}));

void (async () => {
    try {
        const raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { state?: { activeProfileId?: string | null } };
        const activeProfileId = parsed?.state?.activeProfileId ?? null;
        if (activeProfileId) {
            useProfileStore.setState({ activeProfileId });
        }
    } catch (error) {
        console.warn('[Profile] Failed to hydrate active profile:', error);
    }
})();
