import { getDatabase } from "./schema";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetInfoState, useNetInfo } from "@react-native-community/netinfo";

const LAST_SYNC_KEY = "tabungin_last_sync_time";

// Tipe data untuk sync
type SyncStatus = "synced" | "pending_create" | "pending_update" | "pending_delete";

interface SyncTable {
  tableName: string;
  columns: string[];
}

const SYNC_TABLES: SyncTable[] = [
  {
    tableName: "profiles",
    columns: ["id", "name", "icon", "color", "created_at", "updated_at"],
  },
  {
    tableName: "wallets",
    columns: [
      "id",
      "name",
      "type",
      "color",
      "balance",
      "is_default",
      "created_at",
      "updated_at",
      "profile_id",
    ],
  },
  {
    tableName: "transactions",
    columns: ["id", "type", "amount", "category", "note", "date", "created_at", "updated_at", "wallet_id", "profile_id"],
  },
  {
    tableName: "wallet_members",
    columns: ["id", "wallet_id", "user_email", "role", "status", "created_at", "updated_at"],
  },
  {
    tableName: "saving_goals",
    columns: [
      "id",
      "name",
      "target_amount",
      "current_amount",
      "emoji",
      "photo_uri",
      "saving_per_period",
      "period_type",
      "color",
      "start_date",
      "estimated_date",
      "is_completed",
      "reminder_enabled",
      "reminder_time",
      "created_at",
      "updated_at",
      "wallet_id",
      "profile_id",
    ],
  },
  {
    tableName: "saving_logs",
    columns: ["id", "goal_id", "amount", "note", "date", "created_at", "updated_at"],
  },
  {
    tableName: "budgets",
    columns: ["id", "category", "amount", "month", "year", "created_at", "updated_at", "wallet_id", "profile_id"],
  },
];

export async function getLastSyncTime(): Promise<number> {
  const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return raw ? parseInt(raw, 10) : 0;
}

export async function setLastSyncTime(time: number): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, time.toString());
}

/**
 * Helper untuk mapping data SQLite ke Supabase (Postgres)
 */
function mapRecordToSupabase(table: string, row: any): any {
  const record = { ...row };

  // Convert boolean fields from 0/1 to false/true
  if (table === "saving_goals") {
    if ("is_completed" in record) record.is_completed = Boolean(record.is_completed);
    if ("reminder_enabled" in record) record.reminder_enabled = Boolean(record.reminder_enabled);
  }
  if (table === "wallets") {
    if ("is_default" in record) record.is_default = Boolean(record.is_default);
  }
  // No boolean conversion needed for profiles or wallet_members yet

  return record;
}

/**
 * PUSH: Kirim perubahan lokal ke Supabase
 * NOTE: Menggunakan profile_id untuk multi-user support, bukan user_id
 */
