# Bedrock v0.2.0 — Capabilities

**What Bedrock does, stated at its ACTUAL certified level.** This is the external-facing capability
record for the full **Bedrock** system — the deterministic AI-free generator **+ the end-user product
built over it** (the guided wizard, persistent projects, the Map, Verify, and the standalone export). It
is honest by construction: **every capability cites where it was proven, at the level it was proven**,
and the complete boundary ledger (§4) sits in the same document — a strengths list is never read without
its limitations.

**Version:** 0.2.0 · **Status:** the end-user system certified in-repo (Eco-Day 69), released (Eco-Day
70) — the close of the 70-day build. Ships as **Bedrock** — FREE via the Microsoft Store as an MSIX
(Microsoft signs at certification), **Windows-only**. The regression backstop (`cd generator && npm run
day20:regress`): **103 baked digests + 10 TeamTracker relationship hashes + non-hash gates (PART
1c–1z), 203 OK / 0 FAIL, MAXIMAL `366e19d9…`**, all frozen. See
[`docs/daily/eco-day-69-report.md`](docs/daily/eco-day-69-report.md) for the end-user certification and
[`docs/daily/eco-day-58-report.md`](docs/daily/eco-day-58-report.md) for the carried engine
certification.

> **Scope note.** This record covers the **Bedrock v0.2.0 release** (the 70-day build: the engine +
> the end-user product). The prior full-system record is
> [`docs/CAPABILITIES-v0.1.0.md`](docs/CAPABILITIES-v0.1.0.md) (v0.1.0 — the 60-day engine + command
> harness, certified Eco-Day 58; preserved as a dated record, superseded by this file). The original
> 21-day-core record is [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md) (v0.1, dated 2026-07-02).
>
> **Artifact-label note (honest).** The fresh in-repo installers built Eco-Day 69 are labeled
> `Bedrock_0.1.0` — the version string in `tauri.conf.json`, untouched by this docs-only release. It is
> set to `0.2.0` at the Store **submission wrap** (a one-line manifest edit that changes no generation
> output — moves no frozen hash). The determinism certification is version-string-independent.

---

## 1. Proof levels (read this first)

Claims are stated at one of these levels — **never collapsed upward:**

