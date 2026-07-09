# Eco-Day 64 — PLAN: THE LINKED PROJECT VIEW — flow map + impact preview + export on YOUR blueprint

**Day 64 — the sensation push (Days 61–70).** Days 61–63 built the wizard (settings + data model) and the
blueprint store (save/load/list). Day 64 makes the maps run on the **user's OWN project**: the saved/loaded
blueprint flows into **flow map** and **impact preview** — including **the impact of the user's pending
edit** ("here's exactly what your change will do, before it does it"). **This is the first moment Bedrock
shows a developer something no AI tool can.** **SHELL/UI ONLY over the certified engine — a THIN CLIENT;
the engine computes the maps, JS renders stdout verbatim.**

**This session is PLAN ONLY. No code, no builds.**

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. The exact `--model` contracts (confirmed live this session — the day hinges on the pair)

From [`generator/src/map.ts`](../../generator/src/map.ts) / [`flow-map.ts`](../../generator/src/flow-map.ts)
+ [`commands.rs`](../../desktop/src-tauri/src/commands.rs):

| Command | `--model` shape | Notes |
|---|---|---|
| `flow_map(backend?, model?)` → `flow-map.js` | a **single** `BlueprintChoices` JSON | projects the declared model → the request-lifecycle / entity-graph (Day 50). |
| `impact_preview(backend?, model?)` → `map.js` | a **`{ current: BlueprintChoices, proposed: BlueprintChoices }` PAIR** JSON | each side `assembleBlueprint`-ed → `previewImpact(current, proposed)` (Day 47). |
| `export_project(target_dir, backend?, model?)` → `export.js` | a **single** `BlueprintChoices` JSON | already wired Day 61. |

- **When `--model` is supplied, the backend comes from each blueprint's `settings.backend`** (not the
  `--backend` arg) — so the UI passes **only `model`**, never `backend`.
- **NO new command, NO Rust change:** all three already accept `--model`. Day 64 is a **pure thin-client JS
  + docs** day. *(If execution finds a genuine gap, a thin shell-only arg change would be documented — but
  the contracts above show none is needed.)*

---

## 1. THE PROJECT VIEW (DC-1) — pick a saved project → its maps → edit → preview the edit

A **"Project view"** card in the wizard's left column (beside "My projects", Day 63), operating on the
**current wizard blueprint** (`buildBlueprintChoices(selections)`):

