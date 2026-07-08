/*
 * Thraksha — Project Model (Step 2: "the map"), TypeScript edition.
 *
 * A plain, in-memory representation of one project. It is the single source of
 * engineering truth that every engine reads and updates (Constitution Law 2).
 * For now it is an ordinary data structure with a small API — no database, no
 * persistence (that is Step 5), no AI (ADR-001), no randomness (ADR-003).
 *
 * It holds two things:
 *   1. The foundational Phase-A settings (name, type, backend, frontend,
 *      database, multi-user, auth).
 *   2. A list of entities — empty at first; entities are added one at a time.
 *
 * Code generation does NOT happen here. The model only *holds* the shape
 * (per docs/INTAKE-SPEC.md). Entities turn into code in Step 3.
 *
 * This file's BEHAVIOUR is identical to the previous JavaScript version — only
 * the language and the type annotations changed. The types below make the
 * Phase-A / entity / field shapes explicit so mistakes are caught at compile
 * time (e.g. a typo'd database value, or a field missing its mandatory type).
 *
 * Design choices tied to the rules:
 *   ADR-004  Every setting/field is mandatory, optional, or default. Mandatory
 *            values block when missing; defaults are applied AND recorded so
 *            they can be shown, never silently decided.
 *   ADR-005  Multi-user is a foundational, up-front decision set once at
 *            construction. There is deliberately NO setMultiUser()/toggle.
 */

import { type CodingStyle, defaultCodingStyle } from './style.js';
import { type Integrations, defaultIntegrations } from './integrations.js';
import { type CiConfig, defaultCiConfig } from './cicd.js';
import { type StackVersions, defaultVersionsFor } from './versions.js';
import { type SlotDecl } from './slots.js';
import { type DesignTokens } from '../figma/figma-ingest.js';

// ---------------------------------------------------------------------------
// Domain types — the Project Model shapes (per docs/INTAKE-SPEC.md).
// ---------------------------------------------------------------------------

/**
 * The project types that have NO frontend (the type↔frontend constraint, Day 15
 * → 34 → 36). Membership is the SINGLE source of truth for "force frontend =
 * None": API-only + the worker/backend archetypes. 'Web App' and 'Static Site +
 * API' are ABSENT — they keep their chosen frontend. Keeping this an explicit set
 * (rather than a `!== 'Web App'` test) is what lets 'Static Site + API' retain a
 * frontend while staying byte-neutral for the existing frontendless types.
 */
export const FRONTENDLESS_PROJECT_TYPES: ReadonlySet<string> = new Set([
  'API-only',
  'Cron Worker',
  'Queue Consumer',
  'CLI',
  'GraphQL API',
]);

/** Phase-A settings — the foundational, up-front project decisions. */
export interface PhaseASettings {
  /** Q1 Mandatory — free text. */
  projectName: string;
  /**
   * Q2 Mandatory — project category / TYPE. 'Web App' is the default (a
   * full project); 'API-only' is a backend with no frontend (Day 15). Day 34
   * adds two worker archetypes — 'Cron Worker' (a scheduler + an idempotent
   * handler, no HTTP routes) and 'Queue Consumer' (a broker + a consume loop +
   * a topic→handler table). Day 36 adds three more — 'CLI' (an arg-parse
   * entrypoint + a command→handler table, run-to-exit, no HTTP), 'GraphQL API'
   * (one /graphql endpoint + a deterministic SDL schema + resolvers, replacing
   * the REST route/controller layer), and 'Static Site + API' (web-app + an
   * additive static-build stage — the ONLY new type that KEEPS a frontend). The
   * type is the higher-level concept that constrains the lower answers — the
   * FRONTENDLESS types (API-only, Cron Worker, Queue Consumer, CLI, GraphQL API)
   * imply no frontend; Web App and Static Site + API keep the chosen frontend
   * (enforced in createProjectModel). Keep 'Web App' the EXACT string it has
   * always been: it is the literal bypass that freezes the 20-hash matrix (its
   * manifest line stays byte-identical). Every non-Web-App type is ADDITIVE — no
   * fixture uses them, so the frozen backstop reproduces byte-for-byte.
   */
  projectType: 'Web App' | 'API-only' | 'Cron Worker' | 'Queue Consumer' | 'CLI' | 'GraphQL API' | 'Static Site + API';
  /**
   * Q3-Q5 Mandatory — the chosen technologies, recorded as the developer's
   * intent (Law 1). The kernel stores these names but NEVER acts on them with
   * technology-specific logic (Law 25): which backend/frontend/database values
   * are valid, and what they generate, is owned entirely by backend plugins.
   * Hence plain `string`, not a hardcoded list of technology names.
   */
  backend: string;
  frontend: string;
  database: string;
  /** Q6 Mandatory — defaults to multi-user-ready (ADR-005). */
  multiUser: boolean;
  /** Q7 Default — defaults to Simple login. */
  auth: 'Simple login' | 'None';
}

