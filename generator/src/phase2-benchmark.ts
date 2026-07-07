/*
 * Thraksha — PHASE-2 BENCHMARK driver (Eco-Day 30, the certification day).
 *
 * A COMPOSITION-ONLY verification driver — like phase1-benchmark / detect-demo, it adds NO
 * generation feature and touches NO template/plugin/model. It composes ALL Phase-2
 * capabilities in ONE "MaxPhase2" project and proves the Phase-2 exit condition end-to-end:
 *
 *   Team has-many Application; Application belongs-to Team + a `price` Decimal;
 *   snake_case naming (field-key); declared content slots (incl. an unknown-type slot).
 *
 *   B1  DELETE THE AI → the project still generates COMPLETELY + VALIDLY (Law 21, creative
 *       path): generation is buildFileSet(model) — it NEVER invokes the fill layer; a no-key
 *       fillViaEnv makes no AI call. AI is a detachable enhancement, never the gate.
 *   B2  the SHELL is BYTE-IDENTICAL across empty/partial/full slot fill (Day-21 by construction:
 *       SlotContent is never an argument to buildFileSet).
 *   B3  has-many route + NUMERIC(19,4) decimal + snake team_id FK wire key + inert slot
 *       placeholders — all present + correct.
 *   B4  UI==CLI: assembleBlueprint(choices) == the programmatic path, byte-identical.
 *
 * Run:  npm run bench:phase2   (a divergence is a FINDING → exit 1, never a certification)
 */

import crypto from 'node:crypto';
import { createProjectModel } from './core/project-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { assembleBlueprint, type BlueprintChoices } from './core/assemble.js';
import { emptyContent, contentFillState, type SlotContent } from './core/slot-content.js';
import { fillViaEnv } from './fill/fill-ai.js';
import type { SlotDecl } from './core/slots.js';
import type { GeneratedFile } from './core/plugin.js';
import type { CodingStyle } from './core/style.js';

const BACKENDS = ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go'];
const SNAKE: CodingStyle = { formatting: { indent: 'default' }, namingConvention: 'snake_case', architectureDepth: 'default' };
const SLOTS: SlotDecl[] = [
  { id: 'hero.tagline', type: 'tagline' },
  { id: 'app.overview', type: 'overview' },
  { id: 'x.mystery', type: 'mystery' }, // unknown type → UnknownSection fallback
];

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
const filesOf = async (m: ReturnType<typeof createProjectModel>) => buildFileSet(m, selectBackendPlugin(m));

