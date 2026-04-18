-- Fix RLS for shared-goal sync writes from the client app.
-- The app pushes local sharing_activity_log rows for:
-- - goal_created
-- - contribution_added
-- and wallet_goals_shared rows when a shared-wallet goal is created locally.

ALTER TABLE IF EXISTS public.sharing_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.wallet_goals_shared ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sharing_activity_log'
      AND policyname = 'Wallet owners and editors can insert sharing activity'
  ) THEN
    CREATE POLICY "Wallet owners and editors can insert sharing activity"
      ON public.sharing_activity_log
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = sharing_activity_log.wallet_id::TEXT
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
      AND tablename = 'sharing_activity_log'
      AND policyname = 'Wallet owners and editors can update sharing activity'
  ) THEN
    CREATE POLICY "Wallet owners and editors can update sharing activity"
      ON public.sharing_activity_log
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = sharing_activity_log.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = sharing_activity_log.wallet_id::TEXT
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
      AND tablename = 'sharing_activity_log'
      AND policyname = 'Goal owners can see sharing activity'
  ) THEN
    CREATE POLICY "Goal owners can see sharing activity"
      ON public.sharing_activity_log
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.saving_goals sg
          WHERE sg.id::TEXT = sharing_activity_log.goal_id::TEXT
            AND sg.owner_user_id = auth.uid()
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
      AND tablename = 'wallet_goals_shared'
      AND policyname = 'Wallet owners and editors can insert shared goals'
  ) THEN
    CREATE POLICY "Wallet owners and editors can insert shared goals"
      ON public.wallet_goals_shared
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = wallet_goals_shared.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND COALESCE(wm.status, 'active') = 'active'
            AND wm.role IN ('owner', 'editor')
        )
      );
  END IF;
END $$;
