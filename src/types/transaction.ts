// Tipe data untuk transaksi keuangan

export type TransactionType = 'income' | 'expense';

export interface Transaction {
    id: string;
    type: TransactionType;
    amount: number;
    category: string;
    note: string | null;
    date: number; // timestamp unix
    created_at: number;
    wallet_id?: string | null;
}

export interface TransactionFilter {
    type?: TransactionType | 'all';
    period?: 'today' | 'week' | 'month' | 'custom';
    startDate?: number;
    endDate?: number;
    searchQuery?: string;
}

export interface DailySummary {
    date: number;
    transactions: Transaction[];
    totalIncome: number;
    totalExpense: number;
}

export interface MonthlySummary {
    month: number; // 1-12
    year: number;
    totalIncome: number;
    totalExpense: number;
    balance: number;
}

export interface CategorySummary {
    category: string;
    total: number;
    percentage: number;
    count: number;
}
