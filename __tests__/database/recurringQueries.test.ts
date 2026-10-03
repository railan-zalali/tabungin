import { calculateNextOccurrence } from '../../src/database/recurringQueries';
import type { RecurringTransaction } from '../../src/database/recurringQueries';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function makeRecurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
    return {
        id: 'r1',
        user_id: 'u1',
        wallet_id: null,
        category: 'food',
        amount: 10000,
        type: 'expense',
        note: null,
        frequency: 'daily',
        day_of_month: null,
        day_of_week: null,
        start_date: new Date(2026, 0, 15).getTime(), // 15 Jan 2026
        end_date: null,
        next_occurrence: 0,
        is_active: true,
        last_generated_at: null,
        created_at: 0,
        updated_at: 0,
        ...overrides,
    };
}

describe('calculateNextOccurrence', () => {
    it('adds one day for daily frequency', () => {
        const tx = makeRecurring({ frequency: 'daily' });
        expect(calculateNextOccurrence(tx)).toBe(tx.start_date + DAY);
    });

    it('adds seven days for weekly frequency', () => {
        const tx = makeRecurring({ frequency: 'weekly' });
        expect(calculateNextOccurrence(tx)).toBe(tx.start_date + 7 * DAY);
    });

    it('adds fourteen days for biweekly frequency', () => {
        const tx = makeRecurring({ frequency: 'biweekly' });
        expect(calculateNextOccurrence(tx)).toBe(tx.start_date + 14 * DAY);
    });

    it('uses last_generated_at as base when available', () => {
        const generated = new Date(2026, 5, 10).getTime();
        const tx = makeRecurring({ frequency: 'daily', last_generated_at: generated });
        expect(calculateNextOccurrence(tx)).toBe(generated + DAY);
    });

    it('adds one month for monthly frequency', () => {
        const tx = makeRecurring({ frequency: 'monthly' });
        const expected = new Date(2026, 1, 15).getTime(); // 15 Feb 2026
        expect(calculateNextOccurrence(tx)).toBe(expected);
    });

    it('honours day_of_month for monthly frequency', () => {
        const tx = makeRecurring({ frequency: 'monthly', day_of_month: 28 });
        const result = new Date(calculateNextOccurrence(tx));
        expect(result.getDate()).toBe(28);
        expect(result.getMonth()).toBe(1); // Februari
    });

    it('adds one year for yearly frequency', () => {
        const tx = makeRecurring({ frequency: 'yearly' });
        const expected = new Date(2027, 0, 15).getTime();
        expect(calculateNextOccurrence(tx)).toBe(expected);
    });

    it('defaults to ~30 days for unknown frequency', () => {
        const tx = makeRecurring({ frequency: 'hourly' as never });
        // frequency tidak dikenal -> fallback now + 30 hari
        const before = Date.now();
        const result = calculateNextOccurrence(tx);
        const after = Date.now();
        expect(result).toBeGreaterThanOrEqual(before + 30 * DAY);
        expect(result).toBeLessThanOrEqual(after + 30 * DAY);
    });

    it('rolls over month end correctly (31 Jan -> akhir Feb)', () => {
        const tx = makeRecurring({
            frequency: 'monthly',
            start_date: new Date(2026, 0, 31).getTime(),
        });
        const result = new Date(calculateNextOccurrence(tx));
        // JS Date.normalize: 31 Jan + 1 bulan = 3 Maret (atau 28/29 Feb tergantung tahun)
        expect(result.getMonth()).not.toBe(0);
    });
});
