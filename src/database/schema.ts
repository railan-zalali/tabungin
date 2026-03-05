// Skema database SQLite untuk Tabungin
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

export async function initDatabase(): Promise<void> {
    const database = await getDatabase();

    // Aktifkan WAL mode untuk performa lebih baik
    await database.execAsync('PRAGMA journal_mode = WAL;');
    await database.execAsync('PRAGMA foreign_keys = ON;');

    // Buat tabel transactions
    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

    // Buat tabel saving_goals
    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS saving_goals (
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
    );
  `);

    // Buat tabel saving_logs
    await database.execAsync(`
    CREATE TABLE IF NOT EXISTS saving_logs (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      date INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES saving_goals(id) ON DELETE CASCADE
    );
  `);

    // Cek apakah sudah ada data seed
    const result = await database.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM transactions'
    );

    if (result && result.count === 0) {
        await seedDummyData(database);
    }
}

async function seedDummyData(database: SQLite.SQLiteDatabase): Promise<void> {
    const now = Date.now();
    const today = new Date();

    // Helper untuk tanggal relatif
    const daysAgo = (days: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - days);
        d.setHours(12, 0, 0, 0);
        return d.getTime();
    };

    // Data transaksi dummy — 10 pengeluaran + 5 pemasukan bulan ini
    const transactions = [
        // Pemasukan
        { id: uuidv4(), type: 'income', amount: 8500000, category: 'salary', note: 'Gaji bulan Maret', date: daysAgo(14), created_at: now },
        { id: uuidv4(), type: 'income', amount: 1200000, category: 'freelance', note: 'Desain logo klien', date: daysAgo(7), created_at: now },
        { id: uuidv4(), type: 'income', amount: 500000, category: 'gift', note: 'Transfer dari orang tua', date: daysAgo(3), created_at: now },
        { id: uuidv4(), type: 'income', amount: 750000, category: 'freelance', note: 'Proyek web freelance', date: daysAgo(1), created_at: now },
        { id: uuidv4(), type: 'income', amount: 300000, category: 'investment', note: 'Dividen reksa dana', date: daysAgo(10), created_at: now },
        // Pengeluaran
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

    // Saving Goals dummy
    const macbookId = uuidv4();
    const baliId = uuidv4();
    const ps5Id = uuidv4();

    const goals = [
        {
            id: macbookId,
            name: 'MacBook Air M3',
            target_amount: 18000000,
            current_amount: 4500000,
            emoji: '💻',
            saving_per_period: 1500000,
            period_type: 'monthly',
            color: '#3B82F6',
            start_date: daysAgo(30),
            estimated_date: daysAgo(-270),
            is_completed: 0,
            reminder_enabled: 1,
            reminder_time: '08:00',
        },
        {
            id: baliId,
            name: 'Liburan ke Bali',
            target_amount: 5000000,
            current_amount: 2000000,
            emoji: '🌴',
            saving_per_period: 500000,
            period_type: 'monthly',
            color: '#F5A623',
            start_date: daysAgo(45),
            estimated_date: daysAgo(-180),
            is_completed: 0,
            reminder_enabled: 1,
            reminder_time: '09:00',
        },
        {
            id: ps5Id,
            name: 'PS5',
            target_amount: 8000000,
            current_amount: 7800000,
            emoji: '🎮',
            saving_per_period: 1000000,
            period_type: 'monthly',
            color: '#1DB954',
            start_date: daysAgo(210),
            estimated_date: daysAgo(-1),
            is_completed: 0,
            reminder_enabled: 0,
            reminder_time: null,
        },
    ];

    for (const g of goals) {
        await database.runAsync(
            `INSERT INTO saving_goals 
       (id, name, target_amount, current_amount, emoji, saving_per_period, period_type, color, start_date, estimated_date, is_completed, reminder_enabled, reminder_time, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [g.id, g.name, g.target_amount, g.current_amount, g.emoji, g.saving_per_period, g.period_type, g.color, g.start_date, g.estimated_date, g.is_completed, g.reminder_enabled, g.reminder_time || null, now]
        );
    }

    // Saving logs untuk setiap goal
    const savingLogs = [
        // MacBook logs
        { id: uuidv4(), goal_id: macbookId, amount: 1500000, note: 'Tabungan bulan Januari', date: daysAgo(60) },
        { id: uuidv4(), goal_id: macbookId, amount: 1500000, note: 'Tabungan bulan Februari', date: daysAgo(30) },
        { id: uuidv4(), goal_id: macbookId, amount: 1500000, note: 'Tabungan bulan Maret', date: daysAgo(5) },
        // Bali logs
        { id: uuidv4(), goal_id: baliId, amount: 1000000, note: 'Tabungan awal', date: daysAgo(45) },
        { id: uuidv4(), goal_id: baliId, amount: 500000, note: 'Dari bonus', date: daysAgo(15) },
        { id: uuidv4(), goal_id: baliId, amount: 500000, note: 'Tabungan rutin', date: daysAgo(3) },
        // PS5 logs
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
}
