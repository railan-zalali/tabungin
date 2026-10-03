// InsightEngine: menerjemahkan data transaksi menjadi kartu insight siap tampil
// (roadmap P2-06, Tahap 1). Murni dan bebas UI — layar cukup merender hasilnya.
import type { Transaction } from '../types/transaction';
import {
    calculateSavingsRate,
    calculateSpendingTrend,
    compareCategorySpend,
    detectAnomalies,
    predictNextMonthSpending,
    summarizeCategories,
    sumByType,
} from './analytics';
import { formatCurrency } from './currency';

export type InsightTone = 'success' | 'warning' | 'info' | 'neutral';

export type InsightId =
    | 'unusual-spend'
    | 'savings-rate'
    | 'spending-trend'
    | 'category-shift'
    | 'forecast'
    | 'top-category';

export interface Insight {
    id: InsightId;
    icon: string;
    tone: InsightTone;
    title: string;
    description: string;
}

export interface InsightOptions {
    /** Batas akhir pembacaan data; default sekarang. */
    now?: number;
    /** Jendela analisis dalam bulan; default 6. */
    months?: number;
    /** Penerjemah kunci kategori ke nama tampilan (lihat `resolveCategoryByKey`). */
    resolveCategory?: (key: string) => string;
}

/** Target tabungan yang dipakai dalam narasi insight. */
export const IDEAL_SAVINGS_RATE = 20;
/** Perubahan minimal agar tren/geseran kategori layak diberitakan. */
const MIN_TREND_PERCENT = 5;

/**
 * Susun daftar insight dari transaksi `months` bulan terakhir.
 * Urutannya dari yang paling mendesak; layar bebas memotongnya sesuai kebutuhan.
 */
export function buildInsights(
    transactions: Transaction[],
    options: InsightOptions = {},
): Insight[] {
    const { now = Date.now(), months = 6, resolveCategory = (key: string) => key } = options;
    const insights: Insight[] = [];

    const income = sumByType(transactions, 'income');
    const expense = sumByType(transactions, 'expense');
    const expenses = transactions.filter((transaction) => transaction.type === 'expense');
    const meanExpense =
        expenses.length > 0 ? expense / expenses.length : 0;

    // 1. Transaksi tak lazim — paling mendesak, taruh paling atas.
    const anomalies = detectAnomalies(transactions);
    const anomaly = anomalies[0];
    if (anomaly && meanExpense > 0) {
        const ratio = Math.round((anomaly.transaction.amount / meanExpense) * 10) / 10;
        insights.push({
            id: 'unusual-spend',
            icon: 'alert-decagram-outline',
            tone: 'warning',
            title: 'Ada transaksi yang tidak lazim',
            description: `${formatCurrency(anomaly.transaction.amount)} untuk ${resolveCategory(
                anomaly.transaction.category,
            )} sekitar ${ratio}× rata-rata pengeluaranmu. Cek apakah ini memang direncanakan.`,
        });
    }

    // 2. Tingkat tabungan.
    if (income > 0) {
        const rate = calculateSavingsRate(income, expense);
        if (rate >= IDEAL_SAVINGS_RATE) {
            insights.push({
                id: 'savings-rate',
                icon: 'piggy-bank-outline',
                tone: 'success',
                title: `Menabung ${rate}% dari pemasukan`,
                description: `Di atas target ideal ${IDEAL_SAVINGS_RATE}% selama ${months} bulan terakhir. Arus kas kamu sehat, pertahankan ritmenya.`,
            });
        } else if (rate > 0) {
            insights.push({
                id: 'savings-rate',
                icon: 'piggy-bank-outline',
                tone: 'warning',
                title: `Menabung ${rate}% dari pemasukan`,
                description: `Target idealnya ${IDEAL_SAVINGS_RATE}%. Sedikit penyesuaian pada pengeluaran fleksibel sudah cukup untuk mendekatinya.`,
            });
        } else {
            insights.push({
                id: 'savings-rate',
                icon: 'piggy-bank-outline',
                tone: 'warning',
                title: 'Pengeluaran melampaui pemasukan',
                description: `Selama ${months} bulan terakhir pengeluaranmu lebih tinggi ${formatCurrency(
                    expense - income,
                )} dari pemasukan.`,
            });
        }
    }

    // 3. Tren pengeluaran.
    const trend = calculateSpendingTrend(transactions, months, now);
    if (trend.direction !== 'flat' && Math.abs(trend.percentChange) >= MIN_TREND_PERCENT) {
        const rising = trend.direction === 'up';
        insights.push({
            id: 'spending-trend',
            icon: rising ? 'trending-up' : 'trending-down',
            tone: rising ? 'warning' : 'success',
            title: `Pengeluaran ${rising ? 'naik' : 'turun'} ${Math.abs(trend.percentChange)}%`,
            description: `Dibanding awal periode ${months} bulan, rata-rata belanjamu bergerak ${formatCurrency(
                Math.abs(trend.slope),
            )} per bulan.`,
        });
    }

    // 4. Pergeseran kategori terhadap bulan lalu.
    const shift = compareCategorySpend(transactions, now);
    if (shift) {
        const rising = shift.percentChange > 0;
        insights.push({
            id: 'category-shift',
            icon: 'chart-box-outline',
            tone: rising ? 'warning' : 'success',
            title: `Pengeluaran ${resolveCategory(shift.category)} ${
                rising ? 'naik' : 'turun'
            } ${Math.abs(shift.percentChange)}%`,
            description: `Bulan lalu ${formatCurrency(shift.previousAmount)}, bulan ini ${formatCurrency(
                shift.currentAmount,
            )}.`,
        });
    }

    // 5. Perkiraan bulan depan.
    const predicted = predictNextMonthSpending(transactions, months, now);
    if (predicted > 0) {
        insights.push({
            id: 'forecast',
            icon: 'calendar-clock',
            tone: 'info',
            title: 'Perkiraan pengeluaran bulan depan',
            description: `Dengan tren saat ini, pengeluaran diperkirakan sekitar ${formatCurrency(
                predicted,
            )}. Pakai sebagai patokan menyusun anggaran.`,
        });
    }

    // 6. Kategori terbesar — konteks dasar yang selalu berguna.
    if (expense > 0) {
        const [top] = summarizeCategories(transactions, 'expense');
        if (top) {
            insights.push({
                id: 'top-category',
                icon: 'chart-pie',
                tone: 'neutral',
                title: 'Kategori pengeluaran terbesar',
                description: `${resolveCategory(top.category)} menyerap ${formatCurrency(
                    top.total,
                )} atau ${top.percentage}% dari pengeluaran.`,
            });
        }
    }

    return insights;
}
