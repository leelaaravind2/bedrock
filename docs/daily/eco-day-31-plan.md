# Eco-Day 31 — PLAN: The Thraksha Figma plugin — token export `[3 days]`

**Phase 3, Day 31. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 31 is the **FIRST Phase-3 day** — a **NEW INPUT SURFACE** (a conceptual shift): Figma feeds the generator as **STRUCTURED DESIGN TOKENS**, never screenshots. A Figma plugin (NOT the Enterprise-only REST API) exports variables + component tree + auto-layout as **W3C design-token JSON → deterministic model input**. Eligibility: **Auto Layout + named variables required**; everything else → **slots / human review** (the Phase-2 path). Day 31 is the token **EXPORT + the deterministic ingestion round-trip** — an **INPUT** to the existing deterministic generator, **NOT a new generation feature**. **⚠️ FLAGGED plan-review day (new input surface — extra scrutiny). `[3 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §1.2 no AI in generation; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §"structural-vs-creative" + the Figma note (line 141: *Plugin API, not the Enterprise REST API; W3C token JSON; Auto Layout + named variables required; everything else → slots/human review*) + the risk note (line 182: *lack auto-layout/vars → the slot/human-review path; NEVER screenshot-to-code*) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 31 (lines 69–72) → [`eco-day-30-report.md`](eco-day-30-report.md) (Phase 2 certified; the `assembleBlueprint` seam is where new inputs attach; the **slot mechanism is the "not-eligible → slots" path Figma needs**; gate: 75 baked + 10 TeamTracker + non-hash 1c–1o) → the REAL `core/assemble.ts` (the additive-dimension seam) + Day-18 (`detect/`) & Day-23 (`fill/`) as the pure-core / impure-edge template.

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code — and it frames the honest scope):**
> - **There is NO existing design-token / theme / CSS surface** — `grep` for `designToken`/`theme`/`color`/`typography`/`css`/`tokens.json` in `core` + the plugins' `entity-codegen.ts` → **0**. The generator is backend-focused (5 REST stacks + a minimal Spring React frontend `App.jsx`/`index.html`). **So Figma design tokens have no consumer today** — Day 31 introduces BOTH a design-token **input** layer AND a deterministic **output** artifact (the round-trip's "generated shell").
> - **The `assembleBlueprint` additive-dimension seam is the attach point** (`core/assemble.ts`): `BlueprintChoices` already carries optional `versions?/style?/integrations?/description?/slots?/entities?`, each defaulting to a literal bypass (setter fires only when supplied). **A `designTokens?` dimension follows the identical, 6×-proven pattern** — so round-trip/UI==CLI determinism is **structural** (the same `assembleBlueprint` → the same `ProjectState` → byte-identical output).
> - **The slot mechanism (Day 21) is the ready-made "ineligible → slots" target.** An INELIGIBLE Figma design routes to **`SlotDecl[]`** (the Phase-2 slot layer) — no new mechanism needed; the eligibility gate reuses the existing typed-slot path.
> - **THE FIGMA BOUNDARY (honesty, critical):** `getLocalVariablesAsync()` / `getLocalVariableCollectionsAsync()` are **Figma's plugin RUNTIME** — NOT available here. So Day 31 MUST separate: **(a) the deterministic INGESTION CORE** (token JSON → model input — fixture-testable HERE with a **canned Figma-export token JSON**, CI-enforceable) from **(b) the Figma-plugin EDGE** (the in-Figma export producing the token JSON — **NOT runnable here**, honest-manual). The exact Day-18 (`detect-core`/`probe`) and Day-23 (`fill-core`/`fill-ai`) split.
> - **The Style-Dictionary question, pre-answered by the pattern:** the token→model mapping is **pure-Node JSON parsing** (W3C design tokens are `$type`/`$value` JSON). **Style Dictionary is NOT needed as a Thraksha core dep** — `deps {}` stays (the same finding as decimal-libs Day 27 / ORM-vs-query Day 25). If ever used for richer transforms it is a **build-time / generated-project** concern, isolated.

---

## 0. What Day 31 is — the first Phase-3 day, a NEW INPUT SURFACE

Phase 2 governed inputs (framework/version, org-policy, wizard) and added the creative layer (slots + fill) and depth. **Phase 3 opens a NEW way to FEED the generator: Figma → structured design tokens → the same deterministic model.** Day 31 does the **ingestion**: a Figma export (W3C token JSON) becomes a deterministic model input that produces a deterministic output artifact — reproducible byte-for-byte. It is **not** a new generation feature; it is a new **front door** onto the existing deterministic engine, quarantined so the Figma runtime never touches determinism.

---

## 1. THE DETERMINISM SPINE (a NEW load-bearing property: ROUND-TRIP determinism)

1. **ROUND-TRIP DETERMINISM (the new property).** The SAME Figma-export token JSON → **byte-identical model input** (`DesignTokens`) → **byte-identical generated shell** (a canonical `design-tokens.json` artifact), twice-identical. The chain Figma-data → token-JSON → model-input → generated-shell is reproducible. A Figma-derived project records its **own additive baseline** (never replacing a frozen hash).
2. **The DEFAULT (no Figma input) is a LITERAL BYPASS.** A project built without Figma reproduces the frozen backstop byte-identical (**75 baked + 10 TeamTracker + non-hash gates 1c–1o**). Figma is an **ADDITIVE** input surface (the `designTokens` dimension defaults empty ⇒ no artifact emitted ⇒ byte-identical). **Proof (execute):** `rm -rf dist && npm run build && npm run day20:regress` → PASS, byte-identical. **A moved frozen hash = a FINDING, STOP.**
3. **The ELIGIBILITY gate is explicit — never guessed.** A design with **Auto Layout + named variables** → eligible → tokens → model. A design **lacking** them → **routed to SLOTS** (the Phase-2 slot/human-review path), deterministically and explicitly. **NEVER** screenshot-to-code, never a probabilistic guess (§structural-vs-creative; ecosystem line 182).
4. **Figma ingestion is DETERMINISTIC + AI-FREE (ADR-001 holds for the new surface).** Structured data → tokens → model is a definite mapping (sorted keys, canonical); **no AI in the ingestion path.** An ADR-001 sweep confirms 0 AI refs in `figma/`.

---

## 2. THE ARCHITECTURE — a pure ingestion CORE + an impure Figma-plugin EDGE (the Day-18/23 pattern)

Split so determinism is protected **by construction** and the Figma runtime is quarantined:

### 2.1 The pure ingestion CORE (`figma/figma-ingest.ts`) — deterministic, fixture-testable, no Figma, no AI
Pure functions over the **token JSON** (a canned Figma export — no Figma runtime, no network, no AI):
- **`ingestDesignTokens(tokenJson) → DesignTokens`** — parse the **W3C design-token JSON** (`$type` ∈ color/dimension/typography/fontFamily…, `$value`, grouped) into a **normalized, canonical `DesignTokens`** structure (deterministic: sorted keys, stable order). Pure JSON→object math.
- **`figmaEligibility(figmaExport) → { eligible: true; tokens: DesignTokens } | { eligible: false; slots: SlotDecl[]; reason: string }`** — the explicit gate: **Auto Layout + named variables present ⇒ eligible** (produce tokens); **absent ⇒ ineligible** (route the un-mappable design to `SlotDecl[]` — the Phase-2 slot layer — with a clear reason). Deterministic, total, never guesses.
- **`canonicalTokens(tokens) → string`** — the canonical `design-tokens.json` serialization (sorted keys; the digest convention's determinism).
These are **pure** ⇒ **fixture-tested with a CANNED token JSON** (an eligible export + an ineligible one) — deterministic, no Figma required, added to `day20:regress` (**new PART 1p**, CI-enforced — the PART-1j/1l analogue). This is the **load-bearing testable deliverable.**

### 2.2 The model attachment + the output artifact (additive, default-bypass)
- **`BlueprintChoices.designTokens?: DesignTokens`** (or `figma?: FigmaExport`, ingested in `assembleBlueprint`) → **`ProjectState.designTokens`** (default `{}`/empty ⇒ literal bypass), threaded through `createProjectModel`/`restoreProjectModel` (`?? {}` back-compat) exactly like `slots`/`versions`. So Figma rides the canonical `assembleBlueprint` seam ⇒ **round-trip/UI==CLI structural.**
- **`buildFileSet` post-process:** when `designTokens` is non-empty, push a canonical **`design-tokens.json`** (root artifact — agnostic, universal, Law-25-clean, like the manifest) into the file set. Empty ⇒ **not pushed** ⇒ the README/backstop byte-identical (the literal bypass). *(Per-stack consumption — Spring frontend CSS variables — is future/out-of-scope; Day 31 emits the agnostic tokens artifact.)*

### 2.3 The impure Figma-plugin EDGE (`figma/plugin/` — Figma-runtime, honest-manual)
The in-Figma plugin (a Figma `manifest.json` + `code.ts`) that runs INSIDE Figma: `getLocalVariablesAsync()` + `getLocalVariableCollectionsAsync()` + the component tree + auto-layout → the **W3C token JSON** the core ingests. **NOT runnable here** (Figma is the runtime). **Honest:** the core is proven via a **fixture token JSON** (CI-enforced); the live Figma export is **wired-but-manual** (needs a Figma file + the plugin loaded — a developer runs it). This is the exact honesty split of Day-18's live probe / Day-23's live AI call.

> **Why determinism-safe by construction:** the Figma runtime lives ONLY at the edge (`figma/plugin/`), which produces a JSON artifact; the core is a pure function of that JSON; the `designTokens` layer is additive (empty ⇒ bypass). No Figma value reaches generation except as a deterministic, canonical token → the `design-tokens.json` artifact. `deps {}` stays (pure-Node parsing).

---

## 3. What the plan resolves (answered by the real code + the honest Figma boundary)

1. **WHERE Figma attaches:** the `assembleBlueprint` seam — `designTokens?` → `ProjectState.designTokens` (additive, default-bypass). Round-trip/UI==CLI structural (§2.2).
2. **WHAT maps / what does NOT:** W3C design tokens (**color / dimension / typography / fontFamily** — `$type`/`$value`) → the normalized `DesignTokens` → the `design-tokens.json` artifact. What does **NOT** map — component layouts, non-variable styling, arbitrary visual design — routes to **slots** (§2.1 eligibility). Be precise: Figma **variables/tokens** map; Figma **pixels/layout-beyond-tokens** do not (→ slots).
3. **The ELIGIBILITY gate:** `figmaEligibility` — Auto Layout + named variables ⇒ eligible (tokens); else ⇒ slots, explicit + deterministic (§2.1).
4. **THE FIGMA BOUNDARY:** the ingestion CORE (fixture token JSON, CI-enforced) vs the Figma-plugin EDGE (Figma-runtime, honest-manual) — §2.1/§2.3. The core is the provable heart; the live export is honest-manual.
5. **The Style-Dictionary / dep finding:** the token→model mapping is **pure-Node** — Style Dictionary NOT a Thraksha core dep (`deps {}` stays); isolated as a build-time/generated-project concern if ever used (§Grounded).

---

## 4. STAGING (`[3 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### Stage 1 — the deterministic ingestion CORE + fixture + the default-bypass gate + the output artifact
- **DC-1:** `figma/figma-ingest.ts` — `ingestDesignTokens` (W3C token JSON → canonical `DesignTokens`), `canonicalTokens`. Pure-Node, AI-free, `deps {}`. The `designTokens` additive layer on `ProjectState` + the `buildFileSet` `design-tokens.json` post-process (empty ⇒ not pushed).
- **DC-2 (fixtures — new PART 1p, CI-enforced):** a **canned W3C token JSON** → `ingestDesignTokens` → the expected canonical `DesignTokens`; `canonicalTokens` deterministic (sorted). No Figma, no network, no AI.
- **DC-3 (DEFAULT = LITERAL BYPASS — load-bearing):** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full backstop byte-identical (75 baked + 10 + non-hash). No `designTokens` declared ⇒ no `design-tokens.json` ⇒ no frozen hash moves. **A moved hash = a finding, STOP.**

### Stage 2 — the eligibility gate (→ slots) + round-trip determinism + the assembleBlueprint seam
- **DC-4 (ELIGIBILITY):** `figmaEligibility` — an **eligible** fixture (auto-layout + named vars) → tokens → model → `design-tokens.json`; an **ineligible** fixture → **`SlotDecl[]`** (the Phase-2 slot path) + a clear reason. **Prove both branches** (fixture-tested).
- **DC-5 (ROUND-TRIP DETERMINISM):** the same token JSON → byte-identical `DesignTokens` → byte-identical `design-tokens.json` (twice-identical); a Figma-derived project (settings + `designTokens`) via `assembleBlueprint` → its **own additive baseline** (recorded, twice-identical; never replacing frozen). **UI==CLI** for the Figma-derived blueprint (assembleBlueprint == the programmatic path).

### Stage 3 — the Figma-plugin EDGE (honest-manual) + invariants + the honesty split
- **DC-6:** the Figma-plugin EDGE — `figma/plugin/manifest.json` + `code.ts` (`getLocalVariablesAsync` + `getLocalVariableCollectionsAsync` + component tree/auto-layout → token JSON). **Wired; NOT runnable here** (Figma runtime). Honest: the core is proven via the fixture token JSON; the live export is manual (a developer runs it in Figma). The plugin's output contract == the fixture token-JSON shape.
- **DC-7 (invariants + ADR-001 sweep):** generator **pure-Node** (`deps {}`, 0 native — no Style Dictionary core dep); **no frozen hash moved** (default); Figma ingestion **AI-free** (0 AI refs in `figma/`); the round-trip deterministic; the `figma/` layer has no unexpected write-path into generation beyond the additive `designTokens` layer.

**Execute scope guard (every stage):** only the Figma token EXPORT + the deterministic ingestion round-trip. **NOT** new project types (Day 34), **NOT** CI/CD gen (Day 38). Figma is an **ADDITIVE** input (absent ⇒ byte-identical; a moved default hash = a finding, STOP). The ingestion core stays **pure-Node** (`deps {}` — Style Dictionary isolated if ever used). **NO AI** in ingestion (ADR-001). **Ineligible design ⇒ slots** (never guessed). No signing. Commit to `main`. Don't compress the 3 days — the ingestion core + fixture is the provable heart; the live Figma export is honest-manual.

---

## 5. REPORT — done-conditions

[`eco-day-31-report.md`](eco-day-31-report.md): the **ingestion core** (token JSON → canonical `DesignTokens`, fixture-tested — PART 1p); the **round-trip determinism proof** (same token JSON → byte-identical model input → byte-identical `design-tokens.json`; the additive baseline); the **default-bypass proof** (no Figma ⇒ frozen backstop byte-identical, by construction); the **eligibility gate** (eligible ⇒ tokens; ineligible ⇒ slots — the Phase-2 path, explicit, both branches); the **Figma-plugin EDGE** (honest: Figma-runtime, wired-but-manual — the core is proven via the fixture, the live export needs Figma); the **finding** (Style Dictionary NOT a core dep — pure-Node parsing; `deps {}` stays); **invariants** (pure-Node, no frozen hash moved, ingestion AI-free). **Forward-flags:** `[3 days]` scope status (the ingestion core + fixture + eligibility + round-trip DONE + CI-enforced; the **live Figma export honest-manual**, not runnable here); **determinism ≠ validity** (the ingestion is deterministic; whether a design is *good* is not Thraksha's claim); what **Day 34** picks up (new project types — cron-worker + queue-consumer).

---

## 6. Scope guard — OUT for Day 31
- Only the Figma token EXPORT + the deterministic ingestion round-trip. **NOT** new project types (Day 34); **NOT** CI/CD gen (Day 38); **NOT** per-stack token consumption (frontend CSS — future).
- Figma is an **ADDITIVE INPUT** — absent ⇒ byte-identical. **A moved default hash = a FINDING, STOP** (never a re-baseline).
- The ingestion core stays **pure-Node** (`deps {}` — Style Dictionary isolated/build-time if ever used, never a core dep).
- **NO AI** in ingestion (ADR-001). **Ineligible design ⇒ slots** (never guessed / never screenshot-to-code).
- No signing. **`[3 days]`** — don't compress; the live Figma export is honest-manual.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + ecosystem (structural-vs-creative + the Figma note) + Month-2 Day 31 + Day-30 report + the real `assembleBlueprint` seam + Day-18/23 edge pattern? — ✅ (this session).
2. Only Day-31's job (Figma token ingestion round-trip)? — yes; **not** new types, **not** CI/CD, **not** per-stack consumption.
3. Which frozen baselines must NOT move? — **all** (75 baked + 10 TeamTracker + non-hash). The `designTokens` layer is additive; empty ⇒ no artifact ⇒ `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none** (ADR-001; the ADR-001 sweep is DC-7). Figma ingestion is deterministic structured-data parsing.
5. Default/empty path a literal bypass? — **yes**: no `designTokens` ⇒ no `design-tokens.json` ⇒ frozen backstop byte-identical (the same additive-dimension pattern as slots/versions).
6. Three killers checked? — no clock/RNG/UUID in ingestion (canonical, sorted); LF only; stable order (sorted token keys). The Figma runtime is quarantined at the edge; no Figma value reaches generation except as a deterministic token.
7. A gate that can actually FAIL? — **DC-3** (a moved default hash ⇒ Figma leaked into the frozen backstop), **DC-2/DC-5** (ingestion non-deterministic / round-trip differs), **DC-4** (ineligible design NOT routed to slots — silently guessed), **DC-7** (an AI ref in `figma/`, a Style Dictionary core dep, a native module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming the **live Figma export** works when only the **fixture token JSON** was tested (§4 honesty — the core is CI-proven, the live export is Figma-runtime manual); (ii) **screenshot-to-code** creep (forbidden — ineligible ⇒ slots); (iii) a **Style Dictionary core dep** (must stay `deps {}` — pure-Node parsing); (iv) an **AI** touchpoint in ingestion (ADR-001); (v) a moved default hash silently re-baselined (a finding, STOP) — all guarded.

---

*Day 31 opens Phase 3 with a new input surface, quarantined so determinism is untouched: Figma feeds the generator as structured W3C design tokens (never screenshots), through a pure ingestion CORE (token JSON → canonical DesignTokens → a deterministic `design-tokens.json` artifact — fixture-testable HERE with a canned Figma export, CI-enforced) behind an impure Figma-plugin EDGE (the in-Figma `getLocalVariablesAsync` export — Figma-runtime, honest-manual). Tokens attach at the canonical `assembleBlueprint` seam as an additive `designTokens` layer, so round-trip and UI==CLI determinism are structural; the default (no Figma) is a literal bypass reproducing the frozen backstop; the same Figma file exported twice yields byte-identical model input and a byte-identical shell; an eligible design (auto-layout + named variables) becomes tokens while an ineligible one is routed explicitly to slots (the Phase-2 path), never guessed. The token→model mapping is pure-Node (Style Dictionary is not a core dep — `deps {}` stays), and ingestion is AI-free (ADR-001). The core is the CI-proven heart; the live Figma export is honest-manual. Day 34 picks up the first new project types — cron-worker + queue-consumer.*
