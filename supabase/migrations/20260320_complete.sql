-- Tabungin baseline schema
-- This migration must be able to bootstrap the whole project from an empty
-- Supabase database. Later migrations only extend/repair this baseline.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'User',
  icon TEXT,
  color TEXT NOT NULL DEFAULT '#1D7D53',
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'cash',
  color TEXT NOT NULL DEFAULT '#1D7D53',
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS public.wallet_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT wallet_members_role_check CHECK (role IN ('owner', 'editor', 'viewer')),
  CONSTRAINT wallet_members_status_check CHECK (status IN ('pending', 'active', 'rejected'))
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  date BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense'))
);

CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TEXT,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS public.saving_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(15, 2) NOT NULL,
  current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  emoji TEXT DEFAULT 'piggy-bank',
  photo_uri TEXT,
  saving_per_period NUMERIC(15, 2) DEFAULT 0,
  period_type TEXT DEFAULT 'monthly',
  color TEXT NOT NULL DEFAULT '#1D7D53',
  start_date BIGINT,
  deadline_at BIGINT,
  estimated_date BIGINT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TEXT,
  owner_user_id UUID,
  created_by_user_id UUID,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS public.saving_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  note TEXT,
  date BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

-- Product/support tables
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT notifications_type_check CHECK (
    type IN (
      'goal_reminder',
      'goal_completed',
      'budget_warning',
      'budget_reminder',
      'recurring_reminder',
      'manual_reminder',
      'wallet_invite',
      'app_update_available'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.wallet_goals_shared (
  id TEXT PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  shared_by TEXT NOT NULL,
  shared_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT,
  permission_level TEXT NOT NULL DEFAULT 'read_write',
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT wallet_goals_shared_permission_level_check CHECK (
    permission_level IN ('read_only', 'read_write', 'admin')
  )
);

CREATE TABLE IF NOT EXISTS public.sharing_activity_log (
  id TEXT PRIMARY KEY,
  goal_id UUID NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  metadata TEXT,
  timestamp BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS public.recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  type TEXT NOT NULL,
  note TEXT,
  frequency TEXT NOT NULL,
  day_of_month INTEGER,
  day_of_week INTEGER,
  start_date BIGINT NOT NULL,
  end_date BIGINT,
  next_occurrence BIGINT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_generated_at BIGINT,
  reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_offset_minutes INTEGER NOT NULL DEFAULT 60,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT recurring_transactions_type_check CHECK (type IN ('income', 'expense')),
  CONSTRAINT recurring_transactions_frequency_check CHECK (
    frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')
  )
);

CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'tag',
  color TEXT NOT NULL DEFAULT '#1D7D53',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT transaction_categories_type_check CHECK (type IN ('income', 'expense', 'both'))
);

CREATE TABLE IF NOT EXISTS public.app_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  note TEXT,
  target_screen TEXT,
  target_params JSONB,
  frequency TEXT NOT NULL DEFAULT 'daily',
  trigger_at BIGINT NOT NULL,
  time_of_day TEXT,
  day_of_week INTEGER,
  day_of_month INTEGER,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  updated_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  sync_status TEXT NOT NULL DEFAULT 'synced',
  CONSTRAINT app_reminders_frequency_check CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly'))
);

CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'production',
  version TEXT NOT NULL,
  build_number INTEGER,
  min_supported_version TEXT,
  release_notes TEXT,
  download_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at BIGINT NOT NULL DEFAULT FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000),
  CONSTRAINT app_releases_platform_check CHECK (platform IN ('android', 'ios', 'all'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_members_wallet_email_unique
  ON public.wallet_members(wallet_id, lower(user_email));
CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet_id ON public.wallet_members(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_members_email ON public.wallet_members(lower(user_email));
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_id ON public.budgets(profile_id);
CREATE INDEX IF NOT EXISTS idx_budgets_wallet_id ON public.budgets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_saving_goals_profile_id ON public.saving_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_saving_goals_wallet_id ON public.saving_goals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_saving_logs_goal_id ON public.saving_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_goal ON public.wallet_goals_shared(goal_id);
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_wallet_user ON public.wallet_goals_shared(wallet_id, lower(user_email));
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_goal_id ON public.sharing_activity_log(goal_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_wallet_id ON public.sharing_activity_log(wallet_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_timestamp ON public.sharing_activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_wallet ON public.recurring_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next ON public.recurring_transactions(next_occurrence);
CREATE INDEX IF NOT EXISTS idx_recurring_active ON public.recurring_transactions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.transaction_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.transaction_categories(user_id, type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_type_unique
  ON public.transaction_categories(user_id, lower(name), type);
CREATE INDEX IF NOT EXISTS idx_app_reminders_user_id ON public.app_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_app_reminders_trigger_at ON public.app_reminders(trigger_at);
CREATE INDEX IF NOT EXISTS idx_app_releases_lookup
  ON public.app_releases(platform, channel, is_active, created_at DESC);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_profile_owner(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_profile_id
      AND user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_wallet_owner(p_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.wallets w
    JOIN public.profiles p ON p.id = w.profile_id
    WHERE w.id = p_wallet_id
      AND p.user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_wallet_member_by_email(p_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := lower(auth.email());

  IF v_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.wallet_members wm
    WHERE wm.wallet_id = p_wallet_id
      AND lower(wm.user_email) = v_email
      AND wm.status = 'active'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_wallet(p_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_wallet_owner(p_wallet_id) OR public.is_wallet_member_by_email(p_wallet_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_wallet_owner(
  p_wallet_id UUID,
  p_owner_email TEXT,
  p_timestamp BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallet_members (
    wallet_id,
    user_email,
    role,
    status,
    created_at,
    updated_at
  )
  SELECT
    p_wallet_id,
    lower(trim(p_owner_email)),
    'owner',
    'active',
    p_timestamp,
    p_timestamp
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.wallet_members
    WHERE wallet_id = p_wallet_id
      AND lower(user_email) = lower(trim(p_owner_email))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_default_categories_for_user(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);
BEGIN
  INSERT INTO public.transaction_categories (
    id,
    user_id,
    name,
    type,
    icon,
    color,
    is_default,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid()::TEXT,
    p_user_id::UUID,
    default_cats.name,
    default_cats.type,
    default_cats.icon,
    default_cats.color,
    TRUE,
    v_now,
    v_now
  FROM (
    VALUES
      ('Makanan', 'expense', 'food', '#FF6B6B'),
      ('Transportasi', 'expense', 'car', '#4ECDC4'),
      ('Belanja', 'expense', 'shopping', '#45B7D1'),
      ('Hiburan', 'expense', 'gamepad', '#96CEB4'),
      ('Tagihan', 'expense', 'file-document', '#FFEAA7'),
      ('Kesehatan', 'expense', 'medical-bag', '#DDA0DD'),
      ('Pendidikan', 'expense', 'school', '#98D8C8'),
      ('Lainnya', 'expense', 'tag', '#F39C12'),
      ('Gaji', 'income', 'cash', '#2ECC71'),
      ('Bonus', 'income', 'star', '#3498DB'),
      ('Investasi', 'income', 'trending-up', '#9B59B6'),
      ('Hadiah', 'income', 'gift', '#E91E63')
  ) AS default_cats(name, type, icon, color)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.transaction_categories existing
    WHERE existing.user_id = p_user_id::UUID
      AND lower(existing.name) = lower(default_cats.name)
      AND existing.type = default_cats.type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_share_wallet_goals(
  p_wallet_id TEXT,
  p_user_email TEXT,
  p_shared_by TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);
BEGIN
  INSERT INTO public.wallet_goals_shared (
    id,
    goal_id,
    wallet_id,
    user_email,
    shared_by,
    shared_at,
    created_at,
    updated_at,
    permission_level
  )
  SELECT
    gen_random_uuid()::TEXT,
    g.id,
    g.wallet_id,
    lower(trim(p_user_email)),
    p_shared_by,
    v_now,
    v_now,
    v_now,
    'read_write'
  FROM public.saving_goals g
  WHERE g.wallet_id::TEXT = p_wallet_id
    AND COALESCE(g.is_completed, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM public.wallet_goals_shared existing
      WHERE existing.goal_id = g.id
        AND lower(existing.user_email) = lower(trim(p_user_email))
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    name
  )
  SELECT
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      split_part(COALESCE(NEW.email, 'User'), '@', 1)
    )
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_goals_shared ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Core ownership policies
CREATE POLICY "Users manage own profile"
  ON public.profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view accessible wallets"
  ON public.wallets
  FOR SELECT
  USING (public.can_access_wallet(id));

CREATE POLICY "Profile owners can insert wallets"
  ON public.wallets
  FOR INSERT
  WITH CHECK (public.is_profile_owner(profile_id));

CREATE POLICY "Members can update accessible wallets"
  ON public.wallets
  FOR UPDATE
  USING (public.can_access_wallet(id))
  WITH CHECK (public.can_access_wallet(id));

CREATE POLICY "Owners can delete wallets"
  ON public.wallets
  FOR DELETE
  USING (public.is_wallet_owner(id));

CREATE POLICY "Users can view wallet members for accessible wallets"
  ON public.wallet_members
  FOR SELECT
  USING (public.can_access_wallet(wallet_id));

CREATE POLICY "Owners and editors can insert wallet members"
  ON public.wallet_members
  FOR INSERT
  WITH CHECK (
    public.is_wallet_owner(wallet_id)
    OR EXISTS (
      SELECT 1
      FROM public.wallet_members existing
      WHERE existing.wallet_id = wallet_members.wallet_id
        AND lower(existing.user_email) = lower(auth.email())
        AND existing.status = 'active'
        AND existing.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners and editors can update wallet members"
  ON public.wallet_members
  FOR UPDATE
  USING (
    public.is_wallet_owner(wallet_id)
    OR EXISTS (
      SELECT 1
      FROM public.wallet_members existing
      WHERE existing.wallet_id = wallet_members.wallet_id
        AND lower(existing.user_email) = lower(auth.email())
        AND existing.status = 'active'
        AND existing.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    public.is_wallet_owner(wallet_id)
    OR EXISTS (
      SELECT 1
      FROM public.wallet_members existing
      WHERE existing.wallet_id = wallet_members.wallet_id
        AND lower(existing.user_email) = lower(auth.email())
        AND existing.status = 'active'
        AND existing.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Owners can delete wallet members"
  ON public.wallet_members
  FOR DELETE
  USING (public.is_wallet_owner(wallet_id));

CREATE POLICY "Users manage accessible transactions"
  ON public.transactions
  FOR ALL
  USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
  )
  WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
  );

CREATE POLICY "Users manage accessible budgets"
  ON public.budgets
  FOR ALL
  USING (
    (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
    OR (
      wallet_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = budgets.wallet_id
          AND lower(wm.user_email) = lower(auth.email())
          AND wm.status = 'active'
      )
    )
  )
  WITH CHECK (
    (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
    OR (
      wallet_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = budgets.wallet_id
          AND lower(wm.user_email) = lower(auth.email())
          AND wm.status = 'active'
      )
    )
  );

CREATE POLICY "Users manage accessible saving goals"
  ON public.saving_goals
  FOR ALL
  USING (
    (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
    OR (
      wallet_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = saving_goals.wallet_id
          AND lower(wm.user_email) = lower(auth.email())
          AND wm.status = 'active'
      )
    )
  )
  WITH CHECK (
    (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
    OR (
      wallet_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = saving_goals.wallet_id
          AND lower(wm.user_email) = lower(auth.email())
          AND wm.status = 'active'
      )
    )
  );

CREATE POLICY "Users manage accessible saving logs"
  ON public.saving_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.saving_goals sg
      WHERE sg.id = saving_logs.goal_id
        AND (
          (sg.profile_id IS NOT NULL AND public.is_profile_owner(sg.profile_id))
          OR (
            sg.wallet_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.wallet_members wm
              WHERE wm.wallet_id = sg.wallet_id
                AND lower(wm.user_email) = lower(auth.email())
                AND wm.status = 'active'
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.saving_goals sg
      WHERE sg.id = saving_logs.goal_id
        AND (
          (sg.profile_id IS NOT NULL AND public.is_profile_owner(sg.profile_id))
          OR (
            sg.wallet_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.wallet_members wm
              WHERE wm.wallet_id = sg.wallet_id
                AND lower(wm.user_email) = lower(auth.email())
                AND wm.status = 'active'
            )
          )
        )
    )
  );

CREATE POLICY "Users manage own notifications"
  ON public.notifications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view shared goals for accessible wallets"
  ON public.wallet_goals_shared
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = wallet_goals_shared.wallet_id
        AND lower(wm.user_email) = lower(auth.email())
        AND wm.status = 'active'
    )
  );

CREATE POLICY "Wallet owners and editors can manage shared goals"
  ON public.wallet_goals_shared
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = wallet_goals_shared.wallet_id
        AND lower(wm.user_email) = lower(auth.email())
        AND wm.status = 'active'
        AND wm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = wallet_goals_shared.wallet_id
        AND lower(wm.user_email) = lower(auth.email())
        AND wm.status = 'active'
        AND wm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can view sharing activity for accessible wallets"
  ON public.sharing_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = sharing_activity_log.wallet_id
        AND lower(wm.user_email) = lower(auth.email())
        AND wm.status = 'active'
    )
  );

CREATE POLICY "Wallet owners and editors can manage sharing activity"
  ON public.sharing_activity_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = sharing_activity_log.wallet_id
        AND lower(wm.user_email) = lower(auth.email())
        AND wm.status = 'active'
        AND wm.role IN ('owner', 'editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = sharing_activity_log.wallet_id
        AND lower(wm.user_email) = lower(auth.email())
        AND wm.status = 'active'
        AND wm.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users manage own recurring transactions"
  ON public.recurring_transactions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own transaction categories"
  ON public.transaction_categories
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own reminders"
  ON public.app_reminders
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can read active releases"
  ON public.app_releases
  FOR SELECT
  USING (is_active = TRUE);

-- Grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.app_releases TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_member_by_email(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_wallet(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet_owner(UUID, TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.insert_default_categories_for_user(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_share_wallet_goals(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;
