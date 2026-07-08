/*
 * Thraksha — Minimal UI server (Step 6).
 *
 * A THIN front end over the existing engine. This server contains NO generation,
 * preview, or versioning logic of its own — every endpoint just calls the
 * modules built in Steps 2–5 and returns their result. The browser UI
 * (ui/index.html) is plain HTML + fetch; this server wires its buttons to the
 * real functions:
 *
 *   UI action            -> engine function (unchanged)
 *   ------------------------------------------------------------------
 *   Set project settings -> createProjectModel()            (project-model.ts)
 *   Load DemoApp example -> buildDemoAppModel()             (demoapp-model.ts)
 *   Add entity           -> model.addEntity() + describeEntityDefaults()
 *   See preview          -> buildFileSet() + computePlan() + renderPreview() (regen.ts)
 *   Confirm & generate   -> applyPlan()                     (regen.ts)
 *   Save version         -> VersionStore.saveVersion()      (versioning.ts)
 *   List versions        -> VersionStore.listVersions()     (versioning.ts)
 *   Roll back            -> VersionStore.rollback()         (versioning.ts)
 *
 * No AI (ADR-001). No randomness/timestamps in the generation path (ADR-003) —
 * the server only passes data through; the engine remains the single source of
 * determinism. Built-in node:http only — no web framework dependency.
 *
 * Build:  npm run build
 * Run:    npm run ui    (then open http://localhost:4317)
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createProjectModel,
  type ProjectModel,
  type PhaseASettingsInput,
  type EntitySpec,
} from './core/project-model.js';
import { defaultCodingStyle, type CodingStyle } from './core/style.js';
import { defaultIntegrations, type Integrations } from './core/integrations.js';
import { buildDemoAppModel } from './demoapp-model.js';
import { buildTeamTrackerModel } from './teamtracker-model.js';
import { buildFileSet, computePlan, renderPreview, applyPlan } from './core/regen.js';
import { previewImpact, renderImpact } from './map/impact-map.js';
import { VersionStore } from './core/versioning.js';
import { selectBackendPlugin } from './plugins/registry.js';
import type { BackendPlugin } from './core/plugin.js';
import { assembleBlueprint, type BlueprintChoices } from './core/assemble.js';
import { applyProfile, fullOptionSet, type OrgProfile } from './core/org-profile.js';
import { DEFAULT_VERSIONS } from './core/versions.js';
import { runLiveDetection } from './detect/probe.js';
import { fillViaEnv } from './fill/fill-ai.js';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../generator/dist
const GENERATOR_DIR = path.join(HERE, '..');
const REPO_ROOT = path.join(GENERATOR_DIR, '..');
const UI_DIR = path.join(GENERATOR_DIR, 'ui');

// Where generated projects and version snapshots go. Overridable so the UI can
// run without touching the canonical output. Paths are relative-hashed, so the
// generated hash is identical wherever it is written.
const OUTPUT_ROOT = process.env.THRAKSHA_UI_OUTPUT || path.join(REPO_ROOT, 'output');
const STORE_ROOT = process.env.THRAKSHA_UI_STORE || path.join(REPO_ROOT, '.thraksha', 'versions');
const PORT = Number(process.env.PORT || 4317);

// The org-profile file (Day 13). ABSENT = no profile ⇒ the FULL option set + existing
// defaults ⇒ the wizard's simple-mode path is the literal bypass. Set THRAKSHA_ORG_PROFILE
// to a canonical org-profile.json to govern the choices the wizard presents. The profile
// is WIZARD-SIDE only — it shapes /api/options, never /api/assemble (never generation).
const ORG_PROFILE_FILE = process.env.THRAKSHA_ORG_PROFILE || '';

/** Load the org-profile if configured and readable; ABSENT/unreadable ⇒ null (no profile). */
async function loadOrgProfile(): Promise<OrgProfile | null> {
  if (!ORG_PROFILE_FILE) return null;
  try {
    return JSON.parse(await fs.readFile(ORG_PROFILE_FILE, 'utf8')) as OrgProfile;
  } catch {
    return null; // a missing/malformed profile falls back to no-profile (the literal bypass)
  }
}

// ---------------------------------------------------------------------------
// In-memory session state: the one Project Model the person is editing.
// ---------------------------------------------------------------------------
let model: ProjectModel | null = null;

function requireModel(): ProjectModel {
  if (!model) throw new HttpError(400, 'No project yet — set the project settings first.');
  return model;
}
function projectName(): string {
  return requireModel().getSetting('projectName');
}
function projectDir(): string {
  return path.join(OUTPUT_ROOT, projectName());
}
function versionStore(): VersionStore {
  return new VersionStore(path.join(STORE_ROOT, projectName()));
}
/** Pick the backend plugin the current model's `backend` answer asks for. */
function currentPlugin(): BackendPlugin {
  return selectBackendPlugin(requireModel());
}

