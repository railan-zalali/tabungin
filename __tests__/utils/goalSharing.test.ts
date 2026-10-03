import {
    getGoalScope,
    getGoalScopeLabel,
    getGoalScopeDescription,
    getGoalComputedMeta,
    getSharingActivityLabel,
    getSharingActivityDescription,
} from '../../src/utils/goalSharing';
import type { SavingGoal, GoalSharingMember, GoalSharingActivity } from '../../src/types/saving';
import type { Wallet } from '../../src/database/walletQueries';

const personalGoal = { id: 'g1', profile_id: 'p1', wallet_id: null } as unknown as SavingGoal;
const walletGoal = { id: 'g2', profile_id: 'p1', wallet_id: 'w1' } as unknown as SavingGoal;
const ownWallet = { id: 'w1', profile_id: 'p1' } as unknown as Wallet;
const foreignWallet = { id: 'w1', profile_id: 'p2' } as unknown as Wallet;

describe('getGoalScope', () => {
    it('returns personal for own goal without wallet sharing', () => {
        expect(getGoalScope(personalGoal, undefined, 'p1')).toBe('personal');
    });

    it('returns shared_direct when sharing members exist', () => {
        const members = [{ user_email: 'x@y.z' }] as GoalSharingMember[];
        expect(getGoalScope(personalGoal, undefined, 'p1', members)).toBe('shared_direct');
    });

    it('returns shared_direct when goal belongs to another profile', () => {
        expect(getGoalScope({ ...personalGoal, profile_id: 'p2' }, undefined, 'p1')).toBe(
            'shared_direct',
        );
    });

    it('returns shared_wallet when wallet belongs to another profile', () => {
        expect(getGoalScope(walletGoal, foreignWallet, 'p1')).toBe('shared_wallet');
    });

    it('returns personal when goal is another profile but wallet is foreign too', () => {
        // wallet foreign menang (shared_wallet) karena !hasWalletAccess guard
        const goal = { ...personalGoal, profile_id: 'p2', wallet_id: 'w1' } as SavingGoal;
        expect(getGoalScope(goal, foreignWallet, 'p1')).toBe('shared_wallet');
    });

    it('returns personal for own goal with own wallet', () => {
        expect(getGoalScope(walletGoal, ownWallet, 'p1')).toBe('personal');
    });
});

describe('getGoalScopeLabel / Description', () => {
    it('labels shared wallet', () => {
        expect(getGoalScopeLabel('shared_wallet')).toBe('Dompet Bersama');
        expect(getGoalScopeDescription('shared_wallet')).toContain('dompet bersama');
    });

    it('labels shared direct', () => {
        expect(getGoalScopeLabel('shared_direct')).toBe('Shared to You');
        expect(getGoalScopeDescription('shared_direct')).toContain('dibagikan langsung');
    });

    it('defaults to personal', () => {
        expect(getGoalScopeLabel('personal')).toBe('Pribadi');
        expect(getGoalScopeLabel('unknown' as never)).toBe('Pribadi');
        expect(getGoalScopeDescription('personal')).toContain('personal');
        expect(getGoalScopeDescription('unknown' as never)).toContain('personal');
    });
});

describe('getGoalComputedMeta', () => {
    it('computes meta flags for personal goal', () => {
        const meta = getGoalComputedMeta(personalGoal, undefined, 'p1');
        expect(meta.scope).toBe('personal');
        expect(meta.isSharedGoal).toBe(false);
        expect(meta.isSharedWalletGoal).toBe(false);
        expect(meta.isSharedDirectGoal).toBe(false);
        expect(meta.scopeLabel).toBe('Pribadi');
    });

    it('computes meta flags for shared wallet goal', () => {
        const meta = getGoalComputedMeta(walletGoal, foreignWallet, 'p1');
        expect(meta.isSharedGoal).toBe(true);
        expect(meta.isSharedWalletGoal).toBe(true);
        expect(meta.isSharedDirectGoal).toBe(false);
    });

    it('computes meta flags for shared direct goal', () => {
        const members = [{ user_email: 'x@y.z' }] as GoalSharingMember[];
        const meta = getGoalComputedMeta(personalGoal, undefined, 'p1', members);
        expect(meta.isSharedGoal).toBe(true);
        expect(meta.isSharedDirectGoal).toBe(true);
    });
});

describe('getSharingActivityLabel / Description', () => {
    const base = {
        action: 'shared',
        performed_by: 'Andi',
        user_email: 'budi@mail.com',
    } as GoalSharingActivity;

    it('labels each action type', () => {
        expect(getSharingActivityLabel({ ...base, action: 'shared' })).toBe('Target dibagikan');
        expect(getSharingActivityLabel({ ...base, action: 'permission_changed' })).toBe(
            'Izin diubah',
        );
        expect(getSharingActivityLabel({ ...base, action: 'revoked' })).toBe('Akses dicabut');
        expect(getSharingActivityLabel({ ...base, action: 'access_granted' })).toBe(
            'Akses diberikan',
        );
        expect(getSharingActivityLabel({ ...base, action: 'other' as never })).toBe(
            'Target dibagikan',
        );
    });

    it('describes each action type with actor and recipient', () => {
        expect(getSharingActivityDescription({ ...base, action: 'shared' })).toBe(
            'Andi membagikan target ini ke budi@mail.com.',
        );
        expect(getSharingActivityDescription({ ...base, action: 'permission_changed' })).toBe(
            'Andi memperbarui izin untuk budi@mail.com.',
        );
        expect(getSharingActivityDescription({ ...base, action: 'revoked' })).toBe(
            'Andi mencabut akses budi@mail.com.',
        );
        expect(getSharingActivityDescription({ ...base, action: 'access_granted' })).toBe(
            'budi@mail.com mendapatkan akses ke target ini.',
        );
    });

    it('falls back to Sistem when no actor', () => {
        const result = getSharingActivityDescription({
            ...base,
            performed_by: undefined,
        } as unknown as GoalSharingActivity);
        expect(result).toContain('Sistem');
    });
});
