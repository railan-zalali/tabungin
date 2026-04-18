const mockSetItem = jest.fn(async () => undefined);
const mockSignOut = jest.fn(async () => ({ error: null }));
const mockGetSession = jest.fn(async () => {
  throw new Error('Invalid Refresh Token: Refresh Token Not Found');
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: mockSetItem,
  removeItem: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
    from: jest.fn(),
  },
}));

jest.mock('../database/schema', () => ({
  clearAllData: jest.fn(),
  getInitializedDatabase: jest.fn(),
}));

jest.mock('../database/sync', () => ({
  clearSyncState: jest.fn(),
  syncDatabase: jest.fn(),
}));

jest.mock('../store/useProfileStore', () => ({
  useProfileStore: {
    getState: jest.fn(() => ({
      activeProfileId: null,
      loadProfiles: jest.fn(),
    })),
  },
}));

describe('auth session contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cleans up local auth state when the refresh token is stale', async () => {
    const { useAuthStore } = require('../store/useAuthStore') as typeof import('../store/useAuthStore');

    await useAuthStore.getState().loadSession();

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockSetItem).toHaveBeenCalledWith('@tabungin_settings_v2', expect.stringContaining('"sessionMode":"anonymous-none"'));
    expect(useAuthStore.getState().sessionStatus).toBe('anonymous-none');
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().canSync).toBe(false);
  });
});
