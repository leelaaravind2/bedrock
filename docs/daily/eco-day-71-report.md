# Eco-Day 71 — CLOSE RECORD (EXECUTE session, Block A batched)

**MODE: EXECUTE close record (not the consolidated report — that is Day 75's job).** This is the
factual per-day close the block brief §6 requires: what was built, every gate's pasted output,
findings, any baseline change, the PENDING list by name, the commit. A record, not an argument.

**Baseline at block open:** commit `d2529df` (docs-only PLAN commit, one above `ff6e991`) · backstop
**203 OK / 0 FAIL** · MAXIMAL `366e19d9` unmoved. Re-confirmed from clean this session before any
code (see Gate G0).

**Day-71 goal (one load-bearing thing):** the shell opens on a Welcome and shows **one screen at a
time** — Welcome → the (unchanged) wizard full-window → a workspace placeholder — with the UI==CLI
byte-identity harness **rebuilt and committed** as the reusable Days-71–73 semantics gate.

---

## 1. What was built (files, precisely)

- **`desktop/tools/ui-cli-proof.mjs`** (NEW) — the UI==CLI byte-identity harness. Imports the REAL
  shell serializer (`desktop/src/wizard-choices.js`: `buildBlueprintChoices`, `TEMPLATES`,
  `TEAMTRACKER_EXAMPLE`) and the REAL certified engine BUILD (`generator/dist/`: `assembleBlueprint`,
  `buildFileSet`, `selectBackendPlugin`). Reimplements the `hashFiles` digest convention verbatim
  from `generator/src/day20-regression.ts`. For all five templates it (a) deep-equals the wizard's
  `buildBlueprintChoices` output against the hand-authored CLI BlueprintChoices, and (b) asserts the
  generated `buildFileSet` output is byte-identical to the committed baseline. Prints five DISTINCT
  digests; exits non-zero on any mismatch.
- **`desktop/package.json`** — added `"ui-cli": "node tools/ui-cli-proof.mjs"`.
- **`desktop/src/index.html`** — restructured `<main>` into three screen sections
  (`#screen-welcome`, `#screen-wizard`, `#screen-workspace`) + a shared engine-output pane
  (`#results-pane`), plus a header nav (`#topnav`). Added the screen-router CSS (inline `<style>`;
  a `data-screen` visibility state machine) and the full-window wizard layout. Every pre-existing
  id and card was preserved (moved, not rewritten). The Welcome screen carries the product name, one
  line, and the two buttons (`#welcome-create`, `#welcome-open`) + a `#welcome-projects` list. The
  workspace screen hosts a placeholder banner + the existing certified flows (project view, my
  projects, compare, the Advanced harness), kept reachable pending Day-72's rebuild.
- **`desktop/src/main.js`** — added the PURE-UI screen router (`showScreen`, `startWizard`, the
  `SCREENS` set) and wired the nav + Welcome buttons in `init`; added `openExisting()` (Welcome →
  live saved-blueprint list via `list_blueprints`); `loadProject` now routes to the wizard on
  success (pure navigation). No generation logic added; `wizard-choices.js` untouched.
- **`docs/daily/eco-block-A-ledger.md`** — the resume ledger, updated after every task.

**NOT touched:** `desktop/src/wizard-choices.js` (serializer meaning), any `generator/src/` file,
`desktop/src/styles.css` (see F11), `.claude/launch.json`.

---

## 2. The F3 decision, executed (the crux of the block)

The UI==CLI harness was never committed (F3); the "Day-62 baselines" were 12-char prefixes
transcribed into reports. A71-1 rebuilt it. Per the split-gate protocol:

**A71-1a — the ANCHOR leg (run first).** The harness's TeamTracker output — the shell's
`TEAMTRACKER_EXAMPLE` fed through `buildBlueprintChoices` → the engine → `buildFileSet` at backend
`Spring Boot`, database `PostgreSQL` — was gated against the frozen digest
`Spring Boot|PostgreSQL|TeamTracker` = `9e01210c55a5…5e45d66`, which lives **inside the backstop's
103** and is asserted byte-identical daily since Day 29 (`generator/src/day20-regression.ts` FROZEN
table). **Result: GREEN** — 63/63 files, exact match. The harness is demonstrably correct on the one
template that overlaps certified ground. The choices deep-equal also passed.

**A71-1b — the FREE legs (only because the anchor was green).** blank / restApi / crud / worker
(the four settings-only `TEMPLATES` presets, `entities` omitted = a literal bypass) were compared to
the four transcribed report prefixes. **Result: all four MATCH** on first run (15/15 files each,
choices deep-equal OK). This is the **first mechanical reproduction** of these digests. Because the
prefixes reproduced exactly, **no re-baseline was needed** (Rule 1): the full 64-char digests were
recorded as the durable committed baseline — a matching prefix baked to full, NOT a moved hash.
(Full digests in §5.)

**Engine imported (stated before a line of harness code, per the brief):** `generator/dist/` (the
certified engine BUILD), NOT `desktop/src-tauri/resources/gen/dist/` (the sidecar payload, gitignored,
possibly absent, and A75-2's separate packaged==certified claim). **Digest algorithm:** sha256 over
files sorted ascending by `relPath` (code-unit `<`, no `localeCompare`), each contributing
`/${relPath}\n` (UTF-8) then the content Buffer — verbatim from `hashFiles`. **File-set
normalization:** the harness hashes the engine's IN-MEMORY `GeneratedFile[]`, never the filesystem,
so there is no Windows CRLF/path-separator false-red surface.

---

## 3. Gates (pasted output)

**G0 — baseline from clean (before any code):**
```
$ cd generator && npm run build          # tsc — no source drift; git diff generator/src empty
$ npm run day20:regress
[digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  # derived: 203 OK / 0 FAIL ; MAXIMAL 366e19d9deda1caf unmoved   (grep -c '^  OK  ' + the MAXIMAL OK line; Day 75d self-prints the total)
  → Spring Boot|PostgreSQL|TeamTracker  9e01210c55a5a0a6   (the anchor, reproduced by the engine)
```

**A71-1 (a/b/c) — `npm run ui-cli`:**
```
=== UI==CLI byte-identity harness (A71-1) — engine: generator/dist ===
  OK   ANCHOR TeamTracker  63/63 files · digest 9e01210c55a5 · == 9e01210c55a5 (full committed baseline)
  OK   free   blank        15/15 files · digest f95bc87d504d · == f95bc87d504d (full committed baseline; transcribed f95bc87d504d)
  OK   free   restApi      15/15 files · digest 6f6e543a2aff · == 6f6e543a2aff (full committed baseline; transcribed 6f6e543a2aff)
  OK   free   crud         15/15 files · digest 54b0852cb532 · == 54b0852cb532 (full committed baseline; transcribed 54b0852cb532)
  OK   free   worker       15/15 files · digest fbc6c6e9aad2 · == fbc6c6e9aad2 (full committed baseline; transcribed fbc6c6e9aad2)
  OK   five digests DISTINCT (5/5) — identical digests would prove nothing
UI==CLI harness: PASS
```
`.gitignore` trap (Rule 28): `git check-ignore desktop/tools/ui-cli-proof.mjs` → empty (NOT ignored);
`git status` shows the file. No un-ignore rule needed.

**A71-2 / A71-4 — harness unchanged + engine/serializer untouched:**
```
$ npm run ui-cli            → UI==CLI harness: PASS  (five digests DISTINCT 5/5, all exact — unchanged)
$ git diff --stat generator/                → (empty)
$ git diff -- desktop/src/wizard-choices.js → (empty)
```
Live preview (static server, plain browser — no Tauri): app opens on Welcome (nav hidden, results
pane hidden); Create → wizard (nav + results appear); nav → Workspace (all certified flows present);
brand → Welcome; the wizard renders full-window (single centered 680px column); step click-through
Step 1→2→…→Review 8/8 renders the correct BlueprintChoices JSON. **0 console errors** throughout.

**A71-5 — day close (backstop from clean):**
```
[digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  # derived: 203 OK / 0 FAIL   (grep -c '^  OK  '; the program printed the lines above — Day 75d adds a self-printed total)
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf  (UNMOVED)
$ git diff --stat generator/   → (empty)
$ git status --porcelain
 M desktop/package.json
 M desktop/src/index.html
 M desktop/src/main.js
 M docs/daily/eco-block-A-ledger.md
?? desktop/tools/
```

---

## 4. What is proven vs PENDING (honesty — Move 5)

- **PROVEN (non-GUI):** the serializer's MEANING is byte-identical (harness, 5/5); the engine/serializer
  were not touched (generator + wizard-choices.js empty diffs; backstop 203/0); the router MECHANISM
  works and the app initializes without error (live preview in a plain browser); the wizard renders
  full-window and its step machinery still produces the right choices.
- **PENDING — Leela's machine (the harness canNOT prove DOM/Tauri wiring — F4):** every live check
  below. The router preview ran WITHOUT Tauri, so the store-backed paths showed their honest
  no-Tauri fallback, not real data.

---

## 5. Baseline record

- **No frozen hash moved.** The 103 + MAXIMAL `366e19d9` reproduce byte-identically (A71-5).
- **No re-baseline was performed.** The four free-leg digests were transcribed-as-12-char and are now
  recorded at full length for the FIRST time (matching prefixes baked to full — not a moved hash):
  - blank   `f95bc87d504d31054e5a130e3b64f0e1be79f8b15053ed5aa7c2261f537c393e` (15 files)
  - restApi `6f6e543a2affaa23659c1866068a0f629ae52ea4081e6b65d752abdf5fba4358` (15 files)
  - crud    `54b0852cb532487bae7eda572866f5f2a84de3bc60a613d4dae7a8e3e86be9fa` (15 files)
  - worker  `fbc6c6e9aad2b7f6b9ec5df59d03f235979797f003284e6a8c09df65e9828797` (15 files)
  - (anchor) TeamTracker `9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66` (63 files)

---

## 6. Findings

- **F11 (new) — `desktop/src/styles.css` is unused Tauri scaffold.** `index.html` has no
  `<link rel="stylesheet">`; the real styling is inline. The plan's "styles.css" file-to-touch is
  wrong — the router/Welcome/full-window work lives in `index.html`'s inline `<style>` + `main.js`.
  `styles.css` left untouched (a possible later cleanup, out of Block-A scope).
- **F3 closed (A71-1b).** The vanished ad-hoc harness is replaced by a committed, single-command
  harness; the transcribed digests are now mechanically reproduced and anchored to a frozen digest.
- Prior findings F1–F10 stand (see `eco-day-71-plan.md`); the F1 path corrections are scheduled for
  A75-4.

---

## 7. PENDING — Leela's machine (by name; never marked done by this session)

- **Block A′.1 — pre-71 control smoke** (8 Half-B items, current shell) — the control. PENDING.
- A71 live: app opens on Welcome only; every certified flow reachable — PENDING.
- A71 live: Welcome shows two buttons; *Open a saved project* lists saved blueprints and loads one;
  *Create* enters the wizard — PENDING (Leela). Inspected in a plain browser without Tauri
  (unreproducible — no committed test); the real store needs Tauri. [downgraded Day 75b, F12-A]
- A71 live: full-window wizard click-through end-to-end inside Bedrock — PENDING.

---

## 8. Commit

Day-71 work committed at the day close: `eco-day-71: screen router + Welcome + full-window wizard +
committed UI==CLI harness (backstop green, 203 OK / 0 FAIL)`. Hash recorded in the ledger post-commit
(a commit cannot contain its own hash). Not pushed (Leela pushes).
