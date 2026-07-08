# Eco-Day 55 — REPORT: the RELEASE BUILD-OUT — front-end UI + MSIX path + the Bedrock identity

**Phase 4, Day 55 — the release stretch.** Three release-critical parts, honestly staged: **(1)** the
front-end UI — a **THIN CLIENT** on `main.js`/`index.html` that calls the 5 Day-52 commands via
`window.__TAURI__.core.invoke` and renders the Day-53 `SidecarResult`; **(2)** the MSIX packaging path —
the `AppxManifest.xml` + a reproducible wrap recipe (the MakeAppx wrap deferred); **(3)** the Bedrock
identity — `tauri.conf.json` + the shell strings, **shell-only** (the generator's inert "Thraksha"
provenance strings **untouched**). **Generation untouched; the front-end carries no generation logic.**

**Backstop re-confirmed from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked digests, MAXIMAL `366e19d9…` unchanged — no frozen hash moved.**
`sync-gen:check` → **OK, sidecar == certified generator `c43773ae…` (237 files).** `git status` → only
`desktop/` (shell) + docs changed; **`generator/` untouched.** Generator `deps` absent (≡ `{}`).

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. Part 1 — the front-end UI (thin client on the SidecarResult contract) — DC-1

[`index.html`](../../desktop/src/index.html) was a static placeholder that **didn't even load `main.js`**;
[`main.js`](../../desktop/src/main.js) was empty. Both are now wired. `index.html` loads `main.js`
(`<script src="./main.js" defer>`) and hosts one panel per command + a shared results `<pre>`; `main.js`
is the thin client.

**The invoke mapping** (`const { invoke } = window.__TAURI__.core;` — the global API, since there is **no
bundler** and `withGlobalTauri: true`; **not** an npm import):

| Button | `invoke(name, args)` | Args (camelCase → Rust snake_case) |
|---|---|---|
| Detect toolchains | `invoke('detect_toolchains')` | — |
| Flow map | `invoke('flow_map', { backend?, model? })` | optional; empty ⇒ key omitted ⇒ demo bypass |
| Impact preview | `invoke('impact_preview', { backend?, model? })` | optional |
| Scan | `invoke('scan_project', { projectDir })` | required |
| Export | `invoke('export_project', { targetDir, backend?, model? })` | targetDir required |

> **Arg-casing note (honest correction):** the execute prompt's parenthetical said "snake_case keys
> (target_dir…)". The **commands carry no `#[command(rename_all)]`**, so Tauri v2's **default
> `rename_all = "camelCase"`** applies — the **JS side passes camelCase** (`targetDir`, `projectDir`),
> which Tauri maps to the Rust snake_case params (per the Tauri v2 docs). The front-end uses **camelCase**,
> matching the Day-55 plan. (Confirm on the live GUI run — deferred.)

