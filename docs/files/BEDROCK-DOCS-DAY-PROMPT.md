# BEDROCK — DOCUMENTATION DAY (EXECUTE + REPORT, self-contained)

> Run this AFTER Day 72 (the workspace) has landed. It documents the post-72 shell.
> One session may complete it; if not, stop at a clean phase boundary and report honestly.

---

## 0. Cold-session context (you have no memory of prior days — this is your full context)

You are working in the repo at `E:\Software`. The product is **Bedrock** (internal name Thraksha):
a **deterministic, AI-free code generator**. The blueprint is the source of truth; code is a
byte-identical projection of it. Positioning: **"AI guesses; Bedrock knows."**

- `generator/` — pure-Node TypeScript engine (**deps {}**, 0 native).
- `desktop/` — Tauri v2 shell (Rust) + bundled-node sidecar (`resources/gen`) + shell-side
  SQLite blueprint store (`rusqlite`).
- The engine is CERTIFIED. Backstop: `npm run day20:regress` from `generator/` →
  **203 OK / 0 FAIL** (103 baked digests + 10 TeamTracker + non-hash PARTs 1c–1z).
  The crown-jewel hash **MAXIMAL `366e19d9`** has not moved since Day 29.
- The shell (Days 61–72) is a screen-routed app: Welcome → wizard (start-from / name /
  shape / stack / data model / review) → **the workspace** (diagram front and centre; Edit,
  Preview impact, Verify, Export, Save/versions; Advanced harness tucked in a corner).
- **This is a DOCS-ONLY day. No generator source changes. No shell source changes.
  No hash may move. No new PARTs.**

## 1. Read first (mandatory, in this order — read the CODE, never document from assumption)

1. `docs/THRAKSHA-GUARDRAILS.md` — especially §1.1 (no silent baseline move), §3 (STOP), §4/§5 (honesty in claims and docs).
2. Root `/CAPABILITIES.md` (v0.2.x), `/README.md`, `/RELEASE-NOTES.md`.
3. `docs/daily/eco-day-69-report.md` and `eco-day-70-report.md` (certification + release record), plus the Day-71 and Day-72 reports (the new shell).
4. The actual UI code in `desktop/` (screens, workspace, wizard steps) and the store commands (`store_commands.rs`) — the manual must describe what the code DOES, not what a brief imagined.
5. `docs/CAPABILITIES-v0.1.0.md` (superseded; do not resurrect its claims).

## 2. The task — produce the complete documentation set

Create the following tree. Every file in Markdown, LF line endings, plain prose (no marketing voice).

