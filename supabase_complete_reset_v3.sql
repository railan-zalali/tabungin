-- =====================================================
-- COMPLETE SUPABASE RESET & RECREATE
-- TABUNGIN APP - Fixed RLS Policies (v3)
-- =====================================================

-- 1. ENABLE UUID EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. DROP EXISTING OBJECTS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.is_profile_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_wallet_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_wallet_member_by_email(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_wallet(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.ensure_wallet_owner(uuid, text, bigint) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.saving_logs CASCADE;
DROP TABLE IF EXISTS public.saving_goals CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.wallet_members CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. CREATE TABLES

-- PROFILES
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL DEFAULT 'User',
    icon text,
    color text DEFAULT '#1DB954',
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    UNIQUE(user_id)
);

-- WALLETS
CREATE TABLE public.wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL DEFAULT 'cash',
    color text DEFAULT '#1DB954',
    balance numeric(15,2) NOT NULL DEFAULT 0,
    is_default boolean DEFAULT false,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

-- WALLET_MEMBERS
CREATE TABLE public.wallet_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_email text NOT NULL,
    role text NOT NULL DEFAULT 'viewer',
    status text NOT NULL DEFAULT 'pending',
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    UNIQUE(wallet_id, user_email)
);

-- TRANSACTIONS
CREATE TABLE public.transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
    type text NOT NULL,
    amount numeric(15,2) NOT NULL,
    category text NOT NULL,
    note text,
    date bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

-- BUDGETS
CREATE TABLE public.budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE CASCADE,
    category text NOT NULL,
    amount numeric(15,2) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    UNIQUE(profile_id, category, month, year)
);

-- SAVING_GOALS
CREATE TABLE public.saving_goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
    name text NOT NULL,
    target_amount numeric(15,2) NOT NULL,
    current_amount numeric(15,2) NOT NULL DEFAULT 0,
    emoji text DEFAULT 'piggy-bank',
    photo_uri text,
    saving_per_period numeric(15,2) DEFAULT 0,
    period_type text DEFAULT 'monthly',
    color text DEFAULT '#1DB954',
    start_date bigint,
    estimated_date bigint,
    is_completed boolean DEFAULT false,
    reminder_enabled boolean DEFAULT false,
    reminder_time text,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

-- SAVING_LOGS
CREATE TABLE public.saving_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id uuid NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
    amount numeric(15,2) NOT NULL,
    note text,
    date bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    created_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint,
    updated_at bigint NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::bigint
);

