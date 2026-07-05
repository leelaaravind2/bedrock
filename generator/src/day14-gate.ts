/*
 * Thraksha — Day 14 EXECUTION gate harness (temporary; not part of the product).
 *
 * Proves the wizard style wiring is byte-for-byte the engine, by driving the REAL
 * UI server (server.ts) over HTTP exactly as the browser does:
 *
 *   Step 4  Fresh untouched wizard (no /api/style) reproduces all 20 default
 *           hashes — and UI == CLI for each. The default path is a literal bypass.
 *   Step 5  UI == CLI for style: POST /api/settings -> /api/entities -> /api/style
 *           -> /api/generate  equals  the same style via setStyle on the CLI path,
 *           byte-identical, for representative selections.
 *   Step 6  Composition: 1-2 combined multi-option selections on the multi-word
 *           Task model, generated twice -> byte-identical (new Day-14 baselines),
 *           with a content spot-check that all chosen options are visible.
 *
 * No AI (ADR-001). No randomness (ADR-003). Run:  node dist/day14-gate.js
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildTaskModel } from './task-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { type CodingStyle } from './core/style.js';
import type { ProjectModel } from './core/project-model.js';

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

// Entity specs mirroring the canonical demo models, posted through /api/entities.
const TICKET = { name: 'Ticket', fields: [
  { name: 'title', type: 'String', required: true }, { name: 'code', type: 'String', unique: true },
  { name: 'priority', type: 'Integer' }, { name: 'done', type: 'Boolean' } ] };
const TASK = { name: 'Task', fields: [
  { name: 'dueDate', type: 'DateTime', required: true }, { name: 'isUrgent', type: 'Boolean' } ] };
const TEAMTRACKER = [
  { name: 'Team', fields: [ { name: 'name', type: 'String', required: true }, { name: 'description', type: 'String' } ] },
  { name: 'Application', fields: [ { name: 'name', type: 'String', required: true }, { name: 'status', type: 'String' } ], relationships: [{ kind: 'belongs-to', target: 'Team' }] },
  { name: 'Ticket', fields: [ { name: 'title', type: 'String', required: true }, { name: 'code', type: 'String', unique: true }, { name: 'priority', type: 'Integer' }, { name: 'done', type: 'Boolean' } ], relationships: [{ kind: 'belongs-to', target: 'Application' }, { kind: 'belongs-to', target: 'Team' }] },
  { name: 'Comment', fields: [ { name: 'body', type: 'Text', required: true } ], relationships: [{ kind: 'belongs-to', target: 'Ticket' }] },
];

function phaseA(projectName: string, backend: string, database: string) {
  return { projectName, projectType: 'Web App', backend, frontend: 'React', database, multiUser: true, auth: 'Simple login' };
}

/** Disk tree hash (leading-slash convention, identical to ui:demo / the gates). */
async function hashTree(dir: string): Promise<string> {
  const fulls: string[] = [];
  async function rec(d: string): Promise<void> {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full); else fulls.push(full);
    }
  }
  await rec(dir);
  fulls.sort((a, b) => { const sa = a.slice(dir.length), sb = b.slice(dir.length); return sa < sb ? -1 : sa > sb ? 1 : 0; });
  const h = crypto.createHash('sha256');
  for (const full of fulls) { h.update(`${full.slice(dir.length).split(path.sep).join('/')}\n`); h.update(await fs.readFile(full)); }
  return h.digest('hex');
}

