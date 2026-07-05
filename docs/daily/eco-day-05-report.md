# Eco-Day 05 — REPORT (Session 3 of 3): The Node sidecar (highest-risk plumbing)

**Phase 0, Day 5. Verify + document only — no code changes, no features, no generator wiring changes, no frozen hash touched.** This is the closing record for the riskiest Phase-0 plumbing: the generator now runs **from inside the packaged Tauri app** as a bundled sidecar and produces **byte-identical** output there.

Plan: [`eco-day-05-plan.md`](eco-day-05-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.4 standalone, §3 the one line, §4 honesty). Architecture: [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 (bundled sidecar, never system node, verify-before-spawn). Execute-notes source: `scratchpad/day05/eco-day-05-EXECUTE-NOTES.md`.

---

## THE VERDICT

> ✅ **The Node sidecar is DONE. The PACKAGED Tauri shell spawns the bundled Node generator and reproduces the frozen 44 digests (43 + 10-via-relationships + MAXIMAL) byte-identical — proven THREE ways: standalone relocated bundle, dev sidecar, and packaged + truly-installed.** `generator/` untouched; **no system node**; **no frozen hash moved**. **The riskiest Phase-0 plumbing holds.**

Determinism survives the sidecar boundary at the real installed location. Day 5 closed.

---

## 0. Cleanup (done first — expected after the load-bearing day, not a finding)

- **No hung build processes.** Scan found **zero** `cargo`/`rustc`/`tauri`/`link` and **zero** of our `desktop.exe`; the compiles had finished. (A raw `desktop.exe` count of 6 was a false match on *Grammarly.Desktop.exe* + *Docker Desktop.exe*; the single `node.exe` was **Adobe Creative Cloud**, unrelated.) Nothing needed killing.
- **Installed app fully gone** — the DC-3 test installed then uninstalled; the install dir `AppData\Local\Thraksha` and the HKCU uninstall entry are both cleared. A harmless WebView2 user-data dir `AppData\Local\com.thraksha.desktop` remains (from running the app) — cosmetic, left.
- **No file locks** — `generator/dist` cleared cleanly, `desktop/…/target` writable. The clean rebuild (Step 1) succeeded, confirming nothing held locks.

---

## 1. Backstop re-confirmation from clean (the Session-3 gate)

`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, exit 0**: 44 digests (43 frozen + 1 MAXIMAL), 43+10 byte-identical, MAXIMAL twice-identical. **No generator source file changed** (files-only find = empty). The deterministic core is provably unaffected by the sidecar work.

---

## 2. The approach — bundled Node + resourced files (NOT a single-file SEA)

- **Chosen:** a **pinned `node.exe`** (22.21.0; output is Node-patch-independent per Day 2) as the Tauri **`externalBin`** sidecar (target-triple named `node-x86_64-pc-windows-msvc.exe`), with the generator's **`dist/`** and **`plugins/`** shipped as **layout-preserved resources**. The shell spawns the bundled node against an existing entry (`day20-regression.js --emit-digests`), **one-shot**, **stdout-only**, with **verify-before-spawn**.
- **Why byte-identical by construction:** the exact compiled JS runs unchanged; `import.meta.url` resolves to the resourced `dist/`, so each plugin's `path.join(HERE,'..','..','..','plugins','<stack>','templates')` lands on the shipped templates at the right offset. **Zero generator source changes.**
- **Why NOT SEA (recorded):** Node SEA would require esbuild-bundling ESM→CJS **and** rewriting all 5 plugins' template `fs.readFile` calls to use embedded assets (`sea.getAsset()`) — a non-hash-neutral change to `generator/` source. Rejected in favor of the exact-files approach.

---

## 3. The three stages — each proven byte-identical

**The gate at every stage:** the sidecar emits the 44 `DIGEST` lines; diff against the Day-2 native Windows manifest (`scratchpad/day02/windows-digests.txt`); **empty diff = byte-identical.**

### DC-1 — Standalone relocated bundle → PASS (44/44) — the biggest de-risk, in isolation
Assembled pinned `node.exe` + copies of `dist/`+`plugins/` at `bundle/gen/{dist,plugins}` (layout preserved), **outside** the generator checkout. Ran `bundle/node.exe bundle/gen/dist/day20-regression.js --emit-digests` → harness **PASS**, **diff EMPTY**. Proves `import.meta.url` template resolution survives **relocation** — before any Tauri involvement.

### DC-2 — Dev sidecar → PASS (44/44) — with a caught-and-fixed wiring bug (recorded honestly)
Wired the shell layer (externalBin pinned node; `dist/`+`plugins/` as resources; `tauri-plugin-shell`; shell capability; a Rust `setup()` hook that verify-before-spawns and writes the sidecar stdout to `%TEMP%`, stdout-only).

- **The finding (a wiring bug, NOT a determinism break):** the **first** `tauri dev` run **failed** — `SIDECAR_EXIT 1`, node error **`EISDIR: illegal operation on a directory, lstat 'E:'`**. The Windows entry path `E:\Software\…\day20-regression.js` was **split on backslashes** when passed to the sidecar, so node received only `E:` as its main script. **The generator never executed** — so this was correctly diagnosed as a **shell-wiring/path bug**, not a determinism break (there was no output to be non-identical). **This is a credit to the process — the gate caught it before it could hide.**
- **The fix:** pass a **forward-slash** entry path (and strip any `\\?\` verbatim prefix) in `lib.rs`; Node on Windows accepts `/`. Re-ran `tauri dev` → sidecar **exit 0**, harness PASS, **diff EMPTY**.
- Dev passing is a milestone, not the finish — DC-3 is load-bearing.

### DC-3 — Packaged → PASS (44/44) — the load-bearing proof, proven TWO ways
`tauri build` (release) exit 0 → `desktop.exe` (11.3 MB) + `Thraksha_0.1.0_x64_en-US.msi` + `Thraksha_0.1.0_x64-setup.exe`.
- **(a) Release binary:** ran `target/release/desktop.exe` → sidecar exit 0, PASS, **diff EMPTY**.
- **(b) Truly INSTALLED app (the strongest):** silent NSIS install (`/S`) to `AppData\Local\Thraksha\` — bundled `node.exe` + `resources/gen/` at the real install dir, **resource paths wholly separate from the build tree**. Ran the installed `desktop.exe` → sidecar exit 0, PASS, **diff EMPTY**. Then **uninstalled** (`/S`) — clean state.

**The packaged/installed shell spawns the bundled generator and reproduces the frozen 43+10+MAXIMAL byte-identical.** The classic packaged-path trap did not bite (because DC-2's fix + the exact-layout resources were proven at the real install location).

---

## 4. DC-4 invariants (all stages)

- **`generator/` source UNTOUCHED** — files-only verified empty (the sidecar ships **copies** of `dist/`+`plugins/`; no `.ts` changed, **no additive shim needed** — an existing entry was reused).
- **Backstop green from clean** — §1.
- **No system node** in the spawn path — the shell spawns the **bundled** `externalBin` node; **verify-before-spawn** checks the entry exists and writes a clear error rather than falling back.
- **No frozen hash moved.**

---

## 5. What changed — `desktop/` shell layer ONLY (nothing in `generator/`)

- `src-tauri/Cargo.toml` — `+tauri-plugin-shell`.
- `src-tauri/src/lib.rs` — the sidecar `setup()` hook (verify-before-spawn, spawn bundled node, capture stdout, forward-slash entry path).
- `src-tauri/tauri.conf.json` — `+externalBin`, `+resources`.
- `src-tauri/capabilities/default.json` — `+` shell sidecar permission.
- **New committed shell assets:** `src-tauri/binaries/node-x86_64-pc-windows-msvc.exe` (85 MB pinned node) and `src-tauri/resources/gen/{dist,plugins}` (the copied generator payload). `target/` stays gitignored.

---

## 6. Forward-flags (carry these — they matter)

- 🚩 **RESOURCES ARE COPIES (the most important flag).** `desktop/src-tauri/resources/gen/{dist,plugins}` is a **copy** of the generator output. It must be **refreshed from `generator/dist` + `generator/plugins` before every `tauri build`**, or the shell could **silently ship a stale generator**. Today's refresh was manual. **A future day should SCRIPT this refresh (build the generator → sync resources) so it cannot drift** — ideally with a guard that the shipped resources match the current generator build.
- 🚩 **Read-only resource dir.** The gate is **stdout-only** (no writes into resources). The future *generate-to-disk* path must pass an explicit **writable** output dir — a packaged app's resource dir is read-only.
- 🚩 **Installer size ~85 MB** from the bundled `node.exe` (the Option-2 cost) — flagged for a later optimization day, not a Day-5 concern.
- 🚩 **Windows backslash-path lesson.** Always pass **forward-slash** paths to spawned processes (the EISDIR bug). Carry to any future spawn wiring.
- 🚩 **macOS/Linux sidecar builds deferred** (git+CI gap); **cargo-not-on-default-PATH** recurs — set `export PATH="…/.cargo/bin:$PATH"` from step 1 on every Rust day.
- 🚩 **Standing flags:** generated-project toolchain pins (Java 20≠21, Python 3.14≠3.13, mvn/go/podman absent); no git (manual backup); CLAUDE.md/.gitattributes needed Day 9; cross-OS determinism proof not yet in CI.

---

## 7. What Day 8 picks up

**The local SQLite store for blueprint/project state** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 8): persist the Project Model canonically (**sorted-key JSON so the persisted model hashes stably**), so a saved-then-loaded blueprint round-trips byte-identical and generation from the loaded model reproduces the frozen hashes.

> **⚠ Note for Day 8, given today's approach:** SQLite (`better-sqlite3` or similar) introduces the **first native module** into the stack. Today's sidecar bundle works precisely *because* the generator is pure Node with no native deps. If the SQLite store lives in the **generator/sidecar** path, it will complicate the bundle (native `.node` binaries, ABI/target-triple concerns) — the exact thing this approach currently avoids. Day 8 should weigh keeping the store in the **shell/Rust side** (or a WASM/PGlite option) vs. the generator side, precisely to keep the sidecar native-free. Flag it early.

---

## 8. Scope & cleanup

- **Verify + document only.** No code changed this session; no features; no generator wiring changes; no signing; no macOS/Linux builds; **no frozen hash moved.** The from-clean re-confirmation rebuilt `dist/` (expected).
- Stuck-build cleanup done first (§0); installed app uninstalled; no lingering app/sidecar processes; scratch confined to `scratchpad/day05/`; `desktop/…/target` gitignored. `generator/` and `output/` untouched.

---

**Day 5 verdict, restated:** the highest-risk seam in Phase 0 is crossed and holds. The generator runs **inside** the packaged shell as a bundled Node sidecar and is **byte-identical** — proven standalone-relocated (template resolution survives relocation), in dev (after catching and fixing a Windows backslash-path bug that stopped the generator from even running — a wiring bug, not a determinism break), and — the load-bearing proof — from a **release build and a truly-installed app** whose resource paths are wholly separate from the build tree. The approach is a pinned node + layout-preserved resources (not SEA, which would have forced non-hash-neutral generator changes), with verify-before-spawn and never the system node. `generator/` is untouched; the 43+10+MAXIMAL reproduce byte-identical from clean. The key thing to not forget: **the shipped resources are copies — script the refresh so a stale generator can't slip into the shell.** **Day 5 is closed; Day 8 is the SQLite store** (mind the first native module vs. the native-free sidecar).
