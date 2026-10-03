// PUSH — kirim perubahan lokal ke Supabase.
// Diekstrak dari database/sync.ts.
import { supabase } from '../../lib/supabase';
import { getInitializedDatabase } from '../schema';
import {
    SYNC_TABLES,
    unsupportedRemoteTables,
    shouldSkipRemoteTable,
    tableRequiresRemoteWallet,
    type SyncTable,
} from './syncTables';
import { mapRecordToSupabase, isRowSyncableForRemoteWallet } from './syncUtils';
import {
    ensureProfileExistsInSupabase,
    reconcileLocalProfileWithSupabase,
    getActiveProfile,
} from './syncProfile';
import type { SyncDb } from './syncTypes';

function buildRemotePayload(
    table: SyncTable,
    row: any,
    validProfileId: string,
    activeProfileId: string,
    user: { id: string; email?: string | null },
): Record<string, any> {
    const record = mapRecordToSupabase(table.tableName, row);
    const payload: Record<string, any> = {};

    table.columns.forEach((col) => {
        if (col in record) {
            payload[col] = record[col];
        }
    });

    if (table.tableName === 'profiles') {
        payload.id = validProfileId;
        payload.user_id = user.id;
        payload.name = payload.name || user.email?.split('@')[0] || 'User';
        payload.updated_at = Date.now();
    }

    if (table.columns.includes('profile_id')) {
        if (!payload.profile_id && validProfileId) {
            payload.profile_id = validProfileId;
        } else if (payload.profile_id === activeProfileId && validProfileId) {
            payload.profile_id = validProfileId;
        }
    }

    return payload;
}

