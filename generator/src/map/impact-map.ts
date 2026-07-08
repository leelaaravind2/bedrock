/*
 * Thraksha — the Map: impact preview (Eco-Day 47, THE STAR FEATURE).
 *
 * Show EXACTLY which files/lines a change will affect, BEFORE generating. This is
 * possible ONLY because generation is DETERMINISTIC: output = a pure function of
 * the blueprint (proven byte-identical across the 103-baked backstop). So given
 * (current model, proposed model) we generate BOTH in memory and compute the EXACT
 * diff — guaranteed to match what real generation does (the correctness proof,
 * PART 1w, closes the loop through the real disk write via the export==buildFileSet
 * anchor, PART 1t).
 *
 * READ-ONLY (ADR-003): the Map is a PROJECTION of two in-memory generations. It
 * CALLS buildFileSet (reads generation) but buildFileSet never imports the Map —
 * 0 generation-path refs. It emits NOTHING into the real project (it returns a
 * plain ImpactPlan object, never a GeneratedFile). Adding it moves NO frozen hash.
 *
 * The hash-precheck uses the EXACT frozen-hash convention (maxcell-driver.ts'
 * `/${relPath}\n` + content sha256), applied PER FILE — the same primitive as the
 * backstop, so file-set identification is OS-independent and instant. Only the
 * files whose per-file hash differs are line-diffed.
 *
 * 'delete' is an HONEST file-SET projection: the proposed model no longer EMITS
 * this file. It is NOT "generation removes it from disk" — applyPlan never deletes
 * (ADR-002); a regen leaves the orphan (developer-safe), the Map surfaces it so the
 * developer decides. No overclaim.
 *
 * Pure-Node, deps {}: the line-diff is the isolated pure-Node LCS differ
 * (map/line-diff.ts) — NO diff library is a Thraksha core dependency.
 */

import crypto from 'node:crypto';
import type { ProjectModel } from '../core/project-model.js';
import type { GeneratedFile } from '../core/plugin.js';
import { buildFileSet } from '../core/regen.js';
import { selectBackendPlugin } from '../plugins/registry.js';
import { toHunks, type LineHunk } from './line-diff.js';

export type ImpactAction = 'add' | 'change' | 'delete' | 'no-op';

export interface ImpactEntry {
  /** relPath (forward-slashed, as the digest convention requires). */
  file: string;
  action: ImpactAction;
  /** Which side(s) own the file, for honest display. */
  ownership: 'thraksha' | 'developer';
  /** Full BEFORE content ('' for add). Byte-exact — the load-bearing contract. */
  before: string;
  /** Full AFTER content ('' for delete). Byte-exact — the load-bearing contract. */
  after: string;
  /** Derived, deterministic line-diff — DISPLAY ONLY (omitted for no-op). */
  hunks?: LineHunk[];
}

export interface ImpactPlan {
  /** Every entry, sorted by `file` (code-unit) — stable, OS-independent. */
  entries: ImpactEntry[];
  add: string[];
  change: string[];
  delete: string[];
  noOp: string[];
}

/**
 * The Map's per-file hash — the EXACT frozen-hash primitive (maxcell-driver.ts'
 * hashFiles), applied to ONE file: sha256 over `/${relPath}\n` then the UTF-8
 * content. Same building block as the backstop ⇒ OS-independent, no forked digest
 * space. Two files hash-equal IFF they are byte-identical.
 */
export function fileHash(f: GeneratedFile): string {
  const h = crypto.createHash('sha256');
  h.update(`/${f.relPath}\n`);
  h.update(Buffer.from(f.content, 'utf8'));
  return h.digest('hex');
}

function toMap(files: GeneratedFile[]): Map<string, GeneratedFile> {
  return new Map(files.map((f) => [f.relPath, f]));
}

/**
 * Compute the impact plan of moving from `current` to `proposed`. Pure: it calls
 * buildFileSet twice (each model picks its own plugin — a backend change is a
 * legitimate proposed change) and diffs the two emitted file sets. No fs, no
 * writes, no side effects — a projection of two deterministic generations.
 */
export async function previewImpact(current: ProjectModel, proposed: ProjectModel): Promise<ImpactPlan> {
  const curFiles = await buildFileSet(current, selectBackendPlugin(current));
  const propFiles = await buildFileSet(proposed, selectBackendPlugin(proposed));
  return diffFileSets(curFiles, propFiles);
}

/**
 * The pure diff of two already-generated file sets — the testable heart, separated
 * from model→files so the correctness proof can drive it directly with the same
 * buildFileSet outputs it will materialize to disk.
 */
export function diffFileSets(curFiles: GeneratedFile[], propFiles: GeneratedFile[]): ImpactPlan {
  const cur = toMap(curFiles);
  const prop = toMap(propFiles);

  // The HASH-PRECHECK: per-file hashes identify the changed file SET instantly.
  const curHash = new Map([...cur].map(([p, f]) => [p, fileHash(f)] as const));
  const propHash = new Map([...prop].map(([p, f]) => [p, fileHash(f)] as const));

  // The union of relPaths, sorted by code unit (the digest convention's ordering).
  const allPaths = [...new Set([...cur.keys(), ...prop.keys()])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const entries: ImpactEntry[] = [];
  for (const file of allPaths) {
    const inCur = cur.has(file);
    const inProp = prop.has(file);
    const before = cur.get(file)?.content ?? '';
    const after = prop.get(file)?.content ?? '';
    const ownership = (prop.get(file) ?? cur.get(file))!.ownership;

    if (inCur && inProp) {
      if (curHash.get(file) === propHash.get(file)) {
        entries.push({ file, action: 'no-op', ownership, before, after }); // byte-identical — skipped (Law 39)
      } else {
        // Only NOW do we line-diff — the precheck told us this file changed.
        entries.push({ file, action: 'change', ownership, before, after, hunks: toHunks(before, after) });
      }
    } else if (!inCur && inProp) {
      entries.push({ file, action: 'add', ownership, before, after, hunks: toHunks('', after) });
    } else {
      // In current, not in proposed: the proposed model no longer EMITS it (ADR-002 —
      // a file-set projection, NOT a disk-delete; applyPlan leaves the orphan).
      entries.push({ file, action: 'delete', ownership, before, after, hunks: toHunks(before, '') });
    }
  }

  const pick = (a: ImpactAction) => entries.filter((e) => e.action === a).map((e) => e.file);
  return { entries, add: pick('add'), change: pick('change'), delete: pick('delete'), noOp: pick('no-op') };
}

/** Render the plan a developer reads before approving. Pure formatting (the preview gate). */
export function renderImpact(projectName: string, plan: ImpactPlan): string {
  const title = `Impact preview for ${projectName}`;
  const out: string[] = [title, '='.repeat(title.length), '(preview — nothing has been generated yet)', ''];
  const label: Record<ImpactAction, string> = { add: 'ADD   ', change: 'CHANGE', delete: 'DELETE', 'no-op': 'no-op ' };
  for (const e of plan.entries) {
    if (e.action === 'no-op') continue; // don't clutter the gate with unchanged files
    out.push(`  ${label[e.action]} ${e.file}`);
    for (const h of e.hunks ?? []) {
      out.push(`    @@ -${h.beforeStart} +${h.afterStart} @@`);
      for (const l of h.lines) out.push(`    ${l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}${l.text}`);
    }
  }
  out.push('');
  out.push(
    `Summary: ${plan.add.length} add, ${plan.change.length} change, ` +
      `${plan.delete.length} no-longer-generated (ADR-002 — not removed from disk), ${plan.noOp.length} unchanged.`,
  );
  return out.join('\n');
}
