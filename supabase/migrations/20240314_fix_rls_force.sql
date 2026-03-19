-- ==============================================================================
-- FIX RLS PERMISSIONS FOR JOINING WALLETS (FORCE UPDATE - V3 - NO DROP FUNCTION)
-- ==============================================================================

-- 1. Drop ALL existing policies on wallet_members to ensure a clean slate
-- We do this because the "INSERT" policy was likely missing or incorrect.
DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can select wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can update wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can delete wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can manage wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can join wallets" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can view wallet members" ON public.wallet_members;

-- 2. Update the helper function in-place (Keep parameter name 'wallet_id' to avoid dropping dependencies)
-- We add case-insensitive email checks here.
CREATE OR REPLACE FUNCTION public.is_wallet_member(wallet_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_email text;
    has_access boolean;
BEGIN
    -- Get current user email from auth.jwt()
    v_user_email := lower(auth.jwt() ->> 'email');
    
    -- Check if there's a membership record for this user and wallet
    -- Use $1 to refer to the wallet_id parameter safely
    SELECT EXISTS (
        SELECT 1 FROM public.wallet_members wm 
        WHERE wm.wallet_id = $1 
        AND lower(wm.user_email) = v_user_email
    ) INTO has_access;
    
    -- If not found as member, check if they are the OWNER of the wallet (via profiles)
    IF NOT has_access THEN
        SELECT EXISTS (
            SELECT 1 FROM public.wallets w
            JOIN public.profiles p ON w.profile_id = p.id
            WHERE w.id = $1 
            AND p.user_id = auth.uid()
        ) INTO has_access;
    END IF;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate Policies for wallet_members

-- A. INSERT Policy: 
-- Allow a user to insert a row ONLY if the 'user_email' column matches their own authenticated email.
-- This allows "Joining" a wallet.
CREATE POLICY "Users can join wallets"
ON public.wallet_members
FOR INSERT
WITH CHECK (
  lower(auth.jwt() ->> 'email') = lower(user_email)
);

-- B. SELECT Policy:
-- Allow viewing if member OR if it's their own row
CREATE POLICY "Users can view wallet members"
ON public.wallet_members
FOR SELECT
USING (
  public.is_wallet_member(wallet_id) 
  OR 
  lower(auth.jwt() ->> 'email') = lower(user_email)
);

-- C. UPDATE Policy:
-- Allow members to update rows in their wallet
CREATE POLICY "Users can update wallet members"
ON public.wallet_members
FOR UPDATE
USING (
  public.is_wallet_member(wallet_id)
);

-- D. DELETE Policy:
-- Allow users to remove themselves or others if they are members
CREATE POLICY "Users can delete wallet members"
ON public.wallet_members
FOR DELETE
USING (
  public.is_wallet_member(wallet_id)
  OR
  lower(auth.jwt() ->> 'email') = lower(user_email)
);

-- 4. Ensure RLS is enabled
ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;
