-- Sync stability repairs for dev/staging
-- Fixes millisecond timestamp overflows, goal-sharing metadata consistency,
-- and invalid RPC definitions introduced by earlier migrations.

CREATE TABLE IF NOT EXISTS public.wallet_goals_shared (
  id TEXT PRIMARY KEY,
  goal_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  shared_by TEXT NOT NULL,
  shared_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT,
  permission_level TEXT DEFAULT 'read_write',
  sync_status TEXT DEFAULT 'synced'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wallet_goals_shared'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallet_goals_shared' AND column_name = 'shared_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.wallet_goals_shared ALTER COLUMN shared_at TYPE BIGINT USING shared_at::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallet_goals_shared' AND column_name = 'created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.wallet_goals_shared ALTER COLUMN created_at TYPE BIGINT USING created_at::BIGINT';
    END IF;
  END IF;
END $$;

ALTER TABLE IF EXISTS public.wallet_goals_shared
  ADD COLUMN IF NOT EXISTS updated_at BIGINT;

ALTER TABLE IF EXISTS public.wallet_goals_shared
  ADD COLUMN IF NOT EXISTS permission_level TEXT DEFAULT 'read_write';

DO $$
BEGIN
  UPDATE public.wallet_goals_shared
  SET
    updated_at = COALESCE(updated_at, created_at, shared_at),
    permission_level = COALESCE(permission_level, 'read_write')
  WHERE updated_at IS NULL OR permission_level IS NULL;
END $$;

ALTER TABLE IF EXISTS public.wallet_goals_shared
  ALTER COLUMN permission_level SET DEFAULT 'read_write';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'wallet_goals_shared'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.wallet_goals_shared'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%permission_level%'
  ) THEN
    ALTER TABLE public.wallet_goals_shared
      ADD CONSTRAINT wallet_goals_shared_permission_level_check
      CHECK (permission_level IN ('read_only', 'read_write', 'admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sharing_activity_log (
  id TEXT PRIMARY KEY,
  goal_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  metadata TEXT,
  timestamp BIGINT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  sync_status TEXT DEFAULT 'synced',
  FOREIGN KEY (goal_id) REFERENCES public.saving_goals(id) ON DELETE CASCADE
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sharing_activity_log'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sharing_activity_log' AND column_name = 'timestamp'
    ) THEN
      EXECUTE 'ALTER TABLE public.sharing_activity_log ALTER COLUMN timestamp TYPE BIGINT USING timestamp::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sharing_activity_log' AND column_name = 'created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.sharing_activity_log ALTER COLUMN created_at TYPE BIGINT USING created_at::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'sharing_activity_log' AND column_name = 'updated_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.sharing_activity_log ALTER COLUMN updated_at TYPE BIGINT USING updated_at::BIGINT';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'transaction_categories'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transaction_categories' AND column_name = 'created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.transaction_categories ALTER COLUMN created_at TYPE BIGINT USING created_at::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'transaction_categories' AND column_name = 'updated_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.transaction_categories ALTER COLUMN updated_at TYPE BIGINT USING updated_at::BIGINT';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'recurring_transactions'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'start_date'
    ) THEN
      EXECUTE 'ALTER TABLE public.recurring_transactions ALTER COLUMN start_date TYPE BIGINT USING start_date::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'end_date'
    ) THEN
      EXECUTE 'ALTER TABLE public.recurring_transactions ALTER COLUMN end_date TYPE BIGINT USING end_date::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'next_occurrence'
    ) THEN
      EXECUTE 'ALTER TABLE public.recurring_transactions ALTER COLUMN next_occurrence TYPE BIGINT USING next_occurrence::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'last_generated_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.recurring_transactions ALTER COLUMN last_generated_at TYPE BIGINT USING last_generated_at::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.recurring_transactions ALTER COLUMN created_at TYPE BIGINT USING created_at::BIGINT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'recurring_transactions' AND column_name = 'updated_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.recurring_transactions ALTER COLUMN updated_at TYPE BIGINT USING updated_at::BIGINT';
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notifications'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at'
    ) THEN
      EXECUTE 'ALTER TABLE public.notifications ALTER COLUMN created_at TYPE BIGINT USING created_at::BIGINT';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_goal ON public.wallet_goals_shared(goal_id);
