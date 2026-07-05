/*
 * Thraksha — Python (FastAPI) backend plugin.
 *
 * A PEER of the Spring and Express plugins: it implements the exact same
 * BackendPlugin interface, so the core treats it identically and never learns
 * that FastAPI is behind it (Constitution Laws 25–28). All Python/FastAPI/
 * SQLAlchemy specifics live here and in entity-codegen.ts + the templates/ shell.
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
  generateSimpleEntityFiles,
  describeEntityDefaults as describePythonEntityDefaults,
  type EntityCodegenContext,
} from './entity-codegen.js';

// This file compiles to dist/plugins/python/python-plugin.js; its templates live
// at generator/plugins/python/templates (three levels up from dist/), so every
// caller resolves the same path through this one place.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATES_DIR = path.join(HERE, '..', '..', '..', 'plugins', 'python', 'templates');

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

export interface PythonPluginOptions {
  /** Override the bundled templates directory (tests only). */
  templatesDir?: string;
  /** The database provider to generate against (defaults to Postgres). */
  database?: DatabaseProvider;
}

// ---------------------------------------------------------------------------
// Email integration (Day 17). Gated on integrations.email === 'smtp' — a LITERAL
// BYPASS otherwise, so the 20-hash / api-only baselines stay frozen. FastAPI uses
// the STANDARD LIBRARY (smtplib) — no third-party dependency. The generated code
// is inert template text the APP runs at its runtime; Thraksha makes no SMTP call
// (ADR-001). No secret is baked — SMTP_* are env placeholders. Transforms run on
// the RAW template (the SMTP fragments carry no tokens, so they are exact).
// ---------------------------------------------------------------------------

/** The stdlib SMTP mailer the generated app can call — wired, inert until configured. */
const EMAIL_SERVICE_PY = [
  `"""Email (SMTP) — Day-17 optional integration.`,
  ``,
  `An outgoing-mail helper the app can call. SMTP settings are read from the`,
  `environment (app.config.settings). With SMTP_HOST / SMTP_FROM unset this module`,
  `is WIRED but INERT: importing it and constructing config never connects or`,
  `sends — delivery happens only when send_email() is called at request time. The`,
  `app performs delivery at ITS runtime; the generator makes no SMTP call. Standard`,
  `library only (smtplib) — no third-party dependency, no baked secret.`,
  `"""`,
  `import smtplib`,
  `from email.message import EmailMessage`,
  ``,
  `from .config import settings`,
  ``,
  ``,
  `def send_email(to: str, subject: str, body: str) -> None:`,
  `    """Send a plain-text email via SMTP. Call only from a request path — never`,
  `    at import/startup. Raises if SMTP is not configured (wired-but-inert)."""`,
  `    if not settings.smtp_host:`,
  `        raise RuntimeError(`,
  `            "Email is not configured — set SMTP_HOST / SMTP_FROM / SMTP_* in the environment."`,
  `        )`,
  `    msg = EmailMessage()`,
  `    msg["From"] = settings.smtp_from`,
  `    msg["To"] = to`,
  `    msg["Subject"] = subject`,
  `    msg.set_content(body)`,
  `    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as smtp:`,
  `        smtp.starttls()`,
  `        if settings.smtp_user:`,
  `            smtp.login(settings.smtp_user, settings.smtp_password)`,
  `        smtp.send_message(msg)`,
  ``,
].join('\n');

