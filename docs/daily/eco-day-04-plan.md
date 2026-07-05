# Eco-Day 04 — PLAN (Session 1 of 3): Tauri v2 shell skeleton

**Phase 0, Day 4. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no scaffolding, no installs, no file changes except this plan. Day 4 is the **first build day**: the risk profile shifts from *protecting what exists* to *building new surface*. The deliverable is a **Tauri v2 shell SKELETON only** — a minimal desktop app that opens a window and loads a placeholder UI, building/packaging on this machine. **No generator wiring** (that's Day 5, the sidecar). **No features.** The generator and its frozen backstop are **not touched** — Day 4 adds a new, separate shell layer.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§4 honesty, §5 scope) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 (the Tauri shell + Node sidecar; the shell *mediates*, the deterministic core is *untouched*) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 4 (skeleton) + Day 5 (sidecar, later) → [`eco-day-02-report.md`](eco-day-02-report.md) (Phase-0 state: determinism proven Windows==Linux; the forward-flags) → the actual repo layout (done this session).

> **Grounded this session:** repo top level is `.claude/ .thraksha/ Design/ docs/ generator/ output/ scratch/` — **no shell dir exists yet**. A read-only prerequisite probe was run to make this plan concrete (Session 2 re-runs it as the authoritative gate). Preliminary result (§1): **Rust is NOT installed**, the **Tauri CLI is absent**, **MSVC build tools appear absent**, but **WebView2 IS present**. So the realistic Day-4 path is a **STOP-and-guide at the probe** — designed as the primary branch below.

---

## 0. Architecture placement (why this is safe to build)

Per ECOSYSTEM-PLAN §4, the desktop shell is the **outermost layer** — it mediates input and (later) invokes the deterministic core as a bundled sidecar. The core "no network / no AI / no clock" generator is a **separate box** the shell talks to; it is never modified to accommodate the shell. Day 4 builds only the empty shell box. **This is the literal-bypass principle at the project level:** adding the shell changes nothing about generation — `day20:regress` stays byte-identical because the shell touches no generator file.

---

## 1. STEP ZERO — THE PREREQUISITE PROBE (the plan's first and most important job)

Tauri v2's shell is **Rust**, which Day 0's inventory never checked (Node/Docker/Java/Python/Go only). **Session 2's FIRST action is a read-only prerequisite probe. Everything else is gated on it.** Installing system toolchains is a **USER action** — the session must NOT install Rust or build-tools silently. This is the honest detect-and-guide pattern applied to Thraksha's *own* build prerequisites.

### 1.1 What the probe checks (and how — avoiding the MinGW red herring)
| Prerequisite | Probe | "Present" looks like |
|---|---|---|
| **Rust** | `rustc --version`, `cargo --version`, `rustup --version` | all three report versions |
| **Tauri CLI** | is `@tauri-apps/cli` an npm devDep, or `cargo tauri`/`npm exec tauri` available? | resolvable (it will be *added* as a devDep, not required pre-installed) |
| **WebView2 runtime** (Win) | registry query `HKLM\…\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}` `pv` (and HKCU) | a version string (Win 11 ships it) |
| **MSVC C++ build tools** (Win) | **`vswhere.exe`** at `C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe` with `-requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64` | vswhere lists a VS/BuildTools install with the VC++ component |

> **Probe design warning (learned this session):** do **not** test the MSVC linker with `which link.exe` — Git-for-Windows ships its own `/usr/bin/link.exe`, a false positive. Use **`vswhere`** (or `rustup show` / a trial `cargo build` once Rust is in) to detect the real MSVC toolchain. Likewise `cl.exe` is only on PATH inside a VS developer prompt.

### 1.2 Preliminary result this session (Session 2 confirms authoritatively)
- **Rust — ABSENT** (`rustc`/`cargo`/`rustup` all "command not found").
- **Tauri CLI — absent** (and cargo missing regardless).
- **WebView2 — PRESENT** (`pv = 149.0.4022.98`). ✅ one less thing.
- **MSVC build tools — APPEAR ABSENT** (`vswhere.exe` not present → likely no Visual Studio / Build Tools). The `/usr/bin/link.exe` seen is Git's, not MSVC.

### 1.3 THE STOP-AND-GUIDE PROTOCOL (the most likely Day-4 outcome)
**If Rust or the MSVC build tools are absent, Session 2 STOPS at the probe** — no shell scaffolding this session — and reports "these must be installed by the user before the shell can be built," with the official steps:

1. **Rust** — install via **rustup**: `winget install Rustlang.Rustup` (or the `rustup-init.exe` from <https://rustup.rs>). Default Windows toolchain is `stable-x86_64-pc-windows-msvc` (the Tauri-recommended target). *(Do NOT silently switch to the `-gnu` toolchain to dodge the MSVC install — MSVC is the supported Windows target; the GNU workaround is not the honest path.)*
2. **MSVC C++ build tools** — **Visual Studio Build Tools 2022** with the **"Desktop development with C++"** workload (provides MSVC v143 + the Windows 11 SDK, which the Rust MSVC toolchain links against): `winget install Microsoft.VisualStudio.2022.BuildTools` (then select the C++ workload) or the installer from <https://visualstudio.microsoft.com/downloads/> → "Build Tools for Visual Studio".
3. **WebView2** — already present; no action.
4. **Tauri CLI** — *not* a user install; Session 2 adds `@tauri-apps/cli` as a devDep in the shell dir once Rust/MSVC are in.

**This STOP is a legitimate, complete Day-4 result** (GUARDRAILS §4): the finding is "the machine cannot yet build a Tauri shell; here is exactly what to install." Day 4 then **resumes** (re-run Session 2) once the user confirms the toolchain is installed. The plan below (§2–§4) is what Session 2 executes **when the probe passes** — either now (if the user installs first) or on resume.

---

## 2. WHERE THE SHELL LIVES — a new top-level `desktop/`, separate from `generator/`

- **Decision: a new top-level directory `desktop/`** (sibling to `generator/`, `docs/`, `output/`). It is a **distinct layer** per architecture §4 — the deterministic core in `generator/` is not touched, not imported, not moved.
- Internal layout (Tauri v2 convention):
  - `desktop/src-tauri/` — the Rust shell (`Cargo.toml`, `tauri.conf.json`, `src/main.rs`, `icons/`, `build.rs`).
  - `desktop/ui/` (or `desktop/src/`) — the **static placeholder frontend** (a single `index.html`).
  - `desktop/package.json` — the Tauri CLI devDep (`@tauri-apps/cli`) + `dev`/`build` scripts. **Isolated** from `generator/package.json` (no shared deps, no workspace coupling for now).
- **Rationale:** clean seam, easy to reason about "delete `desktop/` → the generator is exactly as before," and it keeps the determinism backstop obviously unaffected.

---

## 3. THE SKELETON DESIGN (execute when the probe passes)

Minimal and boring on purpose — a window that opens and says the app name. **No functionality, no real UI, no generator calls.**

- **Scaffold:** use the official Tauri v2 path — `npm create tauri-app@latest` (Node is present) targeting `desktop/`, choosing the **vanilla / no-framework** template (or hand-write the minimal files), so the frontend is a **static `index.html`** with **no JS framework and no frontend build step**. Configure `tauri.conf.json` with `build.frontendDist` pointing at the static `ui/` dir and no `beforeDevCommand` (nothing to compile on the frontend side).
- **The placeholder page:** `desktop/ui/index.html` — literally a heading like "Thraksha" (+ maybe "Desktop shell — skeleton, no functionality yet"). No scripts, no styling beyond trivial. This is the "loads a placeholder UI" requirement, nothing more.
- **App identity:** set a name/identifier in `tauri.conf.json` (e.g. `productName: "Thraksha"`, a reverse-DNS `identifier`). Default window size; default menu. No plugins, no capabilities beyond the default.
- **Node pin:** the shell's own tooling runs on the already-confirmed Node 22.

---

## 4. SESSION 2 (EXECUTE) — done-conditions

Put at the top of the Session-2 prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails"** — and here, **stop at the probe if prerequisites are missing.**

### DC-1 — The prerequisite probe RUN; result recorded (the gate)
- Run the §1.1 probe authoritatively. Record each result.
- **If Rust or MSVC build tools are absent → STOP.** Write the finding + the §1.3 install steps into the Session-2 notes. **No shell work this session.** DC-2..DC-3 do not apply until resolved; jump to DC-4 (confirm backstop still green — trivially true since nothing was built) and hand the "install these, then resume" finding to Session 3.

### DC-2 — Scaffold the minimal Tauri v2 app (only if the probe passes)
- Create `desktop/` per §2–§3: Rust shell + static placeholder `index.html`, Tauri CLI as a devDep, isolated `package.json`. Nothing under `generator/` is created, moved, or edited.

### DC-3 — Prove it BUILDS and OPENS on Windows
- **Dev:** `tauri dev` (via `npm run tauri dev` in `desktop/`) opens a window showing the placeholder page. *(Note: the first `cargo build` compiles the full Rust dependency tree — expect it to be slow the first time; that's normal, not a hang.)*
- **Packaged:** `tauri build` produces a bundled installer/executable (e.g. an `.msi`/`.exe` under `desktop/src-tauri/target/release/bundle/…`) that opens to the same placeholder. **Dev build is sufficient for Day 4; a successful packaged build is the stronger proof if it completes.** **No code signing** (Phase 4) — an unsigned dev/build artifact is fine; note SmartScreen may warn.

### DC-4 — Confirm the frozen backstop is UNTOUCHED
- `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 43+10 byte-identical, MAXIMAL twice-identical.** The shell is a separate layer; adding it must change nothing about generation (project-level literal bypass). Confirm no file under `generator/` was modified and no frozen hash moved.

**Session 2 scope guard:** no generator wiring/sidecar; no features/real UI/forms; **do not touch `generator/` or any frozen hash**; no code signing; **do not attempt macOS/Linux shell builds** (no machines — deferred like the cross-OS determinism proof); **do not install Rust/build-tools silently** (STOP and guide). No report file (Session 3 writes it).

---

## 5. SESSION 3 (REPORT) — done-conditions

Session 3 writes [`eco-day-04-report.md`](eco-day-04-report.md):
- **Re-confirm the backstop from clean:** `day20:regress` green (43+10 byte-identical) — the generator is provably untouched.
- **The prerequisite state** (DC-1): what was present/absent; if blocked, the exact install steps and that Day 4 is a STOP-and-guide finding (honest, complete).
- **The shell skeleton** (if built): where it lives (`desktop/`), that it builds + opens on Windows (dev, and packaged if it completed), the placeholder page, and that `generator/` + the backstop are untouched.
- **Verdict line:** either "Tauri v2 shell skeleton builds + opens on Windows; generator/backstop untouched; Day 5 = sidecar" — **or** "Day 4 BLOCKED at prerequisites: install Rust (rustup) + MSVC C++ Build Tools, then resume; WebView2 already present; generator/backstop untouched."
- **Forward-flags:** cross-OS **shell build** (macOS/Linux) is deferred like the cross-OS determinism proof (same git+CI gap); the standing flags (toolchain pins; no git; CLAUDE.md/.gitattributes needed Day 9; cross-OS proof not yet in CI). **Day 5 = the Node sidecar** (the highest-risk plumbing).

---

## 6. SCOPE GUARD — OUT for Day 4

- **NO generator wiring / sidecar** (Day 5).
- **NO features, no real UI, no forms** — a placeholder page only.
- **Do NOT touch `generator/` or any frozen hash** — the shell is a separate new layer.
- **NO code signing** (Phase 4).
- **Do NOT attempt macOS/Linux shell builds** (no machines; deferred like cross-OS determinism).
- **Do NOT install Rust/build-tools silently** — if absent, STOP and tell the user to install (user action).

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for Session 2
1. Read guardrails + ecosystem plan §4 + Month-1 Day 4 + eco-day-02 report? — ✅ (this session).
2. Which session, only its job? — Session 2 = EXECUTE (probe first; scaffold only if it passes). No report; no features.
3. Which frozen baselines must NOT move? — the **43 + 10** (+ MAXIMAL). The shell touches no generator file; DC-4 proves it.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — the whole shell is a project-level bypass: delete `desktop/` → generator unchanged.
6. Three killers checked? — N/A (no generation code added); the check is DC-4 (backstop green).
7. A gate that can actually FAIL? — **YES: the prerequisite probe (STOP-and-guide) and DC-4 (backstop green).** Report honestly if the probe blocks or the backstop moves.
8. Overclaim / scope drift? — the live risks are (i) installing toolchains silently, (ii) building a real UI instead of a placeholder, (iii) attempting macOS/Linux — §6 forbids all three.

---

*Day 4 opens the desktop-shell surface — but honestly. The probe comes first: Thraksha's own build now needs Rust + MSVC, which this machine does not yet have, so the most likely Day-4 outcome is a detect-and-guide STOP (install rustup + VS C++ Build Tools; WebView2 is already present) rather than a shell. When the toolchain is in, the skeleton is a boring window in a new `desktop/` dir that leaves the deterministic core exactly as-is — proven by a still-green backstop. No generator wiring, no features, no silent installs. The thesis governs; the core stays untouched.*
