# Eco-Day 10 — PLAN (Session 1): Phase-0 close — the benchmark + certification

**Phase 0, Day 10. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 10 is the **Phase-0 CLOSE** — the certification day (the Phase-0 analogue of the v0.1 Day-20). It is **NOT a new-feature day**: everything Day 10 needs was built in Days 0–9; Day 10 **verifies the whole foundation holds together as one stack** and writes the honest Phase-0-complete certification.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) (§5 Phase-0 exit condition) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 10 → the Phase-0 reports [`eco-day-00`](eco-day-00-report.md) · [`01`](eco-day-01-report.md) · [`02`](eco-day-02-report.md) · [`04`](eco-day-04-report.md) · [`05`](eco-day-05-report.md) · [`08`](eco-day-08-report.md) · [`09`](eco-day-09-report.md) → the real repo (verified this session).

**Git workflow (for the execute prompt):** commit to `main`, **no branches, no PRs**.

> **Verified this session:** all Phase-0 pieces are present — the Day-9 pipeline (`sync-generator-resources.mjs`, `beforeBuildCommand: npm run sync-gen`, `determinism.yml`, `.githooks/pre-commit`, 3× CLAUDE.md), the Day-5 sidecar (pinned `node-…msvc.exe`, `resources/gen`, `blueprint_store.rs`), generator `dependencies: {}`. Repo at `015e4bb` on `main`, synced with origin.

---

## 0. The state Day 10 inherits — some things are now STRONGER than the original plan assumed

Fold these into the certification honestly:
- **Cross-OS determinism is now 3-OS-proven AND CI-ENFORCED.** Day 2 proved Windows==Linux **once** (manual Docker, 2 libc). Day 9 wired a CI matrix; after the `.env.example` repo-completeness fix (`015e4bb`), **`day20:regress` is GREEN on ubuntu + windows + macos** — so cross-OS *generation* determinism is now permanently enforced on every push, and **macOS is proven for the first time.**
- **The resources-are-copies flag is CLOSED** (Day 9: `sync-gen` + freshness guard + `beforeBuildCommand`).
- **The committed repo is proven COMPLETE** — a fresh checkout reproduces 44/44 (the `.env.example` fix proved this; the fresh-checkout regression is exactly what CI runs).

---

## 1. THE PHASE-0 BENCHMARK (the exit condition to certify)

Per the ecosystem plan, Phase 0's exit condition: **a packaged installer that runs the generator via the sidecar and passes a byte-identical snapshot test.** Day 10 proves the whole stack end-to-end and certifies it. The benchmark now runs **through the Day-9 pipeline** (the `beforeBuildCommand` auto-refreshes the sidecar resources first), so it proves not just "a manual copy works" but "the *pipeline* produces a byte-identical sidecar."

---

## 2. EXECUTE — done-conditions (verify the stack; certify; move no hash)

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."** cargo on PATH for any Tauri step (`export PATH="$HOME/.cargo/bin:$PATH"`).

### DC-1 — Full backstop green from clean (local)
`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 44/44** (43 frozen + 10 relationship + MAXIMAL, byte-identical). The ground still holds.

### DC-2 — THE PACKAGED-INSTALLER BENCHMARK (the load-bearing certification proof)
- `cd desktop && npm run tauri build` — the **`beforeBuildCommand` (`sync-gen`) auto-refreshes** the generator resources first (build generator → copy `dist`+`plugins` into `resources/gen` → stamp), then Tauri packages `desktop.exe` + the `.msi`/NSIS installer. *(Optionally run `sync-gen:check` to show the guard is satisfied.)*
- **Spawn the sidecar from the PACKAGED app** and capture its digests (the Day-5 `setup()` hook runs the bundled node against the resourced generator → writes the 44 `DIGEST` lines to `%TEMP%`). Do this from the **release binary** at minimum; ideally also the **installed app** (silent NSIS install → run → uninstall, as Day 5 did) — the truest packaged test.
- **GATE:** the packaged/installed sidecar's 44 digests **== the Day-2 native manifest, byte-identical (44/44).** This re-proves the Day-5 packaged-spawn result **now through the Day-9 build pipeline**. A divergence is a finding — STOP.
- Scope note: this is **Windows** (no macOS/Linux *desktop* builds — see boundaries). The cross-OS part is *generation* determinism (DC-3, via CI), not the packaged shell.

### DC-3 — CI green across 3 OSes (reference the standing proof)
Confirm the determinism CI is green on **ubuntu + windows + macos** for `015e4bb` (the post-fix commit). Record the Actions URL (`https://github.com/leelaaravind2/bedrock/actions`) as the standing, enforced cross-OS proof. *(Do not claim a run that isn't green — read the actual run; if any OS is red, that is the finding, not a certification.)*

