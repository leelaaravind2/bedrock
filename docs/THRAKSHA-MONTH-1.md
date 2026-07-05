# Thraksha Ecosystem — Month 1 (Days 1–20)

**Phases:** Phase 0 (Foundations & Guardrails) + Phase 1 (Governed Inputs & Progressive-Disclosure UI).
**Read first, always:** `docs/THRAKSHA-GUARDRAILS.md`, then `docs/THRAKSHA-ECOSYSTEM-PLAN.md`, then this file, then the REAL code.

---

## HOW EACH DAY RUNS (every single day below — no exceptions)

**Each numbered day is THREE Claude Code sessions, in order, in separate windows:**

1. **Session 1 — PLAN** → writes `docs/daily/eco-day-NN-plan.md`. Reads guardrails + this file + the real code. Resolves the day's unknowns empirically. Done-conditions, gates, scope guards. **No code.**
2. **Session 2 — EXECUTE** → builds the day's **Goal**, gated by the day's **Gate**. A verification gate after every step. **Stop and report rather than write a clean-looking close if a proof fails.** **No report.**
3. **Session 3 — REPORT** → writes the day's **Output** (`eco-day-NN-report.md`). Re-confirms from clean; guard-the-guard; the phase benchmark if it's a phase close. **Verify + document only.**