async function pushChanges() {
  const db = await getDatabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Get active profile ID from store (for multi-profile support)
  // Fallback to using user.email if profile not set
  const { activeProfileId } = await getActiveProfile();

  for (const table of SYNC_TABLES) {
    // 1. Handle Pending Create & Update
    const pendingUpserts = await db.getAllAsync<any>(
      `SELECT * FROM ${table.tableName} WHERE sync_status IN ('pending_create', 'pending_update')`,
    );

    if (pendingUpserts.length > 0) {
      const records = pendingUpserts.map((row) => {
        const record = mapRecordToSupabase(table.tableName, row);
        const payload: any = {};

        table.columns.forEach((col) => {
          if (col in record) {
            payload[col] = record[col];
          }
        });

        // Preserve record.profile_id when it already exists.
        // Shared-wallet rows must keep the wallet owner's profile_id instead of
        // being overwritten by whoever is currently syncing them.
        if (
          table.columns.includes('profile_id') &&
          !payload.profile_id &&
          activeProfileId
        ) {
          payload.profile_id = activeProfileId;
        } else if (
          table.columns.includes('profile_id') &&
          !payload.profile_id &&
          !activeProfileId
        ) {
          // Fallback: don't set profile_id if no active profile
          console.warn(`[Sync] No active profile for table ${table.tableName}, skipping profile_id`);
        }

        // Set user_id for backward compatibility (but won't be used in query logic)
        payload.user_id = user.id;

        return payload;
      });

      const { error } = await supabase.from(table.tableName).upsert(records);

      if (!error) {
        // Tandai sebagai synced di lokal menggunakan parameterized query
        const placeholders = pendingUpserts.map(() => "?").join(",");
        const ids = pendingUpserts.map((r) => r.id);

        await db.runAsync(
          `UPDATE ${table.tableName} SET sync_status = 'synced' WHERE id IN (${placeholders})`,
          ids,
        );
      } else {
        console.error(`Failed to push ${table.tableName}:`, error);
      }
    }

    // 2. Handle Pending Delete
    const pendingDeletes = await db.getAllAsync<any>(
      `SELECT id FROM ${table.tableName} WHERE sync_status = 'pending_delete'`,
    );

    if (pendingDeletes.length > 0) {
      const ids = pendingDeletes.map((r) => r.id);
      const { error } = await supabase.from(table.tableName).delete().in("id", ids);

      if (!error) {
        // Hapus fisik di lokal
        const placeholders = ids.map(() => "?").join(",");
        await db.runAsync(`DELETE FROM ${table.tableName} WHERE id IN (${placeholders})`, ids);
      } else {
        console.error(`Failed to delete ${table.tableName}:`, error);
      }
    }
  }
}

/**
 * Helper untuk mendapatkan active profile ID
 * Ini penting untuk multi-user sync di shared wallets
 */
async function getActiveProfile(): Promise<{ activeProfileId: string }> {
  try {
    // Import useProfileStore secara dinamis untuk menghindari circular dependency
    const { useProfileStore } = await import('../store/useProfileStore');
    const profileId = useProfileStore.getState().activeProfileId;
    return { activeProfileId: profileId || '' };
  } catch (e) {
    console.error('Error getting active profile:', e);
    return { activeProfileId: '' };
  }
}

/**
 * Helper untuk mapping data Supabase (Postgres) ke SQLite
 */
function mapRecordFromSupabase(table: string, row: any): any {
  const record = { ...row };

  // Convert boolean fields from true/false to 0/1
  if (table === "saving_goals") {
    if ("is_completed" in record) record.is_completed = record.is_completed ? 1 : 0;
    if ("reminder_enabled" in record) record.reminder_enabled = record.reminder_enabled ? 1 : 0;
  }

  return record;
}

/**
 * PULL: Ambil perubahan dari Supabase
 */
