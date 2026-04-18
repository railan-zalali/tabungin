const WALLET_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const INVITE_PATTERNS = [
  /tabungin:\/\/wallets\/join\/([^/?#]+)/i,
  /tabungin:\/\/invite\/([^/?#]+)/i,
  /\/wallets\/join\/([^/?#]+)/i,
  /\/invite\/([^/?#]+)/i,
];

export function isValidWalletId(walletId?: string | null): walletId is string {
  if (!walletId) return false;
  return WALLET_ID_REGEX.test(walletId.trim());
}

export function buildWalletInviteUrl(walletId: string): string {
  if (!isValidWalletId(walletId)) {
    throw new Error("ID dompet tidak valid.");
  }

  return `tabungin://wallets/join/${walletId}`;
}

export function buildWalletInviteMessage(walletId: string): string {
  const inviteUrl = buildWalletInviteUrl(walletId);

  return `Halo! Saya mengundang Anda untuk bergabung mengelola dompet di aplikasi Tabungin.\n\nKlik link berikut untuk bergabung:\n${inviteUrl}`;
}

export function parseWalletInvite(rawValue?: string | null): string | null {
  const value = rawValue?.trim();
  if (!value) return null;

  for (const pattern of INVITE_PATTERNS) {
    const match = value.match(pattern);
    const walletId = match?.[1]?.trim();

    if (isValidWalletId(walletId)) {
      return walletId;
    }
  }

  return null;
}

