# Eco-Day 55 — PLAN: the RELEASE BUILD-OUT — front-end UI + MSIX packaging path + the Bedrock identity

**Phase 4, Day 55 — the release stretch (Month-3, Days 51–60).** With the command surface wired (Day 52)
and the `SidecarResult` contract hardened (Day 53), the shell is functionally invokable but the
**front-end is a static stub**, the product still ships under the **pre-release identity**
(`Thraksha` / `com.thraksha.desktop`), and the **MSIX path is unauthored**. Day 55 builds out the three
release-critical parts — **honestly staged: front-end + identity + manifest build-here; the MakeAppx
wrap + packaged launch + Store submission + Bedrock name reservation deferred to Leela's Windows/Store
machine.**

**This session is PLAN ONLY. No code, no builds.** The plan resolves the front-end shape, the AppxManifest
essentials, the exact `tauri.conf.json` identity fields, and what is provable HERE vs DEFERRED — by
reading the real shell (`main.js`, `index.html`, `tauri.conf.json`, `capabilities/default.json`,
`commands.rs`).

**RELEASE SCOPE (LOCKED — carry forward):** ships as **"Bedrock"**, FREE via the Microsoft Store as an
**MSIX** — **Microsoft signs at certification** (NO cert/EV/token/notarization). **WINDOWS-ONLY**
(macOS/Linux desktop OUT).

---

## 0. The state of the real code (read this session — the plan is built on it)

| File | Current state | Day-55 action |
|---|---|---|
| [`desktop/src/main.js`](../../desktop/src/main.js) | **Empty** (3 comment lines; "No functionality yet") | Author the thin-client wiring (Part 1) |
| [`desktop/src/index.html`](../../desktop/src/index.html) | Static placeholder; **does NOT load `main.js`** (no `<script>`); inline `<style>`; `<h1>Thraksha</h1>` | Add the DOM (command panels + results area) + a `<script>` tag; rename shell strings → Bedrock (Part 1/3) |
| [`desktop/src-tauri/tauri.conf.json`](../../desktop/src-tauri/tauri.conf.json) | `productName: "Thraksha"`, `identifier: "com.thraksha.desktop"`, window `title: "Thraksha"`, `withGlobalTauri: true`, `frontendDist: "../src"` (**no bundler**), `targets: "all"` | Bedrock identity (Part 3); manifest inputs (Part 2) |
| [`desktop/src-tauri/capabilities/default.json`](../../desktop/src-tauri/capabilities/default.json) | `shell:allow-execute` for the `binaries/node` sidecar | **No change expected** — app commands need no ACL entry (see §1.4) |
| [`commands.rs`](../../desktop/src-tauri/src/commands.rs) | 5 commands → `Result<SidecarResult, String>`; `SidecarResult { stdout, stderr, exit_code }` (snake_case, no `rename_all`) | The invoke surface the front-end consumes (Part 1) |

**Two load-bearing facts the front-end MUST honor:**
1. **No bundler.** `frontendDist` points at raw `../src`; there is no vite/webpack step (desktop
   `package.json` has only `tauri`/`sync-gen` scripts). The front-end is plain HTML/JS served as-is →
   **use the global `window.__TAURI__.core.invoke`** (enabled by `withGlobalTauri: true`), **NOT**
   `import { invoke } from '@tauri-apps/api'` (there is nothing to resolve the bare import).
2. **The `SidecarResult` wire shape is `{ stdout, stderr, exit_code }`** — snake_case, because the Rust
   struct has no `#[serde(rename_all)]`. The front-end reads **`result.exit_code`** (not `exitCode`).

---

## 1. PART 1 — THE FRONT-END UI (build-here; a THIN CLIENT on the SidecarResult contract)

### 1.1 Shape — vanilla JS, one panel per command, one shared results area

`index.html` gains a `<main>` with, for each of the 5 commands, a small panel (a label, its input(s), a
run button), plus one shared **`<pre id="output">`** results area and a **status line**. `main.js`
(loaded via a `<script src="./main.js" defer>` — plain script, not an npm module) binds each button to an
`invoke()` call and renders the result. **Minimal and honest — a functional harness that exercises the
commands, not a polished product** (polish is follow-on).

### 1.2 The invoke mapping (exact — from the real command signatures)

