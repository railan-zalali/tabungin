// Utilitas format mata uang Rupiah Indonesia

/**
 * Format angka menjadi format Rupiah Indonesia
 * Contoh: 1500000 → "Rp 1.500.000"
 */
export function formatCurrency(amount: number, withSymbol = true): string {
    const isNegative = amount < 0;
    const formatted = Math.abs(Math.round(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    const prefixed = withSymbol ? `Rp ${formatted}` : formatted;
    return isNegative ? `-${prefixed}` : prefixed;
}

// Alias untuk kompatibilitas
export const formatRupiah = formatCurrency;

/**
 * Format angka Rupiah singkat untuk tampilan yang lebih compact
 * Contoh: 1500000 → "Rp 1,5 Jt" | 18000000 → "Rp 18 Jt"
 */
export function formatRupiahShort(amount: number): string {
    if (amount >= 1_000_000_000) {
        return `Rp ${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
    }
    if (amount >= 1_000_000) {
        return `Rp ${(amount / 1_000_000).toFixed(1).replace('.0', '')} Jt`;
    }
    if (amount >= 1_000) {
        return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
    }
    return formatCurrency(amount);
}

/**
 * Parse string Rupiah menjadi angka
 * Contoh: "1.500.000" → 1500000
 */
export function parseRupiah(value: string): number {
    const cleaned = value.replace(/[^\d]/g, '');
    return parseInt(cleaned, 10) || 0;
}

/**
 * Format input numerik dengan pemisah ribuan saat pengguna mengetik
 * Contoh: "1500000" → "1.500.000"
 */
export function formatInputRupiah(value: string): string {
    const digits = value.replace(/[^\d]/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Validasi apakah jumlah valid (lebih dari 0)
 */
export function isValidAmount(amount: number): boolean {
    return amount > 0 && isFinite(amount);
}
