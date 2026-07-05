# Thraksha Ecosystem — Month 2 (Days 21–40)

**Phases:** Phase 2 (Creative-Plug + Slot System + Depth) + Phase 3 (Figma Ingestion + More Project Types).
**Read first, always:** `docs/THRAKSHA-GUARDRAILS.md`, then `docs/THRAKSHA-ECOSYSTEM-PLAN.md`, then this file, then the REAL code.
**Predecessor:** Month 1 (Phases 0–1, certified Day 20).

---

## HOW EACH DAY RUNS (every single day below — no exceptions)

**Each numbered day is THREE Claude Code sessions, in order, in separate windows:**

1. **Session 1 — PLAN** → writes `docs/daily/eco-day-NN-plan.md`. Reads guardrails + this file + the real code. Done-conditions, gates, scope guards. **No code.**
2. **Session 2 — EXECUTE** → builds the day's **Goal**, gated by the day's **Gate**. A verification gate after every step. **Stop and report rather than write a clean-looking close if a proof fails.** **No report.**
3. **Session 3 — REPORT** → writes the day's **Output** (`eco-day-NN-report.md`). Re-confirm from clean; guard-the-guard; the phase benchmark if it's a phase close. **Verify + document only.**

Each day lists **Goal / Gate / Output**. The Plan session is always first.

> **Honesty note.** Month 2 holds the biggest genuinely-new proofs: the creative-slot literal bypass, and the Figma round-trip determinism. Multi-day units marked `[N days]` still follow Plan→Execute→Report. The frozen backstop (now cross-OS, framework+version-aware) reproduces at the end of every day.

---

## The Month-2 arc

**Weeks 5–6 (Days 21–30): Phase 2.** The creative-plug/slot system (byte-identical shell whether or not slots are filled; the optional AI fill detachable and developer-keyed), plus closing the three depth limitations (has-many, decimal/money, field-key consistency) — deterministic projections across the 5 stacks + 2 DBs.

**Weeks 7–8 (Days 31–40): Phase 3.** The Thraksha Figma plugin (tokens/structure → deterministic model input, byte-identical round-trip), new project-type archetypes, and deterministic CI/CD generation.

**Month-2 non-negotiable:** delete the AI fill layer/key → the project still generates completely and validly (Law 21 for the creative path). Every new baseline is twice-identical. The empty/default path reproduces the frozen backstop every day.

---

## PHASE 2 — Creative-Plug + Slot System + Depth (Days 21–30)

### Day 21 — The slot mechanism (typed content slots) `[2 days]`
- **Goal:** the generator emits a byte-identical structural shell with clearly-marked, typed placeholders where creativity is required. A `type → component` map with an `UnknownSection` fallback; content lives as a SEPARATE structured layer keyed to slots — the shell never depends on slot content to be valid.
- **Gate:** the shell is BYTE-IDENTICAL across empty/partial/full slot states; a project with slots still reproduces its structural baseline; `day20:regress` green.
- **Output:** `eco-day-21-report.md`.

### Day 23 — The optional, detachable, developer-keyed AI fill `[2 days]`
- **Goal:** AI fills ONLY slot content, outside the generation path, with the developer's own key (the Day-18 detachable pattern). A narrow `fillSlot(spec) → content` interface; settings-level developer key; DEFAULT OFF. Generation ALWAYS runs first (shell + empty slots); AI fill is a POST-step that writes only slot content, never structure.
- **Gate:** shell byte-identical with AI-fill present-but-off; with AI-fill on, only slot CONTENT changes, structure unchanged; delete-the-layer/key → the project still generates completely (Law 21 for the creative path); ADR-001 sweep confirms no AI in the generator core.
- **Output:** `eco-day-23-report.md`.

### Day 25 — has-many relationships `[2 days]`
- **Goal:** the reverse projection of the belongs-to FK that already works — no new DB concept. The FK stays on the child; the parent gains a collection accessor (JPA `@OneToMany(mappedBy)`, Django reverse `related_name`, SQLAlchemy `back_populates`, GORM slice, Express accessor). Declarative options (eager/lazy, cascade, bidirectional) with fixed defaults. The DEFAULT (no has-many) reproduces the frozen hashes.
- **Gate:** no-has-many path frozen; has-many produces new twice-identical baselines across all 5 stacks + 2 DBs; the collection round-trips live in at least one boot; UI-declared has-many == the engine path.
- **Output:** `eco-day-25-report.md`.

### Day 27 — decimal / money type
- **Goal:** exact decimal handling, deterministically, across all stacks. Storage `NUMERIC(p,s)` — never float, never Postgres `money`; scale ≥4 default. Language mapping: Java `BigDecimal`, Python `Decimal`, Go decimal lib, JS/TS decimal lib. Serialize as strings for cross-stack fidelity. A new `decimal`/`money` field type with `precision`/`scale`.
- **Gate:** the new field type produces twice-identical baselines across all 5 stacks + 2 DBs; a decimal value round-trips exactly (no float drift) in at least one boot; existing (non-decimal) baselines unmoved.
- **Output:** `eco-day-27-report.md`.

