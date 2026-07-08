/*
 * Thraksha — the Map: an ISOLATED pure-Node line differ (Eco-Day 47).
 *
 * A deterministic LCS (longest-common-subsequence) line diff over two strings.
 * PURE — no dependency, no clock, no randomness (deps {} stays; the Map takes NO
 * diff library as a Thraksha core dep). Split on '\n' only (LF — LD-2); the last
 * element after a trailing newline is the empty tail, so the line arrays are an
 * exact, reversible partition of the content.
 *
 * This is DISPLAY ONLY. The load-bearing contract of the Map is the byte-exact
 * `before`/`after` FULL contents in each ImpactEntry; the hunks are a derived,
 * deterministic rendering over those. A differ bug can never make the preview
 * inexact — the byte-for-byte correctness proof (PART 1w) reads before/after, not
 * hunks.
 */

/** One diff line: kept context, a removal (in before only) or an addition (in after only). */
export interface DiffLine {
  kind: 'context' | 'del' | 'add';
  text: string;
}

/** A contiguous group of changed lines with a little surrounding context. */
export interface LineHunk {
  /** 1-based start line in the BEFORE text (0 when purely additive at the top). */
  beforeStart: number;
  /** 1-based start line in the AFTER text. */
  afterStart: number;
  lines: DiffLine[];
}

function splitLines(s: string): string[] {
  // Split on LF only. A trailing '\n' yields a final '' element — kept so the
  // partition is exact (join('\n') reconstructs the original byte-for-byte).
  return s.split('\n');
}

/**
 * The classic dynamic-programming LCS over two line arrays → an ordered edit
 * script (context / del / add). Deterministic: the DP table and the fixed
 * backtrack tie-break (prefer diagonal, then up, then left) make the output a
 * pure function of (before, after).
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  const n = a.length;
  const m = b.length;

  // lcs[i][j] = LCS length of a[i..] and b[j..].
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ kind: 'context', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ kind: 'del', text: a[i] });
      i++;
    } else {
      out.push({ kind: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] });
  while (j < m) out.push({ kind: 'add', text: b[j++] });
  return out;
}

/**
 * Group the edit script into hunks (runs of changes with `context` lines of
 * surrounding context), the way a unified diff reads. Pure over diffLines —
 * deterministic given (before, after, context).
 */
export function toHunks(before: string, after: string, context = 2): LineHunk[] {
  const script = diffLines(before, after);

  // Annotate each edit with the 1-based line it occupies in before/after.
  let bl = 1;
  let al = 1;
  const pos = script.map((d) => {
    const at = { d, beforeLine: bl, afterLine: al };
    if (d.kind === 'context') { bl++; al++; }
    else if (d.kind === 'del') { bl++; }
    else { al++; }
    return at;
  });

  // Mark which indices to KEEP: every change, plus up to `context` context lines
  // on either side of a change. Then cut the kept indices into contiguous runs.
  const keep = new Array<boolean>(pos.length).fill(false);
  for (let k = 0; k < pos.length; k++) {
    if (pos[k].d.kind === 'context') continue;
    for (let p = Math.max(0, k - context); p <= Math.min(pos.length - 1, k + context); p++) keep[p] = true;
  }

  const hunks: LineHunk[] = [];
  let run: typeof pos | null = null;
  for (let k = 0; k < pos.length; k++) {
    if (keep[k]) { (run ??= []).push(pos[k]); continue; }
    if (run) { hunks.push({ beforeStart: run[0].beforeLine, afterStart: run[0].afterLine, lines: run.map((x) => x.d) }); run = null; }
  }
  if (run) hunks.push({ beforeStart: run[0].beforeLine, afterStart: run[0].afterLine, lines: run.map((x) => x.d) });
  return hunks;
}
