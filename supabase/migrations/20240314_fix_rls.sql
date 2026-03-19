-- ==============================================================================
-- SQL FIX UNTUK ERROR "JOIN WALLET" & RLS
-- Silakan jalankan script ini di SQL Editor Supabase (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Buat Fungsi RPC untuk Preview Wallet (Bypass RLS untuk non-member)
-- Fungsi ini memungkinkan user melihat Nama & Tipe dompet sebelum bergabung.
CREATE OR REPLACE FUNCTION public.get_wallet_preview(p_wallet_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  currency text,
  color text,
  created_at bigint
)
LANGUAGE plpgsql
SECURITY DEFINER -- PENTING: Bypass RLS bawaan tabel
AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.name, w.type, 'IDR'::text as currency, w.color, w.created_at
  FROM public.wallets w
  WHERE w.id = p_wallet_id;
END;
$$;

-- 2. Perbaiki Policy INSERT untuk wallet_members
-- Hapus policy lama yang mungkin terlalu ketat
DROP POLICY IF EXISTS "Users can insert wallet members" ON public.wallet_members;

-- Buat policy baru yang mengizinkan user meng-insert DIRI SENDIRI
CREATE POLICY "Users can join wallets"
ON public.wallet_members
FOR INSERT
WITH CHECK (
  -- User hanya boleh menambahkan emailnya sendiri
  auth.email() = user_email
  OR
  -- Atau jika menggunakan user_id (opsional, tergantung implementasi auth)
  auth.uid() = (select user_id from public.profiles where user_email = wallet_members.user_email limit 1)
);

-- 3. Pastikan Policy SELECT juga aman (opsional, untuk memastikan konsistensi)
DROP POLICY IF EXISTS "Users can select wallet members" ON public.wallet_members;
CREATE POLICY "Users can select wallet members"
ON public.wallet_members
FOR SELECT
USING (
  -- Member bisa melihat member lain di wallet yang sama
  public.is_wallet_member(wallet_id)
  OR
  -- User bisa melihat entry dirinya sendiri (misal status pending)
  user_email = (auth.jwt() ->> 'email')
);

-- Selesai.
