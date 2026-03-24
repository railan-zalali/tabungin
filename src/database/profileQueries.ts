import { getInitializedDatabase } from './schema';
import { v4 as uuidv4 } from 'uuid';

export interface Profile {
    id: string;
    user_id?: string;
    name: string;
    icon: string;
    color: string;
    created_at: number;
    updated_at?: number;
    sync_status: string;
}

export async function fetchProfiles(): Promise<Profile[]> {
    const db = await getInitializedDatabase();
    return await db.getAllAsync<Profile>('SELECT * FROM profiles WHERE sync_status != ? ORDER BY created_at ASC', ['pending_delete']);
}

export async function insertProfile(name: string, icon: string = 'account', color: string = '#1DB954'): Promise<Profile> {
    const db = await getInitializedDatabase();
    const id = uuidv4();
    const now = Date.now();
    
    await db.runAsync(
        `INSERT INTO profiles (id, name, icon, color, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, name, icon, color, now, now, 'pending_create']
    );

    return { id, name, icon, color, created_at: now, updated_at: now, sync_status: 'pending_create' };
}

export async function updateProfile(id: string, data: Partial<Profile>): Promise<void> {
    const db = await getInitializedDatabase();
    const now = Date.now();
    
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name) { fields.push('name = ?'); values.push(data.name); }
    if (data.icon) { fields.push('icon = ?'); values.push(data.icon); }
    if (data.color) { fields.push('color = ?'); values.push(data.color); }

    if (fields.length === 0) return;

    fields.push("sync_status = 'pending_update'");
    fields.push("updated_at = ?");
    values.push(now);
    values.push(id);

    await db.runAsync(
        `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
}

export async function deleteProfile(id: string): Promise<void> {
    const db = await getInitializedDatabase();
    const now = Date.now();
    
    // Soft delete
    await db.runAsync(
        `UPDATE profiles SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?`,
        [now, id]
    );
}

