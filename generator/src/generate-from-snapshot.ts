/*
 * Thraksha — Generate from a saved snapshot (Eco-Day 8 bridge).
 *
 * The shell→sidecar generate path for a PERSISTED blueprint: read a ProjectState
 * snapshot (the exact JSON getState() produces, as the store round-trips it),
 * reconstruct the model via the EXISTING restoreProjectModel path, generate with
 * buildFileSet, and emit the digest using the SAME `/${relPath}\n` + content
 * convention the gates use. This is the natural bridge for Option A: the store
 * (shell/Rust SQLite) hands a loaded blueprint here to regenerate.
 *
 * ADDITIVE + HASH-NEUTRAL: it only calls existing generation logic
 * (restoreProjectModel + buildFileSet + selectBackendPlugin) — no new model-setup,
 * no reordering, no generation change. The Day-8 saved→loaded→generated gate proves
 * the output is byte-identical to the frozen baselines.
 *
 * Usage:  node dist/generate-from-snapshot.js <snapshot.json>   (or pipe JSON on stdin)
 *         → prints:  DIGEST <sha256>
 */

import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import { restoreProjectModel, type ProjectSnapshot } from './core/project-model.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { GeneratedFile } from './core/plugin.js';

function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

async function readInput(): Promise<string> {
  const arg = process.argv[2];
  if (arg && !arg.startsWith('--')) return fs.readFile(arg, 'utf8');
  // stdin
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main(): Promise<void> {
  const snapshot = JSON.parse(await readInput()) as ProjectSnapshot;
  const model = restoreProjectModel(snapshot);
  const files = await buildFileSet(model, selectBackendPlugin(model));
  process.stdout.write(`DIGEST ${hashFiles(files)}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
