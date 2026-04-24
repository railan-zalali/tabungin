import type { Wallet } from '../database/walletQueries';

export type WalletContextTone = 'primary' | 'info' | 'warning';

export interface WalletContextMeta {
    icon: string;
    label: string;
    description: string;
    tone: WalletContextTone;
}

export function resolveWalletContextMeta(wallet: Wallet | null | undefined, activeProfileId?: string | null): WalletContextMeta {
    if (!wallet) {
        return {
            icon: 'wallet-outline',
            label: 'Belum memilih dompet',
            description: 'Pilih dompet agar transaksi dan saldo punya konteks yang jelas.',
            tone: 'warning',
        };
    }

    const isShared = Boolean(wallet.profile_id && wallet.profile_id !== activeProfileId);

    if (isShared) {
        return {
            icon: 'account-group-outline',
            label: 'Dompet bersama',
            description: 'Aksi di dompet ini terbaca sebagai konteks kolaboratif.',
            tone: 'info',
        };
    }

    if (wallet.is_default) {
        return {
            icon: 'star-outline',
            label: 'Dompet utama',
            description: 'Ini dompet default untuk pencatatan harian.',
            tone: 'primary',
        };
    }

    return {
        icon: 'account-outline',
        label: 'Dompet personal',
        description: 'Konteks ini hanya terkait profil aktif saat ini.',
        tone: 'primary',
    };
}
