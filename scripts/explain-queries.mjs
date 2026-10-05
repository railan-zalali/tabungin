#!/usr/bin/env node
// scripts/explain-queries.mjs — reproduksi analisis §6.4 (DB-1, Sprint 1).
//
// Analisis EXPLAIN QUERY PLAN untuk optimasi database pernah dijalankan pada
// Oktober 2026 tetapi skripnya tidak ikut ter-commit, sehingga kesimpulan
// "indeks kandidat tidak dipakai" tidak bisa dibuktikan ulang. Skrip ini
// menjalankannya lagi terhadap SQLite sungguhan dengan skema dan query yang
// sama persis dengan yang dipancarkan aplikasi.
//
// Pemakaian:
//   node scripts/explain-queries.mjs                 # 20.000 transaksi, 3.000 goal
//   node scripts/explain-queries.mjs --rows 5000     # dataset lebih kecil
//   node scripts/explain-queries.mjs --candidates    # ikut memasang indeks kandidat §6.4
//
// Skrip ini membutuhkan Node >= 22 (memakai `node:sqlite` bawaan).
// Query disalin dari src/database/transactionQueries.ts dan
// src/database/savingQueries.ts; kalau file itu berubah, skrip memperingatkan
// lewat pemeriksaan drift di bawah — perbarui query di sini pada saat itu.

import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Argumen
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 && args[index + 1] ? Number(args[index + 1]) : fallback;
};

const TRANSACTION_ROWS = opt('rows', 20000);
const GOAL_ROWS = opt('goals', 3000);
const WITH_CANDIDATES = flag('candidates');
const RUNS = opt('runs', 5);

const PROFILE_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_PROFILE_ID = '22222222-2222-2222-2222-222222222222';
const USER_EMAIL = 'user@tabungin.test';
const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
const SIX_MONTHS_AGO = NOW - 182 * DAY;

