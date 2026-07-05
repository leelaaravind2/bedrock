# Eco-Day 02 — PLAN (Session 1 of 3): Cross-OS determinism proof

**Phase 0, Day 2. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no Docker run, no code, no file changes except this plan. Day 1 **locked** the cross-OS fix (LD-1 LF-normalize on template read + LD-2 LF-emission guard); **Day 2 PROVES it holds** — that the generator produces byte-identical output across operating systems. This is the single biggest inherited risk (the 21 days were Windows-only).

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§2 the three killers, §3 the one line, §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 2 → [`eco-day-01-report.md`](eco-day-01-report.md) (LD-1/LD-2 — the fix under test) → [`eco-day-00-report.md`](eco-day-00-report.md) (environment: Windows-only, Docker present, no git) → the real generator output path + digest convention (done this session).

> **Grounded this session:** I probed the actual environment and the emission code. Docker is up in **Linux-container mode** (`OSType=linux`, x86_64; image pulls work — golang/postgres alpine cached). The generation path (core + plugins) has **no** `os.EOL`/`os.platform` calls; the `node:os` imports are only in gate/demo scaffolding; the consolidated `day20-regression` harness is **pure in-memory** (no disk, no `os`). All 5 plugins normalize `relPath` via `.split(path.sep).join('/')`. These facts make **Option A runnable today** and shape the proof design below.

---

## 0. What Day 2 proves — and the honest boundary

- **Proves (today):** the generator produces **byte-identical output on Linux and on Windows** — the 43 frozen digests + 10 relationship hashes + the MAXIMAL cell reproduce identically on both OSes. This directly tests the Day-1 LF-lock.
- **Defers (honestly):** **macOS.** No macOS machine or runner exists on this hardware; Docker here runs Linux only. The full 3-OS proof (incl. macOS) awaits a CI-matrix day. Day 2 will **not** claim a 3-OS proof — it will state exactly what was run (Windows + Linux) and what was deferred (macOS).

---

## 1. THE APPROACH DECISION — evaluated against the real machine

| Option | Runnable here? | What it proves | Cost | Verdict |
|---|---|---|---|---|
| **A — Docker Linux vs native Windows** | **YES** — Docker is up, Linux-container mode, pulls work | **Windows == Linux, byte-identical, TODAY** (real 2-OS proof); macOS deferred | Low (no git, no CI) | ✅ **RECOMMENDED** |
| **B — CI matrix (windows/ubuntu/macos)** | Not today — **no git repo, no CI** exist | The complete 3-OS proof (incl. macOS) | High — Day 2 would become "set up git + CI + run matrix," a bigger scope | Deferred to a dedicated CI day |
| **C — locked-by-construction, defer live run** | Yes (inspection only) | Only that the lock *looks* correct (all LF, no OS paths in output) | Trivial | Weakest — only if A and B both blocked. **Not needed — A works.** |

**Decision: Option A.** It gives a *real, live* Windows-vs-Linux byte-identical proof today with no git/CI setup, and it puts the exact Day-1 LF-lock under live test on a second OS. **Option B is the honest path to the macOS leg** and is flagged as a forward-item, not attempted this day (it would drag in git-init + CI scaffolding — explicitly out of scope, and Day-9 territory). Option C is unnecessary since A is runnable.

---

## 2. HOW THE PROOF WORKS (the mechanics — two independent layers)

The proof rests on one key insight: **the 43+10 frozen digests baked into `day20-regression.ts` were authored on Windows.** So running that harness on Linux and having it PASS *is itself* the Windows==Linux comparison — the Windows values are the reference the Linux run must reproduce. Two layers, for rigor:

- **Layer 1 — harness self-check in Linux (the primary gate).** Run `npm run day20:regress` inside a Linux Node container. A PASS means the Linux-generated output reproduces every Windows-authored digest byte-for-byte (43 frozen + 10 relationship + MAXIMAL twice-identical + the LD-2 CR-free guard).
- **Layer 2 — emit-digest list diff (a tangible side-by-side artifact).** Run `npm run day20:regress -- --emit-digests` on **native Windows** and in the **Linux container**; sort both `DIGEST …` lists; `diff` them. **Expected: zero diff** across all 44 lines. This is an explicit, inspectable Windows-vs-Linux artifact independent of the pass/fail logic.