/** Add SMTP fields (env-read) to the config Settings class. */
function addSmtpConfig(raw: string): string {
  const PG_PASSWORD = `    pg_password: str = os.environ.get("PGPASSWORD", "__DB_PASSWORD__")`;
  const SMTP_FIELDS = [
    ``,
    `    # Email (SMTP) — Day-17 integration. Read from the environment; unset ⇒ the`,
    `    # mailer is wired but inert (nothing is sent). No secret is baked here.`,
    `    smtp_host: str = os.environ.get("SMTP_HOST", "")`,
    `    smtp_port: int = int(os.environ.get("SMTP_PORT", "587"))`,
    `    smtp_from: str = os.environ.get("SMTP_FROM", "")`,
    `    smtp_user: str = os.environ.get("SMTP_USER", "")`,
    `    smtp_password: str = os.environ.get("SMTP_PASSWORD", "")`,
  ].join('\n');
  return raw.replace(PG_PASSWORD, PG_PASSWORD + '\n' + SMTP_FIELDS);
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

/** Wire the email module into main.py so it loads at startup (proves it imports). */
function wireEmailImport(raw: string): string {
  return raw.replace(
    `from . import migrate, seed`,
    `from . import migrate, seed\nfrom . import email  # Day-17 email integration (loaded at startup; inert until SMTP_* set)`,
  );
}

/** Append a truthful email section to the README. */
function addEmailReadme(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    `## Email (optional integration)`,
    ``,
    `This project is wired for outgoing email over SMTP. \`app/email.py\` exposes`,
    `\`send_email(to, subject, body)\`, which the app can call from any request path.`,
    `It is **inert until configured**: with \`SMTP_HOST\` / \`SMTP_FROM\` unset, the`,
    `mailer imports cleanly but sends nothing. Set the \`SMTP_*\` environment`,
    `variables (see \`.env.example\`) to enable delivery. Uses the Python standard`,
    `library (\`smtplib\`) — no extra dependency, no baked credentials.`,
    ``,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// AI hook integration (Day 18). Gated on integrations.ai === 'hook' — a LITERAL
// BYPASS otherwise, so the 20-hash baselines stay frozen. The AI hook is a
// DETACHABLE add-on surface: an isolated /api/ai/* endpoint the app EXPOSES but
// does NOT depend on. The generated AI-client is inert template text the APP
// runs at ITS runtime; Thraksha makes NO model call (ADR-001) — the openai /
// provider-URL tokens live ONLY inside AI_SERVICE_PY. Standard library only
// (urllib) — no third-party AI SDK. No key is baked — AI_* are env placeholders.
// ---------------------------------------------------------------------------

/** The stdlib AI client the generated app can call — exposed, inert until keyed. */
const AI_SERVICE_PY = [
  `"""AI hook (optional) — Day-18 optional integration.`,
  ``,
  `An OPTIONAL add-on surface the app EXPOSES but does not depend on: an isolated`,
  `/api/ai/explain endpoint that asks a configured AI provider to explain some`,
  `text. It is WIRED but INERT until keyed — importing this module and mounting`,
  `its router never calls a model; with AI_API_KEY unset is_configured() is False`,
  `and the endpoint returns a graceful 503 (never a crash). Delivery happens only`,
  `when the endpoint is hit AND a key is set. The app calls the model at ITS`,
  `runtime; the generator makes no AI call (ADR-001). Standard library only`,
  `(urllib) — no third-party SDK, no baked secret. Wired to NOTHING in the CRUD`,
  `path — the entity routers are untouched.`,
  `"""`,
  `import json`,
  `import os`,
  `import urllib.request`,
  ``,
  `from fastapi import APIRouter`,
  `from fastapi.responses import JSONResponse`,
  `from pydantic import BaseModel`,
  ``,
  `# AI settings — read from the environment; unset => the hook is dormant. No`,
  `# default points at a real service and no key is baked here.`,
  `AI_API_KEY = os.environ.get("AI_API_KEY", "")`,
  `AI_PROVIDER = os.environ.get("AI_PROVIDER", "")`,
  `AI_MODEL = os.environ.get("AI_MODEL", "")`,
  ``,
  `# The provider endpoint (OpenAI-compatible chat completions). A greppable STRING`,
  `# constant — Thraksha never calls it; the generated app does, only when keyed.`,
  `AI_CHAT_URL = "https://api.openai.com/v1/chat/completions"`,
  ``,
  `router = APIRouter()`,
  ``,
  ``,
  `def is_configured() -> bool:`,
  `    """True only when an API key is present. Unset => the hook is dormant."""`,
  `    return bool(AI_API_KEY)`,
  ``,
  ``,
  `def explain(text: str) -> str:`,
  `    """Ask the configured AI provider to explain \`text\`. Call only from a`,
  `    request path — never at import/startup. Raises if the hook is not configured`,
  `    (callers must check is_configured() first)."""`,
  `    if not is_configured():`,
  `        raise RuntimeError(`,
  `            "AI is not configured — set AI_API_KEY / AI_PROVIDER / AI_MODEL in the environment."`,
  `        )`,
  `    payload = json.dumps(`,
  `        {`,
  `            "model": AI_MODEL or "gpt-4o-mini",`,
  `            "messages": [{"role": "user", "content": f"Explain: {text}"}],`,
  `        }`,
  `    ).encode("utf-8")`,
  `    req = urllib.request.Request(`,
  `        AI_CHAT_URL,`,
  `        data=payload,`,
  `        headers={`,
  `            "Authorization": f"Bearer {AI_API_KEY}",`,
  `            "Content-Type": "application/json",`,
  `        },`,
  `    )`,
  `    with urllib.request.urlopen(req) as resp:  # noqa: S310 (app-runtime call, opt-in)`,
  `        data = json.loads(resp.read().decode("utf-8"))`,
  `    return data["choices"][0]["message"]["content"]`,
  ``,
  ``,
  `class ExplainRequest(BaseModel):`,
  `    text: str`,
  ``,
  ``,
  `@router.post("/explain")`,
  `def explain_endpoint(body: ExplainRequest):`,
  `    """Optional AI endpoint. Dormant until AI_API_KEY is set: returns a graceful`,
  `    503 (not a crash) when unconfigured. Wired to NOTHING in the CRUD path."""`,
  `    if not is_configured():`,
  `        return JSONResponse(status_code=503, content={"detail": "AI is not configured"})`,
  `    return {"explanation": explain(body.text)}`,
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
    `\`app/ai.py\` on its own \`/api/ai/*\` route — **separate from and not required by**`,
    `the entity CRUD API. It is **inert until configured**: with \`AI_API_KEY\` unset`,
    `the endpoint returns \`503 {"detail":"AI is not configured"}\` and no model is`,
    `called. Set \`AI_API_KEY\` / \`AI_PROVIDER\` / \`AI_MODEL\` (see \`.env.example\`) to`,
    `enable it. The app calls the AI provider at its runtime; Thraksha never does`,
    `(ADR-001). Uses the Python standard library (\`urllib\`) — no extra dependency,`,
    `no baked credentials.`,
    ``,
  ].join('\n');
}

/**
 * Mount the AI router onto main.py — a SINGLE isolated add-on block appended at
 * the end. Loaded at startup (so boot success proves it is wired) and mounted on
 * /api/ai/*; the entity CRUD routers above are byte-identical (detachable).
 */
function wireAiMount(raw: string): string {
  return raw.trimEnd() + '\n' + [
    ``,
    ``,
    `# Day-18 AI hook (optional) — mounts an isolated /api/ai/* surface, loaded at`,
    `# startup so boot success proves it is wired; inert until AI_API_KEY is set. The`,
    `# entity CRUD routers above are untouched — the hook is a detachable add-on.`,
    `from . import ai  # Day-18 AI hook`,
    `app.include_router(ai.router, prefix="/api/ai")  # Day-18 AI hook`,
    ``,
  ].join('\n');
}

/** Construct the Python (FastAPI) backend plugin. */
export function createPythonPlugin(options: PythonPluginOptions = {}): BackendPlugin {
  const templatesDir = options.templatesDir ?? DEFAULT_TEMPLATES_DIR;
  const database = options.database ?? postgresProvider;

  return {
    id: 'fastapi',
    displayName: 'FastAPI + PostgreSQL',

    async generateProjectShell(model: ProjectModel): Promise<GeneratedFile[]> {
      // Provider tokens first, then project tokens: a provider token value may
      // embed project tokens (e.g. compose fragments), which must resolve after.
      const tokens = { ...database.tokens(), ...deriveTokens(model.getPhaseASettings()) };
      // Day 17: email adds a coherent slice; a LITERAL BYPASS otherwise.
      const email = model.getIntegrations().email === 'smtp';
      // Day 18: the AI hook adds a detachable /api/ai/* surface; a LITERAL BYPASS
      // otherwise. Independent of email — each gated separately.
      const ai = model.getIntegrations().ai === 'hook';
      const files: GeneratedFile[] = [];
      for (const tf of await walk(templatesDir)) {
        const relRaw = path.relative(templatesDir, tf).split(path.sep).join('/');
        let raw = (await fs.readFile(tf, 'utf8')).replace(/\r\n?/g, '\n'); // LD-1: normalize to LF at read → generator guarantees LF emission (no-op on today's LF templates)
        if (email) {
          if (relRaw === 'app/config.py') raw = addSmtpConfig(raw);
          else if (relRaw === '.env.example') raw = addSmtpEnv(raw);
          else if (relRaw === 'app/main.py') raw = wireEmailImport(raw);
          else if (relRaw === 'README.md') raw = addEmailReadme(raw);
        }
        if (ai) {
          // AI touches ONLY the add-on seams: env placeholders, the mount block on
          // main.py (a detachable add-on, CRUD routers untouched), and the README.
          if (relRaw === '.env.example') raw = addAiEnv(raw);
          else if (relRaw === 'app/main.py') raw = wireAiMount(raw);
          else if (relRaw === 'README.md') raw = addAiReadme(raw);
        }
        const relOut = applyTokens(relRaw, tokens);
        files.push({ relPath: relOut, content: applyTokens(raw, tokens), ownership: 'thraksha' });
      }
      if (email) {
        // The mailer the app calls (stdlib smtplib) — wired via main.py, inert until configured.
        files.push({ relPath: 'app/email.py', content: EMAIL_SERVICE_PY, ownership: 'thraksha' });
      }
      if (ai) {
        // The AI client the app calls (stdlib urllib) — mounted on /api/ai/*, inert until keyed.
        files.push({ relPath: 'app/ai.py', content: AI_SERVICE_PY, ownership: 'thraksha' });
      }
      return files;
    },

    generateEntity(entity: Entity, context: EntityGenerationContext): GeneratedFile[] {
      const ctx: EntityCodegenContext = {
        multiUser: context.multiUser,
        migrationVersion: context.index + 2, // V1 is the users table from the shell
        sql: database.sql,
        naming: context.style.namingConvention, // Day 12: wire-key naming
      };
      // Day 13: architectureDepth branches the FILE SET. 'default' is a literal
      // bypass (generateEntityFiles untouched → the 20 hashes are frozen).
      return context.style.architectureDepth === 'simple'
        ? generateSimpleEntityFiles(entity, ctx)
        : generateEntityFiles(entity, ctx);
    },

    describeEntityDefaults(entity: Entity): string[] {
      return describePythonEntityDefaults(entity);
    },
  };
}
