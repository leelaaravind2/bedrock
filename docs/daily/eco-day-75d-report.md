# Eco-Day 75d — REPORT: the last fix day before Phase B (two tasks + a provenance sweep)

**MODE: REPORT.** Two things surfaced in the Day-75c review — a risk to the packaged build, and a drift in
the evidence convention. Neither is a defect in what 75c built; both are cheap now and expensive later.
Baseline HEAD `604a3bc` (Day 75c). Tag `eco-day-75` at `56e3a2d`. No push, no re-tag. Authority order:
**THE CODE > reports > governing docs > Knowledge Book > ledger.**

**Result:** the packaging path is proven intact (`sync-gen` copies `dist/` recursively → `dist/core/`
rides along; the packaged backstop resolves its import; `packaged == certified` byte-identical). The
backstop now **prints its own `203 OK / 0 FAIL` from counters** — proven real by a mutation test (`202 OK
/ 1 FAIL`, exit non-zero). The six Block-A close records + the arc report had their derived totals marked
`# derived:`. One finding (F26). The frozen 103 + MAXIMAL `366e19d9deda1caf` are UNMOVED.

---

## 0. Baseline (from clean, before code)

```
cd generator && rm -rf dist && npm run build && npm run day20:regress
  → 203 OK / 0 FAIL   (grep -c '^  OK  ' = 203 ; '^  FAIL' = 0)
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf   (UNMOVED)
  → [digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL) ; Day-20 regression: PASS
```

---

## TASK 1 — does `sync-gen` copy `dist/core/`?

### 1a — READ (the code decides it, not the name or a past run)

`scripts/sync-generator-resources.mjs` copies **`dist/` recursively, wholesale** — the new subdirectory
rides along. Non-event. The three lines that decide it:

```js
const SUBTREES = ['dist', 'plugins'];                      // :33  — the whole subtrees, not enumerated files
async function copyTree(src, dst) {
  await fs.rm(dst, { recursive: true, force: true });
  await fs.cp(src, dst, { recursive: true });              // :71  — RECURSIVE copy of the whole tree
}
// in sync():
for (const sub of SUBTREES) await copyTree(path.join(GENERATOR, sub), path.join(RESOURCES, sub));  // :79
```

`fs.cp(..., { recursive: true })` copies `generator/dist/` **and every subdirectory** — so
`dist/core/file-digest.js` is copied. `tauri.conf.json` `build.beforeBuildCommand` = `npm run sync-gen`
(runs before every build) and `bundle.resources` = `["resources/gen/**/*"]` (bundles the tree
recursively). The freshness `hashTree`/`listFiles` also recurse, so the stamp already covers `dist/core/`.

### 1b — PROVE it (don't reason about it)

```
cd desktop && npm run sync-gen
  → [sync-gen] resources refreshed: 247 files, tree hash af7259c4714a6cac…

ls desktop/src-tauri/resources/gen/dist/core/
  → assemble.js  canonical-json.js  …  file-digest.d.ts  file-digest.js  …   ← file-digest.js PRESENT (1670 B)

node desktop/src-tauri/resources/gen/dist/day20-regression.js --emit-digests | head
  → =… MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf
  → [digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
  → DIGEST Spring Boot|PostgreSQL|DemoApp 010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c
  → … (no ERR_MODULE_NOT_FOUND — the `import { hashFiles } from './core/file-digest.js'` RESOLVED)
```

The packaged `day20-regression.js` loaded, resolved its Day-75c import, and emitted the digests. **The
packaging path is intact.** (Had it thrown `ERR_MODULE_NOT_FOUND`, the fix would have been to make
`sync-gen` copy `dist/` recursively — it already does — *not* to move `file-digest.ts` out of `core/`.)

### 1c — RE-PROVE `packaged == certified` (bundled node present in this shell → PROVEN, not PENDING)

