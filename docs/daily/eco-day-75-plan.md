# Eco-Day 75 — PLAN: re-certify + release the shell arc

**MODE: PLAN.** No code, no build. Master Change Prompt filled. Block task table + full findings in
`eco-day-71-plan.md`. Baseline `ff6e991`, backstop 203/0, MAXIMAL `366e19d9` unmoved.

## THE STANDING INVARIANTS (verbatim)
1. Same input → byte-identical output; frozen 103+10+MAXIMAL byte-identical at every close. **A moved
   baked hash is a FINDING → STOP.**
2. Every new capability's default/empty/off path is a **literal bypass** (the manifest trap).
3. **Block A is SHELL/UI ONLY.** No `generator/src/` changes. Existing PARTs unchanged.
4. The shell is a thin client. No generation logic / JS diffs / path heuristics in JS or Rust.
5. `generator/package.json` → `"dependencies": {}`. Any new Rust crate is deliberate + documented.
6. AI never in the generation path (ADR-001).
7. Claim only what is proven. Verify = reproducibility. Law 21 = no FUNCTIONAL dependency; "no trace"
   is forbidden. Deferred = PENDING, named.
8. **Stamp ≠ hash.** The sync-gen stamp moves legitimately when dist entries land — state the
   load-bearing claim (*the bundled node reproduces the 103 frozen digests*), not the stamp.
9. New root/new-dir files → explicit `.gitignore` un-ignore rule + `git status` shows the file.
10. No ceremonial proofs — every gate names the failure it catches.

> Rule 20 (gate after every step) is NOT suspended.

## 1–3. Context / invariants / read-first
As `eco-day-71-plan.md` §1–3. Additionally read THIS day: `eco-day-69-report.md` (the packaged
certification it claims + Half-B §3), `eco-day-70-report.md` (the release record + the artifact-label
note), `desktop/src-tauri/msix/README.md` (the Store runbook), `desktop/CLAUDE.md` (the sync-gen +
packaged==certified mechanics), and the A71–A74 reports (this arc's work).

## 4. The task
- **DAY-ID:** `eco-day-75`
- **GOAL (one load-bearing thing):** the 71–74 shell work **certified together, from clean**, and the
  arc released — a consolidated certification record that lists every PENDING live item by name.
- **WHY:** the block ran as one execute session; Day 75 is the guard-the-guard close that re-proves,
  from a clean tree, that the router + workspace + Stack regroup + docs moved no frozen hash and
  changed no blueprint meaning, then writes the honest release.
- **IN SCOPE:** full backstop from clean; packaged==certified re-proof (or PENDING, named);
  consolidated UI==CLI statement; RELEASE-NOTES + CAPABILITIES updated (honest limitations carried
  forward); root README/CAPABILITIES alignment; the version note; a tag; the consolidated report.
- **OUT OF SCOPE (explicit):** the Store submission wrap itself (Leela's Block-A′.3 — the
  `0.1.0→0.2.0` one-line manifest edit is hers to make at submission; here it is only *noted* as
  hash-independent); the full Half-B walkthrough (Leela's A′.2 — its result is recorded here as
  PENDING, never run by this session); any new capability; any `generator/src/` change.
- **DESIGN NOTES (resolved by reading):** `resources/gen/` and the bundled `node-<triple>.exe` are
  **gitignored** (regenerated, not committed). The packaged==certified re-proof (A75-2) needs the
  bundled node binary + a fresh `resources/gen` (via `sync-gen`) in the execute shell. If they are
  absent, A75-2 is **PENDING (Leela)** — do not fake it. The installer version string in
  `tauri.conf.json` is `0.1.0`; the `0.2.0` bump is the Store submission wrap (moves no frozen hash).

## 5. Done-conditions
1. Full backstop **from clean** → 203 OK / 0 FAIL; MAXIMAL `366e19d9` unmoved; 103 digests asserted.
   — **gate = A75-1.**
2. Packaged sidecar still reproduces the 103 (packaged==certified) — the load-bearing claim stated
   explicitly, **not** the stamp. — **gate = A75-2 (or PENDING, named).**
3. Consolidated UI==CLI statement — the A71-1 harness reproduces all recorded digests. — **gate =
   A75-3.**
4. RELEASE-NOTES + CAPABILITIES updated; honest limitations carried forward; root docs aligned; the
   installer version-string bump noted as a one-line, hash-independent submission-wrap edit (NOT done
   here). — **gate = A75-4** (backstop 203/0 + git scope docs/config only).
5. A tag, and a consolidated `eco-day-75-report.md` — the arc's certification record — **listing every
   PENDING live item by name.** — **gate = A75-5** (KB V.10 reviewer checklist).

## 6. Proof & gates
- **A75-1** full from clean · **A75-2** packaged==certified (bundled node vs
  `resources/gen/dist/day20-regression.js --emit-digests` → 103; else PENDING) · **A75-3** UI==CLI
  harness · **A75-4** docs+version, backstop still green + git scope docs/config only · **A75-5** tag
  + consolidated report vs V.10.
- **The stamp sentence to write (V.4):** *"The sync-gen stamp is a content hash of the sidecar
  payload; it changed from N→M because dist entries landed. That is not a generation-hash move. The
  bundled node still reproduces the 103 frozen digests."* — never report the stamp as the proof.

## 7. Environment constraints
No GUI. A75-2 may be PENDING if the bundled node binary is absent. The full Half-B walkthrough
(A′.2) and the 4 Store steps (A′.3) are Leela's — recorded PENDING, by name, in the report. Rest as
`eco-day-71-plan.md` §7.

## The consolidated report MUST list, by name, every PENDING live item
- Block A′.1 pre-71 control smoke (8 Half-B items, current shell) — the control.
- Block A′.2 full Half-B on the NEW shell (item-by-item vs the A′.1 control).
- Day 71/72/73 live wiring checks (Welcome buttons + flows; Create→workspace; each verb; the Stack
  screen's four keys).
- A75-2 packaged==certified if the bundled node binary was absent.
- Block A′.3 the 4 Store steps (MakeAppx wrap → packaged launch+Half-B → GATE-NAME reservation →
  submission wrap → submit).
- The standing gates on Leela's desk: GATE-NAME, GATE-LICENSE, single-maintainer risk.

## OUT-OF-SCOPE, restated (Rule 19)
The Store submission wrap · running Half-B · any new capability · any `generator/src/` change · a
new PART. Any of these in execution = STOP.
