/*
 * Thraksha — Express (Node.js) backend plugin.
 *
 * A PEER of the Spring plugin: it implements the exact same BackendPlugin
 * interface, so the core treats it identically and never learns that Express is
 * behind it (Constitution Laws 25–28). All Node/Express/pg specifics live here
 * and in entity-codegen.ts + the templates/ shell.
 *
 * No AI (ADR-001). Deterministic (ADR-003): fixed tokens, sorted walk, no
 * timestamps / randomness.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Entity, PhaseASettings, ProjectModel } from '../../core/project-model.js';
import type { BackendPlugin, EntityGenerationContext, GeneratedFile } from '../../core/plugin.js';
import type { CodingStyle } from '../../core/style.js';
import { indentUnitFor, reindent } from '../../core/style.js';
import type { DatabaseProvider } from '../../core/database.js';
import { postgresProvider } from '../database/postgres.js';
import {
  generateEntityFiles,
  generateSimpleEntityFiles,
  describeEntityDefaults as describeExpressEntityDefaults,
  type EntityCodegenContext,
} from './entity-codegen.js';

// This file compiles to dist/plugins/express/express-plugin.js; its templates
// live at generator/plugins/express/templates (three levels up from dist/), so
// every caller resolves the same path through this one place.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'express', 'templates');

interface SubstitutionTokens {
  [token: string]: string;
}

// The MySQL connection module (mysql2), presented behind the SAME tiny interface
// the Postgres `pg` pool exposes — query()/connect() returning pg-shaped results —
// so every other shell file (auth.js, seed.js, migrate.js) and the repository's
// SELECT/DELETE stay byte-identical across dialects. Only this file and the
// repository insert/update (RETURNING) differ. Selected when the database does not
// support RETURNING. Token-substituted like any template. This is Express-owned
// driver-adapter code; the provider only states the neutral `supportsReturning`
// fact (Law 25 — no MySQL specifics in the core).
const MYSQL_DB_JS = [
  `'use strict';`,
  ``,
  `// __DB_DISPLAY_NAME__ connection pool (mysql2), adapted to the same interface`,
  `// the app uses for Postgres: query() returns { rows, rowCount, insertId } and`,
  `// rewrites $1,$2,… placeholders to mysql2's ?. Values come from the environment`,
  `// (set by docker-compose), with localhost defaults so the app can run directly.`,
  `const mysql = require('__DB_NODE_DRIVER__/promise');`,
  ``,
  `// Rewrite $1,$2,… -> ? . Generated SQL uses ascending, single-use placeholders`,
  `// in argument order, so a left-to-right swap preserves positional binding.`,
  `function toMysql(sql) {`,
  `  return sql.replace(/\\$\\d+/g, '?');`,
  `}`,
  ``,
  `// TINYINT(1) -> boolean so Boolean fields read back as true/false (matching the`,
  `// logical schema); other types keep mysql2's defaults.`,
  `function typeCast(field, next) {`,
  `  if (field.type === 'TINY' && field.length === 1) {`,
  `    const v = field.string();`,
  `    return v === null ? null : v === '1';`,
  `  }`,
  `  return next();`,
  `}`,
  ``,
  `const pool = mysql.createPool({`,
  `  host: process.env.PGHOST || 'localhost',`,
  `  port: Number(process.env.PGPORT || __DB_PORT__),`,
  `  database: process.env.PGDATABASE || '__DB_NAME__',`,
  `  user: process.env.PGUSER || '__DB_USER__',`,
  `  password: process.env.PGPASSWORD || '__DB_PASSWORD__',`,
  `  multipleStatements: true, // migration files apply several statements at once`,
  `  typeCast,`,
  `});`,
  ``,
  `// mysql2 returns [rows|ResultSetHeader, fields]; SELECT -> array, DML -> header.`,
  `function normalize(result) {`,
  `  const out = result[0];`,
  `  if (Array.isArray(out)) return { rows: out, rowCount: out.length, insertId: undefined };`,
  `  return { rows: [], rowCount: out.affectedRows, insertId: out.insertId };`,
  `}`,
  ``,
  `async function query(sql, params) {`,
  `  return normalize(await pool.query(toMysql(sql), params));`,
  `}`,
  ``,
  `// Matches pg's pool.connect(): a client with query()/release() for transactions`,
  `// (client.query('BEGIN'/'COMMIT'/'ROLLBACK') pass straight through to mysql2).`,
  `async function connect() {`,
  `  const conn = await pool.getConnection();`,
  `  return {`,
  `    query: async (sql, params) => normalize(await conn.query(toMysql(sql), params)),`,
  `    release: () => conn.release(),`,
  `  };`,
  `}`,
  ``,
  `module.exports = { query, connect };`,
  ``,
].join('\n');

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

// ---------------------------------------------------------------------------
// Email integration (Day 17). Gated on integrations.email === 'smtp' — a LITERAL
// BYPASS otherwise, so the 20-hash baselines stay frozen. Express uses nodemailer
// (a real runtime dependency — the "add-a-dependency" facet of the pattern). The
// generated code is inert template text the APP runs at its runtime; Thraksha
// makes no SMTP call (ADR-001). No secret is baked — SMTP_* are env placeholders.
// ---------------------------------------------------------------------------

/** The nodemailer mailer the generated app can call — wired, inert until configured. */
const EMAIL_SERVICE_JS = [
  `'use strict';`,
  `// Email (SMTP) — Day-17 optional integration.`,
  `//`,
  `// An outgoing-mail helper the app can call. SMTP settings are read from the`,
  `// environment; with SMTP_HOST/SMTP_FROM unset this module is WIRED but INERT —`,
  `// requiring it and building config never connects or sends. Delivery happens`,
  `// only when sendEmail() is called at request time. The app sends at ITS runtime;`,
  `// the generator makes no SMTP call. No secret is baked — env placeholders only.`,
  `const nodemailer = require('nodemailer');`,
  ``,
  `const config = {`,
  `  host: process.env.SMTP_HOST || '',`,
  `  port: Number(process.env.SMTP_PORT || 587),`,
  `  from: process.env.SMTP_FROM || '',`,
  `  user: process.env.SMTP_USER || '',`,
  `  password: process.env.SMTP_PASSWORD || '',`,
  `};`,
  ``,
  `function isConfigured() {`,
  `  return Boolean(config.host && config.from);`,
  `}`,
  ``,
  `// Call only from a request path — never at import/startup.`,
  `async function sendEmail(to, subject, body) {`,
  `  if (!isConfigured()) {`,
  `    throw new Error('Email is not configured — set SMTP_HOST / SMTP_FROM / SMTP_* in the environment.');`,
  `  }`,
  `  const transport = nodemailer.createTransport({`,
  `    host: config.host,`,
  `    port: config.port,`,
  `    auth: config.user ? { user: config.user, pass: config.password } : undefined,`,
  `  });`,
  `  await transport.sendMail({ from: config.from, to, subject, text: body });`,
  `}`,
  ``,
  `module.exports = { sendEmail, isConfigured };`,
  ``,
].join('\n');

