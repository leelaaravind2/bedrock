/*
 * Thraksha — Toolchain detect-and-guide: the impure probe EDGE (Eco-Day 18).
 *
 * The thin, ENVIRONMENT-FACING layer that actually spawns the toolchain probes and
 * hands their RAW output to the pure core (detect-core.ts). It is quarantined here at
 * an already-impure I/O boundary — it is NEVER imported by buildFileSet / the plugins /
 * the model, so it CANNOT reach generation. A DetectionReport it returns has no
 * write-path to the blueprint (the wizard SHOWS it; generation never sees it).
 *
 * Pure Node, ZERO third-party deps: `node:child_process` is a builtin (no native module).
 * Commands + args are STATIC constants (no user input) so `shell: true` — needed on
 * Windows so a bare name resolves via PATHEXT to a real exe OR a `.cmd` shim (mvn.cmd) —
 * carries no injection surface.
 *
 * Cross-OS note: probe availability/behaviour differs per OS (executable names, PATH,
 * Docker Desktop vs a raw CLI). This runs the real probes on THIS machine; the report
 * honestly reflects THIS environment. macOS/Linux behaviour is reasoned, not run here.
 */

import { spawn } from 'node:child_process';
import type { ProjectState } from '../core/project-model.js';
import { requiredToolchains, buildReport, type ProbeResult, type DetectionReport } from './detect-core.js';

/** How to invoke each probe. NOTE: `java -version` prints to STDERR (the pure core reads both). */
const PROBE_CMD: Record<string, string[]> = {
  java: ['java', '-version'],
  maven: ['mvn', '-v'],
  node: ['node', '--version'],
  python: ['python', '--version'],
  pip: ['pip', '--version'],
  go: ['go', 'version'],
  // `--version` needs only the CLI (not a running daemon) — presence is the signal here;
  // whether the daemon is up is a further check the container step surfaces at build time.
  docker: ['docker', '--version'],
  podman: ['podman', '--version'],
};

const PROBE_TIMEOUT_MS = 5000;

/**
 * Spawn one probe and capture BOTH streams. Never throws and never hangs: a spawn
 * error (ENOENT — not on PATH) or a timeout resolves as `found: false` ⇒ the pure
 * core reports it missing (never a silent pass, never a crash).
 */
export function probeTool(tool: string): Promise<ProbeResult> {
  const spec = PROBE_CMD[tool];
  if (!spec) return Promise.resolve({ tool, found: false, rawStdout: '', rawStderr: '' });
  const [cmd, ...args] = spec;
  return new Promise<ProbeResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const done = (found: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ tool, found, rawStdout: stdout, rawStderr: stderr });
    };
    let child;
    try {
      child = spawn(cmd, args, { shell: true, windowsHide: true });
    } catch {
      done(false); // spawn threw synchronously ⇒ treat as missing
      return;
    }
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* already gone */ }
      done(false); // a hung probe ⇒ treat as missing rather than block the UI
    }, PROBE_TIMEOUT_MS);
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', () => done(false)); // ENOENT — not on PATH
    child.on('close', () => done(true));
  });
}

/**
 * Run detection for a blueprint: probe exactly the tools it needs (deduped), then hand
 * the raw results to the pure core. The ONLY env-facing entry point — its result is a
 * report the wizard shows; it is never written back into the blueprint (determinism boundary).
 */
export async function runLiveDetection(state: ProjectState): Promise<DetectionReport> {
  const tools = Array.from(new Set(requiredToolchains(state).map((r) => r.tool)));
  const results = await Promise.all(tools.map((t) => probeTool(t)));
  const map = new Map<string, ProbeResult>(results.map((r) => [r.tool, r]));
  return buildReport(state, map);
}
