/*
 * Thraksha — Typed content SLOTS: the SEPARATE CONTENT layer (Eco-Day 21).
 *
 * The CREATIVE half of the slot mechanism, quarantined from generation. Slot DECLARATIONS
 * ({ id, type }) are structural and drive the shell (slots.ts, imported by buildFileSet).
 * Slot CONTENT — the actual filled text — lives HERE, in a layer the generation path
 * NEVER imports. This is the Day-18 detection-separation pattern applied to the creative
 * path: as the detection report has no write-path into buildFileSet, slot content has no
 * write-path into the shell.
 *
 * ── Why this layer exists on Day 21 (mechanism only, no fill yet) ────────────────
 *  • It is the schema + holder the Day-23 FILL targets: a human OR (optional, detachable,
 *    developer-keyed) an AI writes SlotContent — NEVER the structural shell.
 *  • Because buildFileSet(model, plugin) never receives SlotContent (it is not a parameter,
 *    and neither regen.ts nor any plugin imports this module), the structural shell is
 *    BYTE-IDENTICAL across empty / partial / full content states BY CONSTRUCTION. Content
 *    literally cannot vary the shell — the same guarantee, and the same shape, as Day 18.
 *  • Law 21 (creative path): delete this layer / leave it empty → the project still generates
 *    completely and validly (the shell carries inert typed placeholders; no content required).
 *
 * NO AI (ADR-001) — this is a plain data layer. Pure Node, no dependency. Deterministic.
 */

import type { SlotDecl } from './slots.js';

/** The value filled into one slot. Minimal on Day 21 (a string); richer types are additive. */
export interface SlotValue {
  /** The creative content for this slot (a human's or, later, an optional AI's). */
  value: string;
}

/** The whole content layer: slot id → its filled value. Keyed to declarations by id. */
export type SlotContent = Record<string, SlotValue>;

/**
 * Build the EMPTY content scaffold for a set of declarations — every declared slot present
 * with an empty value. This is what "unfilled" looks like: a complete, keyed structure the
 * fill step (Day 23) overwrites per slot. It is NEVER applied to the shell here.
 */
export function emptyContent(decls: SlotDecl[]): SlotContent {
  const content: SlotContent = {};
  for (const d of decls) content[d.id] = { value: '' };
  return content;
}

/**
 * How "full" the content layer is, over a set of declarations: none / some / all slots
 * carry a non-empty value. A pure inspection helper (for tooling / the future fill UI) —
 * it reads content, it NEVER touches the shell.
 */
export function contentFillState(decls: SlotDecl[], content: SlotContent): 'empty' | 'partial' | 'full' {
  const filled = decls.filter((d) => (content[d.id]?.value ?? '') !== '').length;
  if (filled === 0) return 'empty';
  return filled === decls.length ? 'full' : 'partial';
}
