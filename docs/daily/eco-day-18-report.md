# Eco-Day 18 — REPORT: Toolchain detect-and-guide service `[2 days]`

**Phase 1, Day 18.** The honest **"one install"** story lands: a **DETECTION + GUIDANCE** layer that probes the developer's machine for the toolchains a generated project needs, compares them against the blueprint's **Day-11 pins**, guides (clear message + official install link — never a silent failure), and offers the **container-build escape hatch** (every stack already ships a version-pinned Dockerfile). **This is the FIRST day that is NOT a generation change** — it adds a probe/guidance service; it moves **NO frozen hash** and feeds **NO env value back into generation.**

Plan: [`eco-day-18-plan.md`](eco-day-18-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§3 the one line; §4 honesty — determinism ≠ validity; never overclaim). Builds on [`eco-day-11-report.md`](eco-day-11-report.md) (the pins it compares against) and [`eco-day-16-report.md`](eco-day-16-report.md) (the server holds the current blueprint via `/api/assemble`).

---

## THE VERDICT

> ✅ **A pure detection CORE (`requiredToolchains` / `parseVersion` / `compareToPin` / `guidanceFor` / `containerOffer` / `buildReport`) behind an impure probe EDGE (`detect/probe.ts`; the Day-16 server `GET /api/detect`; a shell-side Rust command flagged for the packaged path).** It probes the **machine toolchains** a project needs (java/maven/node/python/pip/go + docker/podman), compares runtimes against the blueprint's Day-11 pins, and reports **present / missing / mismatch** + install links + the container offer. It is **ADDITIVE**: the frozen **49** reproduce byte-identical from clean (`day20:regress` PASS); the detection module is **not imported by `buildFileSet`/plugins/model** (0 refs — verified), so **no env-detected value has any write-path into generation.** The pure core is **fixture-tested** (day20 PART 1j — CI-enforced, no live machine) and was **run LIVE on this Windows box** (a genuinely honest, diverse result — §6). Generator still **pure-Node** (`deps {}`, 0 native modules).
>
> **Determinism ≠ validity, held precisely:** detection reports whether the MACHINE can build the deterministically-generated project — it never claims the project itself builds/boots. **Day 20 = Phase-1 close/benchmark.**

---

## 1. Why Day 18 is a different kind of day (and the determinism spine)

Days 11/13/16 changed or governed the *input*. Day 18 is a **detection layer** — it reads the environment and INFORMS. Its determinism risk is low **by nature**, but three lines are load-bearing and were held:

1. **DETECTION MOVES NO FROZEN HASH.** Additive; `buildFileSet` untouched. **Proof:** `rm -rf dist && npm run build && npm run day20:regress` from clean → **PASS, all 49 byte-identical** (43 + 10 + MAXIMAL + 5 version). **No frozen hash moved.**
2. **NO ENV VALUE FEEDS BACK INTO GENERATION.** A `DetectionReport` has **no write-path** to the blueprint — it is SHOWN by the wizard; it never reaches `assembleBlueprint`/`buildFileSet`. **Structurally verified:** `grep` for detection imports in `src/core` + `src/plugins` → **0** (the dependency arrow points ONLY detection→core, never core→detection). *(Contrast Day-11 resolve-then-pin: a CONCRETE value written into the blueprint BEFORE generation is deterministic; a live env-probe result must NEVER become a generation input — and here it cannot.)*
3. **DETERMINISM ≠ VALIDITY.** Detection reports FACTS about the environment. "All present" (a heuristic `canBuildNatively`) means the machine **CAN attempt** the build — **not** that the project **will** build/boot. The caveat is carried in the report itself (`summary.note`).

---

## 2. The pure detection CORE (DC-1) — `generator/src/detect/detect-core.ts`

Plain, deterministic functions over strings (no spawning, no env read):

- **`requiredToolchains(state) → ToolReq[]`** — the MACHINE tools a stack needs, each carrying the blueprint's pin for runtimes:
  - Spring Boot → `java` (pin `versions.java`), `maven` (presence-only — `maven:3.9` is a fixed infra image), `node` (pin `versions.node`, **when the project has a React frontend**); Express → `node`; FastAPI/Django → `python` (pin `versions.python`) + `pip`; Go → `go` (pin `versions.go`); **all** → `docker`/`podman` (the container path).
