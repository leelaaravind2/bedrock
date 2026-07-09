# Bedrock — the Store-submission runbook (MSIX go-live)

**Release scope (LOCKED):** Bedrock ships **FREE via the Microsoft Store as an MSIX** —
**Microsoft signs at certification** (NO cert / EV / token / notarization). **Windows-only.**

This is the authoritative **go-live runbook**: the four ordered steps that take the certified,
release-ready **end-user system** (engine + wizard + store + the Map + Verify + export; certified
Eco-Day 69) to the Store. **These steps run on Leela's Windows machine + Partner Center — NOT the dev
shell.** This document is the **recipe**; none of the four steps is claimed done.

MSIX is **not** a Tauri v2 bundle target (`tauri build` produces `msi`/`nsis`). The Store package is an
**external wrap** of the Tauri build payload via the Windows SDK `MakeAppx.exe`.

---

## ⚠ The name ↔ identity dependency (read before starting — two wrap passes)

Step 3 (name reservation) is what **assigns** the `AppxManifest.xml` Identity values (`Name`, `Publisher`,
`PublisherDisplayName`) that the **Store** package needs. So there are **two wrap passes**:

- **Local-TEST wrap** (for step 2): use **placeholder/dev identity + a self-signed cert** → a `.msix` you
  can sideload and launch to verify the app works. **This build is NOT for the Store.**
- **SUBMISSION wrap** (for step 4): after the name is reserved (step 3), substitute the **real** assigned
  identity and re-pack → the `.msix` you submit. **Microsoft signs this at certification.**

**Recommended order:** reserve the name (**step 3**) EARLY to get the identity; run the local-test wrap
(steps 1–2) in parallel to prove the packaged app; then do the submission wrap and submit (**step 4**).

**Placeholders in [`AppxManifest.xml`](AppxManifest.xml)** (Partner-Center-assigned — do NOT invent):

| Placeholder | Source (step 3) |
|---|---|
| `{{STORE_IDENTITY_NAME}}` | Partner Center → the reserved app's **Package/Identity/Name** |
| `{{STORE_PUBLISHER_CN}}` | Partner Center → **Package/Identity/Publisher** (`CN=…`) |
| `{{PUBLISHER_DISPLAY_NAME}}` | Partner Center → **Publisher display name** |

---

## Step 1 — the MakeAppx MSIX wrap

**Input:** the fresh **Eco-Day-69 built payload** (the current shell — wizard + the Map + Verify + export
— with the certified sidecar, sync-gen stamp `83ffd0ad…`/245, now carrying the `flow-svg` +
`impact-nodes` entries). **Tool:** Windows SDK `MakeAppx.exe` (+ `SignTool` for the local test).

```powershell
# 1a. Build the Tauri payload (beforeBuildCommand re-syncs resources/gen to the certified generator).
cd desktop
npx tauri build --bundles msi nsis
#   → target/release/  contains  Bedrock.exe  +  node-x86_64-pc-windows-msvc.exe  +  resources/gen/**
npm run sync-gen:check          # confirm the packaged resources/gen == the certified generator

# 1b. Assemble the MSIX payload dir (exe + sidecar + certified generator + manifest + logos).
$payload = "build/msix-payload"
New-Item -ItemType Directory -Force $payload
Copy-Item target/release/Bedrock.exe                          $payload/
Copy-Item target/release/node-x86_64-pc-windows-msvc.exe      $payload/
Copy-Item target/release/resources                            $payload/resources -Recurse
Copy-Item src-tauri/msix/AppxManifest.xml                     $payload/
# Copy-Item <tile/store logos>                                $payload/assets/   # per VisualElements

# 1c. Substitute the AppxManifest Identity placeholders:
#     - LOCAL-TEST wrap  → dev/placeholder Name + Publisher (matching your self-signed cert subject).
#     - SUBMISSION wrap  → the REAL {{STORE_IDENTITY_NAME}} / {{STORE_PUBLISHER_CN}} /
#                          {{PUBLISHER_DISPLAY_NAME}} from Partner Center (step 3).

# 1d. Pack the MSIX.
MakeAppx.exe pack /d build/msix-payload /p Bedrock.msix

# 1e. (LOCAL sideload TEST only — NOT the Store signature) sign + trust for local install:
#     SignTool sign /fd SHA256 /a /f dev-cert.pfx /p <pw> Bedrock.msix
#     → The Store submission needs NO signing — Microsoft signs at certification.
```

