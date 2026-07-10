# Eco-Day 75c — REPORT: the second fix day (exactly two extractions)

**MODE: REPORT.** Executes the two tasks planned in `docs/daily/eco-day-75c-plan.md` and corroborated
by `docs/daily/eco-block-A-report.md` (F12-A, F14-C, F16, F17, F22). Baseline HEAD `fb7ea77` (the
Block-A audit, docs-only). No push, no re-tag. Authority order: **THE CODE > reports > governing docs >
Knowledge Book > ledger.**

**Result:** both extractions landed. The backstop is byte-identical (**203 `record()` OK / 0 FAIL**,
MAXIMAL `366e19d9deda1caf` UNMOVED), the router's pure state is now headless-proven, and `generator/`
changed by exactly one new file + one import-and-delete. Two findings (F24, F25). Every live in-Bedrock
click remains **PENDING (Leela)**; F13-B is untouched (Leela's, unclosable by any session).

---

## 0. Baseline (from clean, before a line of code)

```
cd generator && rm -rf dist && npm run build && npm run day20:regress
  → 203 OK / 0 FAIL   (grep -c '^  OK  ' = 203 ; '^  FAIL' = 0)
  → Spring Boot|PostgreSQL|TeamTracker  9e01210c55a5a0a6      (anchor, inside FROZEN)
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf
  → [digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
  → Day-20 regression: PASS

cd desktop && npm run ui-cli
  → ANCHOR TeamTracker 63/63 · 9e01210c55a5 ; blank 15/15 · f95bc87d504d ; restApi 15/15 · 6f6e543a2aff ;
    crud 15/15 · 54b0852cb532 ; worker 15/15 · fbc6c6e9aad2
  → five digests DISTINCT (5/5) ; UI==CLI harness: PASS
```

Started green. (Note per F20: "203" is a count of passing `record()` assertions — *checks passed*, not
"203 digests." The digest count is 103.)

---

## TASK 1 — one canonical `hashFiles` (closes F14-C, F16; scoped against F22)

**Leela's decision, executed: extract, do not guard.**

### 1a — the thirteen proven equivalent (read-only, before writing anything)

The audit enumerated thirteen private `hashFiles`. Nobody had diffed them. I extracted each body and
compared them on the axes that determine the digest.

**The thirteen** (`generator/src/`, plus the harness):
`day15-gate.ts:56` · `day17-gate.ts:52` · `day18-gate.ts:76` · `day19-gate.ts:62` ·
`day20-regression.ts:206` · `bench-export.ts:44` · `generate-from-snapshot.ts:27` ·
`maxcell-driver.ts:22` (already `export`ed) · `phase1-benchmark.ts:81` · `phase2-benchmark.ts:42` ·
`phase3-benchmark.ts:56` · `phase4-mid-benchmark.ts:49` — plus `desktop/tools/ui-cli-proof.mjs:34`.

**Per axis, all thirteen are byte-identical:**

| axis (determines the digest) | value in ALL thirteen |
|---|---|
| hash algorithm | `crypto.createHash('sha256')` |
| sort order | `[...files].sort((a, b) => (a.relPath < b.relPath ? -1 : 1))` — default **code-unit `<`**, NO `localeCompare`, not unsorted |
| per-file prefix | `` h.update(`/${f.relPath}\n`) `` — exactly `/` + relPath + `\n` |
| content: buffer vs string | `h.update(Buffer.from(f.content, 'utf8'))` — **Buffer**, UTF-8 |
| digest encoding | `h.digest('hex')` |
| what is included | **relPath + content only** — no mode, no size |

**The ONLY difference among the thirteen is cosmetic:** seven write the loop body on one line
(`{ h.update(…); h.update(…); }`), six write it across three lines. Whitespace inside the function body
does not touch any of the six axes above. **No divergence on any digest-determining axis → "canonical" is
a fact, not a hope → extraction authorised.**

> Had any axis diverged, this day would have STOPPED and reported the file + axis (a latent cross-OS
> byte-diff found now for free instead of at Day 85). It did not. The 103-baked-digest backstop then
> re-proves the extraction faithful (§1b, "why this can certify itself").

**`maxcell-driver.ts` — does importing it execute work at module scope?** **YES.** `maxcell-driver.ts:52`
is `main().catch((err) => { console.error(err); process.exit(1); });` — unconditional at module scope.
Importing its exported `hashFiles` would run `main()` → `computeMaximalDigest()` twice. That is **F16 in a
second location** (recorded as **F24**), so `maxcell-driver.ts` is *not* the extraction point — a driver is
not a core module. The new module is a fresh, pure file with no module-scope side effect.

**`hashTree` is deliberately NOT the same thing.** `day12/13/14/16-gate.ts` use `hashTree`, a **disk-walk**
convention (different input — the written filesystem — and different meaning). It is out of scope, and
`file-digest.ts` carries a comment saying so, to stop a downstream reader "finishing the job" and unifying
two things that were never one.

### 1b — extract

- **New `generator/src/core/file-digest.ts`** exporting `hashFiles(files: GeneratedFile[]): string`,
  behaviour byte-identical to the copies proven equivalent in 1a (imports `GeneratedFile` from
  `./plugin.js`; `node:crypto` only; pure, no module-scope side effect).
- **`generator/src/day20-regression.ts`** imports `hashFiles` from `./core/file-digest.js` and **deletes
  its own copy** (L206–210) plus its now-unused `import crypto` (required by `noUnusedLocals: true`).
- **`desktop/tools/ui-cli-proof.mjs`** imports `hashFiles` from `../../generator/dist/core/file-digest.js`
  and **deletes its copy** (L34–41) plus its now-unused `import crypto`. Header + local comment updated to
  say "imported," not "transcribed."

**Explicitly NOT done (out of scope):** the other eleven copies (→ **F25**, F22's follow-up); any change to
what `hashFiles` computes; the FROZEN table; unifying `hashTree`.

### Task-1 gate — GREEN

```
cd generator && rm -rf dist && npm run build && npm run day20:regress
  build exit: 0
  regress exit: 0
  OK lines:   203        FAIL lines: 0
  OK   Spring Boot|PostgreSQL|TeamTracker  9e01210c55a5a0a6
  OK   MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf   ← UNMOVED
  [digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
  Day-20 regression: PASS

cd desktop && npm run ui-cli
  OK   ANCHOR TeamTracker  63/63 files · digest 9e01210c55a5 · == 9e01210c55a5 (full committed baseline)
  OK   free   blank        15/15 files · digest f95bc87d504d · == f95bc87d504d
  OK   free   restApi      15/15 files · digest 6f6e543a2aff · == 6f6e543a2aff
  OK   free   crud         15/15 files · digest 54b0852cb532 · == 54b0852cb532
  OK   free   worker       15/15 files · digest fbc6c6e9aad2 · == fbc6c6e9aad2
  OK   five digests DISTINCT (5/5)
  UI==CLI harness: PASS
```

**Why this certifies itself:** the FROZEN table's 103 digests are **literal string constants** in the
source, not values the harness computes. An extraction that altered hashing behaviour cannot also alter what
it is compared against — so **the 103 reproducing against the *imported* `hashFiles` IS the proof of a
faithful extraction.** The anchor `9e01210c55a5` (asserted daily since Day 29) reproduces through the new
module in both the backstop and `ui-cli`.

**Diff scope:** `git diff --stat generator/src/` → `day20-regression.ts` (`1 insertion(+), 6 deletions(-)`)
only; `file-digest.ts` is a new file that `git status` shows as `?? generator/src/core/file-digest.ts`
— **untracked but NOT ignored** (the `.gitignore` `/*` whitelist trap avoided); it becomes **tracked at
commit** (confirmed: it is in commit `604a3bc`). `.gitattributes` `eol=lf` keeps it LF.

---

## TASK 2 — a pure router module (closes F12-A's test, F17)

75b diagnosed it: unlike Day 73's `stack-fields.js`, the router was left inline in `main.js`, which touches
`document` at module scope — so nothing about the router's state was headless-testable. This follows the
Day-73 precedent exactly: **an extraction, not a rewrite.**

- **New `desktop/src/router.js`** — pure, DOM-free, dependency-free:
  - `SCREENS` = `new Set(['welcome', 'wizard', 'workspace'])`.
  - `screenState(name)` — the transition as data: unknown name → `null` (no transition; the single current
    screen stays), valid name → `{ screen, navHidden }` (one screen; nav hides only on Welcome). Returning a
    single `screen` string is what makes "exactly one active screen" **structural**.
  - `workspaceState(currentProject)` — the null-project guard as data: `{ hasProject, showBody, showEmpty }`;
    null project → `showEmpty: true, showBody: false`.
- **`desktop/src/main.js`** imports both and keeps **ALL** DOM painting. `showScreen` now paints
  `screenState`'s decision (`app.dataset.screen`, `nav.hidden`); `renderWorkspace` paints `workspaceState`'s
  booleans (`body.hidden`, `empty.hidden`). The state machine is **byte-for-byte** the one that was inline
  (each guard maps 1:1; `node --check src/main.js` OK; no dangling `SCREENS` reference remains).
- **New `desktop/tools/router.test.mjs`** + `"test:router"` in `desktop/package.json` — the
  `stack-fields.test.mjs` shape exactly: imports the real module, hand-rolled `node:assert/strict`, non-zero
  exit on failure. No jsdom, no framework, no new dependency.

**The four asserted properties (as data, not pixels):**
1. `SCREENS` is exactly `{welcome, wizard, workspace}`.
2. each valid screen → exactly one active screen (itself, a member of `SCREENS`); an unknown target → `null`
   (never a silent zero or two). Also: nav hidden only on Welcome.
3. the Advanced corner is unreachable with no project — `workspaceState(null).showBody === false`, and since
   `#advanced-corner` is **contained in `#workspace-body`** (index.html:186 inside :166), a hidden body ⇒ a
   hidden corner. The relation, asserted — not pixels.
4. `openWorkspace()`'s decision with `currentProject === null` selects the **empty state** (`showEmpty`),
   not the verb bar (`showBody === false`); a real project selects the verb bar.

### Task-2 gate — GREEN

```
cd desktop && npm run test:router
  OK   SCREENS == {welcome, wizard, workspace} exactly
  OK   each valid screen activates exactly itself — one screen, never zero or two
  OK   an unknown target yields null — never zero, never two screens
  OK   top nav hidden only on Welcome
  OK   null project → empty state; workspace body (⊇ Advanced corner) hidden — corner unreachable
  OK   null project → empty state (not the verb bar); a project → verb bar (body shown)
  router unit test: PASS (6 checks)

cd desktop && npm run ui-cli
  OK   five digests DISTINCT (5/5)      UI==CLI harness: PASS      (UNCHANGED)

cd generator && npm run day20:regress
  OK lines: 203   FAIL lines: 0   MAXIMAL 366e19d9deda1caf UNMOVED   Day-20 regression: PASS

git diff --stat generator/
  generator/src/day20-regression.ts | 7 +------      ← Task 1 ONLY; Task 2 added ZERO generator changes
```

**Say it plainly (the honest scope):** this test **stays green even if the wizard is unclickable inside
Tauri.** It converts the router's *pure state* from inspected-in-a-plain-browser to **proven**; it narrows
F12-A's blind spot, it does **not** close it. **The live in-Bedrock click remains PENDING (Leela).**

---

## Findings (numbered from F24)

- **F24 — `maxcell-driver.ts` executes work at module scope (F16 in a second location).**
  `maxcell-driver.ts:52` = `main().catch(...)`, unconditional at module scope. Importing its already-`export`ed
  `hashFiles` runs the MAXIMAL generation twice as a side effect. **Consequence:** it cannot be the canonical
  import point; the F22 follow-up (F25) must import from the pure `file-digest.ts`, never from a driver/gate/
  benchmark (all of which are run-on-import CLI scripts). Recorded, not fixed (fixing it — a `main()`
  entry-point guard — is outside this day's two-task scope).

- **F25 — eleven private `hashFiles` copies remain in `generator/src/` (F22's follow-up).**
  `day15/17/18/19-gate.ts`, `bench-export.ts`, `generate-from-snapshot.ts`, `maxcell-driver.ts`,
  `phase1/2/3/4-benchmark.ts` still each define their own. This day extracted the **one load-bearing** copy
  (the backstop) + the harness copy only. The follow-up is a mechanical rewire to
  `import { hashFiles } from './core/file-digest.js'` (relative depth per file) + delete — provably safe
  because §1a proved all thirteen equivalent, and now certifiable the same way (the copies feed no baked
  digest of their own beyond what the backstop already covers). Named, not fixed.

*Noted, not a finding:* the shared comparator returns `1` (not `0`) for equal `relPath` — a non-stable sort
for equal keys. `GeneratedFile[]` relPaths are unique, so equality never occurs; this is the pre-existing
convention, identical across all thirteen, and unchanged here. Flagged only so a future reader knows it was
looked at.

---

## What stays open (say it out loud)

- **F13-B — OPEN, LEELA'S, UNCLOSABLE BY ANY SESSION.** This day did not touch it. A′.1's control never ran;
  Day 72 removed `generate()`, so Half-B item 2 ("wizard → generate") describes a path that no longer exists.
  `eco-day-69-report.md` §3 must be re-authored ("wizard → Create → workspace → Export") before A′.2 can be
  run item-by-item.
- **F25 (above)** — the eleven remaining `hashFiles` copies. Named, not fixed.
- **Nothing in Bedrock's GUI has been clicked by any session.** Block A proved the shell does not change what
  a blueprint means. It did not prove the shell works. Task 2's test narrows the router blind spot to pure
  state; it does not close it.

### PENDING live items, by name (Leela's machine; F13-B FIRST)

1. **F13-B** — re-author `eco-day-69-report.md` §3 for the new shell, THEN run A′.2 item-by-item.
2. **Block A′.1** — pre-71 control smoke (8 Half-B items, prior shell, `git checkout ff6e991`).
3. **Day 71 live** — app opens on Welcome; every certified flow reachable; two Welcome buttons + the live
   saved-project list; full-window wizard click-through inside Bedrock.
4. **Day 72 live** — Welcome → Review → Create → workspace; each workspace verb round-trip (Edit / Preview
   impact / Verify / Export / Save version; the diagram via `flow_svg`).
5. **Day 73 live** — the Stack screen's four fields write the right keys inside Bedrock.
6. **Block A′.2** — full Half-B on the new shell, item-by-item vs the A′.1 control (after F13-B re-authoring).
7. **Block A′.3** — the 4 Store steps: MakeAppx MSIX wrap → packaged launch + Half-B → GATE-NAME reservation
   → submission wrap (0.1.0→0.2.0) → submit.
8. **The in-Bedrock router click** — Task 2's test proves pure state only; the live click stays PENDING.
9. **GATE-NAME** (cheapest before Day 79), **GATE-LICENSE** (memo due Day 85), single-maintainer continuity.

---

## Commit

```
eco-day-75c: canonical hashFiles module + pure router module & headless test (backstop green, 203 OK / 0 FAIL)
```

Change set — 8 deliverables + this report (9 files): **new** `generator/src/core/file-digest.ts`,
`desktop/src/router.js`, `desktop/tools/router.test.mjs`; **modified** `generator/src/day20-regression.ts`,
`desktop/tools/ui-cli-proof.mjs`, `desktop/src/main.js`, `desktop/package.json`,
`docs/daily/eco-block-A-ledger.md`; **new** `docs/daily/eco-day-75c-report.md` (this file). Pre-commit backstop GREEN (203 OK / 0 FAIL, MAXIMAL
`366e19d9deda1caf` UNMOVED). **Not pushed, not re-tagged** (Leela pushes). A commit cannot contain its own
hash — the hash is this commit's resulting HEAD, reported to Leela in the close message.
```
