-- Sync compatibility repairs for release clients.
-- 1. Add explicit saving goal deadline so mobile sync can push `deadline_at`.
-- 2. Allow authenticated users to manage budgets they own or budgets on wallets
--    where they are active members.

ALTER TABLE IF EXISTS public.saving_goals
  ADD COLUMN IF NOT EXISTS deadline_at BIGINT;

UPDATE public.saving_goals
SET deadline_at = estimated_date
WHERE deadline_at IS NULL;

ALTER TABLE IF EXISTS public.budgets
  ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_time TEXT;

ALTER TABLE IF EXISTS public.budgets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'budgets'
      AND policyname = 'Users manage accessible budgets'
  ) THEN
    CREATE POLICY "Users manage accessible budgets"
      ON public.budgets
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id::TEXT = budgets.profile_id::TEXT
            AND p.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND wm.status = 'active'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id::TEXT = budgets.profile_id::TEXT
            AND p.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.wallet_members wm
          WHERE wm.wallet_id::TEXT = budgets.wallet_id::TEXT
            AND lower(wm.user_email) = lower(auth.email())
            AND wm.status = 'active'
        )
      );
  END IF;
END $$;