### `docs/manual/` (end-user manual, written for a developer who has never seen Bedrock)
- `00-overview.md` — what Bedrock is, the blueprint-is-truth thesis, what it is NOT (no AI, no import of arbitrary code, no round-trip).
- `01-install-and-first-project.md` — install (Microsoft Store), launch, Welcome screen, create the first project end to end.
- `02-create-a-project.md` — the wizard, screen by screen, exactly as the code presents it.
- `03-data-model.md` — entities, the 8 field types (take the list from `project-model.ts`, not memory), relationships (note: **has-many is collected explicitly, never inferred**), decimal precision/scale.
- `04-projects-save-load.md` — the blueprint store: save, list, load; lossless non-mutating round-trip; `created_at` lives in the storage row, never in the blueprint JSON.
- `05-the-map.md` — the flow map. Include VERBATIM the granularity boundary: *entity + app nodes + relationship edges are highlighted (certified by the emitters' own file attribution); per-lifecycle-layer nodes are not — we highlight what we can certify, not what would look good.*
- `06-impact-preview.md` — the interactive impact map; impacted files computed by the ENGINE from the emitters' own per-entity attribution (PART 1z), never by path heuristics.
- `07-compare-versions.md` — the diff map between two saved blueprints; no ghost nodes.
- `08-verify.md` — must state VERBATIM: *Verify proves REPRODUCIBILITY — the same blueprint produces byte-identical output. It does not prove correctness, security, or bug-freedom.*
- `09-export.md` — standalone export. State precisely: *no FUNCTIONAL dependency — 0 dependency-manifest entries and 0 functional imports (static + require-graph, PART 1t). Inert provenance comments remain. The exported project's live container boot has not been run in this environment.* NEVER write "no trace of Bedrock".
- `10-troubleshooting.md` — the friendly-error surface (Day 68), common failure cases, where logs live.
- `11-faq.md` — short; only questions the docs above genuinely raise.

### `docs/architecture/`
- `ARCHITECTURE.md` — generator / desktop shell / sidecar / SQLite store; the dataflow from wizard choices → `buildBlueprintChoices` → certified commands → rendered output; the shell-is-a-thin-client rule (the engine computes; JS paints).
- `DETERMINISM.md` — the backstop (what `day20:regress` covers), the 103 baked digests, MAXIMAL, the sync-gen stamp semantics (it is a content hash of the sidecar payload; it legitimately changes when new dist entries land — that is NOT a generation-hash move), and the re-baseline policy (deliberate, documented, never silent).
- `VERIFICATION-LADDER.md` — the honest per-stack table, exactly: Express **runtime/booted**; FastAPI & Django **syntax-level**; Go & Spring Boot **generation-only** (no toolchain in this environment). Composition benchmarks **75/75**. State plainly that these are environment limits, honestly declared, not hidden.

### `docs/LIMITATIONS.md`
The complete known-limitations set in ONE place, harvested from CAPABILITIES.md, the Day-69/70 reports, and GUARDRAILS §5. A strengths list without an equally complete limitations list is an overclaim. Include at minimum: verification ladder gaps, the un-run container boot, Windows-only, no import/round-trip, the Map granularity boundary, Semgrep CERTAIN gate is CI/Linux, the AI advisory layer has never run with a key.

### Root pass
- `README.md` — alignment pass only: fix drift against the post-72 reality; do not invent capability language.
- `CAPABILITIES.md` — READ and cross-check; if a claim conflicts with code or reports, FLAG it in the report — do not silently edit claims.

## 3. Rules (non-negotiable)

1. **Every capability claim carries a proof pointer** — a report file + section (e.g. `eco-day-66-report.md §4`) or a PART id. If you cannot find the proof, the claim does not go in; flag it instead.
2. **Read the code; correct the idealized brief.** If a doc statement and the code disagree, the code wins and the discrepancy goes in the report.
3. **No screenshots can be taken in this shell** (no GUI session). Where a screenshot belongs, insert `[SCREENSHOT-NEEDED: <one-line description of exactly what to capture>]` and collect ALL of them into a single list in the report for Leela to shoot on her machine.
4. If any NEW root-level file is created, add the explicit `.gitignore` un-ignore rule (the root whitelist `/*` pattern silently swallows new root files — follow the existing pattern used for `CLAUDE.md`).
5. Proven-vs-generation-proven and certain-vs-advisory distinctions are preserved EVERYWHERE.
6. No bullets-for-everything: the manual is prose a human reads, structured but not fragmented.

## 4. Done-conditions

1. Every file in §2 exists, is internally consistent, and cross-links correctly.
2. `npm run day20:regress` from `generator/` — green, 203 OK / 0 FAIL (paste the tail). Docs cannot move hashes; prove it anyway.
3. `git status` shows ONLY docs (+ any .gitignore un-ignore lines). Commit to `main` with message `docs: complete end-user manual + architecture docs (docs-only, backstop green)`. Leela pushes.

## 5. Report — `docs/daily/eco-day-NN-report.md` (self-contained; a fresh session must be able to continue from it alone)

Include: (a) inventory of every file written with one-line purpose; (b) a spot-check table of 10 claims → their proof pointers; (c) the full SCREENSHOT-NEEDED list; (d) any code-vs-docs drift findings (say "none found" only if you actually looked); (e) any CAPABILITIES.md conflicts flagged; (f) the backstop tail; (g) honest deferred items, each marked PENDING.

> **STOP and report rather than write a clean-looking close if a proof fails.**
