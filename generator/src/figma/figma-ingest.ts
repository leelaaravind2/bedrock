/*
 * Thraksha — Figma token ingestion: the PURE ingestion CORE (Eco-Day 31).
 *
 * The FIRST Phase-3 capability — a NEW INPUT SURFACE. Figma feeds the generator as
 * STRUCTURED DATA (never screenshots): a Figma plugin exports variables + component tree +
 * auto-layout as W3C DESIGN-TOKEN JSON, and this pure core turns that JSON into a canonical,
 * deterministic model input. It contains NO Figma runtime and NO AI — the impure Figma-plugin
 * EDGE (figma/plugin/) runs INSIDE Figma and produces the token JSON; this core CONSUMES it.
 * (The Day-18 detect-core/probe and Day-23 fill-core/fill-ai split.)
 *
 * ── The determinism boundary (why this is safe) ─────────────────────────────────
 *  1. ROUND-TRIP DETERMINISM. The same token JSON → byte-identical `DesignTokens` → byte-
 *     identical `design-tokens.json` artifact. Pure JSON→object math: sorted keys, stable
 *     order, no clock/RNG. (Style Dictionary is NOT needed — a pure-Node parse suffices, so
 *     Thraksha core stays `deps {}`.)
 *  2. ADDITIVE / DEFAULT-BYPASS. `DesignTokens` attaches to the blueprint as an OPTIONAL
 *     layer (the 6×-proven pattern). Empty ⇒ buildFileSet emits no artifact ⇒ the frozen
 *     backstop is byte-identical. Figma is a new front door, not a generation change.
 *  3. ELIGIBLE → TOKENS; INELIGIBLE → SLOTS (never guessed). A design with Auto Layout +
 *     named variables is eligible (deterministic tokens); anything else is routed to the
 *     Phase-2 slot layer (human/AI review) — EXPLICITLY, never screenshot-to-code.
 *  4. AI-FREE (ADR-001). Structured data → tokens → model is a definite mapping. No AI here.
 *
 * Pure Node, ZERO dependencies. Fixture-tested with a canned Figma-export token JSON
 * (day20 PART 1p) — no Figma runtime required.
 */

import type { SlotDecl } from '../core/slots.js';

// ── Types — the normalized model input ───────────────────────────────────────────

/** The token kinds Thraksha ingests deterministically (W3C `$type`). Others → slots. */
export type TokenType = 'color' | 'dimension' | 'fontFamily' | 'fontWeight' | 'number';

/** One normalized design token: a flat dotted name → { type, value }. Value is a STRING (no float drift). */
export interface DesignToken {
  type: TokenType;
  value: string;
}

/** The whole normalized token set: sorted, canonical. Keyed by the flattened token path. */
export type DesignTokens = Record<string, DesignToken>;

/** The RAW W3C design-token JSON a Figma export produces (groups of `$type`/`$value`). */
export interface W3CTokenNode {
  $type?: string;
  $value?: unknown;
  [group: string]: unknown; // nested groups
}

/** The Figma export the plugin edge hands the core: the token JSON + the eligibility signals. */
export interface FigmaExport {
  /** The W3C design-token JSON (from getLocalVariablesAsync + collections). */
  tokens: W3CTokenNode;
  /** Whether the exported frames use Auto Layout (a Figma structural fact — required for eligibility). */
  autoLayout: boolean;
  /** Whether the exported variables are NAMED (a Figma fact — required for eligibility). */
  namedVariables: boolean;
  /** Component/frame names that carry design NOT expressible as tokens (→ slots). */
  unmappable?: string[];
}

/** The eligibility verdict: eligible ⇒ tokens; ineligible ⇒ slot declarations (the Phase-2 path). */
export type Eligibility =
  | { eligible: true; tokens: DesignTokens }
  | { eligible: false; slots: SlotDecl[]; reason: string };

// ── ingestDesignTokens — W3C token JSON → canonical DesignTokens (PURE) ────────────

