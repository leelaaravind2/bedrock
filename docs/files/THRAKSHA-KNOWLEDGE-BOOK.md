# THRAKSHA / BEDROCK — THE KNOWLEDGE BOOK
### The complete knowledge transfer. For any LLM, any Claude, any human who must understand, review, or extend this software.

> **In-repo home:** `docs/files/THRAKSHA-KNOWLEDGE-BOOK.md` <!-- F23 (Block-A audit): docs/files/, not docs/ root. -->
> **Authority order (memorize this first):** THE CODE > the daily reports > the governing docs > this book.
> This book orients you; it is never the final word. If this book and the repo disagree, the repo
> is right and the disagreement is a finding to report. A knowledge book that claims final
> authority rots into a lie; this one refuses to.

---

# PART 0 — HOW TO USE THIS BOOK

You are (probably) a fresh session with no memory. Read in this order:

1. This book, Parts I–III (the map, the history, how to think). ~20 minutes.
2. `docs/THRAKSHA-GUARDRAILS.md` in the repo — the constitution. Non-negotiable.
3. The most recent `docs/daily/eco-day-NN-report.md` — the actual current state.
4. Then, and only then, the code the day's task touches.

If you were handed a task prompt alongside this book, the prompt's read-first list wins on
ordering. If you were handed nothing, go to Part VIII (cold-start protocols).

---

# PART I — THE MAP: WHAT THIS IS, AND ITS BORDERS

## I.1 The thesis (every decision serves this; a decision that violates it is wrong)

> **Reduce AI reliance for anything software can do deterministically.** Software does
> everything with definite, certain structure — free, instant, byte-identical. AI is confined
> to the few things that genuinely need creativity or judgment, and even then it is optional,
> detachable, advisory-only, and the developer's own key and bill.

The product expression of the thesis: **the blueprint is the source of truth; code is a
byte-identical projection of it.** Positioning line: **"AI guesses; Bedrock knows."**

The one-line test to run against ANY proposed change:
*Does this keep AI out of the deterministic path, and does it do deterministically everything
that can be done deterministically?* If no — stop, the change is wrong, no matter how useful.

## I.2 What Bedrock IS

- A **deterministic, AI-free code generator**. You describe an application's shape (project
  type, stack, entities, fields, relationships) in a blueprint; the engine projects it to a
  complete codebase. Same blueprint → byte-identical output. Always. Proven by frozen hashes.
- **Ships as "Bedrock"** (internal name Thraksha), free, currently Windows-only via the
  Microsoft Store as MSIX (Microsoft signs at certification). The Store channel is being
  demoted to a checkbox; the strategic product is the cross-platform CLI (see the Forward Plan).
- Two audiences that matter (established by research, Jul 2026): **platform teams** (via a CI
  drift-gate) and **regulated industries** (via provable, auditable, AI-free generation).
  Individual developers are reached only indirectly (later, via MCP). Do not optimize for them.

## I.3 What Bedrock is NOT — the borders (as important as the map)

1. **No AI in the product. Ever.** Not in inputs, not in structure, not in the generator's
   logic (ADR-001). AI may only ever fill creative *slots* (content, never structure) or
   *advise* (stamped ADVISORY, never the gate) — default OFF, detachable, developer-keyed.
   The detachability proof is mandatory for any AI feature: delete it, everything still works.
2. **No round-trip.** Generation is a one-way pure function. No protected regions, no
   model↔code merge, no re-parsing edited code into a blueprint. Research-confirmed dead ends.
3. **No inference-import.** Reading an arbitrary codebase and *guessing* a blueprint is
   exactly what AI does and exactly what Bedrock exists to not do. If ever built (v0.2 north
   star at the earliest), it must announce itself as a best-effort reconstruction to be
   checked — never as "your blueprint." Reopening a Bedrock-exported project by reading its
   own manifest is allowed (that is reading, not guessing).
4. **No generation logic in the shell.** The shell is a thin client: it collects choices and
   calls certified commands; it renders the engine's output. No JS-computed diffs, no path
   heuristics. The engine computes; JS paints.
5. **No universal blueprint.** The format stays narrow and opinionated (entity/relationship
   application shapes on specific stacks). "One model for all software" is the fantasy that
   killed this idea's ancestors (CASE tools, MDA) for forty years. Depth over breadth, always.
6. **No lock-in.** Export is first-class: delete Bedrock, the exported project still builds
   and runs (Law 21). Legitimate "ratchets" (the drift guarantee, the audit chain, migration
   lineage) may make Bedrock *valuable* to keep — never *impossible* to leave.

## I.4 The architecture map

