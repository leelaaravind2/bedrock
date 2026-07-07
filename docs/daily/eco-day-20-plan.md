# Eco-Day 20 — PLAN: Phase 1 close — the benchmark (the CERTIFICATION day)

**Phase 1, Day 20. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 20 is the **PHASE-1 CLOSE** — the Phase-1 analogue of the Phase-0 [Day-10 certification](eco-day-10-report.md). It is **NOT a new-feature day**. Its job: prove the whole Phase-1 stack (Days 11–18) works together **END-TO-END**, and write the honest **Phase-1-complete certification**. Everything Day 20 needs was built in Days 11–18; Day 20 **VERIFIES** it holds together and **CERTIFIES** it.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §"Phase 1" (the exit condition, line 154) + §"Phase 2" (the handoff target, line 156) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 20 (lines 95–98) + the Month-1 exit state (lines 102–108) → the Phase-1 reports [`eco-day-11`](eco-day-11-report.md) (framework+version pins) · [`eco-day-13`](eco-day-13-report.md) (org-policy) · [`eco-day-16`](eco-day-16-report.md) (progressive-disclosure wizard + canonical `assembleBlueprint` + UI==CLI structural) · [`eco-day-18`](eco-day-18-report.md) (toolchain detect-and-guide) → [`eco-day-10-report.md`](eco-day-10-report.md) (the Phase-0 certification — the SAME KIND of day) → the REAL harness + server (read this session).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL harness/server, not assumed):**
> - **The real current gate set of `npm run day20:regress` — enumerated from `generator/src/day20-regression.ts`:**
>   - **Digest-manifest = 49 baked digests** = **43 frozen** (PART 1a: the 20-cell web-app matrix + PART 1b: 23 alternative baselines — naming 5, formatting 2, architecture 4, composition 2, api-only 6, email 2, ai-hook 2) **+ 5 non-default VERSION baselines** (PART 1g, Eco-Day 11) **+ 1 MAXIMAL** composition cell (PART 1f). *(The run's parenthetical "(43 frozen + 1 MAXIMAL)" is a legacy label; the manifest is 49 — enumerate/confirm live in execute.)*
>   - **+ 10 TeamTracker relationship hashes** (PART 1d) — UI==CLI via the `addEntity` path, `record`-checked against the `FROZEN` constants (NOT baked into the 49). So the **full frozen backstop = 43 + 10 + MAXIMAL + 5 = the 49 baked ∪ the 10 record-checked**.
>   - **+ non-hash gates:** PART 1c (property cases re-derived), PART 1e (style/description round-trip + naming helpers), **PART 1h** (org-policy determinism — Eco-Day 13), **PART 1i** (canonical `assembleBlueprint` UI==CLI STRUCTURAL — Eco-Day 16), **PART 1j** (toolchain detect-and-guide pure core — Eco-Day 18). *(These are the `record`-gated proofs — they can FAIL.)*
> - **PART 1i is already the structural core of the Day-20 benchmark:** it drives `assembleBlueprint` with a **profile-forced Express + hard-banned MySQL** `BlueprintChoices` **pinned to node 20**, asserts twice-identical == the Express node-20 version baseline (byte-for-byte, PART 1g) **and no profile/enforcement metadata leaks into any generated file** (the Day-13 provenance rule). Day 20 **elevates** this to the full LIVE end-to-end (real HTTP server + live detection + guide), it does not reinvent it.
> - **The live wizard path is real and canonical:** `generator/src/server.ts` exposes `POST /api/assemble` (→ `assembleBlueprint(choices)` — the SAME function the CLI/harness use, so UI==CLI is structural), `GET /api/options` (org-policy-filtered), `GET /api/detect` (the Day-18 live probe against `model.getState()`'s pins), `GET /api/preview`, `POST /api/generate`.
> - **This machine has REAL, un-contrived toolchain gaps (from Day 18, live):** Java **20.0.1 ≠ pin 21** (mismatch), **Maven missing**, Node **22.21.0 = pin 22** (present), Python **3.14.0 ≠ pin 3.12** (mismatch), pip **25.3** present, **Go missing** (pin 1.22), **Docker present** → container offer. So the "detects a missing/mismatched toolchain and guides" benchmark is **genuine on this box**, not staged.
> - **`GET /api/detect` reads `requireModel()`** — it detects against **the current blueprint's** pins (set by `/api/assemble`), so the benchmark's detection is tied to the benchmark's pinned framework+version.

---

## 0. What Day 20 is — CERTIFICATION, not a feature

Day 20 is the Phase-1 **close**: prove the Days 11–18 stack is **ONE working stack** (not a pile of parts) and write the honest certification. It **adds no generation feature, no stack, no type, no integration**. Like Day 10, it may add **verification tooling** (a benchmark driver that COMPOSES existing pieces) — never a generation change. **The measure (GUARDRAILS §7):** does the empty/default path still reproduce the frozen backstop, and is every Phase-1 capability a literal bypass when unused? If yes, the core held and Phase 1 certifies.

---

## 1. THE DETERMINISM SPINE (certification must not move a hash — LOAD-BEARING)

1. **The full frozen backstop reproduces byte-identical from clean.** Execute proof: `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the **49 baked digests** (43 frozen + 5 version + MAXIMAL) **+ the 10 TeamTracker** relationship hashes **+ the non-hash gates 1c/1e/1h/1i/1j** all green. **Enumerate the real count live** (confirm 49 baked; the parenthetical label is legacy) — do not trust this plan's number over the harness.
2. **Every default/empty path is a literal bypass — re-confirmed.** Simple-mode wizard (default `BlueprintChoices` → PART 1i (a)), profile-absent (no `OrgProfile` → PART 1h / the Day-13 bypass), default version pins (`DEFAULT_VERSIONS` → the frozen matrix). Each reproduces its frozen hash.
3. **Day 20 is VERIFICATION, not change — no frozen hash moves, no new generation feature.** A moved hash on a certification day is the worst case (GUARDRAILS §3): it means latent nondeterminism was masked. **If any hash moves → STOP and report it as a finding**, never a silent re-baseline. A thin or faked proof on a certification day is worse than an honest failure.

---

## 2. THE END-TO-END BENCHMARK (design — the Phase-1 exit condition, proven as one flow)

The benchmark proves the WHOLE Phase-1 stack as a single flow: **wizard → `assembleBlueprint` → (org-policy filters + version pins) → generate (byte-identical) → detect (honest real-machine) → guide.** Recommended shape — a **verification driver** (a new `bench`-style script like `detect-demo`/`maxcell-driver`, composition-only, NOT a generation feature) that exercises the **live HTTP server** for the real wizard path and cross-checks byte-identity against the programmatic/CLI path:

**B1 — a project generated THROUGH THE WIZARD with a PINNED + POLICY-CHECKED framework+version → deterministic (UI==CLI).**
- Start the real server; `GET /api/options` under an **`OrgProfile`** that **hard-forces a backend + bans an option** (the PART 1i profile: `forceDefault: Express`, `ban: [MySQL]`) → confirm the option set is filtered + the default is forced (Day-13 shaping).
- `POST /api/assemble` a `BlueprintChoices` that accepts the forced backend, picks PostgreSQL, and **pins a concrete non-default version** (e.g. `node: 20` — a Day-11 pin with an existing frozen version baseline so byte-identity is checkable). This is the **wizard path** (`assembleBlueprint`, the canonical function).
- `POST /api/generate` (or `GET /api/preview` + digest) → capture the file set → digest **twice** → **byte-identical**, and **== the Express node-20 version baseline** (PART 1g / `VERSION_BASELINES`), and **== the in-process programmatic path** (UI==CLI byte-identical). **No profile/enforcement metadata leaks into any generated file** (Day-13 provenance).

**B2 — the app DETECTS a real missing/mismatched toolchain on THIS machine and GUIDES.**
- `GET /api/detect` against the **same benchmark blueprint's pins** → the Day-18 live probe returns the honest real-machine report. On this box that is a **genuine** result: **Go missing / Maven missing / Java 20≠21 / Python 3.14≠3.12** → each surfaces a **clear message + official install link + the container-build offer** (never a silent failure). Pick the stack whose gap is real (e.g. a Go blueprint → **Go missing → go.dev link + container offer**, or Spring → **Java mismatch + Maven missing**).

**B3 — the literal bypasses reproduce the frozen hashes.**
- Simple-mode/default `BlueprintChoices` (no versions/profile/style) → `assembleBlueprint` == CLI builder == the frozen Express|PostgreSQL|DemoApp baseline (PART 1i (a)).
- Profile-**absent** → all frozen hashes reproduce (PART 1h / Day-13 bypass).
- **Default** version pins → the frozen matrix (PART 1g default path).

**B4 — UI==CLI re-confirmed for framework+version AND org-policy (default + non-default).**
- The wizard-assembled blueprint (`assembleBlueprint`, both the default and the profile-forced+pinned case) == the programmatic path, **byte-identical** (PART 1i already asserts both cases structurally; the benchmark drives the **live server** to prove the HTTP surface agrees byte-for-byte, then ties back to PART 1i's in-process assertion).

**B5 — certified as ONE stack.** The report ties each Phase-1 capability to its proof location (§ report), states the benchmark result, and carries every boundary forward.

> **Honesty for the benchmark:** the deterministic parts (B1 generate byte-identity, B3/B4 bypasses) are **shell-verified locally** and **CI-enforced** via `day20:regress` (PART 1g/1h/1i) on 3 OSes — the **3-OS-green is USER-CONFIRMED** (this shell can't observe GitHub Actions; same caveat as Day-10 DC-3). The B2 **live detection** is **machine-dependent** (Windows box) — the CI-enforced piece is the **PART 1j fixture** (deterministic); the live real-machine result is **shell-run on this Windows box**, macOS/Linux **reasoned, not run** (§4 boundaries).

---

## 3. EXECUTE — done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

- **DC-1 — Full backstop green from clean.** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS**; enumerate the real gate set live (the **49 baked** = 43 frozen + 5 version + MAXIMAL; **+ 10 TeamTracker**; **+ non-hash PART 1c/1e/1h/1i/1j**), all byte-identical/green. No hash moved.
- **DC-2 — THE END-TO-END BENCHMARK (§2, load-bearing).** Drive the real flow **wizard(`/api/options`+`/api/assemble` under a policy profile with a pinned framework+version) → `/api/generate` byte-identical (twice + == the version baseline + == the programmatic path, UI==CLI, no metadata leak) → `/api/detect` (honest real-machine missing/mismatch on THIS box) → guide (message + link + container offer)**. Record the actual digests + the actual detection result.
- **DC-3 — The literal bypasses re-confirmed.** Simple-mode wizard + profile-absent + default pins → the frozen hashes reproduce (B3). *(Covered by `day20:regress` PART 1g/1h/1i; re-state explicitly in the benchmark output.)*
- **DC-4 — UI==CLI re-confirmed (framework+version + org-policy, default + non-default).** The wizard/`assembleBlueprint` path == the programmatic path, byte-identical, for both the default and the profile-forced+pinned case (B4 / PART 1i, plus the live-server cross-check).
- **DC-5 — Invariants.** Generator still **pure-Node** (`dependencies: {}`, **0** native modules; `child_process`/`http` are builtins); **no frozen hash moved**; the **detection layer still does not feed back into generation** (re-verify: **0** references to `detect/`/`detect-core`/`runLiveDetection` in `src/core` + `src/plugins`; the report object has no write-path to `assembleBlueprint`/`buildFileSet`).

**Execute scope guard:** certification only — **no** new features/stacks/types/integrations; **no** signing; **no** macOS/Linux desktop builds; **no** shell-side Rust detect command (that's the flagged pending item — certify the dev-surface `/api/detect` as done, carry the packaged path forward honestly); **no frozen hash moved** (a moved hash is a finding, STOP). Do **not** re-do Days 11–18 — **verify** they hold and **certify**. The only artifact beyond the report may be a composition-only benchmark **driver** (verification tooling, like `detect-demo`) — never a generation change. No AI. Commit to `main`.

---

## 4. REPORT — done-conditions (the Phase-1 CERTIFICATION)

[`eco-day-20-report.md`](eco-day-20-report.md) — the Phase-1 certification, modelled on the Day-10 format:

**(a) The benchmark result** — DC-1..DC-5 with the actual digests + the actual real-machine detection result.

**(b) The PHASE-1 CERTIFICATION TABLE** — each Phase-1 capability at its **proven level** + a **proof location**:

| Phase-1 capability | Proven level | Proof location |
|---|---|---|
| Framework+version as a first-class pinned input | default pins == frozen matrix (literal bypass); non-default → own byte-identical baselines | [Day 11](eco-day-11-report.md); `day20:regress` PART 1g (5 version baselines) |
| Org-policy allow/ban layer (pure input-shaping) | profile-absent == frozen (bypass); profile shapes options/defaults deterministically; **no metadata in output** | [Day 13](eco-day-13-report.md); PART 1h + PART 1i (b) |
| Progressive-disclosure wizard + canonical `assembleBlueprint` (UI==CLI STRUCTURAL) | simple-mode == frozen (bypass); UI path == CLI path byte-identical (default + non-default) | [Day 16](eco-day-16-report.md); PART 1i |
| Toolchain detect-and-guide (dev-surface) | pure core fixture-tested (CI); live probe honest on this box; **no feedback into generation** | [Day 18](eco-day-18-report.md); PART 1j + `GET /api/detect` |
| The literal bypasses (simple-mode / profile-absent / default pins) | each reproduces its frozen hash | PART 1g/1h/1i; DC-3 |
| **The end-to-end benchmark** (wizard→policy→pin→generate byte-identical→detect→guide) | one working stack, byte-identical + honest detection | **Day 20 DC-2** |

**(c) Honest boundaries carried forward (every one — a strengths list without an equal limitations list is an overclaim, §4):**
- **The shell-side Rust `detect_toolchains` command is PENDING** — the dev-surface `GET /api/detect` is wired + certified; the **packaged-path** (Tauri shell-side, capability mediation is shell-side) is **flagged, not built** (from Day 18).
- **Determinism ≠ validity** — detection reports **environment facts** (whether the machine CAN build the deterministically-generated project); it does **NOT** prove the project builds/boots. Never blur "detection passed" into "the project builds."
- **macOS/Linux live-probe reasoned, NOT run** — the live detection was exercised on **Windows** only; the CI-enforced piece is the deterministic PART 1j fixture.
- **Deferred ancillary infra pins** — maven/nginx/alpine (and similar fixed infra images) are **not** first-class pinned inputs (from Day 11).
- **v0.1 generation limitations still stand** (carried from Phase 0 / `CAPABILITIES.md`) — `has-many` records no schema, `DECIMAL` unexercised, the mixed-key FK seam, cross-depth switching, MySQL live-boot coverage. **Phase 1 added no generation features, so none changed.**
- **Cross-OS byte-identity is CI-ENFORCED but the 3-OS-green is USER-CONFIRMED** (this shell can't observe GitHub Actions — same as Day-10 DC-3).
- **The Tauri/sidecar cross-OS BUILD is still DEFERRED** — only the **Windows** desktop build is proven (from Phase 0); macOS/Linux *desktop* builds untested. **macOS *generation* determinism IS CI-proven; the macOS *desktop build* is NOT** (do not blur).
- **Code signing → Phase 4** (installers unsigned).

**(d) Phase-1 → Phase-2/Month-2 handoff.** **Solid ground for Month 2:** governed INPUTS (framework+version pins, org-policy) + a progressive-disclosure wizard that is a **faithful front-end** (UI==CLI structural, one canonical `assembleBlueprint` seam) + toolchain detect-and-guide — all with default/empty paths as **literal bypasses** reproducing the frozen backstop, **cross-OS CI-enforced**. **Phase 2** (creative-plug/slot system + depth — `has-many`/`decimal`·`money`/field-key consistency) builds on the canonical `assembleBlueprint` seam; its rule stays the same: **typed slots produce a byte-identical shell regardless of fill; the AI fill is default-off, detachable, developer-keyed; the depth features produce NEW frozen baselines across all stacks.**

**(e) Verdict.** **Phase 1 certified** — governed inputs (framework+version, org-policy) + a progressive-disclosure wizard that's a faithful front-end (UI==CLI structural) + toolchain detect-and-guide, all with default/empty paths as literal bypasses reproducing the frozen backstop, cross-OS CI-enforced. Generator pure-Node, no frozen hash moved. **Month 2 begins (Phase 2 — creative-plug + depth).**

---

## 5. SCOPE GUARD — OUT for Day 20

- **NO** new features/stacks/types/integrations (certification only).
- **NO** signing (Phase 4); **NO** macOS/Linux desktop builds; **NO** shell-side Rust detect command (flagged pending — certify the dev-surface as done, carry the packaged path forward honestly).
- **NO frozen hash moved** (a moved hash = STOP-and-report finding).
- Do **NOT** re-do Days 11–18 — **VERIFY** it holds and **CERTIFY**.
- The only permissible artifact beyond the report: a composition-only benchmark **driver** (verification tooling) — never a generation change.

---

## 6. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions

1. Read guardrails + ecosystem (Phase-1 exit / Phase-2 target) + Month-1 Day 20 + the four Phase-1 reports + Day-10 + the real harness/server? — ✅ (this session).
2. Only Day-20's job (certify the Phase-1 stack end-to-end)? — yes; **not** a new feature; verify + document + one composition-only driver at most.
3. Which frozen baselines must NOT move? — **all of them**: the **49 baked** (43 frozen + 5 version + MAXIMAL) **+ the 10 TeamTracker** + the non-hash gates 1c/1e/1h/1i/1j. `day20:regress` byte-identical/green from clean.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — **yes, re-confirmed**: simple-mode wizard, profile-absent, default pins (B3 / PART 1g·1h·1i).
6. Three killers checked? — no output is changed (verification only); detection stays quarantined at the impure edge (0 core refs) — no env value feeds back into generation.
7. A gate that can actually FAIL? — **DC-1** (any moved hash), **DC-2** (the end-to-end benchmark: a non-byte-identical wizard-generate, a metadata leak, or a detection that silently passes a real gap), **DC-4** (UI≠CLI), **DC-5** (a native module / a detection ref in core). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming the benchmark proves the project **builds** (determinism ≠ validity); (ii) claiming the **packaged** detect path is done when only the **dev-surface** is (Rust command pending); (iii) claiming **cross-OS/3-OS** live-detection when only Windows was run / the 3-OS CI is user-confirmed; (iv) a certification-day **thin/faked** proof (worse than an honest red); (v) letting a moved hash be silently re-baselined — all guarded.

---

*Day 20 closes Phase 1 by proving the Days 11–18 stack is ONE working stack: a project generated through the progressive-disclosure wizard with an explicitly pinned, org-policy-checked framework+version is byte-identical (UI==CLI, no policy metadata in output), the app detects this machine's real toolchain gaps (Go/Maven missing, Java 20≠21, Python 3.14≠3.12) and guides with official links + the container path, and every default/empty path is a literal bypass reproducing the frozen backstop (49 baked + 10 TeamTracker + the non-hash gates), cross-OS CI-enforced. It moves no frozen hash and adds no generation feature. The boundaries are carried forward precisely — the shell-side Rust detect command is pending, determinism ≠ validity, macOS/Linux live-probe reasoned-not-run, the deferred infra pins and v0.1 limits stand, signing is Phase 4, the cross-OS desktop build is still deferred. Phase 1 certifies; Month 2 (Phase 2 — creative-plug + depth) begins.*