| Button | `invoke(name, args)` | Args (camelCase from JS → snake_case Rust) | Inputs in the UI |
|---|---|---|---|
| Detect toolchains | `invoke('detect_toolchains')` | *(none; `app` is injected)* | — |
| Flow map | `invoke('flow_map', { backend, model })` | both optional | backend (text, optional), model (textarea, optional) |
| Impact preview | `invoke('impact_preview', { backend, model })` | both optional | backend, model (`{current,proposed}` JSON) |
| Scan | `invoke('scan_project', { projectDir })` | required | projectDir (text) |
| Export | `invoke('export_project', { targetDir, backend, model })` | targetDir required | targetDir (text), backend, model |

- **`invoke` accessor:** `const { invoke } = window.__TAURI__.core;` (Tauri v2 global). *Verify-at-execute:
  the exact global path (`__TAURI__.core.invoke`) is a Tauri-v2 nuance — confirm against the installed
  `@tauri-apps/cli` v2 at execute; fall back to `window.__TAURI__.invoke` only if the console shows the
  `core` namespace absent.*
- **Arg casing:** JS passes `targetDir`/`projectDir` (camelCase); Tauri v2 maps them to the Rust
  `target_dir`/`project_dir`. *Verify-at-execute: confirm the v2 camelCase→snake_case arg convention (it
  is the v2 default) — if a command reports a missing arg, this is the first thing to check.*
- **Empty optionals:** an empty backend/model field ⇒ **omit the key** (or pass `null`) so the command
  takes its **literal-bypass demo path** (Day-52), not an empty string. `detect_toolchains` takes no args.

### 1.3 Rendering the `SidecarResult` — the three branches (gap #6's whole point)

```
try {
  const r = await invoke(cmd, args);          // resolves for ANY completed run (Day-53 contract)
  if (r.exit_code === 0) {
    render CLEAN  — green header + r.stdout            // success / clean scan / map / export
  } else if (r.exit_code === 1 && cmd === 'scan_project') {
    render FINDINGS — amber header "CERTAIN findings" + r.stdout   // NOT an error — the gate working
  } else {
    render NONZERO — neutral header "exit N" + r.stdout + r.stderr  // e.g. usage exit 2; other completes
  }
} catch (errString) {
  render ENV-ERROR — red header "environment problem (sidecar missing/broken)" + errString
}
```

- **Rejected promise (`catch`) ⇒ environment problem** — the Rust `Err` is spawn/env failure ONLY
  (Day-53), so a rejection means the sidecar/resource path is broken, **not** a scan finding. Red.
- **`Ok{exit_code:0}` ⇒ clean/success** — render `stdout` readably (green).
- **`Ok{exit_code:1}` on scan ⇒ the CERTAIN findings**, rendered from `stdout` as **results, not an
  error** (amber) — this is exactly what Day-53 unblocked; the UI must not treat it as a failure.
- **Other completed non-zero (e.g. export usage `exit 2`) ⇒ render stdout+stderr with the code shown** —
  informational, not a crash.
- **All stdout is rendered verbatim in `<pre>`** — the front-end **does not parse, transform, or
  re-derive** generator output. It is a faithful renderer of certified bytes (§Spine 2).

### 1.4 Capabilities — no ACL change expected (verify)

The 5 commands are **application commands** registered via `tauri::generate_handler!` — in Tauri v2 these
are invokable from the front-end **without** a capability/permission entry (the ACL governs *plugin* and
*core* commands). The existing `shell:allow-execute` stays (the Rust side uses the shell plugin to spawn
the sidecar). **Plan: change nothing in `capabilities/default.json`.** *Verify-at-execute: if an `invoke`
is denied at runtime, re-examine — but do NOT pre-emptively widen the ACL (over-permissioning is a
finding).*

### 1.5 `--model` UI input — STAGED this day (raw text), store-backed picker DEFERRED

- **This day (cheap):** a raw **model textarea** (paste a `BlueprintChoices` JSON, or a file path) wired
  straight into the command's existing `model: Option<String>` arg. This exercises the `--model` path
  (Day-52 Option B) at zero new backend cost.
- **DEFERRED (bigger job):** a **store-backed blueprint picker** that reads a saved blueprint from the
  SQLite [`blueprint_store.rs`](../../desktop/src-tauri/src/blueprint_store.rs) and feeds it as `--model`.
  The store is a Rust module but is **not yet exposed as a Tauri command** — wiring a `list/load` command
  + a picker UI is its own unit. **Wire the 5 command calls first; defer the store picker.** Honest,
  staged, and it keeps Day 55 to the release build-out.