/**
 * Phase-A answers as *supplied* to the model: mandatory answers are required,
 * the two defaultable answers (multiUser, auth) may be omitted and will be
 * filled in by the model.
 */
export type PhaseASettingsInput =
  Pick<PhaseASettings, 'projectName' | 'projectType' | 'backend' | 'frontend' | 'database'> &
  Partial<Pick<PhaseASettings, 'multiUser' | 'auth'>>;

/** One field on an entity, as supplied (INTAKE-SPEC Q9, per-field). */
export interface FieldSpec {
  /** Mandatory. */
  name: string;
  /** Mandatory — String, Integer, Decimal, Boolean, Date, DateTime, etc. */
  type: string;
  /** Default: optional (false). */
  required?: boolean;
  /** Default: no (false). */
  unique?: boolean;
  /** Optional: none. */
  defaultValue?: unknown;
  /** Optional/Default — per-type default is applied at generation (Step 3). */
  validation?: unknown;
}

/** One field, normalised into the stored model shape. */
export interface Field {
  name: string;
  type: string;
  required: boolean;
  unique: boolean;
  defaultValue: unknown;
  validation: unknown;
}

/**
 * One relationship on an entity, as supplied (INTAKE-SPEC Q10). Minimal,
 * technology-neutral: the platform records intent (Law 1), plugins decide how to
 * generate it. `belongs-to` owns a foreign key to `target`; `has-many` is the
 * inverse view (no schema of its own). `type` is accepted as an alias for `kind`.
 */
export interface RelationshipSpec {
  /** Mandatory — 'belongs-to' or 'has-many'. */
  kind?: 'belongs-to' | 'has-many';
  /** Alias for `kind` (back-compat with earlier demo content). */
  type?: 'belongs-to' | 'has-many';
  /** Mandatory — the related entity's name. */
  target: string;
  /** Default: optional (false) — ADR-004. */
  required?: boolean;
}

/** One relationship, normalised into the stored model shape. */
export interface Relationship {
  kind: 'belongs-to' | 'has-many';
  target: string;
  required: boolean;
}

/** One entity, as supplied (INTAKE-SPEC Q8–Q11). */
export interface EntitySpec {
  /** Mandatory. */
  name: string;
  /** Mandatory — at least one field. */
  fields: FieldSpec[];
  /** Optional: none. */
  relationships?: RelationshipSpec[];
  /** Optional. */
  validation?: unknown;
}

/** One entity, normalised into the stored model shape. */
export interface Entity {
  name: string;
  fields: Field[];
  relationships: Relationship[];
  validation: unknown;
}

/** A default the platform filled in, recorded so it can be shown (ADR-004). */
export interface DefaultApplied {
  setting: string;
  value: unknown;
  reason: string;
}

