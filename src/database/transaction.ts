// Transaksi SQLite yang aman dipakai bersama (semua modul query memakai SATU
// koneksi `SQLiteDatabase` dari schema.ts).
//
// Kenapa helper ini ada — `SQLiteDatabase.withTransactionAsync()` dari
// expo-sqlite memang tidak aman dipakai mentah:
//   1. TIDAK bisa di-nest. Implementasinya `BEGIN` → task → `COMMIT`, dan
//      `catch`-nya `ROLLBACK` lalu throw. Dipanggil di dalam transaksi yang
//      sedang berjalan, `BEGIN` gagal, `ROLLBACK`-nya malah menutup transaksi
//      milik pemanggil, lalu catch pemanggil memanggil `ROLLBACK` lagi →
//      "cannot rollback - no transaction is active". Error aslinya hilang,
//      tersembunyi di balik error rollback.
//   2. TIDAK aman dipakai konkuren. `db.execAsync()` tidak mia-mia antre;
//      dua transaksi yang tumpang tindih bisa saling menabrak BEGIN/COMMIT.
//
// Contoh nyata di repo ini:
//   - `processDueRecurringTransactions` (recurringProcessor.ts) membungkus
//     `insertTransaction` — yang membuka transaksinya sendiri → selalu nested.
//   - `loadCategories()` dipanggil dari 6 screen sekaligus saat app start →
//     6 `syncRemoteCategories()` berebut satu koneksi.
//
// Yang dilakukan helper ini: antre (mutex per koneksi) + nesting dianggap
// "gabung ke transaksi luar" (SQLite tidak punya nested transaction; memakai
// SAVEPOINT hanya menambah_surface tanpa manfaat di sini karena tidak ada
// kebutuhan rollback sebagian). Kegagalan ROLLBACK tidak menimpa error asli.
import type { SQLiteDatabase } from 'expo-sqlite';

type State = {
    /** Promise terakhir dalam antrean; transaksi baru menunggunya. */
    tail: Promise<void>;
    /** > 0 berarti ada transaksi yang sedang berjalan di koneksi ini. */
    depth: number;
};

const states = new WeakMap<SQLiteDatabase, State>();

const noop = () => {};

function stateOf(db: SQLiteDatabase): State {
    let state = states.get(db);
    if (!state) {
        state = { tail: Promise.resolve(), depth: 0 };
        states.set(db, state);
    }
    return state;
}

/** Transaksi paling luar: BEGIN/COMMIT, dengan antrean. */
async function runExclusive<T>(db: SQLiteDatabase, state: State, task: () => Promise<T>): Promise<T> {
    await db.execAsync('BEGIN');
    state.depth = 1;
    try {
        const result = await task();
        state.depth = 0;
        await db.execAsync('COMMIT');
        return result;
    } catch (error) {
        state.depth = 0;
        // Jangan biarkan kegagalan rollback menutupi error asli.
        await db.execAsync('ROLLBACK').catch(noop);
        throw error;
    }
}

/** Dipanggil dari dalam transaksi yang sedang berjalan: gabung, tanpa BEGIN. */
async function joinRunning<T>(state: State, task: () => Promise<T>): Promise<T> {
    state.depth += 1;
    try {
        return await task();
    } finally {
        state.depth -= 1;
    }
}

/**
 * Jalankan `task` di dalam satu transaksi, dengan jaminan:
 *   - tidak ada dua transaksi bersamaan pada koneksi yang sama,
 *   - pemanggilan di dalam transaksi lain tidak membuka transaksi baru,
 *   - error yang dilempar selalu error asli, bukan error rollback.
 */
export function runInTransaction<T>(db: SQLiteDatabase, task: () => Promise<T>): Promise<T> {
    const state = stateOf(db);

    if (state.depth > 0) {
        return joinRunning(state, task);
    }

    const run = state.tail.then(() => runExclusive(db, state, task));
    state.tail = run.then(noop, noop);
    return run;
}
