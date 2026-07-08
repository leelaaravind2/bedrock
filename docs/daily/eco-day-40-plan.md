# Eco-Day 40 — PLAN: PHASE-3 CLOSE / the benchmark (the certification day)

**Phase 3, Day 40. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 40 is the **Phase-3
CERTIFICATION day — the analogue of [Day 20](eco-day-20-report.md) (Phase-1 close) and
[Day 30](eco-day-30-report.md) (Phase-2 close)**. It is **NOT a new-feature day.** Everything
was built Days 31–38; Day 40 **VERIFIES + CERTIFIES** that the whole Phase-3 stack holds
together end-to-end, and writes the honest Phase-3 certification that hands off to Month 3.
**This also closes Month 2.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md)
(§1.1 no baseline moves silently; §3 STOP-and-report — *do not certify over a failed proof*;
§4 honesty — *certify only what's proven, carry every boundary forward*) →
[`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §5 Phase 3 (the exit
condition) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 40 (lines 89–92) + the
Month-2 exit state → [`eco-day-30-report.md`](eco-day-30-report.md) (the Phase-2 certification —
the EXACT template for this day's report) → the Phase-3 reports:
[`eco-day-31-report.md`](eco-day-31-report.md) (Figma ingestion),
[`eco-day-34-report.md`](eco-day-34-report.md) + [`-pass2`](eco-day-34-report-pass2.md)
(cron-worker + queue-consumer), [`eco-day-36-report.md`](eco-day-36-report.md) +
[`-pass2`](eco-day-36-report-pass2.md) (CLI + GraphQL + static+API),
[`eco-day-38-report.md`](eco-day-38-report.md) (CI/CD) → the REAL harness
(`src/day20-regression.ts`) to enumerate the CURRENT gate set live, and
[`src/phase2-benchmark.ts`](../../generator/src/phase2-benchmark.ts) (the composition-only
benchmark **driver** this day mirrors).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read live from the REAL harness + reports):**
> - **The current gate set (enumerate LIVE in execute):** `day20:regress` runs **PART 1a → 1s**
>   — 1a (20 web-app matrix), 1b (naming/formatting/architecture/composition/api-only/email/ai),
>   1c–1o (property re-derivations + the Phase-1/2 features), **1p (Figma ingestion, Day 31)**,
>   **1q + 1q-pass2 (workers, Day 34)**, **1r + 1r-pass2 (CLI/GraphQL/static+API, Day 36)**,
>   **1s (CI/CD, Day 38)**. Last clean count (Day-38 report): **102 baked digests + 10 TeamTracker
>   relationship hashes + non-hash gates, 163 OK / 0 FAIL.** Execute re-enumerates live (a change
>   to this count vs. no code change is itself a finding).
> - **The benchmark precedent is a COMPOSITION-ONLY driver** (`phase2-benchmark.ts`, run by
>   `bench:phase2`): it adds NO generation feature and touches NO template/plugin/model — it
>   composes existing surfaces and asserts the phase's exit condition; a divergence → exit 1
>   (never a certification). Day 40's `phase3-benchmark.ts` + `bench:phase3` is the same shape.
> - **The Phase-3 exit condition (Month-2 §Day-40 / Ecosystem §Phase-3):** (1) the same Figma
>   file round-trips byte-identical; (2) each new project type produces frozen baselines
>   (deterministic across stacks); (3) CI/CD artifacts are deterministic; (4) cross-OS byte-identical.
> - **The Phase-3 capabilities + their proof locations + honest levels** are already written in
>   the Day-31/34/36/38 reports (below); Day 40 CONSOLIDATES them, it does not re-prove them
>   feature-by-feature — it proves they hold together as ONE stack.
> - **No new features. No frozen hash moved.** The ONLY permissible new artifact is the
>   composition-only benchmark driver.

---

## 1. What Day 40 is — certification, not features

Day 40 proves the Phase-3 stack is **ONE working stack, not a pile of parts**, and certifies it
honestly. It does three things and nothing else: (1) reproduces the **full frozen backstop from
clean** (no hash moved); (2) runs a **composition-only end-to-end benchmark** proving the Phase-3
exit condition; (3) sweeps the **invariants + ADR-001**. Then it writes the **Phase-3
certification** (a capability table with a proof location + verification level for each
capability, every boundary carried forward, and the Month-3/Phase-4 handoff). **If any proof
fails, STOP and report — never certify over it (§3).**

---

## 2. THE PHASE-3 BENCHMARK — a composition-only driver (`phase3-benchmark.ts` + `bench:phase3`)

A COMPOSITION-ONLY verification driver (like `phase1-benchmark`/`phase2-benchmark`): it imports
existing surfaces (`assembleBlueprint`, `buildFileSet`, `ingestDesignTokens`/`figmaEligibility`,
`setCicd`, the 7 project types) and asserts the Phase-3 exit condition. It **adds no generation
code** and **touches no template/plugin/model**. A divergence is a **FINDING → exit 1**, never a
certification. The Phase-3 capabilities do NOT all compose into one project (a worker cannot ALSO
be a GraphQL API — the types are mutually exclusive), so the benchmark is a **suite** of exit
checks plus one **legal composition**:

- **B1 — Figma round-trip determinism (Day 31).** The SAME canned token JSON → `ingestDesignTokens`
  **twice** → byte-identical canonical `DesignTokens` (input order never leaks); a Web-App project
  carrying those tokens → **byte-identical shell twice** (the `design-tokens.json` artifact
  reproduces, `f9a8e7c9…`). Proves round-trip determinism end-to-end.
- **B2 — the eligibility gate (Day 31).** `figmaEligibility` — an **eligible** export (auto-layout +
  named variables) → tokens; an **ineligible** export → **`SlotDecl[]`** (routed to the Phase-2
  slots, explicit reason, never guessed / never screenshot-to-code).
- **B3 — the 7 project types reproduce their baselines (Days 15/34/36).** For a fixed model, each of
  **web-app, api-only, Cron Worker, Queue Consumer, CLI, GraphQL API, Static Site + API** → generated
  **twice-identical**; the **domain-reuse** property holds (worker/CLI/GraphQL domain files ==
  the api-only twin; static+API == the web-app twin) — the entrypoint/route-table-projection thesis.
  Across the stacks per the honest verification levels (§4).
- **B4 — CI/CD determinism (Day 38).** A `github-actions` workflow is deterministic (twice-identical),
  **version-matched** (the setup runtime == `getVersions()[runtimeKey]`, the Day-11 pin — proven for
  the default AND a non-default `setVersions`), **pinned** (all `@vN`, no `@latest`/floating), with
  **no timestamp/run-id/matrix**; the **default (no cicd) → no `.github/workflows/ci.yml`** (additive).
- **B5 — THE MAXPHASE3 COMPOSITION (the "one stack" proof).** ONE project that stacks the *compatible*
  Phase-3 layers: a **GraphQL API** project (a new type) **+ ingested Figma `designTokens` + `cicd:
  github-actions` + snake_case naming**, built BOTH the programmatic (CLI) way AND via
  `assembleBlueprint(choices)` → **UI==CLI byte-identical**, twice-identical, with the deterministic
  SDL + the `design-tokens.json` artifact + the version-matched workflow all present. Proves the
  Phase-3 layers compose deterministically through the ONE canonical `assembleBlueprint` seam.
- **B6 — AI-free + detachable (ADR-001 / Law 21).** Generation is `buildFileSet(model)` — it never
  invokes the Figma runtime or any AI/fill layer; the Figma tokens come from the PURE ingestion core;
  the creative slot path (ineligible → slots) stays inert placeholders. A structural assertion (no
  live call), plus the ADR-001 grep sweep in DC-3.

---

## 3. EXECUTE — done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than certify over a failed proof."**

- **DC-1 — Full backstop green from clean, REAL gate accounting.** `rm -rf dist && npm run build &&
  npm run day20:regress` → **PASS**, the FULL current gate set byte-identical — **enumerate live**
  (PART 1a → 1s; **102 baked digests + 10 TeamTracker + non-hash gates; 163 OK / 0 FAIL** at last
  count — confirm the real numbers this run). **No frozen hash moved** (MAXIMAL `366e19d9…`, the
  Day-29-certified state). A moved hash on a certification day = a FINDING, STOP.
- **DC-2 — THE END-TO-END BENCHMARK (load-bearing).** Add `phase3-benchmark.ts` (composition-only) +
  the `bench:phase3` npm script; `npm run bench:phase3` → all of B1–B6 green (a divergence → exit 1).
  This is the Phase-3 exit condition proven end-to-end.
- **DC-3 — Invariants + ADR-001 sweep.** Generator **pure-Node** (`deps {}`, 0 native modules);
  **AI-free** — Figma ingestion is AI-free and no AI is in the generation path (grep the generation
  path for provider/model calls → 0; AI lives only in the detachable `fill/` edge); **every gated
  library is generated-project-only** (GraphQL runtimes `graph-gophers`/`ariadne`/`spring-graphql`,
  the broker `amqplib`/`pika`, the scheduler libs, any CI tool/action) — **none in Thraksha `deps`**;
  no frozen hash moved.

---

## 4. THE PHASE-3 CERTIFICATION — the report design (`eco-day-40-report.md`)

Mirror the Day-30 report exactly: **verdict → benchmark result (DCs) → the capability table
(proof locations + levels) → honest boundaries carried forward → Phase-3→Phase-4 handoff → scope.**

### 4.1 The Phase-3 capability table (each capability at its proven level + proof location)

| Phase-3 capability | Proven level | Proof location |
|---|---|---|
| **Figma token ingestion** — round-trip determinism; eligible → tokens, ineligible → slots | **Core CI-proven** (canned fixture); **edge honest-manual** (Figma runtime) | Day 31 (PART 1p) + B1/B2 |
| **cron-worker + queue-consumer** — entrypoint/lifecycle projections reusing the domain layer | Express **booted** (setInterval tick / stubbed msg → ack/retry/dead-letter); other 4 stacks **generation-only** | Days 34 + 34-pass2 (PART 1q + 1q-pass2) + B3 |
| **CLI + GraphQL + static+API** — entrypoint/route-table projections; deterministic SDL | Express CLI/GraphQL **booted** (command run-to-exit / real `graphql()` query); other 4 **generation-only**; static+API **Spring-centric, generation-only** | Days 36 + 36-pass2 (PART 1r + 1r-pass2) + B3 |
| **7 project types × 5 stacks** — twice-identical baselines; domain reused unchanged | Generation-deterministic (all); runtime per the levels above | PART 1a/1b (web-app/api-only) + 1q/1r + B3 |
| **CI/CD generation** — deterministic, version-matched, pinned; no matrix/floating | **String-provable for all 5 stacks** (no toolchain); live green run **not verifiable** (no runner) | Day 38 (PART 1s) + B4 |
| **UI==CLI / the assembleBlueprint seam** — every Phase-3 input is an additive layer | Structural (byte-identical across the seam) | PART 1i + B5 |
| **The frozen backstop reproduces** (Day-29-recertified) | 102 baked + 10 TeamTracker + non-hash, byte-identical | **DC-1** (163 OK / 0 FAIL) |

### 4.2 Honest boundaries carried forward (every one — §4)
- **Verification levels (Phase-3 new project types):** **Express booted/runtime** (worker lifecycles,
  CLI run-to-exit, a real GraphQL query); **FastAPI/Django/Go/Spring generation-only** (no Go/Java
  toolchain here; heavy Python; Docker down) — the benchmark verifies the **generated output**
  (deterministic, twice-identical, domain-reuse, SDL) for all 5 stacks in-process.
- **CI/CD:** artifact determinism + version-match + pinned are **string-provable for all 5 stacks**;
  the pipeline running **green on a real GitHub runner is NOT verifiable here** (no runner / no push).
- **Figma:** the ingestion **core is CI-proven** (canned fixture, PART 1p); the **Figma-plugin edge is
  honest-manual** (runs inside Figma — not runnable here); custom SDL scalars (`DateTime`/`Decimal`)
  may need per-runtime registration; the Spring CLI runs alongside the web server unless
  `web-application-type=none` (both noted in the generated READMEs).
- **static+API is Spring-centric** (only Spring scaffolds a frontend); the frontendless stacks have no
  UI to render statically. **GitLab CI is a staged 2nd provider** (the `CiProfile` seam is provider-agnostic).
- **No live DB boot** (Docker daemon down); **no live AI call** (no developer key); the Day-29
  re-baseline state (MAXIMAL `366e19d9…`) stands.
- **Cross-OS:** generation determinism is **OS-independent by construction** (LF-only, sorted walk,
  the digest forward-slashes `relPath` — OS-independent) and CI-enforced across ubuntu/windows/macos;
  **carried honestly as the Phase-1 boundary** — 3-OS CI green for *generation determinism* is
  user-confirmed; the macOS/Linux *desktop build* is NOT (Windows-only).
- **Phase-1/2 carried boundaries (unchanged):** the packaged-path Rust `detect_toolchains` command is
  **PENDING** (dev-surface `/api/detect` certified); the **macOS/Linux desktop BUILD is deferred**;
  deferred ancillary infra pins. **Signing → Phase 4.**

### 4.3 Phase-3 → Month-3 (Phase-4) handoff
- **Phase 4 = Export Hardening + Security + The Map + release** (Ecosystem §Phase-4): the exporter +
  standalone-run proof (Law 21 — delete Thraksha, the project still builds/runs); a deterministic
  Semgrep scan + an optional developer-keyed AI scan (ADVISORY, never the gate); **the Map** (impact
  preview + flow map); a Fable-5 hardening pass over Thraksha's own code; **code signing**.
- **The solid ground Phase 3 leaves:** deterministic generation across **7 project types × 5 stacks**;
  the **`assembleBlueprint` seam** (every input — versions/style/integrations/description/slots/Figma
  tokens/CI/CD — is an additive layer, default = literal bypass); the **additive-input discipline**
  (a new capability never moves a frozen hash); the **frozen backstop as the Map's exactness basis**
  (the impact preview can be exact because generation is a pure function of the blueprint).

### 4.4 The verdict
**Phase 3 certified** — Figma token ingestion (deterministic round-trip; ineligible → slots, never
guessed; core CI-proven, edge honest-manual) + **7 project types across 5 stacks** (entrypoint/
lifecycle/route-table projections reusing the domain layer, Express booted / the rest generation-only)
+ **deterministic CI/CD** (version-matched, pinned, no matrix/floating) — all with **default/empty
paths reproducing the frozen backstop** (102 baked + 10 TeamTracker + non-hash, byte-identical from
clean), **AI-free generation** (ADR-001), **pure-Node `deps {}`**. **Month 2 complete; Month 3
(Phase 4) begins.**

---

## 5. Scope guard — OUT for Day 40
- **NO new features / stacks / project types / CI providers.** **NO signing** (Phase 4).
- **NO frozen hash moved** — certification only; a move = a FINDING, STOP (never a re-baseline).
- **Do NOT re-do Days 31–38** — VERIFY + CERTIFY. The **ONLY** permissible new artifact is the
  composition-only benchmark **driver** (`phase3-benchmark.ts` + the `bench:phase3` script) — it
  exercises existing surfaces and adds no generation code.
- **Certify only what's proven** — carry every boundary forward with its proof location; never
  overclaim (Express booted ≠ the other stacks; string-deterministic CI ≠ a green CI run; core
  CI-proven ≠ the Figma edge).

---

## 6. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + the ecosystem plan Phase-3 exit + Month-2 Day 40 + the Day-30 cert precedent +
   the Phase-3 reports + the live harness + the `phase2-benchmark` driver? — ✅ (this session).
2. Only Day-40's job (certification + the benchmark driver)? — yes; **not** a new feature; **not** Phase 4.
3. Which frozen baselines must NOT move? — **all** (102 baked + 10 TeamTracker + non-hash; MAXIMAL
   `366e19d9…`). Day 40 is verification; a moved hash with no code change is itself the finding.
4. New AI touchpoints? — **none** (the benchmark is composition-only; ADR-001 swept in DC-3).
5. Default/empty path a literal bypass? — the benchmark's own default paths must be byte-identical
   (Figma-absent, cicd-'none', web-app) or it's a finding.
6. Three killers checked? — the benchmark is read-only over existing deterministic surfaces (no new
   clock/RNG/UUID; LF; stable order) — it asserts determinism, it doesn't add output.
7. A gate that can actually FAIL? — **DC-1** (a moved frozen hash / a changed live count), **DC-2**
   (any of B1–B6 diverging → exit 1), **DC-3** (a gated lib in Thraksha `deps` / an AI ref in the
   generation path / a native module). Report honestly if any fails — do NOT certify over it.
8. Overclaim / scope drift? — the live risks: (i) certifying over a failed benchmark check (STOP
   instead); (ii) overclaiming a verification level (Express booted vs. generation-only vs.
   string-provable CI vs. Figma-edge honest-manual — keep them distinct); (iii) dropping a carried
   boundary (carry every one with a proof location); (iv) adding a generation feature under the guise
   of the benchmark (composition-only — no template/plugin/model touched); (v) drifting into Phase 4
   (signing / export / the Map) — all guarded.

---

*Day 40 is the Phase-3 CLOSE — the certification day (the analogue of Day 20 / Day 30), not a
new-feature day. It reproduces the full frozen backstop from clean (102 baked + 10 TeamTracker +
non-hash gates PART 1a–1s, 163 OK / 0 FAIL, no hash moved, MAXIMAL `366e19d9…`), runs a
composition-only end-to-end benchmark (`phase3-benchmark.ts` + `bench:phase3`) proving the Phase-3
exit condition — the same Figma token JSON round-trips byte-identical + eligible→tokens/ineligible→slots
(Day 31); each of the 7 project types reproduces its twice-identical baseline with the domain reused
unchanged (Days 15/34/36); a CI/CD workflow is deterministic + version-matched + pinned with the
default a literal bypass (Day 38); and a MaxPhase3 composition (a GraphQL API project + Figma tokens +
CI/CD + snake_case) proves the layers compose deterministically through the one assembleBlueprint seam
with UI==CLI byte-identical and AI-free — and sweeps the invariants (pure-Node deps {}, ADR-001, every
gated GraphQL/broker/scheduler/CI library generated-project-only). It then writes the Phase-3
certification: each capability at its proven level with a proof location (Figma → Day 31; the 5 new
project types → Days 34/36; CI/CD → Day 38; the end-to-end benchmark → Day 40), every honest boundary
carried forward (Express booted / FastAPI·Django·Go·Spring generation-only; CI string-provable but the
live green run unverifiable here; Figma edge honest-manual; static+API Spring-centric; GitLab CI
staged; no live DB/AI; cross-OS generation determinism CI-enforced but the macOS/Linux desktop build
deferred; the Phase-1/2 carried boundaries; signing → Phase 4), and the Month-3 handoff (Phase 4 =
export hardening + security + the Map + signing, on the solid ground of deterministic generation across
7 types × 5 stacks + the additive-input assembleBlueprint seam + the frozen backstop as the Map's
exactness basis). The only permissible new artifact is the composition-only benchmark driver — no new
feature, no frozen hash moved. Verdict: Phase 3 certified; Month 2 complete; Month 3 (Phase 4) begins.*
