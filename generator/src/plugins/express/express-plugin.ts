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
import { versionTokens } from '../../core/versions.js';
import type { BackendPlugin, EntityGenerationContext, GeneratedFile } from '../../core/plugin.js';
import type { CodingStyle } from '../../core/style.js';
import { indentUnitFor, reindent } from '../../core/style.js';
import type { DatabaseProvider } from '../../core/database.js';
import { postgresProvider } from '../database/postgres.js';
import {
  generateEntityFiles,
  generateSimpleEntityFiles,
  generateWorkerEntityFiles,
  generateCliEntityFiles,
  generateGraphqlEntityFiles,
  describeEntityDefaults as describeExpressEntityDefaults,
  type EntityCodegenContext,
} from './entity-codegen.js';
import { buildCanonicalSdl } from '../../core/graphql-sdl.js';

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
  // Anchor on the tokenized express line (Day 11) — this transform runs on the RAW
  // template, so it must match the token, not the resolved literal. After token
  // substitution __EXPRESS_VERSION__ → the pinned version, so output is unchanged.
  return raw.replace(`    "express": "__EXPRESS_VERSION__",`, `    "express": "__EXPRESS_VERSION__",\n    "nodemailer": "6.9.16",`);
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

// ---------------------------------------------------------------------------
// Worker archetypes (Day 34). cron-worker + queue-consumer are ENTRYPOINT /
// LIFECYCLE projections that REUSE the domain layer (db/migrate/seed/auth +
// per-entity model/repo/dto/service) UNCHANGED and swap ONLY the HTTP entrypoint
// (src/server.js + src/app.js — the listen + the router auto-mount / "route
// table") for a scheduler (cron) or a broker+consume-loop (queue), plus a
// per-entity handler in place of the entity HTTP route/controller layer.
//
// A LITERAL BYPASS for 'Web App' / 'API-only' (isWorker is false) — the frozen
// backstop is byte-identical. setInterval is a Node BUILTIN (no dep); the queue
// broker driver (amqplib) is a GENERATED-PROJECT dependency GATED on the type
// (Thraksha core stays deps {}). No AI (ADR-001). Deterministic string templates.
// ---------------------------------------------------------------------------

/** cron-worker entrypoint: migrate → seed → run once → setInterval tick (builtin, no dep). */
const CRON_WORKER_JS = [
  `'use strict';`,
  ``,
  `// Entry point (cron-worker): run migrations, seed, then start the scheduler.`,
  `// setInterval is a Node builtin — NO dependency. Each entity job is idempotent,`,
  `// so a tick may fire many times safely (see src/scheduler.js).`,
  `const migrate = require('./migrate');`,
  `const seed = require('./seed');`,
  `const { runAllJobs } = require('./scheduler');`,
  ``,
  `const INTERVAL_MS = Number(process.env.CRON_INTERVAL_MS || 60000);`,
  ``,
  `async function start() {`,
  `  await migrate();`,
  `  await seed();`,
  `  await runAllJobs(); // run once at startup`,
  `  setInterval(() => {`,
  `    runAllJobs().catch((err) => console.error('cron tick failed:', err));`,
  `  }, INTERVAL_MS);`,
  `  console.log('__PROJECT_NAME__ cron worker started (interval ' + INTERVAL_MS + 'ms)');`,
  `}`,
  ``,
  `start().catch((err) => {`,
  `  console.error('Failed to start:', err);`,
  `  process.exit(1);`,
  `});`,
  ``,
].join('\n');

/** cron-worker job table: auto-discovers every entity's <name>.job.js (the "route table" analog). */
const CRON_SCHEDULER_JS = [
  `'use strict';`,
  ``,
  `// The job table (the cron equivalent of app.js's router auto-mount): every`,
  `// src/entities/<name>/<name>.job.js is discovered and run each tick, in sorted`,
  `// (deterministic) order. Each job's run() is idempotent.`,
  `const fs = require('fs');`,
  `const path = require('path');`,
  ``,
  `function loadJobs() {`,
  `  const jobs = [];`,
  `  const entitiesDir = path.join(__dirname, 'entities');`,
  `  if (fs.existsSync(entitiesDir)) {`,
  `    for (const name of fs.readdirSync(entitiesDir).sort()) {`,
  `      const jobFile = path.join(entitiesDir, name, name + '.job.js');`,
  `      if (fs.existsSync(jobFile)) jobs.push({ name, job: require(jobFile) });`,
  `    }`,
  `  }`,
  `  return jobs;`,
  `}`,
  ``,
  `// Run every entity job to completion (idempotent). Returns the total processed.`,
  `async function runAllJobs() {`,
  `  let processed = 0;`,
  `  for (const { name, job } of loadJobs()) {`,
  `    const n = await job.run();`,
  `    processed += typeof n === 'number' ? n : 0;`,
  `    console.log('cron job ' + name + ' completed');`,
  `  }`,
  `  return processed;`,
  `}`,
  ``,
  `module.exports = { runAllJobs, loadJobs };`,
  ``,
].join('\n');

