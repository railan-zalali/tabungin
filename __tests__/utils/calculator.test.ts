import {
    calculateDaysToGoal,
    calculateEstimatedDate,
    simulateSaving,
    calculateProgress,
    calculateRequiredSaving,
    formatDuration,
} from '../../src/utils/calculator';

describe('calculateDaysToGoal', () => {
    it('returns 0 when target already reached', () => {
        expect(calculateDaysToGoal(100000, 100000, 10000, 'monthly')).toBe(0);
        expect(calculateDaysToGoal(100000, 150000, 10000, 'monthly')).toBe(0);
    });

    it('returns Infinity when saving per period is not positive', () => {
        expect(calculateDaysToGoal(100000, 0, 0, 'monthly')).toBe(Infinity);
        expect(calculateDaysToGoal(100000, 0, -5000, 'monthly')).toBe(Infinity);
    });

    it('computes daily rate for daily period', () => {
        // sisa 100rb / 10rb per hari = 10 hari
        expect(calculateDaysToGoal(100000, 0, 10000, 'daily')).toBe(10);
    });

    it('computes weekly rate for weekly period', () => {
        // 70rb / (10rb/7) = 49 hari
        expect(calculateDaysToGoal(70000, 0, 10000, 'weekly')).toBe(49);
    });

    it('computes monthly rate for monthly period (30 hari)', () => {
        // 300rb / (30rb/30) = 300 hari
        expect(calculateDaysToGoal(300000, 0, 30000, 'monthly')).toBe(300);
    });
});

describe('calculateEstimatedDate', () => {
    it('adds the given number of days to today', () => {
        const result = calculateEstimatedDate(10);
        const expected = new Date();
        expected.setDate(expected.getDate() + 10);
        expect(result.getDate()).toBe(expected.getDate());
        expect(result.getMonth()).toBe(expected.getMonth());
    });

    it('returns today for 0 days', () => {
        const result = calculateEstimatedDate(0);
        expect(result.getDate()).toBe(new Date().getDate());
    });
});

describe('simulateSaving', () => {
    it('returns consistent days/weeks/months breakdown', () => {
        const result = simulateSaving(100000, 0, 10000, 'daily');
        expect(result.days).toBe(10);
        expect(result.weeks).toBe(Math.ceil(10 / 7));
        expect(result.months).toBe(Math.ceil(10 / 30));
        expect(result.estimatedDate).toBeInstanceOf(Date);
    });
});

describe('calculateProgress', () => {
    it('returns 100 when target is not positive', () => {
        expect(calculateProgress(5000, 0)).toBe(100);
        expect(calculateProgress(5000, -1)).toBe(100);
    });

    it('returns percentage of progress', () => {
        expect(calculateProgress(50000, 100000)).toBe(50);
        expect(calculateProgress(25000, 100000)).toBe(25);
    });

    it('caps at 100 when current exceeds target', () => {
        expect(calculateProgress(150000, 100000)).toBe(100);
    });
});

describe('calculateRequiredSaving', () => {
    it('returns 0 when already at target', () => {
        expect(calculateRequiredSaving(100000, 100000, 30, 'monthly')).toBe(0);
    });

    it('returns 0 when targetDays is not positive', () => {
        expect(calculateRequiredSaving(100000, 0, 0, 'monthly')).toBe(0);
        expect(calculateRequiredSaving(100000, 0, -10, 'monthly')).toBe(0);
    });

    it('computes required daily saving', () => {
        // 100rb dalam 10 hari = 10rb/hari
        expect(calculateRequiredSaving(100000, 0, 10, 'daily')).toBe(10000);
    });

    it('computes required monthly saving', () => {
        // 300rb dalam 30 hari, monthly -> divisor = 30/30 = 1 -> 300rb
        expect(calculateRequiredSaving(300000, 0, 30, 'monthly')).toBe(300000);
    });
});

describe('formatDuration', () => {
    it('formats zero and one day', () => {
        expect(formatDuration(0)).toBe('0 hari');
        expect(formatDuration(1)).toBe('1 hari');
    });

    it('formats days under a week', () => {
        expect(formatDuration(6)).toBe('6 hari');
    });

    it('formats one week', () => {
        expect(formatDuration(7)).toBe('1 minggu');
        expect(formatDuration(13)).toBe('1 minggu');
    });

    it('formats weeks', () => {
        expect(formatDuration(14)).toBe('2 minggu');
        expect(formatDuration(28)).toBe('4 minggu');
    });

    it('formats months', () => {
        expect(formatDuration(30)).toBe('1 bulan');
        expect(formatDuration(59)).toBe('1 bulan'); // < 60 hari -> '1 bulan'
        expect(formatDuration(60)).toBe('2 bulan');
        expect(formatDuration(364)).toBe('12 bulan');
    });

    it('formats years with one decimal', () => {
        expect(formatDuration(365)).toBe('1.0 tahun');
        expect(formatDuration(730)).toBe('2.0 tahun');
    });
});
