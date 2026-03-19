import {
  buildWalletInviteMessage,
  buildWalletInviteUrl,
  isValidWalletId,
  parseWalletInvite,
} from "../../src/utils/walletInvite";

describe("walletInvite helpers", () => {
  const walletId = "123e4567-e89b-12d3-a456-426614174000";

  it("builds the canonical invite url", () => {
    expect(buildWalletInviteUrl(walletId)).toBe(`tabungin://wallets/join/${walletId}`);
  });

  it("includes the canonical url in the invite message", () => {
    expect(buildWalletInviteMessage(walletId)).toContain(`tabungin://wallets/join/${walletId}`);
  });

  it("parses canonical, legacy, and dev invite links", () => {
    expect(parseWalletInvite(`tabungin://wallets/join/${walletId}`)).toBe(walletId);
    expect(parseWalletInvite(`tabungin://invite/${walletId}`)).toBe(walletId);
    expect(parseWalletInvite(`exp://127.0.0.1:8081/--/invite/${walletId}?source=qr`)).toBe(walletId);
  });

  it("rejects malformed invite payloads", () => {
    expect(parseWalletInvite("https://example.com/not-an-invite")).toBeNull();
    expect(parseWalletInvite("tabungin://wallets/join/not-a-uuid")).toBeNull();
    expect(isValidWalletId("not-a-uuid")).toBe(false);
  });
});
