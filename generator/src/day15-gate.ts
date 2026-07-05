/*
 * Thraksha — Day 15 EXECUTION gate harness (temporary; not part of the product).
 *
 * GATE 0/2  The full 20-hash matrix under projectType='Web App' stays byte-
 *           identical (the literal bypass). Spring's 4 especially — the frontend
 *           subtraction must be gated on frontend==='None' so Web-App is unchanged.
 * STEP 1    The four already-backend-only stacks (Express/FastAPI/Django/Go):
 *           API-only output == Web-App output EXCEPT the two manifest lines
 *           (projectType, frontend). Vacuous to boot, NOT vacuous to hash.
 * STEP 2    Spring API-only (DemoApp + TeamTracker, Postgres) twice-identical.
 * STEP 3    Static coherence of the Spring API-only shell (no frontend/ folder;
 *           compose has only db+backend; no ./frontend, no :3000; README clean).
 *
 * Run:  node dist/day15-gate.js
 */

import crypto from 'node:crypto';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { ProjectModel } from './core/project-model.js';
import type { GeneratedFile } from './core/plugin.js';

const FROZEN: Record<string, string> = {
  'Spring Boot|PostgreSQL|DemoApp': '010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c',
  'Express|PostgreSQL|DemoApp': 'a437a302cc597ed1809551bdf31fafea569176829db16122b0ea78c68ffd4d65',
  'FastAPI|PostgreSQL|DemoApp': 'dca2254f86c532bb24af06f439b300613a6dc7918346063f704c68f98b1d5843',
  'Django|PostgreSQL|DemoApp': '68601cc5c77e4938c162d04c1c58d976b808421a90c66e5f3fd2f215a63caa18',
  'Go|PostgreSQL|DemoApp': 'd158529a241677905a4be97f14b6a6419de55e95bee999883beb9f661cb4d067',
  'Spring Boot|PostgreSQL|TeamTracker': '9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66',
  'Express|PostgreSQL|TeamTracker': 'dca2b4a7a301df5e47ead65dc9f8cda26414a1ec1f24a055e8f1834c0cf1c9cf',
  'FastAPI|PostgreSQL|TeamTracker': '6d422010e4c5c66da2950a19ad050765cd81bfd65b1842658377a1d67463b0d1',
  'Django|PostgreSQL|TeamTracker': 'e509309cd6c500e6633e0dca3d3fe52a695802e29ec4114e8c1fccac624e52c6',
  'Go|PostgreSQL|TeamTracker': '6aea8b048aaf7112957de6bb8984d687bd5d725614f91826a9bf602b5e86135e',
  'Spring Boot|MySQL|DemoApp': '3112d3f76989b4c04715bb9e983c15d3f91485d32c6c62733a567e209268bd4e',
  'Express|MySQL|DemoApp': 'd4b57b52d07448b161c9310cd06702984492ebed9f192abc7a5712d9b254f33f',
  'FastAPI|MySQL|DemoApp': 'cd87d6e324aa1e84339162a2088acdba40ad660ea5def7804ecad70ca1ecd8b4',
  'Django|MySQL|DemoApp': '8b07a1b2bd072698002cd2db944d5fe08b11f0d0cbf156993e1abf8edf47e5f3',
  'Go|MySQL|DemoApp': '9ff40acbcc693f9d67b662e07dfb499f24930753f812b40c0e349d3c91771ba7',
  'Spring Boot|MySQL|TeamTracker': '4c4640ba26531e5596973f51dd05d38153559799c131a1a8a2217069cb4c0ce9',
  'Express|MySQL|TeamTracker': 'bfa4a536ce5f44cb51de4ac7602a399ece4a77fb36bcb92f5c234d0c3cb87649',
  'FastAPI|MySQL|TeamTracker': '5c788c7089e92754416cecd129682faec642fbfed32b9aa3e3e0487208c04b7b',
  'Django|MySQL|TeamTracker': '3b3e6a6fb4afd1bbf712a9c1a190d7187135bf908c283b0a6ed6ecb10bf2830a',
  'Go|MySQL|TeamTracker': '7408a3e2377e0a4b4f3d465ed20cfa35716e3de65efd38d77d616ec76a1c55ec',
};

const BACKENDS = ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go'];
const DATABASES = ['PostgreSQL', 'MySQL'];

/** Content hash (leading-slash), same convention as the earlier gates. */
async function hashOf(model: ProjectModel): Promise<string> {
  const files = await buildFileSet(model, selectBackendPlugin(model));
  return hashFiles(files);
}
function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}
async function filesOf(model: ProjectModel): Promise<GeneratedFile[]> {
  return buildFileSet(model, selectBackendPlugin(model));
}

/** The line-level diff between two file sets (relPath + which lines differ). */
function diffFileSets(web: GeneratedFile[], api: GeneratedFile[]): string[] {
  const webMap = new Map(web.map((f) => [f.relPath, f.content]));
  const apiMap = new Map(api.map((f) => [f.relPath, f.content]));
  const out: string[] = [];
  const all = new Set([...webMap.keys(), ...apiMap.keys()]);
  for (const rel of [...all].sort()) {
    const w = webMap.get(rel);
    const a = apiMap.get(rel);
    if (w === undefined) { out.push(`+ ${rel} (only in api-only)`); continue; }
    if (a === undefined) { out.push(`- ${rel} (only in web-app)`); continue; }
    if (w !== a) {
      const wl = w.split('\n'), al = a.split('\n');
      const changed: string[] = [];
      const n = Math.max(wl.length, al.length);
      for (let i = 0; i < n; i++) if (wl[i] !== al[i]) changed.push(`web:[${(wl[i] ?? '').trim()}] api:[${(al[i] ?? '').trim()}]`);
      out.push(`~ ${rel}: ${changed.join(' | ')}`);
    }
  }
  return out;
}

