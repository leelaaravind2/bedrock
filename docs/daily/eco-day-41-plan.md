# Eco-Day 41 — PLAN: the exporter + standalone-run proof (Law 21) `[3 days]`

**Phase 4, Day 41 — the FIRST Phase-4 / Month-3 day. PLANNING ONLY.** This session writes this
plan and nothing else — no implementation, no builds, no file changes except this plan. Day 41
makes **export first-class** and proves **Law 21 end-to-end**: the exported project **builds and
runs with Thraksha DELETED**. A clean one-action export (the complete project, **no functional
Thraksha references, no dangling dependencies**) + a **version-pinned Dockerfile** (base image = the
blueprint's Day-11 runtime pin) so the container-build path needs only a container runtime.
**`[3 days]` — do NOT compress; stage honestly.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md)
(§1.4 **Law 21** — delete Thraksha, the exported project still builds/runs, every export provable
this way; §1.1 no baseline moves silently; §3 STOP-and-report; §4 honesty — *don't claim a
standalone boot that didn't run*) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md)
§Phase-4 (export hardening + the Law-21 benchmark) → [`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md)
Day 41 + the Phase-4 arc *(note: the month file labels this `[2 days]`; the current directive is
`[3 days]` — plan for [3 days], staged)* → [`eco-day-40-report.md`](eco-day-40-report.md) (Phase 3
certified; the gate — 102 baked + 10 TeamTracker + non-hash 1c–1s; 7 project types × 5 stacks; the
`assembleBlueprint`/`buildFileSet` seam) → the REAL code: `core/regen.ts` (`buildFileSet` → the file
set; `applyPlan` → writes the tree), `src/generate.ts` (the existing write-to-a-directory CLI + the
preview gate), the per-stack `Dockerfile` + `docker-compose.yml` (the container-build path).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read live from the REAL code):**
> - **The write path already exists.** `src/generate.ts` writes `buildFileSet(model)` output to a
>   directory via `applyPlan` (with a dry-run preview + explicit-consent gate). Export is a
>   **PROJECTION of the SAME deterministic output** — write the identical `buildFileSet` file set to
>   a clean directory. It is **NOT a re-generation** and **NOT a generation change**.
> - **The container-build path already exists AND is already version-pinned + Law-21-declared.**
>   Every stack ships a `Dockerfile` whose base image is the **Day-11 pin token**
>   (`FROM node:__NODE_VERSION__-alpine`, `golang:__GO_VERSION__`, `python:__PYTHON_VERSION__`,
>   `eclipse-temurin:__JAVA_VERSION__`) and a `docker-compose.yml` that literally states *"Standard
>   Docker Compose project. It depends on nothing from Thraksha and runs unchanged after the
>   generator is deleted (Laws 19-21)."* **No new Dockerfile/compose is needed** — Day 41 adds a GATE
>   proving the base == the pin, not a new artifact.
> - **THE KEY FINDING — the standalone property is TRUE BY CONSTRUCTION.** Confirmed live: **0
>   Thraksha entries** in any generated dependency manifest (`package.json`/`go.mod`/`requirements.txt`/
>   `pom.xml`) and **0 `import`/`require`/`from` Thraksha** in any emitted source. The generated
>   projects have **zero FUNCTIONAL dependency on Thraksha.**
> - **…but Thraksha STRINGS do appear — all INERT provenance markers, NOT references.** Three inert
>   tiers: (i) **ownership comments** (`THRAKSHA-OWNED — regenerated on every run. Do not edit.` /
>   `<file>.js (Thraksha-owned). This file is safe to edit; regeneration will not touch it.`) — they
>   mark regenerated-vs-developer files; delete Thraksha and they're just text; (ii) **Law-21
>   declarations** (`depends on nothing from Thraksha … runs unchanged after the generator is
>   deleted`); (iii) the **`GENERATION-MANIFEST.txt`** provenance DOC. **None affects build/run.**
>   ⇒ **The "no Thraksha strings" gate MUST mean FUNCTIONAL references = 0, NOT comment-markers = 0**
>   (see §2.3 — this is the load-bearing honesty point).
> - **No fixture requires export** ⇒ export is a read-only projection over existing output; adding it
>   is a literal bypass by construction (the frozen backstop cannot move).

---

## 0. What Day 41 is — export as a drift-free projection, and the Law-21 proof

Export is **first-class** and **NOT a new generation feature**: it writes the SAME `buildFileSet`
output to a clean standalone directory (a projection — same bytes, no drift). The exported project
already has **0 functional Thraksha dependencies** and a **version-pinned Dockerfile + compose**, so
Law 21 holds by construction. Day 41's job is to make export a clean one-action seam and to **PROVE**
the three standalone properties (export byte-identity; 0 functional Thraksha refs; Dockerfile base ==
the Day-11 pin) with grep-provable gates — then verify the standalone RUN as far as this environment
honestly allows, deferring the live container boot (Docker daemon down).

---

## 1. THE LAW-21 + DETERMINISM SPINE

1. **THE EXPORT IS BYTE-IDENTICAL to the in-app generation.** The exported file set == `buildFileSet`
   output, byte-for-byte (export adds NO drift — it is a projection, not a re-generation). **Proof:**
   write to a temp dir via `applyPlan`, read the tree back, hash == the `buildFileSet` hash (and ==
   the recorded baseline); twice-identical.
2. **0 FUNCTIONAL THRAKSHA REFERENCES in the exported project.** No `import`/`require`/`from` of a
   Thraksha module; no Thraksha entry in any dependency manifest; no URL/host/network call to
   Thraksha; no runtime read from a Thraksha install. **Grep-provable → 0.** (The inert ownership/
   Law-21/manifest markers are legitimately-neutral — §2.3 — and must NOT be stripped.)
3. **THE LAW-21 STANDALONE-RUN PROOF (honest).** The exported project builds + runs with Thraksha
   deleted — via the container path (the version-pinned Dockerfile + compose). **Honest verification:
   the export byte-identity + 0-functional-refs + Dockerfile-pin + dependency-manifest-clean are
   PROVABLE HERE; the LIVE `docker compose up --build` + CRUD round-trip is Docker-daemon-dependent
   (DOWN here — no daemon, no Go/Java toolchain, no live DB) → honest-manual/deferred.** Be explicit
   which. Attempt the strongest partial proof that IS runnable (see §2.4), reason the rest.
4. **DEFAULT = LITERAL BYPASS.** Export reads existing output; it adds NOTHING to `buildFileSet`'s
   file set (any export-side artifact — a log, a chosen target dir — lives OUTSIDE the generated
   tree). So the frozen backstop (**102 baked + 10 TeamTracker + non-hash**) reproduces byte-identical.
   **A moved frozen hash = a FINDING, STOP** (export must not touch generation).

---

## 2. THE ARCHITECTURE — export = a projection over `buildFileSet`/`applyPlan`

### 2.1 Where export attaches (a thin seam, no generation change)
- **The one-action export = `applyPlan(exportDir, buildFileSet(model))` to a clean/empty directory.**
  `generate.ts` is the existing seam (write + preview + consent). Day 41 formalizes a first-class
  **`export`** entrypoint (a CLI `npm run export -- <dir>` and/or a desktop action) that writes the
  COMPLETE file set (Thraksha-owned + developer-owned, all as `create` into a fresh dir) — a
  standalone tree. Since the written content == `buildFileSet` output, **export byte-identity holds
  by construction.** The exporter is **pure-Node file writing (`fs`)** — **no packaging/zip/archive
  library as a Thraksha core dep** (`deps {}` stays). A zip/archive, if ever wanted, is optional and
  NOT a core dependency (a shell-side or post-export concern).

### 2.2 The container-build path (already present + pinned — a GATE, not a new artifact)
- The `Dockerfile` (base = the Day-11 `__*_VERSION__` pin) and `docker-compose.yml` (Law-21-declared)
  already ship per stack. Day 41 adds a **version-match gate**: the exported Dockerfile's base image
  contains `getVersions()[runtimeKey]` (the same property Day 38's CI proved) — so the container path
  is pinned to the blueprint. **No new Dockerfile/compose is generated** (adding one would be a
  generation change → move a hash).

### 2.3 The "no Thraksha strings" gate — FUNCTIONAL refs = 0 (the load-bearing resolution)
Define three tiers precisely; the gate targets **Tier 0 only**:
- **Tier 0 — FUNCTIONAL references (MUST be 0, the Law-21 gate):** any `import`/`require`/`from`/`use`/
  `include` of a Thraksha module; any dependency named `thraksha*` in `package.json`/`go.mod`/
  `requirements.txt`/`pom.xml`; any URL/host/network call to a Thraksha service; any runtime path
  reading from a Thraksha install. **Grep-provable → 0** (confirmed true by construction this session).
- **Tier 1 — INERT provenance MARKERS (legitimately-neutral, ALLOWED):** the `THRAKSHA-OWNED …` /
  `Thraksha-owned). This file is safe to edit …` ownership comments and the `depends on nothing from
  Thraksha … runs unchanged after the generator is deleted` Law-21 declarations. They are code
  COMMENTS — inert; delete Thraksha and the project builds/runs unchanged.
- **Tier 2 — the `GENERATION-MANIFEST.txt` provenance DOC (neutral):** a traceability record, not
  code, not a dependency. Export MAY optionally exclude it (an export-projection choice that omits a
  file from the WRITTEN set — it does NOT move a `buildFileSet` hash), but keeping it is Law-21-safe.
- **LOAD-BEARING WARNING (§4):** do **NOT** strip the Tier-1 ownership comments to chase a naive "0
  occurrences of the word Thraksha" — those comments are IN the deterministic output, so stripping
  them is a **GENERATION CHANGE that moves every frozen hash = a FINDING/violation**. The gate is
  **Tier-0 = 0**, with Tier-1/2 enumerated + classified as inert (a documented allowlist).

### 2.4 What is provable HERE vs deferred (honest, §4)
- **PROVABLE HERE (string/static properties — no toolchain, no daemon):** (a) export byte-identity
  (written tree == `buildFileSet` output, twice-identical); (b) 0 functional Thraksha refs (grep);
  (c) Dockerfile base == the Day-11 pin; (d) dependency manifests carry 0 Thraksha entries (static
  Law-21). Together these are a strong **static Law-21 proof**: the exported project *cannot* depend
  on Thraksha at build/run time.
- **PARTIAL RUN worth attempting honestly (Node available):** export an **Express** project, delete/
  ignore Thraksha, and prove the **require-graph resolves with Thraksha absent** (e.g. `npm install`
  succeeds + `node --check`/a require of `src/app.js` loads) — a partial standalone proof that the
  code stands on its own. **It still cannot fully boot CRUD** (needs a live Postgres — Docker down),
  so stop at the honest partial.
- **DEFERRED / honest-manual (this environment can't):** the LIVE `docker compose up --build` + the
  CRUD round-trip after uninstalling Thraksha (Docker daemon DOWN); native builds for Go/Java/Python
  (no toolchains); the 3-OS standalone run. State plainly — do NOT claim a boot that didn't run (§3).

### 2.5 The gates as a harness section (additive, non-hash)
- Add the export gates to `day20:regress` (a new **PART 1t**, non-hash) and/or a `bench:export`
  driver: export-byte-identity + 0-functional-Thraksha-refs + Dockerfile-pin + dependency-manifest-
  clean, across the 5 stacks. **Additive — it emits no generated artifact and moves no frozen hash.**

---

## 3. What the plan resolves (answered from the real code)
1. **Where export attaches:** `applyPlan(dir, buildFileSet(model))` — the existing `generate.ts` seam;
   a first-class `export` entrypoint writes the complete file set to a clean dir (a projection, no
   generation change) (§2.1).
2. **Is export just "write the output + a pinned Dockerfile"?** YES — the Dockerfile + compose already
   ship, version-pinned + Law-21-declared; export = write the same `buildFileSet` output; Day 41 adds
   GATES, not generation (§2.1/§2.2).
3. **What Thraksha strings leak + how to get the gate to 0:** 0 FUNCTIONAL refs (true by construction);
   the ownership/Law-21/manifest markers are inert (Tier 1/2) and must NOT be stripped — the gate is
   Tier-0 = 0 (§2.3).
4. **The version-pinned Dockerfile:** already exists (base = the Day-11 pin token); Day 41 adds the
   version-match gate (§2.2).
5. **Is docker compose generated?** YES — `docker-compose.yml` per stack, Law-21-declared (§2.2).
6. **What's verifiable here vs the live boot:** static Law-21 (byte-identity + 0-refs + pin +
   manifest-clean) + a partial Express require-graph proof are provable HERE; the live
   `docker compose up` + CRUD is honest-manual/deferred (daemon down) (§2.4).

---

## 4. STAGING (`[3 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than claim a standalone boot that
didn't run."**

- **DC-1 — the one-action export.** A first-class `export` entrypoint: `applyPlan(exportDir,
  buildFileSet(model))` writes the COMPLETE standalone tree to a clean directory (the projection of
  the existing deterministic output — no generation change). Pure-Node `fs`; no packaging library as
  a core dep.
- **DC-2 — EXPORT BYTE-IDENTITY.** The exported tree (read back from disk) == the in-app `buildFileSet`
  output, byte-for-byte; twice-identical; == the recorded baseline. Export adds no drift.
- **DC-3 — 0 FUNCTIONAL THRAKSHA REFS (grep-provable).** No `import`/`require`/`from` of Thraksha; 0
  Thraksha entries in every dependency manifest; no Thraksha URL/host. Enumerate the inert Tier-1/2
  markers as a documented allowlist. **Do NOT strip the ownership comments (that moves frozen hashes —
  a finding).**
- **DC-4 — Dockerfile-pin + manifest-clean.** The exported Dockerfile base image contains
  `getVersions()[runtimeKey]` (the Day-11 pin); the dependency manifests carry 0 Thraksha entries.
- **DC-5 — THE LAW-21 PROOF (honest).** The static Law-21 (DC-2+DC-3+DC-4) is proven for all 5 stacks;
  attempt the partial **Express require-graph-resolves-with-Thraksha-absent** proof if runnable; the
  **LIVE `docker compose up --build` + CRUD round-trip is honest-manual/deferred** (Docker daemon down,
  no toolchains, no live DB) — state which is proven vs deferred. Boot ≥ what's runnable; reason the rest.
- **DC-6 — DEFAULT = LITERAL BYPASS.** `rm -rf dist && npm run build && npm run day20:regress` → PASS,
  the full backstop byte-identical (102 baked + 10 + non-hash). Export reads existing output; the gates
  are additive (PART 1t, non-hash). **A moved hash = a finding, STOP.**
- **DC-7 — invariants.** Generator pure-Node (`deps {}`, 0 native — the exporter is `fs` file-writing,
  no packaging/zip lib as a core dep); the exported project standalone (0 functional Thraksha deps); no
  frozen hash moved.

**Execute scope guard (every stage):** only the exporter + the standalone-run proof. **NOT** the
security scan (Day 43); **NOT** the Map (Day 47). Export is a PROJECTION of the existing deterministic
output (**no generation change — a moved frozen hash = finding, STOP**). **No packaging/Docker library
as a Thraksha core dep** (`deps {}` stays). The exported project standalone (**0 functional Thraksha
refs — grep-provable**; the inert markers are NOT stripped). No signing (later Phase 4). No AI. Commit
to `main`. Don't compress the 3 days — the export + byte-identity + 0-refs + pin is the provable heart;
the live container boot is honest-manual/deferred.

---

## 5. REPORT — done-conditions

[`eco-day-41-report.md`](eco-day-41-report.md): the one-action export (`buildFileSet`/`applyPlan` → a
clean standalone tree + the already-pinned Dockerfile + compose); the **export-byte-identity proof**
(exported tree == in-app output, twice-identical); the **0-functional-Thraksha-refs proof** (grep → 0;
the inert Tier-1/2 markers enumerated + classified — and the note that stripping them would move
frozen hashes); the **Dockerfile-pin + manifest-clean proof**; **THE LAW-21 PROOF (honest — what's
statically proven here + any partial Express require-graph run vs the LIVE `docker compose up`
honest-manual/deferred, daemon down)**; the **default-bypass proof** (backstop byte-identical);
**invariants** (pure-Node `deps {}`; 0 functional Thraksha deps in the export). **Forward-flags:**
`[3 days]` scope status (export + byte-identity + 0-refs + Dockerfile-pin + manifest-clean done; the
LIVE standalone boot honest-manual/deferred); **Law 21 statically-proven vs live-run-deferred**; what
**Day 43** picks up (the deterministic Semgrep security scan — the free default).

---

## 6. Scope guard — OUT for Day 41
- Only the exporter + the standalone-run proof. **NOT** the security scan (Day 43); **NOT** the Map (Day 47).
- **Export is a PROJECTION of the existing deterministic output — no generation change** (a moved
  frozen hash = a FINDING, STOP). Do **NOT** strip the inert provenance comments (that moves hashes).
- **The exported project must be standalone — 0 FUNCTIONAL Thraksha references** (grep-provable; the
  inert markers are neutral, not references).
- **No packaging/Docker/zip library as a Thraksha core dep** (`deps {}` stays; the exporter is `fs`).
- **No signing** (later Phase 4). **No AI.** **`[3 days]`** — the live container boot is honest-manual/
  deferred (daemon down); prove the static Law-21 heart.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + the ecosystem Phase-4 + Month-3 Day 41 + the Day-40 cert + the real `buildFileSet`/
   `applyPlan`/`generate.ts` + the Dockerfiles/compose? — ✅ (this session).
2. Only Day-41's job (the exporter + Law-21 proof)? — yes; **not** the security scan, **not** the Map.
3. Which frozen baselines must NOT move? — **all** (102 baked + 10 TeamTracker + non-hash; MAXIMAL
   `366e19d9…`). Export reads existing output; the gates are additive/non-hash; `day20:regress`
   byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — yes: export emits no generated artifact; the gates read
   existing output.
6. Three killers checked? — export is a byte-for-byte projection (no clock/RNG/UUID; LF preserved —
   `fs.writeFile` writes the exact content; stable order). The exporter is `fs`, not a packaging lib.
7. A gate that can actually FAIL? — **DC-2** (export drift ≠ `buildFileSet`), **DC-3** (a functional
   Thraksha ref appears), **DC-4** (the Dockerfile base ≠ the pin / a Thraksha dep), **DC-6** (a moved
   frozen hash — export leaked into generation). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming a LIVE standalone boot that didn't run
   (Docker down — state honest-manual/deferred); (ii) stripping the inert provenance comments to chase
   "0 strings" and thereby moving frozen hashes (a finding — the gate is FUNCTIONAL refs = 0); (iii) a
   packaging/zip lib added to Thraksha `deps {}` (must stay empty — the exporter is `fs`); (iv) export
   drifting into a re-generation (it's a byte-for-byte projection); (v) drifting into the security scan
   / the Map — all guarded.

---

*Day 41 makes export first-class and proves Law 21 as far as this environment honestly allows. Export
is a drift-free PROJECTION of the existing deterministic output — `applyPlan(dir, buildFileSet(model))`
writes the complete standalone tree to a clean directory (no re-generation, no generation change), so
export byte-identity holds by construction. The exported project is standalone by construction — 0
Thraksha entries in any dependency manifest and 0 `import`/`require`/`from` Thraksha in any source
(confirmed live); the only Thraksha strings are INERT provenance markers (ownership comments, Law-21
declarations, the GENERATION-MANIFEST doc), so the "no Thraksha strings" gate means FUNCTIONAL
references = 0, NOT comment-markers = 0 — and stripping those comments to chase a naive zero would move
every frozen hash (a finding, explicitly forbidden). The container-build path already ships
version-pinned (the Dockerfile base = the Day-11 runtime pin) + Law-21-declared (docker-compose.yml),
so Day 41 adds a base-image-pin gate, not a new artifact. The static Law-21 proof — export
byte-identity + 0 functional refs + Dockerfile-pin + manifest-clean — is provable HERE for all 5
stacks; a partial Express require-graph-resolves-with-Thraksha-absent run is worth attempting; the LIVE
`docker compose up --build` + CRUD round-trip is honest-manual/deferred (Docker daemon down, no
Go/Java toolchain, no live DB). The default (no export) reproduces the frozen backstop byte-identical;
the gates are additive/non-hash (PART 1t); the exporter is pure-Node `fs` with no packaging library as
a core dep (`deps {}` stays, 0 native); no AI, no signing, no frozen hash moved. Day 43 picks up the
deterministic Semgrep security scan.*
