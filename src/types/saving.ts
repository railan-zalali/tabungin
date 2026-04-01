// Tipe data untuk saving goals dan log tabungan

export type PeriodType = 'daily' | 'weekly' | 'monthly';
export type GoalPermissionLevel = 'read_only' | 'read_write' | 'admin';
export type GoalScope = 'personal' | 'shared_wallet' | 'shared_direct';

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
    wallet_id?: string;
    profile_id?: string;
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

export interface GoalSharingMember {
    user_email: string;
    shared_by: string;
    shared_at: number;
    permission_level: GoalPermissionLevel;
}

export interface GoalSharingActivity {
    id: string;
    goal_id: string;
    wallet_id: string;
    user_email: string;
    action: 'shared' | 'revoked' | 'permission_changed' | 'access_granted';
    performed_by: string;
    metadata: string | null;
    timestamp: number;
    created_at: number;
    updated_at: number;
    sync_status?: string;
}

export interface SavingGoalComputedMeta {
    scope: GoalScope;
    scopeLabel: string;
    scopeDescription: string;
    isSharedGoal: boolean;
    isSharedWalletGoal: boolean;
    isSharedDirectGoal: boolean;
}

export interface SimulationResult {
    days: number;
    weeks: number;
    months: number;
    estimatedDate: Date;
}
