# Eco-Day 75e — REPORT: two audits + one conditional fix

**MODE: REPORT.** Two audits and one read-only reconnaissance. Baseline HEAD `91fa3bf` (Day 75d). Tag
`eco-day-75` at `56e3a2d`. No push, no re-tag. Authority order: **THE CODE > reports > governing docs >
Knowledge Book > ledger.**

**Result:** the FAIL-signal audit clears the backstop — it **cannot** print `0 FAIL` with a FAIL line, and
**cannot** exit `0` on a red (Q1=NO, Q2=NO), proven by code **and** an isolated relationship-loop mutation.
**No fix was needed** (F27 closed on sight). The rename reconnaissance is decisive and unsoftened: the
string **`Thraksha` is EMITTED** into every generated project's provenance, so **renaming it moves all 103
frozen digests + MAXIMAL.** `bedrock.json` is not written anywhere yet. This day changed **no tracked
code** — it is an audit + a list.

---

## TASK 1 — the FAIL-signal audit (read-only)

### Every pass/fail emission site × three questions

Line numbers are `generator/src/day20-regression.ts`.

| # | Emission site | line | Through `record()`? | Increments a counter? | Sets `pass=false`? |
|---|---|---|---|---|---|
| 1 | `record()` itself: `if (ok) okCount+=1; else { pass=false; failCount+=1; }` then prints `OK`/`FAIL` | L220-223 | — (it **is** `record`) | **YES** (`okCount`/`failCount`) | **YES** on fail |
| 2 | relationship-loop **direct** print: `…{ uiOk=false; process.stdout.write(\`  FAIL ${backend}\|${db} …\`) }` | L390 | **NO** | **NO** (by itself) | **NO** by itself — sets local `uiOk=false` |
| 3 | relationship-loop **aggregate**: `record(uiOk, 'UI-declared TeamTracker … == 10 baselines …')` | L392 | **YES** | **YES** (when `uiOk===false`) | **YES** (when `uiOk===false`) |
| 4 | the totals line: `` `${okCount} OK / ${failCount} FAIL …` `` | L1794 | prints the counters | — | — |
| 5 | the verdict word: `Day-20 regression: ${pass ? 'PASS' : 'FAIL'}` | L1795 | reads `pass` | — | — |
| 6 | the exit code: `if (!pass) process.exit(1)` | L1796 | reads `pass` | — | drives exit |
| 7 | `main().catch((err) => { console.error(err); process.exit(1); })` | L1799 | — | — | exit 1 on throw |

Site #2 is the only per-check emission that does **not** go through `record()`. But it fires **only**
inside `if (got !== FROZEN[...])`, which in the same block sets `uiOk = false`; and the aggregate
`record(uiOk)` at **L392 runs unconditionally** after the loop closes (L391). So **any** L390 FAIL line
⟹ `uiOk=false` ⟹ `record(false)` at L392 ⟹ `failCount ≥ 1` **and** `pass=false`.

### The two questions this day exists for — answered from the code

- **Q1: Can it print `0 FAIL` while a FAIL line appears? → NO.** The only FAIL-line producers are
  `record()` (L222, which increments `failCount`) and the relationship direct print (L390). L390 fires only
  with `uiOk=false`, which L392's unconditional `record(uiOk)` converts to `failCount+1` (L221). So whenever
  **any** FAIL line appears, `failCount ≥ 1` — the total can never read `0 FAIL`. **Deciding lines: L390
  (`uiOk=false`) → L392 (`record(uiOk)` unconditional) → L221 (`failCount+=1`).**
- **Q2: Can it exit `0` while a FAIL line appears? → NO.** Exit is `if (!pass) process.exit(1)` (L1796) and
  `main().catch → exit 1` (L1799). Any `record(false)` sets `pass=false` (L221). L390 → `uiOk=false` → L392
  `record(false)` → `pass=false` → exit 1. A generation throw skips the tail entirely and exits 1 via L1799.
  **Deciding lines: L221 (`pass=false`), L392, L1796.**

### The pre-commit hook — does it gate on the exit code?

