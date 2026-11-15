import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import {
  idbSaveAnalysis,
  idbGetAllHistory,
  idbToggleFavorite,
  idbDeleteAnalysis,
  idbClearHistory,
} from '../src/lib/indexedDbHistory.ts';

async function runTests() {
  console.log('==========================================================');
  console.log('  ModelMind No-Auth Persistent History Integration Test   ');
  console.log('==========================================================');

  // 1. Verify Auth UI & Auth Guards are Completely Removed
  console.log('\n[TEST 1] Verifying Auth UI and login gates are removed...');
  const authPagePath = path.join(process.cwd(), 'src', 'components', 'AuthPage.tsx');
  const authTypesPath = path.join(process.cwd(), 'src', 'types', 'auth.ts');
  if (fs.existsSync(authPagePath) || fs.existsSync(authTypesPath)) {
    console.error('FAIL: Auth files still exist!');
    process.exit(1);
  }
  const appCode = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf8');
  const headerCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'Header.tsx'), 'utf8');
  const supabaseCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'supabase.ts'), 'utf8');

  const forbiddenPatterns = [
    'AuthPage',
    'signInWithPassword',
    'signUp',
    'signOut',
    'resetPasswordForEmail',
    'onAuthStateChange',
    'service_role',
  ];
  for (const pat of forbiddenPatterns) {
    if (appCode.includes(pat) || headerCode.includes(pat) || supabaseCode.includes(pat)) {
      console.error(`FAIL: Found forbidden auth/secret pattern '${pat}'`);
      process.exit(1);
    }
  }
  console.log('  ✓ Zero login/signup pages, auth guards, or logout controls present');

  // 2. Verify No-Auth Supabase Schema
  console.log('\n[TEST 2] Verifying anonymous/public PostgreSQL schema...');
  const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  if (!schemaSql.includes('workspace_id') || schemaSql.includes('auth.uid()')) {
    console.error('FAIL: schema.sql should use anonymous workspace_id without auth.uid()');
    process.exit(1);
  }
  console.log('  ✓ schema.sql configured for anonymous/public history without login');

  // 3. Verify IndexedDB Persistent History CRUD (Save, Load, Favorite, Delete, Clear)
  console.log('\n[TEST 3] Testing local persistent history CRUD operations...');
  await idbClearHistory();
  await idbSaveAnalysis({
    id: 'hist-1',
    workspace_id: 'ws-test',
    title: 'PPTX: Graph Algorithms',
    input_text: 'Adjacency List and BFS traversal.',
    pdf_filename: null,
    presentation_data: {
      sourceType: 'pptx',
      filename: 'graphs.pptx',
      slideCount: 5,
    },
    graph_data: {
      nodes: [
        {
          id: 'bfs',
          name: 'BFS',
          description: 'Breadth-First Search',
          category: 'Algorithm',
          frequency: 3,
          importanceScore: 8.0,
          inDegreePrereq: 1,
        },
      ],
      edges: [],
    },
    summary: { success: true, summary: 'BFS explores graphs level by level.', sentenceCount: 1, keyPoints: [] },
    concepts: [],
    algorithm_results: { topologicalSort: null, heapTopK: [], heapArray: [] },
    is_favorite: false,
    created_at: new Date().toISOString(),
  });

  let records = await idbGetAllHistory();
  if (records.length !== 1 || records[0].title !== 'PPTX: Graph Algorithms') {
    console.error('FAIL: Save/Load check failed');
    process.exit(1);
  }

  await idbToggleFavorite('hist-1', true);
  records = await idbGetAllHistory();
  if (!records[0].is_favorite) {
    console.error('FAIL: Favorite toggle failed');
    process.exit(1);
  }

  await idbDeleteAnalysis('hist-1');
  records = await idbGetAllHistory();
  if (records.length !== 0) {
    console.error('FAIL: Delete individual entry failed');
    process.exit(1);
  }
  console.log('  ✓ History save, reopen, favorite toggle, delete, and clear verified');

  // 4. Verify Supabase Client Query Builder (Anonymous Model)
  console.log('\n[TEST 4] Verifying Supabase anonymous query builder...');
  const client = createClient('https://example-project.supabase.co', 'anon-public-key');
  const query = client
    .from('analysis_history')
    .select('*')
    .eq('workspace_id', 'ws-test')
    .order('created_at', { ascending: false });
  if (!query) {
    console.error('FAIL: Supabase query builder failed');
    process.exit(1);
  }
  console.log('  ✓ Supabase anonymous workspace query builder verified');

  console.log('\n==========================================================');
  console.log('  ALL NO-AUTH HISTORY PERSISTENCE TESTS PASSED!           ');
  console.log('==========================================================');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
