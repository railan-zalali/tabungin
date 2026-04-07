// Query database untuk tabel saving_goals dan saving_logs
import { getInitializedDatabase } from './schema';
import { supabase } from '../lib/supabase';
import type { SavingGoal, SavingLog } from '../types/saving';
import type { GoalSharingActivity, GoalSharingMember } from '../types/saving';
import { applySavingContribution, removeSavingContribution, updateSavingContributionAmount } from '../utils/savingContribution';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

/** Row mentah dari SQLite — boolean disimpan sebagai 0/1 */
interface RawGoalRow extends Omit<SavingGoal, 'is_completed' | 'reminder_enabled'> {
    is_completed: number;
    reminder_enabled: number;
}

function mapGoalRow(r: RawGoalRow): SavingGoal {
    return {
        ...r,
        deadline_at: r.deadline_at ?? r.estimated_date,
        is_completed: Boolean(r.is_completed),
        reminder_enabled: Boolean(r.reminder_enabled),
    };
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

const PENDING_UPDATE_EXPRESSION = "CASE WHEN sync_status = 'pending_create' THEN 'pending_create' ELSE 'pending_update' END";

async function refreshGoalAggregateState(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    goalId: string,
    nextCurrentAmount: number,
    updatedAt: number,
): Promise<void> {
    await db.runAsync(
        `UPDATE saving_goals
         SET current_amount = ?,
             is_completed = CASE WHEN ? >= target_amount THEN 1 ELSE 0 END,
             sync_status = ${PENDING_UPDATE_EXPRESSION},
             updated_at = ?
         WHERE id = ?`,
        [nextCurrentAmount, nextCurrentAmount, updatedAt, goalId],
    );
}

async function updateWalletBalanceState(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    walletId: string,
    nextWalletBalance: number,
    updatedAt: number,
): Promise<void> {
    await db.runAsync(
        `UPDATE wallets
         SET balance = ?,
             sync_status = ${PENDING_UPDATE_EXPRESSION},
             updated_at = ?
         WHERE id = ?`,
        [nextWalletBalance, updatedAt, walletId],
    );
}

async function appendContributionActivity(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    goalId: string,
    walletId: string | null,
    action: GoalSharingActivity['action'],
    metadata: Record<string, unknown>,
    timestamp: number,
): Promise<void> {
    if (!walletId) return;

    const actor = await getCurrentSharingActorContext();
    await insertLocalSharingActivity(db, {
        id: uuidv4(),
        goal_id: goalId,
        wallet_id: walletId,
        user_email: actor.email || '',
        action,
        performed_by: actor.id || actor.email || 'system',
        metadata: JSON.stringify(metadata),
        timestamp,
        created_at: timestamp,
        updated_at: timestamp,
    });
}

async function ensureGoalSharedWithWalletMembers(
    db: Awaited<ReturnType<typeof getInitializedDatabase>>,
    goal: Pick<SavingGoal, 'id' | 'wallet_id' | 'created_at' | 'updated_at'>,
    actorEmail: string | null,
): Promise<void> {
    if (!goal.wallet_id) {
        await db.runAsync('DELETE FROM wallet_goals_shared WHERE goal_id = ?', [goal.id]);
        return;
    }
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
    const targetEmails = new Set<string>();

    for (const member of activeMembers) {
        const normalizedEmail = member.user_email.toLowerCase();
        if (actorEmail && normalizedEmail === actorEmail) {
            continue;
        }

        targetEmails.add(normalizedEmail);

        const existingShare = await db.getFirstAsync<{ id: string }>(
            `SELECT id FROM wallet_goals_shared
             WHERE goal_id = ? AND lower(user_email) = lower(?)`,
            [goal.id, normalizedEmail],
        );

        if (existingShare) {
            await db.runAsync(
                `UPDATE wallet_goals_shared
                 SET permission_level = ?,
                     wallet_id = ?,
                     updated_at = ?,
                     sync_status = ${PENDING_UPDATE_EXPRESSION}
                 WHERE id = ?`,
                [
                    mapWalletRoleToPermission(member.role),
                    walletId,
                    timestamp,
                    existingShare.id,
                ],
            );
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

    if (targetEmails.size === 0) {
        await db.runAsync('DELETE FROM wallet_goals_shared WHERE goal_id = ? AND wallet_id = ?', [goal.id, walletId]);
        return;
    }

    const targetEmailList = [...targetEmails];
    const placeholders = targetEmailList.map(() => '?').join(', ');
    await db.runAsync(
        `DELETE FROM wallet_goals_shared
         WHERE goal_id = ?
           AND wallet_id = ?
           AND lower(user_email) NOT IN (${placeholders})`,
        [goal.id, walletId, ...targetEmailList],
    );
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
                          AND COALESCE(status, 'active') = 'active'
                    )
                )
            )
            OR id IN (
                SELECT wgs.goal_id
                FROM wallet_goals_shared wgs
                WHERE lower(wgs.user_email) = lower(?)
                  AND wgs.sync_status != 'pending_delete'
                  AND EXISTS (
                    SELECT 1
                    FROM wallet_members wm
                    WHERE wm.wallet_id = wgs.wallet_id
                      AND lower(wm.user_email) = lower(?)
                      AND wm.sync_status != 'pending_delete'
                      AND COALESCE(wm.status, 'active') = 'active'
                  )
            )
        )`;
        params.push(profileId, profileId, userEmail, userEmail, userEmail);
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
    const initialContributionAmount = data.wallet_id ? Math.max(0, data.current_amount ?? 0) : 0;
    const initialCurrentAmount = data.wallet_id ? 0 : Math.max(0, data.current_amount ?? 0);

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            `INSERT INTO saving_goals
         (id, name, target_amount, current_amount, emoji, photo_uri, saving_per_period, period_type,
          color, start_date, deadline_at, estimated_date, is_completed, reminder_enabled, reminder_time, created_at, updated_at, sync_status, wallet_id, profile_id, owner_user_id, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, data.name, data.target_amount, initialCurrentAmount, data.emoji,
                data.photo_uri || null, data.saving_per_period, data.period_type,
                data.color, data.start_date, data.deadline_at, data.estimated_date,
                initialCurrentAmount >= data.target_amount && data.target_amount > 0 ? 1 : 0, data.reminder_enabled ? 1 : 0,
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

        if (data.wallet_id && initialContributionAmount > 0) {
            const wallet = await db.getFirstAsync<{ balance: number }>(
                'SELECT balance FROM wallets WHERE id = ? AND sync_status != ?',
                [data.wallet_id, 'pending_delete'],
            );

            if (!wallet) {
                throw new Error('Dompet untuk target ini tidak ditemukan.');
            }

            const nextState = applySavingContribution(
                {
                    walletBalance: wallet.balance ?? 0,
                    goalCurrentAmount: 0,
                    goalTargetAmount: data.target_amount,
                },
                initialContributionAmount,
            );

            await db.runAsync(
                'INSERT INTO saving_logs (id, goal_id, amount, note, date, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [uuidv4(), id, initialContributionAmount, 'Kontribusi awal', created_at, created_at, created_at, 'pending_create'],
            );

            await updateWalletBalanceState(db, data.wallet_id, nextState.nextWalletBalance, created_at);
            await refreshGoalAggregateState(db, id, nextState.nextGoalCurrentAmount, created_at);
        }
    });

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

        if (initialContributionAmount > 0) {
            await appendContributionActivity(
                db,
                id,
                data.wallet_id,
                'contribution_added',
                { amount: initialContributionAmount, note: 'Kontribusi awal' },
                created_at,
            );
        }
    }

    return {
        id,
        created_at,
        ...data,
        current_amount: data.wallet_id ? initialContributionAmount : initialCurrentAmount,
        is_completed: (data.wallet_id ? initialContributionAmount : initialCurrentAmount) >= data.target_amount && data.target_amount > 0,
        owner_user_id: ownerUserId,
        created_by_user_id: createdByUserId,
    };
}

