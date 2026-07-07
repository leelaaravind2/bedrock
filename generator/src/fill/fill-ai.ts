/*
 * Thraksha — Creative slot FILL: the impure AI EDGE (Eco-Day 23).
 *
 * The FIRST — and ONLY — place Thraksha itself calls an AI. It implements a real `SlotFiller`
 * (fill-core.ts) that, given a fill spec, asks the DEVELOPER'S configured model for the slot's
 * content. It is quarantined here at an already-impure I/O boundary — NEVER imported by
 * buildFileSet / plugins / the model — so it CANNOT reach generation. What it produces is a
 * SlotContent value (the separate layer); it has no write-path to the shell. Exactly the
 * Day-18 detect/probe split: a pure core, an impure edge.
 *
 * ── The strict conditions (the thesis, made structural) ─────────────────────────
 *  • DEFAULT OFF, STRUCTURALLY. `aiConfigFromEnv()` returns null unless the developer set
 *    THRAKSHA_AI_FILL_KEY. `fillViaEnv` builds the filler ONLY when a config exists — so with
 *    no key there is NO filler, NO fetch, NO call SITE reached. Not a flag that could be
 *    bypassed: absent a key, the network code is never constructed.
 *  • DEVELOPER-KEYED, MODEL-AGNOSTIC. The key/endpoint/model are the developer's, read ONLY
 *    here from env (their key, their bill). Thraksha ships NO key and calls NO model by default.
 *    The endpoint is an OpenAI-compatible chat-completions shape by default but fully overridable
 *    — Thraksha's fill is tied to no provider (the developer's model of choice).
 *  • ZERO DEPENDENCY. Node's global `fetch` is a builtin (Node 18+) — no AI SDK, no HTTP client.
 *    The generator core stays `deps {}` / pure-Node; the AI lives only in this detachable file.
 *  • DETACHABLE (Law 21). Delete this file / leave the key unset ⇒ generation still runs
 *    completely (shell + empty slots). AI is an enhancement, never the gate.
 *
 * NON-DETERMINISTIC BY NATURE (and that is fine): a live model returns different text each
 * call. Its output goes ONLY into SlotContent — the non-hashed creative layer, OUTSIDE the
 * deterministic backstop. It NEVER becomes a generation input.
 */

import type { SlotFiller, FillSpec } from './fill-core.js';
import { fillSlots } from './fill-core.js';
import type { SlotDecl } from '../core/slots.js';
import type { ProjectState } from '../core/project-model.js';
import { emptyContent, type SlotContent } from '../core/slot-content.js';

/** The developer's AI configuration — read ONLY from env, ONLY here. */
export interface AiFillConfig {
  apiKey: string;
  /** OpenAI-compatible chat-completions endpoint by default; overridable for any provider. */
  endpoint: string;
  model: string;
}

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Read the developer's AI config from the environment. Returns null when NO key is set —
 * the STRUCTURAL default-off: without a key there is no config, so `fillViaEnv` never builds
 * a filler and no call site is ever reached. Thraksha ships no key.
 */
export function aiConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AiFillConfig | null {
  const apiKey = env.THRAKSHA_AI_FILL_KEY;
  if (!apiKey) return null; // default OFF — no key ⇒ no config ⇒ no call, ever
  return {
    apiKey,
    endpoint: env.THRAKSHA_AI_FILL_ENDPOINT || DEFAULT_ENDPOINT,
    model: env.THRAKSHA_AI_FILL_MODEL || DEFAULT_MODEL,
  };
}

/** Build the creative prompt for one slot from its spec (AI-facing formatting — pure). */
export function promptFor(spec: FillSpec): string {
  const c = spec.context;
  const domain = c.entities.length ? ` The domain covers: ${c.entities.join(', ')}.` : '';
  return (
    `Write the "${spec.type}" content for a software project's README slot.\n` +
    `Project: "${c.projectName}" (${c.projectType}, ${c.backend} backend).${domain}\n` +
    `Return ONLY the content text for the ${spec.type} — no markdown headings, no preamble.`
  );
}

/**
 * Build a real AI `SlotFiller` over a config. It calls the developer's model via builtin
 * `fetch` (OpenAI-compatible chat-completions body) and returns the content string. On any
 * error (network, non-200, unexpected shape, timeout) it returns '' — the pure core treats
 * that as "unfilled" (graceful; the slot stays empty, the shell stays valid — Law 21).
 */
export function makeAiFiller(config: AiFillConfig): SlotFiller {
  return async (spec: FillSpec): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: promptFor(spec) }],
          temperature: 0.7,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return '';
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      return typeof text === 'string' ? text.trim() : '';
    } catch {
      return ''; // any failure ⇒ unfilled (never crash; the fill is optional)
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Return a live AI filler IF the developer configured a key, else null. The single decision
 * point for default-off: null ⇒ the caller makes NO call and leaves content empty.
 */
export function aiFillerFromEnv(env: NodeJS.ProcessEnv = process.env): SlotFiller | null {
  const config = aiConfigFromEnv(env);
  return config ? makeAiFiller(config) : null;
}

/** The result of an opt-in fill attempt — surfaced to the developer (never written to the shell). */
export interface FillAttempt {
  /** Was an AI fill actually enabled? false ⇒ default-off (no key) — NO call was made. */
  enabled: boolean;
  content: SlotContent;
  state: 'empty' | 'partial' | 'full';
}

/**
 * The single opt-in entry both the CLI demo and the server route use — the DEFAULT-OFF
 * decision point. With NO key: returns { enabled:false, empty content } WITHOUT constructing
 * a filler or making any call. With a key: runs the pure fill core over the live AI filler.
 * Either way it returns ONLY SlotContent — it never touches the shell.
 */
export async function fillViaEnv(
  state: ProjectState,
  decls: SlotDecl[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<FillAttempt> {
  const filler = aiFillerFromEnv(env);
  if (!filler) {
    // Default OFF — no key ⇒ no call site reached. Content stays empty; generation is unaffected.
    return { enabled: false, content: emptyContent(decls), state: 'empty' };
  }
  const { content, state: fillState } = await fillSlots(state, decls, filler);
  return { enabled: true, content, state: fillState };
}