**The four render branches on the Day-53 `SidecarResult { stdout, stderr, exit_code }`** (read
`result.exit_code` — snake_case on the wire, the Rust struct has no `rename_all`):
- **rejected promise (`catch`) → environment problem** (red) — Day-53 `Err` = spawn/env failure ONLY.
- **`exit_code === 0` → clean/success** (green) — `stdout` shown.
- **`exit_code === 1` on `scan_project` → CERTAIN findings** (amber) — rendered from `stdout` **as
  results, NOT an error** (gap #6's whole point).
- **other completed non-zero → informational** (neutral) — `stdout` + `stderr` shown (e.g. export usage
  exit 2).

**`--model` = a raw textarea** (paste a `BlueprintChoices` JSON or a file path → the command's existing
`model` arg). **The store-backed blueprint picker is DEFERRED** (the SQLite `blueprint_store.rs` isn't yet
exposed as a Tauri command — its own unit).

**THIN CLIENT (verified):** `main.js` only **invokes** the certified commands and renders their `stdout`
**verbatim** — **no generation logic, no parsing/transforming** of generator output.

**Verified HERE (honest, partial):**
- `node --check main.js` → **syntax OK**.
- **Static browser preview** (`python -m http.server` over `desktop/src`): the page renders (Bedrock
  title + all 5 panels + inputs + results area); **`main.js` loaded and executed with ZERO console
  errors**; clicking a button correctly hit the **no-backend guard** and rendered the **env-error branch**
  with the right red styling (`#output.env-error`, `rgba(198,40,40,0.08)`). This proves DOM binding + the
  guard + one render branch.
- **DEFERRED (no GUI/Tauri session here):** the **live `invoke` round-trip** — the clean / findings /
  other-nonzero branches driven by real sidecar output — needs the Tauri WebView + backend. **Leela's
  packaged/`tauri dev` click-through.** No live command round-trip is claimed.

## 2. Part 2 — the MSIX packaging path — DC-3

MSIX is **not** a Tauri v2 target (`tauri build` = msi/nsis). Authored **HERE** as the external-wrap
inputs:
- [`desktop/src-tauri/msix/AppxManifest.xml`](../../desktop/src-tauri/msix/AppxManifest.xml) —
  `DisplayName="Bedrock"`; **`Identity Name`/`Publisher`/`PublisherDisplayName` are MARKED PLACEHOLDERS**
  (`{{STORE_IDENTITY_NAME}}` etc.) — **Partner-Center-assigned, NOT invented**; `Version="0.1.0.0"`;
  **`<rescap:Capability Name="runFullTrust"/>`** (REQUIRED — Bedrock spawns the bundled `node.exe`
  sidecar); `<Application Executable="Bedrock.exe" EntryPoint="Windows.FullTrustApplication">` +
  `VisualElements`. **XML validated well-formed HERE** (`xml.etree` parse). *Full MSIX schema validation
  needs the Windows SDK — deferred; only well-formedness is claimed.*
- [`desktop/src-tauri/msix/README.md`](../../desktop/src-tauri/msix/README.md) — the reproducible **wrap
  recipe** (`tauri build msi/nsis` → assemble payload [exe + node sidecar + `resources/gen` + manifest +
  logos] → `MakeAppx.exe pack` → local sideload-test signing note → Partner Center) + the build-here-vs-
  deferred table + the placeholder key.

**DEFERRED:** the actual **`MakeAppx.exe pack`** (Windows SDK / `MakeAppx` not on this shell), the
packaged launch + sidecar-under-MSIX check, the Store submission — **Leela's Windows/Store machine**.

## 3. Part 3 — the Bedrock identity (shell-only) + the msi/nsis build — DC-2, DC-4

**The identity change** ([`tauri.conf.json`](../../desktop/src-tauri/tauri.conf.json)):

| Field | From | To |
|---|---|---|
| `productName` | `Thraksha` | **`Bedrock`** |
| `identifier` | `com.thraksha.desktop` | **`com.thraksha.bedrock`** (working reverse-domain) |
| `app.windows[0].title` | `Thraksha` | **`Bedrock`** |

Plus the shell strings in `index.html` (`<title>` + `<h1>` → Bedrock).

**SHELL-ONLY (load-bearing, DC-2):** the generator emits **inert "Thraksha" provenance strings** in its
output (77 source files reference "Thraksha"). **NONE were touched:** `git status -- generator/` is
**empty**, and `npm run day20:regress` after the rename → **194 OK / 103 baked byte-identical, MAXIMAL
`366e19d9…`** — **the rename moved NO frozen hash** (it did not leak into the generator). **Bedrock = the
shell/Store product; Thraksha = the generator engine (provenance unchanged).**

**The name is NOT reserved:** "Bedrock" is a very common word (Minecraft/AWS/Linux Bedrock) → likely a
Store conflict. **Flagged for Leela's Partner Center** (name-availability + reservation); a variant
(Bedrock Studio / Forge / Thraksha Bedrock) prepared in the README. **NOT claimed reserved.**

**The msi/nsis build — BUILT HERE with the Bedrock identity (DC-4):** WiX/NSIS cached (Day 51), 20 G free,
prior release build present → cheap. `npx tauri build --bundles msi nsis` (1m 08s; `beforeBuildCommand`
re-synced `resources/gen` to the certified `c43773ae…`, 237 files):
- **`Bedrock_0.1.0_x64_en-US.msi`** — 37.7 MB (fresh).
- **`Bedrock_0.1.0_x64-setup.exe`** — 25.5 MB (fresh).
- The **bundled node sidecar** (85 MB) + **`resources/gen`** (certified `c43773ae…`) staged in
  `target/release`. → **The Bedrock-identity MSI/NSIS payload (with the certified sidecar) builds HERE.**
  *(The MSI/NSIS is the INPUT to the MSIX wrap, not the Store artifact. Stale `Thraksha_*` bundles remain
  from Day 51 in gitignored `target/` — harmless.)*

## 4. Generation untouched + invariants — DC-5, DC-6

- **Backstop byte-identical (from clean):** `rm -rf dist && npm run build && npm run day20:regress` →
  194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` — no frozen hash moved.
- **git scope:** only `desktop/src-tauri/tauri.conf.json`, `desktop/src/index.html`,
  `desktop/src/main.js`, `desktop/src-tauri/msix/**` (new), + docs. **`generator/` untouched.**
- **Sidecar == certified:** `sync-gen:check` OK — `c43773ae…`. **`deps {}`** (generator `dependencies`
  absent).
- **Thin client:** `main.js` invokes + renders only — no generation logic in JS.
- **ACL verified (DC-6):** `capabilities/default.json` **unchanged** — app commands (via
  `generate_handler!`) need no ACL entry in Tauri v2 (the release build registered all 5 and bundled
  clean); the `shell:allow-execute` for the sidecar remains. No over-permissioning.
- **No AI in the product (ADR-001):** the front-end is a thin client of the AI-free certified commands;
  nothing AI wired.

## 5. Honest — build-here vs deferred

**Built / verified HERE:**
- The **front-end** (authored + `node --check` + static-preview: layout/binding/guard/env-error branch).
- The **Bedrock identity** (`tauri.conf.json` + shell strings; provenance untouched, regress byte-identical).
- The **`AppxManifest.xml`** (marked placeholders, `runFullTrust`, payload) + the **wrap recipe**; XML well-formed.
- The **Bedrock-identity MSI + NSIS build** (with the certified sidecar staged).

**Deferred — Leela's Windows/Store machine (honest-manual):**
- The **live GUI `invoke` click-through** (the clean/findings/other branches on real sidecar output).
- The **MakeAppx MSIX wrap** + the **packaged launch / sidecar-under-MSIX** check.
- The **Store submission** (Microsoft signs at certification).
- The **"Bedrock" name reservation** (Partner Center) — **NOT reserved**; variant prepared.

**No packaged MSIX, no live GUI command round-trip, and no name reservation were performed or claimed.**

## 6. Forward-flags

**Updated gap list (release punch-list):**

| # | Gap | Status |
|---|---|---|
| 1 | **Front-end UI** on the SidecarResult contract | **DONE (build-here)** — thin client, 5 commands, 4 render branches; live click-through deferred |
| 2 | **MSIX wrap** — `MakeAppx` + `AppxManifest` | **Manifest + recipe DONE here**; the wrap is Leela's machine |
| 3 | **Bedrock name** reservation | OPEN — Leela's Partner Center (not reserved; variant ready) |
| 4 | **Packaged GUI launch + sidecar-under-MSIX** | OPEN — Leela's machine |
| 5 | **Product identity** → Bedrock | **DONE (build-here)** — `productName`/`identifier`/`title`; MSIX `Identity` = Partner-Center placeholders |
| 6 | **Store-backed `--model` picker** (blueprint-store command + UI) | DEFERRED — raw textarea shipped this day |

- **Day 58** picks up the **final full-system regression (packaged)** — the Month-3 analogue of Day-20:
  all frozen baselines from clean, cross-OS byte-identity, the packaged sidecar path, export standalone,
  the Map truthfulness, the security layers — everything green, packaged.
- **Day 60** — release + final docs (`CAPABILITIES.md`, the honest closing record; the signed/Store
  builds).
- **Release scope restated:** Bedrock / Microsoft Store / MSIX / Microsoft-signs / Windows-only.

---

*Day 55 built the release build-out, honestly staged. Part 1 — the front-end: `index.html` (was a static
placeholder that didn't load `main.js`) + `main.js` (was empty) now form a THIN CLIENT that calls the 5
Day-52 commands via the global `window.__TAURI__.core.invoke` (no bundler → the global API; camelCase args
per Tauri v2's default `rename_all`, correcting the prompt's "snake_case" note) and renders the Day-53
`SidecarResult` across four branches — rejected promise = environment problem, `exit_code 0` = clean,
scan `exit_code 1` = CERTAIN findings (results, NOT an error — gap #6), other non-zero = informational;
`--model` a raw textarea, the store-backed picker deferred; NO generation logic in JS. Verified HERE via
`node --check` + a static browser preview (layout + button binding + the no-backend guard + the env-error
render branch, zero console errors); the live GUI `invoke` round-trip deferred (no Tauri session). Part 2
— the MSIX path: `desktop/src-tauri/msix/AppxManifest.xml` (DisplayName Bedrock, Identity/Publisher as
MARKED Partner-Center placeholders — not invented, `runFullTrust` for the sidecar spawn, payload = exe +
node sidecar + resources/gen) + a reproducible wrap recipe (`tauri build` → payload → `MakeAppx` → MSIX →
Partner Center); XML validated well-formed HERE, the MakeAppx wrap deferred. Part 3 — the Bedrock identity:
`tauri.conf.json` productName → Bedrock, identifier → com.thraksha.bedrock, title → Bedrock + the shell
strings; SHELL-ONLY — the generator's inert "Thraksha" provenance strings across 77 files UNTOUCHED
(`git -- generator/` empty; regress byte-identical after the rename — the rename moved no frozen hash);
the name flagged for Partner Center, NOT reserved. The Bedrock-identity MSI (37.7 MB) + NSIS (25.5 MB)
built HERE with the certified sidecar (`c43773ae…`, 237 files) staged. Generation untouched: backstop
byte-identical from clean (194 OK / 103 baked, MAXIMAL `366e19d9…`), git shows only desktop/ + docs,
sidecar == certified, deps {}; the front-end a thin client; ACL unchanged (app commands need none in Tauri
v2); no AI (ADR-001). Deferred honestly to Leela's machine: the live GUI click-through, the MakeAppx wrap,
the packaged launch, the Store submission, the Bedrock name reservation — none claimed. Day 58 picks up the
final full-system regression (packaged); Day 60 the release.*
