/*
 * Thraksha — the in-app / CLI security SCAN action.
 *
 * Two TIERS, deterministic-first:
 *   1. DETERMINISTIC (Day 43) — Semgrep, pinned rules + version → CERTAIN findings. THE GATE
 *      (a CERTAIN finding fails the scan, matching CI `--error`). Read-only.
 *   2. AI-ADVISORY (Day 45) — the developer's own model (default-off; opt-in via THRAKSHA_AI_SCAN_KEY).
 *      Runs AFTER the deterministic scan; ADVISORY findings (review required) — NEVER the gate (they
 *      NEVER affect the exit code). With no key: NO call is made (structural default-off).
 *
 * Delete the AI key/layer ⇒ the deterministic scan (the gate) + export still run. AI is never the gate.
 *
 * Usage:  node dist/scan.js <projectDir>
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';
import { scanProject } from './core/scan.js';
import { aiScanViaEnv } from './scan/ai-scan-ai.js';

/** Read a project tree into a { relPath, content }[] for the AI scan (read-only; skips node_modules/.git). */
async function readProjectFiles(dir: string): Promise<{ relPath: string; content: string }[]> {
  const out: { relPath: string; content: string }[] = [];
  async function walk(d: string): Promise<void> {
    for (const e of (await fs.readdir(d, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        try { out.push({ relPath: path.relative(dir, full).split(path.sep).join('/'), content: await fs.readFile(full, 'utf8') }); } catch { /* skip binary/unreadable */ }
      }
    }
  }
  await walk(dir);
  return out;
}

async function main(): Promise<void> {
  const dir = process.argv[2];
  if (!dir) {
    process.stderr.write('usage: node dist/scan.js <projectDir>\n');
    process.exit(2);
    return;
  }
  const root = path.resolve(dir);

  // ── Tier 1: the DETERMINISTIC scan (CERTAIN — the gate) ─────────────────────────
  const certain = await scanProject(root);
  if (!certain.available) {
    process.stdout.write(`[scan] ${certain.guide}\n`);
  } else {
    process.stdout.write(`[scan] Deterministic (Semgrep ${certain.version}) — ${certain.findings.length} CERTAIN finding(s) [the gate]:\n`);
    for (const f of certain.findings) {
      process.stdout.write(`  ${f.severity.padEnd(7)} [CERTAIN]  ${f.ruleId}  ${f.path}:${f.line}  ${f.message.split('\n')[0]}\n`);
    }
  }

  // ── Tier 2: the AI-ADVISORY scan — AFTER + SEPARATE, opt-in, NEVER the gate ──────
  // Default-off structurally: with no THRAKSHA_AI_SCAN_KEY, aiScanViaEnv makes NO call (enabled:false).
  const advisory = await aiScanViaEnv(await readProjectFiles(root));
  if (advisory.enabled) {
    process.stdout.write(`\n[scan] AI-advisory (developer-keyed) — ${advisory.findings.length} ADVISORY finding(s) [suggestions; review required; NOT the gate]:\n`);
    for (const f of advisory.findings) {
      process.stdout.write(`  ${f.severity.padEnd(7)} [ADVISORY] ${f.path}:${f.line}  ${f.issue}  →  ${f.suggestion}\n`);
    }
  }

  // The GATE is the DETERMINISTIC scan only. Advisory findings NEVER affect the exit code.
  if (certain.available && certain.findings.length > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
