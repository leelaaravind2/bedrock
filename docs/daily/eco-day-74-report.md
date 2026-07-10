# Eco-Day 74 — REPORT: documentation day (EXECUTE + REPORT, docs-only)

Run of `docs/files/BEDROCK-DOCS-DAY-PROMPT.md` exactly as written (confirmed present; its absence would
have been a STOP). Docs-only: no generator source, no shell source, no hash moved, no new PARTs. It
documents the post-72 shell; run here after Day 73, so the manual describes the actual post-Stack-regroup
shell (5-step wizard incl. the Stack screen) — the code wins over the brief.

---

## (a) Inventory — every file written, one-line purpose

**`docs/manual/`** (end-user manual, prose):
- `00-overview.md` — what Bedrock is, the blueprint-is-truth thesis, what it is NOT.
- `01-install-and-first-project.md` — install (Store), Welcome, first project end to end.
- `02-create-a-project.md` — the wizard, screen by screen (5 steps incl. the Stack screen).
- `03-data-model.md` — entities, the real 8 field types, Decimal precision/scale, explicit has-many.
- `04-projects-save-load.md` — the SQLite store; lossless round-trip; created_at in the row not the JSON.
- `05-the-map.md` — the flow map; the granularity boundary verbatim.
- `06-impact-preview.md` — engine-computed impacted set (PART 1z), never path heuristics.
- `07-compare-versions.md` — the diff map; no ghost nodes.
- `08-verify.md` — Verify = reproducibility verbatim (not correctness/security).
- `09-export.md` — Law 21 no-functional-dependency verbatim; never "no trace".
- `10-troubleshooting.md` — the friendly-error surface; where the store lives.
- `11-faq.md` — only questions the manual raises.

**`docs/architecture/`:**
- `ARCHITECTURE.md` — generator/shell/sidecar/store; the dataflow; the thin-client rule; the post-72 shell.
- `DETERMINISM.md` — the backstop, the 103, MAXIMAL, the sync-gen stamp semantics, the re-baseline policy.
- `VERIFICATION-LADDER.md` — the honest per-stack table; benchmarks 75/75.

**`docs/LIMITATIONS.md`** — the complete boundary ledger in one place.

**Root pass (alignment only):**
- `README.md` — added the screen-routed shell note (Welcome → wizard → workspace) + a Documentation
  section linking the new manual/architecture/LIMITATIONS. No new capability language invented.
- `CAPABILITIES.md` — READ and cross-checked; NOT edited (see (e)).

## (b) Spot-check — 10 claims → proof pointers

| # | Claim | Proof pointer |
|---|---|---|
| 1 | Same blueprint → byte-identical output; 203 OK / 0 FAIL | `eco-day-69-report.md` DC-1; `day20-regression.ts` |
| 2 | MAXIMAL `366e19d9` unmoved since Day 29 | `day20-regression.ts` (MAXIMAL const + Day-29 re-baseline note); DC-1 |
| 3 | Wizard blueprint == CLI byte-identical (UI==CLI) | PART 1d; `npm run ui-cli` (`ui-cli-proof.mjs`) |
| 4 | The real 8 field types | `generator/src/plugins/database/postgres.ts` SUPPORTED_TYPES; `wizard-choices.js` FIELD_TYPES |
| 5 | has-many is explicit, never inferred | PART 1d/1m; `eco-day-62-report.md` |
| 6 | Store round-trip lossless + non-mutating; created_at in the row | `blueprint_store.rs`/`store_commands.rs`; `CAPABILITIES.md` §3 |
| 7 | Map granularity boundary (entity/app/edge only) | PART 1z; `CAPABILITIES.md` §4 |
| 8 | Impact set engine-computed, total/disjoint, previewed==real | PART 1z; `eco-day-66-report.md` |
| 9 | Verify = reproducibility, not correctness/security | PART 1z empty bypass; `eco-day-68-report.md` |
| 10 | Export: 0 manifest entries + 0 functional imports; inert provenance remains | PART 1t; `eco-day-41-report.md`; `bench:export` |

