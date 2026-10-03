import { calculateFirstOccurrence } from '../../src/screens/transaction/RecurringTransactionScreen';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('calculateFirstOccurrence', () => {
    // Reference: Rabu, 15 Januari 2026
    const startDate = new Date(2026, 0, 15, 9, 0, 0).getTime();

    it('keeps start date for daily frequency', () => {
        expect(calculateFirstOccurrence('daily', null, startDate)).toBe(startDate);
    });

    it('keeps start date for unknown frequency', () => {
        expect(calculateFirstOccurrence('hourly' as never, null, startDate)).toBe(startDate);
    });

    it('adds 7 days for weekly', () => {
        expect(calculateFirstOccurrence('weekly', null, startDate)).toBe(startDate + 7 * DAY_MS);
    });

    it('adds 14 days for biweekly', () => {
        expect(calculateFirstOccurrence('biweekly', null, startDate)).toBe(
            startDate + 14 * DAY_MS,
        );
    });

    it('moves to same day next year for yearly', () => {
        const result = new Date(calculateFirstOccurrence('yearly', null, startDate));
        expect(result.getDate()).toBe(15);
        expect(result.getMonth()).toBe(0);
        expect(result.getFullYear()).toBe(2027);
    });

    it('uses requested day of month for monthly (default day 1)', () => {
        const result = new Date(calculateFirstOccurrence('monthly', null, startDate));
        expect(result.getMonth()).toBe(1); // Februari
        expect(result.getDate()).toBe(1);
    });

    it('honours explicit day of month', () => {
        const result = new Date(calculateFirstOccurrence('monthly', 20, startDate));
        expect(result.getMonth()).toBe(1);
        expect(result.getDate()).toBe(20);
    });

    it('clamps requested day to the current month length', () => {
        // Mulai 15 Feb 2026 (bulan berjalan 28 hari) -> 31 di-clamp ke 28,
        // lalu ditempatkan di bulan berikutnya (Maret).
        const febStart = new Date(2026, 1, 15).getTime();
        const result = new Date(calculateFirstOccurrence('monthly', 31, febStart));
        expect(result.getMonth()).toBe(2); // Maret
        expect(result.getDate()).toBe(28);
    });

    // Quirk yang diwarisi dari versi inline sebelum ekstraksi: batas clamp adalah
    // panjang bulan BERJALAN, bukan bulan TARGET. Jadi 31 dari Januari (31 hari)
    // tidak ikut di-clamp dan jatuh ke new Date(2026, 1, 31) = 3 Maret.
    // Dipertahankan agar ekstraksi tidak mengubah behavior.
    it('documents inherited clamp quirk (bound is current month, not target)', () => {
        const result = new Date(calculateFirstOccurrence('monthly', 31, startDate));
        expect(result.getMonth()).toBe(2); // Maret
        expect(result.getDate()).toBe(3);
    });
});
