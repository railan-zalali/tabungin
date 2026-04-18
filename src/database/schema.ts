// Skema database SQLite untuk Tabungin — dengan sistem migrasi berbasis PRAGMA user_version
import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<void> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        db = await SQLite.openDatabaseAsync('tabungin.db');
    }
    return db;
}

// ─── VERSI SCHEMA SAAT INI ─────────────────────────────────────────
// Naikkan angka ini setiap kali ada perubahan schema database
const CURRENT_DB_VERSION = 15;

// ─── DAFTAR MIGRASI ───────────────────────────────────────────────
// Key = nomor versi target, value = SQL yang dijalankan untuk upgrade ke versi itu
const MIGRATIONS: Record<number, string[]> = {
    1: [
        // Versi 1: Skema awal — transactions, saving_goals, saving_logs
        `CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            note TEXT,
            date INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);`,
        `CREATE TABLE IF NOT EXISTS saving_goals (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL NOT NULL DEFAULT 0,
            emoji TEXT NOT NULL DEFAULT '🎯',
            photo_uri TEXT,
            saving_per_period REAL NOT NULL,
            period_type TEXT NOT NULL CHECK(period_type IN ('daily', 'weekly', 'monthly')),
            color TEXT NOT NULL DEFAULT '#1D7D53',
            start_date INTEGER NOT NULL,
            deadline_at INTEGER NOT NULL,
            estimated_date INTEGER NOT NULL,
            is_completed INTEGER NOT NULL DEFAULT 0,
            reminder_enabled INTEGER NOT NULL DEFAULT 0,
            reminder_time TEXT,
            created_at INTEGER NOT NULL
        );`,
        `CREATE TABLE IF NOT EXISTS saving_logs (
            id TEXT PRIMARY KEY NOT NULL,
            goal_id TEXT NOT NULL,
            amount REAL NOT NULL,
            note TEXT,
            date INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
        );`,
    ],
    2: [
        // Versi 2: Tambah tabel budgets untuk fitur anggaran per kategori
        `CREATE TABLE IF NOT EXISTS budgets (
            id TEXT PRIMARY KEY NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            month INTEGER NOT NULL,
            year INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE(category, month, year)
        );`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets (year, month);`,
    ],
    3: [
        // Versi 3: Tambah tabel users untuk autentikasi lokal yang aman
        `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            avatar_color TEXT NOT NULL DEFAULT '#1D7D53',
            created_at INTEGER NOT NULL
        );`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
    ],
    4: [
        // Versi 4: Tambah kolom sync_status dan updated_at untuk sinkronisasi ke Supabase
        // sync_status: 'synced', 'pending_create', 'pending_update', 'pending_delete'
        
        // transactions
        `ALTER TABLE transactions ADD COLUMN sync_status TEXT DEFAULT 'pending_create';`,
        `ALTER TABLE transactions ADD COLUMN updated_at INTEGER;`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions (sync_status);`,

        // saving_goals
        `ALTER TABLE saving_goals ADD COLUMN sync_status TEXT DEFAULT 'pending_create';`,
        `ALTER TABLE saving_goals ADD COLUMN updated_at INTEGER;`,
        `CREATE INDEX IF NOT EXISTS idx_saving_goals_sync ON saving_goals (sync_status);`,

        // saving_logs
        `ALTER TABLE saving_logs ADD COLUMN sync_status TEXT DEFAULT 'pending_create';`,
        `ALTER TABLE saving_logs ADD COLUMN updated_at INTEGER;`,
        `CREATE INDEX IF NOT EXISTS idx_saving_logs_sync ON saving_logs (sync_status);`,

        // budgets
        `ALTER TABLE budgets ADD COLUMN sync_status TEXT DEFAULT 'pending_create';`,
        `ALTER TABLE budgets ADD COLUMN updated_at INTEGER;`,
        `CREATE INDEX IF NOT EXISTS idx_budgets_sync ON budgets (sync_status);`,
    ],
    5: [
        // Versi 5: Support Multi-Wallets (Sub-Akun)
        `CREATE TABLE IF NOT EXISTS wallets (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'general',
            color TEXT NOT NULL DEFAULT '#1D7D53',
            balance REAL NOT NULL DEFAULT 0,
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            sync_status TEXT DEFAULT 'pending_create'
        );`,
        
        // Tambahkan wallet_id ke tabel lain
        `ALTER TABLE transactions ADD COLUMN wallet_id TEXT;`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet_id);`,
        
        `ALTER TABLE saving_goals ADD COLUMN wallet_id TEXT;`,
        `ALTER TABLE budgets ADD COLUMN wallet_id TEXT;`,
    ],
    6: [
        // Versi 6: Multi-Profile Support
        `CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT, -- Nullable untuk data lama yang belum terkait user cloud
            name TEXT NOT NULL,
            icon TEXT DEFAULT 'account',
            color TEXT DEFAULT '#1D7D53',
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            sync_status TEXT DEFAULT 'pending_create'
        );`,

        // Tambahkan profile_id ke tabel utama
        `ALTER TABLE wallets ADD COLUMN profile_id TEXT;`,
        `ALTER TABLE transactions ADD COLUMN profile_id TEXT;`,
        `ALTER TABLE budgets ADD COLUMN profile_id TEXT;`,
        `ALTER TABLE saving_goals ADD COLUMN profile_id TEXT;`,
        
        `CREATE INDEX IF NOT EXISTS idx_wallets_profile ON wallets (profile_id);`,
    ],
    7: [
        // Versi 7: Shared Wallet (Team)
        `CREATE TABLE IF NOT EXISTS wallet_members (
            id TEXT PRIMARY KEY NOT NULL,
            wallet_id TEXT NOT NULL,
            user_email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'viewer', -- owner, editor, viewer
            status TEXT NOT NULL DEFAULT 'pending', -- pending, active, rejected
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            sync_status TEXT DEFAULT 'pending_create',
            FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
        );`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet ON wallet_members (wallet_id);`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_members_email ON wallet_members (user_email);`,
    ],
    8: [
        // Versi 8: Jadikan semua member dompet bersama memiliki akses manage ('editor' minimal)
        `UPDATE wallet_members SET role = 'editor' WHERE role = 'viewer';`,
        `CREATE TABLE IF NOT EXISTS _wallet_members_new (
            id TEXT PRIMARY KEY NOT NULL,
            wallet_id TEXT NOT NULL,
            user_email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'editor',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            sync_status TEXT DEFAULT 'pending_create',
            FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
        );`,
        `INSERT INTO _wallet_members_new SELECT * FROM wallet_members;`,
        `DROP TABLE wallet_members;`,
        `ALTER TABLE _wallet_members_new RENAME TO wallet_members;`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet ON wallet_members (wallet_id);`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_members_email ON wallet_members (user_email);`,
    ],
    9: [
        // Versi 9: Notifications Table
        `CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('goal_reminder', 'goal_completed', 'budget_warning', 'wallet_invite')),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            data TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            sync_status TEXT DEFAULT 'synced'
        );`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read, created_at DESC);`,
    ],
    10: [
        // Versi 10: Wallet Goals Sharing Table
        `CREATE TABLE IF NOT EXISTS wallet_goals_shared (
            id TEXT PRIMARY KEY,
            goal_id TEXT NOT NULL,
            wallet_id TEXT NOT NULL,
            user_email TEXT NOT NULL,
            shared_by TEXT NOT NULL,
            shared_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            sync_status TEXT DEFAULT 'synced'
        );`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_goal ON wallet_goals_shared (goal_id);`,
        `CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_wallet_user ON wallet_goals_shared (wallet_id, user_email);`,
    ],
    11: [
        // Versi 11: Recurring Transactions Table
        `CREATE TABLE IF NOT EXISTS recurring_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            wallet_id TEXT,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
            note TEXT,
            frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
            day_of_month INTEGER,
            day_of_week INTEGER,
            start_date INTEGER NOT NULL,
            end_date INTEGER,
            next_occurrence INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_generated_at INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            sync_status TEXT DEFAULT 'synced'
        );`,
        `CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_recurring_wallet ON recurring_transactions (wallet_id);`,
        `CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_transactions (next_occurrence);`,
        `CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions (user_id, is_active);`,
    ],
    12: [
        // Versi 12: Transaction Categories Table
        `CREATE TABLE IF NOT EXISTS transaction_categories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both')),
            icon TEXT NOT NULL DEFAULT 'tag',
            color TEXT NOT NULL DEFAULT '#1D7D53',
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            sync_status TEXT DEFAULT 'synced'
        );`,
        `CREATE INDEX IF NOT EXISTS idx_categories_user ON transaction_categories (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_categories_type ON transaction_categories (user_id, type);`,
    ],
    13: [
        // Versi 13: Advanced goal sharing metadata
        `CREATE TABLE IF NOT EXISTS sharing_activity_log (
            id TEXT PRIMARY KEY,
            goal_id TEXT NOT NULL,
            wallet_id TEXT NOT NULL,
            user_email TEXT NOT NULL,
            action TEXT NOT NULL,
            performed_by TEXT NOT NULL,
            metadata TEXT,
            timestamp INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            sync_status TEXT DEFAULT 'synced',
            FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
        );`,
        `CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_goal_id ON sharing_activity_log (goal_id);`,
        `CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_wallet_id ON sharing_activity_log (wallet_id);`,
        `CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_timestamp ON sharing_activity_log (timestamp DESC);`,
    ],
    14: [
        // Versi 14: Reminder center + explicit shared goal ownership
        `ALTER TABLE saving_goals ADD COLUMN owner_user_id TEXT;`,
        `ALTER TABLE saving_goals ADD COLUMN created_by_user_id TEXT;`,
        `ALTER TABLE budgets ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0;`,
        `ALTER TABLE budgets ADD COLUMN reminder_time TEXT;`,
        `ALTER TABLE recurring_transactions ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0;`,
        `ALTER TABLE recurring_transactions ADD COLUMN reminder_offset_minutes INTEGER NOT NULL DEFAULT 60;`,
        `CREATE TABLE IF NOT EXISTS app_reminders (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            note TEXT,
            target_screen TEXT,
            target_params TEXT,
            frequency TEXT NOT NULL CHECK(frequency IN ('once', 'daily', 'weekly', 'monthly')),
            trigger_at INTEGER NOT NULL,
            time_of_day TEXT,
            day_of_week INTEGER,
            day_of_month INTEGER,
            is_enabled INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            sync_status TEXT DEFAULT 'pending_create'
        );`,
        `CREATE INDEX IF NOT EXISTS idx_app_reminders_user ON app_reminders (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_app_reminders_trigger ON app_reminders (is_enabled, trigger_at);`,
        `CREATE TABLE IF NOT EXISTS _notifications_new (
            id TEXT PRIMARY KEY NOT NULL,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('goal_reminder', 'goal_completed', 'budget_warning', 'budget_reminder', 'recurring_reminder', 'manual_reminder', 'wallet_invite', 'app_update_available')),
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            data TEXT,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            sync_status TEXT DEFAULT 'synced'
        );`,
        `INSERT INTO _notifications_new (id, user_id, type, title, body, data, is_read, created_at, sync_status)
         SELECT id, user_id, type, title, body, data, is_read, created_at, COALESCE(sync_status, 'synced')
         FROM notifications;`,
        `DROP TABLE notifications;`,
        `ALTER TABLE _notifications_new RENAME TO notifications;`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read, created_at DESC);`,
    ],
    15: [
        // Versi 15: Explicit saving goal deadline
        `ALTER TABLE saving_goals ADD COLUMN deadline_at INTEGER;`,
        `UPDATE saving_goals SET deadline_at = estimated_date WHERE deadline_at IS NULL;`,
    ],
};

