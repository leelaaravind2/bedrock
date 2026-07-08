# Eco-Day 52 — REPORT: the command-surface wiring (Option B) — the P0 CLOSED

**Phase 4, Day 52 — the release stretch.** Day 51's audit surfaced a **P0**: the Tauri command surface
was **EMPTY** (0 `#[tauri::command]`) — the packaged Bedrock app only ran the day20 self-test; it could
**not** invoke export / scan / impact-map / flow-map / detect. Day 52 **closes it**: five **thin-invoker**
Tauri commands that shell out to the **certified bundled-node generator** (`resources/gen`), plus a
**hash-neutral `--model` arg** (Option B) so those commands run on **REAL user blueprints**, not only the
built-in demo. **The shell is a THIN INVOKER — no generation logic in Rust. Generation is untouched.**

**RELEASE SCOPE (LOCKED — carry forward):** ships as **"Bedrock"**, FREE via the Microsoft Store as an
**MSIX** — **Microsoft signs at certification** (NO cert / EV / token / notarization). **WINDOWS-ONLY.**

**Backstop re-confirmed from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked digests (unchanged), MAXIMAL `366e19d9…` unchanged — no frozen hash moved.**
`sync-gen:check` → sidecar == the certified generator byte-for-byte (`c43773ae…`, 237 files). The
generator's `dependencies` are **absent (≡ `{}`)** — no runtime dep added; pure-Node core intact.

---

## 1. Stage 1 — the `--model` arg (additive, literal bypass) — DC-1 / DC-2

The three model-taking CLIs gained an optional `--model <path-or-json>`. **No `--model` ⇒ the EXACT prior
demo/dir/backend behavior, byte-identical** (the literal bypass); **`--model` ⇒ the blueprint is read via
the EXISTING canonical construction — no new generation logic.**

- **New shared reader** [`generator/src/core/model-arg.ts`](../../generator/src/core/model-arg.ts) (pure
  Node, fs + JSON only):
  - `loadModelJson(value)` — parses the value as **inline JSON**, or falls through to reading it as a
    **file path** (a path is not valid JSON).
  - `readModelArg(value)` — `assembleBlueprint(loadModelJson(value))` → a `ProjectModel` via the **same
    canonical `BlueprintChoices` path** the wizard/CLI already use. `assembleBlueprint` is itself a proven
    literal bypass (an omitted dimension fires no setter), so the reader adds **no determinism risk**.
- [`flow-map.ts`](../../generator/src/flow-map.ts), [`export.ts`](../../generator/src/export.ts) —
  `--model` = a single `BlueprintChoices` JSON → `readModelArg`. Omitted ⇒ the demo model (export keeps
  its `--backend` override).
- [`map.ts`](../../generator/src/map.ts) — impact diffs **two** models, so `--model` = a
  `{ "current": BlueprintChoices, "proposed": BlueprintChoices }` pair (each `assembleBlueprint`-ed).
  Omitted ⇒ the demo Ticket change. `scan.js` (dir-based) + the detect CLI need no `--model`.

**DC-2 (LOAD-BEARING) — the literal bypass:** `rm -rf dist && npm run build && npm run day20:regress` →
**194 OK / 0 FAIL, 103 baked + MAXIMAL `366e19d9…` byte-identical.** No fixture passes `--model`, so the
default path is unchanged. **No frozen hash moved.**

---

## 2. Stage 2 — the Rust command surface (thin invokers) — DC-3

**New** [`desktop/src-tauri/src/commands.rs`](../../desktop/src-tauri/src/commands.rs): one shared
spawn/capture primitive + five thin commands. **No generation logic — every command spawns the bundled
node sidecar against `resources/gen/dist/<entry>.js` and returns its stdout.**

- **`run_sidecar(app, entry, args) -> Result<String, String>`** — the ONE primitive, **factored out of
  `lib.rs`'s startup self-test**: resolves `resource_dir()` → `resources/gen/dist/<entry>`,
  **verify-before-spawn**, **forward-slashes** the entry path + strips `\\?\` (the Day-5 `EISDIR 'E:'`
  fix, now done in one place), spawns `shell().sidecar("node")`, returns stdout. A non-zero exit (e.g.
  `scan.js` exit 1 on a CERTAIN finding — a **gate signal**, not a crash) returns stdout+stderr so no
  findings are lost.

| `#[tauri::command]` | → sidecar entry | args |
|---|---|---|
| `export_project(dir, backend?, model?)` | `export.js` | `dir [--backend b] [--model m]` |
| `scan_project(dir)` | `scan.js` | `dir` |
| `impact_preview(backend?, model?)` | `map.js` | `[--backend b] [--model m]` |
| `flow_map(backend?, model?)` | `flow-map.js` | `[--backend b] [--model m]` |
| `detect_toolchains()` | `detect-demo.js` | *(none)* |