/** queue-consumer entrypoint: migrate → seed → broker.connect → subscribe each topic. */
const QUEUE_WORKER_JS = [
  `'use strict';`,
  ``,
  `// Entry point (queue-consumer): run migrations, seed, then connect to the broker`,
  `// and consume. The broker connection is behind ./broker so the consume loop +`,
  `// the topic→handler table (src/dispatcher.js) are broker-agnostic and testable`,
  `// with a stub — no real broker is needed to exercise the handler/ack path.`,
  `const migrate = require('./migrate');`,
  `const seed = require('./seed');`,
  `const { connect } = require('./broker');`,
  `const { dispatch, topics } = require('./dispatcher');`,
  ``,
  `async function start() {`,
  `  await migrate();`,
  `  await seed();`,
  `  const broker = await connect();`,
  `  // Subscribe every topic in the handler table; each delivered message is routed`,
  `  // to its handler with ack / retry / dead-letter (see src/dispatcher.js).`,
  `  for (const topic of topics()) {`,
  `    await broker.subscribe(topic, (message) => dispatch(topic, message, broker));`,
  `  }`,
  `  console.log('__PROJECT_NAME__ queue consumer started (' + topics().length + ' topics)');`,
  `}`,
  ``,
  `start().catch((err) => {`,
  `  console.error('Failed to start:', err);`,
  `  process.exit(1);`,
  `});`,
  ``,
].join('\n');

/** queue-consumer dispatcher: the topic→handler table + ack/retry/dead-letter. */
const QUEUE_DISPATCHER_JS = [
  `'use strict';`,
  ``,
  `// The topic→handler table (the queue equivalent of app.js's router auto-mount):`,
  `// every src/entities/<name>/<name>.handler.js contributes its topics. dispatch()`,
  `// runs one message through its handler with ack / retry / dead-letter.`,
  `const fs = require('fs');`,
  `const path = require('path');`,
  ``,
  `const MAX_ATTEMPTS = Number(process.env.QUEUE_MAX_ATTEMPTS || 3);`,
  ``,
  `function loadHandlers() {`,
  `  const table = {};`,
  `  const entitiesDir = path.join(__dirname, 'entities');`,
  `  if (fs.existsSync(entitiesDir)) {`,
  `    for (const name of fs.readdirSync(entitiesDir).sort()) {`,
  `      const handlerFile = path.join(entitiesDir, name, name + '.handler.js');`,
  `      if (fs.existsSync(handlerFile)) {`,
  `        const mod = require(handlerFile);`,
  `        for (const topic of Object.keys(mod.handlers).sort()) {`,
  `          table[topic] = mod.handlers[topic];`,
  `        }`,
  `      }`,
  `    }`,
  `  }`,
  `  return table;`,
  `}`,
  ``,
  `const HANDLERS = loadHandlers();`,
  ``,
  `function topics() {`,
  `  return Object.keys(HANDLERS).sort();`,
  `}`,
  ``,
  `// Route one message to its handler. Success -> ack. A transient failure -> retry`,
  `// (requeue with an incremented attempt) until MAX_ATTEMPTS; a poison message`,
  `// (attempts exhausted, or no handler) -> dead-letter. The broker supplies`,
  `// ack/retry/deadLetter, so this loop is testable with a stub broker.`,
  `async function dispatch(topic, message, broker) {`,
  `  const handler = HANDLERS[topic];`,
  `  if (!handler) {`,
  `    await broker.deadLetter(topic, message, 'no handler for topic');`,
  `    return { outcome: 'dead-letter', reason: 'no handler' };`,
  `  }`,
  `  const attempt = (message && message.attempt ? message.attempt : 0) + 1;`,
  `  try {`,
  `    await handler(message.payload, { topic, attempt });`,
  `    await broker.ack(message);`,
  `    return { outcome: 'ack', attempt };`,
  `  } catch (err) {`,
  `    if (attempt < MAX_ATTEMPTS) {`,
  `      await broker.retry(topic, Object.assign({}, message, { attempt }), err);`,
  `      return { outcome: 'retry', attempt };`,
  `    }`,
  `    await broker.deadLetter(topic, message, err && err.message ? err.message : String(err));`,
  `    return { outcome: 'dead-letter', attempt };`,
  `  }`,
  `}`,
  ``,
  `module.exports = { dispatch, topics, loadHandlers, HANDLERS, MAX_ATTEMPTS };`,
  ``,
].join('\n');

