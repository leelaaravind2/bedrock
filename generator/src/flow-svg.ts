/*
 * Thraksha — the Map: flow-SVG CLI (Eco-Day 65).
 *
 * The DRAWING sibling of flow-map.js: emits the certified FlowMap as an SVG string
 * (renderFlowSvg(buildFlowMap(model))) for the shell to DISPLAY. A NEW driver — it modifies
 * NO existing file, so every frozen output is byte-identical by construction. Same --model
 * contract as flow-map.js (a single BlueprintChoices; when supplied the backend rides
 * settings.backend). READ-ONLY: reads only the model, emits nothing into generation.
 *
 * Build:  npm run build
 * Usage:  node dist/flow-svg.js [--backend <name>] [--model <path-or-json>]
 *           --model  a BlueprintChoices JSON (file or inline) → assembleBlueprint.
 *                    OMITTED ⇒ the built-in demo model (the same demo flow-map.js uses).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { readModelArg } from './core/model-arg.js';
import { buildFlowMap } from './map/flow-map.js';
import { renderFlowSvg } from './map/flow-svg.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let backend = 'Express';
  let modelArg: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--backend') backend = argv[++i];
    else if (argv[i] === '--model') modelArg = argv[++i];
  }

  let m: ProjectModel;
  if (modelArg) {
    // --model ⇒ the REAL blueprint (via the existing assembleBlueprint path).
    m = await readModelArg(modelArg);
  } else {
    // No --model ⇒ the demo model (the same two-entity + relationship + integration model
    // flow-map.js draws), so the visual sibling shows the same graph as the text bypass.
    m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
    m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Ticket' }] });
    m.addEntity({ name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
    m.setIntegrations({ email: 'smtp', ai: 'none' });
  }

  process.stdout.write(renderFlowSvg(buildFlowMap(m)) + '\n');
}

// Only run the CLI when THIS module is the entry point (not when imported by a gate/driver).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
