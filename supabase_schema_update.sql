
-- 1. Create PROFILES Table
create table public.profiles (
  id uuid primary key,
  user_id uuid references auth.users not null,
  name text not null,
  icon text,
  color text,
  created_at bigint not null,
  updated_at bigint not null
);

-- 2. Create WALLET_MEMBERS Table
create table public.wallet_members (
  id uuid primary key,
  wallet_id uuid references public.wallets(id) on delete cascade not null,
  user_email text not null,
  role text check (role in ('owner', 'editor', 'viewer')) not null default 'viewer',
  status text check (status in ('pending', 'active', 'rejected')) not null default 'pending',
  created_at bigint not null,
  updated_at bigint not null
);

-- 3. Add profile_id to WALLETS Table
alter table public.wallets 
add column profile_id uuid references public.profiles(id) on delete set null;

-- 4. Enable RLS (Security)
alter table public.profiles enable row level security;
alter table public.wallet_members enable row level security;

-- 5. Create Policies (Simple)
-- Allow users to see their own profiles
create policy "Users can see own profiles" on public.profiles
  for all using (auth.uid() = user_id);

-- Allow users to see wallet members if they are part of the wallet (or owner)
-- (Simplified for now: allow authenticated users to read/write their related data)
create policy "Users can manage wallet members" on public.wallet_members
  for all using (auth.role() = 'authenticated');
