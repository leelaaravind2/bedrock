# Eco-Day 52 — PLAN: the command-surface wiring (close the P0)

**Phase 4, Day 52 — the release stretch. PLANNING ONLY.** This session writes this plan and nothing
else — no implementation, no builds, no file changes except this plan. Day 52 **closes the P0
command-surface gap** the Day-51 audit surfaced: the Tauri command surface is **EMPTY** — the packaged
Bedrock app only runs the day20 self-test; it **cannot invoke** export / scan / impact-map / flow-map /
detect. Day 52 **wires those surfaces through the shell** as **thin `#[tauri::command]` invokers** of the
**existing certified generator** via the **bundled-node sidecar** — the shell is a **thin invoker, NOT a
reimplementation.** It changes **no generator code** and **no generation**.

**RELEASE SCOPE (LOCKED — carry forward):** the desktop app ships as **"Bedrock"**, FREE via the
Microsoft Store as an **MSIX** — **Microsoft signs at certification** (NO cert / EV / token /
notarization). **WINDOWS-ONLY**; macOS/Linux desktop **OUT OF SCOPE**.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no
baseline moves silently; §1.2 AI never in the generation path — here: **no generation logic in Rust**;
§3 STOP-and-report — *don't claim a GUI click-through that didn't run*; §4 honesty — *build-here vs
deferred*) → [`eco-day-51-report.md`](eco-day-51-report.md) (the audit + the gap list — the **P0
command-surface gap** this day closes; the sidecar-integrity + bundled-node-reproduces-digests proofs) →
[`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md) (the release stretch) → the REAL shell code (resolved
below): [`desktop/src-tauri/src/lib.rs`](../../desktop/src-tauri/src/lib.rs) (the empty surface + the
sidecar spawn), the generator entry points
([`export.ts`](../../generator/src/export.ts), [`scan.ts`](../../generator/src/scan.ts),
[`map.ts`](../../generator/src/map.ts), [`flow-map.ts`](../../generator/src/flow-map.ts),
[`detect-demo.ts`](../../generator/src/detect-demo.ts) → [`detect/probe.ts`](../../generator/src/detect/probe.ts)).

**Git (for execute):** commit to `main`, no branches, no PRs.

---

## 0. Grounded this session — resolved by reading the REAL code

### 0.1 How the shell invokes the bundled-node sidecar TODAY
[`lib.rs`](../../desktop/src-tauri/src/lib.rs) already has a **working spawn/capture path — but only in
`.setup()`, and it does not return to a command.** On startup it:
1. resolves `handle.path().resource_dir()` → joins `resources/gen/dist/day20-regression.js`;
2. verify-before-spawn (`entry.exists()`);
3. **forward-slashes** the entry path and strips any `\\?\` verbatim prefix (the Day-5 `EISDIR 'E:'`
   fix — Windows splits backslash args);
4. `handle.shell().sidecar("node")` → `.arg(entry_arg).arg("--emit-digests")` → `.output().await`;
5. writes stdout (the 103 DIGEST lines) to a **temp file** for the gate — it is a **self-test**, not a
   command result returned to the WebView.

→ **The spawn/capture primitive EXISTS** (`tauri_plugin_shell` sidecar + `resource_dir()` + the
forward-slash arg hygiene). Day 52 **factors this into a reusable helper** and wraps it in
`#[tauri::command]` functions that **return stdout to the caller**. **No new IPC mechanism is invented**
— the same sidecar path, now returned instead of temp-filed.

### 0.2 The generator entry points the commands will call (READ — they are text-emitting CLIs)
| Surface | CLI entry (bundled-node) | Args today | Parameterized on | Model source |
|---|---|---|---|---|
| Export | `dist/export.js` | `<targetDir> [--backend <b>]` | **real dir + backend** | **demo model** (`buildDemoAppModel`) |
| Scan | `dist/scan.js` | `<projectDir>` | **real dir** | n/a (scans a directory) |
| Impact preview | `dist/map.js` | `[--backend <b>]` | backend only | **demo** Ticket change (hardcoded) |
| Flow map | `dist/flow-map.js` | `[--backend <b>]` | backend only | **demo** 2-entity model (hardcoded) |
| Detect | `dist/detect-demo.js` | *(none)* | n/a | iterates a fixed backend set; probes THIS machine |

**All five emit human-readable TEXT to stdout** (not JSON). `scan.js` and `detect-demo.js` are
**genuinely useful as-is** (a real dir / the real machine); `export.js` is dir+backend useful (demo
model); `map.js`/`flow-map.js` render **demo models** until a real blueprint can be passed.

### 0.3 The KEY design tension — resolved
The task's suggested signatures (`impactPreview(current, proposed)`, `flowMap(model)`) presume a
**model-passing** mechanism the CLIs **do not have today** — the CLIs are demo/dir/backend-driven. Passing
an **arbitrary user blueprint** to export/map/flow-map would require a **generator-side blueprint-input
CLI arg** — a **generator code change**, which is **OUT of Day-52 scope** ("*wiring the command surface
changes NO generator code*"). **Resolution (LOCKED for this plan):** Day 52 wires **thin invokers that
match the generator entry points AS THEY ARE today** (dir/backend args). **Real-model parameterization**
(passing a user blueprint from the store/front-end) is **deferred honestly** with the front-end, and
noted to need a **future hash-neutral generator `--model` arg** (default = a **literal bypass**
reproducing today's demo behavior, per the generator's add-a-feature discipline) — **NOT built Day 52.**

### 0.4 Where the result goes — the front-end is STATIC (deferred, honest)
[`desktop/src/main.js`](../../desktop/src/main.js) is **3 lines and calls no `invoke`/`__TAURI__`** — the
front-end is a static page. `withGlobalTauri: true` is set (so `window.__TAURI__.core.invoke` is
available), but **nothing calls the commands yet.** → Day 52 wires the **COMMANDS (the invoker surface)**;
the **front-end UI to call + render results is DEFERRED honestly** (the task's explicit escape hatch:
"*if the front-end … is a bigger job, wire the COMMANDS and defer the front-end honestly*").

### 0.5 `detect_toolchains` — Rust-native vs shell-out — RESOLVED: shell-out
The generator already owns the **certified impure-edge probe** (`detect/probe.ts` `runLiveDetection`) —
the SAME code the wizard `/api/detect` runs. **Resolution: `detect_toolchains` is a SHELL-OUT to the
bundled-node detect** (`dist/detect-demo.js`), **not** a Rust reimplementation. **Rationale:** the
thin-invoker thesis — reuse the certified probe, do not duplicate toolchain-probing logic in Rust (a
reimplementation would risk drift and is a *finding* per the scope guard). The Phase-1 "Rust probes"
intent is **superseded** by the thin-invoker discipline. *(Note: `detect-demo.js` emits text over a fixed
backend set; a dedicated model-driven / `--json` detect entry is a future refinement, deferred with the
front-end.)*

---

## 1. PART 1 — the command surface (the thin invokers) — DC-1

**A new `desktop/src-tauri/src/commands.rs` module** (matches the existing `pub mod blueprint_store`
style; keeps `lib.rs` clean). It holds ONE shared helper + FIVE thin commands. **No generation logic —
every command shells out to the bundled-node sidecar (`resources/gen`) and returns its stdout.**

### 1.1 The shared invoker helper (factored from the current `setup()` path)
```
async fn run_sidecar(app: &AppHandle, args: Vec<String>) -> Result<String, String>
```
- resolve `app.path().resource_dir()` → base `…/resources/gen/dist/`;
- **verify-before-spawn** (the entry `.js` must exist) — never fall back to system node;
- **forward-slash** the entry path + strip `\\?\` (reuse the exact Day-5 arg hygiene);
- `app.shell().sidecar("node")?` → `.arg(entry).args(user_args)` → `.output().await`;
- on exit 0 → `Ok(String::from_utf8_lossy(stdout))`; else → `Err(exit-code + stderr)`.

All five commands route through this **one** helper (path hygiene done ONCE; no reimplementation).

### 1.2 The five commands (each maps 1:1 to a generator entry point)
| `#[tauri::command]` | Target sidecar args | Maps to |
|---|---|---|
| `export_project(target_dir, backend?)` | `["dist/export.js", target_dir, ("--backend", b)?]` | `export.ts` |
| `scan_project(project_dir)` | `["dist/scan.js", project_dir]` | `scan.ts` |
| `impact_preview(backend?)` | `["dist/map.js", ("--backend", b)?]` | `map.ts` |
| `flow_map(backend?)` | `["dist/flow-map.js", ("--backend", b)?]` | `flow-map.ts` |
| `detect_toolchains()` | `["dist/detect-demo.js"]` | `detect-demo.ts` → `detect/probe.ts` |

- Each returns `Result<String, String>` (the generator's stdout, or an error) to the WebView via
  `invoke()`.
- **Arg hygiene:** caller-supplied `target_dir` / `project_dir` are passed through **absolute +
  forward-slashed** (Windows node accepts `/`; `export`/`scan` `path.resolve` them) — a wiring note for
  the future front-end.
- **Signatures match today's CLIs** (dir/backend). Real-model params are the deferred front-end work
  (§0.3).

### 1.3 Register the invoke_handler (additive — the self-test stays)
In `lib.rs`:
```
.invoke_handler(tauri::generate_handler![
    commands::export_project, commands::scan_project, commands::impact_preview,
    commands::flow_map, commands::detect_toolchains ])
```
- **PRESERVE** the existing `.setup()` day20 digest self-test (the Day-9 load-bearing sidecar proof) —
  the `invoke_handler` is **additive** and does not disturb it.
- `pub mod commands;` beside `pub mod blueprint_store;`.

**Invariant:** the shell is a **THIN INVOKER** — zero generation logic in Rust; every command is a
sidecar shell-out to the certified generator.

---

## 2. PART 1 — generation untouched (DC-2, load-bearing)

Wiring the command surface touches **only `desktop/src-tauri/` (Rust) + this plan** — **no generator
source, no `resources/gen` content change beyond the routine `sync-gen` copy.** So:
- **`cd desktop && npm run sync-gen:check`** → the sidecar `resources/gen` == the current generator build
  **byte-for-byte** (the Day-51 stamp `14e7a107…`, 235 files). Unchanged by the Rust wiring.
- **`cd generator && rm -rf dist && npm run build && npm run day20:regress`** → **PASS, 194 OK / 0 FAIL,
  103 baked + 10 + non-hash byte-identical, MAXIMAL `366e19d9…`** — unchanged.
- **`git status`** → only `desktop/src-tauri/**` (Rust) + the docs changed; **no `generator/src/**`
  touched.**
- **If any frozen hash moves, or the sidecar drifts from the certified generator → FINDING, STOP** (§1.1
  GUARDRAILS — never a silent re-baseline).

---

## 3. PART 1 — the honest verification split (DC-3)

**Provable HERE (build-here):**
- **A. The crate compiles with the command surface.** `export PATH="$HOME/.cargo/bin:$PATH"` →
  `cargo build` (or `npx tauri build --no-bundle` for the app-shell compile) → the `commands` module +
  `invoke_handler` compile clean. *(A full MSI/NSIS bundle is not required for the wiring proof — Day 51
  already proved the bundle builds; a `cargo build`/`--no-bundle` compile is the cheap, sufficient
  check.)*
- **B. The thin-invoker path is correct (sidecar-equivalence).** For each command's target args, run the
  **bundled node** against the same `dist/*.js` entry (as Day-51 A2 did) and confirm the output **==** the
  CLI (`npm run export/scan/map/flow-map/detect` equivalent). This proves the command **invokes the same
  certified code the CLI runs — not a reimplementation.** *(The command wraps exactly these args; proving
  the args→output equivalence proves the invoker path without a GUI.)*
- **C. Generation untouched** (§2): `day20:regress` byte-identical + `sync-gen:check` (sidecar ==
  certified) + `git status` (no generator source).

**DEFERRED (honest-manual, Leela's Windows machine — no GUI session in this headless shell):**
- **The JS → `invoke()` → command → sidecar GUI round-trip + click-through** — needs a WebView/GUI
  session (none here). **Do NOT claim a GUI click-through that didn't run.**
- **The front-end UI** to call the commands + render results (`main.js` is static — §0.4).
- **Real-model parameterization** of export/impact/flow (the future hash-neutral generator `--model`
  arg + the store/front-end that supplies it — §0.3).
- **Structured JSON outputs** (future `--json` generator flags; today the commands return text).
- The **packaged GUI launch + sidecar-under-MSIX** (still Leela's machine, from the Day-51 checklist).

---

## 4. Execute done-conditions

1. **The command surface (DC-1):** `commands.rs` with the shared `run_sidecar` helper + the five
   `#[tauri::command]` thin invokers (export / scan / impact-map / flow-map / detect_toolchains), and the
   `invoke_handler` registered in `lib.rs` (the `.setup()` self-test preserved). **No generation logic in
   Rust** — every command shells out to the bundled-node.
2. **Generation untouched (DC-2, load-bearing):** `sync-gen:check` passes (sidecar == certified
   `14e7a107…`); `rm -rf dist && npm run build && npm run day20:regress` → PASS, 194 OK / 0 FAIL, 103
   baked byte-identical, MAXIMAL `366e19d9…`; `git status` shows **no `generator/src` change**. A moved
   hash = **FINDING, STOP**.
3. **The invoker path is correct (DC-3):** the crate **compiles**; the **sidecar-equivalence** check
   proves each command's args yield the **CLI-identical** generator output (invokes the existing code, not
   a reimplementation).
4. **Honest verification (DC-4):** compile + the invoker-path equivalence proven **HERE**; the **GUI
   round-trip / click-through**, the **front-end**, **real-model params**, and **JSON outputs**
   **DEFERRED** to Leela's Windows machine / a later day — **no claimed GUI test that didn't run.**
5. **Invariants:** the shell is a **thin invoker** (no generation logic in Rust — a reimplementation
   would be a finding); generation untouched; the sidecar stays == certified byte-for-byte; the
   generator's `deps {}` unchanged (pure-Node core).

> **STOP and report rather than write a clean-looking close.** Do NOT claim a GUI click-through /
> packaged launch that didn't run. If `day20:regress` or `sync-gen:check` moves a hash, that is a
> FINDING — the sidecar must stay == the certified generator byte-for-byte and the wiring must disturb
> no generation.

---

## 5. Report done-conditions (`eco-day-52-report.md`)

- **The command surface:** the five commands + the `invoke_handler`, each mapped to its generator entry
  point via the bundled-node sidecar; the shared `run_sidecar` helper (the factored spawn/capture path).
- **The thin-invoker proof:** the commands invoke the **existing certified code** (sidecar-equivalence:
  the command args produce CLI-identical output), **not a reimplementation** — **no generation logic in
  Rust**.
- **The generation-untouched proof:** `day20:regress` byte-identical (194 OK / 0 FAIL, 103 baked, MAXIMAL
  `366e19d9…`); the sidecar == certified (`sync-gen:check`, `14e7a107…`); no generator source changed.
- **The invoker-path verification:** the compile + the headless sidecar-equivalence **HERE**; the GUI
  round-trip **deferred** honestly.
- **The `detect_toolchains` resolution:** **shell-out** to the generator's certified detect (not a Rust
  reimplementation) — with the rationale.
- **Forward-flags:** what's **wired + testable HERE** vs the **GUI launch / front-end / real-model params
  DEFERRED**; the **updated gap list** — **P0 command-surface CLOSED** (shell layer); **remaining:** the
  front-end to call+render, real-model parameterization (future hash-neutral generator arg), JSON
  outputs, the MSIX wrap, the Bedrock name, the packaged GUI launch + sidecar-under-MSIX. **What Day 53+
  picks up:** the **Fable-5 hardening pass** — now the shell is functionally wired, Fable 5 reviews the
  **FINISHED codebase including this wiring** (deterministic gate first → ADVISORY → hand-applied → no
  silent hash move → one concern at a time → the live call honest-manual).

---

## 6. SCOPE GUARD — what this day is NOT

- **NOT the Fable-5 pass** (Day 53+ — Day 52 wires; Fable 5 comes next).
- **NOT the MSIX wrap** (Leela's Windows machine); **NOT the Store submission** (Partner Center).
- **NOT real-model parameterization** of export/impact/flow, and **NOT the front-end UI** — both deferred
  honestly (§0.3, §0.4); if the front-end is a bigger job, **wire the COMMANDS and defer the front-end**.
- The commands are a **THIN INVOKER** — **no generation logic in Rust** (a reimplementation = a finding);
  **detect is a shell-out**, not a Rust re-probe.
- **Generation UNTOUCHED** — a moved frozen hash = **FINDING, STOP**; the sidecar stays == the certified
  generator **byte-for-byte**; the generator's `deps {}` unchanged.
- **Honest GUI-deferred** — no claimed click-through / packaged launch that didn't run in this shell.

---

*Day 52 closes the P0 command-surface gap so the packaged Bedrock app can invoke the Phase-4 features.
Resolved against the real shell: the sidecar spawn/capture primitive already exists in `lib.rs` `.setup()`
(it self-tests to a temp file) — Day 52 factors it into a reusable `run_sidecar` helper and wraps it in
five thin `#[tauri::command]` invokers (export / scan / impact-map / flow-map / detect_toolchains) +
an `invoke_handler`, each a shell-out to the **existing** bundled-node generator (`resources/gen`), the
SAME code the CLIs run — **no generation logic in Rust, no generator source change.** The generator CLIs
are text-emitting and demo/dir/backend-parameterized today, so Day 52 matches those signatures; passing
an arbitrary user blueprint (real-model params) and the front-end UI to call+render are **deferred
honestly** (the front-end `main.js` is static; real-model params need a future hash-neutral generator
`--model` arg whose default is a literal bypass). `detect_toolchains` is a **shell-out** to the certified
`detect/probe.ts` surface, not a Rust reimplementation (the thin-invoker thesis — a reimplementation
would risk drift and is a finding). Provable HERE: the crate compiles with the command surface, and a
headless sidecar-equivalence check proves each command's args yield CLI-identical generator output (the
invoker path is correct, not a reimplementation); generation untouched (backstop byte-identical: 194 OK /
0 FAIL, 103 baked, MAXIMAL `366e19d9…`; sidecar == certified `14e7a107…` via `sync-gen:check`; no
generator source moved). DEFERRED to Leela's Windows machine: the JS→invoke→command→sidecar GUI
round-trip + click-through (no GUI session here), the front-end UI, real-model params, JSON outputs, the
MSIX wrap + packaged launch. Release scope LOCKED: Bedrock / Microsoft Store / MSIX /
Microsoft-signs-at-certification / Windows-only. Day 53+ picks up the Fable-5 hardening pass over the now
functionally-wired codebase — the first concern, deterministic gate first, ADVISORY, hand-applied, no
silent hash move, the live call honest-manual.*
