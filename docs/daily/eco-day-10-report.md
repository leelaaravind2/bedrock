# Eco-Day 10 — REPORT: Phase-0 CERTIFICATION (the close)

**Phase 0, Day 10 — the certification day (the Phase-0 analogue of the v0.1 Day-20).** No new features; certification only. This report certifies that the Days 0–9 foundation holds together **as one working stack**, with a proof location for every capability and every boundary carried forward honestly.

Plan: [`eco-day-10-plan.md`](eco-day-10-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§4 honesty). Phase-0 arc: [`eco-day-00`](eco-day-00-report.md) · [`01`](eco-day-01-report.md) · [`02`](eco-day-02-report.md) · [`04`](eco-day-04-report.md) · [`05`](eco-day-05-report.md) · [`08`](eco-day-08-report.md) · [`09`](eco-day-09-report.md).

---

## THE VERDICT

> ✅ **PHASE 0 CERTIFIED.** The deterministic core is **cross-OS-proven and CI-enforced** (3 OSes incl. macOS), packaged in a **desktop shell** with a **byte-identical sidecar** (re-proven end-to-end through the Day-9 pipeline, release **and** truly-installed) and a **canonical local blueprint store** that round-trips without perturbing generation — all under a **full build discipline** (a pre-commit hook + 3-OS CI + a resources freshness guard that catch a determinism regression automatically). Generator stays **pure-Node**; **no frozen hash moved**.
>
> **Phase 1 begins at Day 11 — framework+version** (the first big new INPUT, determinism-sensitive; a plan-review day).

Every DC passed. The one honest caveat: DC-3 (3-OS CI green) is **user-confirmed** — this automated shell cannot observe GitHub Actions (see §3).

---

## 1. The benchmark result (Execute DCs)

