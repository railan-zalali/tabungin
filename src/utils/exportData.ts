// Export Data Utils - Export transactions and goals to various formats
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import type { Transaction } from '../types/transaction';
import type { SavingGoal } from '../types/saving';
import { formatCurrency } from './currency';
import { formatDateLong } from './date';

export type ExportFormat = 'json' | 'csv' | 'txt';

export interface ExportData {
  version: number;
  exportedAt: number;
  transactions: Transaction[];
  goals: SavingGoal[];
}

/**
 * Export data to JSON format
 */
export async function exportToJSON(data: ExportData): Promise<void> {
  try {
    const json = JSON.stringify(data, null, 2);
    const fileName = `tabungin_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, json);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Data Tabungin',
      UTI: 'public.json',
    });
  } catch (error) {
    console.error('Failed to export JSON:', error);
    Alert.alert('Error', 'Gagal mengekspor data ke format JSON');
  }
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(data: ExportData): Promise<void> {
  try {
    let csv = '';

    // Transactions section
    csv += 'TRANSAKSI\n';
    csv += 'ID,Jenis,Kategori,Jumlah,Catatan,Tanggal,Dibuat Pada\n';

    for (const tx of data.transactions) {
      const date = new Date(tx.date).toISOString().split('T')[0];
      const createdAt = new Date(tx.created_at).toISOString().split('T')[0];
      csv += `"${tx.id}","${tx.type}","${tx.category}","${tx.amount}","${tx.note || ''}","${date}","${createdAt}"\n`;
    }

    csv += '\n';

    // Goals section
    csv += 'TARGET TABUNGAN\n';
    csv += 'ID,Nama,Target,Saat Ini,Emoji,Warna,Tanggal Mulai,Estimasi Selesai,Dibuat Pada\n';

    for (const goal of data.goals) {
      const startDate = new Date(goal.start_date).toISOString().split('T')[0];
      const estDate = new Date(goal.estimated_date).toISOString().split('T')[0];
      const createdAt = new Date(goal.created_at).toISOString().split('T')[0];
      csv += `"${goal.id}","${goal.name}","${goal.target_amount}","${goal.current_amount}","${goal.emoji}","${goal.color}","${startDate}","${estDate}","${createdAt}"\n`;
    }

    const fileName = `tabungin_export_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Data Tabungin (CSV)',
      UTI: 'public.com comma-separated-values-text',
    });
  } catch (error) {
    console.error('Failed to export CSV:', error);
    Alert.alert('Error', 'Gagal mengekspor data ke format CSV');
  }
}

/**
 * Export data to plain text format (readable summary)
 */
export async function exportToTXT(data: ExportData): Promise<void> {
  try {
    let txt = `Laporan Keuangan Tabungin\n`;
    txt += `Tanggal Ekspor: ${formatDateLong(data.exportedAt)}\n`;
    txt += `Version: ${data.version}\n`;
    txt += `${'='.repeat(50)}\n\n`;

    // Transactions summary
    const income = data.transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const expense = data.transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    txt += 'RINGKASAN TRANSAKSI\n';
    txt += '-'.repeat(30) + '\n';
    txt += `Total Transaksi: ${data.transactions.length}\n`;
    txt += `Total Pemasukan: ${formatCurrency(income)}\n`;
    txt += `Total Pengeluaran: ${formatCurrency(expense)}\n`;
    txt += `Saldo Bersih: ${formatCurrency(income - expense)}\n\n`;

    // Goals summary
    txt += 'RINGKASAN TARGET TABUNGAN\n';
    txt += '-'.repeat(30) + '\n';
    txt += `Total Target: ${data.goals.length}\n`;
    txt += `Target Selesai: ${data.goals.filter((g) => g.is_completed).length}\n`;
    txt += `Total Ditabung: ${formatCurrency(
      data.goals.reduce((s, g) => s + g.current_amount, 0)
    )}\n\n`;

    // Detailed transactions
    txt += 'DETAIL TRANSAKSI\n';
    txt += '-'.repeat(30) + '\n';

    for (const tx of data.transactions) {
      const date = formatDateLong(tx.date);
      const type = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
      txt += `${date} - ${type}\n`;
      txt += `  Kategori: ${tx.category}\n`;
      txt += `  Jumlah: ${formatCurrency(tx.amount)}\n`;
      if (tx.note) {
        txt += `  Catatan: ${tx.note}\n`;
      }
      txt += `\n`;
    }

    // Detailed goals
    if (data.goals.length > 0) {
      txt += `\nDETAIL TARGET TABUNGAN\n`;
      txt += '-'.repeat(30) + '\n';

      for (const goal of data.goals) {
        const progress = goal.target_amount > 0
          ? Math.round((goal.current_amount / goal.target_amount) * 100)
          : 0;

        txt += `${goal.emoji} ${goal.name}\n`;
        txt += `  Target: ${formatCurrency(goal.target_amount)}\n`;
        txt += `  Saat Ini: ${formatCurrency(goal.current_amount)}\n`;
        txt += `  Progress: ${progress}%\n`;
        txt += `  Status: ${goal.is_completed ? 'Selesai' : 'Berjalan'}\n`;
        txt += `\n`;
      }
    }

    const fileName = `tabungin_laporan_${new Date().toISOString().split('T')[0]}.txt`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, txt);
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/plain',
      dialogTitle: 'Export Laporan Tabungin (TXT)',
      UTI: 'public.plain-text',
    });
  } catch (error) {
    console.error('Failed to export TXT:', error);
    Alert.alert('Error', 'Gagal mengekspor data ke format TXT');
  }
}

