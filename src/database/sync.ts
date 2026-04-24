import { getInitializedDatabase } from "./schema";
import { isSupabaseConfigured, supabase, warnIfSupabaseUnavailable } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetInfoState, useNetInfo } from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { runSerializedSyncTask } from "./syncQueue";

const LAST_SYNC_KEY = "tabungin_last_sync_time";

// Tipe data untuk sync
type SyncStatus = "synced" | "pending_create" | "pending_update" | "pending_delete";

interface SyncTable {
  tableName: string;
  columns: string[];
  remoteColumns?: string[];
  remoteUpdatedAtColumn?: string;
  optional?: boolean;
}

const SYNC_TABLES: SyncTable[] = [
  {
    tableName: "profiles",
    columns: ["id", "user_id", "name", "icon", "color", "created_at", "updated_at"],
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
    tableName: "wallet_goals_shared",
    columns: [
      "id",
      "goal_id",
      "wallet_id",
      "user_email",
      "shared_by",
      "shared_at",
      "created_at",
      "updated_at",
      "permission_level",
    ],
    remoteColumns: [
      "id",
      "goal_id",
      "wallet_id",
      "user_email",
      "shared_by",
      "shared_at",
      "created_at",
      "updated_at",
      "permission_level",
    ],
    remoteUpdatedAtColumn: "updated_at",
  },
  {
    tableName: "sharing_activity_log",
    columns: [
      "id",
      "goal_id",
      "wallet_id",
      "user_email",
      "action",
      "performed_by",
      "metadata",
      "timestamp",
      "created_at",
      "updated_at",
    ],
    optional: true,
  },
  {
    tableName: "budgets",
    columns: ["id", "category", "amount", "month", "year", "created_at", "updated_at", "wallet_id", "profile_id"],
  },
];

const unsupportedRemoteTables = new Set<string>();
let activeSyncPromise: Promise<void> | null = null;

function isRemoteMissingTableError(error: any) {
  return error?.code === "PGRST205" || String(error?.message || "").includes("schema cache");
}

function shouldSkipRemoteTable(table: SyncTable, error: any) {
  if (table.optional && isRemoteMissingTableError(error)) {
    unsupportedRemoteTables.add(table.tableName);
    console.log(`[Sync] Skipping optional remote table ${table.tableName} because it is unavailable in Supabase.`);
    return true;
  }

  return false;
}

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
  if (table === "wallet_goals_shared") {
    record.created_at = record.created_at ?? record.shared_at ?? Date.now();
    record.updated_at = record.updated_at ?? record.created_at;
    record.permission_level = record.permission_level ?? "read_write";
  }
  // No boolean conversion needed for profiles or wallet_members yet

  return record;
}

/**
 * Pastikan profile exists di Supabase sebelum sync wallets
 * Jika profile_id tidak ada di Supabase, buat profile baru
 */
async function ensureProfileExistsInSupabase(userId: string, userEmail: string): Promise<string | null> {
  try {
    // Cek apakah profile dengan user_id ini ada di Supabase
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfileError) {
      console.error('[Sync] Failed to fetch remote profile:', existingProfileError);
      return null;
    }

    if (existingProfile) {
      return existingProfile.id;
    }

    // Jika tidak ada, buat profile baru
    const profileId = uuidv4();
    const timestamp = Date.now();

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: profileId,
        user_id: userId,
        name: userEmail.split('@')[0] || 'User',
        color: '#1DB954',
        created_at: timestamp,
        updated_at: timestamp,
      });

    if (insertError) {
      console.error('[Sync] Failed to create profile:', insertError);
      return null;
    }

    console.log('[Sync] Created new profile in Supabase:', profileId);
    return profileId;
  } catch (e) {
    console.error('[Sync] Error ensuring profile exists:', e);
    return null;
  }
}

async function reconcileLocalProfileWithSupabase(
  remoteProfileId: string,
  userId: string,
  userEmail: string,
): Promise<string> {
  const db = await getInitializedDatabase();
  const { useProfileStore } = await import('../store/useProfileStore');

  const now = Date.now();
  const fallbackName = userEmail.split('@')[0] || 'User';
  const currentActiveProfileId = useProfileStore.getState().activeProfileId;

  const [remoteProfile, activeProfile] = await Promise.all([
    db.getFirstAsync<any>('SELECT * FROM profiles WHERE id = ?', [remoteProfileId]),
    currentActiveProfileId
      ? db.getFirstAsync<any>('SELECT * FROM profiles WHERE id = ?', [currentActiveProfileId])
      : Promise.resolve(null),
  ]);

  const canonicalProfile = remoteProfile || activeProfile;
  const createdAt =
    remoteProfile?.created_at ??
    activeProfile?.created_at ??
    now;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT OR REPLACE INTO profiles (id, user_id, name, icon, color, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')`,
      [
        remoteProfileId,
        userId,
        canonicalProfile?.name || fallbackName,
        canonicalProfile?.icon || 'account',
        canonicalProfile?.color || '#1DB954',
        createdAt,
        now,
      ],
    );

    if (currentActiveProfileId && currentActiveProfileId !== remoteProfileId) {
      const profileTables = ['wallets', 'transactions', 'budgets', 'saving_goals'];

      for (const tableName of profileTables) {
        await db.runAsync(
          `UPDATE ${tableName}
           SET profile_id = ?,
               updated_at = ?,
               sync_status = CASE
                 WHEN sync_status = 'synced' THEN 'pending_update'
                 ELSE sync_status
               END
           WHERE profile_id = ?`,
          [remoteProfileId, now, currentActiveProfileId],
        );
      }

      await db.runAsync('DELETE FROM profiles WHERE id = ?', [currentActiveProfileId]);
    }
  });

  if (useProfileStore.getState().activeProfileId !== remoteProfileId) {
    useProfileStore.getState().setActiveProfile(remoteProfileId);
  }

  await useProfileStore.getState().loadProfiles();
  return remoteProfileId;
}

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

