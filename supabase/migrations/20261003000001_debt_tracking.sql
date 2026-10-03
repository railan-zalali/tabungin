-- Debt tracking module (roadmap Fase 3 / P2-07)
--
-- Tabel 'debts' dan 'debt_payments' sudah dibuat oleh migrasi SQLite v14 di
-- sisi aplikasi, tetapi belum pernah dibuat di Supabase. Akibatnya setiap
-- siklus sync membuang:
--   PGRST205 Could not find the table 'public.debts' in the schema cache
--   PGRST205 Could not find the table 'public.debt_payments' in the schema cache
--
-- File ini idempotent (CREATE ... IF NOT EXISTS / DROP POLICY IF EXISTS),
-- aman dijalankan berulang.

-- ============================================================================
-- 1. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.debts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('debt', 'receivable')),
  counterparty TEXT NOT NULL,
  counterparty_email TEXT,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  due_date BIGINT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  sync_status TEXT DEFAULT 'synced'
);

CREATE TABLE IF NOT EXISTS public.debt_payments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  note TEXT,
  date BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  sync_status TEXT DEFAULT 'synced'
);

-- ============================================================================
-- 2. INDEXES (pola query utama: daftar per user/status, filter dompet, riwayat)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_status ON public.debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_wallet ON public.debts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_debts_due ON public.debts(due_date);
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON public.debt_payments(debt_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
--
-- Kebacaan: pemilik, pemilik profile, atau anggota dompet yang bersangkutan
-- (utang pada dompet bersama memang ditujukan untuk terlihat anggotanya).
-- Penulisan: hanya pemilik / pemilik profile — anggota dompet bersifat baca saja.
-- ============================================================================

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_debts" ON public.debts;
CREATE POLICY "view_debts" ON public.debts FOR SELECT USING (
  user_id = auth.uid()
  OR public.is_profile_owner(profile_id)
  OR public.can_access_wallet(wallet_id)
);

DROP POLICY IF EXISTS "insert_debts" ON public.debts;
CREATE POLICY "insert_debts" ON public.debts FOR INSERT WITH CHECK (
  user_id = auth.uid()
  OR public.is_profile_owner(profile_id)
);

DROP POLICY IF EXISTS "update_debts" ON public.debts;
CREATE POLICY "update_debts" ON public.debts FOR UPDATE USING (
  user_id = auth.uid()
  OR public.is_profile_owner(profile_id)
);

DROP POLICY IF EXISTS "delete_debts" ON public.debts;
CREATE POLICY "delete_debts" ON public.debts FOR DELETE USING (
  user_id = auth.uid()
  OR public.is_profile_owner(profile_id)
);

ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "view_debt_payments" ON public.debt_payments;
CREATE POLICY "view_debt_payments" ON public.debt_payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.debts d
    WHERE d.id = debt_payments.debt_id
      AND (
        d.user_id = auth.uid()
        OR public.is_profile_owner(d.profile_id)
        OR public.can_access_wallet(d.wallet_id)
      )
  )
);

DROP POLICY IF EXISTS "insert_debt_payments" ON public.debt_payments;
CREATE POLICY "insert_debt_payments" ON public.debt_payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.debts d
    WHERE d.id = debt_payments.debt_id
      AND (d.user_id = auth.uid() OR public.is_profile_owner(d.profile_id))
  )
);

DROP POLICY IF EXISTS "update_debt_payments" ON public.debt_payments;
CREATE POLICY "update_debt_payments" ON public.debt_payments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.debts d
    WHERE d.id = debt_payments.debt_id
      AND (d.user_id = auth.uid() OR public.is_profile_owner(d.profile_id))
  )
);

DROP POLICY IF EXISTS "delete_debt_payments" ON public.debt_payments;
CREATE POLICY "delete_debt_payments" ON public.debt_payments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.debts d
    WHERE d.id = debt_payments.debt_id
      AND (d.user_id = auth.uid() OR public.is_profile_owner(d.profile_id))
  )
);

-- ============================================================================
-- 4. GRANTS (sama dengan tabel lain; akses tetap dibatasi RLS di atas)
-- ============================================================================

GRANT ALL ON public.debts TO anon, authenticated;
GRANT ALL ON public.debt_payments TO anon, authenticated;
