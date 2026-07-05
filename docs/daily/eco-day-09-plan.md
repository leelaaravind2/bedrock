# Eco-Day 09 — PLAN (Session 1 of 3): CLAUDE.md + resources-refresh + hooks + determinism CI

**Phase 0, Day 9. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 9 is the **build-discipline scaffolding** day: the machinery that keeps the determinism backstop honest for the rest of the project, plus a cold-session context aid (CLAUDE.md). The generation core is not touched.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 9 → [`eco-day-05-report.md`](eco-day-05-report.md) + [`eco-day-08-report.md`](eco-day-08-report.md) (the **resources-are-copies** flag — hit twice, due to be closed) → the real repo (done this session).

> **Grounded this session:** git is set up (repo `E:/Software`, remote `origin → bedrock.git`, commit `4567a44`); **`.gitattributes` LF-lock is already done**; **no** CLAUDE.md, CI, or hooks exist yet; the repo root has **no `package.json`**; `day20:regress` is pure Node.

---

## 0. What's already done (do NOT redo) vs. Day-9's real work

- ✅ **Done during git setup:** git repo + GitHub remote; **`.gitattributes`** (`* text=auto eol=lf`) — the LF determinism lock at the git layer, backstop re-confirmed green. **Do not redo these.**
- ❌ **No target:** "pin Prettier + plugins" (Month-1 Day 9) — the **Day-1 erratum** stands: there is **no external formatter**. Formatting determinism = the generator's internal `reindent`. There is nothing to pin; **do not invent a Prettier config.** CI wires the existing `day20:regress` harness instead.
- **Day-9's real work (this plan):** ① the **resources-refresh script** (close the oldest flag — priority), ② **determinism CI** (git now enables it; assess the cross-OS matrix), ③ lean **CLAUDE.md** files, ④ **hooks** (pre-commit determinism gate).

---

## 1. PRIORITY — the resources-refresh script + freshness guard (closes the Day-5 flag)

**The problem (hit twice — Day 5 and Day 8):** the sidecar ships a **copy** of the generator at [`desktop/src-tauri/resources/gen/{dist,plugins}`](../../desktop/src-tauri/resources/). Both days required a **manual `cp`** to refresh it; nothing stops a **stale generator** from silently shipping in the packaged app.

**The design:**
- A repo-root script **`scripts/sync-generator-resources.mjs`** (pure Node — no new dep) with two modes:
  - **sync (default):** `npm --prefix generator run build` → clean-copy `generator/dist` + `generator/plugins` into `desktop/src-tauri/resources/gen/{dist,plugins}` → write a stamp **`resources/gen/REFRESH-STAMP.json`** = a content hash of the copied tree (sha256 over sorted `relPath`+bytes — the same convention family as the digest).
  - **`--check` (the FRESHNESS GUARD):** rebuild the generator to a temp, hash its `dist`+`plugins`, compare to the shipped `REFRESH-STAMP.json`. **Exit non-zero if they differ** (resources are stale) — with a clear "run `npm run sync-gen`" message.
- **Wire it so stale can't ship:** add `"sync-gen": "node ../scripts/sync-generator-resources.mjs"` to [`desktop/package.json`](../../desktop/package.json), and set Tauri's **`build.beforeBuildCommand: "npm run sync-gen"`** in [`tauri.conf.json`](../../desktop/src-tauri/tauri.conf.json) so **every `tauri build` refreshes first**. (Optionally also `beforeDevCommand` for dev parity.)
- **Note the pinned node** (`binaries/node-x86_64-pc-windows-msvc.exe`) is the runtime, not generator output — the script leaves it alone.

**Proof (Session 2):** (a) run sync → resources match a fresh generator build; (b) deliberately corrupt/stale the resources → `--check` **fails** (guard works); re-sync → passes; (c) re-run the **Day-5 sidecar digest check** (the relocated bundle / packaged spawn) → **44/44 byte-identical** with the refreshed resources. **This closes the resources-are-copies flag.**

---

## 2. Determinism CI (the git unlock) — and the cross-OS matrix (assessed)

