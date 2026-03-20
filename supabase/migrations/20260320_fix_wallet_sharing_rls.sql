-- =============================================================================
-- Fix RLS Policies for Wallet Sharing
-- Migration: 20260320_fix_wallet_sharing_rls
-- Purpose: Memperbaiki RLS policies untuk wallet_members agar wallet sharing berfungsi
-- Error yang diatasi: 42501 - new row violates row-level security policy
-- =============================================================================

-- 1. Pastikan fungsi is_wallet_member_exists (cek membership)
CREATE OR REPLACE FUNCTION public.is_wallet_member_exists(p_wallet_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_email text;
    has_access boolean;
BEGIN
    v_user_email := lower(auth.jwt() ->> 'email');

    -- Cek apakah user adalah member aktif
    SELECT EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = $1
          AND lower(wm.user_email) = v_user_email
          AND wm.status IN ('active', 'pending')
    ) INTO has_access;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Pastikan fungsi is_wallet_owner_profile (cek ownership via profile)
CREATE OR REPLACE FUNCTION public.is_wallet_owner_profile(p_wallet_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.wallets w
        INNER JOIN public.profiles p ON w.profile_id = p.id
        WHERE w.id = p_wallet_id AND p.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop semua policies lama untuk wallet_members
DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can view wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can update wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can delete wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "view_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "insert_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "update_wallet_members" ON public.wallet_members;
DROP POLICY IF EXISTS "delete_wallet_members" ON public.wallet_members;

-- 4. Drop policies lama untuk wallets
DROP POLICY IF EXISTS "view_wallets" ON public.wallets;
DROP POLICY IF EXISTS "insert_wallets" ON public.wallets;
DROP POLICY IF EXISTS "update_wallets" ON public.wallets;
DROP POLICY IF EXISTS "delete_wallets" ON public.wallets;

-- 5. Drop policies lama untuk transactions
DROP POLICY IF EXISTS "view_transactions" ON public.transactions;
DROP POLICY IF EXISTS "insert_transactions" ON public.transactions;
DROP POLICY IF EXISTS "update_transactions" ON public.transactions;
DROP POLICY IF EXISTS "delete_transactions" ON public.transactions;

-- =============================================================================
-- BUAT POLICIES BARU - WALLETS
-- =============================================================================

-- SELECT: User bisa lihat wallet jika owner ATAU member
CREATE POLICY "view_wallets_fixed"
ON public.wallets
FOR SELECT
USING (
    public.is_wallet_owner_profile(id)
    OR public.is_wallet_member_exists(id)
);

-- INSERT: User bisa buat wallet jika punya profile
CREATE POLICY "insert_wallets_fixed"
ON public.wallets
FOR INSERT
WITH CHECK (
    profile_id IN (
        SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
);

-- UPDATE: User bisa update jika owner ATAU member
CREATE POLICY "update_wallets_fixed"
ON public.wallets
FOR UPDATE
USING (
    public.is_wallet_owner_profile(id)
    OR public.is_wallet_member_exists(id)
);

-- DELETE: Hanya owner yang bisa delete
CREATE POLICY "delete_wallets_fixed"
ON public.wallets
FOR DELETE
USING (public.is_wallet_owner_profile(id));

-- =============================================================================
-- BUAT POLICIES BARU - WALLET_MEMBERS
-- =============================================================================

-- SELECT: User bisa lihat member jika owner ATAU member
CREATE POLICY "view_wallet_members_fixed"
ON public.wallet_members
FOR SELECT
USING (
    public.is_wallet_member_exists(wallet_id)
    OR public.is_wallet_owner_profile(wallet_id)
);

-- INSERT: User bisa invite jika:
--   - Adalah owner wallet (via profile)
--   - ATAU adakah wallet (minimal member aktif)
--   - ATAU email yang diinvite sama dengan user yang invite (self-invite)
CREATE POLICY "insert_wallet_members_fixed"
ON public.wallet_members
FOR INSERT
WITH CHECK (
    -- Jika user adalah owner atau member aktif
    public.is_wallet_owner_profile(wallet_id)
    OR (
        -- Atau jika email yang diinvite SAMA dengan user yang invite
        lower(user_email) = lower((auth.jwt() ->> 'email'))
    )
    OR (
        -- Atau jika ada di wallet_members sebagai member aktif
        EXISTS (
            SELECT 1 FROM public.wallet_members wm
            WHERE wm.wallet_id = wallet_members.wallet_id
              AND lower(wm.user_email) = lower((auth.jwt() ->> 'email'))
              AND wm.status = 'active'
              AND wm.role IN ('owner', 'editor')
        )
    )
);

-- UPDATE: User bisa update jika owner
CREATE POLICY "update_wallet_members_fixed"
ON public.wallet_members
FOR UPDATE
USING (
    public.is_wallet_owner_profile(wallet_id)
    OR (
        -- User bisa update status membership mereka sendiri
        lower(user_email) = lower((auth.jwt() ->> 'email'))
    )
);

-- DELETE: User bisa hapus jika owner
CREATE POLICY "delete_wallet_members_fixed"
ON public.wallet_members
FOR DELETE
USING (public.is_wallet_owner_profile(wallet_id));

-- =============================================================================
-- BUAT POLICIES BARU - TRANSACTIONS
-- =============================================================================

-- SELECT: User bisa lihat transaksi jika wallet accessible
CREATE POLICY "view_transactions_fixed"
ON public.transactions
FOR SELECT
USING (
    public.is_wallet_owner_profile(wallet_id)
    OR public.is_wallet_member_exists(wallet_id)
);

-- INSERT: User bisa insert transaksi jika wallet accessible
CREATE POLICY "insert_transactions_fixed"
ON public.transactions
FOR INSERT
WITH CHECK (
    public.is_wallet_owner_profile(wallet_id)
    OR public.is_wallet_member_exists(wallet_id)
);

-- UPDATE: User bisa update transaksi jika wallet accessible
CREATE POLICY "update_transactions_fixed"
ON public.transactions
FOR UPDATE
USING (
    public.is_wallet_owner_profile(wallet_id)
    OR public.is_wallet_member_exists(wallet_id)
);

-- DELETE: User bisa hapus transaksi jika wallet accessible
CREATE POLICY "delete_transactions_fixed"
ON public.transactions
FOR DELETE
USING (
    public.is_wallet_owner_profile(wallet_id)
    OR public.is_wallet_member_exists(wallet_id)
);

-- =============================================================================
-- VERIFIKASI
-- =============================================================================

DO $$
DECLARE
    policy_count integer;
BEGIN
    -- Hitung policies yang baru dibuat
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname LIKE '%_fixed';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Policies Fix Complete!';
    RAISE NOTICE 'Policies created: %', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fungsi yang dibuat/diperbarui:';
    RAISE NOTICE '  - is_wallet_member_exists(uuid)';
    RAISE NOTICE '  - is_wallet_owner_profile(uuid)';
    RAISE NOTICE '========================================';
END $$;
