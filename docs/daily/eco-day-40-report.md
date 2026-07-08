# Eco-Day 40 — REPORT: PHASE-3 CERTIFICATION (the close)

**Phase 3, Day 40 — the certification day (the Phase-3 analogue of [Day 20](eco-day-20-report.md) /
[Day 30](eco-day-30-report.md)).** No new features; certification only. This report certifies that
the Days 31–38 stack — **Figma token ingestion + 7 project types × 5 stacks + deterministic CI/CD** —
holds together as **ONE working stack**, with a proof location for every capability and every
boundary carried forward honestly, against the Day-29-recertified backstop (MAXIMAL `366e19d9…`).
**This also closes Month 2.**

Plan: [`eco-day-40-plan.md`](eco-day-40-plan.md). Mirrors [`eco-day-30-report.md`](eco-day-30-report.md).

---

## THE VERDICT

> ✅ **Phase 3 is certified.** Figma feeds the generator as **structured W3C design tokens** (never
> screenshots) through a pure ingestion core (deterministic round-trip; eligible → tokens,
> ineligible → slots) — core CI-proven, Figma-plugin edge honest-manual. The ecosystem now offers
> **7 project types** (web-app, api-only, cron-worker, queue-consumer, CLI, GraphQL API, static+API)
> across **5 stacks**, each a deterministic **entrypoint/route-table projection that reuses the
> domain layer byte-identically** (Express booted; the other 4 generation-only). **CI/CD** is a
> deterministic, version-matched, pinned GitHub Actions artifact (no matrix/floating/timestamp). All
> **default/empty paths reproduce the frozen backstop** byte-identical from clean — **102 baked + 10
> TeamTracker + non-hash gates, 163 OK / 0 FAIL, no frozen hash moved (MAXIMAL `366e19d9…`)**.
> Generation is **AI-free** (ADR-001), **pure-Node** (`deps {}`, 0 native); every gated GraphQL/
> broker/scheduler/CI library is generated-project-only. **Month 2 complete; Month 3 (Phase 4) begins.**

---

## 1. The benchmark result (Execute DCs)

### DC-1 — Full backstop green from clean, REAL gate accounting ✅
`rm -rf dist && npm run build && npm run day20:regress` → **PASS, 163 OK / 0 FAIL**. The real
accounting (enumerated live, PART 1a → 1s):

- **102 baked digests** = **43 frozen** (20 web-app matrix + 23 alt: 5 naming + 2 formatting + 4
  simple + 2 composition + 6 api-only + 2 email + 2 ai-hook) **+ 59 additive**: MAXIMAL 1 (`366e19d9…`)
  + version 5 (Day 11) + slots 1 (Day 21) + has-many 10 (Day 25) + decimal 10 (Day 27) + field-key 5
  (Day 29) + **Figma 1 (Day 31)** + **worker 10 (Day 34)** + **CLI/GraphQL/static 11 (Day 36)** +
  **CI/CD 5 (Day 38)**.
- **+ 10 TeamTracker** relationship hashes (PART 1d, UI==CLI via `addEntity`).
- **+ non-hash gates** (PART 1c/1e/1h/1i/1j/1k/1l/1m/1n/1o/1p/1q/1r/1s — property re-derivations,
  guards, UI==CLI structural, detect, slots, fill, Figma eligibility, domain-reuse, version-match).

All byte-identical / green. **No frozen hash moved.** MAXIMAL = `366e19d9…` (the Day-29 certified state).

### DC-2 — THE END-TO-END BENCHMARK (load-bearing) ✅ — 24/24
`npm run bench:phase3` (composition-only driver [phase3-benchmark.ts](../../generator/src/phase3-benchmark.ts),
exercises existing surfaces, no generation change) → **PASS (24/24)**:

- **B1 — Figma round-trip (Day 31):** the same token JSON → byte-identical canonical model input
  (twice) → byte-identical shell (`f9a8e7c9…` == the Day-31 baseline; `design-tokens.json` emitted).
- **B2 — eligibility (both branches):** eligible (auto-layout + named vars) → 5 tokens; ineligible →
  `SlotDecl[]` routed to slots (explicit reason, never guessed).
- **B3 — the 7 project types (Days 15/34/36):** each twice-identical (Express; hashes match the
  recorded PART 1q/1r baselines); **domain-reuse holds** — cron/queue/CLI/GraphQL domain files
  byte-identical to the **api-only twin**; static+API byte-identical to the **web-app twin**.
- **B4 — CI/CD (Day 38):** all 5 stacks twice-identical + **version-matched** (setup runtime == the
  Day-11 pin) + **pinned** (no floating/timestamp/matrix); a **non-default pin** (`node:20`) tracks
  through; **default → no `ci.yml`** artifact.
