import { getInitializedDatabase } from './schema';
import { v4 as uuidv4 } from 'uuid';

export type AppReminderFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

export interface AppReminder {
    id: string;
    user_id: string;
    title: string;
    note: string | null;
    target_screen: string | null;
    target_params: Record<string, unknown> | null;
    frequency: AppReminderFrequency;
    trigger_at: number;
    time_of_day: string | null;
    day_of_week: number | null;
    day_of_month: number | null;
    is_enabled: boolean;
    created_at: number;
    updated_at: number;
}

type LocalReminderRow = Omit<AppReminder, 'is_enabled' | 'target_params'> & {
    is_enabled: number | boolean;
    target_params: string | null;
    sync_status?: string;
};

function mapReminderRow(row: LocalReminderRow): AppReminder {
    return {
        ...row,
        target_params: row.target_params ? JSON.parse(row.target_params) : null,
        is_enabled: Boolean(row.is_enabled),
    };
}

export async function fetchAppReminders(userId: string): Promise<AppReminder[]> {
    const db = await getInitializedDatabase();
    const rows = await db.getAllAsync<LocalReminderRow>(
        `SELECT * FROM app_reminders
         WHERE user_id = ? AND sync_status != 'pending_delete'
         ORDER BY is_enabled DESC, trigger_at ASC`,
        [userId],
    );

    return rows.map(mapReminderRow);
}

export async function fetchEnabledAppReminders(userId: string): Promise<AppReminder[]> {
    const db = await getInitializedDatabase();
    const rows = await db.getAllAsync<LocalReminderRow>(
        `SELECT * FROM app_reminders
         WHERE user_id = ? AND sync_status != 'pending_delete' AND is_enabled = 1
         ORDER BY trigger_at ASC`,
        [userId],
    );

    return rows.map(mapReminderRow);
}

export async function insertAppReminder(
    reminder: Omit<AppReminder, 'id' | 'created_at' | 'updated_at'>
): Promise<AppReminder> {
    const db = await getInitializedDatabase();
    const now = Date.now();
    const id = uuidv4();

    await db.runAsync(
        `INSERT INTO app_reminders
         (id, user_id, title, note, target_screen, target_params, frequency, trigger_at, time_of_day, day_of_week, day_of_month, is_enabled, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_create')`,
        [
            id,
            reminder.user_id,
            reminder.title,
            reminder.note || null,
            reminder.target_screen || null,
            JSON.stringify(reminder.target_params ?? null),
            reminder.frequency,
            reminder.trigger_at,
            reminder.time_of_day || null,
            reminder.day_of_week,
            reminder.day_of_month,
            reminder.is_enabled ? 1 : 0,
            now,
            now,
        ],
    );

    return {
        ...reminder,
        id,
        created_at: now,
        updated_at: now,
    };
}

export async function updateAppReminder(
    id: string,
    updates: Partial<Omit<AppReminder, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<void> {
    const db = await getInitializedDatabase();
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
    }
    if (updates.note !== undefined) {
        fields.push('note = ?');
        values.push(updates.note);
    }
    if (updates.target_screen !== undefined) {
        fields.push('target_screen = ?');
        values.push(updates.target_screen);
    }
    if (updates.target_params !== undefined) {
        fields.push('target_params = ?');
        values.push(JSON.stringify(updates.target_params ?? null));
    }
    if (updates.frequency !== undefined) {
        fields.push('frequency = ?');
        values.push(updates.frequency);
    }
    if (updates.trigger_at !== undefined) {
        fields.push('trigger_at = ?');
        values.push(updates.trigger_at);
    }
    if (updates.time_of_day !== undefined) {
        fields.push('time_of_day = ?');
        values.push(updates.time_of_day);
    }
    if (updates.day_of_week !== undefined) {
        fields.push('day_of_week = ?');
        values.push(updates.day_of_week);
    }
    if (updates.day_of_month !== undefined) {
        fields.push('day_of_month = ?');
        values.push(updates.day_of_month);
    }
    if (updates.is_enabled !== undefined) {
        fields.push('is_enabled = ?');
        values.push(updates.is_enabled ? 1 : 0);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    fields.push(`sync_status = CASE
        WHEN sync_status = 'pending_create' THEN 'pending_create'
        ELSE 'pending_update'
    END`);
    values.push(Date.now());
    values.push(id);

    await db.runAsync(`UPDATE app_reminders SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteAppReminder(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    const row = await db.getFirstAsync<{ sync_status: string }>(
        'SELECT sync_status FROM app_reminders WHERE id = ?',
        [id],
    );

    if (!row) return;

    if (row.sync_status === 'pending_create') {
        await db.runAsync('DELETE FROM app_reminders WHERE id = ?', [id]);
        return;
    }

    await db.runAsync(
        `UPDATE app_reminders
         SET sync_status = 'pending_delete', updated_at = ?
         WHERE id = ?`,
        [Date.now(), id],
    );
}
