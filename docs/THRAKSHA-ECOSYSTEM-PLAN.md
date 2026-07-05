# Thraksha — The 3-Month Ecosystem Plan

**Status:** Founding roadmap for the post-v0.1 phase. This document governs the next ~12 weeks of work.
**Predecessor:** The 21-Day Plan (v0.1 — the deterministic generation core, certified Day 20, closed Day 21).
**Build tool:** Claude Code (agentic sessions). **Design tool:** Figma. **Final hardening:** an AI security pass (Fable 5) over Thraksha's own code.
**Read first, always:** `docs/THRAKSHA-GUARDRAILS.md` — the constitution. This plan assumes it.

---

## HOW EVERY DAY RUNS (the session structure — non-negotiable)

**Every numbered day in the month files is THREE Claude Code sessions, in order, in separate windows:**

- **Session 1 — PLAN:** read guardrails + this plan + the month file + the REAL code; write `docs/daily/eco-day-NN-plan.md` (done-conditions, gates, scope guards). **No code.**
- **Session 2 — EXECUTE:** build in order; a hash/verification gate after every step; **stop and report rather than write a clean-looking close if a proof fails.** **No report.**
- **Session 3 — REPORT:** re-confirm from clean; guard-the-guard; the phase benchmark where applicable; write `docs/daily/eco-day-NN-report.md` (self-contained handoff). **Verify + document only.**

The month files show each day as **Goal / Gate / Output** — the Goal drives the Session-1 plan, the Gate is the Session-2 proof, the Output is the Session-3 report. The Plan session is always implied first. **Check-then-build:** review the plan before executing, review the execution before closing.

---

## 0. The Thesis (the one idea everything serves)

> **Reduce AI reliance for anything software can do deterministically. A 10-second deterministic pass beats burning tokens for a huge monthly bill.**

Software does everything that has a **definite, certain structure** — for free, instantly, byte-identical every time. AI is confined to the few things that genuinely require **creativity or judgment**, and even then it is:

- **optional** (default off),
- **detachable** (delete it and everything still works),
- **advisory / creative-only** (it fills creative gaps or suggests; it never generates the deterministic structure),
- **the developer's own choice and own bill** (their API key, their model, in settings).

This thesis is not a feature. It is the reason the product exists and the line that must never be crossed. Every decision in this plan is measured against it.

### The structural-vs-creative division (the heart of the product)

| Kind of thing | Who builds it | Example |
|---|---|---|
| **Has a definite right structure** | Software, deterministically, for certain, free | EMI calculator, secure photo vault, CRUD app, monitoring dashboard, the layout/form/responsiveness of a landing page |
| **Requires creativity/judgment** | Software builds the *shell*; a **plug** (human OR optional AI) fills the creative part | The persuasive headline/copy on a landing page, a product description, "which layout feels right" |
| **Requires intelligence at runtime** | Software builds the *empty slot*; the developer (or a detachable hook) fills the intelligence | "Suggest root cause", "failure prediction", AI summaries |

**The honest promise:** Thraksha turns rich structured inputs into a **complete, deployable, working application** — every part with a definite structure built for certain, for free, no AI. The few genuinely-creative or business-specific parts get a **wired-up, clearly-marked placeholder** that a human or an optional AI fills. The finished project **exports cleanly and runs standalone.**

---

## 1. What Already Exists (the v0.1 core — do not rebuild)

From the 21-Day Plan, certified and frozen:

- **Deterministic generation core** — same input → byte-identical output, proven by frozen output hashes.
- **5 backends:** Spring Boot, Express, FastAPI, Django, Go. All generate deterministically; all booted live on PostgreSQL (Spring first on Day 15). MySQL live-proven on Express + Go; the other three generation-proven on MySQL.
- **2 databases** behind a DatabaseProvider seam (PostgreSQL, MySQL).
- **2 project types:** web-app, api-only.
- **3-axis coding-style engine:** formatting, naming convention, architecture depth.
- **2 detachable integrations:** email, and an AI hook (the Day-18 detachable-runtime-hook pattern — the proven template for all optional AI in this plan).
- **Relationships:** scalar belongs-to (FK generation live; the 10 TeamTracker baselines).
- **Multi-user** owner-scoping (ADR-005).
- **A wizard UI** (currently a local web UI) capturing the full intake.
- **The frozen backstop:** 43 recorded digests + 10 relationship hashes + the maximal-composition digest, re-confirmed by a consolidated regression harness proven byte-identical to the sum of the individual gates.
- **The guardrails:** ADR-001 (no AI in generation), ADR-002 (generated vs developer code in separate files), ADR-003 (determinism), ADR-004 (mandatory/optional/default, shown not silent), ADR-005 (multi-user up front), Law 21 (generated project runs standalone), Law 25 (core neutral; per-stack logic in plugins).

