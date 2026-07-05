/*
 * Thraksha — Day 18 EXECUTION gate harness (temporary; not part of the product).
 *
 * NONE          The full 20-hash matrix under {email:none, ai:none} stays
 *               byte-identical (the literal bypass) — both the Phase-A manifest
 *               lines AND the (none) defaults line unmoved. Guard-the-guard: the
 *               20 frozen digests are the canonical Day-17 set (16 non-Go + 4 Go).
 * GUARD         setIntegrations({email:none, ai:hook}) survives the get/set copy
 *               (ai is not silently dropped → the hook is not a no-op).
 * AI HOOK       FastAPI + Express ai-hook (DemoApp, Postgres) generate twice →
 *               byte-identical (recorded), and differ from the none output (the
 *               addition is real).
 * COHERENCE     Per stack: the AI client module exists and is mounted on /api/ai/*;
 *               the module reads exactly the AI_* vars declared in .env.example
 *               (no dangling either way); NO baked key (only env placeholders);
 *               README truthful (exposed-optional, inert until configured).
 * DETACHABLE    Per stack (the STRUCTURAL proof of ADR-001 Property 2): the entity
 *               CRUD routers/handlers are byte-identical to the none output; the
 *               only changes are the AI add-on seams (the mount file's single
 *               isolated block, .env.example, README, the new ai module, and the
 *               traceability manifest that SHOWS the choice — ADR-004). Removing
 *               the AI block from the mount file reproduces the none mount file.
 *
 * Run:  node dist/day18-gate.js
 */

import crypto from 'node:crypto';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { ProjectModel } from './core/project-model.js';
import type { GeneratedFile } from './core/plugin.js';

// The canonical 20 (Day-17 §6 guard-the-guard): 5 backends × 2 DBs × 2 models.
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

// The Day-18 AI-hook baselines (DemoApp, Postgres) recorded this session.
const AI_FROZEN: Record<string, string> = {
  FastAPI: 'aabc7159733aaa661f6cf8bc2dab8ec7421eb90e2446acf6407a004eee33b20d',
  Express: 'a17c6ad4dfc3a01bd5f7cfbe008bbac622fae0d67443f5f0293f6b26507c2cec',
};

const BACKENDS = ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go'];
const DATABASES = ['PostgreSQL', 'MySQL'];
const LANDED_AI = ['FastAPI', 'Express'];

