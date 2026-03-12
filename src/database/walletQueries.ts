
import { getDatabase } from './schema';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface Wallet {
    id: string;
    name: string;
    type: 'general' | 'bank' | 'e-wallet' | 'cash';
    color: string;
    balance: number;
    is_default: boolean;
    created_at: number;
}

/**
 * Ambil semua dompet
 */
export async function fetchWallets(): Promise<Wallet[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
        "SELECT * FROM wallets WHERE sync_status != 'pending_delete' ORDER BY is_default DESC, created_at ASC"
    );
    
    return rows.map(r => ({
        ...r,
        is_default: Boolean(r.is_default)
    }));
}

/**
 * Tambah dompet baru
 */
export async function insertWallet(
    data: Omit<Wallet, 'id' | 'created_at' | 'balance'> & { balance?: number }
): Promise<Wallet> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = Date.now();
    const updated_at = created_at;
    const sync_status = 'pending_create';
    const balance = data.balance ?? 0;

    // Jika dompet ini diset default, reset default yang lain
    if (data.is_default) {
        await db.runAsync(
            "UPDATE wallets SET is_default = 0, sync_status = 'pending_update', updated_at = ? WHERE is_default = 1",
            [updated_at]
        );
    } else {
        // Jika belum ada default, paksa jadi default
        const count = await db.getFirstAsync<{count: number}>("SELECT COUNT(*) as count FROM wallets WHERE sync_status != 'pending_delete'");
        if ((count?.count ?? 0) === 0) {
            data.is_default = true;
        }
    }

    await db.runAsync(
        `INSERT INTO wallets (id, name, type, color, balance, is_default, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.name, data.type, data.color, balance, data.is_default ? 1 : 0, created_at, updated_at, sync_status]
    );

    return { id, created_at, balance, ...data };
}

/**
 * Update dompet
 */
export async function updateWallet(
    id: string,
    data: Partial<Omit<Wallet, 'id' | 'created_at'>>
): Promise<void> {
    const db = await getDatabase();
    const updated_at = Date.now();

    // Handle switch default
    if (data.is_default === true) {
        await db.runAsync(
            "UPDATE wallets SET is_default = 0, sync_status = 'pending_update', updated_at = ? WHERE is_default = 1 AND id != ?",
            [updated_at, id]
        );
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.balance !== undefined) { fields.push('balance = ?'); values.push(data.balance); }
    if (data.is_default !== undefined) { fields.push('is_default = ?'); values.push(data.is_default ? 1 : 0); }

    if (fields.length === 0) return;

    fields.push("sync_status = 'pending_update'");
    fields.push("updated_at = ?");
    values.push(updated_at);
    values.push(id);

    await db.runAsync(
        `UPDATE wallets SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
}

/**
 * Hapus dompet (Soft Delete)
 * Transaksi terkait tidak dihapus, tapi wallet_id-nya dibiarkan (atau bisa diset NULL, tapi soft delete wallet lebih aman)
 */
export async function deleteWallet(id: string): Promise<void> {
    const db = await getDatabase();
    const updated_at = Date.now();

    // Cek apakah default wallet
    const wallet = await db.getFirstAsync<{is_default: number}>("SELECT is_default FROM wallets WHERE id = ?", [id]);
    if (wallet?.is_default) {
        throw new Error("Tidak dapat menghapus dompet utama. Jadikan dompet lain sebagai utama terlebih dahulu.");
    }

    const row = await db.getFirstAsync<{ sync_status: string }>('SELECT sync_status FROM wallets WHERE id = ?', [id]);
    
    if (row?.sync_status === 'pending_create') {
        await db.runAsync('DELETE FROM wallets WHERE id = ?', [id]);
    } else {
        await db.runAsync(
            "UPDATE wallets SET sync_status = 'pending_delete', updated_at = ? WHERE id = ?",
            [updated_at, id]
        );
    }
}

/**
 * Hitung total saldo semua dompet
 */
export async function fetchTotalBalance(): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE sync_status != 'pending_delete'"
    );
    return row?.total ?? 0;
}
