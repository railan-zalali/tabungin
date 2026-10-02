import {
    formatDateLong,
    formatDateShort,
    formatDateGroup,
    formatTime,
    formatMonthYear,
    formatEstimatedDate,
    isSameDay,
    startOfDay,
    endOfDay,
    startOfMonth,
    daysFromNow,
    formatRelativeDays,
} from '../../src/utils/date';

describe('formatDateLong', () => {
    it('formats date in Indonesian long format', () => {
        const ts = new Date(2025, 2, 5, 10, 30).getTime(); // 5 Maret 2025
        expect(formatDateLong(ts)).toBe('Rabu, 5 Maret 2025');
    });

    it('handles different months', () => {
        const ts = new Date(2025, 0, 1).getTime(); // 1 Januari 2025
        expect(formatDateLong(ts)).toBe('Rabu, 1 Januari 2025');
    });
});

describe('formatDateShort', () => {
    it('formats date in short format', () => {
        const ts = new Date(2025, 2, 5).getTime();
        expect(formatDateShort(ts)).toBe('5 Mar 2025');
    });
});

describe('formatDateGroup', () => {
    it('returns "Hari ini" for current date', () => {
        expect(formatDateGroup(Date.now())).toBe('Hari ini');
    });

    it('returns "Kemarin" for yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(formatDateGroup(yesterday.getTime())).toBe('Kemarin');
    });
});

describe('formatTime', () => {
    it('formats time as HH:MM', () => {
        const ts = new Date(2025, 0, 1, 14, 30).getTime();
        expect(formatTime(ts)).toBe('14:30');
    });

    it('pads single digits', () => {
        const ts = new Date(2025, 0, 1, 9, 5).getTime();
        expect(formatTime(ts)).toBe('09:05');
    });
});

describe('formatMonthYear', () => {
    it('formats month and year', () => {
        const ts = new Date(2025, 2, 15).getTime();
        expect(formatMonthYear(ts)).toBe('Maret 2025');
    });
});

describe('formatEstimatedDate', () => {
    it('formats date object', () => {
        const date = new Date(2025, 5, 10);
        expect(formatEstimatedDate(date)).toBe('10 Juni 2025');
    });
});

describe('isSameDay', () => {
    it('returns true for same day', () => {
        const d1 = new Date(2025, 0, 15, 10, 0);
        const d2 = new Date(2025, 0, 15, 23, 59);
        expect(isSameDay(d1, d2)).toBe(true);
    });

    it('returns false for different days', () => {
        const d1 = new Date(2025, 0, 15);
        const d2 = new Date(2025, 0, 16);
        expect(isSameDay(d1, d2)).toBe(false);
    });
});

describe('startOfDay', () => {
    it('returns date at 00:00:00', () => {
        const input = new Date(2025, 2, 5, 14, 30, 45);
        const result = startOfDay(input);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
        expect(result.getDate()).toBe(5);
    });
});

describe('endOfDay', () => {
    it('returns date at 23:59:59', () => {
        const input = new Date(2025, 2, 5, 10, 0);
        const result = endOfDay(input);
        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
        expect(result.getSeconds()).toBe(59);
    });
});

describe('startOfMonth', () => {
    it('returns first day of current month at 00:00:00', () => {
        const result = startOfMonth();
        expect(result.getDate()).toBe(1);
        expect(result.getHours()).toBe(0);
        expect(result.getMinutes()).toBe(0);
        expect(result.getSeconds()).toBe(0);
    });
});

describe('daysFromNow', () => {
    it('returns positive days for future dates', () => {
        const future = Date.now() + 5 * 24 * 60 * 60 * 1000; // 5 days
        const result = daysFromNow(future);
        expect(result).toBeGreaterThanOrEqual(4);
        expect(result).toBeLessThanOrEqual(6);
    });

    it('returns 0 or negative for past dates', () => {
        const past = Date.now() - 24 * 60 * 60 * 1000; // 1 day ago
        expect(daysFromNow(past)).toBeLessThanOrEqual(0);
    });
});

describe('formatRelativeDays', () => {
    it('returns "Selesai" for 0 or negative', () => {
        expect(formatRelativeDays(0)).toBe('Selesai');
        expect(formatRelativeDays(-5)).toBe('Selesai');
    });

    it('returns "1 hari lagi" for 1 day', () => {
        expect(formatRelativeDays(1)).toBe('1 hari lagi');
    });

    it('returns days for less than a week', () => {
        expect(formatRelativeDays(3)).toBe('3 hari lagi');
        expect(formatRelativeDays(6)).toBe('6 hari lagi');
    });

    it('returns weeks for 7-29 days', () => {
        expect(formatRelativeDays(7)).toBe('1 minggu lagi');
        expect(formatRelativeDays(14)).toBe('2 minggu lagi');
        expect(formatRelativeDays(21)).toBe('3 minggu lagi');
    });

    it('returns months for 30+ days', () => {
        expect(formatRelativeDays(30)).toBe('1 bulan lagi');
        expect(formatRelativeDays(60)).toBe('2 bulan lagi');
        expect(formatRelativeDays(90)).toBe('3 bulan lagi');
    });
});
