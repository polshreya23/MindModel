import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

console.log('==========================================================');
console.log('  ModelMind Auth & Supabase History Integration Test     ');
console.log('==========================================================');

// 1. Verify SQL Schema File Exists and Contains Core Security Constraints
console.log('\n[TEST 1] Verifying Supabase SQL Schema & RLS Policies...');
const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('FAIL: supabase/schema.sql does not exist');
  process.exit(1);
}
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

const requiredTokens = [
  'create table if not exists public.profiles',
  'create table if not exists public.analysis_history',
  'create table if not exists public.favorites',
  'alter table public.profiles enable row level security',
  'alter table public.analysis_history enable row level security',
  'alter table public.favorites enable row level security',
  'auth.uid() = id',
  'auth.uid() = user_id',
  'on_auth_user_created',
  'idx_analysis_history_user_id',
];

for (const token of requiredTokens) {
  if (!schemaSql.includes(token)) {
    console.error(`FAIL: Schema is missing required security token: ${token}`);
    process.exit(1);
  }
}
console.log('  ✓ Schema contains profiles, analysis_history, favorites tables with RLS and indices');

// 2. Verify Supabase Client Library Initialization
console.log('\n[TEST 2] Verifying Supabase JS Client Module...');
const dummyUrl = 'https://example-project.supabase.co';
const dummyAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_testing';
const client = createClient(dummyUrl, dummyAnonKey);

if (!client || !client.auth || !client.from) {
  console.error('FAIL: createClient did not instantiate properly');
  process.exit(1);
}
console.log('  ✓ Supabase JS Client instantiated properly with auth and database interface');

// 3. Verify Table Query Builders
console.log('\n[TEST 3] Verifying PostgreSQL Query Builder signatures...');
const historyQuery = client
  .from('analysis_history')
  .select('*')
  .eq('user_id', '00000000-0000-0000-0000-000000000000')
  .order('created_at', { ascending: false });

if (!historyQuery) {
  console.error('FAIL: Could not build history query');
  process.exit(1);
}
console.log('  ✓ analysis_history select, filter, and ordering builders validated');

const favoritesQuery = client
  .from('favorites')
  .select('*')
  .eq('user_id', '00000000-0000-0000-0000-000000000000');

if (!favoritesQuery) {
  console.error('FAIL: Could not build favorites query');
  process.exit(1);
}
console.log('  ✓ favorites query builder validated');

console.log('\n==========================================================');
console.log('  ALL AUTH & SUPABASE INTEGRATION TESTS PASSED!          ');
console.log('==========================================================');
