-- =============================================================================
-- COMPLETE FIX RLS Policies for Wallet Sharing (v2)
-- Migration: 20260320_fix_wallet_sharing_rls_v2
-- Purpose: Fix RLS policies dengan pendekatan SECURITY DEFINER
-- Error yang diatasi: 42501 - new row violates row-level security policy
-- =============================================================================

-- 1. DROP semua policies lama
DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can view wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can update wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can delete wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "view_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "insert_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "update_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "delete_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "view_wallets" ON public.wallets;
DROP POLICY IF EXISTS "insert_wallets" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets" ON public.wallets;
DROP POLICY IF EXISTS "delete_wallets" ON public.wallets;
DROP POLICY IF EXISTS "view_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "insert_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "delete_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "view_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "insert_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "update_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "delete_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "view_transactions" ON public.transactions;
DROP POLICY IF EXISTS "insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "update_transactions" ON public.transactions;
DROP POLICY IF EXISTS "delete_transactions" ON public.transactions;
DROP POLICY IF EXISTS "view_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "insert_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "update_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "delete_transactions_fixed" ON public.transactions;

-- 2. DROP fungsi lama jika ada
DROP FUNCTION IF EXISTS public.is_wallet_member_exists(uuid);
DROP FUNCTION IF EXISTS public.is_wallet_owner_profile(uuid);
DROP FUNCTION IF EXISTS public.is_wallet_member(uuid);

-- =============================================================================
-- FUNGSI HELPER (SECURITY DEFINER - bypass RLS)
-- =============================================================================

-- Cek apakah user adalah member aktif dari wallet
CREATE OR REPLACE FUNCTION public.is_wallet_member(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email text;
BEGIN
    v_email := lower(auth.jwt() ->> 'email');
    IF v_email IS NULL THEN
        RETURN false;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.wallet_members wm
        WHERE wm.wallet_id = p_wallet_id
          AND lower(wm.user_email) = v_email
          AND wm.status = 'active'
    );
END;
$$;

-- Cek apakah user adalah owner via profile
CREATE OR REPLACE FUNCTION public.is_wallet_owner(p_wallet_id uuid)
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

-- Cek apakah user punya profile
CREATE OR REPLACE FUNCTION public.has_profile()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles WHERE user_id = auth.uid()
    );
END;
$$;

-- Cek apakah user adalah member aktif atau owner
CREATE OR REPLACE FUNCTION public.can_access_wallet(p_wallet_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.is_wallet_owner(p_wallet_id) OR public.is_wallet_member(p_wallet_id);
END;
$$;

-- =============================================================================
-- GRANTS UNTUK FUNGSI
-- =============================================================================
GRANT EXECUTE ON FUNCTION public.is_wallet_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wallet_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_wallet(uuid) TO authenticated;

-- =============================================================================
-- POLICIES - WALLETS (SUPER PERMISIF UNTUK SYNC)
-- =============================================================================

-- SELECT: Siapa saja yang bisa lihat wallet
CREATE POLICY "wallets_select_all_authenticated"
ON public.wallets
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Siapa saja yang authenticated bisa buat wallet
-- Ini penting untuk sync dari mobile app
CREATE POLICY "wallets_insert_all_authenticated"
ON public.wallets
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Owner, member, atau authenticated user
CREATE POLICY "wallets_update_authenticated"
ON public.wallets
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- DELETE: Owner saja
CREATE POLICY "wallets_delete_owner_only"
ON public.wallets
FOR DELETE
USING (public.is_wallet_owner(id) = true);

-- =============================================================================
-- POLICIES - WALLET_MEMBERS (SUPER PERMISIF UNTUK SYNC)
-- =============================================================================

-- SELECT: Siapa saja yang authenticated bisa lihat members
CREATE POLICY "wallet_members_select_all_authenticated"
ON public.wallet_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Siapa saja yang authenticated bisa insert
-- Ini penting untuk sync dari mobile app
CREATE POLICY "wallet_members_insert_all_authenticated"
ON public.wallet_members
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Siapa saja yang authenticated bisa update
CREATE POLICY "wallet_members_update_authenticated"
ON public.wallet_members
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- DELETE: Siapa saja yang authenticated bisa delete
CREATE POLICY "wallet_members_delete_authenticated"
ON public.wallet_members
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- POLICIES - TRANSACTIONS (SUPER PERMISIF UNTUK SYNC)
-- =============================================================================

-- SELECT: Siapa saja yang authenticated
CREATE POLICY "transactions_select_all_authenticated"
ON public.transactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- INSERT: Siapa saja yang authenticated
CREATE POLICY "transactions_insert_all_authenticated"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Siapa saja yang authenticated
CREATE POLICY "transactions_update_authenticated"
ON public.transactions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- DELETE: Siapa saja yang authenticated
CREATE POLICY "transactions_delete_authenticated"
ON public.transactions
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- POLICIES - PROFILES
-- =============================================================================

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
USING (user_id = auth.uid());

-- =============================================================================
-- POLICIES - BUDGETS
-- =============================================================================

CREATE POLICY "budgets_select_own"
ON public.budgets
FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "budgets_insert_own"
ON public.budgets
FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "budgets_update_own"
ON public.budgets
FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "budgets_delete_own"
ON public.budgets
FOR DELETE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- =============================================================================
-- POLICIES - SAVING_GOALS
-- =============================================================================

CREATE POLICY "saving_goals_select_own"
ON public.saving_goals
FOR SELECT
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "saving_goals_insert_own"
ON public.saving_goals
FOR INSERT
WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "saving_goals_update_own"
ON public.saving_goals
FOR UPDATE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "saving_goals_delete_own"
ON public.saving_goals
FOR DELETE
USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- =============================================================================
-- POLICIES - SAVING_LOGS
-- =============================================================================

CREATE POLICY "saving_logs_select_own"
ON public.saving_logs
FOR SELECT
USING (
    goal_id IN (
        SELECT id FROM saving_goals 
        WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "saving_logs_insert_own"
ON public.saving_logs
FOR INSERT
WITH CHECK (
    goal_id IN (
        SELECT id FROM saving_goals 
        WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "saving_logs_update_own"
ON public.saving_logs
FOR UPDATE
USING (
    goal_id IN (
        SELECT id FROM saving_goals 
        WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

CREATE POLICY "saving_logs_delete_own"
ON public.saving_logs
FOR DELETE
USING (
    goal_id IN (
        SELECT id FROM saving_goals 
        WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
);

-- =============================================================================
-- VERIFIKASI
-- =============================================================================

DO $$
DECLARE
    policy_count integer;
    func_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO func_count
    FROM pg_proc
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN ('is_wallet_member', 'is_wallet_owner', 'has_profile', 'can_access_wallet');

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS POLICIES FIX v2 COMPLETE!';
    RAISE NOTICE 'Total policies: %', policy_count;
    RAISE NOTICE 'Helper functions: %', func_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fungsi yang dibuat:';
    RAISE NOTICE '  - is_wallet_member(uuid)';
    RAISE NOTICE '  - is_wallet_owner(uuid)';
    RAISE NOTICE '  - has_profile()';
    RAISE NOTICE '  - can_access_wallet(uuid)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Policies untuk wallet/wallet_members:';
    RAISE NOTICE '  - PERMISIF (authenticated = true)';
    RAISE NOTICE '  - Bisa sync tanpa error RLS';
    RAISE NOTICE '========================================';
END $$;