## (c) SCREENSHOT-NEEDED list (for Leela's machine)

1. Welcome screen — product name, one-line description, the two buttons. (`01-install-and-first-project.md`)
2. The workspace immediately after Create — project name, verb bar, drawn diagram. (`01-…`)
3. The "Your stack" screen — the four fields Backend/Frontend/Database/Auth. (`02-create-a-project.md`)
4. The data-model step with the TeamTracker example loaded — four entities + belongs-to edges. (`03-data-model.md`)
5. The "Open a saved project" list on Welcome — saved blueprints with names/ids/created_at. (`04-projects-save-load.md`)
6. A workspace with the drawn flow map front and centre (e.g. TeamTracker). (`05-the-map.md`)
7. Impact preview — a changed entity highlighted amber + the text delta. (`06-impact-preview.md`)
8. A Compare A → B result — B's diagram highlighted + the text delta. (`07-compare-versions.md`)
9. The Verify result — "Verified — byte-identical", 0 differences. (`08-verify.md`)
10. The workspace after an export — file count, "0 functional Thraksha references", the standalone note. (`09-export.md`)
11. An environment-error result — friendly message with "Technical details" expanded. (`10-troubleshooting.md`)

## (d) Code-vs-docs drift findings

I looked (read `wizard-choices.js`, `main.js`, `store_commands.rs`, `postgres.ts`, `project-model.ts`).
- The manual describes the **post-73** wizard (5 steps incl. the Stack screen), matching the current
  code — NOT the docs-day prompt's "start-from / name / shape / stack / data model / review" phrasing
  (which predates the Day-73 regroup). The code wins; the manual documents the 5-step flow.
- Field types documented from `postgres.ts` SUPPORTED_TYPES (the codegen switch), the authoritative
  source, not memory: String, Text, Integer, Long, Decimal, Boolean, Date, DateTime.
- No other drift found.

## (e) CAPABILITIES.md conflicts flagged (not silently edited)

**No conflicting claim found.** `CAPABILITIES.md` v0.2.0 (Day 70) predates the Day-71–73 shell restructure
(screen router, workspace, Stack regroup) and does not mention it — an **omission of new-since-Day-70
structure, not a conflict**. Its capability claims (UI==CLI, persistent projects, the Map, Verify,
export, packaged==certified) all remain accurate against the current code. Per the docs-day rule I did
NOT silently edit it; the capability/limitations refresh for the arc is scheduled for A75-4.

## (f) Backstop tail (docs cannot move a hash — proven anyway)

```
[digest-manifest] 103 digests asserted (43 frozen + 1 MAXIMAL)
Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  # derived: 203 OK / 0 FAIL   (grep -c '^  OK  '; the program printed the line above — Day 75d adds a self-printed total)
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf  (UNMOVED)
$ git diff --stat generator/   → (empty)
$ git status --porcelain
 M README.md
 M docs/daily/eco-block-A-ledger.md
?? docs/LIMITATIONS.md
?? docs/architecture/
?? docs/manual/
```
`.gitignore` (Rule 4): all new files are under the whitelisted `docs/` tree; `git check-ignore` returns
empty for each; `README.md` is already tracked. **No NEW root-level file was created**, so no un-ignore
rule is needed.

## (g) Deferred items (PENDING, named)

- All 11 SCREENSHOT-NEEDED captures — PENDING (Leela's machine; no GUI here).
- The live packaged-GUI Half-B walkthrough (PASS criteria: `eco-day-69-report.md` §3) — PENDING (Leela).
- The capability/limitations refresh for the 71–74 arc (RELEASE-NOTES + CAPABILITIES) — scheduled A75-4.

## Commit

`eco-day-74: complete end-user manual + architecture docs (docs-only, backstop green, 203 OK / 0 FAIL)`.
(The docs-day prompt's suggested message `docs: complete end-user manual + architecture docs (docs-only,
backstop green)` is honored in substance; prefixed `eco-day-74:` to keep the block's day-close
convention.) Not pushed.
