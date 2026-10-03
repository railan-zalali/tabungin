// Test utilitas export laporan (CSV, PDF, backup JSON).
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import {
    exportTransactionsCSV,
    exportReportPDF,
    exportBackupJSON,
} from '../../src/utils/exportUtils';
import type { Transaction } from '../../src/types/transaction';
import type { BudgetWithSpent } from '../../src/database/budgetQueries';

jest.mock('expo-file-system/legacy', () => ({
    documentDirectory: 'file:///documents/',
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    moveAsync: jest.fn().mockResolvedValue(undefined),
    EncodingType: { UTF8: 'utf8', ASCII: 'ascii' },
}));

const writeAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;
const moveAsync = FileSystem.moveAsync as jest.Mock;
const shareAsync = Sharing.shareAsync as jest.Mock;
const isAvailableAsync = Sharing.isAvailableAsync as jest.Mock;
const printToFileAsync = Print.printToFileAsync as jest.Mock;

const tx = (over: Partial<Transaction> = {}): Transaction =>
    ({
        id: 'tx-1',
        type: 'expense',
        category: 'Transport',
        amount: 15000,
        note: 'Bensin, harian',
        date: Date.UTC(2026, 1, 10),
        created_at: Date.UTC(2026, 1, 10),
        ...over,
    }) as unknown as Transaction;

beforeEach(() => {
    jest.clearAllMocks();
    writeAsStringAsync.mockResolvedValue(undefined);
    moveAsync.mockResolvedValue(undefined);
    shareAsync.mockResolvedValue(undefined);
    isAvailableAsync.mockResolvedValue(true);
    printToFileAsync.mockResolvedValue({ uri: 'mocked-uri' });
});

const budget = (over: Partial<BudgetWithSpent> = {}): BudgetWithSpent =>
    ({
        id: 'b-1',
        category: 'Makan & Minum',
        amount: 1000000,
        spent: 900000,
        percentage: 90,
        ...over,
    }) as unknown as BudgetWithSpent;

describe('exportTransactionsCSV', () => {
    it('writes semicolon-sanitised rows and shares them', async () => {
        await exportTransactionsCSV([tx()], '2026-02');

        const [uri, contents, options] = writeAsStringAsync.mock.calls[0];
        expect(uri).toBe('file:///documents/tabungin_transaksi_2026-02.csv');
        expect(contents).toContain('Tanggal,Jenis,Kategori,Nominal,Catatan');
        // koma di catatan diganti ';' agar tidak merusak kolom CSV
        expect(contents).toContain(`"Bensin; harian"`);
        expect(options).toEqual({ encoding: 'utf8' });
        expect(shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'text/csv' }));
    });

    it('writes an empty note when the transaction has none', async () => {
        await exportTransactionsCSV([tx({ note: null as never })], '2026-03');

        expect(writeAsStringAsync.mock.calls[0][1]).toContain('""');
    });

    it('skips sharing when sharing is unavailable', async () => {
        isAvailableAsync.mockResolvedValueOnce(false);
        shareAsync.mockClear();

        await exportTransactionsCSV([tx()], '2026-04');

        expect(writeAsStringAsync).toHaveBeenCalled();
        expect(shareAsync).not.toHaveBeenCalled();
    });
});

describe('exportReportPDF', () => {
    const params = {
        month: 'Februari',
        year: '2026',
        transactions: [tx({ type: 'income', amount: 500000 }), tx()],
        budgets: [budget(), budget({ category: 'Lainnya', spent: 1200000, percentage: 120 })],
        totalIncome: 500000,
        totalExpense: 15000,
        balance: 485000,
        userName: 'Budi',
    };

    it('renders html and moves the generated file into documentDirectory', async () => {
        await exportReportPDF(params);

        const { html } = printToFileAsync.mock.calls[0][0];
        expect(html).toContain('🐷 Tabungin');
        expect(html).toContain('Februari 2026');
        expect(html).toContain('Budi');
        expect(html).toContain('Realisasi Budget');
        expect(html).toContain('Daftar Transaksi (2 transaksi)');
        // budget over-cap: progress bar di-clip ke 100% dan warna merah
        expect(html).toContain('width:100%');
        expect(html).toContain('#DC2626');
        // pemasukan pakai warna hijau + tanda '+'
        expect(html).toContain('+');

        expect(moveAsync).toHaveBeenCalledWith({
            from: 'mocked-uri',
            to: 'file:///documents/tabungin_laporan_Februari_2026.pdf',
        });
        expect(shareAsync).toHaveBeenCalledWith(
            'file:///documents/tabungin_laporan_Februari_2026.pdf',
            expect.objectContaining({ mimeType: 'application/pdf' }),
        );
    });

    it('omits the budget table when there are no budgets', async () => {
        await exportReportPDF({ ...params, budgets: [] });

        expect(printToFileAsync.mock.calls[0][0].html).not.toContain('Realisasi Budget');
    });

    it('colours a negative balance red and a positive one green', async () => {
        await exportReportPDF({ ...params, balance: -100 });
        expect(printToFileAsync.mock.calls[0][0].html).toContain('summary-value red');

        await exportReportPDF({ ...params, balance: 100 });
        expect(printToFileAsync.mock.calls[0][0].html).toContain('summary-value green');
    });

    it('skips sharing when sharing is unavailable', async () => {
        isAvailableAsync.mockResolvedValueOnce(false);
        shareAsync.mockClear();

        await exportReportPDF(params);

        expect(shareAsync).not.toHaveBeenCalled();
    });
});

describe('exportBackupJSON', () => {
    it('writes pretty-printed backup and shares it', async () => {
        const payload = {
            version: 2,
            exportedAt: Date.UTC(2026, 2, 1),
            transactions: [tx()],
            goals: [],
        };

        await exportBackupJSON(payload);

        const [uri, contents] = writeAsStringAsync.mock.calls[0];
        expect(uri).toMatch(/tabungin_backup_\d{4}-\d{2}-\d{2}\.json$/);
        expect(JSON.parse(contents)).toEqual(payload);
        expect(shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'application/json' }));
    });

    it('skips sharing when sharing is unavailable', async () => {
        isAvailableAsync.mockResolvedValueOnce(false);
        shareAsync.mockClear();

        await exportBackupJSON({ version: 1, exportedAt: 1, transactions: [], goals: [] });

        expect(shareAsync).not.toHaveBeenCalled();
    });
});
