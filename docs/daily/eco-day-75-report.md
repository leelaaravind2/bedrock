# Eco-Day 75 — CLOSE RECORD: the shell arc re-certified + released

**MODE: EXECUTE close record** — the Day-75 ✦ close of Block A (Days 71–75). Factual per §6 of the block
brief. The next session audits/consolidates all five close records against Knowledge Book V.10; this is a
record, not that audit. Baseline: Days 71–74 CLOSED + committed (`ba258f9`, `f1b665f`, `92393b3`,
`449a142`).

**Day-75 goal:** the 71–74 shell work certified together **from clean**, and the arc released — with every
PENDING live item listed by name.

---

## 1. What the arc built (the five days, in brief)

- **Day 71** (`ba258f9`) — the committed UI==CLI harness (`desktop/tools/ui-cli-proof.mjs`; closes F3),
  the screen router, Welcome, full-window wizard.
- **Day 72** (`f1b665f`) — Create → workspace (abstract project handle), the diagram-centred workspace
  with certified-command verbs, the Advanced corner.
- **Day 73** (`92393b3`) — the Stack regroup (four steps → one screen) + the pure, unit-tested field→key
  mapping (`desktop/src/stack-fields.js`, `npm run test:stack`).
- **Day 74** (`449a142`) — the full end-user manual + architecture docs + `docs/LIMITATIONS.md` (docs-only).
- **Day 75** (this close) — re-certification from clean, packaged==certified, consolidated UI==CLI,
  RELEASE-NOTES + CAPABILITIES + F1 corrections, tag.

**Day-75 files (docs/config only):** `RELEASE-NOTES.md` (Days-71–75 shell section + installer-version
note), `CAPABILITIES.md` (the product-shell subsection at honest levels + the new-shell PENDING carried
into §5), `docs/files/THRAKSHA-FORWARD-PLAN.md` + `docs/files/THRAKSHA-KNOWLEDGE-BOOK.md` (F1
`docs/prompts/`→`docs/files/` corrections), the ledger, and this report. `README.md` was aligned at
A74-1. **No `generator/src` change; no `tauri.conf.json` change.**

## 2. Gates (pasted output)

**A75-1 — full backstop FROM CLEAN:**
```
$ cd generator && rm -rf dist && npm run build && npm run day20:regress
[digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  → 203 OK / 0 FAIL
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf  (UNMOVED)
```

**A75-2 — packaged == certified (bundled node reproduces the 103):** BOTH artifacts present in this shell
(the bundled `node-x86_64-pc-windows-msvc.exe` and `resources/gen`), so this is **proven, not PENDING**.
```
$ node generator/dist/day20-regression.js --emit-digests                              > certified.txt   (377 lines)
$ node-x86_64-pc-windows-msvc.exe resources/gen/dist/day20-regression.js --emit-digests > packaged.txt   (377 lines)
$ diff certified.txt packaged.txt   → IDENTICAL
  packaged: 103 DIGEST lines; MAXIMAL composition cell == 366e19d9deda1caf
$ npm run sync-gen:check → OK — resources match the current generator build (83ffd0ad4683920e…)
```
**Load-bearing claim (not the stamp):** the bundled node reproduces the 103 frozen digests byte-identical
to the certified engine. The sync-gen stamp `83ffd0ad…` is **unchanged** from Day 70 — the arc landed no
new generator dist entries, so the stamp did not move; that is not a hash move regardless.

**A75-3 — consolidated UI==CLI (`npm run ui-cli`):**
```
  OK   ANCHOR TeamTracker  63/63 files · digest 9e01210c55a5 · == 9e01210c55a5 (full committed baseline)
  OK   free   blank        15/15 files · digest f95bc87d504d · == f95bc87d504d
  OK   free   restApi      15/15 files · digest 6f6e543a2aff · == 6f6e543a2aff
  OK   free   crud         15/15 files · digest 54b0852cb532 · == 54b0852cb532
  OK   free   worker       15/15 files · digest fbc6c6e9aad2 · == fbc6c6e9aad2
  OK   five digests DISTINCT (5/5)
UI==CLI harness: PASS
```

