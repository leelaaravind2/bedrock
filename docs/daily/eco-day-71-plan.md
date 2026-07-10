# Eco-Day 71 — PLAN: the screen router + Welcome + the wizard as a full-window flow

**MODE: PLAN.** No code. No build. This document + the ledger + the sibling 72–75 plans are the
only outputs. Master Change Prompt (`docs/files/BEDROCK-MASTER-CHANGE-PROMPT.md`) filled per slot.

Baseline at block open: commit `ff6e991` · backstop `npm run day20:regress` from `generator/` →
**203 OK / 0 FAIL** (103 baked digests + 10 TeamTracker + non-hash PARTs 1c–1z) · MAXIMAL
`366e19d9` UNMOVED · re-confirmed read-only THIS session (tail pasted in §Proof).

---

## THE STANDING INVARIANTS (verbatim in every Block-A plan)
1. Same input → byte-identical output. The frozen 103 + 10 + MAXIMAL are byte-identical at every
   close. **A moved baked hash is a FINDING → STOP.**
2. Every new capability's default / empty / off path is a **literal bypass** reproducing the frozen
   hashes exactly. (The manifest trap: a model-level addition can silently move every hash with
   zero change to generated code.)
3. **Block A is SHELL/UI ONLY.** No `generator/src/` source changes. Existing PARTs unchanged. If a
   task appears to need an engine change, that task is out of scope and you say so.
4. The shell is a thin client. No generation logic, no JS diffs, no path heuristics in JS or Rust.
5. `generator/package.json` → `"dependencies": {}`. Any new Rust crate is deliberate and documented.
6. AI is never in the generation path (ADR-001). No round-trip. No inference-import.
7. **Claim only what is proven.** Verify proves REPRODUCIBILITY, never correctness. Law 21 is no
   FUNCTIONAL dependency — inert provenance comments remain; "no trace of Bedrock" is forbidden. The
   Map highlights what we can certify. Deferred means PENDING, named.
8. Stamp ≠ hash. The sync-gen stamp moves legitimately when dist entries land. The load-bearing
   claim is always: *the bundled node still reproduces the 103 frozen digests.*
9. New root-level / new-directory files → explicit `.gitignore` un-ignore rule (the `/*` whitelist
   trap), and `git status` must show the file.
10. No ceremonial proofs. Every gate names the failure it would catch and could not stay green while
    that thing is broken.

> **Rule 16 note (this block only):** Leela has ordered Days 71–75 as ONE plan / ONE execute / ONE
> report session. This suspends the three-sessions-per-day *cadence* and **nothing else** — in
> particular **Rule 20 (gate after every step) is NOT suspended.** Every execute task below carries
> its own gate; the gates run in order.

---

## 1. Cold-session context
Repo `E:\Software` (Windows). Product **Bedrock** (internal Thraksha): a deterministic, AI-free code
generator — the blueprint is the source of truth; code is a byte-identical projection. `generator/`
is a pure-Node engine (`deps {}`, 0 native). `desktop/` is a Tauri v2 shell + bundled-node sidecar
(`resources/gen`) + a shell-side rusqlite blueprint store. The shell is a THIN CLIENT: it collects
choices and calls certified commands; the engine computes, JS paints. Commit to `main`, linear
history, no branches; a pre-commit hook runs the backstop; **Leela pushes**.

## 2. Immutable invariants — see THE STANDING INVARIANTS above. If the task conflicts, the task is
wrong → STOP.

## 3. Read-first (done this session; findings in the last section)
`docs/THRAKSHA-GUARDRAILS.md`; `docs/files/BEDROCK-MASTER-CHANGE-PROMPT.md`;
`docs/files/THRAKSHA-FORWARD-PLAN.md` (Block A); `docs/BEDROCK-SESSION-LEDGER-SPEC.md`;
`docs/BLOCK-A-PRIME-CONTROL-TRACK.md`; `docs/files/BEDROCK-DOCS-DAY-PROMPT.md`;
`docs/daily/eco-day-70-report.md` (latest = current state) + `eco-day-69-report.md` §3 (Half-B PASS
criteria); `docs/files/THRAKSHA-KNOWLEDGE-BOOK.md` V.3 / V.9 / VI. **The real code:**
`desktop/src/{index.html,main.js,wizard-choices.js}`, `desktop/src-tauri/src/{lib.rs,store_commands.rs}`,
`generator/src/day20-regression.ts`, `desktop/package.json`, `.gitignore`.

