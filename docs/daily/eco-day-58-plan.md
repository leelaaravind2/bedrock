# Eco-Day 58 — PLAN: THE FINAL FULL-SYSTEM REGRESSION (packaged) — the certification

**Phase 4, Day 58 — the release-stretch certification (Month-3, Days 51–60).** The Month-3 analogue of
[Day 20](eco-day-20-report.md) / [Day 30](eco-day-30-report.md) / [Day 40](eco-day-40-report.md): **no
new features — VERIFY + CERTIFY.** Everything was built Days 1–55; Day 58 proves the WHOLE system (the
deterministic generator + Phase-4 + the Bedrock desktop shell) holds together **as the shipped thing**,
**packaged**, and writes the honest final certification with a **proof location for every capability** and
**every boundary carried forward**.

**This session is PLAN ONLY. No code, no builds.** It designs the certification: the full backstop from
clean + the packaged-path re-certification + the composition benchmark + the complete honest boundary
ledger + the ship-ready-vs-Leela's-machine handoff.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. The REAL current gate set (enumerated LIVE this session — the certification target)

`npm run build && npm run day20:regress` → **194 OK / 0 FAIL**. The live PART enumeration (1a → 1x):

| PART | Gate | Origin |
|---|---|---|
| 1a | 20 web-app matrix (default path — the blocking backstop) | Days 1–10 |
| 1b | naming(5) + formatting(2) + simple(4) + composition(2) + api-only(6) + email(2) + ai-hook(2) | Phase 1 |
| 1c | property cases re-derived | Phase 1 |
| 1d | UI==CLI relationship path (10 TeamTracker via `addEntity`) | Phase 1 |
| 1e | guards (style/description round-trip + naming helpers) | Phase 1 |
| 1f | LF-emission guard + **MAXIMAL composition baseline `366e19d9…`** | Eco-Day 1 |
| 1g | non-default version baselines | Day 11 |
| 1h | org-policy layer determinism | Day 13 |
| 1i | canonical `assembleBlueprint` — UI==CLI structural | Day 16 |
| 1j | toolchain detect-and-guide pure core | Day 18 |
| 1k | typed content slots | Day 21 |
| 1l | creative slot fill pure core (FAKE filler) | Day 23 |
| 1m | has-many reverse projection (5 stacks × 2 DBs) | Day 25 |
| 1n | decimal/money field type (5 stacks × 2 DBs) | Day 27 |
| 1o | field-key consistency (FK wire keys) — the **Day-29 re-baseline** | Day 29 |
| 1p | Figma token ingestion round-trip | Day 31 |
| 1q (+pass2) | worker archetypes — cron-worker + queue-consumer (Express booted; 4 gen-only) | Day 34 |
| 1r (+pass2) | CLI + GraphQL + static+API (Express booted; 4 gen-only) | Day 36 |
| 1s | CI/CD pipeline generation — GitHub Actions × 5 stacks | Day 38 |
| **1t** | **export standalone / Law-21 static property** | **Day 41** |
| **1u** | **deterministic security scan — Semgrep** | **Day 43** |
| **1v** | **AI-advisory scan — pure core over a FAKE suggester** | **Day 45** |
| **1w** | **the Map — impact preview, previewed==real byte-for-byte** | **Day 47** |
| **1x** | **the Map — flow map, declared-model projection + traceability anchor** | **Day 50** |

- **103 baked digests** (`digest-manifest`: "43 frozen + 1 MAXIMAL" + the additive baselines — version 5,
  slots 1, has-many 10, decimal 10, field-key 5, Figma 1, worker 10, CLI/GraphQL/static 11, CI/CD 5 …).
  *Execute enumerates the exact per-PART baked count live and reconciles the Day-40 total (102) → the
  Phase-4 total (103).*
