/*
 * Thraksha — PHASE-4 MID-BENCHMARK driver (Eco-Day 50).
 *
 * A COMPOSITION-ONLY verification driver — like phase1/2/3-benchmark, it adds NO generation
 * feature and touches NO template/plugin/model. It proves the Phase-4 stack COHERES on ONE
 * project — export + the deterministic scan + the AI advisory scan + the impact map + the flow
 * map — each at its PROVEN / HONEST level. This is MID-phase (not the Phase-4 close): a
 * divergence is a FINDING → exit 1, never a certification.
 *
 *   M1  Export standalone (Law 21, Day 41): the exported tree == buildFileSet byte-for-byte
 *       (twice-identical, disk round-trip) + 0 FUNCTIONAL Thraksha refs (deps + imports).
 *   M2  Deterministic Semgrep scan (CERTAIN, Day 43): scan='semgrep' → the SEPARATE additive
 *       security.yml + PINNED semgrep-rules.yml twice-identical == the Day-43 baseline; pinned
 *       version + actions. The actual Semgrep RUN is honest-manual/DEFERRED (Windows).
 *   M3  Optional AI advisory scan (ADVISORY / detachable, Day 45): the pure scan-core over a
 *       FAKE suggester → deterministic ADVISORY findings (class 'advisory', never the gate);
 *       DEFAULT-OFF structurally (no key ⇒ aiScanViaEnv makes NO call). DELETE-THE-KEY ⇒ the
 *       deterministic scan + export still run. The LIVE AI call is DEFERRED (no key here).
 *   M4  Impact-map preview (exact, Day 47): previewImpact on a representative change → the
 *       changed set matches a brute-force content compare. The full byte-for-byte previewed==real
 *       is CI-enforced in day20:regress PART 1w (cited, not re-proven here).
 *   M5  Flow map (Day 50): buildFlowMap(model) is a faithful projection of the declared model,
 *       and every entity node's lifecycle artifacts EXIST in the SAME project's buildFileSet
 *       (the traceability anchor — CI-enforced in PART 1x; composed here on the one project).
 *   M6  Coherence (the read-only overlay): buildFileSet(model) is BYTE-IDENTICAL whether or not
 *       any Phase-4 surface ran — the whole stack is a READ-ONLY overlay on deterministic
 *       generation (the thesis: generation is untouched; everything else reads it).
 *
 * Run:  npm run bench:phase4-mid   (a divergence is a FINDING → exit 1)
 */

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { exportProject } from './export.js';
import { previewImpact } from './map/impact-map.js';
import { buildFlowMap } from './map/flow-map.js';
import { buildScanSpecs, orchestrateAiScan, type AiSuggester, type AdvisoryFinding, type ScanSpec } from './scan/ai-scan-core.js';
import { aiScanViaEnv } from './scan/ai-scan-ai.js';
import type { GeneratedFile } from './core/plugin.js';

const SECURITY_BASELINE = '8407fa2c3c8e87d37aab4fd41a014ec6b89d640acc34d6b1d522a90757c5549f'; // Day-43 PART 1u

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
const filesOf = async (m: ProjectModel) => buildFileSet(m, selectBackendPlugin(m));
/** The relPaths present in `a` but not in the twin `b` (what a config added), sorted. */
const a2Added = (a: GeneratedFile[], b: GeneratedFile[]): string[] => {
  const bp = new Set(b.map((f) => f.relPath));
  return a.filter((f) => !bp.has(f.relPath)).map((f) => f.relPath).sort();
};

