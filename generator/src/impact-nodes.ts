/*
 * Thraksha — the Map: impacted-nodes CLI (Eco-Day 66).
 *
 * Emits the IMPACTED NODE/EDGE ids for a change (current → proposed) as JSON, for the shell
 * to PAINT onto the certified flow-svg diagram. A NEW driver — modifies NO existing file, so
 * every frozen output is byte-identical by construction. Same `--model` PAIR contract as
 * map.js (impact_preview): a { current, proposed } BlueprintChoices pair. READ-ONLY.
 *
 * Build:  npm run build
 * Usage:  node dist/impact-nodes.js [--model <path-or-json>]
 *           --model  a { "current": BlueprintChoices, "proposed": BlueprintChoices } JSON
 *                    (file or inline) — each assembled via the existing assembleBlueprint.
 *                    OMITTED ⇒ the built-in demo change (add a `done` field to Ticket).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { assembleBlueprint, type BlueprintChoices } from './core/assemble.js';
import { loadModelJson } from './core/model-arg.js';
import { impactedNodes } from './map/impact-nodes.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let backend = 'Express';
  let modelArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--backend') backend = argv[++i];
    else if (argv[i] === '--model') modelArg = argv[++i];
  }

  let current: ProjectModel;
  let proposed: ProjectModel;
  if (modelArg) {
    // --model ⇒ diff the REAL { current, proposed } blueprints (each via assembleBlueprint).
    const pair = await loadModelJson<{ current: BlueprintChoices; proposed: BlueprintChoices }>(modelArg);
    current = assembleBlueprint(pair.current);
    proposed = assembleBlueprint(pair.proposed);
  } else {
    // No --model ⇒ the demo change (the same representative single-field edit map.js uses).
    const mk = (withDone: boolean): ProjectModel => {
      const m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
      m.addEntity({ name: 'Ticket', fields: withDone ? [{ name: 'title', type: 'String', required: true }, { name: 'done', type: 'Boolean' }] : [{ name: 'title', type: 'String', required: true }] });
      return m;
    };
    current = mk(false);
    proposed = mk(true);
  }

  process.stdout.write(JSON.stringify(await impactedNodes(current, proposed)) + '\n');
}

// Only run the CLI when THIS module is the entry point (not when imported by a gate/driver).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
