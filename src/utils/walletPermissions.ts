import type { Wallet, WalletMember } from '../database/walletQueries';

export type WalletCapabilityRole = WalletMember['role'] | null;

interface WalletPermissionInput {
  wallet?: Pick<Wallet, 'profile_id'> | null;
  activeProfileId?: string | null;
  membershipRole?: WalletCapabilityRole;
}

export interface WalletCapabilities {
  resolvedRole: WalletCapabilityRole | 'owner';
  isOwnedWallet: boolean;
  isSharedWallet: boolean;
  canEditWallet: boolean;
  canDeleteWallet: boolean;
  canInviteMember: boolean;
  canRemoveMember: boolean;
  canManageTransactions: boolean;
  isReadOnly: boolean;
}

export function getWalletCapabilities({
  wallet,
  activeProfileId,
  membershipRole,
}: WalletPermissionInput): WalletCapabilities {
  const isOwnedWallet = Boolean(wallet?.profile_id && activeProfileId && wallet.profile_id === activeProfileId);
  const resolvedRole: WalletCapabilities['resolvedRole'] = isOwnedWallet ? 'owner' : (membershipRole ?? null);
  const isSharedWallet = Boolean(wallet?.profile_id && (!activeProfileId || wallet.profile_id !== activeProfileId));
  const canEditWallet = resolvedRole === 'owner' || resolvedRole === 'editor';
  const canDeleteWallet = resolvedRole === 'owner';
  const canInviteMember = resolvedRole === 'owner' || resolvedRole === 'editor';
  const canRemoveMember = resolvedRole === 'owner';
  const canManageTransactions = resolvedRole === 'owner' || resolvedRole === 'editor';

  return {
    resolvedRole,
    isOwnedWallet,
    isSharedWallet,
    canEditWallet,
    canDeleteWallet,
    canInviteMember,
    canRemoveMember,
    canManageTransactions,
    isReadOnly: resolvedRole === 'viewer',
  };
}