/** The `$type`s Thraksha maps deterministically. An unknown `$type` is skipped (→ eligibility routes it). */
const MAPPED_TYPES: Record<string, TokenType> = {
  color: 'color',
  dimension: 'dimension',
  fontFamily: 'fontFamily',
  fontFamilies: 'fontFamily',
  fontWeight: 'fontWeight',
  fontWeights: 'fontWeight',
  number: 'number',
};

/** Coerce a W3C `$value` to a canonical STRING (exact; no float — mirrors the Day-27 decimal wire). */
function tokenValueToString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  // Composite values (e.g. shadow/typography objects) → canonical JSON with sorted keys.
  return canonicalJson(value);
}

/** Deterministic JSON: object keys sorted at every level; arrays in order. No clock/RNG. */
function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

/**
 * Flatten a W3C design-token tree into a canonical `DesignTokens` map. A node with `$value`
 * is a token (keyed by its dotted path); nested groups recurse. Deterministic: the result is
 * rebuilt in SORTED key order by `canonicalTokens`, so input order never leaks. Unknown/
 * unmapped `$type`s are DROPPED here (the eligibility gate decides routing).
 */
export function ingestDesignTokens(node: W3CTokenNode): DesignTokens {
  const out: DesignTokens = {};
  const walk = (n: unknown, path: string[]): void => {
    if (!n || typeof n !== 'object') return;
    const rec = n as Record<string, unknown>;
    if ('$value' in rec) {
      const t = typeof rec.$type === 'string' ? MAPPED_TYPES[rec.$type] : undefined;
      if (t) out[path.join('.')] = { type: t, value: tokenValueToString(rec.$value) };
      return;
    }
    for (const key of Object.keys(rec)) {
      if (key.startsWith('$')) continue; // $type/$description metadata, not a group
      walk(rec[key], [...path, key]);
    }
  };
  walk(node, []);
  return out;
}

/** The canonical `design-tokens.json` string — sorted keys, stable, byte-reproducible. */
export function canonicalTokens(tokens: DesignTokens): string {
  const keys = Object.keys(tokens).sort();
  const body = keys.map((k) => `  ${JSON.stringify(k)}: { "type": ${JSON.stringify(tokens[k].type)}, "value": ${JSON.stringify(tokens[k].value)} }`);
  return `{\n${body.join(',\n')}\n}\n`;
}

/** Is the DesignTokens map empty? (The buildFileSet artifact + the bypass hinge on this.) */
export function hasTokens(tokens: DesignTokens): boolean {
  return Object.keys(tokens).length > 0;
}

// ── figmaEligibility — the EXPLICIT gate (eligible → tokens; ineligible → slots) ───

/**
 * The eligibility gate (ecosystem line 141/182): Auto Layout + named variables REQUIRED.
 * Eligible ⇒ deterministic tokens. Ineligible ⇒ the design is routed to the Phase-2 SLOT
 * layer (human/AI review) — EXPLICITLY, with a reason, NEVER guessed / never screenshot-to-code.
 * Pure and total.
 */
export function figmaEligibility(exp: FigmaExport): Eligibility {
  const reasons: string[] = [];
  if (!exp.autoLayout) reasons.push('no Auto Layout');
  if (!exp.namedVariables) reasons.push('no named variables');
  if (reasons.length > 0) {
    // Ineligible: route the whole design to a review slot (never guess its structure).
    const slots: SlotDecl[] = [{ id: 'figma.review', type: 'design-review' }];
    for (const name of exp.unmappable ?? []) slots.push({ id: `figma.${name}`, type: 'design-review' });
    return { eligible: false, slots, reason: `Figma design not generator-eligible (${reasons.join(', ')}) — routed to slots for human/AI review` };
  }
  const tokens = ingestDesignTokens(exp.tokens);
  // Un-tokenisable components (present but not a variable) also route to slots — additively.
  return { eligible: true, tokens };
}
