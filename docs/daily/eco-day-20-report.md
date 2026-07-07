# Eco-Day 20 — REPORT: PHASE-1 CERTIFICATION (the close)

**Phase 1, Day 20 — the certification day (the Phase-1 analogue of the Phase-0 [Day-10](eco-day-10-report.md)).** No new features; certification only. This report certifies that the Days 11–18 governed-input stack holds together **as ONE working stack**, with a proof location for every capability and every boundary carried forward honestly.

Plan: [`eco-day-20-plan.md`](eco-day-20-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§3 STOP-and-report; §4 honesty). Phase-1 arc: [`eco-day-11`](eco-day-11-report.md) (framework+version pins) · [`13`](eco-day-13-report.md) (org-policy) · [`16`](eco-day-16-report.md) (progressive-disclosure wizard + canonical `assembleBlueprint`) · [`18`](eco-day-18-report.md) (toolchain detect-and-guide).

---

## THE VERDICT

> ✅ **PHASE 1 CERTIFIED.** Governed INPUTS — **framework+version pins** (Day 11) + an **org-policy allow/ban layer** (Day 13) — flow through a **progressive-disclosure wizard that is a faithful front-end** (canonical `assembleBlueprint`, **UI==CLI structural**, Day 16), with a **toolchain detect-and-guide** layer (Day 18) that reads THIS machine and informs — all with **default/empty paths as literal bypasses** that reproduce the frozen backstop. Proven **end-to-end, live**: a project generated through the wizard with a **pinned + policy-checked** framework+version is **byte-identical** (== the programmatic path == the recorded baseline, **no policy metadata in output**), the app **detects this machine's real missing toolchain and guides** (`go` genuinely absent → go.dev link + container offer), and the simple-mode/default path still reproduces the frozen hash. Generator stays **pure-Node** (`deps {}`, 0 native modules); **no frozen hash moved**.
>
> **Month 2 begins — Phase 2: creative-plug/slot system + depth** (`has-many`/`decimal`·`money`/field-key).

