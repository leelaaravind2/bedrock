# Eco-Day 38 — REPORT: CI/CD pipeline generation

**Phase 3, Day 38. EXECUTE + REPORT (combined session).** CI/CD config is now a
**deterministic, hashed artifact**: a gated `cicd` field drives a core renderer that emits a
**GitHub Actions** workflow per stack with a **fixed shape**, **pinned action refs**, and a
**runtime version read from the SAME Day-11 blueprint pin** — so the pipeline runtime **==
the pin BY CONSTRUCTION**, with **no matrix, no floating tags, no timestamps**. The default
(no CI/CD) stays **byte-identical**.

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS,
163 OK / 0 FAIL, 102 digests** (97 from before + 5 new CI/CD baselines).

---

## 1. What shipped

### 1.1 The gated `cicd` field (mirrors `integrations`/`designTokens`)
- **`CiConfig = { provider: 'none' | 'github-actions' }`**, default `{ provider: 'none' }` — the
  literal bypass ([`core/cicd.ts`](../../generator/src/core/cicd.ts)). Threaded through
  `ProjectState` + `getCicd`/`setCicd` + `createProjectModel`/`restoreProjectModel` (back-compat
  default for pre-Day-38 snapshots) + `assembleBlueprint` (`cicd?` choice) — the exact additive
  discipline `versions`/`integrations`/`designTokens` follow.

### 1.2 The seam: core renders the YAML; the plugin supplies the stack facts (Law 25)
- **`BackendPlugin.ciProfile?(): CiProfile`** — NEUTRAL facts (no YAML): `runtimeKey`
  (`node`/`go`/`python`/`java`), `setupAction`, `versionInput`, `distribution?`, `buildCommands`,
  `testCommands`, `dockerfile`. Added to all 5 plugins.
- **`core/cicd.ts` → `renderGithubActions(profile, versions)`** owns the provider YAML SHAPE + a
  **FIXED pinned-action table** (a core constant), and reads `versions[profile.runtimeKey]` (the
  Day-11 pin) for the setup version. `buildFileSet` emits `.github/workflows/ci.yml` gated on the
  provider (the `design-tokens.json` seam; `'none'` ⇒ `renderCiWorkflow` returns null ⇒ nothing pushed).

### 1.3 The fixed pipeline shape (NO matrix)
`checkout@v4` → `setup-<runtime>@vN` (one pinned runtime from the pin) → **build** → **test** →
**docker build** (`-f <dockerfile> .`, no push) → **deploy** (a placeholder `echo`, **no secrets**).
Trigger: a fixed `on: [push, pull_request]`. Per-stack build/test (the CI projection of the Dockerfiles):

| Stack | setup (pinned) | runtime pin | build | test |
|---|---|---|---|---|
| **Express** | `actions/setup-node@v4` | `node-version: '22'` | `npm install` | `npm test --if-present` |
| **Go** | `actions/setup-go@v5` | `go-version: '1.22'` | `go build ./...` | `go test ./...` |
| **FastAPI** | `actions/setup-python@v5` | `python-version: '3.12'` | `pip install -r requirements.txt` | `python -m compileall app` |
| **Django** | `actions/setup-python@v5` | `python-version: '3.12'` | `pip install -r requirements.txt` | `python manage.py check` |
| **Spring** | `actions/setup-java@v4` (temurin) | `java-version: '21'` | `mvn -B -f backend/pom.xml -DskipTests package` | `mvn -B -f backend/pom.xml test` |

**Honesty (§4):** the generated projects don't ship full test suites, so the test step is a
deterministic **validation/smoke** where none exists (`--if-present`, `compileall`, `manage.py
check`, `go test` passing vacuously) — a richer test scaffold is a later concern, not Day 38.

---

## 2. The determinism proofs

