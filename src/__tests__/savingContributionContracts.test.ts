import {
    applySavingContribution,
    removeSavingContribution,
    updateSavingContributionAmount,
} from '../utils/savingContribution';

describe('saving contribution contracts', () => {
    it('deducts wallet balance and updates completion when adding contribution', () => {
        const result = applySavingContribution(
            {
                walletBalance: 500000,
                goalCurrentAmount: 800000,
                goalTargetAmount: 1000000,
            },
            250000,
        );

        expect(result.nextWalletBalance).toBe(250000);
        expect(result.nextGoalCurrentAmount).toBe(1050000);
        expect(result.nextGoalCompleted).toBe(true);
    });

    it('rejects additional contribution when wallet balance is insufficient', () => {
        expect(() =>
            applySavingContribution(
                {
                    walletBalance: 50000,
                    goalCurrentAmount: 100000,
                    goalTargetAmount: 300000,
                },
                60000,
            ),
        ).toThrow('Saldo dompet tidak cukup');
    });

    it('reverses delta correctly when editing contribution amount', () => {
        const result = updateSavingContributionAmount(
            {
                walletBalance: 150000,
                goalCurrentAmount: 700000,
                goalTargetAmount: 1000000,
            },
            100000,
            60000,
        );

        expect(result.nextWalletBalance).toBe(190000);
        expect(result.nextGoalCurrentAmount).toBe(660000);
        expect(result.nextGoalCompleted).toBe(false);
    });

    it('refunds wallet balance when removing a contribution', () => {
        const result = removeSavingContribution(
            {
                walletBalance: 120000,
                goalCurrentAmount: 400000,
                goalTargetAmount: 1000000,
            },
            90000,
        );

        expect(result.nextWalletBalance).toBe(210000);
        expect(result.nextGoalCurrentAmount).toBe(310000);
        expect(result.nextGoalCompleted).toBe(false);
    });
});