/** queue-consumer broker: the amqplib connection, WIRED but INERT until QUEUE_URL is set. */
const QUEUE_BROKER_JS = [
  `'use strict';`,
  ``,
  `// The broker connection (AMQP / RabbitMQ via amqplib). WIRED but INERT until`,
  `// QUEUE_URL is set: connect() throws a clear error if unconfigured, so nothing`,
  `// connects at import time. The consume loop + dispatcher are broker-agnostic and`,
  `// unit-testable with a stub broker (subscribe/ack/retry/deadLetter). amqplib is a`,
  `// GENERATED-PROJECT dependency (package.json), never the generator's.`,
  `const amqp = require('amqplib');`,
  ``,
  `const QUEUE_URL = process.env.QUEUE_URL || '';`,
  ``,
  `function isConfigured() {`,
  `  return Boolean(QUEUE_URL);`,
  `}`,
  ``,
  `// Connect and return the broker interface the dispatcher uses. Call only at`,
  `// startup from worker.js — never at import time.`,
  `async function connect() {`,
  `  if (!isConfigured()) {`,
  `    throw new Error('Queue is not configured — set QUEUE_URL in the environment.');`,
  `  }`,
  `  const connection = await amqp.connect(QUEUE_URL);`,
  `  const channel = await connection.createChannel();`,
  `  return {`,
  `    async subscribe(topic, onMessage) {`,
  `      await channel.assertQueue(topic, { durable: true });`,
  `      await channel.consume(topic, (msg) => {`,
  `        if (!msg) return;`,
  `        const payload = JSON.parse(msg.content.toString());`,
  `        const attempt = (msg.properties.headers && msg.properties.headers.attempt) || 0;`,
  `        onMessage({ payload, attempt, raw: msg });`,
  `      });`,
  `    },`,
  `    async ack(message) {`,
  `      if (message && message.raw) channel.ack(message.raw);`,
  `    },`,
  `    async retry(topic, message) {`,
  `      // Requeue with the incremented attempt count for another try.`,
  `      channel.sendToQueue(topic, Buffer.from(JSON.stringify(message.payload)), {`,
  `        headers: { attempt: message.attempt },`,
  `      });`,
  `      if (message && message.raw) channel.ack(message.raw);`,
  `    },`,
  `    async deadLetter(topic, message, reason) {`,
  `      // Route poison messages to a per-topic dead-letter queue.`,
  `      const dlq = topic + '.dead';`,
  `      await channel.assertQueue(dlq, { durable: true });`,
  `      channel.sendToQueue(dlq, Buffer.from(JSON.stringify({ payload: message.payload, reason })));`,
  `      if (message && message.raw) channel.ack(message.raw);`,
  `    },`,
  `  };`,
  `}`,
  ``,
  `module.exports = { connect, isConfigured, QUEUE_URL };`,
  ``,
].join('\n');

/**
 * Point package.json's main/start at the worker entrypoint (src/worker.js) instead
 * of the HTTP server, and — for queue-consumer only — add the amqplib broker driver
 * as a GENERATED-PROJECT dependency (gated on the type; Thraksha core stays deps {}).
 * Runs on the RAW template (before token substitution), so it anchors on the token line.
 */
function workerPackageJson(raw: string, kind: 'cron' | 'queue'): string {
  let out = raw
    .split(`"main": "src/server.js"`).join(`"main": "src/worker.js"`)
    .split(`"start": "node src/server.js"`).join(`"start": "node src/worker.js"`);
  if (kind === 'queue') {
    out = out.replace(
      `    "__DB_NODE_DRIVER__": "__DB_NODE_DRIVER_VERSION__"`,
      `    "__DB_NODE_DRIVER__": "__DB_NODE_DRIVER_VERSION__",\n    "amqplib": "0.10.4"`,
    );
  }
  return out;
}

