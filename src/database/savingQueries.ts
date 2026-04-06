// Query database untuk tabel saving_goals dan saving_logs
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import type { SavingGoal, SavingLog } from '../types/saving';
import type { GoalSharingActivity, GoalSharingMember } from '../types/saving';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/** Row mentah dari SQLite — boolean disimpan sebagai 0/1 */
interface RawGoalRow extends Omit<SavingGoal, 'is_completed' | 'reminder_enabled'> {
    is_completed: number;
    reminder_enabled: number;
}

function mapGoalRow(r: RawGoalRow): SavingGoal {
    return { ...r, is_completed: Boolean(r.is_completed), reminder_enabled: Boolean(r.reminder_enabled) };
}

export async function getCurrentSharingActorId(): Promise<string> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
        throw new Error('Authenticated user not found');
    }

    return user.id;
}

async function getCurrentSharingActorContext(): Promise<{ id: string | null; email: string | null }> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return {
        id: user?.id ?? null,
        email: user?.email?.toLowerCase() ?? null,
    };
}

function mapWalletRoleToPermission(role: 'owner' | 'editor' | 'viewer'): GoalSharingMember['permission_level'] {
    return role === 'viewer' ? 'read_only' : 'read_write';
}

async function insertLocalSharingActivity(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    activity: Omit<GoalSharingActivity, 'sync_status'>
): Promise<void> {
    await db.runAsync(
        `INSERT OR REPLACE INTO sharing_activity_log
         (id, goal_id, wallet_id, user_email, action, performed_by, metadata, timestamp, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
        [
            activity.id,
            activity.goal_id,
            activity.wallet_id,
            activity.user_email,
            activity.action,
            activity.performed_by,
            activity.metadata,
            activity.timestamp,
            activity.created_at,
            activity.updated_at,
        ],
    );
}

async function ensureGoalSharedWithWalletMembers(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    goal: Pick<SavingGoal, 'id' | 'wallet_id' | 'created_at' | 'updated_at'>,
    actorEmail: string | null,
): Promise<void> {
    if (!goal.wallet_id) return;
    const walletId = goal.wallet_id;

    const members = await db.getAllAsync<{
        user_email: string;
        role: 'owner' | 'editor' | 'viewer';
        status: string;
    }>(
        `SELECT user_email, role, status
         FROM wallet_members
         WHERE wallet_id = ? AND sync_status != 'pending_delete'`,
        [goal.wallet_id],
    );

    const activeMembers = members.filter((member) => member.status === 'active');
    const timestamp = goal.updated_at ?? goal.created_at ?? Date.now();

    for (const member of activeMembers) {
        const normalizedEmail = member.user_email.toLowerCase();
        if (actorEmail && normalizedEmail === actorEmail) {
            continue;
        }

        const existingShare = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM wallet_goals_shared
             WHERE goal_id = ? AND lower(user_email) = lower(?)`,
            [goal.id, normalizedEmail],
        );

        if (existingShare) {
            continue;
        }

        await db.runAsync(
            `INSERT INTO wallet_goals_shared
             (id, goal_id, wallet_id, user_email, shared_by, shared_at, created_at, updated_at, permission_level, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
            [
                uuidv4(),
                goal.id,
                walletId,
                normalizedEmail,
                actorEmail || 'system',
                timestamp,
                timestamp,
                timestamp,
                mapWalletRoleToPermission(member.role),
            ],
        );
    }
}

/**
 * Ambil semua saving goals
 * Filter out pending_delete
 */
export async function fetchSavingGoals(
    filter?: 'active' | 'completed' | 'all',
    profileId?: string,
    userEmail?: string,
): Promise<SavingGoal[]> {
    const db = await getInitializedDatabase();
    let query = "SELECT * FROM saving_goals WHERE sync_status != 'pending_delete'";
    const params: (string | number)[] = [];

    if (profileId && userEmail) {
        query += ` AND (
            profile_id = ?
            OR wallet_id IN (
                SELECT id
                FROM wallets
                WHERE sync_status != 'pending_delete'
                  AND (
                    profile_id = ?
                    OR id IN (
                        SELECT wallet_id
                        FROM wallet_members
                        WHERE lower(user_email) = lower(?)
                          AND sync_status != 'pending_delete'
                    )
                  )
            )
            OR id IN (
                SELECT goal_id
                FROM wallet_goals_shared
                WHERE lower(user_email) = lower(?)
            )
        )`;
        params.push(profileId, profileId, userEmail, userEmail);
    } else if (profileId) {
        query += " AND profile_id = ?";
        params.push(profileId);
    }

    if (filter === 'active') {
        query += ' AND is_completed = 0';
    } else if (filter === 'completed') {
        query += ' AND is_completed = 1';
    }

    query += ' ORDER BY created_at DESC';
    const rows = await db.getAllAsync<RawGoalRow>(query, params);
    return rows.map(mapGoalRow);
}

/**
 * Ambil satu saving goal berdasarkan ID
 */
export async function fetchSavingGoalById(id: string): Promise<SavingGoal | null> {
    const db = await getInitializedDatabase();
    const row = await db.getFirstAsync<RawGoalRow>(
        "SELECT * FROM saving_goals WHERE id = ? AND sync_status != 'pending_delete'",
        [id]
    );
    if (!row) return null;
    return mapGoalRow(row);
}


/**
 * Tambah saving goal baru
 */
export async function insertSavingGoal(
    data: Omit<SavingGoal, 'id' | 'created_at'>
): Promise<SavingGoal> {
    const db = await getInitializedDatabase();
    const id = uuidv4();
    const created_at = Date.now();
    const updated_at = created_at;
    const sync_status = 'pending_create';
    const actor = await getCurrentSharingActorContext();
    const ownerUserId = actor.id;
    const createdByUserId = actor.id;

    await db.runAsync(
        `INSERT INTO saving_goals
     (id, name, target_amount, current_amount, emoji, photo_uri, saving_per_period, period_type,
      color, start_date, estimated_date, is_completed, reminder_enabled, reminder_time, created_at, updated_at, sync_status, wallet_id, profile_id, owner_user_id, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, data.name, data.target_amount, data.current_amount, data.emoji,
            data.photo_uri || null, data.saving_per_period, data.period_type,
            data.color, data.start_date, data.estimated_date,
            data.is_completed ? 1 : 0, data.reminder_enabled ? 1 : 0,
            data.reminder_time || null, created_at, updated_at, sync_status,
            data.wallet_id || null, data.profile_id || null, ownerUserId, createdByUserId
        ]
    );

    await ensureGoalSharedWithWalletMembers(
        db,
        {
            id,
            wallet_id: data.wallet_id,
            created_at,
            updated_at,
        },
        actor.email,
    );

    if (data.wallet_id) {
        await insertLocalSharingActivity(db, {
            id: uuidv4(),
            goal_id: id,
            wallet_id: data.wallet_id,
            user_email: actor.email || '',
            action: 'goal_created',
            performed_by: actor.id || actor.email || 'system',
            metadata: JSON.stringify({ source: 'shared_wallet_goal_create' }),
            timestamp: created_at,
            created_at,
            updated_at,
        });
    }

    return { id, created_at, ...data, owner_user_id: ownerUserId, created_by_user_id: createdByUserId };
}

