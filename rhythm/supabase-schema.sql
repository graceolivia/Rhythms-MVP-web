-- ============================================
-- RHYTHM APP DATABASE SCHEMA
-- Run this in your Supabase SQL Editor to set up the database
-- ============================================

-- ============================================
-- CHILDREN
-- ============================================
create table children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  birthdate date,
  is_napping_age boolean default true,
  color text default 'lavender',
  care_status text default 'home',
  bedtime text,
  wake_time text,
  created_at timestamptz default now()
);

alter table children enable row level security;

create policy "Users can CRUD their own children"
  on children for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- TASKS (templates)
-- ============================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text default 'standard',
  title text not null,
  tier text not null,
  scheduled_time text,
  duration integer,
  recurrence text default 'daily',
  days_of_week integer[],
  nap_context text,
  care_context text,
  best_when text[],
  is_active boolean default true,
  category text,
  child_id uuid references children(id) on delete set null,
  child_task_type text,
  is_informational boolean default false,
  created_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "Users can CRUD their own tasks"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- TASK INSTANCES (daily completions)
-- ============================================
create table task_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references tasks(id) on delete cascade not null,
  date date not null,
  status text default 'pending',
  completed_at timestamptz,
  created_at timestamptz default now(),

  unique(task_id, date)
);

alter table task_instances enable row level security;

create policy "Users can CRUD their own task instances"
  on task_instances for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- NAP SCHEDULES
-- ============================================
create table nap_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  child_id uuid references children(id) on delete cascade not null,
  nap_number integer default 1,
  typical_start text,
  typical_end text,
  created_at timestamptz default now()
);

alter table nap_schedules enable row level security;

create policy "Users can CRUD their own nap schedules"
  on nap_schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- NAP LOGS (actual sleep events)
-- ============================================
create table nap_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  child_id uuid references children(id) on delete cascade not null,
  date date not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  sleep_type text default 'nap',
  created_at timestamptz default now()
);

alter table nap_logs enable row level security;

create policy "Users can CRUD their own nap logs"
  on nap_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- AWAY LOGS (childcare/out of house)
-- ============================================
create table away_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  child_id uuid references children(id) on delete cascade not null,
  date date not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  schedule_name text,
  created_at timestamptz default now()
);

alter table away_logs enable row level security;

create policy "Users can CRUD their own away logs"
  on away_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- CARE BLOCKS (recurring childcare schedules)
-- ============================================
create table care_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  child_ids uuid[] not null,
  name text not null,
  block_type text default 'childcare',
  recurrence text,
  days_of_week integer[],
  start_time text,
  end_time text,
  travel_time_before integer,
  travel_time_after integer,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table care_blocks enable row level security;

create policy "Users can CRUD their own care blocks"
  on care_blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- FLOWERS (earned rewards)
-- ============================================
create table flowers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  earned_date date not null,
  challenge_id text,
  created_at timestamptz default now()
);

alter table flowers enable row level security;

create policy "Users can CRUD their own flowers"
  on flowers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- PLACED FLOWERS (garden grid positions)
-- ============================================
create table placed_flowers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  flower_id uuid references flowers(id) on delete cascade not null,
  col integer not null,
  row integer not null,
  placed_at timestamptz default now()
);

alter table placed_flowers enable row level security;

create policy "Users can CRUD their own placed flowers"
  on placed_flowers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
