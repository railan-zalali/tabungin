import { buildInsights, IDEAL_SAVINGS_RATE } from '../../src/utils/insightEngine';
import type { Transaction } from '../../src/types/transaction';

const NOW = new Date(2026, 9, 3, 12, 0, 0).getTime();

let counter = 0;

function dateMonthsAgo(monthsAgo: number, day = 15): number {
    const date = new Date(NOW);
    date.setMonth(date.getMonth() - monthsAgo);
    date.setDate(day);
    return date.getTime();
}

function tx(partial: Partial<Transaction> & { date: number }): Transaction {
    counter += 1;
    return {
        id: `tx-${counter}`,
        type: 'expense',
        amount: 100_000,
        category: 'makan',
        note: null,
        created_at: partial.date,
        ...partial,
    };
}

describe('buildInsights', () => {
    it('kosong bila belum ada transaksi', () => {
        expect(buildInsights([], { now: NOW })).toEqual([]);
    });

    it('selalu menghasilkan kartu yang lengkap (ikon, nada, judul, deskripsi)', () => {
        const transactions = [
            tx({ type: 'income', amount: 1_000_000, category: 'gaji', date: dateMonthsAgo(0) }),
            tx({ amount: 600_000, date: dateMonthsAgo(0) }),
            tx({ amount: 600_000, date: dateMonthsAgo(1) }),
        ];

        const insights = buildInsights(transactions, { now: NOW });

        expect(insights.length).toBeGreaterThan(0);
        for (const insight of insights) {
            expect(insight.id).toBeTruthy();
            expect(insight.icon).toBeTruthy();
            expect(insight.title.length).toBeGreaterThan(0);
            expect(insight.description.length).toBeGreaterThan(0);
            expect(['success', 'warning', 'info', 'neutral']).toContain(insight.tone);
        }
        // Tidak boleh ada id ganda (setiap kartu dirender dengan key unik).
        expect(new Set(insights.map((item) => item.id)).size).toBe(insights.length);
    });

    it('membaca tingkat tabungan yang masih di bawah target ideal', () => {
        const transactions = [
            tx({ type: 'income', amount: 1_000_000, category: 'gaji', date: NOW }),
            tx({ amount: 900_000, date: NOW }),
        ];

        const insights = buildInsights(transactions, { now: NOW });
        const savings = insights.find((insight) => insight.id === 'savings-rate');

        expect(savings).toBeDefined();
        expect(savings?.title).toBe(`Menabung ${IDEAL_SAVINGS_RATE - 10}% dari pemasukan`);
        expect(savings?.tone).toBe('warning');
        expect(savings?.description).toContain(`${IDEAL_SAVINGS_RATE}%`);
    });

    it('menandai tabungan di atas target sebagai positif', () => {
        const transactions = [
            tx({ type: 'income', amount: 1_000_000, category: 'gaji', date: NOW }),
            tx({ amount: 700_000, date: NOW }),
        ];

        const savings = buildInsights(transactions, { now: NOW }).find(
            (insight) => insight.id === 'savings-rate',
        );

        expect(savings?.tone).toBe('success');
        expect(savings?.title).toContain('Menabung 30%');
    });

    it('memberi peringatan saat pengeluaran melebihi pemasukan', () => {
        const transactions = [
            tx({ type: 'income', amount: 100_000, category: 'bonus', date: NOW }),
            tx({ amount: 200_000, date: NOW }),
        ];

        const savings = buildInsights(transactions, { now: NOW }).find(
            (insight) => insight.id === 'savings-rate',
        );

        expect(savings?.title).toBe('Pengeluaran melampaui pemasukan');
        expect(savings?.description).toContain('Rp 100.000');
    });

    it('mendahulukan transaksi tak lazim', () => {
        const transactions = [
            ...Array.from({ length: 10 }, () => tx({ amount: 100_000, date: NOW })),
            tx({ amount: 1_200_000, date: NOW }),
            tx({ amount: 1_300_000, date: NOW, category: 'elektronik' }),
        ];

        const insights = buildInsights(transactions, { now: NOW });

        expect(insights[0].id).toBe('unusual-spend');
        expect(insights[0].tone).toBe('warning');
        expect(insights[0].description).toContain('Rp 1.300.000');
    });

    it('memakai penerjemah kategori untuk nama tampilan', () => {
        const transactions = [
            tx({ type: 'income', amount: 1_000_000, category: 'gaji', date: NOW }),
            tx({ amount: 900_000, category: 'makan', date: NOW }),
        ];

        const insights = buildInsights(transactions, {
            now: NOW,
            resolveCategory: (key) => `Kategori ${key}`,
        });

        const description = insights.map((item) => item.description).join(' ');
        expect(description).toContain('Kategori makan');
    });

    it('memberi perkiraan pengeluaran bulan depan bila ada pola', () => {
        const transactions = Array.from({ length: 6 }, (_, index) =>
            tx({ amount: 300_000, date: dateMonthsAgo(5 - index) }),
        );

        const forecast = buildInsights(transactions, { now: NOW }).find(
            (insight) => insight.id === 'forecast',
        );

        expect(forecast).toBeDefined();
        expect(forecast?.description).toContain('Rp 300.000');
    });

    it('melaporkan kategori terbesar beserta persentasenya', () => {
        const transactions = [
            tx({ amount: 800_000, category: 'makan', date: NOW }),
            tx({ amount: 200_000, category: 'transport', date: NOW }),
        ];

        const top = buildInsights(transactions, { now: NOW }).find(
            (insight) => insight.id === 'top-category',
        );

        expect(top?.description).toContain('Rp 800.000');
        expect(top?.description).toContain('80%');
    });

    it('mengangkat tren naik sebagai perhatian', () => {
        const transactions = [
            ...Array.from({ length: 6 }, (_, index) =>
                tx({ amount: 200_000 + index * 100_000, date: dateMonthsAgo(5 - index) }),
            ),
            tx({ type: 'income', amount: 5_000_000, category: 'gaji', date: NOW }),
        ];

        const trend = buildInsights(transactions, { now: NOW }).find(
            (insight) => insight.id === 'spending-trend',
        );

        expect(trend?.title).toContain('naik');
        expect(trend?.tone).toBe('warning');
    });
});
