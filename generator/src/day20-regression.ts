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
import { requiredToolchains, parseVersion, compareToPin, buildReport, type ProbeResult } from './detect/detect-core.js';
import { emptyContent, contentFillState, type SlotContent } from './core/slot-content.js';
import { fillContextOf, buildFillSpecs, orchestrateFill, type SlotFiller } from './fill/fill-core.js';
import { ingestDesignTokens, canonicalTokens, figmaEligibility } from './figma/figma-ingest.js';
import { buildCanonicalSdl } from './core/graphql-sdl.js';
import { aiConfigFromEnv, aiFillerFromEnv } from './fill/fill-ai.js';
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

// Worker archetypes (Eco-Day 34) — Express cron-worker + queue-consumer (DemoApp, PG).
// ADDITIVE: each is a NEW twice-identical baseline for a new projectType; neither
// replaces a frozen hash (no fixture uses a worker type, so the default is byte-identical).
const WORKER: Record<string, string> = {
  'Cron Worker': '7f6c09cfad31eadefe12adb31e0f58e6b695a4cb7baaa8bc6bff1db73e15ff59',
  'Queue Consumer': '799ef9873a6ccc28b3d7fd2b537f0c4fb8bc7f5d4304c3db49129c91bd44d6c5',
};

// Worker archetypes for the other 4 stacks (Eco-Day 34 pass 2) — Go/FastAPI/Django/
// Spring × cron/queue (DemoApp, PG). ADDITIVE twice-identical baselines; generation-only
// (no Go/Java toolchain, heavy Python — determinism proven via baselines + domain-reuse,
// not compiled/booted, honest per §4). `rewritten` = the shell files that legitimately
// differ from the api-only twin (entrypoint/manifest/package/readme); `http`/`worker` are
// the swapped-layer file markers proving the entrypoint/route→worker projection.
interface WorkerStack {
  cron: string;
  queue: string;
  rewritten: RegExp;
  http: RegExp; // the HTTP route/controller file the worker removes
  worker: { cron: RegExp; queue: RegExp }; // the worker file added
}
const WORKER_STACKS: Record<string, WorkerStack> = {
  Go: {
    cron: '2166268f486558b1a22c2886d2eb890549628a5fb8520d2339db2042459205f3',
    queue: '70b13ecd004be67de00f96e351ecd476d2dde3b669d2a4329cb76b2e5ecf821e',
    rewritten: /GENERATION-MANIFEST|README|go\.mod|(^|\/)main\.go$/,
    http: /handler_base\.go$/,
    worker: { cron: /\/job\.go$/, queue: /\/handler\.go$/ },
  },
  FastAPI: {
    cron: '8cf75cd681ceefc6d312c072e8d6450a8e1592b86bdbe5ee936dd13e3c59f421',
    queue: '7bbfa9623ca9ec4b94afa323f9ce75bf326a5a6799a1f7ae45c64ddbbe584330',
    rewritten: /GENERATION-MANIFEST|README|requirements\.txt|(^|\/)app\/main\.py$/,
    http: /router_base\.py$/,
    worker: { cron: /\/job\.py$/, queue: /\/handler\.py$/ },
  },
  Django: {
    cron: 'c54249e23203179102b1ac46e9d9ad5dbf77a253522e2e23fc55ba2b1c32fab0',
    queue: '4d13ff89c2618b95497683f08a6f28551c7291cb4dfeee0b192cdac125da0f69',
    rewritten: /GENERATION-MANIFEST|README|requirements\.txt/,
    http: /views_base\.py$/,
    worker: { cron: /\/job\.py$/, queue: /\/handler\.py$/ },
  },
  'Spring Boot': {
    cron: '86a4bf9d9e88d2a57eb3d85f64da39bb4d4a13c545802869fcce57cacf409685',
    queue: '1e0379535672cfd5b0cb791308b5108205f54705a94a37d3040ff35e5bfdbbd1',
    rewritten: /GENERATION-MANIFEST|README|pom\.xml|Application\.java$/,
    http: /ControllerBase\.java$/,
    worker: { cron: /Job\.java$/, queue: /Listener\.java$/ },
  },
};

