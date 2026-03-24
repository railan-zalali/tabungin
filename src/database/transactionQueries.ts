// Query database untuk tabel transactions
import { getInitializedDatabase } from "./schema";
import type {
  Transaction,
  TransactionFilter,
  DailySummary,
  MonthlySummary,
  CategorySummary,
} from "../types/transaction";
import { startOfDay, endOfDay, startOfMonth } from "../utils/date";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

function applyAccessibleTransactionScope(
  query: string,
  params: (string | number)[],
  profileId?: string,
  userEmail?: string,
): string {
  if (profileId && userEmail) {
    query += ` AND (
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
    params.push(profileId, userEmail, profileId);
  } else if (profileId) {
    query += " AND profile_id = ?";
    params.push(profileId);
  }

  return query;
}

/**
 * Tambah transaksi baru
 */
export async function insertTransaction(
  data: Omit<Transaction, "id" | "created_at"> & { wallet_id?: string; profile_id?: string },
): Promise<Transaction> {
  const db = await getInitializedDatabase();
  const id = uuidv4();
  const created_at = Date.now();
  const updated_at = created_at;
  const sync_status = "pending_create";
  let resolvedProfileId = data.profile_id || null;

  if (data.wallet_id) {
    const wallet = await db.getFirstAsync<{ profile_id: string | null }>(
      "SELECT profile_id FROM wallets WHERE id = ?",
      [data.wallet_id],
    );
    if (wallet?.profile_id) {
      resolvedProfileId = wallet.profile_id;
    }
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO transactions (id, type, amount, category, note, date, created_at, updated_at, sync_status, wallet_id, profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        data.type,
        data.amount,
        data.category,
        data.note || null,
        data.date,
        created_at,
        updated_at,
        sync_status,
        data.wallet_id || null,
        resolvedProfileId,
      ],
    );

    // Update Saldo Wallet
    if (data.wallet_id) {
      const operator = data.type === "income" ? "+" : "-";
      await db.runAsync(
        `UPDATE wallets SET balance = balance ${operator} ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?`,
        [data.amount, updated_at, data.wallet_id],
      );
    }
  });

  return { id, created_at, ...data, profile_id: resolvedProfileId || undefined };
}

/**
 * Ambil semua transaksi dengan filter opsional
 */
export async function fetchTransactions(filter?: TransactionFilter & { userEmail?: string }): Promise<Transaction[]> {
  const db = await getInitializedDatabase();

  let query = "SELECT * FROM transactions WHERE sync_status != 'pending_delete'";
  const params: (string | number)[] = [];

  if (filter?.type && filter.type !== "all") {
    query += " AND type = ?";
    params.push(filter.type);
  }

  if (filter?.period) {
    const now = Date.now();
    const today = new Date();
    if (filter.period === "today") {
      query += " AND date >= ? AND date <= ?";
      params.push(startOfDay(today).getTime(), endOfDay(today).getTime());
    } else if (filter.period === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      query += " AND date >= ?";
      params.push(weekAgo.getTime());
    } else if (filter.period === "month") {
      query += " AND date >= ?";
      params.push(startOfMonth().getTime());
    } else if (filter.period === "custom" && filter.startDate && filter.endDate) {
      query += " AND date >= ? AND date <= ?";
      params.push(filter.startDate, filter.endDate);
    }
  }

  if (filter?.searchQuery) {
    query += " AND (note LIKE ? OR category LIKE ?)";
    const s = `%${filter.searchQuery}%`;
    params.push(s, s);
  }

  query = applyAccessibleTransactionScope(query, params, filter?.profile_id, filter?.userEmail);

  query += " ORDER BY date DESC, created_at DESC";

  return await db.getAllAsync<Transaction>(query, params);
}

/**
 * Ambil satu transaksi berdasarkan ID dengan scope akses user yang sama
 */
export async function fetchTransactionById(
  id: string,
  profileId?: string,
  userEmail?: string,
): Promise<Transaction | null> {
  const db = await getInitializedDatabase();
  let query = "SELECT * FROM transactions WHERE id = ? AND sync_status != 'pending_delete'";
  const params: (string | number)[] = [id];

  query = applyAccessibleTransactionScope(query, params, profileId, userEmail);

  return await db.getFirstAsync<Transaction>(query, params);
}

/**
 * Ambil 5 transaksi terbaru
 */
export async function fetchRecentTransactions(
  limit = 5,
  profileId?: string,
  userEmail?: string,
): Promise<Transaction[]> {
  const db = await getInitializedDatabase();
  let query = "SELECT * FROM transactions WHERE sync_status != 'pending_delete'";
  const params: any[] = [];

  query = applyAccessibleTransactionScope(query, params, profileId, userEmail);

  query += " ORDER BY date DESC, created_at DESC LIMIT ?";
  params.push(limit);

  return await db.getAllAsync<Transaction>(query, params);
}

/**
 * Hapus transaksi berdasarkan ID
 * Menandai status sebagai pending_delete untuk disinkronkan
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getInitializedDatabase();

  // Cek status sync dan data transaksi dulu
  const current = await db.getFirstAsync<{
    sync_status: string;
    wallet_id: string | null;
    type: string;
    amount: number;
  }>("SELECT sync_status, wallet_id, type, amount FROM transactions WHERE id = ?", [id]);

  if (!current) return;

  await db.withTransactionAsync(async () => {
    // Revert saldo wallet jika ada
    if (current.wallet_id) {
      const operator = current.type === "income" ? "-" : "+"; // Kebalikan dari transaksi
      await db.runAsync(
        `UPDATE wallets SET balance = balance ${operator} ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?`,
        [current.amount, Date.now(), current.wallet_id],
      );
    }

    if (current.sync_status === "pending_create") {
      // Belum pernah disync ke server, aman untuk hard delete
      await db.runAsync("DELETE FROM transactions WHERE id = ?", [id]);
    } else {
      // Soft delete: tandai untuk dihapus saat sync berikutnya
      await db.runAsync(
        "UPDATE transactions SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
        [Date.now(), id],
      );
    }
  });
}

/**
 * Update transaksi
 * Hanya kolom yang ada di whitelist yang boleh diupdate (mencegah SQL injection)
 */
const TRANSACTION_UPDATABLE_FIELDS: ReadonlySet<string> = new Set([
  "type",
  "amount",
  "category",
  "note",
  "date",
  "wallet_id",
  "profile_id",
]);

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, "id" | "created_at">>,
): Promise<void> {
  const db = await getInitializedDatabase();
  const safeEntries = Object.entries(data).filter(([key]) => TRANSACTION_UPDATABLE_FIELDS.has(key));
  if (safeEntries.length === 0) return;

  const current = await db.getFirstAsync<{
    type: Transaction["type"];
    amount: number;
    wallet_id: string | null;
    profile_id: string | null;
    sync_status: string;
  }>(
    "SELECT type, amount, wallet_id, profile_id, sync_status FROM transactions WHERE id = ?",
    [id],
  );
  if (!current) return;

  const nextTransaction = {
    ...current,
    ...data,
    wallet_id: data.wallet_id !== undefined ? data.wallet_id ?? null : current.wallet_id,
    profile_id: data.profile_id !== undefined ? data.profile_id ?? null : current.profile_id,
  };

  if (nextTransaction.wallet_id) {
    const wallet = await db.getFirstAsync<{ profile_id: string | null }>(
      "SELECT profile_id FROM wallets WHERE id = ?",
      [nextTransaction.wallet_id],
    );
    if (wallet) {
      nextTransaction.profile_id = wallet.profile_id;
    }
  }

  // Cek apakah transaksi ini pending_create, jika ya biarkan pending_create, jika tidak ubah jadi pending_update
  let newStatus = "pending_update";
  if (current?.sync_status === "pending_create") {
    newStatus = "pending_create";
  }

  const balanceAffectsWallet =
    current.wallet_id !== nextTransaction.wallet_id ||
    current.amount !== nextTransaction.amount ||
    current.type !== nextTransaction.type;

  const mappedEntries = safeEntries.map(([key]) => {
    if (key === "wallet_id") return [key, nextTransaction.wallet_id] as const;
    if (key === "profile_id") return [key, nextTransaction.profile_id] as const;
    return [key, nextTransaction[key as keyof typeof nextTransaction]] as const;
  });

  const profileAlreadyIncluded = mappedEntries.some(([key]) => key === "profile_id");
  if (!profileAlreadyIncluded && nextTransaction.profile_id !== current.profile_id) {
    mappedEntries.push(["profile_id", nextTransaction.profile_id]);
  }

  const fields = mappedEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = [...mappedEntries.map(([, val]) => val), newStatus, Date.now(), id];

  await db.withTransactionAsync(async () => {
    if (balanceAffectsWallet && current.wallet_id) {
      const revertOperator = current.type === "income" ? "-" : "+";
      await db.runAsync(
        `UPDATE wallets SET balance = balance ${revertOperator} ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?`,
        [current.amount, Date.now(), current.wallet_id],
      );
    }

    await db.runAsync(
      `UPDATE transactions SET ${fields}, sync_status = ?, updated_at = ? WHERE id = ?`,
      values as (string | number | null)[],
    );

    if (balanceAffectsWallet && nextTransaction.wallet_id) {
      const applyOperator = nextTransaction.type === "income" ? "+" : "-";
      await db.runAsync(
        `UPDATE wallets SET balance = balance ${applyOperator} ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?`,
        [nextTransaction.amount, Date.now(), nextTransaction.wallet_id],
      );
    }
  });
}

/**
 * Hitung ringkasan bulan ini
 */
export async function fetchMonthlySummary(profileId?: string, userEmail?: string): Promise<{
  totalIncome: number;
  totalExpense: number;
}> {
  const db = await getInitializedDatabase();
  const start = startOfMonth().getTime();
  const incomeParams: (string | number)[] = ["income", start];
  const expenseParams: (string | number)[] = ["expense", start];
  const baseQuery =
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE sync_status != 'pending_delete' AND type = ? AND date >= ?";

  const income = await db.getFirstAsync<{ total: number }>(
    applyAccessibleTransactionScope(baseQuery, incomeParams, profileId, userEmail),
    incomeParams,
  );
  const expense = await db.getFirstAsync<{ total: number }>(
    applyAccessibleTransactionScope(baseQuery, expenseParams, profileId, userEmail),
    expenseParams,
  );

  return {
    totalIncome: income?.total ?? 0,
    totalExpense: expense?.total ?? 0,
  };
}

/**
 * Hitung ringkasan per kategori untuk laporan
 */
export async function fetchCategorySummary(
  type: "expense" | "income",
  startDate: number,
  endDate: number,
  profileId?: string,
  userEmail?: string,
): Promise<CategorySummary[]> {
  const db = await getInitializedDatabase();
  let query = `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE type = ? AND date >= ? AND date <= ?`;
  const params: any[] = [type, startDate, endDate];

  query += " AND sync_status != 'pending_delete'";
  query = applyAccessibleTransactionScope(query, params, profileId, userEmail);

  query += ` GROUP BY category ORDER BY total DESC`;

  const rows = await db.getAllAsync<{ category: string; total: number; count: number }>(
    query,
    params,
  );

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0);

  return rows.map((r) => ({
    category: r.category,
    total: r.total,
    count: r.count,
    percentage: grandTotal > 0 ? (r.total / grandTotal) * 100 : 0,
  }));
}

/**
 * Ambil data per bulan untuk 6 bulan terakhir
 */
export async function fetchMonthlyData(profileId?: string, userEmail?: string): Promise<MonthlySummary[]> {
  const db = await getInitializedDatabase();
  const results: MonthlySummary[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    d.setHours(0, 0, 0, 0);

    const endD = new Date(d);
    endD.setMonth(endD.getMonth() + 1);
    endD.setDate(0);
    endD.setHours(23, 59, 59, 999);

    const getQuery = (type: string) => {
      let q =
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ? AND date >= ? AND date <= ?";
      const p: any[] = [type, d.getTime(), endD.getTime()];
      q += " AND sync_status != 'pending_delete'";
      q = applyAccessibleTransactionScope(q, p, profileId, userEmail);
      return { q, p };
    };

    const incomeQ = getQuery("income");
    const income = await db.getFirstAsync<{ total: number }>(incomeQ.q, incomeQ.p);

    const expenseQ = getQuery("expense");
    const expense = await db.getFirstAsync<{ total: number }>(expenseQ.q, expenseQ.p);

    const totalIncome = income?.total ?? 0;
    const totalExpense = expense?.total ?? 0;

    results.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    });
  }

  return results;
}

