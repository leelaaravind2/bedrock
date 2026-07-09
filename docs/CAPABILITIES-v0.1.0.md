<!-- SUPERSEDED SNAPSHOT — this is the dated Bedrock v0.1.0 capability record (the 60-day close:
     certified Eco-Day 58, documented Eco-Day 60). Preserved verbatim as a historical record.
     The CURRENT record is /CAPABILITIES.md (v0.2.0 — the end-user product, Eco-Day 70). -->

# Bedrock v0.1.0 — Capabilities  (SUPERSEDED — see /CAPABILITIES.md for v0.2.0)

**What Bedrock does, stated at its ACTUAL certified level.** This is the external-facing capability record
for the full **Bedrock** system (the 60-day ecosystem — the deterministic AI-free generator + the desktop
shell). It is honest by construction: **every capability cites where it was proven, at the level it was
proven**, and the complete boundary ledger (§3) sits in the same document — a strengths list is never read
without its limitations.

**Version:** 0.1.0 · **Status:** certified in-repo (Eco-Day 58), documented + release-ready (Eco-Day 60).
Ships as **Bedrock** — FREE via the Microsoft Store as an MSIX (Microsoft signs at certification),
**Windows-only**. The regression backstop is the consolidated harness (`cd generator && npm run
day20:regress`): **103 baked digests + 10 TeamTracker relationship hashes + non-hash gates (PART 1c–1x),
194 OK / 0 FAIL, MAXIMAL `366e19d9…`**, all frozen. See [`docs/daily/eco-day-58-report.md`](docs/daily/eco-day-58-report.md)
for the certification.

> **Scope note.** This record covers the **Bedrock v0.1.0 release**. The earlier
> [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md) is the **historical v0.1 21-day-core** record (Phases 0–1,
> dated 2026-07-02) — preserved as a dated record, superseded by this file for the full system.

---

## 1. Proof levels (read this first)

Claims are stated at one of these levels — **never collapsed upward:**

- **Generation-deterministic** — the output is produced deterministically and byte-identical to a recorded
  frozen baseline (and, where noted, UI==CLI). Proven, but not necessarily run.
- **Express-booted** — a generated project (or surface) was run live and its behaviour verified.
- **Generation-only** — deterministic output verified in-process, but **not booted** (no toolchain here:
  Go/Java absent, Python heavy, Docker daemon down).
- **Core-CI-proven / edge-honest-manual** — the pure core is CI-enforced with a fixture/FAKE; the impure
  edge (Figma runtime, a live AI/model call) is described but runs on the developer's own environment.
