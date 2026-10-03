// Sinkronisasi profil — memastikan profil remote ada dan merekonsiliasi
// profil lokal dengannya (multi-profile support).
// Diekstrak dari database/sync.ts.
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { getInitializedDatabase } from '../schema';

/**
 * Pastikan profile exists di Supabase sebelum sync wallets
 * Jika profile_id tidak ada di Supabase, buat profile baru
 */
export async function ensureProfileExistsInSupabase(
    userId: string,
    userEmail: string,
): Promise<string | null> {
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

        const { error: insertError } = await supabase.from('profiles').insert({
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

export async function reconcileLocalProfileWithSupabase(
    remoteProfileId: string,
    userId: string,
    userEmail: string,
): Promise<string> {
    const db = await getInitializedDatabase();
    // Dynamic import: hindari circular dependency (store -> sync -> store)
    const { useProfileStore } = await import('../../store/useProfileStore');

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
    const createdAt = remoteProfile?.created_at ?? activeProfile?.created_at ?? now;

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

/**
 * Helper untuk mendapatkan active profile ID
 * Ini penting untuk multi-user sync di shared wallets
 */
export async function getActiveProfile(): Promise<{ activeProfileId: string }> {
    try {
        // Dynamic import: hindari circular dependency (store -> sync -> store)
        const { useProfileStore } = await import('../../store/useProfileStore');
        const profileId = useProfileStore.getState().activeProfileId;
        return { activeProfileId: profileId || '' };
    } catch (e) {
        console.error('Error getting active profile:', e);
        return { activeProfileId: '' };
    }
}
