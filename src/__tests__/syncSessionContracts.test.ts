const storage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async (key: string) => (key in storage ? storage[key] : null)),
    setItem: jest.fn(async (key: string, value: string) => {
        storage[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
        delete storage[key];
    }),
    multiSet: jest.fn(async (pairs: Array<[string, string]>) => {
        for (const [key, value] of pairs) {
            storage[key] = value;
        }
    }),
    multiRemove: jest.fn(async (keys: string[]) => {
        for (const key of keys) {
            delete storage[key];
        }
    }),
}));

jest.mock('../database/schema', () => ({
    getInitializedDatabase: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
    useNetInfo: jest.fn(),
}));

jest.mock('../database/syncQueue', () => ({
    runSerializedSyncTask: jest.fn(async (task: () => Promise<void>) => task()),
}));

jest.mock('../lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(async () => ({
                data: {
                    user: { id: 'fallback-user' },
                },
            })),
        },
    },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildLastSyncStorageKey, clearSyncState, getLastSyncTime, setLastSyncTime } from '../database/sync';

describe('sync session contracts', () => {
    beforeEach(() => {
        for (const key of Object.keys(storage)) {
            delete storage[key];
        }
        jest.clearAllMocks();
    });

    it('namespaces sync markers per authenticated user', async () => {
        await setLastSyncTime(101, 'user-a');
        await setLastSyncTime(202, 'user-b');

        expect(buildLastSyncStorageKey('user-a')).toBe('tabungin_last_sync_time:user-a');
        expect(await getLastSyncTime('user-a')).toBe(101);
        expect(await getLastSyncTime('user-b')).toBe(202);
        expect(await getLastSyncTime('user-c')).toBe(0);
    });

    it('clears legacy and user-specific sync markers without touching other users', async () => {
        storage.tabungin_last_sync_time = '88';
        await setLastSyncTime(101, 'user-a');
        await setLastSyncTime(202, 'user-b');

        await clearSyncState('user-a');

        expect(await getLastSyncTime('user-a')).toBe(0);
        expect(await getLastSyncTime('user-b')).toBe(202);
        expect((AsyncStorage.multiRemove as jest.Mock).mock.calls.at(-1)?.[0]).toEqual([
            'tabungin_last_sync_time',
            'tabungin_last_sync_time:user-a',
        ]);
    });
});