/** CLI/engine-path content hash (leading-slash), matching hashTree byte-for-byte. */
async function cliHash(model: ProjectModel): Promise<string> {
  const files = await buildFileSet(model, selectBackendPlugin(model));
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

async function fileContent(model: ProjectModel, suffix: string): Promise<string> {
  const files = await buildFileSet(model, selectBackendPlugin(model));
  return (files.find((f) => f.relPath.endsWith(suffix)) || { content: '' }).content;
}

async function main(): Promise<void> {
  const root = path.join(os.tmpdir(), 'thraksha-day14-gate');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  const outputRoot = path.join(root, 'output');
  process.env.THRAKSHA_UI_OUTPUT = outputRoot;
  process.env.THRAKSHA_UI_STORE = path.join(root, 'versions');
  const port = 4323;
  process.env.PORT = String(port);
  await import('./server.js');

  const BASE = `http://localhost:${port}`;
  const api = async (method: string, p: string, body?: unknown) => {
    const res = await fetch(`${BASE}${p}`, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    return data;
  };
  for (let i = 0; i < 50; i++) { try { await api('GET', '/api/state'); break; } catch { await new Promise((r) => setTimeout(r, 40)); } }

  // Drive the wizard: settings -> entities -> [style] -> generate -> hash the dir.
  async function wizardHash(projectName: string, backend: string, database: string, entities: unknown[], style?: CodingStyle): Promise<string> {
    const dir = path.join(outputRoot, projectName);
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    await api('POST', '/api/settings', phaseA(projectName, backend, database));
    for (const e of entities) await api('POST', '/api/entities', e);
    if (style) await api('POST', '/api/style', style);
    await api('POST', '/api/generate');
    return hashTree(dir);
  }

  let pass = true;
  const fail = () => { pass = false; };

  // ── STEP 4 — fresh untouched wizard reproduces the 20; UI == CLI ────────────
  process.stdout.write('=== STEP 4: fresh untouched wizard (no /api/style) == 20 default hashes, UI==CLI ===\n');
  for (const modelName of ['DemoApp', 'TeamTracker']) {
    for (const db of DATABASES) {
      for (const backend of BACKENDS) {
        const key = `${backend}|${db}|${modelName}`;
        const entities = modelName === 'DemoApp' ? [TICKET] : TEAMTRACKER;
        const uiHash = await wizardHash(modelName, backend, db, entities);
        const cli = await cliHash(modelName === 'DemoApp' ? buildDemoAppModel({ backend, database: db }) : buildTeamTrackerModel({ backend, database: db }));
        const okFrozen = uiHash === FROZEN[key];
        const okUiCli = uiHash === cli;
        if (!okFrozen || !okUiCli) fail();
        process.stdout.write(`  ${okFrozen && okUiCli ? 'OK  ' : 'FAIL'} ${key.padEnd(34)} ${uiHash.slice(0, 16)} frozen=${okFrozen} UI==CLI=${okUiCli}\n`);
      }
    }
  }

  // ── STEP 5 — UI == CLI for style (representative selections) ────────────────
  process.stdout.write('\n=== STEP 5: UI == CLI for style (wizard /api/style == setStyle) ===\n');
  const st = (indent: string, naming: string, depth: string): CodingStyle =>
    ({ formatting: { indent: indent as CodingStyle['formatting']['indent'] }, namingConvention: naming as CodingStyle['namingConvention'], architectureDepth: depth as CodingStyle['architectureDepth'] });
  const selections: Array<{ label: string; backend: string; project: string; entities: unknown[]; mk: () => ProjectModel; style: CodingStyle }> = [
    { label: 'Express Task snake+four-space+simple', backend: 'Express', project: 'TaskApp', entities: [TASK], mk: () => buildTaskModel({ backend: 'Express' }), style: st('four-space', 'snake_case', 'simple') },
    { label: 'FastAPI Task snake+simple', backend: 'FastAPI', project: 'TaskApp', entities: [TASK], mk: () => buildTaskModel({ backend: 'FastAPI' }), style: st('default', 'snake_case', 'simple') },
    { label: 'Go DemoApp all-default (bypass)', backend: 'Go', project: 'DemoApp', entities: [TICKET], mk: () => buildDemoAppModel({ backend: 'Go' }), style: st('default', 'default', 'default') },
  ];
  for (const s of selections) {
    const uiHash = await wizardHash(s.project, s.backend, 'PostgreSQL', s.entities, s.style);
    const m = s.mk(); m.setStyle(s.style);
    const cli = await cliHash(m);
    const ok = uiHash === cli;
    if (!ok) fail();
    process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${s.label.padEnd(38)} ${uiHash.slice(0, 16)} UI==CLI=${ok}\n`);
  }

  // ── STEP 6 — composition twice-identical + content spot-check ───────────────
  process.stdout.write('\n=== STEP 6: composition baselines (multi-word Task, twice-identical) ===\n');
  // A: Express + snake + four-space + simple
  {
    const mk = () => { const m = buildTaskModel({ backend: 'Express' }); m.setStyle(st('four-space', 'snake_case', 'simple')); return m; };
    const h1 = await cliHash(mk()); const h2 = await cliHash(mk());
    const crud = await fileContent(mk(), '.crud.base.js');
    const wireSnake = /due_date: row\.due_date/.test(crud) && /is_urgent: row\.is_urgent/.test(crud);
    const fourSpace = /\n {4}\S/.test(crud) && !/\n {2}\S/.test(crud); // indentation is 4-space (no lone 2-space)
    const merged = crud.length > 0; // crud.base.js exists => simple collapse
    const ok = h1 === h2 && wireSnake && fourSpace && merged;
    if (!ok) fail();
    process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} A Express snake+four-space+simple  ${h1.slice(0, 16)}  twice=${h1 === h2} snakeWire=${wireSnake} fourSpace=${fourSpace} merged=${merged}\n`);
  }
  // B: FastAPI + snake + simple
  {
    const mk = () => { const m = buildTaskModel({ backend: 'FastAPI' }); m.setStyle(st('default', 'snake_case', 'simple')); return m; };
    const h1 = await cliHash(mk()); const h2 = await cliHash(mk());
    const schemas = await fileContent(mk(), 'schemas.py');
    const crudBase = await fileContent(mk(), 'crud_base.py');
    // snake_case on FastAPI FK/alias: wire==attr for snake declared fields => no alias; presence of due_date field + merged crud_base is the proof.
    const snakeField = /due_date:/.test(schemas) && /is_urgent:/.test(schemas);
    const merged = crudBase.length > 0;
    const ok = h1 === h2 && snakeField && merged;
    if (!ok) fail();
    process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} B FastAPI snake+simple             ${h1.slice(0, 16)}  twice=${h1 === h2} snakeField=${snakeField} merged=${merged}\n`);
  }

  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  process.stdout.write(`\nDay-14 gate: ${pass ? 'PASS' : 'FAIL'}\n`);
  process.exit(pass ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
