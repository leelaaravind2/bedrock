# Eco-Day 30 — PLAN: Phase 2 close — the benchmark (the CERTIFICATION day)

**Phase 2, Day 30. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 30 is the **PHASE-2 CLOSE** — the certification day (the Phase-2 analogue of [Day-20](eco-day-20-report.md) / Day-10). It is **NOT a new-feature day.** Its job: prove the whole Phase-2 stack (Days 21–29) works together **END-TO-END** as one stack, and write the honest **Phase-2-complete certification**. Everything was built Days 21–29; Day 30 **VERIFIES + CERTIFIES.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.2 AI never in generation + the detachability proof; §1.4 Law 21; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §"Phase 2" (line 157, the exit condition) + §"Phase 3" (line 159, the handoff target) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 30 (lines 60–63) → [`eco-day-20-report.md`](eco-day-20-report.md) (the Phase-1 certification — the SAME KIND of day) → the Phase-2 reports [`eco-day-21`](eco-day-21-report.md) (slots) · [`eco-day-23`](eco-day-23-report.md) (AI fill) · [`eco-day-25`](eco-day-25-report.md) + [`pass2`](eco-day-25-report-pass2.md) (has-many) · [`eco-day-27`](eco-day-27-report.md) (decimal) · [`eco-day-29`](eco-day-29-report.md) (field-key re-baseline) → the REAL harness (enumerate the gate set live).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (the REAL gate set, enumerated live):**
> - **`npm run day20:regress`: 113 OK / 0 FAIL** on the current (Day-29-recertified) state.
> - **75 baked digests** = **43 frozen** (PART 1a 20-cell matrix + PART 1b 23 alternatives) + **5** version (1g) + **1 MAXIMAL** (1f — **now `366e19d9…`**, the Day-29 re-baseline) + **1 SLOTS** (1k) + **10 has-many** (1m) + **10 decimal** (1n) + **5 field-key** (1o).
> - **+ 10 TeamTracker** relationship hashes (1d, record-checked vs `FROZEN`).
> - **+ non-hash gates:** 1c (property re-derivations), 1e (round-trip + naming helpers), 1h (org-policy), 1i (canonical `assembleBlueprint` UI==CLI), 1j (detect-and-guide core), 1k (slot shell-invariance + `UnknownSection`), 1l (fill core + **default-off structural**), 1m (has-many no-schema + UI==CLI), 1n (decimal NUMERIC/string), 1o (FK wire key snake_case across 5 stacks).
> - **The re-baselined field-key state is the certified backstop** the benchmark runs against (Day-29 MAXIMAL `366e19d9…`).
> - **The Phase-1 benchmark precedent exists:** `generator/src/phase1-benchmark.ts` (`npm run bench:phase1`) — a composition-only driver over the live surfaces. Day 30 mirrors it as `phase2-benchmark.ts`.

---

## 0. What Day 30 is — the Phase-2 close (certify, don't build)

Day 30 proves the Days 21–29 stack is **ONE working stack** and writes the honest certification. It **adds no generation feature.** Like Day 20, the only permissible artifact is a **composition-only benchmark driver** (exercises existing surfaces; no generation change). **The measure (GUARDRAILS §7):** does the empty/default path reproduce the frozen backstop, is the AI detachable (delete it → still generates), and is every Phase-2 capability proven? If yes, Phase 2 certifies.

---

## 1. THE DETERMINISM SPINE (certification must not move a hash)

