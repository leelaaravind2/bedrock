/*
 * Thraksha — Optional integrations (technology-neutral core).
 *
 * The "need X? → how? → config?" pattern (Day 17). An integration is a
 * DETERMINISTIC branch, never probabilistic (ADR-003): the DEFAULT ('none')
 * changes nothing — output is byte-identical, so the 20-hash backstop is frozen
 * by construction — and an active integration adds deterministic wiring.
 *
 * ADR-001 is the line that matters most here: what Thraksha GENERATES is inert
 * template code the generated APP runs at ITS runtime (an email service the app
 * calls, a config block, env placeholders). Thraksha the generator makes ZERO
 * SMTP / network / AI calls — "delete the integration and generation is
 * unaffected." No secret is ever baked; credentials are env placeholders only.
 *
 * The kernel stores the integration INTENT and knows nothing technology-specific
 * (Law 25): which files / config / dependency an integration adds is each
 * plugin's decision. This module carries only the neutral value + a generic
 * manifest renderer.
 *
 * Day 17: email (SMTP). Day 18: the AI hook — the SAME shape with `ai`. The AI
 * hook is a DETACHABLE runtime hook the generated app exposes; 'none' adds
 * nothing (the literal bypass), 'hook' emits an inert AI-client the APP calls at
 * ITS runtime. Thraksha never calls a model (ADR-001) — the AI-client is emitted
 * as template strings, exactly as the mailer is.
 */

/** How email is delivered. 'none' = no email (the literal bypass). */
export type EmailTransport = 'none' | 'smtp';

/** Whether the optional AI hook is exposed. 'none' = no hook (the literal bypass). */
export type AiHook = 'none' | 'hook';

/** The optional integrations a project opted into. Default = none of them. */
export interface Integrations {
  /** Email — 'smtp' wires a mailer the app can call; 'none' adds nothing. */
  readonly email: EmailTransport;
  /** AI — 'hook' exposes an optional AI endpoint the app can call; 'none' adds nothing. */
  readonly ai: AiHook;
}

/** The default — no integrations. A literal bypass that reproduces current output. */
export const defaultIntegrations: Integrations = { email: 'none', ai: 'none' };

/**
 * Human-readable manifest lines for the ACTIVE (non-none) integrations — GATED:
 * for the default (all none) this returns [] so the manifest renders nothing and
 * stays byte-identical (the backstop). Only an active integration is shown
 * (ADR-004). Generic string rendering of the neutral value (Law 25).
 */
export function activeIntegrationLines(integrations: Integrations): string[] {
  const lines: string[] = [];
  if (integrations.email !== 'none') {
    lines.push(`  - email: ${integrations.email} — mailer wired; SMTP credentials read from the environment (the app sends, Thraksha never does — ADR-001)`);
  }
  if (integrations.ai !== 'none') {
    lines.push(`  - ai: ${integrations.ai} — AI hook exposed (optional endpoint the app can call); API key read from the environment (the app calls the model, Thraksha never does — ADR-001)`);
  }
  return lines;
}
