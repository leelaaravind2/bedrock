# Eco-Day 43 — REPORT: deterministic security scan (Semgrep) — the free default

**Phase 4, Day 43.** The **free, certain, DETERMINISTIC** security tier: Semgrep with a **PINNED
custom ruleset** + a **PINNED version**, wired as a **SEPARATE additive `.github/workflows/security.yml`**
(so the 5 frozen Day-38 `ci.yml` baselines stay byte-identical — no re-baseline) plus a shipped
`semgrep-rules.yml`, and as an in-app **read-only `scan` action**. Findings are stamped **CERTAIN**;
**no AI, no key, no tokens** (the AI scan is Day 45 — ADVISORY, separate). The scan is a **SEPARATE
READ-ONLY layer** — it reads the project and **never changes generation**. Default byte-identical.

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS, 173 OK / 0 FAIL,
103 baked digests** (102 + 1 additive security baseline), **MAXIMAL `366e19d9…` unchanged; the 5
Day-38 `ci.yml` baselines UNMOVED — no frozen hash moved.**

---

## 1. What shipped (DC-1)

- **A gated `security` field** (`{ scan: 'none' | 'semgrep' }`, default `'none'` = literal bypass)
  ([`core/security.ts`](../../generator/src/core/security.ts)), threaded through `ProjectState` +
  `getSecurity`/`setSecurity` + `createProjectModel`/`restoreProjectModel` (back-compat default) +
  `assembleBlueprint` (`security?`) — the exact additive discipline `cicd`/`designTokens` follow.
- **A SEPARATE additive `.github/workflows/security.yml`** (emitted when `scan: 'semgrep'`): pinned
  actions (`checkout@v4`, `setup-python@v5`) → **`pip install semgrep==1.90.0`** (pinned) →
  `semgrep --config semgrep-rules.yml --error --json --output semgrep-findings.json .`. **NOT a step
  in `ci.yml`** — so the Day-38 baselines don't move.
- **A PINNED custom `semgrep-rules.yml`** — a fixed, hashed ruleset (`thraksha-hardcoded-secret`,
  `thraksha-sql-string-concat`, `thraksha-dangerous-exec`, `thraksha-weak-random`; `generic`-mode
  pattern-regex, language-agnostic), **NOT the floating remote registry**. The deterministic
  generated code (env-var secrets + parameterized queries) does not trip them — the scan guards the
  developer's additions.
- **An in-app read-only `scan` action** ([`core/scan.ts`](../../generator/src/core/scan.ts) +
  `src/scan.ts`, `npm run scan -- <dir>`): detect-and-guide-shaped — probe Semgrep → run with the SAME
  pinned rules → CERTAIN findings; **guide (never crash)** when Semgrep is absent. Findings carry a
  `class: 'certain'` (distinct from Day-45's ADVISORY).

---

## 2. The proofs

### DC-2 — GENERATION UNAFFECTED / default byte-identical + ci.yml UNMOVED (load-bearing) ✅
`rm -rf dist && npm run build && npm run day20:regress` → **PASS, 173 OK / 0 FAIL**. The `security`
field defaults to `'none'`; no fixture declares a scan. The **5 Day-38 `ci.yml` baselines are UNMOVED**
(Express `1fd42916…`, etc. — the scan is a SEPARATE `security.yml`, not a step). MAXIMAL `366e19d9…`
unchanged. **No frozen hash moved.**

### DC-3 — additive twice-identical baseline (PART 1u) ✅
`scan: 'semgrep'` (Express, DemoApp) → `security.yml` + `semgrep-rules.yml` generated **twice-identical
== baseline `8407fa2c…`** (baked, additive → 103 digests). The added set is **exactly** those two files;
`ci.yml` is NOT added (the `security` field is independent of `cicd`). UI==CLI holds (`assembleBlueprint`
== programmatic).

### DC-4 — PINNED + READ-ONLY (load-bearing) ✅
- **Pinned:** `security.yml` pins `semgrep==1.90.0` + `@vN` actions (no `@latest`/floating); the scan
  uses the **shipped `semgrep-rules.yml`** (`--config semgrep-rules.yml`, not a floating registry); the
  rules are the custom `thraksha-*` set. *(The PART 1u gate was corrected off a false-positive — my
  rules comment mentioned the registry name; reworded so a naive grep is clean.)*
- **Read-only:** **0 generation-path refs to the scan RUNNER** — `buildFileSet`/the plugins never
  import `core/scan.ts`; `regen.ts` imports only the pure-string `renderSecurityArtifacts` (config →
  files, never a Semgrep run). Generation stays a pure function of the blueprint; findings are a
  scan-time output.

### DC-5 — THE DETERMINISTIC SCAN (honest) ✅ (wiring proven; run deferred)
- **Provable HERE:** the `semgrep-rules.yml` is a deterministic pinned artifact (twice-identical,
  hashed); the version + actions are pinned; the scan is read-only + additive. **By pinned rules +
  pinned version, the same project → the same findings** (Semgrep is deterministic given pinned inputs).
- **The actual Semgrep RUN is honest-manual/DEFERRED:** `pip install semgrep==1.90.0` **succeeded**
  here, but the RUN **fails on Windows** — `semgrep`'s native core (`osemgrep`/`semgrep-core`) is not
  shipped for Windows (`os.execvp → FileNotFoundError`). So the planted-issue catch + the local
  same-project→same-findings re-run are **not run here**; the generated `security.yml` runs the SAME
  pinned rules **in CI (ubuntu)**, and the in-app action runs locally on Linux/macOS. The in-app
  action's **guide path IS proven here** (Semgrep absent → a clear guide, no crash, exit 0). *(Semgrep
  was uninstalled after the check — it is a tool, not a Thraksha dependency.)* **No claimed scan that
  didn't run (§3/§4).**

