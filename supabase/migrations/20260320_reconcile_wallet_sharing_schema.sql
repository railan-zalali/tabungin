-- =============================================================================
-- Wallet Sharing Schema Reconciliation
-- Migration: 20260320_reconcile_wallet_sharing_schema.sql
-- Purpose:
--   - make fresh Supabase projects bootstrappable from migrations again
--   - reconcile FK, RPC, and RLS rules used by Expo wallet sharing flow
--   - repair common legacy/orphaned data before constraints are re-applied
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- BASE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT 'User',
    icon text DEFAULT 'account',
    color text DEFAULT '#1DB954',
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    name text NOT NULL,
    type text NOT NULL DEFAULT 'cash',
    color text DEFAULT '#1DB954',
    balance numeric(15, 2) NOT NULL DEFAULT 0,
    is_default boolean NOT NULL DEFAULT false,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

CREATE TABLE IF NOT EXISTS public.wallet_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    role text NOT NULL DEFAULT 'editor',
    status text NOT NULL DEFAULT 'pending',
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount numeric(15, 2) NOT NULL,
    category text NOT NULL,
    note text,
    date bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
    category text NOT NULL,
    amount numeric(15, 2) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

CREATE TABLE IF NOT EXISTS public.saving_goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
    name text NOT NULL,
    target_amount numeric(15, 2) NOT NULL,
    current_amount numeric(15, 2) NOT NULL DEFAULT 0,
    emoji text DEFAULT 'piggy-bank',
    photo_uri text,
    saving_per_period numeric(15, 2) DEFAULT 0,
    period_type text DEFAULT 'monthly',
    color text DEFAULT '#1DB954',
    start_date bigint,
    estimated_date bigint,
    is_completed boolean NOT NULL DEFAULT false,
    reminder_enabled boolean NOT NULL DEFAULT false,
    reminder_time text,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

CREATE TABLE IF NOT EXISTS public.saving_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id uuid NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
    amount numeric(15, 2) NOT NULL,
    note text,
    date bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS icon text DEFAULT 'account';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS color text DEFAULT '#1DB954';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS type text DEFAULT 'cash';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS color text DEFAULT '#1DB954';
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS balance numeric(15, 2) DEFAULT 0;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

ALTER TABLE public.wallet_members ADD COLUMN IF NOT EXISTS role text DEFAULT 'editor';
ALTER TABLE public.wallet_members ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.wallet_members ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.wallet_members ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_id uuid;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS wallet_id uuid;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS profile_id uuid;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS wallet_id uuid;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS photo_uri text;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS saving_per_period numeric(15, 2) DEFAULT 0;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS period_type text DEFAULT 'monthly';
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS color text DEFAULT '#1DB954';
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS start_date bigint;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS estimated_date bigint;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS reminder_enabled boolean DEFAULT false;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS reminder_time text;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

ALTER TABLE public.saving_logs ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE public.saving_logs ADD COLUMN IF NOT EXISTS date bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.saving_logs ADD COLUMN IF NOT EXISTS created_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;
ALTER TABLE public.saving_logs ADD COLUMN IF NOT EXISTS updated_at bigint DEFAULT EXTRACT(EPOCH FROM NOW())::bigint;

-- =============================================================================
-- DATA REPAIR BEFORE CONSTRAINTS / UNIQUE INDEXES
-- =============================================================================

UPDATE public.wallet_members
SET user_email = lower(trim(user_email))
WHERE user_email IS NOT NULL AND user_email <> lower(trim(user_email));

UPDATE public.wallet_members
SET role = 'editor'
WHERE role = 'viewer';

WITH ranked AS (
    SELECT
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY user_id
            ORDER BY COALESCE(updated_at, created_at, 0) DESC, created_at DESC, id DESC
        ) AS rn
    FROM public.profiles
    WHERE user_id IS NOT NULL
)
DELETE FROM public.profiles p
USING ranked
WHERE p.ctid = ranked.ctid
  AND ranked.rn > 1;

WITH ranked AS (
    SELECT
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY wallet_id, lower(trim(user_email))
            ORDER BY COALESCE(updated_at, created_at, 0) DESC, created_at DESC, id DESC
        ) AS rn
    FROM public.wallet_members
)
DELETE FROM public.wallet_members wm
USING ranked
WHERE wm.ctid = ranked.ctid
  AND ranked.rn > 1;

UPDATE public.wallets w
SET profile_id = NULL
WHERE profile_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = w.profile_id
  );

