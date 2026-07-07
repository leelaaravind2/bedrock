/*
 * Thraksha — Creative slot FILL: the PURE fill core (Eco-Day 23).
 *
 * The FIRST time AI touches Thraksha — confined exactly as the thesis demands. This module
 * is the PURE, AI-FREE core: it builds the fill SPEC (what an AI needs to fill a slot) and
 * ORCHESTRATES an INJECTED filler into the separate SlotContent layer. It contains NO AI,
 * NO network, NO key — the actual model call lives behind the impure edge (fill-ai.ts),
 * passed in as a `SlotFiller`. So the core is fixture-tested with a FAKE deterministic filler
 * (day20 PART 1l), exactly as detect-core.ts is fixture-tested with canned probe output.
 *
 * ── The determinism + detachability boundary (why this is safe) ──────────────────
 *  1. WRITES ONLY SlotContent. orchestrateFill returns a SlotContent object (slot-content.ts,
 *     the SEPARATE layer buildFileSet never imports). It NEVER returns/touches files, templates,
 *     or the model — it CANNOT reach the shell. Generation (buildFileSet) never imports this.
 *  2. DETACHABLE (Law 21, creative path). The fill is a POST-step invoked separately; generation
 *     runs first and completely without it. Delete this layer ⇒ the project still generates
 *     (shell + empty slots — the Day-21 mechanism). AI is NEVER the gate.
 *  3. DETERMINISM ≠ AI-OUTPUT. The core is deterministic GIVEN a deterministic filler (the
 *     fixture proves it). A REAL AI filler returns non-deterministic text — and that is FINE,
 *     because SlotContent is the NON-hashed creative layer, explicitly OUTSIDE the backstop.
 *     The core never feeds content back into generation (no write-path — cf. Day-18 detection).
 *  4. NO AI / NO NETWORK / NO KEY here. Pure Node, no dependency. Deterministic (declared order).
 */

import type { SlotDecl } from '../core/slots.js';
import type { ProjectState } from '../core/project-model.js';
import { emptyContent, contentFillState, type SlotContent } from '../core/slot-content.js';

/** Project-derived creative-prompt context — the FACTS an AI needs, derived purely from the blueprint. */
export interface FillContext {
  projectName: string;
  projectType: string;
  backend: string;
  /** A short, deterministic summary of the domain (entity names) to ground the creative fill. */
  entities: string[];
}

/** One fill request: which slot, its type, and the project context. The narrow fill boundary's input. */
export interface FillSpec {
  slotId: string;
  type: string;
  context: FillContext;
}

/**
 * The narrow FILL BOUNDARY (like Day-18's probe boundary): given a spec, return the content
 * string for that slot. The core takes this as an INJECTED argument — it never knows whether
 * the filler is a fake (fixtures) or the real AI edge (fill-ai.ts). A filler may reject/return
 * '' — the core treats that as "unfilled" (graceful; the slot stays empty, the shell is valid).
 */
export type SlotFiller = (spec: FillSpec) => Promise<string>;

/** Derive the project context (purely) from the blueprint — no AI, no I/O. */
export function fillContextOf(state: ProjectState): FillContext {
  return {
    projectName: state.phaseA.projectName,
    projectType: state.phaseA.projectType,
    backend: state.phaseA.backend,
    entities: state.entities.map((e) => e.name), // stable model order
  };
}

/**
 * Build one FillSpec per DECLARED slot, in declared order. Pure over (decls, context). This is
 * what the fill step hands the filler — it depends ONLY on structural declarations + the
 * blueprint context, never on any existing content (so it is deterministic).
 */
export function buildFillSpecs(decls: SlotDecl[], context: FillContext): FillSpec[] {
  return decls.map((d) => ({ slotId: d.id, type: d.type, context }));
}

/**
 * Orchestrate a fill: call the injected filler per spec (in order) and assemble the results
 * into a SlotContent, starting from the empty scaffold. Deterministic GIVEN a deterministic
 * filler. Writes ONLY SlotContent — it returns the content layer, never files/structure.
 *
 * A filler that throws or returns '' leaves that slot empty (graceful — never a crash, never
 * a partial-file). So a filler failure degrades to "unfilled", and the shell stays valid.
 */
export async function orchestrateFill(specs: FillSpec[], filler: SlotFiller): Promise<SlotContent> {
  const content: SlotContent = emptyContent(specs.map((s) => ({ id: s.slotId, type: s.type })));
  for (const spec of specs) {
    try {
      const value = await filler(spec);
      if (typeof value === 'string' && value !== '') content[spec.slotId] = { value };
    } catch {
      // A filler failure ⇒ leave this slot empty (unfilled). Never propagate — the fill is an
      // optional enhancement; a failed/absent fill must not break anything (Law 21).
    }
  }
  return content;
}

/**
 * The whole pure fill, end to end over an injected filler: derive context → build specs →
 * orchestrate. Returns the SlotContent + its fill-state. NO AI here — `filler` is injected.
 */
export async function fillSlots(
  state: ProjectState,
  decls: SlotDecl[],
  filler: SlotFiller,
): Promise<{ content: SlotContent; state: 'empty' | 'partial' | 'full' }> {
  const specs = buildFillSpecs(decls, fillContextOf(state));
  const content = await orchestrateFill(specs, filler);
  return { content, state: contentFillState(decls, content) };
}
