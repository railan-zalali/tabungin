// Orkestrator sync — urutan push lalu pull, dengan penjagaan agar hanya
// satu sync yang berjalan pada satu waktu.
// Diekstrak dari database/sync.ts.
import { isSupabaseConfigured, supabase, warnIfSupabaseUnavailable } from '../../lib/supabase';
import { runSerializedSyncTask } from '../syncQueue';
import { pushChanges } from './pushChanges';
import { pullChanges } from './pullChanges';

let activeSyncPromise: Promise<void> | null = null;

/**
 * Fungsi utama Sync
 */
export async function syncDatabase() {
    if (!isSupabaseConfigured) {
        warnIfSupabaseUnavailable('syncDatabase');
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

            console.log('Starting sync...');

            try {
                await pushChanges();
            } catch (e) {
                console.error('Push changes failed:', e);
            }

            try {
                await pullChanges();
            } catch (e) {
                console.error('Pull changes failed:', e);
            }

            console.log('Sync completed.');
        } catch (e) {
            console.error('Sync failed:', e);
        } finally {
            activeSyncPromise = null;
        }
    });

    return activeSyncPromise;
}
