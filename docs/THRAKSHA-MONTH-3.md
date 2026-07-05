# Thraksha Ecosystem — Month 3 (Days 41–60)

**Phase:** Phase 4 (Export Hardening + Security Passes + The Map) — plus the final Fable 5 hardening pass and release.
**Read first, always:** `docs/THRAKSHA-GUARDRAILS.md`, then `docs/THRAKSHA-ECOSYSTEM-PLAN.md`, then this file, then the REAL code.
**Predecessor:** Month 2 (Phases 2–3, certified Day 40).

---

## HOW EACH DAY RUNS (every single day below — no exceptions)

**Each numbered day is THREE Claude Code sessions, in order, in separate windows:**

1. **Session 1 — PLAN** → writes `docs/daily/eco-day-NN-plan.md`. Reads guardrails + this file + the real code. Done-conditions, gates, scope guards. **No code.**
2. **Session 2 — EXECUTE** → builds the day's **Goal**, gated by the day's **Gate**. A verification gate after every step. **Stop and report rather than write a clean-looking close if a proof fails.** **No report.**
3. **Session 3 — REPORT** → writes the day's **Output** (`eco-day-NN-report.md`). Re-confirm from clean; guard-the-guard; the benchmark if it's a phase close. **Verify + document only.**

Each day lists **Goal / Gate / Output**. The Plan session is always first.

> **Honesty note.** Month 3 makes the product shippable: clean export, the Map, security, signing. The Map's forward direction is deterministic-friendly and the star feature; the security passes are deterministic-first with AI strictly advisory-last. Multi-day units marked `[N days]`. The frozen backstop reproduces at the end of every day.

---

## The Month-3 arc

**Weeks 9–10 (Days 41–50): export + security + the Map.** The exporter proves Law 21 end-to-end (delete Thraksha, it still builds and runs); the deterministic Semgrep scan + optional developer-keyed AI scan; the Map (impact preview + flow map).

**Weeks 11–12 (Days 51–60): hardening + release.** The Fable 5 pass over Thraksha's own code (gated behind deterministic scanners); code signing + notarization; the final full-system regression; the release.

**Month-3 non-negotiable:** the exported project builds and runs with Thraksha uninstalled (Law 21). The Map's preview exactly matches what generation actually does. AI in the security layer is advisory-only, never the gate.

---

## PHASE 4 — Export Hardening + Security + The Map (Days 41–50)

