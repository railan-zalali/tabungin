// Konfigurasi tabel yang di-sync antara SQLite lokal dan Supabase
// Diekstrak dari sync.ts untuk modularitas

export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export interface SyncTable {
    tableName: string;
    columns: string[];
    remoteColumns?: string[];
    remoteUpdatedAtColumn?: string;
    optional?: boolean;
}

export const SYNC_TABLES: SyncTable[] = [
    {
        tableName: 'profiles',
        columns: ['id', 'user_id', 'name', 'icon', 'color', 'created_at', 'updated_at'],
    },
    {
        tableName: 'wallets',
        columns: [
            'id',
            'name',
            'type',
            'color',
            'balance',
            'is_default',
            'created_at',
            'updated_at',
            'profile_id',
        ],
    },
    {
        tableName: 'transactions',
        columns: ['id', 'type', 'amount', 'category', 'note', 'date', 'created_at', 'updated_at', 'wallet_id', 'profile_id'],
    },
    {
        tableName: 'wallet_members',
        columns: ['id', 'wallet_id', 'user_email', 'role', 'status', 'created_at', 'updated_at'],
    },
    {
        tableName: 'saving_goals',
        columns: [
            'id',
            'name',
            'target_amount',
            'current_amount',
            'emoji',
            'photo_uri',
            'saving_per_period',
            'period_type',
            'color',
            'start_date',
            'estimated_date',
            'is_completed',
            'reminder_enabled',
            'reminder_time',
            'created_at',
            'updated_at',
            'wallet_id',
            'profile_id',
        ],
    },
    {
        tableName: 'saving_logs',
        columns: ['id', 'goal_id', 'amount', 'note', 'date', 'created_at', 'updated_at'],
    },
    {
        tableName: 'wallet_goals_shared',
        columns: [
            'id',
            'goal_id',
            'wallet_id',
            'user_email',
            'shared_by',
            'shared_at',
            'created_at',
            'updated_at',
            'permission_level',
        ],
        remoteColumns: [
            'id',
            'goal_id',
            'wallet_id',
            'user_email',
            'shared_by',
            'shared_at',
            'created_at',
            'updated_at',
            'permission_level',
        ],
        remoteUpdatedAtColumn: 'updated_at',
    },
    {
        tableName: 'sharing_activity_log',
        columns: [
            'id',
            'goal_id',
            'wallet_id',
            'user_email',
            'action',
            'performed_by',
            'metadata',
            'timestamp',
            'created_at',
            'updated_at',
        ],
        optional: true,
    },
    {
        tableName: 'budgets',
        columns: ['id', 'category', 'amount', 'month', 'year', 'created_at', 'updated_at', 'wallet_id', 'profile_id'],
    },
    {
        tableName: 'debts',
        columns: ['id', 'user_id', 'type', 'counterparty', 'counterparty_email', 'amount', 'remaining_amount', 'interest_rate', 'due_date', 'note', 'status', 'wallet_id', 'profile_id', 'created_at', 'updated_at'],
    },
    {
        tableName: 'debt_payments',
        columns: ['id', 'debt_id', 'amount', 'date', 'note', 'created_at', 'updated_at'],
    },
];

// Tabel yang tidak lagi didukung di remote (Supabase)
export const unsupportedRemoteTables = new Set<string>();

// Tabel yang membutuhkan parent wallet di Supabase
const TABLES_REQUIRING_REMOTE_WALLET = ['transactions', 'budgets', 'saving_goals', 'wallet_members', 'debts'];

export function tableRequiresRemoteWallet(tableName: string): boolean {
    return TABLES_REQUIRING_REMOTE_WALLET.includes(tableName);
}

export function isRemoteMissingTableError(error: any): boolean {
    return error?.code === 'PGRST205' || String(error?.message || '').includes('schema cache');
}

export function shouldSkipRemoteTable(table: SyncTable, error: any): boolean {
    if (table.optional && isRemoteMissingTableError(error)) {
        unsupportedRemoteTables.add(table.tableName);
        console.log(`[Sync] Skipping optional remote table ${table.tableName} because it is unavailable in Supabase.`);
        return true;
    }
    return false;
}
