jest.mock('../lib/supabase', () => {
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  };

  return {
    supabase: {
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    },
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useTransactionStore } from '../store/useTransactionStore';
import { useWalletStore } from '../store/useWalletStore';

describe('guest session contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      canSync: false,
      canUseCloudCollaboration: false,
      sessionStatus: 'guest',
    } as any);
    useTransactionStore.setState({ realtimeChannel: null } as any);
    useWalletStore.setState({ realtimeChannel: null } as any);
  });

  it('does not subscribe realtime channels while guest mode is active', () => {
    useTransactionStore.getState().initRealtime();
    useWalletStore.getState().initRealtime();

    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
