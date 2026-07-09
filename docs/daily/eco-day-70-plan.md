# Eco-Day 70 — PLAN (brief): THE RELEASE — the close of the 70-day build

**Day 70 — the final day. DOCS ONLY.** The 70-day build is complete and certified (Eco-Day 69: the
end-user Bedrock system — engine + wizard + store + the Map + Verify + export — 203 OK / 0 FAIL, the
bundled sidecar reproduces the 103 frozen digests, MAXIMAL `366e19d9…` unmoved across all 70 days).
Day 70 updates the release documentation to the **real product** (no longer "deferred"), records Half B's
status honestly, and hands off the 4 ordered Store steps. **No code, no generator change, no Rust, no
frozen hash moved.**

**Plan + Execute + Report in one session** (a docs-only day).

## The done-conditions (Part A — docs only; each claims ONLY what Eco-Day 69 + the carried Day-58 cert certified)

- **DC-1 — /CAPABILITIES.md → v0.2.0:** the real product (the engine carried from Day 58 + the product
  from Days 61–69), each capability at its certified level + proof location; the complete Eco-Day-69
  boundary ledger. **Preserve the superseded v0.1.0 record** (archived to
  `docs/CAPABILITIES-v0.1.0.md`, banner-marked; the original 21-day-core `docs/CAPABILITIES.md` still
  pointed to).
- **DC-2 — /README.md → v0.2.0:** the front door — "Define your app. See its architecture drawn. See
  exactly what a change will touch — before it touches it. Generate a project you own outright." The
  thesis; the Map as the visible dividend of determinism; **"AI guesses; Bedrock knows."**
- **DC-3 — /RELEASE-NOTES.md → v0.2.0:** the honest release state (what ships; the certified backstop;
  packaged-path determinism; 75/75; what's deferred incl. Half B; the 70-day arc). The **artifact-label
  note** (the fresh installers carry `0.1.0`; the string is bumped at the submission wrap — moves no
  hash).
- **DC-4 — the Store runbook** (`desktop/src-tauri/msix/README.md`): refreshed — the fresh Eco-Day-69
  payload + the new sidecar stamp `83ffd0ad`/245; **step 2 now also runs Half B's live-GUI checklist**;
  the two-wrap-pass name↔identity dependency kept; a recipe (no step claimed done).
- **DC-5 — Half B's status:** recorded honestly. **Confirmed with Leela: not yet run → PENDING** (all 8
  items). Never claimed.
- **DC-6 (load-bearing) — docs-only proof:** `day20:regress` → 203 OK / 0 FAIL, 103 baked + 10 +
  non-hash byte-identical, MAXIMAL `366e19d9` unmoved; PART 1w/1x/1y/1z unchanged. `git status` → only
  docs (root docs + the archive + msix/README + the plan/report). No code, no generator, no Rust. `deps
  {}`. A moved hash = FINDING, STOP.

## Part B — the release close (`eco-day-70-report.md`)

Re-confirm the backstop from clean, then document the docs updated, the Store runbook, Half B's PENDING
status, the docs-only proof, the complete boundary ledger one final time, the final verdict (the 70-day
build complete), and the handoff (ship-ready in-repo vs the 4 ordered Leela's-machine Store steps).

## Scope guard — OUT

DOCS ONLY; claim only what Eco-Day 69 certified; Verify = reproducibility (not correctness/security);
Law 21 at its proven level (no FUNCTIONAL dependency; inert provenance comments remain; live boot not
run); the Map's granularity boundary (entity/app/edges); the Store runbook is a recipe; Half B recorded
verbatim or PENDING (never claimed); preserve superseded dated records; check the `.gitignore` whitelist
before committing any new file (the archive lives under the recursively-un-ignored `/docs/` — it tracks
freely; no NEW root doc added). No AI (ADR-001). A moved hash = STOP.