```
node generator/dist/day20-regression.js --emit-digests                                   > certified.txt
./desktop/src-tauri/binaries/node-x86_64-pc-windows-msvc.exe \
     desktop/src-tauri/resources/gen/dist/day20-regression.js --emit-digests             > packaged.txt
diff certified.txt packaged.txt
  → IDENTICAL
  → DIGEST lines: certified 103 / packaged 103
  → MAXIMAL 366e19d9deda1caf present on BOTH sides
```

**Load-bearing claim (not the stamp):** *the bundled node reproduces the 103 frozen digests
byte-identically to the certified engine.* The stamp moved `83ffd0ad…` → `af7259c4…` — a **legitimate
stamp move** caused by the new `dist/core/file-digest.js` entry (a stamp is not a hash). Re-proven again
at the close after Task 2 (below), stamp → `32eda85c…`.

---

## TASK 2 — the backstop prints its own totals

`203 OK / 0 FAIL` was a human's `grep -c`, typeset as terminal output in six close records. The number
everyone quotes must come from the program.

**Change (`generator/src/day20-regression.ts`, nothing else):** `record()` increments `okCount`/`failCount`
from the same call that flips `pass`; the tail prints `${okCount} OK / ${failCount} FAIL` from those
counters; `if (!pass) process.exit(1)` still exits non-zero on any FAIL. Printing is not hashing — no
digest, the FROZEN table, or any hashed value is touched.

### Gate — GREEN (program's own total agrees with the independent grep)

```
cd generator && rm -rf dist && npm run build && npm run day20:regress
  → 203 OK / 0 FAIL  (the backstop's own record() totals — not a grep)     ← PROGRAM-PRINTED
  → Day-20 regression: PASS ; MAXIMAL 366e19d9deda1caf UNMOVED ; exit 0
  independent: grep -c '^  OK  ' = 203 ; grep -c '^  FAIL' = 0             ← AGREES
```

### Mutation test — the counter is real, not a hardcoded `203` (the pasted proof)

The mutation is on the **gitignored `dist/` only** (`FORMATTING['tab']`, a baseline checked exactly once;
confirmed the literal appears once in dist). **The tracked FROZEN table is never edited.**

```
# confirm target appears once in dist (not in a comment)
grep -c 'c81fb0f52ef8ad30' dist/day20-regression.js            → 1

# MUTATE (dist only): flip FORMATTING.tab first hex char  c → d
sed -i 's/c81fb0f52ef8ad30…c79b99/d81fb0f52ef8ad30…c79b99/' dist/day20-regression.js
node dist/day20-regression.js ; echo "exit: $?"
  →   FAIL formatting Express tab         c81fb0f52ef8ad30
  → 202 OK / 1 FAIL  (the backstop's own record() totals — not a grep)     ← TOTAL MOVED
  → Day-20 regression: FAIL
  → exit: 1                                                                 ← NON-ZERO
  independent: grep -c '^  OK  ' = 202 ; grep -c '^  FAIL' = 1              ← AGREES

# REVERT (rebuild regenerates the gitignored dist)
rm -rf dist && npm run build && node dist/day20-regression.js ; echo "exit: $?"
  → 203 OK / 0 FAIL ; Day-20 regression: PASS ; exit: 0
  → grep -c 'd81fb0f52ef8ad30' dist/day20-regression.js   → 0   (mutation gone)
  → git diff generator/src/day20-regression.ts            → only the counter change (tracked src never mutated)
```

A hardcoded `203` could not have printed `202`. The total is a counter; a failing check moves it and
flips the exit code.

### `ui-cli` unchanged

```
cd desktop && npm run ui-cli   → five digests DISTINCT (5/5) ; UI==CLI harness: PASS
```

### Close re-sync (Task 2 changed `dist/`) + re-prove 1c

```
cd desktop && npm run sync-gen   → 247 files, tree hash 32eda85cba49b45e…   (stamp move: dist changed, not a hash)
diff certified.txt packaged.txt  → IDENTICAL ; 103 DIGEST both ; MAXIMAL 366e19d9deda1caf both
  → both certified AND packaged now carry the self-printed "203 OK / 0 FAIL" line (the counter flows to the packaged build)
```