**Base workflow** `.github/workflows/determinism.yml`, on `push` + `pull_request`:
- `actions/checkout` → `actions/setup-node@v4` (Node **22**) → `working-directory: generator` → `npm ci` → `npm run build` → `npm run day20:regress`.
- Green = the 43+10+MAXIMAL reproduce in CI. This makes the backstop an **automatic gate**, not a manual run.

**The cross-OS matrix — FEASIBLE and IN SCOPE (the big unlock).** `day20:regress` is **pure Node, zero native deps, no Docker** — so a matrix `runs-on: [ubuntu-latest, windows-latest, macos-latest]` each doing the same steps is cheap (~1–2 min/runner) and needs no extra infrastructure. This finally:
- makes **Windows == Linux == macOS a PERMANENT automatic check** (closes "cross-OS proof not yet in CI"), and
- **adds macOS for the FIRST time** (deferred since Day 2 for lack of a machine).

**Honest caveat (bake in):** macOS determinism is **unproven** — the matrix *is* the proof. If the macOS runner **diverges** from the frozen 44 digests, that is a **real finding** (a macOS-specific path/EOL/ordering issue), reported and diagnosed — **not** faked or `continue-on-error`'d into a fake green. Windows+Linux are expected green (Day-2 proved Windows==Linux). Scope note: this is the *generator* determinism cross-OS; the **Tauri/sidecar** cross-OS build stays deferred (needs Rust runners + is heavier) — a separate later item.

**THE PUSH DEPENDENCY (critical honesty).** CI only runs once the commit is **on GitHub**. The earlier push **failed on auth** (non-interactive shell has no TTY); it's ambiguous whether the commit is now on the remote. So:
- Session 2 **writes + commits** the workflow regardless.
- **Proving CI green requires a successful push** — which the **user** completes in their own terminal (per the auth resolution). If not yet pushed by Session 2, CI is **"written and ready, green-run pending first push"** — an honest partial, with the macOS result reported **when the runner actually runs**. Do not claim a green CI (or a macOS pass) that hasn't executed.

---

## 3. CLAUDE.md — lean, hierarchical (root + per-package)

