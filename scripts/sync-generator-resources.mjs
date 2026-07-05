/*
 * Thraksha — sync the sidecar's generator resources (Eco-Day 9).
 *
 * WHY: the Tauri shell ships a COPY of the generator at
 * desktop/src-tauri/resources/gen/{dist,plugins}. Twice (Day 5, Day 8) that copy
 * needed a MANUAL refresh, risking a STALE generator shipping in the packaged app.
 * This script makes the refresh scripted and adds a FRESHNESS GUARD so a stale copy
 * cannot silently ship.
 *
 * Pure Node — no dependency. Never touches generator SOURCE (it only builds it and
 * copies its output); the generator stays pure-Node.
 *
 *   node scripts/sync-generator-resources.mjs           # SYNC: build generator, copy, stamp
 *   node scripts/sync-generator-resources.mjs --check   # GUARD: fail (exit 1) if resources are stale
 *
 * The stamp (resources/gen/REFRESH-STAMP.json) records a content hash of the copied
 * tree using the SAME `/${relPath}\n` + bytes convention family as the digest gate,
 * so "fresh" means "byte-for-byte the current generator build".
 */

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const HERE = path.dirname(fileURLToPath(import.meta.url));       // .../scripts
const REPO = path.join(HERE, '..');                             // repo root
const GENERATOR = path.join(REPO, 'generator');
const RESOURCES = path.join(REPO, 'desktop', 'src-tauri', 'resources', 'gen');
const STAMP = path.join(RESOURCES, 'REFRESH-STAMP.json');
const SUBTREES = ['dist', 'plugins'];                           // what the sidecar needs

/** Recursively list files under `root`, forward-slashed relPaths, sorted. */
async function listFiles(root, rel = '') {
  const out = [];
  let entries;
  try { entries = await fs.readdir(path.join(root, rel), { withFileTypes: true }); }
  catch { return out; }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...await listFiles(root, childRel));
    else out.push(childRel);
  }
  return out;
}

/** Content hash of a set of subtrees under `base` (same convention as the digest). */
async function hashTree(base, subtrees) {
  const h = crypto.createHash('sha256');
  const files = [];
  for (const sub of subtrees) for (const f of await listFiles(path.join(base, sub))) files.push(`${sub}/${f}`);
  files.sort();
  for (const rel of files) {
    h.update(`/${rel}\n`);
    h.update(await fs.readFile(path.join(base, rel)));
  }
  return { hash: h.digest('hex'), count: files.length };
}

/** Build the generator (tsc) so dist is current. `shell: true` so npm resolves on
 *  Windows (a .cmd shim can't be spawned directly — EINVAL). */
function buildGenerator() {
  execFileSync('npm', ['run', 'build'], { cwd: GENERATOR, stdio: 'inherit', shell: true });
}

async function copyTree(src, dst) {
  await fs.rm(dst, { recursive: true, force: true });
  await fs.cp(src, dst, { recursive: true });
}

async function sync() {
  console.log('[sync-gen] building generator...');
  buildGenerator();
  console.log('[sync-gen] copying dist + plugins into resources/gen...');
  await fs.mkdir(RESOURCES, { recursive: true });
  for (const sub of SUBTREES) await copyTree(path.join(GENERATOR, sub), path.join(RESOURCES, sub));
  const { hash, count } = await hashTree(RESOURCES, SUBTREES);
  await fs.writeFile(STAMP, `${JSON.stringify({ hash, files: count, updated: 'content-hash (deterministic; not a timestamp)' }, null, 2)}\n`);
  console.log(`[sync-gen] resources refreshed: ${count} files, tree hash ${hash.slice(0, 16)}…`);
}

async function check() {
  // The stamp the shipped resources claim.
  let stamped;
  try { stamped = JSON.parse(await fs.readFile(STAMP, 'utf8')).hash; }
  catch { fail('resources/gen/REFRESH-STAMP.json missing — resources were never synced.'); }
  // What the resources ACTUALLY hash to right now (catch hand-edits/partial copies).
  const actual = (await hashTree(RESOURCES, SUBTREES)).hash;
  if (actual !== stamped) fail(`resources/gen tree hash (${actual.slice(0,16)}…) != stamp (${stamped.slice(0,16)}…) — resources were modified after sync.`);
  // What the CURRENT generator build hashes to (catch a stale generator).
  buildGenerator();
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'thraksha-sync-'));
  try {
    for (const sub of SUBTREES) await copyTree(path.join(GENERATOR, sub), path.join(tmp, sub));
    const fresh = (await hashTree(tmp, SUBTREES)).hash;
    if (fresh !== stamped) fail(`current generator build hash (${fresh.slice(0,16)}…) != shipped resources (${stamped.slice(0,16)}…) — resources are STALE.`);
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
  console.log(`[sync-gen --check] OK — resources match the current generator build (${stamped.slice(0, 16)}…).`);
}

function fail(msg) {
  console.error(`[sync-gen --check] STALE: ${msg}\n  → run:  npm run sync-gen   (in desktop/, or: node scripts/sync-generator-resources.mjs)`);
  process.exit(1);
}

const mode = process.argv.includes('--check') ? check : sync;
mode().catch((err) => { console.error(err); process.exit(1); });
