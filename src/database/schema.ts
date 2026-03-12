// Skema database SQLite untuk Tabungin — dengan sistem migrasi berbasis PRAGMA user_version
import * as SQLite from 'expo-sqlite';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        db = await SQLite.openDatabaseAsync('tabungin.db');
    }
    return db;
}

// ─── VERSI SCHEMA SAAT INI ─────────────────────────────────────────
// Naikkan angka ini setiap kali ada perubahan schema database
const CURRENT_DB_VERSION = 5;

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
            color TEXT NOT NULL DEFAULT '#1DB954',
            start_date INTEGER NOT NULL,
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
            avatar_color TEXT NOT NULL DEFAULT '#1DB954',
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
            color TEXT NOT NULL DEFAULT '#1DB954',
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
};

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
                await database.execAsync(sql);
            }
        });
        console.log(`[DB Migration] Migrasi v${v} selesai.`);
    }

    // Perbarui versi database
    await database.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION};`);
    console.log(`[DB Migration] Database sekarang di versi ${CURRENT_DB_VERSION}`);
}

// ─── INISIALISASI DATABASE ────────────────────────────────────────
export async function initDatabase(): Promise<void> {
    const database = await getDatabase();

    // Aktifkan WAL mode dan foreign keys
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // Jalankan migrasi schema
    await runMigrations(database);

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
                [defaultWalletId, 'Dompet Utama', 'cash', '#1DB954', 1, now, now, 'pending_create']
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

    // Seed data dummy hanya jika belum ada data sama sekali DAN ini adalah mode debug/development
    // Untuk production, kita disable auto-seeding agar data user bersih
    // const result = await database.getFirstAsync<{ count: number }>(
    //    'SELECT COUNT(*) as count FROM transactions'
    // );
    // if (result && result.count === 0) {
    //    await seedDummyData(database);
    // }
}

// ─── CLEAR DATA ───────────────────────────────────────────────────
/**
 * Menghapus seluruh data pengguna dari database lokal saat logout.
 * Ini penting untuk keamanan agar data tidak dapat diakses oleh pengguna lain di perangkat yang sama.
 */
export async function clearAllData(): Promise<void> {
    const database = await getDatabase();
    
    await database.withTransactionAsync(async () => {
        await database.execAsync('DELETE FROM transactions');
        await database.execAsync('DELETE FROM saving_logs'); // Harus sebelum saving_goals karena FK
        await database.execAsync('DELETE FROM saving_goals');
        await database.execAsync('DELETE FROM budgets');
        // Jangan hapus tabel users jika masih dipakai untuk cache, tapi karena auth sudah via Supabase, aman untuk dihapus atau diabaikan.
        // Untuk amannya, kita hapus juga users lokal
        await database.execAsync('DELETE FROM users');
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
        { id: ps5Id, name: 'PS5', target_amount: 8000000, current_amount: 7800000, emoji: '🎮', saving_per_period: 1000000, period_type: 'monthly', color: '#1DB954', start_date: daysAgo(210), estimated_date: daysAgo(-1), is_completed: 0, reminder_enabled: 0, reminder_time: null },
    ];

    for (const g of goals) {
        await database.runAsync(
            `INSERT INTO saving_goals (id, name, target_amount, current_amount, emoji, saving_per_period, period_type, color, start_date, estimated_date, is_completed, reminder_enabled, reminder_time, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [g.id, g.name, g.target_amount, g.current_amount, g.emoji, g.saving_per_period, g.period_type, g.color, g.start_date, g.estimated_date, g.is_completed, g.reminder_enabled, g.reminder_time || null, now]
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