- **+ 10 TeamTracker** relationship hashes (PART 1d).
- **+ non-hash gates** (1c/1e/1j/1k/1l/1p/1q/1r/1s/1t/1u/1v/1w/1x — property re-derivations, guards,
  detect, slots, fill, Figma eligibility, projections, Law-21 property, scan cores, the Map's
  previewed==real + traceability).
- **MAXIMAL `366e19d9…`** (the Day-29 certified state). **Day 58 is verification — no frozen hash moves.**

---

## 1. EXECUTE done-conditions

### DC-1 — THE FULL BACKSTOP GREEN FROM CLEAN (the determinism spine)
`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 194 OK / 0 FAIL**;
enumerate the **real per-PART accounting** (103 baked + 10 TeamTracker + non-hash, PART 1a→1x),
byte-identical; **MAXIMAL `366e19d9…`**. **No frozen hash moved.** A moved hash = **FINDING, STOP** (§3) —
certify nothing over a failed proof.

### DC-2 — THE PACKAGED-PATH RE-CERTIFICATION (load-bearing — Day-51 A2 re-run)
The shipped **sidecar** generates **identically** to the certified generator:
1. `cd desktop && npm run sync-gen:check` → **OK — `resources/gen` == the certified generator
   byte-for-byte** (stamp `c43773ae…`, 237 files).
2. The **bundled node sidecar** (`desktop/src-tauri/binaries/node-x86_64-pc-windows-msvc.exe`) run against
   `resources/gen/dist/day20-regression.js --emit-digests` → **103 DIGEST lines**, **diffed against the
   certified system-node emission → byte-identical (empty diff)**.

→ **The PACKAGED generator == the certified generator** — determinism survives into the bundle. This is
the load-bearing packaged proof (the whole product runs the generator through this sidecar).

### DC-3 — THE COMPOSITION BENCHMARK (the whole stack, each at its honest level)
**Re-run the EXISTING composition-only drivers** (they exercise existing surfaces — no generation change;
this is the minimal verify-and-certify path, and the scope-permitted artifact):
- `npm run bench:phase1` / `bench:phase2` / `bench:phase3` — the generation arc (7 project types × 5
  stacks, Figma round-trip, CI/CD, the `assembleBlueprint` seam, AI-free/detachable). *`bench:phase3` was
  Day-40's 24/24.*
- `npm run bench:phase4-mid` — the **Phase-4 stack composed** (export/Law-21 + Semgrep CERTAIN + AI
  ADVISORY/detachable + impact-map exact + flow-map traceability), Day-50's **6/6**.
- `npm run bench:export` — the export standalone (Law 21) benchmark.

Each reproduces its proof **at its honest level**. **The shell leg** (the 5 thin-invoker commands + the
Day-53 `SidecarResult` contract + the Day-55 front-end + Bedrock identity) is certified by the
**already-proven** invoker-equivalence (each command's spawn target == the generator CLI byte-identical,
Days 52/53) + the packaged-path DC-2 — **the shell invokes the certified generator; it does not
reimplement it.** *(Optional: a thin `bench:final` aggregator that runs the above in sequence + prints one
certification summary — permitted as composition-only, but re-running the existing suite is sufficient and
preferred.)*

**Honest split (state in the report):** runtime-verified (Express booted; the sidecar reproduces the
digests) vs generation-only (FastAPI/Django/Go/Spring — no toolchain) vs deferred (the packaged GUI
launch, the MakeAppx MSIX wrap, the live Semgrep/AI calls, the Store submission — Leela's machine).

### DC-4 — INVARIANTS + ADR-001 SWEEP
- **Generator pure-Node:** `dependencies: {}`, **0 native modules** (SQLite is shell-side only).
- **AI never in the product (ADR-001 sweep):** `buildFileSet`/the plugins never import `fill/` or the
  scan AI edge; the ONLY AI is (a) the **detachable, developer-keyed, default-off ADVISORY** edges (fill
  Day-23 / scan Day-45 — delete-the-key ⇒ everything still runs), and (b) the **one-time DEV-TIME Fable-5
  hardening pass** (Day 53 — a code review, hand-applied, **not in generation, not shipped**). **No AI in
  the generation path; no AI ships.**
- **The shell is a THIN INVOKER:** `commands.rs` spawns the sidecar + shapes `SidecarResult` — **no
  generation logic in Rust**; `main.js` invokes + renders `stdout` verbatim — **no generation logic in
  JS**. `capabilities/default.json` unchanged (app commands need no ACL).
- **Sidecar == certified** (DC-2); **no frozen hash moved** (DC-1).

---

## 2. THE FINAL CERTIFICATION TABLE (design — each capability + proven level + PROOF LOCATION)

| Capability | Proven level | Proof location |
|---|---|---|
| **Deterministic generation core** — 7 project types × 5 stacks, byte-identical | Generation-deterministic (all 5 stacks); Express **booted**, 4 gen-only | Phases 1–3; PART 1a/1b/1q/1r; DC-1/DC-3 |
| **The `assembleBlueprint` seam** — every input an additive layer, default = literal bypass | Structural (UI==CLI byte-identical across the seam) | PART 1i; DC-3 |
| **Figma token ingestion** — round-trip; eligible→tokens, ineligible→slots | Core CI-proven (fixture); **edge honest-manual** (Figma runtime) | Day 31 (PART 1p); DC-3 |
| **CI/CD generation** — deterministic, version-matched, pinned | String-provable (5 stacks); live green run not verifiable (no runner) | Day 38 (PART 1s); DC-3 |
| **Creative slot fill (AI)** — detachable, developer-keyed, default-off | Pure core CI-proven (FAKE filler); **live AI deferred** (no key) | Day 23 (PART 1l); DC-4 |
| **Exporter / Law 21** — delete Thraksha, the project builds/runs | Static property CI-proven; container-path standalone | Day 41 (PART 1t); DC-3 (`bench:export`) |
| **Deterministic security scan (Semgrep) — CERTAIN** | The gate (deterministic); **live run CI/Linux-only** (Semgrep absent on the Windows shell) | Day 43 (PART 1u); DC-3 |
| **AI-advisory scan — ADVISORY, detachable** | Pure core CI-proven (FAKE suggester); **live AI deferred** (no key); never the gate | Day 45 (PART 1v); DC-4 |
| **The Map — impact preview** — previewed == real, byte-for-byte | CI-proven exact (previewed==real) | Day 47 (PART 1w); DC-3 |
| **The Map — flow map** — declared-model projection + traceability anchor | CI-proven faithful+exact | Day 50 (PART 1x); DC-3 |
| **Desktop shell — 5 thin-invoker commands + `SidecarResult`** | Invoker-equivalence proven (spawn target == CLI byte-identical); **packaged GUI click-through deferred** | Days 52/53; DC-2/DC-4 |
| **Front-end UI + Bedrock identity** | Thin client (authored + `node --check` + static-preview guard/render); shell-only identity (provenance untouched); **live GUI deferred** | Day 55; DC-4 |
| **Packaged-path determinism** — the sidecar == the certified generator | The bundled node reproduces the 103 frozen digests byte-identical | Days 51/58; **DC-2** |
| **The full frozen backstop** (Day-29-recertified) | 103 baked + 10 TeamTracker + non-hash, byte-identical | **DC-1** (194 OK / 0 FAIL) |

---

## 3. THE COMPLETE HONEST BOUNDARY LEDGER (carry EVERY boundary forward — §4)

**Verification levels (the stacks):** Express **runtime/booted** (worker lifecycles, CLI run-to-exit, a
real GraphQL query, CRUD); **FastAPI/Django syntax-level**; **Go/Spring generation-only** (no Go/Java
toolchain here). The benchmark verifies the **generated output** (deterministic, twice-identical,
domain-reuse) for all 5 stacks in-process.

**Security layers (live vs core):** the **deterministic Semgrep scan** is CI/Linux-verified — **Semgrep's
native core does NOT run on this Windows dev shell** (Day 43), so the live scan here **guides**, the CERTAIN
gate is CI-enforced. The **AI-advisory scan + the creative fill** are **pure-core CI-proven with FAKE
suggesters/fillers**; the **live AI calls are developer-keyed and deferred** (no key in the shell — Days
23/45).

**Figma:** the ingestion **core is CI-proven** (canned fixture, PART 1p); the **Figma-plugin edge is
honest-manual** (runs inside Figma). **static+API is Spring-centric**; **GitLab CI is a staged 2nd
provider** (the `CiProfile` seam is provider-agnostic).

**The packaged / Store path (Leela's Windows/Store machine — honest-manual):**
- The **MakeAppx MSIX wrap** (Windows SDK not on this shell — Day 51/55; the manifest + recipe authored).
- The **packaged GUI launch + sidecar-under-MSIX** check (no GUI session here — the front-end verified by
  inspection + a static-preview guard/render only; the live `invoke` round-trip deferred — Day 55).
- The **Store submission** (Microsoft signs at certification — no cert/EV/notarization).
- The **"Bedrock" name reservation** — **NOT reserved** (very common word, likely conflict; variant
  prepared — Day 51/55).
- The **store-backed `--model` picker** — DEFERRED (the raw textarea shipped; the blueprint-store command
  is its own unit — Day 55).

**Cross-OS:** generation determinism is **OS-independent by construction** (LF-only; sorted walk; the
digest forward-slashes `relPath`) and **CI-enforced across ubuntu/windows/macos** (`determinism.yml`) for
*generation*; the **desktop BUILD is Windows-only** (macOS/Linux Tauri build deferred — needs runners).
3-OS CI green is user-confirmed for **generation**, NOT for the desktop build.

**Carried Phase-1/2/3 boundaries:** **no live DB boot** (Docker daemon down); the **Day-29 re-baseline
state** (MAXIMAL `366e19d9…`) stands (documented old→new, isolated); deferred ancillary infra pins.
**`detect_toolchains`** is now a **shell-out to the certified probe** (Day 52 superseded the Phase-1
"Rust re-probe" intent). The **CRLF-in-`tauri.conf.json`** git-normalization note (Day 55) — a shell
config file, not generator output (the LF guard governs output only).

---

## 4. THE FINAL HANDOFF — ship-ready in-repo vs Leela's-machine to go live

**SHIP-READY (certified, in-repo):**
- The certified deterministic generator (7 types × 5 stacks, Figma, CI/CD, exporter, security cores, the
  Map) — the full backstop byte-identical (DC-1).
- The packaged sidecar generating identically to the certified generator (DC-2).
- The Bedrock desktop shell — 5 thin-invoker commands + `SidecarResult` + the front-end + the Bedrock
  identity.
- The **built Bedrock MSI + NSIS** (with the certified sidecar staged) + the **MSIX `AppxManifest.xml` +
  wrap recipe** (Day 55).

**LEELA'S-MACHINE (to go live — honest-manual, in order):**
1. `MakeAppx.exe pack` (Windows SDK) → `Bedrock.msix` (fill the Partner-Center identity placeholders).
2. The packaged launch test (install on a clean Win 11 box; the sidecar spawns under the MSIX container).
3. The **"Bedrock" name reservation** (Partner Center; or a variant).
4. The Store submission (Microsoft signs at certification).

---

## 5. THE VERDICT (shape — written in the report)

> ✅ **The full system is certified.** A deterministic, AI-free generator (7 project types × 5 stacks) +
> Figma/CI/CD + the exporter (Law 21) + the security layers (deterministic-first CERTAIN / AI-advisory
> detachable) + the Map (exact impact + traceable flow) + the Bedrock desktop shell (thin-invoker,
> packaged, determinism-preserving) — every default/empty path reproducing the frozen backstop (103 baked
> + 10 TeamTracker + non-hash, 194 OK / 0 FAIL, MAXIMAL `366e19d9…`), AI-free generation (ADR-001),
> pure-Node (`deps {}`, 0 native), the packaged sidecar generating **identically** to the certified
> generator. Ready for **Day 60** (release + docs) + the Leela's-machine Store steps.

---

## 6. SCOPE GUARD — OUT

- **NO new features / stacks / types / providers.** Certification only — Days 1–55 are **verified**, not
  re-done.
- **NO signing config** (Microsoft signs the MSIX at certification).
- **NO frozen hash moved** — a mover is a **FINDING, STOP** (never a silent re-baseline).
- **The only permissible new artifact** is a **composition-only benchmark driver** (or re-running the
  existing `bench:*`) — no generation code.
- **The packaged GUI launch + the MakeAppx MSIX wrap + the Store submission + the Bedrock name
  reservation stay Leela's-machine** — **no claimed packaged launch / MSIX / reservation.**
- **Certify only what's proven** — carry EVERY boundary forward with its proof location / deferral reason;
  never overclaim (booted ≠ generation-only; CERTAIN ≠ ADVISORY; in-repo-ready ≠ live-on-Store).

## 7. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + Month-3 + Day-40 (the certification template) + Day-55 + the Phase-4 proof reports +
   enumerated the live gate set — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; Day 58 verifies, moves nothing —
   **understood**.
4. AI touchpoints: only the detachable dev-keyed advisory edges + the dev-time Fable-5 pass — neither in
   generation nor shipped (ADR-001 sweep in DC-4) — **yes**.
5. Default/empty paths a literal bypass: the whole backstop IS the default-path proof (DC-1) — **honored**.
6. The three determinism killers: verification only — no output touched; the packaged path re-proves LF /
   sorted / no-clock survive into the bundle (DC-2) — **confirmed**.
7. A gate that can FAIL + reported honestly: DC-1/DC-2 can fail; a moved hash / a sidecar-drift = STOP —
   **yes**.
8. Overclaim / out-of-scope watch: no packaged launch / MSIX / name reservation claimed; every boundary
   carried; no new feature — **guarded**.

---

*Day 58 plan: the final full-system regression, packaged — the certification (verify + certify, NOT
build), the Month-3 analogue of Day 40. The live gate set is enumerated (194 OK / 0 FAIL, PART 1a→1x, 103
baked + 10 TeamTracker + non-hash, MAXIMAL `366e19d9…`). The certification is four load-bearing proofs:
DC-1 the full backstop byte-identical from clean (the determinism spine, real per-PART accounting, no
frozen hash moved); DC-2 the packaged-path re-certification (sync-gen:check == certified + the bundled node
reproduces the 103 frozen digests byte-identical — the packaged generator == the certified generator);
DC-3 the composition benchmark (re-run bench:phase1/2/3 + bench:phase4-mid + bench:export — the whole
generation arc + the Phase-4 stack, each at its honest level; the shell certified by the already-proven
invoker-equivalence + DC-2); DC-4 the invariants (deps {}, 0 native, the ADR-001 sweep — the only AI is the
detachable dev-keyed advisory edges + the dev-time Fable-5 pass, neither in generation nor shipped; the
shell a thin invoker; sidecar == certified; no hash moved). The report writes the final certification
table (each capability + proven level + proof location across Phases 1–4 + the shell + the packaged path),
the COMPLETE honest boundary ledger (verification levels; Figma/static+API/GitLab; live Semgrep CI-only;
live AI dev-keyed/deferred; the packaged GUI launch + MakeAppx wrap + Store submission + Bedrock name
reservation → Leela's machine; the store-backed --model picker deferred; cross-OS generation CI-enforced
but the desktop build Windows-only; the Phase-1/2/3 carried boundaries; the Day-29 re-baseline), and the
ship-ready-vs-Leela's-machine handoff. No code, no builds this session — the plan governs the final
certification of the shipped Bedrock system.*
