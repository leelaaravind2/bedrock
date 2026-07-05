/*
 * Thraksha — Step 5 demonstration: versioning + rollback.
 *
 * Full cycle (all in a throwaway temp dir, so the canonical DemoApp is
 * untouched and still hashes 196f5472…):
 *   1. Save version 1 (Ticket: title, code, priority, done) and generate it.
 *   2. The developer writes real logic into a developer-owned file.
 *   3. Change the model — add Ticket.dueDate — save version 2, regenerate.
 *   4. Roll back to version 1.
 *   5. Prove (a) the GENERATED output now equals version 1's exact generated
 *      output (same hash) — determinism across versions; and (b) the
 *      developer's hand-written logic survived the rollback.
 *
 * Run:  npm run version:demo
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet, applyPlan } from './core/regen.js';
import type { GeneratedFile } from './core/plugin.js';
import { VersionStore } from './core/versioning.js';
import { createSpringPlugin } from './plugins/spring/spring-plugin.js';

// The plugin resolves its own templates — no path to keep in sync here.
const PLUGIN = createSpringPlugin();
const SVC_REL = 'backend/src/main/java/com/demoapp/ticket/TicketService.java';
const BASE_REL = 'backend/src/main/java/com/demoapp/ticket/TicketBase.java';

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/** Hash of the GENERATED (Thraksha-owned) output — the regenerable part. */
function generatedHashFromContent(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].filter((x) => x.ownership === 'thraksha').sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

/** Hash of the Thraksha-owned files AS THEY ARE ON DISK now. */
async function generatedHashFromDisk(projectDir: string, files: GeneratedFile[]): Promise<string> {
  const h = crypto.createHash('sha256');
  for (const f of [...files].filter((x) => x.ownership === 'thraksha').sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`${f.relPath}\n`);
    h.update(await fs.readFile(path.join(projectDir, f.relPath)));
  }
  return h.digest('hex');
}

/** Canonical model + one extra field on Ticket (the v2 change). */
function buildV2Model(): ProjectModel {
  const model = createProjectModel({
    projectName: 'DemoApp',
    projectType: 'Web App',
    backend: 'Spring Boot',
    frontend: 'React',
    database: 'PostgreSQL',
    multiUser: true,
    auth: 'Simple login',
  });
  model.addEntity({
    name: 'Ticket',
    fields: [
      { name: 'title', type: 'String', required: true },
      { name: 'code', type: 'String', unique: true },
      { name: 'priority', type: 'Integer' },
      { name: 'done', type: 'Boolean' },
      { name: 'dueDate', type: 'Date' }, // the new field in v2
    ],
  });
  return model;
}

