// Tipe data untuk debt tracking (utang & piutang)

export type DebtType = 'debt' | 'receivable';
export type DebtStatus = 'active' | 'paid' | 'cancelled';

export interface Debt {
    id: string;
    user_id: string;
    type: DebtType;
    counterparty: string;
    counterparty_email: string | null;
    amount: number;
    remaining_amount: number;
    interest_rate: number;
    due_date: number | null;
    note: string | null;
    status: DebtStatus;
    wallet_id: string | null;
    profile_id: string | null;
    created_at: number;
    updated_at: number | null;
}

export interface DebtPayment {
    id: string;
    debt_id: string;
    amount: number;
    date: number;
    note: string | null;
    created_at: number;
    updated_at: number | null;
}

export interface DebtWithPayments extends Debt {
    payments: DebtPayment[];
}

export interface DebtSummary {
    totalDebt: number;
    totalReceivable: number;
    activeCount: number;
    paidCount: number;
    overdueCount: number;
}
