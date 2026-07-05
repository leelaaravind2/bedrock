/*
 * Thraksha — The canonical MAXIMAL-COMPOSITION cell ("MaxCell") fixture.
 *
 * WHY THIS FILE EXISTS (Eco-Day 1): the Day-20 maximal-composition digest
 * `33f3ec4b…` was driven through the HTTP wizard with an AD-HOC description string
 * that was NEVER recorded, and the driver was deleted at cleanup — so that digest
 * became un-reproducible (see docs/daily/eco-day-00-report.md §3). That hash was
 * RECORD-ONLY (never a live day20:regress assertion), so it was proving nothing a
 * gate could re-check.
 *
 * This module is the DURABLE SOURCE OF TRUTH that fixes the one missing input —
 * the description — as a committed constant, and builds the exact maximal model in
 * memory (no HTTP, no AI, no clock; ADR-001/003). The regression harness imports
 * this to assert a NEW, reproducible MAXIMAL baseline; the retained driver
 * (maxcell-driver.ts, `npm run maxcell`) prints/emits it. The cell is ADDITIVE —
 * it moves NONE of the frozen 43 + 10.
 *
 * The maximal cell = every feature switched on at once (the one place they compose):
 *   Express · API-only · PostgreSQL · multi-user
 *   · multi-edge TeamTracker (Ticket belongs-to Application AND Team)
 *   · snake_case + four-space + simple
 *   · integrations { email: smtp, ai: hook }
 *   · a provided (now canonical, recorded) description.
 */

import { createProjectModel, type ProjectModel } from './core/project-model.js';
import type { CodingStyle } from './core/style.js';
import type { Integrations } from './core/integrations.js';

/**
 * THE CANONICAL MAXCELL DESCRIPTION — the committed fixture that makes the maximal
 * digest reproducible forever. Its exact bytes flow into the generated README (the
 * only file a description touches), so it is the sole input that determines the
 * MAXIMAL digest beyond the pinned structural config below. Do NOT edit casually:
 * changing it is a deliberate, documented re-baseline of MAXIMAL (it moves no other
 * hash).
 */
export const MAXCELL_DESCRIPTION =
  'MaxCell — the canonical maximal-composition proof cell: every Thraksha feature ' +
  'switched on at once (API-only, multi-edge relationships, snake_case + four-space ' +
  '+ simple, email + detachable AI hook, owner-scoped multi-user). This description ' +
  'is a committed fixture (Eco-Day 1) so the maximal digest stays reproducible.';

const MAXCELL_STYLE: CodingStyle = {
  formatting: { indent: 'four-space' },
  namingConvention: 'snake_case',
  architectureDepth: 'simple',
};

const MAXCELL_INTEGRATIONS: Integrations = { email: 'smtp', ai: 'hook' };

/**
 * Build the exact maximal-composition model, deterministically. Equivalent to the
 * Day-20 §3 HTTP chain (settings → style → integrations → entities ×4), but in one
 * pure in-memory path (UI==CLI is already established, so the bytes match).
 */
export function buildMaxCellModel(): ProjectModel {
  const m = createProjectModel({
    projectName: 'MaxCell',
    projectType: 'API-only',
    backend: 'Express',
    frontend: 'None',
    database: 'PostgreSQL',
    multiUser: true,
    auth: 'Simple login',
  });
  m.setStyle(MAXCELL_STYLE);
  m.setIntegrations(MAXCELL_INTEGRATIONS);
  m.setDescription(MAXCELL_DESCRIPTION);
  // The multi-edge TeamTracker — the exact specs the 10 relationship baselines use,
  // with Ticket carrying TWO belongs-to edges (Application AND Team).
  m.addEntity({ name: 'Team', fields: [{ name: 'name', type: 'String', required: true }, { name: 'description', type: 'String' }] });
  m.addEntity({ name: 'Application', fields: [{ name: 'name', type: 'String', required: true }, { name: 'status', type: 'String' }], relationships: [{ kind: 'belongs-to', target: 'Team' }] });
  m.addEntity({ name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }, { name: 'code', type: 'String', unique: true }, { name: 'priority', type: 'Integer' }, { name: 'done', type: 'Boolean' }], relationships: [{ kind: 'belongs-to', target: 'Application' }, { kind: 'belongs-to', target: 'Team' }] });
  m.addEntity({ name: 'Comment', fields: [{ name: 'body', type: 'Text', required: true }], relationships: [{ kind: 'belongs-to', target: 'Ticket' }] });
  return m;
}
