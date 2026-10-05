-- Push notification infra (roadmap Fase 3 / P2-05, task PN-1)
--
-- Masalah yang diperbaiki: hook `usePushNotifications` sudah melakukan
-- `supabase.from('user_devices').upsert(...)` sejak lama, tetapi tabelnya
-- tidak pernah dibuat di SQL mana pun. Akibatnya setiap registrasi token
-- gagal dengan PGRST205 dan error-nya ditelan `catch` — fitur push "terlihat
-- ada" tapi tidak pernah bekerja.
--
-- File ini idempotent (CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS /
-- CREATE OR REPLACE), aman dijalankan berulang.
--
-- Catatan desain: tabel ini SERVER-SIDE ONLY — sengaja TIDAK dimasukkan ke
-- SYNC_TABLES karena token adalah milik perangkat, bukan data yang boleh
-- disinkronkan ke SQLite klien lain.

-- ============================================================================
-- 1. TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- UNIQUE dipakai sebagai target `upsert({ onConflict: 'push_token' })`
  -- dari klien: satu token hanya boleh menunjuk satu baris.
  push_token TEXT NOT NULL UNIQUE,
  device_os TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON public.user_devices(user_id);

-- ============================================================================
-- 2. ROW LEVEL SECURITY
--
-- Token push adalah kredensial pengiriman: pemiliknya hanya boleh
-- membaca/mengubah baris miliknya sendiri. Pencarian lintas-user dilakukan
-- lewat RPC SECURITY DEFINER di bawah, bukan lewat SELECT langsung.
-- ============================================================================

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_user_devices" ON public.user_devices;
CREATE POLICY "view_user_devices" ON public.user_devices
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_user_devices" ON public.user_devices;
CREATE POLICY "insert_user_devices" ON public.user_devices
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_user_devices" ON public.user_devices;
CREATE POLICY "update_user_devices" ON public.user_devices
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_user_devices" ON public.user_devices;
CREATE POLICY "delete_user_devices" ON public.user_devices
  FOR DELETE USING (user_id = auth.uid());

GRANT ALL ON public.user_devices TO anon, authenticated;

-- ============================================================================
-- 3. RPC: email -> token device
--
-- `profiles` tidak menyimpan email (hanya user_id); sumber kebenaran email ada
-- di auth.users yang tidak bisa di-query lewat PostgREST. Edge Function
-- `send-push-notification` memanggil RPC ini dengan service_role.
--
-- SECURITY DEFINER diperlukan untuk membaca auth.users, jadi eksekusi
-- dibatasi hanya ke service_role — user biasa tidak boleh memetakan email
-- siapa pun ke token push-nya.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.devices_for_emails(p_emails TEXT[])
RETURNS TABLE (user_id UUID, push_token TEXT, device_os TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
  SELECT d.user_id, d.push_token, d.device_os
  FROM public.user_devices d
  JOIN auth.users u ON u.id = d.user_id
  WHERE u.email IS NOT NULL
    AND lower(u.email) IN (SELECT lower(e) FROM unnest(p_emails) AS e)
$$;

REVOKE ALL ON FUNCTION public.devices_for_emails(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.devices_for_emails(TEXT[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.devices_for_emails(TEXT[]) TO service_role;
