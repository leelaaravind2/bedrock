# Eco-Day 75b — REPORT: the inserted fix day (two tasks; both code tasks STOPPED in scope; language sweep done)

**MODE: EXECUTE + REPORT.** Two tasks only. Outcome, stated plainly up front: **both code tasks are
BLOCKED within the stated scope** (real blockers, confirmed against the code — not rigidity), and the
**honest-language sweep was completed**. No `generator/src` change; no code landed; no hash moved. An
honest half-day with findings, per the block's own ethos.

**A discrepancy first (F15):** the 75b prompt says HEAD is "the Block-A audit commit, above tag
`eco-day-75`," and to read `docs/daily/eco-day-75b-plan.md` + `docs/daily/eco-block-A-report.md`
(findings F12-A/F14-C). On disk: HEAD is `56e3a2d` (the `eco-day-75` tagged commit itself), and **both
audit files are absent**. The repo wins. So the audit's plan/report could not be read, and its language
sweep could not be "confirmed" — I did the sweep fresh. The two tasks are self-described in the 75b
prompt, so I executed them from it. Finding IDs F12-A/F13-B/F14-C are quoted from the prompt, not from an
on-disk report.

---

## 1. What was built

**Nothing in code.** `generator/src` untouched; no new test file; `desktop/package.json` unchanged.
Changed files (docs only):
- `docs/daily/eco-block-A-ledger.md` — findings F15/F16/F17 appended; four plain-browser "verified"
  claims downgraded (language sweep); plus the Day-75 finalization lines carried in.
- `docs/daily/eco-day-71-report.md`, `eco-day-73-report.md`, `eco-day-75-report.md` — plain-browser
  "verified/demonstrated live" claims downgraded to "inspected in a plain browser without Tauri
  (unreproducible); PENDING (Leela)".
- `docs/daily/eco-day-75b-report.md` — this report.

## 2. Task 1 (F14-C — import `hashFiles`): STOPPED, no `generator/src` change

**Blocker (confirmed against the code):** the canonical `hashFiles` lives only inside
`generator/src/day20-regression.ts`, which calls `main().catch(...)` **unconditionally at module scope**:
```
$ sed -n '1791,1793p' generator/src/day20-regression.ts
main().catch((err) => { console.error(err); process.exit(1); });
```
`grep` confirms there is **no shared/exported `hashFiles`** anywhere — it is privately duplicated in
`day15/17/18/19/20-gate.ts`, all run-on-import scripts. Therefore `export`-ing `hashFiles` there and
importing it from `ui-cli-proof.mjs` would **run the full 203-check regression on import** (polluting
`npm run ui-cli`, and `process.exit(1)`-ing it on any failure). Making the import safe requires **either**
a one-line `main()` entry-point guard **or** extracting `hashFiles` to a new `generator/src/` module —
**both exceed the explicit STOP condition** *"`git diff --stat generator/src/` shows anything beyond an
added export keyword."*

**What I did:** nothing to `generator/src`. I did not add the guard, did not extract, did not export.
Per §7, STOP + report rather than exceed scope silently.