### DC-2 — DEFAULT = LITERAL BYPASS (load-bearing)
`rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full frozen backstop
byte-identical (**97 baked + non-hash gates 1c–1r**). No fixture declares `cicd`; the field
defaults to `'none'`; the **UI==CLI structural state gate (PART 1i) stays green at `a437a302…`**
(the `cicd:{provider:'none'}` key is byte-neutral in the assembled-state comparison — both sides
carry it identically). A moved hash would have been a finding; none moved.

### DC-3 — new twice-identical baselines (PART 1s, additive) — 5 new
Recorded in [`day20-regression.ts`](../../generator/src/day20-regression.ts):

| Stack (DemoApp, PG, `github-actions`) | baseline (twice-identical) |
|---|---|
| **Express** | `1fd429163a1b74c9…` |
| **Go** | `375f197d5b631c88…` |
| **FastAPI** | `d02f3c836fea2cd4…` |
| **Django** | `3633722d0e3eb845…` |
| **Spring Boot** | `d178c3aa65ada8f9…` |

### DC-4 — VERSION-MATCH + PINNED + NO-FLOATING (the new load-bearing gate)
Asserted per stack in PART 1s:
- **Version-match:** the setup version **== `getVersions()[runtimeKey]`** (the Day-11 pin) — e.g.
  Express `node-version: '22'`, Go `go-version: '1.22'`, Spring `java-version: '21'`. And it
  **tracks a NON-DEFAULT pin:** `setVersions({node:'20'})` ⇒ the workflow's `node-version: '20'`
  (the pipeline follows the pin, not a hardcoded value).
- **Pinned + no floating:** every `uses:` ref matches `@v\d+` (or a 40-char SHA); **no
  `@latest`/`@main`/`@master`**.
- **No timestamp / no matrix:** no `\d{4}-\d{2}-\d{2}` / `github.run_id` / `Date(`; no `matrix:`
  key (one pinned runtime, not combinatorial). *(The emitted comment was reworded so a naive grep
  doesn't false-positive on the words "matrix"/"timestamp".)*

### DC-5 — honest verification level
The artifact's **determinism + version-match + pinned** are **STRING-provable for all 5 stacks
with no toolchain** (the workflow is YAML — byte-identity and version-match are string properties;
unlike Day 34/36, no Go/Java/Python was needed to prove the core property). The **only
non-verifiable part is the pipeline actually running green on a real GitHub runner** (no CI runner
/ no push from this shell) — generation-only for the live run. There is no "boot" for CI without a
runner; stated plainly.

---

## 3. Invariants (all confirmed)

- **Generator pure-Node, `deps {}`, 0 native modules** — verified: `dependencies: {}`; **no
  `js-yaml`/`yaml`/`@actions/*`** — `core/cicd.ts` is pure-Node string emission importing only a
  type from `versions.js`. No CI/YAML library is a Thraksha dependency (the actions are
  referenced-by-name in the generated YAML, run by GitHub's runner — Thraksha never invokes them).
- **No frozen hash moved** — the default is a literal bypass (the render branch fires only when
  `cicd.provider !== 'none'`); the `cicd` field is state/UI==CLI byte-neutral (DC-2).
- **The workflow is deterministic** — no timestamps/run-ids, no floating tags, stable step order
  (a fixed sequence; the pinned-action table is a constant, not map-iteration), LF (DC-4).
- **New baselines additive** — 102 digests = 97 + 5; nothing replaced.

---

## 4. Forward-flags

- **Scope status:** **GitHub Actions × all 5 stacks — done + fully proven** (deterministic +
  version-matched + pinned). **GitLab CI (a 2nd provider) — honestly STAGED** to a future pass: the
  `CiProfile` seam is provider-agnostic, so `.gitlab-ci.yml` is a clean later add from the same facts.
- **Determinism ≠ a passing CI:** the config is deterministic and version-matched; whether a
  pipeline goes *green* depends on the project's tests + a real runner (not verifiable here).
- **Day 40 picks up:** the **Phase-3 close / benchmark** — the same Figma file round-trips
  byte-identical; each new project type + CI/CD artifact reproduces its frozen baseline; the
  consolidated `day20:regress` green across a much larger matrix; **cross-OS byte-identity**.
- **Invariant to carry:** any CI tool/action stays referenced-by-name in the generated YAML —
  never a Thraksha core dependency (`deps {}` stays); versions pinned from the blueprint, never floating.

---

*Day 38 makes CI/CD config a deterministic, hashed artifact: a gated `cicd` field (default `'none'`
= literal bypass, mirroring `integrations`/`designTokens`) drives a core renderer (`core/cicd.ts`)
that emits `.github/workflows/ci.yml` from a neutral per-stack `BackendPlugin.ciProfile()` (setup
action + build/test commands + dockerfile) and a fixed pinned-action table, reading the runtime
version from the SAME Day-11 blueprint pin (`getVersions()[runtimeKey]`). The shape is fixed —
checkout → setup (one pinned runtime) → build → test → docker build (no push) → deploy (placeholder,
no secrets) — with NO matrix and NO baked secrets. The default (no CI/CD) reproduces the frozen
backstop byte-identical (97 baked + non-hash), by construction; a declared provider yields new
twice-identical additive baselines (PART 1s, 102 digests). The load-bearing new property is
version-match-and-pinned: the workflow's setup version equals the blueprint pin (default AND a
non-default `setVersions`), every action ref is pinned (`@v4`/`@v5`, never `@latest`/floating), and
there is no timestamp/run-id/matrix — proven as STRING properties for all 5 stacks with no
toolchain. Whether a pipeline runs green on a real GitHub runner is generation-only (no runner
here). No CI/YAML library is a Thraksha dependency — the core stays deps {} with 0 native modules;
no AI, no signing, no secrets, no frozen hash moved. GitLab CI is a staged 2nd provider; Day 40
picks up the Phase-3 close / benchmark.*
