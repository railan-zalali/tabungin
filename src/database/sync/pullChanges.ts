// PULL — ambil perubahan dari Supabase, plus penyimpanan kursor sync terakhir.
// Diekstrak dari database/sync.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { getInitializedDatabase } from '../schema';
import { SYNC_TABLES, unsupportedRemoteTables, shouldSkipRemoteTable } from './syncTables';
import { mapRecordFromSupabase } from './syncUtils';
import type { SyncDb } from './syncTypes';

const LAST_SYNC_KEY = 'tabungin_last_sync_time';

export async function getLastSyncTime(): Promise<number> {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return raw ? parseInt(raw, 10) : 0;
}

export async function setLastSyncTime(time: number): Promise<void> {
    await AsyncStorage.setItem(LAST_SYNC_KEY, time.toString());
}

/**
 * PULL: Ambil perubahan dari Supabase
 */
export async function pullChanges() {
    const db = await getInitializedDatabase();
    const rawLastSync = await getLastSyncTime();
    // Pastikan lastSync adalah angka valid (bukan string atau NaN)
    const lastSync = Number(rawLastSync) || 0;
    let maxUpdatedAt = lastSync;

    for (const table of SYNC_TABLES) {
        if (unsupportedRemoteTables.has(table.tableName)) {
            continue;
        }

        try {
            const remoteUpdatedAtColumn = table.remoteUpdatedAtColumn ?? 'updated_at';
            const { data, error } = await supabase
                .from(table.tableName)
                .select('*')
                .gt(remoteUpdatedAtColumn, lastSync); // Ambil yang berubah sejak sync terakhir

            if (error) {
                if (shouldSkipRemoteTable(table, error)) {
                    continue;
                }
                console.error(`Failed to pull ${table.tableName}:`, error);
                continue;
            }

            if (!data || data.length === 0) continue;

            // [SELF-HEALING] Pastikan foreign key parent (wallet_id) ada di lokal sebelum insert
            // Karena shared wallet mungkin tidak ter-pull jika 'updated_at' nya lebih tua dari lastSync
            if (['transactions', 'saving_goals', 'budgets'].includes(table.tableName)) {
                const walletIds = [
                    ...new Set(data.map((r: any) => r.wallet_id).filter(Boolean)),
                ] as string[];
                if (walletIds.length > 0) {
                    await ensureLocalWalletsExist(db, walletIds);
                }
            }

            await db.withTransactionAsync(async () => {
                for (const row of data) {
                    // Mapping data types
                    const localRow = mapRecordFromSupabase(table.tableName, row);

                    const columns = table.columns.join(', ');
                    const placeholders = table.columns.map(() => '?').join(', ');
                    const values = table.columns.map((col) => localRow[col]);

                    // Insert or Replace dengan sync_status = 'synced'
                    await db.runAsync(
                        `INSERT OR REPLACE INTO ${table.tableName} (${columns}, sync_status) VALUES (${placeholders}, 'synced')`,
                        [...values],
                    );

                    // Track max updated_at
                    const syncMarker = row.updated_at ?? row[remoteUpdatedAtColumn] ?? row.created_at;
                    if (syncMarker && syncMarker > maxUpdatedAt) {
                        maxUpdatedAt = syncMarker;
                    }
                }
            });
        } catch (e) {
            console.error(`Error processing pull for ${table.tableName}:`, e);
        }
    }

    // Update last sync time only if we successfully pulled newer data
    if (maxUpdatedAt > lastSync) {
        await setLastSyncTime(maxUpdatedAt);
    }
}

/**
 * Tarik wallet parent yang belum ada di lokal, agar foreign key
 * transaksi/tabungan/budget tidak rusak.
 */
async function ensureLocalWalletsExist(db: SyncDb, walletIds: string[]): Promise<void> {
    const placeholders = walletIds.map(() => '?').join(',');
    const existing = await db.getAllAsync<any>(
        `SELECT id FROM wallets WHERE id IN (${placeholders})`,
        walletIds,
    );
    const existingIds = new Set(existing.map((e: any) => e.id));
    const missingIds = walletIds.filter((id) => !existingIds.has(id));

    if (missingIds.length === 0) return;

    console.log(
        `[Sync] Menemukan wallet yang belum ada di lokal, menarik dari server...`,
        missingIds,
    );
    const { data: missingWallets } = await supabase
        .from('wallets')
        .select('*')
        .in('id', missingIds);

    if (!missingWallets || missingWallets.length === 0) return;

    const wTable = SYNC_TABLES.find((t) => t.tableName === 'wallets');
    if (!wTable) return;

    for (const w of missingWallets) {
        const mappedW = mapRecordFromSupabase('wallets', w);
        const wCols = wTable.columns.join(', ');
        const wPlaceholders = wTable.columns.map(() => '?').join(', ');
        const wValues = wTable.columns.map((col) => mappedW[col]);

        await db.runAsync(
            `INSERT OR REPLACE INTO wallets (${wCols}, sync_status) VALUES (${wPlaceholders}, 'synced')`,
            [...wValues],
        );
    }
}