/**
 * Update saving goal
 * Hanya kolom pada whitelist yang boleh diupdate (mencegah SQL injection via field names)
 */
const GOAL_UPDATABLE_FIELDS: ReadonlySet<string> = new Set([
    'name', 'target_amount', 'current_amount', 'emoji', 'photo_uri',
    'saving_per_period', 'period_type', 'color', 'start_date', 'estimated_date',
    'is_completed', 'reminder_enabled', 'reminder_time', 'wallet_id', 'profile_id',
]);

export async function updateSavingGoal(
    id: string,
    data: Partial<Omit<SavingGoal, 'id' | 'created_at'>>
): Promise<void> {
    const db = await getInitializedDatabase();
    const mapped: Record<string, string | number | null> = {};

    for (const [key, value] of Object.entries(data)) {
        if (!GOAL_UPDATABLE_FIELDS.has(key)) continue; // skip kolom tidak dikenal
        if (key === 'is_completed' || key === 'reminder_enabled') {
            mapped[key] = value ? 1 : 0;
        } else {
            mapped[key] = value as string | number | null;
        }
    }

    if (Object.keys(mapped).length === 0) return;
    
    // Tambah sync update
    const fields = Object.keys(mapped).map((k) => `${k} = ?`).join(', ') + ", sync_status = 'pending_update', updated_at = ?";
    const values = [...Object.values(mapped), Date.now(), id];
    
    await db.runAsync(`UPDATE saving_goals SET ${fields} WHERE id = ?`, values);

    const actor = await getCurrentSharingActorContext();
    const updatedGoal = await fetchSavingGoalById(id);
    if (updatedGoal?.wallet_id) {
        await ensureGoalSharedWithWalletMembers(
            db,
            {
                id: updatedGoal.id,
                wallet_id: updatedGoal.wallet_id,
                created_at: updatedGoal.created_at,
                updated_at: Date.now(),
            },
            actor.email,
        );
    }
}

