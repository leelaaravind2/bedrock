/*
 * Thraksha — Spring Boot backend plugin.
 *
 * This holds EVERYTHING technology-specific that used to be tangled into the
 * generator: the Java package naming, the token substitution for the project
 * shell, the Spring/React/PostgreSQL template directory, the Flyway migration
 * numbering, and (via entity-codegen) the @Entity / JpaRepository / DTO /
 * controller / migration code itself. None of this lives in the core anymore
 * (Constitution Laws 25–28). The core talks to it ONLY through BackendPlugin.
 *
 * A future Express plugin would implement the same BackendPlugin interface and
 * sit beside this one — with no change to the core.
 *
 * No AI (ADR-001). Deterministic (ADR-003): fixed tokens, sorted walk, no
 * timestamps / randomness.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Entity, PhaseASettings, ProjectModel } from '../../core/project-model.js';
import { versionTokens } from '../../core/versions.js';
import type { BackendPlugin, EntityGenerationContext, GeneratedFile } from '../../core/plugin.js';
import type { DatabaseProvider } from '../../core/database.js';
import { postgresProvider } from '../database/postgres.js';
import {
  generateEntityFiles,
  describeEntityDefaults as describeSpringEntityDefaults,
  type EntityCodegenContext,
} from './entity-codegen.js';

// The Spring plugin owns its own template shell and resolves it relative to its
// compiled location, so EVERY caller (the CLI and the UI server) gets the same
// path through this one place — they can't drift apart. This file compiles to
// dist/plugins/spring/spring-plugin.js, and the templates live at
// generator/plugins/spring/templates, i.e. three levels up from dist/.
const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../generator/dist/plugins/spring
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'spring', 'templates');

/** A map of template tokens to their substituted values (Spring-specific). */
interface SubstitutionTokens {
  [token: string]: string;
}

/** projectName -> artifact slug, e.g. "DemoApp" -> "demoapp". */
function slugify(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** The Java/Spring token map derived deterministically from the Phase-A answers. */
function deriveTokens(inputs: PhaseASettings): SubstitutionTokens {
  const slug = slugify(inputs.projectName);
  return {
    __PROJECT_NAME__: inputs.projectName,
    __ARTIFACT_ID__: slug,
    __PACKAGE__: `com.${slug}`,
    __PACKAGE_PATH__: `com/${slug}`,
    __DB_NAME__: slug,
    __DB_USER__: slug,
    __DB_PASSWORD__: slug,
  };
}

function applyTokens(str: string, tokens: SubstitutionTokens): string {
  let out = str;
  for (const [k, v] of Object.entries(tokens)) {
    out = out.split(k).join(v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// API-only frontend subtraction (Day 15). Spring is the ONLY stack that
// scaffolds a frontend, so it is the only one that subtracts one. The subtraction
// is keyed on frontend === 'None' (which projectType 'API-only' forces) and is a
// LITERAL BYPASS for frontend !== 'None' — so Web-App output is byte-identical and
// the 4 Spring hashes stay frozen. These transforms run on the RAW template text
// (before token substitution): the frontend fragments carry no tokens (except the
// header's __DB_DISPLAY_NAME__, kept intact), so the transforms are exact.
// ---------------------------------------------------------------------------

/** True when the project has no frontend (API-only, or Web-App + frontend None). */
function isFrontendless(model: ProjectModel): boolean {
  return model.getSetting('frontend') === 'None';
}

/** Is this template path the frontend subtree that api-only omits entirely? */
function isFrontendFile(relRaw: string): boolean {
  return relRaw === 'frontend' || relRaw.startsWith('frontend/');
}

/** Remove the compose `frontend:` service block + adjust the header (raw text). */
function stripComposeFrontend(raw: string): string {
  const FRONTEND_SERVICE =
    '  frontend:\n' +
    '    build: ./frontend\n' +
    '    depends_on:\n' +
    '      - backend\n' +
    '    ports:\n' +
    '      - "3000:80"\n\n';
  return raw
    .replace('full stack: __DB_DISPLAY_NAME__ + Spring Boot + React (nginx)', 'backend-only API: __DB_DISPLAY_NAME__ + Spring Boot')
    .replace(FRONTEND_SERVICE, '');
}

/** Rewrite the README's frontend references to a coherent API-only run (raw text). */
function apiOnlyReadme(raw: string): string {
  const TREE_WEB =
    '__PROJECT_NAME__/\n' +
    '├── docker-compose.yml      # db + backend + frontend\n' +
    '├── backend/                # Spring Boot service\n' +
    '│   ├── Dockerfile\n' +
    '│   ├── pom.xml\n' +
    '│   └── src/main/...\n' +
    '└── frontend/               # React app served by nginx\n' +
    '    ├── Dockerfile\n' +
    '    ├── nginx.conf\n' +
    '    └── src/...';
  const TREE_API =
    '__PROJECT_NAME__/\n' +
    '├── docker-compose.yml      # db + backend\n' +
    '└── backend/                # Spring Boot service\n' +
    '    ├── Dockerfile\n' +
    '    ├── pom.xml\n' +
    '    └── src/main/...';
  return raw
    .replace('A multi-user-ready web application shell.', 'A multi-user-ready backend API shell (no frontend).')
    .replace('| Frontend | React (Vite) |\n', '')
    .replace('- Frontend: <http://localhost:3000>\n', '')
    .replace(
      'The frontend page shows the backend health status, proving the full stack\n(frontend → nginx → backend → database) is wired up.',
      'The backend serves a JSON API; hit the health endpoint above to confirm the\nstack (backend → database) is wired up.',
    )
    .replace(TREE_WEB, TREE_API)
    .replace('- Frontend: `cd frontend && npm install && npm run dev`.\n', '');
}

/** Recursive directory walk with a STABLE (sorted) ordering for determinism. */
async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

export interface SpringPluginOptions {
  /**
   * Absolute path to this plugin's template shell directory. Optional — when
   * omitted, the plugin resolves its own bundled templates (the normal case, so
   * the CLI and UI server always agree). Provide it only to point at a different
   * template set, e.g. in tests.
   */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

/** Construct the Spring Boot backend plugin. */
export function createSpringPlugin(options: SpringPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'spring-boot',
    displayName: 'Spring Boot + React + PostgreSQL',

    /** The runnable project shell: every template file, token-substituted. */
    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()), ...versionTokens(model.getVersions()) };
      // Day 15: API-only (frontend === 'None') subtracts the frontend slice. This
      // is a LITERAL BYPASS otherwise — Web-App runs the exact original walk.
      const apiOnly = isFrontendless(model);
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        if (apiOnly && isFrontendFile(relRaw)) continue; // omit the frontend/** subtree
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (apiOnly && relRaw === 'docker-compose.yml') raw = stripComposeFrontend(raw);
        if (apiOnly && relRaw === 'README.md') raw = apiOnlyReadme(raw);
        const relOut = applyTokens(relRaw, tokens);
        const content = applyTokens(raw, tokens);
        files.push({ relPath: relOut, content, ownership: 'thraksha' });
      }
      return files;
    },

    /** One entity's full CRUD slice. Derives Java package + migration version. */
    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      const slug = slugify(context.projectName);
      const ctx: EntityCodegenContext = {
        packageName: `com.${slug}`,
        packagePath: `com/${slug}`,
        multiUser: context.multiUser,
        migrationVersion: context.index + 2, // V1 is the users table from the shell
        sql: database.sql,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      };
      return generateEntityFiles(entity, ctx);
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describeSpringEntityDefaults(entity);
    },
  };
}