// PRNG deterministik (mulberry32) supaya dataset dan hasil bisa diulang persis.
function createRandom(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ---------------------------------------------------------------------------
// Skema (disalin dari src/database/schema.ts — hanya tabel yang disentuh query)
// ---------------------------------------------------------------------------

const SCHEMA = `
CREATE TABLE transactions (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    date INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'pending_create',
    updated_at INTEGER,
    wallet_id TEXT,
    profile_id TEXT
);
CREATE INDEX idx_transactions_date ON transactions (date DESC);
CREATE INDEX idx_transactions_type ON transactions (type);
CREATE INDEX idx_transactions_sync ON transactions (sync_status);
CREATE INDEX idx_transactions_wallet ON transactions (wallet_id);

CREATE TABLE wallets (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    color TEXT NOT NULL DEFAULT '#1DB954',
    balance REAL NOT NULL DEFAULT 0,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    sync_status TEXT DEFAULT 'pending_create',
    profile_id TEXT
);

CREATE TABLE wallet_members (
    id TEXT PRIMARY KEY NOT NULL,
    wallet_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER,
    sync_status TEXT DEFAULT 'pending_create'
);
CREATE INDEX idx_wallet_members_wallet ON wallet_members (wallet_id);
CREATE INDEX idx_wallet_members_email ON wallet_members (user_email);

CREATE TABLE saving_goals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL NOT NULL DEFAULT 0,
    emoji TEXT NOT NULL DEFAULT '🎯',
    photo_uri TEXT,
    saving_per_period REAL NOT NULL,
    period_type TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#1DB954',
    start_date INTEGER NOT NULL,
    estimated_date INTEGER NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    reminder_time TEXT,
    sync_status TEXT DEFAULT 'pending_create',
    updated_at INTEGER,
    wallet_id TEXT,
    profile_id TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_saving_goals_sync ON saving_goals (sync_status);

CREATE TABLE wallet_goals_shared (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    wallet_id TEXT NOT NULL,
    user_email TEXT NOT NULL,
    shared_by TEXT NOT NULL,
    shared_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    sync_status TEXT DEFAULT 'synced'
);
CREATE INDEX idx_wallet_goals_shared_goal ON wallet_goals_shared (goal_id);
`;

// Indeks kandidat dari roadmap §6.4 — dipasang hanya dengan --candidates.
const CANDIDATE_INDEXES = `
CREATE INDEX idx_transactions_profile_date ON transactions(profile_id, date DESC);
CREATE INDEX idx_saving_goals_wallet_completed ON saving_goals(wallet_id, is_completed);
`;

// ---------------------------------------------------------------------------
// Dataset
// ---------------------------------------------------------------------------

function seed(db) {
    const random = createRandom(20261005);

    db.exec('BEGIN');
    db.exec(SCHEMA);

    const insertWallet = db.prepare(
        'INSERT INTO wallets (id, name, type, color, balance, is_default, created_at, sync_status, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    insertWallet.run('w1', 'Dompet Utama', 'cash', '#1DB954', 0, 1, NOW, 'synced', PROFILE_ID);
    insertWallet.run('w2', 'Dompet Bersama', 'cash', '#1DB954', 0, 0, NOW, 'synced', OTHER_PROFILE_ID);
    insertWallet.run('w3', 'Dompet Tabungan', 'cash', '#1DB954', 0, 0, NOW, 'synced', PROFILE_ID);

    // w2 dimiliki profil lain tetapi di-share ke user lewat email.
    db.prepare(
        'INSERT INTO wallet_members (id, wallet_id, user_email, role, status, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run('m1', 'w2', USER_EMAIL, 'editor', 'active', NOW, 'synced');

    const insertTransaction = db.prepare(
        'INSERT INTO transactions (id, type, amount, category, note, date, created_at, updated_at, sync_status, wallet_id, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const categories = ['Makanan', 'Transport', 'Belanja', 'Gaji', 'Tagihan', 'Hiburan'];
    for (let i = 0; i < TRANSACTION_ROWS; i += 1) {
        const bucket = random();
        const walletId = bucket < 0.7 ? 'w1' : bucket < 0.9 ? 'w2' : null;
        const profileId = walletId === 'w2' ? OTHER_PROFILE_ID : PROFILE_ID;
        const date = NOW - Math.floor(random() * 400) * DAY;
        insertTransaction.run(
            `t${i}`,
            random() < 0.3 ? 'income' : 'expense',
            Math.round(random() * 500000) + 1000,
            categories[Math.floor(random() * categories.length)],
            `Catatan transaksi ${i}`,
            date,
            date,
            date,
            'synced',
            walletId,
            profileId,
        );
    }

    const insertGoal = db.prepare(
        'INSERT INTO saving_goals (id, name, target_amount, current_amount, emoji, saving_per_period, period_type, start_date, estimated_date, is_completed, reminder_enabled, sync_status, wallet_id, profile_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    for (let i = 0; i < GOAL_ROWS; i += 1) {
        const bucket = random();
        insertGoal.run(
            `g${i}`,
            `Target ${i}`,
            1000000,
            Math.round(random() * 1000000),
            '🎯',
            100000,
            'monthly',
            NOW - 300 * DAY,
            NOW + 60 * DAY,
            bucket < 0.4 ? 1 : 0,
            0,
            'synced',
            bucket < 0.6 ? (bucket < 0.3 ? 'w1' : 'w2') : null,
            bucket < 0.6 ? PROFILE_ID : PROFILE_ID,
            NOW - Math.floor(random() * 300) * DAY,
        );
    }

    const insertShared = db.prepare(
        'INSERT INTO wallet_goals_shared (id, goal_id, wallet_id, user_email, shared_by, shared_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    for (let i = 0; i < 20; i += 1) {
        insertShared.run(`s${i}`, `g${i}`, 'w1', USER_EMAIL, OTHER_PROFILE_ID, NOW, NOW);
    }

    db.exec('COMMIT');
    db.exec('ANALYZE');
    if (WITH_CANDIDATES) db.exec(CANDIDATE_INDEXES);
}

// ---------------------------------------------------------------------------
// Skenario query (disalin dari sumbernya — lihat pemeriksaan drift)
// ---------------------------------------------------------------------------

const SCOPE_WHERE = ` AND (
      wallet_id IN (
        SELECT id
        FROM wallets
        WHERE sync_status != 'pending_delete'
          AND (
            profile_id = ?
            OR id IN (
              SELECT wallet_id
              FROM wallet_members
              WHERE lower(user_email) = lower(?)
                AND sync_status != 'pending_delete'
            )
          )
      )
      OR (wallet_id IS NULL AND profile_id = ?)
    )`;

const TRANSACTIONS_WHERE =
    " WHERE sync_status != 'pending_delete'" +
    ' AND date >= ? AND date <= ?' +
    SCOPE_WHERE;

const SCENARIOS = [
    {
        id: 'S1',
        label: 'fetchTransactions — rentang tanggal + scope akses wallet',
        source: 'src/database/transactionQueries.ts',
        mainTable: 'transactions',
        sql: `SELECT * FROM transactions${TRANSACTIONS_WHERE} ORDER BY date DESC, created_at DESC`,
        params: () => [SIX_MONTHS_AGO, NOW, PROFILE_ID, USER_EMAIL, PROFILE_ID],
        drift: [' WHERE sync_status != \'pending_delete\'', 'ORDER BY date DESC, created_at DESC'],
    },
    {
        id: 'S2',
        label: 'fetchTransactions — halaman 500 baris (pagination §6.4)',
        source: 'src/database/transactionQueries.ts',
        mainTable: 'transactions',
        sql: `SELECT * FROM transactions${TRANSACTIONS_WHERE} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`,
        params: () => [SIX_MONTHS_AGO, NOW, PROFILE_ID, USER_EMAIL, PROFILE_ID, 500, 500],
        drift: ['ORDER BY date DESC, created_at DESC'],
    },
    {
        id: 'S3',
        label: 'fetchTransactionsTotals — agregat GROUP BY type',
        source: 'src/database/transactionQueries.ts',
        mainTable: 'transactions',
        sql: `SELECT type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions${TRANSACTIONS_WHERE} GROUP BY type`,
        params: () => [SIX_MONTHS_AGO, NOW, PROFILE_ID, USER_EMAIL, PROFILE_ID],
        drift: ['SELECT type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions'],
    },
    {
        id: 'S4',
        label: 'fetchSavingGoals — scope akses OR (profile/wallet/shared)',
        source: 'src/database/savingQueries.ts',
        mainTable: 'saving_goals',
        sql: `SELECT * FROM saving_goals WHERE sync_status != 'pending_delete' AND (
            profile_id = ?
            OR wallet_id IN (
                SELECT id
                FROM wallets
                WHERE sync_status != 'pending_delete'
                  AND (
                    profile_id = ?
                    OR id IN (
                        SELECT wallet_id
                        FROM wallet_members
                        WHERE lower(user_email) = lower(?)
                          AND sync_status != 'pending_delete'
                    )
                  )
            )
            OR id IN (
                SELECT goal_id
                FROM wallet_goals_shared
                WHERE lower(user_email) = lower(?)
            )
        ) AND is_completed = 0 ORDER BY created_at DESC`,
        params: () => [PROFILE_ID, PROFILE_ID, USER_EMAIL, USER_EMAIL],
        drift: ['SELECT * FROM saving_goals WHERE sync_status != \'pending_delete\'', 'ORDER BY created_at DESC'],
    },
];

// ---------------------------------------------------------------------------
// Eksekusi
// ---------------------------------------------------------------------------

function checkDrift(scenario) {
    const source = readFileSync(join(ROOT, scenario.source), 'utf8');
    const missing = scenario.drift.filter((fragment) => !source.includes(fragment));
    if (missing.length > 0) {
        console.warn(
            `\n  ! DRIFT: ${scenario.source} tidak lagi memuat:\n${missing
                .map((fragment) => `      ${fragment}`)
                .join('\n')}\n    Perbarui query di ${scenario.id} agar hasil tetap mewakili aplikasi.`,
        );
    }
}

function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
}

function runScenario(db, scenario) {
    checkDrift(scenario);

    const params = scenario.params();
    const planRows = db.prepare(`EXPLAIN QUERY PLAN ${scenario.sql}`).all(...params);
    const plan = planRows.map((row) => row.detail);

    const timings = [];
    for (let run = 0; run < RUNS; run += 1) {
        const started = process.hrtime.bigint();
        db.prepare(scenario.sql).all(...params);
        timings.push(Number(process.hrtime.bigint() - started) / 1e6);
    }

    // Tabel utama = tabel yang dibaca paling awal. SCAN pada tabel dimensi
    // kecil (wallets / wallet_members) itu normal karena barisnya sedikit;
    // yang menentukan indeks berguna adalah perilaku terhadap tabel utama.
    const usesMainIndex = plan.some((line) => line.includes(`SEARCH ${scenario.mainTable} `));

    console.log(`\n${scenario.id} — ${scenario.label}`);
    console.log(`   sumber : ${scenario.source}`);
    console.log(`   indeks : ${usesMainIndex ? 'pakai indeks' : `SCAN penuh ${scenario.mainTable}`}`);
    for (const line of plan) console.log(`   plan   : ${line}`);
    console.log(`   waktu  : median ${median(timings).toFixed(2)} ms dari ${RUNS} pelaksanaan`);

    return { id: scenario.id, mainTable: scenario.mainTable, usesMainIndex, plan };
}

function main() {
    console.log(`EXPLAIN QUERY PLAN — ${TRANSACTION_ROWS} transaksi, ${GOAL_ROWS} target`);
    console.log(`Indeks kandidat §6.4: ${WITH_CANDIDATES ? 'DIPASANG' : 'tidak dipasang (jalankan --candidates untuk membandingkan)'}`);

    const db = new DatabaseSync(':memory:');
    seed(db);

    const results = SCENARIOS.map((scenario) => runScenario(db, scenario));

    const scans = results.filter((result) => !result.usesMainIndex);
    console.log('\nRingkasan:');
    if (scans.length === 0) {
        console.log('   Semua skenario memakai indeks pada tabel utamanya.');
    } else {
        console.log(
            `   Tabel utama tanpa indeks pada: ${scans
                .map((result) => `${result.id} (${result.mainTable})`)
                .join(', ')}`,
        );
    }
    console.log('   Catatan §6.4: indeks kandidat idx_transactions_profile_date dan');
    console.log('   idx_saving_goals_wallet_completed tidak terpilih karena query');
    console.log('   menyaring lewat subquery wallet, bukan profile_id secara langsung.');
    console.log('   Bandingkan sendiri dengan: node scripts/explain-queries.mjs --candidates');
    db.close();
}

main();
