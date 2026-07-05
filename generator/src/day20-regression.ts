/*
 * Thraksha — Day 20 CONSOLIDATED REGRESSION harness (the canonical regression tool).
 *
 * Replaces running day12…day19 gates serially. It re-confirms, in ONE fast process
 * (no per-gate re-computation of the 20-matrix, no repeated boots), the FULL
 * enumerated frozen-baseline set (43 digests) AND every non-hash check the
 * individual gates make — using the EXACT `/${relPath}\n` + content hash convention
 * the gates use (hashTree == cliHash), so it does not fork the digest space.
 *
 * PART 1 (drift):     43 digests byte-identical + guard-the-guard + the property
 *                     cases RE-DERIVED (api-only ± 2 manifest lines; description
 *                     sibling) + the 10 TeamTracker relationship hashes via the
 *                     UI addEntity path + the reproduced non-hash checks
 *                     (naming wire-keys, simple collapse, composition content,
 *                     api-only coherence, email coherence, ai-hook coherence +
 *                     detachability, description, guards).
 *
 * The HTTP-driven UI==CLI (day14/16/19 route checks) and the Part-2 live cell are
 * driven separately this session; the individual gates remain intact as the
 * cross-check that VALIDATES this harness (GATE 0: run both, diff — must agree).
 *
 * Moves NO baseline; changes NO generated output. Test scaffolding only.
 * Run:  node dist/day20-regression.js
 */

import crypto from 'node:crypto';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildTaskModel } from './task-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { createProjectModel, restoreProjectModel, type ProjectModel } from './core/project-model.js';
import { defaultCodingStyle, toSnakeCase, toCamelCase, applyNaming, type CodingStyle } from './core/style.js';
import { buildMaxCellModel } from './maxcell-fixture.js';
import { resolveVersions, type StackVersions } from './core/versions.js';
import { applyProfile, fullOptionSet, existingDefaults, type OrgProfile } from './core/org-profile.js';
import { assembleBlueprint, type BlueprintChoices } from './core/assemble.js';
import { canonicalStringify } from './core/canonical-json.js';
import type { GeneratedFile } from './core/plugin.js';

// ── The enumerated frozen-baseline set (43). Guard-the-guarded to source reports. ──
// 20 web-app matrix — week-01-summary §3 (16) + day-09/day-10 (4 Go).
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
// Naming snake_case on the multi-word Task — week-02-summary §4.
const NAMING: Record<string, string> = {
  'Spring Boot': '0484560720f22c1ff627979b78d734ef71e337ea39b18e6357d086b38630baeb',
  Express: 'f79bbb16a9219d5f7135c654a6d2779c917400523d1671626606c19451f02b29',
  FastAPI: 'c8aebb183788b7b5b7bf62584ac450aaae44669672f289560c887113bd0eb4bd',
  Django: 'f0c2c76599d596b801428696567fd574fa84f182818942b5fddf23f8dc27bcef',
  Go: 'e5cc7b8c11420036a94b0d444291de6437840c0f6a281044b9dce05f77670026',
};
// Formatting — Express DemoApp indentation — week-02-summary §4.
const FORMATTING: Record<string, string> = {
  'four-space': 'd3ae91b0fbbf28ff448caa87d3bfe7f38b48fceda1547990e2c4b34b990320be',
  tab: 'c81fb0f52ef8ad30e6cc20c47d7863ff8142f2310b96f9d070ef696312c79b99',
};
// Architecture simple (Postgres) — week-02-summary §4.
const SIMPLE: Record<string, string> = {
  'Express|DemoApp': 'f340374447eb612787f1a37ef1efd59c6990f3adcb3189415110416f0f76e767',
  'Express|TeamTracker': '1f06af0d7bc80e534bddefd43303ddef336344929b362d78bf395a7739b2b9f3',
  'FastAPI|DemoApp': 'c60a4521918034d9eba54346565e06196c43d5ff6811cca61b56aa828ff34c4a',
  'FastAPI|TeamTracker': 'a85d7f9260f813e30405ad649924a95a0388cf52d2d9c5978df720736006d869',
};
// Composition (multi-word Task, PG) — week-02-summary §4.
const COMPOSITION: Record<string, string> = {
  'A Express snake+four+simple': '58f0af062d8cc1561ce59567e9956618f5c107ed7e38eba6e9e58b484eab841b',
  'B FastAPI snake+simple': 'c57edf42455085e8a694bb1e9c10db6f7e2bca0349f959bbf1f26d6140a5b45e',
};
// API-only (recorded-default variant, PG) — day-16-gate API_ONLY.
const API_ONLY: Record<string, string> = {
  'Spring Boot|DemoApp': '97aef817192e9537a12fd5ad069616623e7488aa3fc07da3fd7be4442fae74e3',
  'Spring Boot|TeamTracker': '190594dd857cb0a2e29d03b919f767b82c5383e6e2052756a9e2cc3e92e17f3b',
  'Express|DemoApp': 'c5210f732522aca1cd1dbbcbd82dbadc47e6b9af781b40ab07520c28d9e99645',
  'FastAPI|DemoApp': '46b3fda4db97ffdd492f945d2df2711be7a158fd513bbdcee07b36e741109e3b',
  'Django|DemoApp': '5634e7ce00a3db7d964b43253016660e3a89705616b097d7b4bb17f81ba97cd1',
  'Go|DemoApp': '5d67f242d3ad71acadf5682133889e678e9ee2b3c257a1aad7790cffe1d41502',
};
// Email (DemoApp, PG) — day-17-report §4/§6.
const EMAIL: Record<string, string> = {
  FastAPI: 'efd3d6a8d0a6cc46b891a73210d211fd8e68f8f449e63b2d8d5fc11a98cfbe9f',
  Express: '62e0ef44cd9aba923f5c6b1f51f7051721f596a2e31ea9b845e90b88016a8e50',
};
// AI-hook (DemoApp, PG) — day-18-report §5 / day18-gate AI_FROZEN.
const AI_HOOK: Record<string, string> = {
  FastAPI: 'aabc7159733aaa661f6cf8bc2dab8ec7421eb90e2446acf6407a004eee33b20d',
  Express: 'a17c6ad4dfc3a01bd5f7cfbe008bbac622fae0d67443f5f0293f6b26507c2cec',
};

