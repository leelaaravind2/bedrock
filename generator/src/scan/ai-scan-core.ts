/*
 * Thraksha — AI security scan: the PURE scan core (Eco-Day 45).
 *
 * The AI-ADVISORY security tier, confined exactly as the thesis demands (mirrors the Day-23
 * creative-FILL split, fill-core.ts). This module is the PURE, AI-FREE core: it builds the
 * per-MODULE scan SPEC (what an AI needs to review a module) and ORCHESTRATES an INJECTED
 * suggester into ADVISORY findings. It contains NO AI, NO network, NO key — the actual model
 * call lives behind the impure edge (ai-scan-ai.ts), passed in as an `AiSuggester`. So the
 * core is fixture-tested with a FAKE deterministic suggester (day20 PART 1v), exactly like
 * fill-core.ts and detect-core.ts.
 *
 * ── The detachability + determinism boundary (why this is safe) ──────────────────
 *  1. WRITES ONLY ADVISORY FINDINGS. It returns AdvisoryFinding[] (a review artifact) — it
 *     NEVER returns/touches files, templates, or the model. It CANNOT reach generation;
 *     buildFileSet never imports this. It runs AFTER + SEPARATE from the deterministic scan.
 *  2. NEVER THE GATE. AI findings are ADVISORY (review required) — distinct from the CERTAIN
 *     deterministic findings (core/scan.ts), which are the gate. Advisory never fails a build.
 *  3. DETERMINISM ≠ AI-OUTPUT. The core is deterministic GIVEN a deterministic suggester (the
 *     fixture proves it). A REAL AI suggester returns variable findings — and that is FINE,
 *     because the advisory output lives OUTSIDE the backstop (never baked, never a gen input).
 *  4. NO AI / NO NETWORK / NO KEY here. Pure Node, no dependency. Deterministic (sorted order).
 */

/**
 * An AI ADVISORY finding — the AI SUGGESTS a possible issue; a human must review it. VISIBLY
 * DISTINCT from the deterministic CERTAIN finding (core/scan.ts `class: 'certain'`): this carries
 * `class: 'advisory'` + a `suggestion`. Advisory findings are NEVER the gate.
 */
export interface AdvisoryFinding {
  path: string;
  line: number;
  severity: string;
  issue: string;
  suggestion: string;
  /** The tier: 'advisory' (the developer-keyed AI) — distinct from the deterministic 'certain'. */
  class: 'advisory';
}

/** One scan request: a WHOLE MODULE (path + full content). Whole-module context avoids cross-file blind spots. */
export interface ScanSpec {
  path: string;
  module: string;
}

/**
 * The narrow AI-SUGGEST boundary (like Day-23's fill boundary / Day-18's probe boundary): given a
 * whole-module spec, return the ADVISORY findings for that module. The core takes this as an
 * INJECTED argument — it never knows whether the suggester is a FAKE (fixtures) or the real AI edge
 * (ai-scan-ai.ts). A suggester may throw / return [] — the core treats that as "no findings" (graceful).
 */
export type AiSuggester = (spec: ScanSpec) => Promise<AdvisoryFinding[]>;

/** Files worth an AI review: source modules only (skip binary/lock/the manifest doc). */
const SCANNABLE = /\.(js|jsx|ts|tsx|py|go|java|sql|ya?ml)$/i;
const SKIP = /(^|\/)GENERATION-MANIFEST\.txt$|(^|\/)package-lock\.json$|\.(png|jpe?g|gif|ico|lock|sum)$/i;

/**
 * Build one ScanSpec per source MODULE (the WHOLE file), sorted by path (deterministic). Pure over
 * the file list — depends only on the project's files, never on any AI. Whole-module context (the
 * full file, not a single line) so the AI sees the module's structure (no local/cross-file blind spots).
 */
export function buildScanSpecs(files: { relPath: string; content: string }[]): ScanSpec[] {
  return files
    .filter((f) => SCANNABLE.test(f.relPath) && !SKIP.test(f.relPath))
    .map((f) => ({ path: f.relPath, module: f.content }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/**
 * The NEUTRAL, structured security-review prompt for one module (AI-facing formatting — pure). It
 * deliberately AVOIDS framing/polarity bias: it does NOT say "find the vulnerabilities" (which pressures
 * the model to invent findings); it asks a neutral review with a structured JSON output and permits an
 * empty result. `if none, return []` + `do not invent issues` keep the model honest.
 */
export function promptFor(spec: ScanSpec): string {
  return (
    `You are reviewing a source module for security issues, if any are present.\n` +
    `File: ${spec.path}\n` +
    `Respond with ONLY a JSON array. For each issue, an object:\n` +
    `  {"line": <number>, "severity": "<low|medium|high>", "issue": "<what it is>", "suggestion": "<how to fix>"}\n` +
    `If there are no issues, respond with []. Do not invent issues — report only what you actually find.\n\n` +
    `----- begin module -----\n${spec.module}\n----- end module -----`
  );
}

/**
 * Orchestrate the AI scan: call the injected suggester per module (in sorted order) and aggregate the
 * ADVISORY findings. Deterministic GIVEN a deterministic suggester (sorted by path, then line). Every
 * finding is stamped `class: 'advisory'`. A suggester that throws ⇒ that module contributes no findings
 * (graceful — never a crash, never propagated: the AI scan is optional/advisory, NEVER the gate).
 */
export async function orchestrateAiScan(specs: ScanSpec[], suggester: AiSuggester): Promise<AdvisoryFinding[]> {
  const out: AdvisoryFinding[] = [];
  for (const spec of specs) {
    try {
      for (const f of await suggester(spec)) {
        out.push({ path: f.path || spec.path, line: f.line, severity: f.severity, issue: f.issue, suggestion: f.suggestion, class: 'advisory' });
      }
    } catch {
      // A suggester failure ⇒ no findings for this module. Never propagate — advisory is optional.
    }
  }
  return out.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : a.line - b.line));
}

/** The whole pure AI scan, end to end over an injected suggester: specs → orchestrate. NO AI here. */
export async function aiScan(files: { relPath: string; content: string }[], suggester: AiSuggester): Promise<AdvisoryFinding[]> {
  return orchestrateAiScan(buildScanSpecs(files), suggester);
}
