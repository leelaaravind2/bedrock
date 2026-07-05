/*
 * Thraksha — Framework + language VERSIONS as a first-class pinned input (Eco-Day 11).
 *
 * The most important structural input: it drives build files, Dockerfile base images
 * and dependency declarations. Versions are made EXPLICIT and PINNED in the blueprint
 * WITHOUT changing a single default output byte — the DEFAULT pin for each stack is
 * exactly the version today's output already implies, so the default path is a LITERAL
 * BYPASS that reproduces the frozen 43+10+MAXIMAL byte-for-byte (ADR-003). A non-default
 * version produces its own new twice-identical baseline (additive).
 *
 * Mechanism = the SAME token substitution the database provider already uses for DB
 * versions (`__DB_IMAGE__`, …): each version-bearing template spot becomes a UNIQUE
 * token (`__JAVA_VERSION__`, …) fed from the pinned value. No native dep; pure Node.
 *
 * "latest" is RESOLVE-THEN-PIN: a resolution step (outside generation) turns "latest"
 * into a concrete pin written into the blueprint; generation only ever sees concrete
 * versions and ASSERTS that (never a resolve-at-generate — that would break determinism).
 */

/** The effective, CONCRETE versions for a stack (a plain, JSON-serialisable map). */
export type StackVersions = Record<string, string>;

/**
 * The DEFAULT pin per backend = the version the current output ALREADY implies
 * (read from the real templates, Eco-Day 11 §1). Changing a value here is a
 * deliberate re-baseline; the default MUST equal the current template value or the
 * literal bypass breaks.
 */
export const DEFAULT_VERSIONS: Record<string, StackVersions> = {
  'Spring Boot': { java: '21', springBoot: '3.3.5', node: '22' },
  Express: { node: '22', express: '4.21.2' },
  FastAPI: { python: '3.12', fastapi: '0.115.6' },
  Django: { python: '3.12', django: '5.1.4' },
  Go: { go: '1.22' },
};

/** version key → the UNIQUE template token it feeds. Explicit (no name mangling). */
const VERSION_TOKEN_NAMES: Record<string, string> = {
  java: '__JAVA_VERSION__',
  springBoot: '__SPRING_BOOT_VERSION__',
  node: '__NODE_VERSION__',
  express: '__EXPRESS_VERSION__',
  python: '__PYTHON_VERSION__',
  fastapi: '__FASTAPI_VERSION__',
  django: '__DJANGO_VERSION__',
  go: '__GO_VERSION__',
};

/** The default (current-implied) versions for a backend. Empty for an unknown one. */
export function defaultVersionsFor(backend: string): StackVersions {
  return { ...(DEFAULT_VERSIONS[backend] ?? {}) };
}

/** Concrete = a real pinned version string (starts with a digit), never "latest"/"lts". */
export function isConcreteVersion(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9]/.test(v);
}

/**
 * RESOLVE-THEN-PIN. Turn a (possibly "latest"/partial) request into a CONCRETE pin
 * set, keyed off the backend's defaults. Any real catalog/network lookup for "latest"
 * belongs HERE (outside generation); for Eco-Day 11 "latest"/absent resolves to the
 * current-implied default — the load-bearing thing is the CONTRACT, not the catalog.
 * The result is what gets written into the blueprint before generation.
 */
export function resolveVersions(backend: string, requested?: Partial<StackVersions>): StackVersions {
  const defaults = defaultVersionsFor(backend);
  const out: StackVersions = {};
  for (const key of Object.keys(defaults)) {
    const req = requested?.[key];
    // "latest"/"lts"/absent → the resolved (default) pin; a concrete request → itself.
    out[key] = isConcreteVersion(req) ? (req as string) : defaults[key];
  }
  return out;
}

/**
 * The token map for a stack's versions. ASSERTS concreteness — a "latest" (or any
 * non-concrete value) reaching generation is an ERROR, not a silent lookup
 * (resolve-then-pin, never resolve-at-generate).
 */
export function versionTokens(versions: StackVersions): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(versions)) {
    const token = VERSION_TOKEN_NAMES[key];
    if (!token) continue; // unknown key: no template token consumes it — ignore
    if (!isConcreteVersion(value)) {
      throw new Error(
        `Version "${key}" is not concrete ("${value}"). Resolve "latest"/pins BEFORE generation ` +
          `(resolve-then-pin) — generation never resolves versions (ADR-003).`,
      );
    }
    tokens[token] = value;
  }
  return tokens;
}