DELETE FROM public.wallet_members wm
WHERE NOT EXISTS (
    SELECT 1 FROM public.wallets w WHERE w.id = wm.wallet_id
);

UPDATE public.transactions t
SET profile_id = NULL
WHERE profile_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = t.profile_id
  );

UPDATE public.transactions t
SET wallet_id = NULL
WHERE wallet_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = t.wallet_id
  );

UPDATE public.budgets b
SET profile_id = NULL
WHERE profile_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = b.profile_id
  );

UPDATE public.budgets b
SET wallet_id = NULL
WHERE wallet_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = b.wallet_id
  );

UPDATE public.saving_goals sg
SET profile_id = NULL
WHERE profile_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = sg.profile_id
  );

UPDATE public.saving_goals sg
SET wallet_id = NULL
WHERE wallet_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.wallets w WHERE w.id = sg.wallet_id
  );

DELETE FROM public.saving_logs sl
WHERE NOT EXISTS (
    SELECT 1 FROM public.saving_goals sg WHERE sg.id = sl.goal_id
);

WITH ranked AS (
    SELECT
        ctid,
        ROW_NUMBER() OVER (
            PARTITION BY profile_id, category, month, year
            ORDER BY COALESCE(updated_at, created_at, 0) DESC, created_at DESC, id DESC
        ) AS rn
    FROM public.budgets
    WHERE profile_id IS NOT NULL
)
DELETE FROM public.budgets b
USING ranked
WHERE b.ctid = ranked.ctid
  AND ranked.rn > 1;

-- =============================================================================
-- CONSTRAINTS AND INDEXES
-- =============================================================================

ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_profile_id_fkey;
ALTER TABLE public.wallets
    ADD CONSTRAINT wallets_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.wallet_members DROP CONSTRAINT IF EXISTS wallet_members_wallet_id_fkey;
ALTER TABLE public.wallet_members
    ADD CONSTRAINT wallet_members_wallet_id_fkey
    FOREIGN KEY (wallet_id)
    REFERENCES public.wallets(id)
    ON DELETE CASCADE;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_profile_id_fkey;
ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_wallet_id_fkey;
ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_wallet_id_fkey
    FOREIGN KEY (wallet_id)
    REFERENCES public.wallets(id)
    ON DELETE CASCADE;

ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_profile_id_fkey;
ALTER TABLE public.budgets
    ADD CONSTRAINT budgets_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_wallet_id_fkey;
ALTER TABLE public.budgets
    ADD CONSTRAINT budgets_wallet_id_fkey
    FOREIGN KEY (wallet_id)
    REFERENCES public.wallets(id)
    ON DELETE SET NULL;

