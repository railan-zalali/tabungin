
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
            // Jika profileId null (belum load), jangan fetch dulu atau fetch global? 
            // Sebaiknya fetch global atau empty. Tapi fetchWallets handle undefined profileId dengan return all.
            // Kita ingin return sesuai profile jika ada.
            const wallets = await fetchWallets(profileId || undefined);
            const totalBalance = await fetchTotalBalance(profileId || undefined);
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
        } catch (error: any) {
            console.error('Failed to delete wallet:', error);
            set({ error: error.message || 'Gagal menghapus dompet.' });
            throw error;
        } finally {
            set({ isLoading: false });
        }
    },

    resetError: () => set({ error: null })
}));
