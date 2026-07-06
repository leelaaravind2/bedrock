# Eco-Day 18 — PLAN: Toolchain detect-and-guide service `[2 days]`

**Phase 1, Day 18. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 18 is the honest **"one install"** story: **DETECT** what a generated project needs on the developer's machine, **GUIDE** if missing/mismatched, and **OFFER THE CONTAINER-BUILD PATH** (the generated project already ships a version-pinned Dockerfile + compose). **`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §2 (the "one install" story), §4 (architecture — *capability/permission mediation is shell-side*; *Toolchains: detect-and-guide, never bundle; offer the Docker/Podman container-build path*), §6 (bundling heavy toolchains is out of scope) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 18 (lines 90-93) → [`eco-day-11-report.md`](eco-day-11-report.md) (the framework+version PINS detection compares against) → the REAL model/shell (read this session).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read, not assumed):**
> - **The pins live in two places, both readable:** `generator/src/core/versions.ts` (`DEFAULT_VERSIONS` per backend) and, per-project, the blueprint's `ProjectState.versions` (Day 11). The **Day-16 server holds the current model** (`model.getVersions()` / `model.getSetting('backend')`) via `POST /api/assemble` — so a detection route can read the **actual blueprint pin**, not just the registry default.
> - **All 5 stacks already emit a version-pinned Dockerfile + `docker-compose.yml`** (`generator/plugins/{spring,express,python,django,go}/templates/…Dockerfile` — tokens `__JAVA_VERSION__`/`__NODE_VERSION__`/`__PYTHON_VERSION__`/`__GO_VERSION__` substituted from the pins). **The container-build escape hatch is real**: a user needs only docker/podman, not N native toolchains.
> - **The shell can already spawn processes:** `desktop/src-tauri/src/lib.rs` uses `tauri_plugin_shell` (`handle.shell().sidecar("node")…output().await`) and Rust `std::process` is available — process-spawning is a proven shell capability. **Capability mediation is shell-side (§4).**
> - **The framework-version pins are BUILD-RESOLVED DEPENDENCIES, not machine toolchains:** `springBoot`/`express`/`fastapi`/`django` versions live in `pom.xml`/`package.json`/`requirements.txt` and are fetched by maven/npm/pip from the manifest. **Detection must NOT claim to "detect a framework version" on the machine** — it probes the **runtimes/build-tools/container** the machine must PROVIDE (java/node/python/go, maven/pip, docker/podman) and compares the **runtime** pins. (Honesty §4 — §3.3 below.)
> - **No detection/probe code exists yet** (`grep` for detect/toolchain/child_process in `generator/src` + `desktop/src-tauri/src` → none) — so Day 18 is **genuinely additive**.

---

## 0. What Day 18 is — and why it's a DIFFERENT KIND of day

Days 11/13/16 changed or governed the *input*. **Day 18 is the FIRST day that is NOT a generation change** — it's a **DETECTION + GUIDANCE layer** that probes the developer's machine and reports. It does **not** touch `buildFileSet`, the plugins, the model, or the templates. So the determinism risk is **low BY NATURE** (detection reads the environment; generation is untouched). The two real disciplines:

- **(a) Keep it a pure detection layer that moves NO frozen hash.** Additive; the frozen 49 reproduce byte-identical.
- **(b) Hold the determinism-≠-validity line precisely.** Detection tells the user whether their machine **CAN build** what was deterministically generated — it does **not** make the project "valid" and it never feeds an env value back into generation.

---

## 1. The three determinism + honesty requirements (LOAD-BEARING — the plan makes them explicit)

1. **DETECTION LAYER — moves NO frozen hash.** Day 18 adds a probe/guidance service, not a generation change. **Proof (execute):** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS, all **49** byte-identical (43 + 10 + MAXIMAL + 5 version). `buildFileSet`/plugins/model/templates untouched. A moved hash = a **finding, STOP** (it would mean detection leaked into generation) — never a re-baseline.
2. **DETERMINISM ≠ VALIDITY — Day 18 BRIDGES them; the line stays precise.** Thraksha *generates* a deterministic project (proven, byte-identical). Whether the user's *machine* can *build/boot* it is a **separate** question — that is what detection answers. **Detection reports FACTS about the environment** (what's installed, what version). It does **NOT** claim the generated project is "valid"/"correct"/"proven to build" — a present, matching toolchain means the machine **CAN attempt** the build, not that the build **will** succeed. Do **not** blur "detection passed" into "the project builds."
3. **Detection is env-dependent (non-deterministic) — and that's FINE — but it NEVER feeds back into generation.** Probing a machine yields different results on different machines; that is *reading reality*, not generating. The load-bearing rule: **no env-detected value ever becomes a generation input** (that would inject nondeterminism into output). Detection **INFORMS** the user; it never mutates the blueprint or the generated files. *(Contrast Day-11 "latest" → resolve-then-pin a CONCRETE value into the blueprint BEFORE generation = deterministic. A live env-probe result must NEVER become a generation input.)*

