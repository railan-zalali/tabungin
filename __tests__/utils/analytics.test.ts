import {
    calculateSavingsRate,
    calculateSpendingTrend,
    compareCategorySpend,
    detectAnomalies,
    predictNextMonthSpending,
    summarizeCategories,
    sumByType,
} from '../../src/utils/analytics';
import type { Transaction } from '../../src/types/transaction';

/** 3 Oktober 2026, jam 12 — acuan waktu yang sama untuk semua test. */
const NOW = new Date(2026, 9, 3, 12, 0, 0).getTime();

let counter = 0;

function dateMonthsAgo(monthsAgo: number, day = 15): number {
    const date = new Date(NOW);
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(day);
    return date.getTime();
}

function tx(partial: Partial<Transaction> & { date?: number }): Transaction {
    counter += 1;
    const date = partial.date ?? NOW;
    return {
        id: `tx-${counter}`,
        type: 'expense',
        amount: 100_000,
        category: 'makan',
        note: null,
        date,
        created_at: date,
        ...partial,
    };
}

describe('calculateSpendingTrend', () => {
    it('mengembalikan flat bila tidak ada pengeluaran', () => {
        expect(calculateSpendingTrend([], 6, NOW)).toEqual({ slope: 0, percentChange: 0, direction: 'flat' });
    });

    it('abaikan transaksi pemasukan', () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
            tx({ type: 'income', amount: 500_000, date: dateMonthsAgo(5 - index) }),
        );
        expect(calculateSpendingTrend(transactions, 6, NOW).direction).toBe('flat');
    });

    it('membaca deret naik menjadi direction up dengan persentase kenaikan', () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
            tx({ amount: 100_000 + index * 20_000, date: dateMonthsAgo(5 - index) }),
        );

        const trend = calculateSpendingTrend(transactions, 6, NOW);

        expect(trend.direction).toBe('up');
        expect(trend.slope).toBeGreaterThan(0);
        // 100.000 -> 200.000
        expect(trend.percentChange).toBe(100);
    });

    it('membaca deret turun menjadi direction down', () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
            tx({ amount: 200_000 - index * 20_000, date: dateMonthsAgo(5 - index) }),
        );

        const trend = calculateSpendingTrend(transactions, 6, NOW);

        expect(trend.direction).toBe('down');
        expect(trend.slope).toBeLessThan(0);
        expect(trend.percentChange).toBe(-50);
    });

    it('persentase nol bila bulan pertama dalam deret kosong', () => {
        const transactions = [
            tx({ amount: 300_000, date: dateMonthsAgo(1) }),
            tx({ amount: 300_000, date: dateMonthsAgo(0) }),
        ];

        const trend = calculateSpendingTrend(transactions, 6, NOW);

        // Tanpa pembanding di bulan pertama, perubahan tidak bisa dihitung.
        expect(trend.percentChange).toBe(0);
        expect(Math.abs(trend.percentChange)).toBeLessThan(5);
    });
});

describe('detectAnomalies', () => {
    it('menandai transaksi yang jauh di atas rata-rata', () => {
        const normal = Array.from({ length: 6 }, (_, index) => tx({ amount: 100_000, date: dateMonthsAgo(index) }));
        const outlier = tx({ amount: 1_500_000, category: 'elektronik', date: dateMonthsAgo(2) });

        const anomalies = detectAnomalies([...normal, outlier]);

        expect(anomalies).toHaveLength(1);
        expect(anomalies[0].transaction.id).toBe(outlier.id);
        expect(anomalies[0].zScore).toBeGreaterThanOrEqual(2);
    });

    it('urutkan dari z-score tertinggi', () => {
        const transactions = [
            ...Array.from({ length: 10 }, () => tx({ amount: 100_000 })),
            tx({ amount: 1_200_000 }),
            tx({ amount: 1_300_000 }),
        ];

        const anomalies = detectAnomalies(transactions);

        expect(anomalies).toHaveLength(2);
        expect(anomalies[0].transaction.amount).toBe(1_300_000);
        expect(anomalies[0].zScore).toBeGreaterThan(anomalies[1].zScore);
    });

    it('kosong bila sebarannya seragam (simpangan nol)', () => {
        const transactions = Array.from({ length: 6 }, () => tx({ amount: 100_000 }));
        expect(detectAnomalies(transactions)).toEqual([]);
    });

    it('kosong bila sampel kurang dari minimum', () => {
        expect(detectAnomalies([tx({ amount: 100_000 }), tx({ amount: 5_000_000 })])).toEqual([]);
    });
});

