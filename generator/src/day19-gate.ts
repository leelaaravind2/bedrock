/*
 * Thraksha — Day 19 EXECUTION gate harness (temporary; not part of the product).
 *
 * Day 19 enriches the WIZARD (description, relationships in the entity screen,
 * integration selection) — it feeds the EXISTING engine and changes NO generation.
 *
 * DEFAULT       The full 20-hash matrix on the default path (no description, no
 *               UI relationship beyond the demos, no integration) stays
 *               byte-identical — both the Phase-A lines AND the (none) defaults
 *               line unmoved. Guard-the-guard: the 20 baked digests are the
 *               canonical set (16 in week-01-summary.md, 4 Go in day-09/day-10).
 * UI==CLI       The load-bearing proof: replaying the FULL TeamTracker chain
 *               through the SERVER's public path (createProjectModel + addEntity
 *               with UI-shape relationship specs, incl. the multi-edge Ticket)
 *               hashes IDENTICALLY to buildTeamTrackerModel for all 5 backends ×
 *               2 DBs (the 10 TeamTracker baselines). If the UI-declared model
 *               diverges from the engine, this FAILS (do NOT adjust the baseline).
 * REL-FREE      An entity with NO relationship (DemoApp's Ticket), built via the
 *               same addEntity path, reproduces its baseline (a literal bypass).
 * DESCRIPTION   Blank ⇒ README byte-identical (hash unmoved — the canonical path);
 *               provided ⇒ the README differs, contains the text (a valid sibling).
 * GUARD         setDescription survives the get/set + snapshot round-trip.
 *
 * Run:  node dist/day19-gate.js
 */

import crypto from 'node:crypto';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { createProjectModel, restoreProjectModel, type ProjectModel } from './core/project-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { GeneratedFile } from './core/plugin.js';

// The canonical 20 (guard-the-guard): 5 backends × 2 DBs × 2 models.
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

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
async function hashOf(model: ProjectModel): Promise<string> {
  return hashFiles(await buildFileSet(model, selectBackendPlugin(model)));
}

/**
 * Replay the FULL TeamTracker chain through the SERVER's public path — exactly
 * what the entity screen POSTs (createProjectModel + addEntity per entity), with
 * relationships in the UI's shape { kind:'belongs-to', target }. The multi-edge
 * Ticket (belongs-to Application AND Team) is the case a single-edge test would
 * miss. NOTHING here reaches into generation — it uses only the public model API.
 */
function teamTrackerViaUiPath(backend: string, database: string): ProjectModel {
  const m = createProjectModel({ projectName: 'TeamTracker', projectType: 'Web App', backend, frontend: 'React', database, multiUser: true, auth: 'Simple login' });
  m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }, { name: 'description', type: 'String' }] });
  m.addEntity({ name: 'Application', fields: [{ name: 'name', type: 'String', required: true }, { name: 'status', type: 'String' }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
  m.addEntity({ name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }, { name: 'code', type: 'String', unique: true }, { name: 'priority', type: 'Integer' }, { name: 'done', type: 'Boolean' }], relationships: [{ kind: 'belongs-to', target: 'Application' }, { kind: 'belongs-to', target: 'Team' }] });
  m.addEntity({ name: 'Comment', fields: [{ name: 'body', type: 'Text', required: true }], relationships: [{ kind: 'belongs-to', target: 'Ticket' }] });
  return m;
}

