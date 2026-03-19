-- 1. Create PROFILES Table
create table if not exists public.profiles (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  color text,
  created_at bigint not null,
  updated_at bigint not null
);

-- 2. Create WALLETS Table (Ensure it exists)
create table if not exists public.wallets (
  id uuid primary key,
  name text not null,
  type text not null default 'general',
  color text not null default '#1DB954',
  balance numeric not null default 0,
  is_default boolean not null default false,
  created_at bigint not null,
  updated_at bigint,
  profile_id uuid references public.profiles(id) on delete set null
);

-- 3. Create WALLET_MEMBERS Table
create table if not exists public.wallet_members (
  id uuid primary key,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  user_email text not null,
  role text check (role in ('owner', 'editor', 'viewer')) not null default 'editor',
  status text check (status in ('pending', 'active', 'rejected')) not null default 'pending',
  created_at bigint not null,
  updated_at bigint not null
);

-- 4. Enable RLS (Security) on all synchronized tables
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_members enable row level security;

-- Also assume we have transactions, budgets, saving_goals
alter table if exists public.transactions enable row level security;
alter table if exists public.budgets enable row level security;
alter table if exists public.saving_goals enable row level security;

-- 5. Create Policies

-- Profiles: Users can see and manage their own profiles
drop policy if exists "Users can manage own profiles" on public.profiles;
create policy "Users can manage own profiles" on public.profiles
  for all using (auth.uid() = user_id);

-- Helper function to check if a user is a wallet member
create or replace function public.is_wallet_member(wallet_id uuid)
returns boolean as $$
declare
    v_user_email text;
    has_access boolean;
begin
    -- Get current user email from auth.jwt()
    v_user_email := auth.jwt() ->> 'email';
    
    -- Check if there's an active or pending membership, or if user owns the profile linked to the wallet
    select exists (
        select 1 from public.wallet_members wm 
        where wm.wallet_id = $1 and wm.user_email = v_user_email
    ) into has_access;
    
    -- If not a member, check if they own the profile that created it
    if not has_access then
        select exists (
            select 1 from public.wallets w
            join public.profiles p on w.profile_id = p.id
            where w.id = $1 and p.user_id = auth.uid()
        ) into has_access;
    end if;
    return has_access;
end;
$$ language plpgsql security definer;

-- Wallets: Users can see, update, and delete wallets if they are members or profile owners
drop policy if exists "Users can manage shared wallets" on public.wallets;
drop policy if exists "Users can select shared wallets" on public.wallets;
drop policy if exists "Users can insert shared wallets" on public.wallets;
drop policy if exists "Users can update shared wallets" on public.wallets;
drop policy if exists "Users can delete shared wallets" on public.wallets;

create policy "Users can select shared wallets" on public.wallets
  for select using (public.is_wallet_member(id));
  
create policy "Users can insert shared wallets" on public.wallets
  for insert with check (
    profile_id in (select id from public.profiles where user_id = auth.uid())
  );
  
create policy "Users can update shared wallets" on public.wallets
  for update using (public.is_wallet_member(id));
  
create policy "Users can delete shared wallets" on public.wallets
  for delete using (public.is_wallet_member(id));

-- Wallet Members: Users can see and manage members of wallets they belong to
drop policy if exists "Users can manage wallet members" on public.wallet_members;
drop policy if exists "Users can select wallet members" on public.wallet_members;
drop policy if exists "Users can insert wallet members" on public.wallet_members;
drop policy if exists "Users can update wallet members" on public.wallet_members;
drop policy if exists "Users can delete wallet members" on public.wallet_members;

create policy "Users can select wallet members" on public.wallet_members
  for select using (public.is_wallet_member(wallet_id));

create policy "Users can insert wallet members" on public.wallet_members
  for insert with check (
    public.is_wallet_member(wallet_id) OR user_email = (auth.jwt() ->> 'email')
  );

create policy "Users can update wallet members" on public.wallet_members
  for update using (public.is_wallet_member(wallet_id));

create policy "Users can delete wallet members" on public.wallet_members
  for delete using (public.is_wallet_member(wallet_id));

-- Transactions: Users can manage transactions in their shared wallets
drop policy if exists "Users can manage shared transactions" on public.transactions;
create policy "Users can manage shared transactions" on public.transactions
  for all using (public.is_wallet_member(wallet_id));

-- Budgets: Users can manage budgets in their shared wallets
drop policy if exists "Users can manage shared budgets" on public.budgets;
create policy "Users can manage shared budgets" on public.budgets
  for all using (public.is_wallet_member(wallet_id));

-- Saving Goals: Users can manage goals in their shared wallets
drop policy if exists "Users can manage shared saving goals" on public.saving_goals;
create policy "Users can manage shared saving goals" on public.saving_goals
  for all using (public.is_wallet_member(wallet_id));