describe('predictNextMonthSpending', () => {
    it('perkiraan mendekati rata-rata bila deret datar', () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
            tx({ amount: 100_000, date: dateMonthsAgo(5 - index) }),
        );

        expect(predictNextMonthSpending(transactions, 6, NOW)).toBe(100_000);
    });

    it('perkiraan mengikuti tren naik', () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
            tx({ amount: 100_000 + index * 20_000, date: dateMonthsAgo(5 - index) }),
        );

        // moving average 3 bulan terakhir (160k, 180k, 200k) + slope 20k
        expect(predictNextMonthSpending(transactions, 6, NOW)).toBe(200_000);
    });

    it('nol bila tidak ada pengeluaran', () => {
        expect(predictNextMonthSpending([], 6, NOW)).toBe(0);
    });
});

describe('calculateSavingsRate', () => {
    it('menghitung persen sisa dari pemasukan', () => {
        expect(calculateSavingsRate(1_000_000, 800_000)).toBe(20);
    });

    it('nol bila tidak ada pemasukan', () => {
        expect(calculateSavingsRate(0, 100_000)).toBe(0);
    });

    it('negatif bila defisit', () => {
        expect(calculateSavingsRate(500_000, 600_000)).toBe(-20);
    });
});

describe('sumByType & summarizeCategories', () => {
    const transactions = [
        tx({ type: 'expense', amount: 60_000, category: 'makan', date: NOW }),
        tx({ type: 'expense', amount: 30_000, category: 'makan', date: NOW }),
        tx({ type: 'expense', amount: 10_000, category: 'transport', date: NOW }),
        tx({ type: 'income', amount: 500_000, category: 'gaji', date: NOW }),
    ];

    it('menjumlahkan per jenis', () => {
        expect(sumByType(transactions, 'expense')).toBe(100_000);
        expect(sumByType(transactions, 'income')).toBe(500_000);
    });

    it('meringkas kategori terbesar lebih dulu beserta persentasenya', () => {
        const summary = summarizeCategories(transactions, 'expense');

        expect(summary[0]).toEqual({ category: 'makan', total: 90_000, count: 2, percentage: 90 });
        expect(summary[1].category).toBe('transport');
        expect(summary[1].percentage).toBe(10);
    });

    it('mengabaikan jenis transaksi lain', () => {
        const summary = summarizeCategories(transactions, 'income');
        expect(summary).toHaveLength(1);
        expect(summary[0].percentage).toBe(100);
    });
});

describe('compareCategorySpend', () => {
    it('memilih kategori dengan pergeseran terbesar', () => {
        const transactions = [
            tx({ amount: 100_000, category: 'makan', date: dateMonthsAgo(1, 10) }),
            tx({ amount: 150_000, category: 'makan', date: dateMonthsAgo(0, 10) }),
            tx({ amount: 200_000, category: 'transport', date: dateMonthsAgo(1, 10) }),
            tx({ amount: 220_000, category: 'transport', date: dateMonthsAgo(0, 10) }),
        ];

        const shift = compareCategorySpend(transactions, NOW);

        expect(shift).toEqual({
            category: 'makan',
            currentAmount: 150_000,
            previousAmount: 100_000,
            percentChange: 50,
        });
    });

    it('abaikan perubahan di bawah ambang noise', () => {
        const transactions = [
            tx({ amount: 100_000, category: 'makan', date: dateMonthsAgo(1, 10) }),
            tx({ amount: 104_000, category: 'makan', date: dateMonthsAgo(0, 10) }),
        ];
        expect(compareCategorySpend(transactions, NOW)).toBeNull();
    });

    it('abaikan garis dasar yang terlalu kecil', () => {
        const transactions = [
            tx({ amount: 1_000, category: 'makan', date: dateMonthsAgo(1, 10) }),
            tx({ amount: 100_000, category: 'makan', date: dateMonthsAgo(0, 10) }),
        ];
        expect(compareCategorySpend(transactions, NOW)).toBeNull();
    });

    it('null bila tidak ada transaksi', () => {
        expect(compareCategorySpend([], NOW)).toBeNull();
    });
});
