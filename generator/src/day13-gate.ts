/*
 * Thraksha — Day 13 EXECUTION gate harness (temporary; not part of the product).
 *
 * Re-generates the full 20-hash matrix (5 backends × 2 databases × 2 models)
 * under the DEFAULT style and compares byte-for-byte against the frozen digests
 * (week-01-summary.md for the 16 non-Go; day-09/day-10 for Go's four). This is the
 * blocking backstop after every build step — architectureDepth: 'default' must be
 * a literal bypass.
 *
 * It also exercises architectureDepth: 'simple' per landed stack (Express,
 * FastAPI): DemoApp + TeamTracker on Postgres, each generated twice for
 * determinism, and records the 'simple' hashes. TeamTracker proves relationships
 * (belongs-to FKs) survive the collapse. A compositionality spot-check generates
 * Express 'simple' + snake_case twice and prints the transformed wire keys.
 *
 * Run:  node dist/day13-gate.js
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildTaskModel } from './task-model.js';
import { buildFileSet, applyPlan } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { createProjectModel, restoreProjectModel, type ProjectModel } from './core/project-model.js';
import { defaultCodingStyle } from './core/style.js';

// The frozen 20-hash matrix (default style). Keyed "<backend>|<db>|<model>".
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

// Stacks whose 'simple' file-set branch has LANDED this Day.
const LANDED_SIMPLE = new Set<string>(['FastAPI', 'Express']);

/** Canonical tree hash (same convention as two-stacks-demo / the frozen gates). */
async function hashTree(dir: string): Promise<string> {
  const fulls: string[] = [];
  async function rec(d: string): Promise<void> {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else fulls.push(full);
    }
  }
  await rec(dir);
  fulls.sort((a, b) => {
    const sa = a.slice(dir.length);
    const sb = b.slice(dir.length);
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  });
  const h = crypto.createHash('sha256');
  for (const full of fulls) {
    const rel = full.slice(dir.length).split(path.sep).join('/');
    h.update(`${rel}\n`);
    h.update(await fs.readFile(full));
  }
  return h.digest('hex');
}

async function genHash(model: ProjectModel, dir: string): Promise<string> {
  await fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  const plugin = selectBackendPlugin(model);
  await applyPlan(dir, await buildFileSet(model, plugin));
  return hashTree(dir);
}

/** List generated relPaths for a model (for the file-set diff evidence). */
async function relPaths(model: ProjectModel): Promise<string[]> {
  const files = await buildFileSet(model, selectBackendPlugin(model));
  return files.map((f) => `${f.ownership === 'developer' ? 'D' : 'T'} ${f.relPath}`).sort();
}