/** The full readable state of a project. */
export interface ProjectState {
  phaseA: PhaseASettings;
  entities: Entity[];
  defaultsApplied: DefaultApplied[];
  /** The chosen coding style (default = a no-op that reproduces current output). */
  style: CodingStyle;
  /** The optional integrations (default = none; a literal bypass) — Day 17. */
  integrations: Integrations;
  /**
   * The optional project description (Day 19). A NEUTRAL, OPTIONAL value — NOT a
   * Phase-A key. Default '' (blank) is a literal bypass: it touches nothing, so
   * the README and the 20-hash backstop are byte-identical. When provided it is
   * injected into the generated README (a legitimate sibling output) and shown in
   * the blueprint (ADR-004). It never influences generated CODE.
   */
  description: string;
  /**
   * The pinned framework/language versions for the selected backend (Day 11). Default
   * = the version today's output already implies (DEFAULT_VERSIONS), so the default
   * path is a literal bypass that reproduces the frozen hashes byte-for-byte. Concrete
   * only — "latest" is resolved to a pin BEFORE generation (resolve-then-pin).
   */
  versions: StackVersions;
  /**
   * The typed CONTENT-SLOT declarations (Day 21) — the STRUCTURAL half of the creative
   * mechanism. Each is { id, type }: which creative slots this project declares, and each
   * slot's TYPE (which selects its placeholder). Default [] (no slots) is a literal bypass:
   * the README post-process inserts nothing, so the shell + the frozen backstop stay
   * byte-identical. Declarations DRIVE the shell (a typed placeholder per slot); the slot
   * CONTENT is a SEPARATE layer (slot-content.ts) the generation path never sees — so the
   * shell is byte-identical across empty/partial/full content states BY CONSTRUCTION. No AI.
   */
  slots: SlotDecl[];
  /**
   * The ingested Figma DESIGN TOKENS (Day 31) — the Phase-3 input surface. A normalized,
   * canonical map (token path → { type, value }) produced by the pure ingestion core from a
   * Figma export's W3C token JSON. Default {} (no Figma) is a literal bypass: buildFileSet
   * emits no `design-tokens.json`, so the shell + the frozen backstop stay byte-identical.
   * Non-empty ⇒ a canonical `design-tokens.json` artifact (round-trip deterministic). AI-free.
   */
  designTokens: DesignTokens;
  /**
   * The optional CI/CD config (Day 38). Default { provider: 'none' } is a literal
   * bypass: buildFileSet emits no `.github/workflows/ci.yml`, so the shell + the frozen
   * backstop stay byte-identical. 'github-actions' ⇒ a deterministic workflow whose
   * runtime version is READ from the Day-11 version pin (versions[runtimeKey]) and
   * whose action refs are all pinned (never floating). No timestamps, no matrix. AI-free.
   */
  cicd: CiConfig;
}

/** The Project Model API — the "map" the platform reads and updates. */
export interface ProjectModel {
  /** Read the Phase-A settings as a plain object in canonical key order. */
  getPhaseASettings(): PhaseASettings;
  /** Read a single Phase-A setting. */
  getSetting<K extends keyof PhaseASettings>(key: K): PhaseASettings[K];
  /** Add one entity (validated/normalised). Returns the stored entity. */
  addEntity(spec: EntitySpec): Entity;
  /** Read the current entity list (a copy, so callers cannot mutate state). */
  getEntities(): Entity[];
  /** Defaults that were applied on the developer's behalf (ADR-004 — shown). */
  getDefaultsApplied(): DefaultApplied[];
  /** The coding style the developer chose after setup (default = current output). */
  getStyle(): CodingStyle;
  /** Set the coding style (a post-setup choice; ADR-003 — a deterministic switch). */
  setStyle(style: CodingStyle): void;
  /** The optional integrations (default = none; a literal bypass) — Day 17. */
  getIntegrations(): Integrations;
  /** Set the integrations (a post-setup choice; ADR-003 — a deterministic switch). */
  setIntegrations(integrations: Integrations): void;
  /** The optional project description (default '' — a literal bypass) — Day 19. */
  getDescription(): string;
  /** Set the project description (a neutral intake value; README-only when provided). */
  setDescription(description: string): void;
  /** The pinned framework/language versions for the selected backend (Day 11). */
  getVersions(): StackVersions;
  /** Set the pinned versions (must be CONCRETE — resolve "latest" before this). */
  setVersions(versions: StackVersions): void;
  /** The typed content-slot declarations (default [] — a literal bypass) — Day 21. */
  getSlots(): SlotDecl[];
  /** Set the slot declarations (a post-setup structural choice; default [] = bypass). */
  setSlots(slots: SlotDecl[]): void;
  /** The ingested Figma design tokens (default {} — a literal bypass) — Day 31. */
  getDesignTokens(): DesignTokens;
  /** Set the ingested design tokens (Figma → the ingestion core → here; default {} = bypass). */
  setDesignTokens(tokens: DesignTokens): void;
  /** The optional CI/CD config (default { provider: 'none' } — a literal bypass) — Day 38. */
  getCicd(): CiConfig;
  /** Set the CI/CD config (a post-setup choice; default 'none' = bypass; ADR-003 deterministic). */
  setCicd(cicd: CiConfig): void;
  /** Read the whole current state: Phase-A settings + entities + defaults + style + integrations + description + versions + slots + designTokens + cicd. */
  getState(): ProjectState;
}

