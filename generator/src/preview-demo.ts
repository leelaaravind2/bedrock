/*
 * Thraksha — Step 4 demonstration: the regeneration preview is accurate and
 * developer files are safe.
 *
 * Flow (all against a throwaway scratch project, so the canonical DemoApp is
 * untouched and still hashes the same):
 *   1. Generate the canonical project (4-field Ticket).
 *   2. Simulate a developer writing real logic into a developer-owned file.
 *   3. Change the model — add a `dueDate` field to Ticket.
 *   4. PREVIEW the regeneration (dry run — writes nothing).
 *   5. Apply it.
 *   6. Prove the files that actually changed are EXACTLY the ones the preview
 *      predicted, and the developer's file was left untouched.
 *
 * Run:  npm run preview:demo
 */

import crypto from 'node:crypto';
import os from 'node:os';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet, computePlan, renderPreview, applyPlan } from './core/regen.js';
import { createSpringPlugin } from './plugins/spring/spring-plugin.js';

// The plugin resolves its own templates — no path to keep in sync here.
const PLUGIN = createSpringPlugin();

const SVC_REL = 'backend/src/main/java/com/demoapp/ticket/TicketService.java';

function sha256(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

async function snapshot(dir: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  async function rec(d: string): Promise<void> {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else map.set(path.relative(dir, full).split(path.sep).join('/'), sha256(await fs.readFile(full)));
    }
  }
  await rec(dir);
  return map;
}

/** Canonical model + one extra field on Ticket (the change to preview). */
function buildChangedModel(): ProjectModel {
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
      { name: 'dueDate', type: 'Date' }, // <-- the NEW field
    ],
  });
  return model;
}

function setEquals(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

async function main(): Promise<void> {
  const scratchRoot = process.argv[2] || path.join(os.tmpdir(), 'thraksha-step4-demo');
  const projectDir = path.join(scratchRoot, 'DemoApp');
  await fs.rm(scratchRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });

  // 1) Initial generation (canonical 4-field Ticket).
  await applyPlan(projectDir, await buildFileSet(buildDemoAppModel(), PLUGIN));
  process.stdout.write(`STEP 1: generated canonical DemoApp (4-field Ticket) at\n  ${projectDir}\n\n`);

  // 2) Developer writes real logic into a developer-owned file.
  const svcPath = path.join(projectDir, SVC_REL);
  const devLogic =
    '    // ---- DEVELOPER LOGIC (hand-written, must survive regeneration) ----\n' +
    '    public long openCount() {\n' +
    '        return repository.findAllByOwnerId(currentUser.requireCurrentUserId())\n' +
    '                .stream().filter(t -> !Boolean.TRUE.equals(t.getDone())).count();\n' +
    '    }\n';
  const original = await fs.readFile(svcPath, 'utf8');
  await fs.writeFile(svcPath, original.replace('    // Your business logic goes here.', devLogic));
  const devHashBefore = sha256(await fs.readFile(svcPath));
  process.stdout.write(`STEP 2: developer added openCount() to TicketService.java (a developer-owned file)\n`);
  process.stdout.write(`        hash now: ${devHashBefore}\n\n`);

  // 3) Change the model — add the dueDate field.
  const changedFiles = await buildFileSet(buildChangedModel(), PLUGIN);
  process.stdout.write(`STEP 3: model changed — added field Ticket.dueDate (Date)\n\n`);

  // 4) PREVIEW (dry run — writes nothing).
  const plan = await computePlan(projectDir, changedFiles);
  process.stdout.write(`STEP 4: PREVIEW (nothing written yet)\n`);
  process.stdout.write(`----------------------------------------------------------------\n`);
  process.stdout.write(`${renderPreview('DemoApp', plan)}\n`);
  process.stdout.write(`----------------------------------------------------------------\n\n`);

  // 5) Apply, capturing the real before/after state.
  const before = await snapshot(projectDir);
  await applyPlan(projectDir, changedFiles);
  const after = await snapshot(projectDir);

  // 6) Prove prediction == reality.
  const predictedChanged = new Set<string>([...plan.create, ...plan.change, ...plan.developerCreate]);
  const actualChanged = new Set<string>();
  for (const [rel, h] of after) if (before.get(rel) !== h) actualChanged.add(rel);

  const devHashAfter = sha256(await fs.readFile(svcPath));
  const devUntouched = devHashBefore === devHashAfter;
  const devLogicPresent = (await fs.readFile(svcPath, 'utf8')).includes('openCount');
  const devInUntouchedList = plan.developerUntouched.includes(SVC_REL);

  process.stdout.write(`STEP 5/6: VERIFY prediction vs reality\n`);
  process.stdout.write(`  preview predicted these files would change/create:\n`);
  for (const r of [...predictedChanged].sort()) process.stdout.write(`     - ${r}\n`);
  process.stdout.write(`  files that ACTUALLY changed on disk:\n`);
  for (const r of [...actualChanged].sort()) process.stdout.write(`     - ${r}\n`);

  const changeMatch = setEquals(predictedChanged, actualChanged);
  process.stdout.write(`\n  prediction == reality (changed set)      : ${changeMatch ? 'YES' : 'NO'}\n`);
  process.stdout.write(`  TicketService.java listed as untouched   : ${devInUntouchedList ? 'YES' : 'NO'}\n`);
  process.stdout.write(`  TicketService.java hash unchanged        : ${devUntouched ? 'YES' : 'NO'}\n`);
  process.stdout.write(`  developer logic openCount() still present: ${devLogicPresent ? 'YES' : 'NO'}\n`);

  const pass = changeMatch && devInUntouchedList && devUntouched && devLogicPresent;
  process.stdout.write(`\n  RESULT: ${pass ? 'PASS — the preview was exactly right and your file is safe.' : 'FAIL'}\n`);

  await fs.rm(scratchRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
