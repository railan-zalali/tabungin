import type { Wallet } from '../database/walletQueries';
import type {
    GoalSharingActivity,
    GoalSharingMember,
    GoalPermissionLevel,
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
    sharingMembers: GoalSharingMember[] = [],
    currentUserId?: string | null,
): GoalScope {
    if (goal.wallet_id && hasWalletAccessFromOtherProfile(wallet, activeProfileId)) {
        return 'shared_wallet';
    }

    if (goal.owner_user_id && currentUserId && goal.owner_user_id !== currentUserId) {
        return 'shared_direct';
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
    sharingMembers: GoalSharingMember[] = [],
    currentUserId?: string | null,
    walletRole?: 'owner' | 'editor' | 'viewer' | null,
    currentUserEmail?: string | null,
): SavingGoalComputedMeta {
    const scope = getGoalScope(goal, wallet, activeProfileId, sharingMembers, currentUserId);
    const currentUserPermission = getGoalPermissionLevel(goal, sharingMembers, currentUserId, walletRole, currentUserEmail);

    return {
        scope,
        scopeLabel: getGoalScopeLabel(scope),
        scopeDescription: getGoalScopeDescription(scope),
        isSharedGoal: scope !== 'personal',
        isSharedWalletGoal: scope === 'shared_wallet',
        isSharedDirectGoal: scope === 'shared_direct',
        currentUserPermission,
        canEdit: currentUserPermission === 'admin' || currentUserPermission === 'read_write',
        canContribute: currentUserPermission === 'admin' || currentUserPermission === 'read_write',
        canManageSharing: currentUserPermission === 'admin',
    };
}

export function getGoalPermissionLevel(
    goal: SavingGoal,
    sharingMembers: GoalSharingMember[] = [],
    currentUserId?: string | null,
    walletRole?: 'owner' | 'editor' | 'viewer' | null,
    currentUserEmail?: string | null,
): GoalPermissionLevel {
    if (goal.owner_user_id && currentUserId && goal.owner_user_id === currentUserId) {
        return 'admin';
    }

    if (walletRole === 'owner' || walletRole === 'editor') {
        return 'read_write';
    }

    if (walletRole === 'viewer') {
        return 'read_only';
    }

    const normalizedCurrentEmail = currentUserEmail?.toLowerCase();
    const currentShare = normalizedCurrentEmail
        ? sharingMembers.find((member) => member.user_email.toLowerCase() === normalizedCurrentEmail)
        : null;

    return currentShare?.permission_level ?? 'read_only';
}

export function getSharingActivityLabel(activity: GoalSharingActivity): string {
    switch (activity.action) {
        case 'permission_changed':
            return 'Izin diubah';
        case 'revoked':
            return 'Akses dicabut';
        case 'access_granted':
            return 'Akses diberikan';
        case 'goal_created':
            return 'Target dibuat';
        case 'contribution_added':
            return 'Tabungan ditambahkan';
        case 'contribution_updated':
            return 'Kontribusi diubah';
        case 'contribution_removed':
            return 'Kontribusi dihapus';
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
        case 'goal_created':
            return `${actor} membuat target ini untuk konteks bersama.`;
        case 'contribution_added':
            return `${actor} menambahkan kontribusi ke target ini.`;
        case 'contribution_updated':
            return `${actor} memperbarui nominal kontribusi untuk target ini.`;
        case 'contribution_removed':
            return `${actor} menghapus satu kontribusi dari target ini.`;
        case 'shared':
        default:
            return `${actor} membagikan target ini ke ${recipient}.`;
    }
}
