// Bedrock wizard — the PURE BlueprintChoices serializer (Eco-Day 61).
//
// DOM-free, window-free, engine-free: this module maps the wizard's collected fields to
// the EXACT BlueprintChoices JSON the CLI / the `--model` arg already accept
// (readModelArg → assembleBlueprint, the Day-16 canonical seam). It is a THIN CLIENT's
// data-assembly layer — NO generation logic, NO model construction (assembleBlueprint /
// buildFileSet stay in the certified Node engine). Because it is pure and DOM-free, Node
// can import it directly to prove UI == CLI headlessly.
//
// Day 61 collected SETTINGS ONLY. Day 62 adds the DATA MODEL: entities/fields/relationships,
// appended to `entities` on the same BlueprintChoices (the shape the engine already accepts).

// The exact enum strings — verbatim from the real registries/types (do NOT paraphrase):
//   backend    → generator/src/plugins/registry.ts  BACKENDS keys
//   database   → generator/src/plugins/database-registry.ts keys
//   field type → generator/src/plugins/database/postgres.ts codegen switch (the real 8)
//   others     → generator/src/core/project-model.ts (PhaseASettings / RelationshipSpec)
export const BACKENDS = ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go'];
export const FRONTENDS = ['React', 'None'];
export const DATABASES = ['PostgreSQL', 'MySQL'];
export const PROJECT_TYPES = ['Web App', 'API-only', 'Cron Worker', 'Queue Consumer', 'CLI', 'GraphQL API', 'Static Site + API'];
export const AUTHS = ['Simple login', 'None'];
// The REAL field-type enum (the postgres codegen switch). No invented types.
export const FIELD_TYPES = ['String', 'Text', 'Integer', 'Long', 'Decimal', 'Boolean', 'Date', 'DateTime'];
export const RELATIONSHIP_KINDS = ['belongs-to', 'has-many'];
// Money-grade Decimal defaults (Day 27) — shown as placeholders; omitted ⇒ the engine applies these.
export const DECIMAL_DEFAULTS = { precision: 19, scale: 4 };

// The project types that force frontend = None (Day 15 → 34 → 36). The ENGINE enforces this
// (createProjectModel); mirroring it here is a UI nicety only — the engine stays the source
// of truth (passing any frontend still yields the engine-normalized result).
export const FRONTENDLESS = new Set(['API-only', 'Cron Worker', 'Queue Consumer', 'CLI', 'GraphQL API']);

// PURE: a wizard field → a minimal FieldSpec. DEFAULT-VALUED keys are OMITTED (required/unique
// only when true; validation only for a Decimal with precision/scale) so the wizard emits the
// EXACT minimal shape the CLI/demos write — a wizard entity deep-equals its CLI equivalent.
function toFieldSpec(f) {
  const spec = { name: f.name, type: f.type };
  if (f.required) spec.required = true;
  if (f.unique) spec.unique = true;
  if (f.type === 'Decimal') {
    const validation = {};
    if (f.precision !== undefined && f.precision !== null && f.precision !== '') validation.precision = Number(f.precision);
    if (f.scale !== undefined && f.scale !== null && f.scale !== '') validation.scale = Number(f.scale);
    if (Object.keys(validation).length) spec.validation = validation; // omitted ⇒ engine money defaults 19/4
  }
  return spec;
}

// PURE: a wizard entity → a minimal EntitySpec (relationships omitted when none). has-many is
// carried through EXPLICITLY — it is whatever the user collected, never inferred from belongs-to.
function toEntitySpec(e) {
  const spec = { name: e.name, fields: (e.fields || []).map(toFieldSpec) };
  if (e.relationships && e.relationships.length) {
    spec.relationships = e.relationships.map((r) => {
      const rs = { kind: r.kind, target: r.target };
      if (r.required) rs.required = true;
      return rs;
    });
  }
  return spec;
}

/**
 * PURE: wizard selections → a valid BlueprintChoices JSON object.
 * Settings (Day 61) + entities/fields/relationships (Day 62). The keys/values are exactly what
 * `PhaseASettingsInput` / `EntitySpec` / `FieldSpec` / `RelationshipSpec` define, so the output
 * flows through the SAME assembleBlueprint the CLI uses — the wizard is another producer of the
 * identical choices, never a second construction path. NO generation logic here.
 *
 * NO entities ⇒ `entities` is OMITTED ⇒ the Day-61 settings-only shell is a LITERAL BYPASS
 * (byte-identical to Day 61).
 */
export function buildBlueprintChoices(sel) {
  const settings = {
    projectName: sel.projectName,
    projectType: sel.projectType,
    backend: sel.backend,
    // Mirror the engine's type↔frontend constraint (a nicety; the engine enforces it anyway).
    frontend: FRONTENDLESS.has(sel.projectType) ? 'None' : sel.frontend,
    database: sel.database,
    multiUser: sel.multiUser,
    auth: sel.auth,
  };
  const choices = { settings };
  if (sel.entities && sel.entities.length) choices.entities = sel.entities.map(toEntitySpec);
  return choices;
}

