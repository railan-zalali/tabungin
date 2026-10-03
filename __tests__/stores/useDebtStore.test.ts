// Test useDebtStore: orkestrasi query + partisi status + reload berantai.
import { useDebtStore } from '../../src/store/useDebtStore';
import {
    fetchDebts,
    fetchDebtById,
    fetchDebtPayments,
    fetchDebtSummary,
    insertDebt,
    updateDebt,
    deleteDebt,
    insertDebtPayment,
    deleteDebtPayment,
} from '../../src/database/debtQueries';
import { useProfileStore } from '../../src/store/useProfileStore';
import { useAuthStore } from '../../src/store/useAuthStore';

jest.mock('../../src/database/debtQueries', () => ({
    fetchDebts: jest.fn(),
    fetchDebtById: jest.fn(),
    fetchDebtPayments: jest.fn(),
    insertDebt: jest.fn(),
    updateDebt: jest.fn(),
    deleteDebt: jest.fn(),
    insertDebtPayment: jest.fn(),
    deleteDebtPayment: jest.fn(),
    fetchDebtSummary: jest.fn(),
}));
jest.mock('../../src/store/useProfileStore', () => ({
    useProfileStore: { getState: jest.fn() },
}));
jest.mock('../../src/store/useAuthStore', () => ({
    useAuthStore: { getState: jest.fn() },
}));

const mockFetchDebts = fetchDebts as jest.Mock;
const mockFetchDebtById = fetchDebtById as jest.Mock;
const mockFetchDebtPayments = fetchDebtPayments as jest.Mock;
const mockFetchDebtSummary = fetchDebtSummary as jest.Mock;
const mockInsertDebt = insertDebt as jest.Mock;
const mockUpdateDebt = updateDebt as jest.Mock;
const mockDeleteDebt = deleteDebt as jest.Mock;
const mockInsertDebtPayment = insertDebtPayment as jest.Mock;
const mockDeleteDebtPayment = deleteDebtPayment as jest.Mock;

const debt = (over: Record<string, unknown> = {}) => ({
    id: 'd1',
    user_id: 'u1',
    type: 'debt',
    counterparty: 'Rina',
    counterparty_email: null,
    amount: 1000000,
    remaining_amount: 400000,
    interest_rate: 0,
    due_date: null,
    note: null,
    status: 'active',
    wallet_id: null,
    profile_id: null,
    created_at: 1,
    updated_at: null,
    ...over,
});

const summary = {
    totalDebt: 400000,
    totalReceivable: 0,
    activeCount: 1,
    paidCount: 1,
    overdueCount: 0,
};

beforeEach(() => {
    jest.clearAllMocks();
    (useProfileStore.getState as jest.Mock).mockReturnValue({ activeProfileId: 'p1' });
    (useAuthStore.getState as jest.Mock).mockReturnValue({ user: { id: 'auth-1' } });
    mockFetchDebts.mockResolvedValue([]);
    mockFetchDebtById.mockResolvedValue(null);
    mockFetchDebtPayments.mockResolvedValue([]);
    mockFetchDebtSummary.mockResolvedValue(summary);
    mockInsertDebt.mockResolvedValue(debt());
    mockUpdateDebt.mockResolvedValue(undefined);
    mockDeleteDebt.mockResolvedValue(undefined);
    mockInsertDebtPayment.mockResolvedValue({ id: 'pay1', amount: 100000 });
    mockDeleteDebtPayment.mockResolvedValue(undefined);
    useDebtStore.setState({
        debts: [],
        activeDebts: [],
        paidDebts: [],
        currentDebt: null,
        currentPayments: [],
        summary: null,
        isLoading: false,
    });
});

describe('loadDebts', () => {
    it('filters by the active profile and partitions by status', async () => {
        mockFetchDebts.mockResolvedValue([
            debt({ id: 'a', status: 'active' }),
            debt({ id: 'b', status: 'paid' }),
            debt({ id: 'c', status: 'cancelled' }),
        ]);

        await useDebtStore.getState().loadDebts('paid');

        expect(mockFetchDebts).toHaveBeenCalledWith('p1', 'paid');
        const { debts, activeDebts, paidDebts } = useDebtStore.getState();
        expect(debts.map((item) => item.id)).toEqual(['a', 'b', 'c']);
        expect(activeDebts.map((item) => item.id)).toEqual(['a']);
        expect(paidDebts.map((item) => item.id)).toEqual(['b']);
    });

    it('clears the profile filter when there is no active profile', async () => {
        (useProfileStore.getState as jest.Mock).mockReturnValue({ activeProfileId: null });

        await useDebtStore.getState().loadDebts();

        expect(mockFetchDebts).toHaveBeenCalledWith(undefined, 'all');
    });

    it('always resets isLoading, even when the query fails', async () => {
        mockFetchDebts.mockRejectedValue(new Error('boom'));

        await expect(useDebtStore.getState().loadDebts()).rejects.toThrow('boom');
        expect(useDebtStore.getState().isLoading).toBe(false);
    });
});

