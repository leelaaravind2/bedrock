# Eco-Day 31 — REPORT: The Thraksha Figma plugin — token export `[3 days]`

**Phase 3, Day 31 — the FIRST Phase-3 day, a NEW INPUT SURFACE.** Figma feeds the generator as **STRUCTURED DESIGN TOKENS** (never screenshots): a Figma plugin exports variables as **W3C design-token JSON**, and a pure ingestion core turns that JSON into a deterministic model input → a canonical **`design-tokens.json`** artifact. It is an **INPUT** to the existing deterministic engine, **NOT a new generation feature** — quarantined so the Figma runtime never touches determinism.

Plan: [`eco-day-31-plan.md`](eco-day-31-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §1.2 no AI in generation; §3 STOP-and-report; §4 honesty). Builds on [`eco-day-30-report.md`](eco-day-30-report.md) (Phase 2 certified; the `assembleBlueprint` seam; the slot mechanism as the "ineligible → slots" path).

---

## THE VERDICT

> ✅ **Figma token ingestion lands, determinism-safe by construction.** A pure ingestion **CORE** ([figma/figma-ingest.ts](../../generator/src/figma/figma-ingest.ts)) parses a Figma export's **W3C design-token JSON** into a canonical, sorted `DesignTokens` map (input order never leaks) and emits a deterministic **`design-tokens.json`** artifact. It attaches at the canonical `assembleBlueprint` seam as an **additive `designTokens` layer** (the 6×-proven pattern), so **round-trip + UI==CLI determinism are structural**. **ROUND-TRIP DETERMINISM (the new property):** the same token JSON → byte-identical model input → byte-identical shell (`f9a8e7c9…`, twice-identical). The **default (no Figma) is a literal bypass** — no `designTokens` ⇒ no artifact ⇒ the **75 baked + 10 TeamTracker + non-hash gates reproduce byte-identical** (→ 76 baked with the additive FIGMA baseline). The **eligibility gate is explicit**: Auto Layout + named variables ⇒ tokens; else ⇒ **routed to SLOTS** (the Phase-2 path) — never guessed, never screenshot-to-code. Ingestion is **AI-free** (ADR-001) and **pure-Node** (Style Dictionary NOT a core dep — `deps {}` stays).
>
> **The Figma-plugin EDGE is honest-manual** — it runs INSIDE Figma (not runnable here); the core is CI-proven via a canned fixture. `day20:regress`: **118 OK / 0 FAIL**.

---

## 1. The benchmark result (Execute DCs)

### Stage 1 — the ingestion core + fixture + default-bypass + the output artifact

**DC-1 — the pure ingestion CORE ✅** ([figma/figma-ingest.ts](../../generator/src/figma/figma-ingest.ts)): `ingestDesignTokens(tokenJson) → DesignTokens` (flatten W3C `$type`/`$value` groups → a canonical map), `canonicalTokens` (sorted-key serialization), `figmaEligibility` (the gate), `hasTokens`. **Pure-Node, zero deps.** The additive `designTokens` layer on `ProjectState` (getter/setter, threaded through `createProjectModel`/`restoreProjectModel` with `?? {}` back-compat) + the `designTokens?` dimension on `assembleBlueprint` + the `buildFileSet` `design-tokens.json` post-process (empty ⇒ not pushed).

**DC-2 — fixtures (new PART 1p, CI-enforced) ✅.** A canned W3C token JSON (deliberately **unsorted**) → `ingestDesignTokens` → the expected canonical `DesignTokens` (`color.primary`, `color.surface`, `font.body`, `spacing.md`, `spacing.sm` — sorted, no order leak); `canonicalTokens` twice-identical. **No Figma runtime** — fixture only.

**DC-3 — DEFAULT = LITERAL BYPASS (load-bearing) ✅.** Clean `build && day20:regress` → **PASS**, the full backstop byte-identical (75 baked + 10 TeamTracker + non-hash). No `designTokens` ⇒ `hasTokens` false ⇒ no `design-tokens.json` ⇒ **no frozen hash moved.**

### Stage 2 — the eligibility gate + round-trip determinism + the seam + UI==CLI

**DC-4 — the ELIGIBILITY gate ✅ (both branches).** An **eligible** export (auto-layout + named variables) → **5 tokens**; an **ineligible** export (no Auto Layout) → **`SlotDecl[]`** (`figma.review`, `figma.HeroBanner`, type `design-review`) + a clear reason (*"not generator-eligible (no Auto Layout) — routed to slots for human/AI review"*). Explicit, deterministic, **never guessed / never screenshot-to-code**.

**DC-5 — ROUND-TRIP DETERMINISM ✅.** A Figma-derived Express project (settings + `designTokens`) → **`f9a8e7c9…`**, twice-identical, recorded as the **FIGMA additive baseline** (PART 1p); the `design-tokens.json` artifact is emitted. Same token JSON → byte-identical model input → byte-identical shell.

**DC-6 — UI==CLI ✅.** `designTokens` through `assembleBlueprint` == the programmatic path, **byte-identical** (`f9a8e7c9…`) — the canonical seam is structural.

### Stage 3 — the Figma-plugin edge + the ADR-001 sweep + invariants

