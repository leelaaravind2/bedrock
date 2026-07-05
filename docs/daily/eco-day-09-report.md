# Eco-Day 09 — REPORT: CLAUDE.md + resources-refresh + hooks + determinism CI

**Phase 0, Day 9 (Execute + Report combined).** The build-discipline scaffolding is in place: the oldest open flag (resources-are-copies) is **closed**, determinism CI is wired (cross-OS, incl. macOS), cold-session CLAUDE.md files exist, and a pre-commit hook makes the backstop a commit-time guarantee. The generation core was not touched.

Plan: [`eco-day-09-plan.md`](eco-day-09-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§4 honesty). Predecessors: [`eco-day-05-report.md`](eco-day-05-report.md), [`eco-day-08-report.md`](eco-day-08-report.md) (the resources flag). Note: git + `.gitattributes` were already done in git setup; **no external Prettier exists to pin** (Day-1 erratum).

---

## THE VERDICT

> ✅ **Build-discipline scaffolding in place. RESOURCES-ARE-COPIES FLAG CLOSED** (a `sync-generator` script + freshness guard, wired into `beforeBuildCommand`, proven: sync works, stale is detected, and the refreshed sidecar reproduces the frozen 44 digests). **Determinism CI wired** — a pure-Node `day20:regress` matrix on ubuntu + windows + **macos** (macOS's first-ever test). **CLAUDE.md** files (root + generator + desktop). **Pre-commit hook** proven to block a red backstop. Generator still **pure-Node**; backstop **green from clean**; no frozen hash moved.
>
> **CI status: PUSHED — the run is now triggered, results PENDING observation.** The Day-9 commit (`3510fe0`) was pushed to `origin/main`, so the workflow is now running on GitHub Actions across ubuntu/windows/macos. This automated shell **cannot observe the async run** — the green/red result (and especially **macOS's first-ever** determinism result) must be read at **https://github.com/leelaaravind2/bedrock/actions**. **Not claimed green here.**

**Day 10 = the Phase-0 close/benchmark.**

---

## 1. Resources-refresh script + freshness guard — FLAG CLOSED (priority)

**The flag (hit Day 5 and Day 8):** the sidecar ships a **copy** of the generator at `desktop/src-tauri/resources/gen/{dist,plugins}`, manually refreshed twice — a stale generator could silently ship.

**Built:** [`scripts/sync-generator-resources.mjs`](../../scripts/sync-generator-resources.mjs) (pure Node, no dep):
- **sync:** builds the generator → clean-copies `dist`+`plugins` into `resources/gen` → writes `REFRESH-STAMP.json` (a content hash of the tree, using the `/${relPath}\n`+bytes digest convention).
- **`--check` (freshness guard):** hashes the shipped resources (catches hand-edits) AND rebuilds the generator to a temp and hashes it (catches a stale generator) — **exit 1 with a "run `npm run sync-gen`" message** if either differs.
- **Wired so stale can't ship:** `sync-gen` / `sync-gen:check` scripts in [`desktop/package.json`](../../desktop/package.json); `build.beforeBuildCommand: "npm run sync-gen"` in [`tauri.conf.json`](../../desktop/src-tauri/tauri.conf.json) — **every `tauri build` refreshes first.**

**Proven:**
- (a) sync → **175 files**, tree hash `e8df6efb…`, stamp written; `--check` passes.
- (b) deliberately appended a line to a resource file → `--check` **FAILS (exit 1)**, message shows the hash mismatch; re-sync → passes (clean copy — the stray line is gone).
- (c) the **bundled node** run against the refreshed `resources/gen/dist/day20-regression.js --emit-digests` → **44/44 byte-identical** to the Day-2 native manifest.

**One implementation note (fixed):** on Windows, `spawnSync('npm.cmd')` throws `EINVAL` — a `.cmd` shim can't be spawned directly. Fixed with `execFileSync('npm', …, { shell: true })`. (Determinism-neutral — it's the build invocation, not output.)

*(`resources/gen` + `REFRESH-STAMP.json` are gitignored — regenerated, not committed.)*

---

## 2. Determinism CI — wired (cross-OS incl. macOS); green-run PENDING first push

[`.github/workflows/determinism.yml`](../../.github/workflows/determinism.yml): on `push` + `pull_request`, a matrix `runs-on: [ubuntu-latest, windows-latest, macos-latest]`, `setup-node@v4` (Node 22), `working-directory: generator` → `npm ci` → `npm run build` → `npm run day20:regress`. `fail-fast: false` so **every OS reports** (a macOS finding can't hide behind a fast Windows pass).

**Why this matters:** `day20:regress` is pure Node (no native deps, no Docker), so the 3-OS matrix is cheap and — for the **first time** — puts **macOS under test** (deferred since Day 2 for lack of a machine). Green would make Windows==Linux==macOS a **permanent automatic gate**.

**Honest status — PUSHED + triggered, results PENDING observation:**
- The workflow is committed and **`main` was pushed (`3510fe0`)**, so CI is now triggered. It runs **asynchronously on GitHub's runners** — this automated shell **cannot observe the run**; read it at **https://github.com/leelaaravind2/bedrock/actions**.
- **Windows + Linux are expected green** (Day-2 proved Windows==Linux locally). **macOS is genuinely UNPROVEN — the matrix IS the proof.**
- **If the macOS runner diverges** from the frozen 44 digests, that is a **real finding** (a macOS path/EOL/ordering issue) to diagnose — NOT `continue-on-error`, NOT faked. **This report does not claim any macOS result** — it will be read off the first Actions run after the user pushes.
- **Scope:** this gates the **generator** (pure Node). The **Tauri/sidecar cross-OS BUILD** (needs Rust runners, heavier) stays **deferred** — a separate later item.

---

## 3. CLAUDE.md — lean, hierarchical

- [`/CLAUDE.md`](../../CLAUDE.md) (root): the thesis; read-first order + session structure; repo layout (generator = pure-Node core; desktop = Tauri shell + sidecar + shell-side SQLite); the verify command; the big **Do-NOTs** (no AI in generation; no native module in the generator; no frozen hash moved; LF only; **resources are copies → `sync-gen`**); quirks (cargo-on-PATH; forward-slash spawn args; **commit-to-main, no branches/PRs**).
- [`generator/CLAUDE.md`](../../generator/CLAUDE.md): pure-Node zero-deps; the digest convention; add-a-feature discipline (new baseline, default = literal bypass, prove hash-neutral); the 5 plugins + `import.meta.url` template resolution; the 3 killers.
- [`desktop/CLAUDE.md`](../../desktop/CLAUDE.md): the sidecar (resources are COPIES → `sync-gen`); the blueprint store (rusqlite bundled, shell-side only); cargo-on-PATH; forward-slash spawn args; prove-packaged.

Lean — bullets + pointers to [`../HARNESS-DISCIPLINE.md`](../HARNESS-DISCIPLINE.md) and the daily reports, not duplication.

---

## 4. Hooks — a pre-commit determinism gate that fires

[`.githooks/pre-commit`](../../.githooks/pre-commit) + `git config core.hooksPath .githooks` (one-time, documented in root CLAUDE.md — no husky; the repo root has no `package.json`). On commit it builds the generator and runs `day20:regress`; **fail → BLOCK the commit.** It also warns (not blocks) if the sidecar resources are stale (they're gitignored, so staleness only matters at packaging, which `beforeBuildCommand` handles).

**Proven:** on the good state the hook **fires and passes** (backstop green); with a frozen digest deliberately corrupted the hook **BLOCKS (exit 1)** and reports the FAIL; restored → green.

**Hook vs. n/a (explicit):** the determinism gate is a **guarantee that fires**. **"format-on-write" is n/a** — there is no external formatter (Day-1 erratum); formatting determinism is the generator's internal `reindent`. Not built.

---

## 5. Invariants

- **Backstop green from clean:** `rm -rf dist && npm run build && npm run day20:regress` → PASS, 44 digests, MAXIMAL twice-identical.
- **No frozen hash moved** — all Day-9 work is scaffolding (scripts/CI/docs/hook), not generation.
- **Generator still pure-Node:** `dependencies: {}`, **0** native modules.

---

## 6. What changed (+ a whitelist fix)

- **New (scaffolding):** `scripts/sync-generator-resources.mjs`, `.github/workflows/determinism.yml`, `.githooks/pre-commit`, `/CLAUDE.md`, `generator/CLAUDE.md`, `desktop/CLAUDE.md`.
- **Edited:** `desktop/package.json` (+`sync-gen` scripts), `desktop/src-tauri/tauri.conf.json` (+`beforeBuildCommand`), `.gitignore` (whitelist exceptions — see below).
- **Whitelist fix (necessary):** the `/*` whitelist `.gitignore` was ignoring the new top-level paths, so it now also allows `!/scripts/`, `!/.github/`, `!/.githooks/`, `!/CLAUDE.md`. (`resources/gen` + the stamp remain ignored — regenerated, not committed.)
- **The generation core (`generator/src`) — untouched** except the pre-existing additive files; no `.ts` generation logic changed.

---

## 7. Forward-flags

- 🚩 **CI green-run + macOS result PENDING first push** — the workflow is committed but hasn't executed; push from a terminal with auth, then read the Actions run. macOS is the first-ever test — a divergence is a finding.
- 🚩 **Tauri/sidecar cross-OS BUILD still deferred** — CI covers the generator (pure Node); the shell's cross-OS build (Rust runners, code signing) is a separate later item.
- 🚩 **Push/auth:** this shell has no TTY; pushes need the user's own terminal (or cached creds). Commit-to-main, linear, no branches/PRs.
- 🚩 **Installer size** ~85 MB (bundled node) — later optimization.
- 🚩 **Standing:** generated-project toolchain pins (Java 20≠21, Python 3.14≠3.13, mvn/go/podman absent); Phase-4 signing.

---

## 8. What Day 10 picks up

**Phase-0 close — the benchmark** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 10): a packaged installer that runs the generator via sidecar and passes a byte-identical snapshot test (Windows proven; cross-OS via the new CI once pushed). Verify the whole Phase-0 stack end-to-end and certify the exit condition. With the resources-refresh now guarding the sidecar and CI wired, the benchmark can lean on automated gates rather than manual checks.

---

**Day 9 verdict, restated:** the guardrails now have enforcement, not just prose. The oldest open flag is **closed** — a scripted `sync-gen` with a freshness guard makes shipping a stale generator impossible (proven: stale is caught, and the refreshed sidecar reproduces the frozen 44). Determinism CI is wired as a pure-Node cross-OS matrix that finally puts **macOS** under test — honestly **pending the first push**, never claimed green. CLAUDE.md orients a cold session; a pre-commit hook makes the backstop a commit-time guarantee (proven to block a red state). The generator stays pure-Node, the backstop is green from clean, and no frozen hash moved. **Day 10 is the Phase-0 benchmark.**
