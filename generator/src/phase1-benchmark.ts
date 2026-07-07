/*
 * Thraksha — PHASE-1 BENCHMARK driver (Eco-Day 20, the certification day).
 *
 * A COMPOSITION-ONLY verification driver — like `detect-demo`/`maxcell-driver`, it adds
 * NO generation feature and touches NO template/plugin/model. It exercises the EXISTING
 * live surfaces to prove the whole Phase-1 stack (Days 11–18) holds together END-TO-END
 * as ONE flow, and ties the result to the FROZEN backstop:
 *
 *   wizard(server) → org-policy filters (Day 13) → framework+version pin (Day 11)
 *     → assembleBlueprint (Day 16, the canonical UI==CLI seam) → generate (byte-identical)
 *     → detect (Day 18, honest real-machine) → guide.
 *
 * It spawns the real `dist/server.js` (env-configured: PORT + THRAKSHA_ORG_PROFILE +
 * hermetic output/store roots), drives the real HTTP routes, and cross-checks byte-identity
 * against the programmatic/CLI path (`assembleBlueprint`) and the recorded frozen digests.
 * The digest convention is the harness's (sha256 over relPath\n + content, sorted by relPath).
 *
 * Run:  npm run bench:phase1
 * A divergence is a FINDING (exit 1), never a certification.
 */

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import { restoreProjectModel } from './core/project-model.js';
import { assembleBlueprint, type BlueprintChoices } from './core/assemble.js';
import type { GeneratedFile } from './core/plugin.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../generator/dist
const SERVER = path.join(HERE, 'server.js');
const PORT = Number(process.env.BENCH_PORT || 4321);
const BASE = `http://127.0.0.1:${PORT}`;

// ── The recorded frozen digests this benchmark ties back to (from the harness) ────
const FROZEN_DEFAULT_EXPRESS = 'a437a302cc597ed1809551bdf31fafea569176829db16122b0ea78c68ffd4d65'; // Express|PostgreSQL|DemoApp (simple-mode literal bypass)
const FROZEN_GO_121 = 'e926ef6112153b2663ad706f24c054abd8715170ac472c5a6dcde5cec30b9660'; // Go + go 1.21 version baseline (PART 1g)
// Go is the pinned+forced stack because it has a REAL toolchain gap on this machine (go
// is genuinely not installed) — so the ONE flow shows policy+pin+generate AND a real
// missing-toolchain detect+guide, honestly. (Express+node is fully present here, so it
// could not demonstrate the "detects a missing toolchain and guides" exit condition.)

