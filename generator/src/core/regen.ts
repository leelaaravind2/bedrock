/*
 * Thraksha — Generation engine (technology-agnostic core).
 *
 * This is kernel code: it knows the Project Model, the file-separation rule
 * (ADR-002), the preview, and the deterministic write phase — and NOTHING about
 * Java, Spring, JPA, SQL, React, or any other technology (Constitution Law 25).
 * All technology specifics come from a BackendPlugin (Laws 26–28): the core
 * asks the plugin for the project shell and for each entity's files, then runs
 * its agnostic plan/preview/apply over the resulting GeneratedFile records.
 *
 * BINDING RULES honoured here:
 *   ADR-002  Developer-owned files are NEVER overwritten. classify() marks an
 *            existing developer file "untouched" and applyPlan() never opens it.
 *   ADR-003  Deterministic: sorted ordering, no timestamps / randomness. The
 *            plugin owns content determinism; the core owns ordering/skips.
 *   ADR-004  Field defaults are shown — the manifest renders the plugin's notes.
 *   Law 13   Every preview line states the reason it is created/changed/skipped.
 *   Law 39   Identical Thraksha files are skipped (incremental, not rewritten).
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ProjectModel } from './project-model.js';
import type { BackendPlugin, GeneratedFile } from './plugin.js';
import { activeIntegrationLines } from './integrations.js';
import { renderSlotsSection } from './slots.js';
import { canonicalTokens, hasTokens } from '../figma/figma-ingest.js';
import { renderCiWorkflow } from './cicd.js';

// ---------------------------------------------------------------------------
// The manifest (traceability, Law 12). Composed from agnostic model data plus
// the plugin's per-entity default notes — the core renders, it does not invent.
// ---------------------------------------------------------------------------
function buildManifest(model: ProjectModel, files: GeneratedFile[], plugin: BackendPlugin): string {
  const inputs = model.getPhaseASettings();
  const entities = model.getEntities();
  // Day 17: the ACTIVE integrations (gated) — [] when none, so the manifest is
  // byte-identical for the default and the 20-hash backstop stays frozen.
  const integrationLines = activeIntegrationLines(model.getIntegrations());

  const fileLines = [...files]
    .sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0))
    .map((f) => `  [${f.ownership === 'thraksha' ? 'T' : 'D'}] ${f.relPath}`);

  const defaultsApplied = model
    .getDefaultsApplied()
    .map((d) => `  - ${d.setting} = ${String(d.value)} — ${d.reason}`)
    .join('\n');

  const entitySections = entities.map((e) => {
    const ownerScoped = inputs.multiUser === true ? 'yes' : 'no';
    const fieldLines = plugin.describeEntityDefaults(e).map((l) => `      - ${l}`);
    return [`  ${e.name} (owner-scoped: ${ownerScoped})`, `    fields:`, ...fieldLines].join('\n');
  });

  return [
    `Thraksha — Generation Manifest`,
    `==============================`,
    ``,
    `Project (Phase A):`,
    ...Object.entries(inputs).map(([k, v]) => `  - ${k}: ${v}`),
    ``,
    `Phase-A defaults applied (ADR-004 — shown, not silent):`,
    defaultsApplied.length > 0 ? defaultsApplied : `  (none)`,
    ``,
    // GATED (Day 17): only rendered when an integration is active. For the default
    // (none) this spreads nothing → the manifest is byte-identical (backstop).
    ...(integrationLines.length > 0 ? ['Integrations (ADR-004 — shown):', ...integrationLines, ``] : []),
    `Entities (${entities.length}):`,
    entitySections.length > 0 ? entitySections.join('\n\n') : `  (none)`,
    ``,
    `Generated files (${files.length}) — [T] Thraksha-owned (regenerated), [D] developer-owned (created once):`,
    ...fileLines,
    ``,
  ].join('\n');
}

/**
 * The complete set of files a regeneration would write for this model: the
 * plugin's project shell + each entity's files + the generation manifest. Pure
 * (no writes). The core drives the entity loop; the plugin renders the content.
 */
