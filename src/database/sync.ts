import { getInitializedDatabase } from "./schema";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NetInfoState, useNetInfo } from "@react-native-community/netinfo";
import { v4 as uuidv4 } from "uuid";
import { runSerializedSyncTask } from "./syncQueue";
import { shouldApplyRemoteChange, shouldApplyRealtimePayload, type LocalSyncStatus } from "../utils/syncConflict";
import { Colors } from "../constants/colors";
import { fetchAccessibleRemoteWalletIds } from "./walletSharingService";

const LAST_SYNC_KEY_PREFIX = "tabungin_last_sync_time";
const LEGACY_LAST_SYNC_KEY = LAST_SYNC_KEY_PREFIX;

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
      "deadline_at",
      "estimated_date",
      "is_completed",
      "reminder_enabled",
      "reminder_time",
      "created_at",
      "updated_at",
      "wallet_id",
      "profile_id",
      "owner_user_id",
      "created_by_user_id",
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
    columns: ["id", "category", "amount", "month", "year", "reminder_enabled", "reminder_time", "created_at", "updated_at", "wallet_id", "profile_id"],
  },
  {
    tableName: "recurring_transactions",
    columns: [
      "id",
      "user_id",
      "wallet_id",
      "category",
      "amount",
      "type",
      "note",
      "frequency",
      "day_of_month",
      "day_of_week",
      "start_date",
      "end_date",
      "next_occurrence",
      "is_active",
      "last_generated_at",
      "reminder_enabled",
      "reminder_offset_minutes",
      "created_at",
      "updated_at",
    ],
  },
  {
    tableName: "app_reminders",
    columns: [
      "id",
      "user_id",
      "title",
      "note",
      "target_screen",
      "target_params",
      "frequency",
      "trigger_at",
      "time_of_day",
      "day_of_week",
      "day_of_month",
      "is_enabled",
      "created_at",
      "updated_at",
    ],
  },
];

// Conflict baseline:
// 1. Baris lokal yang masih dirty (`pending_*`) tidak boleh ditimpa payload realtime.
// 2. Saving contribution harus diperlakukan sebagai transfer wallet -> goal yang konsisten.
// 3. Guest session tidak membuka realtime ataupun remote sync karena `canSync = false`.

const unsupportedRemoteTables = new Set<string>();
const unsupportedRemoteColumns = new Map<string, Set<string>>();
let activeSyncPromise: Promise<void> | null = null;

export function buildLastSyncStorageKey(userId: string) {
  return `${LAST_SYNC_KEY_PREFIX}:${userId}`;
}

async function resolveSyncUserId(preferredUserId?: string | null): Promise<string | null> {
  if (preferredUserId) {
    return preferredUserId;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function getRemoteRowUpdatedAt(table: SyncTable, row: any): number | null {
  const column = table.remoteUpdatedAtColumn ?? "updated_at";
  const value = row?.[column] ?? row?.updated_at ?? row?.created_at;
  return typeof value === "number" ? value : null;
}

async function reconcileSavingGoalAggregates(
  db: Awaited<ReturnType<typeof getInitializedDatabase>>,
  goalIds: string[],
): Promise<void> {
  const uniqueGoalIds = [...new Set(goalIds.filter(Boolean))];
  if (uniqueGoalIds.length === 0) return;

  const placeholders = uniqueGoalIds.map(() => "?").join(",");
  const rows = await db.getAllAsync<{
    id: string;
    target_amount: number;
    current_amount: number;
    is_completed: number;
    sync_status: string | null;
    total_amount: number | null;
  }>(
    `SELECT sg.id,
            sg.target_amount,
            sg.current_amount,
            sg.is_completed,
            sg.sync_status,
            COALESCE(SUM(CASE WHEN sl.sync_status != 'pending_delete' THEN sl.amount ELSE 0 END), 0) AS total_amount
     FROM saving_goals sg
     LEFT JOIN saving_logs sl ON sl.goal_id = sg.id
     WHERE sg.id IN (${placeholders}) AND sg.sync_status != 'pending_delete'
     GROUP BY sg.id, sg.target_amount, sg.current_amount, sg.is_completed, sg.sync_status`,
    uniqueGoalIds,
  );

  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const totalAmount = row.total_amount ?? 0;
      const nextIsCompleted = totalAmount >= row.target_amount ? 1 : 0;
      if (row.current_amount === totalAmount && row.is_completed === nextIsCompleted) {
        continue;
      }

      const syncStatus = row.sync_status === 'pending_create' ? 'pending_create' : 'pending_update';
      await db.runAsync(
        `UPDATE saving_goals
         SET current_amount = ?,
             is_completed = CASE WHEN ? >= target_amount THEN 1 ELSE 0 END,
             sync_status = ?,
             updated_at = ?
         WHERE id = ? AND sync_status != 'pending_delete'`,
        [totalAmount, totalAmount, syncStatus, now, row.id],
      );
    }
  });
}

