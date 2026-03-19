import { create } from 'zustand';
import {
    fetchWallets,
    insertWallet,
    updateWallet,
    deleteWallet,
    fetchTotalBalance,
    type Wallet
} from '../database/walletQueries';
import { useProfileStore } from './useProfileStore';
import { useAuthStore } from './useAuthStore';
import { supabase } from '../lib/supabase';
import { handleRealtimePayload, syncDatabase } from '../database/sync';
import { RealtimeChannel } from '@supabase/supabase-js';
import { syncAccessibleWalletsFromServer } from '../database/walletSharingService';

interface WalletState {
    wallets: Wallet[];
    totalBalance: number;
    isLoading: boolean;
    error: string | null;
    
    loadWallets: () => Promise<void>;
    addWallet: (data: Omit<Wallet, 'id' | 'created_at' | 'balance'> & { balance?: number }) => Promise<void>;
    editWallet: (id: string, data: Partial<Omit<Wallet, 'id' | 'created_at'>>) => Promise<void>;
    removeWallet: (id: string) => Promise<void>;
    resetError: () => void;

    // Realtime
    realtimeChannel: RealtimeChannel | null;
    initRealtime: () => void;
    stopRealtime: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    wallets: [],
    totalBalance: 0,
    isLoading: true,
    error: null,

    loadWallets: async () => {
        set({ isLoading: true, error: null });
        try {
            const profileId = useProfileStore.getState().activeProfileId;
            const userEmail = useAuthStore.getState().user?.email;

            if (userEmail) {
                try {
                    await syncAccessibleWalletsFromServer();
                } catch (error) {
                    console.error('Failed to refresh accessible wallets from server:', error);
                }
            }
            
            const wallets = await fetchWallets(profileId || undefined, userEmail);
            const totalBalance = await fetchTotalBalance(profileId || undefined, userEmail);
            set({ wallets, totalBalance });
        } catch (error) {
            console.error('Failed to load wallets:', error);
            set({ error: 'Gagal memuat data dompet. Silakan coba lagi.' });
        } finally {
            set({ isLoading: false });
        }
    },

    addWallet: async (data) => {
        set({ isLoading: true, error: null });
        try {
            const profileId = useProfileStore.getState().activeProfileId;
            await insertWallet({ ...data, profile_id: profileId || undefined });
            await get().loadWallets(); // Reload all to refresh order and defaults
            syncDatabase().catch(console.error); // Latar belakang
        } catch (error: any) {
            console.error('Failed to add wallet:', error);
            set({ error: error.message || 'Gagal menambah dompet.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    editWallet: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
            await updateWallet(id, data);
            await get().loadWallets();
            syncDatabase().catch(console.error);
        } catch (error: any) {
            console.error('Failed to edit wallet:', error);
            set({ error: error.message || 'Gagal mengubah dompet.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    removeWallet: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await deleteWallet(id);
            await get().loadWallets();
            syncDatabase().catch(console.error);
        } catch (error: any) {
            console.error('Failed to delete wallet:', error);
            set({ error: error.message || 'Gagal menghapus dompet.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    resetError: () => set({ error: null }),

    realtimeChannel: null,
    initRealtime: () => {
        const channel = get().realtimeChannel;
        if (channel) return;

        console.log('[Realtime] Initializing wallets channel...');
        const newChannel = supabase
            .channel('public:wallets')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'wallets' },
                async (payload) => {
                    const changed = await handleRealtimePayload('wallets', payload);
                    if (changed) {
                        get().loadWallets();
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Realtime] Connected to wallets channel');
                }
            });

        set({ realtimeChannel: newChannel });
    },
    stopRealtime: () => {
        const channel = get().realtimeChannel;
        if (channel) {
            supabase.removeChannel(channel);
            set({ realtimeChannel: null });
            console.log('[Realtime] Disconnected wallets channel');
        }
    }
}));