**Done-check:** `Bedrock.msix` produced; `sync-gen:check` confirmed the packaged `resources/gen` ==
certified **before** wrapping.

---

## Step 2 — the packaged launch + the live-GUI walkthrough (Eco-Day-69 Half B)

Sideload the **local-test** `.msix` and verify the app works end-to-end packaged (not just `tauri dev`).
**This is where the Eco-Day-69 Half-B live-GUI checklist gets run** (it is PENDING until then — no live
GUI run is claimed in-repo).

```powershell
Add-AppxPackage .\Bedrock.msix       # sideload (dev cert must be trusted)
# Launch Bedrock from the Start menu.
```

**The 8-item live-GUI walkthrough** (full detail + per-item PASS criteria in
[`../../../docs/daily/eco-day-69-report.md`](../../../docs/daily/eco-day-69-report.md) §3). Each PASS/FAIL
is recorded; any FAIL is a FINDING that blocks the submission until investigated:

1. **Launch** — the Bedrock window opens.
2. **Wizard → Generate** — walk the wizard (or load the TeamTracker preset) → Export to a folder → a real
   project tree on disk + the engine's success stdout + the standalone-export note.
3. **Save + List + Load** — the SQLite file materializes at
   `%APPDATA%/com.thraksha.bedrock/bedrock-blueprints.sqlite`; the loaded blueprint matches.
4. **View diagram** — the certified SVG renders (the user's own entities).
5. **Preview impact** — the text delta renders **and** the diagram highlights exactly the impacted nodes.
6. **Compare versions** — B's diagram painted with the delta; a deleted entity appears in the text delta
   with **no ghost node**.
7. **Verify determinism** — **"Verified — byte-identical"** (a real double-generation through the packaged
   sidecar). A non-empty result is a genuine determinism FINDING — **report it, do not hide it**.
8. **Friendly errors** — a bad `--model` value fires the validation hint with **no invoke**; a forced
   engine error shows a human header + the raw stack under "Technical details".

Underlying contract: the sidecar spawns under MSIX's `runFullTrust`; the `SidecarResult` renders across
its branches (**clean (exit 0)** / **scan findings (exit 1, data not an error)** / **env-error (rejected
promise)**); the packaged sidecar generates identically to the certified generator (the Eco-Day 69 DC-2
property, now GUI-observed).

**Done-check:** the packaged app **works end-to-end** — all 8 items PASS; the sidecar spawns and
generates under the MSIX container.

---

## Step 3 — the Bedrock name reservation

**Partner Center → Apps → reserve the name.**
- Reserve **"Bedrock"**. If taken (it is a very common word — Minecraft/AWS/Linux Bedrock), use a prepared
  variant: **Bedrock Studio / Bedrock Forge / Thraksha Bedrock**.
- Note the one-time **~$19 Partner Center registration** if the account isn't set up.
- Feed the assigned **Identity Name / Publisher / PublisherDisplayName** into `AppxManifest.xml` (step 1c's
  placeholders) → run the **SUBMISSION wrap** (step 1 with the real identity).

**Done-check:** the name reserved + the identity values in hand + substituted into the manifest.

> The "Bedrock" name is **NOT reserved** as of this release — it is an open concern flagged since Eco-Day
> 51. Reserve it (or a variant) here.

---

## Step 4 — the Store submission

**Partner Center → your app → new submission.**
- Upload the **SUBMISSION-wrap** `Bedrock.msix` (real reserved identity).
- The store listing: **description from [`/CAPABILITIES.md`](../../../CAPABILITIES.md)**, screenshots,
  category, age rating, privacy.
- Submit for certification → **Microsoft signs + certifies** (no cert/EV/notarization on our side).

**Done-check:** submitted; then the wait for Microsoft certification.

---

## Payload contents (what every wrap MUST include)

- `Bedrock.exe` — the Tauri app (the `Executable` / entry point in the manifest).
- `node-x86_64-pc-windows-msvc.exe` — the **bundled node sidecar** (`externalBin`); Bedrock spawns it
  (hence `runFullTrust`).
- `resources/gen/**` — the **certified generator copy** (`dist/` + `plugins/`); the whole product runs the
  generator through this. Must equal the certified build (`npm run sync-gen:check`).
- The WebView2 loader (present on Windows 11) + the tile/store logos referenced by `VisualElements`.
