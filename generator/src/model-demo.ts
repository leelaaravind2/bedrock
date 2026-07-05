/*
 * Thraksha — Project Model demonstration (TypeScript edition).
 *
 * Shows the model API end-to-end, with NO code generation (that is Step 3):
 *   1. construct a Project Model from Phase-A answers,
 *   2. read its settings and (empty) entity list,
 *   3. add an entity (per INTAKE-SPEC entity/field shape),
 *   4. read the updated state.
 *
 * Build:  npm run build
 * Run:    npm run demo
 */

import { createProjectModel, createField } from './core/project-model.js';
import { buildDemoAppModel } from './demoapp-model.js';

function show(label: string, value: unknown): void {
  process.stdout.write(`\n${label}\n${JSON.stringify(value, null, 2)}\n`);
}

// 1) The DemoApp model the generator actually reads from.
const demo = buildDemoAppModel();
show('1) DemoApp Phase-A settings (what the generator reads):', demo.getPhaseASettings());
show('   DemoApp entities (now includes the Step-3 Ticket the generator emits):', demo.getEntities());

// 2) Construct a fresh model, letting defaults fill the blanks (ADR-004).
const project = createProjectModel({
  projectName: 'Helpdesk',
  projectType: 'Web App',
  backend: 'Spring Boot',
  frontend: 'React',
  database: 'PostgreSQL',
  // multiUser and auth omitted on purpose -> defaults applied AND recorded.
});
show('2) A second project with blanks left for defaults:', project.getPhaseASettings());
show('   Defaults applied (shown, never silent — ADR-004):', project.getDefaultsApplied());

// 3) Add an entity (held only; not generated into code in Step 2).
project.addEntity({
  name: 'Ticket',
  fields: [
    createField({ name: 'title', type: 'String', required: true }),
    createField({ name: 'priority', type: 'Integer' }), // required/unique default to false
    createField({ name: 'code', type: 'String', unique: true }),
  ],
});

// 4) Read the full updated state.
show('3) Full state after adding the Ticket entity:', project.getState());

process.stdout.write('\nDemo complete. No code was generated (that is Step 3).\n');
