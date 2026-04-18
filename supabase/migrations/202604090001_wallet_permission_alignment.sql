-- Align wallet write permissions with the mobile client:
-- - viewing stays broader (`can_access_wallet`)
-- - writes require owner/editor (`can_manage_wallet`)
-- - reassert sharing activity policies in environments that missed prior repairs

CREATE OR REPLACE FUNCTION public.can_manage_wallet(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  v_email := lower(coalesce(auth.jwt() ->> 'email', auth.email()));

  RETURN public.is_wallet_owner(p_wallet_id)
    OR EXISTS (
      SELECT 1
      FROM public.wallet_members wm
      WHERE wm.wallet_id = p_wallet_id
        AND lower(wm.user_email) = v_email
        AND COALESCE(wm.status, 'active') = 'active'
        AND wm.role IN ('owner', 'editor')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_wallet(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Members can update accessible wallets" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets" ON public.wallets;

CREATE POLICY "Members can manage accessible wallets"
  ON public.wallets
  FOR UPDATE
  USING (public.can_manage_wallet(id))
  WITH CHECK (public.can_manage_wallet(id));

DROP POLICY IF EXISTS "Users manage accessible transactions" ON public.transactions;
DROP POLICY IF EXISTS "insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "update_transactions" ON public.transactions;
DROP POLICY IF EXISTS "delete_transactions" ON public.transactions;

CREATE POLICY "Users can insert writable transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_manage_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
  );

CREATE POLICY "Users can update writable transactions"
  ON public.transactions
  FOR UPDATE
  USING (
    (wallet_id IS NOT NULL AND public.can_manage_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
  )
  WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_manage_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
  );

CREATE POLICY "Users can delete writable transactions"
  ON public.transactions
  FOR DELETE
  USING (
    (wallet_id IS NOT NULL AND public.can_manage_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
  );

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