**DC-7 — the Figma-plugin EDGE (honest-manual) ✅** ([figma-plugin/](../../generator/figma-plugin/)): `manifest.json` + `code.ts` (`getLocalVariableCollectionsAsync` + `getLocalVariablesAsync` + auto-layout detection → the `FigmaExport` JSON the core ingests) + a README. **Deliberately OUTSIDE `src/`** (tsc never compiles it — the build stays clean; it's built by the Figma plugin toolchain). **Honest: Figma-runtime, NOT runnable here** — the core is proven via the canned fixture (DC-2). Plugin API (NOT the Enterprise REST API); `networkAccess: none`; no AI; structured data only.

**DC-8 — ADR-001 sweep + invariants ✅.** **0 real AI/network calls** in `src/figma` (the one textual "AI" match is `human/AI review` in the slot-routing message — the Phase-2 human-OR-AI fill option, not a call). Generator **pure-Node** (`deps {}`, 0 native — **no Style Dictionary core dep**); **no frozen hash moved** (default); `figma-ingest` is imported by the core only for the **gated, additive** artifact emit (`canonicalTokens`/`hasTokens` in `buildFileSet`) + the type — a deterministic input→output, correctly distinct from detect/fill (which are inform-only, 0-core-refs).

---

## 2. The finding + the honest boundary

- **No pre-existing token consumer (the finding).** The generator is backend-focused (5 REST stacks + a minimal Spring React frontend); there was **no design-token/theme/CSS surface**. So Day 31 introduces **both** the `designTokens` input layer **and** the deterministic `design-tokens.json` output artifact — the round-trip's "generated shell". *(Per-stack consumption — Spring frontend CSS variables — is future/out-of-scope; Day 31 emits the agnostic root artifact.)*
- **Style Dictionary is NOT a Thraksha core dep** (the decimal-libs / ORM-query finding again): the token→model mapping is **pure-Node JSON parsing** — `deps {}` stays. If ever used for richer transforms it is a build-time/generated-project concern, isolated.
- **THE FIGMA BOUNDARY (honesty, load-bearing):** the ingestion **CORE** is **CI-proven** via a canned `FigmaExport` fixture (PART 1p). The Figma-plugin **EDGE** is **wired-but-manual** — `getLocalVariablesAsync` etc. are Figma's runtime, **not runnable here**; a developer loads the plugin against a real Figma file and copies the JSON into Thraksha. The determinism guarantee is on the **core**; the edge gathers the structured data. (The exact Day-18 live-probe / Day-23 live-AI-call honesty split.)

---

## 3. What changed

- **New:** [`generator/src/figma/figma-ingest.ts`](../../generator/src/figma/figma-ingest.ts) (the pure ingestion core); [`generator/figma-plugin/`](../../generator/figma-plugin/) (`manifest.json` + `code.ts` + README — the Figma-runtime edge, outside `src/`).
- **Model:** `core/project-model.ts` (+`designTokens` field on `ProjectState`, getter/setter, threading with `?? {}` back-compat).
- **Seam:** `core/assemble.ts` (+`designTokens?` on `BlueprintChoices`).
- **Generation:** `core/regen.ts` (+the gated `design-tokens.json` emit — the ONLY generation-path touch, guarded by `hasTokens`).
- **Harness:** `day20-regression.ts` (+PART 1p — the ingestion fixtures, eligibility both branches, the round-trip additive baseline, default-bypass, UI==CLI).
- **Templates / plugins — UNTOUCHED.** No AI, no new dep, no native module, no frozen byte changed.

---

## 4. Forward-flags & honest boundaries

- **`[3 days]` scope status — DONE (core) + honest-manual (edge):** the ingestion CORE + fixture (PART 1p, CI-enforced) + the eligibility gate + round-trip determinism + the `assembleBlueprint` seam + UI==CLI are **complete**. The **live Figma export is honest-manual** (Figma-runtime — not runnable here; the core is fixture-proven).
- **Determinism ≠ validity:** the ingestion is deterministic (same Figma file → byte-identical model + shell); whether a design is *good* / complete is **not** Thraksha's claim — an ineligible design is explicitly routed to slots for human/AI review.
- **Verification level:** the ingestion core is **unit/fixture-verified** (Node, CI-enforced); a **live Figma round-trip** needs a Figma file + the plugin loaded (not available here). No live boot (Docker daemon down) — but the token artifact is a pure data output.
- **Phase-2 carried boundaries stand** (Express runtime / FastAPI·Django syntax / Go·Spring generation-only; no live DB boot; no live AI call; the Day-29 re-baseline state; packaged Rust detect pending; macOS/Linux desktop build deferred; 3-OS CI user-confirmed). Signing → Phase 4.
- **What Day 34 picks up:** the first new **project types** — cron-worker + queue-consumer (each producing new frozen baselines).

---

**Day 31 verdict, restated:** Phase 3 opens with a new input surface, quarantined so determinism is untouched. Figma feeds the generator as structured W3C design tokens (never screenshots), through a pure ingestion CORE (token JSON → canonical `DesignTokens` → a deterministic `design-tokens.json` — fixture-tested HERE with a canned Figma export, CI-enforced, PART 1p) behind an impure Figma-plugin EDGE (the in-Figma `getLocalVariablesAsync` export — Figma-runtime, honest-manual, deliberately outside `src/`). Tokens attach at the canonical `assembleBlueprint` seam as an additive `designTokens` layer, so round-trip and UI==CLI determinism are structural; the default (no Figma) is a literal bypass reproducing the frozen backstop (75 baked + 10 + non-hash byte-identical → 76 baked with the additive FIGMA baseline, 118 OK / 0 FAIL); the same Figma file exported twice yields byte-identical model input and a byte-identical shell (`f9a8e7c9…`); an eligible design (auto-layout + named variables) becomes tokens while an ineligible one is routed explicitly to slots (the Phase-2 path), never guessed. The token→model mapping is pure-Node (Style Dictionary is not a core dep — `deps {}` stays), and ingestion is AI-free (ADR-001). The core is the CI-proven heart; the live Figma export is honest-manual. Day 34 picks up the first new project types — cron-worker + queue-consumer.
