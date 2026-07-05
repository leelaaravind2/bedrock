/*
 * Thraksha — Python (Django) backend plugin.
 *
 * A PEER of the Spring, Express, and FastAPI plugins: it implements the exact
 * same BackendPlugin interface, so the core treats it identically and never
 * learns that Django is behind it (Constitution Laws 25–28). Django is a SECOND
 * Python framework — it sits ALONGSIDE FastAPI, it does not replace it. All
 * Django/DRF specifics live here and in entity-codegen.ts + the templates/ shell.
 *
 * No AI (ADR-001). Deterministic (ADR-003): fixed tokens, sorted walk, no
 * timestamps / randomness.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Entity, PhaseASettings, ProjectModel } from '../../core/project-model.js';
import type { BackendPlugin, EntityGenerationContext, GeneratedFile } from '../../core/plugin.js';
import type { DatabaseProvider } from '../../core/database.js';
import { postgresProvider } from '../database/postgres.js';
import {
  generateEntityFiles,
  describeEntityDefaults as describeDjangoEntityDefaults,
} from './entity-codegen.js';

// This file compiles to dist/plugins/django/django-plugin.js; its templates live
// at generator/plugins/django/templates (three levels up from dist/), so every
// caller resolves the same path through this one place.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'django', 'templates');

interface SubstitutionTokens {
  [token: string]: string;
}

function slugify(projectName: string): string {
  return projectName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function deriveTokens(inputs: PhaseASettings): SubstitutionTokens {
  const slug = slugify(inputs.projectName);
  return {
    __PROJECT_NAME__: inputs.projectName,
    __ARTIFACT_ID__: slug,
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

export interface DjangoPluginOptions {
  /** Override the bundled templates directory (tests only). */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

/** Construct the Python (Django) backend plugin. */
export function createDjangoPlugin(options: DjangoPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'django',
    displayName: 'Django + PostgreSQL',

    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()) };
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        const relOut = applyTokens(relRaw, tokens);
        const raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        const content = applyTokens(raw, tokens);
        files.push({ relPath: relOut, content, ownership: 'thraksha' });
      }
      return files;
    },

    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      // Multi-user owner scoping is applied when the project is multi-user (ADR-005).
      return generateEntityFiles(entity, {
        multiUser: context.multiUser,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      });
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describeDjangoEntityDefaults(entity);
    },
  };
}