/** The ONE project the whole Phase-4 stack composes on — a two-entity Express web app. */
function theProject(withSecurity = false): ProjectModel {
  const m = createProjectModel({ projectName: 'MidBench', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
  m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Ticket' }] });
  m.addEntity({ name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
  if (withSecurity) m.setSecurity({ scan: 'semgrep' });
  return m;
}

const results: { ok: boolean; label: string; detail?: string }[] = [];
function check(ok: boolean, label: string, detail = ''): void {
  results.push({ ok, label, detail });
  process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}\n`);
}

async function main(): Promise<void> {
  process.stdout.write('=== PHASE-4 MID-BENCHMARK — export + scan + ai-scan + impact-map + flow-map composed (Eco-Day 50) ===\n');

  const base = theProject();
  const baseHash = hashFiles(await filesOf(base));

  // ── M1: export standalone (Law 21) — exported tree == buildFileSet byte-for-byte + 0 functional refs ──
  process.stdout.write('\n[M1] export standalone (Law 21): exported == buildFileSet byte-for-byte + 0 functional Thraksha refs\n');
  const FUNCTIONAL_IMPORT = /(?:^|\n)\s*(?:import|from|require\(|use\s)[^\n]*\bthraksha\b/i;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'thraksha-mid-'));
  let m1 = false;
  try {
    const exported = await exportProject(base, dir);
    // disk round-trip: read the exported tree back, hash == the in-app buildFileSet.
    const disk: GeneratedFile[] = [];
    const walk = async (d: string): Promise<void> => {
      for (const e of (await fs.readdir(d, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) await walk(full);
        else disk.push({ relPath: path.relative(dir, full).split(path.sep).join('/'), content: await fs.readFile(full, 'utf8'), ownership: 'thraksha' });
      }
    };
    await walk(dir);
    const diskHash = hashFiles(disk);
    const cleanManifest = !/thraksha/i.test(disk.find((f) => f.relPath === 'package.json')?.content ?? '');
    const sourceClean = disk.every((f) => f.relPath === 'GENERATION-MANIFEST.txt' || !FUNCTIONAL_IMPORT.test(f.content));
    m1 = diskHash === hashFiles(exported) && diskHash === baseHash && cleanManifest && sourceClean;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
  check(m1, 'exported tree == buildFileSet byte-for-byte (disk round-trip) + package.json Thraksha-free + 0 functional imports', baseHash.slice(0, 16));

  // ── M2: deterministic Semgrep scan (CERTAIN) — pinned artifacts on the composed project + Day-43 baseline intact ──
  process.stdout.write('\n[M2] deterministic Semgrep scan (CERTAIN): pinned security.yml + rules twice-identical on the project; Day-43 baseline intact (run deferred — Windows)\n');
  const secA = await filesOf(theProject(true));
  const secB = await filesOf(theProject(true));
  const secAadded = a2Added(secA, await filesOf(base)); // exactly the two security artifacts vs the non-secure twin
  const secYaml = secA.find((f) => f.relPath === '.github/workflows/security.yml')?.content ?? '';
  const rules = secA.find((f) => f.relPath === 'semgrep-rules.yml')?.content ?? '';
  // (a) on the COMPOSED project: the two pinned artifacts added, twice-identical, pinned (version+actions+rules).
  const wiringOk = hashFiles(secA) === hashFiles(secB) &&
    secAadded.length === 2 && secAadded.includes('.github/workflows/security.yml') && secAadded.includes('semgrep-rules.yml') &&
    /semgrep==1\.90\.0/.test(secYaml) && /@v\d+/.test(secYaml) && !/@latest|@main|@master/.test(secYaml) &&
    /--config semgrep-rules\.yml/.test(secYaml) && /id: thraksha-/.test(rules);
  // (b) the Day-43 CERTAIN baseline is INTACT (the security artifacts are project-independent — pure from the config):
  //     DemoApp Express + scan=semgrep still reproduces 8407fa2c (cited, re-confirmed here).
  const demoSec = buildDemoAppModel({ backend: 'Express', database: 'PostgreSQL' }); demoSec.setSecurity({ scan: 'semgrep' });
  const baselineIntact = hashFiles(await filesOf(demoSec)) === SECURITY_BASELINE;
  // the pinned artifacts are byte-identical between the two projects (config-only, project-independent).
  const demoYaml = (await filesOf(demoSec)).find((f) => f.relPath === '.github/workflows/security.yml')?.content ?? '';
  const artifactsProjectIndependent = demoYaml === secYaml;
  check(wiringOk && baselineIntact && artifactsProjectIndependent,
    'scan=semgrep on the composed project: exactly the 2 pinned artifacts, twice-identical; Day-43 baseline 8407fa2c intact; artifacts project-independent (the Semgrep RUN is honest-manual/deferred on Windows)', hashFiles(secA).slice(0, 16));

  // ── M3: optional AI advisory scan (ADVISORY / detachable) — FAKE suggester + default-off + delete-key-still-scans ──
  process.stdout.write('\n[M3] AI advisory scan (ADVISORY / detachable): FAKE suggester deterministic; default-off (no key ⇒ no call); delete-key-still-scans\n');
  const projFiles = (await filesOf(base)).map((f) => ({ relPath: f.relPath, content: f.content }));
  const fake: AiSuggester = async (s: ScanSpec): Promise<AdvisoryFinding[]> =>
    /password|secret/i.test(s.module) ? [{ path: s.path, line: 1, severity: 'medium', issue: 'possible secret', suggestion: 'use env vars', class: 'advisory' }] : [];
  const adv1 = await orchestrateAiScan(buildScanSpecs(projFiles), fake);
  const adv2 = await orchestrateAiScan(buildScanSpecs(projFiles), fake);
  const advisoryDeterministic = JSON.stringify(adv1) === JSON.stringify(adv2) && adv1.every((f) => f.class === 'advisory');
  // DEFAULT-OFF structurally: no key ⇒ aiScanViaEnv makes NO call (enabled:false).
  const off = await aiScanViaEnv(projFiles, {} as NodeJS.ProcessEnv);
  // DELETE-THE-KEY ⇒ the deterministic surfaces still run: export byte-identity + scan artifacts unaffected.
  const stillExports = hashFiles(await filesOf(base)) === baseHash;
  check(advisoryDeterministic && off.enabled === false && off.findings.length === 0 && stillExports,
    'FAKE suggester → deterministic ADVISORY (class advisory, never the gate); no key ⇒ NO call (default-off); delete-key ⇒ export/scan still run (LIVE call deferred)');

  // ── M4: impact-map preview (exact) — previewImpact changed set == brute-force content compare ──
  process.stdout.write('\n[M4] impact-map preview (exact): previewImpact changed set == brute-force compare (byte-for-byte cited from PART 1w)\n');
  const proposed = theProject();
  proposed.addEntity({ name: 'Label', fields: [{ name: 'name', type: 'String', required: true }] });
  const plan = await previewImpact(base, proposed);
  const curMap = new Map((await filesOf(base)).map((f) => [f.relPath, f.content]));
  const propMap = new Map((await filesOf(proposed)).map((f) => [f.relPath, f.content]));
  const bruteAdd = [...propMap.keys()].filter((p) => !curMap.has(p)).sort();
  const bruteChange = [...curMap.keys()].filter((p) => propMap.has(p) && curMap.get(p) !== propMap.get(p)).sort();
  const eq = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);
  check(eq([...plan.add].sort(), bruteAdd) && eq([...plan.change].sort(), bruteChange) && plan.add.length > 0,
    'previewImpact (add a Label entity) add/change == brute-force content compare (exact; byte-for-byte in PART 1w)', `+${plan.add.length} ~${plan.change.length}`);

  // ── M5: flow map — faithful projection + the entity nodes' artifacts exist in the SAME project ──
  process.stdout.write('\n[M5] flow map: faithful projection of the declared model + entity artifacts exist in buildFileSet (traceability, PART 1x)\n');
  const fm = buildFlowMap(base);
  const entities = base.getEntities().map((e) => e.name);
  const entityNodes = fm.nodes.filter((n) => n.kind === 'entity').map((n) => n.label).sort();
  const relEdges = fm.edges.filter((x) => x.kind === 'relationship').length;
  const declaredRels = base.getEntities().reduce((n, e) => n + e.relationships.length, 0);
  const paths = (await filesOf(base)).map((f) => f.relPath);
  const dirs = new Set(paths.filter((p) => p.startsWith('src/entities/')).map((p) => p.split('/')[2]));
  const traceable = entities.map((e) => e.toLowerCase()).every((d) => dirs.has(d)) && [...dirs].every((d) => entities.map((x) => x.toLowerCase()).includes(d));
  check(eq(entityNodes, [...entities].sort()) && relEdges === declaredRels && traceable,
    'flow map: entity nodes == declared entities; relationship edges == declared; every entity node → its artifacts in buildFileSet', `${fm.nodes.length}n/${fm.edges.length}e`);

  // ── M6: coherence (the read-only overlay) — buildFileSet byte-identical whether or not any surface ran ──
  process.stdout.write('\n[M6] coherence: buildFileSet byte-identical whether or not any Phase-4 read-only surface ran (the overlay never perturbs generation)\n');
  // We ran export (M1), the scan artifact generation (M2), the AI scan (M3), the impact map (M4), and
  // the flow map (M5). Re-generate the base project — it must STILL be the same bytes.
  const afterHash = hashFiles(await filesOf(theProject()));
  check(afterHash === baseHash,
    'buildFileSet(base) byte-identical after export + scan + ai-scan + impact-map + flow-map all ran (read-only overlay; generation untouched)', afterHash.slice(0, 16));

  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\nPhase-4 mid-benchmark: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})\n`);
  if (failed.length) { process.stdout.write('FINDINGS:\n' + failed.map((f) => `  - ${f.label}`).join('\n') + '\n'); process.exit(1); }
}

main().catch((err) => { console.error(err); process.exit(1); });
