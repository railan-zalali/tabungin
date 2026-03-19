-- =============================================================================
-- Finalize wallet sharing: preview RPC, lowercased membership, and unique invite
-- =============================================================================

-- Normalize existing emails before enforcing uniqueness.
UPDATE public.wallet_members
SET user_email = lower(user_email)
WHERE user_email <> lower(user_email);

-- Remove duplicate memberships while keeping the most useful row.
WITH ranked_members AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY wallet_id, lower(user_email)
      ORDER BY
        (status = 'active') DESC,
        updated_at DESC,
        created_at DESC,
        id DESC
    ) AS rn
  FROM public.wallet_members
)
DELETE FROM public.wallet_members
WHERE id IN (
  SELECT id
  FROM ranked_members
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_members_wallet_email_unique_idx
ON public.wallet_members (wallet_id, lower(user_email));

CREATE OR REPLACE FUNCTION public.is_wallet_member(wallet_id uuid)
RETURNS boolean AS $$
DECLARE
    v_user_email text;
    has_access boolean;
BEGIN
    v_user_email := lower(auth.jwt() ->> 'email');

    SELECT EXISTS (
        SELECT 1
        FROM public.wallet_members wm
        WHERE wm.wallet_id = $1
          AND lower(wm.user_email) = v_user_email
    ) INTO has_access;

    IF NOT has_access THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.wallets w
            JOIN public.profiles p ON w.profile_id = p.id
            WHERE w.id = $1
              AND p.user_id = auth.uid()
        ) INTO has_access;
    END IF;

    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.get_wallet_preview(uuid);

CREATE OR REPLACE FUNCTION public.get_wallet_preview(p_wallet_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name, w.type, w.color
  FROM public.wallets w
  WHERE w.id = p_wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_wallet_preview(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can join wallets" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can select wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can view wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can update wallet members" ON public.wallet_members;
DROP POLICY IF EXISTS "Users can delete wallet members" ON public.wallet_members;

CREATE POLICY "Users can insert wallet members"
ON public.wallet_members
FOR INSERT
WITH CHECK (
  public.is_wallet_member(wallet_id)
  OR lower(auth.jwt() ->> 'email') = lower(user_email)
);

CREATE POLICY "Users can view wallet members"
ON public.wallet_members
FOR SELECT
USING (
  public.is_wallet_member(wallet_id)
  OR lower(auth.jwt() ->> 'email') = lower(user_email)
);

CREATE POLICY "Users can update wallet members"
ON public.wallet_members
FOR UPDATE
USING (
  public.is_wallet_member(wallet_id)
  OR lower(auth.jwt() ->> 'email') = lower(user_email)
)
WITH CHECK (
  public.is_wallet_member(wallet_id)
  OR lower(auth.jwt() ->> 'email') = lower(user_email)
);

CREATE POLICY "Users can delete wallet members"
ON public.wallet_members
FOR DELETE
USING (
  public.is_wallet_member(wallet_id)
  OR lower(auth.jwt() ->> 'email') = lower(user_email)
);
