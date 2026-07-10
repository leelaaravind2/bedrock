# Eco-Day 72 — CLOSE RECORD (EXECUTE session, Block A batched)

**MODE: EXECUTE close record** (the consolidated report is Day 75's). Factual per §6 of the block
brief. Baseline: Day 71 CLOSED + committed `ba258f9`; backstop 203/0; MAXIMAL `366e19d9` unmoved.

**Day-72 goal (one load-bearing thing):** *Create project* produces a **workspace** the tools attach
to — the diagram front and centre, with verbs that each call an EXISTING certified command. **Zero
new engine capability.**

---

## 1. What was built (files, precisely)

- **`desktop/src/main.js`**
  - Added the ABSTRACT project handle `let currentProject = null; // { name, choices, storeId? }`
    and `openWorkspace()` / `renderWorkspace()` (empty state vs. populated; auto-draws the diagram
    via `viewDiagram` → `flow_svg`).
  - Verbs: `editCurrentProject()` (re-enter the wizard), `exportCurrentProject()` (→ `export_project`,
    reads `#ws-export-dir`). Preview impact / Verify / Save-version reuse the existing
    `previewImpactOfEdit` / `verifyDeterminism` / `saveProject`.
  - `saveProject()` now sets `currentProject` and calls `openWorkspace()` after `save_blueprint`
    (Create = save only, then land in the workspace). `loadProject()` now routes to the workspace
    (was: wizard review).
  - The wizard end changed Review→**Create project** (`renderStep` Next label `Create project ▸`;
    `wizardNext` at review calls `saveProject`; `renderReview` button `Create project`). The old
    direct-to-folder `generate()` and its `#target-dir` input were **removed** (dead after the
    change; export is now a workspace verb). Advanced raw-export panel is unaffected.
  - `init` wires the new verbs (`ws-edit`, `ws-export`, `save-version`, `ws-goto-create`,
    `ws-goto-open`); `nav-workspace` → `openWorkspace`; `renderWorkspace()` called on load.
- **`desktop/src/index.html`** — the workspace screen rebuilt: an empty state (`#workspace-empty`)
  and `#workspace-body` (project header `#workspace-project-name`/`-sub` + the verb bar + the
  `#ws-export-dir` input + `#baseline-label`). The **Advanced corner** (`#advanced-corner`) hosts
  Compare + All-saved-projects + the raw harness, nested **inside** `#workspace-body` so it is
  absent on Welcome and while no project exists. All prior ids (`view-diagram`, `preview-impact`,
  `verify-determinism`, `compare-*`, `projects-*`, the `data-cmd` inputs) preserved.
- **`docs/daily/eco-block-A-ledger.md`** — updated after each task.

**NOT touched:** `desktop/src/wizard-choices.js`; any `generator/src/` file; `styles.css` (F11).

## 2. The abstract project handle — exactly how it is kept abstract (required by the brief)

`currentProject = { name, choices, storeId? }`. The workspace and every verb read **this object**,
never a bare SQLite row id threaded through the UI. `choices` (the BlueprintChoices) is the truth
the verbs operate on; `storeId` is **optional** metadata — present when the project came from / was
saved to the store, absent otherwise. Day 78 makes a canonical **file** the truth and demotes SQLite
to an index: because nothing in the UI depends on a row id (only on `currentProject.choices`), that
change is a store swap, not a workspace rewrite. A bare-row-id coupling would have forced Phase-B
rework — avoided.

## 3. Gates (pasted)

**A72-1 / A72-2 — harness unchanged + engine/serializer untouched:**
```
$ (cd desktop && npm run ui-cli)
  OK   ANCHOR TeamTracker  63/63 files · digest 9e01210c55a5 · == 9e01210c55a5 (full committed baseline)
  OK   five digests DISTINCT (5/5) — identical digests would prove nothing
  UI==CLI harness: PASS
$ git diff --stat generator/                → (empty)
$ git diff -- desktop/src/wizard-choices.js → (empty)
```
Inspected in a plain browser without Tauri (static server; unreproducible — no committed test;
PENDING (Leela)) [downgraded Day 75b/audit, F12-A]: Create → wizard; nav → Workspace shows the
**empty state** (`workspace-body` hidden ⇒ Advanced corner absent without a project); revealing the
body shows the verb bar (Edit / Preview impact / Verify / Export / Save version / Redraw diagram /
Flow map) and the Advanced corner (Compare, All saved projects, Detect, Flow map, Impact preview,
Scan, Export) nested inside it (`advanced-corner.closest('#workspace-body')` === body). Review end
now reads `Create project ▸` / `Create project`; the old `#target-dir` input is gone. **0 console
errors.**

**A72-3 — day close:**
```
Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  → 203 OK / 0 FAIL
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf  (UNMOVED)
$ git diff --stat generator/   → (empty)
$ git status --porcelain
 M desktop/src/index.html
 M desktop/src/main.js
 M docs/daily/eco-block-A-ledger.md
```

## 4. Proven vs PENDING (honesty)

- **PROVEN (non-GUI):** the serializer meaning is byte-identical (harness 5/5); engine + serializer
  untouched (empty diffs; backstop 203/0); the workspace STRUCTURE + router transitions + the
  Advanced-corner nesting rule (absent without a project) work and the app initializes error-free
  (live preview, plain browser).
- **PENDING — Leela's machine (the harness/backstop cannot prove DOM/Tauri wiring — F4):**
  - Welcome → wizard → Review → **Create → workspace** path works (save_blueprint round-trip).
  - Each workspace verb round-trips to its certified command with rendered engine output
    (Edit / Preview impact / Verify / Export / Save version; the diagram front-and-centre via
    `flow_svg`). PREVIEWED==REAL (PART 1w/1z) is in the backstop and unchanged — it does NOT prove
    the workspace wiring.
  A green backstop does NOT stand in for a workspace that was never clicked (plan A72-2 note).

## 5. Baseline record

No frozen hash moved (A72-3: 103 + MAXIMAL byte-identical). No re-baseline. No new baseline (the
workspace adds no engine capability — Move 11, no ceremonial PART).

## 6. Findings

- No new code findings. F11 (styles.css unused) and F1–F10 stand. `generate()` removed as dead code
  after the wizard-end change (documented above) — an intentional cleanup, not a scope creep.

## 7. Commit

`eco-day-72: Create→workspace + diagram-centred workspace with certified-command verbs + Advanced
corner (backstop green, 203 OK / 0 FAIL)`. Hash recorded in the ledger post-commit. Not pushed.