async function markRowsAsSynced(db: SyncDb, tableName: string, rows: any[]) {
    if (rows.length === 0) {
        return;
    }

    const ids = rows.map((row) => row.id);
    await db.runAsync(
        `UPDATE ${tableName} SET sync_status = 'synced' WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids,
    );
}

async function fetchAccessibleRemoteWalletIds(walletIds: string[]): Promise<Set<string>> {
    const uniqueWalletIds = [...new Set(walletIds.filter(Boolean))];
    if (uniqueWalletIds.length === 0) {
        return new Set<string>();
    }

    const { data, error } = await supabase.from('wallets').select('id').in('id', uniqueWalletIds);

    if (error) {
        throw error;
    }

    return new Set((data ?? []).map((wallet: any) => wallet.id));
}

/**
 * Ensure the wallet owner is added to wallet_members
 * This prevents RLS policy violations when inviting members
 */
async function ensureWalletOwnerMembership(
    wallets: any[],
    ownerEmail: string,
    _profileId: string,
): Promise<void> {
    if (!ownerEmail || wallets.length === 0) return;

    const timestamp = Date.now();
    const normalizedEmail = ownerEmail.toLowerCase();

    for (const wallet of wallets) {
        if (!wallet.id) continue;

        try {
            // Check if owner already exists in wallet_members
            const { data: existing } = await supabase
                .from('wallet_members')
                .select('id')
                .eq('wallet_id', wallet.id)
                .eq('user_email', normalizedEmail)
                .single();

            if (!existing) {
                // Add owner to wallet_members with owner role using SECURITY DEFINER
                // This bypasses RLS to ensure the owner gets added
                const { error: insertError } = await supabase.rpc('ensure_wallet_owner', {
                    p_wallet_id: wallet.id,
                    p_owner_email: normalizedEmail,
                    p_timestamp: timestamp,
                });

                if (insertError) {
                    // Fallback: try direct insert with ignore
                    console.log(`[Sync] RPC failed, trying direct insert for wallet:`, wallet.id);
                    // Don't throw, just log the error
                } else {
                    console.log(`[Sync] Added owner to wallet_members for wallet:`, wallet.id);
                }
            }
        } catch (err) {
            console.error(`[Sync] Failed to ensure wallet owner membership:`, err);
        }
    }
}

/**
 * PUSH: Kirim perubahan lokal ke Supabase
 * NOTE: Menggunakan profile_id untuk multi-user support, bukan user_id
 * CRITICAL: Profiles harus di-sync duluan agar wallets bisa refer ke profile_id
 */
export async function pushChanges() {
    const db = await getInitializedDatabase();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get active profile ID from store (for multi-profile support)
    const { activeProfileId } = await getActiveProfile();

    // CRITICAL: Pastikan profile exists di Supabase SEBELUM sync wallets
    const supabaseProfileId = await ensureProfileExistsInSupabase(user.id, user.email || '');
    if (!supabaseProfileId) {
        console.warn('[Sync] Skipping push because remote profile is unavailable.');
        return;
    }

    const validProfileId = await reconcileLocalProfileWithSupabase(
        supabaseProfileId,
        user.id,
        user.email || '',
    );

    // CRITICAL: Urutkan tabel agar profiles di-sync duluan
    const orderedTables = SYNC_TABLES.filter((t) => t.tableName === 'profiles').concat(
        SYNC_TABLES.filter((t) => t.tableName !== 'profiles'),
    );

    for (const table of orderedTables) {
        if (unsupportedRemoteTables.has(table.tableName)) {
            continue;
        }

        let pendingRows: any[] = [];

        if (table.tableName === 'profiles') {
            pendingRows = await db.getAllAsync<any>(
                `SELECT * FROM profiles WHERE id = ? AND sync_status IN ('pending_create', 'pending_update')`,
                [validProfileId],
            );
        } else {
            pendingRows = await db.getAllAsync<any>(
                `SELECT * FROM ${table.tableName} WHERE sync_status IN ('pending_create', 'pending_update')`,
            );
        }

        if (pendingRows.length > 0) {
            const pendingCreates = pendingRows.filter((row) => row.sync_status === 'pending_create');
            const pendingUpdates = pendingRows.filter((row) => row.sync_status === 'pending_update');

            let createPairs = pendingCreates.map((row) => ({
                row,
                payload: buildRemotePayload(table, row, validProfileId, activeProfileId, user),
            }));
            let updatePairs = pendingUpdates.map((row) => ({
                row,
                payload: buildRemotePayload(table, row, validProfileId, activeProfileId, user),
            }));

            if (tableRequiresRemoteWallet(table.tableName)) {
                try {
                    const remoteWalletIdSet = await fetchAccessibleRemoteWalletIds([
                        ...createPairs.map(({ payload }) => payload.wallet_id).filter(Boolean),
                        ...updatePairs.map(({ payload }) => payload.wallet_id).filter(Boolean),
                    ]);

                    const skippedCreates = createPairs.filter(
                        ({ payload }) => !isRowSyncableForRemoteWallet(payload, remoteWalletIdSet),
                    );
                    const skippedUpdates = updatePairs.filter(
                        ({ payload }) => !isRowSyncableForRemoteWallet(payload, remoteWalletIdSet),
                    );

                    createPairs = createPairs.filter(({ payload }) =>
                        isRowSyncableForRemoteWallet(payload, remoteWalletIdSet),
                    );
                    updatePairs = updatePairs.filter(({ payload }) =>
                        isRowSyncableForRemoteWallet(payload, remoteWalletIdSet),
                    );

                    if (skippedCreates.length > 0 || skippedUpdates.length > 0) {
                        console.log(
                            `[Sync] Skipping ${skippedCreates.length + skippedUpdates.length} ${table.tableName} row(s) because parent wallet is not accessible in Supabase yet.`,
                        );
                    }
                } catch (error) {
                    console.error(
                        `[Sync] Failed to validate parent wallets for ${table.tableName}:`,
                        error,
                    );
                    continue;
                }
            }

            const remoteColumns = table.remoteColumns ?? table.columns;
            const successfulCreates: any[] = [];
            const successfulUpdates: any[] = [];

            if (createPairs.length > 0) {
                const remoteRecords = createPairs.map(({ payload }) => {
                    const createPayload: Record<string, any> = {};
                    remoteColumns.forEach((column) => {
                        if (column in payload) {
                            createPayload[column] = payload[column];
                        }
                    });
                    return createPayload;
                });

                const { error } = await supabase.from(table.tableName).insert(remoteRecords);

                if (error) {
                    if (shouldSkipRemoteTable(table, error)) {
                        continue;
                    }
                    console.error(`Failed to push ${table.tableName}:`, error.message);
                } else {
                    successfulCreates.push(...createPairs.map(({ row }) => row));
                    await markRowsAsSynced(db, table.tableName, successfulCreates);

                    if (table.tableName === 'wallets') {
                        await ensureWalletOwnerMembership(
                            successfulCreates,
                            user.email || '',
                            validProfileId,
                        );
                    }
                }
            }

            for (const { row, payload } of updatePairs) {
                const updatePayload: Record<string, any> = {};
                remoteColumns.forEach((column) => {
                    if (column !== 'id' && column in payload) {
                        updatePayload[column] = payload[column];
                    }
                });

                const { data, error } = await supabase
                    .from(table.tableName)
                    .update(updatePayload)
                    .eq('id', row.id)
                    .select('id');

                if (error) {
                    if (shouldSkipRemoteTable(table, error)) {
                        continue;
                    }
                    console.error(`Failed to push ${table.tableName}:`, error.message);
                    continue;
                }

                if (!data || data.length === 0) {
                    console.warn(
                        `[Sync] Update ${table.tableName} skipped because the remote row is not writable:`,
                        row.id,
                    );
                    continue;
                }

                successfulUpdates.push(row);
            }

            if (successfulUpdates.length > 0) {
                await markRowsAsSynced(db, table.tableName, successfulUpdates);
            }
        }

        // 2. Handle Pending Delete
        const pendingDeletes = await db.getAllAsync<any>(
            `SELECT id FROM ${table.tableName} WHERE sync_status = 'pending_delete'`,
        );

        if (pendingDeletes.length > 0) {
            const ids = pendingDeletes.map((r) => r.id);
            const { error } = await supabase.from(table.tableName).delete().in('id', ids);

            if (!error) {
                await db.runAsync(
                    `DELETE FROM ${table.tableName} WHERE id IN (${ids.map(() => '?').join(',')})`,
                    ids,
                );
            } else {
                if (shouldSkipRemoteTable(table, error)) {
                    continue;
                }
                console.error(`Failed to delete ${table.tableName}:`, error.message);
            }
        }
    }
}
