# Eco-Day 11 — PLAN: Framework + version as a first-class, pinned, governed input `[2 days]`

**Phase 1, Day 11. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 11 is the **first day that changes what the generator PRODUCES.** Phase 0 protected the existing generator; from here, generation itself changes — so the discipline shifts: **every new capability's DEFAULT path is a LITERAL BYPASS that reproduces the frozen hashes byte-for-byte**, and the non-default path produces its own twice-identical baseline. The Phase-0 CI + pre-commit hook now **enforce** this automatically.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §2 pillar 1 + ADR-004 → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 11 → [`eco-day-10-report.md`](eco-day-10-report.md) (Phase 0 certified; 43+10+MAXIMAL CI-enforced 3-OS) → the real generator (inventoried this session).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session:** the full version inventory (§1) was read from the real templates across all 5 stacks. Two structural facts that shape the design: (a) **versions live ONLY in the templates** (build files + Dockerfiles) — there are **no version strings in the codegen** (`entity-codegen.ts`/plugins); (b) the codebase **already tokenizes DB-specific versions** (`__DB_IMAGE__`, `__DB_NODE_DRIVER_VERSION__`, …) via `deriveTokens`/`applyTokens` — so **version-tokenization is a proven, additive mechanism here**, not a new invention. Day 11 applies the same pattern to framework+language versions.

---

## 1. THE VERSION INVENTORY (this IS the scope) — every version-bearing spot + current implied value

Read from the real templates. **The default pin for each = the current value, so the default path is byte-identical.**

| Stack | Version (governed) | Current value | Where it appears (all spots become tokens) |
|---|---|---|---|
| **Spring** | Java | **21** | `backend/pom.xml` `<java.version>21</java.version>`; `backend/Dockerfile` `maven:3.9-eclipse-temurin-21`, `eclipse-temurin:21-jre` |
| | Spring Boot | **3.3.5** | `backend/pom.xml` parent `<version>3.3.5</version>` |
| | (frontend) Node | **22** | `frontend/Dockerfile` `node:22-alpine` |
| **Express** | Node | **22** | `Dockerfile` `node:22-alpine` |
| | Express | **4.21.2** | `package.json` `"express": "4.21.2"` |
| **FastAPI** | Python | **3.12** | `Dockerfile` `python:3.12-slim` |
| | FastAPI | **0.115.6** | `requirements.txt` `fastapi==0.115.6` |
| **Django** | Python | **3.12** | `Dockerfile` `python:3.12-slim` |
| | Django | **5.1.4** | `requirements.txt` `Django==5.1.4` |
| **Go** | Go | **1.22** | `go.mod` `go 1.22`; `Dockerfile` `golang:1.22-alpine` |

**Already governed elsewhere (NOT Day-11 scope):** DB image + drivers are tokenized by the **database provider seam** (`__DB_IMAGE__`, `__DB_NODE_DRIVER_VERSION__`, `__DB_PY_DRIVER__`, `__DB_GO_DRIVER_REQUIRE__`, `__DB_DJANGO_DRIVER__`). Leave them alone.

**Ancillary infra image versions — DEFERRED (forward-flag, not "framework+version"):** `maven:3.9`, `nginx:1.27-alpine`, `alpine:3.20` (Go runtime), the `-slim`/`-alpine` variant suffixes. These are build/infra tooling, not the framework/language version. Day 11 leaves them as **fixed template constants** and flags them for a possible later "infra pins" pass. *(The Java/Go-COUPLED tags — `eclipse-temurin-21`, `golang:1.22` — ARE the language version and MUST be tokenized so a version change stays consistent across pom.xml + Dockerfile.)*

> **⚠ Correction to the Month-1 example:** the Month-1 illustration (`springBoot:4.1, python:3.13, go:1.23`) does **NOT** match the real current values (`springBoot:3.3.5, python:3.12, go:1.22`). **The default pins MUST be the ACTUAL current values** (this table), or the default path won't be byte-identical. Use the table, not the example.

---

## 2. The literal-bypass principle (the spine — non-negotiable)

