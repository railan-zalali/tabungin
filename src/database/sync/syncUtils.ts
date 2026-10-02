// Utilitas mapping data antara SQLite dan Supabase
// Diekstrak dari sync.ts untuk modularitas

/**
 * Helper untuk mapping data SQLite ke Supabase (Postgres)
 */
export function mapRecordToSupabase(table: string, row: any): any {
    const record = { ...row };

    // Convert boolean fields from 0/1 to false/true
    if (table === 'saving_goals') {
        if ('is_completed' in record) record.is_completed = Boolean(record.is_completed);
        if ('reminder_enabled' in record) record.reminder_enabled = Boolean(record.reminder_enabled);
    }
    if (table === 'wallets') {
        if ('is_default' in record) record.is_default = Boolean(record.is_default);
    }
    if (table === 'wallet_goals_shared') {
        record.created_at = record.created_at ?? record.shared_at ?? Date.now();
        record.updated_at = record.updated_at ?? record.created_at;
        record.permission_level = record.permission_level ?? 'read_write';
    }

    return record;
}

/**
 * Helper untuk mapping data Supabase (Postgres) ke SQLite
 */
export function mapRecordFromSupabase(table: string, row: any): any {
    const record = { ...row };

    // Convert boolean fields from true/false to 0/1
    if (table === 'saving_goals') {
        if ('is_completed' in record) record.is_completed = record.is_completed ? 1 : 0;
        if ('reminder_enabled' in record) record.reminder_enabled = record.reminder_enabled ? 1 : 0;
    }
    if (table === 'wallet_goals_shared') {
        record.created_at = record.created_at ?? record.shared_at ?? Date.now();
        record.updated_at = record.updated_at ?? record.created_at;
        record.permission_level = record.permission_level ?? 'read_write';
    }

    return record;
}

/**
 * Cek apakah row dengan wallet_id dapat di-sync ke remote (wallet parent harus ada di remote)
 */
export function isRowSyncableForRemoteWallet(payload: Record<string, any>, remoteWalletIdSet: Set<string>): boolean {
    if (!payload.wallet_id) {
        return true;
    }
    return remoteWalletIdSet.has(payload.wallet_id);
}