**These are load-bearing. The ecosystem is built AROUND this core, never by weakening it.**

---

## 2. What the 3 Months Add (the four pillars)

1. **Richer, governed inputs → complete deployable apps.** Take the *structural* half of a real developer's intake (roles/RBAC, more entity/field types incl. decimal/money, has-many relationships, integrations, deployment targets) and — first-class and prominent — **framework + version as an explicit, governed input** (pinned into the blueprint; an org-policy layer allows/bans frameworks, languages, versions). Output leaps from "a few entities" to "a complete multi-module deployable app."

2. **The creative-plug / slot system.** The generator emits a byte-identical structural shell with clearly-marked, typed **slots** where creativity is required. A human fills them, or — optionally, detachably, with the developer's own API key — an AI fills only the slot content. Deleting the AI layer leaves a complete, valid project (Law 21 for the creative path).

3. **The desktop ecosystem ("one install").** Package the whole thing as a single, self-contained desktop app (design surface + deterministic generator + local database + exporter), with **honest toolchain handling** (detect-and-guide, not bundle) and a **clean first-class export** (standalone, runs anywhere). Figma feeds the generator as **structured design tokens**, never screenshots.

4. **The security layer (deterministic-first, AI-advisory-last).** Deterministic scanners (Semgrep/CodeQL-class) as the free, certain gate; an optional developer-keyed AI scan at export time; and, as a one-time final dev-phase step, a capable AI (Fable 5) hardening Thraksha's own codebase — gated behind the deterministic scanners, never replacing them.

> **Note on the any-project checking engine.** The user's stated intent is a bug/quality engine that works on *any* project (not only Thraksha-generated). That is the larger, more ambitious version and is **its own later effort** — it requires understanding arbitrary codebases (the genuinely hard part). This 3-month plan lays the security-layer foundations (deterministic scanners + detachable AI scan) on Thraksha-generated projects first; the any-project engine is sequenced *after* this plan as a dedicated follow-on, not squeezed into it.

---

## 3. The Non-Negotiable Rules (carried from the 21 days — see GUARDRAILS for the full set)

1. **Determinism is the crown jewel.** Same input → byte-identical output. Every new capability's default/empty path must be a **literal bypass** that reproduces the existing frozen hashes. Nothing moves a baseline silently; a legitimate re-baseline is deliberate and documented.
2. **AI is never in the generation path.** Not for inputs, not for structure, not for the generator's own logic. AI only fills creative slots or advises, always opt-in, always detachable, always the developer's own key.
3. **Generated vs developer code stay in separate files** (ADR-002). No round-trip sync, no protected regions, no bidirectional merge. The safe enhancement is a non-destructive `update` with diff-preview and conflict markers — never a silent overwrite.
4. **Ask only what changes structure or what software can't guess; default everything else; defer the rest** (ADR-004). Growing the input surface uses **progressive disclosure**, never an interrogation.
5. **Every phase is proven before the next.** Plan → Execute → Report, with hash gates. "Stop and report rather than write a clean-looking close if a proof fails." This single discipline caught every real bug in the 21 days.
6. **The generated project runs standalone** (Law 21). Export is first-class: delete Thraksha, it still builds and runs.
7. **Honesty in docs and claims.** State what is proven; name what isn't; never overclaim. Proven-vs-generation-proven distinctions are preserved.

### The three determinism killers to audit for (from the research — lock these down early)
- **Embedded timestamps / dates / random IDs / UUIDs** in generated output — the #1 cause of broken reproducibility.
- **Line endings (CRLF vs LF)** across operating systems.
- **Unsorted object/map keys** and unstable iteration order.
Also: pin the formatter (Prettier) and plugin versions; formatter config must exist before formatting runs.

---

## 4. Architecture: Deterministic Core + Detachable Layers

One installable product, layered so the determinism guarantee is **structurally protected** — every non-deterministic capability lives in an optional, removable layer.

