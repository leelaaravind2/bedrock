# Eco-Day 51 — REPORT: the packaging-readiness audit + the Fable-5 hardening-pass framing

**Phase 4, Day 51 — the release stretch OPENS (Days 51–60).** Day 50 was the last feature day; the
build is **feature-complete** (7 project types × 5 stacks, Figma, CI/CD, exporter, security scans, the
Map). Day 51 is **DIAGNOSTIC + FRAMING** — it surfaces every packaging gap early and frames the
Day-52+ Fable-5 pass. **It changed no generation.**

**RELEASE SCOPE (LOCKED — supersedes the Day-50 "macOS Developer ID + Windows EV" flag):** the desktop
app ships as **"Bedrock"**, distributed **FREE via the Microsoft Store as an MSIX** — **Microsoft signs
at certification** (NO cert to buy, NO EV, NO token, NO notarization). **WINDOWS-ONLY**; macOS/Linux
desktop **OUT OF SCOPE**. There is **no EV cert and no macOS notarization** on the release path.

**Backstop re-confirmed from clean (A6):** `rm -rf dist && npm run build && npm run day20:regress` →
**PASS, 194 OK / 0 FAIL, 103 baked digests (unchanged), MAXIMAL `366e19d9…` unchanged — no frozen hash
moved.** `git status` shows only the untracked plan/report; `resources/gen` is gitignored (a
regenerated copy — no generator source touched). The audit disturbed **no generation**.

---

## 1. The packaging-audit result

### A1 (LOAD-BEARING) — sidecar-sync integrity == certified generator, byte-for-byte ✅

`resources/gen` had been **STALE since Day 41** — stamp `e8df6efb…` (**175 files**), predating the whole
Phase-4 surface (exporter / scan / ai-scan / the Map). The audit refreshed it:

- `cd desktop && npm run sync-gen` → rebuilt the generator (`tsc`), re-copied `dist/`+`plugins/`, and
  re-stamped: **`14e7a107e7f13af2…` (235 files)** — the new **certified Phase-4 sidecar content hash**.
- `npm run sync-gen:check` → **OK — resources match the current generator build (`14e7a107…`).** The
  shipped `resources/gen` == the current generator build **byte-for-byte**. **No drift** → no finding.
- Phase-4 code now present in the sidecar: `dist/map/`, `dist/scan/`, `dist/export.js`,
  `dist/flow-map.js`, `dist/bench-export.js` — confirmed staged.

`sync-gen` rebuilds a **gitignored COPY** of the generator's output; it touches **no generator source**
and emits no generated artifact. The load-bearing integrity guard is green.

### A2 (LOAD-BEARING) — the bundled node reproduces the frozen digests against the FRESH Phase-4 resources ✅

The **bundled** sidecar `binaries/node-x86_64-pc-windows-msvc.exe` (**v22.21.0**, 85 MB) run against the
freshly-synced `resources/gen/dist/day20-regression.js --emit-digests`:

- Emitted **103 DIGEST lines**; the script self-asserted **`Day-20 regression: PASS`**.
- **Airtight proof:** diffed the bundled-node digest output against the certified system-node output —
  **103 vs 103, byte-identical (empty diff).**

**This is the day's most important result:** the *packaged* sidecar generates **identically** to the
certified generator, now with the **full Phase-4 code in the sidecar**. **Determinism survives into the
bundle.** The whole release rests on solid ground.

### A3 — the MSIX-target gap (confirmed) — P0

`npx tauri build --help` → `--bundles [<BUNDLES>...]  [possible values: msi, nsis]`. **MSIX is NOT a
Tauri v2 bundle target** — Tauri's Windows bundler produces an MSI (WiX) or an NSIS `.exe`, never an
`.msix`. **`MakeAppx` is NOT on this shell's PATH** (Windows SDK not resolved here).

→ The Store/MSIX path needs an **EXTERNAL wrap**: take the Tauri build payload (the app `.exe` +
WebView2 loader + the `externalBin` node sidecar + the `resources/gen` tree) into an **MSIX layout +
`AppxManifest.xml`**, then run the Windows SDK **`MakeAppx.exe pack`**; the **Store signs at
certification**. **Honest-manual on Leela's Windows machine** (needs the SDK).