- [`lib.rs`](../../desktop/src-tauri/src/lib.rs): `pub mod commands;` + the `invoke_handler`
  (`generate_handler![export_project, scan_project, impact_preview, flow_map, detect_toolchains]`). The
  **startup self-test is preserved** — it now runs through the **same `run_sidecar`** primitive (header
  keeps the Day-5 `SIDECAR_EXIT` contract).
- **Compile:** `cargo check` → **Finished, 0 warnings.** The command surface compiles clean.

**`detect_toolchains` resolution — SHELL-OUT (not Rust-native).** It shells out to the certified
`detect-demo.js` → `detect/probe.ts` — the SAME probe the wizard `/api/detect` runs. The thin-invoker
thesis **supersedes** the Phase-1 "Rust probes" intent: a Rust re-probe would **duplicate** toolchain
logic and risk drift (a finding). Detect is the impure edge that INFORMS; it never touches generation.

---

## 3. Stage 3 — the thin-invoker equivalence proof — DC-4 (LOAD-BEARING)

A full JS→`invoke()`→GUI round-trip needs a WebView session (none in this headless shell). Instead the
invoker path is proven at its load-bearing seam: **each command spawns exactly `bundled-node +
resources/gen/dist/<entry>.js + args`** — so proving *that spawn target* == the generator CLI proves the
command **invokes the certified code, it does not reimplement it.**

**(a) Default-path equivalence — the command's spawn target == the generator CLI, byte-identical:**
| Surface | Result |
|---|---|
| `flow-map.js` | **OK** — sidecar == CLI byte-identical |
| `map.js` | **OK** — sidecar == CLI byte-identical |
| `export.js` | **OK** — exported **file tree** byte-identical (36 files == 36 files) |
| `scan.js` | **OK** — sidecar == CLI byte-identical |
| `detect-demo.js` | **OK** — sidecar == CLI byte-identical |

**(b) The `--model` path (Option B) — equivalence + faithful + deterministic:**
- **`flow-map --model` sidecar == CLI** byte-identical (the `--model` path invokes the same code).
- **FAITHFUL:** `flow-map --model <demo-equivalent BlueprintChoices>` == `flow-map` (default demo) —
  **byte-identical.** The additive path reproduces the demo when handed the equivalent model → `--model`
  is a pure INPUT source, not a behavior change.
- **DETERMINISTIC:** `flow-map --model X` twice == identical (a pure projection).
- **`map --model {current,proposed}` sidecar == CLI** byte-identical; and `map --model
  <demo-equivalent>` == `map` (default demo change) — **byte-identical (faithful).**

→ **The commands invoke the existing certified generator (default AND `--model`), byte-identical to the
CLI — no reimplementation.**

---

## 4. Generation untouched — DC-5

- **Backstop byte-identical (from clean):** 194 OK / 0 FAIL, 103 baked + MAXIMAL `366e19d9…` — no frozen
  hash moved.
- **Sidecar == certified:** `sync-gen:check` OK — `resources/gen` == the current generator build
  byte-for-byte. The stamp moved **`14e7a107…` (Day 51, 235 files) → `c43773ae…` (237 files)** because
  the sidecar correctly **tracks the new generator** (the 2 added CLI-driver `.js` + the `model-arg` `.js`
  + `.d.ts`). **This is the sidecar staying == certified — NOT a generation-hash move**; the 103 frozen
  **generation** digests are byte-identical (the digest is over `buildFileSet` output, not the CLI
  drivers).
- **`deps {}` unchanged:** `dependencies` absent (≡ `{}`); no runtime dep added; pure-Node core intact.
- **Generator changes are additive CLI-only:** `export.ts`, `flow-map.ts`, `map.ts` (each `+--model`
  branch beside the unchanged demo branch) + the new `core/model-arg.ts`. **No `core/regen`, no plugin,
  no template touched** → no generation logic changed.

---

## 5. DC-6 — invariants + honest verification split

**Invariants held:** the shell is a **thin invoker** (`commands.rs` contains **no generation logic** — it
only spawns the sidecar); **detect = shell-out** (not a Rust re-probe); generation untouched; the sidecar
== the certified generator byte-for-byte.

**Proven HERE (build-here):**
- The command surface **compiles** (`cargo check`, 0 warnings).
- **Invoker-equivalence** — each command's spawn target == the generator CLI byte-identical (default +
  `--model`, incl. the 36-file export tree — §3).
- **Generation untouched** — backstop byte-identical; sidecar == certified; `deps {}` (§4).

