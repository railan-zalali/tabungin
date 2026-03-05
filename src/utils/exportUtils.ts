// Utilitas export laporan keuangan ke PDF dan CSV
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
// expo-file-system v55 — gunakan legacy sub-module untuk documentDirectory & EncodingType
import {
    documentDirectory,
    writeAsStringAsync,
    moveAsync,
    EncodingType,
} from 'expo-file-system/legacy';
import { formatRupiah } from './currency';
import type { Transaction } from '../types/transaction';
import type { SavingGoal } from '../types/saving';
import type { BudgetWithSpent } from '../database/budgetQueries';

// ─── CSV EXPORT ─────────────────────────────────────────────────────
export async function exportTransactionsCSV(
    transactions: Transaction[],
    month: string
): Promise<void> {
    const header = 'Tanggal,Jenis,Kategori,Nominal,Catatan\n';
    const rows = transactions.map((t) => {
        const date = new Date(t.date).toLocaleDateString('id-ID');
        const type = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const note = (t.note ?? '').replace(/,/g, ';');
        return `${date},${type},${t.category},${t.amount},"${note}"`;
    });
    const csv = header + rows.join('\n');

    const uri = (documentDirectory ?? '') + `tabungin_transaksi_${month}.csv`;
    await writeAsStringAsync(uri, csv, { encoding: EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: 'text/csv',
            dialogTitle: 'Bagikan Laporan CSV',
            UTI: 'public.comma-separated-values-text',
        });
    }
}

// ─── PDF EXPORT ─────────────────────────────────────────────────────
export async function exportReportPDF(params: {
    month: string;
    year: string;
    transactions: Transaction[];
    budgets: BudgetWithSpent[];
    totalIncome: number;
    totalExpense: number;
    balance: number;
    userName: string;
}): Promise<void> {
    const { month, year, transactions, budgets, totalIncome, totalExpense, balance, userName } = params;

    const transactionRows = transactions.map((t) => {
        const date = new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const color = t.type === 'income' ? '#059669' : '#DC2626';
        const sign = t.type === 'income' ? '+' : '-';
        return `
            <tr>
                <td>${date}</td>
                <td>${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</td>
                <td>${t.category}</td>
                <td style="color:${color}; font-weight:600;">${sign}${formatRupiah(t.amount)}</td>
                <td>${t.note ?? '-'}</td>
            </tr>`;
    }).join('');

    const budgetRows = budgets.map((b) => {
        const overBudget = b.spent > b.amount;
        const barColor = overBudget ? '#DC2626' : b.percentage > 80 ? '#F59E0B' : '#10B981';
        return `
            <tr>
                <td>${b.category}</td>
                <td>${formatRupiah(b.amount)}</td>
                <td style="color:${overBudget ? '#DC2626' : '#111'}">${formatRupiah(b.spent)}</td>
                <td>
                    <div style="background:#eee;border-radius:4px;height:8px;width:100%">
                        <div style="background:${barColor};height:8px;border-radius:4px;width:${Math.min(100, b.percentage).toFixed(0)}%"></div>
                    </div>
                    <small>${b.percentage.toFixed(1)}%</small>
                </td>
            </tr>`;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1f2937; padding: 32px; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1DB954; }
            .logo { font-size: 24px; font-weight: 800; color: #1DB954; }
            .meta { text-align: right; color: #6b7280; font-size: 11px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
            .summary-card { background: #f9fafb; border-radius: 8px; padding: 16px; }
            .summary-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
            .summary-value { font-size: 18px; font-weight: 700; }
            .green { color: #059669; }
            .red { color: #DC2626; }
            h2 { font-size: 14px; font-weight: 700; margin: 20px 0 10px; color: #111; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #f3f4f6; text-align: left; padding: 8px; font-size: 11px; color: #6b7280; }
            td { padding: 7px 8px; border-bottom: 1px solid #f3f4f6; font-size: 11px; }
            .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #9ca3af; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="logo">🐷 Tabungin</div>
                <div class="meta">Laporan Keuangan — ${month} ${year}</div>
            </div>
            <div class="meta">
                ${userName}<br/>
                Dibuat: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
        </div>
        <div class="summary">
            <div class="summary-card">
                <div class="summary-label">Total Pemasukan</div>
                <div class="summary-value green">${formatRupiah(totalIncome)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Pengeluaran</div>
                <div class="summary-value red">${formatRupiah(totalExpense)}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Saldo Bersih</div>
                <div class="summary-value ${balance >= 0 ? 'green' : 'red'}">${formatRupiah(Math.abs(balance))}</div>
            </div>
        </div>
        ${budgets.length > 0 ? `
        <h2>📊 Realisasi Budget</h2>
        <table>
            <tr><th>Kategori</th><th>Budget</th><th>Terpakai</th><th>Progress</th></tr>
            ${budgetRows}
        </table>` : ''}
        <h2>📋 Daftar Transaksi (${transactions.length} transaksi)</h2>
        <table>
            <tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Nominal</th><th>Catatan</th></tr>
            ${transactionRows}
        </table>
        <div class="footer">Laporan ini dibuat otomatis oleh Tabungin — Catat, Kelola, Wujudkan</div>
    </body>
    </html>`;

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    const newUri = (documentDirectory ?? '') + `tabungin_laporan_${month}_${year}.pdf`;
    await moveAsync({ from: uri, to: newUri });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Bagikan Laporan PDF',
            UTI: 'com.adobe.pdf',
        });
    }
}

// ─── JSON BACKUP / EXPORT ───────────────────────────────────────────
export interface BackupData {
    version: number;
    exportedAt: number;
    transactions: Transaction[];
    goals: SavingGoal[];
}

export async function exportBackupJSON(data: BackupData): Promise<void> {
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const uri = (documentDirectory ?? '') + `tabungin_backup_${date}.json`;
    await writeAsStringAsync(uri, json, { encoding: EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/json',
            dialogTitle: 'Bagikan Backup Data',
            UTI: 'public.json',
        });
    }
}