- **Deferred (Leela's-machine)** — the recipe is authored; the step runs on Leela's Windows/Store machine
  (not claimed done here).

---

## 2. Capabilities — each at its CERTIFIED level, with a proof location

*(Carried verbatim in spirit from the Eco-Day 58 certification table — nothing re-claimed beyond it.)*

| Capability | Certified level | Proof location |
|---|---|---|
| **Deterministic generation core** — 7 project types × 5 stacks (Spring/Express/FastAPI/Django/Go), byte-identical | Generation-deterministic (all 5); Express **booted**, 4 generation-only | Phases 1–3; PART 1a/1b/1q/1r; Day-58 DC-1/DC-3 |
| **The `assembleBlueprint` seam** — every input an additive layer, default = a literal bypass | Structural (UI==CLI byte-identical across the seam) | PART 1i; Day-58 DC-3 (phase3 B5) |
| **Figma token ingestion** — round-trip; eligible → tokens, ineligible → slots | Core CI-proven (fixture); **edge honest-manual** (Figma runtime) | Day 31 (PART 1p); DC-3 |
| **CI/CD generation** — deterministic, version-matched, pinned (GitHub Actions) | String-provable (5 stacks); live green run not verifiable (no runner) | Day 38 (PART 1s); DC-3 |
| **Creative slot fill (AI)** — detachable, developer-keyed, default-off | Pure core CI-proven (FAKE filler); **live AI deferred** (no key) | Day 23 (PART 1l); DC-4 |
| **Exporter / Law 21** — delete Thraksha, the project builds/runs | Static + require-graph standalone (Express, no `thraksha` in `node_modules`); **live Docker boot deferred** | Day 41 (PART 1t); DC-3 (`bench:export` 16/16) |
| **Deterministic security scan (Semgrep) — CERTAIN** | The gate (deterministic); **live run CI/Linux-only** (Semgrep absent on the Windows shell) | Day 43 (PART 1u); DC-3 |
| **AI-advisory scan — ADVISORY, detachable** | Pure core CI-proven (FAKE suggester); **live AI deferred**; **never the gate** | Day 45 (PART 1v); DC-4 |
| **The Map — impact preview** — previewed == real, byte-for-byte | CI-proven exact | Day 47 (PART 1w); DC-1 |
| **The Map — flow map** — declared-model projection + traceability anchor | CI-proven faithful + exact | Day 50 (PART 1x); DC-1 |
| **Desktop shell — 5 thin-invoker commands + `SidecarResult`** | Invoker-equivalence proven (spawn target == CLI byte-identical); **packaged GUI click-through deferred** | Days 52/53; DC-2/DC-4 |
| **Front-end UI + the Bedrock identity** | Thin client (`node --check` + static-preview guard/render); shell-only identity (the generator's inert "Thraksha" provenance untouched); **live GUI deferred** | Day 55; DC-4 |
| **Packaged-path determinism** — the shipped sidecar == the certified generator | The bundled node (v22.21.0) reproduces the 103 frozen digests byte-identical | Days 51/58; **DC-2** |
| **The full frozen backstop** (Day-29-recertified) | 103 baked + 10 TeamTracker + non-hash, byte-identical | Day-58 **DC-1** (194 OK / 0 FAIL) |

### The AI position (ADR-001 — the capability that looks like it violates the rule)
Generation is **AI-free**. The ONLY AI is: (a) the **detachable, developer-keyed, default-off ADVISORY
edges** — the creative slot fill (Day 23) and the AI-advisory security scan (Day 45); delete the key ⇒
everything still generates/exports/scans, and the deterministic Semgrep scan remains the gate; and (b) the
one-time **DEV-TIME Fable-5 hardening pass** (Day 53) — a code review, hand-applied, **nothing of it in the
product**. `buildFileSet` and the plugins never import the AI layer (0 generation-path refs); the only AI
strings in the core are the inert `ai='hook'` emitted constants the *generated app* runs ("the app calls
the model, Thraksha never does"). **No AI in generation; no AI ships.**

---

## 3. The complete boundary ledger (every one — carried from Eco-Day 58, none dropped)

- **Verification levels (the stacks):** **Express runtime/booted** (worker lifecycles, CLI run-to-exit, a
  real GraphQL query, CRUD, the export require-graph); **FastAPI/Django syntax-level**; **Go/Spring
  generation-only** (no Go/Java toolchain here). The benchmarks verify the **generated output**
  (deterministic, twice-identical, domain-reuse) for all 5 stacks in-process.
- **Security layers (live vs core):** the **deterministic Semgrep scan** is CI/Linux-verified — Semgrep's
  native core does **NOT** run on the Windows dev shell, so the live scan here **guides**; the CERTAIN gate
  is CI-enforced. The **AI-advisory scan + the creative fill** are **pure-core CI-proven with FAKE
  suggesters/fillers**; the **live AI calls are developer-keyed and DEFERRED** (no key in the shell).
- **Exporter / Law 21:** the **static + require-graph standalone** proof passes (Express, no `thraksha` in
  `node_modules`); the **live `docker compose up` boot is DEFERRED** (Docker daemon down — honest-manual).
- **Figma:** ingestion **core CI-proven** (canned fixture); the **Figma-plugin edge is honest-manual**
  (runs inside Figma). **static+API is Spring-centric**; **GitLab CI is a staged 2nd provider** (the
  `CiProfile` seam is provider-agnostic).
- **The packaged / Store path (Leela's Windows/Store machine — honest-manual, NOT claimed):** the
  **MakeAppx MSIX wrap** (Windows SDK not on this shell; manifest + recipe authored); the **packaged GUI
  launch + sidecar-under-MSIX** check (no GUI session — the front-end verified by inspection + a
  static-preview guard/render only; the live `invoke` round-trip deferred); the **Store submission**
  (Microsoft signs at certification — no cert/EV/notarization); the **"Bedrock" name reservation — NOT
  reserved** (very common word, likely conflict; variant prepared). The **store-backed `--model` picker is
  DEFERRED** (the raw textarea shipped). → the go-live runbook:
  [`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md).
- **Cross-OS:** generation determinism is **OS-independent by construction** (LF-only; sorted walk; the
  digest forward-slashes `relPath`) and **CI-enforced across ubuntu/windows/macos** (`determinism.yml`) for
  *generation*; the **desktop BUILD is Windows-only** (macOS/Linux Tauri build deferred). 3-OS CI green is
  user-confirmed for **generation**, NOT the desktop build.
- **Carried Phase-1/2/3 boundaries:** **no live DB boot** (Docker down); the **Day-29 re-baseline** (MAXIMAL
  `366e19d9…`) stands (documented old→new, isolated); the pre-ecosystem v0.1 21-day-core limitations remain
  in [`docs/CAPABILITIES.md`](docs/CAPABILITIES.md) §3 (MySQL-boot coverage, `has-many` schema, relationship
  scope, mixed-key FK serialization, etc.). `detect_toolchains` is a **shell-out to the certified probe**
  (Day-52 superseded the Phase-1 Rust-re-probe intent).

---

## 4. How to verify (the regression backstop)

```
cd generator && npm run build && npm run day20:regress
```

Re-confirms **103 baked digests + 10 TeamTracker relationship hashes + every non-hash check (PART 1c–1x)**,
byte-identical to their recorded values — **194 OK / 0 FAIL, MAXIMAL `366e19d9deda1caf`**. The
packaged-path proof (the bundled node reproducing those 103 digests byte-identical) is Eco-Day 58 DC-2.
Every capability above traces to a proof; this command re-proves the deterministic core on demand.
