
-- 1. Create Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    date BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    sync_status TEXT DEFAULT 'synced'
);

-- 2. Create Saving Goals Table
CREATE TABLE IF NOT EXISTS public.saving_goals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC NOT NULL DEFAULT 0,
    emoji TEXT DEFAULT '🎯',
    photo_uri TEXT,
    saving_per_period NUMERIC NOT NULL,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    color TEXT DEFAULT '#1DB954',
    start_date BIGINT NOT NULL,
    estimated_date BIGINT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_time TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    sync_status TEXT DEFAULT 'synced'
);

-- 3. Create Saving Logs Table
CREATE TABLE IF NOT EXISTS public.saving_logs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.saving_goals(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    note TEXT,
    date BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    sync_status TEXT DEFAULT 'synced'
);

-- 4. Create Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT,
    sync_status TEXT DEFAULT 'synced',
    UNIQUE(user_id, category, month, year)
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Transactions Policies
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.transactions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" 
ON public.transactions FOR DELETE 
USING (auth.uid() = user_id);

-- Saving Goals Policies
CREATE POLICY "Users can view their own saving goals" 
ON public.saving_goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saving goals" 
ON public.saving_goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saving goals" 
ON public.saving_goals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saving goals" 
ON public.saving_goals FOR DELETE 
USING (auth.uid() = user_id);

-- Saving Logs Policies
CREATE POLICY "Users can view their own saving logs" 
ON public.saving_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saving logs" 
ON public.saving_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saving logs" 
ON public.saving_logs FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saving logs" 
ON public.saving_logs FOR DELETE 
USING (auth.uid() = user_id);

-- Budgets Policies
CREATE POLICY "Users can view their own budgets" 
ON public.budgets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" 
ON public.budgets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" 
ON public.budgets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" 
ON public.budgets FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_saving_goals_user ON public.saving_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_saving_logs_goal ON public.saving_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON public.budgets(user_id, year, month);