- **Generation-deterministic** — the output is produced deterministically and byte-identical to a
  recorded frozen baseline (and, where noted, **UI==CLI** — the wizard's blueprint is byte-identical to
  the CLI's). Proven, but not necessarily run.
- **Express-booted** — a generated project (or surface) was run live and its behaviour verified.
- **Generation-only** — deterministic output verified in-process, but **not booted** (no toolchain here:
  Go/Java absent, Python heavy, Docker daemon down).
- **Core-CI-proven / edge-honest-manual** — the pure core is CI-enforced with a fixture/FAKE; the impure
  edge (Figma runtime, a live AI/model call, a live container boot) is described but runs on the
  developer's own environment.
- **Deferred (Leela's-machine)** — the recipe is authored; the step runs on Leela's Windows/Store
  machine (not claimed done here).

---

## 2. The ENGINE — carried from the Eco-Day 58 certification (nothing re-claimed beyond it)

| Capability | Certified level | Proof location |
|---|---|---|
| **Deterministic generation core** — 7 project types × 5 stacks (Spring/Express/FastAPI/Django/Go), byte-identical | Generation-deterministic (all 5); Express **booted**, 4 generation-only | Phases 1–3; PART 1a/1b/1q/1r; Eco-Day 69 DC-4 (benchmarks 75/75) |
| **The `assembleBlueprint` seam** — every input additive, default = a literal bypass | Structural (UI==CLI byte-identical across the seam) | PART 1i; Day-58 DC-3 |
| **Figma token ingestion** — round-trip; eligible → tokens, ineligible → slots | Core CI-proven (fixture); **edge honest-manual** (Figma runtime) | Day 31 (PART 1p) |
| **CI/CD generation** — deterministic, version-matched, pinned (GitHub Actions) | String-provable (5 stacks); live green run not verifiable (no runner) | Day 38 (PART 1s) |
| **Exporter / Law 21** — delete Bedrock, the project builds/runs | Static + require-graph standalone (Express); **live Docker boot deferred** | Day 41 (PART 1t); `bench:export` 16/16 |
| **Security, deterministic-first** — Semgrep **CERTAIN** gate + a detachable, developer-keyed AI **advisory** (never the gate) | Semgrep gate CI/Linux-verified; AI advisory pure-core CI-proven (FAKE); **live calls deferred** | Days 43/45 (PART 1u/1v) |
| **The flow map + impact map (engine)** — declared-model projection; previewed == real | CI-proven faithful + exact | Days 47/50 (PART 1w/1x) |

---

## 3. THE PRODUCT — new, Days 61–69 (each at its Eco-Day-69-certified level)

| Capability | Certified level | Proof location |
|---|---|---|
| **The guided WIZARD** — collected choices → the CLI `--model` byte-identical | Generation-deterministic, **UI==CLI** (incl. reproducing the certified **TeamTracker** across 5 stacks) | Days 61/62; PART 1d; Eco-Day 69 DC-4 |
| **The DATA MODEL** — entities / fields / relationships; the real 8-type field enum; Decimal precision/scale; **has-many EXPLICIT** (never inferred) | UI==CLI byte-identical (10 relationship hashes) | Day 62; PART 1d/1m/1n |
| **PERSISTENT PROJECTS** — the SQLite blueprint store (save / list / load) | **Lossless + non-mutating** round-trip: save→load byte-identical; a loaded blueprint generates identically | Day 63; `cargo test` (blueprint round-trip) |
| **THE MAP — drawn** (`renderFlowSvg`) — the architecture of your own blueprint, rendered | Deterministic (incl. **fresh-process**) + **faithful** (drawn nodes/edges one-to-one with `buildFlowMap`) | Day 65; **PART 1y** |
| **THE MAP — interactive impact** — see exactly what a change will touch, before it touches it | The impacted nodes are computed **by the ENGINE** from the emitters' own per-entity file attribution; **total/disjoint**; **faithful vs previewed==real**; empty bypass | Day 66; **PART 1z** (the shell only paints) |
| **THE MAP — the two-version DIFF** — compare two saved blueprints | Thin-client (the engine computes the delta; JS only paints); **no ghost nodes** for a deleted entity | Day 67 |
| **VERIFY** — Bedrock generates your project twice and compares every file | A **real double-generation** (M-vs-M ⇒ empty ⇒ byte-identical) proving **REPRODUCIBILITY** — explicitly **NOT** correctness or security | Day 68; PART 1z empty bypass |
| **The STANDALONE EXPORT** — a project you own outright | **No FUNCTIONAL dependency on Bedrock** — 0 dependency-manifest entries + 0 functional imports (static + require-graph); **inert provenance comments REMAIN**; the **live container boot is NOT run** | Day 68 / Day 41 (PART 1t) |

### The packaged path (the whole product runs the generator through this)
| Capability | Certified level | Proof location |
|---|---|---|
| **Packaged-path determinism** — the shipped sidecar == the certified generator | The bundled node (**v22.21.0**) reproduces the **103 frozen digests byte-identical**; sync-gen stamp `83ffd0ad…`/245 (payload growth, not a hash move) | Days 51/58/**69**; Eco-Day 69 **DC-2** |
| **The full frozen backstop** (Day-29-recertified) | 103 baked + 10 TeamTracker + non-hash 1c–1z, byte-identical; **MAXIMAL `366e19d9…` UNMOVED across all 70 days** | Eco-Day 69 **DC-1** (203 OK / 0 FAIL) |

### The AI position (ADR-001 — no AI in the product)
Generation is **AI-free**. The ONLY AI is: (a) the **detachable, developer-keyed, default-off ADVISORY
edges** — the creative slot fill (Day 23) and the AI-advisory security scan (Day 45); delete the key ⇒
everything still generates/exports/scans, and the deterministic Semgrep scan remains the gate; and (b)
the one-time **DEV-TIME Fable-5 hardening pass** (Days 53/68) — a code review, hand-applied, **nothing of
it in the product**. `buildFileSet` and the plugins never import the AI layer (0 generation-path refs);
the wizard/store/Map/Verify are all AI-free. **No AI in generation; no AI ships** (Eco-Day 69 DC-6
sweep clean).

---

## 4. The complete boundary ledger (every one — carried from Eco-Day 69, none dropped)

- **Verification levels (the stacks):** **Express runtime/booted**; **FastAPI/Django syntax-level**;
  **Go/Spring generation-only** (no Go/Java toolchain here). The benchmarks verify the generated output
  for all 5 stacks in-process.
- **VERIFY = reproducibility, NOT correctness/security** — it proves the same blueprint yields
  byte-identical code (a pure function of the blueprint), nothing more.
- **The Map's GRANULARITY BOUNDARY** — the impact highlight is **entity + app + relationship edges**
  only; there is **NO per-lifecycle-layer highlight** (uncertifiable without a heuristic; the
  attribution is the emitters' OWN per-entity file set, PART 1z total/disjoint).
- **Exporter / Law 21:** the **static + require-graph standalone** proof passes; the **live `docker
  compose up` boot is DEFERRED** (Docker daemon down — honest-manual). "No FUNCTIONAL dependency" —
  **not** "no trace of Bedrock" (inert provenance comments remain).
- **Security layers (live vs core):** the deterministic **Semgrep** scan is CI/Linux-verified — Semgrep's
  native core does **NOT** run on the Windows shell; the CERTAIN gate is CI-enforced. The **AI-advisory
  scan + creative fill** are pure-core CI-proven with FAKE suggesters; **live AI is developer-keyed and
  DEFERRED**.
- **Figma:** ingestion **core CI-proven** (fixture); the **Figma-plugin edge honest-manual**.
  **static+API is Spring-centric**; **GitLab CI is a staged 2nd provider**.
- **The packaged / Store path (Leela's Windows/Store machine — honest-manual, NOT claimed):** the **live
  packaged-GUI walkthrough** (the Eco-Day-69 Half-B checklist — **status: see §5 / RELEASE-NOTES**); the
  **MakeAppx MSIX wrap** (Windows SDK not on this shell; manifest + recipe authored); the **"Bedrock"
  name reservation — NOT reserved** (a common word; a variant prepared; the ~$19 registration); the
  **Store submission** (Microsoft signs at certification). → the go-live runbook:
  [`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md).
- **The store-backed project picker is DONE** (Day 63 — the SQLite save/list/load + the wizard's
  My-projects picker; it was listed "deferred" in the v0.1.0 record).
- **Cross-OS:** generation determinism is **OS-independent by construction** (LF-only; sorted walk; the
  digest forward-slashes `relPath`) and **CI-enforced across ubuntu/windows/macos** for *generation*;
  the **desktop BUILD is Windows-only** (macOS/Linux Tauri build deferred).
- **Carried Phase-1/2/3 boundaries:** **no live DB boot** (Docker down); the **Day-29 re-baseline**
  (MAXIMAL `366e19d9…`) stands; the pre-ecosystem v0.1 21-day-core limitations remain in
  [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md) §3; `detect_toolchains` is a shell-out to the certified
  probe.

---

## 5. The live packaged-GUI walkthrough (Eco-Day-69 Half B) — the remaining honest-manual verification

The 8-item packaged-GUI checklist (launch → wizard/generate → save/list/load → view diagram → preview
impact → compare versions → Verify → friendly errors) is delivered in
[`docs/daily/eco-day-69-report.md`](docs/daily/eco-day-69-report.md) §3. As of this release it is
**PENDING** — to be run on Leela's Windows machine before/alongside the Store submission (Store runbook
step 2). No live GUI run is claimed. See [`RELEASE-NOTES.md`](RELEASE-NOTES.md).

---

## 6. How to verify (the regression backstop)

```
cd generator && npm run build && npm run day20:regress
```

Re-confirms **103 baked digests + 10 TeamTracker relationship hashes + every non-hash check (PART
1c–1z)**, byte-identical to their recorded values — **203 OK / 0 FAIL, MAXIMAL `366e19d9deda1caf`**. The
packaged-path proof (the bundled node reproducing those 103 digests byte-identical) is Eco-Day 69 DC-2.
Every capability above traces to a proof; this command re-proves the deterministic core on demand.
