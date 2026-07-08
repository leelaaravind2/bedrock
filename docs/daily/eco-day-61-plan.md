# Eco-Day 61 — PLAN: THE CREATION WIZARD (core) — the end-user front door

**Day 61 — the first day of the sensation push (Days 61–70, the 70-day extension).** Days 1–60 delivered
the certified engine + the packaged Bedrock shell — but the front-end is a **thin command harness** (5
command buttons + raw-JSON `--model` textareas). Day 61 replaces the raw JSON with a **guided
step-through wizard** that collects `BlueprintChoices` and drives the **existing certified `export_project`
command** to produce a real, named project. **SHELL/UI ONLY over the already-certified engine.**

**This session is PLAN ONLY. No code, no builds.** It resolves the exact `BlueprintChoices` shape + enums,
the wizard UI shape, the choices→command wiring (the existing `--model` path — no new command), the
UI==CLI proof, and the honest build-here-vs-deferred split — from the real code.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. The exact shape the wizard collects (read live this session — the plan is built on it)

`BlueprintChoices` ([`generator/src/core/assemble.ts`](../../generator/src/core/assemble.ts)) — only
`settings` is required; every other dimension defaults to a literal bypass. Day 61 collects **only the
project-level `settings`** (entities are Day 62):

```
BlueprintChoices = { settings: PhaseASettingsInput, versions?, style?, integrations?,
                     description?, slots?, designTokens?, cicd?, security?, entities? }
PhaseASettingsInput = { projectName, projectType, backend, frontend, database }   // required
                    & { multiUser?, auth? }                                       // defaultable
```

**The enums (exact strings — from the real registries/types, NOT assumed):**

| Field | Values | Source |
|---|---|---|
| `projectName` | free text | `PhaseASettings` |
| `projectType` | `Web App` · `API-only` · `Cron Worker` · `Queue Consumer` · `CLI` · `GraphQL API` · `Static Site + API` (7) | `project-model.ts` |
| `backend` | `Spring Boot` · `Express` · `FastAPI` · `Django` · `Go` (5) | `plugins/registry.ts` `BACKENDS` |
| `frontend` | `React` · `None` | demos + the type↔frontend constraint |
| `database` | `PostgreSQL` · `MySQL` (2) | `plugins/database-registry.ts` |
| `multiUser` | boolean — **default `true`** (ADR-005 safe default) | `DEFAULTS` |
| `auth` | `Simple login` · `None` — **default `Simple login`** | `DEFAULTS` |

**The type↔frontend constraint (engine-enforced — a UI nicety only):** `createProjectModel` **forces
`frontend = None`** for the frontendless types (API-only / Cron Worker / Queue Consumer / CLI / GraphQL
API); only `Web App` + `Static Site + API` keep a chosen frontend. The wizard MAY mirror this (auto-set /
disable frontend for those types) as progressive disclosure, but **the engine is the source of truth** —
the wizard need not reimplement the rule; passing any choice yields the engine-normalized result.

---

## 1. THE WIRING — reuse the existing `--model` path (NO new command)

The wizard builds a **`BlueprintChoices` JSON object** from the collected selections and calls the
**existing** [`export_project`](../../desktop/src-tauri/src/commands.rs) command with
`{ targetDir, model: JSON.stringify(choices) }`:

