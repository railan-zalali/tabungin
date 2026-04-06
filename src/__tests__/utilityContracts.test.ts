jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    android: {
      versionCode: 1,
    },
  },
}));

jest.mock('expo-linking', () => ({
  canOpenURL: jest.fn(),
  openURL: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { getGoalComputedMeta } from '../utils/goalSharing';
import { previewJsonImport } from '../utils/importData';
import { compareVersions } from '../utils/updateService';

describe('utility contracts', () => {
  it('resolves shared goal permission from direct share membership', () => {
    const meta = getGoalComputedMeta(
      {
        id: 'goal-1',
        name: 'Dana Darurat',
        target_amount: 1000000,
        current_amount: 250000,
        emoji: '🎯',
        photo_uri: null,
        saving_per_period: 100000,
        period_type: 'monthly',
        color: '#1D7D53',
        start_date: 100,
        estimated_date: 200,
        is_completed: false,
        reminder_enabled: false,
        reminder_time: null,
        created_at: 100,
        wallet_id: 'wallet-1',
        profile_id: 'profile-owner',
        owner_user_id: 'owner-1',
      },
      { id: 'wallet-1', name: 'Shared', type: 'general', color: '#1D7D53', balance: 0, is_default: false, created_at: 100, profile_id: 'profile-owner' },
      'profile-viewer',
      [
        {
          user_email: 'viewer@example.com',
          shared_by: 'owner@example.com',
          shared_at: 123,
          permission_level: 'read_only',
        },
      ],
      'viewer-1',
      null,
      'viewer@example.com',
    );

    expect(meta.scope).toBe('shared_wallet');
    expect(meta.currentUserPermission).toBe('read_only');
    expect(meta.canContribute).toBe(false);
    expect(meta.canManageSharing).toBe(false);
  });

  it('parses json import preview and skips invalid rows', () => {
    const preview = previewJsonImport(
      JSON.stringify({
        transactions: [
          { type: 'expense', amount: 12000, category: 'Makan', date: '2026-04-01' },
          { type: 'invalid', amount: 1000, category: 'Oops', date: '2026-04-01' },
        ],
        goals: [
          { name: 'Laptop', target_amount: 15000000, current_amount: 5000000 },
          { name: '', target_amount: -1 },
        ],
      }),
    );

    expect(preview.importedTransactions).toBe(1);
    expect(preview.importedGoals).toBe(1);
    expect(preview.skippedTransactions).toBe(1);
    expect(preview.skippedGoals).toBe(1);
  });

  it('compares semantic app versions correctly', () => {
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);
    expect(compareVersions('1.2.1', '1.2.0')).toBe(1);
    expect(compareVersions('1.2.0', '1.3.0')).toBe(-1);
  });
});
