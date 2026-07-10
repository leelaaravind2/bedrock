# Eco-Day 72 — PLAN: the workspace (the new thing)

**MODE: PLAN.** No code, no build. Master Change Prompt filled. The block task table + the full
findings live in `eco-day-71-plan.md`; this document fills Day 72's slots only. Baseline `ff6e991`,
backstop 203/0, MAXIMAL `366e19d9` unmoved.

## THE STANDING INVARIANTS (verbatim)
1. Same input → byte-identical output; frozen 103+10+MAXIMAL byte-identical at every close. **A moved
   baked hash is a FINDING → STOP.**
2. Every new capability's default/empty/off path is a **literal bypass** reproducing the frozen
   hashes exactly (the manifest trap).
3. **Block A is SHELL/UI ONLY.** No `generator/src/` source changes. Existing PARTs unchanged. If a
   task appears to need an engine change, it is out of scope — say so.
4. The shell is a thin client. No generation logic, no JS diffs, no path heuristics in JS or Rust.
5. `generator/package.json` → `"dependencies": {}`. Any new Rust crate is deliberate and documented.
6. AI never in the generation path (ADR-001). No round-trip. No inference-import.
7. Claim only what is proven. Verify = reproducibility, never correctness. Law 21 = no FUNCTIONAL
   dependency; "no trace" is forbidden. Deferred = PENDING, named.
8. Stamp ≠ hash. The load-bearing claim: the bundled node reproduces the 103 frozen digests.
9. New root/new-dir files → explicit `.gitignore` un-ignore rule + `git status` shows the file.
10. No ceremonial proofs — every gate names the failure it catches.

> Rule 20 (gate after every step) is NOT suspended by the one-session batching.

## 1–3. Context / invariants / read-first
As `eco-day-71-plan.md` §1–3. Additionally read THIS day: the post-71 router in `main.js` /
`index.html`, and re-read `store_commands.rs` (`save_blueprint` returns `Result<i64,String>`).

## 4. The task
- **DAY-ID:** `eco-day-72`
- **GOAL (one load-bearing thing):** *Create project* produces a **workspace** the tools attach to —
  the diagram front and centre, with verbs that each call an EXISTING certified command.
- **WHY:** Day 71 made the app open on Welcome and flow through the wizard. The wizard's end today is
  a bare Review→Generate. A product ends the wizard at a *place you live in*: your project, its
  diagram, and the actions you take on it. This is the "new thing" of the arc — but it introduces
  **zero new engine capability**; every verb is a button over a command that is already certified.
- **DECIDED ALREADY:** **Create project = save the blueprint only** (`save_blueprint`). The blueprint
  IS the project; **export is a later, explicit verb** from the workspace, not a side effect of
  Create. The old raw command harness moves to an **Advanced corner** of the workspace — reachable
  only once a project exists, **never on Welcome**.
- **IN SCOPE:** the Review screen → **Create** → **workspace**. Workspace = the diagram front and
  centre + the verbs **Edit** (re-enter the wizard on this blueprint) / **Preview impact** / **Verify**
  / **Export** / **Save-versions**, plus the **Advanced corner** hosting the existing harness. Each
  verb calls an EXISTING certified command (`export_project`, `impact_preview`, `impact_nodes`,
  `flow_svg`, `save_blueprint`) with rendered engine output.
- **OUT OF SCOPE (explicit):** compare-in-workspace polish (existing Compare stays reachable via the
  Advanced corner); any file-on-disk linkage (Day 78/79); any `buildBlueprintChoices`/serializer
  change; any new engine capability or `generator/src/` file; the Stack regroup (Day 73).
- **FORWARD-COMPAT — load-bearing (Rule from the Forward Plan):** do **NOT** bake in "a project == a
  SQLite row." Day 78 makes a **file** the truth and SQLite the index. **Keep the workspace's project
  handle abstract** — a handle object (e.g. `{ name, choices, storeId? }`) that the workspace reads,
  never a bare row id threaded through the UI. In the plan for A72-1 state exactly how the handle is
  kept abstract; a hard-coupled row id creates Phase-B rework.
- **DESIGN NOTES (resolved by reading code):** the verbs already exist as functions in `main.js`
  (`viewDiagram`, `previewImpactOfEdit`, `verifyDeterminism`, `generate`, `saveProject`,
  `compareVersions`) wired to the current cards. The workspace re-homes these behind a single project
  context; it does not re-implement them. `setBaseline(choices,label)` already snapshots the saved/
  loaded blueprint as the impact "current" — the abstract handle can wrap that.

## 5. Done-conditions
1. Full path **Welcome → wizard → Review → Create → workspace** works. — PENDING (Leela) live.
2. Each verb round-trips to its certified command with rendered engine output; **PREVIEWED==REAL
   unchanged** (PART 1w/1z, already green). — PENDING (Leela) live (semantics unaffected — A72-3).
3. UI==CLI 4-template (+ TeamTracker) proof repeated byte-identical. — **gate = A72-3 harness.**
4. Backstop 203/0; MAXIMAL unmoved. — **gate = A72-3.**
5. Live walkthrough — **PENDING (Leela).**

## 6. Proof & gates
- **A72-1** — Review→Create→workspace + abstract handle. Gate: **PENDING (Leela)** live path. (No
  non-GUI proxy: saving + routing is DOM/Tauri wiring the harness cannot exercise — F4. Do not
  fabricate a green.)
- **A72-2** — workspace screen + verbs + Advanced corner. Gate: **PENDING (Leela)** each verb
  round-trips (PREVIEWED==REAL is in the backstop and does not change here → backstop can't prove the
  workspace).
- **A72-3 ✦ close** — Gate: backstop **203/0** AND UI==CLI harness digests **unchanged**. Backstop
  rent = catch a stray `generator/src` touch; harness rent = catch a workspace edit that silently
  touched `wizard-choices.js`. **Neither proves the workspace wiring** — that is (1)/(2) PENDING.

> **Why 203/0 is the WRONG gate for the workspace itself:** a workspace that mis-wires *Export* to
> the wrong command, or *Create* to the wrong screen, moves no baked hash — the backstop stays green.
> The real proof of the workspace is the live walkthrough (PENDING). Say this in the report; do not
> let a green backstop stand in for a workspace that was never clicked.

## 7. Environment constraints
No GUI here — the whole path (1)/(2)/(5) is Leela's, PENDING. Rest as `eco-day-71-plan.md` §7.

## OUT-OF-SCOPE, restated for the reviewer (Rule 19)
Compare polish · file-on-disk linkage · serializer edits · new engine capability · new PART · the
Stack regroup · treating the project as a SQLite row. Any of these appearing in execution = STOP.
