# Block A — CONSOLIDATED CERTIFICATION RECORD (the arc audit, V.10)

**MODE: REPORT / AUDIT.** This record audits Days 71–75 + the inserted 75b against the tree, re-runs
every gate (does not read the pasted output), and states the arc's certification at exactly the strength
the evidence supports. Range: `ff6e991..HEAD` (`HEAD = 4040298`, one docs-only commit above tag
`eco-day-75` at `56e3a2d`). Arc commits: 71 `ba258f9` · 72 `f1b665f` · 73 `92393b3` · 74 `449a142` ·
75 `56e3a2d` · 75b `4040298`; block opened at `d2529df`.

---

## 1. The certification statement (at exactly the strength the evidence supports)

Across `ff6e991..HEAD`, **re-run from clean this session** (not read from the close records):

- **The frozen backstop reproduces byte-identically:** `rm -rf dist && npm run build && npm run
  day20:regress` → **203 OK / 0 FAIL**, 103 baked digests, **MAXIMAL `366e19d9deda1caf` UNMOVED**.
- **The engine was not touched:** `git diff --stat ff6e991..HEAD -- generator/` → **empty**.
- **Pure-Node discipline holds:** `generator/package.json` has **no `dependencies` key (≡ `{}`)**.
- **The wizard's blueprint meaning is byte-identical for five templates:** `npm run ui-cli` → five
  **DISTINCT** digests reproduce their committed baselines, **anchored** to the frozen TeamTracker digest
  `9e01210c55a5…` which lives in the FROZEN table (proven daily since Eco-Day 29).
- **Packaged == certified (proven, not deferred):** the bundled node reproduces the 103 digests
  byte-identical to the certified engine (Day-75 §2 A75-2; both artifacts present this shell).

**What this licenses:** *the shell arc changed no frozen hash, re-based no frozen baseline, left the
engine untouched, and did not change what a blueprint means.* Nothing stronger. See §9.

## 2. PROVEN · INSPECTED · PENDING (three columns — never two)

| PROVEN (a command, re-run, with output) | INSPECTED (plain browser, no Tauri — unreproducible) | PENDING (Leela's machine) |
|---|---|---|
| Backstop 203/0 from clean; MAXIMAL unmoved | Router transitions Welcome↔wizard↔workspace | Every in-Bedrock click (see §6) |
| `generator/` diff empty; deps `{}` | Full-window wizard step click-through | Half-B on the new shell (A′.2) |
| UI==CLI five distinct digests, anchored | Stack screen four fields writing the right keys | Create → workspace save round-trip |
| `npm run test:stack` PASS (6 checks) | Workspace empty-state / verb-bar / Advanced-corner nesting | Each workspace verb round-trip |
| Packaged==certified (bundled node == engine) | — | Store steps A′.3; GATE-NAME/LICENSE |

**"Inspected in a plain browser without Tauri" is its own category.** The Rust backend was absent, so
`invoke` fell through to its no-Tauri fallback and store paths returned nothing; and **no command
reproduces those observations.** They narrow nothing and prove nothing; they are notes, not gates.
Day 75c's router test (§7) converts the router's *pure state* from inspected to proven — but even it
stays green if the wizard is unclickable inside Tauri. **No session has clicked the shell.**

## 3. The free-leg digest history (F19 — the qualifier, intact)

The UI==CLI harness asserts five digests. **One is anchored:** TeamTracker (`9e01210c55a5…`) is the
`Spring Boot|PostgreSQL|TeamTracker` entry of the **frozen** table — byte-identical daily since Day 29.
**Four are the harness's own** (blank `f95bc87d504d…` / restApi `6f6e543a2aff…` / crud `54b0852cb532…` /
worker `fbc6c6e9aad2…`), settings-only templates **not** in the frozen 103. Their provenance, with the
qualifier that must never be dropped:

- Day 61 recorded these four as **12-char prefixes** — an ad-hoc, uncommitted proof (F3).
- Day 71 rebuilt the harness, reproduced all four **prefixes exactly on first run**, then recorded the
  **full 64-char digests** as the committed baseline (a 48-bit prior match + the anchor leg vouching for
  the harness on certified ground).
