# Bedrock — the MSIX packaging path (the wrap recipe)

**Release scope (LOCKED):** Bedrock ships **FREE via the Microsoft Store as an MSIX** —
**Microsoft signs at certification** (NO cert / EV / token / notarization). **Windows-only.**

MSIX is **not** a Tauri v2 bundle target (`tauri build` produces `msi` / `nsis` only). The Store
package is an **external wrap** of the Tauri build payload: lay out an MSIX payload dir with
[`AppxManifest.xml`](AppxManifest.xml) + the built app + the bundled sidecar + `resources/gen`, then
run the Windows SDK `MakeAppx.exe pack`.

## Build-here vs. deferred (honest)

| Step | Where |
|---|---|
| Author `AppxManifest.xml` (identity = Bedrock, `runFullTrust`, payload) + this recipe | **Build-here (done, Eco-Day 55)** — XML validated well-formed |
| `tauri build --bundles msi nsis` with the Bedrock identity | **Build-here** (if WiX/NSIS cached & disk allows) — else honest-manual |
| `MakeAppx.exe pack` → `Bedrock.msix` | **DEFERRED** — Windows SDK / `MakeAppx` not on the dev shell → Leela's Windows machine |
| Packaged launch + sidecar-under-MSIX check | **DEFERRED** — clean Win 11 box → Leela's machine |
| Store submission (Microsoft signs at cert) | **DEFERRED** — Partner Center → Leela |

## Placeholders (Partner-Center-assigned — fill before wrapping, do NOT invent)

| Placeholder in `AppxManifest.xml` | Source |
|---|---|
| `{{STORE_IDENTITY_NAME}}` | Partner Center → the reserved app's **Package/Identity/Name** |
| `{{STORE_PUBLISHER_CN}}` | Partner Center → the app's **Package/Identity/Publisher** (`CN=…`) |
| `{{PUBLISHER_DISPLAY_NAME}}` | Partner Center → **Publisher display name** |

> **The "Bedrock" name is NOT reserved.** It is a very common word (Minecraft Bedrock, AWS Bedrock,
> Bedrock Linux) → likely a Store conflict. The name-availability check + reservation is on Leela's
> Partner Center. Prepare a variant (Bedrock Studio / Bedrock Forge / Thraksha Bedrock) if taken.

## The reproducible recipe (run on a Windows machine with the Windows SDK — NOT the dev shell)

```powershell
# 1. Build the Tauri payload (beforeBuildCommand re-syncs resources/gen to the certified generator).
cd desktop
npx tauri build --bundles msi nsis
#   → target/release/  contains  Bedrock.exe  +  node-x86_64-pc-windows-msvc.exe  +  resources/gen/**

# 2. Assemble the MSIX payload dir (exe + sidecar + certified generator + manifest + assets).
$payload = "build/msix-payload"
New-Item -ItemType Directory -Force $payload
Copy-Item target/release/Bedrock.exe                          $payload/
Copy-Item target/release/node-x86_64-pc-windows-msvc.exe      $payload/
Copy-Item target/release/resources                            $payload/resources -Recurse
Copy-Item src-tauri/msix/AppxManifest.xml                     $payload/
# Copy-Item <tile/store logos>                                $payload/assets/   # per VisualElements

# 3. Pack the MSIX (Windows SDK MakeAppx).
MakeAppx.exe pack /d $payload /p Bedrock.msix

# 4. (LOCAL sideload TEST only — NOT for the Store) sign with a dev self-signed cert, trust it, install:
#    SignTool sign /fd SHA256 /a /f dev-cert.pfx /p <pw> Bedrock.msix
#    Add-AppxPackage Bedrock.msix
#    → the Store submission needs NO signing — Microsoft signs at certification.

# 5. Submit Bedrock.msix to Partner Center → Microsoft signs at certification.
```

## Payload contents (what the wrap MUST include)

- `Bedrock.exe` — the Tauri app (the `Executable` / entry point in the manifest).
- `node-x86_64-pc-windows-msvc.exe` — the **bundled node sidecar** (`externalBin`); Bedrock spawns it
  (hence `runFullTrust`).
- `resources/gen/**` — the **certified generator copy** (`dist/` + `plugins/`); the whole product runs
  the generator through this. Must equal the certified build (`npm run sync-gen:check`).
- The WebView2 loader (present on Windows 11) + tile/store logos referenced by `VisualElements`.
