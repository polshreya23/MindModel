-- ==============================================================================
-- MODELMIND: AI-POWERED KNOWLEDGE GRAPH & MIND MAP GENERATOR
-- Anonymous / Public Persistent History Schema (No Authentication Required)
-- ==============================================================================

create extension if not exists "pgcrypto";

-- ==============================================================================
-- 1. ANALYSIS HISTORY TABLE
-- Stores full session snapshot of knowledge graphs, mind maps, AI summaries,
-- PowerPoint slide decks (mindmap_data->'presentation'), and C++ DSA results.
-- Grouped by anonymous client workspace_id without user login.
-- ==============================================================================
create table if not exists public.analysis_history (
  id uuid default gen_random_uuid() primary key,
  workspace_id text not null default 'default-workspace',
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

-- Enable Row Level Security (RLS) with anonymous/public access policies
alter table public.analysis_history enable row level security;

drop policy if exists "Public anon select history" on public.analysis_history;
create policy "Public anon select history"
  on public.analysis_history for select
  to anon, authenticated
  using (true);

drop policy if exists "Public anon insert history" on public.analysis_history;
create policy "Public anon insert history"
  on public.analysis_history for insert
  to anon, authenticated
  with check (workspace_id is not null and length(workspace_id) > 0);

drop policy if exists "Public anon update history" on public.analysis_history;
create policy "Public anon update history"
  on public.analysis_history for update
  to anon, authenticated
  using (true);

drop policy if exists "Public anon delete history" on public.analysis_history;
create policy "Public anon delete history"
  on public.analysis_history for delete
  to anon, authenticated
  using (true);

-- ==============================================================================
-- 2. PERFORMANCE & SEARCH INDEXES
-- ==============================================================================
create index if not exists idx_analysis_history_workspace_id on public.analysis_history(workspace_id);
create index if not exists idx_analysis_history_created_at on public.analysis_history(created_at desc);
create index if not exists idx_analysis_history_favorite on public.analysis_history(workspace_id, is_favorite);
create index if not exists idx_analysis_history_title on public.analysis_history(workspace_id, title);
