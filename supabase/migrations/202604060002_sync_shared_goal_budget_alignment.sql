-- Align remote sync schema and shared-wallet permissions with the mobile app.
-- Fixes:
-- 1. saving_goals.deadline_at missing from Supabase schema
-- 2. shared-wallet members cannot sync budgets / goals / saving logs

ALTER TABLE IF EXISTS public.saving_goals
  ADD COLUMN IF NOT EXISTS deadline_at BIGINT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saving_goals'
      AND column_name = 'deadline_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.saving_goals ALTER COLUMN deadline_at TYPE BIGINT USING deadline_at::BIGINT';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

UPDATE public.saving_goals
SET deadline_at = COALESCE(deadline_at, estimated_date, FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000))
WHERE deadline_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_saving_goals_wallet_id ON public.saving_goals(wallet_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'budgets'
      AND policyname = 'Shared members can view budgets'
  ) THEN
    CREATE POLICY "Shared members can view budgets"
      ON public.budgets
      FOR SELECT
      USING (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'budgets'
      AND policyname = 'Shared owners and editors can insert budgets'
  ) THEN
    CREATE POLICY "Shared owners and editors can insert budgets"
      ON public.budgets
      FOR INSERT
      WITH CHECK (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'budgets'
      AND policyname = 'Shared owners and editors can update budgets'
  ) THEN
    CREATE POLICY "Shared owners and editors can update budgets"
      ON public.budgets
      FOR UPDATE
      USING (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      )
      WITH CHECK (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'budgets'
      AND policyname = 'Shared owners and editors can delete budgets'
  ) THEN
    CREATE POLICY "Shared owners and editors can delete budgets"
      ON public.budgets
      FOR DELETE
      USING (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_goals'
      AND policyname = 'Shared members can view saving goals'
  ) THEN
    CREATE POLICY "Shared members can view saving goals"
      ON public.saving_goals
      FOR SELECT
      USING (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = saving_goals.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_goals'
      AND policyname = 'Shared owners and editors can insert saving goals'
  ) THEN
    CREATE POLICY "Shared owners and editors can insert saving goals"
      ON public.saving_goals
      FOR INSERT
      WITH CHECK (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = saving_goals.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_goals'
      AND policyname = 'Shared owners and editors can update saving goals'
  ) THEN
    CREATE POLICY "Shared owners and editors can update saving goals"
      ON public.saving_goals
      FOR UPDATE
      USING (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = saving_goals.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      )
      WITH CHECK (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = saving_goals.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_goals'
      AND policyname = 'Shared owners and editors can delete saving goals'
  ) THEN
    CREATE POLICY "Shared owners and editors can delete saving goals"
      ON public.saving_goals
      FOR DELETE
      USING (
        wallet_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = saving_goals.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_logs'
      AND policyname = 'Shared members can view saving logs'
  ) THEN
    CREATE POLICY "Shared members can view saving logs"
      ON public.saving_logs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.saving_goals sg
          JOIN public.wallet_members wm
            ON wm.wallet_id::TEXT = sg.wallet_id::TEXT
          WHERE sg.id::TEXT = saving_logs.goal_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_logs'
      AND policyname = 'Shared owners and editors can insert saving logs'
  ) THEN
    CREATE POLICY "Shared owners and editors can insert saving logs"
      ON public.saving_logs
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.saving_goals sg
          JOIN public.wallet_members wm
            ON wm.wallet_id::TEXT = sg.wallet_id::TEXT
          WHERE sg.id::TEXT = saving_logs.goal_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_logs'
      AND policyname = 'Shared owners and editors can update saving logs'
  ) THEN
    CREATE POLICY "Shared owners and editors can update saving logs"
      ON public.saving_logs
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.saving_goals sg
          JOIN public.wallet_members wm
            ON wm.wallet_id::TEXT = sg.wallet_id::TEXT
          WHERE sg.id::TEXT = saving_logs.goal_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.saving_goals sg
          JOIN public.wallet_members wm
            ON wm.wallet_id::TEXT = sg.wallet_id::TEXT
          WHERE sg.id::TEXT = saving_logs.goal_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'saving_logs'
      AND policyname = 'Shared owners and editors can delete saving logs'
  ) THEN
    CREATE POLICY "Shared owners and editors can delete saving logs"
      ON public.saving_logs
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.saving_goals sg
          JOIN public.wallet_members wm
            ON wm.wallet_id::TEXT = sg.wallet_id::TEXT
          WHERE sg.id::TEXT = saving_logs.goal_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;