/** Add nodemailer to package.json dependencies (valid JSON; resolves under npm install). */
function addNodemailerDep(raw: string): string {
  return raw.replace(`    "express": "4.21.2",`, `    "express": "4.21.2",\n    "nodemailer": "6.9.16",`);
}

/** Load the email module at startup so a broken mailer fails the boot (proves it's wired). */
function wireEmailRequire(raw: string): string {
  return raw.replace(
    `const { requireUser } = require('./auth');`,
    `const { requireUser } = require('./auth');\nrequire('./email'); // Day-17 email integration (loaded at startup; inert until SMTP_* set)`,
  );
}

/** Append SMTP env placeholders to .env.example (never real secrets). */
function addSmtpEnv(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `# Email (SMTP) — set these to enable outgoing mail; unset ⇒ wired but inert.`,
    `SMTP_HOST=`,
    `SMTP_PORT=587`,
    `SMTP_FROM=`,
    `SMTP_USER=`,
    `SMTP_PASSWORD=`,
    ``,
  ].join('\n');
}

/** Append a truthful email section to the README. */
function addEmailReadme(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `## Email (optional integration)`,
    ``,
    `This project is wired for outgoing email over SMTP. \`src/email.js\` exposes`,
    `\`sendEmail(to, subject, body)\`, which the app can call from any request path.`,
    `It is **inert until configured**: with \`SMTP_HOST\` / \`SMTP_FROM\` unset, the`,
    `mailer loads cleanly but sends nothing. Set the \`SMTP_*\` environment variables`,
    `(see \`.env.example\`) to enable delivery. Uses \`nodemailer\` (installed via`,
    `\`package.json\`) — no baked credentials.`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// AI hook integration (Day 18). Gated on integrations.ai === 'hook' — a LITERAL
// BYPASS otherwise, so the 20-hash baselines stay frozen. The AI hook is a
// DETACHABLE add-on surface: an isolated /api/ai/* endpoint the app EXPOSES but
// does NOT depend on. The generated AI-client is inert template text the APP
// runs at ITS runtime; Thraksha makes NO model call (ADR-001) — the openai /
// provider-URL tokens live ONLY inside AI_SERVICE_JS. Node's BUILT-IN fetch —
// NO new dependency (email already proved that facet). No key is baked — AI_*
// are env placeholders.
// ---------------------------------------------------------------------------

/** The built-in-fetch AI client the generated app can call — exposed, inert until keyed. */
const AI_SERVICE_JS = [
  `'use strict';`,
  `// AI hook (optional) — Day-18 optional integration.`,
  `//`,
  `// An OPTIONAL add-on surface the app EXPOSES but does not depend on: an isolated`,
  `// /api/ai/explain endpoint that asks a configured AI provider to explain some`,
  `// text. It is WIRED but INERT until keyed — requiring this module and mounting`,
  `// its router never calls a model; with AI_API_KEY unset isConfigured() is false`,
  `// and the endpoint returns a graceful 503 (never a crash). The app calls the`,
  `// model at ITS runtime; the generator makes no AI call (ADR-001). Node's`,
  `// built-in fetch — no third-party SDK, no new dependency, no baked secret.`,
  `// Wired to NOTHING in the CRUD path — the entity routers are untouched.`,
  `const express = require('express');`,
  ``,
  `const config = {`,
  `  apiKey: process.env.AI_API_KEY || '',`,
  `  provider: process.env.AI_PROVIDER || '',`,
  `  model: process.env.AI_MODEL || '',`,
  `};`,
  ``,
  `// The provider endpoint (OpenAI-compatible chat completions). A greppable STRING`,
  `// constant — Thraksha never calls it; the generated app does, only when keyed.`,
  `const AI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';`,
  ``,
  `function isConfigured() {`,
  `  return Boolean(config.apiKey);`,
  `}`,
  ``,
  `// Call only from a request path — never at import/startup.`,
  `async function explain(text) {`,
  `  if (!isConfigured()) {`,
  `    throw new Error('AI is not configured — set AI_API_KEY / AI_PROVIDER / AI_MODEL in the environment.');`,
  `  }`,
  `  const resp = await fetch(AI_CHAT_URL, {`,
  `    method: 'POST',`,
  `    headers: { Authorization: 'Bearer ' + config.apiKey, 'Content-Type': 'application/json' },`,
  `    body: JSON.stringify({`,
  `      model: config.model || 'gpt-4o-mini',`,
  `      messages: [{ role: 'user', content: 'Explain: ' + text }],`,
  `    }),`,
  `  });`,
  `  const data = await resp.json();`,
  `  return data.choices[0].message.content;`,
  `}`,
  ``,
  `const router = express.Router();`,
  ``,
  `// Optional AI endpoint. Dormant until AI_API_KEY is set: returns a graceful 503`,
  `// (not a crash) when unconfigured. Wired to NOTHING in the CRUD path.`,
  `router.post('/explain', async (req, res) => {`,
  `  if (!isConfigured()) {`,
  `    res.status(503).json({ detail: 'AI is not configured' });`,
  `    return;`,
  `  }`,
  `  const text = (req.body && req.body.text) || '';`,
  `  res.json({ explanation: await explain(text) });`,
  `});`,
  ``,
  `module.exports = { router, isConfigured, explain };`,
  ``,
].join('\n');

/** Append AI_* env placeholders to .env.example (never real secrets). */
function addAiEnv(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `# AI hook (optional) — set AI_API_KEY to enable POST /api/ai/explain; unset ⇒ exposed but inert.`,
    `AI_API_KEY=`,
    `AI_PROVIDER=`,
    `AI_MODEL=`,
    ``,
  ].join('\n');
}

