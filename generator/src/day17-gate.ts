/*
 * Thraksha — Day 17 EXECUTION gate harness (temporary; not part of the product).
 *
 * NONE       The full 20-hash matrix under integrations=none stays byte-identical
 *            (the literal bypass) — both the Phase-A manifest lines AND the (none)
 *            defaults line unmoved.
 * EMAIL      FastAPI + Express email-enabled (DemoApp, Postgres) generate twice →
 *            byte-identical (recorded), and differ from the none output (the
 *            addition is real).
 * COHERENCE  Per stack: a callable email service exists and is wired; the config
 *            reads exactly the SMTP_* vars declared in .env.example (no dangling
 *            either way); NO baked secret (only env placeholders); README truthful.
 *
 * Run:  node dist/day17-gate.js
 */

import crypto from 'node:crypto';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { ProjectModel } from './core/project-model.js';
import type { GeneratedFile } from './core/plugin.js';

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
const LANDED_EMAIL = ['FastAPI', 'Express'];

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) { h.update(`/${f.relPath}\n`); h.update(Buffer.from(f.content, 'utf8')); }
  return h.digest('hex');
}
async function filesOf(model: ProjectModel): Promise<GeneratedFile[]> {
  return buildFileSet(model, selectBackendPlugin(model));
}
async function hashOf(model: ProjectModel): Promise<string> {
  return hashFiles(await filesOf(model));
}
function withEmail(model: ProjectModel): ProjectModel {
  model.setIntegrations({ email: 'smtp', ai: 'none' });
  return model;
}
/** All SMTP_* env names a string reads via os.environ / process.env. */
function smtpVarsRead(content: string): Set<string> {
  const out = new Set<string>();
  for (const m of content.matchAll(/(?:os\.environ\.get|process\.env)[.(]?\s*["'`]?(SMTP_[A-Z_]+)/g)) out.add(m[1]);
  return out;
}
/** SMTP_* env names DECLARED in a .env.example (LINES like SMTP_HOST=). */
function smtpVarsDeclared(content: string): Set<string> {
  const out = new Set<string>();
  for (const m of content.matchAll(/^(SMTP_[A-Z_]+)=/gm)) out.add(m[1]);
  return out;
}
function eqSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

/** Per-stack email coherence check on the generated file set. */
function coherence(backend: string, files: GeneratedFile[]): { ok: boolean; detail: string } {
  const byPath = new Map(files.map((f) => [f.relPath, f.content]));
  const svcPath = backend === 'FastAPI' ? 'app/email.py' : 'src/email.js';
  const envPath = '.env.example';
  const readmePath = 'README.md';
  const configPath = backend === 'FastAPI' ? 'app/config.py' : 'src/email.js'; // Express reads env in the service
  const svc = byPath.get(svcPath) ?? '';
  const env = byPath.get(envPath) ?? '';
  const readme = byPath.get(readmePath) ?? '';
  const config = byPath.get(configPath) ?? '';

  const serviceExists = svc.length > 0;
  // Wired: the service is LOADED at startup (so a broken mailer fails the boot) —
  // FastAPI main.py imports it; Express app.js requires it.
  const mainOrIndex = backend === 'FastAPI' ? (byPath.get('app/main.py') ?? '') : (byPath.get('src/app.js') ?? '');
  const wired = backend === 'FastAPI'
    ? /from \. import email\b/.test(mainOrIndex)
    : /require\(['"]\.\/email['"]\)/.test(mainOrIndex);
  // Express dependency facet: the require resolves only if nodemailer is declared.
  const depOk = backend !== 'Express' || /"nodemailer":/.test(byPath.get('package.json') ?? '');
  // Declaration match: the SMTP_* the config/service READS == those DECLARED in .env.example.
  const read = smtpVarsRead(config.length > 0 ? config : svc);
  const declared = smtpVarsDeclared(env);
  const declMatch = read.size > 0 && eqSet(read, declared);
  // No baked secret: no SMTP_PASSWORD / password assigned a non-empty literal (env default is empty).
  const noBakedSecret = !/SMTP_PASSWORD["'`\s:=]+["'`][^"'`\n]{3,}["'`]/.test(svc + config) &&
    !/(password|pass)\s*[:=]\s*["'`][A-Za-z0-9!@#$%^&*]{6,}["'`]/i.test(svc + config);
  // README truthful: mentions email/SMTP and inert-until-configured.
  const readmeTruthful = /email|SMTP/i.test(readme) && /inert|until.*(set|configured)|set the.*SMTP/i.test(readme);

  const ok = serviceExists && wired && depOk && declMatch && noBakedSecret && readmeTruthful;
  return { ok, detail: `service=${serviceExists} wired=${wired} dep=${depOk} declMatch=${declMatch}(read=${[...read].join(',')} decl=${[...declared].join(',')}) noBakedSecret=${noBakedSecret} readmeTruthful=${readmeTruthful}` };
}

async function main(): Promise<void> {
  let pass = true;

  // ── NONE — 20-hash matrix byte-identical ───────────────────────────────────
  process.stdout.write('=== NONE: 20-hash matrix (integrations=none, literal bypass) ===\n');
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
  process.stdout.write(`  ${noneOk ? 'OK  ' : 'FAIL'} all 20 byte-identical under none\n`);

  // ── EMAIL — baselines (twice-identical) + coherence, per landed stack ───────
  process.stdout.write('\n=== EMAIL: baselines (DemoApp, Postgres, twice-identical) + coherence ===\n');
  for (const backend of LANDED_EMAIL) {
    const noneHash = await hashOf(buildDemoAppModel({ backend, database: 'PostgreSQL' }));
    const h1 = await hashOf(withEmail(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
    const h2 = await hashOf(withEmail(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
    const twice = h1 === h2;
    const real = h1 !== noneHash;
    const files = await filesOf(withEmail(buildDemoAppModel({ backend, database: 'PostgreSQL' })));
    const added = files.filter((f) => !['README.md', '.env.example'].includes(f.relPath) && /email/i.test(f.relPath)).map((f) => f.relPath);
    const coh = coherence(backend, files);
    const ok = twice && real && coh.ok;
    if (!ok) pass = false;
    process.stdout.write(`  ${ok ? 'OK  ' : 'FAIL'} ${backend.padEnd(8)} email ${h1}\n`);
    process.stdout.write(`       twice=${twice} differsFromNone=${real} added=[${added.join(',')}]\n`);
    process.stdout.write(`       coherence: ${coh.detail}\n`);
  }

  process.stdout.write(`\nDay-17 gate: ${pass ? 'PASS' : 'FAIL'}\n`);
  if (!pass) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
