/*
 * Thraksha — Toolchain detect-and-guide: the honest real-machine demo (Eco-Day 18).
 *
 * Runs the LIVE probes on THIS machine for one blueprint per stack and prints the
 * report the wizard would show. This is the impure edge (detect/probe.ts) exercised
 * for real — it reads the environment and INFORMS; it never touches generation.
 *
 * Run:  npm run detect
 */

import { buildDemoAppModel } from './demoapp-model.js';
import { runLiveDetection } from './detect/probe.js';
import type { DetectionReport } from './detect/detect-core.js';

function printReport(r: DetectionReport): void {
  process.stdout.write(`\n=== ${r.backend} — can THIS machine build it? ===\n`);
  for (const t of r.tools) {
    const badge = t.status === 'present' ? 'OK  ' : t.status === 'mismatch' ? 'MISMATCH' : 'MISSING';
    const detail = t.detected ? `detected ${t.detected}` : 'not found';
    const pin = t.pin ? ` (pins ${t.pin})` : '';
    process.stdout.write(`  [${badge}] ${t.tool.padEnd(7)} ${detail}${pin}\n`);
    if (t.guidance) process.stdout.write(`           → ${t.guidance.message}  ${t.guidance.installUrl}\n`);
  }
  process.stdout.write(`  container: ${r.container.available ? 'available (' + r.container.runtime + ')' : 'none'} — ${r.container.message}\n`);
  process.stdout.write(`  summary: present ${r.summary.present}, missing ${r.summary.missing}, mismatch ${r.summary.mismatch}; canBuildNatively=${r.summary.canBuildNatively}\n`);
  process.stdout.write(`  note: ${r.summary.note}\n`);
}

async function main(): Promise<void> {
  for (const backend of ['Spring Boot', 'Express', 'FastAPI', 'Go']) {
    printReport(await runLiveDetection(buildDemoAppModel({ backend, database: 'PostgreSQL' }).getState()));
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
