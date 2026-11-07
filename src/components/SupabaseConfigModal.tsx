import React, { useState } from 'react';
import { X, Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { getStoredConfig, saveUserSupabaseConfig, clearUserSupabaseConfig, getSupabase } from '../lib/supabase.ts';

interface SupabaseConfigModalProps {
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getStoredConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestStatus('error');
      setTestMessage('Both Supabase Project URL and Anon Key are required.');
      return;
    }

    const success = saveUserSupabaseConfig(url.trim(), anonKey.trim());
    if (success) {
      setTestStatus('success');
      setTestMessage('Configuration saved and active!');
      onConfigChanged();
    } else {
      setTestStatus('error');
      setTestMessage('Failed to store configuration.');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Connecting to Supabase...');

    const client = getSupabase();
    if (!client) {
      setTestStatus('error');
      setTestMessage('Client not initialized. Please click "Save & Apply" first.');
      return;
    }

    try {
      const { error } = await client.auth.getSession();
      if (error) {
        setTestStatus('error');
        setTestMessage(`Auth ping failed: ${error.message}`);
      } else {
        setTestStatus('success');
        setTestMessage('Successfully connected to Supabase Auth & PostgreSQL service!');
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Connection test failed.');
    }
  };

  const handleClear = () => {
    clearUserSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestStatus('idle');
    setTestMessage('Configuration cleared.');
    onConfigChanged();
  };

  const sqlSchemaSnippet = `-- Run this in your Supabase SQL Editor:
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  created_at timestamptz default now() not null
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

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
alter table public.analysis_history enable row level security;
create policy "Users can select own history" on public.analysis_history for select using (auth.uid() = user_id);
create policy "Users can insert own history" on public.analysis_history for insert with check (auth.uid() = user_id);
create policy "Users can update own history" on public.analysis_history for update using (auth.uid() = user_id);
create policy "Users can delete own history" on public.analysis_history for delete using (auth.uid() = user_id);

create table if not exists public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  history_id uuid references public.analysis_history(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (user_id, history_id)
);
alter table public.favorites enable row level security;
create policy "Users can select own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can insert own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete own favorites" on public.favorites for delete using (auth.uid() = user_id);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#FAF7F2] border border-[#D8C8A8] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8C8A8] bg-[#EFE8DC]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#174A45] flex items-center justify-center text-[#FAF7F2]">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-editorial text-lg font-bold text-[#174A45]">
                Supabase Database &amp; Auth Configuration
              </h2>
              <p className="text-xs text-[#636E6B]">
                Configure real PostgreSQL persistence and secure Row Level Security (RLS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#636E6B] hover:text-[#174A45] hover:bg-[#EFE8DC] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status banner */}
          <div className="p-3.5 rounded-xl border border-[#D8C8A8] bg-white flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#174A45] shrink-0 mt-0.5" />
            <div className="text-xs text-[#252D2B] leading-relaxed">
              <span className="font-semibold text-[#174A45]">Client-Side Secure Key Policy: </span>
              Only use the public <code className="font-mono bg-[#EFE8DC] px-1 py-0.5 rounded text-[#174A45]">anon</code> public key. Never supply or expose the Supabase <code className="font-mono bg-[#FBEBE7] px-1 py-0.5 rounded text-[#8C2A14]">service_role</code> secret. All queries are strictly sandboxed by Row Level Security (RLS).
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#174A45] uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzprojectid.supabase.co"
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8C8A8] rounded-xl text-xs sm:text-sm font-mono text-[#252D2B] focus:outline-none focus:border-[#174A45]"
              />
              <span className="text-[11px] text-[#636E6B] mt-1 block">
                Found in your Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project URL
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#174A45] uppercase tracking-wider mb-1">
                Supabase Anon (Public) Key
              </label>
              <textarea
                required
                rows={3}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#D8C8A8] rounded-xl text-xs font-mono text-[#252D2B] focus:outline-none focus:border-[#174A45]"
              />
              <span className="text-[11px] text-[#636E6B] mt-1 block">
                Found in your Supabase Dashboard &rarr; Project Settings &rarr; API &rarr; Project API Keys &rarr; <code className="font-mono">anon public</code>
              </span>
            </div>

            {testMessage && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testStatus === 'success'
                    ? 'bg-[#EAF3EA] border-[#A9BCA8] text-[#174A45]'
                    : testStatus === 'error'
                    ? 'bg-[#FBEBE7] border-[#E88968]/70 text-[#8C2A14]'
                    : 'bg-[#FFF8EB] border-[#D8C8A8] text-[#8C6D3B]'
                }`}
              >
                {testStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-[#4A7059] shrink-0" />}
                {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-[#E88968] shrink-0" />}
                {testStatus === 'testing' && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                <span>{testMessage}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#174A45] hover:bg-[#123834] text-[#FAF7F2] font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Save &amp; Apply
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-3.5 py-2 bg-[#EFE8DC] hover:bg-[#D8C8A8] text-[#174A45] font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                  Test Connection
                </button>
              </div>

              {currentConfig.isConfigured && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 text-xs text-[#8C2A14] hover:bg-[#FBEBE7] rounded-xl transition cursor-pointer"
                >
                  Disconnect Credentials
                </button>
              )}
            </div>
          </form>

          {/* SQL Setup Helper Section */}
          <div className="pt-4 border-t border-[#D8C8A8]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-editorial text-sm font-bold text-[#174A45]">
                  PostgreSQL Schema &amp; RLS Migration Script
                </h3>
                <p className="text-[11px] text-[#636E6B]">
                  Execute this script once in your Supabase SQL Editor to provision tables &amp; RLS policies.
                </p>
              </div>
              <button
                type="button"
                onClick={copySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D8C8A8] bg-[#FAF7F2] hover:bg-[#EFE8DC] text-xs font-medium text-[#174A45] transition cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4A7059]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#E88968]" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 bg-[#182320] text-[#A9BCA8] rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-[#252D2B]">
              {sqlSchemaSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#D8C8A8] bg-[#EFE8DC]/50 flex items-center justify-between">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#174A45] hover:text-[#E88968] font-medium"
          >
            <span>Open Supabase Dashboard</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#174A45] text-[#FAF7F2] hover:bg-[#123834] cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
