# Eco-Day 02 — REPORT (Session 3 of 3): Cross-OS determinism proof

**Phase 0, Day 2. Verify + document only — no code changes, no features, no git/CI setup, no frozen hash touched.** This is the closing record for Day 2: the cross-OS byte-identity proof, the mechanism that carried it, and the honest boundary (what was proven, what was deferred, what is not yet automated).

Plan: [`eco-day-02-plan.md`](eco-day-02-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§2 the three killers, §4 honesty). Predecessor: [`eco-day-01-report.md`](eco-day-01-report.md) (the LD-1/LD-2 LF-lock — the fix Day 2 put under live test). Execute-notes source: `scratchpad/day02/eco-day-02-EXECUTE-NOTES.md`.

---

## THE VERDICT

> ✅ **Windows == Linux, BYTE-IDENTICAL — PROVEN** (a 2-OS proof, on two libc variants: glibc + musl). **macOS DEFERRED** (not inferred). **Day 2 closed.**
>
> The Day-1 LF-lock holds live on a real second OS: the 43 frozen digests + 10 relationship hashes + the MAXIMAL cell reproduce byte-for-byte on Linux, identical to the Windows-authored baselines. The single biggest inherited risk (Windows-only determinism) is discharged for the provable half today; macOS awaits a CI-matrix day.

**Honest framing up front:** this is a **2-OS** proof (Windows + Linux), not 3-OS. macOS was **not run** and is **not claimed**. And it was a **one-time manual proof** via a throwaway Docker setup — it is **not** wired into the standing regression (see §5).

---

## 1. Native-Windows re-confirmation (the Session-3 gate)

`cd generator && rm -rf dist && npm run build` → exit 0. `npm run day20:regress` → **PASS, exit 0**: 44 digests asserted (43 frozen + 1 MAXIMAL), the 43+10 byte-identical, MAXIMAL twice-identical (`929c379f9e98ec34…`). The native-Windows reference holds from clean.

---

## 2. The proof — Option A (Docker Linux vs native Windows)

**Approach:** run the SAME generator source on Linux, in a container, and compare its output to native Windows via the exact `/${relPath}\n`+content digest convention. No git, no CI needed. The key insight: **the 43+10 frozen digests baked into `day20-regression.ts` were authored on Windows**, so a passing run on Linux *is* the Windows==Linux comparison.

**Mechanics (the honest details):**
- **Build-context COPY, not a bind-mount** — deliberately, to avoid Docker Desktop's Windows drive-sharing requirement and any host-FS/EOL semantics leaking in. Context = `generator/{src, plugins, ui, package.json, package-lock.json, tsconfig.json}` (source only — no `node_modules`/`dist`; Linux does a fresh native install). Verified: all 83 live-shell template files present, **no CRLF introduced by the copy**.
- **Node pinned to 22** (`node:22-bookworm`) so the **OS is the intended variable**, not the Node major.

### Layer 1 — the harness self-checks in Linux (glibc)
`docker run --rm` of `npm ci && npm run build && npm run day20:regress` in `node:22-bookworm` → **PASS, exit 0**: 43+10 byte-identical, MAXIMAL twice-identical, and the **LD-2 CR-free guard green**. Passing the Windows-authored constants inside Linux is itself the Windows==Linux proof.

### Layer 2 — the tangible side-by-side diff (glibc)
`--emit-digests` captured on native Windows and in the Linux container, both sorted, `diff`'d → **EMPTY across all 44 digests.** An explicit, inspectable Windows-vs-Linux artifact, independent of the pass/fail logic.

### The musl second data point (alpine)
Repeated Layers 1 + 2 on `node:22-alpine` (musl libc, `npm ci` clean — no native deps) → **PASS, exit 0; diff EMPTY.**

### Triple result
**Windows == Linux(glibc) == Linux(musl) — 44/44 digests byte-identical.** Two operating systems, two C libraries, one set of bytes.

| Target | Node | day20:regress | emit-diff vs Windows |
|---|---|---|---|
| Windows (native) | 22.21.0 | PASS (reference) | — |
| Linux glibc (`node:22-bookworm`) | 22.23.1 | PASS | **EMPTY** (44/44) |
| Linux musl (`node:22-alpine`) | 22.23.1 | PASS | **EMPTY** (44/44) |

---

## 3. The mechanism — the Day-1 LF-lock carried it (property live-proved)

