import { formatRupiah, formatInputRupiah, parseRupiah } from '../../src/utils/currency';

describe('Currency Utils', () => {
    describe('formatRupiah', () => {
        it('should format numbers to IDR', () => {
            expect(formatRupiah(1000000)).toBe('Rp 1.000.000');
            expect(formatRupiah(0)).toBe('Rp 0');
        });
    });

    describe('formatInputRupiah', () => {
        it('should format string to IDR format without Rp prefix', () => {
            expect(formatInputRupiah('1000000')).toBe('1.000.000');
            expect(formatInputRupiah('0')).toBe('0');
            expect(formatInputRupiah('abc')).toBe('');
        });
    });

    describe('parseRupiah', () => {
        it('should parse IDR string into number', () => {
            expect(parseRupiah('1.000.000')).toBe(1000000);
            expect(parseRupiah('Rp 50.000')).toBe(50000);
            expect(parseRupiah('')).toBe(0);
        });
    });
});