function isRemoteMissingTableError(error: any) {
  return error?.code === "PGRST205" || String(error?.message || "").includes("schema cache");
}

function extractMissingRemoteColumnName(error: any): string | null {
  const message = String(error?.message || "");
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] ?? null;
}

function getSupportedRemoteColumns(table: SyncTable): string[] {
  const baseColumns = table.remoteColumns ?? table.columns;
  const unsupportedColumns = unsupportedRemoteColumns.get(table.tableName);

  if (!unsupportedColumns || unsupportedColumns.size === 0) {
    return baseColumns;
  }

  return baseColumns.filter((column) => !unsupportedColumns.has(column));
}

function markRemoteColumnUnsupported(tableName: string, columnName: string) {
  const unsupportedColumns = unsupportedRemoteColumns.get(tableName) ?? new Set<string>();
  if (unsupportedColumns.has(columnName)) {
    return;
  }

  unsupportedColumns.add(columnName);
  unsupportedRemoteColumns.set(tableName, unsupportedColumns);
  console.log(`[Sync] Remote column ${tableName}.${columnName} tidak tersedia. Payload akan dikirim tanpa kolom ini.`);
}

function isWalletScopedSyncTable(tableName: string): boolean {
  return [
    "wallets",
    "transactions",
    "wallet_members",
    "saving_goals",
    "wallet_goals_shared",
    "sharing_activity_log",
    "budgets",
  ].includes(tableName);
}

function shouldSkipRemoteTable(table: SyncTable, error: any) {
  if (table.optional && isRemoteMissingTableError(error)) {
    unsupportedRemoteTables.add(table.tableName);
    console.log(`[Sync] Skipping optional remote table ${table.tableName} because it is unavailable in Supabase.`);
    return true;
  }

  return false;
}

async function upsertRemoteRecords(table: SyncTable, records: Record<string, any>[]) {
  let columns = getSupportedRemoteColumns(table);
  let payloads = records.map((record) => {
    const payload: Record<string, any> = {};
    columns.forEach((column) => {
      if (column in record) {
        payload[column] = record[column];
      }
    });
    return payload;
  });

  let result = await supabase.from(table.tableName).upsert(payloads);
  if (!result.error) {
    return result;
  }

  const missingColumn = extractMissingRemoteColumnName(result.error);
  if (missingColumn && payloads.some((payload) => missingColumn in payload)) {
    markRemoteColumnUnsupported(table.tableName, missingColumn);
    columns = getSupportedRemoteColumns(table);
    payloads = records.map((record) => {
      const payload: Record<string, any> = {};
      columns.forEach((column) => {
        if (column in record) {
          payload[column] = record[column];
        }
      });
      return payload;
    });
    result = await supabase.from(table.tableName).upsert(payloads);
  }

  return result;
}

export async function getLastSyncTime(preferredUserId?: string | null): Promise<number> {
  const userId = await resolveSyncUserId(preferredUserId);
  if (!userId) {
    return 0;
  }

  const raw = await AsyncStorage.getItem(buildLastSyncStorageKey(userId));
  return raw ? parseInt(raw, 10) : 0;
}

