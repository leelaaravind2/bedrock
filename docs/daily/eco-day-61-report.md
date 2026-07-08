# Eco-Day 61 — REPORT: THE CREATION WIZARD (core) — the end-user front door

**Day 61 — the first day of the sensation push (Days 61–70).** The raw-JSON `--model` textareas are
replaced by a **guided step-through wizard** that collects `BlueprintChoices` and drives the **existing
certified `export_project` command** (via the already-proven `--model` path → `readModelArg →
assembleBlueprint`, the Day-16 canonical seam) to produce a real, named project. **SHELL/UI ONLY over the
certified engine — a THIN CLIENT: no generation logic in JS.**

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked digests + 10 TeamTracker + non-hash (PART 1c–1x), MAXIMAL `366e19d9…` — no
frozen hash moved.** `git status` → only `desktop/` (shell UI) + docs; **`generator/` untouched**; generator
`deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. The wizard core (DC-1, DC-2)

**The pure serializer (DC-1)** — [`desktop/src/wizard-choices.js`](../../desktop/src/wizard-choices.js): a
**DOM-free, window-free, engine-free** ES module. `buildBlueprintChoices(sel)` maps the wizard's fields →
the **exact `BlueprintChoices` JSON** the CLI/`--model` already accept (settings-only, Day 61). It is pure
**data assembly** — no `assembleBlueprint`, no `buildFileSet`, no model construction in JS (those stay in
the certified Node engine). Because it is pure + DOM-free, **Node imports it directly for the headless
UI==CLI proof** (§3).

**The exact enums collected (verbatim from the real registries — the dropdowns use these strings):**
| Field | Values |
|---|---|
| `projectType` | Web App · API-only · Cron Worker · Queue Consumer · CLI · GraphQL API · Static Site + API (7) |
| `backend` | Spring Boot · Express · FastAPI · Django · Go (5) |
| `frontend` | React · None |
| `database` | PostgreSQL · MySQL |
| `auth` | Simple login · None |
| `multiUser` | boolean (default true) |

**The wizard UI (DC-2)** — [`index.html`](../../desktop/src/index.html) + [`main.js`](../../desktop/src/main.js)
(an ES module — imports the pure serializer; the global `window.__TAURI__.core.invoke`, no bundler;
camelCase args per Tauri v2 default):
- A **guided step-through**: app name → project type → backend → frontend → database → auth (+ multiUser),
  one step at a time with Back/Next and a progress indicator, ending in a **Review** step that shows the
  assembled `BlueprintChoices` JSON + an "Export to folder" input + **"Generate ▸"**.
- **Generate** calls `invoke('export_project', { targetDir, model: JSON.stringify(choices) })` — the
  wizard is **just another producer of `--model`**, the SAME certified export path (no new command).
- **The type↔frontend constraint is mirrored** as a UI nicety (frontendless types → `frontend: 'None'`) —
  the engine remains the source of truth.
- **Result rendering** reuses the Day-53 `SidecarResult` branches (clean / findings / env-error).
- **Ends in a real, named project** — but **SETTINGS-ONLY** this day (a real project *shell*;
  entities/fields/relationships are Day 62 — stated honestly, not overclaimed as "a complete app").

**Templates (IN scope, pure data):** blank · REST API · CRUD app · Worker — pre-filled selection presets
(`const` data in `wizard-choices.js`), all editable; selecting one pre-fills the wizard and never bypasses
the flow or the engine. The **30-second first-open hook**.

**The raw command harness is KEPT** as a collapsed **"Advanced — raw commands"** `<details>` section
(detect / flow-map / impact / scan / raw-`--model` export) — nothing lost.

## 2. UI == CLI (DC-3, load-bearing) — the wizard's blueprint == the CLI's

A headless proof (`node`, importing the **real** `wizard-choices.js` + the **real** certified `export.js`)
run over all 4 templates:
1. **Serializer faithfulness:** `buildBlueprintChoices(sel)` **deep-equals** the canonical hand-built
   `BlueprintChoices` for `sel` — the wizard emits exactly what a CLI user would write.
2. **Engine equivalence:** feeding the wizard's JSON through `export.js --model` produces a project tree
   **byte-identical** to feeding the hand-built CLI equivalent — the SAME `assembleBlueprint` seam.

```
OK  blank    — choices deep-equal + export tree byte-identical (15 files, f95bc87d504d…)
OK  restApi  — … (15 files, 6f6e543a2aff…)
OK  crud     — … (15 files, 54b0852cb532…)
OK  worker   — … (15 files, fbc6c6e9aad2…)
UI==CLI: PASS (4/4) — the wizard is another producer of the SAME BlueprintChoices → the SAME
assembleBlueprint seam. No 2nd construction path.
```

The four **distinct** hashes prove the choices genuinely flow through to different real output (not
vacuous); each wizard tree == its CLI tree. **The wizard is not a second construction path** — it is the
Day-16 canonical property, sourced from the wizard's serializer (the Day-52 "faithful" proof).

## 3. Generation untouched (DC-4, load-bearing) + the thin-client invariant

- **Backstop byte-identical (from clean):** 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9deda1caf` — no
  frozen hash moved.