**YES — it gates on the exit code.** `.githooks/pre-commit` L23-26:
```
if ! npm run day20:regress >"$LOG" 2>&1; then
  echo "[pre-commit] BLOCKED: day20:regress FAILED — the determinism backstop is RED. Commit aborted."
  tail -8 "$LOG"; exit 1
fi
```
It trusts `process.exit(1)` — a red exit blocks the commit. (The resources-freshness check L30-38 is a
non-blocking WARNING by design.) So Q2 is the load-bearing question for the hook, and Q2=NO.

---

## TASK 2 — the conditional fix: **NOT NEEDED** (Q1=NO, Q2=NO)

Per the prompt: both `no` ⟹ nothing to fix; paste the evidence; close F27. The strongest evidence is an
**isolated** relationship-loop failure — the exact path 75d's FORMATTING mutation never exercised. In
**gitignored `dist/` only** (tracked source untouched), I broke *only* the relationship loop's FROZEN
lookup key (`…|TeamTracker` → `…|TeamTrackerZZ` → always undefined → always mismatches), leaving PART 1a's
real comparison intact.

```
# dist/day20-regression.js (gitignored): if (got !== FROZEN[`${backend}|${db}|TeamTrackerZZ`]) { … }
node dist/day20-regression.js ; echo "exit: $?"

  FAIL Spring Boot|PostgreSQL 9e01210c55a5a0a6     ← L390 direct print fired (×10, all cells)
  FAIL Express|PostgreSQL dca2b4a7a301df5e
  … (10 direct FAIL lines total) …
  FAIL UI-declared TeamTracker (incl. multi-edge Ticket) == 10 baselines byte-for-byte   ← L392 record()
  202 OK / 1 FAIL  (the backstop's own record() totals — not a grep)     ← TOTAL IS NON-ZERO, NOT 0 FAIL
  Day-20 regression: FAIL
  exit: 1                                                                ← EXIT IS NON-ZERO

  cross-check: grep -c '^  OK  ' = 202 ; grep -c '^  FAIL' = 11
  PART 1a matrix: OK Spring Boot|PostgreSQL|TeamTracker 9e01210c55a5…   ← isolation confirmed (1a stayed GREEN)

# revert: rm -rf dist && npm run build → 203 OK / 0 FAIL, exit 0, 'TeamTrackerZZ' gone from dist; git diff empty
```

**This proves both `no` for the exact feared path:** 10 uncounted L390 direct-FAIL lines appeared, yet the
program printed **`1 FAIL`** (not `0`) — L392's `record(uiOk=false)` caught the aggregate — and exited **1**.
A `0 FAIL` / exit-0 lie is impossible.

**F27 → CLOSED on sight.** No routing change made (making one would be inventing work the audit disproved).

**F28 (the honest nuance, named not fixed):** the L390 per-iteration diagnostics are **not** counted by
`failCount` — the aggregate is counted **once** by L392. So on a relationship-path red, `grep -c '^  FAIL'`
(counts FAIL **lines** = 11) exceeds the printed `failCount` (counts **checks** = 1). Both are non-zero, so
there is **no** signal/exit hole; but the 75d claim "printed total == `grep -c`" holds **on green only**
(203 == 203). Not a trust hole; routing L390 through `record()` would make the two agree, but that is out of
scope here because Q1/Q2 are both NO. Recorded so Days 89-91 don't build a CI assertion on "printed ==
grep-lines."

### Standing gates (unaffected — no code changed)
```
cd generator && rm -rf dist && npm run build && npm run day20:regress → 203 OK / 0 FAIL · MAXIMAL 366e19d9deda1caf UNMOVED · exit 0
(no ui-cli/test:stack/test:router re-run needed: zero tracked-source change; git diff empty)
```

---

## TASK 3 — rename reconnaissance (READ-ONLY; nothing changed)

**GATE-NAME settled: the product becomes Namaha.** The decisive question: does `Bedrock`/`Thraksha` (any
case) appear in anything the **generator emits** (inside `GeneratedFile.content`)?

### The decisive answer — do not soften it

