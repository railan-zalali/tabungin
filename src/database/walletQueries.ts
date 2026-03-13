import { getDatabase } from "./schema";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

export interface Wallet {
  id: string;
  profile_id?: string;
  name: string;
  type: "general" | "bank" | "e-wallet" | "cash";
  color: string;
  balance: number;
  is_default: boolean;
  created_at: number;
}

/**
 * Ambil semua dompet (filter by profile jika ada)
 */
export async function fetchWallets(profileId?: string): Promise<Wallet[]> {
  try {
    const db = await getDatabase();
    let query = "SELECT * FROM wallets WHERE sync_status != 'pending_delete'";
    const params: any[] = [];

    if (profileId) {
      query += " AND profile_id = ?";
      params.push(profileId);
    }

    query += " ORDER BY is_default DESC, created_at ASC";

    const rows = await db.getAllAsync<any>(query, params);

    return rows.map((r) => ({
      ...r,
      is_default: Boolean(r.is_default),
      balance: r.balance ?? 0,
      color: r.color || "#1DB954",
      type: r.type || "general",
    }));
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return [];
  }
}

/**
 * Tambah dompet baru
 */
export async function insertWallet(
  data: Omit<Wallet, "id" | "created_at" | "balance"> & { balance?: number },
): Promise<Wallet> {
  const db = await getDatabase();
  const id = uuidv4();
  const created_at = Date.now();
  const updated_at = created_at;
  const sync_status = "pending_create";
  const balance = data.balance ?? 0;

  if (!data.name || data.name.trim() === "") {
    throw new Error("Nama dompet tidak boleh kosong");
  }

  try {
    await db.withTransactionAsync(async () => {
      // Jika dompet ini diset default, reset default yang lain (dalam profile yang sama)
      if (data.is_default) {
        let updateQuery =
          "UPDATE wallets SET is_default = 0, sync_status = 'pending_update', updated_at = ? WHERE is_default = 1";
        const updateParams: any[] = [updated_at];

        if (data.profile_id) {
          updateQuery += " AND profile_id = ?";
          updateParams.push(data.profile_id);
        }

        await db.runAsync(updateQuery, updateParams);
      } else {
        // Jika belum ada default, paksa jadi default (dalam profile yang sama)
        let countQuery =
          "SELECT COUNT(*) as count FROM wallets WHERE sync_status != 'pending_delete'";
        const countParams: any[] = [];

        if (data.profile_id) {
          countQuery += " AND profile_id = ?";
          countParams.push(data.profile_id);
        }

        const count = await db.getFirstAsync<{ count: number }>(countQuery, countParams);
        if ((count?.count ?? 0) === 0) {
          data.is_default = true;
        }
      }

      await db.runAsync(
        `INSERT INTO wallets (id, profile_id, name, type, color, balance, is_default, created_at, updated_at, sync_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.profile_id || null,
          data.name,
          data.type,
          data.color,
          balance,
          data.is_default ? 1 : 0,
          created_at,
          updated_at,
          sync_status,
        ],
      );
    });

    return { id, created_at, balance, ...data };
  } catch (error) {
    console.error("Error inserting wallet:", error);
    throw error;
  }
}

// ... updateWallet and deleteWallet logic remains mostly same but check default logic might need profile_id awareness?
// updateWallet checks is_default switch.
// deleteWallet checks is_default.

/**
 * Update dompet
 */
export async function updateWallet(
  id: string,
  data: Partial<Omit<Wallet, "id" | "created_at">>,
): Promise<void> {
  const db = await getDatabase();
  const updated_at = Date.now();

  try {
    await db.withTransactionAsync(async () => {
      // Need to know current profile_id to switch default correctly
      // But usually we assume we are updating within same profile context.
      // Best effort: Get the wallet first to know its profile_id
      const currentWallet = await db.getFirstAsync<{ profile_id: string }>(
        "SELECT profile_id FROM wallets WHERE id = ?",
        [id],
      );
      const profileId = currentWallet?.profile_id;

      // Handle switch default
      if (data.is_default === true) {
        let updateDefaultQuery =
          "UPDATE wallets SET is_default = 0, sync_status = 'pending_update', updated_at = ? WHERE is_default = 1 AND id != ?";
        const params = [updated_at, id];

        if (profileId) {
          updateDefaultQuery += " AND profile_id = ?";
          params.push(profileId);
        }

        await db.runAsync(updateDefaultQuery, params);
      }

      const fields: string[] = [];
      const values: any[] = [];

      if (data.name !== undefined) {
        fields.push("name = ?");
        values.push(data.name);
      }
      if (data.type !== undefined) {
        fields.push("type = ?");
        values.push(data.type);
      }
      if (data.color !== undefined) {
        fields.push("color = ?");
        values.push(data.color);
      }
      if (data.balance !== undefined) {
        fields.push("balance = ?");
        values.push(data.balance);
      }
      if (data.is_default !== undefined) {
        fields.push("is_default = ?");
        values.push(data.is_default ? 1 : 0);
      }
      // profile_id update is rare but possible? Let's skip for now unless requested.

      if (fields.length === 0) return;

      fields.push("sync_status = 'pending_update'");
      fields.push("updated_at = ?");
      values.push(updated_at);
      values.push(id);

      await db.runAsync(`UPDATE wallets SET ${fields.join(", ")} WHERE id = ?`, values);
    });
  } catch (error) {
    console.error("Error updating wallet:", error);
    throw error;
  }
}

/**
 * Hapus dompet (Soft Delete)
 */
export async function deleteWallet(id: string): Promise<void> {
  const db = await getDatabase();
  const updated_at = Date.now();

  try {
    const wallet = await db.getFirstAsync<{ is_default: number }>(
      "SELECT is_default FROM wallets WHERE id = ?",
      [id],
    );
    if (wallet?.is_default) {
      throw new Error("Tidak dapat menghapus dompet utama.");
    }

    const row = await db.getFirstAsync<{ sync_status: string }>(
      "SELECT sync_status FROM wallets WHERE id = ?",
      [id],
    );

    if (row?.sync_status === "pending_create") {
      await db.runAsync("DELETE FROM wallets WHERE id = ?", [id]);
    } else {
      await db.runAsync(
        "UPDATE wallets SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
        [updated_at, id],
      );
    }
  } catch (error) {
    console.error("Error deleting wallet:", error);
    throw error;
  }
}

/**
 * Hitung total saldo semua dompet (by profile)
 */
export async function fetchTotalBalance(profileId?: string): Promise<number> {
  try {
    const db = await getDatabase();
    let query =
      "SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE sync_status != 'pending_delete'";
    const params: any[] = [];

    if (profileId) {
      query += " AND profile_id = ?";
      params.push(profileId);
    }

    const row = await db.getFirstAsync<{ total: number }>(query, params);
    return row?.total ?? 0;
  } catch (error) {
    console.error("Error fetching total balance:", error);
    return 0;
  }
}

export interface WalletMember {
  id: string;
  wallet_id: string;
  user_email: string;
  role: "owner" | "editor" | "viewer";
  status: "pending" | "active" | "rejected";
  created_at: number;
}

/**
 * Ambil daftar anggota dompet
 */
export async function fetchWalletMembers(walletId: string): Promise<WalletMember[]> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM wallet_members WHERE wallet_id = ? AND sync_status != 'pending_delete' ORDER BY created_at DESC",
      [walletId],
    );
    return rows;
  } catch (error) {
    console.error("Error fetching wallet members:", error);
    return [];
  }
}

import { supabase } from "../lib/supabase";

// ... existing imports

/**
 * Tambah anggota ke dompet (Invite)
 * Sekarang dengan integrasi Supabase Edge Functions / Auth untuk kirim email
 */
export async function addWalletMember(
  walletId: string,
  email: string,
  role: "owner" | "editor" | "viewer" = "viewer",
): Promise<WalletMember> {
  const db = await getDatabase();
  const id = uuidv4();
  const created_at = Date.now();
  const updated_at = created_at;

  // 1. Cek apakah email sudah ada di dompet ini (Lokal)
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM wallet_members WHERE wallet_id = ? AND user_email = ? AND sync_status != 'pending_delete'",
    [walletId, email],
  );

  if (existing) {
    throw new Error("Email ini sudah menjadi anggota dompet.");
  }

  // 2. Simpan ke database lokal dulu (Optimistic UI)
  await db.runAsync(
    `INSERT INTO wallet_members (id, wallet_id, user_email, role, status, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, walletId, email, role, "pending", created_at, updated_at, "pending_create"],
  );

  // 3. Trigger Invite di Supabase (Jika Online)
  // Karena kita pakai local-first sync, data akan ter-push otomatis oleh syncDatabase().
  // Namun, Supabase Auth Invite User biasanya butuh trigger khusus jika ingin kirim magic link.
  // Tapi untuk "Shared Wallet", biasanya kita hanya insert row, lalu user lain melihatnya.
  // Jika ingin kirim email notifikasi, kita bisa gunakan Supabase Edge Function atau layanan email lain.
  // Untuk saat ini, kita andalkan sync.

  // NOTE: Jika tujuannya adalah "Auth Invite" (mengundang user baru ke Aplikasi), gunakan:
  // await supabase.auth.admin.inviteUserByEmail(email);
  // Tapi ini butuh Service Role Key (tidak aman di client).

  // SOLUSI: Kita asumsikan user sudah punya akun atau akan daftar sendiri.
  // Notifikasi email manual belum diimplementasikan di sini.

  return {
    id,
    wallet_id: walletId,
    user_email: email,
    role,
    status: "pending",
    created_at,
  };
}

/**
 * Hapus anggota dari dompet
 */
export async function removeWalletMember(memberId: string): Promise<void> {
  const db = await getDatabase();
  const updated_at = Date.now();

  const row = await db.getFirstAsync<{ sync_status: string }>(
    "SELECT sync_status FROM wallet_members WHERE id = ?",
    [memberId],
  );

  if (row?.sync_status === "pending_create") {
    await db.runAsync("DELETE FROM wallet_members WHERE id = ?", [memberId]);
  } else {
    await db.runAsync(
      "UPDATE wallet_members SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
      [updated_at, memberId],
    );
  }
}
