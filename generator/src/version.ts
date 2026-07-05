/*
 * Thraksha — Versioning CLI (Step 5): save / list / roll back project versions.
 *
 * The Project Model is what gets versioned. Rollback restores a past model and
 * regenerates its output, preserving developer-owned files (ADR-002).
 *
 * Build:  npm run build
 * Usage:  node dist/version.js list
 *         node dist/version.js save "what changed"
 *         node dist/version.js rollback <versionNumber>
 *
 * Defaults: versions are stored under <repo>/.thraksha/versions/DemoApp (NOT
 * inside the generated project, so the project's files are unaffected), and the
 * project is <repo>/output/DemoApp.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDemoAppModel } from './demoapp-model.js';
import { VersionStore } from './core/versioning.js';
import { selectBackendPlugin } from './plugins/registry.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GENERATOR_DIR = path.join(HERE, '..');
const REPO_ROOT = path.join(GENERATOR_DIR, '..');
const plugin = selectBackendPlugin(buildDemoAppModel()); // backend chosen by the model
// Versions live OUTSIDE the generated project (so the project's files — and its
// hash — are unaffected). Both paths can be overridden via env vars.
const DEFAULT_STORE = process.env.THRAKSHA_STORE || path.join(REPO_ROOT, '.thraksha', 'versions', 'DemoApp');
const DEFAULT_PROJECT = process.env.THRAKSHA_PROJECT || path.join(REPO_ROOT, 'output', 'DemoApp');

function usage(): void {
  process.stdout.write(
    'Usage:\n' +
      '  node dist/version.js list\n' +
      '  node dist/version.js save "what changed"\n' +
      '  node dist/version.js rollback <versionNumber>\n',
  );
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const store = new VersionStore(DEFAULT_STORE);

  switch (command) {
    case 'list': {
      const index = await store.listVersions();
      if (index.versions.length === 0) {
        process.stdout.write('No versions saved yet.\n');
        return;
      }
      process.stdout.write('Version history (model snapshots — head is the active version):\n');
      for (const v of index.versions) {
        const marker = v.version === index.head ? '* ' : '  ';
        process.stdout.write(`  ${marker}v${v.version}: ${v.note}\n`);
      }
      return;
    }

    case 'save': {
      const note = rest.join(' ').trim() || '(no note)';
      const ref = await store.saveVersion(buildDemoAppModel(), note);
      process.stdout.write(`Saved version v${ref.version}: ${ref.note}\n`);
      process.stdout.write(`Stored under ${DEFAULT_STORE}\n`);
      return;
    }

    case 'rollback': {
      const n = Number(rest[0]);
      if (!Number.isInteger(n) || n < 1) {
        process.stdout.write('Provide a version number, e.g. rollback 1\n');
        process.exitCode = 1;
        return;
      }
      const result = await store.rollback(n, DEFAULT_PROJECT, plugin);
      process.stdout.write(`Rolled back from v${result.from} to v${result.to} at ${DEFAULT_PROJECT}\n`);
      process.stdout.write(
        `  Thraksha files: created ${result.outcome.created.length}, ` +
          `changed ${result.outcome.changed.length}, unchanged ${result.outcome.unchanged.length}; ` +
          `removed ${result.orphansRemoved.length} no-longer-generated file(s).\n`,
      );
      process.stdout.write(
        `  Developer files preserved (never touched): ${result.outcome.developerUntouched.length}.\n`,
      );
      if (result.orphansRemoved.length > 0) {
        process.stdout.write('  Removed (Thraksha-owned, not produced by the target version):\n');
        for (const r of result.orphansRemoved) process.stdout.write(`    - ${r}\n`);
      }
      return;
    }

    default:
      usage();
      process.exitCode = command ? 1 : 0;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
