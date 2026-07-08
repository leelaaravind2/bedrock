/*
 * Thraksha — the in-app / CLI deterministic security SCAN action (Eco-Day 43).
 *
 * `npm run scan -- <projectDir>` → runs the deterministic Semgrep scan (pinned rules +
 * pinned version) over a generated/exported project and prints the CERTAIN findings. A
 * READ-ONLY action (it reads the project, changes nothing). If Semgrep is not installed,
 * it GUIDES (never crashes) — the generated CI security.yml runs the SAME rules in CI.
 *
 * Usage:  node dist/scan.js <projectDir>
 */

import path from 'node:path';
import { scanProject } from './core/scan.js';

async function main(): Promise<void> {
  const dir = process.argv[2];
  if (!dir) {
    process.stderr.write('usage: node dist/scan.js <projectDir>\n');
    process.exit(2);
    return;
  }
  const result = await scanProject(path.resolve(dir));
  if (!result.available) {
    process.stdout.write(`[scan] ${result.guide}\n`);
    return;
  }
  process.stdout.write(`[scan] Semgrep ${result.version} — ${result.findings.length} CERTAIN finding(s) (deterministic):\n`);
  for (const f of result.findings) {
    process.stdout.write(`  ${f.severity.padEnd(7)} [CERTAIN] ${f.ruleId}  ${f.path}:${f.line}  ${f.message.split('\n')[0]}\n`);
  }
  // A finding fails the local scan (the gate), matching the CI `--error` behaviour.
  if (result.findings.length > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
