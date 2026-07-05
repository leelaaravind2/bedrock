# Thraksha — desktop/ CLAUDE.md (the Tauri v2 shell)

**What this is:** the desktop shell (Tauri v2, Rust). It hosts the UI, runs the generator as a **bundled sidecar**, and owns the local **blueprint store**. It NEVER modifies the deterministic core — the generator stays pure-Node. See root [`../CLAUDE.md`](../CLAUDE.md) first.

## Architecture (a separate layer — the core stays pure)
- **The sidecar** (Eco-Day 5): the generator runs as a **bundled `node.exe`** (`src-tauri/binaries/node-<target-triple>.exe`, declared in `tauri.conf.json` `externalBin`) against the generator's `dist/`+`plugins/` shipped as **resources** at `src-tauri/resources/gen/`. NEVER the system node. Verify-before-spawn. Spawn args use **forward slashes** (Windows splits backslash args → the `EISDIR 'E:'` bug). Comms are one-shot stdout.
- **The blueprint store** (Eco-Day 8): SQLite via **`rusqlite` (bundled)** compiled into `desktop.exe` — the FIRST native module, kept **SHELL-SIDE ONLY** so the generator/sidecar stay native-free. Canonical JSON in → byte-identical out (`blueprint_store.rs`).

## ⚠ Resources are COPIES — never ship stale
`src-tauri/resources/gen/{dist,plugins}` is a **copy** of the generator. Refresh it from the generator before every build:
```
cd desktop && npm run sync-gen          # build generator + copy + stamp
npm run sync-gen:check                   # freshness guard — fails if stale
```
It's wired into `tauri.conf.json` `build.beforeBuildCommand` so `tauri build` refreshes first. `resources/gen/` is gitignored (regenerated, not committed). The load-bearing proof: the bundled node against `resources/gen/dist/day20-regression.js --emit-digests` reproduces the frozen 44 digests.

## Build quirks
- **cargo-on-PATH:** `export PATH="$HOME/.cargo/bin:$PATH"` before any Rust/Tauri command (Rust is installed but not always on the shell PATH).
- **MSVC toolchain required** (Rust `stable-x86_64-pc-windows-msvc` + VS "Desktop development with C++"). WebView2 ships on Win 11.
- **`rusqlite` bundled** compiles SQLite from source (needs the MSVC C compiler — present).
- **Prove packaged, not just `tauri dev`** — a sidecar/resource path can break only when packaged/installed.

## Do NOT
- No native module in the **generator** (SQLite stays here, in the shell).
- Don't ship stale resources (run `sync-gen`).
- No code signing yet (Phase 4). No macOS/Linux Tauri builds yet (deferred — needs Rust runners).
