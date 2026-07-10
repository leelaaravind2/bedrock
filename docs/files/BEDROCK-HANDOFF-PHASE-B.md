# THRAKSHA / BEDROCK — HANDOFF (Day 71 + Phase B: the pivot phase)
### Supersedes the "start of the UI-shell phase" handoff. Written after the strategy session of 10 Jul 2026.

## Your role
You are my senior reviewer/architect. I self-drive all Claude Code sessions and paste results
back for review. The rhythm: **you write a PLAN prompt → I run it → you review and write the
EXECUTE+REPORT prompt → I run it → you audit the report.** Honest pushback and early
risk-flagging are expected and wanted. If a plan overclaims, or a report claims something
that wasn't run, say so plainly.

## Read this first
The full knowledge transfer now lives in four documents produced this session. **Confirm they
are committed to the repo before anything else** (they were delivered as files; if absent,
ask me for them):
- `docs/files/THRAKSHA-KNOWLEDGE-BOOK.md` — the complete KT: the map and borders, the history,
  **how to think (Part III — 14 cognitive moves)**, how to do, the checks pin-to-pin,
  37 consolidated rules, cold-start protocols, glossary. Authority order it declares:
  **code > reports > governing docs > the book.**
- `docs/files/THRAKSHA-FORWARD-PLAN.md` — the day-by-day plan, Day 71 → Day 116, with decision
  gates, Stage-2 triggers, and plan-maintenance rules.
- `docs/files/BEDROCK-MASTER-CHANGE-PROMPT.md` — the template every build day fills.
- `docs/files/BEDROCK-DOCS-DAY-PROMPT.md` — Day 74's complete prompt (run AFTER Day 72).
<!-- F1/F17-F path corrections (Block-A audit): these live in docs/files/, not docs/prompts/ or docs/ root. -->


This handoff is the orientation; those four are the operating system. On conflict, the repo wins.

## What Bedrock is (one paragraph — the Book has the rest)
A **deterministic, AI-free code generator**. The blueprint is the source of truth; code is a
byte-identical projection. "AI guesses; Bedrock knows." `generator/` = pure-Node TS engine,
**deps {}**. `desktop/` = Tauri v2 shell + bundled-node sidecar + rusqlite blueprint store.
Repo `E:\Software`; Git/GitHub sole backup; commit to `main`; pre-commit runs the backstop;
**I push** (your shell has no TTY). Ships as "Bedrock", free, Windows/MSIX today — the Store
is being demoted to a checkbox; the CLI becomes the product channel (see the pivot, below).

## Certified state (unchanged this session — nothing was built, everything was decided)
Backstop `npm run day20:regress` from `generator/` → **203 OK / 0 FAIL** (103 baked digests +
10 TeamTracker + non-hash PARTs 1c–1z). **MAXIMAL `366e19d9` unmoved Day 29→70.** Packaged ==
certified (sidecar reproduces the 103; sync-gen stamp `83ffd0ad`/245 — stamp ≠ hash).
Benchmarks 75/75. Last commit `ff6e991`. **A moved baked hash is a FINDING → STOP. Never a
silent re-baseline.**

## THE STRATEGIC RESET (what this session established — do not relitigate, do build on)
Two deep-research passes (competitive landscape; the historical playbook of top-20 tools)
produced these verdicts, now standing:
1. **Determinism alone is not a moat** (commoditised in reproducible-builds/SLSA); the moat
   is **owning a diffable text format + a CI ratchet** that is scary-to-remove but honest
   (the code always survives leaving; only the *guarantee* is lost).
2. **"#20 globally" is a mirage — dropped.** The real, reachable target: **#20 inside the
   stacks of the teams that need this** — platform teams (via the CI drift-gate) and
   regulated industries (via provable, AI-free, auditable generation). Individual devs are
   lost to AI head-on; they are reached later, indirectly, via MCP ("AI drafts the
   blueprint, a human reviews the diff, Bedrock projects the code" — AI never in the path).
3. **The blockers named and being removed:** blueprint out of SQLite into canonical text;
   a cross-platform npm CLI; the CI gate; Windows-only dissolves at the CLI layer (the
   Tauri shell stays the Windows front door). **The one blocker no feature fixes:
   single-maintainer risk** — dissolved over time by the open spec, test discipline, and
   eventually a partner/contributor/institution. It is the #1 long-term threat; keep it named.
4. **Depth over breadth on stacks.** No new backends/types until existing ones climb the
   verification ladder.

## Decisions ALREADY MADE (bake in; don't reopen)
- **Create project = save the blueprint only.** Export is a later, explicit verb from the
  workspace. (The blueprint IS the project.)
- **The old command harness** → an **Advanced** corner of the workspace; reachable only once
  a project exists; never on Welcome. Revisit before the Store wrap, not before Day 71.
- **Welcome's "Open existing" = open a SAVED BLUEPRINT** (Day-63 capability → the button is
  LIVE, listing saved blueprints). Open-from-folder is Day 80 (reads the export's own
  `bedrock.json` — reopen, never inference).
- **The Stack regroup (4 steps → 1 screen) is split out to Day 73** — the router (71) is
  proven against an UNCHANGED wizard first (seam-first). UI==CLI is the shell's own
  load-bearing gate and is re-proven on 71, 72, and 73.

