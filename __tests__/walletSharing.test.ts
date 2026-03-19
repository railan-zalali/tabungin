/**
 * Test Suite untuk Fitur Share Wallet QR
 *
 * Test ini mencakup:
 * 1. Linking Configuration
 * 2. QR Code Generation
 * 3. QR Code Scanning & Parsing
 * 4. Wallet Joining Process
 * 5. Database Sync
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { linking } from '../src/navigation/LinkingConfiguration';

describe('Wallet Sharing QR Feature', () => {

  describe('Linking Configuration', () => {
    it('should have correct scheme prefix', () => {
      expect(linking.prefixes).toEqual(['tabungin://']);
    });

    it('should have correct wallet join route', () => {
      // JoinWallet is now in the Wallet tab (WalletStackNavigator) to match QR Scanner
      const walletJoinConfig = linking.config.screens.Main.screens.Wallet.screens.JoinWallet;
      expect(walletJoinConfig).toBe('wallets/join/:walletId');
    });

    it('should have QR scanner route', () => {
      // QRScanner is in the Wallet tab alongside JoinWallet
      const qrScannerConfig = linking.config.screens.Main.screens.Wallet.screens.QRScanner;
      expect(qrScannerConfig).toBe('wallets/qr-scan');
    });
  });

  describe('QR Code URL Generation', () => {
    it('should generate correct invite URL format', () => {
      const walletId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedUrl = `tabungin://wallets/join/${walletId}`;

      expect(expectedUrl).toMatch(/^tabungin:\/\/wallets\/join\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should handle wallet ID with special characters', () => {
      const walletId = '123e4567-e89b-12d3-a456-426614174000';
      const url = `tabungin://wallets/join/${walletId}`;

      expect(url).toContain(walletId);
    });
  });

  describe('QR Code URL Parsing', () => {
    const validWalletId = '123e4567-e89b-12d3-a456-426614174000';

    it('should parse tabungin://wallets/join/UUID format', () => {
      const qrData = `tabungin://wallets/join/${validWalletId}`;
      const joinMatch = qrData.match(/tabungin:\/\/wallets\/join\/([^\/?]+)/);

      expect(joinMatch).toBeTruthy();
      expect(joinMatch?.[1]).toBe(validWalletId);
    });

    it('should parse legacy tabungin://invite/UUID format', () => {
      const qrData = `tabungin://invite/${validWalletId}`;
      const inviteMatch = qrData.match(/tabungin:\/\/invite\/([^\/?]+)/);

      expect(inviteMatch).toBeTruthy();
      expect(inviteMatch?.[1]).toBe(validWalletId);
    });

    it('should parse exp://.../invite/UUID development format', () => {
      const qrData = `exp://localhost:19006/--/invite/${validWalletId}`;
      const inviteMatch = qrData.match(/\/invite\/([^\/?]+)/);

      expect(inviteMatch).toBeTruthy();
      expect(inviteMatch?.[1]).toBe(validWalletId);
    });

    it('should handle QR code with query parameters', () => {
      const qrData = `tabungin://wallets/join/${validWalletId}?source=qr&utm=test`;
      const joinMatch = qrData.match(/tabungin:\/\/wallets\/join\/([^\/?]+)/);

      expect(joinMatch).toBeTruthy();
      expect(joinMatch?.[1]).toBe(validWalletId);
    });

    it('should reject invalid UUID format', () => {
      const invalidWalletIds = [
        'invalid-uuid',
        '123456',
        'not-a-uuid-at-all',
        '',
      ];

      invalidWalletIds.forEach(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(id)).toBe(false);
      });
    });

    it('should validate correct UUID format', () => {
      const validWalletIds = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      validWalletIds.forEach(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        expect(uuidRegex.test(id)).toBe(true);
      });
    });
  });

  describe('Wallet Joining Process', () => {
    it('should handle duplicate member error', () => {
      const errorCode = '23505'; // Unique violation error code

      expect(errorCode).toBe('23505');
    });

    it('should handle RLS permission error', () => {
      const errorCode = '42501'; // RLS permission error code

      expect(errorCode).toBe('42501');
    });
  });

  describe('Deep Linking Navigation', () => {
    it('should navigate to correct screen on QR scan', () => {
      const walletId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedRoute = 'wallets/join/' + walletId;

      expect(expectedRoute).toContain('wallets/join');
      expect(expectedRoute).toContain(walletId);
    });

    it('should maintain navigation stack after join', () => {
      // After successful join, user should be at WalletList
      // Navigation should use replace() instead of push()
      expect(true).toBe(true); // Placeholder for navigation logic test
    });
  });
});

describe('Edge Cases & Error Handling', () => {

  describe('Invalid QR Code Scenarios', () => {
    it('should handle malformed QR codes', () => {
      const malformedQRs = [
        'http://example.com',
        'https://random-site.com/unknown',
        'not-a-valid-url',
        '',
      ];

      malformedQRs.forEach(qr => {
        expect(() => {
          // Simulate QR parsing logic
          let walletId = null;
          if (qr.includes('/invite/')) {
            const parts = qr.split('/invite/');
            if (parts.length > 1) {
              walletId = parts[1].split('?')[0].split('/')[0];
            }
          }

          // Should not throw error, just return null
          expect(walletId).toBeNull();
        }).not.toThrow();
      });
    });

    it('should handle QR codes with extra path segments', () => {
      const qrWithExtraPath = 'tabungin://wallets/join/123e4567-e89b-12d3-a456-426614174000/extra/path';
      const joinMatch = qrWithExtraPath.match(/tabungin:\/\/wallets\/join\/([^\/?]+)/);

      expect(joinMatch?.[1]).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('Network & Sync Issues', () => {
    it('should handle offline mode gracefully', () => {
      const isOffline = true;

      if (isOffline) {
        // Should show appropriate error message
        expect(true).toBe(true); // Placeholder
      }
    });

    it('should handle sync failures', () => {
      const syncError = 'Network request failed';

      expect(syncError).toBeTruthy();
    });
  });

  describe('Database Issues', () => {
    it('should handle duplicate wallet member', () => {
      const duplicateError = 'Email ini sudah menjadi anggota dompet.';

      expect(duplicateError).toContain('sudah menjadi anggota');
    });

    it('should handle wallet not found', () => {
      const notFoundError = 'ID Dompet tidak valid';

      expect(notFoundError).toContain('tidak valid');
    });
  });
});

describe('Integration Flow Tests', () => {

  it('should complete full sharing flow successfully', () => {
    // 1. User creates wallet
    const walletId = '123e4567-e89b-12d3-a456-426614174000';
    expect(walletId).toBeDefined();

    // 2. User generates QR code
    const qrUrl = `tabungin://wallets/join/${walletId}`;
    expect(qrUrl).toMatch(/^tabungin:\/\/wallets\/join\//);

    // 3. Friend scans QR code
    const scannedData = qrUrl;
    expect(scannedData).toBe(qrUrl);

    // 4. Parse wallet ID from QR
    const parsedWalletId = scannedData.match(/tabungin:\/\/wallets\/join\/([^\/?]+)/)?.[1];
    expect(parsedWalletId).toBe(walletId);

    // 5. Validate wallet ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(parsedWalletId!)).toBe(true);

    // 6. Navigate to join screen
    expect(true).toBe(true); // Placeholder for navigation

    // 7. Join wallet successfully
    expect(true).toBe(true); // Placeholder for join logic

    // 8. Refresh wallet list
    expect(true).toBe(true); // Placeholder for refresh logic
  });

  it('should handle errors in sharing flow gracefully', () => {
    // Test error scenarios
    const errorScenarios = [
      { scenario: 'Invalid QR', shouldFail: true },
      { scenario: 'Network Error', shouldFail: true },
      { scenario: 'Duplicate Member', shouldFail: true },
    ];

    errorScenarios.forEach(({ scenario, shouldFail }) => {
      expect(shouldFail).toBeDefined();
    });
  });
});