/**
 * Update saving goal
 * Hanya kolom pada whitelist yang boleh diupdate (mencegah SQL injection via field names)
 */
const GOAL_UPDATABLE_FIELDS: ReadonlySet<string> = new Set([
    'name', 'target_amount', 'emoji', 'photo_uri',
    'saving_per_period', 'period_type', 'color', 'start_date', 'deadline_at', 'estimated_date',
    'is_completed', 'reminder_enabled', 'reminder_time', 'wallet_id', 'profile_id',
]);

export async function updateSavingGoal(
    id: string,
    data: Partial<Omit<SavingGoal, 'id' | 'created_at'>>
): Promise<void> {
    const db = await getInitializedDatabase();
    const currentGoal = await db.getFirstAsync<{ wallet_id: string | null }>(
        'SELECT wallet_id FROM saving_goals WHERE id = ?',
        [id],
    );
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
    const fields = Object.keys(mapped).map((k) => `${k} = ?`).join(', ') + `, sync_status = ${PENDING_UPDATE_EXPRESSION}, updated_at = ?`;
    const values = [...Object.values(mapped), Date.now(), id];
    
    await db.runAsync(`UPDATE saving_goals SET ${fields} WHERE id = ?`, values);

    const actor = await getCurrentSharingActorContext();
    const updatedGoal = await fetchSavingGoalById(id);
    await ensureGoalSharedWithWalletMembers(
        db,
        {
            id,
            wallet_id: updatedGoal?.wallet_id ?? undefined,
            created_at: updatedGoal?.created_at ?? Date.now(),
            updated_at: Date.now(),
        },
        actor.email,
    );

    if (currentGoal?.wallet_id && currentGoal.wallet_id !== updatedGoal?.wallet_id) {
        await db.runAsync('DELETE FROM wallet_goals_shared WHERE goal_id = ? AND wallet_id = ?', [id, currentGoal.wallet_id]);
    }
}

