# Eco-Day 41 — REPORT: the exporter + standalone-run proof (Law 21)

**Phase 4, Day 41 — the FIRST Phase-4 / Month-3 day.** Export is now first-class: a **drift-free
projection** of the existing deterministic output that writes a **standalone** project (0 functional
Thraksha references) with a **version-pinned Dockerfile** — so, with Thraksha deleted, the
container-build path (`docker compose up --build`) needs only a container runtime. The **static
Law-21 property is proven here** for all 5 stacks (+ a partial Express require-graph run); the **live
container boot is honest-manual/deferred** (Docker daemon down). The default reproduces the frozen
backstop byte-identical.

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS, 169 OK / 0 FAIL,
102 baked digests** (unchanged), **MAXIMAL `366e19d9…` unchanged — no frozen hash moved**.

---

## 1. What shipped

### 1.1 The one-action export — a drift-free projection (DC-1)
[`src/export.ts`](../../generator/src/export.ts) (`npm run export -- <dir>`) writes the COMPLETE
`buildFileSet(model)` file set to a clean directory via `applyPlan` — the SAME write engine the regen
CLI uses. It is **NOT a re-generation and NOT a generation change**: the exported tree is byte-for-byte
the in-app generation. Pure-Node `fs` — **no packaging/zip/archive library** is a Thraksha dependency.
Smoke: `node dist/export.js <dir> --backend Express` → a clean 24-file standalone tree (`Dockerfile` +
`docker-compose.yml` + `README.md` + `GENERATION-MANIFEST.txt` + `migrations/` + `package.json` + `src/`).

### 1.2 The container-build path already ships (pinned + Law-21-declared)
No new artifact was generated. Every stack already emits a `Dockerfile` whose base is the **Day-11 pin**
(`node:22-alpine`, `golang:1.22-alpine`, `python:3.12-slim`, `eclipse-temurin:21`) and a
`docker-compose.yml` that states *"depends on nothing from Thraksha … runs unchanged after the
generator is deleted."* Day 41 adds **gates** proving this, not a new file.

---

## 2. The proofs

### DC-2 — EXPORT BYTE-IDENTITY (E1, disk round-trip) ✅
`npm run bench:export` E1: export to a temp dir, read the tree back, hash == the in-app `buildFileSet`
hash, **twice-identical**, for all 5 stacks (`applyPlan` writes byte-for-byte — LF preserved, no drift):

| Stack | exported tree == buildFileSet |
|---|---|
| Express | `a437a302…` | Go | `d158529a…` | FastAPI | `dca2254f…` | Django | `68601cc5…` | Spring | `010098cd…` |

### DC-3 — 0 FUNCTIONAL THRAKSHA REFERENCES (load-bearing) ✅
Grep-provable, all 5 stacks (E2 + CI-enforced PART 1t): **0 Thraksha entries** in every dependency
manifest (`package.json`/`go.mod`/`requirements.txt`/`pom.xml`) and **0 functional `import`/`require`/
`from` of a Thraksha module** in emitted source. The exported project **cannot depend on Thraksha** at
build/run time.

**The "no strings" gate is FUNCTIONAL refs = 0, not comment-markers = 0.** Thraksha strings DO appear —
all **inert provenance markers**: (i) ownership comments (`THRAKSHA-OWNED — regenerated on every run.
Do not edit.` / `… safe to edit; regeneration will not touch it.`), (ii) Law-21 declarations (`depends
on nothing from Thraksha …`), (iii) the `GENERATION-MANIFEST.txt` doc. **None affects build/run, and
they are deliberately NOT stripped** — stripping them would rewrite the deterministic output and **move
every frozen hash** (a finding, explicitly guarded; PART 1t asserts the markers are present + allowed).

### DC-4 — DOCKERFILE BASE-IMAGE PIN + standalone compose ✅
E3/E4 + PART 1t, all 5 stacks: the toolchain `FROM` stage is pinned to `getVersions()[runtimeKey]` (the
Day-11 pin); **every** base carries a concrete version tag (multi-stage Go uses `alpine:3.20` for the
runtime stage — correctly pinned, not the Go version, since the compiled binary needs no Go); **no base
is floating (`:latest`)**. `docker-compose.yml` is standalone (Law-21-declared, no Thraksha).

### DC-5 — THE LAW-21 PROOF (honest — static here, live deferred) ✅
- **Static Law-21, proven HERE (all 5 stacks):** export byte-identity (DC-2) + 0 functional refs
  (DC-3) + dependency-manifest-clean + Dockerfile-pin (DC-4). Together: the exported project is a
  drift-free standalone tree that cannot reference Thraksha.