// ---------------------------------------------------------------------------
// Phase-A key contract.
//
// The exact order of the Phase-A keys. The generator and its manifest read the
// settings in this order, so this ordering is part of the deterministic
// contract (ADR-003) — do not reorder casually.
// ---------------------------------------------------------------------------
export const PHASE_A_KEYS = [
  'projectName', // Q1 Mandatory
  'projectType', // Q2 Mandatory
  'backend', // Q3 Mandatory
  'frontend', // Q4 Mandatory
  'database', // Q5 Mandatory
  'multiUser', // Q6 Mandatory — defaults to multi-user-ready
  'auth', // Q7 Default — defaults to Simple login
] as const;

type PhaseAKey = (typeof PHASE_A_KEYS)[number];

// Phase-A settings that block generation if absent (ADR-004 "Mandatory").
const PHASE_A_MANDATORY: readonly PhaseAKey[] = [
  'projectName',
  'projectType',
  'backend',
  'frontend',
  'database',
];

interface DefaultSpec {
  value: unknown;
  reason: string;
}

// Phase-A settings filled with a known-good value when left blank (ADR-004
// "Default"). Each records a human-readable reason so it can be shown.
const PHASE_A_DEFAULTS: Partial<Record<PhaseAKey, DefaultSpec>> = {
  multiUser: { value: true, reason: 'Safe default is multi-user-ready (ADR-005).' },
  auth: { value: 'Simple login', reason: 'Default authentication for the MVP (INTAKE-SPEC Q7).' },
};