async function main(): Promise<void> {
  let pass = true;

  // ── DEFAULT — 20-hash matrix byte-identical (both trap sides) ───────────────
  process.stdout.write('=== DEFAULT: 20-hash matrix (no description / no UI rel / no integration) ===\n');
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
  process.stdout.write(`  ${noneOk ? 'OK  ' : 'FAIL'} all 20 byte-identical on the default path\n`);

  // ── UI==CLI on the relationship path (the headline) ─────────────────────────
  process.stdout.write('\n=== UI==CLI: full TeamTracker chain via addEntity == the 10 baselines ===\n');
  let uiOk = true;
  for (const db of DATABASES) {
    for (const backend of BACKENDS) {
      const ui = await hashOf(teamTrackerViaUiPath(backend, db));
      const cli = FROZEN[`${backend}|${db}|TeamTracker`];
      const ok = ui === cli;
      if (!ok) { uiOk = false; pass = false; process.stdout.write(`  FAIL ${backend}|${db} UI=${ui.slice(0, 16)} baseline=${cli.slice(0, 16)}\n`); }
    }
  }
  process.stdout.write(`  ${uiOk ? 'OK  ' : 'FAIL'} UI-declared TeamTracker reproduces all 10 baselines byte-for-byte\n`);

  // ── Relationship-free reproduces (literal bypass) ───────────────────────────
  // DemoApp is built via addEntity with NO relationships (the canonical demo).
  // Assert its entities are structurally relationship-free AND it hashes to the
  // baseline — the belongsToRels loop being empty is a literal bypass.
  process.stdout.write('\n=== REL-FREE: DemoApp (relationship-free via addEntity) == baseline ===\n');
  let relFreeOk = true;
  for (const db of DATABASES) {
    for (const backend of BACKENDS) {
      const m = buildDemoAppModel({ backend, database: db });
      const noRels = m.getEntities().every((e) => e.relationships.length === 0);
      const got = await hashOf(m);
      const cli = FROZEN[`${backend}|${db}|DemoApp`];
      if (!noRels || got !== cli) { relFreeOk = false; pass = false; process.stdout.write(`  FAIL ${backend}|${db} noRels=${noRels} hash=${got.slice(0, 16)} baseline=${cli.slice(0, 16)}\n`); }
    }
  }
  process.stdout.write(`  ${relFreeOk ? 'OK  ' : 'FAIL'} relationship-free entities + baseline hash (literal bypass)\n`);

  // ── DESCRIPTION — blank frozen; provided a coherent sibling ─────────────────
  process.stdout.write('\n=== DESCRIPTION: blank ⇒ frozen; provided ⇒ README sibling ===\n');
  const blank = buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' });
  const blankHash = await hashOf(blank);
  const blankFrozen = blankHash === FROZEN['FastAPI|PostgreSQL|DemoApp'];
  const prov = buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' });
  const DESC = 'A small ticket tracker for the support team.';
  prov.setDescription(DESC);
  const provFiles = await buildFileSet(prov, selectBackendPlugin(prov));
  const provHash = hashFiles(provFiles);
  const readme = new Map(provFiles.map((f) => [f.relPath, f.content])).get('README.md') ?? '';
  const differs = provHash !== blankHash;
  const contains = readme.includes(DESC);
  const h1First = readme.startsWith('# DemoApp');
  const descOk = blankFrozen && differs && contains && h1First;
  if (!descOk) pass = false;
  process.stdout.write(`  ${descOk ? 'OK  ' : 'FAIL'} blankFrozen=${blankFrozen} providedDiffers=${differs} readmeContainsText=${contains} h1First=${h1First}\n`);

  // ── GUARD — description survives get/set + snapshot round-trip ───────────────
  process.stdout.write('\n=== GUARD: description survives get/set + restore ===\n');
  const g = buildDemoAppModel({ backend: 'FastAPI', database: 'PostgreSQL' });
  g.setDescription('hello');
  const rt = restoreProjectModel(g.getState());
  const oldState = g.getState() as unknown as Record<string, unknown>;
  delete oldState.description; // simulate a pre-Day-19 snapshot
  const old = restoreProjectModel(oldState as unknown as ReturnType<ProjectModel['getState']>);
  const guardOk = g.getDescription() === 'hello' && rt.getDescription() === 'hello' && old.getDescription() === '';
  if (!guardOk) pass = false;
  process.stdout.write(`  ${guardOk ? 'OK  ' : 'FAIL'} set='hello' survives get/set + restore; pre-Day-19 snapshot ⇒ ''\n`);

  process.stdout.write(`\nDay-19 gate: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