1. **The full backstop reproduces byte-identical from clean.** Execute: `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full set (75 baked + 10 TeamTracker + non-hash gates 1c/1e/1h/1i/1j/1k/1l/1m/1n/1o) byte-identical. **Enumerate the real count live** (75 baked; the print label "(43 frozen + 1 MAXIMAL)" is legacy).
2. **Day 30 is VERIFICATION, not change — no frozen hash moves.** A moved hash on a certification day is the worst case (§3): STOP and report, never a silent re-baseline. **The Day-29 re-baseline (MAXIMAL `366e19d9…`) is now the certified state** — the benchmark runs against it; it does not move again.
3. **The default/empty paths are literal bypasses — re-confirmed** (simple-mode/no-slots, no-decimal, default-naming, profile-absent) — each reproduces its frozen hash (proven within `day20:regress`).

---

## 2. THE END-TO-END BENCHMARK (design — the Phase-2 exit condition, one stack)

A **composition-only driver** (`phase2-benchmark.ts`, `npm run bench:phase2` — like the Phase-1 driver) that composes ALL Phase-2 capabilities in ONE project and proves the exit condition. The fixture (**"MaxPhase2"**): **Team `has-many` Application; Application `belongs-to` Team + a `price` Decimal field; snake_case naming (field-key); declared content slots (incl. an unknown-type slot).**

**B1 — DELETE THE AI → the project still generates COMPLETELY + VALIDLY (Law 21, creative path — LOAD-BEARING).**
- Generation is `buildFileSet(model)` with slots **empty** — it **never invokes the AI/fill layer**. Prove BY CONSTRUCTION: **0 references** to `fill/` in `src/core` + `src/plugins` (the ADR-001 sweep). Prove EXPLICITLY: the full MaxPhase2 project generates a complete shell (has-many route + decimal column + snake FK key + inert slot placeholders) with the fill layer **not invoked / a no-key `fillViaEnv` returning empty content** → generation is unaffected. **AI is a detachable enhancement, never the gate.**

**B2 — the SHELL is BYTE-IDENTICAL across empty / partial / full slot fill (Day-21 by-construction).**
- Construct `SlotContent` in empty / partial / full states; assert `buildFileSet(model)` is **byte-identical** across all three (content is never an argument to `buildFileSet`; 0-refs). The creative fill cannot perturb the deterministic shell.

**B3 — the depth features are present + correct in the output.**
- **has-many:** the reverse route `GET /api/teams/:id/applications` over the existing `team_id` FK (no schema change).
- **decimal:** `price` → `NUMERIC(19,4)` (never float/money) + string wire.
- **field-key:** the FK wire key is `team_id` (snake_case, consistent with declared fields — the Day-29 fix).
- **slots:** typed placeholders + `UnknownSection` fallback, inert (valid shell with slots empty).

**B4 — UI==CLI.** The MaxPhase2 blueprint through `assembleBlueprint` (slots + has-many + decimal + naming) == the programmatic path, **byte-identical** (the same canonical seam; twice-identical).

**B5 — certified as ONE stack.** The composition is deterministic (twice-identical); each capability ties to its proof location (§ report).

> **Honesty for the benchmark:** the deterministic parts (B2/B3/B4) are **shell-verified locally** and CI-enforced via `day20:regress`. **Verification levels (carried from Days 25/27/29):** **Express runtime-verified** (has-many route, decimal round-trip); **FastAPI/Django syntax-verified** (`py_compile`); **Go/Spring generation-only** (no Go/Java toolchain here). **No live DB boot** (Docker daemon down). **No live AI call** (this shell has no developer key — the fill core is fixture/fake-filler tested; the edge is built + wired). **3-OS CI green is user-confirmed** (this shell can't observe GitHub Actions).

---

## 3. EXECUTE — done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

- **DC-1 — Full backstop green from clean.** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**; enumerate the real gate set (75 baked + 10 TeamTracker + non-hash 1c/1e/1h/1i/1j/1k/1l/1m/1n/1o). No hash moved.
- **DC-2 — THE BENCHMARK (§2, load-bearing).** The `phase2-benchmark` driver: (a) delete-the-AI → MaxPhase2 generates completely + validly (Law 21); (b) shell byte-identical across empty/partial/full slot fill; (c) has-many + decimal + field-key present + correct; (d) UI==CLI byte-identical. Record the actual digests + the honest verification level per stack.
- **DC-3 — Invariants + the ADR-001 sweep.** Generator **pure-Node** (`deps {}`, 0 native); **AI only in the detachable `fill/` edge** — re-verify **0 refs** to `fill/`/`detect/` in `src/core` + `src/plugins`; **no frozen hash moved**. The only new artifact is the composition-only benchmark driver.

**Execute scope guard:** certification only — **no** new features/stacks/types; **no** signing; **no frozen hash moved** (a moved hash is a finding, STOP). Do **not** re-do Days 21–29 — **verify** they hold and **certify**. The only permissible artifact beyond the report is a composition-only benchmark **driver** (no generation change). No AI. Commit to `main`.

---

## 4. REPORT — done-conditions (the Phase-2 CERTIFICATION)

[`eco-day-30-report.md`](eco-day-30-report.md) — modelled on the Day-20 certification:

**(a) The benchmark result** — DC-1..DC-3 with actual digests + honest verification levels.

**(b) The PHASE-2 CERTIFICATION TABLE** — each capability at its proven level + proof location:

| Phase-2 capability | Proven level | Proof location |
|---|---|---|
| **Typed content slots** — byte-identical shell across fill (by construction); type→component map + `UnknownSection`; separate content layer (0 refs) | shell invariant; valid with slots empty (Law 21) | [Day 21](eco-day-21-report.md); PART 1k; DC-2 B2 |
| **Detachable developer-keyed AI fill** — delete → still generates; AI in core = 0; default-off structural | detachable, developer-keyed, default-off | [Day 23](eco-day-23-report.md); PART 1l + `fill-demo`; DC-2 B1 |
| **has-many** — query-based reverse projection, no schema change, 5 stacks × 2 DBs | 10 baselines; Express runtime; others gen/syntax | [Day 25](eco-day-25-report.md) + [pass2](eco-day-25-report-pass2.md); PART 1m; DC-2 B3 |
| **decimal/money** — `NUMERIC(p,s)` + string wire, exact (no float), 5 × 2 | 10 baselines; Express runtime round-trip | [Day 27](eco-day-27-report.md); PART 1n; DC-2 B3 |
| **field-key consistency** — FK wire key through `applyNaming`; the FIRST deliberate re-baseline | MAXIMAL `366e19d9…`; snake FK across 5 stacks | [Day 29](eco-day-29-report.md); PART 1o + the MAXIMAL constant; DC-2 B3 |
| **The end-to-end benchmark** (slots + has-many + decimal + field-key; AI-deleted → still generates; shell byte-identical across fill) | one working stack | **Day 30 DC-2** |
| The **frozen backstop** reproduces (Day-29-recertified) | 75 baked + 10 TeamTracker + non-hash, byte-identical | **DC-1** (113 OK / 0 FAIL) |

**(c) Honest boundaries carried forward (every one — §4):**
- **Verification levels:** Express **runtime-verified**; FastAPI/Django **syntax-verified** (`py_compile`); Go/Spring **generation-only** (no Go/Java toolchain here).
- **No live DB boot** (Docker daemon down); DB-side `NUMERIC(p,s)` exactness is a standard guarantee.
- **No live AI call** (no developer key — the fill core is fixture/fake-filler tested; the edge is built + wired; a real call is the developer's own key/model, provider-agnostic).
- **Phase-1 carried boundaries (unchanged):** the packaged-path Rust `detect_toolchains` command is **pending** (dev-surface `/api/detect` certified); the **macOS/Linux desktop BUILD is deferred** (Windows-only); **3-OS CI green is user-confirmed** (macOS *generation* determinism CI-proven, the macOS *desktop build* is not); deferred ancillary infra pins.
- **The Day-29 re-baseline state:** MAXIMAL is now `366e19d9…`; historical reports cite the old `929c379f…` for their date (not edited); **no live test hardcodes the old value**; the desktop-store round-trip regenerates the new hash if re-run.
- **v0.1 generation depth:** has-many/decimal/field-key are **closed**; richer slot sites (per-stack landing-page copy) and further field types remain future. **Code signing → Phase 4.**

**(d) Phase-2 → Phase-3 handoff.** **Solid ground for Phase 3** (Figma ingestion + more project types): the **canonical `assembleBlueprint` seam** (where structured inputs attach — Figma tokens → model input); the **slot mechanism** (Figma content NOT eligible under auto-layout/variables → routed to slots / human review — the exact "everything else → slots" path the Figma plan needs); the **governed-input / additive pattern** (literal bypass + additive baselines — new project types produce new frozen baselines the same way has-many/decimal did); the **deterministic depth features** as the reference for cross-stack projection. **Phase 3** = the Thraksha Figma plugin (deterministic token round-trip); new project types (cron-worker, queue-consumer, CLI, GraphQL, static+API); CI/CD generation — its benchmark: Figma round-trip byte-identical; each new type produces frozen baselines.

**(e) Verdict.** **Phase 2 certified** — the creative-plug/slot system (byte-identical shell regardless of fill + a detachable, developer-keyed AI fill) + the three depth limitations closed (has-many, decimal/money, field-key consistency), all deterministic, the default/empty paths reproducing the frozen backstop, **AI never in the generation path**. Generator pure-Node, no frozen hash moved. **Phase 3 begins (Figma ingestion + more project types).**

---

## 5. Scope guard — OUT for Day 30
- **NO** new features/stacks/types; **NO** signing; **NO frozen hash moved** (certification only — a moved hash = STOP-and-report finding).
- Do **NOT** re-do Days 21–29 — **VERIFY** they hold and **CERTIFY**.
- The only permissible new artifact: a composition-only benchmark **driver** (exercises existing surfaces, no generation change).
- No AI. No signing.

---

## 6. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + ecosystem (Phase-2 exit / Phase-3 target) + Month-2 Day 30 + the Phase-2 reports + Day-20 + the real harness? — ✅ (this session).
2. Only Day-30's job (certify the Phase-2 stack end-to-end)? — yes; **not** a new feature; verify + document + one composition-only driver.
3. Which baselines must NOT move? — **all**: 75 baked + 10 TeamTracker + non-hash gates. `day20:regress` byte-identical from clean; the Day-29 re-baseline is the certified state (no further move).
4. New AI touchpoints? — **none.** The detachability proof (delete AI → still generates) is DC-2 B1; the ADR-001 sweep (0 fill refs in core) is DC-3.
5. Default/empty path a literal bypass? — **yes, re-confirmed**: no-slots, no-decimal, default-naming, profile-absent.
6. Three killers checked? — no output changes (verification only); AI/detection stay quarantined at their edges (0 core refs); the re-baselined state is stable.
7. A gate that can actually FAIL? — **DC-1** (any moved hash), **DC-2** (delete-AI generation incomplete; shell varies across slot fill; a depth feature missing/incorrect; UI≠CLI), **DC-3** (a native module / an AI ref in core / a moved hash). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming the benchmark proves the project **builds/boots** (verification levels are honest — Express runtime, others gen/syntax; no live DB/AI); (ii) claiming a **live AI call** when only the fake-filler ran; (iii) claiming **3-OS/cross-OS** when the CI green is user-confirmed and no boot ran; (iv) a certification-day **thin/faked** proof (worse than an honest red); (v) letting a hash move be silently re-baselined — all guarded.

---

*Day 30 closes Phase 2 by proving the Days 21–29 stack is ONE working stack: a project composing creative slots + has-many + a decimal field + a non-default naming generates completely and validly with the AI layer deleted (Law 21, creative path — AI is a detachable enhancement, never the gate), its structural shell is byte-identical across empty/partial/full slot fill (the Day-21 by-construction invariance), has-many/decimal/field-key are present and correct, and UI==CLI holds — all against the Day-29-recertified field-key backstop (MAXIMAL `366e19d9…`), byte-identical from clean (75 baked + 10 TeamTracker + non-hash, 113 OK / 0 FAIL). It moves no frozen hash and adds no generation feature; AI lives only in the detachable fill edge (0 core refs). The boundaries are carried forward precisely — Express runtime-verified, FastAPI/Django syntax-verified, Go/Spring generation-only; no live DB boot (Docker down); no live AI call (no developer key); the Phase-1 carried boundaries (packaged-path Rust detect pending, macOS/Linux desktop build deferred, 3-OS CI user-confirmed); signing is Phase 4. Phase 2 certifies; Phase 3 begins — Figma ingestion + more project types, on the assembleBlueprint seam and the slot mechanism this phase built.*
