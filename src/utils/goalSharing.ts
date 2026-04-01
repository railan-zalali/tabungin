import type { Wallet } from '../database/walletQueries';
import type {
    GoalSharingActivity,
    GoalSharingMember,
    GoalScope,
    SavingGoal,
    SavingGoalComputedMeta,
} from '../types/saving';

function hasWalletAccessFromOtherProfile(wallet: Wallet | undefined, activeProfileId: string | null) {
    return Boolean(wallet?.profile_id && wallet.profile_id !== activeProfileId);
}

export function getGoalScope(
    goal: SavingGoal,
    wallet: Wallet | undefined,
    activeProfileId: string | null,
    sharingMembers: GoalSharingMember[] = []
): GoalScope {
    if (sharingMembers.length > 0) {
        return 'shared_direct';
    }

    if (goal.profile_id && activeProfileId && goal.profile_id !== activeProfileId && !hasWalletAccessFromOtherProfile(wallet, activeProfileId)) {
        return 'shared_direct';
    }

    if (goal.wallet_id && hasWalletAccessFromOtherProfile(wallet, activeProfileId)) {
        return 'shared_wallet';
    }

    return 'personal';
}

export function getGoalScopeLabel(scope: GoalScope): string {
    switch (scope) {
        case 'shared_wallet':
            return 'Dompet Bersama';
        case 'shared_direct':
            return 'Shared to You';
        case 'personal':
        default:
            return 'Pribadi';
    }
}

export function getGoalScopeDescription(scope: GoalScope): string {
    switch (scope) {
        case 'shared_wallet':
            return 'Target ini mengikuti konteks dompet bersama.';
        case 'shared_direct':
            return 'Target ini dibagikan langsung ke anggota tertentu.';
        case 'personal':
        default:
            return 'Target ini hanya berada di ruang personal aktif.';
    }
}

export function getGoalComputedMeta(
    goal: SavingGoal,
    wallet: Wallet | undefined,
    activeProfileId: string | null,
    sharingMembers: GoalSharingMember[] = []
): SavingGoalComputedMeta {
    const scope = getGoalScope(goal, wallet, activeProfileId, sharingMembers);

    return {
        scope,
        scopeLabel: getGoalScopeLabel(scope),
        scopeDescription: getGoalScopeDescription(scope),
        isSharedGoal: scope !== 'personal',
        isSharedWalletGoal: scope === 'shared_wallet',
        isSharedDirectGoal: scope === 'shared_direct',
    };
}

export function getSharingActivityLabel(activity: GoalSharingActivity): string {
    switch (activity.action) {
        case 'permission_changed':
            return 'Izin diubah';
        case 'revoked':
            return 'Akses dicabut';
        case 'access_granted':
            return 'Akses diberikan';
        case 'shared':
        default:
            return 'Target dibagikan';
    }
}

export function getSharingActivityDescription(activity: GoalSharingActivity): string {
    const actor = activity.performed_by || 'Sistem';
    const recipient = activity.user_email;

    switch (activity.action) {
        case 'permission_changed':
            return `${actor} memperbarui izin untuk ${recipient}.`;
        case 'revoked':
            return `${actor} mencabut akses ${recipient}.`;
        case 'access_granted':
            return `${recipient} mendapatkan akses ke target ini.`;
        case 'shared':
        default:
            return `${actor} membagikan target ini ke ${recipient}.`;
    }
}