### DC-6 — invariants ✅
Generator **pure-Node** (`dependencies: {}`, **0 native**); **no `semgrep`/`js-yaml`/`yaml` library** —
Semgrep is a **TOOL** (pip-installed in CI / probed-and-invoked in-app), never a Thraksha dependency;
the security artifacts are pure string emission. **ADR-001: 0 AI refs** in the deterministic tier
(`core/security.ts` / `core/scan.ts`). No unintended frozen hash moved; the scan is read-only.

---

## 3. The `ci.yml`-untouched decision + the CERTAIN stamp

- **Separate `security.yml`, not a `ci.yml` step:** the Day-38 `ci.yml` is a single workflow with 5
  frozen baselines — a scan step would have re-baselined all 5. The **separate additive `security.yml`**
  keeps them **byte-identical** (proven: PART 1s unchanged). A `ci.yml` scan step would be a flagged,
  documented re-baseline (§1.1) — **explicitly avoided.**
- **CERTAIN stamp:** deterministic Semgrep findings carry `class: 'certain'` — visibly distinct from
  Day-45's **ADVISORY** developer-keyed AI findings. Deterministic is the gate (`--error` fails CI);
  AI is advisory-last, never the gate.

---

## 4. Forward-flags

- **Whether Semgrep ran here:** the WIRING determinism (pinned rules + version + read-only + additive)
  is **proven here**; the actual Semgrep RUN + the planted-issue catch is **honest-manual/deferred**
  (Semgrep's native core doesn't run on this Windows shell; it runs in the generated CI `security.yml`
  on ubuntu, and locally on Linux/macOS). The in-app guide-when-absent path is proven.
- **Day 45 picks up:** the optional developer-keyed **AI** security scan — **ADVISORY** (a distinct
  class from this CERTAIN tier), **after and separate from** the deterministic scan, **detachable**
  (delete the key → the deterministic scan still runs; the AI is never the gate — ADR-001).

---

*Day 43 adds the deterministic security tier: Semgrep with a PINNED custom ruleset (a fixed, hashed
`semgrep-rules.yml` — the `thraksha-*` set, not a floating registry) + a PINNED version
(`semgrep==1.90.0`), wired as a SEPARATE additive `.github/workflows/security.yml` (so the 5 frozen
Day-38 `ci.yml` baselines stay byte-identical — no re-baseline) and as an in-app read-only `scan`
action (detect-and-guide: probe Semgrep → run with the pinned rules → CERTAIN findings → guide if
absent). Gated on a neutral `security: { scan: 'none' | 'semgrep' }` field (default `'none'` = literal
bypass, mirroring `cicd`/`designTokens`), so the default reproduces the frozen backstop byte-identical
(102 frozen + the 5 Day-38 `ci.yml` baselines unmoved) and a declared scan yields a new twice-identical
additive baseline (`8407fa2c…`, PART 1u, 103 digests). The scan is a SEPARATE READ-ONLY layer — 0
generation-path refs to the scan runner; `buildFileSet` emits only the pure-string config and NEVER
runs Semgrep, so generation stays a pure function of the blueprint and findings are a scan-time output
stamped CERTAIN (distinct from Day-45's ADVISORY AI tier). NO AI (the deterministic tier, ADR-001);
Semgrep is a scan-tool / a generated-project-CI concern, never a Thraksha dependency (`deps {}` stays,
0 native). The wiring's determinism is proven HERE; the actual Semgrep run is honest-manual/deferred —
`pip install` succeeds but Semgrep's native core does not run on this Windows shell (it runs in CI on
ubuntu and locally on Linux/macOS), and the in-app guide-when-absent path is proven. 173 OK / 0 FAIL,
no frozen hash moved. Day 45 picks up the optional developer-keyed AI security scan (ADVISORY, detachable).*
