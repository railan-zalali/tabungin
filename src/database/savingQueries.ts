// Query database untuk tabel saving_goals dan saving_logs
import { getDatabase } from './schema';
import type { SavingGoal, SavingLog } from '../types/saving';
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

/**
 * Ambil semua saving goals
 */
export async function fetchSavingGoals(filter?: 'active' | 'completed' | 'all'): Promise<SavingGoal[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM saving_goals';
    const params: (string | number)[] = [];

    if (filter === 'active') {
        query += ' WHERE is_completed = 0';
    } else if (filter === 'completed') {
        query += ' WHERE is_completed = 1';
    }

    query += ' ORDER BY created_at DESC';
    const rows = await db.getAllAsync<RawGoalRow>(query, params);
    return rows.map(mapGoalRow);
}

/**
 * Ambil satu saving goal berdasarkan ID
 */
export async function fetchSavingGoalById(id: string): Promise<SavingGoal | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<RawGoalRow>(
        'SELECT * FROM saving_goals WHERE id = ?',
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
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = Date.now();

    await db.runAsync(
        `INSERT INTO saving_goals
     (id, name, target_amount, current_amount, emoji, photo_uri, saving_per_period, period_type,
      color, start_date, estimated_date, is_completed, reminder_enabled, reminder_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, data.name, data.target_amount, data.current_amount, data.emoji,
            data.photo_uri || null, data.saving_per_period, data.period_type,
            data.color, data.start_date, data.estimated_date,
            data.is_completed ? 1 : 0, data.reminder_enabled ? 1 : 0,
            data.reminder_time || null, created_at,
        ]
    );

    return { id, created_at, ...data };
}

/**
 * Update saving goal
 */
export async function updateSavingGoal(
    id: string,
    data: Partial<Omit<SavingGoal, 'id' | 'created_at'>>
): Promise<void> {
    const db = await getDatabase();
    const mapped: Record<string, string | number | null> = {};

    for (const [key, value] of Object.entries(data)) {
        if (key === 'is_completed' || key === 'reminder_enabled') {
            mapped[key] = value ? 1 : 0;
        } else {
            mapped[key] = value as string | number | null;
        }
    }

    const fields = Object.keys(mapped).map((k) => `${k} = ?`).join(', ');
    const values = [...Object.values(mapped), id];
    await db.runAsync(`UPDATE saving_goals SET ${fields} WHERE id = ?`, values);
}

/**
 * Hapus saving goal (cascade menghapus logs juga)
 */
export async function deleteSavingGoal(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM saving_goals WHERE id = ?', [id]);
}

/**
 * Ambil semua log tabungan untuk goal tertentu
 */
export async function fetchSavingLogs(goalId: string): Promise<SavingLog[]> {
    const db = await getDatabase();
    return await db.getAllAsync<SavingLog>(
        'SELECT * FROM saving_logs WHERE goal_id = ? ORDER BY date DESC',
        [goalId]
    );
}

/**
 * Tambah log tabungan dan update current_amount pada goal
 */
export async function insertSavingLog(
    data: Omit<SavingLog, 'id' | 'created_at'>
): Promise<SavingLog> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = Date.now();

    await db.runAsync(
        'INSERT INTO saving_logs (id, goal_id, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, data.goal_id, data.amount, data.note || null, data.date, created_at]
    );

    // Update current_amount pada goal
    await db.runAsync(
        'UPDATE saving_goals SET current_amount = current_amount + ? WHERE id = ?',
        [data.amount, data.goal_id]
    );

    // Cek apakah goal sudah tercapai
    const goal = await fetchSavingGoalById(data.goal_id);
    if (goal && goal.current_amount >= goal.target_amount) {
        await db.runAsync(
            'UPDATE saving_goals SET is_completed = 1 WHERE id = ?',
            [data.goal_id]
        );
    }

    return { id, created_at, ...data };
}
