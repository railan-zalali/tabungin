-- ============================================================
-- RPC: get_wallet_preview
-- Fungsi ini memungkinkan user (yang belum jadi member) untuk
-- melihat preview wallet sebelum bergabung via QR code.
--
-- PENTING: SECURITY DEFINER agar bisa bypass RLS wallet table.
-- Fungsi ini AMAN karena hanya memreturn nama, tipe, dan warna
-- wallet — tidak ada data sensitif (saldo, transaksi, dll).
--
-- Cara penggunaan:
--   Jalankan SQL ini di Supabase SQL Editor
--   (Dashboard -> SQL Editor -> New Query -> paste & run)
-- ============================================================

-- Drop jika sudah ada (safe to re-run)
DROP FUNCTION IF EXISTS public.get_wallet_preview(uuid);

-- Buat fungsi RPC
CREATE OR REPLACE FUNCTION public.get_wallet_preview(p_wallet_id uuid)
RETURNS TABLE(
  id    uuid,
  name  text,
  type  text,
  color text
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypass RLS — fungsi ini aman karena hanya return info non-sensitif
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.type,
    w.color
  FROM public.wallets w
  WHERE w.id = p_wallet_id;
END;
$$;

-- Berikan izin execute kepada user yang sudah login
GRANT EXECUTE ON FUNCTION public.get_wallet_preview(uuid) TO authenticated;

-- Verifikasi: Fungsi seharusnya muncul di daftar
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'get_wallet_preview';
