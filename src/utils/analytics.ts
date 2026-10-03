// Statistik keuangan murni untuk insight (roadmap P2-06, Tahap 1).
// Semua fungsi bekerja di atas array transaksi mentah — tidak ada akses
// database maupun jaringan — supaya mudah diuji dan aman dipanggil dari mana pun.
import type { CategorySummary, Transaction, TransactionType } from '../types/transaction';

/** Perpindahan bulan dalam angka (0 = bulan yang sama dengan `now`). */
function monthIndex(date: Date): number {
    return date.getFullYear() * 12 + date.getMonth();
}

/**
 * Deret pengeluaran per bulan, index terakhir = bulan berjalan.
 * Bulan tanpa transaksi diisi 0 supaya regresi tidak melompati bulan kosong.
 */
function monthlyExpenseSeries(transactions: Transaction[], months: number, now: number): number[] {
    const size = Math.max(1, Math.floor(months));
    const series = new Array<number>(size).fill(0);
    const currentMonth = monthIndex(new Date(now));

    for (const transaction of transactions) {
        if (transaction.type !== 'expense') continue;
        const distance = currentMonth - monthIndex(new Date(transaction.date));
        if (distance < 0 || distance >= size) continue;
        series[size - 1 - distance] += transaction.amount;
    }

    return series;
}

/** Regresi linier sederhana y = intercept + slope·x di atas index 0..n-1. */
function linearRegression(values: number[]): { slope: number; intercept: number } {
    const count = values.length;
    if (count < 2) return { slope: 0, intercept: values[0] ?? 0 };

    const meanX = (count - 1) / 2;
    const meanY = values.reduce((sum, value) => sum + value, 0) / count;
    let numerator = 0;
    let denominator = 0;

    values.forEach((value, index) => {
        numerator += (index - meanX) * (value - meanY);
        denominator += (index - meanX) ** 2;
    });

    const slope = denominator === 0 ? 0 : numerator / denominator;
    return { slope, intercept: meanY - slope * meanX };
}

/** Ambang "datar": slope di bawah ini dianggap tidak bergerak (dalam rupiah). */
const FLAT_SLOPE_EPSILON = 1;

export interface SpendingTrend {
    /** Pergerakan per bulan menurut regresi linier, dalam rupiah/bulan. */
    slope: number;
    /** Perubahan bulan pertama → bulan terakhir dalam deret, dalam persen. */
    percentChange: number;
    direction: 'up' | 'down' | 'flat';
}

/**
 * Tren pengeluaran beberapa bulan terakhir.
 * `percentChange` dihitung terhadap bulan pertama dalam deret; bila bulan itu
 * nol (misal data baru mulai di tengah periode) hasilnya 0 karena tidak ada
 * pembanding yang masuk akal.
 */
export function calculateSpendingTrend(
    transactions: Transaction[],
    months = 6,
    now: number = Date.now(),
): SpendingTrend {
    const series = monthlyExpenseSeries(transactions, months, now);
    if (!series.some((value) => value > 0)) {
        return { slope: 0, percentChange: 0, direction: 'flat' };
    }

    const { slope } = linearRegression(series);
    const baseline = series[0];
    const latest = series[series.length - 1];
    const percentChange = baseline > 0 ? ((latest - baseline) / baseline) * 100 : 0;
    const direction = Math.abs(slope) < FLAT_SLOPE_EPSILON ? 'flat' : slope > 0 ? 'up' : 'down';

    return { slope: Math.round(slope), percentChange: Math.round(percentChange), direction };
}

export interface Anomaly {
    transaction: Transaction;
    /** Berapa simpangan deviasi di atas rata-rata pengeluaran. */
    zScore: number;
}

/**
 * Deteksi transaksi tak lazim memakai z-score pada pengeluaran.
 * Butuh sampel minimum dan sebaran yang tidak seragam, kalau tidak anomali
 * mustahil dibedakan dari data normal.
 */
export function detectAnomalies(
    transactions: Transaction[],
    threshold = 2,
    minSamples = 5,
): Anomaly[] {
    const expenses = transactions.filter((transaction) => transaction.type === 'expense');
    if (expenses.length < minSamples) return [];

    const mean = expenses.reduce((sum, item) => sum + item.amount, 0) / expenses.length;
    const variance =
        expenses.reduce((sum, item) => sum + (item.amount - mean) ** 2, 0) / expenses.length;
    const standardDeviation = Math.sqrt(variance);
    if (standardDeviation <= 0) return [];

    return expenses
        .map((transaction) => ({
            transaction,
            zScore: (transaction.amount - mean) / standardDeviation,
        }))
        .filter((item) => item.zScore >= threshold)
        .sort((a, b) => b.zScore - a.zScore);
}