**The `AppxManifest.xml` essentials (for the checklist):**
- **Identity** — `Name` (the Store-reserved app identity for "Bedrock"), `Publisher` (the Store-assigned
  `CN=…`), a 4-part `Version`. (Supersedes `productName "Thraksha"` / `identifier "com.thraksha.desktop"`.)
- **Capabilities** — `runFullTrust` (a packaged Win32/desktop app spawning a bundled `node.exe` sidecar).
- **Application** — the app `.exe` entry point + display name/logo.
- **Payload** — the Tauri app `.exe`, WebView2 loader, the `externalBin` node sidecar, and the
  **`resources/gen` tree** (the certified generator copy from A1).

### A4 — the command-surface gap (confirmed) — P0

`grep` over `desktop/src-tauri/src` for `#[tauri::command]` / `invoke_handler` / `generate_handler` →
**zero matches**. `detect_toolchains` / `fn detect` → **zero matches**. On startup, `lib.rs` only spawns
the bundled node against `resources/gen/dist/day20-regression.js --emit-digests` (the Day-9 digest
**self-test**) and writes the result to a temp file.

→ **The Phase-4 surfaces (export / scan / impact-map / flow-map) are NOT wired through the shell** — they
exist only as generator CLIs + the wizard-server HTTP routes. **The packaged app only self-tests.** The
packaged-path **`detect_toolchains` command is PENDING** (detection lives in the generator's `detect/` +
the wizard `/api/detect`, dev-surface-only). **Wiring needed (Day 52+ candidate):** a Tauri command
surface (`#[tauri::command]` + `invoke_handler`) exposing export/scan/impact-map/flow-map/detect, OR
hosting the generator's `server.ts` wizard, THEN a packaged launch test. **Not built this day** (gap).

### A5 — MSI/NSIS build attempt — **BUILT HERE** ✅ (with the fresh Phase-4 sidecar)

cargo 1.96.1 / rustc 1.96.1 / tauri-cli 2.11.4 on PATH; WiX/NSIS bundler tools already cached
(`~/AppData/Local/tauri/{WixTools314,NSIS}`) → **no heavy download needed**. A prior build existed from
Day 50 (stale sidecar). A **fresh `npx tauri build --bundles msi nsis`** completed HERE:

- `beforeBuildCommand` ran `sync-gen` → re-synced `resources/gen` to the Phase-4 hash `14e7a107…`
  (235 files) before bundling.
- Compiled `desktop.exe` in **2m 09s** (incremental); produced both bundles.

**Fresh artifacts confirmed (rebuilt this session):**
- `target/release/bundle/msi/Thraksha_0.1.0_x64_en-US.msi` — **37.7 MB**
- `target/release/bundle/nsis/Thraksha_0.1.0_x64-setup.exe` — **25.5 MB**
- `target/release/desktop.exe` (12.9 MB) + `target/release/node.exe` sidecar (85 MB) present.
- `target/release/resources/gen/` staged with the Phase-4 code (`map/`, `scan/`, `export.js`,
  `flow-map.js`) and the certified stamp **`14e7a107…` (235 files)**.

→ **The MSI/NSIS payload with the Phase-4 sidecar builds HERE.** *(Note: the `productName` is still
`Thraksha` / `com.thraksha.desktop` — the artifact carries the pre-release name; the Bedrock/Store
identity is a later day. Also: the MSI/NSIS payload is the **input** to the MSIX wrap, not the Store
artifact itself.)*

### A7 — the "Bedrock" Store-name concern — honest-manual, NOT reserved

**"Bedrock" is a very common word** — Minecraft Bedrock, AWS Bedrock, Bedrock Linux, … → **likely a
Store name conflict.** The name-availability check is on **Leela's Partner Center** (no account /
browser-auth in this shell) → **honest-manual**. Flag EARLY and prepare a **variant** (e.g. *Bedrock
Studio*, *Bedrock Forge*, *Thraksha Bedrock*). **The name is an OPEN concern — it is NOT claimed
reserved.**

---

## 2. The prioritized gap list — the release punch-list before submission