```
┌──────────────────────────────────────────────────────────┐
│                   DESKTOP SHELL (Tauri v2)                 │
│   input/design surface · progressive-disclosure wizard    │
│   local database · capability/permission mediation         │
└──────────────────────────────────────────────────────────┘
        │ invokes (as a bundled sidecar binary)
        ▼
┌──────────────────────────────────────────────────────────┐
│        DETERMINISTIC CORE  (no network · no AI · no clock) │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Project Model / Blueprint  (single source of truth) │   │
│  │  · framework + version pinned                       │   │
│  │  · org-policy allow/ban layer                       │   │
│  │  · canonical JSON (sorted keys) — hashes stably     │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ Generation Engine  (pure projection → byte-identical)│  │
│  ├────────────────────────────────────────────────────┤   │
│  │ Exporter  (standalone project + pinned Dockerfile)  │   │
│  ├────────────────────────────────────────────────────┤   │
│  │ Verification  (golden-file snapshot hashes / gates) │   │
│  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
        │ each behind a stable interface · each opt-in · none in the deterministic path
        ▼
┌──────────────────────────────────────────────────────────┐
│                 OPTIONAL DETACHABLE LAYERS                 │
│  · Figma ingestion (tokens/structure → model input)       │
│  · Creative-AI fill (developer-keyed; fills slots only)   │
│  · Export-time security scan (Semgrep default; opt AI)    │
│  · Integrations (email, AI hook — already detachable)     │
└──────────────────────────────────────────────────────────┘
```

**Technology decisions (from the research):**
- **Desktop shell: Tauri v2** (small installer, native webview, Rust shell). The existing TypeScript/Node generator runs as a **bundled sidecar binary** (never shell out to a system `node` — bundle it, verify before spawn, communicate via stdin/stdout or localhost).
- **Local store: SQLite (better-sqlite3)** for app/project state (simplest, single-user). Optionally PGlite if dialect parity with generated Postgres is wanted.
- **Toolchains (JDK/Maven, Python, Go, Docker): detect-and-guide, never bundle.** Probe versions, compare against the blueprint-pinned version, prompt-to-install with official links, and offer a **Docker/Podman container-build path** so the user needs only a container runtime, not N native toolchains.
- **Figma: build a Thraksha Figma plugin** (the Variables REST API is Enterprise-only; the Plugin API works on all paid plans) that exports **variables + component tree + auto-layout** as W3C design-token JSON → Style Dictionary → deterministic model input. Require Auto Layout + named variables for generator eligibility; everything else → slots/human review.
- **Code signing** (Apple Developer $99/yr + notarization; Windows cert) is required for trust and is automated in CI.

---

## 5. The Phased Plan (~12 weeks)

Sequence: **robustness/depth → breadth → the map**, with the **desktop shell and determinism harness front-loaded** because everything depends on them. Each phase ends with a benchmark that must pass before the next begins. The day-by-day breakdown lives in `THRAKSHA-MONTH-1.md`, `-2.md`, `-3.md`.

### Phase 0 — Foundations & Guardrails (Weeks 1–2, Month 1)
Stand up the shell and lock down determinism *before* building features on top. Determinism audit (three killers) + cross-OS proof + Tauri shell + Node-sidecar plumbing + local store + CI harness. **Benchmark:** a signed installer on all 3 OSes that runs the existing generator via sidecar and passes a byte-identical snapshot test.

### Phase 1 — Governed Inputs + Progressive-Disclosure UI (Weeks 3–5, Month 1)
Framework+version as a first-class governed input; org-policy allow/ban layer; progressive-disclosure wizard; toolchain detect-and-guide. **Benchmark:** generate a project with an explicitly pinned, policy-checked framework+version; the app detects a missing toolchain and guides; default paths reproduce the frozen hashes.

### Phase 2 — Creative-Plug + Slot System + Depth (Weeks 6–8, Month 2)
Typed content slots (byte-identical shell regardless of fill); optional developer-keyed AI fill (detachable); close has-many, decimal/money, field-key consistency. **Benchmark:** delete the AI layer → the project still generates completely; the depth features produce new frozen baselines across all stacks.

### Phase 3 — Figma Ingestion + More Project Types (Weeks 8–10, Month 2)
The Thraksha Figma plugin (deterministic token round-trip); new project types (cron-worker, queue-consumer, CLI, GraphQL, static+API); CI/CD generation. **Benchmark:** Figma round-trip byte-identical; each new type produces frozen baselines; CI/CD artifacts deterministic.

