-- =============================================================================
-- Fix Foreign Key Constraints for Wallets
-- Migration: 20260320_fix_fk_constraints.sql
-- Purpose: Allow NULL profile_id in wallets table
-- Error: violates foreign key constraint "wallets_profile_id_fkey"
-- =============================================================================

-- 1. Drop foreign key constraint lama
ALTER TABLE public.wallets DROP CONSTRAINT IF EXISTS wallets_profile_id_fkey;

-- 2. Tambah foreign key constraint baru dengan ON DELETE SET NULL
-- Ini mengizinkan profile_id NULL dan akan set NULL jika profile dihapus
ALTER TABLE public.wallets ADD CONSTRAINT wallets_profile_id_fkey 
    FOREIGN KEY (profile_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- 3. Verifikasi
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'public.wallets'::regclass
      AND conname = 'wallets_profile_id_fkey';

    IF fk_name IS NOT NULL THEN
        RAISE NOTICE 'FK wallets_profile_id_fkey updated successfully!';
        RAISE NOTICE 'Now allows NULL profile_id with ON DELETE SET NULL';
    ELSE
        RAISE WARNING 'FK wallets_profile_id_fkey not found!';
    END IF;
END $$;
