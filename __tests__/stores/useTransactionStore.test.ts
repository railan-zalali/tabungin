// Test useTransactionStore: paginasi daftar transaksi + ringkasan SQL.
// Ringkasan sengaja dihitung terpisah dari baris yang dimuat supaya angka
// di layar tetap benar walau daftar hanya memuat satu halaman.
import {
    useTransactionStore,
    TRANSACTION_PAGE_SIZE,
} from '../../src/store/useTransactionStore';
import {
    fetchTransactions,
    fetchTransactionsTotals,
} from '../../src/database/transactionQueries';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useAuthStore } from '../../src/store/useAuthStore';

jest.mock('../../src/database/transactionQueries', () => ({
    fetchTransactions: jest.fn(),
    fetchTransactionsTotals: jest.fn(),
    fetchTransactionById: jest.fn(),
    fetchRecentTransactions: jest.fn(),
    insertTransaction: jest.fn(),
    updateTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
    fetchMonthlySummary: jest.fn(),
    fetchCategorySummary: jest.fn(),
    fetchMonthlyData: jest.fn(),
}));

jest.mock('../../src/database/sync', () => ({
    syncDatabase: jest.fn().mockResolvedValue(undefined),
    handleRealtimePayload: jest.fn(),
}));

jest.mock('../../src/store/useProfileStore', () => ({
    useProfileStore: { getState: jest.fn(() => ({ activeProfileId: 'p1' })) },
}));

jest.mock('../../src/store/useAuthStore', () => ({
    useAuthStore: { getState: jest.fn(() => ({ user: { email: 'budi@mail.com' } })) },
}));

const mockFetchTransactions = fetchTransactions as jest.Mock;
const mockFetchTotals = fetchTransactionsTotals as jest.Mock;

function rows(from: number, count: number) {
    return Array.from({ length: count }, (_, index) => ({ id: `tx-${from + index}` })) as never;
}

beforeEach(() => {
    jest.clearAllMocks();
    useTransactionStore.setState({
        transactions: [],
        recentTransactions: [],
        isLoading: false,
        isLoadingMore: false,
        hasMoreTransactions: false,
        listTotals: { count: 0, totalIncome: 0, totalExpense: 0 },
        filter: { type: 'all', period: 'month' },
    });
    mockFetchTransactions.mockResolvedValue(rows(0, 0));
    mockFetchTotals.mockResolvedValue({ count: 0, totalIncome: 0, totalExpense: 0 });
});

describe('loadTransactions', () => {
    it('memuat satu halaman dan menandai masih ada data', async () => {
        mockFetchTransactions.mockResolvedValue(rows(0, TRANSACTION_PAGE_SIZE));
        mockFetchTotals.mockResolvedValue({ count: 4821, totalIncome: 1000000, totalExpense: 6000000 });

        await useTransactionStore.getState().loadTransactions({ type: 'all', period: 'month' });

        const state = useTransactionStore.getState();
        expect(state.transactions).toHaveLength(TRANSACTION_PAGE_SIZE);
        expect(state.hasMoreTransactions).toBe(true);
        expect(mockFetchTransactions).toHaveBeenCalledWith(
            expect.objectContaining({ limit: TRANSACTION_PAGE_SIZE }),
        );
        expect(mockFetchTransactions).toHaveBeenCalledWith(
            expect.not.objectContaining({ offset: expect.anything() }),
        );
    });

    it('ringkasan tetap utuh walau daftar hanya memuat sebagian baris', async () => {
        mockFetchTransactions.mockResolvedValue(rows(0, TRANSACTION_PAGE_SIZE));
        mockFetchTotals.mockResolvedValue({ count: 4821, totalIncome: 1000000, totalExpense: 6000000 });

        await useTransactionStore.getState().loadTransactions();

        const state = useTransactionStore.getState();
        expect(state.listTotals.count).toBe(4821);
        expect(state.listTotals.count).toBeGreaterThan(state.transactions.length);
        expect(state.filter).toMatchObject({
            profile_id: 'p1',
            userEmail: 'budi@mail.com',
        });
    });

    it('tidak menandai halaman lanjutan bila hasilnya kurang dari satu halaman', async () => {
        mockFetchTransactions.mockResolvedValue(rows(0, 3));

        await useTransactionStore.getState().loadTransactions();

        expect(useTransactionStore.getState().hasMoreTransactions).toBe(false);
    });
});

describe('loadMoreTransactions', () => {
    it('mengambil halaman berikutnya dan menyambungkannya', async () => {
        mockFetchTransactions
            .mockResolvedValueOnce(rows(0, TRANSACTION_PAGE_SIZE))
            .mockResolvedValueOnce(rows(TRANSACTION_PAGE_SIZE, 12));

        await useTransactionStore.getState().loadTransactions();
        await useTransactionStore.getState().loadMoreTransactions();

        const state = useTransactionStore.getState();
        expect(state.transactions).toHaveLength(TRANSACTION_PAGE_SIZE + 12);
        expect(state.hasMoreTransactions).toBe(false);
        expect(mockFetchTransactions).toHaveBeenLastCalledWith(
            expect.objectContaining({ limit: TRANSACTION_PAGE_SIZE, offset: TRANSACTION_PAGE_SIZE }),
        );
        // Ringkasan tidak dihitung ulang saat halaman ditambah.
        expect(mockFetchTotals).toHaveBeenCalledTimes(1);
    });

    it('berhenti memuat setelah halaman terakhir', async () => {
        mockFetchTransactions
            .mockResolvedValueOnce(rows(0, TRANSACTION_PAGE_SIZE))
            .mockResolvedValueOnce(rows(TRANSACTION_PAGE_SIZE, 0));

        await useTransactionStore.getState().loadTransactions();
        await useTransactionStore.getState().loadMoreTransactions();
        await useTransactionStore.getState().loadMoreTransactions();

        expect(mockFetchTransactions).toHaveBeenCalledTimes(2);
        expect(useTransactionStore.getState().hasMoreTransactions).toBe(false);
    });

    it('tidak mengambil halaman saat daftar masih dimuat', async () => {
        mockFetchTransactions.mockReturnValueOnce(new Promise(() => {}));

        void useTransactionStore.getState().loadTransactions();
        await useTransactionStore.getState().loadMoreTransactions();

        expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    });
});