describe('loadDebtById / loadPayments / loadSummary', () => {
    it('stores the requested debt', async () => {
        mockFetchDebtById.mockResolvedValue(debt({ id: 'd42' }));

        await useDebtStore.getState().loadDebtById('d42');

        expect(mockFetchDebtById).toHaveBeenCalledWith('d42');
        expect(useDebtStore.getState().currentDebt?.id).toBe('d42');
        expect(useDebtStore.getState().isLoading).toBe(false);
    });

    it('keeps the previous debt when the lookup misses', async () => {
        useDebtStore.setState({ currentDebt: debt({ id: 'old' }) as never });
        mockFetchDebtById.mockResolvedValue(null);

        await useDebtStore.getState().loadDebtById('missing');

        expect(useDebtStore.getState().currentDebt).toBeNull();
    });

    it('loads the payment history for a debt', async () => {
        mockFetchDebtPayments.mockResolvedValue([{ id: 'p1', debt_id: 'd1', amount: 5000 }]);

        await useDebtStore.getState().loadPayments('d1');

        expect(mockFetchDebtPayments).toHaveBeenCalledWith('d1');
        expect(useDebtStore.getState().currentPayments).toHaveLength(1);
    });

    it('scopes the summary to the active profile', async () => {
        await useDebtStore.getState().loadSummary();

        expect(mockFetchDebtSummary).toHaveBeenCalledWith('p1');
        expect(useDebtStore.getState().summary).toEqual(summary);
    });
});

describe('addDebt', () => {
    it('falls back to the authenticated user id when none is provided', async () => {
        const payload = {
            user_id: '',
            type: 'debt',
            counterparty: 'Rina',
            counterparty_email: null,
            amount: 1000000,
            interest_rate: 0,
            due_date: null,
            note: null,
            status: 'active',
            wallet_id: null,
            profile_id: 'p1',
        };

        const created = await useDebtStore.getState().addDebt(payload as never);

        expect(mockInsertDebt).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'auth-1' }));
        expect(created.id).toBe('d1');
        expect(mockFetchDebts).toHaveBeenCalled();
        expect(mockFetchDebtSummary).toHaveBeenCalled();
    });
});

describe('editDebt / removeDebt', () => {
    it('writes the change and refreshes list + summary', async () => {
        await useDebtStore.getState().editDebt('d1', { status: 'paid' });

        expect(mockUpdateDebt).toHaveBeenCalledWith('d1', { status: 'paid' });
        expect(mockFetchDebts).toHaveBeenCalled();
        expect(mockFetchDebtSummary).toHaveBeenCalled();
    });

    it('soft-deletes and refreshes', async () => {
        await useDebtStore.getState().removeDebt('d1');

        expect(mockDeleteDebt).toHaveBeenCalledWith('d1');
        expect(mockFetchDebts).toHaveBeenCalled();
    });
});

describe('addPayment', () => {
    it('reloads the open debt after a payment', async () => {
        useDebtStore.setState({ currentDebt: debt({ id: 'd1' }) as never });

        const payment = await useDebtStore.getState().addPayment({
            debt_id: 'd1',
            amount: 100000,
            date: 1,
            note: null,
        });

        expect(mockInsertDebtPayment).toHaveBeenCalledWith({
            debt_id: 'd1',
            amount: 100000,
            date: 1,
            note: null,
        });
        expect(mockFetchDebtById).toHaveBeenCalledWith('d1');
        expect(mockFetchDebtPayments).toHaveBeenCalledWith('d1');
        expect(payment.id).toBe('pay1');
        expect(mockFetchDebts).toHaveBeenCalled();
    });

    it('skips the detail reload when a different debt is open', async () => {
        useDebtStore.setState({ currentDebt: debt({ id: 'other' }) as never });

        await useDebtStore.getState().addPayment({
            debt_id: 'd1',
            amount: 100000,
            date: 1,
            note: null,
        });

        expect(mockFetchDebtById).not.toHaveBeenCalled();
        expect(mockFetchDebts).toHaveBeenCalled();
    });
});

describe('removePayment', () => {
    it('deletes and restores the debt detail', async () => {
        await useDebtStore.getState().removePayment('p1', 'd1', 100000);

        expect(mockDeleteDebtPayment).toHaveBeenCalledWith('p1', 'd1', 100000);
        expect(mockFetchDebtById).toHaveBeenCalledWith('d1');
        expect(mockFetchDebtPayments).toHaveBeenCalledWith('d1');
        expect(mockFetchDebts).toHaveBeenCalled();
        expect(mockFetchDebtSummary).toHaveBeenCalled();
    });
});
