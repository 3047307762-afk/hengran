create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text default '小衡用户',
  height_cm numeric,
  initial_weight_jin numeric,
  target_weight_jin numeric,
  plan_days integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  time text not null,
  weight_jin numeric not null,
  delta numeric default 0,
  mood text default 'sun',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date text not null,
  time text not null,
  name text not null,
  grams numeric default 0,
  kcal numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.weights enable row level security;
alter table public.foods enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "weights_select_own" on public.weights;
drop policy if exists "weights_insert_own" on public.weights;
drop policy if exists "weights_update_own" on public.weights;
drop policy if exists "weights_delete_own" on public.weights;
drop policy if exists "foods_select_own" on public.foods;
drop policy if exists "foods_insert_own" on public.foods;
drop policy if exists "foods_update_own" on public.foods;
drop policy if exists "foods_delete_own" on public.foods;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "weights_select_own" on public.weights for select using (auth.uid() = user_id);
create policy "weights_insert_own" on public.weights for insert with check (auth.uid() = user_id);
create policy "weights_update_own" on public.weights for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weights_delete_own" on public.weights for delete using (auth.uid() = user_id);

create policy "foods_select_own" on public.foods for select using (auth.uid() = user_id);
create policy "foods_insert_own" on public.foods for insert with check (auth.uid() = user_id);
create policy "foods_update_own" on public.foods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "foods_delete_own" on public.foods for delete using (auth.uid() = user_id);

alter table public.profiles add column if not exists birthday text;
alter table public.profiles add column if not exists gender text default '保密';
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists initial_weight_jin numeric;