// Templates = pre-filled selection presets (PURE DATA — not engine logic). Selecting one
// pre-fills the wizard (all fields stay editable); it never bypasses the flow or the engine.
export const TEMPLATES = [
  { key: 'blank',   label: 'Blank',    sel: { projectName: 'MyApp',     projectType: 'Web App',     backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' } },
  { key: 'restApi', label: 'REST API', sel: { projectName: 'MyApi',     projectType: 'API-only',    backend: 'Express', frontend: 'None',  database: 'PostgreSQL', multiUser: true, auth: 'Simple login' } },
  { key: 'crud',    label: 'CRUD app', sel: { projectName: 'MyCrudApp', projectType: 'Web App',     backend: 'Express', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' } },
  { key: 'worker',  label: 'Worker',   sel: { projectName: 'MyWorker',  projectType: 'Cron Worker', backend: 'Express', frontend: 'None',  database: 'PostgreSQL', multiUser: true, auth: 'Simple login' } },
];

// The ordered wizard steps (settings-only, Day 61). Each maps a select/text field of `sel`.
export const STEPS = [
  { id: 'projectName', label: 'App name',     kind: 'text' },
  { id: 'projectType', label: 'Project type', kind: 'select', options: PROJECT_TYPES },
  { id: 'backend',     label: 'Backend',      kind: 'select', options: BACKENDS },
  { id: 'frontend',    label: 'Frontend',     kind: 'select', options: FRONTENDS },
  { id: 'database',    label: 'Database',     kind: 'select', options: DATABASES },
  { id: 'auth',        label: 'Auth',         kind: 'select', options: AUTHS },
];

// PURE inverse of buildBlueprintChoices (Eco-Day 63): a stored/loaded BlueprintChoices JSON →
// the wizard's mutable `selections` shape, so "My projects" can re-populate the wizard. Thin
// DATA mapping only (settings spread + entities; validation.{precision,scale} → the field's
// precision/scale) — NO generation logic, NO engine reimplementation.
export function choicesToSelections(choices) {
  const s = choices.settings || {};
  return {
    projectName: s.projectName, projectType: s.projectType, backend: s.backend,
    frontend: s.frontend, database: s.database, multiUser: s.multiUser, auth: s.auth,
    entities: (choices.entities || []).map((e) => ({
      name: e.name,
      fields: (e.fields || []).map((f) => ({
        name: f.name, type: f.type, required: !!f.required, unique: !!f.unique,
        precision: f.validation && f.validation.precision != null ? f.validation.precision : '',
        scale: f.validation && f.validation.scale != null ? f.validation.scale : '',
      })),
      relationships: (e.relationships || []).map((r) => ({ kind: r.kind, target: r.target })),
    })),
  };
}

// Factory for a fresh wizard entity (the mutable UI shape; toEntitySpec serializes it).
export function newEntity(name) {
  return { name: name || 'Entity', fields: [{ name: 'title', type: 'String', required: true }], relationships: [] };
}
export function newField() { return { name: 'field', type: 'String', required: false, unique: false, precision: '', scale: '' }; }
export function newRelationship(target) { return { kind: 'belongs-to', target: target || '' }; }

// The certified TeamTracker (PART 1d, the 10 relationship baselines) as a wizard-shaped preset
// (settings + entities). Loading it reproduces the frozen relationship structure byte-for-byte —
// pure data (like the Day-61 templates), the visible tie to the certified baseline.
export const TEAMTRACKER_EXAMPLE = {
  settings: { projectName: 'TeamTracker', projectType: 'Web App', backend: 'Spring Boot', frontend: 'React', database: 'PostgreSQL', multiUser: true, auth: 'Simple login' },
  entities: [
    { name: 'Team', fields: [{ name: 'name', type: 'String', required: true }, { name: 'description', type: 'String' }], relationships: [] },
    { name: 'Application', fields: [{ name: 'name', type: 'String', required: true }, { name: 'status', type: 'String' }], relationships: [{ kind: 'belongs-to', target: 'Team' }] },
    { name: 'Ticket', fields: [{ name: 'title', type: 'String', required: true }, { name: 'code', type: 'String', unique: true }, { name: 'priority', type: 'Integer' }, { name: 'done', type: 'Boolean' }], relationships: [{ kind: 'belongs-to', target: 'Application' }, { kind: 'belongs-to', target: 'Team' }] },
    { name: 'Comment', fields: [{ name: 'body', type: 'Text', required: true }], relationships: [{ kind: 'belongs-to', target: 'Ticket' }] },
  ],
};
