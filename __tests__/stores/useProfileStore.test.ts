import { useProfileStore } from '../../src/store/useProfileStore';
import { useWalletStore } from '../../src/store/useWalletStore';
import { useTransactionStore } from '../../src/store/useTransactionStore';
import { useSavingStore } from '../../src/store/useSavingStore';

// Mock semua modul query yang di-import store (termasuk dynamic import)
jest.mock('../../src/database/profileQueries', () => ({
    fetchProfiles: jest.fn().mockResolvedValue([]),
    insertProfile: jest.fn(),
}));

jest.mock('../../src/database/walletQueries', () => ({
    fetchWallets: jest.fn().mockResolvedValue([]),
    fetchTotalBalance: jest.fn().mockResolvedValue(0),
    insertWallet: jest.fn(),
    updateWallet: jest.fn(),
    deleteWallet: jest.fn(),
}));

jest.mock('../../src/database/transactionQueries', () => ({
    fetchTransactions: jest.fn().mockResolvedValue([]),
    fetchRecentTransactions: jest.fn().mockResolvedValue([]),
    fetchTransactionSummary: jest.fn().mockResolvedValue({
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
    }),
    insertTransaction: jest.fn(),
    updateTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
}));

jest.mock('../../src/database/savingQueries', () => ({
    fetchSavingGoals: jest.fn().mockResolvedValue([]),
    fetchSavingGoalById: jest.fn().mockResolvedValue(null),
    insertSavingGoal: jest.fn(),
    updateSavingGoal: jest.fn(),
    deleteSavingGoal: jest.fn(),
    insertSavingLog: jest.fn(),
    deleteSavingLog: jest.fn(),
}));

jest.mock('../../src/database/walletSharingService', () => ({
    syncAccessibleWalletsFromServer: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/database/sync', () => ({
    syncDatabase: jest.fn().mockResolvedValue(undefined),
    handleRealtimePayload: jest.fn().mockResolvedValue(false),
    getLastSyncTime: jest.fn().mockResolvedValue(0),
    setLastSyncTime: jest.fn(),
    SYNC_TABLES: [],
}));

describe('useProfileStore.switchProfile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useProfileStore.setState({
            profiles: [],
            activeProfileId: 'p1',
            isLoading: false,
        });
    });

    it('sets the new active profile', async () => {
        await useProfileStore.getState().switchProfile('p2');
        expect(useProfileStore.getState().activeProfileId).toBe('p2');
    });

    it('reloads dependent stores (wallet, transaction, saving)', async () => {
        const walletLoad = jest.spyOn(useWalletStore.getState(), 'loadWallets');
        const txLoad = jest.spyOn(useTransactionStore.getState(), 'loadTransactions');
        const txRecent = jest.spyOn(useTransactionStore.getState(), 'loadRecent');
        const txSummary = jest.spyOn(useTransactionStore.getState(), 'refreshSummary');
        const goalsLoad = jest.spyOn(useSavingStore.getState(), 'loadGoals');

        await useProfileStore.getState().switchProfile('p2');

        expect(walletLoad).toHaveBeenCalled();
        expect(txLoad).toHaveBeenCalled();
        expect(txRecent).toHaveBeenCalled();
        expect(txSummary).toHaveBeenCalled();
        expect(goalsLoad).toHaveBeenCalled();

        walletLoad.mockRestore();
        txLoad.mockRestore();
        txRecent.mockRestore();
        txSummary.mockRestore();
        goalsLoad.mockRestore();
    });

    it('is a no-op when switching to the same profile', async () => {
        useProfileStore.setState({ activeProfileId: 'p1' });
        const walletLoad = jest.spyOn(useWalletStore.getState(), 'loadWallets');

        await useProfileStore.getState().switchProfile('p1');

        expect(useProfileStore.getState().activeProfileId).toBe('p1');
        expect(walletLoad).not.toHaveBeenCalled();
        walletLoad.mockRestore();
    });

    it('still switches profile when a dependent store reload fails', async () => {
        const walletLoad = jest
            .spyOn(useWalletStore.getState(), 'loadWallets')
            .mockRejectedValue(new Error('boom'));

        await useProfileStore.getState().switchProfile('p9');

        expect(useProfileStore.getState().activeProfileId).toBe('p9');
        walletLoad.mockRestore();
    });
});

describe('useProfileStore.setActiveProfile', () => {
    it('updates active profile synchronously', () => {
        useProfileStore.setState({ activeProfileId: 'p1' });
        useProfileStore.getState().setActiveProfile('p7');
        expect(useProfileStore.getState().activeProfileId).toBe('p7');
    });
});
