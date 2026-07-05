/*
 * Thraksha — the TeamTracker demo Project Model (richer, multi-entity example).
 *
 * This is DEMO CONTENT, not engine work. It exists so the UI's "Load example"
 * shows something that looks like a real app — four related entities — instead of
 * a single Ticket. It is built with the exact same public Project Model API as
 * the DemoApp example (createProjectModel + addEntity); it adds no engine logic.
 *
 * Relationships (belongs-to) are recorded on each entity using the model's
 * existing `relationships` field. The plugins turn each belongs-to into a real
 * foreign key — a scalar FK column + constraint (Days 1–4 codegen) — so this
 * model's four links generate `team_id`/`application_id`/`ticket_id` columns and
 * their `fk_…` constraints (baked into the 10 frozen TeamTracker baselines); the
 * blueprint also draws them as connections. This model adds no engine logic — it
 * just declares the links the existing FK codegen consumes.
 *
 * No AI (ADR-001). No randomness (ADR-003). Pure construction — same model every
 * run, so generation stays deterministic (its own stable hash).
 */

import { type ProjectModel, type RelationshipSpec } from './core/project-model.js';
import { assembleBlueprint } from './core/assemble.js';

/** A single "belongs-to" link to another entity (FK owner + blueprint connection). */
function belongsTo(target: string): RelationshipSpec {
  return { kind: 'belongs-to', target };
}

/**
 * Build the TeamTracker demo model. `backend` defaults to 'Spring Boot' (like the
 * DemoApp example); the UI/CLI can drive the SAME blueprint through any backend
 * plugin by changing only that answer.
 *
 * Day 16: like DemoApp, this feeds the canonical `assembleBlueprint(choices)`. The
 * four related entities are supplied in dependency order (a belongs-to target must be
 * defined earlier — the model enforces it). No optional dimension is supplied, so the
 * assembled state is byte-for-byte the previous sequence's — the 10 TeamTracker
 * relationship baselines reproduce unchanged.
 */
export function buildTeamTrackerModel(
  overrides: { backend?: string; database?: string; projectType?: 'Web App' | 'API-only' } = {},
): ProjectModel {
  return assembleBlueprint({
    settings: {
      projectName: 'TeamTracker',
      projectType: overrides.projectType ?? 'Web App',
      backend: overrides.backend ?? 'Spring Boot',
      frontend: 'React',
      database: overrides.database ?? 'PostgreSQL',
      multiUser: true,
      auth: 'Simple login',
    },
    entities: [
      // Team — top of the hierarchy.
      {
        name: 'Team',
        fields: [
          { name: 'name', type: 'String', required: true },
          { name: 'description', type: 'String' },
        ],
      },
      // Application — belongs to a Team.
      {
        name: 'Application',
        fields: [
          { name: 'name', type: 'String', required: true },
          { name: 'status', type: 'String' },
        ],
        relationships: [belongsTo('Team')],
      },
      // Ticket — belongs to an Application and a Team.
      {
        name: 'Ticket',
        fields: [
          { name: 'title', type: 'String', required: true },
          { name: 'code', type: 'String', unique: true },
          { name: 'priority', type: 'Integer' },
          { name: 'done', type: 'Boolean' },
        ],
        relationships: [belongsTo('Application'), belongsTo('Team')],
      },
      // Comment — belongs to a Ticket.
      {
        name: 'Comment',
        fields: [{ name: 'body', type: 'Text', required: true }],
        relationships: [belongsTo('Ticket')],
      },
    ],
  });
}
