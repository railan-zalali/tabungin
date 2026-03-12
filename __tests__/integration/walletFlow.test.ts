
import { insertWallet, fetchWallets, updateWallet, deleteWallet, type Wallet } from '../../src/database/walletQueries';
import { getDatabase } from '../../src/database/schema';

// Mock getDatabase since we can't run real SQLite in Jest environment without setup
jest.mock('../../src/database/schema', () => ({
    getDatabase: jest.fn(),
}));

describe('Wallet Integration Flow', () => {
    let mockDb: any;
    let mockRunAsync: jest.Mock;
    let mockGetFirstAsync: jest.Mock;
    let mockGetAllAsync: jest.Mock;
    let mockWithTransactionAsync: jest.Mock;

    beforeEach(() => {
        mockRunAsync = jest.fn();
        mockGetFirstAsync = jest.fn();
        mockGetAllAsync = jest.fn();
        mockWithTransactionAsync = jest.fn(async (callback) => await callback());

        mockDb = {
            runAsync: mockRunAsync,
            getFirstAsync: mockGetFirstAsync,
            getAllAsync: mockGetAllAsync,
            withTransactionAsync: mockWithTransactionAsync,
        };

        (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    });

    it('should create a new wallet correctly', async () => {
        const newWalletData = {
            name: 'Test Wallet',
            type: 'cash' as const,
            color: '#1DB954',
            balance: 500000,
            is_default: false,
        };

        // Mock check for existing default wallet
        mockGetFirstAsync.mockResolvedValueOnce({ count: 1 }); 

        const result = await insertWallet(newWalletData);

        expect(result).toMatchObject({
            name: newWalletData.name,
            balance: newWalletData.balance,
        });
        expect(result.id).toBeDefined();
        
        // Verify DB calls
        expect(mockRunAsync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO wallets'),
            expect.arrayContaining([newWalletData.name, newWalletData.balance])
        );
    });

    it('should enforce default wallet rule when creating first wallet', async () => {
        const firstWallet = {
            name: 'First Wallet',
            type: 'general' as const,
            color: '#000',
            balance: 0,
            is_default: false, // User didn't set as default
        };

        // Mock count = 0 (no wallets exist)
        mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });

        await insertWallet(firstWallet);

        // Should force is_default = 1
        expect(mockRunAsync).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO wallets'),
            expect.arrayContaining([1]) // is_default should be true (1)
        );
    });

    it('should switch default wallet when updating', async () => {
        const walletId = 'wallet-123';
        const updateData = { is_default: true };

        await updateWallet(walletId, updateData);

        // Should verify it unsets other defaults
        expect(mockRunAsync).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE wallets SET is_default = 0'),
            expect.any(Array)
        );

        // Should update target wallet
        expect(mockRunAsync).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE wallets SET'),
            expect.arrayContaining([1, walletId])
        );
    });

    it('should prevent deleting default wallet', async () => {
        const walletId = 'default-wallet-id';
        
        // Mock wallet is default
        mockGetFirstAsync.mockResolvedValueOnce({ is_default: 1 });

        await expect(deleteWallet(walletId)).rejects.toThrow('Tidak dapat menghapus dompet utama');
    });
});
