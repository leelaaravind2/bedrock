# Eco-Day 51 — PLAN: the packaging-readiness audit + the Fable-5 hardening-pass framing

**Phase 4, Day 51 — the release stretch opens. PLANNING ONLY.** This session writes this plan and
nothing else — no implementation, no builds, no file changes except this plan. Day 51 is **diagnostic +
framing**, in two parts:

1. **The packaging-readiness audit** — the sidecar `resources/gen` has been **STALE since Day 41** (it
   predates the whole Phase-4 surface: exporter / scan / ai-scan / the Map). Day 51 does the FIRST real
   packaged-readiness pass with Phase-4 in the sidecar and **surfaces every gap early**: sync the
   sidecar and prove it == the certified generator **byte-for-byte**; establish whether an MSIX can be
   produced at all; identify what is **wired vs PENDING** through the shell; and check the **"Bedrock"**
   Store name. It is **DIAGNOSTIC — it changes no generation.**
2. **The Fable-5 hardening-pass framing (set up, don't run)** — document the Day-52+ protocol:
   **ADVISORY-only, gated behind the deterministic scanners + the backstop, hand-applied, no silent
   hash move, one concern at a time, the live call honest-manual.**

**RELEASE SCOPE (LOCKED — supersedes the Day-50 stale flag):** the desktop app ships as **"Bedrock"**,
distributed **FREE via the Microsoft Store as an MSIX** — **Microsoft signs at certification** (NO cert
to buy, NO EV, NO token, NO notarization). **WINDOWS-ONLY**; macOS/Linux desktop **OUT OF SCOPE**. This
**replaces** the Day-50 report's "macOS Developer ID + Windows EV" forward-flag — there is **no EV cert
and no macOS notarization**.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no
baseline moves silently; §3 **STOP-and-report** — *don't claim a packaged build/launch that didn't
run*; §4 honesty — *build-here vs checklist-deferred, the "Bedrock" name result honest*) →
[`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md) Days 51–60 (the release stretch — note Days
55/58 in the month file still say "signing/notarization"; the LOCKED scope above supersedes them:
Store-signed MSIX, Windows-only) → [`eco-day-50-report.md`](eco-day-50-report.md) (the last feature day;
the Phase-4 mid-benchmark; the standing sidecar-stale flag) → the REAL desktop shell:
[`desktop/CLAUDE.md`](../../desktop/CLAUDE.md),
[`desktop/src-tauri/tauri.conf.json`](../../desktop/src-tauri/tauri.conf.json) (the bundle/target
config), [`scripts/sync-generator-resources.mjs`](../../scripts/sync-generator-resources.mjs) (the
`beforeBuildCommand` sync + the byte-for-byte `--check` guard),
[`desktop/src-tauri/src/lib.rs`](../../desktop/src-tauri/src/lib.rs) (the Tauri command surface + the
sidecar spawn).

**Git (for execute):** commit to `main`, no branches, no PRs.

---

## 0. Grounded this session — resolved by reading the REAL shell

- **MSIX is NOT a Tauri v2 bundle target.** `npx tauri build --help` → **`possible values: msi, nsis`**.
  Tauri's Windows bundler produces an **MSI (WiX)** or an **NSIS `.exe`** — **never an `.msix`**. So the
  Store/MSIX path requires an **EXTERNAL wrap**: take the Tauri build payload (the app `.exe` + WebView2
  + the `externalBin` node sidecar + the `resources/gen` tree) into an **MSIX layout + `AppxManifest.xml`**
  and run the Windows SDK **`MakeAppx.exe pack`**; the **Store signs at certification**. **`MakeAppx`
  is NOT on this shell's PATH** (Windows SDK not resolved here). → **the single biggest gap.**
- **The sidecar sync is the byte-for-byte integrity guard.**
  [`sync-generator-resources.mjs`](../../scripts/sync-generator-resources.mjs): `sync-gen` builds the
  generator (`tsc`), copies `dist/`+`plugins/` into `resources/gen/`, and stamps a **content hash**
  (same `` `/${relPath}\n` `` + bytes convention family as the digest gate). `sync-gen --check`
  **fails** unless the shipped `resources/gen` == the **current generator build byte-for-byte**. It is
  wired into `tauri.conf.json` `build.beforeBuildCommand`.
- **`resources/gen` is STALE (predates Phase-4).** It is PRESENT with stamp
  **`e8df6efb…` (175 files)** — but the current Phase-4 generator hashes DIFFERENTLY (the Day-50/47/45/43/41
  code — `map/`, `flow-map`, `scan/`, `export`, the benchmarks — is not in it). The pre-commit
  `sync-gen:check` has been WARNING stale every day since Day 41. → **the audit runs `npm run sync-gen`
  to rebuild with Phase-4, then `sync-gen:check` must pass.**
- **The Tauri command surface is EMPTY — the Phase-4 surfaces are NOT wired through the shell.**
  [`lib.rs`](../../desktop/src-tauri/src/lib.rs) has **zero `#[tauri::command]` functions and no
  `invoke_handler`**. On startup it only spawns the bundled node against
  `resources/gen/dist/day20-regression.js --emit-digests` (the Day-9 digest **self-test**) and writes
  the result to a temp file. It does **not** expose export / scan / impact-map / flow-map, and it does
  **not** run the wizard server. The frontend (`desktop/src/{index.html,main.js,styles.css}`) is a
  static UI, not the generator's `server.ts` wizard. → **"do the Phase-4 surfaces work through the
  shell" = currently NO; they exist only as generator CLIs + the wizard-server HTTP routes.**
- **The packaged-path `detect_toolchains` command is PENDING.** With no command surface at all, the
  Phase-1 packaged detect command is **not wired** (detection lives in the generator's `detect/` +
  the wizard `/api/detect`, dev-surface-only). → **confirmed PENDING.**
- **The bundled node sidecar exists**: `binaries/node-x86_64-pc-windows-msvc.exe` (85 MB) is present
  (the `externalBin`). **cargo 1.96.1 / rustc 1.96.1 / tauri-cli 2.11.4 are on PATH** — so a `tauri
  build` (MSI/NSIS) *may* run here; the **MSIX wrap + a GUI launch cannot** (no `MakeAppx`, no
  `AppxManifest`, no WebView2 GUI session in this headless shell, no Store identity).
- **`productName` is `"Thraksha"`, `identifier` `"com.thraksha.desktop"`** — the release name **Bedrock**
  and the Store identity are **not yet set** (a later day; flagged).

---

## 1. PART 1 — the packaging-readiness audit (DC-1)

**What CAN be proven HERE (build-here):**
- **A1 — sidecar sync integrity == certified generator (byte-for-byte).** Run `cd desktop && npm run
  sync-gen` (rebuild `resources/gen` from the Phase-4 generator + re-stamp), then `npm run
  sync-gen:check` → must pass (`resources/gen` == the current generator build byte-for-byte; a mismatch
  is a **FINDING**). Record the **new Phase-4 stamp hash** (the certified sidecar content).
- **A2 — the bundled node reproduces the digests against the FRESH Phase-4 resources.** Run the
  **bundled** `binaries/node-x86_64-pc-windows-msvc.exe` against
  `resources/gen/dist/day20-regression.js --emit-digests` → it reproduces the **frozen 44 baked +
  MAXIMAL** exactly (the Day-9 load-bearing sidecar proof, now with Phase-4 code in the sidecar). This
  proves the packaged sidecar path is intact against the current generator.
- **A3 — the MSIX-target gap, confirmed.** `npx tauri build --help` shows `msi, nsis` only (no `msix`)
  — document the **external MakeAppx wrap** requirement + the **`AppxManifest.xml` essentials** (see
  §1.1).
- **A4 — the command-surface gap, confirmed.** `lib.rs` has no `#[tauri::command]`/`invoke_handler` —
  the Phase-4 surfaces + `detect_toolchains` are **not wired through the shell** (gap list).
- **A5 — attempt `tauri build` (MSI/NSIS) as a payload-readiness check IF it completes cheaply.** cargo
  + tauri-cli are present; a `tauri build --bundles nsis` (or `msi`) *may* produce the app payload
  (validating the shell + sidecar + resources package). **Honest:** if it needs network (WiX/NSIS
  download), WebView2, or is too slow/heavy for this shell, **do not force it** — record the outcome and
  defer the actual bundle to Leela's Windows machine. **Never claim a build that didn't complete.**

**What is DEFERRED (readiness checklist, honest-manual on Leela's Windows/Store machine):**
- **The actual MSIX** — author `AppxManifest.xml` (Store identity) + run `MakeAppx.exe pack` (Windows
  SDK) → submit to Partner Center (Store signs). Needs the SDK + the Store-reserved identity.
- **The packaged GUI LAUNCH** — install the MSIX on a clean Win 11 box, launch, and confirm the sidecar
  spawns **under the MSIX sandbox** (MSIX runs the app in a container; the `resource_dir()` resolution +
  the bundled-node spawn + forward-slash arg path must hold **packaged**, not just `tauri dev`).
- **The Phase-4 surfaces THROUGH THE SHELL** — this is **future wiring work** (a Tauri command surface
  or hosting the wizard server), THEN a packaged launch test. Flagged in the gap list, not done here.
- **`detect_toolchains` packaged command** — wire + test packaged (still PENDING from Phase 1).
- **The "Bedrock" Store name** — reserve in Partner Center (needs the account). **"Bedrock" is a very
  common word** (Minecraft Bedrock, AWS Bedrock, Bedrock Linux, …) → **likely conflict**; flag EARLY and
  prepare a variant (e.g. *Bedrock Studio*, *Bedrock Forge*, *Thraksha Bedrock*). Honest-manual result.

### 1.1 The MSIX manifest essentials (documented for the checklist)
- **Identity** — `Name` (the Store-reserved app identity for "Bedrock"), `Publisher` (the
  Store-assigned `CN=…`), a 4-part `Version`. (Supersedes `productName "Thraksha"` / `identifier
  "com.thraksha.desktop"`.)
- **Capabilities** — `runFullTrust` (a packaged Win32/desktop app spawning a bundled `node.exe`
  sidecar).
- **Application** — the app `.exe` entry point + display name/logo.
- **Payload** — the Tauri app `.exe`, WebView2 loader, the **`externalBin` node sidecar**, and the
  **`resources/gen` tree** (the certified generator copy from A1).

### 1.2 The gap list the audit must produce (prioritized)
1. **MSIX packaging path** — not a Tauri target; needs MakeAppx + AppxManifest + Store identity (P0).
2. **Phase-4 surfaces through the shell** — no command surface; the packaged app only self-tests (P0
   for a shippable product; scoped as later wiring work).
3. **`detect_toolchains` packaged command** — PENDING (P1).
4. **Sidecar-under-MSIX path** — unverified packaged (P1).
5. **Product name/identity** — `Thraksha`/`com.thraksha.desktop` → the Bedrock Store identity (P1).
6. **"Bedrock" name availability** — reserve + variant (P1, do EARLY).
7. **resources/gen freshness in CI/commit** — the standing stale-warning; ensure the release build
   always `sync-gen`s (it does via `beforeBuildCommand`, but the committed state warns) (P2).

---

## 2. PART 1 — the backstop undisturbed (DC-2, load-bearing)

The audit is **DIAGNOSTIC — it changes no generation.** `sync-gen` rebuilds `resources/gen` (a
**gitignored COPY** of the generator's `dist/`+`plugins/`) — it **never touches generator SOURCE** and
emits **no generated artifact**. So:
- `rm -rf dist && npm run build && npm run day20:regress` (in `generator/`) → **PASS, 103 baked + 10 +
  non-hash byte-identical, MAXIMAL `366e19d9…`** — unchanged by the audit.
- **If the sidecar sync surfaces a generation change** (the freshly-built `resources/gen` differs from
  what a certified generator should produce, or `day20:regress` moves), that is a **FINDING → STOP**
  (the sidecar copy must match the certified generator byte-for-byte; a moved hash is never a silent
  re-baseline).

---

## 3. PART 2 — the Fable-5 hardening-pass framing (DC-3, framing only — NOT run)

Document the Day-52+ protocol (the Day-45 ADVISORY discipline applied to **Thraksha's OWN code**):

1. **The deterministic gate FIRST (the CERTAIN baseline, green before any AI):** the deterministic
   security scan (Semgrep — CERTAIN) + the **full `day20:regress`** (103 baked + 10 + non-hash) +
   `tsc` clean. These catch the structural issues **for certain**; the AI never runs before this is
   green.
2. **THEN Fable 5 SUGGESTS (ADVISORY only):** cross-file / architectural / business-logic issues the
   deterministic scanners **miss** — neutral structured prompts, whole-module/whole-codebase context.
   Findings are **ADVISORY (review required), NEVER a gate** — exactly the Day-45 CERTAIN-vs-ADVISORY
   distinction, now over Thraksha's own source.
3. **Leela reviews + applies each fix BY HAND.** **NO suggestion lands that moves a frozen hash
   silently:** after each applied fix, `day20:regress` must be **green (hash-neutral)** OR the change is
   a **documented deliberate re-baseline** (old→new hash + rationale, isolated, recorded — §1.1). A
   moved hash that wasn't intended = a **FINDING, STOP** (latent nondeterminism was masked).
4. **Scoped ONE concern at a time** — not a bulk rewrite; each concern is its own reviewed, gated,
   committed step.
5. **A one-time DEV-PHASE step over Thraksha's OWN code — NOT a product feature.** (Distinct from the
   Day-45 product AI-advisory scan, though it borrows the same discipline.)
6. **The live Fable-5 call is HONEST-MANUAL** — there is **no developer AI key in the shell** (as in
   Days 23/45, the live AI call is deferred). Leela runs Fable 5 with her own access and pastes the
   suggestions back for hand-review. **No claimed AI run that didn't happen.**

This is **framing only** — the pass is **not run this day** (Day 52 runs the first concern).

---

## 4. Execute done-conditions

1. **The packaging audit (DC-1):** run A1 (`sync-gen` + `sync-gen:check` → the sidecar == the certified
   Phase-4 generator byte-for-byte; record the new stamp) + A2 (the bundled node reproduces the frozen
   digests against the fresh resources) + A3/A4 (the MSIX-target + command-surface gaps confirmed) +
   A5 (attempt `tauri build` MSI/NSIS **iff** it completes cheaply — else record + defer). Produce the
   **prioritized gap list** (§1.2). The **"Bedrock" name check** result recorded (honest-manual if the
   account isn't reachable here).
2. **The backstop undisturbed (DC-2, load-bearing):** `rm -rf dist && npm run build && npm run
   day20:regress` → PASS, 103 baked + 10 + non-hash byte-identical. The audit changed no generation. A
   moved hash = FINDING, STOP.
3. **The Fable-5 framing (DC-3):** the hardening-pass protocol documented (deterministic gate first →
   ADVISORY suggest → hand-review → no silent hash move → one concern at a time → live call
   honest-manual). **Not run.**
4. **Honest (DC-4):** state plainly **what was actually built/checked HERE** (A1/A2/A3/A4 + any A5) vs
   the **readiness checklist deferred** to Leela's Windows/Store machine (the MSIX wrap, the packaged
   GUI launch, the surfaces-through-shell wiring, `detect_toolchains`, the Store name). The **"Bedrock"**
   name-availability result stated honestly.

> **STOP and report rather than write a clean-looking close.** Do NOT claim a packaged MSIX build or a
> packaged launch that didn't run in this shell. If `sync-gen` or `day20:regress` moves a hash, that is
> a FINDING — the sidecar must match the certified generator byte-for-byte and the audit must disturb
> no generation.

---

## 5. Report done-conditions (`eco-day-51-report.md`)

- **The packaging-audit result:** the MSIX build attempt/checklist; the **sidecar-sync integrity ==
  certified generator** (the new Phase-4 stamp; the bundled-node digest reproduction); the
  **Phase-4-surfaces-through-the-shell** status (not wired); the **`detect_toolchains`** status
  (PENDING); the **sidecar-under-MSIX** status (deferred); the **"Bedrock"** name check.
- **The prioritized gap list** (§1.2) — what must be fixed before submission.
- **The backstop-undisturbed proof** — 103 baked + 10 + non-hash byte-identical; the audit changed no
  generation.
- **The Fable-5 hardening-pass framing** (Part 2) — the protocol, not run.
- **Forward-flags:** the gap list prioritized; **what Day 52 picks up** (the Fable-5 hardening pass —
  the first concern, deterministic gate first, ADVISORY, hand-applied); **honest build-here vs
  deferred-to-Leela's-machine**; the release scope restated (Bedrock / Store / MSIX /
  Microsoft-signs-at-certification / Windows-only — supersedes the Day-50 EV+notarization flag).

---

## 6. SCOPE GUARD — what this day is NOT

- **NOT the Fable-5 run** (Day 52 — Day 51 only **frames** it).
- **NOT the Store submission** (Leela's Partner Center account, later).
- **NOT signing config** — **Microsoft signs the MSIX at certification**; there is **nothing to wire**
  (no cert, no EV, no token, no notarization).
- **NO macOS / notarization / EV** — Windows-only, Store-signed MSIX (supersedes the Day-50 stale flag).
- **The audit is DIAGNOSTIC** — it changes no generation; a moved frozen hash = **FINDING, STOP**.
- **The synced sidecar MUST == the certified generator byte-for-byte** — drift = a **FINDING**.
- **Honest** — build-here vs checklist-deferred; do NOT claim a packaged build/launch that didn't run;
  the "Bedrock" name result stated honestly.

---

*Day 51 opens the release stretch with a packaging-readiness audit + the Fable-5 hardening-pass framing.
The audit is DIAGNOSTIC (changes no generation — the frozen backstop stays byte-identical: 103 baked +
10 + non-hash). Resolved against the real shell: MSIX is NOT a Tauri v2 bundle target (`tauri build`
offers only `msi, nsis`) — the Store/MSIX path needs an EXTERNAL MakeAppx wrap + an AppxManifest + the
Store-reserved "Bedrock" identity (MakeAppx is not on this shell's PATH); `resources/gen` is STALE
(stamp `e8df6efb…`, 175 files — predates all Phase-4 code), so the audit runs `sync-gen` to rebuild it
from the Phase-4 generator and `sync-gen:check` to prove it == the certified generator byte-for-byte
(the load-bearing integrity guard; a mismatch is a FINDING), then runs the bundled node against the
fresh `resources/gen/dist/day20-regression.js --emit-digests` to reproduce the frozen digests; the Tauri
command surface is EMPTY (lib.rs has no `#[tauri::command]`/`invoke_handler` — the startup only runs the
digest self-test), so the Phase-4 surfaces (export/scan/impact-map/flow-map) are NOT wired through the
shell and the packaged-path `detect_toolchains` is PENDING (both on the gap list). What is provable HERE
(the sidecar-sync integrity + the bundled-node digest reproduction + the MSIX-target/command-surface gap
analysis, and a `tauri build` MSI/NSIS attempt iff it completes cheaply) is separated honestly from what
is DEFERRED to Leela's Windows/Store machine (the actual MSIX wrap, the packaged GUI launch + the
sidecar-under-MSIX check, the surfaces-through-shell wiring, the "Bedrock" Store-name reservation — a
very common word, likely needing a variant). Part 2 frames the Fable-5 hardening pass (Days 52+):
ADVISORY-only, the deterministic gate (Semgrep + full day20:regress) FIRST as the CERTAIN baseline, then
Fable 5 SUGGESTS cross-file/architectural issues the scanners miss, Leela reviews + applies each fix by
hand with NO silent frozen-hash move (a moved hash = a FINDING or a documented deliberate re-baseline),
one concern at a time, the live call honest-manual (no AI key in the shell) — a one-time dev-phase step
over Thraksha's OWN code, not a product feature. Release scope LOCKED: Bedrock / Microsoft Store / MSIX
/ Microsoft-signs-at-certification / Windows-only (supersedes the Day-50 EV+notarization flag). Core
pure-Node; the audit disturbs no generation; no frozen hash moved. Day 52 picks up the Fable-5 hardening
pass — the first concern.*