async function main(): Promise<void> {
  const root = path.join(os.tmpdir(), 'thraksha-day13-gate');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  let pass = true;

  // --- Positive guard: architectureDepth survives the getStyle/setStyle copy ---
  const g = createProjectModel({
    projectName: 'Guard', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL',
  });
  g.setStyle({ ...defaultCodingStyle, architectureDepth: 'simple' });
  const survived = g.getStyle().architectureDepth === 'simple';
  const freshDefault = createProjectModel({
    projectName: 'G2', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL',
  }).getStyle().architectureDepth === 'default';
  // restoreProjectModel defaults a pre-depth snapshot to 'default'.
  const legacySnap = { phaseA: g.getPhaseASettings(), entities: [], defaultsApplied: [],
    style: { formatting: { indent: 'default' }, namingConvention: 'default' } } as never;
  const restoredDefault = restoreProjectModel(legacySnap).getStyle().architectureDepth === 'default';
  process.stdout.write('=== GUARD: architectureDepth round-trip ===\n');
  process.stdout.write(`  setStyle(simple) -> getStyle() === simple        : ${survived}\n`);
  process.stdout.write(`  fresh model architectureDepth === default        : ${freshDefault}\n`);
  process.stdout.write(`  restore pre-depth snapshot -> default            : ${restoredDefault}\n\n`);
  if (!survived || !freshDefault || !restoredDefault) pass = false;

  // --- GATE: 20-hash matrix under DEFAULT ---
  process.stdout.write('=== GATE: 20-hash matrix under DEFAULT style ===\n');
  for (const model of ['DemoApp', 'TeamTracker']) {
    for (const db of DATABASES) {
      for (const backend of BACKENDS) {
        const key = `${backend}|${db}|${model}`;
        const build = model === 'DemoApp' ? buildDemoAppModel : buildTeamTrackerModel;
        const m = build({ backend, database: db });
        const dir = path.join(root, 'default', model, db, backend.replace(/\s/g, ''));
        const got = await genHash(m, dir);
        const ok = got === FROZEN[key];
        if (!ok) pass = false;
        process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${key.padEnd(34)} ${got}${ok ? '' : `\n       expected ${FROZEN[key]}`}\n`);
      }
    }
  }
  process.stdout.write(`\n20-hash matrix: ${pass ? 'PASS — all 20 byte-identical under default' : 'FAIL'}\n`);

  // --- 'simple' baselines (landed stacks, Postgres, DemoApp + TeamTracker) ---
  const withSimple = (build: (o: { backend: string; database: string }) => ProjectModel, backend: string): ProjectModel => {
    const m = build({ backend, database: 'PostgreSQL' });
    m.setStyle({ ...defaultCodingStyle, architectureDepth: 'simple' });
    return m;
  };
  if (LANDED_SIMPLE.size > 0) {
    process.stdout.write('\n=== SIMPLE baselines (Postgres; each generated twice) ===\n');
    for (const backend of BACKENDS) {
      if (!LANDED_SIMPLE.has(backend)) continue;
      for (const [modelName, build] of [['DemoApp', buildDemoAppModel], ['TeamTracker', buildTeamTrackerModel]] as const) {
        const d1 = path.join(root, 'simple', backend.replace(/\s/g, ''), modelName, 'a');
        const d2 = path.join(root, 'simple', backend.replace(/\s/g, ''), modelName, 'b');
        const h1 = await genHash(withSimple(build, backend), d1);
        const h2 = await genHash(withSimple(build, backend), d2);
        const twice = h1 === h2;
        if (!twice) pass = false;
        process.stdout.write(`  ${twice ? 'OK  ' : 'FAIL'} ${backend.padEnd(11)} ${modelName.padEnd(11)} simple ${h1}  twice=${twice}\n`);
      }
      // File-set diff: default vs simple, DemoApp (shows which files collapsed).
      const defPaths = await relPaths(buildDemoAppModel({ backend, database: 'PostgreSQL' }));
      const simPaths = await relPaths(withSimple(buildDemoAppModel, backend));
      const removed = defPaths.filter((p) => !simPaths.map((s) => s.slice(2)).includes(p.slice(2)));
      const added = simPaths.filter((p) => !defPaths.map((s) => s.slice(2)).includes(p.slice(2)));
      process.stdout.write(`      [${backend} DemoApp] default=${defPaths.length} files, simple=${simPaths.length} files\n`);
      process.stdout.write(`      removed in simple: ${removed.map((p) => p.slice(2)).join(', ') || '(none)'}\n`);
      process.stdout.write(`      added   in simple: ${added.map((p) => p.slice(2)).join(', ') || '(none)'}\n`);
      // Developer seam present in BOTH depths.
      const devDefault = defPaths.filter((p) => p.startsWith('D '));
      const devSimple = simPaths.filter((p) => p.startsWith('D '));
      process.stdout.write(`      dev seam default: ${devDefault.map((p) => p.slice(2).split('/').pop()).join(', ')}\n`);
      process.stdout.write(`      dev seam simple : ${devSimple.map((p) => p.slice(2).split('/').pop()).join(', ')}\n`);
    }
  }

  // --- Compositionality spot-check: Express 'simple' + snake_case on the
  //     MULTI-WORD Task model (dueDate/isUrgent), so the wire-key transform is
  //     actually visible in the merged crud.base.js + dto.js (twice-identical) ---
  if (LANDED_SIMPLE.has('Express')) {
    process.stdout.write('\n=== COMPOSITIONALITY: Express simple + snake_case (multi-word Task) ===\n');
    const mk = (): ProjectModel => buildTaskModel({ backend: 'Express', namingConvention: 'snake_case', architectureDepth: 'simple' });
    const files = await buildFileSet(mk(), selectBackendPlugin(mk()));
    const crud = files.find((f) => f.relPath.endsWith('.crud.base.js'))?.content ?? '';
    const dto = files.find((f) => f.relPath.endsWith('.dto.js'))?.content ?? '';
    const h1 = await genHash(mk(), path.join(root, 'comp', 'a'));
    const h2 = await genHash(mk(), path.join(root, 'comp', 'b'));
    const twice = h1 === h2;
    // wire key transformed in the merged file; column accessor unchanged; internal
    // dto->crud contract (data.<declaredName>) preserved.
    const wireInCrud = /due_date: row\.due_date/.test(crud) && /is_urgent: row\.is_urgent/.test(crud);
    const readInDto = dto.includes('body.due_date') && dto.includes('body.is_urgent');
    const contractKept = dto.includes('data.dueDate') && dto.includes('data.isUrgent');
    const ok = twice && wireInCrud && readInDto && contractKept;
    if (!ok) pass = false;
    process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} twice=${twice} wireKey@crud.base=${wireInCrud} read@dto=${readInDto} contract(data.<decl>)=${contractKept}\n`);
    process.stdout.write(`       crud.base rowToObject: ${(crud.match(/(due_date|is_urgent): row\.\w+,/g) || []).join('  ')}\n`);
  }

  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  process.stdout.write(`\nDay-13 gate: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
