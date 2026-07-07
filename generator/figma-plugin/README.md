# Thraksha Token Export — the Figma-plugin EDGE (Eco-Day 31)

**⚠️ This is FIGMA-RUNTIME code — it runs INSIDE Figma, NOT in Node.** It is the impure **edge**
of the Day-31 Figma ingestion split (the exact analogue of Day-18's `detect/probe.ts` live
probe and Day-23's `fill/fill-ai.ts` live AI call): the edge runs in Figma and produces a
`FigmaExport` JSON; the pure **core** ([`../src/figma/figma-ingest.ts`](../src/figma/figma-ingest.ts))
turns that JSON into a deterministic `design-tokens.json`.

## The honesty boundary (why this is here, not in `src/`)

- The Plugin API calls (`getLocalVariablesAsync`, `getLocalVariableCollectionsAsync`,
  `currentPage.children`, auto-layout) are **Figma's runtime** — **not runnable here**. So this
  edge lives OUTSIDE `src/` (tsc never compiles it into the generator), and the ingestion CORE
  is proven instead via a **canned `FigmaExport` fixture** — `day20:regress` **PART 1p**, CI-enforced.
- The live Figma export is therefore **wired-but-manual**: a developer loads this plugin against
  a real Figma file and copies the emitted JSON into Thraksha. The determinism guarantee is on
  the **core** (fixture-proven); the edge just gathers the structured data.
- **NOT the Enterprise-only Variables REST API** — the **Plugin API** (works on all paid plans).
  **No network** (`manifest.json` → `networkAccess: none`). **No AI.** Structured design data only —
  **never a screenshot / image-to-code.**

## The contract (edge → core)

The plugin emits exactly the core's `FigmaExport` shape:

```jsonc
{
  "tokens":  { /* W3C design-token JSON: groups of { "$type": "color|dimension|fontFamily|...", "$value": ... } */ },
  "autoLayout": true,       // do the exported frames use Auto Layout?  (required for eligibility)
  "namedVariables": true,   // are the variables named?                 (required for eligibility)
  "unmappable": ["HeroBanner"] // design NOT expressible as a token → routed to slots (human review)
}
```

`figmaEligibility(export)` then decides: **eligible** (Auto Layout + named variables) → tokens →
`design-tokens.json`; **ineligible** → `SlotDecl[]` (the Phase-2 slot / human-review path), explicit,
never guessed.

## Build & load (in Figma, by the developer)

1. Build `code.ts → code.js` with the Figma plugin toolchain (`@figma/plugin-typings` + tsc/esbuild).
2. In Figma: *Plugins → Development → Import plugin from manifest…* → this `manifest.json`.
3. Run it on a design that uses **Auto Layout + named variables**; copy the emitted JSON.
4. Feed the JSON to Thraksha (`ingestDesignTokens` / `figmaEligibility`) → a deterministic
   `design-tokens.json` in the generated project.
