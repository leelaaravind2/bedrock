/*
 * Thraksha — the Map: impact-preview CLI (Eco-Day 47, THE STAR FEATURE).
 *
 * The Terraform-`plan` half of plan→review→apply: given (current model, proposed
 * model), print EXACTLY which files/lines the change will affect — BEFORE anything
 * is generated. Truthful because generation is deterministic: the preview is a diff
 * of two PURE buildFileSet generations, and it matches real generation byte-for-byte
 * (proven by day20:regress PART 1w). READ-ONLY: this writes NOTHING — applying is the
 * existing `npm run generate` / `npm run export` path, unchanged.
 *
 * This driver demonstrates the preview on a representative change (add a field to the
 * Ticket entity). The in-app equivalent is `POST /api/impact` (diff a proposed
 * blueprint against the live model). Pure-Node, deps {} (the line-diff is isolated).
 *
 * Build:  npm run build
 * Usage:  node dist/map.js [--backend <name>]
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { previewImpact, renderImpact } from './map/impact-map.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let backend = 'Express';
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--backend') backend = argv[++i];

  // A model with the Ticket entity, optionally with an extra `done` field. CURRENT
  // has (title); PROPOSED adds (done) — a representative single-field change.
  const mk = (withDone: boolean): ProjectModel => {
    const m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
    m.addEntity({ name: 'Ticket', fields: withDone ? [{ name: 'title', type: 'String', required: true }, { name: 'done', type: 'Boolean' }] : [{ name: 'title', type: 'String', required: true }] });
    return m;
  };
  const current = mk(false);
  const proposed = mk(true);

  const plan = await previewImpact(current, proposed);
  process.stdout.write(renderImpact(current.getSetting('projectName'), plan) + '\n');
  process.stdout.write('\n(preview only — nothing was written. To apply: npm run generate / npm run export)\n');
}

// Only run the CLI when THIS module is the entry point (not when imported by a gate/driver).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
