jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    multiSet: jest.fn(),
    multiRemove: jest.fn(),
}));

import { previewCsvImport, previewJsonImport } from '../utils/importData';

describe('import export contracts', () => {
    it('recognizes full-backup json sections for restore-safe imports', () => {
        const preview = previewJsonImport(
            JSON.stringify({
                version: 2,
                exportedAt: 1,
                profiles: [{ id: 'profile-1', name: 'Pribadi', icon: 'account', color: '#1D7D53' }],
                wallets: [{ id: 'wallet-1', profile_id: 'profile-1', name: 'Dompet Utama', type: 'cash' }],
                transactions: [{ id: 'tx-1', type: 'expense', amount: 25000, category: 'Makan', date: 1 }],
                budgets: [{ id: 'budget-1', category: 'Makan', amount: 100000, month: 4, year: 2026 }],
                goals: [{ id: 'goal-1', name: 'Laptop', target_amount: 15000000, current_amount: 5000000 }],
                savingLogs: [{ id: 'log-1', goal_id: 'goal-1', amount: 5000000, date: 1 }],
                walletMembers: [{ id: 'member-1', wallet_id: 'wallet-1', user_email: 'owner@example.com', role: 'owner', status: 'active' }],
                walletGoalShares: [{ id: 'share-1', goal_id: 'goal-1', wallet_id: 'wallet-1', user_email: 'ally@example.com', shared_by: 'owner@example.com', shared_at: 1 }],
                sharingActivity: [{ id: 'activity-1', goal_id: 'goal-1', wallet_id: 'wallet-1', action: 'goal_created', performed_by: 'owner-1', timestamp: 1 }],
            }),
        );

        expect(preview.fullBackup).toBeDefined();
        expect(preview.importedProfiles).toBe(1);
        expect(preview.importedWallets).toBe(1);
        expect(preview.importedTransactions).toBe(1);
        expect(preview.importedBudgets).toBe(1);
        expect(preview.importedGoals).toBe(1);
        expect(preview.importedSavingLogs).toBe(1);
    });

    it('parses exported multi-section csv as transaction-only import input', () => {
        const preview = previewCsvImport([
            'TRANSAKSI',
            'ID,Jenis,Kategori,Jumlah,Catatan,Tanggal,Dibuat Pada',
            '"tx-1","expense","Makan","25000","Siang","2026-04-01","2026-04-01"',
            '',
            'TARGET TABUNGAN',
            'ID,Nama,Target,Saat Ini,Emoji,Warna,Tanggal Mulai,Estimasi Selesai,Dibuat Pada',
            '"goal-1","Laptop","15000000","5000000","🎯","#1D7D53","2026-04-01","2026-12-01","2026-04-01"',
        ].join('\n'));

        expect(preview.importedTransactions).toBe(1);
        expect(preview.importedGoals).toBe(0);
        expect(preview.failedRows).toBe(0);
    });
});
