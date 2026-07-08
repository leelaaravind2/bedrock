/*
 * Thraksha — AI security scan: the impure AI EDGE (Eco-Day 45).
 *
 * The ONLY place the AI-scan tier calls a model — quarantined at an already-impure I/O boundary,
 * NEVER imported by buildFileSet / plugins / the model / the export path / the deterministic scan
 * (core/scan.ts). It implements a real `AiSuggester` (ai-scan-core.ts) that asks the DEVELOPER'S
 * configured model to review a whole module and returns ADVISORY findings. Exactly the Day-23
 * fill-ai.ts split: a pure core, an impure edge.
 *
 * ── The strict conditions (the thesis, made structural) ─────────────────────────
 *  • DEFAULT OFF, STRUCTURALLY. `aiScanConfigFromEnv()` returns null unless the developer set
 *    THRAKSHA_AI_SCAN_KEY. `aiScanViaEnv` builds the suggester ONLY when a config exists — so with
 *    no key there is NO suggester, NO fetch, NO call SITE reached. Not a flag: absent a key, the
 *    network code is never constructed.
 *  • DEVELOPER-KEYED, MODEL-AGNOSTIC. The key/endpoint/model are the developer's, read ONLY here
 *    from env (their key, their bill). Thraksha ships NO key. OpenAI-compatible by default, fully
 *    overridable — tied to no provider.
 *  • ZERO DEPENDENCY. Node's builtin `fetch` (Node 18+) — no AI SDK, no HTTP client. `deps {}` stays.
 *  • ADVISORY, NEVER THE GATE. Its output is AdvisoryFinding[] — a review artifact, distinct from the
 *    deterministic CERTAIN gate (core/scan.ts). Delete this file / leave the key unset ⇒ the
 *    deterministic scan + export still run. AI is an enhancement, never the gate.
 *
 * NON-DETERMINISTIC BY NATURE (and that is fine): a live model returns variable findings each call.
 * They are ADVISORY and live OUTSIDE the deterministic backstop — never a generation input.
 */

import type { AiSuggester, ScanSpec, AdvisoryFinding } from './ai-scan-core.js';
import { buildScanSpecs, orchestrateAiScan, promptFor } from './ai-scan-core.js';

/** The developer's AI-scan configuration — read ONLY from env, ONLY here. A SEPARATE key from fill. */
export interface AiScanConfig {
  apiKey: string;
  /** OpenAI-compatible chat-completions endpoint by default; overridable for any provider. */
  endpoint: string;
  model: string;
}

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const REQUEST_TIMEOUT_MS = 30000;

/**
 * Read the developer's AI-scan config from the environment. Returns null when NO key is set — the
 * STRUCTURAL default-off: without a key there is no config, so `aiScanViaEnv` never builds a
 * suggester and no call site is ever reached. Thraksha ships no key and calls no model by default.
 */
export function aiScanConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AiScanConfig | null {
  const apiKey = env.THRAKSHA_AI_SCAN_KEY;
  if (!apiKey) return null; // default OFF — no key ⇒ no config ⇒ no call, ever
  return {
    apiKey,
    endpoint: env.THRAKSHA_AI_SCAN_ENDPOINT || DEFAULT_ENDPOINT,
    model: env.THRAKSHA_AI_SCAN_MODEL || DEFAULT_MODEL,
  };
}

/** Extract the first JSON array from a model response (models may wrap it in prose / ```json fences). */
function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Build a real AI `AiSuggester` over a config. It calls the developer's model via builtin `fetch`
 * (OpenAI-compatible chat-completions body, temperature 0 for a steadier review) with the NEUTRAL
 * whole-module prompt (promptFor), then parses the structured JSON into ADVISORY findings. On ANY
 * error (network, non-200, unexpected shape, timeout) it returns [] — the pure core treats that as
 * "no findings" (graceful; never a crash; the AI scan is optional/advisory, NEVER the gate).
 */
export function makeAiSuggester(config: AiScanConfig): AiSuggester {
  return async (spec: ScanSpec): Promise<AdvisoryFinding[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: promptFor(spec) }],
          temperature: 0,
        }),
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (typeof text !== 'string') return [];
      return extractJsonArray(text).map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        return {
          path: spec.path,
          line: Number(o.line) || 0,
          severity: String(o.severity ?? 'medium'),
          issue: String(o.issue ?? ''),
          suggestion: String(o.suggestion ?? ''),
          class: 'advisory' as const,
        };
      });
    } catch {
      return []; // any failure ⇒ no findings (never crash; the AI scan is optional)
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Return a live AI suggester IF the developer configured a key, else null. The single decision point
 * for default-off: null ⇒ the caller makes NO call and returns no advisory findings.
 */
export function aiSuggesterFromEnv(env: NodeJS.ProcessEnv = process.env): AiSuggester | null {
  const config = aiScanConfigFromEnv(env);
  return config ? makeAiSuggester(config) : null;
}

/** The result of an opt-in AI scan — surfaced to the developer as ADVISORY, never written to the shell. */
export interface AiScanAttempt {
  /** Was the AI scan actually enabled? false ⇒ default-off (no key) — NO call was made. */
  enabled: boolean;
  findings: AdvisoryFinding[];
}

/**
 * The single opt-in entry (the CLI runner uses it) — the DEFAULT-OFF decision point. With NO key:
 * returns { enabled:false, [] } WITHOUT constructing a suggester or making any call. With a key: runs
 * the pure scan core over the live AI suggester. ADVISORY only — it NEVER gates and NEVER touches
 * generation. Runs AFTER + SEPARATE from the deterministic scan (the caller runs that first).
 */
export async function aiScanViaEnv(
  files: { relPath: string; content: string }[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<AiScanAttempt> {
  const suggester = aiSuggesterFromEnv(env);
  if (!suggester) {
    // Default OFF — no key ⇒ no call site reached. No advisory findings; the deterministic gate is unaffected.
    return { enabled: false, findings: [] };
  }
  const findings = await orchestrateAiScan(buildScanSpecs(files), suggester);
  return { enabled: true, findings };
}