// The canonical MAXIMAL-composition baseline (Eco-Day 1) — the reproducible
// replacement for the retired, record-only, un-reproducible `33f3ec4b…`. Its input
// is the committed fixture in maxcell-fixture.ts. ADDITIVE: moves none of the 43+10.
const MAXIMAL = '929c379f9e98ec34c3a42bafe814ebb65fffde0820d754176a7c7ab95c825e20';

// Non-default framework/version baselines (Eco-Day 11) — one per stack, DemoApp|PostgreSQL.
// ADDITIVE: each is a NEW twice-identical baseline for a non-default pin; none replaces a frozen hash.
const VERSION_BASELINES: [string, Partial<StackVersions>, string][] = [
  ['Spring Boot', { java: '17' }, '9d81ba25a5bda197a82bcf3bd833a8808a14d47cd1c4a7a8675467aba3f877bc'],
  ['Express', { node: '20' }, '106075085320ebe4541c1772e838a4d13575e068efe25fcaa87dd7c636c27516'],
  ['FastAPI', { python: '3.11' }, 'd5c0605c48f9e6ddb1757513779d46d55875abb383edd43ad786696529167c9d'],
  ['Django', { django: '5.0.1' }, 'd1c007b22f27006e6cec7d012f81e806a05551c62ec4326ec2e17c76919d0df2'],
  ['Go', { go: '1.21' }, 'e926ef6112153b2663ad706f24c054abd8715170ac472c5a6dcde5cec30b9660'],
];

