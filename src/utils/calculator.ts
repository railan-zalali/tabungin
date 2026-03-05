// Kalkulasi logika tabungan untuk Tabungin
import type { PeriodType, SimulationResult } from '../types/saving';

/**
 * Hitung estimasi hari untuk mencapai target tabungan
 */
export function calculateDaysToGoal(
    targetAmount: number,
    currentAmount: number,
    savingPerPeriod: number,
    periodType: PeriodType
): number {
    const remaining = targetAmount - currentAmount;
    if (remaining <= 0) return 0;
    if (savingPerPeriod <= 0) return Infinity;

    const dailyRate =
        periodType === 'daily'
            ? savingPerPeriod
            : periodType === 'weekly'
                ? savingPerPeriod / 7
                : savingPerPeriod / 30;

    return Math.ceil(remaining / dailyRate);
}

/**
 * Hitung estimasi tanggal selesai berdasarkan jumlah hari
 */
export function calculateEstimatedDate(daysToGoal: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysToGoal);
    return date;
}

/**
 * Simulasi: Berapa lama jika nominal tabungan diubah?
 */
export function simulateSaving(
    targetAmount: number,
    currentAmount: number,
    newSavingAmount: number,
    periodType: PeriodType
): SimulationResult {
    const days = calculateDaysToGoal(targetAmount, currentAmount, newSavingAmount, periodType);
    const estimatedDate = calculateEstimatedDate(days);
    return {
        days,
        weeks: Math.ceil(days / 7),
        months: Math.ceil(days / 30),
        estimatedDate,
    };
}

/**
 * Hitung persentase progress tabungan
 */
export function calculateProgress(current: number, target: number): number {
    if (target <= 0) return 100;
    return Math.min((current / target) * 100, 100);
}

/**
 * Hitung total yang perlu ditabung per periode untuk mencapai target dalam N hari
 */
export function calculateRequiredSaving(
    targetAmount: number,
    currentAmount: number,
    targetDays: number,
    periodType: PeriodType
): number {
    const remaining = targetAmount - currentAmount;
    if (remaining <= 0 || targetDays <= 0) return 0;

    const divisor =
        periodType === 'daily'
            ? targetDays
            : periodType === 'weekly'
                ? targetDays / 7
                : targetDays / 30;

    return Math.ceil(remaining / divisor);
}

/**
 * Format durasi dalam bentuk teks yang ramah pengguna
 */
export function formatDuration(days: number): string {
    if (days === 0) return '0 hari';
    if (days === 1) return '1 hari';
    if (days < 7) return `${days} hari`;
    if (days < 14) return '1 minggu';
    if (days < 30) return `${Math.round(days / 7)} minggu`;
    if (days < 60) return '1 bulan';
    if (days < 365) return `${Math.round(days / 30)} bulan`;
    return `${(days / 365).toFixed(1)} tahun`;
}