- **git scope:** only `desktop/src/index.html`, `desktop/src/main.js`, `desktop/src/wizard-choices.js`
  (new) + docs (`docs/THRAKSHA-MONTH-3 ex.md` — the governing extension doc, now tracked; the Day-61
  plan/report). **`generator/` untouched.**
- **`deps {}`** (generator `dependencies` absent); **no AI** (ADR-001) — the wizard is a thin client of
  the AI-free certified commands.
- **Thin client:** `buildBlueprintChoices` is pure data assembly; `main.js` only collects choices +
  invokes the existing command + renders `stdout`. **No generation logic in JS.**

## 4. Verification + the honest split (DC-5)

**Verified HERE:**
- `node --check` on `wizard-choices.js` + `main.js` — syntax OK.
- The **headless UI==CLI proof** (§2) — 4/4, byte-identical.
- **Static browser preview** (`python -m http.server` over `desktop/src`): the ES module **loaded with
  zero console errors** (the `.js` module resolves under the static server); the wizard rendered
  (templates, "Step 1 of 7", Back/Next, the Advanced section); **template application works** (Worker →
  `MyWorker` / `Cron Worker`); **step navigation + capture work** (walking to Review assembled
  `{ projectName: 'MyWorker', projectType: 'Cron Worker', backend: 'Express', frontend: 'None', … }` —
  the **frontendless constraint correctly forced `frontend: 'None'`**); the review shows the
  `BlueprintChoices` JSON + "Generate ▸" + the target-dir input; the no-backend guard fires correctly.

**DEFERRED (Leela's Windows machine — honest-manual):**
- The **live packaged GUI generate** — clicking through the wizard in the running Bedrock window →
  `invoke('export_project')` → a real project on disk. Needs the Tauri WebView + backend (no GUI session
  here). **No claimed live wizard run.** *(The static preview validates the wizard logic + the guard; the
  headless proof validates the choices→engine path; the live click-through is the only unproven leg.)*

**Note (rename):** `wizard-choices` ships as **`.js`** (not `.mjs`) — `desktop/package.json` is
`type: module`, so `.js` is already an ES module in Node (node --check + the headless import both work),
and it avoids a static-server `.mjs` MIME risk in the browser preview. Tauri serves both.

## 5. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **Wizard core** (settings-only, guided, UI==CLI, templates, Advanced kept) | **DONE (build-here)** |
| 1 | **Day 62 — entities / fields / relationships in the wizard** | NEXT (append to `BlueprintChoices.entities`; the engine already accepts them) |
| 2 | **Day 63 — the linked project view** (flow-map + impact + export on the wizard's blueprint via `--model`) | after 62 |
| 3 | **Days 64–66 — the visual/interactive Map** (the sensation) | Phase B |
| 4 | **Live packaged GUI wizard generate** | Leela's Windows machine (honest-manual) |
| 5 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 61 built the creation wizard core — the end-user front door, SHELL/UI over the certified engine. The
raw-JSON `--model` textareas are replaced by a guided step-through (app name → project type → backend
[Spring Boot / Express / FastAPI / Django / Go] → frontend [React / None] → database [PostgreSQL / MySQL]
→ auth [Simple login / None] + multiUser → Review) that assembles a plain `BlueprintChoices` JSON
(settings-only this day; entities are Day 62) via a PURE serializer (`wizard-choices.js`
`buildBlueprintChoices` — DOM-free, no generation logic) and drives the EXISTING `export_project` command
through the certified `--model` path (the Day-16 canonical seam) — no new command, no generation logic in
JS (the wizard collects data; the certified engine does the rest). Templates (blank / REST API / CRUD /
Worker) are IN as pure-data presets (the 30-second hook); the raw command harness is kept as a collapsed
"Advanced" section. UI==CLI is proven headlessly (4/4): the wizard's serialized choices deep-equal the
canonical CLI choices AND the `export --model` trees are byte-identical (15-file shells, 4 distinct hashes)
— the wizard is another producer of the SAME `assembleBlueprint` seam, not a second construction path.
Generation untouched: the frozen backstop byte-identical from clean (194 OK / 0 FAIL, 103 baked, MAXIMAL
`366e19d9…`), git only `desktop/` + docs, `generator/` untouched, `deps {}`, no AI (ADR-001). Verified
HERE: `node --check` + the headless UI==CLI proof + a static preview (module loads clean, wizard renders,
templates + step navigation + capture + the frontendless constraint + the review JSON all work, the
no-backend guard fires); the live packaged GUI generate is DEFERRED to Leela's Windows machine (no claimed
live wizard run); the Day-61 blueprint is SETTINGS-ONLY (a project shell — entities are Day 62, not
overclaimed). Day 62 picks up entities/fields/relationships; Day 63 the linked project view.*