/** Append a truthful worker section to the README (the HTTP run instructions no longer apply). */
function addWorkerReadme(raw: string, kind: 'cron' | 'queue'): string {
  const lines =
    kind === 'cron'
      ? [
          ``,
          `## Cron worker (project type: Cron Worker)`,
          ``,
          `This project is a **scheduler**, not an HTTP server: \`src/worker.js\` runs the`,
          `migrations and seed, then ticks on an interval (\`CRON_INTERVAL_MS\`, default`,
          `60000ms) via Node's built-in \`setInterval\` — **no scheduler dependency**.`,
          `\`src/scheduler.js\` auto-discovers every \`src/entities/<name>/<name>.job.js\` and`,
          `runs each idempotent job. The jobs reuse the SAME domain services the HTTP API`,
          `would (\`<name>.service.js\`); there are no HTTP routes. Start with \`npm start\`.`,
          ``,
        ]
      : [
          ``,
          `## Queue consumer (project type: Queue Consumer)`,
          ``,
          `This project is a **message consumer**, not an HTTP server: \`src/worker.js\` runs`,
          `the migrations and seed, connects to the broker (\`src/broker.js\`, AMQP/RabbitMQ`,
          `via \`amqplib\` — set \`QUEUE_URL\`), and subscribes every topic. \`src/dispatcher.js\``,
          `is the topic→handler table: it routes each message to its handler with`,
          `**ack / retry / dead-letter** (retries up to \`QUEUE_MAX_ATTEMPTS\`, default 3).`,
          `Handlers live in \`src/entities/<name>/<name>.handler.js\` and call the SAME`,
          `domain services the HTTP API would; there are no HTTP routes. Start with \`npm start\`.`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI + GraphQL archetypes (Day 36). Both are ENTRYPOINT/ROUTE-TABLE projections
// reusing the domain layer and swapping the HTTP entrypoint (server.js/app.js) for:
//   - CLI:     src/cli.js (stdlib arg-parse + dispatch, run-to-exit) + src/commands.js
//              (the command→handler table). NO dependency (process.argv).
//   - GraphQL: src/graphql-server.js (ONE /graphql endpoint) + src/resolvers.js (the
//              merged resolver table) + schema.graphql (the deterministic SDL). The
//              `graphql` runtime is a GATED generated-project dep (Thraksha core deps {}).
// A LITERAL BYPASS for the other types. Deterministic string templates; no AI.
// ---------------------------------------------------------------------------

/** CLI entrypoint (src/cli.js): stdlib arg-parse + dispatch + run-to-exit (no dep). */
const CLI_ENTRYPOINT_JS = [
  `'use strict';`,
  ``,
  `// Entry point (CLI): parse "node src/cli.js <entity> <op> [--field value ...]",`,
  `// dispatch to the entity command handler, print the JSON result, and exit. Stdlib`,
  `// arg-parse (process.argv) — NO dependency. Runs to exit (no HTTP, no loop).`,
  `const migrate = require('./migrate');`,
  `const seed = require('./seed');`,
  `const { commands } = require('./commands');`,
  ``,
  `// Parse argv into { _: [positional], ...flags }. Supports --key value, --key=value,`,
  `// and boolean --flag. Deterministic, stdlib only.`,
  `function parseArgs(argv) {`,
  `  const out = { _: [] };`,
  `  for (let i = 0; i < argv.length; i++) {`,
  `    const a = argv[i];`,
  `    if (a.startsWith('--')) {`,
  `      const eq = a.indexOf('=');`,
  `      if (eq !== -1) {`,
  `        out[a.slice(2, eq)] = a.slice(eq + 1);`,
  `      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {`,
  `        out[a.slice(2)] = argv[++i];`,
  `      } else {`,
  `        out[a.slice(2)] = true;`,
  `      }`,
  `    } else {`,
  `      out._.push(a);`,
  `    }`,
  `  }`,
  `  return out;`,
  `}`,
  ``,
  `async function main() {`,
  `  const [entity, op, ...rest] = process.argv.slice(2);`,
  `  if (!entity || !op) {`,
  `    console.error('usage: node src/cli.js <entity> <list|get|create|update|delete> [--field value ...]');`,
  `    process.exit(2);`,
  `  }`,
  `  const key = entity + ':' + op;`,
  `  const handler = commands[key];`,
  `  if (!handler) {`,
  `    console.error('unknown command: ' + key);`,
  `    process.exit(2);`,
  `  }`,
  `  await migrate();`,
  `  await seed();`,
  `  const result = await handler(parseArgs(rest));`,
  `  console.log(JSON.stringify(result, null, 2));`,
  `}`,
  ``,
  `main().catch((err) => {`,
  `  console.error('Error:', err && err.message ? err.message : err);`,
  `  process.exit(1);`,
  `});`,
  ``,
].join('\n');

/** CLI command table (src/commands.js): auto-discovers per-entity command modules. */
const CLI_COMMANDS_JS = [
  `'use strict';`,
  ``,
  `// The command table (the CLI analog of app.js's router auto-mount): every`,
  `// src/entities/<name>/<name>.commands.js is discovered and its commands merged`,
  `// (sorted, deterministic). Keys are "<entity>:<op>".`,
  `const fs = require('fs');`,
  `const path = require('path');`,
  ``,
  `function loadCommands() {`,
  `  const merged = {};`,
  `  const entitiesDir = path.join(__dirname, 'entities');`,
  `  if (fs.existsSync(entitiesDir)) {`,
  `    for (const name of fs.readdirSync(entitiesDir).sort()) {`,
  `      const file = path.join(entitiesDir, name, name + '.commands.js');`,
  `      if (fs.existsSync(file)) {`,
  `        const mod = require(file);`,
  `        for (const key of Object.keys(mod.commands).sort()) merged[key] = mod.commands[key];`,
  `      }`,
  `    }`,
  `  }`,
  `  return merged;`,
  `}`,
  ``,
  `const commands = loadCommands();`,
  ``,
  `module.exports = { commands, loadCommands };`,
  ``,
].join('\n');

/** GraphQL entrypoint (src/graphql-server.js): ONE /graphql endpoint over the SDL + resolvers. */
const GRAPHQL_SERVER_JS = [
  `'use strict';`,
  ``,
  `// Entry point (GraphQL API): migrate → seed → serve ONE POST /graphql endpoint`,
  `// over the deterministic SDL schema (schema.graphql) + the merged resolvers. Reuses`,
  `// the domain layer; there are NO REST route/controller files. Uses the \`graphql\``,
  `// reference runtime (a gated project dependency) over Express (already present).`,
  `const fs = require('fs');`,
  `const path = require('path');`,
  `const express = require('express');`,
  `const { buildSchema, graphql } = require('graphql');`,
  `const migrate = require('./migrate');`,
  `const seed = require('./seed');`,
  `const { loadResolvers } = require('./resolvers');`,
  ``,
  `const PORT = Number(process.env.PORT || 8080);`,
  `const sdl = fs.readFileSync(path.join(__dirname, '..', 'schema.graphql'), 'utf8');`,
  `const schema = buildSchema(sdl);`,
  `const merged = loadResolvers();`,
  `// rootValue = the flat top-level field map (query + mutation fields are distinct).`,
  `const rootValue = Object.assign({}, merged.Query, merged.Mutation);`,
  ``,
  `const app = express();`,
  `app.use(express.json());`,
  ``,
  `// The single GraphQL endpoint. Public health stays for parity with the REST shell.`,
  `app.get('/api/health', (req, res) => {`,
  `  res.json({ status: 'ok', app: '__PROJECT_NAME__' });`,
  `});`,
  `app.post('/graphql', async (req, res) => {`,
  `  const body = req.body || {};`,
  `  const result = await graphql({ schema, source: body.query, rootValue, variableValues: body.variables });`,
  `  res.json(result);`,
  `});`,
  ``,
  `async function start() {`,
  `  await migrate();`,
  `  await seed();`,
  `  app.listen(PORT, () => console.log('__PROJECT_NAME__ GraphQL API listening on port ' + PORT + ' (POST /graphql)'));`,
  `}`,
  ``,
  `start().catch((err) => {`,
  `  console.error('Failed to start:', err);`,
  `  process.exit(1);`,
  `});`,
  ``,
].join('\n');

/** GraphQL resolver table (src/resolvers.js): auto-discovers + merges per-entity resolvers. */
const GRAPHQL_RESOLVERS_JS = [
  `'use strict';`,
  ``,
  `// The resolver map (the GraphQL analog of app.js's router auto-mount): every`,
  `// src/entities/<name>/<name>.resolvers.js is discovered and its Query/Mutation`,
  `// resolvers merged (sorted, deterministic).`,
  `const fs = require('fs');`,
  `const path = require('path');`,
  ``,
  `function loadResolvers() {`,
  `  const merged = { Query: {}, Mutation: {} };`,
  `  const entitiesDir = path.join(__dirname, 'entities');`,
  `  if (fs.existsSync(entitiesDir)) {`,
  `    for (const name of fs.readdirSync(entitiesDir).sort()) {`,
  `      const file = path.join(entitiesDir, name, name + '.resolvers.js');`,
  `      if (fs.existsSync(file)) {`,
  `        const { resolvers } = require(file);`,
  `        Object.assign(merged.Query, resolvers.Query);`,
  `        Object.assign(merged.Mutation, resolvers.Mutation);`,
  `      }`,
  `    }`,
  `  }`,
  `  return merged;`,
  `}`,
  ``,
  `module.exports = { loadResolvers };`,
  ``,
].join('\n');

/** Repoint package.json main/start at the CLI/GraphQL entrypoint (+ graphql dep for GraphQL). */
function endpointPackageJson(raw: string, kind: 'cli' | 'graphql'): string {
  const entry = kind === 'cli' ? 'src/cli.js' : 'src/graphql-server.js';
  let out = raw
    .split(`"main": "src/server.js"`).join(`"main": "${entry}"`)
    .split(`"start": "node src/server.js"`).join(`"start": "node ${entry}"`);
  if (kind === 'graphql') {
    out = out.replace(
      `    "express": "__EXPRESS_VERSION__",`,
      `    "express": "__EXPRESS_VERSION__",\n    "graphql": "16.9.0",`,
    );
  }
  return out;
}

/** Append a truthful CLI/GraphQL section to the README. */
function addEndpointReadme(raw: string, kind: 'cli' | 'graphql'): string {
  const lines =
    kind === 'cli'
      ? [
          ``,
          `## CLI (project type: CLI)`,
          ``,
          `This project is a **command-line tool**, not an HTTP server: \`src/cli.js\` parses`,
          `\`node src/cli.js <entity> <op> [--field value ...]\` (stdlib \`process.argv\` — **no`,
          `dependency**), runs migrations + seed, dispatches to the entity command`,
          `(\`src/commands.js\` auto-discovers \`src/entities/<name>/<name>.commands.js\`), prints`,
          `the JSON result, and exits. Commands reuse the SAME domain services the REST API`,
          `would. Example: \`node src/cli.js ticket list\` / \`node src/cli.js ticket create --title Hi\`.`,
          ``,
        ]
      : [
          ``,
          `## GraphQL API (project type: GraphQL API)`,
          ``,
          `This project exposes **one GraphQL endpoint**, \`POST /graphql\`, instead of the REST`,
          `routes: \`schema.graphql\` is the deterministic SDL (a type per entity; queries +`,
          `mutations from CRUD), and \`src/resolvers.js\` merges the per-entity resolvers`,
          `(\`src/entities/<name>/<name>.resolvers.js\`), which call the SAME domain services the`,
          `REST API would. Uses the \`graphql\` reference runtime (in \`package.json\`). Start with`,
          `\`npm start\`; query e.g. \`{ tickets { id title } }\`.`,
          ``,
        ];
  return raw.trimEnd() + '\n' + lines.join('\n');
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
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()), ...versionTokens(model.getVersions()) };
      // Day 17: email adds a coherent slice (nodemailer); a LITERAL BYPASS otherwise.
      const email = model.getIntegrations().email === 'smtp';
      // Day 18: the AI hook adds a detachable /api/ai/* surface (built-in fetch, no
      // new dependency); a LITERAL BYPASS otherwise. Independent of email.
      const ai = model.getIntegrations().ai === 'hook';
      // Day 34: the worker archetypes swap the HTTP entrypoint (server.js/app.js)
      // for a scheduler (cron) or a broker+consume-loop (queue). A LITERAL BYPASS
      // for 'Web App'/'API-only' (isWorker false) — the domain templates are reused
      // unchanged, so the frozen backstop is byte-identical.
      const projectType = model.getPhaseASettings().projectType;
      const workerKind: 'cron' | 'queue' | null =
        projectType === 'Cron Worker' ? 'cron' : projectType === 'Queue Consumer' ? 'queue' : null;
      // Day 36: CLI + GraphQL are ALSO entrypoint/route-table projections that swap
      // server.js/app.js. `projectKind` covers all four; a null value is the literal
      // bypass (Web App / API-only / Static Site + API run the exact original walk).
      const endpointKind: 'cli' | 'graphql' | null =
        projectType === 'CLI' ? 'cli' : projectType === 'GraphQL API' ? 'graphql' : null;
      const swapsHttpEntrypoint = workerKind !== null || endpointKind !== null;
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        // Worker/CLI/GraphQL types swap the HTTP entrypoint: skip the two HTTP-only
        // shell files (server.js = listen, app.js = the router auto-mount / route
        // table). Every other template (db/migrate/seed/auth/http-error/Dockerfile/
        // compose/migrations) is the domain layer, reused unchanged.
        if (swapsHttpEntrypoint && (relRaw === 'src/server.js' || relRaw === 'src/app.js')) continue;
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (workerKind) {
          // Repoint main/start at the worker entrypoint (+ amqplib dep for queue),
          // and append a truthful worker section to the README (the HTTP run
          // instructions no longer apply).
          if (relRaw === 'package.json') raw = workerPackageJson(raw, workerKind);
          else if (relRaw === 'README.md') raw = addWorkerReadme(raw, workerKind);
        }
        if (endpointKind) {
          // Repoint main/start at the CLI/GraphQL entrypoint (+ graphql dep for
          // GraphQL), and append a truthful section to the README.
          if (relRaw === 'package.json') raw = endpointPackageJson(raw, endpointKind);
          else if (relRaw === 'README.md') raw = addEndpointReadme(raw, endpointKind);
        }
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
      // Day 34: the worker entrypoint + route/handler-table shell (in place of the
      // skipped server.js/app.js). Deterministic string templates (token-substituted
      // like every other shell file); the per-entity job/handler comes from generateEntity.
      if (workerKind === 'cron') {
        files.push({ relPath: 'src/worker.js', content: applyTokens(CRON_WORKER_JS, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'src/scheduler.js', content: applyTokens(CRON_SCHEDULER_JS, tokens), ownership: 'thraksha' });
      } else if (workerKind === 'queue') {
        files.push({ relPath: 'src/worker.js', content: applyTokens(QUEUE_WORKER_JS, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'src/dispatcher.js', content: applyTokens(QUEUE_DISPATCHER_JS, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'src/broker.js', content: applyTokens(QUEUE_BROKER_JS, tokens), ownership: 'thraksha' });
      }
      // Day 36: the CLI / GraphQL entrypoint + route-table shell (in place of the
      // skipped server.js/app.js). The per-entity command/resolver comes from
      // generateEntity; schema.graphql is the deterministic SDL (shared core builder).
      if (endpointKind === 'cli') {
        files.push({ relPath: 'src/cli.js', content: applyTokens(CLI_ENTRYPOINT_JS, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'src/commands.js', content: applyTokens(CLI_COMMANDS_JS, tokens), ownership: 'thraksha' });
      } else if (endpointKind === 'graphql') {
        files.push({ relPath: 'src/graphql-server.js', content: applyTokens(GRAPHQL_SERVER_JS, tokens), ownership: 'thraksha' });
        files.push({ relPath: 'src/resolvers.js', content: applyTokens(GRAPHQL_RESOLVERS_JS, tokens), ownership: 'thraksha' });
        // The deterministic SDL — the load-bearing artifact (stable, sorted ordering).
        const sdl = buildCanonicalSdl(model.getEntities(), {
          multiUser: model.getPhaseASettings().multiUser === true,
          naming: model.getStyle().namingConvention,
        });
        files.push({ relPath: 'schema.graphql', content: sdl, ownership: 'thraksha' });
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
      // Day 34: worker types swap the entity's HTTP route/controller layer for a
      // job (cron) / handler (queue), reusing the domain files byte-identically. A
      // LITERAL BYPASS for Web App/API-only (the 20 hashes stay frozen).
      const projectType = context.projectType;
      if (projectType === 'Cron Worker') return generateWorkerEntityFiles(entity, ctx, 'cron');
      if (projectType === 'Queue Consumer') return generateWorkerEntityFiles(entity, ctx, 'queue');
      // Day 36: CLI + GraphQL swap the entity's HTTP route/controller layer for a
      // command / resolver slice, reusing the domain files byte-identically.
      if (projectType === 'CLI') return generateCliEntityFiles(entity, ctx);
      if (projectType === 'GraphQL API') return generateGraphqlEntityFiles(entity, ctx);
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