- **DEFAULT pinned set = the current implied values (§1) → generated output BYTE-IDENTICAL → the frozen 43+10+MAXIMAL reproduce unchanged.** This is the load-bearing gate. Making versions explicit must move **zero** default output bytes.
- **NON-DEFAULT version → different output → a NEW twice-identical baseline** (added to the harness, never replacing a frozen one).
- **If making a version explicit MOVES a default hash → that's a FINDING** (the "default" wasn't actually the current implied value, or a token over/under-matched). **STOP and diagnose — do NOT re-baseline to make it pass.**

---

## 3. The model change (additive; default = current = byte-identical)

- **A per-stack DEFAULT registry** — a module constant `DEFAULT_VERSIONS` keyed by backend → the §1 current values (e.g. `Spring Boot → {java:'21', springBoot:'3.3.5', node:'22'}`, `Go → {go:'1.22'}`, …). This is the single source of the "current implied" defaults.
- **A `versions` block in `ProjectState`** (additive), carrying the effective versions for the selected backend. **ADR-004:** when the user doesn't specify, the defaults are **applied AND recorded** (in `defaultsApplied`) and **shown** — never silent. Effective version = user override ?? `DEFAULT_VERSIONS[backend]`.
- **`deriveTokens` extension:** each plugin's `deriveTokens` (currently projectName tokens) gains the version tokens for its stack, fed from the model's effective versions — the exact same merge path as `database.tokens()`. Tokens are **unique strings** (`__JAVA_VERSION__`), so substitution can't over-match a bare `21`.
- **Serialization:** `canonicalStringify` (Day 8) sorts the new `versions` keys stably (nested-object safe — confirmed). Adding `versions` to the snapshot moves **no frozen hash** (the frozen set hashes generated FILES, not the snapshot). **Backward-compat:** `restoreProjectModel` defaults `versions` from the registry when an old snapshot lacks it (as it already does for `style`/`description`).

**The version tokens (per stack):** `__JAVA_VERSION__`, `__SPRING_BOOT_VERSION__` (Spring); `__NODE_VERSION__` (Express + Spring frontend), `__EXPRESS_VERSION__` (Express); `__PYTHON_VERSION__` (FastAPI + Django), `__FASTAPI_VERSION__` (FastAPI), `__DJANGO_VERSION__` (Django); `__GO_VERSION__` (Go). Each replaces **every** §1 spot where that version appears (so a change stays consistent across pom.xml + both Dockerfile stages, go.mod + Dockerfile, etc.).

---

## 4. "Latest" = RESOLVE-THEN-PIN (never resolve-at-generate)

- **Generation is pure — it never resolves "latest".** The blueprint that reaches `buildFileSet` carries only **concrete** pins.
- **A resolution step BEFORE generation** turns any `"latest"`/`"lts"` request into a concrete version and **writes it into the blueprint**. Any lookup (a version catalog, or later a network/registry call) happens **here, outside the deterministic generation path**.
- **Generation asserts concreteness** — if a non-concrete version (`"latest"`) reaches `buildFileSet`, that's an error, not a silent lookup.
- For Day 11 the resolve step can be minimal (a small catalog map, or "resolve == the registry default"); **the load-bearing thing is the CONTRACT** (resolve-then-pin), which keeps determinism intact. The richer "latest" catalog is later.

---

## 5. EXECUTE — done-conditions ([2 days] — may take two execute passes; don't collapse)

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."** cargo on PATH for any Tauri/sidecar re-check.

### DC-1 — The version inventory confirmed (every spot, per stack) — §1 verified against the real templates before touching anything.

### DC-2 — Model extended (additive); default set = current implied values
`DEFAULT_VERSIONS` registry (= §1 values) + a `versions` block in `ProjectState` + `deriveTokens` version tokens + backward-compat restore. Templates tokenized (every §1 spot; ancillary infra left constant per §1).