async function main(): Promise<void> {
  const root = process.argv[2] || path.join(os.tmpdir(), 'thraksha-step5-demo');
  const storeDir = path.join(root, 'store');
  const projectDir = path.join(root, 'DemoApp');
  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  const store = new VersionStore(storeDir);

  // 1) Version 1 — canonical 4-field Ticket. Save it, then generate it.
  const v1Model = buildDemoAppModel();
  await store.saveVersion(v1Model, 'initial: Ticket(title, code, priority, done)');
  const v1Files = await buildFileSet(v1Model, PLUGIN);
  await applyPlan(projectDir, v1Files);
  const G1 = generatedHashFromContent(v1Files); // v1's canonical generated-output hash
  process.stdout.write(`STEP 1: saved v1 and generated it.\n`);
  process.stdout.write(`        v1 generated-output hash G1 = ${G1}\n\n`);

  // 2) Developer writes real logic into a developer-owned file.
  const svcPath = path.join(projectDir, SVC_REL);
  const devLogic =
    '    // ---- DEVELOPER LOGIC (hand-written, must survive rollback) ----\n' +
    '    public long openCount() {\n' +
    '        return repository.findAllByOwnerId(currentUser.requireCurrentUserId())\n' +
    '                .stream().filter(t -> !Boolean.TRUE.equals(t.getDone())).count();\n' +
    '    }\n';
  await fs.writeFile(svcPath, (await fs.readFile(svcPath, 'utf8')).replace('    // Your business logic goes here.', devLogic));
  const devHashAfterEdit = sha256(await fs.readFile(svcPath));
  process.stdout.write(`STEP 2: developer added openCount() to TicketService.java (developer-owned).\n`);
  process.stdout.write(`        TicketService.java hash = ${devHashAfterEdit}\n\n`);

  // 3) Version 2 — add Ticket.dueDate. Save it and regenerate.
  const v2Model = buildV2Model();
  await store.saveVersion(v2Model, 'add Ticket.dueDate (Date)');
  const v2Files = await buildFileSet(v2Model, PLUGIN);
  await applyPlan(projectDir, v2Files);
  const G2 = generatedHashFromContent(v2Files);
  const devSurvivedV2 = (await fs.readFile(svcPath, 'utf8')).includes('openCount');
  process.stdout.write(`STEP 3: saved v2 (added dueDate) and regenerated.\n`);
  process.stdout.write(`        v2 generated-output hash G2 = ${G2}\n`);
  process.stdout.write(`        G1 != G2 (the versions differ): ${G1 !== G2}\n`);
  process.stdout.write(`        developer logic survived the v2 regeneration: ${devSurvivedV2}\n`);
  process.stdout.write(`        TicketBase.java now has dueDate: ${(await fs.readFile(path.join(projectDir, BASE_REL), 'utf8')).includes('dueDate')}\n\n`);

  // History.
  const history = await store.listVersions();
  process.stdout.write(`VERSION HISTORY (head = v${history.head}):\n`);
  for (const v of history.versions) {
    process.stdout.write(`  ${v.version === history.head ? '* ' : '  '}v${v.version}: ${v.note}\n`);
  }
  process.stdout.write(`\n`);

  // 4) Roll back to version 1.
  const result = await store.rollback(1, projectDir, PLUGIN);
  process.stdout.write(`STEP 4: rolled back v${result.from} -> v${result.to}.\n`);
  process.stdout.write(
    `        Thraksha: changed ${result.outcome.changed.length}, unchanged ${result.outcome.unchanged.length}, ` +
      `removed ${result.orphansRemoved.length}; developer files untouched: ${result.outcome.developerUntouched.length}\n\n`,
  );

  // 5) Proof.
  const diskGenHashNow = await generatedHashFromDisk(projectDir, v1Files);
  const devHashNow = sha256(await fs.readFile(svcPath));
  const devLogicPresent = (await fs.readFile(svcPath, 'utf8')).includes('openCount');
  const baseHasDueDateNow = (await fs.readFile(path.join(projectDir, BASE_REL), 'utf8')).includes('dueDate');

  process.stdout.write(`STEP 5: VERIFY\n`);
  process.stdout.write(`  (a) generated output reproduces v1 exactly:\n`);
  process.stdout.write(`        on-disk generated hash = ${diskGenHashNow}\n`);
  process.stdout.write(`        v1 canonical hash G1   = ${G1}\n`);
  process.stdout.write(`        match (== G1, and != G2): ${diskGenHashNow === G1 && diskGenHashNow !== G2}\n`);
  process.stdout.write(`        TicketBase.java dueDate gone (reverted to v1): ${!baseHasDueDateNow}\n`);
  process.stdout.write(`  (b) developer file survived rollback:\n`);
  process.stdout.write(`        TicketService.java hash unchanged from STEP 2: ${devHashNow === devHashAfterEdit}\n`);
  process.stdout.write(`        openCount() logic still present: ${devLogicPresent}\n`);

  const pass =
    diskGenHashNow === G1 &&
    diskGenHashNow !== G2 &&
    !baseHasDueDateNow &&
    devHashNow === devHashAfterEdit &&
    devLogicPresent;
  process.stdout.write(`\n  RESULT: ${pass ? 'PASS — rollback reproduced v1 exactly AND preserved developer logic.' : 'FAIL'}\n`);

  await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