Every DC passed. The honest caveats: the 3-OS CI green is **user-confirmed** (this shell can't observe GitHub Actions, §DC-1); the live detection was run on **Windows** only; the packaged-path Rust detect command is **pending** (dev-surface certified). All carried forward in §3.

---

## 1. The benchmark result (Execute DCs)

### DC-1 — Full backstop green from clean, REAL gate accounting ✅
`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 65 OK / 0 FAIL**, re-confirmed from clean at report time. The **actual** gate set (enumerated from the harness, not the legacy `"(43 frozen + 1 MAXIMAL)"` print label):

| Gate group | Count | What |
|---|---|---|
| **Baked digest-manifest** | **49** | 43 frozen (PART 1a 20-cell matrix + PART 1b 23 alternatives: naming 5, formatting 2, architecture 4, composition 2, api-only 6, email 2, ai-hook 2) + **5** non-default version baselines (PART 1g) + **1** MAXIMAL (PART 1f, `929c379f…`) |
| **TeamTracker relationship** | **10** | PART 1d — UI==CLI via `addEntity`, `record`-checked byte-for-byte vs `FROZEN` (not baked) |
| **Non-hash gates** | — | PART 1c (property re-derivations), 1e (round-trip + naming helpers), **1h** (org-policy, Day 13), **1i** (canonical `assembleBlueprint` UI==CLI, Day 16), **1j** (detect-and-guide pure core, Day 18) |

All byte-identical / green. **No frozen hash moved.**

### DC-2 — THE END-TO-END BENCHMARK (load-bearing) ✅ — 16/16, live
A **composition-only** driver ([`generator/src/phase1-benchmark.ts`](../../generator/src/phase1-benchmark.ts), `npm run bench:phase1` — exercises existing surfaces, **no generation change**) spawns the real `dist/server.js` (env-configured, hermetic output/store + an org profile) and drives the whole Phase-1 flow on the live HTTP routes:

- **B1/B2 — org-policy shapes the wizard (Day 13):** `GET /api/options` under a profile that **hard-bans MySQL**, **hard-forces Go**, **soft-discourages snake_case** → the database option set is `[PostgreSQL]` (MySQL removed), the backend default is **Go**, a **snake_case soft advisory** is surfaced (input-side only), `profileId=day20-benchmark`.
- **B3/B4 — pinned framework+version → generate byte-identical (UI==CLI):** `POST /api/assemble` a **Go + `go 1.21`** blueprint under the profile → generate is **twice-identical** (`e926ef61…`), **== the programmatic `assembleBlueprint`** path (UI==CLI, byte-identical), **== the recorded Go+go1.21 version baseline** (PART 1g). `GET /api/preview` renders the plan; `POST /api/generate` writes the project; **NO org-policy/UI/enforcement metadata leaked into any of the 24 generated files** (Day-13 provenance rule).
- **B4-bypass — the literal bypass, live:** `POST /api/assemble` the **default/simple-mode** choices under the SAME profile → still the **frozen `Express|PostgreSQL|DemoApp` baseline** (`a437a302…`) — the profile has **no write-path** to generation.
- **B5 — detect this machine + guide (Day 18, honest):** `GET /api/detect` against the pinned Go blueprint → **`go` MISSING** (genuinely not installed on this machine — *not contrived*) → **go.dev install link + the container-build offer**; `canBuildNatively=false` **but** the container path **is** offered (docker present); the report carries the **determinism-≠-validity** caveat ("can build, not will build").

> **Diagnosis honestly recorded (GUARDRAILS §3):** the first benchmark run pinned **Express** (whose only toolchain, node 22.21.0, IS present here) and its "missing toolchain" assertion failed — correctly, because Express has **no gap** on this box. That was a benchmark-expectation issue, not a determinism failure (all 15 byte-identity checks passed). The fix pinned **Go** (a stack with a **real** gap here), so one flow honestly shows policy + pin + byte-identical generate **and** a genuine missing-toolchain detect+guide. No hash was touched.

### DC-3 — The literal bypasses re-confirmed ✅
Simple-mode/default choices → frozen (`a437a302…`, B4-bypass **live**); profile-**absent** → frozen (PART 1h — `applyProfile == identity`); **default** version pins → the frozen matrix (PART 1g default path / PART 1a). Each default/empty path is a literal bypass.

### DC-4 — UI==CLI re-confirmed (framework+version + org-policy) ✅
The wizard-assembled blueprint == the programmatic path, **byte-identical**, for both the **default** (B4-bypass; PART 1i (a)) and the **non-default** profile-forced + pinned case (B3/B4 live Go+go1.21; PART 1i (b) profile-forced Express + node 20). **Structural**: the SAME `assembleBlueprint(choices)` → the SAME `ProjectState` → the SAME bytes, whether called by the server or the CLI/harness.

### DC-5 — Invariants ✅
- **Generator pure-Node:** `dependencies: {}`, **0** native modules (`http`/`child_process`/`crypto` are builtins; the benchmark driver uses only builtins + core imports).
- **No frozen hash moved** — Day 20 is verification; the driver is additive (the frozen 49 + 10 reproduce byte-identical from clean).
- **Detection still doesn't feed back into generation** — `grep` for `detect/`/`detect-core`/`runLiveDetection`/`phase1-benchmark` in `src/core` + `src/plugins` → **0**. The driver is a *consumer* of the core; nothing in the generation path imports it or the detection layer.

---

## 2. THE PHASE-1 CERTIFICATION TABLE — each capability at its proven level + proof location

| Phase-1 capability | Proven level | Proof location |
|---|---|---|
| **Framework+version** as a first-class pinned input | default pins == frozen matrix (**literal bypass**); 5 non-default pins → own byte-identical baselines | [Day 11](eco-day-11-report.md); `day20:regress` PART 1g; DC-2 B3/B4 (Go+go1.21 == `e926ef61…`) |
| **Org-policy allow/ban layer** (pure additive input-shaping) | profile-**absent** == frozen (**literal bypass by construction**); profile filters options/defaults deterministically; **no metadata in output** | [Day 13](eco-day-13-report.md); PART 1h + PART 1i (b); DC-2 B1/B2 + the 24-files-clean leak check |
| **Progressive-disclosure wizard** + canonical `assembleBlueprint` (**UI==CLI STRUCTURAL**) | simple-mode == frozen (bypass); UI path == CLI path **byte-identical** (default + non-default) | [Day 16](eco-day-16-report.md); PART 1i; DC-2 B3/B4 (live == programmatic) |
| **Toolchain detect-and-guide** (pure core + impure edge; **informs, never mutates**) | pure core fixture-tested (CI); live probe honest on this box; **0 refs into generation** | [Day 18](eco-day-18-report.md); PART 1j + `GET /api/detect`; DC-2 B5 (`go` missing → guide) |
| **The literal bypasses** (simple-mode / profile-absent / default pins) | each reproduces its frozen hash | PART 1g/1h/1i; DC-3; DC-2 B4-bypass |
| **The end-to-end benchmark** (wizard→policy→pin→generate byte-identical→detect→guide) | ONE working stack, byte-identical + honest detection | **Day 20 DC-2** (16/16, live) |
| The full **frozen backstop** reproduces | 49 baked + 10 TeamTracker + non-hash gates, byte-identical from clean | **DC-1** (65 OK / 0 FAIL) |

---

## 3. Honest boundaries carried forward (every one — a strengths list without an equal limitations list is an overclaim, §4)

- **The shell-side Rust `detect_toolchains` command is PENDING.** The dev-surface `GET /api/detect` is wired + certified (DC-2 B5); the **packaged-path** (Tauri shell-side, capability mediation is shell-side) is **flagged, not built** (from [Day 18](eco-day-18-report.md)). The report contract + pure-core logic are ready to mirror.
- **Determinism ≠ validity.** Detection reports **environment facts** — whether THIS machine **CAN** build the deterministically-generated project. It does **NOT** prove the project builds/boots. "Detection passed" is never "the project builds." (The report object even carries the caveat, DC-2 B5.)
- **macOS/Linux live-probe reasoned, NOT run.** The live detection was exercised on **Windows** only; the CI-enforced piece is the deterministic PART 1j **fixture** (canned probe outputs), not a live cross-OS probe.
- **3-OS CI green is USER-CONFIRMED.** `day20:regress` (now incl. PART 1g/1h/1i/1j) runs on ubuntu/windows/macos; this shell **cannot** observe GitHub Actions — same caveat as [Day-10 DC-3](eco-day-10-report.md). Standing proof: the Actions page.
- **Deferred ancillary infra pins** — maven/nginx/alpine (and similar fixed infra images) are **not** first-class pinned inputs (from [Day 11](eco-day-11-report.md)); `maven:3.9` is a fixed infra constant (detection treats it presence-only).
- **v0.1 generation limitations still stand** (carried from Phase 0 / `CAPABILITIES.md`) — `has-many` records no schema, `DECIMAL` unexercised, the mixed-key FK seam, cross-depth switching, MySQL live-boot coverage. **Phase 1 added NO generation features, so none changed.**
- **The Tauri/sidecar cross-OS DESKTOP BUILD is still DEFERRED** (from Phase 0) — only the **Windows** desktop build is proven; macOS/Linux *desktop* builds untested. **macOS *generation* determinism IS CI-proven; the macOS *desktop build* is NOT** (do not blur). **Code signing → Phase 4** (installers unsigned).

---

## 4. Phase-1 → Month-2 (Phase 2) handoff

**The solid ground Month 2 builds on:**
- **The canonical `assembleBlueprint` seam** (Day 16) — the ONE place `BlueprintChoices → ProjectState` happens, shared by UI and CLI. **This is where Phase-2's typed content slots and new inputs attach** — extend the choices/state, keep the seam, and UI==CLI stays structural for free.
- **The governed-input pattern** — every new input is **additive**: it records its OWN new twice-identical baselines, and its default/empty path is a **literal bypass** reproducing the frozen backstop. Proven four times over (Days 11/13/16/18) and CI-enforced.
- **The wizard as a faithful front-end** — progressive disclosure (simple/advanced), org-policy-filtered options, aggressive smart defaults; a front-end that never injects a value or ordering into the blueprint.
- **The detect-and-guide layer** — a pure detection CORE behind an impure probe EDGE, quarantined so no env value reaches generation (0 core refs). Month 2 can lean on it (and complete the packaged-path Rust command) without determinism risk.

**Phase 2 (Weeks 6–8, Month 2) = creative-plug + slot system + depth.** Typed content slots (byte-identical shell regardless of fill); optional developer-keyed AI **fill** (default-off, **detachable**, developer's own bill/key); close `has-many`, `decimal`·`money`, field-key consistency. **Its benchmark:** delete the AI layer → the project still generates completely; the depth features produce **new frozen baselines** across all stacks. The rule is unchanged — **AI is NEVER in the generation path**; slots stay as placeholders when unfilled.

---

## 5. Scope & cleanup

- **Certification only** — no new features/stacks/types/integrations; no signing; no macOS/Linux desktop builds; **no frozen hash moved**; Days 11–18 not re-done (verified + certified). The **only** new artifact is the composition-only benchmark **driver** ([`phase1-benchmark.ts`](../../generator/src/phase1-benchmark.ts) + the `bench:phase1` script) — it exercises existing surfaces and adds no generation code.
- The driver runs **hermetically** (a throwaway temp output/store + a temp org-profile file; the server child is killed and the scratch dir removed on exit) — it never touches the canonical `output/` or `.thraksha/`. `dist/` is gitignored (rebuilt by the gate, not committed).

---

**Day 20 verdict, restated:** Phase 1 is a certified, coherent stack — not a pile of parts. Governed inputs (framework+version pins, an org-policy allow/ban layer) flow through a progressive-disclosure wizard that is a faithful front-end (one canonical `assembleBlueprint` seam, UI==CLI structural), with a toolchain detect-and-guide layer that reads the machine and informs. Proven live end-to-end: a wizard-generated project with a pinned + policy-checked framework+version is byte-identical (== programmatic == the recorded Go+go1.21 baseline, no policy metadata in output), the app detects this machine's genuinely-missing `go` toolchain and guides (go.dev link + container path), and the simple-mode/default path reproduces the frozen `a437a302…` baseline. The full frozen backstop — 49 baked digests + 10 TeamTracker relationship hashes + the non-hash gates — reproduces byte-identical from clean (65 OK / 0 FAIL), cross-OS CI-enforced (3-OS green user-confirmed). Boundaries are stated precisely — the packaged-path Rust detect command is pending, determinism ≠ validity, macOS/Linux live-probe reasoned-not-run, the deferred infra pins and v0.1 limits stand, the cross-OS desktop build is still deferred, signing is Phase 4. Generator pure-Node, no frozen hash moved. **Phase 1 certified. Month 2 begins — Phase 2: creative-plug + depth.**