-- 4. CREATE INDEXES
CREATE INDEX idx_wallets_profile_id ON public.wallets(profile_id);
CREATE INDEX idx_wallet_members_wallet_id ON public.wallet_members(wallet_id);
CREATE INDEX idx_wallet_members_email ON public.wallet_members(user_email);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_profile_id ON public.transactions(profile_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_budgets_profile_id ON public.budgets(profile_id);
CREATE INDEX idx_budgets_month_year ON public.budgets(month, year);
CREATE INDEX idx_saving_goals_profile_id ON public.saving_goals(profile_id);
CREATE INDEX idx_saving_logs_goal_id ON public.saving_logs(goal_id);

-- 5. CREATE HELPER FUNCTIONS

-- is_profile_owner
CREATE FUNCTION public.is_profile_owner(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_profile_id AND user_id = auth.uid()
    );
END;
$$;

-- is_wallet_owner
CREATE FUNCTION public.is_wallet_owner(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.wallets w
        INNER JOIN public.profiles p ON w.profile_id = p.id
        WHERE w.id = p_wallet_id AND p.user_id = auth.uid()
    );
END;
$$;

-- is_wallet_member_by_email
CREATE FUNCTION public.is_wallet_member_by_email(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    v_email := (auth.jwt() ->> 'email');
    IF v_email IS NULL THEN
        RETURN false;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.wallet_members wm
        WHERE wm.wallet_id = p_wallet_id
          AND wm.user_email = v_email
          AND wm.status = 'active'
    );
END;
$$;

-- can_access_wallet (owner OR member)
CREATE FUNCTION public.can_access_wallet(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.is_wallet_owner(p_wallet_id) OR public.is_wallet_member_by_email(p_wallet_id);
END;
$$;

-- ensure_wallet_owner (bypass RLS to add owner to wallet_members)
CREATE FUNCTION public.ensure_wallet_owner(
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
    IF NOT EXISTS (
        SELECT 1 FROM public.wallet_members
        WHERE wallet_id = p_wallet_id AND user_email = p_owner_email
    ) THEN
        INSERT INTO public.wallet_members (wallet_id, user_email, role, status, created_at, updated_at)
        VALUES (p_wallet_id, p_owner_email, 'owner', 'active', p_timestamp, p_timestamp);
    END IF;
END;
$$;

-- handle_new_user (auto create profile)
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = NEW.id
    ) THEN
        INSERT INTO public.profiles (user_id, name)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. ENABLE RLS & CREATE POLICIES

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_own_profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- WALLETS
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_wallets" ON public.wallets FOR SELECT USING (public.can_access_wallet(id) = true);
CREATE POLICY "insert_wallets" ON public.wallets FOR INSERT WITH CHECK (public.is_profile_owner(profile_id) = true);
CREATE POLICY "update_wallets" ON public.wallets FOR UPDATE USING (public.can_access_wallet(id) = true);
CREATE POLICY "delete_wallets" ON public.wallets FOR DELETE USING (public.is_wallet_owner(id) = true);

-- WALLET_MEMBERS
ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_wallet_members" ON public.wallet_members FOR SELECT USING (public.can_access_wallet(wallet_id) = true);
CREATE POLICY "insert_wallet_members" ON public.wallet_members FOR INSERT WITH CHECK (
    public.is_wallet_owner(wallet_id) = true OR
    (EXISTS (
        SELECT 1 FROM public.wallet_members 
        WHERE wallet_id = wallet_members.wallet_id 
          AND user_email = (auth.jwt() ->> 'email')
          AND status = 'active' 
          AND role IN ('owner', 'editor')
    ))
);
CREATE POLICY "update_wallet_members" ON public.wallet_members FOR UPDATE USING (public.is_wallet_owner(wallet_id) = true);
CREATE POLICY "delete_wallet_members" ON public.wallet_members FOR DELETE USING (public.is_wallet_owner(wallet_id) = true);

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_transactions" ON public.transactions FOR SELECT USING (public.can_access_wallet(wallet_id) = true);
CREATE POLICY "insert_transactions" ON public.transactions FOR INSERT WITH CHECK (public.can_access_wallet(wallet_id) = true);
CREATE POLICY "update_transactions" ON public.transactions FOR UPDATE USING (public.can_access_wallet(wallet_id) = true);
CREATE POLICY "delete_transactions" ON public.transactions FOR DELETE USING (public.can_access_wallet(wallet_id) = true);

-- BUDGETS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_budgets" ON public.budgets FOR SELECT USING (public.is_profile_owner(profile_id) = true);
CREATE POLICY "insert_budgets" ON public.budgets FOR INSERT WITH CHECK (public.is_profile_owner(profile_id) = true);
CREATE POLICY "update_budgets" ON public.budgets FOR UPDATE USING (public.is_profile_owner(profile_id) = true);
CREATE POLICY "delete_budgets" ON public.budgets FOR DELETE USING (public.is_profile_owner(profile_id) = true);

-- SAVING_GOALS
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_saving_goals" ON public.saving_goals FOR SELECT USING (public.is_profile_owner(profile_id) = true);
CREATE POLICY "insert_saving_goals" ON public.saving_goals FOR INSERT WITH CHECK (public.is_profile_owner(profile_id) = true);
CREATE POLICY "update_saving_goals" ON public.saving_goals FOR UPDATE USING (public.is_profile_owner(profile_id) = true);
CREATE POLICY "delete_saving_goals" ON public.saving_goals FOR DELETE USING (public.is_profile_owner(profile_id) = true);

-- SAVING_LOGS
ALTER TABLE public.saving_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_saving_logs" ON public.saving_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.saving_goals sg
        WHERE sg.id = saving_logs.goal_id
          AND sg.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "insert_saving_logs" ON public.saving_logs FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.saving_goals sg
        WHERE sg.id = saving_logs.goal_id
          AND sg.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "update_saving_logs" ON public.saving_logs FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.saving_goals sg
        WHERE sg.id = saving_logs.goal_id
          AND sg.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);
CREATE POLICY "delete_saving_logs" ON public.saving_logs FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.saving_goals sg
        WHERE sg.id = saving_logs.goal_id
          AND sg.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
);

-- 7. GRANT PERMISSIONS
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
GRANT EXECUTE ON FUNCTION public.ensure_wallet_owner(uuid, text, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon, authenticated;

-- 8. VERIFICATION
DO $$
DECLARE
    tbl_count integer;
    func_count integer;
    pol_count integer;
BEGIN
    SELECT COUNT(*) INTO tbl_count FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO func_count FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    SELECT COUNT(*) INTO pol_count FROM pg_policies WHERE schemaname = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TABLES: %', tbl_count;
    RAISE NOTICE 'FUNCTIONS: %', func_count;
    RAISE NOTICE 'POLICIES: %', pol_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUCCESS: SUPABASE RESET COMPLETE!';
    RAISE NOTICE '========================================';
END $$;