- **B5 — the MaxPhase3 composition:** a GraphQL API project **+ Figma tokens + CI/CD + snake_case**,
  built programmatically AND via `assembleBlueprint` → **twice-identical + UI==CLI** (`fe0a83a1…`);
  all layers present (`schema.graphql` + `design-tokens.json` + `.github/workflows/ci.yml`); the
  naming layer flows into the SDL (`due_date`, not `dueDate`).
- **B6 — AI-free / detachable (ADR-001 / Law 21):** MaxPhase3 generates a complete shell with **no AI
  call** (a no-key `fillViaEnv` makes none; `buildFileSet` never touches `fill/` — detachable).

### DC-3 — Invariants + ADR-001 sweep ✅
- **Generator pure-Node:** `dependencies: {}`, **0 native modules**.
- **Every gated library is generated-project-only:** **none** of `graph-gophers`/`ariadne`/
  `spring-boot-starter-graphql`/`graphql`/`amqplib`/`pika`/scheduler libs/`js-yaml`/`@actions/*` is
  in Thraksha's `package.json` (they are referenced-by-name in the generated projects only).
- **ADR-001:** no AI in the generation path — the only AI refs in `core`/`plugins` are the **frozen
  Day-18 `ai='hook'` inert emitted strings** (`AI_SERVICE_JS`/`AI_SERVICE_PY` — greppable template
  code the generated *app* runs, "Thraksha makes NO model call" by construction), **git-diff-clean**;
  `buildFileSet` and the plugins never import `fill/` (the AI edge is detachable). Figma ingestion is
  AI-free (pure token→model mapping, no network).
- **No frozen hash moved** (DC-1).

---

## 2. THE PHASE-3 CERTIFICATION TABLE — each capability at its proven level + proof location

| Phase-3 capability | Proven level | Proof location |
|---|---|---|
| **Figma token ingestion** — round-trip determinism; eligible → tokens, ineligible → slots | **Core CI-proven** (canned fixture); **edge honest-manual** (Figma runtime) | Day 31 (PART 1p) + DC-2 **B1/B2** |
| **cron-worker + queue-consumer** — entrypoint/lifecycle projections reusing the domain layer | Express **booted** (setInterval tick / stubbed msg → ack/retry/dead-letter); other 4 **generation-only** | Days 34 + 34-pass2 (PART 1q) + DC-2 **B3** |
| **CLI + GraphQL + static+API** — route-table projections; deterministic SDL (shared core builder) | Express CLI/GraphQL **booted** (command run-to-exit / real `graphql()` query); other 4 **generation-only**; static+API **Spring-centric** | Days 36 + 36-pass2 (PART 1r) + DC-2 **B3** |
| **7 project types × 5 stacks** — twice-identical baselines; domain reused unchanged | Generation-deterministic (all 5); runtime per the levels above | PART 1a/1b + 1q/1r + DC-2 **B3** |
| **CI/CD generation** — deterministic, version-matched, pinned; no matrix/floating/timestamp | **String-provable for all 5 stacks** (no toolchain); live green run **not verifiable** (no runner) | Day 38 (PART 1s) + DC-2 **B4** |
| **UI==CLI / the `assembleBlueprint` seam** — every Phase-3 input is an additive layer | Structural (byte-identical across the seam; MaxPhase3 composition) | PART 1i + DC-2 **B5** |
| **AI-free generation + detachable creative path** | Structural (ADR-001 sweep; Law 21) | DC-3 + DC-2 **B6** |
| **The frozen backstop reproduces** (Day-29-recertified) | 102 baked + 10 TeamTracker + non-hash, byte-identical | **DC-1** (163 OK / 0 FAIL) |

---

## 3. Honest boundaries carried forward (every one — §4)

- **Verification levels (the new project types):** **Express runtime/booted** (worker lifecycles;
  CLI run-to-exit; a real GraphQL query — Days 34/36); **FastAPI/Django/Go/Spring generation-only**
  (no Go/Java toolchain here; heavy Python; Docker down). The benchmark verifies the **generated
  output** (deterministic, twice-identical, domain-reuse, SDL) for all 5 stacks in-process.
- **CI/CD:** artifact determinism + version-match + pinned are **string-provable for all 5 stacks**;
  the pipeline running **green on a real GitHub runner is NOT verifiable here** (no runner / no push).
- **Figma:** the ingestion **core is CI-proven** (canned fixture, PART 1p); the **Figma-plugin edge
  is honest-manual** (runs inside Figma — not runnable here). Generated GraphQL custom scalars
  (`DateTime`/`Decimal`) may need per-runtime registration; the Spring CLI runs alongside the web
  server unless `spring.main.web-application-type=none` (both noted in the generated READMEs).