/** A value counts as "provided" when it is not undefined, null, or empty. */
function isProvided(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

/**
 * The precision/scale for a Decimal field (Day 27) — read from the field's optional
 * `validation.precision` / `validation.scale` (the same channel maxLength uses), with
 * money-grade defaults: precision 19, scale 4 (scale ≥4). SHARED so every stack maps the
 * SAME field to the SAME NUMERIC(precision, scale) and the SAME language precision/scale.
 * Pure, total, deterministic. Only meaningful for Decimal fields.
 */
export function decimalPrecision(field: Field): number {
  const v = field.validation;
  if (v && typeof v === 'object' && 'precision' in v) {
    const p = (v as { precision?: unknown }).precision;
    if (typeof p === 'number' && Number.isInteger(p) && p > 0) return p;
  }
  return 19;
}
export function decimalScale(field: Field): number {
  const v = field.validation;
  if (v && typeof v === 'object' && 'scale' in v) {
    const s = (v as { scale?: unknown }).scale;
    if (typeof s === 'number' && Number.isInteger(s) && s >= 0) return s;
  }
  return 4; // scale ≥4 default (money-grade), never float
}

/**
 * Normalise one field spec into the model's field shape (per INTAKE-SPEC).
 * Mandatory: name, type. Defaults: required=false (optional), unique=false.
 * Optional: defaultValue (none), validation (sensible per-type default is
 * applied later, at generation time in Step 3).
 */
export function createField(spec: FieldSpec): Field {
  if (!spec.name || typeof spec.name !== 'string') {
    throw new Error('Field requires a name (mandatory, INTAKE-SPEC Q9).');
  }
  if (!spec.type || typeof spec.type !== 'string') {
    throw new Error(`Field "${spec.name}" requires a type (mandatory, INTAKE-SPEC Q9).`);
  }
  return {
    name: spec.name,
    type: spec.type,
    required: spec.required ?? false, // default: optional
    unique: spec.unique ?? false, // default: no
    defaultValue: spec.defaultValue ?? null, // optional: none
    validation: spec.validation ?? null, // optional: per-type default at generation
  };
}

/**
 * Normalise one relationship spec into the model's relationship shape.
 * Mandatory: kind (or its `type` alias) and target. Default: required=false
 * (optional) — applied here and shown at generation (ADR-004). Pure and total;
 * cross-entity checks (target must exist / precede) happen in addEntity, which
 * has the model context.
 */
export function createRelationship(spec: RelationshipSpec): Relationship {
  const kind = spec.kind ?? spec.type;
  if (kind !== 'belongs-to' && kind !== 'has-many') {
    throw new Error(`Relationship requires kind "belongs-to" or "has-many" (got ${JSON.stringify(kind)}).`);
  }
  if (!spec.target || typeof spec.target !== 'string') {
    throw new Error(`Relationship (${kind}) requires a target entity name (mandatory).`);
  }
  return {
    kind,
    target: spec.target,
    required: spec.required ?? false, // default: optional (ADR-004)
  };
}

/**
 * Normalise one entity spec into the model's entity shape (per INTAKE-SPEC).
 * Mandatory: name, at least one field. Optional: relationships (none),
 * validation (sensible defaults later).
 */
export function createEntity(spec: EntitySpec): Entity {
  if (!spec.name || typeof spec.name !== 'string') {
    throw new Error('Entity requires a name (mandatory, INTAKE-SPEC Q8).');
  }
  if (!Array.isArray(spec.fields) || spec.fields.length === 0) {
    throw new Error(`Entity "${spec.name}" requires at least one field (mandatory, INTAKE-SPEC Q9).`);
  }
  return {
    name: spec.name,
    fields: spec.fields.map(createField),
    // optional: none. Relationship-free entities keep an empty list, byte-identical to before.
    relationships: Array.isArray(spec.relationships) ? spec.relationships.map(createRelationship) : [],
    validation: spec.validation ?? null, // optional
  };
}

/**
 * Construct a Project Model from Phase-A answers.
 *
 * Mandatory answers must be present or construction blocks (ADR-004). Missing
 * defaultable answers are filled in and recorded in `defaultsApplied` so they
 * can be shown to the developer, never silently decided.
 */
export function createProjectModel(settings: PhaseASettingsInput): ProjectModel {
  // Phase-A iteration is by dynamic key; read through a string-indexed view so
  // the canonical-order loop stays simple. The PUBLIC types above are what
  // catch caller mistakes at compile time.
  const input = settings as Record<string, unknown>;

  for (const key of PHASE_A_MANDATORY) {
    if (!isProvided(input[key])) {
      throw new Error(`Phase-A setting "${key}" is mandatory and was not provided (ADR-004).`);
    }
  }

  // Private state. Phase-A is foundational and set once here, in canonical key
  // order; entities are the part that grows over time.
  const defaultsApplied: DefaultApplied[] = [];
  const phaseA: Record<string, unknown> = {};
  for (const key of PHASE_A_KEYS) {
    const provided = input[key];
    if (isProvided(provided)) {
      phaseA[key] = provided;
    } else {
      const def = PHASE_A_DEFAULTS[key];
      if (def) {
        phaseA[key] = def.value;
        defaultsApplied.push({ setting: key, value: def.value, reason: def.reason });
      }
    }
  }

  // The type↔frontend constraint (Day 15; generalized Day 34; refined Day 36): the
  // FRONTENDLESS types have no frontend. This is a GENERIC project-shape rule (not
  // per-technology), so it is Law-25 legal in the kernel, exactly like the
  // multiUser/auth normalisation above. It is recorded in defaultsApplied so it is
  // shown, never silent (ADR-004). Day 36 REFINES the Day-34 `!== 'Web App'` rule
  // into an explicit FRONTENDLESS set: 'Static Site + API' is web-app + a static
  // build stage, so it KEEPS its frontend (like Web App) — a plain `!== 'Web App'`
  // test would wrongly strip it. This refactor is BYTE-NEUTRAL for existing types:
  // API-only / Cron Worker / Queue Consumer remain frontendless (same forced-None,
  // same reason strings preserved byte-identical); Web App is untouched; Static
  // Site + API (new, no fixture) keeps its frontend. CLI / GraphQL API are
  // frontendless (backend archetypes). See FRONTENDLESS_PROJECT_TYPES below.
  if (FRONTENDLESS_PROJECT_TYPES.has(phaseA.projectType as string) && phaseA.frontend !== 'None') {
    phaseA.frontend = 'None';
    defaultsApplied.push({
      setting: 'frontend',
      value: 'None',
      reason:
        phaseA.projectType === 'API-only'
          ? 'API-only projects have no frontend (project type constrains frontend).'
          : `${phaseA.projectType} projects have no frontend (project type constrains frontend).`,
    });
  }

  const entities: Entity[] = [];

  // Framework/language versions default to the current-implied pins for this backend
  // (Day 11). Default = current value ⇒ a literal bypass (byte-identical output).
  //
  // ADR-004 (shown, not silent): versions are surfaced via getState()/getVersions()
  // (the blueprint the wizard shows) — NOT via defaultsApplied. defaultsApplied is
  // rendered into GENERATION-MANIFEST.txt (a frozen output), so recording versions
  // there would move every frozen hash. This is the SAME rule the coding-style engine
  // follows (style is blueprint-shown, never manifest-recorded, for exactly this
  // reason — see CAPABILITIES §3). Visibility is wizard-side; the manifest is frozen.
  const versions = defaultVersionsFor(phaseA.backend as string);

  // Integrations default to none (a literal bypass); a post-setup choice supplied
  // via setIntegrations (like the coding style), so the wizard/CLI opt in later.
  // Description defaults to '' (a literal bypass) — supplied later via setDescription.
  // Slots default to [] (a literal bypass) — declared later via setSlots (Day 21).
  // Design tokens default to {} (a literal bypass) — ingested later via setDesignTokens (Day 31).
  // CI/CD defaults to { provider: 'none' } (a literal bypass) — declared later via setCicd (Day 38).
  return makeModel(phaseA, entities, defaultsApplied, defaultCodingStyle, defaultIntegrations, '', versions, [], {}, defaultCiConfig);
}

/**
 * Internal: build the ProjectModel API over the given (mutable) state. Shared
 * by createProjectModel (fresh) and restoreProjectModel (from a snapshot) so
 * both behave identically.
 */
function makeModel(
  phaseA: Record<string, unknown>,
  entities: Entity[],
  defaultsApplied: DefaultApplied[],
  initialStyle: CodingStyle,
  initialIntegrations: Integrations,
  initialDescription: string,
  initialVersions: StackVersions,
  initialSlots: SlotDecl[],
  initialDesignTokens: DesignTokens,
  initialCicd: CiConfig,
): ProjectModel {
  // Held in the closure like Phase-A/entities. Default is a no-op style / no
  // integrations / blank description — each a literal bypass. Versions default to
  // the current-implied pins (Day 11) — also a literal bypass (byte-identical output).
  // Slots default to [] (Day 21) — a literal bypass (the README post-process is a no-op).
  let style: CodingStyle = initialStyle;
  let integrations: Integrations = initialIntegrations;
  let description: string = initialDescription;
  let versions: StackVersions = { ...initialVersions };
  let slots: SlotDecl[] = initialSlots.map((s) => ({ id: s.id, type: s.type }));
  // Design tokens default to {} (Day 31) — a literal bypass (buildFileSet emits no artifact).
  let designTokens: DesignTokens = { ...initialDesignTokens };
  // CI/CD defaults to { provider: 'none' } (Day 38) — a literal bypass (no workflow emitted).
  let cicd: CiConfig = { provider: initialCicd.provider };
  return {
    getPhaseASettings(): PhaseASettings {
      const copy: Record<string, unknown> = {};
      for (const key of PHASE_A_KEYS) {
        if (phaseA[key] !== undefined) copy[key] = phaseA[key];
      }
      // Safe: the construction loop guarantees every Phase-A key is present.
      return copy as unknown as PhaseASettings;
    },

    getSetting<K extends keyof PhaseASettings>(key: K): PhaseASettings[K] {
      return phaseA[key as string] as PhaseASettings[K];
    },

    addEntity(spec: EntitySpec): Entity {
      const entity = createEntity(spec);
      if (entities.some((e) => e.name === entity.name)) {
        throw new Error(`Entity "${entity.name}" already exists in this project.`);
      }
      // Deterministic ordering (ADR-003): a belongs-to target must already be
      // defined, so its table/migration precedes the one referencing it. Forward
      // references are rejected clearly rather than generating half-working SQL.
      // (has-many is the inverse view and may point forward, so it is not checked.)
      const known = new Set(entities.map((e) => e.name));
      for (const rel of entity.relationships) {
        if (rel.kind === 'belongs-to' && !known.has(rel.target)) {
          throw new Error(
            `Entity "${entity.name}" belongs-to "${rel.target}", which must be defined earlier in the model ` +
              `(deterministic ordering — forward references are not supported).`,
          );
        }
      }
      entities.push(entity);
      return entity;
    },

    getEntities(): Entity[] {
      return entities.map((e) => ({
        ...e,
        fields: e.fields.map((f) => ({ ...f })),
        relationships: [...e.relationships],
      }));
    },

    getDefaultsApplied(): DefaultApplied[] {
      return defaultsApplied.map((d) => ({ ...d }));
    },

    getStyle(): CodingStyle {
      // The copy MUST carry every CodingStyle member (formatting, namingConvention
      // AND architectureDepth). Dropping a member here would silently make that
      // style option a no-op — so this deep-copy is load-bearing.
      return {
        formatting: { ...style.formatting },
        namingConvention: style.namingConvention,
        architectureDepth: style.architectureDepth,
      };
    },

    setStyle(next: CodingStyle): void {
      style = {
        formatting: { ...next.formatting },
        namingConvention: next.namingConvention,
        architectureDepth: next.architectureDepth,
      };
    },

    getIntegrations(): Integrations {
      // Copy every member (email + ai) so the value is immutable to callers —
      // dropping one would silently make that integration a no-op (Day 18: ai).
      return { email: integrations.email, ai: integrations.ai };
    },

    setIntegrations(next: Integrations): void {
      integrations = { email: next.email, ai: next.ai };
    },

    getDescription(): string {
      return description;
    },

    setDescription(next: string): void {
      // Neutral intake value: stored verbatim (a string is immutable). Blank ('')
      // is the literal bypass — it changes nothing downstream.
      description = typeof next === 'string' ? next : '';
    },

    getVersions(): StackVersions {
      return { ...versions };
    },

    setVersions(next: StackVersions): void {
      // Concrete pins only (resolve "latest" before this). versionTokens asserts
      // concreteness at generation, so a "latest" here surfaces as an error, not
      // a silent resolve-at-generate (ADR-003).
      versions = { ...next };
    },

    getSlots(): SlotDecl[] {
      // A copy (each decl too) so callers cannot mutate state. Declared order is
      // preserved — it is part of the deterministic contract (slots render in order).
      return slots.map((s) => ({ id: s.id, type: s.type }));
    },

    setSlots(next: SlotDecl[]): void {
      // Structural declarations only ({ id, type }). Empty [] is the literal bypass.
      // Slot CONTENT lives in the SEPARATE content layer — never here (never in the
      // blueprint the shell reads), so the shell is content-invariant by construction.
      slots = next.map((s) => ({ id: s.id, type: s.type }));
    },

    getDesignTokens(): DesignTokens {
      // A copy (each token too) so callers cannot mutate state. The keys canonicalise
      // (sorted) at emit, so input order never leaks into output.
      const copy: DesignTokens = {};
      for (const k of Object.keys(designTokens)) copy[k] = { type: designTokens[k].type, value: designTokens[k].value };
      return copy;
    },

    setDesignTokens(next: DesignTokens): void {
      // The normalized tokens from the ingestion core. Empty {} is the literal bypass
      // (buildFileSet emits no design-tokens.json). Round-trip deterministic (canonical emit).
      const copy: DesignTokens = {};
      for (const k of Object.keys(next)) copy[k] = { type: next[k].type, value: next[k].value };
      designTokens = copy;
    },

    getCicd(): CiConfig {
      // A copy so callers cannot mutate state. Default { provider: 'none' } is the
      // literal bypass (buildFileSet emits no workflow).
      return { provider: cicd.provider };
    },

    setCicd(next: CiConfig): void {
      // A post-setup deterministic choice. 'none' is the literal bypass; a declared
      // provider ⇒ buildFileSet emits a deterministic workflow (pinned actions + the pin).
      cicd = { provider: next.provider };
    },

    getState(): ProjectState {
      return {
        phaseA: this.getPhaseASettings(),
        entities: this.getEntities(),
        defaultsApplied: this.getDefaultsApplied(),
        style: this.getStyle(),
        integrations: this.getIntegrations(),
        description: this.getDescription(),
        versions: this.getVersions(),
        slots: this.getSlots(),
        designTokens: this.getDesignTokens(),
        cicd: this.getCicd(),
      };
    },
  };
}

/**
 * A saved snapshot of a Project Model — exactly what getState() returns, which
 * is plain JSON-serialisable data. This is what Step 5 versions.
 */
export type ProjectSnapshot = ProjectState;

/**
 * Rebuild a Project Model from a previously saved snapshot. The restored model
 * reports the SAME phaseA / entities / defaultsApplied as the snapshot, so
 * generating from it reproduces that version's output byte-for-byte (ADR-003).
 * No re-derivation of defaults — the snapshot already holds the resolved state.
 */
export function restoreProjectModel(state: ProjectSnapshot): ProjectModel {
  const phaseA: Record<string, unknown> = {};
  const snapshotPhaseA = state.phaseA as unknown as Record<string, unknown>;
  for (const key of PHASE_A_KEYS) {
    if (snapshotPhaseA[key] !== undefined) phaseA[key] = snapshotPhaseA[key];
  }
  // Defensive default (Day 15): projectType is mandatory and present in every
  // real snapshot as 'Web App', so this is a no-op for them — it only guards a
  // hand-edited snapshot missing the field, keeping old versions byte-for-byte.
  if (phaseA.projectType === undefined) phaseA.projectType = 'Web App';
  const entities: Entity[] = state.entities.map((e) => ({
    name: e.name,
    fields: e.fields.map((f) => ({ ...f })),
    relationships: [...e.relationships],
    validation: e.validation,
  }));
  const defaultsApplied: DefaultApplied[] = state.defaultsApplied.map((d) => ({ ...d }));
  // Older snapshots predate the style engine — default to the no-op style so they
  // still regenerate byte-for-byte (ADR-003). Snapshots that predate the naming
  // option (Day 12) or the architecture-depth option (Day 13) carry `formatting`
  // but not the newer members; default each to 'default' so those versions also
  // regenerate byte-for-byte.
  const style: CodingStyle = state.style
    ? {
        formatting: state.style.formatting ?? defaultCodingStyle.formatting,
        namingConvention: state.style.namingConvention ?? 'default',
        architectureDepth: state.style.architectureDepth ?? 'default',
      }
    : defaultCodingStyle;
  // Snapshots that predate integrations (Day 17) have no `integrations` — default
  // to none so those versions regenerate byte-for-byte (ADR-003). Snapshots that
  // predate the AI hook (Day 18) carry `email` but not `ai`; default `ai` to
  // 'none' so those versions also regenerate byte-for-byte.
  const integrations: Integrations = state.integrations
    ? { email: state.integrations.email ?? 'none', ai: state.integrations.ai ?? 'none' }
    : defaultIntegrations;
  // Snapshots that predate the description (Day 19) have no `description` — default
  // to '' so those versions regenerate byte-for-byte (ADR-003).
  const description: string = typeof state.description === 'string' ? state.description : '';
  // Snapshots that predate versions (Day 11) have no `versions` — default to the
  // current-implied pins for the backend so those versions regenerate byte-for-byte
  // (ADR-003). A snapshot that carries versions uses them verbatim (concrete pins).
  const versions: StackVersions =
    state.versions && Object.keys(state.versions).length > 0
      ? { ...state.versions }
      : defaultVersionsFor(phaseA.backend as string);
  // Snapshots that predate slots (Day 21) have no `slots` — default to [] so those
  // versions regenerate byte-for-byte (ADR-003). Declarations are structural; content
  // is a separate layer and was never part of the snapshot.
  const slots: SlotDecl[] = Array.isArray(state.slots)
    ? state.slots.map((s) => ({ id: s.id, type: s.type }))
    : [];
  // Snapshots that predate Figma tokens (Day 31) have no `designTokens` — default to {} so
  // those versions regenerate byte-for-byte (ADR-003). Non-empty ⇒ used verbatim (canonical).
  const designTokens: DesignTokens = state.designTokens && typeof state.designTokens === 'object'
    ? Object.fromEntries(Object.keys(state.designTokens).map((k) => [k, { type: state.designTokens[k].type, value: state.designTokens[k].value }]))
    : {};
  // Snapshots that predate CI/CD (Day 38) have no `cicd` — default to { provider: 'none' }
  // so those versions regenerate byte-for-byte (ADR-003). A declared provider is used verbatim.
  const cicd: CiConfig = state.cicd && typeof state.cicd === 'object' && typeof state.cicd.provider === 'string'
    ? { provider: state.cicd.provider }
    : defaultCiConfig;
  return makeModel(phaseA, entities, defaultsApplied, style, integrations, description, versions, slots, designTokens, cicd);
}