// The canonical MAXIMAL-composition baseline (Eco-Day 1) — the reproducible
// replacement for the retired, record-only, un-reproducible `33f3ec4b…`. Its input
// is the committed fixture in maxcell-fixture.ts (Express + snake_case + multi-edge FK).
//
// Eco-Day 29 — THE FIRST DELIBERATE RE-BASELINE (§1.1 documented exception):
//   old: 929c379f9e98ec34c3a42bafe814ebb65fffde0820d754176a7c7ab95c825e20
//   new: 366e19d9deda1cafcd6788e7fb703a66c7b113c3c6af2e66de932e08df3b7023
//   why: field-key consistency — the belongs-to FK WIRE key now flows through the SAME
//        applyNaming transform declared fields use, so under snake_case it emits
//        team_id/application_id/ticket_id instead of the old mixed teamId/applicationId/
//        ticketId. The DB column (already team_id) and the internal identifier are
//        unchanged. This is the ONLY frozen fixture combining a non-default naming with
//        an FK, so it is the ONLY baseline that moves (the mixed-key limitation closed).
const MAXIMAL = '366e19d9deda1cafcd6788e7fb703a66c7b113c3c6af2e66de932e08df3b7023';

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

  // ══ PART 1j — toolchain detect-and-guide PURE CORE (Eco-Day 18) ══════════════
  // Day 18 adds a DETECTION layer, NOT a generation change. The pure core (parse /
  // compare-vs-pin / guidance / container-offer / requiredToolchains) is deterministic
  // over CANNED probe outputs — fixture-tested here (no live machine), so its behaviour
  // is CI-enforced. This asserts NOTHING about generation: the 49 digests above already
  // prove buildFileSet is byte-identical (detection is additive; it has no write-path to
  // the blueprint). A non-hash guard — like PART 1h (org-policy).
  process.stdout.write('\n=== PART 1j: toolchain detect-and-guide pure core (Eco-Day 18) ===\n');
  {
    // (a) toolchains ≠ build-deps: a Spring blueprint requires the MACHINE tools
    // (java/maven/node/docker/podman) — NEVER the framework-dep pins (springBoot/express/…).
    const springState = buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL' }).getState();
    const reqTools = requiredToolchains(springState).map((r) => r.tool);
    const hasMachineTools = ['java', 'maven', 'node', 'docker', 'podman'].every((t) => reqTools.includes(t));
    const noBuildDeps = !reqTools.some((t) => ['springBoot', 'express', 'fastapi', 'django'].includes(t));
    const javaPinned = requiredToolchains(springState).find((r) => r.tool === 'java')?.pin === '21'; // the Day-11 pin
    record(hasMachineTools && noBuildDeps && javaPinned, 'requiredToolchains probes MACHINE tools (java pin 21, maven, node, docker/podman) — NOT framework-dep pins');

    // (b) parseVersion across the real output shapes (java on STDERR is the gotcha).
    const pv =
      parseVersion('java', '', 'openjdk version "21.0.5" 2024-10-15\nOpenJDK Runtime Environment') === '21.0.5' &&
      parseVersion('node', 'v22.14.0\n', '') === '22.14.0' &&
      parseVersion('python', 'Python 3.12.4\n', '') === '3.12.4' &&
      parseVersion('go', 'go version go1.22.1 windows/amd64\n', '') === '1.22.1' &&
      parseVersion('maven', 'Apache Maven 3.9.6 (bc0240f)\n', '') === '3.9.6' &&
      parseVersion('pip', 'pip 24.0 from C:\\... (python 3.12)\n', '') === '24.0' &&
      parseVersion('docker', 'Docker version 27.0.3, build 7d4bcd8\n', '') === '27.0.3' &&
      parseVersion('podman', 'podman version 5.0.1\n', '') === '5.0.1';
    record(pv, 'parseVersion extracts the version from each probe shape (incl. java on STDERR)');

    // (c) compareToPin semantics — pin granularity drives the compare (heuristic).
    const cp =
      compareToPin('21.0.5', '21') === 'present' &&   // major pin: patch/minor ignored
      compareToPin('20.0.2', '21') === 'mismatch' &&  // wrong major
      compareToPin(null, '21') === 'missing' &&       // not found
      compareToPin('3.12.4', '3.12') === 'present' && // major.minor pin
      compareToPin('3.11.9', '3.12') === 'mismatch' &&
      compareToPin('1.22.1', '1.22') === 'present' &&
      compareToPin('3.9.6', null) === 'present';      // presence-only tool (no pin)
    record(cp, 'compareToPin present/missing/mismatch by pin granularity (major | major.minor)');

    // (d) buildReport composes a full report — present/mismatch/guidance/container offer.
    const probes = new Map<string, ProbeResult>([
      ['java', { tool: 'java', found: true, rawStdout: '', rawStderr: 'openjdk version "21.0.5" 2024-10-15' }],
      ['maven', { tool: 'maven', found: true, rawStdout: 'Apache Maven 3.9.6\n', rawStderr: '' }],
      ['node', { tool: 'node', found: true, rawStdout: 'v20.11.0\n', rawStderr: '' }], // mismatch vs pin 22
      ['docker', { tool: 'docker', found: true, rawStdout: 'Docker version 27.0.3, build 7d4bcd8\n', rawStderr: '' }],
      ['podman', { tool: 'podman', found: false, rawStdout: '', rawStderr: '' }],
    ]);
    const report = buildReport(springState, probes);
    const java = report.tools.find((t) => t.tool === 'java')!;
    const node = report.tools.find((t) => t.tool === 'node')!;
    const reportOk =
      java.status === 'present' && java.guidance === null &&
      node.status === 'mismatch' && !!node.guidance && /nodejs\.org/.test(node.guidance.installUrl) &&
      report.container.available === true && report.container.runtime === 'docker' &&
      report.summary.canBuildNatively === false && // node mismatch ⇒ can't build natively (heuristic)
      /not a guarantee/i.test(report.summary.note); // determinism ≠ validity carried in the report
    record(reportOk, 'buildReport: present(java)/mismatch(node+link)/container-offer(docker); canBuildNatively=false; validity-caveat carried');

    // (e) missing runtime + no container ⇒ guidance link + honest "install a runtime" offer (never silent).
    const noneProbes = new Map<string, ProbeResult>([
      ['java', { tool: 'java', found: false, rawStdout: '', rawStderr: '' }],
    ]);
    const noneReport = buildReport(springState, noneProbes);
    const javaMissing = noneReport.tools.find((t) => t.tool === 'java')!;
    const missOk =
      javaMissing.status === 'missing' && !!javaMissing.guidance && /adoptium\.net/.test(javaMissing.guidance.installUrl) &&
      noneReport.container.available === false && /Install Docker or Podman/i.test(noneReport.container.message);
    record(missOk, 'missing java → Adoptium link (never silent); no container runtime → install-a-runtime offer');
  }

  // ══ PART 1k — typed content SLOTS: the creative mechanism (Eco-Day 21) ═══════
  // Day 21 adds the FIRST creative-side capability: a byte-identical structural SHELL
  // with clearly-marked TYPED placeholders, and a SEPARATE content layer the shell never
  // sees. The default (no slots) is a literal bypass — already proven by the 49 digests
  // above reproducing byte-identical (slots is additive; empty ⇒ no README change). This
  // PART records the slots-DECLARED additive baseline + proves the load-bearing new
  // property: the shell is byte-identical across empty/partial/full CONTENT states.
  process.stdout.write('\n=== PART 1k: typed content slots (Eco-Day 21) ===\n');
  {
    const decls = [
      { id: 'hero.tagline', type: 'tagline' },
      { id: 'app.overview', type: 'overview' },
      { id: 'x.mystery', type: 'mystery' }, // unknown type → UnknownSection fallback
    ];
    const dfltFiles = await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }));
    const withSlots = () => { const m = buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }); m.setSlots(decls); return m; };

    // (a) slots-DECLARED additive baseline — twice-identical == recorded, differs from default.
    const a = hashFiles(await filesOf(withSlots()));
    const b = hashFiles(await filesOf(withSlots()));
    const dfltHash = hashFiles(dfltFiles);
    bake('SLOTS|Express|declared', a);
    record(a === b && a === 'f85da4db54491299eaac88968f66330c973e63e5c332d7013d85fd3e70284e2e' && a !== dfltHash,
      'slots-DECLARED (content empty) twice-identical == recorded additive baseline, differs from default', a.slice(0, 16));

    // (b) Law 21 (creative path): the RUNNABLE shell is byte-identical to the no-slots
    // default — slots add ONLY inert README documentation. A complete, valid project with
    // slots empty (no runnable code touched).
    const slotFiles = await filesOf(withSlots());
    const dmap = new Map(dfltFiles.map((f) => [f.relPath, f.content]));
    const changed = slotFiles.filter((f) => dmap.get(f.relPath) !== f.content).map((f) => f.relPath);
    const added = slotFiles.filter((f) => !dmap.has(f.relPath));
    record(changed.length === 1 && changed[0] === 'README.md' && added.length === 0,
      'valid shell with empty slots: ONLY README.md changes vs default (runnable code untouched — Law 21 creative path)', `changed=[${changed.join(',')}]`);

    // (c) the type→component map + UnknownSection fallback are visible in the real output.
    const readme = slotFiles.find((f) => f.relPath === 'README.md')!.content;
    const mapOk =
      /THRAKSHA-SLOT id="hero\.tagline" type="tagline"/.test(readme) &&   // known type → its component
      /THRAKSHA-SLOT id="app\.overview" type="overview"/.test(readme) &&
      /unrecognized type "mystery"/.test(readme) &&                       // unknown type → UnknownSection
      !/\r/.test(readme);                                                  // LF only (LD-2)
    record(mapOk, 'type→component map renders known types + UnknownSection fallback for unknown type (LF, clearly-marked)');

    // (d) SHELL BYTE-IDENTICAL ACROSS empty/partial/full CONTENT (by construction). The
    // content layer is NEVER an argument to buildFileSet — building three content states
    // and generating the shell yields the SAME bytes. Content cannot vary the shell.
    const empty = emptyContent(decls);
    const partial: SlotContent = { ...empty, 'hero.tagline': { value: 'Ship it faster' } };
    const full: SlotContent = { 'hero.tagline': { value: 'Ship it faster' }, 'app.overview': { value: 'A demo app.' }, 'x.mystery': { value: 'anything' } };
    const states: [string, SlotContent][] = [['empty', empty], ['partial', partial], ['full', full]];
    let shellInvariant = true;
    for (const [, content] of states) {
      // The shell is generated from the model (declarations) ALONE; `content` is inspected
      // by the SEPARATE layer but never passed to buildFileSet — so the hash cannot move.
      void contentFillState(decls, content);
      if (hashFiles(await filesOf(withSlots())) !== a) shellInvariant = false;
    }
    const fillStatesOk =
      contentFillState(decls, empty) === 'empty' &&
      contentFillState(decls, partial) === 'partial' &&
      contentFillState(decls, full) === 'full';
    record(shellInvariant && fillStatesOk,
      'shell BYTE-IDENTICAL across empty/partial/full content (by construction — content never an argument to buildFileSet)');
  }

  // ══ PART 1l — creative slot FILL pure core (Eco-Day 23) ══════════════════════
  // Day 23 adds the FIRST AI touchpoint — but the PURE fill core is AI-FREE: it builds fill
  // SPECS from the blueprint + declarations and ORCHESTRATES an INJECTED filler into the
  // separate SlotContent layer. Fixture-tested here with a FAKE deterministic filler (no AI,
  // no network, no key) — the PART-1j analogue, CI-enforced. This asserts NOTHING about the
  // shell: the 50 digests above already prove buildFileSet is byte-identical (fill has no
  // write-path to generation — 0 refs). The LIVE AI edge (fill-ai.ts) is NOT exercised here.
  process.stdout.write('\n=== PART 1l: creative slot fill pure core (Eco-Day 23) ===\n');
  {
    const decls = [
      { id: 'hero.tagline', type: 'tagline' },
      { id: 'app.overview', type: 'overview' },
    ];
    const state = buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }).getState();

    // (a) fillContextOf/buildFillSpecs derive the right specs (one per slot, in order) purely.
    const ctx = fillContextOf(state);
    const specs = buildFillSpecs(decls, ctx);
    const specsOk =
      ctx.projectName === 'DemoApp' && ctx.backend === 'Express' && ctx.entities.includes('Ticket') &&
      specs.length === 2 && specs[0].slotId === 'hero.tagline' && specs[0].type === 'tagline' &&
      specs[1].slotId === 'app.overview' && specs[1].context.projectName === 'DemoApp';
    record(specsOk, 'buildFillSpecs derives one spec per slot (id+type+project context) purely from the blueprint');

    // (b) orchestrateFill over a FAKE deterministic filler → the expected SlotContent, keyed
    // by slotId. Proves the core is deterministic GIVEN a deterministic filler (no AI here).
    const fakeFiller: SlotFiller = async (s) => `FILL[${s.type}]:${s.context.projectName}`;
    const c1 = await orchestrateFill(specs, fakeFiller);
    const c2 = await orchestrateFill(specs, fakeFiller);
    const orchOk =
      JSON.stringify(c1) === JSON.stringify(c2) && // deterministic given the filler
      c1['hero.tagline'].value === 'FILL[tagline]:DemoApp' &&
      c1['app.overview'].value === 'FILL[overview]:DemoApp' &&
      Object.keys(c1).length === 2; // writes ONLY the SlotContent keys — nothing else
    record(orchOk, 'orchestrateFill(specs, fakeFiller) → expected SlotContent (deterministic given the filler; writes only content keys)');

    // (c) graceful degradation (Law 21): a filler that throws / returns '' leaves that slot
    // EMPTY — never a crash, never a partial. A failed/absent fill degrades to "unfilled".
    const flakyFiller: SlotFiller = async (s) => { if (s.type === 'tagline') throw new Error('no key'); return ''; };
    const cg = await orchestrateFill(specs, flakyFiller);
    const gracefulOk =
      cg['hero.tagline'].value === '' && cg['app.overview'].value === '' &&
      contentFillState(decls, cg) === 'empty';
    record(gracefulOk, 'a throwing/empty filler degrades to unfilled content (no crash — Law 21 creative path)');

    // (d) DETERMINISM ≠ AI-OUTPUT: two DIFFERENT fillers (as a live AI would vary) produce
    // DIFFERENT content — but the SHELL is byte-identical (content is not a buildFileSet input).
    const varyA: SlotFiller = async () => 'Headline A';
    const varyB: SlotFiller = async () => 'Headline B';
    const cA = await orchestrateFill(specs, varyA);
    const cB = await orchestrateFill(specs, varyB);
    const withSlotsModel = () => { const m = buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }); m.setSlots(decls); return m; };
    const shellA = hashFiles(await filesOf(withSlotsModel()));
    const shellB = hashFiles(await filesOf(withSlotsModel()));
    const dncOk =
      cA['hero.tagline'].value !== cB['hero.tagline'].value && // content VARIES (creative, non-deterministic)
      shellA === shellB;                                       // shell INVARIANT (deterministic, gated)
    record(dncOk, 'determinism ≠ AI-output: varying fills change CONTENT but the shell is byte-identical (content outside the backstop)');

    // (e) DEFAULT OFF is STRUCTURAL (network-free proof): no key ⇒ aiConfigFromEnv/
    // aiFillerFromEnv return null ⇒ NO filler is constructed ⇒ NO call site exists. A key ⇒
    // config with the developer's endpoint/model. We build the filler with a key but NEVER
    // call it (no network in the harness) — the point is the call SITE only exists with a key.
    const noKey = aiConfigFromEnv({} as NodeJS.ProcessEnv);
    const withKey = aiConfigFromEnv({ THRAKSHA_AI_FILL_KEY: 'k' } as unknown as NodeJS.ProcessEnv);
    const defaultOffOk =
      noKey === null &&                                   // no key ⇒ no config ⇒ no call, ever
      aiFillerFromEnv({} as NodeJS.ProcessEnv) === null && // no key ⇒ no filler constructed
      withKey !== null && withKey.apiKey === 'k' &&        // key ⇒ the developer's config
      typeof aiFillerFromEnv({ THRAKSHA_AI_FILL_KEY: 'k' } as unknown as NodeJS.ProcessEnv) === 'function';
    record(defaultOffOk, 'DEFAULT OFF is structural: no key → no filler / no call site (a key → the developer’s config); Thraksha ships no key');
  }

  // ══ PART 1m — has-many relationships: the reverse projection (Eco-Day 25) ═════
  // has-many is the REVERSE of the belongs-to FK. NO schema change: the child already
  // carries <parent>_id; has-many adds ONLY a parent-side collection accessor
  // (GET /api/<parents>/:id/<children>) querying the child by the existing FK. The
  // default (no has-many) is a literal bypass — no frozen fixture declares has-many, so
  // the 50 digests above are byte-identical. This records the additive has-many baselines
  // (EXPRESS this pass — the booted stack; the other 4 stacks are staged, see the report).
  process.stdout.write('\n=== PART 1m: has-many reverse projection (Eco-Day 25 — 5 stacks × 2 DBs) ===\n');
  {
    // A has-many fixture: Team has-many Application; Application belongs-to Team (the FK on the child).
    const hm = (backend: string, database: string) => {
      const m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database, multiUser: true, auth: 'Simple login' });
      m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Application' }] });
      m.addEntity({ name: 'Application', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
      return m;
    };
    // The belongs-to-ONLY twin (same entities, NO has-many on Team) — to prove has-many
    // changes ONLY the parent-side accessor, never the schema/child code.
    const boOnly = (backend: string, database: string) => {
      const m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database, multiUser: true, auth: 'Simple login' });
      m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }] });
      m.addEntity({ name: 'Application', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
      return m;
    };

    // (a) additive baselines: ALL 5 STACKS × {PostgreSQL, MySQL}, twice-identical == recorded.
    // Same query-based reverse accessor pattern per stack (pass 2 completed Go/Python/Django/Spring).
    const HASMANY: Record<string, Record<string, string>> = {
      Express: { PostgreSQL: '46662579ff6b0905e46c1d41e40ef7787921d7188146a9c78b6dfc4f90f137f8', MySQL: '0daab037f5663e3abddab93e721a78d17adada5c652dd2801bb0f576f0f04c53' },
      Go: { PostgreSQL: '44576771c71cf31dc7e15d16be4c98f8bf30f4d8eaf783f58d261e3f4a3c687c', MySQL: '4b1ed9529290eae698c656d64adf4d087f9ea96fb1fe7b1e84e7a5da0dc89786' },
      FastAPI: { PostgreSQL: '7ec9c914f34c72cb9905b82a299202c3e7f042789df471aea1fb12e1fc8bd1cc', MySQL: '29a0bdcee82c9d7471a5e913550e14f6fdfb9302457c33ed908f1785a2353ac8' },
      Django: { PostgreSQL: 'e5d3984ebc5387f245098eed4bb70a7a51f3263efed5aad81f20f37fc86901d1', MySQL: 'b0aaae8fe10d648d45b0aaabc52809bff9b5ab773b3333b59c933ee16901343a' },
      'Spring Boot': { PostgreSQL: '54cc1f022d3cb475148b3dac078000d92851be9cee8f531e05edc463ce9cc6a8', MySQL: '371a36124e674da55f41dae4eb11b8fb9068ef058dee8fc2bfa84aa6e03de00e' },
    };
    for (const backend of Object.keys(HASMANY)) {
      for (const db of DATABASES) {
        const a = hashFiles(await filesOf(hm(backend, db)));
        const b = hashFiles(await filesOf(hm(backend, db)));
        bake(`HASMANY|${backend}|${db}`, a);
        record(a === b && a === HASMANY[backend][db], `${backend}|${db} has-many twice-identical == recorded additive baseline`, a.slice(0, 16));
      }
    }

    // (b) NO SCHEMA CHANGE (all 5 stacks): vs the belongs-to-only twin, the ONLY files that
    // differ are PARENT-side (route/controller/view/service) + the manifest — NEVER a
    // migration/SQL/model (schema) file, and NEVER a file under the CHILD (application) dir.
    // The FK already exists; has-many is a pure parent-side accessor.
    for (const backend of Object.keys(HASMANY)) {
      const hmFiles = await filesOf(hm(backend, 'PostgreSQL'));
      const boMap = new Map((await filesOf(boOnly(backend, 'PostgreSQL'))).map((f) => [f.relPath, f.content]));
      const changed = hmFiles.filter((f) => boMap.get(f.relPath) !== f.content).map((f) => f.relPath);
      const schemaDiff = changed.filter((p) => /migration|\.sql$|models\.py$|__create/i.test(p));
      const childDiff = changed.filter((p) => /(^|\/)application|\bApplication\b/i.test(p) && !/manifest/i.test(p));
      record(schemaDiff.length === 0 && childDiff.length === 0,
        `${backend}: NO schema change + child untouched — only the parent accessor + manifest differ`, `changed=[${changed.join(',')}]`);
    }

    // (c) the reverse accessor + the manifest note are present in the real output (per stack).
    const expFiles = await filesOf(hm('Express', 'PostgreSQL'));
    const routes = expFiles.find((f) => /team\.routes\.base\.js$/.test(f.relPath))!.content;
    const manifest = expFiles.find((f) => f.relPath === 'GENERATION-MANIFEST.txt')!.content;
    const goHb = (await filesOf(hm('Go', 'PostgreSQL'))).find((f) => /team\/handler_base\.go$/.test(f.relPath))!.content;
    const pyRt = (await filesOf(hm('FastAPI', 'PostgreSQL'))).find((f) => /team\/router_base\.py$/.test(f.relPath))!.content;
    const djVw = (await filesOf(hm('Django', 'PostgreSQL'))).find((f) => /team\/views_base\.py$/.test(f.relPath))!.content;
    const spCt = (await filesOf(hm('Spring Boot', 'PostgreSQL'))).find((f) => /TeamControllerBase\.java$/.test(f.relPath))!.content;
    const projOk =
      /router\.get\('\/:id\/applications'/.test(routes) &&                                             // Express
      /Team has-many Application: GET \/api\/teams\/:id\/applications/.test(manifest) &&
      /mux\.HandleFunc\("GET \/api\/teams\/\{id\}\/applications"/.test(goHb) &&                          // Go
      /@router\.get\("\/\{item_id\}\/applications"\)/.test(pyRt) &&                                      // FastAPI
      /@action\(detail=True, url_path="applications"\)/.test(djVw) &&                                    // Django
      /@GetMapping\("\/\{id\}\/applications"\)/.test(spCt);                                              // Spring
    record(projOk, 'reverse accessor generated in all 5 stacks: GET /api/teams/:id/applications over the existing team_id FK');

    // (d) UI==CLI (Day 16 seam): a has-many declared through assembleBlueprint == the
    // programmatic createProjectModel+addEntity path, byte-identical (structural).
    const choices: BlueprintChoices = {
      settings: { projectName: 'DemoApp', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
      entities: [
        { name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Application' }] },
        { name: 'Application', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] },
      ],
    };
    const uiHash = hashFiles(await filesOf(assembleBlueprint(choices)));
    const cliHash = hashFiles(await filesOf(hm('Express', 'PostgreSQL')));
    record(uiHash === cliHash && uiHash === HASMANY.Express.PostgreSQL, 'UI==CLI for has-many: assembleBlueprint == programmatic path, byte-identical', uiHash.slice(0, 16));
  }

  // ══ PART 1n — decimal/money field type: exact NUMERIC(p,s) + string wire (Eco-Day 27) ══
  // Exact decimals: NUMERIC(precision, scale) storage (never float, never `money`; scale ≥4
  // default) with the value carried as a STRING on the wire — no float drift. The default
  // (no decimal field) is a literal bypass — no frozen fixture uses Decimal, so the 60
  // digests above are byte-identical. This records the additive decimal baselines (5×2).
  process.stdout.write('\n=== PART 1n: decimal/money field type (Eco-Day 27 — 5 stacks × 2 DBs) ===\n');
  {
    // A decimal fixture: Product with a default-scale `price` (19,4) + a custom-precision
    // `cost` (10,2) — exercising both the default and configurable precision/scale.
    const dec = (backend: string, database: string) => {
      const m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database, multiUser: true, auth: 'Simple login' });
      m.addEntity({ name: 'Product', fields: [
        { name: 'name', type: 'String', required: true },
        { name: 'price', type: 'Decimal', required: true },
        { name: 'cost', type: 'Decimal', validation: { precision: 10, scale: 2 } },
      ] });
      return m;
    };
    const DECIMAL: Record<string, Record<string, string>> = {
      'Spring Boot': { PostgreSQL: '1dec96da8fc6cdc458c525f4856e9cf42cf7a6aaee6ac9dcc4b63c62b4fc18c7', MySQL: 'b47c92f49ed12b1b46e262356df79d3d5e5614dbfb35e317ffad919693abbfbc' },
      Express: { PostgreSQL: 'cf8f18639a09493fab613d0cb7a302146e4f8f47d43a320c2df87b8e6ea166ce', MySQL: '81f0ff4d061f64c6f0aa5acd2b7445d406203800742e2fc32a97e65d70f002b3' },
      FastAPI: { PostgreSQL: '8c83311b8fa4e9379d29499289cc834f6d85143013006de4d9a191630e0f1668', MySQL: '7fe5a209ea989bc50e5a98a3473358603ca9f4f982114786d506197c01162c6d' },
      Django: { PostgreSQL: '338c8edb756c7f8003bb07aeac1fbb8e79a42e419a99e1fed5fc847bacac6969', MySQL: '16d94375aa41f209d3f3924ad106f8bda560d5ab23ca918314a7f43f4e538df4' },
      Go: { PostgreSQL: 'f9316be00c973cf93afe9f6a67f128a658324f6a87aa827afd79f49754c4f676', MySQL: 'f0747e84dfc3ce0038b286fabb1b1acc189ca5c3b25fcafd417281eb29fb6cc5' },
    };
    // (a) additive baselines: 5 stacks × 2 DBs, twice-identical == recorded.
    for (const backend of Object.keys(DECIMAL)) {
      for (const db of DATABASES) {
        const a = hashFiles(await filesOf(dec(backend, db)));
        const b = hashFiles(await filesOf(dec(backend, db)));
        bake(`DECIMAL|${backend}|${db}`, a);
        record(a === b && a === DECIMAL[backend][db], `${backend}|${db} decimal twice-identical == recorded additive baseline`, a.slice(0, 16));
      }
    }

    // (b) EXACT storage — NUMERIC(p,s) everywhere, NEVER float/double/money (the whole point).
    // Default price → (19,4); custom cost → (10,2). Django uses DecimalField(max_digits, decimal_places).
    for (const backend of Object.keys(DECIMAL)) {
      const pg = await filesOf(dec(backend, 'PostgreSQL'));
      const my = await filesOf(dec(backend, 'MySQL'));
      const all = [...pg, ...my].map((f) => f.content).join('\n');
      const hasNumeric = backend === 'Django'
        ? /DecimalField\(max_digits=19, decimal_places=4[,)]/.test(all) && /DecimalField\(max_digits=10, decimal_places=2[,)]/.test(all)
        : /NUMERIC\(19, 4\)/.test(all) && /DECIMAL\(19, 4\)/.test(all) && /NUMERIC\(10, 2\)/.test(all);
      const noFloat = !/\b(FLOAT|DOUBLE|REAL)\b/.test(all) && !/\bmoney\b/.test(all);
      record(hasNumeric && noFloat, `${backend}: exact NUMERIC(p,s) storage (default 19/4 + configurable 10/2), NEVER float/money`);
    }

    // (c) STRING WIRE — the value never passes through a float (the exactness guarantee).
    const spring = (await filesOf(dec('Spring Boot', 'PostgreSQL'))).find((f) => /ProductDto\.java$/.test(f.relPath))!.content;
    const express = (await filesOf(dec('Express', 'PostgreSQL'))).find((f) => /product\.dto\.js$/.test(f.relPath))!.content;
    const go = (await filesOf(dec('Go', 'PostgreSQL'))).find((f) => /product\.go$/.test(f.relPath))!.content;
    const stringWire =
      /@JsonSerialize\(using = ToStringSerializer\.class\)/.test(spring) &&   // Spring: BigDecimal → string
      /must be a decimal string/.test(express) && /String\(body\./.test(express) && // Express: numeric-string + string storage
      /Price string/.test(go);                                                // Go: string end-to-end
    record(stringWire, 'string wire: Spring BigDecimal→ToStringSerializer, Express numeric-string, Go string (no float drift)');
  }

  // ══ PART 1o — field-key consistency: FK wire keys honor the naming convention (Eco-Day 29) ══
  // Day 29 (THE FIRST DELIBERATE RE-BASELINE): the belongs-to FK WIRE key now flows through the
  // SAME applyNaming transform declared fields use. Under snake_case, all 5 stacks now emit a
  // snake_case FK wire key (Express/Go/Spring via the fix — they used camelCase; Python/Django
  // ALREADY snake, untouched). The DB column + internal identifier are unchanged. These are
  // ADDITIVE snake_case+FK coverage baselines (proving the fix across all 5 stacks); the ONLY
  // frozen baseline that MOVED is MAXIMAL (see the MAXIMAL constant comment — 929c379f→366e19d9).
  process.stdout.write('\n=== PART 1o: field-key consistency — FK wire keys honor the convention (Eco-Day 29) ===\n');
  {
    // A snake_case + belongs-to fixture: Application belongs-to Team (FK column team_id).
    const fk = (backend: string) => {
      const m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
      m.setStyle({ formatting: { indent: 'default' }, namingConvention: 'snake_case', architectureDepth: 'default' });
      m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }] });
      m.addEntity({ name: 'Application', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
      return m;
    };
    const FKKEY: Record<string, string> = {
      'Spring Boot': 'ad90ab93889f899b7042bf7c7c62f402088a6b7e6361d1e3652dfb24e837ae5c',
      Express: 'f709a8dc428238d3f9a10824e45ace2b0875ddc0ba2a49793e51495f9ac22520',
      FastAPI: '2e71abada1eca69bd27919f1ea4bb32d1d036a5496ef4263a566836eb9fa6d8b',
      Django: '50b556789dea75995834d4d2dcd0c79471da9cdea98ec98d8ed9765c5d0753c4',
      Go: '4a14711969d7a7c83655c0b832ea0124d5b4516d758abe9384c7ed6f88c46ad4',
    };
    // (a) additive baselines: snake_case+FK × 5 stacks, twice-identical == recorded.
    for (const backend of Object.keys(FKKEY)) {
      const a = hashFiles(await filesOf(fk(backend)));
      const b = hashFiles(await filesOf(fk(backend)));
      bake(`FKKEY|${backend}|snake`, a);
      record(a === b && a === FKKEY[backend], `${backend} snake_case+FK twice-identical == recorded additive baseline`, a.slice(0, 16));
    }

    // (b) the FK WIRE key is snake_case (consistent with declared fields) in every stack —
    // the mixed-key limitation closed. The DB column team_id is unchanged (always snake).
    const wireKeyOf = async (backend: string, suffix: string) =>
      (await filesOf(fk(backend))).find((f) => f.relPath.endsWith(suffix))!.content;
    const exDto = await wireKeyOf('Express', 'application/application.dto.js');
    const goHf = await wireKeyOf('Go', 'application/application.go');
    const spDto = await wireKeyOf('Spring Boot', 'application/ApplicationDto.java');
    const pySch = await wireKeyOf('FastAPI', 'application/schemas.py');
    const djSer = await wireKeyOf('Django', 'application/serializers.py');
    const consistent =
      /body\.team_id/.test(exDto) && !/body\.teamId\b/.test(exDto) &&      // Express: wire key team_id (internal data.teamId stays)
      /json:"team_id"/.test(goHf) &&                                        // Go: json tag team_id
      /@JsonProperty\("team_id"\)/.test(spDto) &&                           // Spring: @JsonProperty("team_id")
      /team_id:\s*(int|Optional\[int\])/.test(pySch) &&                     // FastAPI: schema field team_id
      /"team"/.test(djSer);                                                 // Django: relation name (snake), already consistent
    record(consistent, 'FK wire key is snake_case in all 5 stacks (Express/Go/Spring fixed; Python/Django already) — mixed-key closed');
  }

  // ══ PART 1p — Figma token ingestion: the deterministic round-trip (Eco-Day 31) ══════
  // Phase 3 opens a NEW INPUT SURFACE: Figma → structured W3C design tokens → a deterministic
  // model input → a canonical design-tokens.json. The pure ingestion CORE (figma-ingest.ts) is
  // fixture-tested here with a CANNED Figma export (no Figma runtime — that lives at the
  // impure edge). The default (no designTokens) is a literal bypass — the 75 digests above
  // reproduce byte-identical (the layer is additive). Eligible → tokens; ineligible → SLOTS.
  process.stdout.write('\n=== PART 1p: Figma token ingestion round-trip (Eco-Day 31) ===\n');
  {
    // A canned Figma export (W3C token JSON), deliberately UNSORTED to prove canonicalization.
    const TOKENS = {
      spacing: { md: { $type: 'dimension', $value: '16px' }, sm: { $type: 'dimension', $value: '8px' } },
      color: { primary: { $type: 'color', $value: '#3366ff' }, surface: { $type: 'color', $value: '#ffffff' } },
      font: { body: { $type: 'fontFamily', $value: 'Inter' } },
    };

    // (a) ingestDesignTokens → canonical, sorted, deterministic (input order never leaks).
    const dt = ingestDesignTokens(TOKENS);
    const keys = Object.keys(dt).sort();
    const canon1 = canonicalTokens(dt);
    const canon2 = canonicalTokens(ingestDesignTokens(TOKENS));
    const ingestOk =
      JSON.stringify(keys) === '["color.primary","color.surface","font.body","spacing.md","spacing.sm"]' &&
      dt['color.primary'].type === 'color' && dt['color.primary'].value === '#3366ff' &&
      dt['spacing.sm'].type === 'dimension' && dt['spacing.sm'].value === '8px' &&
      canon1 === canon2 && /"color.primary"[\s\S]*"spacing.sm"/.test(canon1); // sorted order
    record(ingestOk, 'ingestDesignTokens: W3C token JSON → canonical DesignTokens (sorted, deterministic, no order leak)');

    // (b) the ELIGIBILITY gate — eligible → tokens; ineligible → SLOTS (the Phase-2 path).
    const elig = figmaEligibility({ tokens: TOKENS, autoLayout: true, namedVariables: true });
    const inelig = figmaEligibility({ tokens: TOKENS, autoLayout: false, namedVariables: true, unmappable: ['HeroBanner'] });
    const eligOk =
      elig.eligible === true && Object.keys(elig.tokens).length === 5 &&
      inelig.eligible === false && inelig.slots.some((s) => s.id === 'figma.review' && s.type === 'design-review') &&
      inelig.slots.some((s) => s.id === 'figma.HeroBanner') && /not generator-eligible.*no Auto Layout.*routed to slots/.test(inelig.reason);
    record(eligOk, 'eligibility: eligible (auto-layout + named vars) → tokens; ineligible → SLOTS (explicit, never guessed)');

    // (c) ROUND-TRIP DETERMINISM: same tokens → byte-identical model input → byte-identical
    // generated shell (twice-identical); a Figma-derived project → its own additive baseline.
    const figProject = () => { const m = createProjectModel({ projectName: 'Themed', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' }); m.setDesignTokens(dt); m.addEntity({ name: 'Item', fields: [{ name: 'name', type: 'String', required: true }] }); return m; };
    const a = hashFiles(await filesOf(figProject()));
    const b = hashFiles(await filesOf(figProject()));
    bake('FIGMA|Express|themed', a);
    const files = await filesOf(figProject());
    const tokensFile = files.find((f) => f.relPath === 'design-tokens.json');
    record(a === b && a === 'f9a8e7c97d9c52aa7cdb58f7ae594af7af9481c91cd58d114b9d0e12b0bf2030' && !!tokensFile,
      'round-trip: Figma-derived project twice-identical == recorded additive baseline (design-tokens.json emitted)', a.slice(0, 16));

    // (d) DEFAULT = LITERAL BYPASS: no designTokens ⇒ NO design-tokens.json (the artifact is
    // additive; its absence is what keeps the frozen backstop byte-identical).
    const noFig = await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }));
    record(!noFig.some((f) => f.relPath === 'design-tokens.json'), 'default (no Figma) → NO design-tokens.json artifact (additive; frozen backstop byte-identical)');

    // (e) UI==CLI: designTokens through assembleBlueprint == the programmatic path, byte-identical.
    const choices: BlueprintChoices = {
      settings: { projectName: 'Themed', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
      designTokens: dt,
      entities: [{ name: 'Item', fields: [{ name: 'name', type: 'String', required: true }] }],
    };
    const ui = hashFiles(await filesOf(assembleBlueprint(choices)));
    record(ui === a, 'UI==CLI for Figma tokens: assembleBlueprint == programmatic path, byte-identical', ui.slice(0, 16));
  }

  // ══ PART 1q — worker archetypes: cron-worker + queue-consumer (Eco-Day 34) ═══
  // Two new projectType values as ENTRYPOINT/LIFECYCLE projections that REUSE the
  // domain layer and swap only the HTTP entrypoint + route/controller layer. Express
  // is boot-verified (see the day34 boot driver); the other 4 stacks are staged
  // (generation-only, pass 2 — no Go/Java toolchain, heavy Python; honest per §4).
  process.stdout.write('\n=== PART 1q: worker archetypes — cron-worker + queue-consumer (Eco-Day 34 — Express) ===\n');
  {
    // The HTTP entrypoint + entity route/controller layer the workers swap out.
    const HTTP_SWAPPED = new Set([
      'src/server.js',
      'src/app.js',
      'src/entities/ticket/ticket.controller.base.js',
      'src/entities/ticket/ticket.routes.base.js',
      'src/entities/ticket/ticket.routes.js',
    ]);
    // Files the projection LEGITIMATELY rewrites (not domain): the manifest lists
    // files, package.json repoints main/start (+amqplib for queue), README swaps run docs.
    const REWRITTEN = new Set(['GENERATION-MANIFEST.txt', 'package.json', 'README.md']);
    const workerAdded: Record<string, string[]> = {
      'Cron Worker': ['src/worker.js', 'src/scheduler.js', 'src/entities/ticket/ticket.job.js'],
      'Queue Consumer': ['src/worker.js', 'src/dispatcher.js', 'src/broker.js', 'src/entities/ticket/ticket.handler.js'],
    };
    const apiTwin = toMap(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'API-only' })));

    for (const pt of ['Cron Worker', 'Queue Consumer'] as const) {
      const kind: 'cron' | 'queue' = pt === 'Cron Worker' ? 'cron' : 'queue';
      // (a) twice-identical == recorded additive baseline.
      const a = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: pt })));
      const b = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: pt })));
      bake(`worker|Express|${pt}`, a);
      record(a === b && a === WORKER[pt], `${pt} Express twice-identical == recorded additive baseline`, a.slice(0, 16));

      // (b) DOMAIN-REUSE proof: every file present in BOTH the worker and the api-only
      // twin is byte-identical EXCEPT the legitimately-rewritten manifest/package/README;
      // the removed set is EXACTLY the HTTP entrypoint + route layer; the added set is
      // EXACTLY the worker entrypoint + job/handler. So the domain layer is reused unchanged.
      const wk = toMap(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: pt })));
      let domainIdentical = true;
      for (const [p, c] of apiTwin) if (wk.has(p) && !REWRITTEN.has(p) && wk.get(p) !== c) domainIdentical = false;
      const removed = [...apiTwin.keys()].filter((p) => !wk.has(p)).sort();
      const added = [...wk.keys()].filter((p) => !apiTwin.has(p)).sort();
      const removedOk = removed.length === HTTP_SWAPPED.size && removed.every((p) => HTTP_SWAPPED.has(p));
      const addedOk = added.length === workerAdded[pt].length && added.every((p) => workerAdded[pt].includes(p));
      // The kind-specific worker artifacts exist (scheduler+job for cron; dispatcher+broker+handler for queue).
      const shapeOk = kind === 'cron'
        ? wk.has('src/scheduler.js') && [...wk.keys()].some((p) => p.endsWith('.job.js'))
        : wk.has('src/dispatcher.js') && wk.has('src/broker.js') && [...wk.keys()].some((p) => p.endsWith('.handler.js'));
      record(domainIdentical && removedOk && addedOk && shapeOk,
        `${pt} DOMAIN-REUSE: domain byte-identical to api-only twin; only entrypoint+route/handler swapped`,
        `(-${removed.length} HTTP, +${added.length} worker)`);
    }

    // (c) DEFAULT = LITERAL BYPASS (re-derived): the worker projectType adds no file
    // and moves no hash for Web-App/API-only — proven by the whole backstop above being
    // byte-identical (no worker fixture in PART 1a/1b). Here we assert the enum-shape:
    // a worker forces frontend=None (no frontend) via the generalized Day-15 constraint.
    const cronManifest = (await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'Cron Worker' }))).find((f) => f.relPath === 'GENERATION-MANIFEST.txt')?.content ?? '';
    record(/projectType: Cron Worker/.test(cronManifest) && /frontend: None/.test(cronManifest) && /Cron Worker projects have no frontend/.test(cronManifest),
      'worker type↔frontend constraint: Cron Worker → frontend None (generalized Day-15 rule, shown ADR-004)');

    // (d) queue-consumer adds the amqplib broker driver as a GENERATED-PROJECT dep,
    // gated on the type; cron adds NO dep (setInterval builtin). Thraksha core deps {}.
    const queuePkg = (await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'Queue Consumer' }))).find((f) => f.relPath === 'package.json')?.content ?? '';
    const cronPkg = (await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'Cron Worker' }))).find((f) => f.relPath === 'package.json')?.content ?? '';
    record(/"amqplib":/.test(queuePkg) && /"main": "src\/worker.js"/.test(queuePkg) && !/"amqplib":/.test(cronPkg) && /"main": "src\/worker.js"/.test(cronPkg),
      'gated deps: queue adds amqplib (generated-project dep); cron adds none (setInterval builtin); both repoint main→worker.js');
  }

  // ── PART 1q (pass 2) — the other 4 stacks: Go/FastAPI/Django/Spring × cron/queue ──
  // Generation-only (no toolchain to boot/compile these here) — determinism proven via
  // the twice-identical baselines + the domain-reuse diff, exactly as pass 1 did for Express.
  process.stdout.write('\n=== PART 1q (pass 2): worker archetypes — Go/FastAPI/Django/Spring (Eco-Day 34 — generation-only) ===\n');
  for (const backend of ['Go', 'FastAPI', 'Django', 'Spring Boot']) {
    const cfg = WORKER_STACKS[backend];
    const apiTwin = toMap(await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL', projectType: 'API-only' })));
    for (const pt of ['Cron Worker', 'Queue Consumer'] as const) {
      const kind: 'cron' | 'queue' = pt === 'Cron Worker' ? 'cron' : 'queue';
      // (a) twice-identical == recorded additive baseline.
      const a = hashFiles(await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL', projectType: pt })));
      const b = hashFiles(await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL', projectType: pt })));
      const expected = kind === 'cron' ? cfg.cron : cfg.queue;
      bake(`worker|${backend}|${pt}`, a);
      record(a === b && a === expected, `${backend.padEnd(11)} ${pt.padEnd(14)} twice-identical == recorded additive baseline`, a.slice(0, 16));

      // (b) DOMAIN-REUSE: shared files identical except the legit-rewritten shell files;
      // the HTTP route/controller layer is removed; the worker file is added.
      const wk = toMap(await filesOf(buildDemoAppModel({ backend, database: 'PostgreSQL', projectType: pt })));
      let domainIdentical = true;
      for (const [p, c] of apiTwin) if (wk.has(p) && !cfg.rewritten.test(p) && wk.get(p) !== c) domainIdentical = false;
      const removed = [...apiTwin.keys()].filter((p) => !wk.has(p));
      const added = [...wk.keys()].filter((p) => !apiTwin.has(p));
      const httpRemoved = removed.some((p) => cfg.http.test(p));
      const workerAdded = added.some((p) => cfg.worker[kind].test(p));
      record(domainIdentical && httpRemoved && workerAdded,
        `${backend.padEnd(11)} ${pt.padEnd(14)} DOMAIN-REUSE: domain byte-identical to api-only twin; only entrypoint+route/handler swapped`,
        `(-${removed.length} +${added.length})`);
    }
  }

  // ══ PART 1r — CLI + GraphQL + static-site+API project types (Eco-Day 36) ═════
  // Three new archetypes: CLI (command→handler table) + GraphQL (one endpoint + a
  // DETERMINISTIC SDL + resolvers) + Static Site + API (web-app + a static build
  // stage, frontend KEPT). Express CLI+GraphQL are boot-verified (see the day36 boot
  // driver); Spring static+API + the other stacks' CLI/GraphQL are generation-only /
  // staged (pass 2) — honest per §4. The GraphQL SDL ordering is the load-bearing gate.
  process.stdout.write('\n=== PART 1r: CLI + GraphQL + static-site+API (Eco-Day 36) ===\n');
  {
    const CLI = '553b797e7a8a8a0936f90a72959485e280abd65d94adb6c321a1e47b4ad087fb';
    const GRAPHQL = '5b3cd7ecb941e20c3730d0a27de44800a49b4d5e7d99aa56a6b690e598f2185f';
    const STATIC = '0062805b100bb7938241a610d9fffee8ce1594fb359911b11eb57f8560453477';
    const REWRITTEN = new Set(['GENERATION-MANIFEST.txt', 'package.json', 'README.md']);
    const apiTwin = toMap(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'API-only' })));

    // (a) Express CLI — twice-identical + domain-reuse (only entrypoint + command layer swapped).
    {
      const a = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'CLI' })));
      const b = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'CLI' })));
      bake('day36|Express|CLI', a);
      const cli = toMap(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'CLI' })));
      let domainId = true;
      for (const [p, c] of apiTwin) if (cli.has(p) && !REWRITTEN.has(p) && cli.get(p) !== c) domainId = false;
      const added = [...cli.keys()].filter((p) => !apiTwin.has(p));
      const cliShape = cli.has('src/cli.js') && cli.has('src/commands.js') && added.some((p) => p.endsWith('.commands.js'));
      record(a === b && a === CLI && domainId && cliShape, 'Express CLI twice-identical == baseline; domain byte-identical to api-only twin; command layer swapped', a.slice(0, 16));
    }

    // (b) Express GraphQL — twice-identical + domain-reuse + DETERMINISTIC SDL ordering.
    {
      const a = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'GraphQL API' })));
      const b = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'GraphQL API' })));
      bake('day36|Express|GraphQL API', a);
      const gql = toMap(await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'GraphQL API' })));
      let domainId = true;
      for (const [p, c] of apiTwin) if (gql.has(p) && !REWRITTEN.has(p) && gql.get(p) !== c) domainId = false;
      const gqlShape = gql.has('schema.graphql') && gql.has('src/graphql-server.js') && gql.has('src/resolvers.js') && [...gql.keys()].some((p) => p.endsWith('.resolvers.js'));
      record(a === b && a === GRAPHQL && domainId && gqlShape, 'Express GraphQL twice-identical == baseline; domain byte-identical to api-only twin; REST layer → one schema+resolvers', a.slice(0, 16));

      // The load-bearing SDL-determinism property: the SDL is a SORTED projection —
      // reversed entity insertion order yields a BYTE-IDENTICAL schema (never iteration order).
      const ents = [
        { name: 'Zebra', fields: [{ name: 'name', type: 'String', required: true }] },
        { name: 'Apple', fields: [{ name: 'title', type: 'String', required: true }, { name: 'qty', type: 'Integer' }] },
      ];
      const mk = (rev: boolean): ProjectModel => {
        const m = createProjectModel({ projectName: 'X', projectType: 'GraphQL API', backend: 'Express', frontend: 'None', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
        for (const e of rev ? [...ents].reverse() : ents) m.addEntity(e);
        return m;
      };
      const sFwd = buildCanonicalSdl(mk(false).getEntities(), { multiUser: true, naming: 'default' });
      const sRev = buildCanonicalSdl(mk(true).getEntities(), { multiUser: true, naming: 'default' });
      const sortedTypes = sFwd.indexOf('type Apple') > 0 && sFwd.indexOf('type Apple') < sFwd.indexOf('type Zebra');
      record(sFwd === sRev && sortedTypes, 'GraphQL SDL DETERMINISM: byte-identical under reversed insertion order (sorted by name, never iteration order)');
    }

    // (c) Spring static-site+API — twice-identical + domain-reuse vs WEB-APP twin (frontend KEPT; only a build stage added).
    {
      const a = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'Static Site + API' })));
      const b = hashFiles(await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'Static Site + API' })));
      bake('day36|Spring Boot|Static Site + API', a);
      const web = toMap(await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'Web App' })));
      const st = toMap(await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'Static Site + API' })));
      let domainId = true;
      for (const [p, c] of web) if (st.has(p) && !REWRITTEN.has(p) && st.get(p) !== c) domainId = false;
      const added = [...st.keys()].filter((p) => !web.has(p)).sort();
      const frontendKept = [...st.keys()].some((p) => p.startsWith('frontend/'));
      const onlyBuildStage = added.length === 1 && added[0] === 'static-build.sh';
      record(a === b && a === STATIC && domainId && frontendKept && onlyBuildStage, 'Spring static-site+API twice-identical == baseline; web-app byte-identical + frontend KEPT + only static-build.sh added', a.slice(0, 16));
    }

    // (d) The frontend-constraint refinement: CLI/GraphQL are frontendless (frontend None);
    //     Static Site + API KEEPS its frontend (the Day-36 split; byte-neutral for existing types).
    const cliManifest = (await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'CLI' }))).find((f) => f.relPath === 'GENERATION-MANIFEST.txt')?.content ?? '';
    const gqlManifest = (await filesOf(buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL', projectType: 'GraphQL API' }))).find((f) => f.relPath === 'GENERATION-MANIFEST.txt')?.content ?? '';
    const stManifest = (await filesOf(buildDemoAppModel({ backend: 'Spring Boot', database: 'PostgreSQL', projectType: 'Static Site + API' }))).find((f) => f.relPath === 'GENERATION-MANIFEST.txt')?.content ?? '';
    const cliFrontendless = /projectType: CLI/.test(cliManifest) && /frontend: None/.test(cliManifest) && /CLI projects have no frontend/.test(cliManifest);
    const gqlFrontendless = /projectType: GraphQL API/.test(gqlManifest) && /frontend: None/.test(gqlManifest) && /GraphQL API projects have no frontend/.test(gqlManifest);
    const staticKeepsFrontend = /projectType: Static Site \+ API/.test(stManifest) && /frontend: React/.test(stManifest);
    record(cliFrontendless && gqlFrontendless && staticKeepsFrontend, 'frontend-constraint refinement: CLI/GraphQL → frontend None; Static Site + API → frontend React (kept)');
  }

  process.stdout.write(`\n[digest-manifest] ${digestManifest.length} digests asserted (43 frozen + 1 MAXIMAL)\n`);
  if (process.argv.includes('--emit-digests')) for (const d of digestManifest) process.stdout.write(`DIGEST ${d}\n`);
  process.stdout.write(`\nDay-20 regression: ${pass ? 'PASS' : 'FAIL'} (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
