/*
 * Thraksha — the ONE canonical file-set digest (Eco-Day 75c, Task 1).
 *
 * `hashFiles` is the single importable implementation of the digest convention the whole
 * engine agrees on: sha256 over each GeneratedFile SORTED by relPath (default code-unit
 * `<`, NEVER localeCompare), each contributing `/${relPath}\n` then the UTF-8 content
 * Buffer. Extracted verbatim from generator/src/day20-regression.ts and proven byte-identical
 * to the thirteen private copies audited in Block A (F16/F22). Phase B's `bedrock verify`
 * needs ONE canonical, importable digest module across three operating systems (Day 85 is
 * Linux) — so this is the extraction point, not a run-on-import script.
 *
 * PURE: node:crypto only — no clock, no fs, no network, no AI (ADR-001/003). See
 * generator/CLAUDE.md "The digest convention (do NOT fork)".
 *
 * NOT hashTree: day12/13/14/16-gate.ts use a SEPARATE disk-walk `hashTree` convention (a
 * different input — the written filesystem — and a different meaning). It is deliberately NOT
 * the same thing; do NOT unify the two here.
 *
 * Out of scope for Eco-Day 75c (F22's follow-up, NOT this day's change): the eleven OTHER
 * private hashFiles copies (day15/17/18/19-gate, bench-export, generate-from-snapshot,
 * maxcell-driver, phase1-4 benchmarks) still define their own. Named, not fixed.
 */

import crypto from 'node:crypto';
import type { GeneratedFile } from './plugin.js';

export function hashFiles(files: GeneratedFile[]): string {
  const h = crypto.createHash('sha256');
  for (const f of [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))) {
    h.update(`/${f.relPath}\n`);
    h.update(Buffer.from(f.content, 'utf8'));
  }
  return h.digest('hex');
}
