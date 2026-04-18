export interface SavingContributionState {
    walletBalance: number;
    goalCurrentAmount: number;
    goalTargetAmount: number;
}

export interface SavingContributionResult {
    nextWalletBalance: number;
    nextGoalCurrentAmount: number;
    nextGoalCompleted: boolean;
}

function ensurePositiveAmount(amount: number, message: string) {
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(message);
    }
}

export function applySavingContribution(
    state: SavingContributionState,
    amount: number,
): SavingContributionResult {
    ensurePositiveAmount(amount, 'Nominal kontribusi harus lebih dari Rp 0.');

    if (state.walletBalance < amount) {
        throw new Error('Saldo dompet tidak cukup untuk menambah tabungan sebesar itu.');
    }

    const nextGoalCurrentAmount = state.goalCurrentAmount + amount;
    return {
        nextWalletBalance: state.walletBalance - amount,
        nextGoalCurrentAmount,
        nextGoalCompleted: nextGoalCurrentAmount >= state.goalTargetAmount,
    };
}

export function updateSavingContributionAmount(
    state: SavingContributionState,
    previousAmount: number,
    nextAmount: number,
): SavingContributionResult {
    ensurePositiveAmount(previousAmount, 'Kontribusi sebelumnya tidak valid.');
    ensurePositiveAmount(nextAmount, 'Nominal kontribusi harus lebih dari Rp 0.');

    const delta = nextAmount - previousAmount;
    if (delta > 0 && state.walletBalance < delta) {
        throw new Error('Saldo dompet tidak cukup untuk menaikkan kontribusi sebesar itu.');
    }

    const nextGoalCurrentAmount = state.goalCurrentAmount + delta;
    if (nextGoalCurrentAmount < 0) {
        throw new Error('Nilai target menjadi tidak valid setelah perubahan kontribusi.');
    }

    return {
        nextWalletBalance: state.walletBalance - delta,
        nextGoalCurrentAmount,
        nextGoalCompleted: nextGoalCurrentAmount >= state.goalTargetAmount,
    };
}

export function removeSavingContribution(
    state: SavingContributionState,
    amount: number,
): SavingContributionResult {
    ensurePositiveAmount(amount, 'Nominal kontribusi yang dihapus tidak valid.');

    const nextGoalCurrentAmount = Math.max(state.goalCurrentAmount - amount, 0);
    return {
        nextWalletBalance: state.walletBalance + amount,
        nextGoalCurrentAmount,
        nextGoalCompleted: nextGoalCurrentAmount >= state.goalTargetAmount,
    };
}
