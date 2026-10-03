import {
    isValidWalletId,
    buildWalletInviteUrl,
    buildWalletInviteMessage,
    parseWalletInvite,
} from '../../src/utils/walletInvite';

const VALID_UUID = 'a9b8c7d6-1234-4abc-9def-0123456789ab';

describe('isValidWalletId', () => {
    it('accepts a valid uuid', () => {
        expect(isValidWalletId(VALID_UUID)).toBe(true);
    });

    it('trims whitespace before validating', () => {
        expect(isValidWalletId(`  ${VALID_UUID} `)).toBe(true);
    });

    it('rejects null/undefined/empty', () => {
        expect(isValidWalletId(null)).toBe(false);
        expect(isValidWalletId(undefined)).toBe(false);
        expect(isValidWalletId('')).toBe(false);
    });

    it('rejects malformed ids', () => {
        expect(isValidWalletId('not-a-uuid')).toBe(false);
        expect(isValidWalletId('a9b8c7d6')).toBe(false);
        expect(isValidWalletId(`${VALID_UUID}-extra`)).toBe(false);
    });
});

describe('buildWalletInviteUrl', () => {
    it('builds the deep link for a valid id', () => {
        expect(buildWalletInviteUrl(VALID_UUID)).toBe(`tabungin://wallets/join/${VALID_UUID}`);
    });

    it('throws for invalid id', () => {
        expect(() => buildWalletInviteUrl('bogus')).toThrow('ID dompet tidak valid.');
    });
});

describe('buildWalletInviteMessage', () => {
    it('contains the invite url', () => {
        const message = buildWalletInviteMessage(VALID_UUID);
        expect(message).toContain(`tabungin://wallets/join/${VALID_UUID}`);
        expect(message).toContain('Tabungin');
    });
});

describe('parseWalletInvite', () => {
    it('parses a full deep link', () => {
        expect(parseWalletInvite(`tabungin://wallets/join/${VALID_UUID}`)).toBe(VALID_UUID);
    });

    it('parses an invite path variant', () => {
        expect(parseWalletInvite(`tabungin://invite/${VALID_UUID}`)).toBe(VALID_UUID);
    });

    it('parses a relative path', () => {
        expect(parseWalletInvite(`/wallets/join/${VALID_UUID}`)).toBe(VALID_UUID);
    });

    it('tolerates surrounding whitespace', () => {
        expect(parseWalletInvite(`  tabungin://wallets/join/${VALID_UUID}  `)).toBe(VALID_UUID);
    });

    it('returns null for empty or null input', () => {
        expect(parseWalletInvite(null)).toBeNull();
        expect(parseWalletInvite(undefined)).toBeNull();
        expect(parseWalletInvite('')).toBeNull();
        expect(parseWalletInvite('   ')).toBeNull();
    });

    it('returns null when id inside link is invalid', () => {
        expect(parseWalletInvite('tabungin://wallets/join/not-valid')).toBeNull();
        expect(parseWalletInvite('https://example.com/wallets/join/nope')).toBeNull();
    });

    it('returns null for unrelated strings', () => {
        expect(parseWalletInvite('halo dunia')).toBeNull();
    });
});
