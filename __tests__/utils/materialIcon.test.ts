import { resolveMaterialIcon } from '../../src/utils/materialIcon';

describe('resolveMaterialIcon', () => {
    it('returns the icon when it exists in the glyph map', () => {
        expect(resolveMaterialIcon('food')).toBe('food');
    });

    it('applies icon aliases', () => {
        // 'shopping-bag' di-alias ke 'shopping'
        expect(resolveMaterialIcon('shopping-bag')).toBe('shopping');
    });

    it('falls back to the provided fallback when icon is unknown', () => {
        expect(resolveMaterialIcon('definitely-not-an-icon', 'food')).toBe('food');
    });

    it('falls back to the default tag icon', () => {
        expect(resolveMaterialIcon('definitely-not-an-icon')).toBe('tag');
    });

    it('handles null and undefined input', () => {
        expect(resolveMaterialIcon(null)).toBe('tag');
        expect(resolveMaterialIcon(undefined)).toBe('tag');
    });

    it('falls back when input is empty string', () => {
        expect(resolveMaterialIcon('')).toBe('tag');
    });
});
