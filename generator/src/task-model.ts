/*
 * Thraksha — the multi-word Task demo Project Model (Day 12).
 *
 * A deliberately MULTI-WORD model: the `Task` entity declares `dueDate` and
 * `isUrgent`. Every earlier demo field is single-word (title, code, name, …), so
 * it is invariant under any naming convention — the 20-hash matrix structurally
 * cannot detect a bad `default`-path transform, nor exercise the camelCase /
 * snake_case wire-key transform. This model is the guard for that blind spot
 * (Day-12 plan §3).
 *
 * `multiUser: true` so the generated output carries owner + audit keys
 * (ownerId/owner, createdAt/updatedAt) alongside the declared fields — proving,
 * under snake_case, that those cross-cutting keys keep their frozen
 * representations (the documented known-limitation, plan §7).
 *
 * DEMO CONTENT, not engine work: built with the same public API as the other
 * demo models. No AI (ADR-001). No randomness (ADR-003). Pure construction.
 */

import { createProjectModel, type ProjectModel } from './core/project-model.js';
import { defaultCodingStyle, type ArchitectureDepth, type NamingConvention } from './core/style.js';

/**
 * Build the multi-word Task demo model. `backend` / `database` pick the plugin /
 * provider exactly like the other demos; `namingConvention` (Day 12) and
 * `architectureDepth` (Day 13) are the coding-style choices, supplied
 * programmatically here (the wizard UI is Day 14). Relationship-free — a single
 * entity, so the transform is isolated to its own declared fields.
 */
export function buildTaskModel(
  overrides: {
    backend?: string;
    database?: string;
    namingConvention?: NamingConvention;
    architectureDepth?: ArchitectureDepth;
  } = {},
): ProjectModel {
  const model = createProjectModel({
    projectName: 'TaskApp',
    projectType: 'Web App',
    backend: overrides.backend ?? 'Spring Boot',
    frontend: 'React',
    database: overrides.database ?? 'PostgreSQL',
    multiUser: true,
    auth: 'Simple login',
  });

  // Compose whatever style choices were supplied (both default to no-op).
  model.setStyle({
    ...defaultCodingStyle,
    namingConvention: overrides.namingConvention ?? 'default',
    architectureDepth: overrides.architectureDepth ?? 'default',
  });

  model.addEntity({
    name: 'Task',
    fields: [
      { name: 'dueDate', type: 'DateTime', required: true }, // multi-word, required
      { name: 'isUrgent', type: 'Boolean' }, // multi-word, optional
    ],
  });

  return model;
}