- **The precise claim:** *no **frozen** hash (the 103 / the 10 / MAXIMAL) moved, and no re-baseline of a
  frozen hash occurred.* It is **not** "no baseline of any kind entered the repo" — four new full-length
  harness baselines did, disclosed. **The short-hand "no re-baseline occurred anywhere in the arc" must
  never appear without this qualifier.** (Propagated here and to `docs/architecture/DETERMINISM.md`.)

## 4. The digest arithmetic (F20 — reconciled from source, cited by line)

From `generator/src/day20-regression.ts`, derived from named constants/loops (not the print). Full
detail in `docs/architecture/DETERMINISM.md`; summary:

- **43** = the eight frozen digest tables: FROZEN 20 (L59–80) + NAMING 5 + FORMATTING 2 + SIMPLE 4 +
  COMPOSITION 2 + API_ONLY 6 + EMAIL 2 + AI_HOOK 2 = **43**. ✔ clean.
- **103** = `digestManifest.length` (every `bake()`, L279; emitted by `--emit-digests`, L1787) = 43
  frozen + 60 additive. ✔ clean. The print's `(43 frozen + 1 MAXIMAL)` is a *partial label* (44 of 103).
- **10** = the TeamTracker relationship hashes (PART 1d, L376–387) — the TeamTracker subset re-asserted a
  second way via the `addEntity` UI path against the **same** FROZEN values; **not** 10 extra digests.
- **203** = the count of passing `record()` assertions (L217–218) — per-digest comparisons **plus** every
  non-hash property check. **This does not compose as `103 + N`:** `digestManifest.length` (103) and the
  `record()`-OK tally (203) count different things. **Honest statement:** 43/103/10 reconcile to named
  constants; 203 is an assertion-count, not an arithmetic sum — report it as "203 checks passed," never
  "203 digests."

## 5. Findings F1–F23, with status

| # | Finding | Status |
|---|---|---|
| F1 | `docs/prompts/` + `docs/THRAKSHA-*.md`-root path drift | **CORRECTED (fully, this audit)** — Forward Plan + KB (75b) + handoff + ledger-spec header + all root headers (F23) |
| F3 | UI==CLI harness never committed | **CLOSED** (Day 71) |
| F11 | `desktop/src/styles.css` unused Tauri scaffold | **CARRIED**, untouched (a future cleanup; nothing loads it) |
| F12-A | "verified live" unreproducible | language **CORRECTED** (75b + eco-day-72 this audit); the **test → Day 75c** |
| F13-B | Half-B item 2 describes a path Day 72 removed | **OPEN — LEELA'S. No session can close it.** (§6, first) |
| F14-C | harness copies `hashFiles` | **OPEN → Day 75c Task 1** |
| F15 | audit outputs absent when 75b ran | **CLOSED** (this audit exists; the sequencing is recorded) |
| F16 | `hashFiles` trapped in run-on-import `day20-regression.ts` (L1792) | **OPEN → Day 75c Task 1** (corroborated §below) |
| F17 | router inline/DOM-coupled in `main.js` | **OPEN → Day 75c Task 2** (corroborated §below) |
| F18 | Day-18/68 reports say "verified live" | **CARRIED, unedited** (historical record); note added to `LIMITATIONS.md` (R6) |
| F19 | free-leg digest qualifier | **CORRECTED** (§3 + DETERMINISM.md) |
| F20 | digest arithmetic unreconciled | **CORRECTED** (§4 + DETERMINISM.md) |
| F21 | handoff `docs/prompts/` residual + confirm ledger committed | **CORRECTED** (handoff fixed; ledger committed with this audit) |
| **F22** | **`hashFiles` duplication far wider than F16 said** | **NEW, RECORDED** → informs Day 75c + Day 85 |
| **F23** | **KB/Forward-Plan/handoff "In-repo home" root-path drift** | **NEW, CORRECTED this audit** |

