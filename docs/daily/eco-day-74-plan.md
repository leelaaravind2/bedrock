# Eco-Day 74 — PLAN: documentation day (one page)

**MODE: PLAN.** No code, no build, no new prompt authored. Baseline `ff6e991`, backstop 203/0,
MAXIMAL `366e19d9` unmoved. Per the block brief, this plan is deliberately ONE page: confirm the
authoritative docs-day prompt exists, confirm its ordering constraint, and list what it produces.

## The authoritative prompt — CONFIRMED ON DISK
- **Path (as it actually is):** `docs/files/BEDROCK-DOCS-DAY-PROMPT.md` — present, 8,105 bytes,
  opened this session. **NOTE the drift (F1):** the Forward Plan Day-74 line references
  `docs/prompts/BEDROCK-DOCS-DAY-PROMPT.md`; there is no `docs/prompts/` directory. The repo wins —
  A74-1 runs the file at `docs/files/…`. Proposed one-line Forward-Plan correction is logged in
  `eco-day-71-plan.md` F1.
- **It is authoritative and runs EXACTLY as written.** Do not author a new prompt. If (contrary to
  this session's finding) it were absent at execute time, that is a **STOP and ask Leela**, not an
  invitation to reconstruct it.

## The ordering constraint — CONFIRMED
The prompt's own header: *"Run this AFTER Day 72 (the workspace) has landed. It documents the
post-72 shell."* So A74-1 executes only after Days 71–72 are in the working tree. It also expects the
Day-71 and Day-72 reports to exist (it reads them). In this one-execute-session block, that means the
71/72 work is done and their reports written before the docs day runs. It is EXECUTE+REPORT and
docs-only.

## What it will produce (from the prompt §2 — inventory only, not authored here)
- **`docs/manual/`** (end-user manual, prose): `00-overview` · `01-install-and-first-project` ·
  `02-create-a-project` · `03-data-model` (field types from `project-model.ts`, not memory; has-many
  collected explicitly) · `04-projects-save-load` (`created_at` in the storage row, never the
  blueprint JSON) · `05-the-map` (verbatim granularity boundary) · `06-impact-preview` (PART 1z, not
  path heuristics) · `07-compare-versions` (no ghost nodes) · `08-verify` (verbatim reproducibility
  line) · `09-export` (verbatim Law-21 line; never "no trace") · `10-troubleshooting` · `11-faq`.
- **`docs/architecture/`**: `ARCHITECTURE.md` · `DETERMINISM.md` (backstop, 103 digests, MAXIMAL,
  sync-gen stamp semantics, re-baseline policy) · `VERIFICATION-LADDER.md` (Express booted; FastAPI
  & Django syntax-level; Go & Spring Boot generation-only; benchmarks 75/75).
- **`docs/LIMITATIONS.md`** — the complete known-limitations set in ONE place.
- **Root pass:** `README.md` alignment to post-72 reality; `CAPABILITIES.md` cross-check (flag
  conflicts, do NOT silently edit claims).
- **The three verbatim honesty lines** embedded (Verify = reproducibility; Map granularity boundary;
  Law-21 no-functional-dependency). Every claim carries a proof pointer (report §/PART id).
- **`[SCREENSHOT-NEEDED: …]` markers** collected into a single list for Leela.

## The gate (A74-1)
`npm run day20:regress` from `generator/` → **203 OK / 0 FAIL** (docs cannot move a hash — prove it
anyway, paste the tail) AND `git status` shows **ONLY docs**. Commit message per the prompt:
`docs: complete end-user manual + architecture docs (docs-only, backstop green)`.

**`.gitignore` watch (F10):** `docs/manual/*`, `docs/architecture/*`, `docs/LIMITATIONS.md` live under
the whitelisted `/docs/` → not ignored, no rule needed. **BUT** if the docs-day prompt's "root pass"
creates any NEW **root-level** file, the `/*` whitelist swallows it silently — add an explicit
un-ignore line (follow the `!/CLAUDE.md` pattern) and confirm with `git status`. (`README.md` and
`CAPABILITIES.md` are already whitelisted; only a genuinely new root file needs the rule.)

## Scope
Docs-only. No generator source, no shell source, no hash may move, no new PARTs. The doc set describes
what the code DOES (read it), not what a brief imagined — any code-vs-docs drift is a report finding,
the code wins.