**A75-4 — release docs + F1, backstop still green, git scope docs/config only:**
```
  → 203 OK / 0 FAIL ; MAXIMAL 366e19d9deda1caf unmoved
$ git diff --stat generator/   → (empty)
$ git status (Day-75 scope): CAPABILITIES.md, RELEASE-NOTES.md,
  docs/files/THRAKSHA-FORWARD-PLAN.md, docs/files/THRAKSHA-KNOWLEDGE-BOOK.md, docs/daily/*  (all docs)
```
Installer version: `tauri.conf.json` still `0.1.0`; the `0.2.0` string is set at the Store submission
wrap (a one-line, hash-independent manifest edit) — **noted, not made here**.

## 3. Baseline record

**No frozen hash moved across the entire arc.** The 103 baked digests + MAXIMAL `366e19d9…` reproduce
byte-identical from clean (A75-1). **No re-baseline** was performed anywhere in Days 71–75. The Day-71
free-leg digests were the first *mechanical reproduction* of the transcribed Day-61 prefixes (matching
prefixes baked to full-length), not a re-baseline (F3, `eco-day-71-report.md` §5).

## 4. Findings (this arc)

- **F3 closed** — the UI==CLI harness is now committed and anchored to a frozen digest.
- **F11** — `desktop/src/styles.css` is unused Tauri scaffold; the real styling is inline in
  `index.html`. Left untouched (a possible later cleanup, out of Block-A scope).
- **F1 corrected** in the Forward Plan + Knowledge Book (`docs/prompts/`→`docs/files/`). **F1 residual:**
  `docs/files/BEDROCK-HANDOFF-PHASE-B.md` still references `docs/prompts/` (A75-4 named only the two files
  above; the handoff is flagged for a later docs pass — the files live in `docs/files/`).
- `generator/package.json` has no `dependencies` key (≡ `{}`; unchanged by the arc) — invariant holds.

## 5. PENDING — every live item, by name (Leela's machine; no GUI here)

**Block A′.1 — pre-71 control smoke** (8 Half-B items on the *current* shell at `ff6e991`) — the control
for every live check below. **PENDING** (no written result on disk).

**Day 71 live wiring:**
- App opens on Welcome only; every certified flow reachable. **PENDING.**
- Welcome's two buttons; *Open a saved project* lists saved blueprints and loads one; *Create* enters the
  wizard. **PENDING** (verified only in a plain browser without Tauri).
- Full-window wizard click-through end-to-end inside Bedrock. **PENDING.**

**Day 72 live wiring:**
- Welcome → wizard → Review → **Create → workspace** path works (the `save_blueprint` round-trip). **PENDING.**
- Each workspace verb round-trips to its certified command with rendered engine output — Edit / Preview
  impact / Verify / Export / Save version; the diagram front-and-centre via `flow_svg`. **PENDING.**

**Day 73 live wiring:**
- The one Stack screen collects the four fields into `selections.{backend,frontend,database,auth}`
  **inside Bedrock**. **PENDING** (the field→key mapping is unit-tested and demonstrated in a plain
  browser; the full in-Bedrock click remains PENDING).

**Block A′.2 — full Half-B on the NEW shell** (item-by-item vs the A′.1 control), after this arc. **PENDING.**

**A75-2 packaged==certified** — **NOT pending this session** (both artifacts were present; proven above).
It becomes PENDING only in a shell where the bundled node binary or a fresh `resources/gen` is absent
(both gitignored).

**Block A′.3 — the 4 Store steps:** MakeAppx MSIX local-test wrap → packaged launch + Half-B → GATE-NAME
reservation (~$19) → submission wrap (0.1.0→0.2.0) → submit. **PENDING** (`desktop/src-tauri/msix/README.md`).

**Standing decision gates on Leela's desk:** GATE-NAME (the "Bedrock" name reservation), GATE-LICENSE,
single-maintainer continuity risk. **PENDING** (Forward Plan).

## 6. Commit + tag

Day-75 work committed at the day close: `eco-day-75: re-certify the shell arc from clean + packaged==certified
+ release docs + F1 corrections (backstop green, 203 OK / 0 FAIL)`. Tag: `eco-day-75` (the arc close).
Hash recorded in the ledger post-commit. Not pushed (Leela pushes).