const BACKENDS = ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go'];
const DATABASES = ['PostgreSQL', 'MySQL'];

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
async function filesOf(model: ProjectModel): Promise<GeneratedFile[]> { return buildFileSet(model, selectBackendPlugin(model)); }
async function hashOf(model: ProjectModel): Promise<string> { return hashFiles(await filesOf(model)); }
function styleOf(indent: string, naming: string, depth: string): CodingStyle {
  return { formatting: { indent: indent as CodingStyle['formatting']['indent'] }, namingConvention: naming as CodingStyle['namingConvention'], architectureDepth: depth as CodingStyle['architectureDepth'] };
}
function toMap(files: GeneratedFile[]): Map<string, string> { return new Map(files.map((f) => [f.relPath, f.content])); }
let pass = true;
function record(ok: boolean, label: string, extra = ''): void { if (!ok) pass = false; process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? '  ' + extra : ''}\n`); }

// ── Naming wire-key checks (day12 CHECKS, snake_case branch) ────────────────────
async function namingWireKeys(backend: string): Promise<boolean> {
  const files = toMap(await filesOf(buildTaskModel({ backend, namingConvention: 'snake_case' })));
  const get = (suf: string) => [...files.entries()].find(([p]) => p.endsWith(suf))?.[1] ?? '';
  if (backend === 'Go') { const b = get('task.go') + get('validate.go'); return b.includes('json:"due_date"') && b.includes('json:"is_urgent"') && /\bDueDate\b/.test(get('task.go')); }
  if (backend === 'Spring Boot') { const d = get('TaskDto.java'); return d.includes('@JsonProperty("due_date")') && d.includes('@JsonProperty("is_urgent")') && /private OffsetDateTime dueDate;/.test(d); }
  if (backend === 'Express') { const r = get('task.repository.js'), d = get('task.dto.js'); return /due_date: row\.due_date/.test(r) && /is_urgent: row\.is_urgent/.test(r) && d.includes('body.due_date') && d.includes('body.is_urgent'); }
  if (backend === 'FastAPI') { const s = get('schemas.py'), m = get('model.py'); return !s.includes('alias="dueDate"') && /due_date:/.test(s) && /is_urgent:/.test(s) && m.includes('due_date = Column(') && m.includes('is_urgent = Column('); }
  const s = get('serializers.py'), m = get('models.py'); return !/dueDate\s*=\s*serializers\./.test(s) && s.includes('"due_date"') && s.includes('"is_urgent"') && m.includes('due_date = models.') && m.includes('is_urgent = models.');
}

// ── Email coherence (day17) ─────────────────────────────────────────────────────
function emailCoherent(backend: string, files: GeneratedFile[]): boolean {
  const byPath = toMap(files);
  const svc = byPath.get(backend === 'FastAPI' ? 'app/email.py' : 'src/email.js') ?? '';
  const env = byPath.get('.env.example') ?? '';
  const readme = byPath.get('README.md') ?? '';
  const mainOrIndex = backend === 'FastAPI' ? (byPath.get('app/main.py') ?? '') : (byPath.get('src/app.js') ?? '');
  const wired = backend === 'FastAPI' ? /from \. import email\b/.test(mainOrIndex) : /require\(['"]\.\/email['"]\)/.test(mainOrIndex);
  const config = backend === 'FastAPI' ? (byPath.get('app/config.py') ?? '') : svc;
  const read = new Set([...config.matchAll(/(?:os\.environ\.get|process\.env)[.(]?\s*["'`]?(SMTP_[A-Z_]+)/g)].map((m) => m[1]));
  const decl = new Set([...env.matchAll(/^(SMTP_[A-Z_]+)=/gm)].map((m) => m[1]));
  const declMatch = read.size > 0 && read.size === decl.size && [...read].every((x) => decl.has(x));
  const depOk = backend !== 'Express' || /"nodemailer":/.test(byPath.get('package.json') ?? '');
  const noBakedSecret = !/SMTP_PASSWORD["'`\s:=]+["'`][^"'`\n]{3,}["'`]/.test(svc + config);
  const readmeTruthful = /email|SMTP/i.test(readme) && /inert|until.*(set|configured)/i.test(readme);
  return svc.length > 0 && wired && declMatch && depOk && noBakedSecret && readmeTruthful;
}