- **`parseVersion(tool, rawStdout, rawStderr) → string|null`** — per-tool extraction that takes **BOTH streams** (so `java -version`, which prints to **STDERR**, parses correctly — the classic gotcha).
- **`compareToPin(detected, pin) → present|missing|mismatch`** — the compare granularity is the **pin's**: a pin `21` compares MAJOR (machine `21.0.5` = present, `20` = mismatch); `3.12`/`1.22` compare MAJOR.MINOR. A **heuristic**, honestly imperfect (no patch-level judgment) — and **not** a determinism concern.
- **`guidanceFor(tool, status, …) → {message, installUrl}|null`** — `present` ⇒ null; `missing`/`mismatch` ⇒ a clear message + the **official install link** (Adoptium/Temurin, nodejs.org, python.org, go.dev, maven.apache.org, docker.com, podman.io) — **never a silent failure**.
- **`containerOffer(dockerPresent, podmanPresent) → ContainerOffer`** — the zero-native-toolchain escape hatch: "build & run with only a container runtime (`docker compose up`) using the pinned Dockerfile Thraksha generated."
- **`buildReport(state, probes) → DetectionReport`** — composes it all; pure over `(state, probes)`.

**TOOLCHAINS ≠ BUILD-DEPENDENCIES (honesty):** `requiredToolchains` emits **only machine tools**. The framework-version pins (`springBoot`/`express`/`fastapi`/`django` in `state.versions`) are **build-resolved dependencies** in `pom.xml`/`package.json`/`requirements.txt` (Maven/npm/pip fetch them) — they are **NEVER probed** and never claimed as "detected on the machine."

## 3. Fixtures (DC-1) — day20 PART 1j, CI-enforced, no live machine

The pure core is asserted over **canned probe outputs** — deterministic, added to `day20:regress` (PART 1j) so it runs on the pre-commit hook + 3-OS CI:
- `requiredToolchains(Spring)` probes java(pin 21)/maven/node/docker/podman — **not** springBoot/express/… (toolchains ≠ build-deps);
- `parseVersion` extracts each shape (incl. `java` on STDERR);
- `compareToPin` present/missing/mismatch by pin granularity;
- `buildReport` → present(java) / mismatch(node + nodejs link) / container-offer(docker); `canBuildNatively=false`; the validity-caveat carried;
- missing java → Adoptium link (never silent); no container runtime → "install Docker or Podman" offer.

## 4. The impure probe EDGE (DC-3) — quarantined at the boundary

- **`generator/src/detect/probe.ts`** — spawns the real probes (`java -version`, `mvn -v`, `node --version`, `python --version`, `pip --version`, `go version`, `docker --version`, `podman --version`) via `node:child_process` (a **builtin** — ZERO third-party deps, no native module), captures BOTH streams, hands the raw output to the pure core. A spawn error (ENOENT / not on PATH) or a 5s timeout resolves as `found:false` ⇒ reported **missing** (never a crash, never a silent pass). `shell:true` is used (needed on Windows so a bare name resolves via PATHEXT to a real `.exe` OR a `.cmd` shim like `mvn.cmd`) and is safe here — the commands + args are **static constants**, no user input.
- **WHERE it runs:** the **Day-16 server `GET /api/detect`** is the dev surface wired this pass — it reads the current blueprint (`model.getState()`, set by `/api/assemble`) so it compares against the **actual** pins. The **shell-side Rust command** (Tauri `tauri_plugin_shell` / `std::process`) is the architecturally-correct **packaged-path** home (capability mediation is shell-side, §4) — **flagged, not wired this pass** (§8).
- **Cross-OS note:** probe availability/behaviour differs per OS (executable names, PATH, Docker Desktop vs a raw CLI). It was **run live on Windows** (§6); macOS/Linux behaviour is **reasoned, not run.**

## 5. The guidance surface (DC-4) — wired into the wizard

The Day-16 Blueprint screen gained a **"Can this machine build it?"** panel with a **Check toolchains** button → `GET /api/detect` → renders, per tool, a present/missing/mismatch badge + detected-vs-pin + (when not present) the message + an **install link**, then the **container-build offer**, then the determinism-≠-validity note. Verified live in the running wizard (Spring blueprint → Java **mismatch** + Adoptium link, Maven **missing** + link, Node **present**, container **available (docker)**). **Never silently fails.**

## 6. The HONEST real-machine test (DC-5) — what THIS Windows box actually has

`npm run detect` ran the **live** probes on this machine (all via `child_process`, no fabrication):

