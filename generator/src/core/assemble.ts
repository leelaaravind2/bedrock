/*
 * Thraksha — the ONE canonical assembly path: choices → ProjectModel (Eco-Day 16).
 *
 * The progressive-disclosure wizard (server backend) AND the CLI/programmatic path
 * (the demo builders, the harness) both feed THIS function. That is what makes
 * UI==CLI STRUCTURAL, not coincidental: the same `BlueprintChoices` object flows
 * through the same `assembleBlueprint`, producing the same canonical `ProjectState`,
 * and since `buildFileSet` is a pure function of that state, the SAME choices always
 * yield byte-identical output. The proof reduces to comparing the assembled states.
 *
 * `assembleBlueprint` is a FAITHFUL, ADDITIVE extraction of the "createProjectModel →
 * setVersions/setStyle/setIntegrations/setDescription → addEntity" sequence the
 * server built statefully across routes and the demos built directly. It is NOT a
 * behavior change: `assembleBlueprint(defaultChoices)` reproduces the EXACT current
 * ProjectState, so the default path is a LITERAL BYPASS (the frozen digests reproduce
 * byte-for-byte — the load-bearing DC-2 gate). If it moved a hash, the extraction
 * changed behavior — a finding, STOP; never re-baseline.
 *
 * `BlueprintChoices` carries only CONCRETE values (a plain, JSON-serialisable object):
 *   - `settings` — the Phase-A backbone (name/type/backend/frontend/database/multiUser/auth).
 *   - `versions?` — a framework/version request; resolved to CONCRETE pins here
 *     (resolve-then-pin, Day 11). OMITTED ⇒ createProjectModel's current-implied
 *     defaults stand (the literal bypass — no setVersions call).
 *   - `style?` / `integrations?` — opaque post-setup values (default = no-op bypass).
 *   - `description?` — a neutral README-only value (default '' — a bypass).
 *   - `entities?` — added in order (belongs-to targets must precede — the model enforces it).
 *
 * The org-profile (Day 13) is DELIBERATELY absent here: it shapes the OPTIONS the
 * wizard presents (input metadata), never generation. The wizard resolves the user's
 * (profile-filtered) selection into the concrete values above; `assembleBlueprint`
 * only ever sees concrete choices — so no profile/enforcement metadata can reach the
 * blueprint or the generated output.
 *
 * No AI (ADR-001). No randomness/timestamps (ADR-003). Pure Node, no dependency.
 */

import {
  createProjectModel,
  type ProjectModel,
  type PhaseASettingsInput,
  type EntitySpec,
} from './project-model.js';
import { type CodingStyle } from './style.js';
import { type Integrations } from './integrations.js';
import { type StackVersions, resolveVersions } from './versions.js';
import { type SlotDecl } from './slots.js';
import { type DesignTokens } from '../figma/figma-ingest.js';
import { type CiConfig } from './cicd.js';
import { type SecurityConfig } from './security.js';

/**
 * The canonical, JSON-serialisable choices the wizard collects and the CLI passes.
 * Only `settings` is required; every other dimension defaults to today's implied
 * value (so an omit-everything choices set is the current default blueprint).
 */
export interface BlueprintChoices {
  /** Phase-A backbone (mandatory answers required; multiUser/auth may be omitted). */
  settings: PhaseASettingsInput;
  /** Framework/version request (resolve-then-pin). Omitted ⇒ the current-implied pins. */
  versions?: Partial<StackVersions>;
  /** Coding style (opaque; default = the no-op style — a bypass). */
  style?: CodingStyle;
  /** Optional integrations (default = none — a bypass). */
  integrations?: Integrations;
  /** Optional project description (default '' — a bypass; README-only when provided). */
  description?: string;
  /** Optional typed content-slot declarations (default [] — a bypass; Day 21). */
  slots?: SlotDecl[];
  /** Optional ingested Figma design tokens (default {} — a bypass; Day 31). */
  designTokens?: DesignTokens;
  /** Optional CI/CD config (default { provider: 'none' } — a bypass; Day 38). */
  cicd?: CiConfig;
  /** Optional security-scan config (default { scan: 'none' } — a bypass; Day 43). */
  security?: SecurityConfig;
  /** Entities in order (a belongs-to target must be defined earlier — the model checks). */
  entities?: EntitySpec[];
}

/**
 * Build the ONE Project Model a set of choices describes — the single canonical path
 * the wizard backend and the CLI both call. Deterministic and pure: the same choices
 * always produce the same ProjectState (hence, byte-identical output).
 *
 * The defaulting mirrors createProjectModel/makeModel exactly: an OMITTED optional
 * dimension leaves the model's own current-implied default in place (a literal bypass —
 * no setter fires), so `assembleBlueprint({ settings, entities })` == the current
 * default blueprint for those settings.
 */
export function assembleBlueprint(choices: BlueprintChoices): ProjectModel {
  const model = createProjectModel(choices.settings);

  // Versions: resolve-then-pin ONLY when a request is supplied. Omitted ⇒ the
  // createProjectModel default pins stand untouched (the literal bypass — the
  // default path never calls setVersions, so the frozen output is byte-identical).
  if (choices.versions && Object.keys(choices.versions).length > 0) {
    model.setVersions(resolveVersions(choices.settings.backend, choices.versions));
  }
  // Style / integrations / description: each omitted ⇒ the model's own default
  // (no-op style, none, '') stands — a literal bypass. Order among these is
  // immaterial (they set independent state); entity order is preserved below.
  if (choices.style) model.setStyle(choices.style);
  if (choices.integrations) model.setIntegrations(choices.integrations);
  if (typeof choices.description === 'string') model.setDescription(choices.description);
  // Slots: declared only when supplied. Omitted / [] ⇒ no setSlots effect and the
  // README post-process is a no-op — a literal bypass (byte-identical frozen output).
  if (choices.slots && choices.slots.length > 0) model.setSlots(choices.slots);
  // Design tokens (Day 31): set only when a Figma ingestion supplied them. Omitted / {} ⇒
  // no design-tokens.json ⇒ a literal bypass. The CONCRETE tokens (from the pure ingestion
  // core) ride the SAME canonical seam ⇒ round-trip/UI==CLI determinism is structural.
  if (choices.designTokens && Object.keys(choices.designTokens).length > 0) model.setDesignTokens(choices.designTokens);
  // CI/CD (Day 38): declared only when supplied with a non-'none' provider. Omitted / 'none' ⇒
  // no workflow ⇒ a literal bypass (byte-identical frozen output). A declared provider rides the
  // SAME canonical seam ⇒ round-trip/UI==CLI determinism is structural.
  if (choices.cicd && choices.cicd.provider !== 'none') model.setCicd(choices.cicd);
  // Security (Day 43): declared only when a scan is requested. Omitted / 'none' ⇒ no security
  // artifacts ⇒ a literal bypass (byte-identical frozen output; the Day-38 ci.yml untouched).
  if (choices.security && choices.security.scan !== 'none') model.setSecurity(choices.security);

  for (const spec of choices.entities ?? []) model.addEntity(spec);

  return model;
}