**Recommended (Leela's call):** (a) a behavior-preserving `main()` entry-point guard in
`day20-regression.ts` so it only self-runs as the CLI entry point (the backstop re-proves it green); or
(b) extract `hashFiles` to `generator/src/core/file-digest.ts` and re-point `day20-regression.ts`'s use.
Both keep what `hashFiles` computes byte-identical. Either unblocks F14-C in minutes; I stopped only
because both exceed the "added export only" scope you set. **The F14-C risk is a maintenance trap, not a
silent-failure risk today** — the anchor leg still makes any drifted copy fail loud.

**Gate result (unchanged — code untouched):**
```
$ cd generator && npm run day20:regress → 203 OK / 0 FAIL · MAXIMAL 366e19d9deda1caf UNMOVED
$ cd desktop && npm run ui-cli → five digests reproduce, five DISTINCT, PASS
$ git diff --stat generator/ → (empty)
```

## 3. Task 2 (F12-A — headless router test): TEST BLOCKED; language sweep DONE

**Test blocker (confirmed):** the router logic (`SCREENS`, `showScreen`, `openWorkspace`,
`renderWorkspace`) lives in `desktop/src/main.js`, which references `document` at **module scope**:
```
$ tail -2 desktop/src/main.js
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
```
Importing `main.js` headlessly throws `ReferenceError: document is not defined`; and even if it
imported, `showScreen`/`openWorkspace` read/write the DOM, so observing "exactly one active screen" or
"empty state vs verb bar" needs a DOM. The 75b scope **forbids jsdom, any DOM library, and any `main.js`
refactor**. Per the prompt ("if `main.js` cannot be imported headlessly … STOP task 2, record what
blocks it"), I wrote **no test** — a test asserting a mock is worse than none.

**Root cause (F17, a finding for a future day):** unlike the Stack mapping (extracted to the pure,
testable `stack-fields.js` on Day 73), the router was left inline in `main.js`, so it is not
headless-testable. **Recommended future fix:** extract the router into a pure `desktop/src/router.js`
(the `stack-fields.js` pattern), then `router.test.mjs` can assert properties 1–4 without a DOM. That
extraction is a shell change outside 75b's two-task scope.

**The honest-language sweep — DONE (this stands on its own).**
```
$ rg -i "verified live|verified in a plain browser|verified.*no Tauri"
  (before) → eco-block-A-ledger.md, eco-day-71-report.md, eco-day-68-report.md, eco-day-18-report.md
  (after)  → eco-day-68-report.md, eco-day-18-report.md   ← both PRE-Block-A, left per scope (see below)
```
Downgraded **7 in-scope Block-A occurrences** (in `eco-day-71/73/75-report.md` + 4 in the ledger rows
A71-3/A71-4/A72-1/A72-2) from "verified/demonstrated live in a plain browser" to *"inspected in a plain
browser without Tauri (unreproducible — no committed test); PENDING (Leela)."* Reproducible claims
(harness 5/5, `npm run test:stack`, backstop 203/0, git diffs) were **kept** as proven — only the
plain-browser DOM observations were downgraded.

**Left unedited, by scope (F18):** `eco-day-18-report.md` ("Verified live in the running wizard" — an
actual live HTTP `/api/detect` check at the time, not a plain-browser-without-Tauri observation) and
`eco-day-68-report.md` ("Verified live — static preview, with a stub backend" — disclosed as a stub at
the time). Both are **pre-Block-A historical records** that fed the Day-69 certification; rewriting them
is a third thing beyond the two-task scope (§0). Flagged here for a possible future honesty pass; left
per scope discipline.

**Gate result:** no `test:router` landed (blocked), so no gate to paste. `npm run ui-cli` and
`day20:regress` are unchanged and green (§2).

## 4. Baseline change

**None.** No frozen hash moved; no re-baseline; no code touched. MAXIMAL `366e19d9deda1caf` unmoved.

## 5. Findings (numbered from where the audit left off, F12–F14 per the prompt)

- **F15** — the Block-A audit session's outputs (commit + `eco-day-75b-plan.md` + `eco-block-A-report.md`)
  are **absent from disk**; HEAD is the tagged Day-75 commit. Repo wins; the two tasks were run from the
  75b prompt's self-contained text.
- **F16** — Task 1 blocked: `hashFiles` is trapped in the run-on-import `day20-regression.ts`; exporting
  it within the "added export only" scope is impossible. Two safe options recommended (§2); no
  `generator/src` change made.
- **F17** — Task 2 test blocked: the router is inline in `main.js` (DOM-coupled, not a pure module);
  headless import throws on module-scope `document`. No jsdom/refactor per scope. Root cause + the pure-
  `router.js` fix recommended for a future day.
- **F18** — pre-Block-A `eco-day-18/68-report.md` still carry "verified live" (running-wizard / stub-
  backend static preview). Out of the two-task scope; left unedited; flagged for a future honesty pass.

## 6. PENDING — every live item, by name (F13-B first, per the prompt)

- **F13-B (Leela's; not touched this day):** the Half-B PASS criteria in `eco-day-69-report.md` §3 need
  **re-authoring for the new shell** before A′.2 can run item-by-item. Day 72 removed `generate()`, so
  Half-B item 2 ("wizard → generate") describes a path that no longer exists; it becomes "wizard →
  Create → workspace → Export". **PENDING (Leela).**
- **Block A′.1** — pre-71 control smoke (8 Half-B items, prior shell) — never ran. **PENDING.**
- **Day 71 live:** app opens on Welcome; every certified flow reachable; the two Welcome buttons + the
  live saved-project list; full-window wizard click-through inside Bedrock. **PENDING (Leela)** (inspected
  only in a plain browser without Tauri — unreproducible).
- **Day 72 live:** Welcome → wizard → Review → **Create → workspace**; each workspace verb round-trip
  (Edit / Preview impact / Verify / Export / Save version; diagram via `flow_svg`). **PENDING (Leela).**
- **Day 73 live:** the Stack screen's four fields write the right keys **inside Bedrock** (unit-tested +
  plain-browser-inspected; full in-Bedrock click). **PENDING (Leela).**
- **A headless router test** (F12-A) — blocked until the router is extracted to a pure module. **PENDING.**
- **Task 1 (F14-C)** — import `hashFiles` — blocked pending Leela's choice of guard vs extraction. **PENDING.**
- **Block A′.2** — full Half-B on the new shell (after F13-B re-authoring). **PENDING.**
- **Block A′.3** — the 4 Store steps (MakeAppx wrap → packaged launch + Half-B → name reservation →
  submission wrap 0.1.0→0.2.0 → submit). **PENDING** (`desktop/src-tauri/msix/README.md`).
- **Standing decision gates:** GATE-NAME, GATE-LICENSE, single-maintainer continuity. **PENDING.**

> **Said out loud (per §6 of the prompt): nothing in Bedrock's GUI has been clicked by any session.**
> Block A proved the shell does not change what a blueprint means. It did not prove the shell works.

## 7. Commit

`eco-day-75b: honest live-claim language sweep; hashFiles-import (F14-C) and router-test (F12-A) BLOCKED
in scope — findings, no code landed (backstop green, 203 OK / 0 FAIL)`. Do not push; do not re-tag.
Hash recorded in the ledger post-commit.
