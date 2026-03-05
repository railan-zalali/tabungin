// Validasi input form untuk Tabungin

/**
 * Validasi email
 */
export function validateEmail(email: string): string | null {
    if (!email.trim()) return 'Email tidak boleh kosong';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return 'Format email tidak valid';
    return null;
}

/**
 * Validasi password
 */
export function validatePassword(password: string): string | null {
    if (!password) return 'Password tidak boleh kosong';
    if (password.length < 8) return 'Password minimal 8 karakter';
    return null;
}

/**
 * Validasi konfirmasi password
 */
export function validateConfirmPassword(password: string, confirm: string): string | null {
    if (!confirm) return 'Konfirmasi password tidak boleh kosong';
    if (password !== confirm) return 'Password tidak sama';
    return null;
}

/**
 * Validasi nama pengguna
 */
export function validateName(name: string): string | null {
    if (!name.trim()) return 'Nama tidak boleh kosong';
    if (name.trim().length < 2) return 'Nama minimal 2 karakter';
    return null;
}

/**
 * Validasi nominal transaksi
 */
export function validateAmount(amount: number): string | null {
    if (!amount || amount <= 0) return 'Nominal harus lebih dari Rp 0';
    if (!isFinite(amount)) return 'Nominal tidak valid';
    if (amount > 999_999_999_999) return 'Nominal terlalu besar';
    return null;
}

/**
 * Validasi nama saving goal
 */
export function validateGoalName(name: string): string | null {
    if (!name.trim()) return 'Nama target tidak boleh kosong';
    if (name.trim().length < 3) return 'Nama target minimal 3 karakter';
    if (name.trim().length > 50) return 'Nama target maksimal 50 karakter';
    return null;
}

/**
 * Validasi target amount saving goal
 */
export function validateTargetAmount(amount: number): string | null {
    const baseError = validateAmount(amount);
    if (baseError) return baseError;
    if (amount < 10000) return 'Target minimal Rp 10.000';
    return null;
}

/**
 * Validasi saving per period
 */
export function validateSavingPerPeriod(amount: number, targetAmount: number): string | null {
    const baseError = validateAmount(amount);
    if (baseError) return `Nominal tabungan ${baseError.toLowerCase()}`;
    if (amount > targetAmount) return 'Nominal tabungan tidak boleh melebihi target';
    return null;
}