ALTER TABLE public.saving_goals DROP CONSTRAINT IF EXISTS saving_goals_profile_id_fkey;
ALTER TABLE public.saving_goals
    ADD CONSTRAINT saving_goals_profile_id_fkey
    FOREIGN KEY (profile_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.saving_goals DROP CONSTRAINT IF EXISTS saving_goals_wallet_id_fkey;
ALTER TABLE public.saving_goals
    ADD CONSTRAINT saving_goals_wallet_id_fkey
    FOREIGN KEY (wallet_id)
    REFERENCES public.wallets(id)
    ON DELETE SET NULL;

ALTER TABLE public.saving_logs DROP CONSTRAINT IF EXISTS saving_logs_goal_id_fkey;
ALTER TABLE public.saving_logs
    ADD CONSTRAINT saving_logs_goal_id_fkey
    FOREIGN KEY (goal_id)
    REFERENCES public.saving_goals(id)
    ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_user_id
    ON public.profiles(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_members_wallet_email
    ON public.wallet_members(wallet_id, user_email);

CREATE UNIQUE INDEX IF NOT EXISTS uq_budgets_profile_category_period
    ON public.budgets(profile_id, category, month, year);

CREATE INDEX IF NOT EXISTS idx_wallets_profile_id ON public.wallets(profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet_id ON public.wallet_members(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_members_email ON public.wallet_members(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_budgets_wallet_id ON public.budgets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_budgets_profile_id ON public.budgets(profile_id);
CREATE INDEX IF NOT EXISTS idx_budgets_month_year ON public.budgets(month, year);
CREATE INDEX IF NOT EXISTS idx_saving_goals_wallet_id ON public.saving_goals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_saving_goals_profile_id ON public.saving_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_saving_logs_goal_id ON public.saving_logs(goal_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_profile_owner(p_profile_id uuid)
RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.is_wallet_owner(p_wallet_id uuid)
RETURNS boolean
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

CREATE OR REPLACE FUNCTION public.is_wallet_member_by_email(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

    IF v_email = '' THEN
        RETURN false;
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

CREATE OR REPLACE FUNCTION public.can_access_wallet(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.is_wallet_owner(p_wallet_id) OR public.is_wallet_member_by_email(p_wallet_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_goal(p_goal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.saving_goals sg
        WHERE sg.id = p_goal_id
          AND (
              (sg.wallet_id IS NOT NULL AND public.can_access_wallet(sg.wallet_id))
              OR (sg.wallet_id IS NULL AND public.is_profile_owner(sg.profile_id))
          )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_wallet_owner(
    p_wallet_id uuid,
    p_owner_email text,
    p_timestamp bigint
)
RETURNS void
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

CREATE OR REPLACE FUNCTION public.get_wallet_preview(p_wallet_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    type text,
    color text,
    created_at bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        w.id,
        w.name,
        w.type,
        w.color,
        w.created_at
    FROM public.wallets w
    WHERE w.id = p_wallet_id
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name)
    SELECT
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'User')
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = NEW.id
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;

DROP POLICY IF EXISTS "view_wallets" ON public.wallets;
DROP POLICY IF EXISTS "insert_wallets" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets" ON public.wallets;
DROP POLICY IF EXISTS "delete_wallets" ON public.wallets;
DROP POLICY IF EXISTS "p_wallets_select" ON public.wallets;
DROP POLICY IF EXISTS "p_wallets_insert" ON public.wallets;
DROP POLICY IF EXISTS "p_wallets_update" ON public.wallets;
DROP POLICY IF EXISTS "p_wallets_delete" ON public.wallets;

DROP POLICY IF EXISTS "view_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "insert_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "update_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "delete_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "p_wallet_members_select" ON public.wallet_members;
DROP POLICY IF EXISTS "p_wallet_members_insert" ON public.wallet_members;
DROP POLICY IF EXISTS "p_wallet_members_update" ON public.wallet_members;
DROP POLICY IF EXISTS "p_wallet_members_delete" ON public.wallet_members;
DROP POLICY IF EXISTS "wallet_members_select_all_authenticated" ON public.wallet_members;
DROP POLICY IF EXISTS "wallet_members_insert_all_authenticated" ON public.wallet_members;
DROP POLICY IF EXISTS "wallet_members_update_authenticated" ON public.wallet_members;
DROP POLICY IF EXISTS "wallet_members_delete_authenticated" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can view wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can update wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can delete wallet members" ON public.wallet_members;

DROP POLICY IF EXISTS "view_transactions" ON public.transactions;
DROP POLICY IF EXISTS "insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "update_transactions" ON public.transactions;
DROP POLICY IF EXISTS "delete_transactions" ON public.transactions;
DROP POLICY IF EXISTS "p_transactions_select" ON public.transactions;
DROP POLICY IF EXISTS "p_transactions_insert" ON public.transactions;
DROP POLICY IF EXISTS "p_transactions_update" ON public.transactions;
DROP POLICY IF EXISTS "p_transactions_delete" ON public.transactions;

DROP POLICY IF EXISTS "view_budgets" ON public.budgets;
DROP POLICY IF EXISTS "insert_budgets" ON public.budgets;
DROP POLICY IF EXISTS "update_budgets" ON public.budgets;
DROP POLICY IF EXISTS "delete_budgets" ON public.budgets;

DROP POLICY IF EXISTS "view_saving_goals" ON public.saving_goals;
DROP POLICY IF EXISTS "insert_saving_goals" ON public.saving_goals;
DROP POLICY IF EXISTS "update_saving_goals" ON public.saving_goals;
DROP POLICY IF EXISTS "delete_saving_goals" ON public.saving_goals;

DROP POLICY IF EXISTS "view_saving_logs" ON public.saving_logs;
DROP POLICY IF EXISTS "insert_saving_logs" ON public.saving_logs;
DROP POLICY IF EXISTS "update_saving_logs" ON public.saving_logs;
DROP POLICY IF EXISTS "delete_saving_logs" ON public.saving_logs;

CREATE POLICY "view_own_profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "insert_own_profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "view_wallets"
ON public.wallets
FOR SELECT
USING (public.can_access_wallet(id));

CREATE POLICY "insert_wallets"
ON public.wallets
FOR INSERT
WITH CHECK (profile_id IS NOT NULL AND public.is_profile_owner(profile_id));

CREATE POLICY "update_wallets"
ON public.wallets
FOR UPDATE
USING (
    (id IS NOT NULL AND public.can_access_wallet(id))
    OR (profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
)
WITH CHECK (
    wallets.id IS NOT NULL
    AND (
        public.can_access_wallet(wallets.id)
        OR (wallets.profile_id IS NOT NULL AND public.is_profile_owner(wallets.profile_id))
    )
);

CREATE POLICY "delete_wallets"
ON public.wallets
FOR DELETE
USING (public.is_wallet_owner(id));

CREATE POLICY "view_wallet_members"
ON public.wallet_members
FOR SELECT
USING (public.can_access_wallet(wallet_id));

CREATE POLICY "insert_wallet_members"
ON public.wallet_members
FOR INSERT
WITH CHECK (
    public.is_wallet_owner(wallet_id)
    OR EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = wallet_members.wallet_id
          AND lower(wm.user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          AND wm.status = 'active'
          AND wm.role IN ('owner', 'editor')
    )
    OR lower(wallet_members.user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "update_wallet_members"
ON public.wallet_members
FOR UPDATE
USING (
    public.is_wallet_owner(wallet_id)
    OR lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
    public.is_wallet_owner(wallet_id)
    OR (
        lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        AND role = COALESCE(
            (SELECT existing.role FROM public.wallet_members existing WHERE existing.id = wallet_members.id),
            role
        )
        AND wallet_id = COALESCE(
            (SELECT existing.wallet_id FROM public.wallet_members existing WHERE existing.id = wallet_members.id),
            wallet_id
        )
    )
);

CREATE POLICY "delete_wallet_members"
ON public.wallet_members
FOR DELETE
USING (
    public.is_wallet_owner(wallet_id)
    OR lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "view_transactions"
ON public.transactions
FOR SELECT
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "insert_transactions"
ON public.transactions
FOR INSERT
WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "update_transactions"
ON public.transactions
FOR UPDATE
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
)
WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "delete_transactions"
ON public.transactions
FOR DELETE
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "view_budgets"
ON public.budgets
FOR SELECT
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "insert_budgets"
ON public.budgets
FOR INSERT
WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "update_budgets"
ON public.budgets
FOR UPDATE
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
)
WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "delete_budgets"
ON public.budgets
FOR DELETE
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "view_saving_goals"
ON public.saving_goals
FOR SELECT
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "insert_saving_goals"
ON public.saving_goals
FOR INSERT
WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "update_saving_goals"
ON public.saving_goals
FOR UPDATE
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
)
WITH CHECK (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "delete_saving_goals"
ON public.saving_goals
FOR DELETE
USING (
    (wallet_id IS NOT NULL AND public.can_access_wallet(wallet_id))
    OR (wallet_id IS NULL AND profile_id IS NOT NULL AND public.is_profile_owner(profile_id))
);

CREATE POLICY "view_saving_logs"
ON public.saving_logs
FOR SELECT
USING (public.can_access_goal(goal_id));

CREATE POLICY "insert_saving_logs"
ON public.saving_logs
FOR INSERT
WITH CHECK (public.can_access_goal(goal_id));

CREATE POLICY "update_saving_logs"
ON public.saving_logs
FOR UPDATE
USING (public.can_access_goal(goal_id))
WITH CHECK (public.can_access_goal(goal_id));

CREATE POLICY "delete_saving_logs"
ON public.saving_logs
FOR DELETE
USING (public.can_access_goal(goal_id));

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.wallets TO anon, authenticated;
GRANT ALL ON public.wallet_members TO anon, authenticated;
GRANT ALL ON public.transactions TO anon, authenticated;
GRANT ALL ON public.budgets TO anon, authenticated;
GRANT ALL ON public.saving_goals TO anon, authenticated;
GRANT ALL ON public.saving_logs TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_profile_owner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_owner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_member_by_email(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_wallet(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_goal(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet_owner(uuid, text, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_preview(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;

DO $$
DECLARE
    wallet_policy_count integer;
    member_policy_count integer;
    tx_policy_count integer;
BEGIN
    SELECT COUNT(*) INTO wallet_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallets';

    SELECT COUNT(*) INTO member_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallet_members';

    SELECT COUNT(*) INTO tx_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'transactions';

    RAISE NOTICE 'wallet_sharing_schema_reconciled';
    RAISE NOTICE 'wallet policies: %', wallet_policy_count;
    RAISE NOTICE 'wallet member policies: %', member_policy_count;
    RAISE NOTICE 'transaction policies: %', tx_policy_count;
END $$;