/**
 * Export transactions only (filtered)
 */
export async function exportTransactionsOnly(
  transactions: Transaction[],
  format: ExportFormat = 'csv'
): Promise<void> {
  try {
    if (transactions.length === 0) {
      Alert.alert('Info', 'Tidak ada transaksi untuk diekspor');
      return;
    }

    switch (format) {
      case 'json':
        await exportToJSON({
          version: 1,
          exportedAt: Date.now(),
          transactions,
          goals: [],
        });
        break;

      case 'csv':
        await exportTransactionsToCSV(transactions);
        break;

      case 'txt':
        await exportTransactionsToTXT(transactions);
        break;
    }
  } catch (error) {
    console.error('Failed to export transactions:', error);
    Alert.alert('Error', 'Gagal mengekspor transaksi');
  }
}

/**
 * Export transactions to CSV
 */
async function exportTransactionsToCSV(transactions: Transaction[]): Promise<void> {
  let csv = 'ID,Jenis,Kategori,Jumlah,Catatan,Tanggal,Dibuat Pada\n';

  for (const tx of transactions) {
    const date = new Date(tx.date).toISOString().split('T')[0];
    const createdAt = new Date(tx.created_at).toISOString().split('T')[0];
    csv += `"${tx.id}","${tx.type}","${tx.category}","${tx.amount}","${tx.note || ''}","${date}","${createdAt}"\n`;
  }

  const fileName = `tabungin_transaksi_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csv);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Transaksi Tabungin (CSV)',
    UTI: 'public.com comma-separated-values-text',
  });
}

/**
 * Export transactions to TXT
 */
async function exportTransactionsToTXT(transactions: Transaction[]): Promise<void> {
  let txt = `Laporan Transaksi Tabungin\n`;
  txt += `Tanggal: ${formatDateLong(Date.now())}\n`;
  txt += `Jumlah Transaksi: ${transactions.length}\n`;
  txt += `${'='.repeat(40)}\n\n`;

  // Summary
  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const expense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  txt += `Ringkasan:\n`;
  txt += `Total Pemasukan: ${formatCurrency(income)}\n`;
  txt += `Total Pengeluaran: ${formatCurrency(expense)}\n`;
  txt += `Saldo Bersih: ${formatCurrency(income - expense)}\n\n`;

  // Details
  txt += `Detail:\n`;
  txt += `${'-'.repeat(40)}\n\n`;

  for (const tx of transactions) {
    const date = formatDateLong(tx.date);
    const type = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    txt += `${date} - ${type}\n`;
    txt += `  Kategori: ${tx.category}\n`;
    txt += `  Jumlah: ${formatCurrency(tx.amount)}\n`;
    if (tx.note) {
      txt += `  Catatan: ${tx.note}\n`;
    }
    txt += `\n`;
  }

  const fileName = `tabungin_transaksi_${new Date().toISOString().split('T')[0]}.txt`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, txt);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: 'Export Transaksi Tabungin (TXT)',
    UTI: 'public.plain-text',
  });
}