### DC-4 — The blueprint store round-trip still holds (Day 8)
Re-confirm: a blueprint `getState()` → `canonicalStringify` → **stored in SQLite → loaded → `restoreProjectModel` → `buildFileSet`** reproduces the frozen digest (saved→loaded→generated **byte-identical**). Re-run the Day-8 proof (Node-level for a couple of cells + the end-to-end store round-trip for MAXIMAL). Persistence still doesn't perturb generation.

### DC-5 — Invariants (the certification must not have moved anything)
- **Generator pure-Node:** `dependencies: {}`, **0** native modules (SQLite is shell-side only).
- **No frozen hash moved** — Day 10 is verification, not change.
- **Sidecar resources auto-refresh** — no stale-ship risk (the `beforeBuildCommand` + freshness guard is in the build path).

**Execute scope guard:** no new features/stacks/types/integrations; no signing; **no macOS/Linux desktop builds** (only the generation-determinism cross-OS, which CI covers); no frozen hash moved; do NOT re-do Days 0–9 — verify + certify. Commit to `main`, no branches. If any gate fails, STOP and report (a failed benchmark is a finding, not a smoothed close).

---

## 3. REPORT — the Phase-0 certification (`eco-day-10-report.md`)

### 3.1 The certification table — each capability at its PROVEN level + a proof location
| Phase-0 capability | Proven level | Proof location |
|---|---|---|
| Deterministic core reproduces (43+10+MAXIMAL) | byte-identical, every day | Day 0 confirm; `day20:regress` |
| Determinism audited + **LF lock** (LD-1 read-normalize, LD-2 CR guard) | locked, hash-neutral | Day 1 |
| **Cross-OS generation determinism** | Windows==Linux (manual, 2 libc) **+ 3-OS CI green incl. macOS, enforced** | Day 2 + Day 9 CI (`015e4bb`) |
| Tauri v2 shell builds + opens + packages (**Windows**) | proven | Day 4 |
| **Sidecar: packaged shell spawns bundled generator byte-identical** | 44/44, dev+release+installed | Day 5 **+ re-proven Day 10 through the pipeline** (DC-2) |
| Blueprint store: round-trip + saved→loaded→generated byte-identical | byte-identical | Day 8 (+ DC-4) |
| Build discipline: CLAUDE.md · resources-refresh+guard · pre-commit hook · determinism CI | in place, enforcing | Day 9 |
| Git + GitHub backup; **committed repo complete** (fresh checkout 44/44) | proven | git setup + `.env.example` fix (`015e4bb`) |

