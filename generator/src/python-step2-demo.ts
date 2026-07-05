/*
 * Thraksha — Python (FastAPI) Step 2 proof: file separation + multi-user.
 *
 * Proves the Python stack has the same two guarantees Spring and Express have:
 *
 *   1. File separation (ADR-002) — a developer's hand-written Python logic in a
 *      developer-owned file survives regeneration, while Thraksha-owned files are
 *      rewritten. Proven exactly as for Spring/Express: author real logic into a
 *      developer file, tamper a generated file, regenerate twice, and check.
 *
 *   2. Multi-user (ADR-005) — when the project is multi-user, every Python entity
 *      is owner-scoped: an owner_id column in the model + migration (with an
 *      index), and owner-scoped reads/writes in the repository.
 *
 * Also confirms Python stays deterministic (its stable hash, identical across two
 * runs) and that Spring and Express are completely unaffected.
 *
 * No AI (ADR-001). No randomness (ADR-003). Run:  npm run python:demo
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet, applyPlan } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { GeneratedFile } from './core/plugin.js';
import type { ProjectModel } from './core/project-model.js';

// The Spring and Express baselines (established before Python existed). If adding
// or hardening Python ever changed these, that would violate the hard requirement.
const SPRING_FULL = '010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c';
const EXPRESS_FULL = 'a437a302cc597ed1809551bdf31fafea569176829db16122b0ea78c68ffd4d65';

function sha(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Full file-set hash (leading-slash convention — matches the two-stacks demo). */
function fullHash(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

/** Hash of only the Thraksha-owned (regenerable) files. */
function generatedHash(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].filter((x) => x.ownership === 'thraksha').sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

async function fileSetFor(backend: string): Promise<GeneratedFile[]> {
  const model: ProjectModel = buildDemoAppModel({ backend });
  return buildFileSet(model, selectBackendPlugin(model));
}

async function main(): Promise<void> {
  const root = process.argv[2] || path.join(os.tmpdir(), 'thraksha-python-step2');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  const projectDir = path.join(root, 'DemoApp');

  const results: boolean[] = [];
  const check = (label: string, ok: boolean) => {
    results.push(ok);
    process.stdout.write(`  ${ok ? 'PASS' : 'FAIL'}  ${label}\n`);
  };

  // ---- Determinism: same model -> byte-for-byte identical, twice ----
  process.stdout.write(`Python determinism (ADR-003):\n`);
  const py1 = await fileSetFor('FastAPI');
  const py2 = await fileSetFor('FastAPI');
  const pyFull = fullHash(py1);
  const pyGen = generatedHash(py1);
  check(`two runs identical (full hash ${pyFull.slice(0, 8)}…)`, pyFull === fullHash(py2));
  check(`generated-only hash stable (${pyGen.slice(0, 8)}…)`, pyGen === generatedHash(py2));

  // ---- Multi-user structure (ADR-005): owner column + scoped queries ----
  process.stdout.write(`\nPython multi-user owner scoping (ADR-005):\n`);
  const byPath = new Map(py1.map((f) => [f.relPath, f.content]));
  const model = byPath.get('app/entities/ticket/model.py') ?? '';
  const repo = byPath.get('app/entities/ticket/repository.py') ?? '';
  const migration = byPath.get('migrations/V2__create_tickets.sql') ?? '';
  check('model.py declares an owner_id column', /owner_id = Column\(BigInteger/.test(model));
  check('migration creates the owner_id column', /owner_id\s+BIGINT/.test(migration));
  check('migration indexes owner_id', /CREATE INDEX idx_tickets_owner_id ON tickets \(owner_id\)/.test(migration));
  check('repository scopes reads to the owner', /where\(Ticket\.owner_id == owner_id\)/.test(repo));
  check('repository scopes get() to id AND owner', /where\(Ticket\.id == item_id, Ticket\.owner_id == owner_id\)/.test(repo));
  check('repository sets owner on insert', /Ticket\(\*\*data, owner_id=owner_id\)/.test(repo));

  // ---- File separation (ADR-002): dev logic survives regeneration ----
  process.stdout.write(`\nPython file separation (ADR-002):\n`);
  await applyPlan(projectDir, py1);
  const svcRel = 'app/entities/ticket/service.py'; // developer-owned
  const genRel = 'app/entities/ticket/router_base.py'; // Thraksha-owned
  const svcPath = path.join(projectDir, svcRel);
  const genPath = path.join(projectDir, genRel);

  // A developer writes real, hand-authored business logic into the dev file.
  const handLogic =
    '\n    def open_count(self, db, owner_id):\n' +
    '        """Hand-written: how many of MY tickets are not done."""\n' +
    '        return sum(1 for t in self.list(db, owner_id) if not t.done)\n';
  const original = await fs.readFile(svcPath, 'utf8');
  await fs.writeFile(svcPath, original.replace('    pass', '    pass' + handLogic));
  const devHashBefore = sha(await fs.readFile(svcPath));

  // Someone tampers a generated file; regeneration must overwrite it.
  await fs.writeFile(genPath, (await fs.readFile(genPath, 'utf8')) + '\n# TAMPER-MARKER-SHOULD-DISAPPEAR\n');

  // Regenerate twice (the danger is always the *second* time).
  await applyPlan(projectDir, await fileSetFor('FastAPI'));
  await applyPlan(projectDir, await fileSetFor('FastAPI'));

  const devHashAfter = sha(await fs.readFile(svcPath));
  const devText = await fs.readFile(svcPath, 'utf8');
  const genText = await fs.readFile(genPath, 'utf8');
  check('developer service.py byte-identical after 2 regenerations', devHashBefore === devHashAfter);
  check('hand-written open_count() logic still present', devText.includes('open_count'));
  check('tampered Thraksha router_base.py was rewritten (tamper gone)', !genText.includes('TAMPER-MARKER-SHOULD-DISAPPEAR'));

  // ---- Peers unaffected ----
  process.stdout.write(`\nSpring & Express unaffected (hard requirement):\n`);
  check(`Spring hash unchanged (${SPRING_FULL.slice(0, 8)}…)`, fullHash(await fileSetFor('Spring Boot')) === SPRING_FULL);
  check(`Express hash unchanged (${EXPRESS_FULL.slice(0, 8)}…)`, fullHash(await fileSetFor('Express')) === EXPRESS_FULL);

  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });

  const pass = results.every(Boolean);
  process.stdout.write(`\nRESULT: ${pass ? 'PASS — Python file separation + multi-user proven; deterministic; peers unchanged.' : 'FAIL'}\n`);
  process.stdout.write(`Python stable hash: full=${pyFull} generated=${pyGen}\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
