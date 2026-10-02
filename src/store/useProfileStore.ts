import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchProfiles, insertProfile, type Profile } from '../database/profileQueries';

interface ProfileState {
    profiles: Profile[];
    activeProfileId: string | null;
    isLoading: boolean;

    loadProfiles: () => Promise<void>;
    setActiveProfile: (id: string) => void;
    addProfile: (name: string, icon?: string, color?: string) => Promise<void>;
    switchProfile: (profileId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
    persist(
        (set, get) => ({
            profiles: [],
            activeProfileId: null,
            isLoading: false,

            loadProfiles: async () => {
                set({ isLoading: true });
                try {
                    const profiles = await fetchProfiles();
                    set({ profiles });
                    
                    // Jika belum ada activeProfileId atau ID tidak valid, set ke yang pertama
                    const currentId = get().activeProfileId;
                    if (!currentId || !profiles.find(p => p.id === currentId)) {
                        if (profiles.length > 0) {
                            set({ activeProfileId: profiles[0].id });
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
            },

            addProfile: async (name, icon, color) => {
                set({ isLoading: true });
                try {
                    const newProfile = await insertProfile(name, icon, color);
                    await get().loadProfiles();
                    set({ activeProfileId: newProfile.id }); // Auto switch to new profile
                } catch (error) {
                    console.error('Failed to add profile:', error);
                    throw error;
                } finally {
                    set({ isLoading: false });
                }
            },

            switchProfile: async (profileId) => {
                const currentId = get().activeProfileId;
                if (currentId === profileId) return;

                set({ activeProfileId: profileId });

                // Coordinated reload of all dependent stores
                try {
                    const { useWalletStore } = await import('../store/useWalletStore');
                    const { useTransactionStore } = await import('../store/useTransactionStore');
                    const { useSavingStore } = await import('../store/useSavingStore');

                    await Promise.all([
                        useWalletStore.getState().loadWallets(),
                        useTransactionStore.getState().loadTransactions(),
                        useTransactionStore.getState().loadRecent(),
                        useTransactionStore.getState().refreshSummary(),
                        useSavingStore.getState().loadGoals(),
                    ]);
                } catch (error) {
                    console.error('Failed to reload stores after profile switch:', error);
                }
            },
        }),
        {
            name: 'profile-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({ activeProfileId: state.activeProfileId }), // Hanya persist ID aktif
        }
    )
);
