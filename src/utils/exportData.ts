// Export Data Utils - Export transactions and goals to various formats
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getInitializedDatabase } from '../database/schema';
import type { Transaction } from '../types/transaction';
import type { SavingGoal } from '../types/saving';
import { formatCurrency } from './currency';
import { formatDateLong } from './date';

export type ExportFormat = 'json' | 'csv' | 'txt';
export const FULL_BACKUP_VERSION = 2;

interface ExportProfile {
  id: string;
  user_id?: string | null;
  name: string;
  icon: string;
  color: string;
  created_at: number;
  updated_at?: number;
}

interface ExportWallet {
  id: string;
  profile_id?: string | null;
  name: string;
  type: string;
  color: string;
  balance: number;
  is_default: boolean;
  created_at: number;
  updated_at?: number;
}

interface ExportBudget {
  id: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  reminder_enabled: boolean;
  reminder_time: string | null;
  created_at: number;
  updated_at?: number;
  wallet_id?: string | null;
  profile_id?: string | null;
}

interface ExportSavingLog {
  id: string;
  goal_id: string;
  amount: number;
  note: string | null;
  date: number;
  created_at: number;
  updated_at?: number;
}

interface ExportWalletMember {
  id: string;
  wallet_id: string;
  user_email: string;
  role: string;
  status: string;
  created_at: number;
  updated_at?: number;
}

interface ExportWalletGoalShare {
  id: string;
  goal_id: string;
  wallet_id: string;
  user_email: string;
  shared_by: string;
  shared_at: number;
  created_at: number;
  updated_at?: number;
  permission_level?: string | null;
}

interface ExportSharingActivity {
  id: string;
  goal_id: string;
  wallet_id: string;
  user_email: string;
  action: string;
  performed_by: string;
  metadata: string | null;
  timestamp: number;
  created_at: number;
  updated_at: number;
}

export interface ExportData {
  version: number;
  exportedAt: number;
  transactions: Transaction[];
  goals: SavingGoal[];
  profiles?: ExportProfile[];
  wallets?: ExportWallet[];
  budgets?: ExportBudget[];
  savingLogs?: ExportSavingLog[];
  walletMembers?: ExportWalletMember[];
  walletGoalShares?: ExportWalletGoalShare[];
  sharingActivity?: ExportSharingActivity[];
}

function mapExportGoalRow(row: any): SavingGoal {
  return {
    ...row,
    is_completed: Boolean(row.is_completed),
    reminder_enabled: Boolean(row.reminder_enabled),
    deadline_at: row.deadline_at ?? row.estimated_date,
  };
}

function mapExportWalletRow(row: any): ExportWallet {
  return {
    ...row,
    is_default: Boolean(row.is_default),
  };
}

function mapExportBudgetRow(row: any): ExportBudget {
  return {
    ...row,
    reminder_enabled: Boolean(row.reminder_enabled),
    reminder_time: row.reminder_time ?? null,
  };
}

async function fetchTableRows<T = any>(tableName: string): Promise<T[]> {
  const db = await getInitializedDatabase();
  return db.getAllAsync<T>(`SELECT * FROM ${tableName} WHERE sync_status != 'pending_delete' ORDER BY created_at ASC`);
}

export async function buildFullBackupExportData(): Promise<ExportData> {
  const [profiles, wallets, transactions, budgets, goals, savingLogs, walletMembers, walletGoalShares, sharingActivity] = await Promise.all([
    fetchTableRows<ExportProfile>('profiles'),
    fetchTableRows<any>('wallets'),
    fetchTableRows<Transaction>('transactions'),
    fetchTableRows<any>('budgets'),
    fetchTableRows<any>('saving_goals'),
    fetchTableRows<ExportSavingLog>('saving_logs'),
    fetchTableRows<ExportWalletMember>('wallet_members'),
    fetchTableRows<ExportWalletGoalShare>('wallet_goals_shared'),
    fetchTableRows<ExportSharingActivity>('sharing_activity_log'),
  ]);

  return {
    version: FULL_BACKUP_VERSION,
    exportedAt: Date.now(),
    profiles,
    wallets: wallets.map(mapExportWalletRow),
    transactions,
    budgets: budgets.map(mapExportBudgetRow),
    goals: goals.map(mapExportGoalRow),
    savingLogs,
    walletMembers,
    walletGoalShares,
    sharingActivity,
  };
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

export async function exportGoalsOnly(
  goals: SavingGoal[],
  format: ExportFormat = 'csv'
): Promise<void> {
  try {
    if (goals.length === 0) {
      Alert.alert('Info', 'Tidak ada target tabungan untuk diekspor');
      return;
    }

    switch (format) {
      case 'json':
        await exportToJSON({
          version: 1,
          exportedAt: Date.now(),
          transactions: [],
          goals,
        });
        break;
      case 'csv':
        await exportGoalsToCSV(goals);
        break;
      case 'txt':
        await exportGoalsToTXT(goals);
        break;
    }
  } catch (error) {
    console.error('Failed to export goals:', error);
    Alert.alert('Error', 'Gagal mengekspor target tabungan');
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

async function exportGoalsToCSV(goals: SavingGoal[]): Promise<void> {
  let csv = 'ID,Nama,Target,Terkumpul,Deadline,Estimasi,Status,Nabung Per Periode,Periode,Warna\n';

  for (const goal of goals) {
    const deadline = new Date(goal.deadline_at).toISOString().split('T')[0];
    const estimated = new Date(goal.estimated_date).toISOString().split('T')[0];
    csv += `"${goal.id}","${goal.name}","${goal.target_amount}","${goal.current_amount}","${deadline}","${estimated}","${goal.is_completed ? 'completed' : 'active'}","${goal.saving_per_period}","${goal.period_type}","${goal.color}"\n`;
  }

  const fileName = `tabungin_target_${new Date().toISOString().split('T')[0]}.csv`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Target Tabungan Tabungin (CSV)',
    UTI: 'public.comma-separated-values-text',
  });
}

async function exportGoalsToTXT(goals: SavingGoal[]): Promise<void> {
  let txt = `Laporan Target Tabungan Tabungin\n`;
  txt += `Tanggal: ${formatDateLong(Date.now())}\n`;
  txt += `Jumlah Target: ${goals.length}\n`;
  txt += `${'='.repeat(40)}\n\n`;

  for (const goal of goals) {
    const progress = goal.target_amount > 0
      ? Math.round((goal.current_amount / goal.target_amount) * 100)
      : 0;

    txt += `${goal.emoji} ${goal.name}\n`;
    txt += `  Target: ${formatCurrency(goal.target_amount)}\n`;
    txt += `  Terkumpul: ${formatCurrency(goal.current_amount)}\n`;
    txt += `  Progress: ${progress}%\n`;
    txt += `  Deadline: ${formatDateLong(goal.deadline_at)}\n`;
    txt += `  Estimasi: ${formatDateLong(goal.estimated_date)}\n`;
    txt += `  Status: ${goal.is_completed ? 'Selesai' : 'Berjalan'}\n\n`;
  }

  const fileName = `tabungin_target_${new Date().toISOString().split('T')[0]}.txt`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, txt);
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: 'Export Target Tabungan Tabungin (TXT)',
    UTI: 'public.plain-text',
  });
}
