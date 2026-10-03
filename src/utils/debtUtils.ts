// Helper perhitungan & label untuk debt tracking (utang / piutang).
import type { Debt, DebtType, DebtStatus } from '../types/debt';
import { formatDateShort } from './date';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Batas "jatuh tempo segera" dalam hari. */
export const DEBT_DUE_SOON_DAYS = 7;

export type DebtDueState = 'settled' | 'no_due_date' | 'overdue' | 'due_soon' | 'upcoming';

export function getDebtTypeLabel(type: DebtType): string {
    return type === 'debt' ? 'Utang' : 'Piutang';
}

/** Sudah dibayar = total - sisa, dibatasi >= 0 (sisa bisa lebih besar dari total). */
export function getDebtPaidAmount(debt: Pick<Debt, 'amount' | 'remaining_amount'>): number {
    return Math.max(debt.amount - debt.remaining_amount, 0);
}

/** Progres pembayaran 0-100. */
export function getDebtProgress(debt: Pick<Debt, 'amount' | 'remaining_amount'>): number {
    if (debt.amount <= 0) return 0;
    return Math.min(100, Math.round((getDebtPaidAmount(debt) / debt.amount) * 100));
}

/** Total yang harus dibayar setelah bunga (bunga bersifat informatif). */
export function getDebtTotalWithInterest(debt: Pick<Debt, 'amount' | 'interest_rate'>): number {
    return debt.amount * (1 + (debt.interest_rate ?? 0) / 100);
}

export function getDebtDueState(
    debt: Pick<Debt, 'status' | 'due_date'>,
    now: number = Date.now(),
): DebtDueState {
    if (debt.status !== 'active') return 'settled';
    if (!debt.due_date) return 'no_due_date';
    if (debt.due_date < now) return 'overdue';
    return Math.floor((debt.due_date - now) / DAY_MS) <= DEBT_DUE_SOON_DAYS ? 'due_soon' : 'upcoming';
}

/** Label singkat status jatuh tempo, siap ditampilkan di kartu/list. */
export function getDebtDueLabel(
    debt: Pick<Debt, 'status' | 'due_date'>,
    now: number = Date.now(),
): string {
    const state = getDebtDueState(debt, now);

    switch (state) {
        case 'settled':
            return debt.status === 'paid' ? 'Lunas' : 'Dibatalkan';
        case 'no_due_date':
            return 'Tanpa jatuh tempo';
        case 'overdue': {
            const lateDays = Math.ceil((now - (debt.due_date ?? now)) / DAY_MS);
            return `Terlambat ${lateDays} hari`;
        }
        case 'due_soon':
        case 'upcoming':
        default:
            return `Jatuh tempo ${formatDateShort(debt.due_date ?? now)}`;
    }
}

export function getDebtStatusLabel(status: DebtStatus): string {
    switch (status) {
        case 'paid':
            return 'Lunas';
        case 'cancelled':
            return 'Dibatalkan';
        case 'active':
        default:
            return 'Aktif';
    }
}