// ── The benchmark fixtures — SAME shapes the harness PART 1i uses ─────────────────
const TICKET = {
  name: 'Ticket',
  fields: [
    { name: 'title', type: 'String', required: true },
    { name: 'code', type: 'String', unique: true },
    { name: 'priority', type: 'Integer' },
    { name: 'done', type: 'Boolean' },
  ],
};
// The pinned + policy-checked choice: the org profile hard-forces Go; the user pins go 1.21.
const PINNED_CHOICES: BlueprintChoices = {
  settings: { projectName: 'DemoApp', projectType: 'Web App', backend: 'Go', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
  versions: { go: '1.21' },
  entities: [TICKET],
};
// The simple-mode / accept-defaults choice: the literal bypass through the live server.
const DEFAULT_CHOICES: BlueprintChoices = {
  settings: { projectName: 'DemoApp', projectType: 'Web App', backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
  entities: [TICKET],
};
// The org profile: HARD-force Go, HARD-ban MySQL, SOFT-discourage snake_case.
const PROFILE = {
  profileVersion: '1',
  id: 'day20-benchmark',
  dimensions: {
    backend: { forceDefault: 'Go', enforcement: 'hard' },
    database: { ban: ['MySQL'], enforcement: 'hard' },
    'style.namingConvention': { ban: ['snake_case'], enforcement: 'soft' },
  },
};

// ── small utilities (deterministic; no clock/RNG into any assertion) ──────────────
function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
// Rebuild the model from a returned ProjectState and generate — restoreProjectModel is
// the same round-trip the store uses, so this is the wizard's blueprint, generated.
async function filesOfState(state: Parameters<typeof restoreProjectModel>[0]): Promise<GeneratedFile[]> {
  const m = restoreProjectModel(state);
  return buildFileSet(m, selectBackendPlugin(m));
}

function req(method: string, pathname: string, body?: unknown): Promise<{ status: number; json: any }> {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? undefined : Buffer.from(JSON.stringify(body), 'utf8');
    const r = http.request(`${BASE}${pathname}`, { method, headers: data ? { 'content-type': 'application/json', 'content-length': String(data.length) } : {} }, (res) => {
      let buf = '';
      res.on('data', (d) => (buf += d));
      res.on('end', () => { try { resolve({ status: res.statusCode ?? 0, json: buf ? JSON.parse(buf) : null }); } catch (e) { reject(e); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

const results: { ok: boolean; label: string; detail?: string }[] = [];
function check(ok: boolean, label: string, detail = ''): void {
  results.push({ ok, label, detail });
  process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? `  ${detail}` : ''}\n`);
}

async function waitForServer(child: ChildProcess): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('server did not start in 20s')), 20000);
    child.stdout?.on('data', (d) => { if (String(d).includes('Thraksha UI on')) { clearTimeout(to); resolve(); } });
    child.on('exit', (code) => { clearTimeout(to); reject(new Error(`server exited early (${code})`)); });
  });
}

async function main(): Promise<void> {
  // Hermetic scratch: a throwaway output/store + the profile file — never the canonical output.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'thraksha-bench-'));
  const profilePath = path.join(scratch, 'org-profile.json');
  fs.writeFileSync(profilePath, JSON.stringify(PROFILE, null, 2));

  const child = spawn(process.execPath, [SERVER], {
    env: { ...process.env, PORT: String(PORT), THRAKSHA_ORG_PROFILE: profilePath, THRAKSHA_UI_OUTPUT: path.join(scratch, 'out'), THRAKSHA_UI_STORE: path.join(scratch, 'store') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try {
    await waitForServer(child);
    process.stdout.write(`\n=== PHASE-1 BENCHMARK — end-to-end on the live server (port ${PORT}) ===\n`);

    // ── B1+B2: the profile-FILTERED option set (Day 13, live) ────────────────────
    process.stdout.write('\n[B1/B2] org-policy shapes the wizard option set (Day 13)\n');
    const opts = await req('GET', '/api/options');
    const dbOptions: string[] = opts.json?.optionSet?.database ?? [];
    const advis: { dimension: string; message: string }[] = opts.json?.advisories ?? [];
    check(opts.status === 200 && !dbOptions.includes('MySQL'), 'HARD ban → MySQL removed from the database option set', `db=[${dbOptions.join(',')}]`);
    check(opts.json?.defaults?.backend === 'Go', 'HARD forceDefault → backend default is Go', `default=${opts.json?.defaults?.backend}`);
    check(advis.some((a) => a.dimension === 'style.namingConvention' && /snake_case/.test(a.message)), 'SOFT rule → a snake_case advisory is surfaced (input-side only)');
    check(opts.json?.profileId === 'day20-benchmark', 'the active profile id is reported', `profileId=${opts.json?.profileId}`);

    // ── B3+B4: assemble a PINNED framework+version under the profile → generate ───
    process.stdout.write('\n[B3/B4] pinned framework+version → assembleBlueprint → generate byte-identical (UI==CLI)\n');
    const a1 = await req('POST', '/api/assemble', PINNED_CHOICES);
    const a2 = await req('POST', '/api/assemble', PINNED_CHOICES);
    const liveState1 = a1.json?.state, liveState2 = a2.json?.state;
    const dLive1 = hashFiles(await filesOfState(liveState1));
    const dLive2 = hashFiles(await filesOfState(liveState2));
    // The programmatic/CLI path for the SAME choices.
    const cliModel = assembleBlueprint(PINNED_CHOICES);
    const dCli = hashFiles(await buildFileSet(cliModel, selectBackendPlugin(cliModel)));
    check(dLive1 === dLive2, 'live wizard generate is twice-identical', dLive1.slice(0, 16));
    check(dLive1 === dCli, 'UI==CLI: live-server blueprint == programmatic assembleBlueprint (byte-identical)', `${dLive1.slice(0, 12)}==${dCli.slice(0, 12)}`);
    check(dLive1 === FROZEN_GO_121, 'live-server generate == recorded Go+go1.21 version baseline (Day 11)', dLive1.slice(0, 16));

    // Prove the LIVE preview + generate write path runs, and scan the WRITTEN files for a policy leak.
    const preview = await req('GET', '/api/preview');
    check(preview.status === 200 && typeof preview.json?.text === 'string' && preview.json.text.length > 0, 'GET /api/preview renders the plan (dry run)');
    const gen = await req('POST', '/api/generate');
    check(gen.status === 200 && !!gen.json?.outcome, 'POST /api/generate writes the project');
    // No profile/UI/enforcement metadata may appear in ANY generated file (Day-13 provenance rule).
    const files = await filesOfState(liveState1);
    const leak = files.find((f) => /day20-benchmark|forceDefault|enforcement|discouraged|advisor/i.test(f.content));
    check(!leak, 'NO org-policy/UI metadata leaked into any generated file (Day-13 provenance)', leak ? `LEAK:${leak.relPath}` : `${files.length} files clean`);

    // ── B3(bypass): simple-mode/default choices through the SAME server → frozen ──
    process.stdout.write('\n[B4-bypass] simple-mode default choices (live) → frozen baseline (literal bypass)\n');
    const d = await req('POST', '/api/assemble', DEFAULT_CHOICES);
    const dDefault = hashFiles(await filesOfState(d.json?.state));
    check(dDefault === FROZEN_DEFAULT_EXPRESS, 'DEFAULT choices under a profile → still the frozen DemoApp baseline (profile has NO write-path to generation)', dDefault.slice(0, 16));

    // ── B5: DETECT this machine + GUIDE (Day 18, honest real-machine) ────────────
    //     Re-assemble the PINNED Go blueprint so detection runs against IT (the server
    //     holds one model; the B4-bypass Express POST above left it current otherwise).
    process.stdout.write('\n[B5] detect-and-guide against THIS machine for the pinned Go blueprint (Day 18, honest)\n');
    await req('POST', '/api/assemble', PINNED_CHOICES);
    const det = await req('GET', '/api/detect');
    const rep = det.json;
    const missOrMismatch = (rep?.tools ?? []).filter((t: any) => t.status !== 'present');
    const guided = missOrMismatch.every((t: any) => t.guidance && typeof t.guidance.installUrl === 'string' && t.guidance.installUrl.length > 0);
    for (const t of rep?.tools ?? []) process.stdout.write(`       ${t.status.toUpperCase().padEnd(9)} ${String(t.tool).padEnd(7)} ${t.detected ? 'detected ' + t.detected : 'not found'}${t.pin ? ' (pins ' + t.pin + ')' : ''}${t.guidance ? '  → ' + t.guidance.installUrl : ''}\n`);
    process.stdout.write(`       container: ${rep?.container?.available ? 'available (' + rep.container.runtime + ')' : 'none'}\n`);
    const goTool = (rep?.tools ?? []).find((t: any) => t.tool === 'go');
    check(det.status === 200 && Array.isArray(rep?.tools) && rep.tools.length > 0, 'GET /api/detect returns a real-machine report for the pinned Go blueprint');
    check(!!goTool && goTool.status === 'missing', 'a REAL missing toolchain is detected on this machine (go, genuinely not installed — not contrived)', `go=${goTool?.status}`);
    check(missOrMismatch.length > 0 && guided, 'every missing/mismatch carries guidance + an official install link (never silent)', `${missOrMismatch.length} gap(s)`);
    check(rep?.summary?.canBuildNatively === false && rep?.container?.available === true, 'honest exit: cannot build natively here, but the container-build path IS offered', `native=${rep?.summary?.canBuildNatively} container=${rep?.container?.runtime}`);
    check(/not a guarantee/i.test(rep?.summary?.note ?? ''), 'determinism ≠ validity: the report carries the “can build, not will build” caveat');
  } finally {
    child.kill();
    try { fs.rmSync(scratch, { recursive: true, force: true }); } catch { /* best effort */ }
  }

  const failed = results.filter((r) => !r.ok);
  process.stdout.write(`\nPhase-1 benchmark: ${failed.length === 0 ? 'PASS' : 'FAIL'} (${results.length - failed.length}/${results.length})\n`);
  if (failed.length) { process.stdout.write('FINDINGS:\n' + failed.map((f) => `  - ${f.label}`).join('\n') + '\n'); process.exit(1); }
}

main().catch((err) => { console.error(err); process.exit(1); });
