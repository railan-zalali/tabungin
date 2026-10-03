// Test utilitas export data (JSON/CSV/TXT) — memverifikasi payload yang
// ditulis ke file dan opsi share-nya, termasuk jalur error.
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
    exportToJSON,
    exportToCSV,
    exportToTXT,
    exportTransactionsOnly,
    exportGoalsOnly,
} from '../../src/utils/exportData';
import type { Transaction } from '../../src/types/transaction';
import type { SavingGoal } from '../../src/types/saving';

jest.mock('expo-file-system/legacy', () => ({
    documentDirectory: 'file:///documents/',
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    moveAsync: jest.fn().mockResolvedValue(undefined),
    EncodingType: { UTF8: 'utf8', ASCII: 'ascii' },
}));

const writeAsStringAsync = FileSystem.writeAsStringAsync as jest.Mock;
const shareAsync = Sharing.shareAsync as jest.Mock;

const tx = (over: Partial<Transaction> = {}): Transaction =>
    ({
        id: 'tx-1',
        type: 'expense',
        category: 'Makan & Minum',
        amount: 25000,
        note: 'Nasi goreng',
        date: Date.UTC(2026, 0, 15),
        created_at: Date.UTC(2026, 0, 15),
        ...over,
    }) as unknown as Transaction;

const goal = (over: Partial<SavingGoal> = {}): SavingGoal =>
    ({
        id: 'g-1',
        name: 'Liburan Bali',
        target_amount: 5000000,
        current_amount: 1250000,
        emoji: '🌴',
        photo_uri: null,
        saving_per_period: 500000,
        period_type: 'monthly',
        color: '#0EAD69',
        start_date: Date.UTC(2026, 0, 1),
        estimated_date: Date.UTC(2026, 11, 1),
        is_completed: false,
        reminder_enabled: 1,
        reminder_time: '08:00',
        created_at: Date.UTC(2026, 0, 1),
        ...over,
    }) as unknown as SavingGoal;

const data = {
    version: 1,
    exportedAt: Date.UTC(2026, 5, 2),
    transactions: [tx()],
    goals: [goal()],
};

const lastWritten = () => writeAsStringAsync.mock.calls[writeAsStringAsync.mock.calls.length - 1];

describe('exportToJSON', () => {
    it('writes pretty-printed JSON and shares it', async () => {
        await exportToJSON(data);

        const [uri, contents] = lastWritten();
        expect(uri).toMatch(/tabungin_backup_\d{4}-\d{2}-\d{2}\.json$/);
        expect(JSON.parse(contents)).toEqual(data);
        expect(shareAsync).toHaveBeenCalledWith(uri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Data Tabungin',
            UTI: 'public.json',
        });
    });

    it('reports failure when writing throws', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        writeAsStringAsync.mockRejectedValueOnce(new Error('disk full'));

        await exportToJSON(data);

        expect(errSpy).toHaveBeenCalledWith('Failed to export JSON:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal mengekspor data ke format JSON');
        errSpy.mockRestore();
        alertSpy.mockRestore();
    });
});

describe('exportToCSV', () => {
    it('writes transaction and goal sections', async () => {
        await exportToCSV(data);

        const [uri, contents] = lastWritten();
        expect(uri).toMatch(/tabungin_export_\d{4}-\d{2}-\d{2}\.csv$/);
        expect(contents).toContain('TRANSAKSI');
        expect(contents).toContain('TARGET TABUNGAN');
        expect(contents).toContain('"tx-1","expense","Makan & Minum","25000","Nasi goreng"');
        expect(contents).toContain('"g-1","Liburan Bali","5000000","1250000"');
        expect(shareAsync).toHaveBeenCalledWith(uri, expect.objectContaining({ mimeType: 'text/csv' }));
    });

    it('renders empty note for transactions without a note', async () => {
        await exportToCSV({ ...data, transactions: [tx({ note: null as never })] });

        expect(lastWritten()[1]).toContain('"25000","","2026-01-15"');
    });

    it('reports failure when writing throws', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        writeAsStringAsync.mockRejectedValueOnce(new Error('nope'));

        await exportToCSV(data);

        expect(errSpy).toHaveBeenCalledWith('Failed to export CSV:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal mengekspor data ke format CSV');
        errSpy.mockRestore();
        alertSpy.mockRestore();
    });
});