async function markRowsAsSynced(db: Awaited<ReturnType<typeof getInitializedDatabase>>, tableName: string, rows: any[]) {
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

  const { data, error } = await supabase
    .from('wallets')
    .select('id')
    .in('id', uniqueWalletIds);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((wallet: any) => wallet.id));
}

function tableRequiresRemoteWallet(tableName: string): boolean {
  return ['transactions', 'budgets', 'saving_goals', 'wallet_members'].includes(tableName);
}

function isRowSyncableForRemoteWallet(payload: Record<string, any>, remoteWalletIdSet: Set<string>): boolean {
  if (!payload.wallet_id) {
    return true;
  }

  return remoteWalletIdSet.has(payload.wallet_id);
}

/**
 * PUSH: Kirim perubahan lokal ke Supabase
 * NOTE: Menggunakan profile_id untuk multi-user support, bukan user_id
 * CRITICAL: Profiles harus di-sync duluan agar wallets bisa refer ke profile_id
 */
async function pushChanges() {
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
  const orderedTables = SYNC_TABLES.filter(t => t.tableName === 'profiles')
    .concat(SYNC_TABLES.filter(t => t.tableName !== 'profiles'));

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

          createPairs = createPairs.filter(({ payload }) => isRowSyncableForRemoteWallet(payload, remoteWalletIdSet));
          updatePairs = updatePairs.filter(({ payload }) => isRowSyncableForRemoteWallet(payload, remoteWalletIdSet));

          if (skippedCreates.length > 0 || skippedUpdates.length > 0) {
            console.log(
              `[Sync] Skipping ${skippedCreates.length + skippedUpdates.length} ${table.tableName} row(s) because parent wallet is not accessible in Supabase yet.`,
            );
          }
        } catch (error) {
          console.error(`[Sync] Failed to validate parent wallets for ${table.tableName}:`, error);
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
            await ensureWalletOwnerMembership(successfulCreates, user.email || '', validProfileId);
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
          console.warn(`[Sync] Update ${table.tableName} skipped because the remote row is not writable:`, row.id);
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
      const { error } = await supabase.from(table.tableName).delete().in("id", ids);

      if (!error) {
        await db.runAsync(`DELETE FROM ${table.tableName} WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
      } else {
        if (shouldSkipRemoteTable(table, error)) {
          continue;
        }
        console.error(`Failed to delete ${table.tableName}:`, error.message);
      }
    }
  }
}

/**
 * Ensure the wallet owner is added to wallet_members
 * This prevents RLS policy violations when inviting members
 */
async function ensureWalletOwnerMembership(
  wallets: any[],
  ownerEmail: string,
  _profileId: string
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
  if (table === "wallet_goals_shared") {
    record.created_at = record.created_at ?? record.shared_at ?? Date.now();
    record.updated_at = record.updated_at ?? record.created_at;
    record.permission_level = record.permission_level ?? "read_write";
  }

  return record;
}

/**
 * PULL: Ambil perubahan dari Supabase
 */
async function pullChanges() {
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
      const remoteUpdatedAtColumn = table.remoteUpdatedAtColumn ?? "updated_at";
      const { data, error } = await supabase
        .from(table.tableName)
        .select("*")
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
 * Fungsi utama Sync
 */
export async function syncDatabase() {
  if (!isSupabaseConfigured) {
    warnIfSupabaseUnavailable("syncDatabase");
    return;
  }

  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = runSerializedSyncTask(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      console.log("Starting sync...");

      try {
        await pushChanges();
      } catch (e) {
        console.error("Push changes failed:", e);
      }

      try {
        await pullChanges();
      } catch (e) {
        console.error("Pull changes failed:", e);
      }

      console.log("Sync completed.");
    } catch (e) {
      console.error("Sync failed:", e);
    } finally {
      activeSyncPromise = null;
    }
  });

  return activeSyncPromise;
}

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

