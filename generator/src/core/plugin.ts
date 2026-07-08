/*
 * Thraksha — Backend plugin contract (the kernel/plugin seam).
 *
 * This is the ONLY thing the technology-agnostic core knows about a backend.
 * The core reads the Project Model, runs the file-separation / preview /
 * versioning engine, and asks a BackendPlugin to turn the model into files.
 * The core never knows whether the plugin emits Java, JavaScript, Go, or SQL —
 * it only sees GeneratedFile records with an ownership tag (Constitution
 * Laws 25–28: the kernel holds no technology-specific logic; technologies are
 * implemented as plugins that communicate only through this public interface).
 *
 * A second backend (e.g. an Express plugin) is added later by implementing this
 * same interface — with NO change to the core.
 */

import type { Entity, ProjectModel } from './project-model.js';
import type { CodingStyle } from './style.js';
import type { CiProfile } from './cicd.js';

/**
 * One file the platform will write, plus who owns it (ADR-002). This is the
 * universal unit of generation output — technology-agnostic on purpose.
 *   - `thraksha`  : regenerated freely (the platform owns it).
 *   - `developer` : created once, then NEVER overwritten (the developer owns it).
 */
export interface GeneratedFile {
  /** Path relative to the generated project root, using forward slashes. */
  relPath: string;
  content: string;
  ownership: 'thraksha' | 'developer';
}

/**
 * Agnostic context the core passes when asking a plugin to generate one entity.
 * It carries only model-derived facts — never technology details. The plugin
 * derives whatever it needs (package names, file layout, migration numbering,
 * …) from these.
 */
export interface EntityGenerationContext {
  /** 0-based position of this entity in the model's entity list (stable order). */
  index: number;
  /** Whether the project is multi-user (ADR-005) — the plugin decides scoping. */
  multiUser: boolean;
  /** The project name, as the developer entered it. */
  projectName: string;
  /**
   * The project TYPE (Day 34). The plugin decides the entity's shape per type:
   * 'Web App'/'API-only' emit the HTTP CRUD slice (default); 'Cron Worker' /
   * 'Queue Consumer' reuse the domain files and swap the route/controller layer
   * for a worker job/handler. Defaulted so an omitting caller reproduces the HTTP
   * output byte-identically (a literal bypass).
   */
  projectType: string;
  /**
   * The developer's chosen coding style (default = a no-op reproducing current
   * output). A plugin applies whatever parts of it are relevant to its language;
   * ignoring it entirely leaves output unchanged. Formatting (Day 11) is applied
   * as a post-generation pass (see BackendPlugin.formatFiles); options applied
   * during codegen (naming, later) read it here.
   */
  style: CodingStyle;
}

/**
 * The contract every backend plugin implements. The core calls these; it does
 * not know or care what technology is behind them.
 *
 * Determinism (ADR-003) and file separation (ADR-002) are obligations on the
 * implementer: the same model must always yield the same files (no timestamps,
 * no randomness), and developer-owned files must be tagged `developer` so the
 * core's write phase never overwrites them.
 */
export interface BackendPlugin {
  /** Stable identifier, e.g. "spring-boot". */
  readonly id: string;
  /** Human-readable name shown to developers. */
  readonly displayName: string;

  /**
   * Produce the project skeleton (the runnable shell) as files with ownership.
   * Everything not tied to a specific entity: build files, config, the auth /
   * multi-user foundation, frontend, container setup, etc.
   */
  generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]>;

  /**
   * Produce ALL files for ONE entity (its full CRUD slice), tagged by ownership.
   * The core calls this once per entity, in model order.
   */
  generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[];

  /**
   * Human-readable, per-entity notes about the defaults the plugin applied to
   * each field (ADR-004 — defaults shown, never silent). The core renders these
   * verbatim into the generation manifest; it does not interpret them.
   */
  describeEntityDefaults(entity: Entity): string[];

  /**
   * Optional: apply the chosen coding style's FORMATTING to this plugin's already
   * generated files, returning the formatted set. Formatting changes only how
   * code looks (whitespace/quotes) — never what it means. The DEFAULT style must
   * be a no-op (return the files unchanged), so default output stays byte-for-byte
   * identical (the backstop). Plugins that don't format may omit this. The core
   * calls it once, after generation, with the neutral CodingStyle (Law 25 — the
   * core does not know what formatting means for the plugin's language).
   */
  formatFiles?(files: GeneratedFile[], style: CodingStyle): GeneratedFile[];

  /**
   * Optional: the NEUTRAL CI facts for this stack (Day 38) — the setup action + the
   * runtime version key + the build/test commands + the Dockerfile path. Returns NO
   * YAML: the core renders the provider workflow (core/cicd.ts) from these facts + the
   * blueprint version pins + a fixed pinned-action table (Law 25 — the core owns the
   * provider format; the plugin owns the stack commands). Called only when the project
   * declares a CI/CD provider; the default ('none') never calls it (a literal bypass).
   */
  ciProfile?(): CiProfile;
}
