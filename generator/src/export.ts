/*
 * Thraksha — the EXPORTER (Eco-Day 41, first Phase-4 day).
 *
 * Export is a DRIFT-FREE PROJECTION of the existing deterministic output: it writes the
 * SAME `buildFileSet(model)` file set to a clean standalone directory. It is NOT a
 * re-generation and NOT a generation change — the exported tree is byte-for-byte the
 * in-app generation, so export byte-identity holds BY CONSTRUCTION and no frozen hash
 * can move (ADR-003). The exported project is standalone (Law 21): 0 FUNCTIONAL Thraksha
 * references — no Thraksha dependency in any manifest, no import/require of Thraksha; the
 * only Thraksha strings are INERT provenance markers (ownership comments, the manifest)
 * that never affect build/run and are deliberately NOT stripped (stripping them would
 * rewrite the deterministic output and move every frozen hash).
 *
 * The version-pinned Dockerfile (base = the Day-11 runtime pin) + docker-compose.yml ship
 * IN the generated output already, so the container-build path needs only a container
 * runtime — `docker compose up --build` after Thraksha is deleted.
 *
 * Pure-Node: the exporter is `fs` file-writing via applyPlan (the same write engine the
 * regen CLI uses) — NO packaging/zip/archive library is a Thraksha dependency (deps {}).
 *
 * Build:  npm run build
 * Usage:  node dist/export.js <targetDir> [--backend <name>]
 *           <targetDir>   where the standalone project is written (created if absent).
 *           --backend     override the model's backend (selects the plugin).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildFileSet, applyPlan } from './core/regen.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { GeneratedFile } from './core/plugin.js';
import type { ProjectModel } from './core/project-model.js';

/**
 * Export a project's COMPLETE file set to a clean directory — a projection of the
 * existing deterministic output (the written tree == buildFileSet, byte-for-byte).
 * Returns the exported file set (the same one written) so callers can verify identity.
 */
export async function exportProject(model: ProjectModel, targetDir: string): Promise<GeneratedFile[]> {
  const files = await buildFileSet(model, selectBackendPlugin(model));
  // applyPlan writes every file for a fresh directory (create / create-once), byte-for-byte
  // (fs.writeFile emits the exact content — LF preserved, no drift). Same engine as regen.
  await applyPlan(targetDir, files);
  return files;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let targetDir: string | undefined;
  let backend: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--backend') backend = argv[++i];
    else if (!a.startsWith('--')) targetDir = a;
  }
  if (!targetDir) {
    process.stderr.write('usage: node dist/export.js <targetDir> [--backend <name>]\n');
    process.exit(2);
    return;
  }
  const model = buildDemoAppModel(backend ? { backend } : {});
  const projectName = model.getSetting('projectName');
  const dir = path.resolve(targetDir);
  const files = await exportProject(model, dir);
  process.stdout.write(`Exported ${projectName} (${files.length} files) → ${dir}\n`);
  process.stdout.write(`Standalone: 0 functional Thraksha references; run the container path with:\n  cd ${dir} && docker compose up --build\n`);
}

// Only run the CLI when THIS module is the entry point (not when imported by a gate/driver).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