### DC-3 — LITERAL BYPASS PROVEN (the load-bearing gate)
With the default pins: `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 44/44 byte-identical** (43 frozen + 10 relationship + MAXIMAL). And the **fresh-checkout / 3-OS CI stays green** (the templates changed but the output didn't; CI reads the templates directly). A moved default hash → **STOP, finding** (do not re-baseline). *(Optional but strong: refresh the sidecar resources (`sync-gen`) and re-confirm the packaged sidecar still reproduces 44/44 — the Day-10 benchmark still holds.)*

### DC-4 — NON-DEFAULT PROVEN (new twice-identical baselines, additive)
At least one non-default version per stack (e.g. `java 17`, `node 20`, `python 3.11`, `go 1.21`, and a framework bump) → generate **twice → byte-identical** → record as a **NEW baseline in the harness** (additive; never replacing a frozen one). **Scope honesty:** the non-default baseline proves **determinism** (twice-identical + version flows correctly into every §1 spot) — NOT that every version combination **builds/boots** (validity/compatibility is org-policy Day 13 + toolchain Day 18). Say so.

### DC-5 — "Latest" resolve-then-pin
Demonstrate the contract: a `"latest"` request is resolved to a concrete pin **before** generation (written into the blueprint); generation sees only concrete versions; a `"latest"` reaching `buildFileSet` is rejected (no resolve-at-generate).

### DC-6 — Invariants
Generator still **pure-Node** (`deps {}`, 0 native modules); **no frozen hash moved** (default path); the new version baselines are **additive**; `canonicalStringify` round-trip still holds (store, Day 8).

**Execute scope guard:** only framework+VERSION as a pinned input; NOT org-policy (Day 13), NOT the wizard (Day 16), NOT toolchain detect-and-guide (Day 18); no new stacks/types/integrations; no AI; no signing; **no default hash moved** (a moved default hash is a finding, not a re-baseline). Commit to `main`. If the 5-stack version-ification needs two passes, that's fine — don't collapse.

---

## 6. REPORT — done-conditions

[`eco-day-11-report.md`](eco-day-11-report.md): the **version inventory** (§1, the definitive per-stack table with current values); the **model change** (additive `versions` block + registry + tokens + backward-compat); the **literal-bypass proof** (default = frozen, 44/44 byte-identical, CI green); the **non-default new baselines** (twice-identical, additive, with the determinism-vs-validity honesty note); the **resolve-then-pin** design; **invariants** (pure-Node, no frozen hash moved). **Forward-flags:** if the full 5-stack version-ification isn't complete ([2 days]), scope honestly **what's done vs pending**; the deferred ancillary infra pins (maven/nginx/alpine); validity/bootability is NOT proven (Day 13/18). **Verdict + what Day 13 picks up:** the **org-policy allow/ban layer** that sits ON TOP of these pins (a pure input that filters/forces framework+version choices before the wizard; default-absent = a literal bypass).

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute session
1. Read guardrails + ecosystem §2 + Month-1 Day 11 + eco-day-10? — ✅ (this session).
2. Only Day-11's job (framework+version pins)? — yes; not org-policy/wizard/toolchain.
3. Which frozen baselines must NOT move? — the **43 + 10 + MAXIMAL** on the **default** path (the literal bypass). Non-default versions add NEW baselines.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — **YES, the spine:** default pins = current values → byte-identical. Prove it (DC-3).
6. Three killers checked? — versions are fixed strings (no clock/RNG); LF locked; canonicalStringify stable for the new `versions` keys.
7. A gate that can actually FAIL? — **DC-3 (default 44/44 byte-identical) is load-bearing; DC-4 (non-default twice-identical).** A moved default hash is the finding.
8. Overclaim / scope drift? — the live risks: (i) using the Month-1 EXAMPLE values instead of the ACTUAL current values (§1 correction), (ii) resolve-at-generate for "latest" (§4 forbids), (iii) claiming a non-default version BOOTS (it only proves determinism) — all guarded.

---

*Day 11 makes the most important structural input — framework + version — explicit, pinned, and governed, without moving a single default byte. The versions already implied by today's output (Java 21 / Spring Boot 3.3.5, Node 22 / Express 4.21.2, Python 3.12 / FastAPI 0.115.6 + Django 5.1.4, Go 1.22) become the DEFAULT pins fed through the same token mechanism that already governs DB versions — so the default path is a literal bypass and the frozen 43+10+MAXIMAL reproduce byte-identical (now CI-enforced across 3 OSes). A non-default version produces its own twice-identical baseline (additive), proving the version flows deterministically into every spot — determinism, not bootability. "Latest" is resolve-then-pin, never resolve-at-generate. The core stays pure-Node; no frozen hash moves. Day 13 layers org-policy on top of these pins.*