describe('exportToTXT', () => {
    it('summarises income, expense, net balance and goals', async () => {
        await exportToTXT({
            ...data,
            transactions: [tx({ type: 'income', amount: 100000 }), tx({ type: 'expense', amount: 40000 })],
            goals: [goal({ is_completed: true, current_amount: 5000000 })],
        });

        const [, contents] = lastWritten() as [string, string];
        expect(contents).toContain('RINGKASAN TRANSAKSI');
        expect(contents).toContain('Total Transaksi: 2');
        expect(contents).toContain('Saldo Bersih:');
        expect(contents).toContain('Total Target: 1');
        expect(contents).toContain('Target Selesai: 1');
        expect(contents).toContain('DETAIL TRANSAKSI');
        expect(contents).toContain('DETAIL TARGET TABUNGAN');
        expect(contents).toContain('  Status: Selesai');
    });

    it('omits the goals detail block when there are no goals', async () => {
        await exportToTXT({ ...data, goals: [] });

        expect(lastWritten()[1]).not.toContain('DETAIL TARGET TABUNGAN');
    });

    it('omits notes that are empty', async () => {
        await exportToTXT({ ...data, transactions: [tx({ note: null as never })] });

        expect(lastWritten()[1]).not.toContain('Catatan:');
    });
});

describe('exportTransactionsOnly', () => {
    it('alerts and writes nothing when the list is empty', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        writeAsStringAsync.mockClear();

        await exportTransactionsOnly([]);

        expect(alertSpy).toHaveBeenCalledWith('Info', 'Tidak ada transaksi untuk diekspor');
        expect(writeAsStringAsync).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it('exports JSON format', async () => {
        writeAsStringAsync.mockClear();
        await exportTransactionsOnly([tx()], 'json');
        expect(lastWritten()[1]).toContain('"tx-1"');
    });

    it('exports CSV format', async () => {
        await exportTransactionsOnly([tx()], 'csv');
        const [, contents] = lastWritten() as [string, string];
        expect(contents).toContain('ID,Jenis,Kategori,Jumlah,Catatan,Tanggal,Dibuat Pada');
        expect(contents).toContain('"tx-1","expense"');
    });

    it('exports TXT format with income/expense summary', async () => {
        await exportTransactionsOnly([tx({ type: 'income', amount: 90000 })], 'txt');
        const [, contents] = lastWritten() as [string, string];
        expect(contents).toContain('Laporan Transaksi Tabungin');
        expect(contents).toContain('Total Pemasukan:');
    });

    it('reports failure when exporting throws', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        writeAsStringAsync.mockRejectedValueOnce(new Error('boom'));

        await exportTransactionsOnly([tx()], 'csv');

        expect(errSpy).toHaveBeenCalledWith('Failed to export transactions:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal mengekspor transaksi');
        errSpy.mockRestore();
        alertSpy.mockRestore();
    });
});

describe('exportGoalsOnly', () => {
    it('alerts and writes nothing when the list is empty', async () => {
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        writeAsStringAsync.mockClear();

        await exportGoalsOnly([]);

        expect(alertSpy).toHaveBeenCalledWith('Info', 'Tidak ada target tabungan untuk diekspor');
        expect(writeAsStringAsync).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    it('exports JSON format', async () => {
        await exportGoalsOnly([goal()], 'json');
        expect(lastWritten()[1]).toContain('"g-1"');
    });

    it('exports CSV format with computed progress and status', async () => {
        await exportGoalsOnly([goal()], 'csv');
        const [, contents] = lastWritten() as [string, string];
        expect(contents).toContain('Progress');
        expect(contents).toContain('"25%","monthly"');
        expect(contents).toContain('"Berjalan"');
    });

    it('exports TXT format with totals', async () => {
        await exportGoalsOnly([goal({ target_amount: 0 })], 'txt');
        const [, contents] = lastWritten() as [string, string];
        expect(contents).toContain('Laporan Target Tabungan Tabungin');
        expect(contents).toContain('  Progress: 0%');
    });

    it('reports failure when exporting throws', async () => {
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        writeAsStringAsync.mockRejectedValueOnce(new Error('boom'));

        await exportGoalsOnly([goal()], 'txt');

        expect(errSpy).toHaveBeenCalledWith('Failed to export goals:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Gagal mengekspor target tabungan');
        errSpy.mockRestore();
        alertSpy.mockRestore();
    });
});