- **static+API is Spring-centric** (only Spring scaffolds a frontend); the frontendless stacks have
  no UI to render statically. **GitLab CI is a staged 2nd provider** (the `CiProfile` seam is
  provider-agnostic — a clean later add).
- **No live DB boot** (Docker daemon down); **no live AI call** (no developer key). The Day-29
  re-baseline state (MAXIMAL `366e19d9…`) stands.
- **Cross-OS:** generation determinism is **OS-independent by construction** (LF-only; sorted walk;
  the digest forward-slashes `relPath`) and CI-enforced across ubuntu/windows/macos for *generation*;
  the macOS/Linux **desktop BUILD is deferred** (Windows-only) — **3-OS CI green is user-confirmed**
  for generation determinism, NOT for the desktop build.
- **Phase-1/2 carried boundaries (unchanged):** the packaged-path Rust `detect_toolchains` command is
  **PENDING** (dev-surface `/api/detect` certified); deferred ancillary infra pins. **Signing → Phase 4.**

---

## 4. Phase-3 → Month-3 (Phase-4) handoff

**Phase 4 = Export Hardening + Security + The Map + release** (Ecosystem §Phase-4): the exporter +
standalone-run proof (Law 21 — delete Thraksha, the project still builds/runs); a deterministic
Semgrep scan + an optional developer-keyed AI scan (ADVISORY, never the gate); **the Map** (impact
preview + flow map); a Fable-5 hardening pass over Thraksha's own code; **code signing**.

**The solid ground Phase 3 leaves:**
- **Deterministic generation across 7 project types × 5 stacks** — the breadth is done and frozen.
- **The `assembleBlueprint` seam** — every input (versions / style / integrations / description /
  slots / Figma tokens / CI/CD) is an **additive layer**, default = a literal bypass; a new capability
  never moves a frozen hash (proven 8× now).
- **THE FROZEN BACKSTOP AS THE MAP'S EXACTNESS BASIS** — the Map's impact-preview (Day 47) can be
  *truthful* precisely because generation is this deterministic: output is a pure function of the
  blueprint, so a blueprint diff → an exact output diff (no guessing).

---

## 5. Scope & cleanup

- **Certification only** — no new features/stacks/types/providers; no signing; **no frozen hash
  moved**; Days 31–38 not re-done (verified + certified). The only new artifact is the composition-only
  benchmark **driver** ([phase3-benchmark.ts](../../generator/src/phase3-benchmark.ts) + the
  `bench:phase3` script) — it exercises existing surfaces and adds no generation code.

---

**Day 40 verdict, restated:** Phase 3 is a certified, coherent stack — not a pile of parts. A new
INPUT surface (Figma, quarantined so the Figma runtime never touches determinism — token JSON →
canonical `DesignTokens` → a deterministic `design-tokens.json`, round-trip byte-identical, ineligible
designs explicitly routed to slots), five new OUTPUT archetypes (cron-worker, queue-consumer, CLI,
GraphQL, static+API — entrypoint/route-table projections that reuse the domain layer byte-identically,
7 types total × 5 stacks), and a deterministic CI/CD artifact (GitHub Actions, version-matched to the
Day-11 pin, pinned, no matrix/floating/timestamp) — every default/empty path reproducing the frozen
backstop (102 baked + 10 TeamTracker + non-hash, 163 OK / 0 FAIL, MAXIMAL `366e19d9…`), byte-identical
from clean. Proven end-to-end by a composition-only benchmark (24/24): the Figma round-trip is
byte-identical; each of the 7 types is twice-identical with its domain reused unchanged vs the twin;
CI/CD is version-matched + pinned with the default a literal bypass; a MaxPhase3 project (GraphQL +
Figma + CI/CD + snake_case) composes deterministically through the one `assembleBlueprint` seam with
UI==CLI; and generation is AI-free (buildFileSet never touches `fill/`, the Day-18 AI hook is inert
gated strings). It moves no frozen hash and adds no generation feature; the generator is pure-Node
(`deps {}`, 0 native), and every gated GraphQL/broker/scheduler/CI library is generated-project-only.
Boundaries are precise — Express booted, the other 4 stacks generation-only; CI string-deterministic
but the live green run unverifiable here; the Figma edge honest-manual; static+API Spring-centric;
GitLab CI staged; no live DB/AI; cross-OS generation determinism CI-enforced but the macOS/Linux
desktop build deferred; the Phase-1/2 carried boundaries stand; signing is Phase 4.
**Phase 3 certified. Month 2 complete. Month 3 — Phase 4 (export hardening + security + the Map +
signing) — begins.**
