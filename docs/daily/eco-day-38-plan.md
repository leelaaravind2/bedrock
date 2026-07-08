# Eco-Day 38 — PLAN: CI/CD pipeline generation

**Phase 3, Day 38. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 38 makes **CI/CD config a
deterministic, hashed artifact**: per stack/provider (GitHub Actions first), a **fixed
setup→build→test→(docker)→deploy** workflow with **PINNED action versions** + a **PINNED
runtime version read from the SAME blueprint framework+version field (Day 11)**. **NO
`matrix`** over runtimes in the deterministic default (a matrix is combinatorial /
non-deterministic — one pinned runtime). CI/CD is an **additive artifact gated on an
option**; **absent (the default) ⇒ byte-identical** to today's output.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md)
(§1.1 no baseline moves silently; §2 the 3 determinism killers — **embedded timestamps and
floating/`@latest` tags are THE load-bearing risk here**; §3 STOP-and-report; §4 honesty) →
[`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 38 (lines 89–92) + Day 40 (the next day —
Phase-3 close, out of scope) → [`eco-day-36-report-pass2.md`](eco-day-36-report-pass2.md) (the
gate: **97 baked + 10 TeamTracker + non-hash 1c–1r**; 7 project types × 5 stacks done) → the
REAL code: `core/versions.ts` (`DEFAULT_VERSIONS` — the pinned runtime/framework versions per
stack + `versionTokens`; the source of truth for CI version pinning), `core/regen.ts` (the
`design-tokens.json` artifact seam at line ~130 — the additive-artifact precedent), each stack's
`Dockerfile` (the per-stack build/run facts the CI reuses), and `core/integrations.ts` (the
neutral-optional-field gating pattern the `cicd` field mirrors).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code):**
> - **The pinned versions live in `core/versions.ts`** (`DEFAULT_VERSIONS`): Spring Boot
>   `{java:'21',springBoot:'3.3.5',node:'22'}`, Express `{node:'22',express:'4.21.2'}`, FastAPI
>   `{python:'3.12',fastapi:'0.115.6'}`, Django `{python:'3.12',django:'5.1.4'}`, Go `{go:'1.22'}`.
>   `model.getVersions()` returns the CONCRETE pins (default or `setVersions`); `versionTokens`
>   ASSERTS concreteness (never resolve-at-generate). **The CI runtime version = `getVersions()[<runtimeKey>]`**
>   — `node`/`go`/`python`/`java` (the LANGUAGE runtime, not the framework).
> - **The additive-artifact seam is `buildFileSet` (`core/regen.ts`):** `design-tokens.json` is
>   pushed only when `hasTokens(model.getDesignTokens())` — otherwise nothing (a literal bypass).
>   CI/CD mirrors this: push `.github/workflows/ci.yml` only when `model.getCicd().provider !== 'none'`.
> - **The per-stack build facts are already in the Dockerfiles** (which consume the SAME
>   `__NODE_VERSION__`/`__GO_VERSION__`/`__PYTHON_VERSION__`/`__JAVA_VERSION__` tokens): Express
>   `npm install` → `node src/server.js`; Go `go build ./...`; FastAPI/Django `pip install -r
>   requirements.txt` (+ `manage.py migrate` for Django); Spring `mvn -B clean package`. The CI
>   build/test steps are the CI projection of these.
> - **The gating precedent is `Integrations`** (`core/integrations.ts`): a neutral model value,
>   default `'none'` = literal bypass, plugins/renderer decide the added files; round-trips via
>   `getState`/`restoreProjectModel` and `assembleBlueprint` exactly like `versions`/`designTokens`.
> - **No fixture declares CI/CD** ⇒ adding the artifact is a **literal bypass by construction**
>   (the branch fires only when `cicd.provider !== 'none'`; existing baselines untouched).
> - **The Law-25 seam:** the core owns neutral rendering (the GENERATION-MANIFEST, `design-tokens.json`);
>   a CI provider (GitHub Actions) is a **format**, not a technology — so the core can own the
>   provider YAML SHAPE while the plugin supplies the stack-specific commands (see §2.2).

---

## 0. What Day 38 is — CI/CD as a deterministic projection of the pinned versions

CI/CD config is a **definite structural mapping** (software builds it whole, not creative): the
blueprint's **pinned runtime version** + the **stack's fixed build/test shape** + a **fixed set
of pinned action versions** → one deterministic workflow YAML. The default (no CI/CD requested)
is a literal bypass; a declared provider yields new twice-identical baselines.

---

## 1. THE DETERMINISM SPINE

1. **The DEFAULT (no CI/CD requested) is a LITERAL BYPASS.** Adding the `cicd` field + the render
   branch does NOT change existing output (`cicd.provider` defaults to `'none'`; the branch fires
   only when a provider is declared; no fixture declares one). **Proof (execute):** `rm -rf dist &&
   npm run build && npm run day20:regress` → PASS, the full backstop byte-identical (**97 baked +
   10 TeamTracker + non-hash gates 1c–1r**). **A moved frozen hash = a FINDING, STOP.**
2. **CI/CD DECLARED → NEW twice-identical baselines (additive, PART 1s).** A `github-actions`
   fixture per stack → generated twice → byte-identical → recorded in a new **PART 1s**, never
   replacing a frozen hash. Each workflow deterministic.
3. **The pinned versions MATCH the blueprint (the new load-bearing property).** The setup step's
   runtime version **== `model.getVersions()[<runtimeKey>]`** (the Day-11 pin) — for the default
   pin AND a non-default pin (`setVersions({node:'20'})` ⇒ the workflow's `node-version: '20'`).
   **Action versions are PINNED** (`actions/checkout@v4`, `actions/setup-node@v4`, …) — **never
   `@latest`/`@main`/a floating tag** (floating ⇒ non-deterministic). **NO timestamp** in the YAML
   (an embedded `generated at <time>` is killer #1). **NO `matrix`** over runtimes (one pinned runtime).

---

## 2. THE ARCHITECTURE — a gated artifact from a neutral seam

### 2.1 The gating field (mirrors `Integrations`/`designTokens`)
- **A new neutral `cicd` field:** `CiConfig = { provider: 'none' | 'github-actions' }`, default
  `{ provider: 'none' }` — the literal bypass. Add `getCicd()`/`setCicd()` to the model, a `cicd?`
  choice to `BlueprintChoices` (`assembleBlueprint`), and the field to `ProjectState` with
  `getState`/`restoreProjectModel` round-trip — **exactly the additive discipline `versions`/
  `integrations`/`designTokens` followed** (default value ⇒ byte-identical assembled state; the
  UI==CLI structural gate PART 1i must stay green — the default `cicd` must not perturb it).
- **ADR-004 (shown, not silent):** when a provider is declared, a manifest line names it (gated —
  `[]` for `'none'`, so the manifest stays byte-identical by construction, like `activeIntegrationLines`).

### 2.2 The seam: core renders the provider YAML; the plugin supplies the stack facts (Law 25)
- **A new optional `BackendPlugin.ciProfile?(): CiProfile`** returning NEUTRAL facts (no YAML):
  ```
  CiProfile = {
    runtimeKey: 'node' | 'go' | 'python' | 'java',   // which getVersions() pin drives setup
    setupAction: 'actions/setup-node' | …,           // the setup action (version pinned by the core table)
    versionInput: 'node-version' | 'go-version' | …, // the setup input name
    distribution?: 'temurin',                        // setup-java only
    buildCommands: string[],                         // e.g. ['npm install']
    testCommands: string[],                          // e.g. ['npm test --if-present']
    dockerfile: 'Dockerfile' | 'backend/Dockerfile', // the docker-build context/file
  }
  ```
- **A new core renderer `core/cicd.ts` → `renderGithubActions(profile, versions, cicd)`** owns the
  provider YAML SHAPE + a **fixed PINNED-ACTION table** (a core constant), and reads
  `versions[profile.runtimeKey]` for the setup version (the version-match by construction). Emitted
  at **`.github/workflows/ci.yml`** by `buildFileSet` (the `design-tokens.json` seam), gated on
  `cicd.provider`. The core owns the neutral CI shape (a format, like the manifest); the plugin
  owns the stack commands (Law 25). *(Alternative considered: each plugin emits its own workflow —
  rejected: it duplicates the provider shape across 5 plugins and doubles for a 2nd provider.)*

### 2.3 The fixed pipeline shape (deterministic; NO matrix)
`.github/workflows/ci.yml` — a single `build` job, `runs-on: ubuntu-latest`, steps in a FIXED order:
1. `actions/checkout@v4`
2. `<profile.setupAction>@<pinned>` with `<versionInput>: '<pin from getVersions()>'` (+ `distribution: temurin` for Java) — **one** version, **no matrix**.
3. **build** — `profile.buildCommands` (per stack).
4. **test** — `profile.testCommands` (per stack).
5. **docker** — `docker build -f <profile.dockerfile> .` (build only; **no push** — a push needs a
   registry secret, out of the deterministic default).
6. **deploy** — a **placeholder** step (a commented no-op: "wire your deploy target here"). **No
   baked secrets, no signing** (scope guard).
- **Trigger:** a fixed `on: [push, pull_request]`. **No timestamp, no run-id, no floating tag.**

### 2.4 Per-stack CI profiles (from the real Dockerfiles + `DEFAULT_VERSIONS`)

| Stack | runtimeKey → setup | version input = pin | build | test (honest) | dockerfile |
|---|---|---|---|---|---|
| **Express** | `node` → `actions/setup-node@v4` | `node-version: '22'` | `npm install` | `npm test --if-present` | `Dockerfile` |
| **Go** | `go` → `actions/setup-go@v5` | `go-version: '1.22'` | `go build ./...` | `go test ./...` | `Dockerfile` |
| **FastAPI** | `python` → `actions/setup-python@v5` | `python-version: '3.12'` | `pip install -r requirements.txt` | `python -m compileall app` (smoke) | `Dockerfile` |
| **Django** | `python` → `actions/setup-python@v5` | `python-version: '3.12'` | `pip install -r requirements.txt` | `python manage.py check` | `Dockerfile` |
| **Spring** | `java` → `actions/setup-java@v4` (temurin) | `java-version: '21'` | `mvn -B -DskipTests package` | `mvn -B test` | `backend/Dockerfile` |

**Honesty note (§4):** the generated projects don't ship full test suites, so the test step is a
deterministic **validation/smoke** where none exists (`--if-present`, `compileall`, `manage.py
check`, `go test` passing vacuously) — the plan states this plainly; a richer test scaffold is a
later concern, not Day 38.

### 2.5 The pinned-action table + the runner (the floating-tag guard)
- **Pinned actions (a fixed core constant):** `actions/checkout@v4`, `actions/setup-node@v4`,
  `actions/setup-go@v5`, `actions/setup-java@v4`, `actions/setup-python@v5`. **Never `@latest`/`@main`.**
- **The runner:** `runs-on: ubuntu-latest` is a FIXED string ⇒ the ARTIFACT is byte-identical
  (deterministic generation). **Flag:** a pinned image (`ubuntu-24.04`) is stricter for the CI RUN's
  reproducibility; the plan recommends considering it, but the load-bearing determinism (the emitted
  file) holds either way. Major-version action pins (`@v4`) are the conventional pin; **SHA-pinning**
  is the stricter option — flag it, don't require it (both yield a byte-identical artifact).

### 2.6 The dependency question (the recurring finding)
- **Thraksha core stays `deps {}`** — the workflow is a pure-Node string projection. **No CI tool /
  action is a Thraksha dependency** (they are referenced-by-name in the generated YAML, run by
  GitHub's runner — Thraksha never invokes them; ADR-001-adjacent: Thraksha generates inert config
  the CI platform runs). No native module.

---

## 3. What the plan resolves (answered from the real code)

1. **Where the pins live + how CI reads them:** `DEFAULT_VERSIONS`/`getVersions()` (core/versions.ts);
   the renderer reads `versions[profile.runtimeKey]` → the setup step's version (version-match by
   construction, §2.2/§2.4).
2. **Provider(s) in scope:** **GitHub Actions** (Stage 1, all 5 stacks). **GitLab CI** = a 2nd
   provider, **staged** (§2.7 below / §4).
3. **The fixed pipeline shape + per-stack commands:** setup→build→test→docker→deploy, NO matrix;
   per-stack build/test from the Dockerfiles (§2.3/§2.4).
4. **How action versions are pinned:** a fixed core constant table (`@v4`/`@v5`), never floating (§2.5).
5. **Gated new artifact:** yes — the `cicd` field, default `'none'` = literal bypass (§2.1); emitted
   by `buildFileSet` like `design-tokens.json`.
6. **Which stacks × providers this pass:** GitHub Actions × **all 5 stacks** — provable
   DETERMINISTICALLY with **no toolchain** (the artifact is a string: byte-identity + version-match
   are string properties). Whether the pipeline RUNS green on GitHub is NOT verifiable here (no CI
   runner) — generation-only/reasoned (§4). GitLab CI staged.

### 2.7 Scope (honest — cleaner than Day 34/36)
- **In scope (fully provable this pass): GitHub Actions × all 5 stacks.** Unlike Day 34/36 (runtime
  needed a toolchain), CI/CD's core proofs — **byte-identical twice** + **version-match** + **no
  floating/timestamp** — are STRING properties, so all 5 stacks are provable without Go/Java/Python.
- **Not runtime-verifiable here:** the pipeline actually executing green on GitHub (no runner; no
  push from this shell) — honest generation-only, like a "boot" we can't do.
- **Staged: GitLab CI (a 2nd provider)** — the same neutral `CiProfile` re-rendered as
  `.gitlab-ci.yml`; add if cleanly done, else honestly stage to a pass 2 (Day-34/36 precedent).

---

## 4. STAGING + done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if
a proof fails."**

### Stage 1 — the `cicd` field + the seam + GitHub Actions × 5 stacks + the gates
- **DC-1:** the `cicd` field (`{provider:'none'|'github-actions'}`, default `'none'`) with
  model/assemble/state round-trip (additive, default byte-neutral); the `BackendPlugin.ciProfile?()`
  seam (per-stack facts) + `core/cicd.ts` `renderGithubActions` (the provider shape + the pinned-action
  table); `buildFileSet` emits `.github/workflows/ci.yml` gated on `cicd.provider`. NO CI tool as a
  Thraksha dep (`deps {}`).
- **DC-2 (DEFAULT = LITERAL BYPASS — load-bearing):** `rm -rf dist && npm run build && npm run
  day20:regress` → PASS, the full backstop byte-identical (97 baked + 10 + non-hash). The `cicd`
  field defaults to `'none'`; no fixture declares a provider; the assembled-state/UI==CLI gate stays
  green. **A moved hash = a finding, STOP.**
- **DC-3 (new baselines + twice-identical):** a `github-actions` fixture per stack → generated
  **twice-identical** → recorded in a new **PART 1s** (additive).
- **DC-4 (VERSION-MATCH + PINNED — the new load-bearing gate):** for each stack, assert the
  workflow's setup version **== `getVersions()[runtimeKey]`** (default AND a non-default pin, e.g.
  `setVersions({node:'20'})` ⇒ `node-version: '20'`); assert **every action ref is pinned** (regex:
  no `@latest`/`@main`/branch/floating — `@v\d+` or a SHA only); assert **no timestamp/date/run-id**
  in the YAML; assert **no `matrix:` key** (one pinned runtime).
- **DC-5 (honest verification level):** the ARTIFACT is deterministic + version-matched + pinned
  (proven, all 5 stacks). The pipeline actually **running green on GitHub is NOT verified here** (no
  CI runner) — generation-only/reasoned. State plainly (there is no "boot" for CI without a runner).

### Stage 2 (if in scope, else staged) — GitLab CI + invariants
- **DC-6:** a 2nd provider (GitLab CI `.gitlab-ci.yml`) from the SAME `CiProfile`, gated on
  `provider:'gitlab-ci'`, twice-identical + version-match + pinned. **HONESTLY STAGE** if too large
  this pass.
- **DC-7 (invariants):** generator **pure-Node** (`deps {}`, 0 native — no CI tool as a core dep);
  **no frozen hash moved** (default); the CI artifact **deterministic** (no timestamps, no floating
  tags, stable step order, LF); the new baselines additive (PART 1s).

**Execute scope guard (every stage):** only CI/CD generation. **NOT** Phase-3 close (Day 40). The
default (no CI/CD) byte-identical (**a move = finding, STOP**). **Pinned versions from the blueprint;
never floating/`@latest`.** **NO matrix over runtimes.** The artifact deterministic (no timestamps,
stable order). No AI. No signing. No baked secrets. Commit to `main`.

---

## 5. REPORT — done-conditions

[`eco-day-38-report.md`](eco-day-38-report.md) (+ `-pass2` if GitLab staged): the CI/CD artifact per
stack (the fixed setup→build→test→docker→deploy shape + the pinned action + runtime versions); the
**default-bypass proof** (no CI/CD ⇒ existing baselines byte-identical, by construction); the **new
twice-identical baselines** (PART 1s, additive; per stack/provider as scoped); the **version-match +
pinned proof** (the pipeline runtime == the blueprint pin, default AND a non-default; actions pinned,
never floating; no timestamp; no matrix); **invariants** (pure-Node `deps {}`; no frozen hash moved;
the artifact deterministic). **Verification levels (honest):** the artifact is deterministic +
version-matched (proven, all 5 stacks); the pipeline running green on GitHub is generation-only (no
runner here). **Forward-flags:** scope status (GitHub Actions × 5 done; GitLab CI done vs staged);
**determinism ≠ a passing CI** (deterministic config; whether it goes green depends on the project's
tests/runner); what **Day 40** picks up (Phase-3 close / the benchmark — the consolidated harness,
cross-OS byte-identity).

---

## 6. Scope guard — OUT for Day 38
- Only CI/CD pipeline generation. **NOT** Phase-3 close / the benchmark (Day 40).
- **The default (no CI/CD) MUST be byte-identical** — a moved hash = a FINDING, STOP (never a
  re-baseline). The `cicd` field defaults to `'none'` and must be state/UI==CLI byte-neutral.
- **Pinned versions from the blueprint framework+version field — never floating/`@latest`** (the
  load-bearing property; a floating tag or timestamp = non-deterministic).
- **NO `matrix` over runtimes** in the deterministic default (one pinned runtime).
- **The CI artifact deterministic** — no timestamps, no floating tags, stable ordering, LF.
- No AI. No signing. **No baked secrets** (deploy is a placeholder; env only).

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + Month-2 Day 38 + Day-36 pass-2 report + the real `versions.ts` pin field + the
   `design-tokens.json` artifact seam + the Dockerfiles + the `Integrations` gating pattern? — ✅ (this session).
2. Only Day-38's job (CI/CD generation)? — yes; **not** Phase-3 close (Day 40).
3. Which frozen baselines must NOT move? — **all** (97 baked + 10 TeamTracker + non-hash). The `cicd`
   field defaults to `'none'`; no fixture declares a provider; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — **yes, by construction**: the render branch fires only when
   `cicd.provider !== 'none'`.
6. Three killers checked? — **(1) NO timestamp/date/run-id in the YAML** (the leading risk here);
   **(2) LF only**; **(3) stable order** (steps/jobs in a fixed sequence; the pinned-action table is a
   fixed constant, not map-iteration). **Floating tags (`@latest`) are the CI-specific killer** — all
   action refs pinned. No CI tool as a core dep.
7. A gate that can actually FAIL? — **DC-2** (a declared-CI branch or the `cicd` field leaked into the
   default), **DC-3** (a workflow non-deterministic), **DC-4** (the setup version ≠ the blueprint pin /
   a floating tag / a timestamp / a matrix present), **DC-7** (a CI tool in Thraksha `deps` / a native
   module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) a moved default hash silently re-baselined (a
   finding, STOP); (ii) the `cicd` field perturbing the assembled-state / UI==CLI gate (must be
   byte-neutral for `'none'`); (iii) a floating `@latest`/timestamp making the artifact
   non-deterministic (the load-bearing gate); (iv) a `matrix` sneaking into the default; (v) claiming
   the CI PASSES when only the ARTIFACT is proven (deterministic config ≠ a green run — no runner
   here); (vi) drifting into Phase-3 close (Day 40) — all guarded.

---

*Day 38 makes CI/CD config a deterministic, hashed artifact: a gated `cicd` field (default `'none'` =
literal bypass, mirroring `integrations`/`designTokens`) drives a core renderer (`core/cicd.ts`) that
emits `.github/workflows/ci.yml` from a neutral per-stack `BackendPlugin.ciProfile()` (setup action +
build/test commands + dockerfile) and a fixed pinned-action table, reading the runtime version from
the SAME Day-11 blueprint pin (`getVersions()[runtimeKey]`). The shape is fixed —
setup→build→test→(docker build, no push)→deploy(placeholder) — with NO matrix over runtimes and NO
baked secrets. The default (no CI/CD) reproduces the frozen backstop byte-identical (97 baked +
non-hash), by construction; a declared provider yields new twice-identical additive baselines (PART
1s). The load-bearing new property is version-match-and-pinned: the workflow's setup version equals
the blueprint pin (default AND a non-default), every action ref is pinned (never `@latest`/floating),
and there is no timestamp/run-id/matrix (the CI-specific determinism killers). GitHub Actions × all 5
stacks are provable deterministically with no toolchain (byte-identity + version-match are string
properties); GitLab CI is a staged 2nd provider; whether a pipeline runs green on GitHub is
generation-only (no runner here). Any CI tool/action is referenced-by-name in the generated YAML,
never a Thraksha core dependency (`deps {}` stays, 0 native); no AI, no signing, no frozen hash moved.
Day 40 picks up the Phase-3 close / benchmark.*
