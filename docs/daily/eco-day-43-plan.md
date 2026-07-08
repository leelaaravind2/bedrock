# Eco-Day 43 — PLAN: deterministic security scan (Semgrep) — the free default

**Phase 4, Day 43. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 43 adds the **free, certain,
DETERMINISTIC** security gate: **Semgrep** (deterministic static analysis, pinned rules + pinned
version) wired into generated projects (a CI workflow) AND available as an in-app **scan** action.
Findings are stamped **CERTAIN** (deterministic). **NO AI, no key, no tokens** — this is the
deterministic tier; the optional developer-keyed AI scan is Day 45 (ADVISORY, separate). The scan is
a **SEPARATE, READ-ONLY layer** — it reads the project and **never changes generation**.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md)
(§1.1 no baseline moves silently; §1.2 AI is never the gate — the deterministic scan is CERTAIN, AI
is advisory; §3 STOP-and-report — *don't claim a scan that didn't run*; §4 honesty) →
[`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md) Day 43 (the free deterministic gate) + Day 45 (the
AI scan — advisory-last) + the Phase-4 security model (deterministic-first, AI advisory-last) →
[`eco-day-41-report.md`](eco-day-41-report.md) (the gate — 102 baked + 10 TeamTracker + non-hash
1c–1t; the exporter; the standalone project the scan reads) → the REAL code: `core/cicd.ts`
(`renderGithubActions` / `renderCiWorkflow` — the CI-workflow renderer + the pinned-action table the
security workflow reuses; the 5 frozen Day-38 `ci.yml` baselines PART 1s), `core/regen.ts`
(`buildFileSet` — the gated additive-artifact seam, `design-tokens.json`/`ci.yml`), `detect/detect-core.ts`
(the Day-18 detect-and-guide pattern — the shape of the read-only, tool-invoking in-app action).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read live from the REAL code):**
> - **The CI-workflow seam is `core/cicd.ts`.** The Day-38 `ci.yml` is a SINGLE deterministic
>   workflow with **5 frozen baselines (PART 1s)**. **⇒ Adding a scan STEP to `ci.yml` would move all
>   5 Day-38 baselines (a re-baseline).** The clean determinism-safe choice is a **SEPARATE additive
>   `security.yml` workflow** — the Day-38 `ci.yml` stays **byte-identical** (see §2.2). The `security.yml`
>   reuses the existing **pinned-action table** (`actions/checkout@v4`, `actions/setup-python@v5`).
> - **The gating precedent is `cicd`/`designTokens`.** A neutral model field, default = literal bypass,
>   emitted gated in `buildFileSet` (`renderCiWorkflow` returns null for `'none'`). The `security` field
>   mirrors this exactly — default `'none'` ⇒ no artifact ⇒ the frozen backstop byte-identical.
> - **The in-app action precedent is `detect` (Day 18).** A pure-core probe + shelling out to an
>   external TOOL + a guide when the tool is absent. The scan action is the same shape: probe Semgrep →
>   run with the pinned rules → CERTAIN findings; guide/honest-manual when Semgrep is absent. **Semgrep
>   is a TOOL, never a Thraksha `deps {}` entry.**
> - **Semgrep is NOT runnable here** (not on PATH; Windows + Python 3.14 support is uncertain). ⇒ the
>   WIRING's determinism is provable HERE (pinned rules artifact + pinned version + read-only +
>   additive); the actual Semgrep RUN + planted-issue catch is **honest-manual/deferred** unless the
>   execute session confirms `pip install semgrep` works (see §2.5).
> - **Determinism ≠ the floating registry.** Semgrep's `p/default` registry CHANGES over time → NOT
>   deterministic. Thraksha ships its OWN **pinned custom ruleset** (`semgrep-rules.yml`) — a fixed,
>   byte-identical, hashed data file. **PINNED rules + PINNED version = same project → same findings.**
> - **No fixture declares a scan** ⇒ the security artifacts are additive by construction (the frozen
>   backstop cannot move).

---

## 0. What Day 43 is — the deterministic security tier (read-only, pinned, CERTAIN)

Semgrep is the **free, certain gate**: a pinned custom ruleset + a pinned Semgrep version → the same
project yields the same findings, stamped **CERTAIN**. It is wired two ways — a **generated
`security.yml` CI workflow** (so the exported project scans itself standalone, Law 21) and an **in-app
scan action** (detect-and-guide-shaped) — and it is a **SEPARATE READ-ONLY layer**: it reads the
generated/exported project, **never changes generation** (0 generation-path refs; the frozen backstop
byte-identical). No AI (the AI scan is Day 45).

---

## 1. THE DETERMINISM SPINE

1. **DETERMINISTIC SCAN.** Same project + PINNED rules (`semgrep-rules.yml`, a fixed Thraksha ruleset)
   + PINNED Semgrep version → the same findings (Semgrep is deterministic given pinned inputs). The
   **rules artifact is deterministic** (twice-identical, hashed); the **version is pinned** in the
   `security.yml` step (never `@latest`/floating). Findings are a **scan-time output** (produced by the
   scan RUN in CI or in-app) — **never a generation artifact** (Thraksha never runs Semgrep at
   generation time; that would be tool-dependent/non-deterministic — the AI-in-generation ban, applied).
2. **GENERATION UNAFFECTED.** The scan is a SEPARATE layer — it reads the project, never changes
   generation. The default (`security: 'none'`) reproduces the frozen backstop byte-identical (102
   baked + 10 + non-hash); a declared scan emits **additive gated artifacts** (a NEW `security.yml` +
   `semgrep-rules.yml`, new twice-identical baselines). **The Day-38 `ci.yml` is NOT touched** — the
   scan is a separate workflow, so its 5 baselines do NOT move (see §2.2). **A moved frozen hash = a
   FINDING, STOP.**
3. **NO AI (the deterministic tier — ADR-001).** Semgrep is deterministic static analysis — no AI, no
   key, no tokens. The scan module has **0 AI references**; the AI scan is Day 45 (advisory, separate).
4. **CERTAIN findings.** Deterministic findings are stamped **CERTAIN** — a distinct class from Day-45's
   **ADVISORY** AI findings (visibly separate tiers; the deterministic scan is the gate, AI is advisory).

---

## 2. THE ARCHITECTURE — a gated, read-only, pinned security layer

### 2.1 The gating field (mirrors `cicd`/`designTokens`)
- **A new neutral `security` field:** `SecurityConfig = { scan: 'none' | 'semgrep' }`, default
  `{ scan: 'none' }` — the literal bypass. Independent of `cicd` (a project may scan without full
  CI/CD). Thread through the model (`getSecurity`/`setSecurity`), `ProjectState`
  (`getState`/`restoreProjectModel` back-compat default), and `assembleBlueprint` (`security?`) — the
  exact additive discipline `cicd` followed (default value ⇒ byte-neutral assembled state; PART 1i /
  the export gates stay green).

### 2.2 The generated CI wiring — a SEPARATE additive `security.yml` (NOT a `ci.yml` step)
- When `scan: 'semgrep'`, `buildFileSet` emits (gated, additive):
  - **`semgrep-rules.yml`** — the PINNED custom ruleset (a Thraksha-authored, fixed, hashed data file).
  - **`.github/workflows/security.yml`** — a deterministic Semgrep workflow: `checkout@v4` →
    `setup-python@v5` (pinned, reusing the Day-38 pinned-action table) → `pip install semgrep==<PIN>`
    (a PINNED Semgrep version, never floating) → `semgrep --config semgrep-rules.yml --error --json
    --output semgrep-findings.json .` (the pinned rules; `--error` makes findings fail CI — the gate;
    `semgrep-findings.json` is the scan-time CERTAIN output). No AI, no key, no tokens.
- **LOAD-BEARING (§1.2 / §2 spine):** the scan lives in `security.yml`, **NOT** a step in the Day-38
  `ci.yml` — so the **5 Day-38 `ci.yml` baselines stay byte-identical (no re-baseline).** *(Adding a
  step to `ci.yml` WOULD move those 5 baselines — a deliberate re-baseline that would have to be flagged
  + documented per §1.1; we AVOID it via the separate additive workflow. This is the resolution.)*
- Semgrep is pip-installed **in CI** (a CI/dev tool) — **not** a generated-project runtime dependency
  and **not** a Thraksha dependency.

### 2.3 The in-app / CLI scan action (detect-and-guide-shaped, read-only)
- A new **`core/scan.ts`** + a `scan` action (CLI `npm run scan -- <projectDir>` and/or a desktop
  action): probe for Semgrep → if present, invoke `semgrep --config <pinned rules> --json <projectDir>`
  (the PINNED rules + version) → parse findings → stamp **CERTAIN** → a deterministic findings report;
  if absent, **guide** the user (install Semgrep / the CI workflow runs it) — honest, never a crash.
- **READ-ONLY:** the scan reads the project directory (the exported/generated tree). **`buildFileSet`
  and the plugins NEVER import `core/scan.ts`** — the scan is 0 generation-path refs (like `detect`).
  The findings report is a scan-time output, never a generation artifact.

### 2.4 The pinned custom ruleset (the determinism anchor)
- **`semgrep-rules.yml`** — a SMALL, high-signal, PINNED Thraksha ruleset (a shared core constant
  string, like the pinned-action table), authored across the generated stacks (JS/Python/Go/Java) +
  general best-practices. Candidate rules (execute finalizes): hardcoded secret/credential literals;
  raw SQL string concatenation (injection) in the developer seams; `eval`/`exec`/`os.system` on
  untrusted input; weak/insecure crypto or randomness; overly-permissive CORS. **Pinned — NOT the
  floating `p/default` registry** (which changes → non-deterministic). Same rules + same Semgrep
  version → reproducible findings.

### 2.5 What is provable HERE vs deferred (honest, §4)
- **PROVABLE HERE (no Semgrep needed — string/structural properties):** (a) the `semgrep-rules.yml`
  artifact is deterministic (twice-identical, hashed); (b) the `security.yml` pins the Semgrep version
  + the actions (grep → pinned, never floating); (c) the scan is READ-ONLY (0 generation-path refs;
  `buildFileSet` never imports the scan runner); (d) generation unaffected — default `'none'` ⇒ the
  full backstop (incl. the 5 Day-38 `ci.yml` baselines) byte-identical; (e) the scan-config artifacts
  are additive gated baselines (twice-identical); (f) the CERTAIN stamp (structural).
- **RESOLVE IN EXECUTE (attempt honestly):** whether `pip install semgrep==<PIN>` succeeds on this
  Windows/Python-3.14 shell. **If Semgrep runs:** prove the planted-issue catch (a test project with a
  known-planted issue → Semgrep flags it) + determinism (same project → same findings TWICE). **If not
  (likely):** the WIRING is deterministic-by-design (pinned rules + version + read-only); the actual
  RUN + planted-issue catch is **honest-manual/deferred** (Semgrep not installable here) — the CI
  `security.yml` runs it on a real runner. **State plainly which; do NOT claim a scan that didn't run (§3).**

### 2.6 The dependency question (the recurring finding)
- **Thraksha core stays `deps {}`** — the security artifacts are pure-Node string emission (the rules +
  the workflow), and the scan action **shells out to the Semgrep TOOL** (invoked, never imported).
  **Semgrep is a scan-tool / generated-project-CI concern — NEVER a Thraksha dependency.** No YAML lib,
  no Semgrep SDK, no native module.

---

## 3. What the plan resolves (answered from the real code)
1. **Where the scan attaches:** a SEPARATE additive `security.yml` CI workflow (NOT a `ci.yml` step —
   so the Day-38 baselines don't move) + an in-app `scan` action (detect-and-guide-shaped) (§2.2/§2.3).
2. **Pinned rules + version:** a Thraksha-shipped `semgrep-rules.yml` (pinned custom ruleset, hashed) +
   a pinned Semgrep version in `security.yml` — never the floating registry (§2.4).
3. **Is Semgrep a Thraksha core dep?** NO — a TOOL, invoked/CI-installed; `deps {}` stays (§2.6).
4. **How generation is unaffected:** the scan is a separate READ-ONLY layer (0 generation-path refs);
   default `'none'` ⇒ byte-identical backstop; the artifacts are additive gated baselines (§1.2/§2.3).
5. **Does a `ci.yml` scan step move the Day-38 baselines?** YES it would — so we use a SEPARATE
   `security.yml` (additive); the Day-38 `ci.yml` stays byte-identical, no re-baseline (§2.2 — flagged).
6. **Is the scan verifiable here?** The WIRING determinism is provable HERE; the actual Semgrep RUN is
   resolve-in-execute (attempt `pip install`) → honest-manual/deferred if not runnable (§2.5).

---

## 4. Execute — done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than claim a scan that didn't run."**

- **DC-1 — the scan wiring.** The `security` field (`{scan:'none'|'semgrep'}`, default `'none'`) with
  model/assemble/state round-trip (additive, byte-neutral). `buildFileSet` emits, gated on
  `scan:'semgrep'`, `semgrep-rules.yml` (the pinned ruleset) + `.github/workflows/security.yml` (pinned
  Semgrep version + pinned actions). An in-app `scan` action (`core/scan.ts`, detect-and-guide-shaped,
  read-only). No Semgrep/YAML lib as a Thraksha dep.
- **DC-2 (LOAD-BEARING) — GENERATION UNAFFECTED / default byte-identical.** `rm -rf dist && npm run
  build && npm run day20:regress` → PASS, the full backstop byte-identical (102 baked + 10 + non-hash) —
  **including the 5 Day-38 `ci.yml` baselines UNMOVED** (the scan is a separate `security.yml`). The
  `security` field defaults to `'none'`; no fixture declares a scan. **A moved hash = a finding, STOP.**
- **DC-3 — additive twice-identical baselines (new PART 1u).** `security:'semgrep'` → `semgrep-rules.yml`
  + `security.yml` generated **twice-identical** → recorded (additive).
- **DC-4 — PINNED rules + version + read-only.** The rules file is a fixed pinned ruleset (hashed); the
  `security.yml` pins the Semgrep version + the actions (grep → pinned, never `@latest`/floating); the
  scan is READ-ONLY — **0 generation-path refs** (`buildFileSet`/plugins never import `core/scan.ts`).
- **DC-5 — DETERMINISTIC SCAN + CERTAIN findings (honest).** The determinism is provable-by-design
  (pinned rules + version). **If Semgrep is runnable** (execute confirms `pip install semgrep==<PIN>`):
  scan a test project with a KNOWN-PLANTED issue → Semgrep flags it (stamped CERTAIN) + same project →
  same findings twice. **If not: honest-manual/deferred** (Semgrep not installable here; the CI workflow
  runs it) — state plainly.
- **DC-6 — invariants.** Generator pure-Node (`deps {}`, 0 native — Semgrep is a tool, not a dep; the
  security artifacts are string emission; the scan action shells out); **NO AI** (deterministic tier);
  no unintended frozen hash moved; the scan read-only (generation unaffected).

**Execute scope guard (every stage):** only the deterministic Semgrep scan. **NOT** the AI scan (Day
45); **NOT** the Map (Day 47). The scan is **READ-ONLY** (never changes generation). **Pinned rules +
pinned Semgrep version** (never floating). **Semgrep is a scan-tool, NEVER a Thraksha core dep** (`deps
{}` stays). **NO AI** (Day 45). If a `ci.yml` scan step is ever added, it moves the Day-38 baselines —
**FLAG it as a re-baseline decision** (we AVOID it via the separate `security.yml`). No signing. Commit
to `main`.

---

## 5. REPORT — done-conditions

[`eco-day-43-report.md`](eco-day-43-report.md): the scan wiring (the additive `security.yml` CI workflow
+ the pinned `semgrep-rules.yml` + the in-app `scan` action; pinned rules + version); the
**determinism proof** (pinned rules + version → same project → same findings — provable-by-design; the
actual RUN + planted-issue catch **if Semgrep ran here** vs **honest-manual/deferred** if not); the
**generation-unaffected proof** (the scan is read-only, 0 generation-path refs; the **Day-38 `ci.yml`
byte-identical — no re-baseline**; default backstop byte-identical); the **CERTAIN stamp** (distinct
from Day-45 ADVISORY); **invariants** (pure-Node `deps {}`; Semgrep-as-tool, not a core dep; no AI).
**Forward-flags:** whether Semgrep RAN here vs wired-honest-manual; the `ci.yml`-untouched
(separate-workflow) decision; what **Day 45** picks up (the optional developer-keyed AI security scan —
**ADVISORY**, after + separate from the deterministic CERTAIN scan, detachable, developer-keyed).

---

## 6. Scope guard — OUT for Day 43
- Only the deterministic Semgrep scan. **NOT** the AI scan (Day 45); **NOT** the Map (Day 47).
- **The scan is READ-ONLY** — it never changes generation (0 generation-path refs; generation output
  unaffected; the default backstop byte-identical; the Day-38 `ci.yml` untouched).
- **Pinned rules + pinned Semgrep version** — never floating (determinism; not the changing registry).
- **Semgrep is a scan-tool / generated-project-CI concern — NEVER a Thraksha core dep** (`deps {}` stays).
- **NO AI** (the deterministic tier — AI is Day 45, advisory). No signing.
- If a `ci.yml` scan step is added (instead of the separate `security.yml`), it's a **flagged
  re-baseline decision** (we prefer the additive separate workflow → no baseline moves).

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + Month-3 Day 43 (+ the security model) + the Day-41 report + the real `core/cicd.ts`
   (the CI seam + the 5 frozen `ci.yml` baselines) + `buildFileSet` (the gated seam) + the `detect`
   pattern? — ✅ (this session).
2. Only Day-43's job (the deterministic Semgrep scan)? — yes; **not** the AI scan, **not** the Map.
3. Which frozen baselines must NOT move? — **all** (102 baked + 10 TeamTracker + non-hash; **the 5
   Day-38 `ci.yml` baselines** especially — the scan is a SEPARATE `security.yml`). MAXIMAL `366e19d9…`.
4. New AI touchpoints? — **none** (deterministic tier; the scan module has 0 AI refs).
5. Default/empty path a literal bypass? — yes: `security:'none'` ⇒ no artifact; the scan action is read-only.
6. Three killers checked? — the security artifacts are deterministic pinned strings (no clock/RNG/UUID;
   LF; stable order); the RULES are pinned (not the floating registry — the CI-specific killer);
   Semgrep is a tool (not a core dep). Findings are a scan-time output, never a generation artifact.
7. A gate that can actually FAIL? — **DC-2** (a moved frozen hash — esp. a Day-38 `ci.yml` baseline: the
   scan leaked into `ci.yml` instead of a separate workflow), **DC-3** (a non-deterministic security
   artifact), **DC-4** (a floating Semgrep version / a generation-path ref to the scan runner), **DC-6**
   (Semgrep in Thraksha `deps` / an AI ref / a native module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming a Semgrep RUN that didn't happen (not
   installable here → honest-manual/deferred); (ii) a scan step in `ci.yml` silently moving the 5
   Day-38 baselines (use the separate `security.yml`; a `ci.yml` change is a flagged re-baseline);
   (iii) pinning to the floating `p/default` registry (non-deterministic — ship pinned custom rules);
   (iv) Semgrep added to Thraksha `deps {}` (it's a tool); (v) any AI in the deterministic tier (AI is
   Day 45); (vi) the scan changing generation (it's read-only) — all guarded.

---

*Day 43 adds the deterministic security tier: Semgrep with a PINNED custom ruleset + a PINNED version,
wired as a SEPARATE additive `.github/workflows/security.yml` CI workflow (so the 5 frozen Day-38
`ci.yml` baselines stay byte-identical — no re-baseline) plus a pinned `semgrep-rules.yml`, and as an
in-app read-only `scan` action (detect-and-guide-shaped: probe Semgrep → run with the pinned rules →
CERTAIN findings → guide if absent). Gated on a neutral `security: { scan: 'none' | 'semgrep' }` field
(default `'none'` = literal bypass, mirroring `cicd`/`designTokens`), so the default reproduces the
frozen backstop byte-identical and a declared scan yields new twice-identical additive baselines (PART
1u); the scan is a SEPARATE READ-ONLY layer (0 generation-path refs — `buildFileSet` never imports the
scan runner), so generation output is unaffected. The determinism is anchored by PINNED rules (a fixed
Thraksha ruleset, not the changing `p/default` registry) + a PINNED Semgrep version — same project →
same findings — with findings a scan-time output (never a generation artifact; Thraksha never runs
Semgrep at generation time), stamped CERTAIN (distinct from Day-45's ADVISORY AI tier). NO AI (the
deterministic tier, ADR-001); Semgrep is a scan-tool / generated-project-CI concern, never a Thraksha
core dependency (`deps {}` stays, 0 native). The wiring's determinism (pinned rules artifact + pinned
version + read-only + additive) is provable HERE; the actual Semgrep RUN + the planted-issue catch is
resolved in execute (attempt `pip install semgrep`) and is honest-manual/deferred if Semgrep is not
runnable on this Windows/Python-3.14 shell — no claimed scan that didn't run. Day 45 picks up the
optional developer-keyed AI security scan (ADVISORY, after and separate from the deterministic gate).*