Day 2 confirmed that the cross-OS identity is attributable to the Day-1 lock, not luck:
- **LD-2 (no emitted file contains a CR) ran green on both Linux variants** — LF emission holds live cross-OS, exactly as designed.
- **The empty Layer-2 diff proves `relPath`s are identical** on Linux — the `.split(path.sep).join('/')` forward-slash normalization (present in all 5 plugins) holds where `path.sep` is `/`, so no path separator leaked into any digest.
- **LD-1 is a live no-op *today*** — the templates are already LF, so `.replace(/\r\n?/g,'\n')` changes nothing this run. But LD-1 is the *guarantee* that keeps this true if a template is ever re-saved CRLF (or a future git checkout flips EOL). **Day 2 live-proved the property (LF everywhere + forward-slash paths) that the Day-1 lock guarantees.** Nothing beyond the Day-1 lock + the pre-existing `relPath` normalization was needed.

---

## 4. Bonus finding — output is Node-patch-independent too

The container Node was **22.23.1**; native Windows is **22.21.0** — a different patch release — yet output was **byte-identical**. So the generated output depends on the *source*, not the Node build. OS was the intended variable; the Node patch differed too and still matched. **One less determinism risk on the record** (the generator does not need an exactly-pinned Node runtime for output stability, though pinning the *major* remains good hygiene).

---

## 5. Honest bookkeeping — the proof is one-time-manual, NOT in CI

**This matters for a future session.** The Windows==Linux proof was performed **manually** via a **throwaway Docker setup** (a scratch build context + two ad-hoc images, `thraksha-crossos:glibc`/`:musl`). It is **NOT wired into the standing regression** — `npm run day20:regress` runs on one OS at a time; there is no automated cross-OS gate.

- **Cross-OS is proven-once, not continuously-enforced.** A future change could reintroduce an OS-dependent path with nothing to catch it until someone manually re-runs the container proof.
- **When a git + CI day happens** (which is also what macOS requires), the correct move is to wire this exact two-layer check into a CI matrix (windows / ubuntu / macos runners) so **Windows == Linux == macOS becomes a permanent gate**. Until then, treat cross-OS identity as a **manually-established fact, re-verifiable on demand** (the scratch context + Dockerfiles are retained), not an automated guarantee.
- No `.gitattributes` yet (repo isn't under git) — its `* text=auto eol=lf` git-layer hygiene is a Day-9 item and is **not** the load-bearing fix (the generator emits LF itself, LD-1).

---

## 6. Forward-flags (carried)

- 🚩 **macOS — DEFERRED, not proven.** No macOS machine or runner; Docker here is Linux-only (`OSType=linux`). The macOS leg (and thus the full 3-OS proof) awaits a **CI-matrix day**, which requires **git + CI** — neither exists yet.
- 🚩 **Cross-OS proof needs CI-wiring to become permanent** (§5) — currently manual/one-time.
- 🚩 **Repo is not under git** — manual backup; "clean build" = `rm -rf dist && npm run build`.
- 🚩 **Toolchains don't match intended pins:** Java **20 ≠ 21**, Python **3.14 ≠ 3.13**, **mvn / go / podman absent** (Day-18 detect-and-guide territory; recorded, not acted on).
- 🚩 **No root `CLAUDE.md`, no `.gitattributes`, no formatter config** — all **needed Day 9**.

---

## 7. What Day 4 picks up

**The Tauri v2 shell skeleton** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 4) — the desktop-app work begins: a minimal Tauri v2 app that opens a window and loads a placeholder UI (no generator wiring yet). It builds on ground now **proven determinism-stable across Windows and Linux** — the deterministic core the shell will eventually invoke reproduces byte-identical on both OSes. *(Day 3 is not in the Month-1 schedule; Phase 0 continues at Day 4.)*

---

## 8. Scope & cleanup

- **Verify + document only.** No code changed this session; no features; no git/CI setup; **no frozen hash moved or touched.** The from-clean re-confirmation rebuilt `dist/` (expected).
- All containers ran `--rm` (0 left running); the two `thraksha-crossos` images are retained (in Docker, **not** in the repo — harmless, re-usable for on-demand re-verification). Scratch artifacts (digest manifests, build context, Dockerfiles, build logs) confined to `scratchpad/day02/`. Repo `output/` and source untouched.

---

**Day 2 verdict, restated:** the generator's determinism, previously proven only on Windows, is now **proven byte-identical on Linux too** — a real 2-OS proof across two libc variants (glibc + musl), 44/44 digests, driven by the exact digest convention, with the Day-1 LF-lock confirmed as the mechanism (LD-2 green on Linux; `relPath` normalization holds) and output shown Node-patch-independent as a bonus. **macOS is honestly deferred** (no runner; needs a CI-matrix day), and the proof is **one-time-manual, not yet in CI** — both flagged so no future session assumes a continuous 3-OS guarantee that isn't there yet. The 43+10 reproduce byte-identical from clean. **Day 2 is closed; Day 4 begins the Tauri shell.**