class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Small HTTP helpers (no framework).
// ---------------------------------------------------------------------------
function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
async function readJson<T>(req: http.IncomingMessage): Promise<T> {
  const body = await readBody(req);
  return (body ? JSON.parse(body) : {}) as T;
}
function sendJson(res: http.ServerResponse, status: number, obj: unknown): void {
  const payload = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(payload);
}

// ---------------------------------------------------------------------------
// Read-only file viewer helpers.
//
// These only READ the already-generated project on disk — they never write,
// generate, or delete. They do not touch the engine, so generation output (and
// its hashes) is entirely unaffected.
// ---------------------------------------------------------------------------

/** One node in the generated-project file tree (folders hold children). */
interface FileNode {
  name: string;
  /** Path relative to the project root, forward-slashed. '' for the root. */
  relPath: string;
  type: 'dir' | 'file';
  children?: FileNode[];
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build a sorted (folders first, then files; alphabetical) tree of the generated
 * project. Reads directory entries only — never file contents, never writes.
 */
async function buildFileTree(dir: string, rel = ''): Promise<FileNode[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => {
    const ad = a.isDirectory() ? 0 : 1;
    const bd = b.isDirectory() ? 0 : 1;
    if (ad !== bd) return ad - bd; // folders before files
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
  const nodes: FileNode[] = [];
  for (const e of entries) {
    const childRel = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      nodes.push({ name: e.name, relPath: childRel, type: 'dir', children: await buildFileTree(path.join(dir, e.name), childRel) });
    } else {
      nodes.push({ name: e.name, relPath: childRel, type: 'file' });
    }
  }
  return nodes;
}

/**
 * Resolve a viewer-supplied relative path to an absolute path INSIDE the project
 * directory, rejecting anything that escapes it (path-traversal guard). Read-only
 * callers use this before opening a file.
 */
function safeResolveInProject(relPath: string): string {
  const root = path.resolve(projectDir());
  const abs = path.resolve(root, relPath);
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new HttpError(400, 'Path is outside the generated project.');
  }
  return abs;
}

