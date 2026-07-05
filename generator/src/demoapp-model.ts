/*
 * Thraksha — the DemoApp Project Model instance (TypeScript edition).
 *
 * These are the 7 Phase-A answers for the MVP demo project. They live here as a
 * proper Project Model: the generator reads the model instead of loose values.
 *
 * There is still no UI (that is Step 6) — the answers are supplied in code — but
 * they now flow through the model's construct/read API, which is the seam every
 * later step builds on. Thanks to the Phase-A types, a wrong value (e.g. a
 * mistyped database) is now a compile error here.
 *
 * No AI (ADR-001). No randomness (ADR-003). Pure construction.
 */

import { type ProjectModel } from './core/project-model.js';
import { assembleBlueprint } from './core/assemble.js';

/**
 * Build and return the DemoApp Project Model.
 *
 * `backend` defaults to 'Spring Boot' (so the no-arg call still hashes
 * 196f5472…). Pass a different backend (e.g. 'Express') to drive the SAME
 * blueprint through a different backend plugin — that is the only field that
 * changes which plugin runs.
 *
 * Day 16: this programmatic ("CLI") builder now feeds the SAME canonical
 * `assembleBlueprint(choices)` the wizard backend feeds. The choices below are the
 * exact Phase-A backbone + the single Ticket entity it always had — no versions /
 * style / integrations / description are supplied, so each stays the model's own
 * current-implied default (a literal bypass). The assembled ProjectState is therefore
 * byte-for-byte what the previous createProjectModel+addEntity sequence produced, and
 * UI==CLI is STRUCTURAL: the wizard sending these same choices assembles the same state.
 */
export function buildDemoAppModel(
  overrides: { backend?: string; database?: string; projectType?: 'Web App' | 'API-only' } = {},
): ProjectModel {
  return assembleBlueprint({
    // Phase A — answered once, up front (these mirror the original Step-1 inputs
    // exactly, so generation stays byte-for-byte identical). projectType defaults to
    // 'Web App' (the literal bypass); pass 'API-only' to exercise the Day-15 type.
    settings: {
      projectName: 'DemoApp', // Q1 Mandatory
      projectType: overrides.projectType ?? 'Web App', // Q2 Mandatory
      backend: overrides.backend ?? 'Spring Boot', // Q3 Mandatory
      frontend: 'React', // Q4 Mandatory (API-only normalises this to 'None')
      database: overrides.database ?? 'PostgreSQL', // Q5 Mandatory (default keeps hashes frozen)
      multiUser: true, // Q6 Mandatory (multi-user-ready)
      auth: 'Simple login', // Q7 Default
    },
    // Step 3 — one business entity. Adding it makes the generator emit a complete,
    // working CRUD REST API (entity + repository + DTO + service + controller +
    // migration), with per-user owner scoping because the project is multi-user.
    // Only name + type are mandatory per INTAKE-SPEC; required/unique default and
    // are shown by the generator (ADR-004).
    entities: [
      {
        name: 'Ticket',
        fields: [
          { name: 'title', type: 'String', required: true }, // mandatory text
          { name: 'code', type: 'String', unique: true }, // unique business key
          { name: 'priority', type: 'Integer' }, // optional number
          { name: 'done', type: 'Boolean' }, // optional flag
        ],
      },
    ],
  });
}
