/*
 * Thraksha — Day 12 EXECUTION gate harness (temporary; not part of the product).
 *
 * Re-generates the full 20-hash matrix (5 backends × 2 databases × 2 models)
 * under the DEFAULT coding style and compares byte-for-byte against the frozen
 * digests (week-01-summary.md for the 16 non-Go; day-09/day-10 for Go's four).
 * This is the blocking backstop after every build step.
 *
 * It also exercises the multi-word Task demo (added in Step 1) per landed stack,
 * under default / camelCase / snake_case, each generated twice for determinism,
 * printing the wire-key line for each of the entity's declared fields.
 *
 * Run:  node dist/day12-gate.js
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
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { defaultCodingStyle, toSnakeCase, toCamelCase, applyNaming, type NamingConvention } from './core/style.js';

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

/** Read the first generated file whose relPath ends with `suffix`. */
async function readUnder(dir: string, suffix: string): Promise<string> {
  const fulls: string[] = [];
  async function rec(d: string): Promise<void> {
    for (const e of await fs.readdir(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else fulls.push(full);
    }
  }
  await rec(dir);
  const hit = fulls.find((f) => f.split(path.sep).join('/').endsWith(suffix));
  return hit ? fs.readFile(hit, 'utf8') : '';
}

/** Lines mentioning the declared multi-word fields — the wire-key evidence. */
function evidence(content: string): string[] {
  return content.split('\n').filter((l) => /due[_]?date|is[_]?urgent/i.test(l)).map((l) => l.trim());
}

// Which stacks have had the naming mechanism LANDED (Step 2/3/4). Only these get
// the transform assertions; others are informational until landed.
const LANDED = new Set<string>(['Go', 'Spring Boot', 'Express', 'FastAPI', 'Django']);

// Per-stack wire-key checks. Given the serialization file contents (by suffix),
// each returns whether the wire key is correct for the convention. Columns /
// attributes / audit keys are checked to be UNCHANGED (snake_case) throughout.
type Files = Record<string, string>;
const CHECKS: Record<string, { files: string[]; check: (conv: NamingConvention, f: Files) => boolean }> = {
  Go: {
    files: ['task.go', 'validate.go'],
    check: (conv, f) => {
      const both = f['task.go'] + f['validate.go'];
      const goIdentsKept = /\bDueDate\b/.test(f['task.go']) && /\bIsUrgent\b/.test(f['task.go']); // Go field names
      if (conv === 'snake_case') return both.includes('json:"due_date"') && both.includes('json:"is_urgent"') && goIdentsKept;
      return both.includes('json:"dueDate"') && both.includes('json:"isUrgent"') && goIdentsKept; // default + camelCase
    },
  },
  'Spring Boot': {
    files: ['TaskDto.java'],
    check: (conv, f) => {
      const dto = f['TaskDto.java'];
      const javaFieldKept = /private OffsetDateTime dueDate;/.test(dto) && /private Boolean isUrgent;/.test(dto);
      if (conv === 'snake_case') return dto.includes('@JsonProperty("due_date")') && dto.includes('@JsonProperty("is_urgent")') && dto.includes('import com.fasterxml.jackson.annotation.JsonProperty;') && javaFieldKept;
      return !dto.includes('@JsonProperty') && javaFieldKept; // default + camelCase (declared == camelCase)
    },
  },
  Express: {
    files: ['task.repository.js', 'task.dto.js'],
    check: (conv, f) => {
      const repo = f['task.repository.js'];
      const dto = f['task.dto.js'];
      const colKept = /dueDate: row\.due_date|due_date: row\.due_date/.test(repo) && repo.includes('row.is_urgent'); // accessor stays snake column
      if (conv === 'snake_case') return /due_date: row\.due_date/.test(repo) && /is_urgent: row\.is_urgent/.test(repo) && dto.includes('body.due_date') && dto.includes('body.is_urgent') && colKept;
      return /dueDate: row\.due_date/.test(repo) && /isUrgent: row\.is_urgent/.test(repo) && dto.includes('body.dueDate') && dto.includes('body.isUrgent') && colKept;
    },
  },
  FastAPI: {
    files: ['schemas.py', 'model.py'],
    check: (conv, f) => {
      const s = f['schemas.py'];
      const m = f['model.py'];
      const attrKept = m.includes('due_date = Column(') && m.includes('is_urgent = Column('); // ORM attribute/column stays snake
      if (conv === 'snake_case') return !s.includes('alias="dueDate"') && !s.includes('alias="isUrgent"') && /due_date:/.test(s) && /is_urgent:/.test(s) && attrKept;
      return s.includes('alias="dueDate"') && s.includes('alias="isUrgent"') && s.includes('populate_by_name=True') && attrKept; // default + camelCase
    },
  },
  Django: {
    files: ['serializers.py', 'models.py'],
    check: (conv, f) => {
      const s = f['serializers.py'];
      const m = f['models.py'];
      const attrKept = m.includes('due_date = models.') && m.includes('is_urgent = models.'); // model attribute/column snake
      if (conv === 'snake_case') return !/dueDate\s*=\s*serializers\./.test(s) && s.includes('"due_date"') && s.includes('"is_urgent"') && attrKept;
      return /dueDate = serializers\..*source="due_date"/.test(s) && /isUrgent = serializers\..*source="is_urgent"/.test(s) && attrKept; // default + camelCase
    },
  },
};

async function taskSection(): Promise<boolean> {
  const root = path.join(os.tmpdir(), 'thraksha-day12-task');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  let ok = true;
  process.stdout.write('\n=== Multi-word Task demo (dueDate, isUrgent) ===\n');
  const conventions: NamingConvention[] = ['default', 'camelCase', 'snake_case'];
  for (const backend of BACKENDS) {
    process.stdout.write(`\n-- ${backend}${LANDED.has(backend) ? '' : '  (not yet landed — informational)'} --\n`);
    for (const conv of conventions) {
      const dirA = path.join(root, backend.replace(/\s/g, ''), conv, 'a');
      const dirB = path.join(root, backend.replace(/\s/g, ''), conv, 'b');
      const h1 = await genHash(buildTaskModel({ backend, namingConvention: conv }), dirA);
      const h2 = await genHash(buildTaskModel({ backend, namingConvention: conv }), dirB);
      const deterministic = h1 === h2;
      const files: Files = {};
      for (const suffix of CHECKS[backend].files) files[suffix] = await readUnder(dirA, suffix);
      const ev = CHECKS[backend].files.flatMap((suf) => evidence(files[suf]));
      const wireOk = CHECKS[backend].check(conv, files);
      const landed = LANDED.has(backend);
      const stepOk = deterministic && (!landed || wireOk);
      if (!stepOk) ok = false;
      process.stdout.write(`  ${stepOk ? 'OK  ' : 'FAIL'} ${conv.padEnd(11)} hash=${h1.slice(0, 12)} twice=${deterministic} wireOk=${wireOk}\n`);
      for (const l of ev.slice(0, 4)) process.stdout.write(`         | ${l}\n`);
    }
  }
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  process.stdout.write(`\nTask section: ${ok ? 'PASS' : 'FAIL'} (assertions enforced only for landed stacks)\n`);
  return ok;
}

async function main(): Promise<void> {
  const root = path.join(os.tmpdir(), 'thraksha-day12-gate');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });

  let pass = true;

  // --- Positive guard: namingConvention survives the getStyle/setStyle copy ---
  const guardModel = createProjectModel({
    projectName: 'Guard', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL',
  });
  guardModel.setStyle({ ...defaultCodingStyle, namingConvention: 'snake_case' });
  const survived = guardModel.getStyle().namingConvention === 'snake_case';
  const defStillDefault = createProjectModel({
    projectName: 'Guard2', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL',
  }).getStyle().namingConvention === 'default';
  process.stdout.write('=== GUARD: style round-trip + helper agreement ===\n');
  process.stdout.write(`  setStyle(snake_case) -> getStyle() === snake_case : ${survived}\n`);
  process.stdout.write(`  fresh model default namingConvention === default  : ${defStillDefault}\n`);
  // Grep 2: core snake helper agrees with the plugins' column snake-caser on the
  // demo field names, so "emit only when wire !== column" fires as intended.
  const snakeOk = toSnakeCase('dueDate') === 'due_date' && toSnakeCase('isUrgent') === 'is_urgent'
    && toSnakeCase('title') === 'title' && toSnakeCase('name') === 'name';
  const camelOk = toCamelCase('dueDate') === 'dueDate' && toCamelCase('due_date') === 'dueDate'
    && toCamelCase('title') === 'title';
  process.stdout.write(`  toSnakeCase agrees on demo names                  : ${snakeOk}\n`);
  process.stdout.write(`  toCamelCase agrees on demo names                  : ${camelOk}\n\n`);
  if (!survived || !defStillDefault || !snakeOk || !camelOk) pass = false;

  // --- HELPER UNIT ASSERTS (plug the camelCase gap) ---
  // Task's fields are declared camelCase, so on them toCamelCase is a no-op and
  // camelCase output == default for every stack — a BROKEN toCamelCase would be
  // invisible in the Task section. These asserts fire the NON-TRIVIAL branch of
  // each helper on a snake_case-shaped input, proving the transform really works.
  const asserts: Array<[string, boolean]> = [
    // toCamelCase: the non-trivial (underscored) branch, plus idempotence.
    ["toCamelCase('start_date') === 'startDate'", toCamelCase('start_date') === 'startDate'],
    ["toCamelCase('due_date') === 'dueDate'", toCamelCase('due_date') === 'dueDate'],
    ["toCamelCase('dueDate') === 'dueDate' (idempotent)", toCamelCase('dueDate') === 'dueDate'],
    // toSnakeCase: the non-trivial (camelHump) branch, plus idempotence.
    ["toSnakeCase('dueDate') === 'due_date'", toSnakeCase('dueDate') === 'due_date'],
    ["toSnakeCase('isUrgent') === 'is_urgent'", toSnakeCase('isUrgent') === 'is_urgent'],
    ["toSnakeCase('due_date') === 'due_date' (idempotent)", toSnakeCase('due_date') === 'due_date'],
    // applyNaming dispatch: default is a literal bypass; the others route correctly.
    ["applyNaming('start_date','default') === 'start_date'", applyNaming('start_date', 'default') === 'start_date'],
    ["applyNaming('start_date','camelCase') === 'startDate'", applyNaming('start_date', 'camelCase') === 'startDate'],
    ["applyNaming('startDate','snake_case') === 'start_date'", applyNaming('startDate', 'snake_case') === 'start_date'],
  ];
  process.stdout.write('=== HELPER ASSERTS: camelCase/snake_case branches fire ===\n');
  for (const [label, res] of asserts) {
    if (!res) pass = false;
    process.stdout.write(`  ${res ? 'OK  ' : 'FAIL'} ${label}\n`);
  }
  process.stdout.write('\n');

  process.stdout.write('=== GATE: 20-hash matrix under DEFAULT style ===\n');
  for (const model of ['DemoApp', 'TeamTracker']) {
    for (const db of DATABASES) {
      for (const backend of BACKENDS) {
        const key = `${backend}|${db}|${model}`;
        const build = model === 'DemoApp' ? buildDemoAppModel : buildTeamTrackerModel;
        const m = build({ backend, database: db });
        const dir = path.join(root, model, db, backend.replace(/\s/g, ''));
        const got = await genHash(m, dir);
        const want = FROZEN[key];
        const ok = got === want;
        if (!ok) pass = false;
        process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${key.padEnd(34)} ${got}${ok ? '' : `\n       expected ${want}`}\n`);
      }
    }
  }

  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  process.stdout.write(`\n20-hash matrix: ${pass ? 'PASS — all 20 byte-identical under default' : 'FAIL — a default hash moved'}\n`);

  const taskOk = await taskSection();
  if (!pass || !taskOk) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
