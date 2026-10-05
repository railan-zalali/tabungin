import { getInitializedDatabase } from './schema';
import { calculateNextOccurrence, type RecurringTransaction } from './recurringQueries';
import { insertTransaction } from './transactionQueries';
import { v4 as uuidv4 } from 'uuid';

/**
 * Memproses semua transaksi berulang yang jatuh tempo dan membuat transaksi aktual.
 */
export async function processDueRecurringTransactions(userId: string): Promise<number> {
    const db = await getInitializedDatabase();
    const now = Date.now();
    let generatedCount = 0;

    // Ambil transaksi berulang yang aktif dan sudah masuk waktunya (next_occurrence <= now)
    const dueRecurring = await db.getAllAsync<RecurringTransaction>(
        `SELECT * FROM recurring_transactions
         WHERE user_id = ? AND is_active = 1 AND next_occurrence <= ?
         ORDER BY next_occurrence ASC`,
        [userId, now]
    );

    if (dueRecurring.length === 0) return 0;

    await db.withTransactionAsync(async () => {
        for (const recurring of dueRecurring) {
            // Jika ada end_date dan sudah lewat, nonaktifkan
            if (recurring.end_date && recurring.next_occurrence > recurring.end_date) {
                await db.runAsync(
                    `UPDATE recurring_transactions SET is_active = 0, updated_at = ?,
                     sync_status = CASE WHEN sync_status = 'pending_create' THEN 'pending_create' ELSE 'pending_update' END
                     WHERE id = ?`,
                    [now, recurring.id]
                );
                continue;
            }

            // Generate transaksi
            await insertTransaction({
                wallet_id: recurring.wallet_id || '', // Sesuaikan null dengan empty string jika required
                category: recurring.category,
                amount: recurring.amount,
                type: recurring.type,
                note: recurring.note ? `[Auto] ${recurring.note}` : '[Auto] Transaksi Rutin',
                date: recurring.next_occurrence,
                // tambahkan ke reference (atau note) jika dibutuhkan
            });

            generatedCount++;

            // Hitung jadwal berikutnya
            const nextOccurrence = calculateNextOccurrence({
                ...recurring,
                last_generated_at: recurring.next_occurrence,
            });

            // Update recurring_transactions
            await db.runAsync(
                `UPDATE recurring_transactions
                 SET last_generated_at = ?, next_occurrence = ?, updated_at = ?,
                 sync_status = CASE WHEN sync_status = 'pending_create' THEN 'pending_create' ELSE 'pending_update' END
                 WHERE id = ?`,
                [recurring.next_occurrence, nextOccurrence, now, recurring.id]
            );
        }
    });

    return generatedCount;
}
