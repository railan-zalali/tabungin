import {
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    validateName,
    validateAmount,
    validateGoalName,
    validateTargetAmount,
    validateSavingPerPeriod,
} from '../../src/utils/validation';

describe('validateEmail', () => {
    it('returns null for valid email', () => {
        expect(validateEmail('user@example.com')).toBeNull();
        expect(validateEmail('test.name+tag@domain.co.id')).toBeNull();
    });

    it('returns error for empty email', () => {
        expect(validateEmail('')).toBe('Email tidak boleh kosong');
        expect(validateEmail('   ')).toBe('Email tidak boleh kosong');
    });

    it('returns error for invalid format', () => {
        expect(validateEmail('user@')).toBe('Format email tidak valid');
        expect(validateEmail('user@example')).toBe('Format email tidak valid');
        expect(validateEmail('@example.com')).toBe('Format email tidak valid');
        expect(validateEmail('user example@test.com')).toBe('Format email tidak valid');
    });
});

describe('validatePassword', () => {
    it('returns null for valid password', () => {
        expect(validatePassword('password123')).toBeNull();
        expect(validatePassword('!@#$%^&*()')).toBeNull();
    });

    it('returns error for empty password', () => {
        expect(validatePassword('')).toBe('Password tidak boleh kosong');
    });

    it('returns error for short password', () => {
        expect(validatePassword('1234567')).toBe('Password minimal 8 karakter');
        expect(validatePassword('abc')).toBe('Password minimal 8 karakter');
    });
});

describe('validateConfirmPassword', () => {
    it('returns null when passwords match', () => {
        expect(validateConfirmPassword('secret123', 'secret123')).toBeNull();
    });

    it('returns error for empty confirm', () => {
        expect(validateConfirmPassword('secret123', '')).toBe('Konfirmasi password tidak boleh kosong');
    });

    it('returns error when passwords do not match', () => {
        expect(validateConfirmPassword('secret123', 'secret456')).toBe('Password tidak sama');
    });
});

describe('validateName', () => {
    it('returns null for valid name', () => {
        expect(validateName('Budi')).toBeNull();
        expect(validateName('Alice Cooper')).toBeNull();
    });

    it('returns error for empty name', () => {
        expect(validateName('')).toBe('Nama tidak boleh kosong');
        expect(validateName('  ')).toBe('Nama tidak boleh kosong');
    });

    it('returns error for name too short', () => {
        expect(validateName('A')).toBe('Nama minimal 2 karakter');
    });
});

describe('validateAmount', () => {
    it('returns null for positive amounts', () => {
        expect(validateAmount(1000)).toBeNull();
        expect(validateAmount(0.01)).toBeNull();
        expect(validateAmount(999_999_999_999)).toBeNull();
    });

    it('returns error for zero or negative', () => {
        expect(validateAmount(0)).toBe('Nominal harus lebih dari Rp 0');
        expect(validateAmount(-1000)).toBe('Nominal harus lebih dari Rp 0');
    });

    it('returns error for non-finite', () => {
        // NaN is falsy, so it hits the "lebih dari Rp 0" check first
        expect(validateAmount(NaN)).toBe('Nominal harus lebih dari Rp 0');
        // Infinity is truthy and > 0, so it passes the first check and hits isFinite
        expect(validateAmount(Infinity)).toBe('Nominal tidak valid');
    });

    it('returns error for too large amount', () => {
        expect(validateAmount(1_000_000_000_000)).toBe('Nominal terlalu besar');
    });
});

describe('validateGoalName', () => {
    it('returns null for valid goal name', () => {
        expect(validateGoalName('MacBook Pro')).toBeNull();
        expect(validateGoalName('Liburan ke Jepang')).toBeNull();
    });

    it('returns error for empty', () => {
        expect(validateGoalName('')).toBe('Nama target tidak boleh kosong');
    });

    it('returns error for name too short', () => {
        expect(validateGoalName('AB')).toBe('Nama target minimal 3 karakter');
    });

    it('returns error for name too long', () => {
        expect(validateGoalName('A'.repeat(51))).toBe('Nama target maksimal 50 karakter');
    });
});

describe('validateTargetAmount', () => {
    it('returns null for valid target', () => {
        expect(validateTargetAmount(50000)).toBeNull();
        expect(validateTargetAmount(10_000_000)).toBeNull();
    });

    it('returns error below minimum', () => {
        expect(validateTargetAmount(5000)).toBe('Target minimal Rp 10.000');
        expect(validateTargetAmount(9999)).toBe('Target minimal Rp 10.000');
    });

    it('returns error for zero or negative', () => {
        expect(validateTargetAmount(0)).toBe('Nominal harus lebih dari Rp 0');
        expect(validateTargetAmount(-100)).toBe('Nominal harus lebih dari Rp 0');
    });
});

describe('validateSavingPerPeriod', () => {
    it('returns null for valid saving', () => {
        expect(validateSavingPerPeriod(500000, 1_000_000)).toBeNull();
    });

    it('returns error when saving exceeds target', () => {
        expect(validateSavingPerPeriod(1_500_000, 1_000_000)).toBe('Nominal tabungan tidak boleh melebihi target');
    });

    it('returns error for invalid amount', () => {
        expect(validateSavingPerPeriod(0, 1_000_000)).toContain('Nominal');
        expect(validateSavingPerPeriod(-100, 1_000_000)).toContain('Nominal');
    });
});
