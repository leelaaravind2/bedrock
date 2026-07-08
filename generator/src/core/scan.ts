/*
 * Thraksha — in-app deterministic security scan RUNNER (Eco-Day 43).
 *
 * READ-ONLY: reads a generated/exported project directory and runs Semgrep — a TOOL,
 * INVOKED (spawned) not imported — with the SAME pinned rules the CI security.yml uses.
 * It is NEVER in the generation path: buildFileSet and the plugins do NOT import this
 * module (0 generation-path refs). Findings are a scan-time output, stamped CERTAIN
 * (deterministic static analysis) — distinct from Day-45's ADVISORY AI tier. No AI.
 *
 * Detect-and-guide shaped (like Day-18 detect): probe for Semgrep → run if present →
 * GUIDE if absent (never a crash). Semgrep is a scan-tool / a generated-project-CI
 * concern — never a Thraksha dependency (deps {}). Pure Node: child_process + fs.
 */

import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SEMGREP_RULES, SEMGREP_VERSION } from './security.js';

/** Deterministic findings are CERTAIN. Day-45 AI findings are 'advisory' (a distinct class). */
export type FindingClass = 'certain';

export interface ScanFinding {
  ruleId: string;
  severity: string;
  path: string;
  line: number;
  message: string;
  /** The tier: 'certain' (deterministic Semgrep) — visibly distinct from Day-45 'advisory' AI findings. */
  class: FindingClass;
}

export interface ScanResult {
  available: boolean;
  ran: boolean;
  findings: ScanFinding[];
  version: string;
  /** A human guide when the tool is absent (never a crash — the CI security.yml still runs it). */
  guide?: string;
}

/** Probe: is the Semgrep tool on PATH? (a read-only check, like detect's toolchain probes.) */
export function semgrepAvailable(): boolean {
  try {
    return spawnSync('semgrep', ['--version'], { encoding: 'utf8' }).status === 0;
  } catch {
    return false;
  }
}

/**
 * Run the deterministic scan over `projectDir` with the pinned rules. Read-only. Returns
 * CERTAIN findings; guides (never throws) when Semgrep is absent. Same project + pinned
 * rules + pinned Semgrep version → the same findings.
 */
export async function scanProject(projectDir: string): Promise<ScanResult> {
  if (!semgrepAvailable()) {
    return {
      available: false, ran: false, findings: [], version: SEMGREP_VERSION,
      guide: `Semgrep is not installed. Install it (pip install semgrep==${SEMGREP_VERSION}) to scan locally, ` +
        `or rely on the generated .github/workflows/security.yml (which runs the SAME pinned rules in CI).`,
    };
  }
  // Materialise the SAME pinned rules Thraksha ships in the project's semgrep-rules.yml.
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'thk-rules-'));
  const rulesFile = path.join(tmp, 'semgrep-rules.yml');
  await fs.writeFile(rulesFile, SEMGREP_RULES);
  const r = spawnSync('semgrep', ['--config', rulesFile, '--json', projectDir], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const parsed = JSON.parse(r.stdout || '{"results":[]}') as { results?: Array<Record<string, unknown>> };
  const findings: ScanFinding[] = (parsed.results ?? []).map((x) => {
    const extra = (x.extra ?? {}) as Record<string, unknown>;
    const start = (x.start ?? {}) as Record<string, unknown>;
    return {
      ruleId: String(x.check_id ?? ''),
      severity: String(extra.severity ?? 'INFO'),
      path: String(x.path ?? ''),
      line: Number(start.line ?? 0),
      message: String(extra.message ?? ''),
      class: 'certain' as const,
    };
  });
  return { available: true, ran: true, findings, version: SEMGREP_VERSION };
}