async function main(): Promise<void> {
  let pass = true;

  // ── GATE 0/2 — 20-hash matrix under Web-App ────────────────────────────────
  process.stdout.write('=== GATE: 20-hash matrix under Web-App (projectType default) ===\n');
  for (const model of ['DemoApp', 'TeamTracker']) {
    for (const db of DATABASES) {
      for (const backend of BACKENDS) {
        const key = `${backend}|${db}|${model}`;
        const build = model === 'DemoApp' ? buildDemoAppModel : buildTeamTrackerModel;
        const got = await hashOf(build({ backend, database: db }));
        const ok = got === FROZEN[key];
        if (!ok) pass = false;
        process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${key.padEnd(34)} ${got.slice(0, 16)}${ok ? '' : ` (expected ${FROZEN[key].slice(0, 16)})`}\n`);
      }
    }
  }
  process.stdout.write(`  -> ${pass ? 'PASS — all 20 Web-App hashes byte-identical' : 'FAIL'}\n`);

  // ── STEP 1 — four backend-only stacks: api-only == web-app ± 2 manifest lines ─
  process.stdout.write('\n=== STEP 1: backend-only stacks — API-only differs only in the manifest ===\n');
  const apiHashes: Record<string, string> = {};
  for (const backend of ['Express', 'FastAPI', 'Django', 'Go']) {
    const web = await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL' }));
    const api = await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL', projectType: 'API-only' }));
    const diff = diffFileSets(web, api);
    // Only GENERATION-MANIFEST.txt should differ, and only its projectType+frontend lines.
    const onlyManifest = diff.length === 1 && diff[0].startsWith('~ GENERATION-MANIFEST.txt');
    const onlyTwoLines = onlyManifest &&
      /projectType: Web App.*projectType: API-only/.test(diff[0]) &&
      /frontend: React.*frontend: None/.test(diff[0]);
    apiHashes[backend] = hashFiles(api);
    if (!onlyTwoLines) pass = false;
    process.stdout.write(`  ${onlyTwoLines ? 'OK  ' : 'FAIL'} ${backend.padEnd(8)} api-only=${apiHashes[backend].slice(0, 16)}  diff: ${diff.join(' ; ') || '(none)'}\n`);
  }

  // ── STEP 2 — Spring API-only twice-identical ───────────────────────────────
  process.stdout.write('\n=== STEP 2: Spring API-only baselines (Postgres, twice-identical) ===\n');
  for (const [name, build] of [['DemoApp', buildDemoAppModel], ['TeamTracker', buildTeamTrackerModel]] as const) {
    const h1 = await hashOf(build({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'API-only' }));
    const h2 = await hashOf(build({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'API-only' }));
    const twice = h1 === h2;
    if (!twice) pass = false;
    process.stdout.write(`  ${twice ? 'OK  ' : 'FAIL'} Spring ${name.padEnd(11)} api-only ${h1}  twice=${twice}\n`);
  }
  // File-set diff: Spring web-app vs api-only (show the subtraction).
  const springWeb = await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL' }));
  const springApi = await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'API-only' }));
  const removed = springWeb.filter((w) => !springApi.some((a) => a.relPath === w.relPath)).map((f) => f.relPath);
  process.stdout.write(`  Spring DemoApp: web-app=${springWeb.length} files, api-only=${springApi.length} files\n`);
  process.stdout.write(`  frontend files removed in api-only: ${removed.join(', ') || '(none)'}\n`);

  // ── STEP 3 — static coherence of the Spring API-only shell ─────────────────
  process.stdout.write('\n=== STEP 3: Spring API-only static coherence ===\n');
  const byPath = new Map(springApi.map((f) => [f.relPath, f.content]));
  const compose = byPath.get('docker-compose.yml') ?? '';
  const readme = byPath.get('README.md') ?? '';
  const noFrontendDir = ![...byPath.keys()].some((p) => p.startsWith('frontend/'));
  const noFrontendService = !/^\s{2}frontend:/m.test(compose) && !compose.includes('./frontend');
  const noPort3000 = !compose.includes('3000') && !readme.includes(':3000');
  const composeHasDbBackend = /^\s{2}db:/m.test(compose) && /^\s{2}backend:/m.test(compose);
  const readmeClean = !/frontend|React|nginx/i.test(readme.replace(/API-only|no frontend|without a frontend/gi, ''));
  const coherent = noFrontendDir && noFrontendService && noPort3000 && composeHasDbBackend && readmeClean;
  if (!coherent) pass = false;
  process.stdout.write(`  ${coherent ? 'OK  ' : 'FAIL'} noFrontendDir=${noFrontendDir} noFrontendService=${noFrontendService} noPort3000=${noPort3000} composeHasDbBackend=${composeHasDbBackend} readmeClean=${readmeClean}\n`);

  process.stdout.write(`\nDay-15 gate: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