**Why this is a real cross-OS test, not a tautology:** the Linux run reads the same LF templates through the same code, but on a different OS with a different path separator, different filesystem, and (via a musl variant) a different libc. If anything OS-dependent leaked into output — a stray CRLF, a `path.sep` in a `relPath`, a locale-ordered sort — the Linux digests would diverge from the Windows constants and the harness would FAIL. The LF-lock (LD-1) and the forward-slash `relPath` normalization are exactly what should make them match.

### Container mechanics (avoid the Windows drive-sharing gotcha)
Prefer a **Docker build-context copy**, not a bind-mount (Docker Desktop bind-mounts need the E: drive shared and can impose host FS semantics; a build context is tarred to the daemon and sidesteps both):
- Stage a build context in scratch: copy the **entire `generator/` except `node_modules/` and `dist/`** (a `.dockerignore` with those two lines). **Must include `generator/plugins/*/templates/`** — those 83 LF files are the live shell path (Day-1 erratum) — plus `src/`, `ui/`, `package.json`, `package-lock.json`, `tsconfig.json`.
- Dockerfile: `FROM node:22-bookworm` (glibc; pin **Node 22** to match Windows' 22.21.0 so **OS is the only variable**), `WORKDIR /app`, `COPY`, `RUN npm ci && npm run build`. Run the proof as `docker run` commands (not baked into build) so both the regress and the `--emit-digests` can be captured.
- **Second data point (recommended, cheap):** repeat on `node:22-alpine` (musl libc) — if both glibc and musl Linux match Windows, the proof is stronger against libc-level surprises.
- Everything stays in scratch; the Windows working tree is **not** mutated (no `dist/`/`node_modules/` written into it by the container).

---

## 3. SESSION 2 (EXECUTE) — done-conditions

Put at the top of the Session-2 prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### DC-1 — Establish the native-Windows reference (from clean)
- `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS (43+1 MAXIMAL). Capture `npm run day20:regress -- --emit-digests` → the **Windows digest list** (44 `DIGEST` lines). This is the reference.

### DC-2 — Generate the SAME inputs on Linux (Docker) and hash with the exact convention
- Build the context (§2) and image (`node:22-bookworm`), `npm ci && npm run build` in-container.
- Run `npm run day20:regress` in the container (Layer 1) and `-- --emit-digests` (Layer 2 → the **Linux digest list**).
- The digest convention is the harness's own `` `/${relPath}\n` `` + UTF-8 content, files sorted by `relPath` — identical code on both OSes (no separate hashing script needed; the harness IS the hasher).

### DC-3 — THE GATE: Windows output == Linux output, byte-identical
- **Layer 1:** the container `day20:regress` exits **0, PASS**, 43+10 byte-identical + MAXIMAL twice-identical + LD-2 CR-free.
- **Layer 2:** `diff <(sort windows-digests) <(sort linux-digests)` → **empty** (all 44 lines identical). Capture both lists + the empty diff as the artifact.
- **If they DIFFER → STOP and report (do not proceed, do not re-baseline).** The diff is the finding — almost certainly a residual CRLF/LF or path-separator issue the LD-1 lock missed (or something else OS-dependent flowing into output). Record: which digest(s) diverged, and (by regenerating that one cell's files in both and diffing bytes) *what* differs (line endings? a path? ordering?). **A cross-OS diff means the lock is incomplete — that is the single most important possible finding of Day 2.** Diagnose before concluding (GUARDRAILS §3).

### DC-4 — Confirm the LF-lock is what makes it work (attribute the pass)
- Confirm the pass is attributable to the Day-1 lock, not luck: verify (in-container) that **no emitted file contains a CR** (LD-2 already asserts this — confirm it ran green on Linux) and that `relPath`s are forward-slashed on Linux (they must be, or Layer 2 would diff). Note whether LD-1 was strictly necessary here (templates are LF, so LD-1 is a no-op *today*) — the honest statement is: **LD-1 guarantees the property that makes cross-OS hold, and Day 2 confirms the property holds live on Linux.** If anything *beyond* the LF-lock was needed (e.g. the `.split(path.sep).join('/')` normalization), name it explicitly.

### DC-5 — macOS status, stated honestly
- Record: **macOS not run** (no machine/runner; Docker here is Linux-only). Deferred to a future CI-matrix day (Option B). **Not faked, not inferred as "probably fine" without saying so.**

**Session 2 scope guard:** no git/CI setup (Option A needs none); no new features/stacks/types/integrations; **no frozen hash moved**; container artifacts + context live only in scratch; the Windows tree is not mutated. No report file (Session 3 writes it).

---

## 4. SESSION 3 (REPORT) — done-conditions

Session 3 writes [`eco-day-02-report.md`](eco-day-02-report.md):
- **Re-confirm from clean:** native Windows `day20:regress` green (43+10 byte-identical), and re-state the Linux result.
- **The cross-OS proof:** Windows == Linux byte-identical (the empty emit-diff + both harness PASSes, glibc and — if run — musl) — **or** the finding, if any digest diverged, with the byte-level diagnosis.
- **What the LF-lock did:** how LD-1/LD-2 + the forward-slash `relPath` normalization produced the cross-OS identity; whether LD-1 was a live no-op (templates LF) but the load-bearing guarantee.
- **macOS honestly deferred**, with the forward-flag that the **full 3-OS proof awaits a CI-matrix day** (git + CI required — Option B).
- **Verdict line:** "Cross-OS determinism PROVEN Windows==Linux (byte-identical, 43+10+MAXIMAL); macOS deferred to a CI day; the Day-1 LF-lock holds live on a second OS." (Or, if a diff appeared: the honest finding + that the lock is incomplete + what diverged.)
- Re-carry the standing forward-flags (toolchain pins; no git; CLAUDE.md/.gitattributes needed Day 9).

---

## 5. SCOPE GUARD — OUT for Day 2

- **No git init / no CI setup** (Option A needs neither; Option B — the macOS/3-OS path — is a deliberate future day, not this one).
- **No new features, stacks, project types, integrations.**
- **No frozen hash moved or touched** — Day 2 is a *proof*, not a change to output. (If the proof would require moving a hash, that's the finding, not a re-baseline.)
- **macOS is not claimed.** Do NOT present a 2-OS proof as a 3-OS proof.
- **No Tauri/desktop** (Day 4+); **no SQLite/CLAUDE.md** (Day 8/9).

---

## 6. Pre-flight checklist (GUARDRAILS §6) — for Session 2
1. Read guardrails + ecosystem plan + Month-1 Day 2 + eco-day-01/00 reports? — ✅ (this session).
2. Which session, only its job? — Session 2 = EXECUTE (run the Windows + Linux proof, capture artifacts). No report; no features.
3. Which frozen baselines must NOT move? — the **43 + 10** (+ the MAXIMAL). Day 2 proves they reproduce cross-OS; it never moves them.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — N/A (no build); the LF-lock under test is already a no-op on the default LF templates.
6. Three killers checked? — this day *live-tests* killer #2 (line endings) cross-OS, and incidentally killer #3 (ordering/paths); killer #1 is OS-independent (no clock/RNG).
7. A gate that can actually FAIL? — **YES: the Windows-vs-Linux emit-diff + the container `day20:regress`.** A divergent digest is the reportable finding.
8. Overclaim / scope drift? — the live risks are (i) claiming macOS/3-OS when only Windows+Linux ran, and (ii) drifting into git/CI setup — §0/§3/§5 forbid both.

---

*Day 2 takes the biggest inherited risk — that byte-identity was only ever proven on Windows — and discharges the provable half of it today: a live Windows-vs-Linux byte-identical proof via Docker, testing the Day-1 LF-lock on a real second OS, no git required. It names the deferred half (macOS, via a future CI matrix) honestly rather than faking a 3-OS claim. Prove what's provable; name what's deferred; a cross-OS diff is the finding. The thesis governs; the backstop is the ground.*
