import { calculateDaysToGoal, calculateProgress, calculateRequiredSaving } from '../../src/utils/calculator';

describe('Calculator Utils', () => {
    describe('calculateDaysToGoal', () => {
        it('should return 0 if target is met', () => {
            expect(calculateDaysToGoal(1000, 1000, 100, 'daily')).toBe(0);
        });

        it('should calculate correct days for daily saving', () => {
            expect(calculateDaysToGoal(1000, 0, 100, 'daily')).toBe(10);
        });

        it('should calculate correct days for monthly saving', () => {
            expect(calculateDaysToGoal(3000, 0, 1000, 'monthly')).toBe(90); // 3 months * ~30 = 90
        });
    });

    describe('calculateProgress', () => {
        it('should return correct percentage', () => {
            expect(calculateProgress(500, 1000)).toBe(50);
            expect(calculateProgress(1000, 1000)).toBe(100);
        });

        it('should cap at 100', () => {
            expect(calculateProgress(1500, 1000)).toBe(100);
        });
    });

    describe('calculateRequiredSaving', () => {
        it('should return 0 if target met or days <= 0', () => {
            expect(calculateRequiredSaving(1000, 1000, 10, 'daily')).toBe(0);
            expect(calculateRequiredSaving(1000, 0, 0, 'daily')).toBe(0);
        });

        it('should calculate required amount for daily', () => {
            expect(calculateRequiredSaving(1000, 0, 10, 'daily')).toBe(100);
        });

        it('should calculate required amount for monthly', () => {
            expect(calculateRequiredSaving(3000, 0, 90, 'monthly')).toBe(1000); // 90 days = 3 months
        });
    });
});
