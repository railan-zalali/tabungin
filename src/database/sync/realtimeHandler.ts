// Handle payload Supabase Realtime -> SQLite.
// Diekstrak dari database/sync.ts.
import { getInitializedDatabase } from '../schema';
import { SYNC_TABLES } from './syncTables';
import { mapRecordFromSupabase } from './syncUtils';
import { pullChanges } from './pullChanges';

/**
 * Handle payload dari Supabase Realtime
 * @returns boolean true jika ada perubahan data lokal, false jika tidak
 */
export async function handleRealtimePayload(tableName: string, payload: any): Promise<boolean> {
    const db = await getInitializedDatabase();
    const tableDef = SYNC_TABLES.find((t) => t.tableName === tableName);
    // Optional support: if table_members was stripped but we still want realtime for it, we can bypass the tableDef check,
    // but let's assume we won't sync wallet_members to sqlite anymore as it's online-only now.
    if (!tableDef) return false;

    try {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new;
            if (!row || !row.id) return false;

            // Filter: jangan timpa kalau data lokal lebih baru (jika ada pending_update lokal)
            const existing = await db.getFirstAsync<{ sync_status: string }>(
                `SELECT sync_status FROM ${tableName} WHERE id = ?`,
                [row.id],
            );
            if (existing && existing.sync_status === 'pending_update') {
                // Lokal masih punya update yang belum ter-push, biarkan push() yang menangani nanti
                return false;
            }

            // [SELF-HEALING] Jika transaction perlu wallet tapi walletnya belum ada
            if (['transactions', 'saving_goals', 'budgets'].includes(tableName) && row.wallet_id) {
                const existingWallet = await db.getFirstAsync(`SELECT id FROM wallets WHERE id = ?`, [
                    row.wallet_id,
                ]);
                if (!existingWallet) {
                    console.log(`[Realtime] Parent wallet not found locally. Triggering pull...`);
                    await pullChanges();
                    return true;
                }
            }

            const localRow = mapRecordFromSupabase(tableName, row);
            const columns = tableDef.columns.join(', ');
            const placeholders = tableDef.columns.map(() => '?').join(', ');
            const values = tableDef.columns.map((col) => localRow[col]);

            await db.runAsync(
                `INSERT OR REPLACE INTO ${tableName} (${columns}, sync_status) VALUES (${placeholders}, 'synced')`,
                [...values],
            );
            return true;
        }

        if (payload.eventType === 'DELETE') {
            const row = payload.old;
            if (!row || !row.id) return false;

            const existing = await db.getFirstAsync<{ sync_status: string }>(
                `SELECT sync_status FROM ${tableName} WHERE id = ?`,
                [row.id],
            );
            if (existing && existing.sync_status === 'pending_update') {
                return false; // don't delete yet if local has dirty updates
            }

            await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [row.id]);
            return true;
        }
    } catch (e) {
        console.error(`[Realtime] Error handling payload for ${tableName}:`, e);
    }
    return false;
}