## 4. The task
- **DAY-ID:** `eco-day-71`
- **GOAL (one load-bearing thing):** one screen at a time — a shell-side screen router presenting
  Welcome → the (unchanged) wizard full-window → a workspace placeholder; the wall of cards is gone.
- **WHY:** the shell is a wall of cards (template / New project / Project view / My projects /
  Compare / Advanced panels all at once). A product opens on a Welcome and shows one screen at a
  time. Doing the router FIRST, against an **unchanged** wizard, is seam-first: it isolates the
  routing change from the Day-73 wizard-semantics change so a later regression is attributable.
- **IN SCOPE:** (a) a pure-UI screen router (which screen is visible; no data logic); (b) Screen 0
  Welcome — product name, one line of what it is, two buttons *Create a new project* / *Open
  existing*; (c) the EXISTING wizard steps rendered full-window, **steps and semantics untouched**.
- **DECIDED ALREADY:** *Open existing* = **open a saved blueprint from the store** — the Day-63
  capability EXISTS and is callable (`list_blueprints` → `load_blueprint`, confirmed in
  `store_commands.rs` + registered in `lib.rs`; `main.js` already calls both). So the button is
  **LIVE**, listing saved blueprints. Open-from-**folder** is NOT this button — it arrives Day 80.
  Label it "open a saved project," never "open a folder."