const SCHEMA_GUARDS: string[] = [
    `CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'general',
        color TEXT NOT NULL DEFAULT '#1D7D53',
        balance REAL NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        sync_status TEXT DEFAULT 'pending_create',
        profile_id TEXT
    );`,
    `CREATE INDEX IF NOT EXISTS idx_wallets_profile ON wallets (profile_id);`,
    `CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT 'account',
        color TEXT DEFAULT '#1D7D53',
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        sync_status TEXT DEFAULT 'pending_create'
    );`,
    `CREATE TABLE IF NOT EXISTS wallet_members (
        id TEXT PRIMARY KEY NOT NULL,
        wallet_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'editor',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        sync_status TEXT DEFAULT 'pending_create',
        FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet ON wallet_members (wallet_id);`,
    `CREATE INDEX IF NOT EXISTS idx_wallet_members_email ON wallet_members (user_email);`,
    `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('goal_reminder', 'goal_completed', 'budget_warning', 'budget_reminder', 'recurring_reminder', 'manual_reminder', 'wallet_invite', 'app_update_available')),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        data TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'synced'
    );`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, is_read, created_at DESC);`,
    `CREATE TABLE IF NOT EXISTS wallet_goals_shared (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        wallet_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        shared_by TEXT NOT NULL,
        shared_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        permission_level TEXT DEFAULT 'read_write',
        sync_status TEXT DEFAULT 'synced'
    );`,
    `CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_goal ON wallet_goals_shared (goal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_wallet_user ON wallet_goals_shared (wallet_id, user_email);`,
    `CREATE TABLE IF NOT EXISTS sharing_activity_log (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        wallet_id TEXT NOT NULL,
        user_email TEXT NOT NULL,
        action TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        metadata TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'synced',
        FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_goal_id ON sharing_activity_log (goal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_wallet_id ON sharing_activity_log (wallet_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_timestamp ON sharing_activity_log (timestamp DESC);`,
    `CREATE TABLE IF NOT EXISTS recurring_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        wallet_id TEXT,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        note TEXT,
        frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
        day_of_month INTEGER,
        day_of_week INTEGER,
        start_date INTEGER NOT NULL,
        end_date INTEGER,
        next_occurrence INTEGER NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        last_generated_at INTEGER,
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        reminder_offset_minutes INTEGER NOT NULL DEFAULT 60,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        sync_status TEXT DEFAULT 'synced'
    );`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_wallet ON recurring_transactions (wallet_id);`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_transactions (next_occurrence);`,
    `CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions (user_id, is_active);`,
    `CREATE TABLE IF NOT EXISTS transaction_categories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both')),
        icon TEXT NOT NULL DEFAULT 'tag',
        color TEXT NOT NULL DEFAULT '#1D7D53',
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        sync_status TEXT DEFAULT 'synced'
    );`,
    `CREATE INDEX IF NOT EXISTS idx_categories_user ON transaction_categories (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_categories_type ON transaction_categories (user_id, type);`,
    `CREATE TABLE IF NOT EXISTS app_reminders (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        note TEXT,
        target_screen TEXT,
        target_params TEXT,
        frequency TEXT NOT NULL CHECK(frequency IN ('once', 'daily', 'weekly', 'monthly')),
        trigger_at INTEGER NOT NULL,
        time_of_day TEXT,
        day_of_week INTEGER,
        day_of_month INTEGER,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'pending_create'
    );`,
    `CREATE INDEX IF NOT EXISTS idx_app_reminders_user ON app_reminders (user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_app_reminders_trigger ON app_reminders (is_enabled, trigger_at);`,
];

// ─── RUNNER MIGRASI ───────────────────────────────────────────────
async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
    // Baca versi database saat ini
    const versionResult = await database.getFirstAsync<{ user_version: number }>(
        'PRAGMA user_version'
    );
    const currentVersion = versionResult?.user_version ?? 0;

    if (currentVersion >= CURRENT_DB_VERSION) {
        return; // Sudah up-to-date
    }

    console.log(`[DB Migration] Upgrade dari v${currentVersion} ke v${CURRENT_DB_VERSION}`);

    // Jalankan migrasi satu per satu dari versi berikutnya hingga target
    for (let v = currentVersion + 1; v <= CURRENT_DB_VERSION; v++) {
        const steps = MIGRATIONS[v];
        if (!steps) continue;

        console.log(`[DB Migration] Menjalankan migrasi v${v}...`);
        await database.withTransactionAsync(async () => {
            for (const sql of steps) {
                await runMigrationStep(database, sql);
            }
        });
        console.log(`[DB Migration] Migrasi v${v} selesai.`);
    }

    // Perbarui versi database
    await database.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION};`);
    console.log(`[DB Migration] Database sekarang di versi ${CURRENT_DB_VERSION}`);
}

function extractAddColumnOperation(sql: string): { tableName: string; columnName: string } | null {
    const match = sql.match(/^\s*ALTER\s+TABLE\s+([A-Za-z_][\w]*)\s+ADD\s+COLUMN\s+([A-Za-z_][\w]*)\b/i);
    if (!match) {
        return null;
    }

    return {
        tableName: match[1],
        columnName: match[2],
    };
}

async function columnExists(
    database: SQLite.SQLiteDatabase,
    tableName: string,
    columnName: string
): Promise<boolean> {
    const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName})`);
    return columns.some((column) => column.name === columnName);
}

function isDuplicateColumnError(error: unknown): boolean {
    return String(error).toLowerCase().includes('duplicate column name');
}

async function runMigrationStep(database: SQLite.SQLiteDatabase, sql: string): Promise<void> {
    const addColumnOperation = extractAddColumnOperation(sql);

    if (addColumnOperation) {
        const { tableName, columnName } = addColumnOperation;
        if (await columnExists(database, tableName, columnName)) {
            console.log(`[DB Migration] Lewati ${tableName}.${columnName} karena kolom sudah ada.`);
            return;
        }
    }

    try {
        await database.runAsync(sql);
    } catch (error) {
        if (addColumnOperation && isDuplicateColumnError(error)) {
            console.log(`[DB Migration] Abaikan duplikasi kolom ${addColumnOperation.tableName}.${addColumnOperation.columnName}.`);
            return;
        }
        throw error;
    }
}

async function runSchemaGuards(database: SQLite.SQLiteDatabase): Promise<void> {
    await database.withTransactionAsync(async () => {
        // Pastikan tabel-tabel baru ada dan memiliki struktur yang benar
        const newTableDefs: Record<string, { sql: string, requiredColumns: string[] }> = {
            notifications: {
                sql: `CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY NOT NULL,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('goal_reminder', 'goal_completed', 'budget_warning', 'budget_reminder', 'recurring_reminder', 'manual_reminder', 'wallet_invite', 'app_update_available')),
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    data TEXT,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    sync_status TEXT DEFAULT 'synced'
                );`,
                requiredColumns: ['user_id', 'type', 'title', 'body', 'is_read', 'created_at']
            },
            wallet_goals_shared: {
                sql: `CREATE TABLE IF NOT EXISTS wallet_goals_shared (
                    id TEXT PRIMARY KEY,
                    goal_id TEXT NOT NULL,
                    wallet_id TEXT NOT NULL,
                    user_email TEXT NOT NULL,
                    shared_by TEXT NOT NULL,
                    shared_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER,
                    permission_level TEXT DEFAULT 'read_write',
                    sync_status TEXT DEFAULT 'synced'
                );`,
                requiredColumns: ['goal_id', 'wallet_id', 'user_email', 'shared_by', 'shared_at', 'updated_at', 'permission_level']
            },
            sharing_activity_log: {
                sql: `CREATE TABLE IF NOT EXISTS sharing_activity_log (
                    id TEXT PRIMARY KEY,
                    goal_id TEXT NOT NULL,
                    wallet_id TEXT NOT NULL,
                    user_email TEXT NOT NULL,
                    action TEXT NOT NULL,
                    performed_by TEXT NOT NULL,
                    metadata TEXT,
                    timestamp INTEGER NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    sync_status TEXT DEFAULT 'synced',
                    FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
                );`,
                requiredColumns: ['goal_id', 'wallet_id', 'user_email', 'action', 'performed_by', 'timestamp', 'created_at', 'updated_at']
            },
            recurring_transactions: {
                sql: `CREATE TABLE IF NOT EXISTS recurring_transactions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    wallet_id TEXT,
                    category TEXT NOT NULL,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
                    note TEXT,
                    frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
                    day_of_month INTEGER,
                    day_of_week INTEGER,
                    start_date INTEGER NOT NULL,
                    end_date INTEGER,
                    next_occurrence INTEGER NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    last_generated_at INTEGER,
                    reminder_enabled INTEGER NOT NULL DEFAULT 0,
                    reminder_offset_minutes INTEGER NOT NULL DEFAULT 60,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER,
                    sync_status TEXT DEFAULT 'synced'
                );`,
                requiredColumns: ['user_id', 'category', 'amount', 'type', 'frequency', 'next_occurrence', 'is_active', 'reminder_enabled', 'reminder_offset_minutes']
            },
            transaction_categories: {
                sql: `CREATE TABLE IF NOT EXISTS transaction_categories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both')),
                    icon TEXT NOT NULL DEFAULT 'tag',
                    color TEXT NOT NULL DEFAULT '#1D7D53',
                    is_default INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER,
                    sync_status TEXT DEFAULT 'synced'
                );`,
                requiredColumns: ['user_id', 'name', 'type', 'icon', 'color', 'is_default']
            },
            app_reminders: {
                sql: `CREATE TABLE IF NOT EXISTS app_reminders (
                    id TEXT PRIMARY KEY NOT NULL,
                    user_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    note TEXT,
                    target_screen TEXT,
                    target_params TEXT,
                    frequency TEXT NOT NULL CHECK(frequency IN ('once', 'daily', 'weekly', 'monthly')),
                    trigger_at INTEGER NOT NULL,
                    time_of_day TEXT,
                    day_of_week INTEGER,
                    day_of_month INTEGER,
                    is_enabled INTEGER NOT NULL DEFAULT 1,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    sync_status TEXT DEFAULT 'pending_create'
                );`,
                requiredColumns: ['user_id', 'title', 'frequency', 'trigger_at', 'is_enabled', 'created_at', 'updated_at']
            }
        };

        for (const [tableName, def] of Object.entries(newTableDefs)) {
            try {
                // Buat tabel jika belum ada
                await database.runAsync(def.sql);

                // Cek dan tambahkan kolom yang hilang
                const columns = await database.getAllAsync<{name: string}>(`PRAGMA table_info(${tableName})`);
                const columnNames = columns.map(c => c.name);

                for (const colName of def.requiredColumns) {
                    if (!columnNames.includes(colName)) {
                        console.log(`[DB SchemaGuard] Menambahkan kolom ${colName} ke ${tableName}`);
                        try {
                            await database.runAsync(`ALTER TABLE ${tableName} ADD COLUMN ${colName} TEXT`);
                        } catch (e) {
                            // Kolom mungkin sudah ada atau ada error lain
                            console.log(`[DB SchemaGuard] Note: ${e}`);
                        }
                    }
                }
            } catch (e) {
                console.error(`[DB SchemaGuard] Gagal memproses tabel ${tableName}:`, e);
            }
        }

        // Jalankan schema guards untuk tabel lain
        for (const sql of SCHEMA_GUARDS) {
            try {
                await database.runAsync(sql);
            } catch (e) {
                console.log(`[DB SchemaGuard] Skip (mungkin sudah ada): ${sql.substring(0, 50)}...`);
            }
        }
    });
}

// ─── INISIALISASI DATABASE ────────────────────────────────────────
export async function initDatabase(): Promise<void> {
    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            const database = await getDatabase();

            // Aktifkan WAL mode dan foreign keys
            await database.execAsync('PRAGMA journal_mode = WAL;');
            await database.execAsync('PRAGMA foreign_keys = ON;');

            // Jalankan migrasi schema
            await runMigrations(database);

            // [SELF-HEALING] Pastikan tabel/indeks fitur terbaru tetap tersedia meski versi database sudah terlanjur tinggi
            await runSchemaGuards(database);

            // [SELF-HEALING] Pastikan tabel baru tersedia (untuk mengatasi inkonsistensi versi migrasi)
            const tablesToCheck = ['transactions', 'saving_goals', 'saving_logs', 'budgets'];
            const newTables = ['notifications', 'wallet_goals_shared', 'sharing_activity_log', 'recurring_transactions', 'transaction_categories', 'app_reminders'];

            // Cek tabel-tabel yang perlu repair kolom
            for (const table of tablesToCheck) {
                try {
                    const columns = await database.getAllAsync<{name: string}>(`PRAGMA table_info(${table})`);
                    const columnNames = columns.map(c => c.name);

                    if (!columnNames.includes('sync_status')) {
                        console.log(`[DB Repair] Menambahkan sync_status ke ${table}`);
                        await database.execAsync(`ALTER TABLE ${table} ADD COLUMN sync_status TEXT DEFAULT 'pending_create'`);
                        await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_${table}_sync ON ${table} (sync_status)`);
                    }

                    if (!columnNames.includes('updated_at')) {
                        console.log(`[DB Repair] Menambahkan updated_at ke ${table}`);
                        await database.execAsync(`ALTER TABLE ${table} ADD COLUMN updated_at INTEGER`);
                    }

                    // Cek wallet_id (kecuali saving_logs yang tidak butuh)
                    if (table !== 'saving_logs' && !columnNames.includes('wallet_id')) {
                        console.log(`[DB Repair] Menambahkan wallet_id ke ${table}`);
                        await database.execAsync(`ALTER TABLE ${table} ADD COLUMN wallet_id TEXT`);
                        await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_${table}_wallet ON ${table} (wallet_id)`);
                    }
                } catch (e) {
                    console.error(`[DB Repair] Gagal memeriksa tabel ${table}:`, e);
                }
            }

            // Cek tabel-tabel baru yang harus ada
            for (const table of newTables) {
                try {
                    const tableExists = await database.getFirstAsync<{ name: string }>(
                        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
                        [table]
                    );

                    if (!tableExists) {
                        console.log(`[DB Repair] Tabel ${table} tidak ditemukan, akan dibuat oleh SCHEMA_GUARDS`);
                    } else {
                        const columns = await database.getAllAsync<{name: string}>(`PRAGMA table_info(${table})`);
                        const columnNames = columns.map(c => c.name);

                        // Cek user_id untuk tabel yang butuh
                        if (['notifications', 'recurring_transactions', 'transaction_categories', 'app_reminders'].includes(table)) {
                            if (!columnNames.includes('user_id')) {
                                console.log(`[DB Repair] Menambahkan user_id ke ${table}`);
                                await database.execAsync(`ALTER TABLE ${table} ADD COLUMN user_id TEXT`);
                            }
                        }

                        if (table === 'recurring_transactions') {
                            if (!columnNames.includes('reminder_enabled')) {
                                console.log('[DB Repair] Menambahkan reminder_enabled ke recurring_transactions');
                                await database.execAsync('ALTER TABLE recurring_transactions ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0');
                            }

                            if (!columnNames.includes('reminder_offset_minutes')) {
                                console.log('[DB Repair] Menambahkan reminder_offset_minutes ke recurring_transactions');
                                await database.execAsync('ALTER TABLE recurring_transactions ADD COLUMN reminder_offset_minutes INTEGER NOT NULL DEFAULT 60');
                            }
                        }

                        if (table === 'wallet_goals_shared') {
                            if (!columnNames.includes('updated_at')) {
                                console.log('[DB Repair] Menambahkan updated_at ke wallet_goals_shared');
                                await database.execAsync('ALTER TABLE wallet_goals_shared ADD COLUMN updated_at INTEGER');
                            }

                            if (!columnNames.includes('permission_level')) {
                                console.log('[DB Repair] Menambahkan permission_level ke wallet_goals_shared');
                                await database.execAsync("ALTER TABLE wallet_goals_shared ADD COLUMN permission_level TEXT DEFAULT 'read_write'");
                            }
                        }

                        if (table === 'app_reminders') {
                            if (!columnNames.includes('target_params')) {
                                console.log('[DB Repair] Menambahkan target_params ke app_reminders');
                                await database.execAsync('ALTER TABLE app_reminders ADD COLUMN target_params TEXT');
                            }
                        }
                    }
                } catch (e) {
                    console.error(`[DB Repair] Gagal memeriksa tabel baru ${table}:`, e);
                }
            }

            try {
                const savingGoalColumns = await database.getAllAsync<{name: string}>('PRAGMA table_info(saving_goals)');
                const savingGoalColumnNames = savingGoalColumns.map(c => c.name);

                if (!savingGoalColumnNames.includes('owner_user_id')) {
                    console.log('[DB Repair] Menambahkan owner_user_id ke saving_goals');
                    await database.execAsync('ALTER TABLE saving_goals ADD COLUMN owner_user_id TEXT');
                }

                if (!savingGoalColumnNames.includes('created_by_user_id')) {
                    console.log('[DB Repair] Menambahkan created_by_user_id ke saving_goals');
                    await database.execAsync('ALTER TABLE saving_goals ADD COLUMN created_by_user_id TEXT');
                }

                if (!savingGoalColumnNames.includes('deadline_at')) {
                    console.log('[DB Repair] Menambahkan deadline_at ke saving_goals');
                    await database.execAsync('ALTER TABLE saving_goals ADD COLUMN deadline_at INTEGER');
                    await database.execAsync('UPDATE saving_goals SET deadline_at = estimated_date WHERE deadline_at IS NULL');
                }
            } catch (e) {
                console.error('[DB Repair] Gagal memeriksa ownership saving_goals:', e);
            }

            try {
                const budgetColumns = await database.getAllAsync<{name: string}>('PRAGMA table_info(budgets)');
                const budgetColumnNames = budgetColumns.map(c => c.name);

                if (!budgetColumnNames.includes('reminder_enabled')) {
                    console.log('[DB Repair] Menambahkan reminder_enabled ke budgets');
                    await database.execAsync('ALTER TABLE budgets ADD COLUMN reminder_enabled INTEGER NOT NULL DEFAULT 0');
                }

                if (!budgetColumnNames.includes('reminder_time')) {
                    console.log('[DB Repair] Menambahkan reminder_time ke budgets');
                    await database.execAsync('ALTER TABLE budgets ADD COLUMN reminder_time TEXT');
                }
            } catch (e) {
                console.error('[DB Repair] Gagal memeriksa reminder budget:', e);
            }

            // Inisialisasi Default Wallet jika belum ada (untuk migrasi ke v5)
            const walletCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM wallets');
            if (walletCount && walletCount.count === 0) {
                const defaultWalletId = uuidv4();
                const now = Date.now();
                
                console.log('[DB Init] Membuat Default Wallet & Migrasi Data Lama...');
                
                await database.withTransactionAsync(async () => {
                    // Buat Dompet Utama
                    await database.runAsync(
                        `INSERT INTO wallets (id, name, type, color, is_default, created_at, updated_at, sync_status)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                        [defaultWalletId, 'Dompet Utama', 'cash', '#1D7D53', 1, now, now, 'pending_create']
                    );
                    
                    // Assign semua data lama ke dompet ini
                    await database.runAsync(
                        `UPDATE transactions SET wallet_id = ?, sync_status = 'pending_update', updated_at = ? WHERE wallet_id IS NULL`,
                        [defaultWalletId, now]
                    );
                    await database.runAsync(
                        `UPDATE saving_goals SET wallet_id = ?, sync_status = 'pending_update', updated_at = ? WHERE wallet_id IS NULL`,
                        [defaultWalletId, now]
                    );
                    await database.runAsync(
                        `UPDATE budgets SET wallet_id = ?, sync_status = 'pending_update', updated_at = ? WHERE wallet_id IS NULL`,
                        [defaultWalletId, now]
                    );
                });
            }

            // Inisialisasi Default Profile jika belum ada (untuk migrasi ke v6)
            const profileCount = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM profiles');
            if (profileCount && profileCount.count === 0) {
                const defaultProfileId = uuidv4();
                const now = Date.now();
                
                console.log('[DB Init] Membuat Default Profile & Migrasi Data Lama...');
                
                await database.withTransactionAsync(async () => {
                    // Buat Profil Utama
                    await database.runAsync(
                        `INSERT INTO profiles (id, name, icon, color, created_at, updated_at, sync_status)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [defaultProfileId, 'Pribadi', 'account', '#1D7D53', now, now, 'pending_create']
                    );
                    
                    // Assign semua data lama ke profil ini
                    await database.runAsync(
                        `UPDATE wallets SET profile_id = ?, sync_status = 'pending_update', updated_at = ? WHERE profile_id IS NULL`,
                        [defaultProfileId, now]
                    );
                    await database.runAsync(
                        `UPDATE transactions SET profile_id = ?, sync_status = 'pending_update', updated_at = ? WHERE profile_id IS NULL`,
                        [defaultProfileId, now]
                    );
                    await database.runAsync(
                        `UPDATE budgets SET profile_id = ?, sync_status = 'pending_update', updated_at = ? WHERE profile_id IS NULL`,
                        [defaultProfileId, now]
                    );
                    await database.runAsync(
                        `UPDATE saving_goals SET profile_id = ?, sync_status = 'pending_update', updated_at = ? WHERE profile_id IS NULL`,
                        [defaultProfileId, now]
                    );
                });
            }

            // Seed data dummy hanya jika belum ada data sama sekali DAN ini adalah mode debug/development
            // Untuk production, kita disable auto-seeding agar data user bersih
            // const result = await database.getFirstAsync<{ count: number }>(
            //    'SELECT COUNT(*) as count FROM transactions'
            // );
            // if (result && result.count === 0) {
            //    await seedDummyData(database);
            // }
        })().catch((error) => {
            dbInitPromise = null;
            throw error;
        });
    }

    await dbInitPromise;
}

export async function getInitializedDatabase(): Promise<SQLite.SQLiteDatabase> {
    await initDatabase();
    return getDatabase();
}

// ─── CLEAR DATA ───────────────────────────────────────────────────
/**
 * Menghapus seluruh data pengguna dari database lokal saat logout.
 * Ini penting untuk keamanan agar data tidak dapat diakses oleh pengguna lain di perangkat yang sama.
 */
export async function clearAllData(): Promise<void> {
    const database = await getInitializedDatabase();
    
    await database.withTransactionAsync(async () => {
        await database.runAsync('DELETE FROM notifications');
        await database.runAsync('DELETE FROM app_reminders');
        await database.runAsync('DELETE FROM recurring_transactions');
        await database.runAsync('DELETE FROM transaction_categories');
        await database.runAsync('DELETE FROM sharing_activity_log');
        await database.runAsync('DELETE FROM wallet_goals_shared');
        await database.runAsync('DELETE FROM transactions');
        await database.runAsync('DELETE FROM saving_logs'); // Harus sebelum saving_goals karena FK
        await database.runAsync('DELETE FROM saving_goals');
        await database.runAsync('DELETE FROM budgets');
        await database.runAsync('DELETE FROM wallet_members');
        await database.runAsync('DELETE FROM wallets');
        await database.runAsync('DELETE FROM profiles');
        // Jangan hapus tabel users jika masih dipakai untuk cache, tapi karena auth sudah via Supabase, aman untuk dihapus atau diabaikan.
        // Untuk amannya, kita hapus juga users lokal
        await database.runAsync('DELETE FROM users');
    });
}

// ─── SEED DATA DUMMY ─────────────────────────────────────────────
export async function seedDummyData(database: SQLite.SQLiteDatabase): Promise<void> {
    const now = Date.now();
    const today = new Date();

    const daysAgo = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        d.setHours(12, 0, 0, 0);
        return d.getTime();
    };

    const transactions = [
        { id: uuidv4(), type: 'income', amount: 8500000, category: 'salary', note: 'Gaji bulan Maret', date: daysAgo(14), created_at: now },
        { id: uuidv4(), type: 'income', amount: 1200000, category: 'freelance', note: 'Desain logo klien', date: daysAgo(7), created_at: now },
        { id: uuidv4(), type: 'income', amount: 500000, category: 'gift', note: 'Transfer dari orang tua', date: daysAgo(3), created_at: now },
        { id: uuidv4(), type: 'income', amount: 750000, category: 'freelance', note: 'Proyek web freelance', date: daysAgo(1), created_at: now },
        { id: uuidv4(), type: 'income', amount: 300000, category: 'investment', note: 'Dividen reksa dana', date: daysAgo(10), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 45000, category: 'food', note: 'Makan siang Warteg Bu Sri', date: daysAgo(0), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 35000, category: 'transport', note: 'Grab ke kantor', date: daysAgo(0), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 250000, category: 'shopping', note: 'Beli baju Uniqlo', date: daysAgo(1), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 120000, category: 'entertainment', note: 'Bioskop sama teman', date: daysAgo(2), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 85000, category: 'food', note: 'Makan malam Pizza Hut', date: daysAgo(2), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 450000, category: 'bills', note: 'Listrik + Internet', date: daysAgo(5), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 75000, category: 'health', note: 'Beli vitamin & obat', date: daysAgo(5), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 200000, category: 'education', note: 'Kursus online JavaScript', date: daysAgo(8), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 55000, category: 'food', note: 'Kopi di kedai favorit', date: daysAgo(9), created_at: now },
        { id: uuidv4(), type: 'expense', amount: 180000, category: 'shopping', note: 'Skincare rutin', date: daysAgo(12), created_at: now },
    ];

    for (const t of transactions) {
        await database.runAsync(
            'INSERT INTO transactions (id, type, amount, category, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [t.id, t.type, t.amount, t.category, t.note || null, t.date, t.created_at]
        );
    }

    const macbookId = uuidv4();
    const baliId = uuidv4();
    const ps5Id = uuidv4();

    const goals = [
        { id: macbookId, name: 'MacBook Air M3', target_amount: 18000000, current_amount: 4500000, emoji: '💻', saving_per_period: 1500000, period_type: 'monthly', color: '#3B82F6', start_date: daysAgo(30), estimated_date: daysAgo(-270), is_completed: 0, reminder_enabled: 1, reminder_time: '08:00' },
        { id: baliId, name: 'Liburan ke Bali', target_amount: 5000000, current_amount: 2000000, emoji: '🌴', saving_per_period: 500000, period_type: 'monthly', color: '#F5A623', start_date: daysAgo(45), estimated_date: daysAgo(-180), is_completed: 0, reminder_enabled: 1, reminder_time: '09:00' },
        { id: ps5Id, name: 'PS5', target_amount: 8000000, current_amount: 7800000, emoji: '🎮', saving_per_period: 1000000, period_type: 'monthly', color: '#1D7D53', start_date: daysAgo(210), estimated_date: daysAgo(-1), is_completed: 0, reminder_enabled: 0, reminder_time: null },
    ];

    for (const g of goals) {
        await database.runAsync(
            `INSERT INTO saving_goals (id, name, target_amount, current_amount, emoji, saving_per_period, period_type, color, start_date, deadline_at, estimated_date, is_completed, reminder_enabled, reminder_time, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [g.id, g.name, g.target_amount, g.current_amount, g.emoji, g.saving_per_period, g.period_type, g.color, g.start_date, ((g as { deadline_at?: number }).deadline_at ?? g.estimated_date), g.estimated_date, g.is_completed, g.reminder_enabled, g.reminder_time || null, now]
        );
    }

    const savingLogs = [
        { id: uuidv4(), goal_id: macbookId, amount: 1500000, note: 'Tabungan bulan Januari', date: daysAgo(60) },
        { id: uuidv4(), goal_id: macbookId, amount: 1500000, note: 'Tabungan bulan Februari', date: daysAgo(30) },
        { id: uuidv4(), goal_id: macbookId, amount: 1500000, note: 'Tabungan bulan Maret', date: daysAgo(5) },
        { id: uuidv4(), goal_id: baliId, amount: 1000000, note: 'Tabungan awal', date: daysAgo(45) },
        { id: uuidv4(), goal_id: baliId, amount: 500000, note: 'Dari bonus', date: daysAgo(15) },
        { id: uuidv4(), goal_id: baliId, amount: 500000, note: 'Tabungan rutin', date: daysAgo(3) },
        { id: uuidv4(), goal_id: ps5Id, amount: 2000000, note: 'Nabung perdana', date: daysAgo(210) },
        { id: uuidv4(), goal_id: ps5Id, amount: 2000000, note: 'Lanjut nabung', date: daysAgo(150) },
        { id: uuidv4(), goal_id: ps5Id, amount: 2000000, note: 'Hampir sampai!', date: daysAgo(90) },
        { id: uuidv4(), goal_id: ps5Id, amount: 1800000, note: 'Tinggal sedikit lagi!', date: daysAgo(30) },
    ];

    for (const log of savingLogs) {
        await database.runAsync(
            'INSERT INTO saving_logs (id, goal_id, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [log.id, log.goal_id, log.amount, log.note || null, log.date, now]
        );
    }

    // Seed budget dummy untuk bulan ini
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const budgetDefaults = [
        { category: 'food', amount: 1500000 },
        { category: 'transport', amount: 500000 },
        { category: 'shopping', amount: 800000 },
        { category: 'entertainment', amount: 400000 },
        { category: 'bills', amount: 600000 },
        { category: 'health', amount: 300000 },
    ];
    for (const b of budgetDefaults) {
        await database.runAsync(
            'INSERT OR IGNORE INTO budgets (id, category, amount, month, year, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [uuidv4(), b.category, b.amount, currentMonth, currentYear, now]
        );
    }
}