### DC-1 — Full backstop green from clean (local) ✅
`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 44/44** (43 frozen + 10 relationship + MAXIMAL, byte-identical). Re-confirmed again at report time.

### DC-2 — The packaged-installer benchmark (load-bearing) ✅ — 44/44, both ways
- **The Day-9 pipeline fired end-to-end:** `npm run tauri build` ran `Running beforeBuildCommand 'npm run sync-gen'` → the generator was rebuilt and resources refreshed (**175 files, tree hash `e8df6efb…`**) **before** Tauri packaged. This is the first real end-to-end test of the Day-9 automation — **it works**: the packaged sidecar is produced by the pipeline, not a manual copy.
- Artifacts: `desktop.exe` (12.9 MB) + `Thraksha_0.1.0_x64_en-US.msi` + NSIS `Thraksha_0.1.0_x64-setup.exe`.
- **Release binary:** spawned the sidecar → **44/44 byte-identical** to the Day-2 native manifest.
- **Truly-installed app** (silent NSIS install to `AppData\Local\Thraksha`, resource paths wholly separate from the build tree): spawned the sidecar → **44/44 byte-identical**; then **uninstalled** (clean state).
- *(Implementation note: the sidecar needs ~10s+ to run after a fresh launch; a first 6s capture caught an empty file — a timing artifact, not a divergence. With adequate wait, both release and installed produced the full 44, PASS.)*

### DC-3 — CI green across 3 OSes (USER-CONFIRMED) ✅
The determinism CI (`day20:regress` on `ubuntu-latest`, `windows-latest`, `macos-latest`) went **GREEN for commit `015e4bb`** (the post-`.env.example`-fix commit) — **the user observed the green run on the Actions page**. This automated shell **cannot** observe GitHub Actions, so this is recorded as **user-confirmed**, not shell-verified. Standing proof: **https://github.com/leelaaravind2/bedrock/actions**. This is the enforced cross-OS *generation*-determinism gate — and **macOS's first-ever** determinism pass.

### DC-4 — The blueprint store round-trip still holds ✅
- **Node-level (6 cells):** `getState()` → `canonicalStringify` → parse → `restoreProjectModel` → `buildFileSet` → digest — **round-trip-stable AND regen==frozen** for all 6 (5 matrix + MAXIMAL).
- **End-to-end through the real SQLite store (MAXIMAL):** canonical blueprint (`ccdd8521…`, 2105 bytes) → SQLite save→load (byte-identical, `cargo test` PASS) → `generate-from-snapshot` → **`929c379f…` == frozen MAXIMAL.** Persistence still doesn't perturb generation.

### DC-5 — Invariants ✅
- **Generator pure-Node:** `dependencies: {}`, **0** native modules (SQLite is shell-side only, in `desktop.exe`).
- **No frozen hash moved** — Day 10 is verification, not change.
- **Sidecar resources auto-refresh** via `beforeBuildCommand` (confirmed firing, DC-2) — **no stale-ship risk**.

### A side-effect fixed (honest hygiene)
The `.env.example` fix (`015e4bb`) used `!**/.env.example`, which was **broader than needed** — it also un-ignored `.env.example` inside *generated output* (`generator/Express/DemoApp`, `scratch/DemoApp`), which began showing as untracked. Tightened to **`!**/templates/.env.example`** so only the 5 source templates are tracked while generated-output `.env.example` stay ignored. Re-verified: 5 templates still trackable; generated ones ignored again; **fresh-checkout (staged tree, 83 templates) still 44/44.** (The narrowing is the only file staged for the Day-10 commit; the 5 templates were already committed at `015e4bb`.)

---

## 2. THE PHASE-0 CERTIFICATION TABLE — each capability at its proven level + proof location

| Phase-0 capability | Proven level | Proof location |
|---|---|---|
| Deterministic core reproduces (43 + 10 + MAXIMAL) | byte-identical, every day | Day 0 confirm; `day20:regress` (DC-1) |
| Determinism audited + **LF lock** (LD-1 read-normalize, LD-2 CR guard) | locked, hash-neutral | [Day 1](eco-day-01-report.md) |
| **Cross-OS GENERATION determinism** | Windows==Linux (manual, 2 libc) **+ 3-OS CI green incl. macOS, enforced** | [Day 2](eco-day-02-report.md) + [Day 9](eco-day-09-report.md) CI (`015e4bb`, user-confirmed) |
| Tauri v2 shell builds + opens + packages (**Windows**) | proven | [Day 4](eco-day-04-report.md) |
| **Sidecar: packaged shell spawns bundled generator byte-identical** | 44/44 — dev + release + installed | [Day 5](eco-day-05-report.md) **+ re-proven Day 10 through the pipeline** (DC-2) |
| Blueprint store: round-trip + saved→loaded→generated byte-identical | byte-identical | [Day 8](eco-day-08-report.md) + DC-4 |
| Build discipline: CLAUDE.md · resources-refresh+guard · pre-commit hook · 3-OS CI | in place, **enforcing** | [Day 9](eco-day-09-report.md) |
| Git + GitHub backup; **committed repo COMPLETE** (fresh checkout 44/44) | proven | git setup + `.env.example` fix (`015e4bb`) |

---

## 3. Honest boundaries carried forward (precise — the two macOS claims distinguished)

- **The Tauri/sidecar cross-OS BUILD is DEFERRED.** Only the **Windows** desktop build is proven (DC-2). macOS/Linux *desktop* builds are **untested** (need Rust runners + heavier CI).
- **macOS — the precise distinction (do not blur):**
  - ✅ macOS **generation determinism** is CI-proven — `day20:regress` passes on `macos-latest` (`015e4bb`, user-confirmed).
  - ❌ The macOS **desktop BUILD** (the Tauri shell / `.app`, the sidecar-in-a-bundle) is **NOT tested** — CI runs only the **pure-Node generator**, never the Rust/Tauri shell. macOS is proven for *what the generator produces*, not for *the desktop app that hosts it*.
- **Code signing** — Phase 4 (installers are **unsigned**; SmartScreen/Gatekeeper will warn).
- **Generated-project toolchain pins** — Java 20≠21, Python 3.14≠3.13, `mvn`/`go`/`podman` absent (Day-18 detect-and-guide territory; **separate** from the now-resolved Rust/MSVC *build* prereqs).
- **v0.1 generation limitations still stand** (carried from [`../CAPABILITIES.md`](../CAPABILITIES.md) §3) — MySQL live-boot coverage (Express+Go only), `has-many` records no schema, `DECIMAL` unexercised, the mixed-key FK seam, cross-depth switching, etc. **Phase 0 added no generation features, so none of these changed.**
- **Installer size** ~85 MB (bundled node) — a later optimization.
- **Push/auth:** this automated shell has no TTY; pushes are done by the user. Git is commit-to-`main`, linear, no branches/PRs.

---

## 4. Phase-0 → Phase-1 handoff

**The solid ground Phase 1 builds on:** a deterministic core that is **cross-OS-proven AND CI-enforced** across three OSes (incl. macOS), packaged in a desktop shell with a **byte-identical sidecar** and a **canonical local blueprint store** that round-trips without perturbing generation — under a build discipline that **auto-catches a determinism regression** (a pre-commit hook + a 3-OS CI gate + a resources freshness guard; the fresh-checkout regression that CI runs already caught the `.env.example` completeness bug).

**Phase 1 (Days 11+) adds governed INPUTS** — framework+version (first-class, pinned), the org-policy allow/ban layer, the progressive-disclosure wizard, toolchain detect-and-guide. The rule for every one: its **default/empty path is a literal bypass** that reproduces the frozen hashes — and this is now **automatically enforced** (hook + 3-OS CI), so a drift can't slip through silently. Determinism-sensitive inputs (framework+version pins) land on ground where cross-OS byte-identity is a standing, enforced guarantee.

**Day 11 = framework+version** — the first big new INPUT and determinism-sensitive; a plan-review day.

---

## 5. Scope & cleanup

- **Certification only** — no new features/stacks/types/integrations; no signing; no macOS/Linux desktop builds; **no frozen hash moved**; Days 0–9 not re-done (verified + certified). The only staged change is the `.gitignore` negation-narrowing (a hygiene fix for the side-effect surfaced in §1). `dist/`, `resources/gen`, `target/` are gitignored (rebuilt/refreshed by the benchmark, not committed).
- The installed app was uninstalled (clean state); no `desktop.exe` left running; scratch confined to `scratchpad/day10/`. A harmless WebView2 user-data dir may remain from running the app.

---

**Day 10 verdict, restated:** Phase 0 is a certified, coherent foundation — not a pile of parts. The deterministic core reproduces 43+10+MAXIMAL byte-identical, cross-OS-proven and now permanently CI-enforced across ubuntu/windows/macos (macOS's first pass); it runs inside a packaged desktop shell as a byte-identical sidecar, re-proven end-to-end through the Day-9 auto-refresh pipeline on both the release binary and a truly-installed app; a canonical SQLite blueprint store round-trips without perturbing generation; and a pre-commit hook + 3-OS CI + a resources freshness guard now catch a regression automatically (they already caught one). The boundaries are stated precisely — macOS *generation* determinism is proven, the macOS *desktop build* is not; signing is Phase 4; the generated-project toolchain pins and v0.1 generation limitations are carried unchanged. Generator pure-Node, no frozen hash moved. **Phase 0 certified. Phase 1 begins at Day 11 — framework+version.**