// ── AI-hook coherence + detachability (day18) ───────────────────────────────────
function aiCoherentAndDetachable(backend: string, none: GeneratedFile[], hook: GeneratedFile[]): boolean {
  const byPath = toMap(hook);
  const mountFile = backend === 'FastAPI' ? 'app/main.py' : 'src/app.js';
  const moduleFile = backend === 'FastAPI' ? 'app/ai.py' : 'src/ai.js';
  const svc = byPath.get(moduleFile) ?? '';
  const mount = byPath.get(mountFile) ?? '';
  const env = byPath.get('.env.example') ?? '';
  const readme = byPath.get('README.md') ?? '';
  const wired = backend === 'FastAPI' ? /include_router\(ai\.router, prefix="\/api\/ai"\)/.test(mount) && /from \. import ai\b/.test(mount) : /app\.use\('\/api\/ai', require\('\.\/ai'\)\.router\)/.test(mount);
  const read = new Set([...svc.matchAll(/(?:os\.environ\.get|process\.env)[.(]?\s*["'`]?(AI_[A-Z_]+)/g)].map((m) => m[1]));
  const decl = new Set([...env.matchAll(/^(AI_[A-Z_]+)=/gm)].map((m) => m[1]));
  const declMatch = read.size > 0 && read.size === decl.size && [...read].every((x) => decl.has(x));
  const graceful = /503/.test(svc) && /AI is not configured/.test(svc);
  const noBakedKey = !/AI_API_KEY["'`\s:=]+["'`][^"'`\n]{6,}["'`]/.test(svc);
  const readmeTruthful = /AI hook/i.test(readme) && /inert until configured/i.test(readme) && !/enrich/i.test(readme);
  // Detachability CRUD-diff: every non-seam file byte-identical to none; only the ai module added.
  const noneMap = toMap(none);
  const seams = new Set([mountFile, moduleFile, '.env.example', 'README.md', 'GENERATION-MANIFEST.txt']);
  let crudUntouched = true;
  for (const [p, c] of noneMap) if (!seams.has(p) && byPath.get(p) !== c) crudUntouched = false;
  const added = [...byPath.keys()].filter((p) => !noneMap.has(p));
  const onlyAiAdded = added.length === 1 && added[0] === moduleFile;
  const stripped = backend === 'FastAPI' ? (mount.split('# Day-18 AI hook')[0]) : mount.split('\n').filter((l) => !l.includes('Day-18 AI hook')).join('\n');
  const mountReconstructs = stripped.replace(/\s+$/, '') === (noneMap.get(mountFile) ?? '').replace(/\s+$/, '');
  return svc.length > 0 && wired && declMatch && graceful && noBakedKey && readmeTruthful && crudUntouched && onlyAiAdded && mountReconstructs;
}

async function main(): Promise<void> {
  const digestManifest: string[] = []; // every full digest this harness asserts (for the GATE-0 diff)
  const bake = (label: string, got: string) => digestManifest.push(`${label} ${got}`);

  // ══ PART 1a — the 20 web-app matrix ═════════════════════════════════════════
  process.stdout.write('=== PART 1a: 20 web-app matrix (default path — the blocking backstop) ===\n');
  for (const model of ['DemoApp', 'TeamTracker']) for (const db of DATABASES) for (const backend of BACKENDS) {
    const key = `${backend}|${db}|${model}`;
    const got = await hashOf((model === 'DemoApp' ? buildDemoAppModel : buildTeamTrackerModel)({ backend, database: db }));
    bake(key, got); record(got === FROZEN[key], key.padEnd(34), got === FROZEN[key] ? got.slice(0, 16) : `${got.slice(0, 16)} != ${FROZEN[key].slice(0, 16)}`);
  }

  // ══ PART 1b — the 23 alternative baselines ══════════════════════════════════
  process.stdout.write('\n=== PART 1b: naming snake_case (5) ===\n');
  for (const backend of BACKENDS) {
    const got = await hashOf(buildTaskModel({ backend, namingConvention: 'snake_case' }));
    bake(`naming|${backend}`, got);
    record(got === NAMING[backend] && await namingWireKeys(backend), `naming ${backend.padEnd(11)}`, got.slice(0, 16));
  }
  process.stdout.write('\n=== PART 1b: formatting Express (2) ===\n');
  for (const indent of ['four-space', 'tab']) {
    const m = buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }); m.setStyle(styleOf(indent, 'default', 'default'));
    const got = await hashOf(m); bake(`formatting|${indent}`, got); record(got === FORMATTING[indent], `formatting Express ${indent.padEnd(10)}`, got.slice(0, 16));
  }
  process.stdout.write('\n=== PART 1b: architecture simple (4) ===\n');
  for (const backend of ['Express', 'FastAPI']) for (const [name, build] of [['DemoApp', buildDemoAppModel], ['TeamTracker', buildTeamTrackerModel]] as const) {
    const m = build({ backend, database: 'PostgreSQL' }); m.setStyle(styleOf('default', 'default', 'simple'));
    const got = await hashOf(m); bake(`simple|${backend}|${name}`, got); record(got === SIMPLE[`${backend}|${name}`], `simple ${backend.padEnd(8)} ${name.padEnd(11)}`, got.slice(0, 16));
  }
  process.stdout.write('\n=== PART 1b: composition (2) ===\n');
  {
    const a = buildTaskModel({ backend: 'Express' }); a.setStyle(styleOf('four-space', 'snake_case', 'simple'));
    const ga = await hashOf(a); bake('comp|A', ga);
    const crudA = (await filesOf(a)).find((f) => f.relPath.endsWith('.crud.base.js'))?.content ?? '';
    const compAok = ga === COMPOSITION['A Express snake+four+simple'] && /due_date: row\.due_date/.test(crudA) && /\n {4}\S/.test(crudA) && !/\n {2}\S/.test(crudA);
    record(compAok, 'comp A Express snake+four+simple', ga.slice(0, 16));
    const b = buildTaskModel({ backend: 'FastAPI' }); b.setStyle(styleOf('default', 'snake_case', 'simple'));
    const gb = await hashOf(b); bake('comp|B', gb);
    const schemasB = (await filesOf(b)).find((f) => f.relPath.endsWith('schemas.py'))?.content ?? '';
    const crudB = (await filesOf(b)).find((f) => f.relPath.endsWith('crud_base.py'))?.content ?? '';
    record(gb === COMPOSITION['B FastAPI snake+simple'] && /due_date:/.test(schemasB) && crudB.length > 0, 'comp B FastAPI snake+simple', gb.slice(0, 16));
  }
  process.stdout.write('\n=== PART 1b: api-only (6) ===\n');
  for (const [key] of Object.entries(API_ONLY)) {
    const [backend, name] = key.split('|');
    const build = name === 'DemoApp' ? buildDemoAppModel : buildTeamTrackerModel;
    const got = await hashOf(build({ backend, database: 'PostgreSQL', projectType: 'API-only' }));
    bake(`api-only|${key}`, got); record(got === API_ONLY[key], `api-only ${key}`, got.slice(0, 16));
  }
  process.stdout.write('\n=== PART 1b: email (2) + coherence ===\n');
  for (const backend of ['FastAPI', 'Express']) {
    const m = buildDemoAppModel({ backend, database: 'PostgreSQL' }); m.setIntegrations({ email: 'smtp', ai: 'none' });
    const files = await filesOf(m); const got = hashFiles(files);
    bake(`email|${backend}`, got); record(got === EMAIL[backend] && emailCoherent(backend, files), `email ${backend.padEnd(8)}`, got.slice(0, 16));
  }
  process.stdout.write('\n=== PART 1b: ai-hook (2) + coherence + detachability ===\n');
  for (const backend of ['FastAPI', 'Express']) {
    const none = await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL' }));
    const hm = buildDemoAppModel({ backend, database: 'PostgreSQL' }); hm.setIntegrations({ email: 'none', ai: 'hook' });
    const hook = await filesOf(hm); const got = hashFiles(hook);
    bake(`ai-hook|${backend}`, got); record(got === AI_HOOK[backend] && aiCoherentAndDetachable(backend, none, hook), `ai-hook ${backend.padEnd(8)}`, got.slice(0, 16));
  }

  // ══ PART 1c — the property cases RE-DERIVED (not cited) ══════════════════════
  process.stdout.write('\n=== PART 1c: property cases RE-DERIVED this run ===\n');
  // api-only == web-app ± exactly the 2 manifest lines (backend-only stack: FastAPI).
  {
    const web = toMap(await filesOf(buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' })));
    const api = toMap(await filesOf(buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL', projectType: 'API-only' })));
    const changed: string[] = [];
    for (const [p, c] of web) if (api.get(p) !== c) changed.push(p);
    // The invariant: NO code file differs — ONLY the manifest, and only its
    // projectType + frontend lines plus the recorded ADR-004 default (the
    // "recorded-default variant" — the Day-15/16 api-only baseline). A code-file
    // change here would be a real finding.
    const onlyManifest = changed.length === 1 && changed[0] === 'GENERATION-MANIFEST.txt';
    const wm = web.get('GENERATION-MANIFEST.txt')!.split('\n'), am = api.get('GENERATION-MANIFEST.txt')!.split('\n');
    const n = Math.max(wm.length, am.length);
    const changedLines: string[] = [];
    for (let i = 0; i < n; i++) if (wm[i] !== am[i]) changedLines.push(`${wm[i] ?? ''} | ${am[i] ?? ''}`);
    const allTypeOrFrontend = changedLines.every((l) => /projectType|frontend/.test(l));
    const hasType = changedLines.some((l) => /projectType: Web App.*projectType: API-only/.test(l));
    const hasFrontend = changedLines.some((l) => /frontend: React.*frontend: None/.test(l));
    const okProp = onlyManifest && allTypeOrFrontend && hasType && hasFrontend;
    record(okProp, 'api-only == web-app, MANIFEST-ONLY (type + frontend + recorded default; no code change) — FastAPI, re-derived', `(${changedLines.length} manifest lines)`);
  }
  // description-provided sibling: only the README differs from the blank (frozen) baseline.
  {
    const blank = toMap(await filesOf(buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' })));
    const pm = buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' }); pm.setDescription('A small ticket tracker for the support team.');
    const prov = toMap(await filesOf(pm));
    const changed: string[] = [];
    for (const [p, c] of blank) if (prov.get(p) !== c) changed.push(p);
    const onlyReadme = changed.length === 1 && changed[0] === 'README.md';
    const injected = (prov.get('README.md') ?? '').includes('A small ticket tracker for the support team.') && (prov.get('README.md') ?? '').startsWith('# DemoApp');
    record(onlyReadme && injected, 'description-provided sibling: only README differs + injected (re-derived)');
  }

  // ══ PART 1d — relationship UI==CLI (the 10 TeamTracker via addEntity path) ═══
  process.stdout.write('\n=== PART 1d: UI==CLI relationship path (10 TeamTracker via addEntity) ===\n');
  let uiOk = true;
  for (const db of DATABASES) for (const backend of BACKENDS) {
    const m = createProjectModel({ projectName: 'TeamTracker', projectType: 'Web App', backend, frontend: 'React', database: db, multiUser: true, auth: 'Simple login' });
    m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }, { name: 'description', type: 'String' }] });
    m.addEntity({ name: 'Application', fields: [{ name: 'name', type: 'String', required: true }, { name: 'status', type: 'String' }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
    m.addEntity({ name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }, { name: 'code', type: 'String', unique: true }, { name: 'priority', type: 'Integer' }, { name: 'done', type: 'Boolean' }], relationships: [{ kind: 'belongs-to', target: 'Application' }, { kind: 'belongs-to', target: 'Team' }] });
    m.addEntity({ name: 'Comment', fields: [{ name: 'body', type: 'Text', required: true }], relationships: [{ kind: 'belongs-to', target: 'Ticket' }] });
    const got = await hashOf(m);
    if (got !== FROZEN[`${backend}|${db}|TeamTracker`]) { uiOk = false; process.stdout.write(`  FAIL ${backend}|${db} ${got.slice(0, 16)}\n`); }
  }
  record(uiOk, 'UI-declared TeamTracker (incl. multi-edge Ticket) == 10 baselines byte-for-byte');
  // relationship-free bypass
  {
    let ok = true;
    for (const db of DATABASES) for (const backend of BACKENDS) {
      const m = buildDemoAppModel({ backend, database: db });
      if (!m.getEntities().every((e) => e.relationships.length === 0) || await hashOf(m) !== FROZEN[`${backend}|${db}|DemoApp`]) ok = false;
    }
    record(ok, 'relationship-free DemoApp reproduces baseline (literal bypass)');
  }

  // ══ PART 1e — guards (day12/13/19 round-trips + helper asserts) ══════════════
  process.stdout.write('\n=== PART 1e: guards (style/description round-trip + naming helpers) ===\n');
  const g = createProjectModel({ projectName: 'Guard', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL' });
  g.setStyle({ ...defaultCodingStyle, namingConvention: 'snake_case', architectureDepth: 'simple' });
  g.setDescription('hi');
  const restored = restoreProjectModel(g.getState());
  record(g.getStyle().namingConvention === 'snake_case' && g.getStyle().architectureDepth === 'simple' && g.getDescription() === 'hi' && restored.getDescription() === 'hi', 'setStyle/setDescription survive get/set + restore');
  const helpers = toSnakeCase('dueDate') === 'due_date' && toCamelCase('due_date') === 'dueDate' && applyNaming('startDate', 'snake_case') === 'start_date' && applyNaming('x', 'default') === 'x';
  record(helpers, 'naming helpers (toSnakeCase/toCamelCase/applyNaming) fire correctly');

  // ══ PART 1f — LD-2 (LF-emission guard) + MAXIMAL composition baseline (Eco-Day 1) ══
  process.stdout.write('\n=== PART 1f: LF-emission guard + MAXIMAL composition baseline (Eco-Day 1) ===\n');
  // LD-2: NO emitted file may contain a CR byte. LD-1 makes the generator normalize
  // templates to LF at read; this guard PROVES the guarantee across a representative
  // set (the 20-cell matrix + the maximal cell). A guard that can actually FAIL.
  {
    const sets: GeneratedFile[][] = [];
    for (const db of DATABASES) for (const backend of BACKENDS) sets.push(await filesOf(buildDemoAppModel({ backend, database: db })));
    sets.push(await filesOf(buildMaxCellModel()));
    let firstBad = '';
    for (const files of sets) for (const f of files) if (f.content.includes('\r') && !firstBad) firstBad = f.relPath;
    record(firstBad === '', 'LD-2: no emitted file contains a CR byte (LF emission guaranteed)', firstBad ? `first offender: ${firstBad}` : '');
  }
  // MAXIMAL: the canonical maximal-composition cell (every feature at once) — the
  // reproducible replacement for the retired record-only `33f3ec4b…`. Twice-identical
  // AND equal to the recorded baseline. Additive (moves no frozen hash).
  {
    const a = hashFiles(await filesOf(buildMaxCellModel()));
    const b = hashFiles(await filesOf(buildMaxCellModel()));
    bake('MAXIMAL|MaxCell', a);
    record(a === b && a === MAXIMAL, 'MAXIMAL composition cell twice-identical == recorded baseline', a.slice(0, 16));
  }

  // ══ PART 1g — non-default VERSION baselines (Eco-Day 11) ══════════════════════
  // Framework+version is a first-class pinned input. DEFAULT pins reproduce the frozen
  // matrix (the literal bypass, proven above); a NON-DEFAULT version produces its OWN
  // twice-identical baseline — ADDITIVE (moves no frozen hash). These prove the version
  // flows deterministically into every version-bearing spot; NOT that the combo boots
  // (validity is Day 13 org-policy + Day 18 toolchain).
  process.stdout.write('\n=== PART 1g: non-default version baselines (Eco-Day 11) ===\n');
  {
    for (const [backend, override, expected] of VERSION_BASELINES) {
      const gen = async () => {
        const m = buildDemoAppModel({ backend, database: 'PostgreSQL' });
        m.setVersions(resolveVersions(backend, override));
        return hashFiles(await filesOf(m));
      };
      const a = await gen(); const b = await gen();
      const dflt = hashFiles(await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
      bake(`VERSION|${backend}|${Object.keys(override)[0]}`, a);
      record(a === b && a === expected && a !== dflt, `version baseline ${backend} (${Object.entries(override)[0].join(' ')}) twice-identical == recorded, differs from default`, a.slice(0, 16));
    }
  }

  // ══ PART 1h — org-policy layer determinism (Eco-Day 13) ══════════════════════
  // The org-profile is a PURE input-shaping layer (metadata, not files). Profile-ABSENT
  // must be IDENTITY; a given profile must be twice-identical. A non-hash guard —
  // generation is untouched (the literal bypass is by construction; the 49 above prove it).
  process.stdout.write('\n=== PART 1h: org-policy layer determinism (Eco-Day 13) ===\n');
  {
    const full = fullOptionSet();
    const abs = applyProfile(full, undefined);
    const absId = JSON.stringify(abs.defaults) === JSON.stringify(existingDefaults()) && abs.advisories.length === 0 && Object.keys(abs.optionSet).length === Object.keys(full).length;
    record(absId, 'profile-absent applyProfile == identity (existing defaults, no advisories)');
    const prof = { profileVersion: '1', id: 'guard', dimensions: { database: { ban: ['MySQL'], enforcement: 'hard' as const }, backend: { forceDefault: 'Express', enforcement: 'hard' as const } } };
    const p1 = JSON.stringify(applyProfile(full, prof));
    const p2 = JSON.stringify(applyProfile(full, prof));
    const filtered = applyProfile(full, prof);
    record(p1 === p2 && !filtered.optionSet.database.includes('MySQL') && filtered.defaults.backend === 'Express', 'profile-present applyProfile twice-identical + filters (hard ban MySQL, default Express)');
  }

  // ══ PART 1i — canonical assembleBlueprint: UI==CLI STRUCTURAL (Eco-Day 16) ════
  // The progressive-disclosure wizard backend and the CLI/programmatic path both feed
  // ONE `assembleBlueprint(choices)`. So UI==CLI is STRUCTURAL, not coincidental: the
  // SAME BlueprintChoices object → the SAME canonical ProjectState (canonicalStringify
  // equal, twice-identical) → byte-identical output (buildFileSet is pure over state).
  //  • DEFAULT choices reproduce a FROZEN baseline → simple-mode is a LITERAL BYPASS,
  //    proven THROUGH assembleBlueprint (and equal to the canonical demo builder's state).
  //  • a NON-DEFAULT set (a framework+version pin + an org-policy-FORCED choice) reproduces
  //    its additive VERSION baseline, with NO profile/UI/enforcement metadata in the output.
  // A gate that can actually FAIL (moved state or leaked metadata ⇒ red).
  process.stdout.write('\n=== PART 1i: canonical assembleBlueprint — UI==CLI structural (Eco-Day 16) ===\n');
  {
    const ticket = {
      name: 'Ticket',
      fields: [
        { name: 'title', type: 'String', required: true },
        { name: 'code', type: 'String', unique: true },
        { name: 'priority', type: 'Integer' },
        { name: 'done', type: 'Boolean' },
      ],
    };

    // (a) DEFAULT choices (Express|PostgreSQL|DemoApp) — the simple-mode/accept-defaults
    // set: only the required backbone + entities; no versions/style/integrations/description.
    const defaultChoices: BlueprintChoices = {
      settings: { projectName: 'DemoApp', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
      entities: [ticket],
    };
    const s1 = canonicalStringify(assembleBlueprint(defaultChoices).getState());
    const s2 = canonicalStringify(assembleBlueprint(defaultChoices).getState());
    const cli = canonicalStringify(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }).getState());
    const defHash = await hashOf(assembleBlueprint(defaultChoices));
    const defaultOk = s1 === s2 && s1 === cli && defHash === FROZEN['Express|PostgreSQL|DemoApp'];
    record(defaultOk, 'DEFAULT choices → same state twice == CLI builder == frozen baseline (simple-mode literal bypass, structural)', defHash.slice(0, 16));

    // (b) NON-DEFAULT choices: an org-profile FORCES backend=Express + hard-bans MySQL;
    // the wizard would present Express pre-selected and no MySQL. The user accepts the
    // forced default, picks PostgreSQL, and pins node 20 (a framework+version choice).
    const profile: OrgProfile = { profileVersion: '1', id: 'day16-proof', dimensions: { backend: { forceDefault: 'Express', enforcement: 'hard' }, database: { ban: ['MySQL'], enforcement: 'hard' } } };
    const applied = applyProfile(fullOptionSet(), profile);
    const profileShaped = applied.defaults.backend === 'Express' && !applied.optionSet.database.includes('MySQL');
    const ndChoices: BlueprintChoices = {
      settings: { projectName: 'DemoApp', projectType: 'Web App', backend: applied.defaults.backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
      versions: { node: '20' },
      entities: [ticket],
    };
    const n1 = canonicalStringify(assembleBlueprint(ndChoices).getState());
    const n2 = canonicalStringify(assembleBlueprint(ndChoices).getState());
    const ndFiles = await filesOf(assembleBlueprint(ndChoices));
    const ndHash = hashFiles(ndFiles);
    // No profile/UI/enforcement metadata may appear in ANY generated file (the Day-13 rule).
    const leak = ndFiles.find((f) => /day16-proof|forceDefault|enforcement|advisor/i.test(f.content));
    // The additive Express node-20 baseline (PART 1g / VERSION_BASELINES) — the concrete
    // blueprint alone determines it; the profile only shaped the input (Day-13 provenance).
    const expressNode20 = VERSION_BASELINES.find(([b, o]) => b === 'Express' && o.node === '20')![2];
    const ndOk = profileShaped && n1 === n2 && ndHash === expressNode20 && !leak;
    record(ndOk, 'NON-DEFAULT choices (profile-forced Express + node 20) → twice-identical == version baseline, NO profile metadata in output', ndHash.slice(0, 16) + (leak ? ` LEAK:${leak.relPath}` : ''));
  }

  process.stdout.write(`\n[digest-manifest] ${digestManifest.length} digests asserted (43 frozen + 1 MAXIMAL)\n`);
  if (process.argv.includes('--emit-digests')) for (const d of digestManifest) process.stdout.write(`DIGEST ${d}\n`);
  process.stdout.write(`\nDay-20 regression: ${pass ? 'PASS' : 'FAIL'} (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
