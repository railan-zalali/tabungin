// Test helper murni debt tracking: progres, status jatuh tempo, label.
import {
    DEBT_DUE_SOON_DAYS,
    getDebtDueLabel,
    getDebtDueState,
    getDebtPaidAmount,
    getDebtProgress,
    getDebtStatusLabel,
    getDebtTotalWithInterest,
    getDebtTypeLabel,
} from '../../src/utils/debtUtils';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 15, 12, 0, 0);

const base = {
    amount: 1000000,
    remaining_amount: 400000,
    interest_rate: 0,
    due_date: null as number | null,
    status: 'active' as const,
};

describe('getDebtTypeLabel / getDebtStatusLabel', () => {
    it('maps debt -> Utang and receivable -> Piutang', () => {
        expect(getDebtTypeLabel('debt')).toBe('Utang');
        expect(getDebtTypeLabel('receivable')).toBe('Piutang');
    });

    it('maps every status', () => {
        expect(getDebtStatusLabel('active')).toBe('Aktif');
        expect(getDebtStatusLabel('paid')).toBe('Lunas');
        expect(getDebtStatusLabel('cancelled')).toBe('Dibatalkan');
    });
});

describe('getDebtPaidAmount / getDebtProgress', () => {
    it('derives paid amount from total minus remaining', () => {
        expect(getDebtPaidAmount(base)).toBe(600000);
    });

    it('never reports a negative paid amount', () => {
        expect(getDebtPaidAmount({ ...base, remaining_amount: 1500000 })).toBe(0);
    });

    it('reports percentage rounded to integers', () => {
        expect(getDebtProgress(base)).toBe(60);
        expect(getDebtProgress({ ...base, remaining_amount: 1000000 })).toBe(0);
        expect(getDebtProgress({ ...base, remaining_amount: 0 })).toBe(100);
        expect(getDebtProgress({ ...base, remaining_amount: 333333 })).toBe(67);
    });

    it('guards against a zero or negative total', () => {
        expect(getDebtProgress({ ...base, amount: 0 })).toBe(0);
        expect(getDebtProgress({ ...base, amount: -500 })).toBe(0);
    });
});

describe('getDebtTotalWithInterest', () => {
    it('returns the untouched amount when there is no interest', () => {
        expect(getDebtTotalWithInterest({ amount: 2000000, interest_rate: 0 })).toBe(2000000);
    });

    it('adds the interest rate on top of the principal', () => {
        expect(getDebtTotalWithInterest({ amount: 2000000, interest_rate: 10 })).toBe(2200000);
    });

    it('tolerates a missing rate', () => {
        expect(getDebtTotalWithInterest({ amount: 100, interest_rate: undefined as never })).toBe(100);
    });
});

describe('getDebtDueState', () => {
    it('settles non-active debts regardless of the due date', () => {
        expect(getDebtDueState({ status: 'paid', due_date: NOW - DAY }, NOW)).toBe('settled');
        expect(getDebtDueState({ status: 'cancelled', due_date: NOW + DAY }, NOW)).toBe('settled');
    });

    it('reports debts without a due date', () => {
        expect(getDebtDueState({ status: 'active', due_date: null }, NOW)).toBe('no_due_date');
    });

    it('reports overdue when the due date has already passed', () => {
        expect(getDebtDueState({ status: 'active', due_date: NOW - 1 }, NOW)).toBe('overdue');
        expect(getDebtDueState({ status: 'active', due_date: NOW - 30 * DAY }, NOW)).toBe('overdue');
    });

    it('reports due_soon up to and including the window boundary', () => {
        expect(getDebtDueState({ status: 'active', due_date: NOW }, NOW)).toBe('due_soon');
        expect(
            getDebtDueState({ status: 'active', due_date: NOW + DEBT_DUE_SOON_DAYS * DAY }, NOW),
        ).toBe('due_soon');
    });

    it('reports upcoming beyond the window', () => {
        expect(
            getDebtDueState({ status: 'active', due_date: NOW + (DEBT_DUE_SOON_DAYS + 1) * DAY }, NOW),
        ).toBe('upcoming');
    });

    it('defaults to the current time when no clock is supplied', () => {
        expect(getDebtDueState({ status: 'active', due_date: Date.now() + 365 * DAY })).toBe('upcoming');
        expect(getDebtDueState({ status: 'active', due_date: Date.now() - 365 * DAY })).toBe('overdue');
    });
});

describe('getDebtDueLabel', () => {
    it('distinguishes paid from cancelled', () => {
        expect(getDebtDueLabel({ status: 'paid', due_date: NOW }, NOW)).toBe('Lunas');
        expect(getDebtDueLabel({ status: 'cancelled', due_date: NOW }, NOW)).toBe('Dibatalkan');
    });

    it('says when there is no due date', () => {
        expect(getDebtDueLabel({ status: 'active', due_date: null }, NOW)).toBe('Tanpa jatuh tempo');
    });

    it('counts overdue days from the due date', () => {
        expect(getDebtDueLabel({ status: 'active', due_date: NOW - 3 * DAY }, NOW)).toBe(
            'Terlambat 3 hari',
        );
        // Kurang dari satu hari tetap dihitung satu hari.
        expect(getDebtDueLabel({ status: 'active', due_date: NOW - 1000 }, NOW)).toBe('Terlambat 1 hari');
    });

    it('formats upcoming due dates with the shared date helper', () => {
        const due = Date.UTC(2026, 6, 1);
        expect(getDebtDueLabel({ status: 'active', due_date: due }, NOW)).toMatch(/^Jatuh tempo /);
    });
});
