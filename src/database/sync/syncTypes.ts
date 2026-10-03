// Tipe data untuk sync engine
import type { getInitializedDatabase } from '../schema';

export type { SyncStatus, SyncTable } from './syncTables';

/** Handle database SQLite yang sudah ter-inisialisasi */
export type SyncDb = Awaited<ReturnType<typeof getInitializedDatabase>>;