// ---------------------------------------------------------------------------
// Route handlers — each is a thin call into the engine.
// ---------------------------------------------------------------------------
function stateResponse(): unknown {
  if (!model) return { hasModel: false, state: null };
  return { hasModel: true, state: model.getState() };
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;

  // --- static UI ---
  if (route === 'GET /' || route === 'GET /index.html') {
    const html = await fs.readFile(path.join(UI_DIR, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // --- read current model ---
  if (route === 'GET /api/state') {
    sendJson(res, 200, stateResponse());
    return;
  }

  // --- the option set the wizard presents (Day 16, surfaces Day 11 + Day 13) ---
  //     Org-profile runs FIRST: applyProfile(fullOptionSet(), profile) → the filtered
  //     optionSet + forced defaults + soft-rule advisories. Profile-ABSENT ⇒ the full
  //     set + existing defaults + no advisories (so simple-mode is the literal bypass).
  //     Also returns DEFAULT_VERSIONS (the framework+version pins, Day 11) so the wizard
  //     can offer per-backend version keys defaulted to the current pin. This is PURE
  //     INPUT METADATA — enforcement stays wizard-side, never in the blueprint/output.
  //     (Distinct from the /api/versions/* SNAPSHOT store — a deliberate naming split.)
  if (route === 'GET /api/options') {
    const profile = await loadOrgProfile();
    const applied = applyProfile(fullOptionSet(), profile);
    sendJson(res, 200, {
      optionSet: applied.optionSet,
      defaults: applied.defaults,
      advisories: applied.advisories,
      defaultVersions: DEFAULT_VERSIONS,
      profileId: profile ? profile.id : null,
    });
    return;
  }

  // --- the ONE canonical assembly path (Day 16): choices → assembleBlueprint → model ---
  //     The progressive-disclosure wizard collects a full BlueprintChoices (concrete
  //     values only — the profile already resolved its forced defaults into the picks)
  //     and POSTs it here in one shot. The server calls the SAME assembleBlueprint the
  //     CLI/demos feed, so UI==CLI is STRUCTURAL: same choices → same ProjectState →
  //     byte-identical output. No UI-injected value or ordering; no profile metadata.
  if (route === 'POST /api/assemble') {
    const choices = await readJson<BlueprintChoices>(req);
    model = assembleBlueprint(choices); // canonical, pure — identical to the CLI path
    sendJson(res, 200, { state: model.getState(), defaultsApplied: model.getDefaultsApplied() });
    return;
  }

  // --- toolchain detect-and-guide (Day 18): the impure probe EDGE ---
  //     Probes THIS machine for the toolchains the current blueprint needs, compares
  //     against its Day-11 pins, and returns present/missing/mismatch + install links +
  //     the container-build offer. This is a DETECTION layer: it reads the environment
  //     and INFORMS — its result has NO write-path back to the blueprint (it never
  //     touches assembleBlueprint/buildFileSet), so no machine-specific value can inject
  //     nondeterminism into generation. Determinism ≠ validity: it reports whether the
  //     machine CAN build the deterministically-generated project, never that it WILL.
  if (route === 'GET /api/detect') {
    const report = await runLiveDetection(requireModel().getState());
    sendJson(res, 200, report);
    return;
  }

  // --- creative slot FILL (Day 23): the optional, detachable, developer-keyed AI fill ---
  //     Generation ALWAYS runs first (the shell + empty slots — the Day-21 mechanism). This
  //     opt-in POST-step asks the developer's OWN model (env key, read only by the impure
  //     edge) to fill the SEPARATE SlotContent layer — it writes ONLY content, NEVER the
  //     shell/structure/templates. DEFAULT OFF (structural): no THRAKSHA_AI_FILL_KEY ⇒ no
  //     filler is built and NO AI call is made (enabled:false, empty content). Delete this
  //     layer / unset the key ⇒ generation is unchanged (Law 21, creative path). The result
  //     is SHOWN to the developer; it has no write-path back into the blueprint or output.
  if (route === 'GET /api/fill-slots') {
    const m = requireModel();
    const attempt = await fillViaEnv(m.getState(), m.getSlots());
    sendJson(res, 200, attempt);
    return;
  }

  // --- Phase-A settings -> createProjectModel() ---
  if (route === 'POST /api/settings') {
    const body = await readJson<PhaseASettingsInput & { description?: string }>(req);
    model = createProjectModel(body); // engine: validates mandatory, applies+records defaults
    // Day 19: description is a NEUTRAL, OPTIONAL value — NOT a Phase-A key. It is
    // set separately (createProjectModel never sees it as a setting), so it stays
    // out of the Phase-A render. Blank ⇒ a literal bypass (README byte-identical).
    if (typeof body.description === 'string') model.setDescription(body.description);
    sendJson(res, 200, { state: model.getState(), defaultsApplied: model.getDefaultsApplied() });
    return;
  }

  // --- coding style -> model.setStyle() (Day 14). A NEUTRAL pass-through: the
  //     server fills any omitted member from defaultCodingStyle (so a partial
  //     client cannot break determinism) and hands the opaque structured value to
  //     the model. It NEVER inspects the values — it does not know what 'simple'
  //     means or which stack supports it (Law 25). Style flows into generation
  //     because buildFileSet reads model.getStyle(); no generation logic here. ---
  if (route === 'POST /api/style') {
    const body = await readJson<Partial<CodingStyle>>(req);
    const merged: CodingStyle = {
      formatting: { indent: body.formatting?.indent ?? defaultCodingStyle.formatting.indent },
      namingConvention: body.namingConvention ?? defaultCodingStyle.namingConvention,
      architectureDepth: body.architectureDepth ?? defaultCodingStyle.architectureDepth,
    };
    requireModel().setStyle(merged); // opaque to the core; ADR-004 shown via getState()
    sendJson(res, 200, { state: model!.getState() });
    return;
  }

  // --- integrations -> model.setIntegrations() (Day 19). The SAME neutral
  //     pass-through as /api/style: the server fills any omitted member from
  //     defaultIntegrations (so a partial client cannot break determinism) and
  //     hands the opaque value to the model. It NEVER inspects the values — it
  //     does not know what 'smtp' or 'hook' wire (Law 25). Default {none,none} is
  //     a literal bypass, so the empty path stays byte-identical. This wires the
  //     EXISTING Days-17/18 integrations concept to the UI; it adds no integration. ---
  if (route === 'POST /api/integrations') {
    const body = await readJson<Partial<Integrations>>(req);
    const merged: Integrations = {
      email: body.email ?? defaultIntegrations.email,
      ai: body.ai ?? defaultIntegrations.ai,
    };
    requireModel().setIntegrations(merged); // opaque to the core; ADR-004 shown via getState()
    sendJson(res, 200, { state: model!.getState() });
    return;
  }

  // --- load a demo example model. Default (no param) = the canonical DemoApp
  //     (single Ticket) so existing behaviour is byte-identical; ?example=
  //     teamtracker loads the richer multi-entity example. Both just build a
  //     Project Model with the same public API — no engine logic here. ---
  if (route === 'POST /api/demoapp') {
    const example = url.searchParams.get('example');
    model = example === 'teamtracker' ? buildTeamTrackerModel() : buildDemoAppModel();
    sendJson(res, 200, { state: model.getState(), defaultsApplied: model.getDefaultsApplied() });
    return;
  }

  // --- add an entity -> model.addEntity() + describeEntityDefaults() ---
  if (route === 'POST /api/entities') {
    const spec = await readJson<EntitySpec>(req);
    const entity = requireModel().addEntity(spec); // engine: validates name+fields, applies field defaults
    sendJson(res, 200, { state: model!.getState(), addedDefaults: currentPlugin().describeEntityDefaults(entity) });
    return;
  }

  // --- preview (dry run) -> buildFileSet() + computePlan() + renderPreview() ---
  if (route === 'GET /api/preview') {
    const m = requireModel();
    const files = await buildFileSet(m, currentPlugin()); // engine
    const plan = await computePlan(projectDir(), files); // engine (writes nothing)
    sendJson(res, 200, {
      text: renderPreview(projectName(), plan), // engine — the real preview text
      plan: {
        create: plan.create,
        change: plan.change,
        unchanged: plan.unchanged,
        developerCreate: plan.developerCreate,
        developerUntouched: plan.developerUntouched,
      },
    });
    return;
  }

  // --- THE MAP: impact preview (Eco-Day 47) -> previewImpact(current, proposed) ---
  //     The Terraform-`plan` gate BEFORE generate: diff the LIVE model (current) against a
  //     PROPOSED blueprint (assembled the same way /api/assemble builds a model — the Day-16
  //     UI==CLI seam) → the EXACT { file, action, before, after } plan. READ-ONLY: writes
  //     nothing (additive — /api/preview and /api/generate are unchanged). Approving still
  //     goes through POST /api/generate (applyPlan). Truthful because generation is
  //     deterministic + proven byte-for-byte real by day20:regress PART 1w.
  if (route === 'POST /api/impact') {
    const current = requireModel();
    const proposed = assembleBlueprint(await readJson<BlueprintChoices>(req)); // the proposed model
    const plan = await previewImpact(current, proposed); // engine — pure, writes nothing
    sendJson(res, 200, {
      text: renderImpact(projectName(), plan),
      plan: { add: plan.add, change: plan.change, delete: plan.delete, noOp: plan.noOp, entries: plan.entries },
    });
    return;
  }

  // --- confirm & generate -> applyPlan() ---
  if (route === 'POST /api/generate') {
    const m = requireModel();
    const files = await buildFileSet(m, currentPlugin()); // engine
    const outcome = await applyPlan(projectDir(), files); // engine — same writes the preview predicted
    sendJson(res, 200, { outcome, projectDir: projectDir() });
    return;
  }

  // --- save version -> VersionStore.saveVersion() ---
  if (route === 'POST /api/versions/save') {
    const { note } = await readJson<{ note?: string }>(req);
    const ref = await versionStore().saveVersion(requireModel(), (note ?? '').trim() || '(no note)');
    sendJson(res, 200, ref);
    return;
  }

  // --- list versions -> VersionStore.listVersions() ---
  if (route === 'GET /api/versions') {
    if (!model) {
      sendJson(res, 200, { head: 0, versions: [] });
      return;
    }
    sendJson(res, 200, await versionStore().listVersions());
    return;
  }

  // --- roll back -> VersionStore.rollback(); refresh in-memory model ---
  if (route === 'POST /api/versions/rollback') {
    const { version } = await readJson<{ version: number }>(req);
    requireModel();
    const result = await versionStore().rollback(version, projectDir(), currentPlugin()); // engine
    model = await versionStore().getModel(version); // reflect the rolled-back model in the UI
    sendJson(res, 200, { result, state: model.getState() });
    return;
  }

  // --- file viewer: list files in the generated project (READ-ONLY) ---
  if (route === 'GET /api/files') {
    const dir = projectDir(); // requires a model (throws 400 otherwise)
    if (!(await pathExists(dir))) {
      sendJson(res, 200, { projectName: projectName(), generated: false, tree: [] });
      return;
    }
    sendJson(res, 200, { projectName: projectName(), generated: true, tree: await buildFileTree(dir) });
    return;
  }

  // --- file viewer: read ONE file's contents (READ-ONLY) ---
  if (route === 'GET /api/file') {
    const rel = url.searchParams.get('path') ?? '';
    if (!rel) throw new HttpError(400, 'Missing ?path=');
    const abs = safeResolveInProject(rel);
    const stat = await fs.stat(abs).catch(() => null);
    if (!stat || !stat.isFile()) throw new HttpError(404, `Not a file: ${rel}`);
    const content = await fs.readFile(abs, 'utf8'); // read only
    sendJson(res, 200, { path: rel, content });
    return;
  }

  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('Not found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err: unknown) => {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err);
    sendJson(res, status, { error: message }); // e.g. mandatory-missing blocks (ADR-004)
  });
});

server.listen(PORT, () => {
  process.stdout.write(`Thraksha UI on http://localhost:${PORT}\n`);
  process.stdout.write(`  output -> ${OUTPUT_ROOT}\n  versions -> ${STORE_ROOT}\n`);
});