**DEFERRED (honest-manual, Leela's Windows machine — no GUI session here):**
- **The JS → `invoke()` → command → sidecar → render GUI round-trip + click-through.** **NOT run — NOT
  claimed.**
- **The front-end UI** to call the commands + render results — [`desktop/src/main.js`](../../desktop/src/main.js)
  is still static (3 lines, no `invoke`). Wiring the UI (and passing a real blueprint from the store) is
  the next front-end job.
- **The packaged GUI launch + sidecar-under-MSIX**, the **MSIX wrap**, the **Bedrock name** — unchanged
  from the Day-51 checklist.

---

## 6. The updated gap list (release punch-list)

| # | Gap | Status | Where |
|---|---|---|---|
| **P0 command surface** | Phase-4 surfaces + detect invokable through the shell, on **real models** | **CLOSED** — 5 thin-invoker commands + `--model` | build-here (done) |
| 1 | **Front-end UI** — `main.js` calls the commands + renders; supplies a real blueprint from the store | OPEN | build-here (next) |
| 2 | **MSIX wrap** — external `MakeAppx` + `AppxManifest` | OPEN (P0 for submission) | Leela's Windows machine |
| 3 | **Bedrock name** — very common word, likely conflict | OPEN (do early) | Leela's Partner Center |
| 4 | **Packaged GUI launch + sidecar-under-MSIX** | OPEN | Leela's Windows machine |
| 5 | **Product name/identity** — `Thraksha`/`com.thraksha.desktop` → Bedrock Store identity | OPEN | build-here, pending the name |
| 6 | **Richer command results** — a `{stdout, exitCode}` result type (scan's exit-1 findings currently surface via the Err string); optional `--json` generator outputs | OPEN (refinement) | build-here (later) |

---

## 7. Forward-flags

- **The shell is now functionally wired** — the packaged Bedrock app can invoke the Phase-4 surfaces
  (export / scan / impact-map / flow-map) + detect **on real blueprints** via the `--model` arg.
- **Day 53 picks up THE FABLE-5 HARDENING PASS** — now the codebase is functionally complete (incl. this
  wiring), Fable 5 reviews the **FINISHED codebase**: **ADVISORY-only**, gated behind the deterministic
  scanners (Semgrep CERTAIN) + the full `day20:regress` baseline (green FIRST), **hand-reviewed + applied
  by Leela**, **no silent frozen-hash move** (a moved hash = a FINDING or a documented deliberate
  re-baseline), **one concern at a time**, the **live call honest-manual** (Leela's own AI access — no key
  in the shell). A one-time dev-phase step over Thraksha's OWN code, not a product feature.
- **Honest build-here vs deferred:** the commands + `--model` + the equivalence/backstop proofs are
  **HERE**; the **GUI click-through + front-end UI + MSIX wrap + Bedrock name** are **DEFERRED** to
  Leela's Windows/Store machine — **no claimed GUI test that didn't run.**
- **Release scope restated:** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
  Windows-only.

---

*Day 52 closed the P0 command-surface gap. Five thin-invoker Tauri commands (`export_project`,
`scan_project`, `impact_preview`, `flow_map`, `detect_toolchains`) + an `invoke_handler` now let the
packaged Bedrock app invoke the Phase-4 generator surfaces + detect — each a shell-out to the certified
bundled-node generator (`resources/gen`) through the shared `run_sidecar` primitive (factored from the
Day-9 startup self-test), with **no generation logic in Rust** (detect included — a shell-out to the
certified `detect/probe.ts`, superseding the Phase-1 Rust-probes intent). Option B added a hash-neutral
`--model <path-or-json>` arg to export/flow-map/map, read via the EXISTING `assembleBlueprint` path (a
new `core/model-arg.ts` reader; map takes a `{current,proposed}` pair) — a literal bypass (no `--model` ⇒
byte-identical demo output) proven at load-bearing weight: the default backstop is byte-identical (194 OK
/ 0 FAIL, 103 baked, MAXIMAL `366e19d9…`, no frozen hash moved), and the `--model` path is
sidecar==CLI-equivalent, faithful (reproduces the demo when given the equivalent model), and
deterministic. The thin-invoker equivalence held for all five surfaces (the command's exact spawn target
== the generator CLI byte-identical, incl. the 36-file export tree). The sidecar stays == the certified
generator byte-for-byte (`sync-gen:check`, stamp `14e7a107…`→`c43773ae…` as it tracks the new CLI code —
NOT a generation-hash move); `deps {}` unchanged (pure-Node core). Compiled HERE (`cargo check`, 0
warnings) + invoker-equivalence proven HERE; the JS→invoke→GUI click-through + the static front-end UI +
the MSIX wrap + the Bedrock name are DEFERRED honestly to Leela's Windows/Store machine (no claimed GUI
test). Day 53 picks up the Fable-5 hardening pass over the now functionally-complete codebase — ADVISORY,
gated, hand-applied, no silent hash move, the live call honest-manual.*
