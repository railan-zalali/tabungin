// Test unit modul sync hasil pemisahan dari sync.ts monolitik:
// konfigurasi tabel, mapping SQLite <-> Supabase, dan kursor sync terakhir.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLastSyncTime, setLastSyncTime } from '../../src/database/sync/pullChanges';
import {
    SYNC_TABLES,
    isRemoteMissingTableError,
    shouldSkipRemoteTable,
    tableRequiresRemoteWallet,
    unsupportedRemoteTables,
} from '../../src/database/sync/syncTables';
import {
    isRowSyncableForRemoteWallet,
    mapRecordFromSupabase,
    mapRecordToSupabase,
} from '../../src/database/sync/syncUtils';
import type { SyncTable } from '../../src/database/sync/syncTypes';

// pullChanges mengimpor schema — cukup disediakan stub agar modul terpisah.
jest.mock('../../src/database/schema', () => ({
    getInitializedDatabase: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as unknown as {
    getItem: jest.Mock;
    setItem: jest.Mock;
};

describe('SYNC_TABLES', () => {
    it('memiliki nama tabel unik dengan kolom yang tidak kosong', () => {
        const names = SYNC_TABLES.map((table) => table.tableName);
        expect(new Set(names).size).toBe(names.length);
        for (const table of SYNC_TABLES) {
            expect(table.columns.length).toBeGreaterThan(0);
        }
    });

    it('mendaftarkan tabel debt dan turunannya', () => {
        const names = SYNC_TABLES.map((table) => table.tableName);
        expect(names).toEqual(expect.arrayContaining(['debts', 'debt_payments']));

        const debts = SYNC_TABLES.find((table) => table.tableName === 'debts')!;
        expect(debts.columns).toEqual(
            expect.arrayContaining(['type', 'counterparty', 'amount', 'remaining_amount', 'due_date']),
        );

        // Keduanya opsional: bila Supabase belum menjalankan migrasi
        // 20261003000001_debt_tracking.sql, sync melewati dengan satu warning
        // alih-alih membuang PGRST205 di setiap siklus.
        expect(debts.optional).toBe(true);
        expect(SYNC_TABLES.find((table) => table.tableName === 'debt_payments')!.optional).toBe(true);
    });
});

describe('tableRequiresRemoteWallet', () => {
    it('menandai tabel yang bergantung pada wallet parent', () => {
        expect(tableRequiresRemoteWallet('transactions')).toBe(true);
        expect(tableRequiresRemoteWallet('saving_goals')).toBe(true);
        expect(tableRequiresRemoteWallet('debts')).toBe(true);
    });

    it('tidak mewajibkan wallet untuk tabel bebas wallet', () => {
        expect(tableRequiresRemoteWallet('debt_payments')).toBe(false);
        expect(tableRequiresRemoteWallet('profiles')).toBe(false);
    });
});

describe('isRemoteMissingTableError / shouldSkipRemoteTable', () => {
    it('mengenali error tabel tidak ada di Supabase', () => {
        expect(isRemoteMissingTableError({ code: 'PGRST205' })).toBe(true);
        expect(isRemoteMissingTableError({ message: "Could not find the table 'debts' in the schema cache" })).toBe(true);
        expect(isRemoteMissingTableError({ code: 'OTHER', message: 'boom' })).toBe(false);
        expect(isRemoteMissingTableError(undefined)).toBe(false);
    });

    it('melewati hanya tabel opsional yang hilang dan mencatatnya', () => {
        const optional: SyncTable = { tableName: 'some_optional', columns: ['id'], optional: true };
        const required: SyncTable = { tableName: 'some_required', columns: ['id'] };

        try {
            expect(shouldSkipRemoteTable(required, { code: 'PGRST205' })).toBe(false);
            expect(unsupportedRemoteTables.has('some_required')).toBe(false);

            expect(shouldSkipRemoteTable(optional, { code: 'PGRST205' })).toBe(true);
            expect(unsupportedRemoteTables.has('some_optional')).toBe(true);

            // Error lain tidak membuat tabel ditinggalkan.
            expect(shouldSkipRemoteTable(optional, { code: 'OTHER' })).toBe(false);
        } finally {
            unsupportedRemoteTables.delete('some_optional');
        }
    });

    it('melewati debts bila Supabase belum dijalankan migrasinya', () => {
        const debts = SYNC_TABLES.find((table) => table.tableName === 'debts')!;
        const missingTable = { code: 'PGRST205', message: "Could not find the table 'public.debts'" };

        try {
            expect(shouldSkipRemoteTable(debts, missingTable)).toBe(true);
            expect(unsupportedRemoteTables.has('debts')).toBe(true);
        } finally {
            unsupportedRemoteTables.delete('debts');
        }
    });
});

describe('mapRecordToSupabase / mapRecordFromSupabase', () => {
    it('mengubah flag 0/1 menjadi boolean saat push', () => {
        const pushed = mapRecordToSupabase('saving_goals', {
            id: 'g1',
            is_completed: 1,
            reminder_enabled: 0,
        });

        expect(pushed.is_completed).toBe(true);
        expect(pushed.reminder_enabled).toBe(false);
    });

    it('mengubah boolean menjadi 0/1 saat pull', () => {
        const pulled = mapRecordFromSupabase('saving_goals', {
            id: 'g1',
            is_completed: true,
            reminder_enabled: false,
        });

        expect(pulled.is_completed).toBe(1);
        expect(pulled.reminder_enabled).toBe(0);
    });

    it('mengubah is_default wallet menjadi boolean', () => {
        expect(mapRecordToSupabase('wallets', { id: 'w1', is_default: 1 }).is_default).toBe(true);
    });

    it('melengkapi kolom sharing yang belum terisi', () => {
        const sharedAt = 1_700_000_000_000;
        const pushed = mapRecordToSupabase('wallet_goals_shared', { shared_at: sharedAt });

        expect(pushed.created_at).toBe(sharedAt);
        expect(pushed.updated_at).toBe(sharedAt);
        expect(pushed.permission_level).toBe('read_write');
    });

    it('mempertahankan kolom sharing yang sudah terisi', () => {
        const pushed = mapRecordToSupabase('wallet_goals_shared', {
            shared_at: 1,
            created_at: 2,
            updated_at: 3,
            permission_level: 'read_only',
        });

        expect(pushed.created_at).toBe(2);
        expect(pushed.updated_at).toBe(3);
        expect(pushed.permission_level).toBe('read_only');
    });

    it('melewatkan tabel tanpa konversi khusus', () => {
        const row = { id: 'd1', amount: 5000, note: null };
        expect(mapRecordToSupabase('debts', row)).toEqual(row);
        expect(mapRecordFromSupabase('debts', row)).toEqual(row);
        // Tidak memutasi objek asli.
        expect(mapRecordToSupabase('debts', row)).not.toBe(row);
    });
});

describe('isRowSyncableForRemoteWallet', () => {
    const set = new Set(['w1']);

    it('mengizinkan row tanpa wallet (personal)', () => {
        expect(isRowSyncableForRemoteWallet({ wallet_id: null }, set)).toBe(true);
        expect(isRowSyncableForRemoteWallet({}, set)).toBe(true);
    });

    it('mengizinkan row yang wallet-nya sudah ada di remote', () => {
        expect(isRowSyncableForRemoteWallet({ wallet_id: 'w1' }, set)).toBe(true);
    });

    it('menahan row yang wallet-nya belum ter-sinkron', () => {
        expect(isRowSyncableForRemoteWallet({ wallet_id: 'baru' }, set)).toBe(false);
    });
});

describe('getLastSyncTime / setLastSyncTime', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('mengembalikan 0 bila belum pernah tersinkron', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        await expect(getLastSyncTime()).resolves.toBe(0);
        expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('tabungin_last_sync_time');
    });

    it('menyimpan dan membaca kembali kursor waktu', async () => {
        mockAsyncStorage.getItem.mockResolvedValue(null);

        await setLastSyncTime(1_700_000_000_000);

        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('tabungin_last_sync_time', '1700000000000');

        mockAsyncStorage.getItem.mockResolvedValue('1700000000000');
        await expect(getLastSyncTime()).resolves.toBe(1_700_000_000_000);
    });
});