/**
 * Perkiraan pengeluaran bulan berikutnya: moving average 3 bulan terakhir
 * digeser oleh slope regresi, sehingga tren naik/turun ikut terbawa.
 * Hasil tidak pernah negatif.
 */
export function predictNextMonthSpending(
    transactions: Transaction[],
    months = 6,
    now: number = Date.now(),
): number {
    const series = monthlyExpenseSeries(transactions, months, now);
    if (!series.some((value) => value > 0)) return 0;

    const { slope } = linearRegression(series);
    const recentWindow = series.slice(-Math.min(3, series.length));
    const movingAverage = recentWindow.reduce((sum, value) => sum + value, 0) / recentWindow.length;

    return Math.max(0, Math.round(movingAverage + slope));
}

/**
 * Tingkat tabungan dalam persen: (pemasukan − pengeluaran) / pemasukan × 100.
 * Tanpa pemasukan hasilnya 0 (tidak ada basis perhitungan). Bisa negatif bila
 * defisit — nilai negatif justru informatif untuk insight.
 */
export function calculateSavingsRate(income: number, expense: number): number {
    if (income <= 0) return 0;
    return Math.round(((income - expense) / income) * 100);
}

/** Total per jenis transaksi. */
export function sumByType(
    transactions: Transaction[],
    type: TransactionType,
): number {
    return transactions.reduce(
        (sum, transaction) => (transaction.type === type ? sum + transaction.amount : sum),
        0,
    );
}

/**
 * Ringkasan kategori per jenis transaksi (versi murni dari ringkasan SQL).
 * Diurutkan dari yang terbesar, persentase dihitung terhadap total jenis itu.
 */
export function summarizeCategories(
    transactions: Transaction[],
    type: TransactionType,
): CategorySummary[] {
    const totals = new Map<string, { total: number; count: number }>();

    for (const transaction of transactions) {
        if (transaction.type !== type) continue;
        const entry = totals.get(transaction.category) ?? { total: 0, count: 0 };
        entry.total += transaction.amount;
        entry.count += 1;
        totals.set(transaction.category, entry);
    }

    const overall = [...totals.values()].reduce((sum, entry) => sum + entry.total, 0);

    return [...totals.entries()]
        .map(([category, entry]) => ({
            category,
            total: entry.total,
            count: entry.count,
            percentage: overall > 0 ? Math.round((entry.total / overall) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
}

export interface CategoryShift {
    category: string;
    currentAmount: number;
    previousAmount: number;
    /** (bulan berjalan − bulan lalu) / bulan lalu × 100. */
    percentChange: number;
}

/**
 * Nominal kecil di bulan lalu membuat persentase meledak jadi angka tidak
 * masuk akal, jadi butuh garis dasar minimum agar hasilnya layak tampil.
 */
const MIN_CATEGORY_BASELINE = 10_000;
/** Perubahan di bawah ini dianggap noise, bukan pergerakan nyata. */
const MIN_CATEGORY_CHANGE_PERCENT = 10;

/**
 * Kategori pengeluaran dengan pergeseran terbesar dibanding bulan lalu.
 * Mengembalikan `null` bila tidak ada kategori yang bergerak signifikan.
 */
export function compareCategorySpend(
    transactions: Transaction[],
    now: number = Date.now(),
): CategoryShift | null {
    const currentDate = new Date(now);
    const previousDate = new Date(now);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const currentMonth = monthIndex(currentDate);
    const previousMonth = monthIndex(previousDate);

    const amountsByCategory = new Map<string, { current: number; previous: number }>();
    for (const transaction of transactions) {
        if (transaction.type !== 'expense') continue;
        const distance = currentMonth - monthIndex(new Date(transaction.date));
        if (distance !== 0 && distance !== 1) continue;

        const entry = amountsByCategory.get(transaction.category) ?? { current: 0, previous: 0 };
        if (distance === 0) entry.current += transaction.amount;
        else entry.previous += transaction.amount;
        amountsByCategory.set(transaction.category, entry);
    }

    let best: CategoryShift | null = null;

    for (const [category, { current, previous }] of amountsByCategory) {
        if (previous < MIN_CATEGORY_BASELINE) continue;
        const percentChange = Math.round(((current - previous) / previous) * 100);
        if (Math.abs(percentChange) < MIN_CATEGORY_CHANGE_PERCENT) continue;
        if (!best || Math.abs(percentChange) > Math.abs(best.percentChange)) {
            best = { category, currentAmount: current, previousAmount: previous, percentChange };
        }
    }

    return best;
}