---

## 2. THE ARCHITECTURAL RECOMMENDATION — a pure detection CORE + an impure probe EDGE (determinism structurally safe)

Split detection into two layers so determinism is protected **by construction**:

- **The pure detection CORE (deterministic, fixture-testable, no live machine):** pure functions over strings —
  - `requiredToolchains(backend, projectType, frontend) → ToolReq[]` — the toolchains a project needs (§3.2 mapping), each `{ tool, pinKey? }`.
  - `parseVersion(tool, rawStdout, rawStderr) → string | null` — per-tool version extraction (handles the **stdout-vs-stderr** gotchas, §3.1).
  - `compareToPin(detected, pin, semantics) → 'present' | 'missing' | 'mismatch'` — the comparison heuristic (§3.3).
  - `guidanceFor(tool) → { message, installUrl }` — the **static** official-install catalog (§3.5).
  - `containerOffer(hasDocker, hasPodman) → { message }` — the escape-hatch text (§3.4).
  These are **pure** (same inputs → same output), so they are **unit-tested with FIXTURE probe outputs** (canned `java -version`/`go version`/… strings) — deterministic, no toolchain required to test. This is the **load-bearing testable deliverable**, and it reuses the Day-11 pins from `versions.ts`.

- **The impure probe EDGE (environment-facing, OUTSIDE the deterministic core):** the thin layer that actually **spawns** the probes and hands their raw output to the pure core. This edge lives at an **already-impure I/O boundary — NEVER in `buildFileSet`/plugins/model**:
  - **Dev surface (recommended primary for `[2 days]`):** a `GET /api/detect` route in `generator/src/server.ts` (the Day-16 wizard's own server — already impure: `node:http`/`node:fs`; adding `node:child_process`, a builtin, keeps **ZERO third-party deps / no native module**). It reads the current `model.getVersions()` + backend (Day-16 `/api/assemble`), spawns the probes, runs the pure core, returns the report to the wizard UI. **Fully testable on this dev machine now.**
  - **Packaged path (architecturally-correct home; flag honestly):** a Tauri **shell-side** Rust `#[tauri::command] detect_toolchains(reqs) → report` (capability mediation is shell-side, §4 — the same precedent as SQLite-is-shell-side). Same report contract; the pure comparison logic mirrored (or the Rust command shells the same probes and applies the same semantics). **Note:** whether Stage 2 completes the Rust command or only specs it is a `[2 days]` honesty call (§4) — the dev-surface route is the proof the Gate needs; the Rust command is flagged for when the shell hosts the wizard.

  **Why the split is determinism-safe:** the probe edge has **no write-path back to the blueprint** — it only reads the machine + the (passed-in) pin and returns a report object to the UI. `buildFileSet` never sees a probe result. So requirement (3) holds **by construction**.

---

## 3. What the plan resolves (answered by reading the real model/shell — §"Grounded" above)

### 3.1 WHERE detection runs + the cross-OS / capture reality
- **Runs at the impure edge** (server route now; Rust shell command for the packaged path) — **never** in the pure core, **never** in `buildFileSet`.
- **Cross-OS note (probes differ per OS):** executable names (`java` vs `java.exe`), PATH lookup, shells, and Docker Desktop vs a raw `docker` CLI differ across Windows/macOS/Linux. **The dev machine is Windows** — execute must report what was **actually tested there** (§6 honesty), not assume Linux/macOS behavior.
- **Capture gotcha (a real detection-heuristic detail, not a determinism concern):** `java -version` writes to **STDERR** (classic); `node --version`, `go version`, `python --version` (Py3), `docker --version`/`docker info` write to **stdout**. The pure `parseVersion` takes BOTH streams so the edge doesn't have to guess. A tool **not on PATH** → spawn error → `missing` (never a crash, never a silent pass).

### 3.2 HOW it gets the pins to compare (ties Day 18 → Day 11)
- The edge reads the **actual blueprint pins** from `ProjectState.versions` (`model.getVersions()`) + `backend`. For a default project the pin == `DEFAULT_VERSIONS[backend]`; for a Day-11 non-default pick it's the chosen concrete pin. **Detection compares the machine against the project's real pin.**
- `requiredToolchains` mapping (confirm against the real generated file set in execute):
  - **Spring Boot** → `java` (pin `versions.java`), `maven` (build tool; **no pin** — `maven:3.9` is a fixed infra constant per Day-11 §, so present/missing only), `node` (pin `versions.node`) **when the project has a React frontend**.
  - **Express** → `node` (pin `versions.node`).
  - **FastAPI / Django** → `python` (pin `versions.python`), `pip` (present/missing).
  - **Go** → `go` (pin `versions.go`).
  - **All stacks** → `docker` **or** `podman` (the container path, §3.4).

### 3.3 Version COMPARISON semantics (a heuristic — NOT a determinism concern)
- **Runtimes compare by the pinned granularity:** `java 21` → **major** match (machine `21.0.5` = present; `20` = mismatch); `node 22` → **major**; `python 3.12` → **major.minor**; `go 1.22` → **major.minor**. State this table explicitly; it's a detection heuristic, tunable, and honestly imperfect (e.g. it does not judge patch-level compatibility).
- **Framework-version pins are NOT machine probes (honesty §4).** `springBoot`/`express`/`fastapi`/`django` are **dependencies resolved by the build** (maven/npm/pip) from the pinned manifest — detection does **not** probe them on the machine. Detection covers what the machine must **PROVIDE** (runtimes + build tools + container), not what the build **fetches**. The plan/report must say this precisely and never claim to "detect FastAPI 0.115.6 on the machine."

### 3.4 The CONTAINER-BUILD path (confirmed real)
- Every stack ships a **version-pinned `Dockerfile` + `docker-compose.yml`** (grounded above). So the honest offer when a native runtime is missing/mismatched: **"You don't need N native toolchains — just a container runtime. `docker compose up` builds & runs using the pinned Dockerfile we generated."**
- The offer itself is gated on a probe: **detect `docker` or `podman`**; if present → recommend the container path as the zero-native-toolchain route; if absent → guide to Docker/Podman install. **The container path needs the pinned Dockerfile (already generated) + a container runtime — nothing else.**

### 3.5 The GUIDANCE content (static — no network calls)
- Missing/mismatch → a **clear message + the official install link**, **never a silent failure**. Static catalog (no network needed for the links):
  - Java → **Adoptium/Temurin** (`https://adoptium.net`), Node → `https://nodejs.org`, Python → `https://www.python.org/downloads`, Go → `https://go.dev/dl`, Docker → `https://docs.docker.com/get-docker`, Podman → `https://podman.io`, Maven → `https://maven.apache.org/download.cgi`.
- Message shape (define in execute): `present` (green, detected version), `mismatch` (detected X, pinned Y, link + the container alternative), `missing` (not found, link + the container alternative).

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."** cargo-on-PATH (`export PATH="$HOME/.cargo/bin:$PATH"`) only if the Rust command path is attempted.

### Stage 1 — the pure detection CORE + the no-generation-change gate (load-bearing, testable without a live machine)
- **DC-1:** the pure detection core — `requiredToolchains` (§3.2), `parseVersion` (§3.1 incl. stdout/stderr), `compareToPin` (§3.3 semantics), `guidanceFor`/`containerOffer` (§3.4/3.5) — as pure functions reading the Day-11 pins from `versions.ts`. Non-generation tool module (like the harness/gates), **outside `buildFileSet`**.
- **DC-2:** **fixture tests** — canned probe outputs (real-shaped `java -version` on stderr, `go version`, `node --version`, `python --version`, `docker --version`, plus a "not on PATH"/missing case and a mismatch case) → assert present/missing/mismatch + the right guidance/link + the container offer. Deterministic, no toolchain needed.
- **DC-3 (NO GENERATION CHANGE, load-bearing):** `rm -rf dist && npm run build && npm run day20:regress` → **PASS, 49 byte-identical.** The detection module is additive; `buildFileSet`/plugins/model/templates untouched; **no env value feeds back**. A moved hash = a finding, STOP.

### Stage 2 — the live probe EDGE + guidance surface + the container offer
- **DC-4:** the impure edge — the Day-16 server `GET /api/detect` (reads `model.getVersions()`+backend, spawns the real probes, runs the pure core) returning the report; the wizard **surfaces** present/missing/mismatch + link + the container offer to the user. (Flag the Tauri Rust command as the packaged-path equivalent — completed or spec'd per the `[2 days]` honesty call.)
- **DC-5:** **honest real-machine detection** — run it on THIS dev machine and record what was **actually** found (Java/Node/Python/Go/Docker present-or-not + versions vs the pins), and demonstrate a **missing/mismatch** case (e.g. a pin the machine doesn't satisfy, or a tool not installed) → message + link + container offer. **Never silently fail.** Report what was tested vs assumed (esp. cross-OS: Windows tested, macOS/Linux reasoned).
- **DC-6 (invariants):** generator still **pure-Node** (ZERO third-party deps; `child_process` is a builtin; no native module in the generator); **no frozen hash moved**; **no env-detected value in the blueprint/output** (detection has no write-path back — verify the report object never reaches `assembleBlueprint`/`buildFileSet`).

**Execute scope guard (every stage):** just the detection + guidance layer + the container offer; **NOT** a generation change; **NOT** auto-installing anything (guide with links, never install for the user); **NOT** new stacks/types. **No frozen hash moves** (a moved hash is a finding, STOP). **No env value feeds back into generation.** No AI. No signing. Commit to `main`. Don't compress the 2 days — if probes + guidance + container-path + the Rust command need multiple passes, stage honestly.

---

## 5. REPORT — done-conditions

[`eco-day-18-report.md`](eco-day-18-report.md): the detection layer (the probes per toolchain, WHERE it runs — dev-surface server route vs the shell-side Rust command — and the **cross-OS note**); the **compare-vs-pin** semantics (§3.3, incl. the honesty that framework-version pins are build-resolved deps, not machine probes); the **guidance** (official links + missing/mismatch messages + the **container-build escape hatch**, with the confirmation that the generated projects already ship pinned Dockerfiles); the **NO-GENERATION-CHANGE proof** (frozen 49 byte-identical; no env value feeds back); the **determinism-≠-validity framing** (detection informs whether the machine CAN build the deterministically-generated project — it never mutates the blueprint or claims the project builds); **invariants** (pure-Node, no frozen hash moved, no env value in the blueprint/output). **Forward-flags:** `[2 days]` scope status (done vs pending — e.g. the Tauri Rust command completed or flagged); **what real machine-detection was actually TESTED vs assumed** (be honest — this Windows dev box's actual Java/Node/Python/Go/Docker present-or-not, and that macOS/Linux probes were reasoned not run); **determinism ≠ validity** restated (detection ≠ a build guarantee); what **Day 20** picks up (Phase-1 close/benchmark — a project generated through the wizard with a pinned + policy-checked framework+version, the app detects a missing toolchain and guides, default paths reproduce the frozen hashes).

---

## 6. Pre-flight checklist (GUARDRAILS §6) — for the execute sessions
1. Read guardrails + ecosystem §2/§4/§6 + Month-1 Day 18 + eco-11 + the real model/shell? — ✅ (this session).
2. Only Day-18's job (detect-and-guide + container offer)? — yes; **not** a generation change, **not** auto-install, **not** new stacks (Day 20 is the benchmark).
3. Which frozen baselines must NOT move? — **all 49** (43 + 10 + MAXIMAL + 5 version). Detection is additive; `buildFileSet` untouched. `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — **N/A in the generation sense** (there is NO generation change); the equivalent guarantee is **additive detection = the frozen 49 unchanged**, and **detection-absent/failed → the generator still generates** (detection only INFORMS; it's not in the path).
6. Three killers checked? — no clock/RNG/UUID enters OUTPUT (detection touches no output); the env-probe is non-deterministic **by nature** and is quarantined at the impure edge — **its result never becomes a generation input** (the #1 discipline this day).
7. A gate that can actually FAIL? — **DC-3** (frozen 49 byte-identical — a moved hash means detection leaked into generation) + **DC-2** (fixture tests: wrong parse/compare/guidance fails) + **DC-5** (a real missing/mismatch must surface a link, never silently pass).
8. Overclaim / scope drift? — the live risks: (i) blurring "detection passed" into "the project builds" (determinism ≠ validity — §1.2); (ii) claiming to "detect" a **framework-version dep** on the machine when it's build-resolved (§3.3); (iii) an env value sneaking into the blueprint/output (§1.3 — must have no write-path back); (iv) claiming cross-OS coverage when only Windows was tested (§6 honesty); (v) drifting toward **bundling** a toolchain (out of scope §5) — all guarded.

---

*Day 18 tells the honest "one install" truth: it DETECTS the runtimes/build-tools/container a generated project needs, COMPARES them against the blueprint's Day-11 pins, and GUIDES (clear message + official link, never a silent failure) — offering the container-build escape hatch since every stack already ships a version-pinned Dockerfile. It is a pure detection CORE (fixture-testable, reading the pins) behind an impure probe EDGE (a server route now; a shell-side Rust command for the packaged path), quarantined so no env value ever reaches generation. It changes no generated byte — the frozen 49 reproduce byte-identical — and it holds the determinism-≠-validity line precisely: detection reports whether the machine CAN build the deterministically-generated project; it never claims the project builds, and it never mutates the blueprint. Day 20 closes Phase 1 with the benchmark.*
