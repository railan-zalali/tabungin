
import { create } from 'zustand';
import {
    fetchWallets,
    insertWallet,
    updateWallet,
    deleteWallet,
    fetchTotalBalance,
    type Wallet
} from '../database/walletQueries';

interface WalletState {
    wallets: Wallet[];
    totalBalance: number;
    isLoading: boolean;
    
    loadWallets: () => Promise<void>;
    addWallet: (data: Omit<Wallet, 'id' | 'created_at' | 'balance'> & { balance?: number }) => Promise<void>;
    editWallet: (id: string, data: Partial<Omit<Wallet, 'id' | 'created_at'>>) => Promise<void>;
    removeWallet: (id: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
    wallets: [],
    totalBalance: 0,
    isLoading: true,

    loadWallets: async () => {
        set({ isLoading: true });
        try {
            const wallets = await fetchWallets();
            const totalBalance = await fetchTotalBalance();
            set({ wallets, totalBalance });
        } catch (error) {
            console.error('Failed to load wallets:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    addWallet: async (data) => {
        try {
            await insertWallet(data);
            await get().loadWallets(); // Reload all to refresh order and defaults
        } catch (error) {
            console.error('Failed to add wallet:', error);
            throw error;
        }
    },

    editWallet: async (id, data) => {
        try {
            await updateWallet(id, data);
            await get().loadWallets();
        } catch (error) {
            console.error('Failed to edit wallet:', error);
            throw error;
        }
    },

    removeWallet: async (id) => {
        try {
            await deleteWallet(id);
            await get().loadWallets();
        } catch (error) {
            console.error('Failed to delete wallet:', error);
            throw error;
        }
    }
}));
