// Bedrock wizard — the PURE BlueprintChoices serializer (Eco-Day 61).
//
// DOM-free, window-free, engine-free: this module maps the wizard's collected fields to
// the EXACT BlueprintChoices JSON the CLI / the `--model` arg already accept
// (readModelArg → assembleBlueprint, the Day-16 canonical seam). It is a THIN CLIENT's
// data-assembly layer — NO generation logic, NO model construction (assembleBlueprint /
// buildFileSet stay in the certified Node engine). Because it is pure and DOM-free, Node
// can import it directly to prove UI == CLI headlessly.
//
// Day 61 collects SETTINGS ONLY (a real named project SHELL). Entities/fields/relationships
// are Day 62; they append to `entities` on the same BlueprintChoices.

// The exact enum strings — verbatim from the real registries (do NOT paraphrase):
//   backend  → generator/src/plugins/registry.ts  BACKENDS keys
//   database → generator/src/plugins/database-registry.ts keys
//   others   → generator/src/core/project-model.ts (PhaseASettings)
export const BACKENDS = ['Spring Boot', 'Express', 'FastAPI', 'Django', 'Go'];
export const FRONTENDS = ['React', 'None'];
export const DATABASES = ['PostgreSQL', 'MySQL'];
export const PROJECT_TYPES = ['Web App', 'API-only', 'Cron Worker', 'Queue Consumer', 'CLI', 'GraphQL API', 'Static Site + API'];
export const AUTHS = ['Simple login', 'None'];

// The project types that force frontend = None (Day 15 → 34 → 36). The ENGINE enforces this
// (createProjectModel); mirroring it here is a UI nicety only — the engine stays the source
// of truth (passing any frontend still yields the engine-normalized result).
export const FRONTENDLESS = new Set(['API-only', 'Cron Worker', 'Queue Consumer', 'CLI', 'GraphQL API']);

/**
 * PURE: wizard selections → a valid BlueprintChoices JSON object (settings-only, Day 61).
 * The keys/values are exactly what `PhaseASettingsInput` + `BlueprintChoices` define, so
 * the output flows through the SAME assembleBlueprint the CLI uses — the wizard is just
 * another producer of the identical choices, never a second construction path.
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
  return { settings };
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