| # | Gap | Priority | Build-here vs Leela's machine |
|---|---|---|---|
| 1 | **MSIX packaging path** — not a Tauri target; needs `MakeAppx` + `AppxManifest.xml` + Store identity | **P0** | MSI/NSIS payload builds HERE (A5); the **MSIX wrap is Leela's Windows machine** (Windows SDK; no `MakeAppx` here) |
| 2 | **Phase-4 surfaces through the shell** — no command surface; the packaged app only self-tests | **P0** | **Build-here** (a Tauri command surface is Rust+TS in this repo) — this is real wiring work, scoped as a Day-52+ candidate |
| 3 | **Bedrock name decision** — very common word, likely conflict | **P1 (do EARLY)** | Leela's Partner Center (name check + reserve); the **variant decision** can be made here |
| 4 | **Packaged GUI launch + sidecar-under-MSIX** — `resource_dir()` + bundled-node spawn + forward-slash arg must hold **packaged**, not just `tauri dev` | **P1** | **Leela's machine** (install the MSIX on a clean Win 11 box, launch, confirm the sidecar spawns under the MSIX container) |
| 5 | **`detect_toolchains` packaged command** — PENDING (dev-surface-only) | **P1** | **Build-here** (wire the command), THEN packaged test on Leela's machine |
| 6 | **Product name / identity** — `Thraksha` / `com.thraksha.desktop` → the Bedrock Store identity | **P1** | **Build-here** (`tauri.conf.json` + manifest), pending the name decision |
| 7 | **`resources/gen` freshness in CI/commit** — the standing stale-warning (fixed this day via `sync-gen`; the release build always re-syncs via `beforeBuildCommand`) | **P2** | **Build-here** (green now: `14e7a107…`) |

**The two P0s** are the MSIX wrap (external, deferred) and the **command-surface wiring** (build-here,
real work). The command surface is bigger than a checklist item — wiring the Phase-4 surfaces through
Tauri so the *packaged app* can invoke them may warrant its own day; see Forward-flags.

---

## 3. The backstop-undisturbed proof (A6, load-bearing)

`cd generator && rm -rf dist && npm run build && npm run day20:regress`:
- **`Day-20 regression: PASS`** — **194 OK / 0 FAIL**.
- **103 baked digests asserted** (43 frozen + 1 MAXIMAL + 5 version baselines + 10 relationship +
  non-hash) — unchanged.
- **MAXIMAL `366e19d9deda1caf…`** — unchanged.
- `git status --short` → only `?? docs/daily/eco-day-51-*.md`. `resources/gen` is gitignored (a
  regenerated copy); **no generator source moved; no frozen hash moved.**

The audit built + inspected + packaged; **it changed no generation.**

---

## 4. The Fable-5 hardening-pass framing (Part 2 — documented, NOT run)

The Day-52+ protocol — the Day-45 ADVISORY discipline applied to **Thraksha's OWN code** (a one-time
**DEV-PHASE** step, **NOT a product feature**):

1. **The deterministic gate FIRST (the CERTAIN baseline, green before any AI):** the deterministic
   Semgrep security scan (CERTAIN) + the **full `day20:regress`** (103 baked + 10 + non-hash) + `tsc`
   clean. These catch the structural issues **for certain**; the AI **never runs before this is green**.
2. **THEN Fable 5 SUGGESTS (ADVISORY only):** cross-file / architectural / business-logic issues the
   deterministic scanners **miss** — neutral structured prompts, whole-module/codebase context. Findings
   are **ADVISORY (review required), NEVER a gate** — the Day-45 CERTAIN-vs-ADVISORY distinction, now
   over Thraksha's own source.
3. **Leela reviews + applies each fix BY HAND.** **NO suggestion lands that moves a frozen hash
   silently:** after each applied fix, `day20:regress` must be **green (hash-neutral)** OR the change is
   a **documented deliberate re-baseline** (old→new hash + rationale, isolated, recorded). A moved hash
   that wasn't intended = a **FINDING, STOP** (latent nondeterminism was masked).
4. **Scoped ONE concern at a time** — not a bulk rewrite; each concern is its own reviewed, gated,
   committed step.
5. **The live Fable-5 call is HONEST-MANUAL** — there is **no developer AI key in the shell** (as in
   Days 23/45). Leela runs Fable 5 with her own access and pastes the suggestions back for hand-review.
   **No claimed AI run that didn't happen.**