- **Partial LIVE, Express (E5):** exported an Express project, ran `npm install --omit=dev`, and
  `require('./src/app.js')` **loaded the full app require-graph (app → auth → db over express/pg/
  bcryptjs) with NO thraksha in `node_modules`** — the code stands on its own with Thraksha absent.
- **DEFERRED / honest-manual:** the FULL `docker compose up --build` + CRUD round-trip after
  uninstalling Thraksha is **Docker-daemon-dependent (DOWN here)** — plus no Go/Java toolchain and no
  live DB. Not run; stated plainly (no claimed boot that didn't run, §4).

`npm run bench:export` → **PASS (16/16)**.

### DC-6 — DEFAULT = LITERAL BYPASS ✅
`rm -rf dist && npm run build && npm run day20:regress` → **PASS, 169 OK / 0 FAIL**, **102 baked
digests (unchanged)**, MAXIMAL `366e19d9…` unchanged. Export reads existing output; the new gates
(**PART 1t, non-hash, additive**) emit no generated artifact. **No frozen hash moved.**

### DC-7 — invariants ✅
Generator **pure-Node** (`dependencies: {}`, **0 native**); the exporter is `fs` file-writing (imports
only `node:*` + relative) — **no packaging/zip/archive library** as a core dep. The exported project is
standalone (0 functional Thraksha deps).

---

## 3. Honest boundaries carried forward

- **The LIVE standalone boot is deferred** (`docker compose up --build` + CRUD): Docker daemon down, no
  Go/Java toolchain, no live DB. The **static Law-21 property + the Express require-graph run are
  proven**; the live container boot is honest-manual/deferred (not claimed).
- **Verification levels:** Express has a partial-live require-graph proof; the other 4 stacks are
  static-only here (no toolchain). The full 3-OS container boot is user-verifiable via the shipped
  pinned Dockerfile + compose.
- **Phase-1/2/3 carried boundaries stand** (cross-OS generation determinism CI-enforced but the
  desktop build deferred; packaged Rust detect pending; no live DB/AI; the Day-29 re-baseline state).
  **Signing → later Phase 4.**

---

## 4. Forward-flags

- **`[2-3 days]` scope status:** the exporter + export-byte-identity + 0-functional-refs +
  Dockerfile-pin + manifest-clean + a partial Express require-graph run — **done + proven**. The LIVE
  `docker compose up --build` + CRUD round-trip — **honest-manual/deferred** (daemon down).
- **Law 21 is statically proven here, live-run deferred** — the exported project provably cannot
  reference Thraksha and ships a pinned container path; the actual green boot is user/CI-verifiable.
- **Day 43 picks up:** the deterministic Semgrep security scan (the free default) — a deterministic,
  hashed findings artifact; the optional developer-keyed AI scan stays ADVISORY, never the gate.

---

*Day 41 makes export first-class and proves Law 21 as far as this environment honestly allows. Export
is a drift-free PROJECTION of the existing deterministic output — `src/export.ts` writes the complete
`buildFileSet` file set to a clean standalone directory via `applyPlan` (the same write engine as the
regen CLI; pure-Node `fs`, no packaging library, `deps {}`), so the exported tree is byte-for-byte the
in-app generation (E1: twice-identical, disk round-trip == buildFileSet, all 5 stacks) and no frozen
hash can move. The exported project is standalone by construction — 0 Thraksha entries in any
dependency manifest and 0 functional import/require of Thraksha in source (E2 + the CI-enforced PART
1t); the only Thraksha strings are inert provenance markers (ownership comments, Law-21 declarations,
the manifest doc) that never affect build/run and are deliberately NOT stripped — stripping them would
rewrite the deterministic output and move every frozen hash. The container-build path already ships
version-pinned (the Dockerfile toolchain base = the Day-11 runtime pin; every base a concrete tag, no
:latest) and Law-21-declared (docker-compose.yml), so Day 41 added a base-image-pin gate, not a new
artifact. The static Law-21 proof (byte-identity + 0 functional refs + manifest-clean + Dockerfile-pin)
holds here for all 5 stacks, and a partial live Express run shows the app require-graph loads with
Thraksha absent (npm install + require('./src/app.js'), 0 thraksha in node_modules); the FULL
`docker compose up --build` + CRUD round-trip is honest-manual/deferred (Docker daemon down, no
Go/Java toolchain, no live DB). The default reproduces the frozen backstop byte-identical (102 baked +
10 TeamTracker + non-hash, 169 OK / 0 FAIL, MAXIMAL 366e19d9); the export gates are additive/non-hash
(PART 1t) + an on-demand bench:export driver (16/16). Generator pure-Node deps {} with 0 native; no
AI, no signing, no frozen hash moved. Day 43 picks up the deterministic Semgrep security scan.*
