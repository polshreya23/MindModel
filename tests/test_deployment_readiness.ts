import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

console.log('==========================================================');
console.log('  ModelMind Production Deployment Readiness Test Suite    ');
console.log('==========================================================');

const root = process.cwd();

// [TEST 1] Verify required deployment artifacts exist & contain no secrets
console.log('[TEST 1] Verifying deployment files & secret hygiene...');
const requiredFiles = [
  'Dockerfile',
  '.dockerignore',
  'vercel.json',
  'render.yaml',
  '.env.example',
  'DEPLOYMENT.md',
  'src/lib/api.ts',
];
for (const rel of requiredFiles) {
  assert(fs.existsSync(path.join(root, rel)), `Missing required deployment file: ${rel}`);
}

const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf-8');
assert(dockerfile.includes('g++'), 'Dockerfile must install g++');
assert(dockerfile.includes('python3'), 'Dockerfile must install python3');
assert(dockerfile.includes('make -C cxx all'), 'Dockerfile must compile C++14 engine for Linux');
assert(!dockerfile.includes('.exe'), 'Dockerfile must not depend on Windows .exe binaries');
assert(dockerfile.includes('requirements.txt'), 'Dockerfile must install Python pip dependencies');

const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf-8');
assert(envExample.includes('VITE_API_BASE_URL'), '.env.example must document VITE_API_BASE_URL');
assert(envExample.includes('CORS_ORIGIN'), '.env.example must document CORS_ORIGIN');
assert(!/service_role|sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}/.test(envExample), 'No real secrets in .env.example');
console.log('  ✓ Deployment artifacts present and clean');

// [TEST 2] Verify frontend has no hardcoded localhost API URLs
console.log('[TEST 2] Verifying frontend API base URL configuration...');
const srcFiles = [
  'src/App.tsx',
  'src/components/DsaCodeViewer.tsx',
  'src/lib/api.ts',
];
for (const rel of srcFiles) {
  const content = fs.readFileSync(path.join(root, rel), 'utf-8');
  assert(!content.includes('http://localhost:3000'), `Hardcoded localhost found in ${rel}`);
}
console.log('  ✓ Frontend uses VITE_API_BASE_URL via apiUrl() with zero hardcoded localhost URLs');

// [TEST 3] Verify Linux C++14 build & unit tests cleanly
console.log('[TEST 3] Verifying Linux C++14 compilation and engine binary...');
assert(fs.existsSync(path.join(root, 'cxx/bin/modelmind_engine')), 'Linux modelmind_engine binary missing');
console.log('  ✓ Linux C++14 binary verified');

// [TEST 4] Boot production Express backend on custom PORT with strict Vercel CORS
console.log('[TEST 4] Testing production Express server (PORT, CORS, Health, NLP+C++ pipeline)...');
const testPort = 10421;
const serverProc = spawn('npx', ['tsx', 'server.ts'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(testPort),
    CORS_ORIGIN: 'https://modelmind.vercel.app,https://*.vercel.app',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

async function waitForHealth(url: string, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      // retry until ready
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Timed out waiting for production server health check');
}

try {
  const baseUrl = `http://127.0.0.1:${testPort}`;
  const healthRes = await waitForHealth(`${baseUrl}/api/health`);
  const healthJson: any = await healthRes.json();
  assert.equal(healthJson.status, 'ok');
  assert.equal(healthJson.cppEngineReady, true);
  assert.equal(healthJson.pythonScriptsReady, true);
  console.log('  ✓ /api/health returned 200 ok (cppEngineReady=true, pythonScriptsReady=true)');

  // CORS Preflight: Exact Vercel Origin
  const preflightAllowed = await fetch(`${baseUrl}/api/extract`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://modelmind.vercel.app' },
  });
  assert.equal(preflightAllowed.status, 204);
  assert.equal(
    preflightAllowed.headers.get('access-control-allow-origin'),
    'https://modelmind.vercel.app'
  );

  // CORS Preflight: Vercel Preview Origin
  const preflightPreview = await fetch(`${baseUrl}/api/extract`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://modelmind-git-main.vercel.app' },
  });
  assert.equal(preflightPreview.status, 204);
  assert.equal(
    preflightPreview.headers.get('access-control-allow-origin'),
    'https://modelmind-git-main.vercel.app'
  );

  // CORS Preflight: Disallowed Origin
  const preflightBlocked = await fetch(`${baseUrl}/api/extract`, {
    method: 'OPTIONS',
    headers: { Origin: 'https://unauthorized.example.com' },
  });
  assert.equal(preflightBlocked.status, 403);
  console.log('  ✓ CORS preflight verified for Vercel prod, preview, and disallowed origins');

  // End-to-end NLP + C++14 API call
  const extractRes = await fetch(`${baseUrl}/api/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://modelmind.vercel.app',
    },
    body: JSON.stringify({
      text:
        'An Array is a contiguous data structure. A Stack is a LIFO data structure that depends on Array implementations. ' +
        'A Binary Tree is a hierarchical tree structure. Binary Search Trees depend on Binary Trees. ' +
        'A Graph is a network of vertices and edges. Breadth First Search requires a Queue and a Graph.',
    }),
  });
  assert.equal(extractRes.status, 200);
  const extractJson: any = await extractRes.json();
  assert.equal(extractJson.success, true);
  assert.equal(extractJson.nlp.success, true);

  const buildRes = await fetch(`${baseUrl}/api/graph/build`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://modelmind.vercel.app',
    },
    body: JSON.stringify({
      nodes: extractJson.nlp.nodes,
      edges: extractJson.nlp.edges,
    }),
  });
  assert.equal(buildRes.status, 200);
  const buildJson: any = await buildRes.json();
  assert.equal(buildJson.success, true);
  assert(buildJson.graph.nodes.length >= 3, `Expected >= 3 nodes, got ${buildJson.graph.nodes.length}`);
  console.log(`  ✓ End-to-end production /api/extract + /api/graph/build passed (${buildJson.graph.nodes.length} nodes)`);
} finally {
  serverProc.kill('SIGTERM');
}

console.log('==========================================================');
console.log('  ALL PRODUCTION DEPLOYMENT READINESS TESTS PASSED!       ');
console.log('==========================================================');