/**
 * Hapus saving goal (cascade menghapus logs juga)
 * Gunakan soft delete pending_delete
 */
export async function deleteSavingGoal(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    
    const row = await db.getFirstAsync<{ sync_status: string }>('SELECT sync_status FROM saving_goals WHERE id = ?', [id]);
    
    if (row?.sync_status === 'pending_create') {
         await db.runAsync('DELETE FROM saving_goals WHERE id = ?', [id]);
    } else {
         await db.runAsync(
            "UPDATE saving_goals SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
            [Date.now(), id]
        );
        // Tandai logs terkait juga untuk dihapus
        await db.runAsync(
             "UPDATE saving_logs SET sync_status = 'pending_delete', updated_at = ? WHERE goal_id = ?",
             [Date.now(), id]
        );
    }
}

/**
 * Ambil semua log tabungan untuk goal tertentu
 */
export async function fetchSavingLogs(goalId: string): Promise<SavingLog[]> {
    const db = await getInitializedDatabase();
    return await db.getAllAsync<SavingLog>(
        "SELECT * FROM saving_logs WHERE goal_id = ? AND sync_status != 'pending_delete' ORDER BY date DESC",
        [goalId]
    );
}

/**
 * Tambah log tabungan dan update current_amount pada goal.
 * Seluruh operasi dijalankan dalam satu SQLite transaction (atomic).
 */
export async function setGoalPermission(goalId: string, userEmail: string, permissionLevel: string): Promise<void> {
    const userEmailLower = userEmail.toLowerCase();
    const actorId = await getCurrentSharingActorId();

    const { error } = await supabase.rpc('set_goal_permission', {
        p_goal_id: goalId,
        p_user_email: userEmailLower,
        p_permission_level: permissionLevel,
        p_performed_by: actorId,
    });

    if (error) throw error;
}

export async function revokeGoalSharing(goalId: string, userEmail: string): Promise<void> {
    const userEmailLower = userEmail.toLowerCase();
    const actorId = await getCurrentSharingActorId();

    const { error } = await supabase.rpc('revoke_goal_sharing', {
        p_goal_id: goalId,
        p_user_email: userEmailLower,
        p_performed_by: actorId,
    });

    if (error) throw error;
}

export async function getGoalSharingStatus(goalId: string): Promise<GoalSharingMember[]> {
    const { data, error } = await supabase.rpc('get_goal_sharing_status', {
        p_goal_id: goalId,
    });

    if (error) throw error;
    return data || [];
}

export async function getSharingActivityLog(goalId: string): Promise<GoalSharingActivity[]> {
    const { data, error } = await supabase
        .from('sharing_activity_log')
        .select('*')
        .eq('goal_id', goalId)
        .order('timestamp', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function insertSavingLog(
    data: Omit<SavingLog, 'id' | 'created_at'>
): Promise<SavingLog> {
    const db = await getInitializedDatabase();
    const id = uuidv4();
    const created_at = Date.now();
    const updated_at = created_at;
    let goalWalletId: string | null = null;

    // Lakukan INSERT + UPDATE dalam satu transaction agar atomic
    await db.withTransactionAsync(async () => {
        await db.runAsync(
            'INSERT INTO saving_logs (id, goal_id, amount, note, date, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, data.goal_id, data.amount, data.note || null, data.date, created_at, updated_at, 'pending_create']
        );
        
        // Update goal amount & trigger sync update
        await db.runAsync(
            "UPDATE saving_goals SET current_amount = current_amount + ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?",
            [data.amount, updated_at, data.goal_id]
        );
        
        // Tandai goal selesai jika current_amount >= target_amount
        await db.runAsync(
            `UPDATE saving_goals SET is_completed = 1, sync_status = 'pending_update', updated_at = ?
             WHERE id = ? AND is_completed = 0 AND current_amount >= target_amount`,
            [updated_at, data.goal_id]
        );

        const goal = await db.getFirstAsync<{ wallet_id: string | null }>(
            'SELECT wallet_id FROM saving_goals WHERE id = ?',
            [data.goal_id],
        );
        goalWalletId = goal?.wallet_id ?? null;
    });

    if (goalWalletId) {
        const actor = await getCurrentSharingActorContext();
        await insertLocalSharingActivity(db, {
            id: uuidv4(),
            goal_id: data.goal_id,
            wallet_id: goalWalletId,
            user_email: actor.email || '',
            action: 'contribution_added',
            performed_by: actor.id || actor.email || 'system',
            metadata: JSON.stringify({ amount: data.amount, note: data.note || null }),
            timestamp: data.date,
            created_at,
            updated_at,
        });
    }

    return { id, created_at, ...data };
}