**`Thraksha` is EMITTED into every generated project. The rename moves ALL 103 frozen digests + MAXIMAL.**
Empirically confirmed: a single generated Spring `DemoApp` project has **11 files containing `Thraksha`**:
```
node dist/generate.js /tmp/namaha-recon --yes ; grep -ril thraksha /tmp/namaha-recon   → 11 files
  GENERATION-MANIFEST.txt                                   ← every project (regen.ts:58,73)
  docker-compose.yml                                        ← every stack (template comment)
  backend/.../ticket/Ticket*.java  (8 entity files)         ← every entity (THRAKSHA-OWNED headers)
  backend/.../db/migration/V2__create_tickets.sql           ← every entity (-- THRAKSHA-OWNED)
```
The GENERATION-MANIFEST, the `THRAKSHA-OWNED` entity headers (all 5 backends —
`plugins/{spring,express,python,django,go}/entity-codegen.ts` + `spring-plugin.ts` + `go-plugin.ts`), and
the docker-compose comment are in **every one of the 103 cells**; `MAXCELL_DESCRIPTION` ("every Thraksha
feature…", `maxcell-fixture.ts:38`) flows into the MaxCell README → **MAXIMAL**. **`Bedrock` is NOT emitted
anywhere** — it is the shell/product name only. So: renaming the product/shell `Bedrock`→`Namaha` moves no
hash; **unifying the emitted `Thraksha` provenance to `Namaha` is a deliberate, documented re-baseline of
all 103 + MAXIMAL** (the same class of move as Eco-Day 29's MAXIMAL re-baseline — not a silent one).

### Classification (traced, not guessed)

**EMITTED — inside `GeneratedFile.content`; renaming moves hashes (all `Thraksha`):**
| Mechanism | source | scope |
|---|---|---|
| GENERATION-MANIFEST.txt header `Thraksha — Generation Manifest`, `[T] Thraksha-owned` | `core/regen.ts:58,73` | **every project → all 103 + MAXIMAL** |
| Entity/SQL headers `THRAKSHA-OWNED — regenerated…`, `created once by Thraksha` | `plugins/*/entity-codegen.ts` (×5), `spring-plugin.ts:273,298`, `go-plugin.ts` | **every entity, all backends** |
| semgrep-rules.yml `# THRAKSHA-OWNED`, rule ids `id: thraksha-*` | `core/security.ts:44,48,62,70,78,102` | projects with the security CI artifact |
| `<!-- THRAKSHA-SLOT … -->` marker | `core/slots.ts:45` | only when slots declared (additive baselines, not the default 103) |
| docker-compose comment `depends on nothing from Thraksha` | `plugins/{express,django,go,python,spring}/templates/docker-compose.yml:4` | every project |
| Go shell headers `// THRAKSHA-owned shell.`, README, `python/app/db.py` comment | `plugins/go/templates/internal/*.go` (×8), `go/templates/README.md:18`, `python/templates/app/db.py:4` | Go / Python cells |
| MaxCell description `every Thraksha feature…` | `maxcell-fixture.ts:38` | **MAXIMAL** |

**CONFIG — the shell product name `Bedrock`; free to rename, moves no hash:**
- `desktop/src-tauri/tauri.conf.json:3` `productName: "Bedrock"`, `:5` `identifier: "com.thraksha.bedrock"`, `:14` window `title: "Bedrock"`.
- `desktop/src/index.html:6` `<title>`, `:105` brand `<h1>`, `:119` welcome `<h2>`, `:265,268` export-note copy.
- `desktop/src/main.js` — user-facing strings ("not running inside Bedrock", "Bedrock's generator…") at L228,245,276,327,330,359,369,377,380,394,403,442,443,459,483,496,521,591,597,604,673.
- `desktop/src-tauri/msix/AppxManifest.xml:29,45,47` (DisplayName / Application Id / `Bedrock.exe`) + `msix/README.md` (runbook, many).
- `desktop/src-tauri/src/store_commands.rs:17,23` — `%APPDATA%/com.thraksha.bedrock/` + `bedrock-blueprints.sqlite` (a rename here is also a store-path migration for existing installs).

**INTERNAL — engine/shell source identifiers, comments, env vars, tmpdirs; free to rename, moves no hash:**
- Every `generator/src/**` file-header comment `* Thraksha — …`; the `ownership: 'thraksha'` union-type value (metadata, **not** content); env vars `THRAKSHA_AI_FILL_KEY`/`_SCAN_KEY`/`_ENDPOINT`/`_MODEL`, `THRAKSHA_UI_OUTPUT`/`_STORE`, `THRAKSHA_ORG_PROFILE`, `THRAKSHA_BP_IN`/`_OUT`; tmpdir names `thraksha-*`; test regexes (`FUNCTIONAL_IMPORT`, `/THRAKSHA-OWNED/.test(content)` assertions). Shell source header comments `// Bedrock …` / `// Thraksha desktop shell`.

**HISTORICAL — `docs/daily/**`; a record of what each session claimed; NOT to be rewritten** (same principle that left eco-day-18/68 alone).

### `bedrock.json` — written anywhere today?

**NO.** `find /e/Software -name bedrock.json -not -path '*/node_modules/*'` → **0 files**; Glob `**/bedrock.json`
→ no files. It remains **planned for Day 79** (after which it enters exports and a rename becomes a documented
format change). Evidence: both searches returned empty. The rename is therefore **cheaper now** than after
Day 79.

---

## Findings (from F27)

- **F27 — the FAIL-signal hole — CLOSED ON SIGHT.** Q1=NO, Q2=NO. The backstop cannot print `0 FAIL` with a
  FAIL line, nor exit `0` on a red: the sole non-`record()` emission (L390) is unconditionally backed by
  `record(uiOk)` at L392, which owns the counter and `pass`. Proven by code + the isolated relationship-loop
  mutation (`202 OK / 1 FAIL`, exit 1). No fix made or needed.
- **F28 — count-granularity between the printed `failCount` and raw FAIL-line count (named, not fixed).** L390
  diagnostics aren't counted; on a relationship-path red `grep -c '^  FAIL'` (11) > printed `failCount` (1).
  Both non-zero — no signal/exit hole. The 75d "printed == grep" claim is **green-only**. Out of scope to fix
  here (Q1/Q2 both NO). Flagged for Days 89-91 (do not assert printed == grep-line-count in the CI gate).
- **F29 — the rename cost (reconnaissance).** `Thraksha` is emitted in every project's provenance
  (GENERATION-MANIFEST + every entity/SQL header + docker-compose + MaxCell README) → **renaming the emitted
  `Thraksha` provenance moves all 103 + MAXIMAL** (a deliberate documented re-baseline). `Bedrock` is emitted
  **nowhere** (shell/product name only → CONFIG, moves nothing). `bedrock.json` not written yet. The rename
  day must decide: product-only (`Bedrock`→`Namaha`, no hash move, but exported code still says "Thraksha") vs.
  also unifying the emitted codename (all 103 + MAXIMAL re-baseline).

Carried, named, not fixed: **F24** (`maxcell-driver.ts` runs work at module scope), **F25** (eleven private
`hashFiles` copies remain). **F13-B** is Leela's (below).

---

## What stays open

- **F13-B — OPEN, LEELA'S, UNCLOSABLE BY ANY SESSION.** `eco-day-69-report.md` §3 still describes "wizard →
  generate," a path Day 72 removed; re-author to "wizard → Create → workspace → Export" before A′.2 can run
  item-by-item vs the never-taken A′.1 control.
- **F29** — the rename (Day 79-ish): renaming emitted `Thraksha` = all 103 + MAXIMAL re-baseline. Named.
- **F25 / F24 / F28** — named, not fixed.
- **Nothing in Bedrock's GUI has been clicked by any session.**

### PENDING live items, by name (Leela's machine; F13-B FIRST)

1. **F13-B** — re-author `eco-day-69-report.md` §3, THEN run A′.2 item-by-item.
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
9. **GATE-NAME** settled (Namaha) — the RENAME execution (F29) is a later day; **GATE-LICENSE** (memo due Day
   85); single-maintainer continuity.

---

## Commit

```
eco-day-75e: FAIL-signal audit (+ fix if needed); rename reconnaissance (read-only) (backstop green)
```

Change set — **docs only** (no tracked code changed this day): **new** `docs/daily/eco-day-75e-report.md`
(this file); `docs/daily/eco-block-A-ledger.md` (updated). The FAIL-signal audit needed no code change (F27
closed on sight); Task 3 changed nothing (read-only). Pre-commit backstop GREEN (203 OK / 0 FAIL, MAXIMAL
`366e19d9deda1caf` UNMOVED). **Not pushed, not re-tagged** (Leela pushes). A commit cannot contain its own
hash — reported to Leela in the close message.