export async function buildFileSet(model: ProjectModel, plugin: BackendPlugin): Promise<GeneratedFile[]> {
  const inputs = model.getPhaseASettings();
  const style = model.getStyle();
  const files: GeneratedFile[] = [];

  // 1) Project shell (technology-specific content, but the core only sees files).
  files.push(...(await plugin.generateProjectShell(model)));

  // 1a) Project description (Day 19). A NEUTRAL post-process: the user's optional
  //     description is inserted as a paragraph under the README's H1 title. This is
  //     technology-agnostic (README.md is a universal convention; the insert is the
  //     same for every stack — Law 25 is honoured, no per-stack logic). BLANK is a
  //     literal bypass: nothing is touched, so the README — and the 20-hash backstop
  //     — stay byte-identical. A provided description is a legitimate sibling output.
  const description = model.getDescription().trim();
  if (description) {
    const readme = files.find((f) => f.relPath === 'README.md');
    if (readme) {
      const nl = readme.content.indexOf('\n');
      if (nl !== -1) {
        readme.content =
          readme.content.slice(0, nl + 1) + '\n' + description + '\n' + readme.content.slice(nl + 1);
      }
    }
  }

  // 1b) Content SLOTS (Day 21). The STRUCTURAL half of the creative mechanism: a
  //     clearly-marked, INERT markdown section of TYPED placeholders is APPENDED to the
  //     README, one per DECLARED slot (via the type→component map + UnknownSection). This
  //     is a NEUTRAL post-process (README is universal — Law 25 honoured, no per-stack
  //     logic). NO slots declared ⇒ renderSlotsSection returns '' ⇒ a literal bypass: the
  //     README — and the frozen backstop — stay byte-identical. Crucially, the placeholder
  //     depends ONLY on the DECLARATION, never on slot CONTENT (which lives in the separate
  //     slot-content.ts layer that buildFileSet never imports) — so the shell is byte-
  //     identical across empty/partial/full content states BY CONSTRUCTION. No AI (ADR-001).
  const slotsSection = renderSlotsSection(model.getSlots());
  if (slotsSection) {
    const readme = files.find((f) => f.relPath === 'README.md');
    if (readme) readme.content = readme.content.replace(/\s*$/, '\n') + slotsSection;
  }

  // 1c) Figma DESIGN TOKENS (Day 31 — the Phase-3 input surface). When a project ingested
  //     Figma tokens, a canonical `design-tokens.json` artifact is emitted (root, agnostic —
  //     Law 25 honoured). NO tokens (the default {}) ⇒ hasTokens is false ⇒ nothing is pushed
  //     ⇒ a literal bypass: the shell + the frozen backstop stay byte-identical. The tokens
  //     came from the PURE ingestion core (Figma export → canonical DesignTokens); no Figma
  //     runtime and no AI touch generation (ADR-001). Round-trip deterministic: same tokens →
  //     byte-identical artifact (canonicalTokens sorts keys).
  const designTokens = model.getDesignTokens();
  if (hasTokens(designTokens)) {
    files.push({ relPath: 'design-tokens.json', content: canonicalTokens(designTokens), ownership: 'thraksha' });
  }

  // 2) One entity at a time, in model order (V-numbering etc. is the plugin's job).
  model.getEntities().forEach((entity, index) => {
    files.push(
      ...plugin.generateEntity(entity, {
        index,
        multiUser: inputs.multiUser === true,
        projectName: inputs.projectName,
        projectType: inputs.projectType,
        style,
      }),
    );
  });

  // 2a) CI/CD workflow (Day 38 — a deterministic, gated artifact). When a provider is
  //     declared, a `.github/workflows/ci.yml` is emitted: the core renders the provider
  //     YAML shape + a FIXED pinned-action table (core/cicd.ts) from the plugin's NEUTRAL
  //     ciProfile() facts + the blueprint version pins — so the pipeline runtime == the
  //     Day-11 pin BY CONSTRUCTION and every action ref is pinned (never floating). The
  //     DEFAULT ({ provider: 'none' }) ⇒ renderCiWorkflow returns null ⇒ nothing is pushed
  //     ⇒ a literal bypass: the shell + the frozen backstop stay byte-identical. No timestamp,
  //     no matrix, no secrets (deploy is a placeholder). Placed BEFORE the manifest so the
  //     manifest lists it. Law 25: the core owns the CI format; the plugin owns the commands.
  const ciFile = renderCiWorkflow(model.getCicd(), plugin.ciProfile?.(), model.getVersions());
  if (ciFile) {
    files.push({ relPath: ciFile.relPath, content: ciFile.content, ownership: 'thraksha' });
  }

  // 3) The manifest lists every OTHER file; build it before appending itself.
  const manifest = buildManifest(model, files, plugin);
  files.push({ relPath: 'GENERATION-MANIFEST.txt', content: manifest, ownership: 'thraksha' });

  // 4) Coding-style FORMATTING (ADR-003 deterministic switch): a post-generation
  //    pass the plugin owns. The default style is a no-op, so default output is
  //    byte-for-byte identical to before the style engine existed (the backstop).
  return plugin.formatFiles ? plugin.formatFiles(files, style) : files;
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// The plan (dry run): classify every planned file against the current project.
// ---------------------------------------------------------------------------

export type FileAction =
  | 'create' // Thraksha file that does not exist yet
  | 'change' // Thraksha file whose content differs and will be rewritten
  | 'unchanged' // Thraksha file already identical — skipped (Law 39)
  | 'create-once' // developer file that does not exist yet — created once, then never touched
  | 'untouched'; // developer file that exists — NEVER overwritten (ADR-002)

export interface PlanEntry {
  relPath: string;
  ownership: 'thraksha' | 'developer';
  action: FileAction;
  reason: string;
}

export interface RegenPlan {
  entries: PlanEntry[];
  create: string[];
  change: string[];
  unchanged: string[];
  developerCreate: string[];
  developerUntouched: string[];
}

async function bytesEqual(dest: string, content: string): Promise<boolean> {
  const disk = await fs.readFile(dest);
  return Buffer.compare(disk, Buffer.from(content, 'utf8')) === 0;
}

/**
 * Decide what would happen to a single file — the SINGLE source of truth used
 * by both the preview (computePlan) and the write (applyPlan), so they cannot
 * disagree. Reads disk; writes nothing.
 */
async function classify(projectDir: string, f: GeneratedFile): Promise<PlanEntry> {
  const dest = path.join(projectDir, f.relPath);
  const exists = await pathExists(dest);

  if (f.ownership === 'developer') {
    return exists
      ? { relPath: f.relPath, ownership: 'developer', action: 'untouched', reason: 'developer-owned file exists — will NOT be touched (ADR-002, your file is safe)' }
      : { relPath: f.relPath, ownership: 'developer', action: 'create-once', reason: 'developer-owned file does not exist — created once, then never regenerated' };
  }

  if (!exists) {
    return { relPath: f.relPath, ownership: 'thraksha', action: 'create', reason: 'new generated file — does not exist yet' };
  }
  if (await bytesEqual(dest, f.content)) {
    return { relPath: f.relPath, ownership: 'thraksha', action: 'unchanged', reason: 'generated content identical — will be skipped' };
  }
  return { relPath: f.relPath, ownership: 'thraksha', action: 'change', reason: 'generated content differs — will be rewritten' };
}

/** Compute the regeneration plan. Reads the current project; writes nothing. */
export async function computePlan(projectDir: string, files: GeneratedFile[]): Promise<RegenPlan> {
  const sorted = [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  const entries: PlanEntry[] = [];
  for (const f of sorted) entries.push(await classify(projectDir, f));

  const pick = (a: FileAction) => entries.filter((e) => e.action === a).map((e) => e.relPath);
  return {
    entries,
    create: pick('create'),
    change: pick('change'),
    unchanged: pick('unchanged'),
    developerCreate: pick('create-once'),
    developerUntouched: pick('untouched'),
  };
}

/** Render the preview a developer reads before confirming. Pure formatting. */
export function renderPreview(projectName: string, plan: RegenPlan): string {
  const out: string[] = [];
  out.push(`Regeneration preview for ${projectName}`);
  out.push(`${'='.repeat(`Regeneration preview for ${projectName}`.length)}`);
  out.push(`(dry run — nothing has been written yet)`);
  out.push(``);

  out.push(`Thraksha-owned files (the platform regenerates these):`);
  if (plan.create.length === 0 && plan.change.length === 0 && plan.unchanged.length === 0) {
    out.push(`  (none)`);
  }
  for (const e of plan.entries.filter((x) => x.action === 'create')) out.push(`  CREATE     ${e.relPath}   — ${e.reason}`);
  for (const e of plan.entries.filter((x) => x.action === 'change')) out.push(`  CHANGE     ${e.relPath}   — ${e.reason}`);
  for (const e of plan.entries.filter((x) => x.action === 'unchanged')) out.push(`  unchanged  ${e.relPath}   — ${e.reason}`);
  out.push(``);

  out.push(`Developer-owned files (YOUR files — never overwritten, ADR-002):`);
  if (plan.developerCreate.length === 0 && plan.developerUntouched.length === 0) {
    out.push(`  (none)`);
  }
  for (const e of plan.entries.filter((x) => x.action === 'untouched')) out.push(`  SAFE       ${e.relPath}   — ${e.reason}`);
  for (const e of plan.entries.filter((x) => x.action === 'create-once')) out.push(`  new        ${e.relPath}   — ${e.reason}`);
  out.push(``);

  const rewritten = plan.create.length + plan.change.length;
  out.push(`Summary:`);
  out.push(
    `  ${rewritten} generated file(s) will be written ` +
      `(${plan.create.length} new, ${plan.change.length} changed); ` +
      `${plan.unchanged.length} unchanged and skipped.`,
  );
  out.push(
    `  ${plan.developerUntouched.length} of your file(s) will NOT be touched` +
      (plan.developerCreate.length > 0 ? `; ${plan.developerCreate.length} created once (then never touched again).` : `.`),
  );
  out.push(`  Your files are safe.`);
  return out.join('\n');
}

export interface ApplyOutcome {
  created: string[];
  changed: string[];
  unchanged: string[];
  developerCreated: string[];
  developerUntouched: string[];
}

/**
 * Apply the regeneration. Uses the SAME classify() the preview used, so the
 * actions taken match the plan exactly. Developer files are re-checked at write
 * time and never overwritten (ADR-002 is absolute, even against drift).
 */
export async function applyPlan(projectDir: string, files: GeneratedFile[]): Promise<ApplyOutcome> {
  const outcome: ApplyOutcome = { created: [], changed: [], unchanged: [], developerCreated: [], developerUntouched: [] };
  const sorted = [...files].sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
  for (const f of sorted) {
    const dest = path.join(projectDir, f.relPath);
    const entry = await classify(projectDir, f);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    switch (entry.action) {
      case 'create':
        await fs.writeFile(dest, f.content);
        outcome.created.push(f.relPath);
        break;
      case 'change':
        await fs.writeFile(dest, f.content);
        outcome.changed.push(f.relPath);
        break;
      case 'unchanged':
        outcome.unchanged.push(f.relPath); // skipped — already identical (Law 39)
        break;
      case 'create-once':
        await fs.writeFile(dest, f.content);
        outcome.developerCreated.push(f.relPath);
        break;
      case 'untouched':
        outcome.developerUntouched.push(f.relPath); // never opened (ADR-002)
        break;
    }
  }
  return outcome;
}
