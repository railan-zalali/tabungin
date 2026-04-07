import type { PeriodType } from '../types/saving';

export type SavingPaceStatus = 'ahead' | 'on_track' | 'behind';

export interface SavingPlanInsight {
    status: SavingPaceStatus;
    requiredPerPeriod: number;
    variancePerPeriod: number;
    periodsLeft: number;
}

function millisecondsPerPeriod(periodType: PeriodType): number {
    switch (periodType) {
        case 'daily':
            return 1000 * 60 * 60 * 24;
        case 'weekly':
            return 1000 * 60 * 60 * 24 * 7;
        case 'monthly':
        default:
            return 1000 * 60 * 60 * 24 * 30;
    }
}

export function getSavingPlanInsight(
    targetAmount: number,
    currentAmount: number,
    savingPerPeriod: number,
    periodType: PeriodType,
    deadlineAt: number,
    now: number = Date.now(),
): SavingPlanInsight | null {
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;
    if (!Number.isFinite(deadlineAt) || deadlineAt <= now) return null;

    const remainingAmount = Math.max(targetAmount - currentAmount, 0);
    if (remainingAmount <= 0) {
        return {
            status: 'ahead',
            requiredPerPeriod: 0,
            variancePerPeriod: Math.max(savingPerPeriod, 0),
            periodsLeft: 0,
        };
    }

    const periodsLeft = Math.max(1, Math.ceil((deadlineAt - now) / millisecondsPerPeriod(periodType)));
    const requiredPerPeriod = Math.ceil(remainingAmount / periodsLeft);
    const variancePerPeriod = Math.round((savingPerPeriod || 0) - requiredPerPeriod);

    let status: SavingPaceStatus = 'on_track';
    if ((savingPerPeriod || 0) < requiredPerPeriod * 0.95) {
        status = 'behind';
    } else if ((savingPerPeriod || 0) > requiredPerPeriod * 1.15) {
        status = 'ahead';
    }

    return {
        status,
        requiredPerPeriod,
        variancePerPeriod,
        periodsLeft,
    };
}

export function getSavingPlanLabel(status: SavingPaceStatus): string {
    switch (status) {
        case 'ahead':
            return 'Ahead of schedule';
        case 'behind':
            return 'Behind schedule';
        case 'on_track':
        default:
            return 'On track';
    }
}