---

## The provenance sweep (docs; after the gate was green)

- **9 derived `203 OK / 0 FAIL` lines** inside `$`-fenced blocks — `eco-day-71` (×2), `72`, `73`, `74`,
  `75` (×2), `75b`, and `eco-block-A-report.md`'s R1 tail — were prefixed **`# derived:`** with their real
  provenance (`grep -c '^  OK  '`), the numbers kept, not restated from memory. As of Day 75d the backstop
  prints that total itself, so the figure is program-emitted going forward.
- **`eco-block-A-report.md` R1** "matched the close records **byte-for-byte**" → "matched **on every figure
  the program emits**" (the digests, the DIGEST lines, the PASS line, MAXIMAL; the `203 OK / 0 FAIL` total
  was a `grep -c` in both, agreeing).
- **`eco-day-75c-report.md`** "a new **tracked** file" (while quoting `git status → ??`) → "**untracked but
  NOT ignored**, becomes **tracked at commit** (confirmed in `604a3bc`)". The conclusion (whitelist trap
  avoided) was right; the word was wrong.
- **0 lines** marked `provenance unclear` — every swept line's provenance was establishable (all `grep -c`).

*Noted, not a finding:* Day-75 A75-2 records the `--emit-digests` output as "377 lines." Task 2's totals
line makes it a few lines longer; the historical `377` is left as the accurate record of what Day 75
observed, and the `diff certified packaged → IDENTICAL` proof is unaffected.

---

## Findings (from F26)

- **F26 — evidence-provenance drift in the Block-A close records (CORRECTED this day).** Six close records
  and the arc report typeset the derived `203 OK / 0 FAIL` grep-count inside `$`-fenced blocks as if the
  program emitted it, and R1 claimed a "byte-for-byte" match of text no program produced. The number was
  always true; the provenance was fabricated. **Corrected** by the sweep above **and** structurally closed
  by Task 2 (the backstop now prints the total from its own counters, so the figure is program-emitted).

Carried, not fixed (named): **F24** (`maxcell-driver.ts` runs work at module scope), **F25** (eleven
private `hashFiles` copies remain in `generator/src/`). **F13-B** is Leela's (below).

---

## What stays open

- **F13-B — OPEN, LEELA'S, UNCLOSABLE BY ANY SESSION.** `eco-day-69-report.md` §3 still describes "wizard →
  generate," a path Day 72 removed; it must be re-authored ("wizard → Create → workspace → Export") before
  A′.2 can run item-by-item against a control (A′.1) that was never taken.
- **F25** — eleven private `hashFiles` copies remain in `generator/src/`. Named, not fixed.
- **F24** — `maxcell-driver.ts` runs work at module scope. Named, not fixed.
- **Nothing in Bedrock's GUI has been clicked by any session.**

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
8. **The in-Bedrock router click** — Day-75c's test proves pure state only; the live click stays PENDING.
9. **GATE-NAME** (cheapest before Day 79), **GATE-LICENSE** (memo due Day 85), single-maintainer continuity.

---

## Commit

```
eco-day-75d: sync-gen copies dist/core (verified); backstop prints its own totals; evidence-provenance sweep (backstop green)
```

Change set — `generator/src/day20-regression.ts` (counter + totals print); the provenance sweep:
`docs/daily/eco-day-71-report.md`, `…-72-…`, `…-73-…`, `…-74-…`, `…-75-…`, `…-75b-…`,
`docs/daily/eco-block-A-report.md`, `docs/daily/eco-day-75c-report.md`; `docs/daily/eco-block-A-ledger.md`;
**new** `docs/daily/eco-day-75d-report.md` (this file). Pre-commit backstop GREEN (203 OK / 0 FAIL, MAXIMAL
`366e19d9deda1caf` UNMOVED). **Not pushed, not re-tagged** (Leela pushes). A commit cannot contain its own
hash — reported to Leela in the close message.