/** Append a truthful AI-hook section to the README. */
function addAiReadme(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `## AI hook (optional integration)`,
    ``,
    `This project EXPOSES an optional AI endpoint, \`POST /api/ai/explain\`, wired in`,
    `\`src/ai.js\` on its own \`/api/ai/*\` route — **separate from and not required by**`,
    `the entity CRUD API. It is **inert until configured**: with \`AI_API_KEY\` unset`,
    `the endpoint returns \`503 {"detail":"AI is not configured"}\` and no model is`,
    `called. Set \`AI_API_KEY\` / \`AI_PROVIDER\` / \`AI_MODEL\` (see \`.env.example\`) to`,
    `enable it. The app calls the AI provider at its runtime; Thraksha never does`,
    `(ADR-001). Uses Node's built-in \`fetch\` — no extra dependency, no baked`,
    `credentials.`,
    ``,
  ].join('\n');
}

/**
 * Mount the AI router onto app.js — a SINGLE isolated add-on line inserted before
 * the auth gate so /api/ai/* is reachable like /api/health. Required at startup
 * (so boot success proves it is wired); the entity CRUD routers below are
 * byte-identical (detachable).
 */
function wireAiMount(raw: string): string {
  // A SINGLE isolated add-on line inserted above the auth gate (so /api/ai/* is
  // reachable like /api/health), required at startup so boot success proves it is
  // wired. Inert until AI_API_KEY is set; the entity CRUD routers below untouched.
  const line = `app.use('/api/ai', require('./ai').router); // Day-18 AI hook — isolated /api/ai/* add-on, required at startup (boot proves it wired), reachable like /api/health, inert until AI_API_KEY set; CRUD routers below untouched`;
  return raw.replace(
    `// Everything below requires authentication (simple login).`,
    line + '\n' + `// Everything below requires authentication (simple login).`,
  );
}