export async function setLastSyncTime(time: number, preferredUserId?: string | null): Promise<void> {
  const userId = await resolveSyncUserId(preferredUserId);
  if (!userId) {
    return;
  }

  await AsyncStorage.multiSet([
    [buildLastSyncStorageKey(userId), time.toString()],
  ]);
  await AsyncStorage.removeItem(LEGACY_LAST_SYNC_KEY);
}

export async function clearSyncState(preferredUserId?: string | null): Promise<void> {
  const userId = await resolveSyncUserId(preferredUserId);
  const keys = [LEGACY_LAST_SYNC_KEY];

  if (userId) {
    keys.push(buildLastSyncStorageKey(userId));
  }

  await AsyncStorage.multiRemove(keys);
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
  if (table === "budgets") {
    if ("reminder_enabled" in record) record.reminder_enabled = Boolean(record.reminder_enabled);
  }
  if (table === "wallets") {
    if ("is_default" in record) record.is_default = Boolean(record.is_default);
  }
  if (table === "recurring_transactions") {
    if ("is_active" in record) record.is_active = Boolean(record.is_active);
    if ("reminder_enabled" in record) record.reminder_enabled = Boolean(record.reminder_enabled);
    record.reminder_offset_minutes = record.reminder_offset_minutes ?? 60;
  }
  if (table === "app_reminders") {
    if ("is_enabled" in record) record.is_enabled = Boolean(record.is_enabled);
    record.target_params =
      typeof record.target_params === "string" ? record.target_params : JSON.stringify(record.target_params ?? null);
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
        color: Colors.primary,
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
        canonicalProfile?.color || Colors.primary,
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
  const accessibleWalletIds = new Set<string>(
    user.email ? await fetchAccessibleRemoteWalletIds(user.id, user.email) : [],
  );
  
  // CRITICAL: Urutkan tabel agar profiles di-sync duluan
  const orderedTables = SYNC_TABLES.filter(t => t.tableName === 'profiles')
    .concat(SYNC_TABLES.filter(t => t.tableName !== 'profiles'));

  for (const table of orderedTables) {
    if (unsupportedRemoteTables.has(table.tableName)) {
      continue;
    }

    // 1. Handle Pending Create & Update
    let pendingUpserts: any[] = [];

    if (table.tableName === 'profiles') {
      pendingUpserts = await db.getAllAsync<any>(
        `SELECT * FROM profiles WHERE id = ? AND sync_status IN ('pending_create', 'pending_update')`,
        [validProfileId],
      );
    } else {
      pendingUpserts = await db.getAllAsync<any>(
        `SELECT * FROM ${table.tableName} WHERE sync_status IN ('pending_create', 'pending_update')`,
      );
    }

    if (table.tableName !== 'wallets' && table.columns.includes('wallet_id')) {
      const originalCount = pendingUpserts.length;
      pendingUpserts = pendingUpserts.filter((row) => !row.wallet_id || accessibleWalletIds.has(row.wallet_id));
      if (originalCount !== pendingUpserts.length) {
        console.log(`[Sync] Skipping ${originalCount - pendingUpserts.length} ${table.tableName} rows because wallet access is no longer active.`);
      }
    }

    if (pendingUpserts.length > 0) {
      let syncedRows = pendingUpserts;
      let records = pendingUpserts.map((row) => {
        const record = mapRecordToSupabase(table.tableName, row);
        const payload: any = {};

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

        // CRITICAL: Set profile_id untuk wallet yang baru dibuat
        // Jika profile_id tidak valid atau NULL, set NULL saja
        // Supabase akan membuat foreign key NULL jika profile_id tidak valid
        if (table.columns.includes('profile_id')) {
          if (!payload.profile_id && validProfileId) {
            payload.profile_id = validProfileId;
            console.log(`[Sync] Assigning profile_id ${validProfileId} to new wallet`);
          } else if (payload.profile_id === activeProfileId && validProfileId) {
            payload.profile_id = validProfileId;
          }
        }

        return payload;
      });

      if (table.tableName === 'wallet_members') {
        const walletIds = [...new Set(records.map((record) => record.wallet_id).filter(Boolean))];

        if (walletIds.length > 0) {
          const { data: remoteWallets, error: remoteWalletsError } = await supabase
            .from('wallets')
            .select('id')
            .in('id', walletIds);

          if (remoteWalletsError) {
            console.error('[Sync] Failed to validate wallet_members parent wallets:', remoteWalletsError);
            continue;
          }

          const remoteWalletIdSet = new Set((remoteWallets || []).map((wallet: any) => wallet.id));
          records = records.filter((record) => remoteWalletIdSet.has(record.wallet_id));
          syncedRows = syncedRows.filter((row) => remoteWalletIdSet.has(row.wallet_id));

          if (records.length === 0) {
            console.log('[Sync] Skipping wallet_members push because parent wallets are not available in Supabase yet.');
            continue;
          }
        }
      }

      const { error } = await upsertRemoteRecords(table, records);

      if (!error) {
        const placeholders = syncedRows.map(() => "?").join(",");
        const ids = syncedRows.map((r) => r.id);

        if (ids.length > 0) {
          await db.runAsync(
            `UPDATE ${table.tableName} SET sync_status = 'synced' WHERE id IN (${placeholders})`,
            ids,
          );
        }

        if (table.tableName === 'wallets') {
          syncedRows.forEach((row) => {
            if (row.id) {
              accessibleWalletIds.add(row.id);
            }
          });
          await ensureWalletOwnerMembership(syncedRows, user.email || '', validProfileId);
        }
      } else {
        if (shouldSkipRemoteTable(table, error)) {
          continue;
        }

        if (String(error.message || "").includes('row-level security policy') && syncedRows.length > 1) {
          const syncedIds: string[] = [];

          for (let index = 0; index < records.length; index++) {
            const record = records[index];
            const sourceRow = syncedRows[index];
            const singleResult = await upsertRemoteRecords(table, [record]);

            if (!singleResult.error) {
              syncedIds.push(sourceRow.id);
              continue;
            }

            if (
              table.tableName === 'budgets' &&
              sourceRow?.id &&
              String(singleResult.error.message || "").includes('row-level security policy') &&
              sourceRow.profile_id &&
              activeProfileId &&
              sourceRow.profile_id !== activeProfileId
            ) {
              await db.runAsync(
                `UPDATE budgets SET sync_status = 'synced' WHERE id = ?`,
                [sourceRow.id],
              );
              console.log(`[Sync] Mengabaikan budget ${sourceRow.id} di luar profil aktif agar tidak terus gagal sync.`);
              continue;
            }

            console.error(`Failed to push ${table.tableName} row ${sourceRow?.id ?? 'unknown'}:`, singleResult.error.message);
          }

          if (syncedIds.length > 0) {
            await db.runAsync(
              `UPDATE ${table.tableName} SET sync_status = 'synced' WHERE id IN (${syncedIds.map(() => "?").join(",")})`,
              syncedIds,
            );
          }

          continue;
        }

        console.error(`Failed to push ${table.tableName}:`, error.message);
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
    record.deadline_at = record.deadline_at ?? record.estimated_date ?? Date.now();
  }
  if (table === "budgets") {
    if ("reminder_enabled" in record) record.reminder_enabled = record.reminder_enabled ? 1 : 0;
  }
  if (table === "recurring_transactions") {
    if ("is_active" in record) record.is_active = record.is_active ? 1 : 0;
    if ("reminder_enabled" in record) record.reminder_enabled = record.reminder_enabled ? 1 : 0;
    record.reminder_offset_minutes = record.reminder_offset_minutes ?? 60;
  }
  if (table === "app_reminders") {
    if ("is_enabled" in record) record.is_enabled = record.is_enabled ? 1 : 0;
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
async function reconcileRemoteDeletesForTable(
  db: Awaited<ReturnType<typeof getInitializedDatabase>>,
  table: SyncTable,
): Promise<void> {
  const { data, error } = await supabase.from(table.tableName).select("id");

  if (error) {
    if (shouldSkipRemoteTable(table, error)) {
      return;
    }
    throw error;
  }

  const remoteIds = new Set((data ?? []).map((row: any) => row.id));
  const localRows = await db.getAllAsync<{ id: string; goal_id?: string }>(
    `SELECT id${table.tableName === "saving_logs" ? ", goal_id" : ""} FROM ${table.tableName} WHERE sync_status = 'synced'`,
  );
  const staleRows = localRows.filter((row) => !remoteIds.has(row.id));

  if (staleRows.length === 0) {
    return;
  }

  const staleIds = staleRows.map((row) => row.id);
  await db.runAsync(
    `DELETE FROM ${table.tableName} WHERE id IN (${staleIds.map(() => "?").join(",")})`,
    staleIds,
  );

  if (table.tableName === "saving_logs") {
    const affectedGoalIds = staleRows.map((row) => row.goal_id).filter(Boolean) as string[];
    await reconcileSavingGoalAggregates(db, affectedGoalIds);
  }
}

async function pullChanges(options?: { forceFullPull?: boolean }) {
  const db = await getInitializedDatabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return;
  }

  const rawLastSync = options?.forceFullPull ? 0 : await getLastSyncTime();
  // Pastikan lastSync adalah angka valid (bukan string atau NaN)
  const lastSync = Number(rawLastSync) || 0;
  let maxUpdatedAt = lastSync;
  const savingGoalIdsNeedingReconcile = new Set<string>();
  const accessibleWalletIds = new Set<string>(
    user.email ? await fetchAccessibleRemoteWalletIds(user.id, user.email) : [],
  );

  for (const table of SYNC_TABLES) {
    if (unsupportedRemoteTables.has(table.tableName)) {
      continue;
    }

    try {
      const remoteUpdatedAtColumn = table.remoteUpdatedAtColumn ?? "updated_at";
      let query = supabase.from(table.tableName).select("*");
      if (table.tableName === "profiles") {
        query = query.eq("user_id", user.id);
      } else if (table.tableName === "wallets") {
        if (accessibleWalletIds.size === 0) {
          await reconcileRemoteDeletesForTable(db, table);
          continue;
        }
        query = query.in("id", [...accessibleWalletIds]);
      } else if (isWalletScopedSyncTable(table.tableName)) {
        if (accessibleWalletIds.size === 0) {
          await reconcileRemoteDeletesForTable(db, table);
          continue;
        }
        query = query.in("wallet_id", [...accessibleWalletIds]);
      }

      const { data, error } =
        options?.forceFullPull || lastSync === 0
          ? await query
          : await query.gt(remoteUpdatedAtColumn, lastSync); // Ambil yang berubah sejak sync terakhir

      if (error) {
        if (shouldSkipRemoteTable(table, error)) {
          continue;
        }
        console.error(`Failed to pull ${table.tableName}:`, error);
        continue;
      }

      let scopedData = data ?? [];
      if (table.tableName === "saving_logs" && scopedData.length > 0) {
        const goalIds = [...new Set(scopedData.map((row: any) => row.goal_id).filter(Boolean))] as string[];
        if (goalIds.length > 0) {
          const accessibleGoals = await db.getAllAsync<{ id: string }>(
            `SELECT id FROM saving_goals WHERE id IN (${goalIds.map(() => "?").join(",")}) AND sync_status != 'pending_delete'`,
            goalIds,
          );
          const accessibleGoalIds = new Set(accessibleGoals.map((goal) => goal.id));
          scopedData = scopedData.filter((row: any) => accessibleGoalIds.has(row.goal_id));
        }
      }

      if (scopedData.length === 0) {
        await reconcileRemoteDeletesForTable(db, table);
        continue;
      }

      // [SELF-HEALING] Pastikan foreign key parent (wallet_id) ada di lokal sebelum insert
      // Karena shared wallet mungkin tidak ter-pull jika 'updated_at' nya lebih tua dari lastSync
      if (['transactions', 'saving_goals', 'budgets'].includes(table.tableName)) {
        const walletIds = [...new Set(scopedData.map((r: any) => r.wallet_id).filter(Boolean))] as string[];
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
        for (const row of scopedData) {
          const existing = await db.getFirstAsync<{ sync_status: LocalSyncStatus; updated_at: number | null }>(
            `SELECT sync_status, updated_at FROM ${table.tableName} WHERE id = ?`,
            [row.id],
          );
          const remoteUpdatedAt = getRemoteRowUpdatedAt(table, row);
          if (
            !shouldApplyRemoteChange({
              tableName: table.tableName,
              localSyncStatus: existing?.sync_status,
              eventType: 'UPDATE',
              localUpdatedAt: existing?.updated_at ?? null,
              remoteUpdatedAt,
            })
          ) {
            continue;
          }

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

          if (table.tableName === 'saving_logs' && localRow.goal_id) {
            savingGoalIdsNeedingReconcile.add(localRow.goal_id);
          }

          if (table.tableName === 'saving_goals' && localRow.id) {
            savingGoalIdsNeedingReconcile.add(localRow.id);
          }

          // Track max updated_at
          const syncMarker = row.updated_at ?? row[remoteUpdatedAtColumn] ?? row.created_at;
          if (syncMarker && syncMarker > maxUpdatedAt) {
            maxUpdatedAt = syncMarker;
          }
        }
      });

      await reconcileRemoteDeletesForTable(db, table);
    } catch (e) {
      console.error(`Error processing pull for ${table.tableName}:`, e);
    }
  }

  // Update last sync time only if we successfully pulled newer data
  if (maxUpdatedAt > lastSync) {
    await setLastSyncTime(maxUpdatedAt);
  }

  await reconcileSavingGoalAggregates(db, [...savingGoalIdsNeedingReconcile]);
}

/**
 * Fungsi utama Sync
 */
export async function syncDatabase(options?: { forceFullPull?: boolean }) {
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
        await pullChanges(options);
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
      const existing = await db.getFirstAsync<{ sync_status: LocalSyncStatus; updated_at: number | null }>(
        `SELECT sync_status, updated_at FROM ${tableName} WHERE id = ?`,
        [row.id]
      );
      const remoteUpdatedAt = getRemoteRowUpdatedAt(tableDef, row);
      if (!shouldApplyRealtimePayload(
        tableName,
        existing?.sync_status as LocalSyncStatus,
        payload.eventType,
        existing?.updated_at ?? null,
        remoteUpdatedAt,
      )) {
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
      if (tableName === 'saving_logs' && localRow.goal_id) {
        await reconcileSavingGoalAggregates(db, [localRow.goal_id]);
      }
      if (tableName === 'saving_goals' && localRow.id) {
        await reconcileSavingGoalAggregates(db, [localRow.id]);
      }
      return true;

    } else if (payload.eventType === 'DELETE') {
      const row = payload.old;
      if (!row || !row.id) return false;

      const existing = await db.getFirstAsync<{ sync_status: LocalSyncStatus; updated_at: number | null; goal_id?: string }>(
        `SELECT sync_status, updated_at${tableName === 'saving_logs' ? ', goal_id' : ''} FROM ${tableName} WHERE id = ?`,
        [row.id]
      );
      if (!shouldApplyRealtimePayload(
        tableName,
        existing?.sync_status as LocalSyncStatus,
        payload.eventType,
        existing?.updated_at ?? null,
        getRemoteRowUpdatedAt(tableDef, row),
      )) {
        return false;
      }

      await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [row.id]);
      if (tableName === 'saving_logs' && existing?.goal_id) {
        await reconcileSavingGoalAggregates(db, [existing.goal_id]);
      }
      return true;
    }
  } catch (e) {
    console.error(`[Realtime] Error handling payload for ${tableName}:`, e);
  }
  return false;
}

