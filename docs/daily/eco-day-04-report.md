# Eco-Day 04 — REPORT (Session 3 of 3): Tauri v2 shell skeleton

**Phase 0, Day 4. Verify + document only — no code changes, no features, no generator wiring, no frozen hash touched.** This is the closing record for Day 4: the first *build day*. The deliverable — a **Tauri v2 shell skeleton** — builds, opens, and packages on Windows, and the deterministic core in `generator/` (and its frozen backstop) is provably untouched.

Plan: [`eco-day-04-plan.md`](eco-day-04-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§4 honesty, §5 scope). Architecture: [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 (the shell is a separate layer; the core is untouched). Execute-notes source: `scratchpad/day04/eco-day-04-EXECUTE-NOTES.md`.

---

## THE VERDICT

> ✅ **Tauri v2 shell skeleton BUILDS + OPENS + PACKAGES on Windows; `generator/` and the frozen backstop are UNTOUCHED. Day 4 closed. Day 5 = the Node sidecar.**

The first new-surface layer stands up cleanly: a minimal desktop app in a new top-level `desktop/` dir, compiled with the MSVC Rust toolchain into `desktop.exe` + two installers, launched live (WebView2 window came up), with the 43+10+MAXIMAL backstop still byte-identical from clean. Adding the shell changed nothing about generation — the project-level literal bypass holds.

---

## 1. Backstop re-confirmation from clean (the Session-3 gate)

`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, exit 0**: 44 digests asserted (43 frozen + 1 MAXIMAL), the 43+10 byte-identical, MAXIMAL twice-identical (`929c379f…`). **No generator source file changed** (files-only find since the `desktop/` work began = empty). The deterministic core is provably unaffected by the new shell.

---

## 2. Prerequisites — the day opened blocked, then the user unblocked it (detect-and-guide, as designed)

Day 4's most important design decision was **probe first, build second** — Tauri's shell is Rust, which Day 0 never inventoried. The day played out exactly as the honest detect-and-guide pattern intended:

- **Opened BLOCKED** (the first Session-2 run): **Rust absent** (`rustc`/`cargo`/`rustup` not found) and the **MSVC C++ build tools absent** — confirmed via `vswhere` + filesystem (no `VC/Tools/MSVC`, no Windows SDK), *not* the decoy `/usr/bin/link.exe` that Git-for-Windows ships. WebView2 + Node were present. Session 2 STOPPED and reported the install steps — a legitimate, complete Day-4 finding, not a failure.
- **The user installed** (a user action, not the session's): **Rust via rustup**, keeping the default **`stable-x86_64-pc-windows-msvc`** toolchain (the supported Windows target — no `-gnu` dodge), and added the **"Desktop development with C++" workload** to the existing **VS Community 2022** (giving MSVC v143 **14.44.35207** + Windows SDK **10.0.26100.0**).
- **Re-run PASSED:** Rust 1.96.1 (MSVC toolchain), MSVC tools present, WebView2 149.x, Node 22.21.0 → gate cleared, skeleton built.

> **Honesty note — the "Rust not found" was partly a stale-PATH artifact.** On the re-run, `rustc --version` still first reported "command not found" — but Rust *was* installed at `C:\Users\kplee\.cargo\bin`; it simply wasn't on the Bash-tool shell's PATH (the shell predated the rustup install). Verified by calling `cargo.exe` at its install path directly. Builds proceeded after `export PATH="/c/Users/kplee/.cargo/bin:$PATH"`. This is a real operational note (see §6), not a contradiction of the install.

---

## 3. The skeleton — a separate `desktop/` layer

- **Location:** a new top-level **`desktop/`** dir, sibling to `generator/` — a **distinct layer** per architecture §4. Nothing under `generator/` was touched, imported, or moved.
- **Scaffold:** the official CLI, non-interactive — `npm create tauri-app@latest desktop -- --template vanilla --identifier com.thraksha.desktop -y` (create-tauri-app 4.6.2). The **vanilla template** = static HTML with **no frontend framework and no frontend build step** (`frontendDist: "../src"`).
- **Stripped to a bare placeholder** (the default greet-demo removed — no forms, no features, no generator calls):
  - `desktop/src/index.html` → `<h1>Thraksha</h1>` + "Desktop shell — skeleton (Phase 0, Day 4). No functionality yet." No scripts loaded.
  - `desktop/src-tauri/src/lib.rs` → the `greet` command + its `invoke_handler` removed; a bare `Builder::default().plugin(opener).run(...)`.
  - `desktop/src/main.js` → emptied (a comment only; unreferenced).
  - `desktop/src-tauri/tauri.conf.json` → `productName: "Thraksha"`, window `title: "Thraksha"` (identifier `com.thraksha.desktop`).
- **Isolation:** the Tauri CLI is a **devDep** in `desktop/package.json` (`@tauri-apps/cli ^2`), separate from `generator/`; no shared deps, no workspace coupling.

---

## 4. The proof — builds + opens + packages on Windows

- **Which proof, and why (stated plainly):** **`tauri dev` was NOT run.** `tauri dev` is a long-running, interactive window the headless build agent cannot visually confirm. Instead the **release build (`tauri build`) + a launch of the produced exe** was used — the **stronger** proof (the plan itself notes "a successful packaged build is the stronger proof"). This is a deliberate substitution, **not a gap**.
- **Build:** `npm run tauri build` → **exit 0**, a full MSVC compile of the Rust dependency tree in **~4m 26s**, producing:
  - `desktop/src-tauri/target/release/desktop.exe` (8.9 MB)
  - `bundle/msi/Thraksha_0.1.0_x64_en-US.msi` (2.98 MB)
  - `bundle/nsis/Thraksha_0.1.0_x64-setup.exe` (1.91 MB)
- **Opens:** launched `desktop.exe` → the process ran live (PID 2440, ~35 MB) and **spawned WebView2** (the webview window came up), then closed cleanly via `taskkill`. Headless confirmation that it starts and renders without crashing.
- **Unsigned** — fine for Day 4 (**code signing is Phase 4**); SmartScreen may warn on the installers. No signing attempted.

---

## 5. The load-bearing check — the shell is a clean, removable layer

- **Backstop green from clean** (§1): 44 digests, `generator/` generation byte-identical.
- **No generator source file changed** — verified files-only (not just directory mtimes; the `generator`/`generator/dist` mtime bumps are the expected `dist` rebuild, no `.ts` touched).
- **`desktop/src-tauri/.gitignore` excludes `/target/`** — the **1.3 GB** build output is not committed.
- **Removability:** deleting `desktop/` would leave `generator/` fully intact. The shell mediates (later); it never modifies the core (architecture §4). This is the project-level literal bypass — the new surface changes nothing about the existing output.

---

## 6. Flags carried forward

- 🚩 **CARGO NOT ON THE DEFAULT SHELL PATH (important for Day 5).** Rust/cargo is installed at `C:\Users\kplee\.cargo\bin` but is **not** on the Bash-tool shell's default PATH — every Rust/Tauri build this session needed `export PATH="/c/Users/kplee/.cargo/bin:$PATH"` first. The initial "rustc not found" was a **stale-shell artifact, not a real absence.** **Day 5 (more Rust/Tauri + sidecar building) must set this from the start.** (A fresh terminal, as rustup configures, would have it.)
- 🚩 **macOS/Linux shell builds DEFERRED** — no machines; the same git+CI gap as the cross-OS determinism proof. Day 4 proves the shell on **Windows only**.
- 🚩 **Standing flags (unchanged):**
  - *Generated-project* toolchain pins still mismatched — Java **20≠21**, Python **3.14≠3.13**, **mvn/go/podman absent** (Day-18 detect-and-guide territory; **separate** from the now-resolved Rust/MSVC *build* prerequisites).
  - **No git** (manual backup); "clean build" = `rm -rf dist && npm run build`.
  - **No root `CLAUDE.md`, no `.gitattributes`, no formatter config** — needed Day 9.
  - Cross-OS determinism proof is **manual/one-time, not yet in CI** (Day-2 finding).

---

## 7. What Day 5 picks up

**The Node sidecar — the highest-risk plumbing in Phase 0** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 5, a `[3 days]` unit): compile the existing TypeScript/Node generator to a **self-contained binary**, declare it in Tauri's `externalBin`, and prove the **packaged** shell spawns it and produces **byte-identical** output (matching the frozen hashes) — **never** shelling out to a system `node`; verify the binary before spawn; communicate via stdin/stdout or localhost. Prove from a packaged build, not `tauri dev`. It builds on the shell now proven to build + open + package on Windows, and must keep the 43+10+MAXIMAL backstop byte-identical throughout. (Start Day 5 with cargo on PATH per §6.)

---

## 8. Scope & cleanup

- **Verify + document only.** No code changed this session; no features; no generator wiring; no signing; no macOS/Linux builds; **no frozen hash moved.** The from-clean re-confirmation rebuilt `dist/` (expected).
- The app process was closed (no lingering `desktop.exe`/orphan WebView2 from the launch test). Scratch artifacts (build log, notes) confined to `scratchpad/day04/`. `desktop/target/` (1.3 GB) stays local and gitignored. `generator/` and `output/` untouched.

---

**Day 4 verdict, restated:** the desktop-shell surface is open — honestly. The day began blocked (Rust + MSVC C++ absent) and was unblocked by a real user install (rustup MSVC toolchain + the VS C++ workload) — the detect-and-guide pattern applied to Thraksha's own build prerequisites, exactly as planned. The resulting skeleton is a boring "Thraksha" window in a separate `desktop/` layer that **builds, opens, and packages on Windows** (release build → `desktop.exe` + `.msi` + NSIS installer; launched with a live WebView2 window; `tauri dev` deliberately skipped in favor of the stronger packaged-build proof), while the deterministic core stays **exactly as-is** — 43+10+MAXIMAL byte-identical from clean, no generator source touched. **Day 4 is closed; Day 5 begins the Node sidecar** (with cargo-on-PATH handled from the start).
