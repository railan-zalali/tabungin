export type NotificationType = 'goal_reminder' | 'goal_completed' | 'budget_warning' | 'wallet_invite';

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
  walletId?: string;
  [key: string]: any;
}