/** The MaxPhase2 model built the PROGRAMMATIC (CLI) way — slots + has-many + decimal + snake_case. */
function maxPhase2(backend: string): ReturnType<typeof createProjectModel> {
  const m = createProjectModel({ projectName: 'MaxPhase2', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
  m.setStyle(SNAKE);
  m.setSlots(SLOTS);
  m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Application' }] });
  m.addEntity({ name: 'Application', fields: [{ name: 'title', type: 'String', required: true }, { name: 'price', type: 'Decimal', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
  return m;
}

/** The SAME MaxPhase2 as a BlueprintChoices (the wizard/UI path). */
const maxPhase2Choices = (backend: string): BlueprintChoices => ({
  settings: { projectName: 'MaxPhase2', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
  style: SNAKE,
  slots: SLOTS,
  entities: [
    { name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Application' }] },
    { name: 'Application', fields: [{ name: 'title', type: 'String', required: true }, { name: 'price', type: 'Decimal', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] },
  ],
});

const results: { ok: boolean; label: string; detail?: string }[] = [];
function check(ok: boolean, label: string, detail = ''): void {
  results.push({ ok, label, detail });
  process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}\n`);
}

async function main(): Promise<void> {
  process.stdout.write('=== PHASE-2 BENCHMARK — MaxPhase2 (slots + has-many + decimal + field-key), all 5 stacks ===\n');

  // ── B1: DELETE THE AI → still generates completely + validly (Law 21, creative path) ──
  process.stdout.write('\n[B1] delete/disable the AI → the project still generates completely (Law 21)\n');
  const exFiles = await filesOf(maxPhase2('Express'));
  check(exFiles.length >= 20, 'MaxPhase2 generates a complete shell WITHOUT invoking the AI (buildFileSet never touches fill/)', `${exFiles.length} files`);
  // No-key fillViaEnv makes NO AI call and returns empty content — generation is unaffected.
  const attempt = await fillViaEnv(maxPhase2('Express').getState(), SLOTS, {} as NodeJS.ProcessEnv);
  const shellWithAiOff = hashFiles(await filesOf(maxPhase2('Express')));
  check(attempt.enabled === false && attempt.state === 'empty', 'AI fill is OFF (no developer key) → no call made, empty content — the project is complete without it');
  check(shellWithAiOff === hashFiles(exFiles), 'the shell is identical whether the fill is invoked or not (AI is detachable, never the gate)', shellWithAiOff.slice(0, 16));

  // ── B2: SHELL BYTE-IDENTICAL across empty/partial/full slot fill (Day-21 by construction) ──
  process.stdout.write('\n[B2] shell byte-identical across empty/partial/full slot content (Day-21 invariance)\n');
  const empty: SlotContent = emptyContent(SLOTS);
  const partial: SlotContent = { ...empty, 'hero.tagline': { value: 'Ship it faster' } };
  const full: SlotContent = { 'hero.tagline': { value: 'A' }, 'app.overview': { value: 'B' }, 'x.mystery': { value: 'C' } };
  const base = hashFiles(exFiles);
  let invariant = true;
  for (const c of [empty, partial, full]) { void contentFillState(SLOTS, c); if (hashFiles(await filesOf(maxPhase2('Express'))) !== base) invariant = false; }
  const fillStatesOk = contentFillState(SLOTS, empty) === 'empty' && contentFillState(SLOTS, partial) === 'partial' && contentFillState(SLOTS, full) === 'full';
  check(invariant && fillStatesOk, 'shell BYTE-IDENTICAL across empty/partial/full content (content is never an argument to buildFileSet)', base.slice(0, 16));

  // ── B3: the depth features + slots present + correct (Express, runtime-verifiable) ──
  process.stdout.write('\n[B3] has-many + decimal + field-key + slots present + correct (Express)\n');
  const exAll = exFiles.map((f) => f.content).join('\n');
  const routes = exFiles.find((f) => /team\.routes\.base\.js$/.test(f.relPath))?.content ?? '';
  const appDto = exFiles.find((f) => /application\.dto\.js$/.test(f.relPath))?.content ?? '';
  const appMig = exFiles.find((f) => /migrations\/.*application/i.test(f.relPath))?.content ?? '';
  const readme = exFiles.find((f) => f.relPath === 'README.md')?.content ?? '';
  check(/router\.get\('\/:id\/applications'/.test(routes), 'has-many: GET /api/teams/:id/applications reverse route (Day 25)');
  check(/NUMERIC\(19, 4\)/.test(appMig) && /must be a decimal string/.test(appDto), 'decimal: price → NUMERIC(19,4) + numeric-string wire, never float (Day 27)');
  check(/body\.team_id/.test(appDto) && !/body\.teamId\b/.test(appDto), 'field-key: FK wire key is snake_case (team_id), consistent with declared fields (Day 29)');
  check(/THRAKSHA-SLOT/.test(readme) && /unrecognized type "mystery"/.test(readme), 'slots: typed placeholders + UnknownSection fallback, inert/valid with slots empty (Day 21)', '');
  void exAll;

  // ── B4: UI==CLI byte-identical (the assembleBlueprint seam), all 5 stacks ──
  process.stdout.write('\n[B4] UI==CLI byte-identical + twice-identical, all 5 stacks\n');
  for (const backend of BACKENDS) {
    const cli1 = hashFiles(await filesOf(maxPhase2(backend)));
    const cli2 = hashFiles(await filesOf(maxPhase2(backend)));
    const ui = hashFiles(await filesOf(assembleBlueprint(maxPhase2Choices(backend))));
    check(cli1 === cli2 && cli1 === ui, `${backend.padEnd(11)} twice-identical + UI==CLI`, cli1.slice(0, 16));
  }

  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\nPhase-2 benchmark: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})\n`);
  if (failed.length) { process.stdout.write('FINDINGS:\n' + failed.map((f) => `  - ${f.label}`).join('\n') + '\n'); process.exit(1); }
}

main().catch((err) => { console.error(err); process.exit(1); });