| Stack | Tool | Pin | Detected | Status |
|---|---|---|---|---|
| Spring Boot | java | 21 | **20.0.1** | **mismatch** → Adoptium link |
| Spring Boot | maven | — | not found | **missing** → link |
| Spring Boot | node | 22 | 22.21.0 | present |
| Express | node | 22 | 22.21.0 | present (`canBuildNatively=true`) |
| FastAPI | python | 3.12 | **3.14.0** | **mismatch** → python.org link |
| FastAPI | pip | — | 25.3 | present |
| Go | go | 1.22 | not found | **missing** → go.dev link |
| all | docker | — | 27.x (present) | **container offer available** |

This is a genuinely diverse, honest result — real mismatches (Java 20 vs pin 21; Python 3.14 vs pin 3.12), real missing tools (Maven, Go), and a real container runtime (Docker) that makes the escape-hatch offer truthful. **What ran live:** java/maven/node/python/pip/go/docker/podman probes on **Windows**. **Fixture-only:** the canned-output assertions in PART 1j (deterministic CI). **Reasoned, NOT run:** macOS/Linux probe behaviour.

## 7. Invariants (DC-6)

- **Generator pure-Node:** `dependencies: {}`, **0** native modules (re-checked from clean). `child_process` is a builtin.
- **No frozen hash moved** — all 49 byte-identical from clean.
- **No env-detected value in the blueprint/output** — detection is not imported by `src/core`/`src/plugins` (0 refs); the report has no write-path back. Detection **informs, never mutates.**

---

## 8. What changed

- **New:** `generator/src/detect/detect-core.ts` (the pure core), `generator/src/detect/probe.ts` (the impure edge), `generator/src/detect-demo.ts` (the live real-machine demo, `npm run detect`).
- **Server:** `generator/src/server.ts` (+`GET /api/detect` — reads the current blueprint, runs the live probes, returns the report).
- **UI:** `generator/ui/index.html` (+the "Can this machine build it?" toolchain panel + `checkToolchains`/`renderDetect`).
- **Harness:** `generator/src/day20-regression.ts` (+PART 1j — the pure-core fixtures, CI-enforced).
- **`package.json`:** +`detect` script.
- **Generation core (`project-model`, `regen`, plugins, `versions`, templates) — UNTOUCHED.** No AI, no new deps, no native module, no generated byte changed.

## 9. Forward-flags

- **`[2 days]` scope status:** the detection + guidance layer (pure core + fixtures + live edge + wizard guidance + container offer + the honest real-machine test) is **COMPLETE** on the **dev surface** (`/api/detect`). **PENDING (flagged):** the **shell-side Rust `detect_toolchains` command** for the packaged Tauri path — the architecturally-correct home when the shell hosts the wizard; the report contract + pure-core logic are ready to mirror. The remaining budget is available for it.
- **Determinism ≠ validity (restated):** detection is **not** a build guarantee. A present, matching toolchain can still fail to build for reasons beyond toolchain presence; a running Docker **daemon** (not just the CLI) is a further check the container step surfaces at build time (we probe `docker --version` for CLI presence, not daemon liveness).
- **Toolchains ≠ build-deps (restated):** we probe machine tools, never the framework-version deps the build fetches.
- **Comparison heuristic:** major / major.minor by pin granularity — tunable; it does not judge patch-level or LTS compatibility.
- **Standing:** signing (Phase 4); macOS/Linux live-probe verification (reasoned here).

## 10. What Day 20 picks up

**Phase-1 close / the benchmark** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 20): generate a project through the progressive-disclosure wizard with an explicitly **pinned + policy-checked** framework+version; **the app detects a missing toolchain and guides** (exactly this Day-18 layer — e.g. this machine's missing Go / mismatched Java); default/empty paths reproduce all frozen hashes; cross-OS byte-identical. Phase 1 certified.

---

**Day 18 verdict:** the honest "one install" story is real — a pure detection CORE (probe-parse / compare-vs-pin / guide / container-offer) behind an impure probe EDGE (a server `/api/detect` route now; a shell-side Rust command flagged for the packaged path) that reads THIS machine and reports whether it can build the deterministically-generated project. It probes machine toolchains (never the build-resolved framework deps), compares runtimes against the Day-11 pins with an honest heuristic, guides with official links (never a silent failure), and offers the container escape hatch since every stack already ships a version-pinned Dockerfile. It changed no generated byte (the frozen 49 reproduce byte-identical), and no env-detected value has any write-path into generation (detection is not imported by the core — it informs, never mutates). Run live on this Windows box it honestly surfaced Java 20≠21, Python 3.14≠3.12, missing Maven/Go, and a usable Docker. The determinism-≠-validity line held precisely. **Day 20 closes Phase 1 with the benchmark.**