Cold-session context, kept **lean** (context budget — bullets + pointers to canonical docs, not duplication):
- **`/CLAUDE.md` (root):** the thesis (one line); the read-first doc order + the session structure (Plan→Execute→Report); repo layout (`generator/` = pure-Node deterministic core; `desktop/` = Tauri shell + bundled-node sidecar + shell-side SQLite store); **the verify command** (`cd generator && npm run day20:regress`); pointer to [`../HARNESS-DISCIPLINE.md`](../HARNESS-DISCIPLINE.md); the big **Do-NOTs** (no AI in generation; no native module in the generator; no frozen hash moved; LF only; **resources are copies — `sync-gen` before build**); operational quirks (**cargo-on-PATH**; forward-slash paths to spawned processes; git/CI notes).
- **`generator/CLAUDE.md`:** pure-Node, zero deps; the `/${relPath}\n`+content digest convention; add-a-feature discipline (new baseline, default path a literal bypass, prove hash-neutral); the 5 plugins + `import.meta.url` template resolution; the harness/gates; Do-NOTs (no deps/native modules; no timestamps/random/`now()` in the gen path; LF via LD-1; never move a frozen hash).
- **`desktop/CLAUDE.md`:** the Tauri v2 shell; the sidecar (bundled node + **resources are COPIES → `sync-gen`**); the blueprint store (rusqlite bundled, **shell-side only** — keep the generator pure-Node); cargo-on-PATH; forward-slash spawn args; Do-NOTs (no native module in the generator; don't ship stale resources; no signing yet).

---

## 4. Hooks — pre-commit determinism gate (git now exists)

- **Mechanism:** a **tracked** `.githooks/pre-commit` + `git config core.hooksPath .githooks` (no husky — the repo root has no `package.json`; `core.hooksPath` is a one-time local setup step, documented in root CLAUDE.md).
- **What it guarantees:** on commit, run the **determinism gate** — `cd generator && npm run build && npm run day20:regress` (fast, pure Node). If it fails, **block the commit.** Optionally also `sync-gen --check` (resources freshness). This makes "the backstop reproduces" a commit-time guarantee, not a hope.
- **Hook vs. documented request (be explicit):** the determinism gate is a **hook** (a guarantee that fires). "format-on-write" has **no tool** (no external formatter — Day-1 erratum), so it is *not* a hook — documented as "n/a, no formatter." Keep the hook fast enough not to be bypassed; if `build+regress` is too slow for every commit, scope to `tsc --noEmit` + the digest emit and note it.

---

## 5. SESSION 2 (EXECUTE) — done-conditions

Top of the Session-2 prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

1. **CLAUDE.md files** created (root + `generator/` + `desktop/`), lean, with the determinism rules + session structure + Do-NOTs.
2. **Resources-refresh script built + PROVEN** (priority): sync refreshes from `generator/`; the **freshness guard detects stale** (deliberately-stale → `--check` fails; re-sync → passes); after refresh the **sidecar still generates 44/44 byte-identical** (Day-5-style check). Wired into `tauri.conf.json` `beforeBuildCommand`. **Flag CLOSED.**
3. **Hooks** set up (`.githooks/pre-commit` + `core.hooksPath`) — **proven to fire** (a commit runs the gate; a deliberately-broken state blocks the commit).
4. **Determinism CI** workflow written + committed; **proven green on an actual push** IF the repo is pushed (else: written+ready, green-run + macOS result **pending first push**, stated honestly). Cross-OS matrix (ubuntu+windows+macos) included; **macOS result reported when it runs** — a divergence is a finding, not faked.
5. **Backstop still green from clean; no frozen hash moved; generator still pure-Node** (deps `{}`, 0 native modules).

**Session 2 scope guard:** no new features/stacks/types/integrations; no signing; do NOT pin Prettier (no target); no frozen hash moved; if the cross-OS matrix or the CI-green-proof can't complete (push/macOS), **scope it cleanly and defer honestly** — don't half-build or fake it.

---

## 6. SESSION 3 (REPORT) — done-conditions

[`eco-day-09-report.md`](eco-day-09-report.md): re-confirm backstop from clean; document CLAUDE.md; **the resources-refresh script + freshness guard (flag CLOSED)**; the hooks (and what's a guarantee vs n/a); the CI (green/pending-push, and the **cross-OS matrix status incl. macOS — proven or the honest finding/deferral**); forward-flags (Tauri/sidecar cross-OS build still deferred; installer size; push/auth state; standing flags). Verdict: "Build-discipline scaffolding in place; resources-are-copies flag CLOSED; determinism CI wired (status …); generator pure-Node, backstop green; Day 10 = Phase-0 benchmark." **Day 10 = the Phase-0 close/benchmark.**

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for Session 2
1. Read guardrails + ecosystem §4 + Month-1 Day 9 + eco-05/08 reports? — ✅ (this session).
2. Only Session-2's job? — EXECUTE (scaffolding); no features; no report.
3. Frozen baselines that must NOT move? — the **43 + 10** (+ MAXIMAL). CI/hooks/resources-refresh **protect** them; they never move them.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — N/A (no generation change); the resources-refresh must reproduce the SAME dist/plugins (byte-identical sidecar).
6. Three killers checked? — CI/hooks are the automation that re-checks them; LF already locked (`.gitattributes` + LD-1/LD-2).
7. A gate that can actually FAIL? — **YES: the freshness guard, the pre-commit gate, and CI (incl. macOS).** Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming CI/macOS green without a real run, (ii) inventing a Prettier pin, (iii) half-building the cross-OS matrix — §2/§5 guard all three.

---

*Day 9 builds the guardrails' enforcement, not more product. The priority is closing the oldest open flag — the sidecar resources are copies, so a script refreshes them from the generator with a freshness guard that makes a stale ship impossible. Git finally enables determinism CI; because the harness is pure Node, the cross-OS matrix is cheap and can at last put macOS under test — honestly, as the proof itself, never faked. CLAUDE.md gives a cold session its bearings; a pre-commit hook makes the backstop a commit-time guarantee. `.gitattributes` and git are already done; Prettier has no target. The thesis governs; the core stays pure.*
