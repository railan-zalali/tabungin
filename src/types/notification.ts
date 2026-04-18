export type NotificationType =
    | 'goal_reminder'
    | 'goal_completed'
    | 'budget_warning'
    | 'budget_reminder'
    | 'recurring_reminder'
    | 'manual_reminder'
    | 'wallet_invite'
    | 'app_update_available';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: number;
}

export interface NotificationData {
  goalId?: string;
  category?: string;
  recurringId?: string;
  reminderId?: string;
  walletId?: string;
  targetScreen?: string;
  updateUrl?: string;
  [key: string]: any;
}
