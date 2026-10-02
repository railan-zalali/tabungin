import {
    formatCurrency,
    formatRupiah,
    formatRupiahShort,
    parseRupiah,
    formatInputRupiah,
    isValidAmount,
} from '../../src/utils/currency';

describe('formatCurrency', () => {
    it('formats positive amounts with symbol', () => {
        expect(formatCurrency(1500000)).toBe('Rp 1.500.000');
        expect(formatCurrency(0)).toBe('Rp 0');
        expect(formatCurrency(500)).toBe('Rp 500');
    });

    it('formats negative amounts with minus prefix', () => {
        expect(formatCurrency(-1500000)).toBe('-Rp 1.500.000');
        expect(formatCurrency(-500)).toBe('-Rp 500');
    });

    it('formats without symbol when withSymbol=false', () => {
        expect(formatCurrency(1500000, false)).toBe('1.500.000');
        expect(formatCurrency(-1500000, false)).toBe('-1.500.000');
    });

    it('rounds decimal amounts', () => {
        expect(formatCurrency(1500.7)).toBe('Rp 1.501');
        expect(formatCurrency(1499.3)).toBe('Rp 1.499');
    });
});

describe('formatRupiah (alias)', () => {
    it('is the same function as formatCurrency', () => {
        expect(formatRupiah).toBe(formatCurrency);
    });
});

describe('formatRupiahShort', () => {
    it('formats billions as M', () => {
        expect(formatRupiahShort(1_500_000_000)).toBe('Rp 1.5 M');
        expect(formatRupiahShort(2_000_000_000)).toBe('Rp 2 M');
    });

    it('formats millions as Jt', () => {
        expect(formatRupiahShort(1_500_000)).toBe('Rp 1.5 Jt');
        expect(formatRupiahShort(18_000_000)).toBe('Rp 18 Jt');
    });

    it('formats thousands as Rb', () => {
        expect(formatRupiahShort(50_000)).toBe('Rp 50 Rb');
        expect(formatRupiahShort(999_000)).toBe('Rp 999 Rb');
    });

    it('formats small numbers with full currency', () => {
        expect(formatRupiahShort(500)).toBe('Rp 500');
        expect(formatRupiahShort(999)).toBe('Rp 999');
    });
});

describe('parseRupiah', () => {
    it('parses formatted string to number', () => {
        expect(parseRupiah('1.500.000')).toBe(1500000);
        expect(parseRupiah('Rp 1.500.000')).toBe(1500000);
        expect(parseRupiah('500')).toBe(500);
    });

    it('returns 0 for empty or non-numeric', () => {
        expect(parseRupiah('')).toBe(0);
        expect(parseRupiah('abc')).toBe(0);
        expect(parseRupiah('Rp ')).toBe(0);
    });
});

describe('formatInputRupiah', () => {
    it('formats raw digits with thousand separators', () => {
        expect(formatInputRupiah('1500000')).toBe('1.500.000');
        expect(formatInputRupiah('500')).toBe('500');
        expect(formatInputRupiah('123456789')).toBe('123.456.789');
    });

    it('returns empty string for no digits', () => {
        expect(formatInputRupiah('')).toBe('');
        expect(formatInputRupiah('abc')).toBe('');
    });

    it('ignores non-digit characters', () => {
        expect(formatInputRupiah('Rp 1500000')).toBe('1.500.000');
    });
});

describe('isValidAmount', () => {
    it('returns true for positive finite numbers', () => {
        expect(isValidAmount(1000)).toBe(true);
        expect(isValidAmount(0.01)).toBe(true);
    });

    it('returns false for zero, negative, or non-finite', () => {
        expect(isValidAmount(0)).toBe(false);
        expect(isValidAmount(-100)).toBe(false);
        expect(isValidAmount(NaN)).toBe(false);
        expect(isValidAmount(Infinity)).toBe(false);
    });
});
