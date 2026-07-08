/*
 * Thraksha — the Map: flow-map CLI (Eco-Day 50).
 *
 * Print the request-lifecycle / data-flow map of a model — a PROJECTION of the
 * DECLARED blueprint (entities/relationships/integrations), not parsed from
 * generated code. READ-ONLY: writes nothing; reads only the model.
 *
 * Build:  npm run build
 * Usage:  node dist/flow-map.js [--backend <name>] [--model <path-or-json>]
 *           --model  a BlueprintChoices JSON (file or inline) → assembleBlueprint.
 *                    OMITTED ⇒ the built-in demo model (the literal bypass, unchanged).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { readModelArg } from './core/model-arg.js';
import { buildFlowMap, renderFlowMap } from './map/flow-map.js';

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
    // --model supplied ⇒ project the REAL blueprint (via the existing assembleBlueprint
    // path — the same deterministic construction; no new generation logic).
    m = await readModelArg(modelArg);
  } else {
    // No --model ⇒ the LITERAL BYPASS: the exact prior demo model, byte-identical.
    // A representative two-entity model with a relationship + an active integration,
    // so the map shows a lifecycle chain, an entity-graph edge, and an integration edge.
    m = createProjectModel({ projectName: 'DemoApp', projectType: 'Web App', backend, frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' });
    m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }], relationships: [{ kind: 'has-many', target: 'Ticket' }] });
    m.addEntity({ name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
    m.setIntegrations({ email: 'smtp', ai: 'none' });
  }

  process.stdout.write(renderFlowMap(buildFlowMap(m)) + '\n');
}

// Only run the CLI when THIS module is the entry point (not when imported by a gate/driver).
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