### Day 41 — The exporter + standalone-run proof `[2 days]`
- **Goal:** export is first-class; the exported project builds and runs with Thraksha deleted (Law 21 end-to-end). A clean one-action export (no Thraksha strings, no dangling references); include a version-pinned Dockerfile (base image = the blueprint's pinned runtime) so the container-build path needs only a container runtime.
- **Gate:** exported project builds+runs standalone on all 3 OSes (via container path at minimum), CRUD round-trips after Thraksha is uninstalled; the export is byte-identical to the in-app generation (export adds no drift).
- **Output:** `eco-day-41-report.md`.

### Day 43 — Deterministic security scan (Semgrep) — the free default
- **Goal:** the free, certain, deterministic security gate wired into generated projects AND as an in-app "scan" action. Findings stamped CERTAIN (deterministic). No AI, no key, no tokens.
- **Gate:** the scan runs deterministically (same project → same findings); it catches known-planted issues in a test project; generation output unaffected (the scan is a separate layer).
- **Output:** `eco-day-43-report.md`.

### Day 45 — Optional developer-keyed AI security scan (detachable) `[2 days]`
- **Goal:** the AI-advisory tier — opt-in, the developer's key, strictly AFTER and separate from the deterministic scan. A narrow `scanProject(path) → findings` interface; settings-level developer key; DEFAULT OFF. Findings stamped ADVISORY — visibly distinct from CERTAIN. Neutral structured prompts; whole-module context.
- **Gate:** the deterministic scan is the gate; the AI scan is opt-in and clearly ADVISORY; delete-the-key → everything still works; the two finding-classes are visibly distinct.
- **Output:** `eco-day-45-report.md`.

### Day 47 — The Map: impact preview (Terraform-`plan`-style) `[3 days]`
- **Goal:** the star feature — show exactly which files/lines a change will affect, BEFORE generating (exactly computable because generation is deterministic). Given (current model, proposed model): regenerate to a temp tree; hash-precheck to find the changed file set instantly; then line-diff. Produce a machine-readable plan `{file, action: add|change|delete|no-op, before, after}` shown BEFORE generating, as a "preview changes" gate. Wire into the wizard.
- **Gate:** the previewed plan EXACTLY matches what generation actually does (regenerate and confirm the real diff == the previewed diff, byte-for-byte); the hash-precheck correctly identifies the changed file set. The preview must be truthful, not approximate.
- **Output:** `eco-day-47-report.md`.

### Day 50 — The Map: flow map + Phase-4 mid-benchmark
- **Goal:** the flow visualization (request lifecycle / routes / data flow) as a direct projection of the blueprint's declared entities/routes/relationships/integrations (traceability is free because generation is deterministic). **Mid-phase benchmark:** export standalone (Law 21) + deterministic scan + optional AI scan + impact-map preview all working together.
- **Gate:** the flow map reflects the actual generated structure; the mid-benchmark passes; `day20:regress` green.
- **Output:** `eco-day-50-report.md`.

---

## RELEASE — Hardening + Signing + Ship (Days 51–60)

### Day 52 — Fable 5 hardening pass over Thraksha's own code `[3 days]`
- **Goal:** the final dev-phase hardening — a capable AI over Thraksha's OWN codebase, gated behind deterministic scanners. FIRST run the deterministic gate (Semgrep + CodeQL + full test suite green — these catch the structural issues for certain). THEN Fable 5 reviews for cross-file/architectural/business-logic issues scanners miss, with neutral structured prompts and whole-module context. Human-verify every AI finding (high false-positive rates; miss stateful issues). **This is a one-time dev-phase step for YOU, not a product feature.**
- **Gate:** deterministic scanners + tests green (the gate); Fable 5 findings triaged + real ones fixed; every fix proven hash-neutral OR a documented deliberate change; `day20:regress` green after fixes.
- **Output:** `eco-day-52-report.md` — the hardening pass recorded (found / fixed / false-positive).

### Day 55 — Code signing + notarization `[2 days]`
- **Goal:** trusted installers on all platforms. Apple Developer ID cert + notarization (macOS); Windows code-signing cert (EV for instant SmartScreen reputation). Automate in CI.
- **Gate:** signed installers pass Gatekeeper (macOS) and SmartScreen (Windows) on clean machines; the signed build still spawns the sidecar and generates byte-identical (signing doesn't break the sidecar path).
- **Output:** `eco-day-55-report.md`.

### Day 58 — Final full-system regression (the certification) `[2 days]`
- **Goal:** the whole ecosystem proven together — the Month-3 analogue of the 21-day Day-20. The consolidated regression from clean: all frozen baselines (the original 43 + 10 + maximal, PLUS every ecosystem baseline: framework+version, org-policy, has-many, decimal, field-key re-baseline, all 7 project types, CI/CD, Figma round-trip, creative-slot shells). Cross-OS byte-identical; the signed installer's sidecar path; export standalone-run; the Map preview truthfulness; the security layers. The all-laws certification with proof locations (ADR-001..005, Law 21, Law 25).
- **Gate:** everything green from clean, cross-OS, signed; nothing drifted; every law certified with a proof location.
- **Output:** `eco-day-58-report.md` — the ecosystem certified.

### Day 60 — Release + final docs
- **Goal:** ship, and produce the honest closing record. `docs/CAPABILITIES.md` updated (every capability at its proven level with a source; the complete known-limitations set carried forward). The consolidated ecosystem report (the arc across Phases 0–4). The honest boundaries restated (deferred: the any-project engine, plugin marketplace, cloud sync). **The release:** the signed installers.
- **Gate:** docs honest (no overclaim; every limitation present); the release builds are the certified builds.
- **Output:** `eco-day-60-report.md` — the ecosystem shipped. The closing statement.

---

## Month-3 exit state — the shipped ecosystem

A developer can:
1. **Install Thraksha in one click** (signed, self-contained) on macOS/Windows/Linux.
2. **Fill rich, org-policy-governed inputs** (incl. explicit framework+version) through a progressive-disclosure wizard.
3. **Design in Figma** → tokens/structure feed the generator deterministically.
4. **Generate a complete, deployable app** — 7 project types, byte-identical, for certain, no AI — with clearly-marked creative slots.
5. **Fill creative slots with their own AI** (their key, their bill) — fully detachable.
6. **Preview exactly what a change will do** before generating (the Map).
7. **Export and run standalone** with Thraksha uninstalled (Law 21).
8. **Run a deterministic security scan free**, and optionally an AI scan with their own key.

Thraksha's own code has passed a Fable 5 hardening pass, gated behind deterministic scanners.

**Measured against the one line:** *does the software do everything it can deterministically, for free and for certain, and confine AI to the genuinely irreducible creative/judgment gaps — always opt-in, always detachable, always the developer's own bill?* If yes, the thesis held, end to end.

---

## The follow-on (AFTER this 3-month plan — not in it)

The **any-project bug/quality engine** (works on code Thraksha didn't generate) is the dedicated next effort. It inherits this plan's security layer (deterministic-first, AI-advisory-last) but adds the genuinely hard part: understanding arbitrary codebases well enough to map them before inspecting. That is its own multi-week plan, sequenced after the ecosystem ships — not squeezed into these 60 days.