CREATE INDEX IF NOT EXISTS idx_wallet_goals_shared_wallet_user ON public.wallet_goals_shared(wallet_id, user_email);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_goal_id ON public.sharing_activity_log(goal_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_wallet_id ON public.sharing_activity_log(wallet_id);
CREATE INDEX IF NOT EXISTS idx_sharing_activity_log_timestamp ON public.sharing_activity_log(timestamp DESC);

ALTER TABLE IF EXISTS public.sharing_activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sharing_activity_log'
      AND policyname = 'Users can see sharing activity for their wallets'
  ) THEN
    CREATE POLICY "Users can see sharing activity for their wallets"
      ON public.sharing_activity_log FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.wallet_members
          WHERE wallet_members.wallet_id::TEXT = sharing_activity_log.wallet_id::TEXT
            AND lower(wallet_members.user_email) = lower(auth.email())
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.auto_share_wallet_goals(
  p_wallet_id TEXT,
  p_user_email TEXT,
  p_shared_by TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);
BEGIN
  WITH inserted AS (
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
      AND COALESCE(g.is_completed::INT, 0) = 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.wallet_goals_shared wgs
        WHERE wgs.goal_id::TEXT = g.id::TEXT
          AND lower(wgs.user_email) = lower(trim(p_user_email))
      )
    RETURNING goal_id, wallet_id, user_email, permission_level
  )
  INSERT INTO public.sharing_activity_log (
    id,
    goal_id,
    wallet_id,
    user_email,
    action,
    performed_by,
    metadata,
    timestamp,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid()::TEXT,
    goal_id,
    wallet_id,
    user_email,
    'access_granted',
    p_shared_by,
    jsonb_build_object('permission_level', permission_level)::TEXT,
    v_now,
    v_now,
    v_now
  FROM inserted;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_goal_permission(
  p_goal_id TEXT,
  p_user_email TEXT,
  p_permission_level TEXT,
  p_performed_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id TEXT;
  v_now BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);
BEGIN
  IF p_permission_level NOT IN ('read_only', 'read_write', 'admin') THEN
    RAISE EXCEPTION 'Invalid permission level: %', p_permission_level;
  END IF;

  UPDATE public.wallet_goals_shared
  SET
    permission_level = p_permission_level,
    updated_at = v_now
  WHERE goal_id::TEXT = p_goal_id
    AND lower(user_email) = lower(trim(p_user_email))
  RETURNING wallet_id::TEXT INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Goal sharing not found for user %', p_user_email;
  END IF;

  INSERT INTO public.sharing_activity_log (
    id,
    goal_id,
    wallet_id,
    user_email,
    action,
    performed_by,
    metadata,
    timestamp,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid()::TEXT,
    p_goal_id::UUID,
    v_wallet_id::UUID,
    lower(trim(p_user_email)),
    'permission_changed',
    p_performed_by,
    jsonb_build_object('permission_level', p_permission_level)::TEXT,
    v_now,
    v_now,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Permission updated successfully'
  )::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_goal_sharing(
  p_goal_id TEXT,
  p_user_email TEXT,
  p_performed_by TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id TEXT;
  v_now BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000);
BEGIN
  DELETE FROM public.wallet_goals_shared
  WHERE goal_id::TEXT = p_goal_id
    AND lower(user_email) = lower(trim(p_user_email))
  RETURNING wallet_id::TEXT INTO v_wallet_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Goal sharing not found for user %', p_user_email;
  END IF;

  INSERT INTO public.sharing_activity_log (
    id,
    goal_id,
    wallet_id,
    user_email,
    action,
    performed_by,
    metadata,
    timestamp,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid()::TEXT,
    p_goal_id::UUID,
    v_wallet_id::UUID,
    lower(trim(p_user_email)),
    'revoked',
    p_performed_by,
    NULL,
    v_now,
    v_now,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sharing revoked successfully'
  )::JSON;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_goal_sharing_status(p_goal_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_email', user_email,
        'shared_by', shared_by,
        'shared_at', shared_at,
        'permission_level', permission_level
      )
      ORDER BY shared_at DESC
    ),
    '[]'::jsonb
  )::JSON
  INTO v_result
  FROM public.wallet_goals_shared
  WHERE goal_id::TEXT = p_goal_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_default_categories_for_user(p_user_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
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
    p_user_id,
    default_cats.name,
    default_cats.type,
    default_cats.icon,
    default_cats.color,
    1,
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
    WHERE existing.user_id::TEXT = p_user_id
      AND existing.name = default_cats.name
      AND existing.type = default_cats.type
  );
END;
$$;
