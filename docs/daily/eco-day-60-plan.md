# Eco-Day 60 — PLAN: THE RELEASE — final docs + the ordered Store-submission runbook

**Phase 4, Day 60 — the release (the honest close of the 60-day build).** Day 58 **certified** the shipped
system; Day 60 writes the **release documentation** and the **ordered Store-submission runbook** so Bedrock
going live is **mechanical**. **DOCS ONLY — no code, no new features, no frozen hash moved.** The system is
already certified; this session records it honestly and hands off the go-live recipe.

**This session is PLAN ONLY. No code, no builds.** It designs the final docs + the runbook + the docs-only
proof.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. The doc landscape (read this session — what exists, what to add/close)

| Doc | State | Day-60 action |
|---|---|---|
| `docs/CAPABILITIES.md` | **Exists — the v0.1 "21-day core" record** (dated 2026-07-02; 43 digests, 5 stacks, 2 project types, the wizard — **pre-ecosystem**) | **Preserve as the historical v0.1-core record** + add a top pointer to the new release record (name the staleness, keep the dated record intact — the doc's own §4 discipline) |
| root `README.md` | **Does NOT exist** (only `CLAUDE.md` at root) | **CREATE** — the Bedrock front door |
| root `CAPABILITIES.md` | — | **CREATE** — the **Bedrock v0.1.0 release** capability record (full 60-day ecosystem, Day-58 levels) |
| root `RELEASE-NOTES.md` | — | **CREATE** — the v0.1.0 closing record / release notes |
| `desktop/src-tauri/msix/README.md` | **Exists — the wrap recipe** (step-1 wrap + placeholders + the "Bedrock not reserved" note) | **EXTEND → the authoritative 4-step runbook** (wrap → launch test → name reservation → submission), name↔identity dependency explicit |
| `docs/CONSTITUTION.md` / `docs/THRAKSHA-ECOSYSTEM-PLAN.md` | The thesis source | **Reference** (the thesis is quoted, not rewritten) |

**Two-CAPABILITIES design (honest):** the existing `docs/CAPABILITIES.md` is genuinely a **different
scope** (the v0.1 21-day core, before Phases 1–4). Day 60 creates the **root `CAPABILITIES.md`** as the
current **Bedrock release** record and adds a one-line pointer atop `docs/CAPABILITIES.md` marking it the
superseded v0.1-core historical record. This preserves the dated record (§4) while giving one authoritative
release front-door.

---

## 1. PART 1 — the final docs (the honest closing record)

### 1.1 root `CAPABILITIES.md` (new) — the Bedrock v0.1.0 release capability record

**Sourced ONLY from the Day-58 certification** ([`eco-day-58-report.md`](eco-day-58-report.md)) — every
capability at the level Day 58 certified, with its proof location, and the **complete boundary ledger** in
the same document. **Nothing re-claimed beyond the certification.** Structure (mirrors the existing
CAPABILITIES.md discipline — proof levels first, then the table, then the complete limitations set):

- **§1 Proof levels** (read first): Generation-deterministic (byte-identical to a frozen baseline) /
  Express-booted (run live) / generation-only (no toolchain) / core-CI-proven-edge-honest-manual /
  deferred. Claims never collapse upward.
- **§2 The capability table** — each at its Day-58 proven level + proof location (carry the Day-58 table):
  - Deterministic generation core (7 project types × 5 stacks) — Phases 1–3; PART 1a/1b/1q/1r.
  - The `assembleBlueprint` seam (every input an additive layer, default = literal bypass) — PART 1i.
  - Figma token ingestion (core CI-proven; edge honest-manual) — Day 31.
  - CI/CD generation (string-provable; live run not verifiable) — Day 38.
  - Creative slot fill (detachable, dev-keyed, default-off; live AI deferred) — Day 23.
  - Exporter / Law 21 (static + require-graph standalone; live Docker boot deferred) — Day 41.
  - Deterministic scan (Semgrep) — CERTAIN, the gate; live run CI/Linux-only — Day 43.
  - AI-advisory scan (detachable; live AI deferred; never the gate) — Day 45.
  - The Map — impact preview (previewed == real, byte-for-byte) — Day 47.
  - The Map — flow map (declared-model projection + traceability) — Day 50.
  - The Bedrock desktop shell (5 thin-invoker commands + `SidecarResult`; packaged GUI deferred) — Days 52/53.
  - Front-end UI + Bedrock identity (thin client; live GUI deferred) — Day 55.
  - Packaged-path determinism (the sidecar reproduces the 103 frozen digests) — Days 51/58.
  - The full frozen backstop (103 baked + 10 TeamTracker + non-hash, 194 OK / 0 FAIL, MAXIMAL `366e19d9…`) — Day 58.
- **§3 The complete boundary ledger** (none dropped — carry the Day-58 ledger verbatim in spirit): the
  verification levels (Express booted / FastAPI-Django syntax / Go-Spring generation-only); live Semgrep
  CI/Linux-only; live AI + live Docker boot deferred; the Figma edge honest-manual; static+API Spring-
  centric; GitLab staged; the **Leela's-machine Store steps** (MakeAppx wrap + packaged launch + Store
  submission + Bedrock name reservation — NOT claimed); the store-backed `--model` picker deferred;
  cross-OS generation determinism CI-enforced but the desktop build Windows-only; the Phase-1/2/3 carried
  boundaries; the Day-29 re-baseline.
