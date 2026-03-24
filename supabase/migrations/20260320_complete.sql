-- Tabungin Implementation - Version 20260320: Complete Features
-- Combined migration with all features to avoid duplicates

-- Migration Description
-- Version: 20260320
-- Features:
--   1. Notifications Table
--   2. Wallet Goals Sharing (auto-share)
--   3. Recurring Transactions
--   4. Transaction Categories
-- 5. Indexes and constraints

-- ============================================================================
-- Author: Claude Sonnet 4.6
-- Date: 2026-03-20
-- Purpose: Complete Tabungin implementation
-- ============================================================================

-- 1. NOTIFICATIONS TABLE
-- ============================================================================

-- Store user notifications with read status
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('goal_reminder', 'goal_completed', 'budget_warning', 'wallet_invite')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read, created_at DESC);

-- RLS Policies - Users can manage their own notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notifications"
  ON notifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 2. WALLET GOALS SHARING
-- ============================================================================

-- Track which goals are shared to which team members
-- Auto-share functionality via RPC function
CREATE TABLE IF NOT EXISTS wallet_goals_shared (
  id TEXT PRIMARY KEY,
  goal_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  shared_by TEXT NOT NULL,
  shared_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT DEFAULT 'synced'
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_goal ON wallet_goals_shared(goal_id);
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_wallet_user ON wallet_goals_shared(wallet_id, user_email);

-- RLS Policies - Members can see shared goals for their wallets
ALTER TABLE wallet_goals_shared ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see shared goals for their wallets"
  ON wallet_goals_shared FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wallet_members
      WHERE wallet_members.wallet_id = wallet_goals_shared.wallet_id
        AND wallet_members.user_email = auth.email()
    )
  );

CREATE POLICY "Users can insert shared goals for their wallets"
  ON wallet_goals_shared FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wallet_members
      WHERE wallet_members.wallet_id = wallet_goals_shared.wallet_id
        AND wallet_members.user_email = auth.email()
        AND wallet_members.role = 'owner'
    )
  );

-- RPC Function: Auto-share goals when new member joins wallet
CREATE OR REPLACE FUNCTION auto_share_wallet_goals(
  p_wallet_id TEXT,
  p_user_email TEXT,
  p_shared_by TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO wallet_goals_shared (id, goal_id, wallet_id, user_email, shared_by, shared_at)
  SELECT
    gen_random_uuid(),
    g.id,
    g.wallet_id,
    p_user_email,
    p_shared_by,
    EXTRACT(EPOCH FROM NOW()) * 1000
  FROM saving_goals g
  WHERE g.wallet_id = p_wallet_id
    AND g.is_completed = false
    AND NOT EXISTS (
      SELECT 1 FROM wallet_goals_shared wgs
      WHERE wgs.goal_id = g.id
        AND wgs.user_email = p_user_email
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. RECURRING TRANSACTIONS
-- ============================================================================

-- Track recurring/automated transactions (income/expense)
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  wallet_id UUID,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  note TEXT,
  frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')),
  day_of_month INTEGER,
  day_of_week INTEGER,
  start_date INTEGER NOT NULL,
  end_date INTEGER,
  next_occurrence INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1 NOT NULL,
  last_generated_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'synced'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_wallet ON recurring_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(user_id, is_active);

-- RLS Policies
-- Users can manage their own recurring transactions
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own recurring transactions"
  ON recurring_transactions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recurring transactions"
  ON recurring_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recurring transactions"
  ON recurring_transactions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY " Users can delete their own recurring transactions"
  ON recurring_transactions FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 4. TRANSACTION CATEGORIES
-- ============================================================================

-- Custom categories for transaction organization
CREATE TABLE IF NOT EXISTS transaction_categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'both')),
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#1DB954',
  is_default INTEGER DEFAULT 0 NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  sync_status TEXT DEFAULT 'synced'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_categories_user ON transaction_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON transaction_categories(user_id, type);

-- RLS Policies - Users can manage their own categories
ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own categories"
  ON transaction_categories FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own categories"
  ON transaction_categories FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own categories"
  ON transaction_categories FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own categories"
  ON transaction_categories FOR DELETE
  USING (user_id = auth.uid());

-- RPC Function: Initialize default categories for new users
CREATE OR REPLACE FUNCTION insert_default_categories_for_user(p_user_id TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO transaction_categories (id, user_id, name, type, icon, color, is_default, created_at, updated_at)
  SELECT
    gen_random_uuid(),
    p_user_id,
    name,
    type,
    icon,
    color,
    1,
    EXTRACT(EPOCH FROM NOW()) * 1000,
    EXTRACT(EPOCH FROM NOW()) * 1000
  FROM (
      -- Default expense categories
      SELECT 'Makanan', 'food', 'car', 'shopping', 'game', 'bill', 'medical', 'education', 'other', 'tags', 'tags', 'tags'
      UNION ALL

      -- Default income categories
      SELECT 'Gaji', 'Bonus', 'Investasi', 'Hadiah', 'Lainnya'
    ) default_cats
    WHERE NOT EXISTS (
      SELECT 1 FROM transaction_categories
      WHERE user_id = p_user_id
        AND transaction_categories.name = default_cats.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES AND CONSTRAINTS
-- ============================================================================

-- Performance indexes for all tables
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_goal ON wallet_goals_shared(goal_id);
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_wallet_user ON wallet_goals_shared(wallet_id, user_email);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_wallet ON recurring_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON recurring_transactions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_user ON transaction_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON transaction_categories(user_id, type);

-- ============================================================================
-- MIGRATION RECORD
-- ============================================================================
-- Note: Migration tracking is handled by Supabase CLI
-- No manual INSERT needed into supabase_migrations table

-- ============================================================================
-- CLEANUP
-- ============================================================================
-- Migration complete - no cleanup needed