/**
 * Hapus saving goal (cascade menghapus logs juga)
 * Gunakan soft delete pending_delete
 */
export async function deleteSavingGoal(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    const updatedAt = Date.now();
    let refundedAmount = 0;
    let walletId: string | null = null;

    await db.withTransactionAsync(async () => {
        const row = await db.getFirstAsync<{
            sync_status: string;
            wallet_id: string | null;
            current_amount: number;
        }>('SELECT sync_status, wallet_id, current_amount FROM saving_goals WHERE id = ?', [id]);

        if (!row) {
            throw new Error('Target tabungan tidak ditemukan.');
        }

        refundedAmount = Math.max(row.current_amount ?? 0, 0);
        walletId = row.wallet_id ?? null;

        if (walletId && refundedAmount > 0) {
            const wallet = await db.getFirstAsync<{ balance: number }>(
                'SELECT balance FROM wallets WHERE id = ? AND sync_status != ?',
                [walletId, 'pending_delete'],
            );

            if (wallet) {
                await updateWalletBalanceState(db, walletId, (wallet.balance ?? 0) + refundedAmount, updatedAt);
            }
        }

        if (row.sync_status === 'pending_create') {
            await db.runAsync('DELETE FROM saving_logs WHERE goal_id = ?', [id]);
            await db.runAsync('DELETE FROM saving_goals WHERE id = ?', [id]);
        } else {
            await db.runAsync(
                "UPDATE saving_goals SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
                [updatedAt, id]
            );
            await db.runAsync(
                "UPDATE saving_logs SET sync_status = 'pending_delete', updated_at = ? WHERE goal_id = ?",
                [updatedAt, id]
            );
        }
    });

    if (walletId && refundedAmount > 0) {
        await appendContributionActivity(
            db,
            id,
            walletId,
            'contribution_removed',
            { amount: refundedAmount, source: 'goal_deleted' },
            updatedAt,
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

    // Lakukan transfer wallet -> saving goal dalam satu transaction agar atomic
    await db.withTransactionAsync(async () => {
        const goal = await db.getFirstAsync<{
            wallet_id: string | null;
            current_amount: number;
            target_amount: number;
        }>(
            'SELECT wallet_id, current_amount, target_amount FROM saving_goals WHERE id = ? AND sync_status != ?',
            [data.goal_id, 'pending_delete'],
        );

        if (!goal) {
            throw new Error('Target tabungan tidak ditemukan.');
        }

        if (!goal.wallet_id) {
            throw new Error('Target ini belum terhubung ke dompet. Hubungkan target ke dompet sebelum menambah tabungan.');
        }

        const wallet = await db.getFirstAsync<{
            id: string;
            balance: number;
        }>(
            'SELECT id, balance FROM wallets WHERE id = ? AND sync_status != ?',
            [goal.wallet_id, 'pending_delete'],
        );

        if (!wallet) {
            throw new Error('Dompet untuk target ini tidak ditemukan.');
        }

        const nextState = applySavingContribution(
            {
                walletBalance: wallet.balance ?? 0,
                goalCurrentAmount: goal.current_amount ?? 0,
                goalTargetAmount: goal.target_amount ?? 0,
            },
            data.amount,
        );

        await db.runAsync(
            'INSERT INTO saving_logs (id, goal_id, amount, note, date, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, data.goal_id, data.amount, data.note || null, data.date, created_at, updated_at, 'pending_create']
        );

        await updateWalletBalanceState(db, goal.wallet_id, nextState.nextWalletBalance, updated_at);
        await refreshGoalAggregateState(db, data.goal_id, nextState.nextGoalCurrentAmount, updated_at);

        goalWalletId = goal?.wallet_id ?? null;
    });

    await appendContributionActivity(db, data.goal_id, goalWalletId, 'contribution_added', { amount: data.amount, note: data.note || null }, created_at);

    return { id, created_at, updated_at, sync_status: 'pending_create', ...data };
}

export async function updateSavingLog(
    id: string,
    data: Partial<Pick<SavingLog, 'amount' | 'note' | 'date'>>,
): Promise<SavingLog> {
    const db = await getInitializedDatabase();
    const updated_at = Date.now();
    let goalWalletId: string | null = null;
    let updatedLog: SavingLog | null = null;

    await db.withTransactionAsync(async () => {
        const current = await db.getFirstAsync<{
            id: string;
            goal_id: string;
            amount: number;
            note: string | null;
            date: number;
            created_at: number;
            sync_status: string | null;
            wallet_id: string | null;
            current_amount: number;
            target_amount: number;
            balance: number;
        }>(
            `SELECT sl.id, sl.goal_id, sl.amount, sl.note, sl.date, sl.created_at, sl.sync_status,
                    sg.wallet_id, sg.current_amount, sg.target_amount, w.balance
             FROM saving_logs sl
             INNER JOIN saving_goals sg ON sg.id = sl.goal_id
             INNER JOIN wallets w ON w.id = sg.wallet_id
             WHERE sl.id = ? AND sl.sync_status != ? AND sg.sync_status != ? AND w.sync_status != ?`,
            [id, 'pending_delete', 'pending_delete', 'pending_delete'],
        );

        if (!current) {
            throw new Error('Kontribusi tabungan tidak ditemukan.');
        }

        const nextAmount = data.amount ?? current.amount;
        const nextState = updateSavingContributionAmount(
            {
                walletBalance: current.balance ?? 0,
                goalCurrentAmount: current.current_amount ?? 0,
                goalTargetAmount: current.target_amount ?? 0,
            },
            current.amount,
            nextAmount,
        );

        await db.runAsync(
            `UPDATE saving_logs
             SET amount = ?, note = ?, date = ?,
                 sync_status = ${PENDING_UPDATE_EXPRESSION},
                 updated_at = ?
             WHERE id = ?`,
            [nextAmount, data.note ?? current.note ?? null, data.date ?? current.date, updated_at, id],
        );

        await updateWalletBalanceState(db, current.wallet_id!, nextState.nextWalletBalance, updated_at);
        await refreshGoalAggregateState(db, current.goal_id, nextState.nextGoalCurrentAmount, updated_at);

        goalWalletId = current.wallet_id;
        updatedLog = {
            id: current.id,
            goal_id: current.goal_id,
            amount: nextAmount,
            note: data.note ?? current.note ?? null,
            date: data.date ?? current.date,
            created_at: current.created_at,
            updated_at,
            sync_status: current.sync_status === 'pending_create' ? 'pending_create' : 'pending_update',
        };
    });

    if (!updatedLog) {
        throw new Error('Kontribusi tabungan tidak ditemukan.');
    }

    const finalizedLog = updatedLog as SavingLog;

    await appendContributionActivity(
        db,
        finalizedLog.goal_id,
        goalWalletId,
        'contribution_updated',
        { amount: finalizedLog.amount, note: finalizedLog.note ?? null },
        updated_at,
    );

    return finalizedLog;
}

export async function deleteSavingLog(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    const updated_at = Date.now();
    let goalId: string | null = null;
    let goalWalletId: string | null = null;
    let removedAmount = 0;

    await db.withTransactionAsync(async () => {
        const current = await db.getFirstAsync<{
            id: string;
            goal_id: string;
            amount: number;
            sync_status: string | null;
            wallet_id: string | null;
            current_amount: number;
            target_amount: number;
            balance: number;
        }>(
            `SELECT sl.id, sl.goal_id, sl.amount, sl.sync_status,
                    sg.wallet_id, sg.current_amount, sg.target_amount, w.balance
             FROM saving_logs sl
             INNER JOIN saving_goals sg ON sg.id = sl.goal_id
             INNER JOIN wallets w ON w.id = sg.wallet_id
             WHERE sl.id = ? AND sl.sync_status != ? AND sg.sync_status != ? AND w.sync_status != ?`,
            [id, 'pending_delete', 'pending_delete', 'pending_delete'],
        );

        if (!current) {
            throw new Error('Kontribusi tabungan tidak ditemukan.');
        }

        const nextState = removeSavingContribution(
            {
                walletBalance: current.balance ?? 0,
                goalCurrentAmount: current.current_amount ?? 0,
                goalTargetAmount: current.target_amount ?? 0,
            },
            current.amount,
        );

        if (current.sync_status === 'pending_create') {
            await db.runAsync('DELETE FROM saving_logs WHERE id = ?', [id]);
        } else {
            await db.runAsync(
                `UPDATE saving_logs
                 SET sync_status = 'pending_delete', updated_at = ?
                 WHERE id = ?`,
                [updated_at, id],
            );
        }

        await updateWalletBalanceState(db, current.wallet_id!, nextState.nextWalletBalance, updated_at);
        await refreshGoalAggregateState(db, current.goal_id, nextState.nextGoalCurrentAmount, updated_at);

        goalId = current.goal_id;
        goalWalletId = current.wallet_id;
        removedAmount = current.amount;
    });

    if (!goalId) {
        throw new Error('Kontribusi tabungan tidak ditemukan.');
    }

    await appendContributionActivity(
        db,
        goalId,
        goalWalletId,
        'contribution_removed',
        { amount: removedAmount },
        updated_at,
    );
}

