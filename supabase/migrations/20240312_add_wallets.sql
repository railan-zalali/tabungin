
-- Migration to Version 5: Support Multi-Wallets (Sub-Accounts)

-- 1. Create Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general', -- general, bank, e-wallet, cash
    color TEXT NOT NULL DEFAULT '#1DB954',
    balance NUMERIC NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    sync_status TEXT DEFAULT 'synced'
);

-- 2. Add wallet_id column to existing tables
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
ALTER TABLE public.saving_goals ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL;

-- 3. Enable RLS for wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for wallets
CREATE POLICY "Users can view their own wallets" 
ON public.wallets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" 
ON public.wallets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" 
ON public.wallets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own wallets" 
ON public.wallets FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON public.transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_saving_goals_wallet ON public.saving_goals(wallet_id);
CREATE INDEX IF NOT EXISTS idx_budgets_wallet ON public.budgets(wallet_id);
