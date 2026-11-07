-- ==============================================================================
-- MODELMIND: AI-POWERED KNOWLEDGE GRAPH & MIND MAP GENERATOR
-- Supabase PostgreSQL Database Schema & Row Level Security (RLS) Configuration
-- ==============================================================================

-- 0. Ensure pgcrypto extension is available for UUID generation
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. PROFILES TABLE
-- Stores scholar user account metadata tied directly to auth.users
-- ==============================================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  institution text default 'Academic Scholar',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Profiles RLS Policies:
-- Users can only view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can only insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: Automatically populate public.profiles on auth.users insert
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.email, '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
      updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 2. ANALYSIS HISTORY TABLE
-- Stores full session snapshot of knowledge graphs, mind maps, AI summaries,
-- and C++ Data Structure algorithmic results.
-- ==============================================================================
create table if not exists public.analysis_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  input_text text,
  pdf_filename text,
  graph_data jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  mindmap_data jsonb default '{}'::jsonb,
  summary jsonb default '{}'::jsonb,
  concepts jsonb default '[]'::jsonb,
  algorithm_results jsonb default '{}'::jsonb,
  is_favorite boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS)
alter table public.analysis_history enable row level security;

-- Analysis History RLS Policies:
-- Strictly enforce that users can only select, insert, update, or delete their own records
create policy "Users can select own history"
  on public.analysis_history for select
  using (auth.uid() = user_id);

create policy "Users can insert own history"
  on public.analysis_history for insert
  with check (auth.uid() = user_id);

create policy "Users can update own history"
  on public.analysis_history for update
  using (auth.uid() = user_id);

create policy "Users can delete own history"
  on public.analysis_history for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 3. FAVORITES JOIN TABLE
-- Stores relational bookmarks linking a user to their favorited analysis history
-- ==============================================================================
create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  history_id uuid references public.analysis_history(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, history_id)
);

-- Enable Row Level Security (RLS)
alter table public.favorites enable row level security;

-- Favorites RLS Policies:
create policy "Users can select own favorites"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- 4. PERFORMANCE & SEARCH INDEXES
-- ==============================================================================
create index if not exists idx_analysis_history_user_id on public.analysis_history(user_id);
create index if not exists idx_analysis_history_created_at on public.analysis_history(created_at desc);
create index if not exists idx_analysis_history_favorite on public.analysis_history(user_id, is_favorite);
create index if not exists idx_analysis_history_title on public.analysis_history(user_id, title);
create index if not exists idx_favorites_user_history on public.favorites(user_id, history_id);

-- ==============================================================================
-- Setup Complete!
-- ==============================================================================
