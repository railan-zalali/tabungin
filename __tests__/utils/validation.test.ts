import { validateGoalName, validateTargetAmount, validateSavingPerPeriod, validateEmail, validatePassword } from '../../src/utils/validation';

describe('Validation Utils', () => {
    describe('validateGoalName', () => {
        it('should return error if empty or too short', () => {
            expect(validateGoalName('')).toBe('Nama target tidak boleh kosong');
            expect(validateGoalName('a')).toBe('Nama target minimal 3 karakter');
        });

        it('should return null if valid', () => {
            expect(validateGoalName('Macbook')).toBeNull();
        });
    });

    describe('validateTargetAmount', () => {
        it('should return error if amount is less than 10000 or negative', () => {
            expect(validateTargetAmount(0)).toBe('Nominal harus lebih dari Rp 0');
            expect(validateTargetAmount(500)).toBe('Target minimal Rp 10.000');
        });

        it('should return null if valid', () => {
            expect(validateTargetAmount(50000)).toBeNull();
        });
    });

    describe('validateSavingPerPeriod', () => {
        it('should return error if invalid', () => {
            expect(validateSavingPerPeriod(0, 50000)).toBe('Nominal tabungan nominal harus lebih dari rp 0');
            expect(validateSavingPerPeriod(60000, 50000)).toBe('Nominal tabungan tidak boleh melebihi target');
        });

        it('should return null if valid', () => {
            expect(validateSavingPerPeriod(5000, 10000)).toBeNull();
        });
    });

    describe('validateEmail', () => {
        it('should validate email format', () => {
            expect(validateEmail('invalid')).toBe('Format email tidak valid');
            expect(validateEmail('test@email.com')).toBeNull();
        });
    });

    describe('validatePassword', () => {
        it('should validate password length', () => {
            expect(validatePassword('short')).toBe('Password minimal 8 karakter');
            expect(validatePassword('validpassword')).toBeNull();
        });
    });
});