### 1.6 Testability HERE — authored + proven-by-inspection; live click-through DEFERRED (explicit)

**There is no GUI/WebView session in this headless shell** (a Tauri app needs the Rust host + WebView2;
the `preview_*` tools are for web dev servers, not a packaged desktop WebView). So Day 55 proves the
front-end **by inspection, not by clicking:**
- **Proven HERE:** the command **names** match the registered `generate_handler!` set; the **arg keys**
  match the command signatures (camelCase↔snake_case); the **`SidecarResult` field reads** (`exit_code`,
  `stdout`, `stderr`) match the Rust struct; the three render branches map to the Day-53 contract; the
  HTML/JS is syntactically valid (`node --check main.js` for a syntax pass — it won't run the Tauri
  globals, but it catches parse errors).
- **DEFERRED (Leela's machine):** the **live `tauri dev` / packaged click-through** — buttons actually
  invoking, results actually rendering. **No claimed live GUI run.**

---

## 2. PART 2 — THE MSIX PACKAGING PATH (author the manifest + recipe HERE; MakeAppx wrap DEFERRED)

MSIX is **not** a Tauri v2 bundle target (Day-51 A3: `tauri build` = `msi`/`nsis` only; `MakeAppx` not on
this shell). The path is an **external wrap** of the Tauri build payload. Day 55 **authors the manifest +
documents the reproducible recipe**; the actual wrap is honest-manual on Leela's Windows machine.

### 2.1 Where the artifacts live (new packaging files — NOT generator code)

- `desktop/src-tauri/msix/AppxManifest.xml` — authored this day (with **placeholders** for
  Partner-Center-assigned values, clearly marked); sits alongside `capabilities/`, `resources/`,
  `binaries/`.
- `desktop/src-tauri/msix/README.md` — the reproducible wrap recipe + the build-here-vs-deferred split +
  the placeholder key.

### 2.2 The AppxManifest essentials (authored with marked placeholders)

- **`<Identity>`** — `Name="{{STORE_IDENTITY_NAME}}"` (the Store-reserved package identity for Bedrock),
  `Publisher="{{STORE_PUBLISHER_CN}}"` (the Store-assigned `CN=…`), `Version="0.1.0.0"` (4-part),
  `ProcessorArchitecture="x64"`. **The Name + Publisher are Partner-Center-assigned — placeholders here,
  NOT invented real values** (§Honesty).
- **`<Properties>`** — `DisplayName="Bedrock"`, `PublisherDisplayName="{{PUBLISHER_DISPLAY_NAME}}"`,
  `Logo="assets\StoreLogo.png"`.
- **`<Dependencies>`** — `<TargetDeviceFamily Name="Windows.Universal" MinVersion="10.0.19041.0"
  MaxVersionTested="10.0.22621.0"/>` (Win 10 2004+/Win 11; WebView2 present on Win 11).
- **`<Capabilities>`** — **`<rescap:Capability Name="runFullTrust"/>`** — REQUIRED: Bedrock is a packaged
  Win32/desktop-bridge app that **spawns a bundled `node.exe` sidecar** (a child process); full-trust is
  mandatory for that. (Store approval requires a justification — note it in the README.)
- **`<Applications>`** — `<Application Id="Bedrock" Executable="Bedrock.exe"
  EntryPoint="Windows.FullTrustApplication">` + `<uap:VisualElements DisplayName="Bedrock" .../>`
  (Square150x150 / Square44x44 logos, background color).
- **Payload (packaged content) the wrap must include:** `Bedrock.exe` (the Tauri app), the
  **`externalBin` sidecar** `node-x86_64-pc-windows-msvc.exe`, the **`resources/gen/` tree** (the
  certified generator copy — the whole product depends on this), the WebView2 loader, and icons/assets.

### 2.3 The wrap recipe (documented — reproducible; the wrap itself is Leela's machine)

```
# On a Windows machine with the Windows SDK (MakeAppx / SignTool) — NOT this shell:
1. cd desktop && npx tauri build --bundles msi nsis      # beforeBuildCommand re-syncs resources/gen
   → target/release/  (Bedrock.exe + node.exe sidecar + resources/gen/**  laid out)
2. Assemble the MSIX payload dir:  copy the release exe + node sidecar + resources/gen/** + assets
   + desktop/msix/AppxManifest.xml  into  build/msix-payload/
3. MakeAppx.exe pack /d build/msix-payload /p Bedrock.msix           # Windows SDK
4. (LOCAL sideload TEST only) sign with a dev self-signed cert via SignTool + trust it, then Add-AppxPackage.
   (Store submission needs NO cert — Microsoft signs at certification.)
5. Submit Bedrock.msix to Partner Center → Microsoft signs at cert.
```

### 2.4 Build-here vs DEFERRED (honest)

- **HERE:** author `AppxManifest.xml` (placeholders marked) + validate **XML well-formedness** as far as
  the shell allows (a parse check — e.g. `node`-based or `xmllint` if present; do NOT claim full schema
  validation, which needs the Windows SDK) + document the recipe. **Optionally** a `tauri build --bundles
  msi nsis` with the **Bedrock identity** *if the WiX/NSIS tools are still cached and disk allows*
  (Day-51 A5 built it in ~2m with cached tools) — **attempt-if-cheap, else DEFER** (no claimed build that
  didn't run; watch the tight C: drive).
- **DEFERRED (Leela's Windows machine):** the `MakeAppx pack`, the packaged MSIX launch, the
  sidecar-under-MSIX check, the Store submission — the Windows SDK + `MakeAppx` are not on this shell.

---

## 3. PART 3 — THE BEDROCK IDENTITY (build-here; Windows-only) + the Thraksha/Bedrock distinction

### 3.1 The exact `tauri.conf.json` changes

| Field | From | To |
|---|---|---|
| `productName` | `"Thraksha"` | `"Bedrock"` |
| `identifier` | `"com.thraksha.desktop"` | `"com.thraksha.bedrock"` *(working value — reverse-domain, unique; ties the Bedrock shell to the Thraksha engine)* |
| `app.windows[0].title` | `"Thraksha"` | `"Bedrock"` |

Plus the **shell-facing UI strings**: `index.html` `<title>` and `<h1>` `"Thraksha"` → `"Bedrock"`
(Part 1 authors these together).

- **The Tauri `identifier` is the app bundle id; the MSIX `<Identity Name>` + Publisher are
  Partner-Center-assigned and SEPARATE** (they can differ). The `com.thraksha.bedrock` value is a
  **recommendation**, confirmed at Partner Center — **not** claimed reserved.
- **`identifier` change is runtime-safe:** it changes the app data / WebView2 user-data folder, **not**
  the `resource_dir()`-relative sidecar path (`resources/gen/dist/<entry>` layout is unchanged). The
  generator never reads `tauri.conf.json`.

### 3.2 THE LOAD-BEARING DISTINCTION — Bedrock (shell) renamed; Thraksha (engine) NOT

**Bedrock is the shell/Store product name. Thraksha is the generator engine name.** The generator emits
**inert "Thraksha" provenance strings** in generated output (Day-41 — ownership comments, the manifest;
deliberately NOT stripped because stripping rewrites the deterministic output and **moves every frozen
hash**). **Day 55 renames ONLY the shell/Store identity — it does NOT touch any generator template,
provenance string, or `resources/gen` content.** Renaming the engine's inert markers would be a
determinism killer (§Spine 1) and is **explicitly out of scope**.

### 3.3 The "Bedrock" name — OPEN, honest-manual (NOT reserved)

"Bedrock" is a very common word (Minecraft Bedrock, AWS Bedrock, Bedrock Linux) → **likely a Store
conflict** (Day-51 A7). The name-availability check is on **Leela's Partner Center** (no account/browser
here). **Flag it; prepare a variant** (e.g. *Bedrock Studio* / *Bedrock Forge* / *Thraksha Bedrock*). The
identity fields are authored to the working "Bedrock" value; **the name is NOT claimed reserved.**

---

## 4. THE SPINE — generation untouched (the release build-out must not disturb determinism)

1. **GENERATION UNTOUCHED:** the front-end, MSIX manifest, and identity are **shell/packaging** changes —
   they change **NO generator source**. The frozen backstop (103 baked + 10 + non-hash) stays
   **byte-identical**; the sidecar stays == the certified generator byte-for-byte. **A moved hash =
   FINDING, STOP** (§3 of the guardrails).
2. **THE FRONT-END IS A THIN CLIENT:** it CALLS the certified commands (themselves thin invokers) and
   RENDERS `stdout` — **no generation logic in JS, no reimplementation, no parsing/transforming** of
   generator output. It consumes the Day-53 `SidecarResult` contract faithfully.
3. **HONEST BUILD-HERE vs DEFERRED:** the front-end wiring + the identity change + the manifest authoring
   (+ a `tauri build msi/nsis` if it runs cheaply) are provable HERE; the **MakeAppx wrap + packaged GUI
   launch + Store submission + Bedrock name reservation** are DEFERRED to Leela's Windows/Store machine —
   **no claimed packaged MSIX / GUI launch / name reservation that didn't happen.**

### The generation-untouched proof (run in EXECUTE, after the changes)
- `cd generator && npm run day20:regress` → **194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…`
  byte-identical** (generator untouched → hash-neutral by construction; proven anyway).
- `cd desktop && npm run sync-gen:check` → **OK, stamp `c43773ae…` unchanged** (sidecar == certified; no
  generator change ⇒ no re-sync needed).
- `git status --short` → only **shell/packaging** files changed (`src/main.js`, `src/index.html`,
  `src-tauri/tauri.conf.json`, new `src-tauri/msix/*`, docs) — **no `generator/` source**; `resources/gen`
  gitignored.
- `cargo check` (desktop/src-tauri) → **clean** (front-end/JSON changes don't alter Rust; a config change
  is re-read by `tauri-build`).

---

## 5. EXECUTE done-conditions (staged; scope honestly)

1. **THE FRONT-END UI:** `index.html` loads `main.js` (+ the command panels + results area); `main.js`
   wires the **5 commands** via `window.__TAURI__.core.invoke` and renders the **`SidecarResult`** — the
   **env-error (catch) / clean (exit 0) / findings (scan exit 1) / other-nonzero** branches. **A thin
   client — no generation logic in JS.** `node --check main.js` passes. `--model` = a **raw textarea**
   (store-backed picker DEFERRED, stated). The **live click-through is DEFERRED** (no GUI session).
2. **THE MSIX PACKAGING PATH:** `desktop/src-tauri/msix/AppxManifest.xml` authored (identity = Bedrock via
   marked placeholders; `runFullTrust`; the payload incl. the node sidecar + `resources/gen`) +
   `msix/README.md` recipe (`tauri build` → payload → `MakeAppx` → MSIX → Partner Center). XML
   well-formedness checked HERE; the **`tauri build msi/nsis` with the Bedrock identity attempted
   if-cheap, else DEFERRED honestly**; the **MakeAppx wrap DEFERRED** (Leela's machine).
3. **THE BEDROCK IDENTITY:** `tauri.conf.json` `productName`/`identifier`/`title` → Bedrock (Windows-only)
   + the `index.html` shell strings. The **generator provenance strings UNTOUCHED** (Thraksha stays).
   The **name-availability flagged** (Leela's Partner Center — not claimed reserved).
4. **GENERATION UNTOUCHED:** the frozen backstop byte-identical (103 baked + 10 + non-hash); the sidecar
   == certified byte-for-byte (`c43773ae…`); no `generator/` source changed; generator `deps {}`
   unchanged. **A moved hash = FINDING, STOP.**
5. **HONEST:** what's built/verified HERE (front-end authored + `node --check` + invoke-wiring
   proven-by-inspection; identity; manifest + XML-wellformed; msi/nsis build **if it ran**) vs DEFERRED
   (MakeAppx wrap, packaged GUI launch/click-through, Store cert, Bedrock name reservation) — **no claimed
   packaged launch/reservation that didn't run.**

## 6. REPORT done-conditions

`eco-day-55-report.md`: the front-end UI (the invoke wiring table + the `SidecarResult` rendering —
env-error/clean/findings/other; `--model` staged raw, store-picker deferred; live click-through deferred);
the MSIX path (the `AppxManifest.xml` + the wrap recipe; build-here vs deferred; the msi/nsis build result
if attempted); the Bedrock identity (the `tauri.conf.json` change; the Thraksha-engine-vs-Bedrock-shell
distinction; the name flagged not reserved); the generation-untouched proof (backstop byte-identical;
sidecar == certified; `deps {}`; git shows shell-only). **Forward-flags:** build-here-done vs
Leela's-machine (MakeAppx wrap + packaged launch + Store submission + name reservation); the updated gap
list; **Day 58** (the final full-system regression, packaged) + **Day 60** (release + final docs).

---

## 7. SCOPE GUARD — OUT (do not drift)

- The front-end is a **THIN CLIENT** — **no generation logic in JS** (a reimplementation / parse /
  transform of generator output = a FINDING).
- The front-end + MSIX + identity are **shell/packaging** changes — **generation UNTOUCHED** (a moved
  hash = FINDING, STOP).
- **Do NOT rename the generator's inert "Thraksha" provenance strings** (that moves every frozen hash —
  Bedrock = shell; Thraksha = engine).
- **NO cert/EV/notarization** (Microsoft signs the MSIX at certification).
- The **MakeAppx wrap + packaged GUI launch + Store submission + Bedrock name reservation** are Leela's
  Windows/Store machine (honest-manual) — **no claimed packaged launch/reservation**.
- The **store-backed `--model` picker** is DEFERRED (wire the raw calls first); **no new blueprint-store
  command** this day.
- The sidecar stays == certified byte-for-byte; **no new dependency**; **NO AI in the product** (ADR-001).
- **Do NOT widen `capabilities/default.json`** unless a runtime denial proves it necessary (over-permission
  = a finding).

## 8. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + Day-53/52/51 reports + the real shell (`main.js`, `index.html`, `tauri.conf.json`,
   `capabilities`, `commands.rs`) — **yes**.
2. Session = **PLAN** — this file only, no code/build — **yes**.
3. Frozen baselines NOT to move: 103 baked + MAXIMAL `366e19d9…` — shell/packaging-only ⇒ untouched;
   proven anyway — **understood**.
4. AI touchpoint: **none** — the front-end is a thin client of the AI-free certified commands; no AI wired
   (ADR-001) — **yes**.
5. The default/empty path a literal bypass: empty backend/model fields ⇒ omit the arg ⇒ the command's
   Day-52 demo bypass — **honored**.
6. The three determinism killers for output-touching change: **none** — no generator output is touched
   (shell/packaging only) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + `sync-gen:check` + `git status` +
   `cargo check`; a moved hash = STOP-and-report — **yes**.
8. Overclaim / out-of-scope watch: no live GUI click-through claimed; no MSIX wrap / name reservation
   claimed; the store picker deferred; the engine provenance untouched — **guarded**.

---

*Day 55 plan: the release build-out, honestly staged. Part 1 — the front-end UI: a THIN CLIENT on
`main.js`/`index.html` (currently a static stub that doesn't even load `main.js`) that calls the 5
Day-52 commands via the global `window.__TAURI__.core.invoke` (no bundler → the global API, not an npm
import) and renders the Day-53 `SidecarResult { stdout, stderr, exit_code }` across its four branches —
rejected promise = environment problem, `exit_code 0` = clean, scan `exit_code 1` = CERTAIN findings (NOT
an error — gap #6's point), other non-zero = informational; `--model` staged as a raw textarea, the
store-backed picker deferred; the live click-through deferred (no GUI session — authored + `node --check`
+ invoke-wiring proven-by-inspection). Part 2 — the MSIX path: author `desktop/src-tauri/msix/
AppxManifest.xml` (identity = Bedrock via marked placeholders, `runFullTrust`, payload incl. the node
sidecar + `resources/gen`) + a reproducible wrap recipe (`tauri build` → payload → `MakeAppx` → MSIX →
Partner Center); XML-wellformedness + an optional if-cheap msi/nsis build HERE, the MakeAppx wrap +
packaged launch DEFERRED. Part 3 — the Bedrock identity: `tauri.conf.json` productName/identifier
(`com.thraksha.bedrock`, working)/title → Bedrock + the shell strings, Windows-only; the generator's
inert "Thraksha" provenance strings UNTOUCHED (Bedrock = shell, Thraksha = engine — renaming them moves
every frozen hash); the name flagged for Leela's Partner Center, NOT reserved. The spine: generation
untouched (backstop byte-identical, sidecar == certified, deps {}); the front-end a thin client (no
generation logic in JS); honest build-here (front-end/identity/manifest/msi-nsis) vs deferred (MakeAppx
wrap/packaged launch/Store cert/Bedrock name). No code, no builds this session — the plan governs the
release build-out.*