async function pullChanges() {
  const db = await getDatabase();
  const rawLastSync = await getLastSyncTime();
  // Pastikan lastSync adalah angka valid (bukan string atau NaN)
  const lastSync = Number(rawLastSync) || 0;
  let maxUpdatedAt = lastSync;

  for (const table of SYNC_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table.tableName)
        .select("*")
        .gt("updated_at", lastSync); // Ambil yang berubah sejak sync terakhir

      if (error) {
        console.error(`Failed to pull ${table.tableName}:`, error);
        continue;
      }

      if (!data || data.length === 0) continue;

      // [SELF-HEALING] Pastikan foreign key parent (wallet_id) ada di lokal sebelum insert
      // Karena shared wallet mungkin tidak ter-pull jika 'updated_at' nya lebih tua dari lastSync
      if (['transactions', 'saving_goals', 'budgets'].includes(table.tableName)) {
        const walletIds = [...new Set(data.map((r: any) => r.wallet_id).filter(Boolean))] as string[];
        if (walletIds.length > 0) {
          const placeholders = walletIds.map(() => "?").join(",");
          const existing = await db.getAllAsync<any>(
            `SELECT id FROM wallets WHERE id IN (${placeholders})`,
            walletIds,
          );
          const existingIds = new Set(existing.map((e: any) => e.id));
          const missingIds = walletIds.filter((id) => !existingIds.has(id));

          if (missingIds.length > 0) {
            console.log(`[Sync] Menemukan wallet yang belum ada di lokal, menarik dari server...`, missingIds);
            const { data: missingWallets } = await supabase
              .from("wallets")
              .select("*")
              .in("id", missingIds);

            if (missingWallets && missingWallets.length > 0) {
              const wTable = SYNC_TABLES.find((t) => t.tableName === "wallets")!;
              for (const w of missingWallets) {
                const mappedW = mapRecordFromSupabase("wallets", w);
                const wCols = wTable.columns.join(", ");
                const wPlaceholders = wTable.columns.map(() => "?").join(", ");
                const wValues = wTable.columns.map((col) => mappedW[col]);

                await db.runAsync(
                  `INSERT OR REPLACE INTO wallets (${wCols}, sync_status) VALUES (${wPlaceholders}, 'synced')`,
                  [...wValues],
                );
              }
            }
          }
        }
      }

      await db.withTransactionAsync(async () => {
        for (const row of data) {
          // Mapping data types
          const localRow = mapRecordFromSupabase(table.tableName, row);

          const columns = table.columns.join(", ");
          const placeholders = table.columns.map(() => "?").join(", ");
          const values = table.columns.map((col) => localRow[col]);

          // Insert or Replace
          // Kita perlu set sync_status = 'synced'
          await db.runAsync(
            `INSERT OR REPLACE INTO ${table.tableName} (${columns}, sync_status) VALUES (${placeholders}, 'synced')`,
            [...values],
          );

          // Track max updated_at
          if (row.updated_at && row.updated_at > maxUpdatedAt) {
            maxUpdatedAt = row.updated_at;
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
 * Fungsi utama Sync
 */
export async function syncDatabase() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return; // Tidak bisa sync jika belum login

    console.log("Starting sync...");

    // Push first to ensure our local changes are on server
    try {
      await pushChanges();
    } catch (e) {
      console.error("Push changes failed:", e);
    }

    // Then pull to get latest updates
    try {
      await pullChanges();
    } catch (e) {
      console.error("Pull changes failed:", e);
    }

    console.log("Sync completed.");
  } catch (e) {
    console.error("Sync failed:", e);
  }
}

/**
 * Handle payload dari Supabase Realtime
 * @returns boolean true jika ada perubahan data lokal, false jika tidak
 */
export async function handleRealtimePayload(tableName: string, payload: any): Promise<boolean> {
  const db = await getDatabase();
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
        [row.id]
      );
      if (existing && existing.sync_status === 'pending_update') {
        // Lokal masih punya update yang belum ter-push, biarkan push() yang menangani nanti
        return false;
      }

      // [SELF-HEALING] Jika transaction perlu wallet tapi walletnya belum ada
      if (['transactions', 'saving_goals', 'budgets'].includes(tableName) && row.wallet_id) {
        const existingWallet = await db.getFirstAsync(`SELECT id FROM wallets WHERE id = ?`, [row.wallet_id]);
        if (!existingWallet) {
          console.log(`[Realtime] Parent wallet not found locally. Triggering pull...`);
          await pullChanges();
          return true;
        }
      }

      const localRow = mapRecordFromSupabase(tableName, row);
      const columns = tableDef.columns.join(", ");
      const placeholders = tableDef.columns.map(() => "?").join(", ");
      const values = tableDef.columns.map((col) => localRow[col]);

      await db.runAsync(
        `INSERT OR REPLACE INTO ${tableName} (${columns}, sync_status) VALUES (${placeholders}, 'synced')`,
        [...values]
      );
      return true;

    } else if (payload.eventType === 'DELETE') {
      const row = payload.old;
      if (!row || !row.id) return false;

      const existing = await db.getFirstAsync<{ sync_status: string }>(
        `SELECT sync_status FROM ${tableName} WHERE id = ?`,
        [row.id]
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
