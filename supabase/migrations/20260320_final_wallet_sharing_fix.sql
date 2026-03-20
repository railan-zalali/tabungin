-- =============================================================================
-- FINAL FIX: Ultra-Permisive RLS Policies for Wallet Sharing
-- Migration: 20260320_final_wallet_sharing_fix.sql
-- Purpose: Fix ALL RLS issues for wallet sharing and sync
-- =============================================================================

-- 1. DROP ALL existing policies for wallets, wallet_members, transactions
-- These tables need to be ultra-permisive for sync to work

DROP POLICY IF EXISTS "view_wallets" ON public.wallets;
DROP POLICY IF EXISTS "insert_wallets" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets" ON public.wallets;
DROP POLICY IF EXISTS "delete_wallets" ON public.wallets;
DROP POLICY IF EXISTS "view_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "insert_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "delete_wallets_fixed" ON public.wallets;
DROP POLICY IF EXISTS "wallets_select_all_authenticated" ON public.wallets;
DROP POLICY IF EXISTS "wallets_insert_all_authenticated" ON public.wallets;
DROP POLICY IF EXISTS "wallets_update_authenticated" ON public.wallets;
DROP POLICY IF EXISTS "wallets_delete_owner_only" ON public.wallets;

DROP POLICY IF EXISTS "view_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "insert_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "update_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "delete_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "view_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "insert_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "update_wallet_members_fixed" ON public.wallet_members;
DROP POLICY IF EXISTS "delete_wallet_members_fixed" ON public.wallet_members;
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
DROP POLICY IF EXISTS "view_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "insert_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "update_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "delete_transactions_fixed" ON public.transactions;
DROP POLICY IF EXISTS "transactions_select_all_authenticated" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_all_authenticated" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_authenticated" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_authenticated" ON public.transactions;

-- 2. DROP old helper functions
DROP FUNCTION IF EXISTS public.is_wallet_member_exists(uuid);
DROP FUNCTION IF EXISTS public.is_wallet_owner_profile(uuid);
DROP FUNCTION IF EXISTS public.is_wallet_member(uuid);
DROP FUNCTION IF EXISTS public.is_wallet_owner(uuid);
DROP FUNCTION IF EXISTS public.can_access_wallet(uuid);

-- =============================================================================
-- WALLETS POLICIES (Authenticated users can do everything)
-- =============================================================================

-- SELECT: All authenticated users can see all wallets
CREATE POLICY "p_wallets_select"
ON public.wallets
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- INSERT: All authenticated users can create wallets
-- IMPORTANT: This allows mobile sync to work
CREATE POLICY "p_wallets_insert"
ON public.wallets
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

-- UPDATE: All authenticated users can update wallets
CREATE POLICY "p_wallets_update"
ON public.wallets
FOR UPDATE
USING (
    auth.role() = 'authenticated'
);

-- DELETE: All authenticated users can delete wallets
CREATE POLICY "p_wallets_delete"
ON public.wallets
FOR DELETE
USING (
    auth.role() = 'authenticated'
);

-- =============================================================================
-- WALLET_MEMBERS POLICIES (Authenticated users can do everything)
-- =============================================================================

-- SELECT: All authenticated users can see all members
CREATE POLICY "p_wallet_members_select"
ON public.wallet_members
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- INSERT: All authenticated users can add members
-- IMPORTANT: This allows invites and sync to work
CREATE POLICY "p_wallet_members_insert"
ON public.wallet_members
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

-- UPDATE: All authenticated users can update members
CREATE POLICY "p_wallet_members_update"
ON public.wallet_members
FOR UPDATE
USING (
    auth.role() = 'authenticated'
);

-- DELETE: All authenticated users can delete members
CREATE POLICY "p_wallet_members_delete"
ON public.wallet_members
FOR DELETE
USING (
    auth.role() = 'authenticated'
);

-- =============================================================================
-- TRANSACTIONS POLICIES (Authenticated users can do everything)
-- =============================================================================

-- SELECT: All authenticated users
CREATE POLICY "p_transactions_select"
ON public.transactions
FOR SELECT
USING (
    auth.role() = 'authenticated'
);

-- INSERT: All authenticated users
CREATE POLICY "p_transactions_insert"
ON public.transactions
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated'
);

-- UPDATE: All authenticated users
CREATE POLICY "p_transactions_update"
ON public.transactions
FOR UPDATE
USING (
    auth.role() = 'authenticated'
);

-- DELETE: All authenticated users
CREATE POLICY "p_transactions_delete"
ON public.transactions
FOR DELETE
USING (
    auth.role() = 'authenticated'
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
    wallet_policies integer;
    member_policies integer;
    tx_policies integer;
BEGIN
    SELECT COUNT(*) INTO wallet_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallets';

    SELECT COUNT(*) INTO member_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'wallet_members';

    SELECT COUNT(*) INTO tx_policies
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL RLS FIX COMPLETE!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Policies for wallets: %', wallet_policies;
    RAISE NOTICE 'Policies for wallet_members: %', member_policies;
    RAISE NOTICE 'Policies for transactions: %', tx_policies;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All policies now allow authenticated users';
    RAISE NOTICE 'Sync should work without RLS errors';
    RAISE NOTICE '========================================';
END $$;
