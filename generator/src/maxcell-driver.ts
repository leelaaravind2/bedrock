/*
 * Thraksha — MAXIMAL-cell driver (RETAINED in-repo; never deleted at cleanup).
 *
 * Computes the maximal-composition digest from the committed fixture
 * (maxcell-fixture.ts) via the pure in-memory generation path — twice — and prints
 * whether the two runs are byte-identical. This is the reproducible replacement for
 * the deleted Day-20 driver behind `33f3ec4b…`.
 *
 * Run:  npm run maxcell            (prints the digest + twice-identical result)
 *       npm run maxcell -- --emit  (prints just `MAXIMAL <digest>` for baking)
 *
 * Uses the EXACT `/${relPath}\n` + content hash convention the gates + day20:regress
 * use, so its digest is directly comparable. No HTTP, no AI, no clock (ADR-001/003).
 */

import crypto from 'node:crypto';
import { buildMaxCellModel } from './maxcell-fixture.js';
import { buildFileSet } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { GeneratedFile } from './core/plugin.js';

export function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}

/** Generate the maximal cell and return its digest (one run). */
export async function computeMaximalDigest(): Promise<string> {
  const model = buildMaxCellModel();
  const files = await buildFileSet(model, selectBackendPlugin(model));
  return hashFiles(files);
}

async function main(): Promise<void> {
  const d1 = await computeMaximalDigest();
  const d2 = await computeMaximalDigest();
  if (process.argv.includes('--emit')) {
    process.stdout.write(`MAXIMAL ${d1}\n`);
    if (d1 !== d2) process.exit(1);
    return;
  }
  process.stdout.write(`MaxCell digest run 1 : ${d1}\n`);
  process.stdout.write(`MaxCell digest run 2 : ${d2}\n`);
  process.stdout.write(`twice-identical      : ${d1 === d2}\n`);
  if (d1 !== d2) { process.stdout.write('FAIL — maximal cell is NOT twice-identical\n'); process.exit(1); }
}

main().catch((err) => { console.error(err); process.exit(1); });
