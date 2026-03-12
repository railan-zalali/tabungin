// Query database untuk tabel transactions
import { getDatabase } from "./schema";
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

/**
 * Tambah transaksi baru
 */
export async function insertTransaction(
  data: Omit<Transaction, "id" | "created_at"> & { wallet_id?: string; profile_id?: string },
): Promise<Transaction> {
  const db = await getDatabase();
  const id = uuidv4();
  const created_at = Date.now();
  const updated_at = created_at;
  const sync_status = "pending_create";

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
        data.profile_id || null,
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

  return { id, created_at, ...data };
}

/**
 * Ambil semua transaksi dengan filter opsional
 */
export async function fetchTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
  const db = await getDatabase();

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

  if (filter?.profile_id) {
    query += " AND profile_id = ?";
    params.push(filter.profile_id);
  }

  query += " ORDER BY date DESC, created_at DESC";

  return await db.getAllAsync<Transaction>(query, params);
}

/**
 * Ambil 5 transaksi terbaru
 */
export async function fetchRecentTransactions(
  limit = 5,
  profileId?: string,
): Promise<Transaction[]> {
  const db = await getDatabase();
  let query = "SELECT * FROM transactions WHERE sync_status != 'pending_delete'";
  const params: any[] = [];

  if (profileId) {
    query += " AND profile_id = ?";
    params.push(profileId);
  }

  query += " ORDER BY date DESC, created_at DESC LIMIT ?";
  params.push(limit);

  return await db.getAllAsync<Transaction>(query, params);
}

/**
 * Hapus transaksi berdasarkan ID
 * Menandai status sebagai pending_delete untuk disinkronkan
 */
export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase();

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
]);

export async function updateTransaction(
  id: string,
  data: Partial<Omit<Transaction, "id" | "created_at">>,
): Promise<void> {
  const db = await getDatabase();
  const safeEntries = Object.entries(data).filter(([key]) => TRANSACTION_UPDATABLE_FIELDS.has(key));
  if (safeEntries.length === 0) return;

  // Cek apakah transaksi ini pending_create, jika ya biarkan pending_create, jika tidak ubah jadi pending_update
  const current = await db.getFirstAsync<{ sync_status: string }>(
    "SELECT sync_status FROM transactions WHERE id = ?",
    [id],
  );
  let newStatus = "pending_update";
  if (current?.sync_status === "pending_create") {
    newStatus = "pending_create";
  }

  const fields = safeEntries.map(([key]) => `${key} = ?`).join(", ");
  const values = [...safeEntries.map(([, val]) => val), newStatus, Date.now(), id];

  await db.runAsync(
    `UPDATE transactions SET ${fields}, sync_status = ?, updated_at = ? WHERE id = ?`,
    values as (string | number | null)[],
  );
}

/**
 * Hitung ringkasan bulan ini
 */
export async function fetchMonthlySummary(profileId?: string): Promise<{
  totalIncome: number;
  totalExpense: number;
}> {
  const db = await getDatabase();
  const start = startOfMonth().getTime();
  const params = [start];

  let profileQuery = "";
  if (profileId) {
    profileQuery = " AND profile_id = ?";
    params.push(profileId);
  }

  const income = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ?${profileQuery}`,
    params,
  );
  const expense = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?${profileQuery}`,
    params,
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
): Promise<CategorySummary[]> {
  const db = await getDatabase();
  let query = `SELECT category, SUM(amount) as total, COUNT(*) as count
     FROM transactions
     WHERE type = ? AND date >= ? AND date <= ?`;
  const params: any[] = [type, startDate, endDate];

  if (profileId) {
    query += " AND profile_id = ?";
    params.push(profileId);
  }

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
export async function fetchMonthlyData(profileId?: string): Promise<MonthlySummary[]> {
  const db = await getDatabase();
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

    let query =
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ? AND date >= ? AND date <= ?";
    let params: any[] = [d.getTime(), endD.getTime()];

    if (profileId) {
      query += " AND profile_id = ?";
      params.push(profileId);
    }

    // Since we need to run this twice (income/expense), and query is dynamic, let's construct it properly
    const getQuery = (type: string) => {
      let q =
        "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ? AND date >= ? AND date <= ?";
      const p: any[] = [type, d.getTime(), endD.getTime()];
      if (profileId) {
        q += " AND profile_id = ?";
        p.push(profileId);
      }
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
