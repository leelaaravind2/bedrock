/*
 * Thraksha — Generator CLI. Reads the Project Model and emits a real, runnable
 * Spring Boot + React + PostgreSQL project, with a regeneration PREVIEW.
 *
 * Step 1: the runnable shell (static templates).
 * Step 2: Phase-A answers come from the in-memory Project Model.
 * Step 3: each entity in the model becomes a working CRUD REST API.
 * Step 4: before writing anything, show a dry-run preview of exactly what will
 *         be created / changed / left untouched, and require explicit
 *         confirmation. The preview and the write share one engine (regen.ts),
 *         so the preview is accurate by construction.
 *
 * BINDING RULES: see regen.ts and entity-codegen.ts. This CLI adds no AI and
 * does not change generated content — it only gates writes behind a preview.
 *
 * Build:  npm run build
 * Usage:  node dist/generate.js [outputDir] [--preview] [--yes]
 *           --preview   dry run: show the preview and write NOTHING.
 *           --yes       apply without an interactive prompt (explicit consent).
 *           (no flag)   show the preview, then prompt to confirm if interactive;
 *                       if not interactive, stop without writing.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline/promises';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet, computePlan, renderPreview, applyPlan } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../generator/dist
const GENERATOR_DIR = path.join(HERE, '..'); // .../generator
const REPO_ROOT = path.join(GENERATOR_DIR, '..'); // repo root

interface CliArgs {
  outputRoot: string;
  previewOnly: boolean;
  assumeYes: boolean;
  backend?: string; // optional override of the model's backend (selects the plugin)
}

function parseArgs(argv: string[]): CliArgs {
  let outputRoot = path.join(REPO_ROOT, 'output');
  let previewOnly = false;
  let assumeYes = false;
  let backend: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--preview' || a === '--dry-run') previewOnly = true;
    else if (a === '--yes' || a === '--apply' || a === '-y') assumeYes = true;
    else if (a === '--backend') backend = argv[++i];
    else if (!a.startsWith('--')) outputRoot = a;
  }
  return { outputRoot, previewOnly, assumeYes, backend };
}

/** Ask the developer to confirm. Only an interactive TTY can say "yes" here. */
async function confirmInteractively(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question('\nProceed with regeneration? [y/N] ')).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const model = buildDemoAppModel(args.backend ? { backend: args.backend } : {});
  const projectName = model.getSetting('projectName');
  // The model's `backend` answer selects the plugin (Spring Boot, Express, …);
  // the core stays agnostic and never learns which one it got.
  const plugin = selectBackendPlugin(model);
  const projectDir = path.join(args.outputRoot, projectName);

  // Build the planned file set and diff it against the current project — a pure
  // dry run that writes nothing (ADR-003: deterministic; same inputs -> same plan).
  const files = await buildFileSet(model, plugin);
  const plan = await computePlan(projectDir, files);

  // ADR-004 — show the field defaults that were applied (before any write).
  for (const e of model.getEntities()) {
    process.stdout.write(`Entity ${e.name} — field rules (defaults shown, ADR-004):\n`);
    for (const line of plugin.describeEntityDefaults(e)) process.stdout.write(`  ${line}\n`);
    process.stdout.write(`\n`);
  }

  process.stdout.write(`${renderPreview(projectName, plan)}\n`);

  if (args.previewOnly) {
    process.stdout.write(`\n[--preview] Dry run only — no files were written. Re-run with --yes to apply.\n`);
    return;
  }

  const confirmed = args.assumeYes || (await confirmInteractively());
  if (!confirmed) {
    process.stdout.write(
      `\nNot confirmed — nothing was written. ` +
        `Re-run with --yes to apply (or run interactively and answer "y").\n`,
    );
    return;
  }

  const outcome = await applyPlan(projectDir, files);
  process.stdout.write(`\nRegenerated ${projectName} at ${projectDir}\n`);
  process.stdout.write(
    `  created ${outcome.created.length}, changed ${outcome.changed.length}, ` +
      `unchanged/skipped ${outcome.unchanged.length} (Thraksha); ` +
      `created-once ${outcome.developerCreated.length}, untouched ${outcome.developerUntouched.length} (developer).\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