```
E:\Software
├── generator/          Pure-Node TypeScript engine. deps {} — ALWAYS. 0 native modules.
│                       All generation logic. The certified core. The backstop lives here:
│                       `npm run day20:regress`
├── desktop/            Tauri v2 shell (Rust) — the GUI product.
│   ├── src-tauri/      Rust: commands.rs (sidecar calls) / store_commands.rs (SQLite
│   │                   blueprint store via rusqlite; in-proc calls return Result<T,String>,
│   │                   never SidecarResult — no exit-code semantics for in-proc).
│   │   └── msix/       Store packaging + the 4-step Store runbook (README.md).
│   └── resources/gen   The bundled-node sidecar: the certified engine, packaged.
└── docs/               GUARDRAILS, ECOSYSTEM-PLAN, MONTH-1/2/3, MONTH-3 ex, daily/, ADRs,
                        this book, the forward plan.
```

Dataflow: wizard screens → `buildBlueprintChoices` (a pure serializer, proven UI==CLI
byte-identical) → certified engine commands (via the sidecar) → engine output → the shell
renders it. Blueprints persist in the SQLite store today; Phase B makes a canonical text
file the truth and demotes SQLite to an index.

## I.5 The certified state (the numbers, as of Day 70 / commit `ff6e991`)

| Fact | Value |
|---|---|
| Backstop | `npm run day20:regress` from `generator/` → **203 OK / 0 FAIL** |
| Frozen output digests | **103 baked** + **10 TeamTracker** relationship hashes |
| Crown jewel | **MAXIMAL `366e19d9`** — unmoved from Day 29 through Day 70 |
| Non-hash proofs | PARTs **1c–1z** (each proves a property, not a byte-hash) |
| Packaged == certified | bundled sidecar reproduces the 103 digests byte-identical |
| Sync-gen stamp | `83ffd0ad` / 245 files (content hash of the sidecar payload — see V.4) |
| Composition benchmarks | 75/75 |
| Coverage | 7 project types × 5 stacks (Spring Boot, Express, FastAPI, Django, Go); PostgreSQL + MySQL |
| Verification ladder | Express **runtime/booted** · FastAPI & Django **syntax-level** · Go & Spring **generation-only** |
| Installers | MSI + NSIS in-repo (Day 69), version string 0.1.0 → 0.2.0 at Store submission wrap |

The authoritative list of what the regress harness checks is **the harness itself** — read it
in `generator/`; never trust a summary (including this one) over the code.

## I.6 The final picture (where this is going — the full frame)