### 3.2 Honest boundaries carried forward (be precise — distinguish the two macOS claims)
- **The Tauri/sidecar cross-OS BUILD is DEFERRED.** Only the **Windows** desktop build is proven (DC-2). macOS/Linux *desktop* builds are **untested** (need Rust runners + heavier CI).
- **macOS — the precise distinction:** macOS **generation determinism** is CI-proven (`day20:regress` passes on `macos-latest`). The macOS **desktop BUILD** (the Tauri shell, the sidecar-in-a-.app) is **NOT** tested — CI runs only the pure-Node generator, not the Rust/Tauri shell. Say both, precisely; do not let "macOS proven" blur the two.
- **Code signing** — Phase 4 (installers are unsigned; SmartScreen/Gatekeeper will warn).
- **Generated-project toolchain pins** — Java 20≠21, Python 3.14≠3.13, mvn/go/podman absent (Day-18 detect-and-guide territory; separate from the now-resolved Rust/MSVC *build* prereqs).
- **v0.1 limitations still stand** (carried from [`../CAPABILITIES.md`](../CAPABILITIES.md)) — MySQL live-boot coverage, `has-many` schema, `DECIMAL` unexercised, the mixed-key FK seam, etc. Phase 0 added no generation features, so none of these changed.
- **Installer size** ~85 MB (bundled node) — later optimization.

### 3.3 Phase-0 → Phase-1 handoff
State the **solid ground** Phase 1 builds on: a deterministic core that is cross-OS-proven **and** CI-enforced, packaged in a desktop shell with a byte-identical sidecar and a canonical local store, under full build discipline (a pre-commit hook + a 3-OS CI gate + a resources freshness guard that catch a determinism regression automatically). **Phase 1 (Days 11+) adds governed INPUTS** — framework+version (first-class, pinned), org-policy allow/ban, the progressive-disclosure wizard, toolchain detect-and-guide. The rule for every one: its **default/empty path is a literal bypass** that reproduces the frozen hashes — and now the CI/hooks **enforce** that automatically, so a drift can't slip through silently.

### 3.4 Verdict
**Phase 0 CERTIFIED** — the deterministic core is cross-OS-proven and CI-enforced, packaged in a desktop shell with a byte-identical sidecar and a canonical local store, under full build discipline. **Phase 1 begins at Day 11 — framework+version** (the first big new INPUT, determinism-sensitive; a plan-review day). *(Or, if any DC fails: the honest finding + what's not certified + what's blocked.)*

---

## 4. SCOPE GUARD — OUT for Day 10
- **NO new features/stacks/types/integrations** — certification only.
- **NO signing** (Phase 4); **no macOS/Linux desktop BUILDS** (only generation-determinism cross-OS, which CI covers).
- **NO frozen hash moved.**
- **Do NOT re-do Days 0–9** — verify it holds and certify.

---

## 5. Pre-flight checklist (GUARDRAILS §6) — for the execute session
1. Read guardrails + ecosystem exit condition + Month-1 Day 10 + the Phase-0 reports? — ✅ (this session).
2. Only the certification job? — verify the stack end-to-end + write the honest cert. No features.
3. Frozen baselines that must NOT move? — the **43 + 10** (+ MAXIMAL). Day 10 re-proves them; it never moves them.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — N/A (no new capability); the benchmark re-proves the existing byte-identity end-to-end.
6. Three killers checked? — locked (Day 1) + CI-enforced (Day 9); the benchmark is the live re-check.
7. A gate that can actually FAIL? — **YES: DC-2 (packaged sidecar 44/44), DC-3 (CI 3-OS green), DC-4 (store round-trip).** A divergence is a finding.
8. Overclaim / scope drift? — the live risk is blurring **macOS generation-determinism (proven)** vs **macOS desktop build (untested)** — §3.2 forbids it. Also: don't claim a CI run that isn't green (read the real run).

---

*Day 10 closes Phase 0 by proving the pieces are one working stack: the deterministic core (cross-OS-proven, now CI-enforced across three OSes incl. macOS) runs inside a packaged desktop shell as a byte-identical sidecar — re-proven through the Day-9 pipeline that auto-refreshes its resources — with a canonical local blueprint store that round-trips without perturbing generation, all under a build discipline that catches a regression automatically. The certification states each capability at its proven level with a proof location, and carries every boundary forward honestly — precisely distinguishing macOS *generation* determinism (proven) from the macOS *desktop build* (untested). Verify, certify, move no hash. Phase 1 begins at Day 11. The thesis governs; the core stays pure.*
