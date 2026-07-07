/*
 * Thraksha — Typed content SLOTS: the declaration + placeholder mechanism (Eco-Day 21).
 *
 * The FIRST creative-side capability. Everything through Day 20 was STRUCTURAL (a definite
 * right answer; software builds it whole). A SLOT marks a spot where CREATIVITY is required
 * — a tagline, a product overview — that a human OR (Day 23, optional/detachable/developer-
 * keyed) an AI fills. This module is the STRUCTURAL half of the mechanism:
 *
 *   • SlotDecl        — a typed declaration ({ id, type }). Which slots exist, and each's TYPE.
 *   • SLOT_RENDERERS  — the type → "component" map: a slot's TYPE selects its placeholder.
 *   • unknownSection  — the graceful fallback for an unknown type (never a throw / silent drop).
 *   • renderSlotsSection — the clearly-marked, INERT markdown the README post-process appends.
 *
 * ── The determinism boundary (why this is safe) ─────────────────────────────────
 *  • Slot DECLARATIONS are STRUCTURAL input — an additive `ProjectState.slots` field (the
 *    same 4×-proven pattern as versions/integrations/description/style). They DRIVE the shell:
 *    buildFileSet renders one typed placeholder per declared slot. The default (no slots) is a
 *    LITERAL BYPASS — renderSlotsSection is never called, the README is byte-identical, the
 *    frozen backstop reproduces.
 *  • Slot CONTENT is a SEPARATE layer (slot-content.ts) that this module and buildFileSet
 *    NEVER import. The placeholder rendered here depends ONLY on the declaration — never on
 *    content — so the shell is byte-identical across empty/partial/full CONTENT states BY
 *    CONSTRUCTION (content is not an input to generation; cf. the Day-18 detection separation).
 *  • NO AI (ADR-001). Pure string templates over declarations. Deterministic: declared order,
 *    no clock/RNG/UUID. LF only. Pure Node, no dependency.
 */

/** One typed slot declaration — the STRUCTURAL intake (which slot, what type). */
export interface SlotDecl {
  /** Stable, unique id (e.g. "hero.tagline") — keys the separate content layer. */
  id: string;
  /** The slot TYPE — selects the placeholder "component" (SLOT_RENDERERS), with a fallback. */
  type: string;
}

/** A placeholder renderer ("component"): declaration → a clearly-marked, INERT markdown block. */
export type SlotRenderer = (decl: SlotDecl) => string;

/**
 * The shared marker every placeholder carries so a developer can SEE "this is a slot to fill"
 * and tooling can find it. Inert (an HTML comment) — it breaks no build and touches no code.
 * EMPTY IS VALID: the shell is complete and valid with the slot unfilled (Law 21, creative path).
 */
function marker(decl: SlotDecl, note: string): string {
  return `<!-- THRAKSHA-SLOT id="${decl.id}" type="${decl.type}" — ${note} (creative content; fill in the separate content layer. EMPTY IS VALID — the project is complete without it.) -->`;
}

/**
 * The type → "component" map. Each known TYPE renders a distinct placeholder. Day 21 ships
 * two proof types at the universal README site; richer per-stack sites are additive later
 * using this same map. All placeholders are inert markdown (a marker + a visible TODO).
 */
export const SLOT_RENDERERS: Record<string, SlotRenderer> = {
  // A short, one-line marketing headline.
  tagline: (d) => `${marker(d, 'tagline — a one-line headline')}\n> _TODO (tagline): write a one-line headline here._`,
  // A longer descriptive paragraph.
  overview: (d) => `${marker(d, 'overview — a short descriptive paragraph')}\n> _TODO (overview): write a short paragraph describing the project here._`,
};

/**
 * The UnknownSection fallback — a graceful, clearly-marked placeholder for a TYPE with no
 * renderer. It never throws and never silently drops the slot: the developer still sees a
 * marked "fill this manually" block. (Determinism-safe: still a pure function of the decl.)
 */
export const unknownSection: SlotRenderer = (d) =>
  `${marker(d, `unrecognized type "${d.type}" — no renderer, fill manually`)}\n> _TODO (${d.type}): unrecognized slot type — fill this section manually._`;

/** Render ONE slot: its TYPE selects the component; an unknown type falls back gracefully. */
export function renderSlot(decl: SlotDecl): string {
  return (SLOT_RENDERERS[decl.type] ?? unknownSection)(decl);
}

/**
 * The clearly-marked README section the buildFileSet post-process appends when slots are
 * declared. Slots render in DECLARED ORDER (deterministic). Returns '' for no slots — so the
 * post-process is a literal no-op and the README (and the frozen backstop) stay byte-identical.
 */
export function renderSlotsSection(slots: SlotDecl[]): string {
  if (slots.length === 0) return '';
  const blocks = slots.map(renderSlot).join('\n\n');
  return [
    '',
    '## Content slots (fill these)',
    '',
    '_These are clearly-marked CREATIVE placeholders. The structural project is complete and',
    'valid without them; fill each with your own content (or, optionally, an AI of your choosing)._',
    '',
    blocks,
    '',
  ].join('\n');
}