## The THREE DECISION GATES (mine alone — no session decides them implicitly)
- **GATE-NAME:** one global name across Store + npm + docs. "Bedrock" collides with Amazon
  Bedrock (AWS's flagship AI platform — identity/search problem for an AI-free tool) and the
  npm name is likely taken; a Store variant is prepared. Blocks Store step 3 (~$19) and
  Day 87. Fixes GATE-FILENAME (provisional `bedrock.json`; rename is cheap before Day 79).
- **GATE-LICENSE:** npm-publishing the CLI ships the engine publicly — the open-source
  question arrives concretely. Blocks Day 87; options memo due by Day 85.

## THE PLAN (full detail: the Forward Plan; summary here)
**A. Close the arc (Days 71–75):** 71 router+Welcome+full-window wizard · 72 the workspace
(diagram front and centre; Edit / Preview impact / Verify / Export / Save; Advanced corner) ·
73 Stack regroup + UI==CLI re-proof · 74 documentation day (the prepared prompt) ·
75 re-certify + release.
**A′ (my machine, parallel):** the **pre-71 control smoke** of the 8 Half-B items against the
CURRENT shell (a control, before 71 touches anything) · full Half-B on the new shell after
75 · the 4 Store steps (timeboxed; the Store is a checkbox now).
**B. Phase B — the pivot (Days 76–91):** B1 the format (76–81: spec with schemaVersion
first; canonical serializer NEW-FILES-ONLY + PART 2a; file-as-truth in the shell;
`bedrock.json` into exports — READ `buildFileSet` FIRST, the file goes alongside, the 103 do
not move; open-from-folder; hardening) · B2 the CLI (82–88: `generate/verify/check/impact/
export`, deps {} preferred, three-OS CI proof — **Day 85 Linux is the riskiest day of the
phase**, any cross-OS byte diff is a STOP-and-diagnose) · B3 the gate (89–91: GitHub Action +
pre-commit, dogfooded on this repo; Phase-B certification; **tag v0.3.0**).
**C. Stage 2 (92–116, EVIDENCE-GATED — triggers in the Forward Plan, never speculative):**
MCP server · Generation-Gap safe regeneration (opt-in layout, default = literal bypass;
NEVER protected regions) · deterministic migrations (renames explicit, never inferred) ·
signed attestations.
**D. Calendar (not build days):** the gates · spec publication + conformance fixtures after
91 · ONE design partner after 91 (the pitch is `npx <name> verify` live in their pipeline) ·
institutional continuity, ongoing.

## THE TOTAL DAY COUNT (asked for explicitly — the honest arithmetic)
| Milestone | Build days | Running total |
|---|---|---|
| A: the shell becomes a product (71–75) | 5 | 5 |
| B: format → CLI → CI gate (76–91) | 16 | **21** |
| **→ v0.3.0: the PUBLISHABLE, #20-CAPABLE end-user product** (GUI on the Store + CLI on npm + the gate) | | **21 build days** (~25 with honest contingency for findings/fix-days) |
| C: full Stage-2 feature set, if every trigger fires (92–116) | ~25 | **~46** (~50–55 with contingency) |
| A′/D: Store steps, Half-B, gates, spec, partner | calendar-parallel, ~2–4 weeks elapsed | — |

**The asterisk that stays attached to every number above:** build days buy *publishable and
capable*. The **rank itself is adoption** — teams putting `bedrock check` in their pipelines —
and that clock runs in **calendar years (realistically 3–5), not build days**. 21 days of
building; years of being used. Both halves are the answer; never quote one without the other.

## Non-negotiable invariants (full set: Knowledge Book Part VI — the load-bearing five here)
1. Frozen set byte-identical every day; moved hash = FINDING → STOP; re-baselines deliberate,
   documented, isolated, never silent. 2. Shell work = SHELL/UI ONLY; engine extension =
   NEW FILES ONLY; every default path a literal bypass (the manifest trap). 3. The shell is a
   thin client — the engine computes, JS paints. 4. deps {} forever; no AI anywhere
   (ADR-001); no round-trip; no inference-import. 5. Claim only what's proven: **Verify =
   REPRODUCIBILITY, never correctness · Law 21 = no FUNCTIONAL dependency, inert provenance
   comments remain, the container boot has never run here, "no trace" is forbidden · the
   Map highlights what we can certify, not what would look good.** Deferred = PENDING, named.

## Environment constraints (honest-manual — never fake around them)
No GUI in your shell (all live clicks are mine → PENDING) · Docker down · no Go/Java ·
Semgrep-native not on Windows · no AI key · no MakeAppx · C: tight. Verification ladder:
Express runtime · FastAPI/Django syntax · Go/Spring generation-only.

## First moves in the new chat (in order)
1. Confirm the four documents are committed (paths above). If not — ask me for them first.
2. Confirm I've run (or will run) the **pre-71 control smoke** on my machine.
3. Then write the **Day 71 PLAN prompt** — screen router + Welcome + full-window wizard,
   steps untouched, via the Master Change Prompt, exactly per Forward Plan Day 71: shell/UI
   only, backstop byte-identical, UI==CLI re-proven, live click-through PENDING (mine).
4. Standing duty: flag not only whether effort is spent well, but whether it's spent on the
   right thing. That is the deal.
