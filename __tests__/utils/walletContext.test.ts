import { resolveWalletContextMeta } from '../../src/utils/walletContext';
import type { Wallet } from '../../src/database/walletQueries';

const baseWallet = {
    id: 'w1',
    name: 'Dompet Utama',
    type: 'general',
    is_default: 1,
    profile_id: 'p1',
} as unknown as Wallet;

describe('resolveWalletContextMeta', () => {
    it('returns warning state when no wallet selected', () => {
        const meta = resolveWalletContextMeta(null);
        expect(meta.tone).toBe('warning');
        expect(meta.icon).toBe('wallet-outline');
        expect(meta.label).toBe('Belum memilih dompet');
    });

    it('returns undefined-safe state for undefined wallet', () => {
        expect(resolveWalletContextMeta(undefined).tone).toBe('warning');
    });

    it('identifies shared wallet (profile berbeda)', () => {
        const meta = resolveWalletContextMeta(baseWallet, 'other-profile');
        expect(meta.tone).toBe('info');
        expect(meta.icon).toBe('account-group-outline');
        expect(meta.label).toBe('Dompet bersama');
    });

    it('identifies default wallet', () => {
        const meta = resolveWalletContextMeta(baseWallet, 'p1');
        expect(meta.tone).toBe('primary');
        expect(meta.icon).toBe('star-outline');
        expect(meta.label).toBe('Dompet utama');
    });

    it('identifies personal non-default wallet', () => {
        const wallet = { ...baseWallet, is_default: 0 } as unknown as Wallet;
        const meta = resolveWalletContextMeta(wallet, 'p1');
        expect(meta.tone).toBe('primary');
        expect(meta.icon).toBe('account-outline');
        expect(meta.label).toBe('Dompet personal');
    });
});