// Per stack: which file carries the isolated AI mount, and which files the AI
// add-on is ALLOWED to change (the seams). Everything else must be byte-identical
// to the none output — that is the detachability proof (CRUD routers untouched).
const AI_MOUNT_FILE: Record<string, string> = { FastAPI: 'app/main.py', Express: 'src/app.js' };
const AI_MODULE_FILE: Record<string, string> = { FastAPI: 'app/ai.py', Express: 'src/ai.js' };
const AI_MARKER = 'Day-18 AI hook';

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
async function filesOf(model: ProjectModel): Promise<GeneratedFile[]> {
  return buildFileSet(model, selectBackendPlugin(model));
}
async function hashOf(model: ProjectModel): Promise<string> {
  return hashFiles(await filesOf(model));
}
function withAi(model: ProjectModel): ProjectModel {
  model.setIntegrations({ email: 'none', ai: 'hook' });
  return model;
}
function toMap(files: GeneratedFile[]): Map<string, string> {
  return new Map(files.map((f) => [f.relPath, f.content]));
}
/** All AI_* env names a string reads via os.environ / process.env. */
function aiVarsRead(content: string): Set<string> {
  const out = new Set<string>();
  for (const m of content.matchAll(/(?:os\.environ\.get|process\.env)[.(]?\s*["'`]?(AI_[A-Z_]+)/g)) out.add(m[1]);
  return out;
}
/** AI_* env names DECLARED in a .env.example (LINES like AI_API_KEY=). */
function aiVarsDeclared(content: string): Set<string> {
  const out = new Set<string>();
  for (const m of content.matchAll(/^(AI_[A-Z_]+)=/gm)) out.add(m[1]);
  return out;
}
function eqSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

/** Per-stack AI-hook coherence on the generated file set. */
function coherence(backend: string, files: GeneratedFile[]): { ok: boolean; detail: string } {
  const byPath = toMap(files);
  const svc = byPath.get(AI_MODULE_FILE[backend]) ?? '';
  const mount = byPath.get(AI_MOUNT_FILE[backend]) ?? '';
  const env = byPath.get('.env.example') ?? '';
  const readme = byPath.get('README.md') ?? '';

  const serviceExists = svc.length > 0;
  // Wired: the module is MOUNTED on /api/ai/* and loaded at startup (so a broken
  // hook fails the boot). FastAPI include_router; Express app.use('/api/ai', ...).
  const wired = backend === 'FastAPI'
    ? /include_router\(ai\.router, prefix="\/api\/ai"\)/.test(mount) && /from \. import ai\b/.test(mount)
    : /app\.use\('\/api\/ai', require\('\.\/ai'\)\.router\)/.test(mount);
  // Declaration match: the AI_* the module READS == those DECLARED in .env.example.
  const read = aiVarsRead(svc);
  const declared = aiVarsDeclared(env);
  const declMatch = read.size > 0 && eqSet(read, declared);
  // Graceful-unconfigured (not a crash): 503 + "AI is not configured".
  const graceful = /503/.test(svc) && /AI is not configured/.test(svc);
  // No baked key: no AI_API_KEY / key assigned a non-empty literal (env default is empty).
  const noBakedKey = !/AI_API_KEY["'`\s:=]+["'`][^"'`\n]{6,}["'`]/.test(svc) &&
    !/(api[_-]?key|apikey)\s*[:=]\s*["'`][A-Za-z0-9_-]{8,}["'`]/i.test(svc);
  // README truthful: mentions AI + inert-until-configured, not "enriches every response".
  const readmeTruthful = /AI hook/i.test(readme) && /inert until configured/i.test(readme) && !/enrich/i.test(readme);

  const ok = serviceExists && wired && declMatch && graceful && noBakedKey && readmeTruthful;
  return { ok, detail: `service=${serviceExists} wired=${wired} declMatch=${declMatch}(read=${[...read].join(',')} decl=${[...declared].join(',')}) graceful=${graceful} noBakedKey=${noBakedKey} readmeTruthful=${readmeTruthful}` };
}

/**
 * The STRUCTURAL detachability proof (ADR-001 Property 2): the ai-hook output
 * must equal the none output except the AI add-on seams. Every non-seam file
 * (all entity CRUD routers/handlers, models, config, db, compose, …) must be
 * byte-identical; the mount file with the AI block removed must reproduce the
 * none mount file. If a CRUD handler changed, the hook is NOT detachable → FAIL.
 */
function detachable(backend: string, noneFiles: GeneratedFile[], hookFiles: GeneratedFile[]): { ok: boolean; detail: string } {
  const none = toMap(noneFiles);
  const hook = toMap(hookFiles);
  const mountFile = AI_MOUNT_FILE[backend];
  const moduleFile = AI_MODULE_FILE[backend];
  // Seams the AI add-on is allowed to touch. GENERATION-MANIFEST.txt legitimately
  // reflects the active integration via the gated section (ADR-004 — shown).
  const seams = new Set([mountFile, moduleFile, '.env.example', 'README.md', 'GENERATION-MANIFEST.txt']);

  // 1. Every non-seam file present in none must be byte-identical in hook.
  const changed: string[] = [];
  for (const [p, c] of none) { if (!seams.has(p) && hook.get(p) !== c) changed.push(p); }
  const crudUntouched = changed.length === 0;

  // 2. The ONLY new file is the AI module.
  const added = [...hook.keys()].filter((p) => !none.has(p));
  const onlyAiAdded = added.length === 1 && added[0] === moduleFile;

  // 3. Removing the AI block/line from the mount file reproduces the none file.
  const noneMount = none.get(mountFile) ?? '';
  const hookMount = hook.get(mountFile) ?? '';
  const stripped = backend === 'FastAPI'
    ? hookMount.split(`# ${AI_MARKER}`)[0] // appended at end → everything before the first marker
    : hookMount.split('\n').filter((l) => !l.includes(AI_MARKER)).join('\n'); // single inserted line
  const mountReconstructs = stripped.replace(/\s+$/, '') === noneMount.replace(/\s+$/, '');

  const ok = crudUntouched && onlyAiAdded && mountReconstructs;
  return { ok, detail: `crudUntouched=${crudUntouched}${changed.length ? '(changed=' + changed.join(',') + ')' : ''} onlyAiAdded=${onlyAiAdded}(added=${added.join(',')}) mountReconstructs=${mountReconstructs}` };
}

async function main(): Promise<void> {
  let pass = true;

  // ── NONE — 20-hash matrix byte-identical (both trap sides) ──────────────────
  process.stdout.write('=== NONE: 20-hash matrix ({email:none, ai:none} literal bypass) ===\n');
  let noneOk = true;
  for (const model of ['DemoApp', 'TeamTracker']) {
    for (const db of DATABASES) {
      for (const backend of BACKENDS) {
        const key = `${backend}|${db}|${model}`;
        const build = model === 'DemoApp' ? buildDemoAppModel : buildTeamTrackerModel;
        const got = await hashOf(build({ backend, database: db }));
        if (got !== FROZEN[key]) { noneOk = false; pass = false; process.stdout.write(`  FAIL ${key} ${got.slice(0, 16)} (expected ${FROZEN[key].slice(0, 16)})\n`); }
      }
    }
  }
  process.stdout.write(`  ${noneOk ? 'OK  ' : 'FAIL'} all 20 byte-identical under none\n`);

  // ── POSITIVE GUARD — ai survives the get/set copy (not a silent no-op) ──────
  process.stdout.write('\n=== GUARD: ai survives get/set copy ===\n');
  const guardModel = withAi(buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' }));
  const guardOk = guardModel.getIntegrations().ai === 'hook' && guardModel.getIntegrations().email === 'none';
  if (!guardOk) pass = false;
  process.stdout.write(`  ${guardOk ? 'OK  ' : 'FAIL'} setIntegrations({email:none, ai:hook}) → getIntegrations().ai === 'hook'\n`);

  // ── AI HOOK — baselines (twice-identical) + coherence + detachability ───────
  process.stdout.write('\n=== AI HOOK: baselines (DemoApp, Postgres) + coherence + detachability ===\n');
  for (const backend of LANDED_AI) {
    const noneFiles = await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL' }));
    const noneHash = hashFiles(noneFiles);
    const h1 = await hashOf(withAi(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
    const h2 = await hashOf(withAi(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
    const hookFiles = await filesOf(withAi(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
    const twice = h1 === h2;
    const real = h1 !== noneHash;
    const recorded = h1 === AI_FROZEN[backend];
    const coh = coherence(backend, hookFiles);
    const det = detachable(backend, noneFiles, hookFiles);
    const ok = twice && real && recorded && coh.ok && det.ok;
    if (!ok) pass = false;
    process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${backend.padEnd(8)} ai-hook ${h1}\n`);
    process.stdout.write(`       twice=${twice} differsFromNone=${real} matchesRecorded=${recorded}\n`);
    process.stdout.write(`       coherence:   ${coh.detail}\n`);
    process.stdout.write(`       detachable:  ${det.detail}\n`);
  }

  process.stdout.write(`\nDay-18 gate: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