- `export_project(target_dir, backend?, model?)` → `export.js` → **`--model` supplied ⇒
  `readModelArg(model)` ⇒ `assembleBlueprint(choices)`** (Day 52). When `model` is supplied, the `backend`
  arg is ignored (the model's `settings.backend` wins) — so the wizard passes **only `targetDir` + `model`.**
- **This is the Day-16 canonical seam:** the wizard is *just another producer* of the same
  `BlueprintChoices` the CLI/`--model` already assemble. **No new command, no new engine, no generation
  logic in JS** — the wizard collects data; the certified engine does the rest.
- **The demo bypass still works:** the existing command-harness path (no `--model`) is preserved (see §3).

**THIN-CLIENT boundary (load-bearing):** the wizard's `buildBlueprintChoices(selections)` is **pure data
assembly** — field assignments from dropdowns into a plain JSON object matching `BlueprintChoices`. It is
**NOT** generation logic (no `assembleBlueprint`, no `buildFileSet`, no model construction in JS — those
stay in the Node engine). Keep it a **pure function** (no DOM reads inside) so it is headlessly testable
(the UI==CLI proof, §4).

---

## 2. THE WIZARD UI (vanilla JS, no bundler, `window.__TAURI__.core.invoke`)

A guided step-through in `index.html` + `main.js` (same constraints as Day 55: no bundler → the global
`window.__TAURI__.core.invoke`; camelCase invoke args per Tauri v2 default). The flow (per the extension
doc's step list):

1. **App name** (text) → 2. **Backend** (select, 5) → 3. **Frontend** (select: React/None; auto-None +
   note for frontendless types) → 4. **Database** (select: PostgreSQL/MySQL) → 5. **Auth** (select: Simple
   login/None; `multiUser` a default-on checkbox) → 6. **Project type** (select, 7).
- **Navigation:** Back/Next across the steps + a **Review** step showing the assembled choices, then
  **"Generate / Export to a folder"** (a target-dir input → `export_project`).
- **Result rendering:** reuse the Day-53 `SidecarResult` branches (clean exit 0 = "project written to
  <dir>"; other/again env-error) — the same renderer already in `main.js`.
- **Ends in a real, named project:** `export_project` writes the standalone tree for the wizard's
  blueprint. *(Day 61's blueprint is settings-only — a real project shell; entities/fields/relationships
  are Day 62; the linked map view is Day 63.)*

### 2.1 Keep the harness as "Advanced / raw commands" (non-destructive)
The wizard is the **primary front door**, but the existing 5-command harness (scan / flow-map / impact /
detect + the raw `--model` textarea) is **kept in a collapsed "Advanced" section** — so no command is
lost and power users keep the raw path. (Day 63 promotes flow-map/impact into the linked project view on
the wizard's blueprint.)

---

## 3. TEMPLATES — IN Day 61 (pre-filled BlueprintChoices; pure data)

Templates are **just pre-filled `BlueprintChoices` selection presets** (data, not engine logic) — the
extension doc flags them for folding into Day 61, and they are the **30-second first-open hook**. **IN
scope** (cheap + high-value):

- **Blank** — the empty step-through (choose everything).
- **A few presets** — e.g. **REST API** (`API-only` + Express + None + PostgreSQL), **CRUD app**
  (`Web App` + Express + React + PostgreSQL), **Worker** (`Cron Worker` + Express + None + PostgreSQL).
- Selecting a template **pre-fills the wizard selects** (all editable) — it does NOT bypass the flow or the
  engine. Templates are `const` objects in `main.js` (pure data); they add **no** engine logic and **no**
  new command. *(If execution shows a preset is more than trivial, it degrades cleanly to Day-62 — but the
  expectation is IN.)*

---

## 4. UI == CLI (load-bearing) — the wizard's blueprint == the CLI's for the same choices

The wizard reaches `assembleBlueprint` through the **identical `--model` seam** the CLI uses, so UI==CLI is
**structural, not coincidental** (the Day-16 property). The Day-61 proof:

- **Proof-by-construction:** `buildBlueprintChoices(selections)` emits a plain `BlueprintChoices` JSON with
  the exact field names + enum values the type defines (§0); `export_project` feeds it verbatim to the same
  `readModelArg → assembleBlueprint` path. The wizard adds **no** transformation the CLI wouldn't do.
- **Headless equivalence check (executable HERE):** because `buildBlueprintChoices` is a pure function, a
  Node harness can take representative selections → the wizard's `BlueprintChoices` JSON → run it through
  the generator's `assembleBlueprint` / `export.js --model` and confirm the assembled `ProjectState` (and
  the exported tree) is **byte-identical to the CLI's for the same choices** (e.g. the wizard's
  demo-equivalent choices reproduce the Day-52 `--model`-faithful result). This is the Day-52 "faithful"
  proof, now sourced from the wizard's serializer. **No divergence ⇒ UI == CLI.**
- **A moved hash is impossible from this** (no generator change); if the equivalence check diverged, the
  wizard's serializer is wrong (a UI bug) — fix the serializer, never the engine.

---

## 5. THE SPINE — generation untouched; thin client; honest

1. **THIN CLIENT:** the wizard collects `BlueprintChoices` + calls the **existing** `export_project`
   (`--model`). **No generation logic in JS**; the certified engine does the rest.
2. **UI == CLI (load-bearing):** the wizard's blueprint == the CLI's for the same choices (§4) — the same
   canonical seam.
3. **GENERATION UNTOUCHED:** no generator source change; the frozen backstop byte-identical (103 baked +
   10 TeamTracker + non-hash PART 1c–1x, 194 OK, MAXIMAL `366e19d9…`). **A moved hash = FINDING, STOP.**
4. **HONEST build-here vs deferred:** the wizard authored + the choices→command wiring proven-by-inspection
   + `node --check` + a static preview (layout/step-nav/guard) + the headless UI==CLI equivalence check are
   **HERE**; the **live packaged GUI click-through** (the wizard actually generating a project through the
   Tauri WebView) is **DEFERRED** to Leela's Windows machine — **no claimed live wizard run.**

### The generation-untouched proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` byte-identical.
- `git status --short` → only `desktop/` (the shell UI) + docs; **no `generator/` source**; `deps {}`
  unchanged (generator `dependencies` absent).

---

## 6. EXECUTE done-conditions

1. **THE WIZARD CORE:** `index.html` + `main.js` wired as a guided step-through (name → backend → frontend
   → database → auth → project type — **real selects from the actual enums** in §0) that assembles a
   `BlueprintChoices` JSON and drives the **existing `export_project` via `--model`**, ending in
   "Generate / Export to a folder." **A thin client — no generation logic in JS.** `node --check main.js`
   passes.
2. **TEMPLATES:** blank + a few preset `BlueprintChoices` starting points (pre-filled, editable) — IN
   scope (pure data). *(If demoted, documented why.)*
3. **UI == CLI (load-bearing):** the headless equivalence check — the wizard's `buildBlueprintChoices`
   output → `assembleBlueprint`/`export --model` == the CLI's for the same choices, byte-identical (the
   same canonical seam, no divergence).
4. **GENERATION UNTOUCHED:** the frozen backstop byte-identical (103 baked + 10 + non-hash, MAXIMAL
   `366e19d9…`); git shows only `desktop/` + docs; no generator source; `deps {}`. **A moved hash =
   FINDING, STOP.**
5. **Honest:** the wizard + wiring + `node --check` + static preview + the headless UI==CLI check are
   HERE; the **live packaged GUI generate is DEFERRED** (Leela's machine) — no claimed live wizard run.

## 7. REPORT done-conditions

`eco-day-61-report.md`: the wizard core (the step-through + the collected choices + the `--model`/command
wiring); templates (in or deferred); the UI==CLI proof (the wizard's blueprint == the CLI's); the
generation-untouched proof (backstop byte-identical, only `desktop/` + docs, `deps {}`); the thin-client
invariant; honest build-here vs deferred (the live GUI generate = Leela's machine). **Forward-flags:**
Day 62 (entities / fields / relationships in the wizard) + Day 63 (the linked project view); the updated
release punch-list.

---

## 8. SCOPE GUARD — OUT

- **NOT** entities/fields/relationships (Day 62); **NOT** the linked map view (Day 63); **NOT** the visual
  Map (Days 64–66).
- The wizard is a **THIN CLIENT** — no generation logic in JS (a reimplementation = a FINDING); it reuses
  the **existing `--model`/`export_project` path** (no new engine, no new command).
- **NO generator source change** — a moved hash = FINDING, STOP.
- The **live packaged GUI generate is Leela's-machine** (honest — no claimed live run).
- **`deps {}` stays; no AI in the product** (ADR-001); the wizard adds no dependency.
- Keep the raw command harness (Advanced mode) — **do not delete** scan/flow-map/impact/detect.

## 9. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-60/55/52 reports + the real code (`assemble.ts`,
   `project-model.ts`, `registry.ts`, `database-registry.ts`, `main.js`, `commands.rs`) — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; the wizard is shell/UI — moves
   nothing; proven anyway — **understood**.
4. AI touchpoints: **none** — the wizard is a thin client of the AI-free certified commands (ADR-001) —
   **yes**.
5. The default/empty path a literal bypass: the demo/harness path (no `--model`) is preserved unchanged;
   `assembleBlueprint({settings})` defaults every other dimension to its bypass — **honored**.
6. The three determinism killers: N/A (no generator output touched — shell/UI only) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + `git status` + the headless UI==CLI check;
   a moved hash / a divergence = STOP — **yes**.
8. Overclaim / out-of-scope watch: no live GUI wizard run claimed; entities/maps not in scope; the harness
   preserved — **guarded**.

---

*Day 61 plan: the creation wizard core — the end-user front door, SHELL/UI over the certified engine. It
replaces the raw-JSON `--model` textareas with a guided step-through (app name → backend [Spring Boot /
Express / FastAPI / Django / Go] → frontend [React / None] → database [PostgreSQL / MySQL] → auth [Simple
login / None] → project type [the 7]) that assembles a plain `BlueprintChoices` JSON (settings-only this
day; entities are Day 62) and drives the EXISTING `export_project` command via the already-certified
`--model` path (`readModelArg → assembleBlueprint`, the Day-16 canonical seam) — no new command, no
generation logic in JS (the wizard's `buildBlueprintChoices` is pure data assembly; the certified engine
does the rest). Templates are IN scope (pre-filled `BlueprintChoices` presets — blank / REST-API / CRUD /
worker — pure data, the 30-second hook). UI == CLI is load-bearing and provable HERE via a headless
equivalence check (the wizard's serialized choices → `assembleBlueprint`/`export --model` == the CLI's for
the same choices, byte-identical — the Day-52 faithful proof sourced from the wizard). The raw command
harness is kept as a collapsed "Advanced" mode (scan/flow-map/impact/detect not lost). Generation
untouched: no generator source change, the frozen backstop byte-identical (103 baked + 10 + non-hash,
MAXIMAL `366e19d9…`), git only `desktop/` + docs, `deps {}`, no AI (ADR-001). Honest: the wizard + wiring +
`node --check` + static preview + the headless UI==CLI check are HERE; the live packaged GUI generate is
DEFERRED to Leela's Windows machine — no claimed live wizard run. Day 62 picks up entities/fields/
relationships; Day 63 the linked project view. No code this session — the plan governs the wizard core,
the first day of the sensation push.*