- **View flow map** → `invoke('flow_map', { model: JSON.stringify(buildBlueprintChoices(selections)) })`
  → renders the certified `renderFlowMap` text (the user's OWN entities/lifecycle/graph — not the demo).
- **Preview impact** → `invoke('impact_preview', { model: JSON.stringify({ current: <baseline>, proposed:
  buildBlueprintChoices(selections) }) })` → renders the certified `renderImpact` delta (exactly which
  files change).
- **Generate / Export** → `export_project` (already in Review, Day 61) — optionally surfaced here too.

### 1.1 The `current` (baseline) vs `proposed` (edited) — the honest pair (DC-2, load-bearing)
- **`baseline`** = the **last saved OR loaded** blueprint (held in JS as `baselineChoices` + a label),
  set in the Day-63 `saveProject` / `loadProject` handlers.
- **`proposed`** = the wizard's **current** `buildBlueprintChoices(selections)` (as the user has edited it).
- **The compelling flow (the extension doc's moment):** load a saved project (`baseline` = it) → change
  something in the Data-model step (add a field/entity/relationship) → **Preview impact** → the exact delta
  of *that edit*.
- **If no baseline yet** (a fresh project never saved/loaded): "Preview impact" shows a hint ("Save or load
  a project first to compare your edits against it") — impact needs a real `current` to diff against.
  **Never fabricate a baseline.**

### 1.2 Rendering — VERBATIM stdout, NO JS-computed diff (the load-bearing thin-client rule)
The UI builds the `{ current, proposed }` **pair JSON** (pure data — two `BlueprintChoices` objects, no
diff) and renders the command's **stdout verbatim** in the `#output` area. **The UI does NOT compute,
filter, reorder, or embellish the delta** — `previewImpact` (the engine) computes it; a JS-computed diff
would **break the PART-1w previewed==real guarantee** (a FINDING). Building the pair object is data
assembly, not a diff.

---

## 2. UI == CLI + PREVIEWED == REAL (DC-3, load-bearing) — the maps on the wizard's blueprint

A headless proof (`node`, importing the **real** wizard serializer + the **real** certified engine):

- **(a) flow_map on the wizard's blueprint — deterministic + faithful projection + UI==CLI:**
  `flow-map.js --model <buildBlueprintChoices(TeamTracker)>` → stdout **twice-identical** (a pure
  projection), **non-empty**, and **reflects the DECLARED entities** (Team/Application/Ticket/Comment +
  their belongs-to edges appear) — a projection of the declared model (Day 50), **not parsed from code**.
  Byte-identical to `flow-map.js --model <hand-built equivalent>` (UI==CLI).
- **(b) impact PREVIEWED == REAL for the user's edit (the star proof):** build the wizard pair
  `{ current: TeamTracker, proposed: TeamTracker + a new field on Ticket }`. Import `previewImpact` +
  `buildFileSet` + `assembleBlueprint` + `selectBackendPlugin` from the dist:
  - **previewed** = `previewImpact(assemble(current), assemble(proposed))` → the plan `{file, action}`.
  - **real** = the actual per-file diff of `buildFileSet(assemble(current))` vs
    `buildFileSet(assemble(proposed))` (added / changed / deleted / no-op by `relPath` + content).
  - **Assert the previewed changed-file SET == the real changed-file SET** (same files, same actions,
    same before/after) — the PART-1w guarantee, now for the **wizard's own blueprint pair**. The previewed
    delta is **exactly** what generation will do.
  - Also assert `map.js --model <pair>` stdout is deterministic (twice-identical).

→ **The maps run on the real blueprint and are truthful: flow_map == CLI; the previewed impact == the real
generation delta for the user's edit.** No second path, no JS diff.

---

## 3. THE SPINE — thin client; generation untouched; honest

1. **THIN CLIENT:** the UI passes blueprint(s) as `--model` to the **existing** certified commands; the
   engine computes the maps; **JS renders stdout verbatim — no generation logic, no JS-computed diff.**
2. **THE IMPACT PAIR IS HONEST (load-bearing):** `{ current: real saved blueprint, proposed: real edited
   blueprint }`; the delta is the certified `previewImpact` output (PART 1w: previewed == real). A
   JS-computed/filtered delta = a FINDING.
3. **THE MAPS RUN ON THE REAL BLUEPRINT:** flow_map/impact_preview driven by the user's blueprint via the
   already-proven `--model` path; **projections of the DECLARED model (Day 50), never parsed from code.**
4. **GENERATION UNTOUCHED:** no generator source change; the frozen backstop byte-identical (103 baked + 10
   + non-hash PART 1c–1x, 194 OK, MAXIMAL `366e19d9…`). **A moved hash = FINDING, STOP.**
5. **NO RUST CHANGE (confirmed):** the 3 commands already take `--model` → a JS-only day. The sidecar
   self-test + the 5 invokers are untouched (no `cargo` needed; note it).
6. **HONEST build-here vs deferred:** the view + wiring + the headless UI==CLI/previewed==real proof +
   `node --check` + a static preview are **HERE**; the **live packaged GUI click-through** (loading a
   project, viewing its maps, previewing an edit in the running Bedrock window) is **DEFERRED** to Leela's
   machine — **no claimed live run**. **TEXT maps this day** — the visual drawn diagram is Days 65–67
   (stated, not overclaimed).

### The generation-untouched proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` byte-identical.
- `git status --short` → only `desktop/` (shell UI) + docs; **no `generator/` source**; **no Rust change**
  (Cargo.toml unmodified); generator `deps {}`.

---

## 4. EXECUTE done-conditions

1. **THE PROJECT VIEW:** from a saved/loaded project — "View flow map" (`flow_map`, model = this blueprint),
   "Preview impact" (`impact_preview`, model = `{ current: baseline, proposed: edited }`), "Generate/Export"
   (`export_project`). Rendered as **TEXT (the engine's stdout, verbatim)**.
2. **THE IMPACT OF A REAL EDIT:** load a saved project → edit it (add a field/entity/relationship) →
   "Preview impact" shows the exact files that change (the certified `previewImpact` delta). **The UI
   renders the engine's output — NO JS-computed diff.**
3. **UI == CLI + PREVIEWED == REAL (headless):** flow_map + impact_preview on the wizard's blueprint ==
   the CLI's for the same model/pair; the previewed impact == the real generation delta (PART-1w machinery,
   for the wizard's blueprints).
4. **NO NEW ENGINE / NO NEW COMMAND (verified):** flow_map/impact_preview/export_project reused via
   `--model`. Thin client — no generation logic in JS.
5. **GENERATION UNTOUCHED:** frozen backstop byte-identical (103 baked + 10 + non-hash, MAXIMAL
   `366e19d9…`); git only `desktop/` + docs; no generator source; no Rust change (Cargo.toml unmodified);
   generator `deps {}`. **A moved hash = FINDING, STOP.**
6. **Honest:** the view + wiring + the headless proof + `node --check` + static preview HERE; the live
   packaged GUI click-through DEFERRED (Leela's machine); TEXT maps this day (visual = 65–67).

## 5. REPORT done-conditions

`eco-day-64-report.md`: the project view (pick saved → flow map → edit → preview impact → save/export); the
impact pair (`{ current: saved, proposed: edited }` — the real delta of the user's OWN edit); the UI==CLI +
previewed==real proof (the maps on the wizard's blueprint == the CLI's; the previewed delta == the real
generation delta); no new command/engine (reused `--model`); the generation-untouched proof; the
thin-client invariant (no JS-computed diff, stdout rendered verbatim); honest build-here vs deferred;
TEXT-maps-this-day (visual = 65–67). **Forward-flags:** Day 65 (the visual Map — the drawn diagram); the
punch-list.

---

## 6. SCOPE GUARD — OUT

- **NOT** the visual/drawn Map (Days 65–67 — this day is **TEXT maps**).
- The UI is a **THIN CLIENT** — it renders the engine's stdout **verbatim**; a **JS-computed diff/filtered
  delta = a FINDING** (it breaks previewed==real).
- **Reuse** the existing `flow_map`/`impact_preview`/`export_project` via `--model` — no new engine; a new
  command only if genuinely needed (shell-only + documented) — **confirmed none needed**.
- The maps are **projections of the declared blueprint** (Day 50), **never parsed from generated code**.
- **NO generator source change** — a moved hash = FINDING, STOP.
- The **live GUI click-through is Leela's-machine** (honest — no claimed live run).
- The generator's `deps {}`; **no AI** (ADR-001).

## 7. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-63/62/47/50/52 reports + the real code (`map.ts`,
   `flow-map.ts`, `commands.rs`, the wizard/store) — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; the maps are read-only projections —
   move nothing; a saved+loaded TeamTracker's flow/impact reproduce (not move) the certified behavior —
   **understood**.
4. AI touchpoints: **none** — thin client of the AI-free map commands (ADR-001) — **yes**.
5. The default/empty path a literal bypass: the maps' no-`--model` demo bypass is unchanged; the certified
   backstop stands; the view adds no generation path — **noted**.
6. The three determinism killers: N/A (no generator output touched — the maps are read-only) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + the headless previewed==real proof +
   `git status`; a moved hash / a previewed≠real divergence = STOP — **yes**.
8. Overclaim / out-of-scope watch: no live GUI run claimed; TEXT maps (not visual); no JS diff; no new
   command — **guarded**.

---

*Day 64 plan: the linked project view — the maps run on the USER'S project. Confirmed contracts (read
live): `impact_preview` takes `--model` = a `{ current, proposed }` BlueprintChoices PAIR (each
`assembleBlueprint`-ed → `previewImpact`), `flow_map` takes a single BlueprintChoices, `export_project` a
single BlueprintChoices — all already accept `--model`, so NO new command and NO Rust change (a pure
thin-client JS + docs day; the backend rides each blueprint's `settings.backend`). A "Project view" card
runs, on the current wizard blueprint: **View flow map** (`flow_map`, model = the blueprint → the user's own
entity-graph/lifecycle), **Preview impact** (`impact_preview`, model = `{ current: the last saved/loaded
baseline, proposed: the wizard's current edited blueprint }` → exactly which files the edit changes), and
**Generate/Export** (`export_project`, Day 61). The baseline is set on Day-63 save/load; the compelling
flow is load → edit → preview the delta of that edit. The UI builds the pair JSON (pure data — two
BlueprintChoices, no diff) and renders the command's stdout VERBATIM — the engine computes the delta
(`previewImpact`); a JS-computed diff would break the PART-1w previewed==real guarantee (a FINDING). The
load-bearing proof is headless: (a) flow_map on the wizard's TeamTracker is deterministic + a faithful
projection of the declared entities + byte-identical to the CLI; (b) impact PREVIEWED == REAL for a wizard
edit — the `previewImpact` plan's changed-file SET == the real `buildFileSet` diff of current vs proposed
(the PART-1w machinery, for the wizard's own pair). Generation untouched: no generator source change, no
Rust change (Cargo.toml unmodified), the frozen backstop byte-identical (103 baked + 10 + non-hash, MAXIMAL
`366e19d9…`), git only `desktop/` + docs, generator `deps {}`, no AI (ADR-001). Honest: the view + wiring +
the headless UI==CLI/previewed==real proof + `node --check` + a static preview HERE; the live packaged GUI
click-through DEFERRED to Leela's Windows machine (no claimed live run); TEXT maps this day — the visual
drawn diagram is Days 65–67. No code this session — this is the day the maps run on the user's project, and
Bedrock shows exactly what a change will do before it does it.*
