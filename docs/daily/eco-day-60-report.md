# Eco-Day 60 — REPORT: THE RELEASE — final docs + the Store-submission runbook (the 60-day close)

**Phase 4, Day 60 — the release (the honest close of the 60-day build).** Day 58 **certified** the shipped
Bedrock system; Day 60 writes the **release documentation** and the **ordered Store-submission runbook** so
going live is mechanical. **DOCS ONLY — no code, no generation change, no frozen hash moved.** CAPABILITIES
claims only what Day 58 certified; the runbook is the **recipe** (the 4 go-live steps are Leela's to run —
described, **not claimed done**).

**Backstop re-confirmed from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS, 194
OK / 0 FAIL, 103 baked digests + 10 TeamTracker + non-hash (PART 1c–1x), MAXIMAL `366e19d9…` — no frozen
hash moved.** `git status` → **docs + `.gitignore` only** (no code, no `generator/` source).

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. The final docs written (DC-1 → DC-4)

| Doc | Action | Content |
|---|---|---|
| **`/CAPABILITIES.md`** (new root) | **DC-1** | The Bedrock **v0.1.0** release record — each capability at its **Day-58-certified** level + proof location + the **complete boundary ledger**. Sourced ONLY from [`eco-day-58-report.md`](eco-day-58-report.md); nothing re-claimed beyond it. |
| **`docs/CAPABILITIES.md`** | **DC-2** | **Preserved** — a one-line historical-pointer header added atop it (v0.1 21-day-core, dated 2026-07-02, superseded by `/CAPABILITIES.md`). **Not rewritten, not deleted** (keep the dated record, name its staleness — the doc's own §4 drift discipline applied to itself). |
| **`/README.md`** (new root) | **DC-3** | The Bedrock front door — what it is; the thesis (blueprint = source of truth, code = deterministic projection, the Map = the determinism dividend, quoted from the Constitution Laws 1–4/15/21); pointers to CAPABILITIES + RELEASE-NOTES + the runbook + the guardrails; the release scope. |
| **`/RELEASE-NOTES.md`** (new root) | **DC-4** | v0.1.0 — the honest release state (the certified backstop; the packaged-path determinism; what ships vs deferred; the 60-day arc). |

**Finding + adjustment (honest, §4):** the plan assumed root docs would simply commit, but the repo's
[`.gitignore`](../../.gitignore) is a **whitelist** (`/*` ignores everything at root; only explicitly
un-ignored paths — `generator/`, `desktop/`, `docs/`, …, `CLAUDE.md` — are tracked). The new root docs
were therefore **gitignored and would not have committed at all.** Fixed exactly as the repo already tracks
`CLAUDE.md` at root: added `!/README.md`, `!/CAPABILITIES.md`, `!/RELEASE-NOTES.md` to the whitelist.
`.gitignore` is a repo-config file (not code, not generator source) — the change moves **no** hash and is
the necessary mechanism for the release docs to land. **Caught before the commit, not after.**

## 2. The Store-submission runbook (DC-5)

[`desktop/src-tauri/msix/README.md`](../../desktop/src-tauri/msix/README.md) extended from the step-1 wrap
recipe into the **authoritative 4-step go-live runbook** — each step with exact commands/inputs + a
**done-check** + the honest **Leela's-machine** note:

1. **The MakeAppx MSIX wrap** — `tauri build` payload → assemble (Bedrock.exe + the node sidecar +
   `resources/gen` + `AppxManifest.xml` + logos) → `MakeAppx.exe pack`; the placeholder substitution; the
   local self-signed-cert note (**LOCAL sideload-test ONLY — NOT the Store signature**).
2. **The packaged launch + sidecar-under-MSIX test** — sideload → launch → the front-end loads + the 5
   commands round-trip (the sidecar spawns under `runFullTrust`; the `SidecarResult` renders
   clean/findings/env-error) + the packaged determinism smoke. **Done-check: works end-to-end.**
3. **The Bedrock name reservation** — Partner Center → reserve "Bedrock" (or a prepared variant); the ~$19
   registration note; feed the assigned Identity values into the manifest.
4. **The Store submission** — upload the submission-wrap `.msix` → the listing (description from
   CAPABILITIES.md) → submit → **Microsoft signs + certifies.**

**The name↔identity dependency is explicit at the top (two wrap passes):** a **local-test wrap** (dev cert
+ placeholder identity) for step 2, then a **submission wrap** with the **real reserved identity** after
step 3 — with the recommendation to **reserve the name early** to obtain the identity. **None of the four
steps is claimed done — the runbook is the recipe.**

## 3. The docs-only proof (DC-6)

- **Backstop byte-identical (from clean):** 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9deda1caf` — no
  frozen hash moved.
- **git status — docs + `.gitignore` only:** `?? /CAPABILITIES.md`, `?? /README.md`, `?? /RELEASE-NOTES.md`,
  `M docs/CAPABILITIES.md`, `M desktop/src-tauri/msix/README.md`, `M .gitignore`, `?? docs/daily/eco-day-60-*.md`.
  **No code, no `generator/` source, no hash change** (`git status | grep -v '\.md$|\.gitignore$'` → empty).

## 4. The complete boundary ledger (carried ONE FINAL TIME — §4)

- **Verification levels (the stacks):** Express **runtime/booted**; FastAPI/Django **syntax-level**;
  Go/Spring **generation-only** (no Go/Java toolchain). The benchmarks verify the generated output for all 5.
- **Security:** the deterministic Semgrep scan is **CI/Linux-verified** (Semgrep absent on the Windows
  shell — it guides here; the CERTAIN gate is CI-enforced); the AI-advisory scan + the creative fill are
  **pure-core CI-proven (FAKE)**, the **live AI calls developer-keyed + DEFERRED** (no key).
- **Exporter / Law 21:** static + require-graph standalone (Express) proven; the **live Docker boot
  DEFERRED** (daemon down).
- **Figma** edge honest-manual (core CI-proven); **static+API Spring-centric**; **GitLab CI staged**.
- **The packaged / Store path (Leela's Windows/Store machine — NOT claimed):** the MakeAppx MSIX wrap; the
  packaged GUI launch + sidecar-under-MSIX check (the front-end verified by inspection + static-preview
  guard/render only here); the Store submission (Microsoft signs at cert); the **"Bedrock" name — NOT
  reserved** (variant prepared). The **store-backed `--model` picker DEFERRED** (raw textarea shipped).
- **Cross-OS:** generation determinism OS-independent + CI-enforced (ubuntu/windows/macos) for
  *generation*; the **desktop BUILD Windows-only**.
- **Carried Phase-1/2/3 boundaries:** no live DB boot; the **Day-29 re-baseline** (MAXIMAL `366e19d9…`)
  stands; the v0.1 21-day-core limitations remain in `docs/CAPABILITIES.md` §3.

## 5. THE FINAL VERDICT — the 60-day build is COMPLETE

> ✅ **The shipped Bedrock system is CERTIFIED (Eco-Day 58), DOCUMENTED (Eco-Day 60), and release-ready.**
> **What ships:** a deterministic AI-free generator (**7 project types × 5 stacks**) + Figma ingestion +
> deterministic CI/CD + the exporter (**Law 21**) + the security layers (**Semgrep CERTAIN** + the
> detachable AI advisory, never the gate) + the Map (**exact impact** + **traceable flow**) + the
> **Bedrock desktop shell** (thin-invoker, packaged, determinism-preserving) — every default/empty path
> reproducing the frozen backstop (**103 baked + 10 TeamTracker + non-hash, 194 OK / 0 FAIL, MAXIMAL
> `366e19d9…`**), **AI-free generation** (ADR-001), **pure-Node** (`deps {}`, 0 native), and **the packaged
> sidecar generating identically to the certified generator**. **Going live** is the 4-step runbook on
> Leela's Windows/Store machine: **MakeAppx wrap → packaged launch test → Bedrock name reservation → Store
> submission.**

---

*Day 60 closes the 60-day build — docs only, the system already certified (Day 58). The final docs: a new
root `CAPABILITIES.md` (the Bedrock v0.1.0 release record — every capability at its Day-58-certified level +
proof location + the complete boundary ledger, nothing re-claimed beyond the certification), a new root
`README.md` (the Bedrock front door + the thesis: reduce AI reliance to only what's non-deterministic, the
blueprint is the source of truth, code is a deterministic projection, the Map is the determinism dividend),
a new root `RELEASE-NOTES.md` (v0.1.0 — the certified backstop, the packaged-path determinism,
ship-vs-deferred), and a one-line historical pointer atop the preserved `docs/CAPABILITIES.md` (the v0.1
21-day-core record — kept intact, staleness named). The Store-submission runbook (`desktop/src-tauri/msix/
README.md`) now carries the 4 ordered Leela's-machine steps (MakeAppx wrap → packaged launch +
sidecar-under-MSIX test → Bedrock name reservation → Store submission), each with exact commands + a
done-check + the honest note, and the name↔identity dependency made explicit (a local-test wrap with a
self-signed cert, then a submission wrap after the name is reserved). A real finding was caught and fixed
before commit: the repo's whitelist `.gitignore` was ignoring the new root docs — un-ignore rules were
added exactly as `CLAUDE.md` is tracked (config, not code; no hash moved). Docs only: the frozen backstop
byte-identical from clean (194 OK / 0 FAIL, MAXIMAL `366e19d9…`), git shows only docs + `.gitignore`, no
code changed, no hash moved; CAPABILITIES claims only what Day 58 certified; the runbook is the recipe (the
4 steps are Leela's to run — no claimed wrap/launch/reservation/submission). The 60-day build is complete —
the shipped Bedrock system is certified, documented, and release-ready; going live is the runbook. The
measure held: the software does everything it can deterministically — for free, for certain, byte-identical
— and confines AI to the irreducible creative/judgment gaps, always opt-in, always detachable, always the
developer's own bill.*