This is **framing only** — the pass is **not run this day** (Day 52 runs the first concern).

---

## 5. Honest — build-here vs deferred-to-Leela's-machine

**Proven / done HERE (build-here):**
- **A1** sidecar-sync integrity == certified generator, byte-for-byte (`14e7a107…`, 235 files; `sync-gen:check` OK).
- **A2** the bundled node reproduces the **103 frozen digests byte-identical** against the fresh Phase-4 resources (determinism survives into the bundle).
- **A3/A4** the MSIX-target gap + the command-surface gap **identified**.
- **A5** a fresh **MSI + NSIS** build with the Phase-4 sidecar (fresh artifacts + sidecar + Phase-4 `resources/gen` staged).
- **A6** the backstop undisturbed (194 OK / 0 FAIL; no hash moved).

**Deferred (readiness checklist — Leela's Windows/Store machine):**
- The **actual MSIX** (author `AppxManifest.xml` + `MakeAppx.exe pack`; needs the Windows SDK + the Store-reserved identity → Partner Center).
- The **packaged GUI launch** + the **sidecar-under-MSIX** check (install on a clean Win 11 box; the `resource_dir()` resolution + bundled-node spawn + forward-slash arg path must hold **packaged**, not just `tauri dev` — this shell is headless).
- The **Phase-4 surfaces THROUGH THE SHELL** (a Tauri command surface / hosting the wizard) + `detect_toolchains` — future wiring, THEN a packaged launch test.
- The **"Bedrock" Store name** reservation (Partner Center account) — an OPEN concern (likely conflict; variant prepared). **NOT reserved.**

**No packaged MSIX build, no packaged GUI launch, and no name reservation were performed or claimed in
this shell.**

---

## 6. Forward-flags

- **The prioritized gap list (§2)** is the release punch-list before submission.
- **Day 52 picks up:** the **Fable-5 hardening pass — the FIRST concern** (deterministic gate first →
  ADVISORY suggest → hand-applied → no silent hash move → one concern at a time → live call
  honest-manual). **OR** re-prioritize the **command-surface wiring** (§2 gap #2) first — it is bigger
  than a checklist item (wiring the Phase-4 surfaces + `detect` through Tauri so the *packaged app* can
  invoke them is real work), and may deserve its own day before the Day-58 final regression. **Sequencing
  decision open** — decide against the size of the wiring gap.
- **Honest build-here vs deferred** stated plainly (§5).
- **Release scope restated:** **Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
  Windows-only** — supersedes the Day-50 EV + notarization flag.

---

*Day 51 opened the release stretch with a packaging-readiness audit + the Fable-5 hardening-pass framing.
The audit was DIAGNOSTIC — it changed no generation (backstop byte-identical: 194 OK / 0 FAIL, 103 baked,
MAXIMAL `366e19d9…`, no frozen hash moved). The load-bearing proofs held HERE: the synced `resources/gen`
== the certified generator byte-for-byte (`14e7a107…`, 235 files), and the bundled sidecar node
reproduced the 103 frozen digests byte-identical against the FRESH Phase-4 resources (determinism
survives into the bundle). A fresh MSI + NSIS built HERE with the Phase-4 sidecar (the MSIX wrap remains
an external MakeAppx + AppxManifest step, honest-manual on Leela's machine — MSIX is not a Tauri target,
MakeAppx not on this shell). The command surface is EMPTY (0 `#[tauri::command]`) — the Phase-4 surfaces +
`detect_toolchains` are NOT wired through the shell (P0/P1 gaps). The "Bedrock" name is an OPEN concern
(very common word, likely conflict) — flagged, a variant prepared, NOT reserved. Part 2 framed the
Fable-5 hardening pass (Days 52+): ADVISORY-only, the deterministic gate FIRST as the CERTAIN baseline,
Leela reviews + applies by hand with NO silent frozen-hash move, one concern at a time, the live call
honest-manual — a one-time dev-phase step over Thraksha's OWN code, not a product feature. Release scope
LOCKED: Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification / Windows-only. Day 52 picks
up the Fable-5 first concern OR the command-surface wiring if re-prioritized.*
