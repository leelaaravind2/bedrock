# Eco-Day 75c — PLAN: the fix day (exactly two tasks)

**MODE: PLAN** (written by the Block-A audit/REPORT session — planned, NOT executed). Supersedes the
prior blocked Day-75b attempt at these two tasks, which stopped on over-tight scope (F16/F17). Baseline:
HEAD `4040298`; backstop 203 OK / 0 FAIL; MAXIMAL `366e19d9` unmoved; `generator/` untouched across the
arc; `deps ≡ {}`.

**Two tasks, one load-bearing thing each. Nothing else.** If a third thing looks worth doing (e.g.
consolidating the other `hashFiles` copies — F22), it is out of scope: write it down and leave it.

Gate after each task. Update the ledger after each. Write to disk immediately; commit once at the close.

---

## Task 1 — extract `hashFiles` to a canonical module (closes F14-C; unblocks F16)

**Leela's decision, made, not to be reopened: extract, do NOT guard.** A `main()` entry-point guard is
the smaller diff and fixes the wrong problem — F16/F22 record that `hashFiles` is *privately duplicated*
in **12 `generator/src` files** (one, `maxcell-driver.ts:22`, already `export`ed) plus the harness copy.
There is not one implementation with an import problem; there are thirteen that happen to agree. Phase B's
`bedrock verify` needs **one** canonical, importable digest module across three operating systems, and
**Day 85 is Linux** — the riskiest day of the phase.

**In scope:**
- New `generator/src/core/file-digest.ts` exporting `hashFiles(files: GeneratedFile[]): string`, with
  behaviour **byte-identical** to the current copy (the exact convention: `sha256`; files sorted by
  `relPath` with default code-unit `<` comparison, no `localeCompare`; per file `` `/${relPath}\n` ``
  then the UTF-8 content Buffer).
- `generator/src/day20-regression.ts` imports it and **deletes its own local `hashFiles`** (L206).
- `desktop/tools/ui-cli-proof.mjs` imports it from `generator/dist/core/file-digest.js` and **deletes its
  copy** (L34).

**Out of scope, explicitly:**
- Consolidating the **other 11** `hashFiles` copies (day15/17/18/19-gate, bench-export,
  generate-from-snapshot, maxcell-driver, phase1–4 benchmarks) — a real cleanup (F22), **not this day's
  one load-bearing thing**. Name it; leave it.
- Changing what `hashFiles` computes, in any respect, for any reason.
- Touching the `FROZEN` table (or any baked digest string).
- Any signature change that would alter a call site inside `day20-regression.ts`.

**Gate:**
```
cd generator && npm run build && npm run day20:regress   → 203 OK / 0 FAIL · MAXIMAL 366e19d9 UNMOVED
cd desktop && npm run ui-cli                              → five digests reproduce · five DISTINCT
```

**Why this can certify itself:** the `FROZEN` table's digests are **literal string constants in the
source**, not values the harness computes. An extraction that altered hashing behaviour cannot also alter
what it is compared against — so the 103 reproducing *is* the proof of a faithful extraction.

**Why it could go red:** any divergence in sort order, path separator, the `/${relPath}\n` prefix,
buffer-vs-string, or encoding. **A red means the copies had already drifted — a real finding about Days
71–75.** STOP and report; do not reconcile to green.

**STOP conditions:** any baked digest moves; the extraction requires changing what `hashFiles` computes;
`generator/package.json` dependencies is not `{}`.

---

## Task 2 — extract a pure router module (closes F12-A's test; unblocks F17)

75b diagnosed it: unlike Day 73's `stack-fields.js`, the router was left inline in `main.js`, DOM-coupled,
so it is not headless-testable. Follow the `stack-fields.js` precedent **exactly**. This is an
**extraction, not a rewrite.**

**In scope:**
- New `desktop/src/router.js` — **pure, DOM-free, dependency-free**: the `SCREENS` set, the screen-state
  transition (which screen is active for a given target; unknown target → no change), and the
  null-project → empty-state decision expressed as **data** (a pure predicate/selector), not as DOM
  mutation.
- `desktop/src/main.js` imports `router.js` and keeps ALL DOM painting (`getElementById`, `dataset`,
  `hidden`) in `main.js` — the router decides state; `main.js` paints.
- `desktop/tools/router.test.mjs` + `"test:router"` in `desktop/package.json`, in the exact shape of
  `stack-fields.test.mjs`: import the real module, hand-rolled `assert`, non-zero exit on failure.

**Asserts (the four properties, as data — not pixels):**
1. `SCREENS` is exactly `{welcome, wizard, workspace}`.
2. the transition for each valid screen yields **exactly one** active screen; an unknown target yields
   neither none nor two (no silent activation of zero or of two screens).
3. **the Advanced corner is unreachable with no project** — the Day-72 invariant expressed as data: the
   null-project guard selects the empty state (and, paired with `index.html`'s containment of
   `#advanced-corner` inside `#workspace-body`, the corner cannot render without a project).
4. `openWorkspace()`'s state decision with `currentProject === null` selects the **empty state**, not the
   verb bar.

**Out of scope, explicitly:** jsdom, any DOM library, any test framework, any new dependency; moving DOM
code into `router.js`; any change to what the router *does*; any `main.js` behaviour change beyond
importing the extracted module.

**Gate:**
```
cd desktop && npm run test:router   → router unit test: PASS (N checks)
cd desktop && npm run ui-cli        → five digests reproduce, five DISTINCT (UNCHANGED)
cd generator && npm run day20:regress → 203 OK / 0 FAIL
git diff --stat generator/          → (empty)
```

**Why it could go red:** the router activates zero or two screens; the Advanced corner is reachable
without a project; or the extraction changed the state machine. It goes red on a real regression.

**State honestly in the close record:** this test **stays green even if the wizard is unclickable inside
Tauri.** It narrows the F12-A blind spot to the router's pure state; it does **not** close it. The live
in-Bedrock click remains **PENDING (Leela)** — no session has clicked the shell.

**STOP conditions:** the test needs jsdom / a DOM library / a new dependency; the extraction needs a
`main.js` rewrite rather than an import; the backstop moves any hash.

---

## Environment / close
No GUI here — the live click stays PENDING (Leela). Close from clean: `npm run day20:regress` 203/0;
`git diff --stat generator/` empty except the two extractions' in-scope files; `npm run ui-cli` five
distinct; `npm run test:router` PASS. Commit once:
`eco-day-75c: extract hashFiles to a canonical module + extract a pure router module with a headless test (backstop green, 203 OK / 0 FAIL)`.