- **OUT OF SCOPE (explicit — Rule 19):** the workspace itself (Day 72 — a placeholder screen only);
  the Stack regroup (Day 73); ANY change to `buildBlueprintChoices` / `toFieldSpec` / `toEntitySpec`
  / `TEMPLATES` / `TEAMTRACKER_EXAMPLE` / `FRONTENDLESS` (the blueprint's meaning); any new wizard
  field; any `generator/src/` file; open-from-folder; the Advanced harness relocation (that is
  Day 72's "Advanced corner").
- **DESIGN NOTES (resolved by reading code):** the current UI is a single `index.html` with cards
  in `<section class="left">` (`#templates`, the wizard `#wizard-body`/`#wizard-next`/`#wizard-back`,
  `#projects-list`, `#compare-a/b`, the Advanced panels) driven by `main.js`. The router is a
  visibility state machine over these existing DOM regions — NOT a rewrite of them. `renderStep()`
  already sequences the wizard (6 settings steps + data-model + review); it stays exactly as is.

## 5. Done-conditions (each checkable, none ceremonial)
1. The app opens on Welcome only (one screen visible at a time). — PENDING (Leela) live.
2. Every certified flow (wizard→generate, save/list/load, maps, impact, verify, compare, Advanced)
   remains reachable. — PENDING (Leela) live.
3. Serializer output for the 4 templates (blank/restApi/crud/worker) **and** the certified
   TeamTracker is **byte-identical to the Day-61/62 baselines** — UI==CLI re-proven *even though the
   steps are untouched* (Move 3). — **gate = A71-1 harness digests.**
4. Backstop 203 OK / 0 FAIL from `generator/`; MAXIMAL `366e19d9` unmoved. — **gate = A71-5.**
5. Live click-through — **PENDING (Leela).**

> **The gate that would actually go red here is UI==CLI byte-identity — NOT the 103 baked digests.**
> A pure-UI wizard change *cannot* move the 103, so their staying green proves nothing about the
> wizard. The wizard's MEANING lives in `wizard-choices.js`; the A71-1 harness re-proves it byte for
> byte. (Its precise reach — semantics, not DOM wiring — is finding F4; read it.)

> **Block A′.1 control:** Leela's pre-71 control smoke is the control for every live check below.
> Its status is **PENDING** — no written result exists on disk. Do NOT assume it passed or ran.

## 6. Proof & gates
- After every step: the named gate (see the task table). Never batch past a gate.
- The reusable semantics gate for Days 71–73 is the **A71-1 UI==CLI harness** — it must reproduce
  the recorded digests: `blank f95bc87d504d/15f · restApi 6f6e543a2aff/15f · crud 54b0852cb532/15f ·
  worker fbc6c6e9aad2/15f · TeamTracker 9e01210c55a5/63f`. First run that fails to reproduce any of
  these = FINDING → STOP (the templates' output drifted since Day 62).
- End of Day 71: backstop 203/0, MAXIMAL unmoved (A71-5) — its rent is to prove the engine was NOT
  touched, not to prove the wizard.
- **This-session read-only backstop tail** (baseline confirmation):
  ```
  [digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
  Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  → 203 OK / 0 FAIL (counted); MAXIMAL 366e19d9 UNMOVED
  ```

## 7. Environment constraints (honest-manual — never faked)
No GUI here — every live click-through is Leela's (PENDING). No Docker/Go/Java/Semgrep-native/AI
key/MakeAppx/TTY. C: is tight.

---

# PROPOSED EXECUTE TASK TABLE (all of Block A — reviewed before any code is written)

IDs are sequential and never renumbered once execution starts. Every task has exactly one gate.
Column 6 answers honestly: *could this gate stay green while the thing is broken?* ✦ marks a
day-boundary close (a natural cold-resume seam).

| ID | Day | Task (one load-bearing thing) | Files it will touch | Gate | Why that gate could go red | Est. |
|----|-----|-------------------------------|---------------------|------|----------------------------|------|
| A71-1 | 71 | Build & commit the re-runnable **UI==CLI byte-identity harness** — imports the REAL `wizard-choices.js` + the REAL engine; asserts deep-equal choices + byte-identical `buildFileSet` for blank/restApi/crud/worker/TeamTracker (Decimal + has-many recommended); prints per-template file count + digest; exits non-zero on any mismatch | `desktop/tools/ui-cli-proof.mjs` (new); `desktop/package.json` (add `ui-cli` script) | Harness reproduces the recorded Day-61/62 digests (blank `f95bc87d504d`/15f · restApi `6f6e543a2aff`/15f · crud `54b0852cb532`/15f · worker `fbc6c6e9aad2`/15f · TeamTracker `9e01210c55a5`/63f) | RED if any recorded digest fails to reproduce → the templates' generated output has drifted since Day 62 → STOP. Foundational: freezes the baseline the rest of the block re-runs against. **Cannot stay green while broken** — distinct hashes make a vacuous pass impossible. | M |
| A71-2 | 71 | Shell-side **screen router** (pure UI state: which screen is visible; show/hide over the existing DOM regions). No edit to `wizard-choices.js`; the `selections` flow unchanged | `main.js`, `index.html`, `styles.css` | UI==CLI harness digests **unchanged** | RED iff the router refactor strayed into the serializer/presets (the shell manifest-trap). It **would stay green** for a broken *router wiring* — that is the PENDING (Leela) leg (F4); not a proxy, an honest split. | M |
| A71-3 | 71 | **Screen 0 Welcome** — product name + one line + two buttons; *Open existing* = LIVE saved-blueprint list (`list_blueprints`→`load_blueprint`); labelled "open a saved project" (NOT open-from-folder = Day 80) | `main.js`, `index.html` | **PENDING (Leela):** Welcome shows two buttons; *Open existing* lists saved blueprints & loads one; *Create* enters the wizard | Genuine live gate — no non-GUI proxy exists (list/load are backstop-independent; the harness is unaffected). Do not fabricate a green. | S |
| A71-4 | 71 | Render the existing wizard steps **full-window**; steps & semantics UNTOUCHED | `main.js`, `index.html`, `styles.css` | UI==CLI harness digests **unchanged** | RED iff a "full-window" edit strayed into `wizard-choices.js`. Click-through is PENDING (Leela). | S |
| A71-5 | 71 | ✦ **DAY-71 CLOSE** — confirm the generator/engine was not touched | (none — read-only) | backstop `npm run day20:regress` **203/0**; MAXIMAL `366e19d9` unmoved | **Cannot go red from pure-UI work** — its rent is to catch a task that strayed into `generator/src` or added a model type (the manifest trap). A red = a scope violation → STOP. | S |
| A72-1 | 72 | Review → **Create → workspace** transition; Create = `save_blueprint` **only**; produce an **ABSTRACT project handle** (not a bare SQLite row — Day-78 makes a file the truth) | `main.js`, `index.html` | **PENDING (Leela):** Welcome→wizard→Review→Create→workspace path works | Live gate (wiring). The harness (semantics) still applies as a secondary check but **cannot** prove this path. Handle-abstraction is a design constraint, not a gate. | M |
| A72-2 | 72 | **Workspace screen** — diagram front & centre + verbs Edit / Preview impact / Verify / Export / Save-versions, each calling its EXISTING certified command; **Advanced corner** hosts the old raw harness, reachable only once a project exists, never on Welcome | `main.js`, `index.html`, `styles.css` | **PENDING (Leela):** each verb round-trips to its certified command with rendered engine output (PREVIEWED==REAL = PART 1w/1z, already green & unchanged) | Live gate (wiring). PREVIEWED==REAL is in the backstop and does not change here, so backstop **can't** prove the workspace. No proxy invented. | M |
| A72-3 | 72 | ✦ **DAY-72 CLOSE** — engine + serializer untouched | (none) | backstop **203/0** AND UI==CLI harness digests **unchanged** | Backstop rent = scope-violation catch; harness rent = a workspace edit that silently touched `wizard-choices.js`. Neither proves the workspace wiring (A72-1/2 PENDING). | S |
| A73-1 | 73 | **Stack regroup** — collapse the four settings steps (backend/frontend/database/auth) into ONE Stack screen, four fields, same choice set; keep writing `selections.{backend,frontend,database,auth}`; **`buildBlueprintChoices` UNTOUCHED** | `main.js`, `index.html`, `styles.css`, `wizard-choices.js` (**`STEPS` array only**) | UI==CLI harness reproduces **ALL** recorded digests incl. TeamTracker (the serializer's MEANING byte-identical) | THE gate separating "regrouped four steps" from "silently changed what a blueprint means." RED iff the regroup edits `buildBlueprintChoices` / a preset / the frontend-forcing logic / drops a key. **NOTE:** editing `STEPS` alone won't move digests (the serializer ignores `STEPS`), so *four-selects-write-the-right-keys* wiring is the PENDING (Leela) leg (F4/F5). | M |
| A73-2 | 73 | ✦ **DAY-73 CLOSE** — engine untouched | (none) | backstop **203/0**; MAXIMAL unmoved | Rent = scope-violation catch (the regroup is shell-only; a `generator/src` touch = STOP). | S |
| A74-1 | 74 | Run **`docs/files/BEDROCK-DOCS-DAY-PROMPT.md` EXACTLY as written** (docs-only; runs AFTER Day 72). Produces `docs/manual/*`, `docs/architecture/*`, `docs/LIMITATIONS.md`, README/CAPABILITIES alignment; 3 honesty lines verbatim; `[SCREENSHOT-NEEDED]` list collected | `docs/` only | backstop **203/0** (docs can't move a hash — prove it anyway) AND `git status` shows ONLY docs | Backstop rent = prove docs-only (a red = a stray non-doc edit). If the docs-day prompt were ABSENT → STOP + ask Leela (it is PRESENT — F9). | L |
| A75-1 | 75 | **Full backstop FROM CLEAN** (`rm -rf dist && npm run build && npm run day20:regress`) | (none) | **203 OK/0 FAIL from clean**; MAXIMAL `366e19d9` unmoved; 103 digests asserted | The real from-clean determinism proof — red = something across the arc moved a hash → STOP. | S |
| A75-2 | 75 | **Packaged == certified** — bundled-node sidecar reproduces the 103 (state the load-bearing claim, not the stamp; the sync-gen stamp may move legitimately if dist entries changed) | (build artifacts) | Bundled node vs `resources/gen/dist/day20-regression.js --emit-digests` reproduces the 103 | RED = the packaged path diverged from the certified engine. If the bundled node binary / `resources/gen` are absent in the execute shell → **PENDING (Leela)**, named — do not fake it. | M |
| A75-3 | 75 | **Consolidated UI==CLI statement** — re-run the A71-1 harness; record digests | (none) | Harness reproduces all recorded digests | RED = the arc changed serializer semantics somewhere. | S |
| A75-4 | 75 | **RELEASE-NOTES + CAPABILITIES** updated (honest limitations carried forward); root README/CAPABILITIES alignment; note the installer version-string bump is a one-line, hash-independent submission-wrap edit (**NOT done here** — Leela's Store step) | docs + root `.md` | backstop **203/0** AND git scope = docs/config only | Rent = prove the doc/version edits moved no hash and stayed in scope. | M |
| A75-5 | 75 | **Tag the arc** + write consolidated `eco-day-75-report.md` listing every PENDING live item **BY NAME** | `docs/` + git tag | Report completeness vs KB V.10 reviewer checklist; every PENDING named | A report that hides a PENDING or a red fails V.10 — the human review is the gate. | M |

**Day-boundary resume points:** A71-5→A72-1 · A72-3→A73-1 · A73-2→A74-1 · A74-1→A75-1.

---

# FINDINGS FROM READING THE CODE
*(The highest-value output of this session. Each is backed by a file opened this session; the repo
wins over the brief. Proposed corrections are one-liners — not applied here.)*

**F1 — Governing-doc paths in the brief are wrong; the repo wins.** The block prompt, the Forward
Plan (Day 74 line), the ledger-spec's own "in-repo home" header, and the Knowledge Book's companion
line all reference `docs/prompts/…`, `docs/THRAKSHA-KNOWLEDGE-BOOK.md`, `docs/THRAKSHA-FORWARD-PLAN.md`.
**Actual on disk:** `docs/files/BEDROCK-MASTER-CHANGE-PROMPT.md`,
`docs/files/BEDROCK-DOCS-DAY-PROMPT.md`, `docs/files/THRAKSHA-FORWARD-PLAN.md`,
`docs/files/THRAKSHA-KNOWLEDGE-BOOK.md`, `docs/files/BEDROCK-HANDOFF-PHASE-B.md`;
`docs/BEDROCK-SESSION-LEDGER-SPEC.md` and `docs/BLOCK-A-PRIME-CONTROL-TRACK.md` at the `docs/` root.
**There is no `docs/prompts/` directory.** Proposed one-line corrections: Forward Plan Day 74 →
`docs/files/BEDROCK-DOCS-DAY-PROMPT.md`; ledger-spec header → `docs/BEDROCK-SESSION-LEDGER-SPEC.md`;
KB home/companion lines → `docs/files/…`. (Not silently harmonised — logged for Leela.)

**F2 — The governing docs are UNTRACKED.** `git status`: `?? docs/files/`,
`?? docs/BEDROCK-SESSION-LEDGER-SPEC.md`, `?? docs/BLOCK-A-PRIME-CONTROL-TRACK.md`. The Forward Plan,
Knowledge Book, both prompts, the ledger spec, the control track, and the Phase-B handoff are on disk
but not committed. They are **not ignored** (they sit under the whitelisted `/docs/`; they show `??`
only because they are new). This PLAN commit will include them so the block's own reference material
is in history.

**F3 — THE BIG ONE: the UI==CLI proof harness is NOT committed; the "Day-62 baselines" are not
files.** Only `desktop/src/main.js` imports `wizard-choices.js`. `git show --stat` on the Day-61
(`a562ae2`) and Day-62 (`7737bcc`) commits shows they added **only**
`desktop/src/{index.html,main.js,wizard-choices.js}` (+ docs). The "headless UI==CLI proof" the
Day-61 report calls "4/4" (blank/restApi/crud/worker) and the Day-62 report calls "3/3"
(TeamTracker/Decimal/has-many) were run **ad-hoc via an inline `node` script** in those EXECUTE
sessions and **never persisted**. **Consequence:** the gate this entire block leans on — "serializer
output byte-identical to the Day-62 baselines / UI==CLI byte-identity" — is **not a runnable command
in the repo today.** It must be rebuilt and committed as the FIRST execute task (**A71-1**), and its
first run must reproduce the report-recorded digests (`blank f95bc87d504d`, `restApi 6f6e543a2aff`,
`crud 54b0852cb532`, `worker fbc6c6e9aad2` at 15 files; `TeamTracker 9e01210c55a5` at 63 files) or
STOP. This is why A71-1 precedes the router.

**F4 — The pure harness proves SERIALIZER SEMANTICS, not DOM/router wiring.** `buildBlueprintChoices`
is fed hand-built template `sel` objects; it never exercises the router or the step DOM. Therefore a
router (71), workspace (72), or Stack-regroup (73) change that broke the *DOM→`selections` wiring*
would **not** turn the harness red. The harness catches "did we silently change what a blueprint
MEANS" (edits to `wizard-choices.js`). The WIRING correctness — does the regrouped Stack screen write
the four selects into `selections.{backend,frontend,database,auth}`; does *Create* reach the
workspace — is genuinely a **LIVE GUI check = PENDING (Leela)**. The brief's "the gate that would go
red here is UI==CLI byte-identity" is TRUE for semantics and kept as such; it is NOT sufficient for
wiring, and **no non-GUI proxy is invented**. (A jsdom DOM-driving harness was considered and
rejected: a new dependency, fragile, and a risk of becoming a second construction path.)

**F5 — `buildBlueprintChoices` lives in the SHELL, not the generator.** It is in
`desktop/src/wizard-choices.js` — a DOM-free pure serializer, along with `TEMPLATES`,
`TEAMTRACKER_EXAMPLE`, `FIELD_TYPES`, `FRONTENDLESS`, `STEPS`, and the inverse `choicesToSelections`.
Day 73's dependency is entirely shell-side JS. The current wizard `STEPS` are six settings steps
(`projectName · projectType · backend · frontend · database · auth`) + a data-model step + review;
the "Stack" group to collapse is the four `backend/frontend/database/auth` steps (projectName +
projectType stay separate). `STEPS` also lives in `wizard-choices.js`, **but the serializer does not
read `STEPS`** — it reads `sel` keys directly — so editing `STEPS` will not move the harness digests
(this is why F4's wiring leg stays live). The certified engine (`assembleBlueprint`/`buildFileSet`)
is untouched by all of Block A.

**F6 — "the 4 templates (incl. certified TeamTracker)" conflates two proofs.** Day 61 proved 4
settings-only templates (blank/restApi/crud/worker, 15 files each). Day 62 proved 3 entity cases
(TeamTracker 63 files, Decimal, has-many). The brief's "the 4 templates incl. TeamTracker" is really
"the four Day-61 templates PLUS the Day-62 TeamTracker." A71-1 should cover all five; covering Decimal
+ has-many too is cheap and recommended. Terminology drift, not a blocker.

**F7 — Day-70 report agrees the tip is `ff6e991` at 203/0.** `eco-day-70-report.md` is the latest
report; it states 203 OK / 0 FAIL, MAXIMAL `366e19d9` unmoved, packaged==certified; `ff6e991` is the
Day-70 RELEASE commit. My read-only backstop THIS session: **203 OK / 0 FAIL, 103 digests, MAXIMAL
`366e19d9`, PASS** — agreement. (Historical note, not a discrepancy: the Day-62 report shows "194 OK";
the count grew to 203 as non-hash PARTs 1c–1z were added across Days 63–66.)

**F8 — Day-63 store capability confirmed LIVE.** `save_blueprint` / `load_blueprint` /
`list_blueprints` exist in `desktop/src-tauri/src/store_commands.rs` and are registered in
`lib.rs`'s `invoke_handler`; `main.js` already calls all three. So Welcome's *Open existing = open a
saved blueprint* is genuinely LIVE on Day 71 (list + load), not a stub. Open-from-**folder** is
Day 80 — the button copy must say "open a saved project," not "open a folder."

**F9 — Docs-day prompt present + ordering confirmed.** `docs/files/BEDROCK-DOCS-DAY-PROMPT.md` exists
(8,105 bytes) and states "Run this AFTER Day 72." It is EXECUTE+REPORT, self-contained, docs-only.
Day 74's plan is therefore ONE page (confirm existence + path + ordering + outputs) — not a
re-authoring. (If it had been absent → STOP + ask Leela; it is not.)

**F10 — `.gitignore` whitelist trap does NOT bite the new ledger/plan docs.** `.gitignore` is a `/*`
root whitelist, but `!/docs/` recursively un-ignores the whole docs tree. `git check-ignore
docs/daily/eco-block-A-ledger.md` → not ignored. So **no un-ignore rule is needed** for this session's
`docs/daily/*` outputs (confirmed with `git status`, which shows them). Rule 9 is satisfied by
observation, not by a new rule. *A future task that creates a NEW root-level file (e.g., a root
`LIMITATIONS.md` on Day 74/75) WOULD need an explicit un-ignore line — flagged for A74-1/A75-4.*

---

## Read-first empirical resolutions (the questions the brief asked, answered by opening files)
- **Is Day-63 saved-blueprint listing callable from the shell so *Open existing* is LIVE?** YES — F8.
- **Real shape of the wizard step components + what `buildBlueprintChoices` consumes?** F5 — six
  settings steps + data-model + review in `main.js`; the serializer reads `sel.{projectName,
  projectType,backend,frontend,database,auth}` + `sel.entities` (minimal `EntitySpec[]`). It lives in
  the shell, ignores `STEPS`, and is the sole thing Day 73 must leave byte-identical.
- **Where do the Day-62 serializer baselines live + what command re-proves UI==CLI?** F3 — **there
  is no such file and no such command.** The baselines are the report-recorded digests; the command
  must be created (A71-1). *Stated plainly: I did not locate a proof I could run — because one does
  not exist yet.*
- **Do the two prompt files exist at their paths?** Not at `docs/prompts/` (F1); they exist at
  `docs/files/` (F9 confirms the docs-day prompt).
- **Is `eco-day-70-report.md` the latest, agreeing tip `ff6e991` at 203/0?** YES — F7.