- **Days 71–75:** the shell becomes a product — screen router, welcome, full-window wizard,
  the workspace, docs, re-certification. Then the 4 Store steps (Leela's machine).
- **Phase B (the pivot):** blueprint as a canonical, diffable text file in the repo → an
  npm-distributed cross-platform CLI (`generate / verify / check / impact / export`) → a CI
  drift-gate (GitHub Action + pre-commit). This is what makes a top-20-in-a-team's-stack
  position possible. ~12–16 build days.
- **Stage 2 (evidence-gated — built only when a real user pulls):** MCP server (AI agents
  drive Bedrock deterministically: AI drafts the blueprint, a human reviews the diff, Bedrock
  projects the code — AI never in the generation path); Generation-Gap safe regeneration;
  deterministic schema migrations from blueprint lineage; signed generation attestations.
- **Permanent horizon items:** publishing the blueprint spec openly with a conformance suite;
  dissolving the single-maintainer risk (institutional continuity). Detail: the Forward Plan.

---

# PART II — HOW IT WAS BUILT (the history that explains the shape)

## II.1 The arc in one paragraph

A 21-day proof established the core: deterministic generation with frozen output hashes as
the regression backstop. A 70-day ecosystem build followed: **Phase 0** (determinism
ground-truth audit, the desktop shell, the packaged sidecar), **Phase 1** (governed inputs:
framework+version pinning, org-policy allow/ban, progressive-disclosure wizard, toolchain
detect-and-guide), **Phases 2–3** (creative slots, model depth — has-many, decimal — Figma
ingestion, all 7 project types), **Phase 4** (the exporter and Law 21, deterministic Semgrep
security with a detachable AI advisory, the flow Map and impact Map), certification (Day 58),
release (Day 60), and then the **sensation push** (Days 61–70): the end-user shell — wizard,
data model, SQLite blueprint store, linked project view, visual Map, interactive impact Map,
diff Map, trust polish, re-certification, release. Every single day ended with the frozen
backstop reproducing byte-identically.

## II.2 Why the ORDER mattered (seam-first, risk-second — the deepest structural lesson)

Work was sequenced so that new machinery was always proven on the *safest* seam before the
*entangled* one. Examples that shaped the codebase:

- **Formatting before naming** in the coding-style engine: naming conventions were entangled
  with field-to-column correctness across five languages (highest risk); formatting proved
  the style machinery safely first.
- **The database dialect seam** (Days 5a/5b): dialect-divergent SQL was extracted into
  tokens engineered to expand to the *exact current Postgres bytes* — so adding MySQL moved
  zero frozen hashes. A whole-DDL token was explicitly rejected because it would have
  reflowed FastAPI's 3-line concatenation and moved a hash. The lesson generalizes: **extract
  the minimal divergent substring, never the convenient whole.**
- **New-files-only engine extension** (Days 65/66, the Maps): a new pure module + a new CLI
  driver, no existing generation-path file modified → frozen output byte-identical *by
  construction* — and proven anyway (new non-hash PARTs 1y, 1z).

## II.3 The defects the method caught — and the rule each one minted

This ledger is the method's proof. Every rule below was paid for.

| # | What happened | The rule it minted |
|---|---|---|
| 1 | A prompt assumed Tauri passes snake_case args; Tauri's default is camelCase; the idealized brief was wrong, the code was right | **Read the code; correct the idealized brief.** Every unknown resolved empirically. |
| 2 | `has-many` was almost inferred from `belongs-to` | **has-many is collected EXPLICITLY, never inferred** (Day-25 rule). Generalizes: never infer intent the user didn't state. |
| 3 | The root `.gitignore` whitelist (`/*`) silently swallowed new root docs — committed files simply didn't exist in git | **Any new root-level file gets an explicit un-ignore rule**, following the existing `CLAUDE.md` pattern. Check `git status` shows the file. |
| 4 | A proposed type enum in the manifest would have moved ALL frozen hashes with zero generated-code change | **The manifest trap:** every new capability's default/empty/off path must be a **literal bypass** reproducing frozen hashes exactly. |
| 5 | `created_at` almost landed inside the blueprint JSON | **Storage metadata lives in the storage row, never in the blueprint** — preserves lossless, non-mutating round-trips. |
| 6 | Store DB commands almost reused the sidecar's result type | **`store_commands.rs` stays structurally separate from `commands.rs`;** in-proc calls return `Result<T,String>` (no exit-code semantics). |
| 7 | The sync-gen stamp moved (237→241 files) when new dist entries legitimately landed, and looked like a hash move | **Stamp semantics ≠ hash semantics** (see V.4). The load-bearing claim is always: the bundled node still reproduces the 103 frozen digests. |
| 8 | Multiple 21-day "determinism failures" turned out to be test-fixture bugs — but only diagnosis revealed that | **A failed determinism check is a finding to DIAGNOSE, never an inconvenience to suppress.** You only know it's benign by proving why. |

## II.4 What was deliberately NOT built (and must stay unbuilt without a decision)

Round-trip sync. Protected regions. Bidirectional merge. Inference-import. AI in the path.
MongoDB / multi-database-per-project. The any-project bug engine (its own later effort).
Per-lifecycle-layer Map highlighting (would need a heuristic — *we highlight what we can
certify, not what would look good*).

---

# PART III — HOW TO THINK (the most important part)

This is the reviewer's cognition, written down. These are not platitudes; each move has
caught real defects in this repo. Internalize them as reflexes.

**Move 1 — Run the thesis test before the feasibility test.** The first question about any
change is never "can we build it?" but "does it keep AI out of the deterministic path and do
deterministically all that can be done deterministically?" Feasible violations are still
violations.

**Move 2 — Treat the brief as a hypothesis and the code as the experiment.** Every plan you
are handed — including plans written by a smarter session, including this book — contains
idealizations. Before building, read the actual files and list where reality disagrees.
Correcting the brief IS the work, not a detour from it. (Ledger items 1, 2, 3.)

**Move 3 — For every proof, ask: "what failure would this catch, and could it stay green
while the thing is broken?"** A gate that cannot fail is decoration. Concrete instance: the
103 baked digests CANNOT move during a pure-UI wizard change — so their staying green proves
nothing about the wizard; the real gate there is UI==CLI byte-identity. Always identify the
gate that would actually go red if you broke the thing you're touching.

**Move 4 — A moved hash is information, never an obstacle.** If a hash you did not intend to
move moves, latent nondeterminism was being masked, or something flows into output that
shouldn't. STOP. Diagnose *why* before concluding "bug" or "fine." Re-baselining to make the
light green is destroying the evidence. (The one line that matters most: **stop and report
rather than write a clean-looking close if a proof fails.**)

**Move 5 — Audit language at claim level.** For every claim, name its proven level:
*booted / syntax-checked / generation-only / never-run*. Words like "works," "verified,"
"secure," "no trace" are rounded-up lies unless the level backs them. Verify proves
REPRODUCIBILITY, never correctness. Law 21 means no FUNCTIONAL dependency — inert provenance
comments remain, the live container boot has never been run here, and "no trace of Bedrock"
is a forbidden sentence.

**Move 6 — Prefer safety by construction, then prove it anyway.** The strongest safety
argument is structural: new files only; default paths that are literal bypasses; divergence
extracted into tokens that expand to the exact current bytes. "It cannot move a hash by
construction" is the design goal — and then you run the backstop anyway, because Move 3.

**Move 7 — Order by seam, not by excitement.** When a capability has multiple entry points,
build on the seam where failure is cheap and visible first (formatting before naming;
Postgres byte-freeze before trusting MySQL). Ask: "which ordering lets a mistake surface
earliest and cost least?"

**Move 8 — Name the tempting adjacent thing and forbid it.** Every plan carries an explicit
OUT-OF-SCOPE list containing the things a competent builder would naturally reach for.
Scope creep in this codebase is not a productivity issue; it is how hashes move silently.
One load-bearing thing per day.

**Move 9 — Steelman the failure before closing.** Before writing any report, ask: "if this
were subtly broken, where would it hide?" Then look exactly there. (Day 5b: diff Postgres
FIRST, before admiring MySQL output — a single moved Postgres hash means the extraction
wasn't byte-faithful and everything after it is suspect.)

**Move 10 — Distinguish the stamp from the hash.** Some numbers legitimately change (the
sync-gen stamp when dist entries land; version strings at release). Some numbers never
change silently (the 103, the 10, MAXIMAL). Confusing the two in either direction is a
failure: panicking at a stamp is noise; shrugging at a hash is catastrophe.

**Move 11 — Proof must pay rent.** If a change adds no new engine behavior, do not invent a
ceremonial PART for it. Every proof exists because its failure would mean something. Thin or
faked proofs on a certification day are worse than an honest failure.

**Move 12 — Review reports like an auditor, not a fan.** When checking an execution report:
(a) every claim traces to pasted evidence (the regress tail, a diff, a hash) — "it passed"
without output is not evidence; (b) anything phrased "should," "presumably," or "will" is
PENDING, not done; (c) the deferred-items list from the plan survived into the report — a
vanished deferred item is a silent overclaim; (d) the commit hash is present and the diff
scope matches the stated scope.

**Move 13 — When the human's plan is wrong, say so before the work starts.** The reviewer
role explicitly includes honest pushback and early risk-flagging. Deference that lets a
flawed plan execute is a failure of the role. Push back with the reason and the alternative,
then respect the decision made.

**Move 14 — Ask what a stranger needs to trust this without trusting us.** Proof pointers on
every claim. Verbatim gate output in reports. An honest limitations list exactly as complete
as the strengths list. The product of this project is not code; it is *earned certainty* —
and certainty that requires trusting the author is not the product.

---

# PART IV — HOW TO DO (the operating system)

## IV.1 The rhythm

- **One build day = one load-bearing thing = three sessions:**
  **Session 1 — Planning:** read the guardrails + the governing doc + the previous report +
  the REAL code; write `docs/daily/eco-day-NN-plan.md` with done-conditions, gates, scope
  guards. **No code.**
  **Session 2 — Execution:** build in the smallest steps; a hash/verification gate after
  every step; STOP-and-report on any failed proof. **No report.**
  **Session 3 — Evaluation + Close:** re-confirm from clean; write the self-contained
  `docs/daily/eco-day-NN-report.md` (a fresh session must be able to continue from it alone).
- **The two-prompt human loop:** the reviewer (a Claude chat session) writes the PLAN prompt →
  Leela runs it in Claude Code → the reviewer reviews the plan and writes the EXECUTE+REPORT
  prompt → Leela runs it → the reviewer audits the report (Move 12). Each Claude Code session
  is fresh, with the working folder linked; outputs saved to files.
- **The check-then-build gate** (review the plan before executing; review the execution
  before closing) caught every real bug in the 21 days. Never skip it to save time.

## IV.2 Prompt anatomy (every EXECUTE prompt is self-contained)

Cold-session context → read-first list → immutable invariants → the task (goal / why /
in-scope / out-of-scope / design notes) → numbered done-conditions → proof & gates → the
STOP line → environment constraints → report spec → commit rules. The canonical template is
**Appendix A** (the Master Change Prompt). Fill the slots; delete nothing else.

## IV.3 Commit & repo discipline

- Commit directly to `main`. No branches, no PRs. A **pre-commit hook runs `day20:regress`**
  and blocks red commits. **Leela pushes** (automated shells have no TTY).
- Message format: `eco-day-NN: one-line summary (backstop green, 203 OK / 0 FAIL)`.
- **Git/GitHub is the SOLE backup.** Never suggest folder copies, xcopy, or offline backups.
- Governing docs are committed to the repo and are ground truth for their arc.
- Handoff documents are written before starting fresh chats (context loss across long
  sessions is a real, repeatedly-observed risk).

## IV.4 Environment constraints (honest-manual, not product limits — never fake around them)

No GUI session in automated shells (every live click-through is Leela's, on her Windows
machine — such items are marked **PENDING**, never assumed). Docker daemon down (the live
container boot of an exported project has never run). No Go/Java toolchain (hence
generation-only for those stacks). Semgrep's native core doesn't run on Windows (the CERTAIN
gate is CI/Linux). No dev AI key (the advisory layer has never run keyed). No MakeAppx in
the shell. C: drive is tight — never force a heavy build.

---

# PART V — THE CHECKS, PIN TO PIN (what to check, and exactly how)

## V.1 The backstop (run at the end of EVERY day, and before trusting anything)

```
cd generator
npm run day20:regress
```
Expected: **203 OK / 0 FAIL** (plus N new if the day legitimately ADDED baselines).
Covers: the 103 baked digests, the 10 TeamTracker relationship hashes, and the non-hash
PARTs 1c–1z. Paste the tail into the report — the words "it passed" are not evidence.
Interpretation of a failure: identify WHICH check failed → hash move (Move 4: STOP,
diagnose) vs non-hash PART failure (a property broke: read that PART's assertion) vs
harness/environment error (prove it's environmental before dismissing).

## V.2 Twice-identical (for any NEW baseline)

Generate the new output twice, from clean, byte-compare the trees. Identical → record the
hash + the exact input in the report. Different → you have nondeterminism; find it (the
three killers: embedded time/random/UUIDs; CRLF vs LF; unsorted keys / unstable iteration).
A baseline recorded from a single generation is not a baseline.

## V.3 UI==CLI (whenever the shell collects or serializes choices)

The wizard path and the programmatic path must produce byte-identical blueprints AND
byte-identical generated output, proven against the certified TeamTracker baseline (and the
other templates where relevant). This is the shell's own load-bearing gate — the baked
digests cannot catch a broken wizard (Move 3).

## V.4 Packaged == certified (the sidecar check)

The bundled-node sidecar must reproduce the 103 frozen digests byte-identical. The
**sync-gen stamp** is a content hash of the sidecar payload: it LEGITIMATELY changes when
new dist entries land (e.g., 237→241 files, stamp move). That is NOT a generation-hash
move. The load-bearing claim, always: *the bundled node still reproduces the 103 frozen
digests.* Say exactly that in reports; never conflate stamp and hash.

## V.5 Product-level Verify

Double-generation, byte-compare, in the app. It proves REPRODUCIBILITY of the blueprint's
projection — same blueprint → identical bytes. It does not and cannot prove correctness,
security, or bug-freedom. Any doc or UI string implying otherwise is a defect.

## V.6 The non-hash PARTs

Each PART asserts a property (examples: PART 1t — Law 21's 0 dependency-manifest entries +
0 functional imports via static + require-graph analysis; PART 1y — flow-SVG determinism and
faithfulness; PART 1z — impact attribution from the emitters' own per-entity file
attribution, proven total and disjoint). The authoritative catalogue is the regress harness;
when extending the engine via new files, add a new PART only if it pays rent (Move 11).

## V.7 The ADR sweep (run when anything near the generation path changes)

No AI / no network / no randomness / no wall-clock in the generation path (ADR-001/003).
Generated vs developer code in separate files (ADR-002). Ask-only-what-changes-structure,
default the rest (ADR-004). Core neutrality — plugin-specific strings live only in that
plugin (Law 25; e.g., MySQL strings only in `plugins/database/mysql.ts`). Multi-user
assumptions honored (ADR-005). The ADR files live in the repo; read them, don't paraphrase
them from memory.

## V.8 Mechanical hygiene checks

- `generator/package.json` → `"dependencies": {}` — always. Any change is a violation.
- `desktop` Cargo.toml diff — any new crate is deliberate and documented in the day's report.
- New root-level files → explicit `.gitignore` un-ignore rule + `git status` shows the file.
- Line endings: output normalized LF; `.gitattributes` respected.
- `git status` at close: the diff scope matches the plan's stated scope — nothing extra.

## V.9 The live checks only Leela can run (mark PENDING until she has)

The **Half-B walkthrough** — 8 items: launch → wizard/generate → save/list/load → view
diagram → preview impact → compare versions → Verify → friendly errors. PASS criteria in
`docs/daily/eco-day-69-report.md` §3, mirrored into the Store runbook step 2. Any failure is
a real finding — report it, never paper over it. The 4 Store steps live in
`desktop/src-tauri/msix/README.md`.

## V.10 How to check a REPORT (the reviewer's checklist — Move 12 operationalized)

Evidence pasted for every claim · claim levels named (booted/syntax/generation-only) ·
deferred list intact and honest · commit hash present · scope of diff == scope of plan ·
any baseline change documented old→new+why · limitations updated if capabilities were.

---

# PART VI — THE RULES AND GUARDRAILS (consolidated, exhaustive)

**The constitution is `docs/THRAKSHA-GUARDRAILS.md`. If anything conflicts with it, it wins.**
This section consolidates every standing rule for convenience; the numbered invariants also
appear in the Master Change Prompt (Appendix A) and must be pasted into every execution.

### VI.1 The hard rules (no exception, no "just this once")
1. Same input → byte-identical output, proven by frozen hashes. **A moved baked hash is a
   FINDING → STOP.** Never a silent re-baseline. A deliberate re-baseline is allowed only if
   intentional, documented (old → new + rationale), isolated, and recorded in the report.
2. Every new capability's default/empty/off path is a **literal bypass** reproducing the
   frozen hashes exactly. (The manifest trap — ledger #4.)
3. **AI is never in the generation path.** AI features: default OFF, detachable (deletion
   leaves a complete valid product — the detachability proof is mandatory), developer-keyed.
4. Generated vs developer code in **separate files** (ADR-002). No round-trip, no protected
   regions, no merge. The safe enhancement is non-destructive update with diff-preview.
5. **generator/ deps {} forever.** New Rust crates: deliberate, documented, never silent.
6. Shell work is **SHELL/UI ONLY**: no generator source changes; 103 + 10 + MAXIMAL stay
   byte-identical; existing PARTs unchanged. Engine extension = **NEW FILES ONLY** (new pure
   module + new CLI driver) → byte-identical by construction, proven anyway.
7. The shell is a **thin client** — the engine computes; JS paints. No generation logic, no
   JS diffs, no path heuristics in JS or Rust.

### VI.2 Honesty rules (claims, docs, reports)
8. **STOP and report rather than write a clean-looking close if a proof fails.** A green
   that hides a red is worse than an honest red. Put this line in every execution prompt.
9. State what is proven; name what isn't; never overclaim. Preserve proven-vs-
   generation-proven and certain-vs-advisory distinctions everywhere.
10. **Verify = REPRODUCIBILITY**, never correctness/security/bug-freedom. Verbatim.
11. **Law 21 = no FUNCTIONAL dependency** (0 manifest entries + 0 functional imports, PART
    1t). Inert provenance comments remain. The live container boot has never been run here.
    **"No trace of Bedrock" is a forbidden sentence.**
12. **The Map's granularity boundary,** verbatim: entity + app nodes + relationship edges
    are highlighted (certified by the emitters' own file attribution); per-lifecycle-layer
    nodes are NOT — *we highlight what we can certify, not what would look good.*
13. Every capability claim in docs carries a **proof pointer** (report §, or PART id). A
    strengths list without an equally complete limitations list is an overclaim.
14. Deferred items are named **PENDING** until actually run — in every report, every doc.
15. The verification ladder is stated honestly wherever stack coverage is claimed.

### VI.3 Process rules
16. Three sessions per day; plan has no code; execution has no report; the report is
    self-contained. One load-bearing thing per day; a genuinely multi-day unit is marked so
    and never compressed ("that's how determinism cracks slip through").
17. Read the code; correct the idealized brief. Resolve every unknown empirically.
18. Every EXECUTE prompt is self-contained (cold context + read-first list).
19. Explicit OUT-OF-SCOPE list naming the tempting adjacent things, every plan.
20. Gate after every step; never batch steps past a gate. Full backstop from clean at close.
21. Commit to `main`; pre-commit runs the backstop; Leela pushes; message format fixed.
22. Git/GitHub is the sole backup — never suggest folder copies.
23. Handoff document before any fresh chat.
24. No ceremonial proofs — a PART must pay rent.

### VI.4 Data & code-shape rules (minted by defects — the ledger, Part II.3)
25. has-many explicit, never inferred. Never infer unstated intent generally.
26. Storage metadata (`created_at`, row ids) in the storage row, never the blueprint JSON.
27. `store_commands.rs` ≠ `commands.rs`; in-proc DB → `Result<T,String>`.
28. New root files → explicit `.gitignore` un-ignore (the `/*` whitelist trap).
29. Extract the minimal divergent substring into tokens expanding to exact current bytes;
    reject the convenient whole-block token if it reflows a byte.
30. Tauri arg naming: verify the actual convention (camelCase default) in code, not docs.
31. Stamp ≠ hash: sync-gen stamp moves are legitimate when dist entries land; say the
    load-bearing sidecar claim explicitly instead.

### VI.5 Strategic rules (post-research, Jul 2026)
32. Depth over breadth on stacks — prove one stack fully before widening any.
33. The Store is a checkbox, not the channel; the CLI is the product channel.
34. Individual developers are not the target; reach them only via the MCP path later.
35. Stage-2 features are **evidence-gated**: built when a trigger fires (a real user or
    design partner pulls), never speculatively. Triggers are named in the Forward Plan.
36. The three DECISION GATES (name, license, blueprint filename) belong to Leela alone;
    no session decides them implicitly. They are marked in the Forward Plan.
37. Ratchets must be honest: they may make Bedrock valuable to keep (guarantees, lineage,
    attestations), never impossible to leave. The exit promise is part of the identity.

---

# PART VII — THE MAP OF DOCUMENTS (where truth lives)

| Doc | Role |
|---|---|
| **THE CODE** | Final authority. Always. |
| `docs/daily/eco-day-NN-{plan,report}.md` | The ground-truth record of every day. The latest report = current state. |
| `docs/THRAKSHA-GUARDRAILS.md` | The constitution (§1.1 no silent moves; §3 STOP; §4 honesty; §5 claims). |
| `docs/THRAKSHA-ECOSYSTEM-PLAN.md`, `THRAKSHA-MONTH-1/2/3.md`, `THRAKSHA-MONTH-3 ex.md` | The governing arc docs (historical + 61–70). |
| `docs/files/THRAKSHA-FORWARD-PLAN.md` | The governing doc for Day 71 onward (the companion to this book). |
| ADR-001…005, Law 21, Law 25 | The architectural decisions; read the files, don't paraphrase. |
| Root `README.md`, `CAPABILITIES.md`, `RELEASE-NOTES.md` | The public honest claims (CAPABILITIES v0.2.0 current; `docs/CAPABILITIES-v0.1.0.md` superseded, preserved). |
| `desktop/src-tauri/msix/README.md` | The 4-step Store runbook. |
| `docs/daily/eco-day-69-report.md` §3 | The Half-B live-walkthrough PASS criteria. |
| **This book** | Orientation + method + rules. Below reports and code in authority. |

---

# PART VIII — COLD-START PROTOCOLS

**A. You are a fresh Claude chat session (the REVIEWER role).**
Read this book Parts I–III, then GUARDRAILS, then the latest daily report, then the Forward
Plan. Ask Leela one question: "which day are we on, and is there an unreviewed report?"
Then follow the rhythm (IV.1): write PLAN prompts, audit reports (V.10), push back early
(Move 13). You do not execute; you review and write prompts.

**B. You are a fresh Claude Code session (the BUILDER role).**
You should have been handed a filled prompt (Appendix A shape). Follow ITS read-first list.
If handed nothing: read GUARDRAILS, the latest report, and the Forward Plan's current day;
then ask for the day's filled prompt rather than improvising scope.

**C. You are any other LLM.**
Everything above applies, plus: do not invent repo facts — if you have not read a file, say
so; never touch anything that could move a hash without the full backstop available to run;
if you cannot run `npm run day20:regress`, you may not close a day.

**D. The repo contradicts this book.**
The repo wins. Note the contradiction in your report as documentation drift, and propose the
one-line correction to this book. Do not silently harmonize in either direction.

**E. Something looks wrong mid-task.**
STOP is a first-class outcome. Write down exactly what you observed, what you expected, and
what you did NOT do next. An honest half-day with a finding is a success; a completed day
with a hidden red is the only real failure this project recognizes.

---

# APPENDIX A — THE MASTER CHANGE PROMPT (canonical template)

> Standalone copy: `docs/files/BEDROCK-MASTER-CHANGE-PROMPT.md` (F1 correction, Day 75). Fill every {SLOT};
> delete nothing else. Run once as PLAN, review, then as EXECUTE+REPORT.

**MODE: {PLAN | EXECUTE+REPORT}**

**1. Cold context:** Repo `E:\Software`. Bedrock (Thraksha): deterministic, AI-free code
generator; blueprint is truth; code is a byte-identical projection. `generator/` pure-Node,
deps {}. `desktop/` Tauri v2 + sidecar `resources/gen` + rusqlite store (`store_commands.rs`
separate; in-proc → `Result<T,String>`). Backstop `npm run day20:regress` → 203 OK / 0 FAIL
(103 baked + 10 TeamTracker + PARTs 1c–1z). MAXIMAL `366e19d9` unmoved since Day 29.
Packaged==certified. Commit to `main`; pre-commit runs the backstop; Leela pushes.

**2. Immutable invariants:** (1) moved baked hash = FINDING → STOP, never silent re-baseline;
deliberate re-baseline = intentional+documented+isolated+recorded. (2) shell = SHELL/UI ONLY;
frozen set byte-identical; PARTs unchanged. (3) thin client — engine computes, JS paints; no
JS diffs/heuristics. (4) engine extension = NEW FILES ONLY → identical by construction,
proven anyway. (5) manifest trap — default path is a literal bypass. (6) deps {} forever;
new crates documented. (7) no AI anywhere (ADR-001). (8) claim only what's proven; Verify =
reproducibility; Law 21 phrasing exact; PENDING stays named.

**3. Read first:** GUARDRAILS §1.1/§3/§4/§5 · {GOVERNING-DOC} · previous report {PATH} ·
THE REAL CODE this touches: {FILES} — read it; correct this brief where it's wrong (known
prior catches: Tauri camelCase; explicit has-many; created_at placement; .gitignore
whitelist).

**4. The task:** DAY-ID {eco-day-NN} · GOAL (one sentence, one load-bearing thing) {…} ·
WHY {…} · IN SCOPE {…} · OUT OF SCOPE (explicit, name the tempting) {…} · DESIGN
NOTES / unknowns to resolve from code {…}

**5. Done-conditions:** {1..N, each checkable, none ceremonial}

**6. Proof & gates:** gate after every step · close from clean: backstop 203/0 (or 203+N new
baselines, each twice-identical + documented) · UI==CLI where choices are touched · stamp ≠
hash semantics · new baselines {names}.
> **STOP and report rather than write a clean-looking close if a proof fails.**

**7. Environment:** no GUI (live clicks = Leela, PENDING) · no Docker · no Go/Java · no
Semgrep-native · no MakeAppx · no AI key · C: tight.

**8. Mode rules:** PLAN → `docs/daily/{DAY-ID}-plan.md` only, no code. EXECUTE+REPORT →
smallest gated steps → re-confirm from clean → self-contained
`docs/daily/{DAY-ID}-report.md` (built / every gate's pasted result / findings / any
documented baseline change / PENDING list / commit hash) → commit
`{DAY-ID}: {summary} (backstop green, 203 OK / 0 FAIL)`.

# APPENDIX B — THE DOCUMENTATION-DAY PROMPT

> Standalone copy: `docs/files/BEDROCK-DOCS-DAY-PROMPT.md` (F1 correction, Day 75). Run AFTER Day 72. Produces
> `docs/manual/` (00-overview → 11-faq), `docs/architecture/` (ARCHITECTURE, DETERMINISM,
> VERIFICATION-LADDER), `docs/LIMITATIONS.md`, and a root README alignment pass — docs-only,
> every claim with a proof pointer, the three verbatim honesty lines embedded (Verify /
> Law 21 / Map boundary), `[SCREENSHOT-NEEDED: …]` markers collected for Leela, .gitignore
> un-ignore check for any new root file, backstop tail pasted, self-contained report.
> (Full text in the standalone file — it is the authoritative copy.)

# APPENDIX C — GLOSSARY

**Blueprint** — the structured description of an application (type, stack, entities, fields,
relationships); the source of truth. **Baked digest** — a frozen hash of a certified
generated output; the 103. **MAXIMAL** — the largest composed certified project; its digest
`366e19d9` is the crown jewel. **TeamTracker / DemoApp** — the certified reference models.
**PART** — a non-hash proof in the regress harness asserting a property (1c–1z).
**Backstop** — `npm run day20:regress`; the full regression. **Sync-gen stamp** — content
hash of the sidecar payload; legitimately moves with new dist entries. **Literal bypass** —
a default/off path that reproduces frozen output exactly. **Manifest trap** — a model-level
addition silently moving all hashes with zero code-output change. **Seam** — the boundary a
change enters through; seam-first = prove machinery on the safe seam. **Sensation push** —
Days 61–70, the end-user shell. **Half-B** — the 8-item live GUI walkthrough (Leela's
machine). **Honest-manual** — a check only runnable outside this environment; marked
PENDING. **Law 21** — exported projects run standalone (no functional dependency). **Law
25** — core neutrality; plugin strings live only in their plugin. **UI==CLI** — the wizard
and programmatic paths produce byte-identical results. **Generation Gap** — (Stage 2) the
generated-base/hand-written-extension pattern for safe regeneration; never protected regions.
**Drift** — divergence between a blueprint's projection and what's on disk. **Decision
gate** — a choice reserved for Leela, blocking a named step.

---
*End of the Knowledge Book. The companion is `docs/files/THRAKSHA-FORWARD-PLAN.md`. The authority
order stands: code > reports > governing docs > this book. Keep it that way.*