export interface ExpressPluginOptions {
  /** Override the bundled templates directory (tests only). */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

/** Construct the Express backend plugin. */
export function createExpressPlugin(options: ExpressPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'express',
    displayName: 'Express + PostgreSQL',

    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()) };
      // Day 17: email adds a coherent slice (nodemailer); a LITERAL BYPASS otherwise.
      const email = model.getIntegrations().email === 'smtp';
      // Day 18: the AI hook adds a detachable /api/ai/* surface (built-in fetch, no
      // new dependency); a LITERAL BYPASS otherwise. Independent of email.
      const ai = model.getIntegrations().ai === 'hook';
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (email) {
          if (relRaw === 'package.json') raw = addNodemailerDep(raw);
          else if (relRaw === 'src/app.js') raw = wireEmailRequire(raw);
          else if (relRaw === '.env.example') raw = addSmtpEnv(raw);
          else if (relRaw === 'README.md') raw = addEmailReadme(raw);
        }
        if (ai) {
          // AI touches ONLY the add-on seams: env placeholders, the mount line on
          // src/app.js (a detachable add-on, CRUD routers untouched, NO new dep on
          // package.json), and the README.
          if (relRaw === 'src/app.js') raw = wireAiMount(raw);
          else if (relRaw === '.env.example') raw = addAiEnv(raw);
          else if (relRaw === 'README.md') raw = addAiReadme(raw);
        }
        const relOut = applyTokens(relRaw, tokens);
        files.push({ relPath: relOut, content: applyTokens(raw, tokens), ownership: 'thraksha' });
      }
      if (email) {
        // The mailer the app calls (nodemailer) — wired via src/app.js, inert until configured.
        files.push({ relPath: 'src/email.js', content: EMAIL_SERVICE_JS, ownership: 'thraksha' });
      }
      if (ai) {
        // The AI client the app calls (built-in fetch) — mounted on /api/ai/*, inert until keyed.
        files.push({ relPath: 'src/ai.js', content: AI_SERVICE_JS, ownership: 'thraksha' });
      }
      // Databases without RETURNING (e.g. MySQL) need a different runtime driver
      // module; swap src/db.js for the mysql2 adapter. Postgres keeps the bundled
      // pg pool template unchanged (byte-identical).
      if (!database.runtime.supportsReturning) {
        const dbFile = files.find((f) => f.relPath === 'src/db.js');
        if (dbFile) dbFile.content = applyTokens(MYSQL_DB_JS, tokens);
      }
      return files;
    },

    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      const ctx: EntityCodegenContext = {
        multiUser: context.multiUser,
        migrationVersion: context.index + 2, // V1 is the users table from the shell
        sql: database.sql,
        supportsReturning: database.runtime.supportsReturning,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      };
      // Day 13: architectureDepth branches the FILE SET. 'default' is a literal
      // bypass (generateEntityFiles untouched → the 20 hashes are frozen).
      return context.style.architectureDepth === 'simple'
        ? generateSimpleEntityFiles(entity, ctx)
        : generateEntityFiles(entity, ctx);
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describeExpressEntityDefaults(entity);
    },

    // Coding-style FORMATTING: re-indent the generated JavaScript. Express code is
    // 2-space-indented and brace-delimited, so leading whitespace is non-semantic
    // — re-indenting it is byte-different but behaviourally identical by the JS
    // grammar. Only .js code files are touched; package.json / docker-compose.yml
    // / .sql / README are left exactly as-is (their whitespace can be meaningful).
    // The 'default' indent is a no-op (unit === '') → files returned unchanged.
    formatFiles(files: GeneratedFile[], style: CodingStyle): GeneratedFile[] {
      const unit = indentUnitFor(style.formatting.indent);
      if (unit === '') return files; // default → backstop: byte-for-byte identical
      const EXPRESS_SOURCE_INDENT = 2;
      return files.map((f) =>
        f.relPath.endsWith('.js')
          ? { ...f, content: reindent(f.content, EXPRESS_SOURCE_INDENT, unit) }
          : f,
      );
    },
  };
}
