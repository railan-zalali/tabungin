-- Product enhancements: reminder center, import/update support metadata,
-- and explicit shared-saving ownership fields.

ALTER TABLE IF EXISTS public.saving_goals
  ADD COLUMN IF NOT EXISTS owner_user_id UUID,
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

ALTER TABLE IF EXISTS public.budgets
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_time TEXT;

ALTER TABLE IF EXISTS public.recurring_transactions
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_offset_minutes INTEGER DEFAULT 60;

CREATE TABLE IF NOT EXISTS public.app_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_app_reminders_user_id ON public.app_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_app_reminders_trigger_at ON public.app_reminders(trigger_at);

ALTER TABLE IF EXISTS public.app_reminders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_reminders' AND policyname = 'Users manage own reminders'
  ) THEN
    CREATE POLICY "Users manage own reminders"
      ON public.app_reminders
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_app_releases_lookup ON public.app_releases(platform, channel, is_active, created_at DESC);

ALTER TABLE IF EXISTS public.app_releases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'app_releases' AND policyname = 'Anyone can read active releases'
  ) THEN
    CREATE POLICY "Anyone can read active releases"
      ON public.app_releases
      FOR SELECT
      USING (is_active = TRUE);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.notifications'::regclass
      AND contype = 'c'
      AND conname = 'notifications_type_check'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_type_check CHECK (
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
      );
  END IF;
END $$;