**F16 corroborated:** `generator/src/day20-regression.ts:1792` → `main().catch((err) => { console.error(err); process.exit(1); });` — unconditional at module scope; importing runs the full regression.
**F17 corroborated:** `desktop/src/main.js` tail → `if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();` — `document` at module scope; headless import throws.
**F22 count (R4):** the in-memory `hashFiles` is defined in **12 `generator/src` files** — `day15-gate.ts:56`, `day17-gate.ts:52`, `day18-gate.ts:76`, `day19-gate.ts:62`, `day20-regression.ts:206`, `bench-export.ts:44`, `generate-from-snapshot.ts:27`, **`maxcell-driver.ts:22` (already `export`ed)**, `phase1-benchmark.ts:81`, `phase2-benchmark.ts:42`, `phase3-benchmark.ts:56`, `phase4-mid-benchmark.ts:49` — plus `desktop/tools/ui-cli-proof.mjs:34` = **13 implementations**. (`day12/13/14/16-gate.ts` use the disk-walk `hashTree` — different convention, not counted.)

## 6. Every PENDING live item, by name (Leela's machine; F13-B FIRST)

- **F13-B — OPEN, LEELA'S, UNCLOSABLE BY ANY SESSION.** The A′.1 control smoke never ran (no result on
  disk). Day 72 removed `generate()` and `#target-dir`, so **Half-B item 2 ("wizard → generate")
  describes a path that no longer exists.** The `eco-day-69-report.md` §3 PASS criteria must be
  **re-authored for the new shell** — "wizard → **Create → workspace → Export**" — **before A′.2 can be
  run item-by-item.** Neither the Day-72 nor the Day-75 report noticed this. It blocks A′.2.
- **Block A′.1** — pre-71 control smoke (8 Half-B items, prior shell, `git checkout ff6e991`) — never ran.
- **Day 71 live:** app opens on Welcome; every certified flow reachable; the two Welcome buttons + the
  live saved-project list; full-window wizard click-through inside Bedrock.
- **Day 72 live:** Welcome → Review → **Create → workspace**; each workspace verb round-trip (Edit /
  Preview impact / Verify / Export / Save version; the diagram via `flow_svg`).
- **Day 73 live:** the Stack screen's four fields write the right keys **inside Bedrock**.
- **Block A′.2** — full Half-B on the new shell, item-by-item vs the A′.1 control (after F13-B re-authoring).
- **Block A′.3** — the 4 Store steps: MakeAppx MSIX wrap → packaged launch + Half-B → GATE-NAME
  reservation → submission wrap (0.1.0→0.2.0) → submit (`desktop/src-tauri/msix/README.md`).
- **A headless router test** — until Day 75c Task 2 lands.
- **A canonical importable `hashFiles`** — until Day 75c Task 1 lands.

## 7. The two Day-75c tasks (planned in `eco-day-75c-plan.md`; not executed)

- **Task 1 — extract `hashFiles` to `generator/src/core/file-digest.ts`** (Leela: extract, do not guard).
  `day20-regression.ts` + `ui-cli-proof.mjs` import it and delete their copies. **Out of scope:** the
  other 11 copies (F22); changing what it computes; the FROZEN table. **Gate:** `day20:regress` 203/0 +
  MAXIMAL unmoved; `ui-cli` five distinct. Self-certifying because FROZEN digests are literal string
  constants — an extraction that altered hashing cannot also alter what it is compared against; a red
  means the copies had already drifted (a real finding).
- **Task 2 — extract a pure `desktop/src/router.js`** (the `stack-fields.js` precedent) + `router.test.mjs`
  + `test:router`. Asserts `SCREENS == {welcome,wizard,workspace}`; exactly one active screen (unknown →
  neither none nor two); the Advanced corner unreachable with no project; empty-state on null project.
  **Out of scope:** jsdom, any dependency, moving DOM into the router, any behaviour change. **Gate:**
  `test:router` PASS; `ui-cli` unchanged; backstop 203/0; `generator/` diff empty. **Stays green even if
  the wizard is unclickable in Tauri — narrows the blind spot, does not close it.**

## 8. Standing gates (Leela's desk)