Below, each day lists **Goal** (drives Session 1's plan), **Gate** (Session 2's proof), **Output** (Session 3's report). The Plan session is always first, even though only Goal/Gate/Output are shown.

> **Honesty note on day sizing.** Some units are genuinely multi-day (the Tauri sidecar, the org-policy layer); marked `[N days]`. A multi-day unit still follows Plan→Execute→Report — it just takes more than one execute session. Do NOT compress a 3-day piece into one; that's how determinism cracks slip through. Day numbers are the spine, not a rigid calendar.

---

## The Month-1 arc

**Weeks 1–2 (Days 1–10): Phase 0.** Prove the ground is solid (determinism audit, cross-OS), then stand up the desktop shell and prove the existing generator runs inside it from a packaged build. Nothing new is generated; the existing frozen backstop stays intact throughout.

**Weeks 3–4 (Days 11–20): Phase 1.** Make framework+version a first-class governed input, add the org-policy allow/ban layer, rebuild the wizard as progressive disclosure, add toolchain detect-and-guide. Every empty/default path still reproduces the frozen hashes.

**Month-1 non-negotiable:** the 43 digests + 10 relationship hashes + the maximal digest reproduce byte-identical at the end of every single day.

---

## PHASE 0 — Foundations & Guardrails (Days 1–10)

### Day 1 — Determinism ground-truth audit + harness discipline
- **Goal:** before building anything, confirm the existing generator's determinism holds and lock down the three killers (timestamps/UUIDs, CRLF/LF, key ordering). Answer the cross-OS question honestly (the 21 days were single-OS). Document the go-forward harness discipline (new features add baselines; empty/default path reproduces frozen hashes; the new cross-OS check).
- **Gate (Session 2):** `npm run day20:regress` green; any pure lock-down proven hash-neutral; a lock-down that WOULD move a hash is a STOP-and-report finding.
- **Output (Session 3):** `docs/daily/eco-day-01-report.md` — the ground-truth record.

### Day 2 — Cross-OS determinism proof `[2 days]`
- **Goal:** prove (or fix) byte-identical generation across macOS/Windows/Linux — the single biggest inherited risk. Run the same generation on all 3; hash and diff. If not identical, the diff is the finding (almost certainly CRLF/LF or path separators); fix at the generator level, prove hash-neutral on the original OS, then re-prove cross-OS.
- **Gate:** identical hashes on all 3 OSes; `day20:regress` still green.
- **Output:** `eco-day-02-report.md` — cross-OS determinism certified or the fix documented.

### Day 4 — Tauri v2 shell skeleton
- **Goal:** a minimal Tauri v2 app that opens a window and loads a placeholder UI. No generator wiring yet — just prove the shell compiles, packages, and opens on all 3 OSes.
- **Gate:** the shell builds and opens on macOS, Windows, Linux (dev build; signing is Phase 4).
- **Output:** `eco-day-04-report.md`.

### Day 5 — The Node-sidecar spawn (highest-risk plumbing) `[3 days]`
- **Goal:** prove the existing TypeScript/Node generator runs as a bundled sidecar binary spawned from a PACKAGED Tauri build. Compile the generator to a self-contained binary; declare it in `externalBin`; NEVER shell out to a system `node` (macOS Finder gives a minimal PATH); verify the binary exists before spawn; communicate via stdin/stdout or localhost. Prove from a packaged build, not `tauri dev`.
- **Gate:** the packaged shell spawns the generator and produces byte-identical output (matching the frozen hashes) on all 3 OSes.
- **Output:** `eco-day-05-report.md` — the sidecar plumbing proven end-to-end.

### Day 8 — Local SQLite store for blueprint/project state
- **Goal:** persist the Project Model / blueprint locally, canonically (sorted keys, so it hashes stably — the blueprint is now the persisted source of truth). Wire better-sqlite3 (or PGlite if dialect parity is wanted).
- **Gate:** a saved-then-loaded blueprint round-trips byte-identical; generation from the loaded model reproduces the frozen hashes.
- **Output:** `eco-day-08-report.md`.

### Day 9 — CLAUDE.md + hooks + determinism CI
- **Goal:** the build-discipline scaffolding for 3 months. Lean hierarchical `CLAUDE.md` (root + per-package); hooks (format-on-write, typecheck/lint/test gates — hooks are guarantees); wire the determinism snapshot-hash harness into CI (golden-file hashes; pinned Prettier + plugins; `.gitattributes`).
- **Gate:** CI runs the determinism harness green; hooks fire on write/commit.
- **Output:** `eco-day-09-report.md`.

> **⚠ ERRATUM (Eco-Day 1, 2026-07-03) — "pinned Prettier + plugins" has NO TARGET.** The generator uses **no external formatter** (no Prettier/ESLint/dprint/biome anywhere in deps). The formatting-determinism guarantee is that the generator's own internal `reindent` (`core/style.ts`) is deterministic in-repo code — nothing external to pin. Day 9 should (a) drop the Prettier pin, (b) keep `.gitattributes` (`* text=auto eol=lf`) as git-layer hygiene, noting the **load-bearing** LF guarantee already lives at the generator (Eco-Day 1 LD-1: LF-normalize on template read) + is guarded by day20:regress (LD-2). See [`eco-day-01-plan.md`](daily/eco-day-01-plan.md) §1 / [`eco-day-01-report.md`](daily/eco-day-01-report.md).

### Day 10 — Phase 0 close: the benchmark
- **Goal:** prove Phase 0's exit condition. **The benchmark:** a packaged Tauri installer on all 3 OSes that runs the existing generator via sidecar and passes a byte-identical snapshot test.
- **Gate:** the benchmark passes on all 3 OSes; `day20:regress` green; cross-OS byte-identical.
- **Output:** `eco-day-10-report.md` — Phase 0 certified. Self-contained handoff to Phase 1.

---

## PHASE 1 — Governed Inputs & Progressive-Disclosure UI (Days 11–20)

### Day 11 — Framework + version as a first-class blueprint field `[2 days]`
- **Goal:** make framework AND version explicit, pinned, persisted inputs (the most important structural input). Extend the model to carry a pinned version per stack (java:21, springBoot:4.1, node:22, python:3.13, go:1.23), modelled on JHipster `.yo-rc.json` + Nx `versions.ts`. The DEFAULT version set reproduces the current frozen hashes (literal bypass — current output already implies specific versions; make them explicit without changing bytes). "Latest" = a resolution step that writes a concrete pin BEFORE generation.
- **Gate:** the default pinned version set reproduces all frozen hashes; a non-default version produces a new twice-identical baseline.
- **Output:** `eco-day-11-report.md`.

### Day 13 — Org-policy allow/ban layer `[3 days]`
- **Goal:** ADR-004 made real — a pure, versioned input that runs BEFORE the wizard: removes banned choices, sets approved defaults, tags soft/hard enforcement. Because it's a pure input, the same (blueprint + profile) still yields byte-identical output. Prove: a profile that bans Java 8 and forces Java 21 deterministically produces the filtered options + defaults.
- **Gate:** with NO profile (default), all frozen hashes reproduce (the profile is a literal bypass when absent); with a profile, options filter and defaults set deterministically.
- **Output:** `eco-day-13-report.md`.

### Day 16 — Progressive-disclosure wizard rebuild `[2 days]`
- **Goal:** grow the input surface without an interrogation. Staged (required backbone) + conditional ("Advanced" for RBAC/integrations/deploy targets) + contextual (reveal only when a prior choice implies it). Simple/Advanced toggle with persistence. Aggressive smart defaults; only require inputs that change structure or that software can't guess. Surface framework+version and org-policy-filtered options.
- **Gate:** the default (simple-mode) path reproduces all frozen hashes; UI==CLI for the new inputs (a wizard-chosen framework+version == the programmatic path, byte-identical).
- **Output:** `eco-day-16-report.md`.

### Day 18 — Toolchain detect-and-guide service `[2 days]`
- **Goal:** the honest "one install" story. Probe java/mvn/python/go/docker; parse versions; compare against the blueprint-pinned version. If missing/mismatched → clear message + official install link; never silently fail. Offer the Docker/Podman container-build path (needs only a container runtime) — generate a version-pinned Dockerfile.
- **Gate:** the app correctly detects a present toolchain, flags a missing/mismatched one with a link, offers the container path; generation output unaffected (this is a detection layer).
- **Output:** `eco-day-18-report.md`.

### Day 20 — Phase 1 close: the benchmark
- **Goal:** prove Phase 1's exit condition. **The benchmark:** generate a project with an explicitly pinned, policy-checked framework+version through the progressive-disclosure wizard; the app detects a missing toolchain and guides; default/empty paths reproduce all frozen hashes.
- **Gate:** the benchmark passes; `day20:regress` green (extended with the new framework+version and policy baselines); cross-OS byte-identical.
- **Output:** `eco-day-20-report.md` — Phase 1 certified. Handoff to Month 2.

---

## Month-1 exit state

A developer can: install and open the Tauri shell (dev build) on any of 3 OSes; the existing generator runs inside it from a packaged build, byte-identical, cross-OS-proven; choose an explicit, org-policy-governed framework + version through a progressive-disclosure wizard; get guided if a required toolchain is missing (or use the container path). Every default/empty path still reproduces the certified frozen backstop.

**Not done yet (Month 2+):** creative-plug/slots, has-many/decimal/field-key depth, Figma ingestion, more project types, the Map, export hardening, security passes, code signing.

**The line, every day:** does the empty/default path still reproduce the frozen hashes, and is every new capability a literal bypass when unused? If yes, the core held.