### Day 29 — field-key consistency (the mixed-key fix — THE FIRST DELIBERATE RE-BASELINE)
- **Goal:** close the documented mixed-key limitation — FK keys follow the same naming convention as declared fields, routed through the same transform at the serialization boundary. **This MOVES a baseline deliberately** (the mixed-key limitation was documented frozen behavior). This is the FIRST intentional re-baseline of the ecosystem phase: document the old behavior, the fix, the new hashes, and WHY.
- **Gate:** FK keys now honor the naming convention across all 5 stacks; the re-baseline is documented (old → new + rationale); NO OTHER baseline moves.
- **Output:** `eco-day-29-report.md` — the mixed-key limitation closed; the deliberate re-baseline recorded.

### Day 30 — Phase 2 close: the benchmark
- **Goal:** prove Phase 2's exit condition. **The benchmark:** delete the AI layer/key → a project with creative slots still generates completely and validly; has-many/decimal/field-key each produce their new frozen baselines; the shell is byte-identical regardless of slot fill.
- **Gate:** the benchmark passes; the extended `day20:regress` green (now including the deliberate field-key re-baseline as the new certified state); cross-OS byte-identical.
- **Output:** `eco-day-30-report.md` — Phase 2 certified. Handoff to Phase 3.

---

## PHASE 3 — Figma Ingestion + More Project Types (Days 31–40)

### Day 31 — The Thraksha Figma plugin: token export `[3 days]`
- **Goal:** Figma feeds the generator as STRUCTURED DATA (never screenshots). A Figma plugin (NOT the Enterprise-only REST API) using `getLocalVariablesAsync()` + `getLocalVariableCollectionsAsync()`; export variables + component tree + auto-layout as W3C token JSON → Style Dictionary → deterministic model input. Enforce "Auto Layout + named variables required" for eligibility; everything else → slots/human review.
- **Gate:** the SAME Figma file exported twice → byte-identical model input AND byte-identical generated shell; a design lacking auto-layout/variables is correctly rejected/routed to slots.
- **Output:** `eco-day-31-report.md`.

### Day 34 — cron-worker + queue-consumer project types `[2 days]`
- **Goal:** the two archetypes structurally closest to api-only (entrypoint/lifecycle swaps reusing the domain layer). cron-worker: scheduler trigger + idempotent handler that runs to completion; no HTTP routes. queue-consumer: broker connection + consume loop + per-message handler with ack/retry/dead-letter; the "route table" becomes a "topic/queue → handler" table. Each = a new project-type enum + entrypoint/lifecycle projection. The DEFAULT (web-app/api-only) unaffected.
- **Gate:** each new type produces twice-identical baselines; web-app/api-only hashes unmoved; at least one boots and runs its lifecycle (a cron tick / a consumed message).
- **Output:** `eco-day-34-report.md`.

### Day 36 — CLI + GraphQL + static-site+API project types `[2 days]`
- **Goal:** the remaining archetypes. CLI: arg-parse entrypoint, command dispatch, run-to-exit. GraphQL: one endpoint + SDL schema + resolvers (types from entities, queries/mutations from CRUD) — replaces many REST files. static-site+API: web-app + a static-output build stage.
- **Gate:** each produces twice-identical baselines; existing types unmoved; GraphQL schema is deterministic (stable type/field ordering).
- **Output:** `eco-day-36-report.md`.

### Day 38 — CI/CD pipeline generation
- **Goal:** CI/CD config as a deterministic, hashed artifact. Per stack/provider (GitHub Actions / GitLab CI): fixed setup→build→test→(docker)→deploy shape, PINNED action versions + PINNED runtime versions (from the same blueprint version field). No `matrix` over multiple runtimes in the deterministic default.
- **Gate:** CI/CD artifacts twice-identical per stack; the pinned versions match the blueprint's framework+version field; existing baselines unmoved.
- **Output:** `eco-day-38-report.md`.

### Day 40 — Phase 3 close: the benchmark
- **Goal:** prove Phase 3's exit condition. **The benchmark:** the same Figma file round-trips byte-identical; each new project type produces frozen baselines; CI/CD artifacts are deterministic.
- **Gate:** the benchmark passes; the extended `day20:regress` green (a much larger matrix — the consolidated harness earns its keep); cross-OS byte-identical.
- **Output:** `eco-day-40-report.md` — Phase 3 certified. Handoff to Month 3.

---

## Month-2 exit state

A developer can: generate a complete app with creative slots (filled by hand or their own detachable AI); use has-many, decimal/money, and consistent field-key naming across all stacks; feed the generator from Figma (deterministic round-trip); choose from 7 project types (web-app, api-only, cron-worker, queue-consumer, CLI, GraphQL, static+API); get generated CI/CD pipelines pinned to the chosen versions. Every default/empty path still reproduces the certified frozen backstop; the creative path holds Law 21.

**Not done yet (Month 3):** export hardening + standalone-run proof, the deterministic + optional-AI security scans, the Map, the Fable 5 hardening pass, code signing.

**The line, every day:** delete the AI, delete Thraksha — does it still generate, still build, still run? If yes, the thesis and Law 21 held.
