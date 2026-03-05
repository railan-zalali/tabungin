// Tipe data untuk saving goals dan log tabungan

export type PeriodType = 'daily' | 'weekly' | 'monthly';

export interface SavingGoal {
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    emoji: string;
    photo_uri: string | null;
    saving_per_period: number;
    period_type: PeriodType;
    color: string;
    start_date: number;
    estimated_date: number;
    is_completed: boolean;
    reminder_enabled: boolean;
    reminder_time: string | null; // format HH:mm
    created_at: number;
}

export interface SavingLog {
    id: string;
    goal_id: string;
    amount: number;
    note: string | null;
    date: number;
    created_at: number;
}

export interface SavingGoalWithLogs extends SavingGoal {
    logs: SavingLog[];
}

export interface SimulationResult {
    days: number;
    weeks: number;
    months: number;
    estimatedDate: Date;
}