- **§4 How to verify** — `cd generator && npm run build && npm run day20:regress` → 194 OK / 0 FAIL, 103
  baked + 10 + non-hash, MAXIMAL `366e19d9…`; the packaged-path proof (the bundled node reproduces the 103
  digests — Day 58 DC-2).

### 1.2 root `README.md` (new) — the Bedrock front door

- **What Bedrock is** (one paragraph): a deterministic, AI-free app generator — a blueprint → byte-identical
  deployable code (7 project types × 5 stacks), packaged as a Windows desktop app, free on the Microsoft
  Store.
- **The thesis** (plain, quoted from [`CONSTITUTION.md`](CONSTITUTION.md) / the ecosystem plan): *reduce AI
  reliance to only what software cannot do deterministically; the blueprint is the source of truth, code is
  a deterministic projection of it; the Map is the visible dividend of the determinism discipline* (a
  blueprint diff → an exact output diff, because generation is a pure function of the blueprint).
- **What it does** → link to [`CAPABILITIES.md`](CAPABILITIES.md).
- **Quickstart / verify determinism** — `cd generator && npm run day20:regress`.
- **Going live (the Store)** → link to the runbook
  [`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md).
- **The rules** → link to [`docs/THRAKSHA-GUARDRAILS.md`](docs/THRAKSHA-GUARDRAILS.md) +
  [`docs/CONSTITUTION.md`](docs/CONSTITUTION.md).
- **Status:** v0.1.0 — certified in-repo (Day 58); go-live = the 4-step runbook on Leela's machine.

### 1.3 root `RELEASE-NOTES.md` (new) — v0.1.0 closing record

The honest release state at close:
- **Version 0.1.0.** Ships as **Bedrock** (Windows-only, Microsoft Store / MSIX, Microsoft signs at cert).
- **Certified backstop:** 103 baked + 10 TeamTracker + non-hash, 194 OK / 0 FAIL, MAXIMAL `366e19d9…`
  (Day-58).
- **Packaged-path determinism:** the shipped sidecar (bundled node v22.21.0) reproduces the certified
  generator's 103 digests byte-identical (Day-58 DC-2) — determinism survives into the bundle.
- **What ships:** the deterministic generator + Figma/CI/CD + exporter (Law 21) + security layers + the Map
  + the Bedrock shell + the built MSI/NSIS + the MSIX manifest+recipe.
- **What's deferred / honest-manual:** the 4 Leela's-machine Store steps; the live AI/Semgrep/Docker; the
  cross-OS desktop build (Windows-only). (Point to CAPABILITIES §3 for the full ledger.)
- The **60-day arc** in one line (Phases 0–4): core determinism → the ecosystem seam → Figma/types/CI →
  export/security/the Map → the shell + packaging + certification.

### 1.4 `docs/CAPABILITIES.md` — the historical pointer

Add a **single header note** atop it: *"This is the v0.1 21-day-CORE capability record (Phases 0–1, dated
2026-07-02). For the full Bedrock v0.1.0 release capabilities (the 60-day ecosystem), see the root
[`CAPABILITIES.md`](../CAPABILITIES.md)."* **No other edit** — the dated record stays intact (its §4
drift-note discipline applied to itself).

---

## 2. PART 2 — the Store-submission runbook (extend `desktop/src-tauri/msix/README.md`)

Extend the existing wrap recipe into **the authoritative 4-step go-live runbook** — each step mechanical
(exact commands/inputs) + a **done-check** + the honest **Leela's-machine** note. **The runbook is the
RECIPE — the 4 steps are Leela's to run; none is claimed done.**

### 2.0 The name↔identity dependency (make explicit — the ordering fix)
Step 3 (name reservation) yields the **Identity Name / Publisher** that the **Store** `AppxManifest.xml`
needs (step 1's placeholders). So the runbook states **two wrap passes**:
- **A local-TEST wrap** (step 1→2) can use a **dev/placeholder identity + a self-signed cert** — for the
  packaged launch test only.
- **The SUBMISSION wrap** needs the **reserved identity first (step 3)** → re-pack with the real
  `{{STORE_IDENTITY_NAME}}` / `{{STORE_PUBLISHER_CN}}` before step 4.
- **Recommended order:** reserve the name (step 3) EARLY to get the identity, run the local test wrap in
  parallel, then the final submission wrap. The dependency is called out at the top of the runbook.

### 2.1 Step 1 — the MakeAppx MSIX wrap
- From the Day-55 built payload: `npx tauri build --bundles msi nsis` → `target/release/` (Bedrock.exe +
  the node sidecar + `resources/gen/**`).
- Assemble the payload dir (exe + `node-x86_64-pc-windows-msvc.exe` + `resources/gen/**` +
  `AppxManifest.xml` + tile/store logos).
- **Placeholder substitution:** fill `{{STORE_IDENTITY_NAME}}` / `{{STORE_PUBLISHER_CN}}` /
  `{{PUBLISHER_DISPLAY_NAME}}` from Partner Center (step 3) — or dev placeholders for the local test wrap.
- `MakeAppx.exe pack /d build/msix-payload /p Bedrock.msix` (Windows SDK).
- **Local sideload-test-signing note:** a self-signed cert + `SignTool` is for **LOCAL install testing
  ONLY — NOT the Store signature.** Microsoft signs at certification.
- **Done-check:** `Bedrock.msix` produced; `sync-gen:check` confirms the packaged `resources/gen` ==
  certified before wrapping.

### 2.2 Step 2 — the packaged launch + sidecar-under-MSIX test
- Sideload the (self-signed) `Bedrock.msix` → `Add-AppxPackage` → launch Bedrock.
- Confirm: the **front-end loads**; the **5 commands round-trip** (the sidecar spawns under MSIX's
  `runFullTrust`; the `SidecarResult` renders — **clean / findings / env-error**); the **packaged
  determinism smoke** (the exporter / scan / Map surfaces work through the GUI; the packaged sidecar
  reproduces the digests).
- **Done-check:** the packaged app **works end-to-end** — the sidecar spawns and generates under the MSIX
  container (the packaged-path claim, now GUI-verified).

### 2.3 Step 3 — the Bedrock name reservation
- Partner Center → reserve **"Bedrock"** (or the prepared variant if taken — **Bedrock Studio / Bedrock
  Forge / Thraksha Bedrock**, from the Day-55 note).
- Feed the assigned **Identity Name / Publisher / PublisherDisplayName** back into `AppxManifest.xml`
  (step 1's placeholders) → the **submission wrap**.
- **Done-check:** the name reserved + the identity values in hand + substituted into the manifest.

### 2.4 Step 4 — the Store submission
- Partner Center → new submission → upload the (real-identity) `Bedrock.msix` → the store listing
  (**description from `CAPABILITIES.md`**, screenshots, category, age rating, privacy) → submit for
  certification (**Microsoft signs + certifies**).
- **Note:** a one-time **~$19 Partner Center registration** if not already done.
- **Done-check:** submitted; then the wait for certification.

---

## 3. THE SPINE — docs only; the system is certified, nothing changes

1. **DOCS ONLY:** no code, no generation change. The frozen backstop stays **byte-identical** (103 baked +
   10 + non-hash, MAXIMAL `366e19d9…`). **A moved hash = FINDING, STOP** (it would mean a doc edit somehow
   touched the generator — impossible for docs, proven anyway).
2. **HONEST (§4):** `CAPABILITIES.md` + the release notes claim **ONLY what Day 58 certified** (proof
   locations + the boundary ledger) — nothing re-claimed beyond it. The runbook's 4 steps are **Leela's-
   machine (honest-manual)** — the docs describe the **recipe**; going live is Leela running it. **NO
   claimed Store submission / MSIX wrap / packaged launch / name reservation.**

### The docs-only proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → **194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…`
  byte-identical** (docs can't move a hash; proven anyway).
- `git status --short` → **only `.md` docs** changed/added (root `README.md`, root `CAPABILITIES.md`, root
  `RELEASE-NOTES.md`, `docs/CAPABILITIES.md` header, `desktop/src-tauri/msix/README.md`, the Day-60
  plan/report). **No code, no `generator/` source.**

---

## 4. EXECUTE done-conditions

1. **root `CAPABILITIES.md`** — the honest Bedrock v0.1.0 capability record (each capability + proof
   location + the complete boundary ledger, **from Day 58**; nothing re-claimed beyond the certification).
   **root `README.md`** created (Bedrock front door → CAPABILITIES + the runbook + the guardrails);
   `docs/CAPABILITIES.md` gets the historical-pointer header.
2. **root `RELEASE-NOTES.md`** — the honest release state (certified backstop, packaged-path determinism,
   version 0.1.0, ship-vs-deferred).
3. **The Store-submission runbook** (`desktop/src-tauri/msix/README.md` extended) — the **4 ordered steps**
   (MakeAppx wrap → packaged launch test → name reservation → Store submission), each with exact
   commands/inputs + a done-check + the honest Leela's-machine note; the **name↔identity dependency
   explicit** (the two-wrap-pass ordering).
4. **DOCS ONLY:** the frozen backstop byte-identical; `git status` shows only docs. **A moved hash =
   FINDING, STOP.**
5. **Honest:** CAPABILITIES claims only what's certified; the runbook is the recipe (the 4 steps are
   Leela's to run — **not claimed done**).

## 5. REPORT done-conditions

`eco-day-60-report.md` — the release close: the final docs written (root CAPABILITIES.md + README.md +
RELEASE-NOTES.md + the docs/CAPABILITIES.md pointer); the Store runbook (the 4 ordered steps + the
name↔identity dependency); the docs-only proof (backstop byte-identical, only docs changed); the honest
final state (certified in-repo; the 4 Leela's-machine steps remain). **The FINAL verdict:** the 60-day
build is complete — the shipped Bedrock system is certified, documented, and release-ready; going live is
the 4-step runbook on Leela's machine. Carry the **complete boundary ledger** one final time.

---

## 6. SCOPE GUARD — OUT

- **NO code, NO new features, NO frozen hash moved** (docs only — a moved hash = FINDING, STOP).
- **`CAPABILITIES.md` claims ONLY what Day 58 certified** — no new claims, no upward collapse of proof
  levels.
- **The runbook is the RECIPE** — the MakeAppx wrap + packaged launch + name reservation + Store submission
  are **Leela's-machine**; **describe them, do NOT claim they happened.**
- **No signing config** (Microsoft signs at certification); the self-signed note is **LOCAL-sideload-test
  ONLY** (not the Store signature).
- **Preserve the dated `docs/CAPABILITIES.md`** (add a pointer, don't rewrite it) — the §4 drift discipline
  applied to itself.

## 7. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + Month-3 (Day 60) + Day-58 (certification) + Day-55 + the existing CAPABILITIES /
   README / msix runbook — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; Day 60 is docs — moves nothing —
   **understood**.
4. AI touchpoints: none — docs only; CAPABILITIES states the AI is the detachable dev-keyed advisory edges
   only (ADR-001), never shipped — **honored**.
5. Default/empty path a literal bypass: N/A (no code) — the backstop is the standing proof — **noted**.
6. The three determinism killers: N/A (no output touched) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + `git status`; a moved hash / non-doc change
   = STOP — **yes**.
8. Overclaim / out-of-scope watch: CAPABILITIES claims only Day-58; the runbook is a recipe (no claimed
   go-live); the dated CAPABILITIES preserved — **guarded**.

---

*Day 60 plan: the release — the honest close of the 60-day build (docs only; the system was certified Day
58). Part 1 — the final docs: a new root `CAPABILITIES.md` (the Bedrock v0.1.0 capability record, every
capability at its Day-58-certified level + proof location + the complete boundary ledger, nothing
re-claimed beyond the certification), a new root `README.md` (the Bedrock front door + the thesis — reduce
AI reliance to only what's non-deterministic, the blueprint is the source of truth, code is a deterministic
projection, the Map is the determinism dividend), a new root `RELEASE-NOTES.md` (v0.1.0 — the certified
backstop, the packaged-path determinism, ship-vs-deferred), and a one-line historical pointer atop the
existing `docs/CAPABILITIES.md` (preserved as the v0.1 21-day-core record — §4 drift discipline). Part 2 —
the Store-submission runbook (extend `desktop/src-tauri/msix/README.md`): the 4 ordered Leela's-machine
steps (MakeAppx wrap → packaged launch + sidecar-under-MSIX test → Bedrock name reservation → Store
submission), each with exact commands/inputs + a done-check + the honest note, and the name↔identity
dependency made explicit (a local-test wrap with a self-signed cert, then the submission wrap after the
name is reserved). The spine: docs only — the frozen backstop byte-identical (MAXIMAL `366e19d9…`), git
shows only docs, a moved hash = FINDING/STOP; honest — CAPABILITIES claims only what Day 58 certified, the
runbook is the recipe (the 4 steps are Leela's to run, not claimed done — no claimed wrap/launch/reservation/
submission). No code, no builds this session — the plan governs the release close of the shipped Bedrock
system.*