### Phase 4 — Export Hardening + Security + The Map (Weeks 10–12, Month 3)
Exporter + standalone-run (Law 21); deterministic Semgrep scan + optional developer-keyed AI scan; the Map (impact preview + flow map); Fable 5 hardening pass over Thraksha's own code; code signing. **Benchmark:** exported project builds/runs with Thraksha uninstalled; signed installers pass Gatekeeper/SmartScreen; the impact map previews a change truthfully.

---

## 6. What Is NOT in Scope (honest boundaries)

- **Bundling heavy toolchains** (JDK/Python/Go/Docker) into the installer — impossible to do honestly; detect-and-guide + container path instead.
- **General screenshot-to-code / AI "guess the app from a picture"** — nondeterministic by nature; violates the thesis.
- **Round-trip synchronization / bidirectional model↔code sync / protected regions** — research-confirmed dead-ends; the separate-file approach is correct.
- **A full third-party plugin marketplace** — larger effort, later.
- **Multi-user cloud sync / the platform as a hosted service** — out; this is a local-first desktop tool for now.
- **The any-project bug/quality engine** — a dedicated follow-on *after* this plan (it requires understanding arbitrary codebases; the hard part). This plan builds the security-layer foundations on Thraksha-generated projects first.
- **Building a VS Code-class general editor** — Thraksha is a specialized intent-to-deployable machine, not a general code editor. The developer exports and uses their own editor.

---

## 7. Thresholds That Change the Plan

- If native-webview CSS variance bites the design surface → consider Electron for the shell only (keep the deterministic core identical).
- If Figma designs consistently lack Auto Layout/variables → invest in the slot/human-review path; do **not** reach for screenshot-to-code.
- If the toolchain-guide UX frustrates users → make the Docker/Podman container-build path the default "run" story.
- If any archetype cannot reach byte-identical output → quarantine that stack for that archetype and document it, never weaken the determinism guarantee.
- If the org-policy filter starts encoding *behavioral* logic (not just option filtering) → formalize it as policy-as-code, not ad-hoc conditionals.
- If a non-destructive `update`/merge shows high conflict rates in dogfooding → narrow it to drift-detection + regenerate-and-diff (skip auto-merge).

---

## 8. The Working Rhythm (restated — carried from the 21 days)

Each day = the three sessions from the top of this document:
- **Session 1 — Plan:** read the docs + the real code; resolve unknowns empirically; write a plan file with explicit done-conditions, gates, and scope guards. No code.
- **Session 2 — Execute:** build in order; a hash/verification gate after every step; **stop and report rather than write a clean-looking close if a proof fails.** No report.
- **Session 3 — Report:** re-confirm from clean; guard-the-guard; the benchmark for the phase; write a self-contained report that hands off to the next day.

**Discipline that must persist even self-driven in Claude Code:**
- Check-then-build (review the plan before executing; review execution before closing).
- The determinism backstop is non-negotiable; empty/default paths reproduce frozen hashes.
- Honesty: booted-vs-generation-proven, proven-vs-advisory, never overclaim.
- The single line that caught every real bug: **"STOP and report rather than write a clean-looking close if a proof fails."**

---

## 9. Success Criteria for the 3 Months

At the end, a developer can:
1. **Install Thraksha in one click** (signed, self-contained) and open a working design+generation environment.
2. **Fill rich structured inputs** — including an explicit, policy-governed framework+version — through a progressive-disclosure wizard that never interrogates.
3. **Design in Figma** and have tokens/structure feed the generator deterministically.
4. **Generate a complete, deployable, working application** — byte-identical, for certain, no AI — with clearly-marked creative slots.
5. **Optionally fill creative slots with their own AI** (their key, their bill), fully detachable.
6. **Preview exactly what a change will do** before generating (the Map).
7. **Export the finished project** and build/run it standalone with Thraksha uninstalled.
8. **Run a deterministic security scan for free**, and optionally an AI scan with their own key.

And Thraksha's own codebase has passed a Fable 5 hardening pass, gated behind deterministic scanners.

**The whole thing measured against one line:** *does the software do everything it can deterministically, for free and for certain, and confine AI to the genuinely irreducible creative/judgment gaps — always opt-in, always detachable, always the developer's own bill?* If yes, the thesis held.

---

*This document is the founding record for the ecosystem phase. It is honest by construction: it states what exists, what will be built, what is deliberately out of scope, and the thresholds that would change course. Keep it in `docs/`. Every day refers back to it — and to `THRAKSHA-GUARDRAILS.md`, read first, always.*