- **GATE-NAME** — the "Bedrock" name reservation. Blocks Store step 3 and Day 87. **Cheapest to settle
  before Day 79**, after which `bedrock.json` is in exports and a rename becomes a documented format
  change. **PENDING.**
- **GATE-LICENSE** — options memo due Day 85. **PENDING.**
- **Single-maintainer continuity risk.** **PENDING.**

## 9. What Block A does NOT license

The arc proved the shell **does not change what a blueprint means** — the serializer is byte-identical,
anchored to a frozen digest, and the engine is untouched. **It did not prove the shell works, because no
session has clicked it.** Every live interaction is inspected-in-a-plain-browser-without-Tauri or PENDING
(Leela). A green backstop certifies the engine, not the workspace; the workspace's proof is the live
walkthrough that has not run.

## 10. The tag/text divergence (say it out loud)

The tag **`eco-day-75` (`56e3a2d`) no longer matches the current text** of the Day-71/73/75 close
records: Day 75b's F12-A language sweep (and this audit's eco-day-72 touch-up) landed **after** the tag
was placed. This is docs-only and harmless — the tag marks the certified *code* state (unchanged since
`56e3a2d`), while the *reports* were made more honest afterward. Recorded here so no future reader mistakes
the divergence for tampering.

## 11. V.10 grid — six days × the reviewer's checklist

Legend: ✔ pass · ✔* pass-with-note. Lines: (a) evidence pasted · (b) claim levels named · (c) deferred
list intact · (d) commit hash present · (e) diff-scope == plan-scope · (f) baseline change documented ·
(g) limitations updated if capabilities were.

| Day | a | b | c | d | e | f | g | Note |
|-----|---|---|---|---|---|---|---|------|
| 71  | ✔ | ✔ | ✔ | ✔* | ✔ | ✔ | ✔(n/a) | (d) hash in ledger, not in the report body (a commit can't contain its own hash) |
| 72  | ✔ | ✔ | ✔ | ✔* | ✔ | ✔(none) | ✔(n/a) | claim levels corrected here (eco-day-72 "confirms"→"inspected") |
| 73  | ✔ | ✔ | ✔ | ✔* | ✔ | ✔(none) | ✔(n/a) | `test:stack` reproduces; STEPS-only diff |
| 74  | ✔ | ✔ | ✔ | ✔* | ✔ | ✔(none) | ✔ | LIMITATIONS.md created; CAPABILITIES cross-checked, not edited |
| 75  | ✔ | ✔ | ✔ | ✔ | ✔ | ✔* | ✔ | (f) §3 already qualified ("prefixes baked to full-length"); F19 propagated here |
| 75b | ✔ | ✔ | ✔ | ✔* | ✔ | ✔(none) | ✔ | both code tasks honestly STOPPED; sweep done |

**No V.10 line FAILS.** The pass-with-notes are documentation form (hash-in-ledger; the F19 qualifier),
not evidence gaps. Every claim in every close record traces to pasted output that **re-ran identically
this session** (R1).

---

## Re-run tails (R1 — this session, not the close records)

```
# backstop, from clean
rm -rf dist && npm run build && npm run day20:regress
  → 203 OK / 0 FAIL · [digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf
  → Spring Boot|PostgreSQL|TeamTracker  9e01210c55a5a0a6

# UI==CLI
npm run ui-cli
  → ANCHOR TeamTracker 63/63 · 9e01210c55a5 ; blank 15/15 f95bc87d504d ; restApi 15/15 6f6e543a2aff ;
    crud 15/15 54b0852cb532 ; worker 15/15 fbc6c6e9aad2 ; five DISTINCT ; PASS

# stack mapping
npm run test:stack → stack-fields unit test: PASS (6 checks)
```
**All three matched the close records byte-for-byte.** No R1 disagreement → no STOP.

**R3 anchor tie (both strings quoted):**
- harness `ui-cli-proof.mjs:82` → `9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66`
- FROZEN `day20-regression.ts:65` → `9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66`
- **IDENTICAL** — the anchor ties to a digest inside the frozen table.
