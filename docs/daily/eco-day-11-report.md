# Eco-Day 11 — REPORT: Framework + version as a first-class, pinned, governed input

**Phase 1, Day 11 — the FIRST day that changes what the generator produces.** Framework/language versions are now explicit, pinned, persisted inputs — made governed **without moving a single default byte**. The default pins reproduce the frozen 43+10+MAXIMAL (the literal bypass); non-default versions produce their own additive baselines.

Plan: [`eco-day-11-plan.md`](eco-day-11-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§4 honesty; a moved default hash is a finding, not a re-baseline). ADR-003 (determinism), ADR-004 (explicit, shown).

---

## THE VERDICT

> ✅ **Framework+version is a first-class pinned input, and the DEFAULT path is a literal bypass — 44/44 byte-identical (43 frozen + 10 relationship + MAXIMAL).** A non-default version produces a NEW twice-identical baseline (5 recorded, additive). "Latest" is resolve-then-pin (concrete before generation; a `latest` reaching generation is rejected). Generator still **pure-Node**; **no frozen hash moved**.
>
> **Day 13 = the org-policy allow/ban layer on top of these pins.**

One default hash moved mid-execution and was **diagnosed and fixed** (a transform anchored on a version literal), not re-baselined (§4).

---

## 1. The version inventory (read from the real templates; current values = default pins)

| Stack | Version | Current value | Spots (all now tokens) |
|---|---|---|---|
| **Spring** | Java / Spring Boot / (frontend) Node | **21 / 3.3.5 / 22** | `pom.xml` (`<java.version>`, parent `<version>`); backend `Dockerfile` (`maven:3.9-eclipse-temurin-21`, `eclipse-temurin:21-jre`); frontend `Dockerfile` (`node:22-alpine`) |
| **Express** | Node / Express | **22 / 4.21.2** | `Dockerfile` (`node:22-alpine`); `package.json` (`"express": "4.21.2"`) |
| **FastAPI** | Python / FastAPI | **3.12 / 0.115.6** | `Dockerfile` (`python:3.12-slim`); `requirements.txt` (`fastapi==0.115.6`) |
| **Django** | Python / Django | **3.12 / 5.1.4** | `Dockerfile` (`python:3.12-slim`); `requirements.txt` (`Django==5.1.4`) |
| **Go** | Go | **1.22** | `go.mod` (`go 1.22`); `Dockerfile` (`golang:1.22-alpine`) |

13 version spots, all tokenized with **unique** tokens (`__JAVA_VERSION__`, `__SPRING_BOOT_VERSION__`, `__NODE_VERSION__`, `__EXPRESS_VERSION__`, `__PYTHON_VERSION__`, `__FASTAPI_VERSION__`, `__DJANGO_VERSION__`, `__GO_VERSION__`), so substitution can't over-match a bare number. **Ancillary infra images DEFERRED** (fixed constants, flagged): `maven:3.9`, `nginx:1.27`, `alpine:3.20` — not "framework+version".

---

## 2. The model change (additive)

- **New `core/versions.ts`:** `DEFAULT_VERSIONS` registry (= §1 current values) keyed by backend; `resolveVersions(backend, requested?)` (resolve-then-pin); `versionTokens(versions)` (unique tokens + concreteness assert); `isConcreteVersion`. Pure Node, no dep.
- **`ProjectState` gains a `versions` block** + `getVersions`/`setVersions` (mirrors the `style`/`integrations` pattern). `createProjectModel` defaults versions to `DEFAULT_VERSIONS[backend]` (= current ⇒ literal bypass). `restoreProjectModel` defaults versions from the registry when a snapshot lacks them (backward-compat).
- **Each plugin's token assembly** now merges `...versionTokens(model.getVersions())` (same path as `database.tokens()`).
- **ADR-004 (shown, not silent) — the key nuance:** versions are surfaced via `getState()`/`getVersions()` (the blueprint the wizard shows), **NOT** via `defaultsApplied`. `defaultsApplied` is rendered into `GENERATION-MANIFEST.txt` (a frozen output), so recording versions there would move every frozen hash. This is the **same rule the coding-style engine follows** (style is blueprint-shown, never manifest-recorded — [`../CAPABILITIES.md`](../CAPABILITIES.md) §3.6). Visibility is wizard-side; the manifest is frozen. *(I initially added version entries to `defaultsApplied`, caught that it feeds the manifest, and reverted — the correct pattern.)*

---

## 3. The literal-bypass proof (DC-3, load-bearing)

`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 44/44 byte-identical** (43 frozen + 10 relationship + MAXIMAL). Default pins = current values → every token substitutes back to the exact current string → output unchanged. **No frozen hash moved.** The pre-commit hook + 3-OS CI re-verify on commit/push.

---

## 4. The finding: a transform anchored on a version literal (diagnosed, fixed — NOT re-baselined)

The first DC-3 run **FAILED** on exactly two digests: `email Express` and `MAXIMAL` (which includes Express+email) — everything else was byte-identical. **Diagnosis:** `addNodemailerDep` (the Express email transform) inserts `nodemailer` by anchoring on the **literal** `"express": "4.21.2"` in the raw `package.json`. Tokenizing that line to `"express": "__EXPRESS_VERSION__"` broke the anchor (transforms run on the raw/tokenized template), so nodemailer wasn't inserted → different output. **Fix:** update the anchor to the token (`"express": "__EXPRESS_VERSION__"`); after substitution the output is byte-identical. **This is a fix to a tokenization interaction, not a re-baseline of a frozen hash** — the recorded email-Express value is unchanged; the generator now reproduces it. *(Lesson for future tokenization: raw-text transforms that anchor on a value must anchor on its token.)*

---

## 5. The non-default baselines (DC-4, additive)

One non-default version per stack (DemoApp | PostgreSQL) → generated **twice → byte-identical**, and **differs from default** → recorded as NEW baselines in the harness (`VERSION_BASELINES`, additive; the manifest now asserts **49** = 43 frozen + 1 MAXIMAL + 5 version):

| Stack | Change | Digest |
|---|---|---|
| Spring Boot | java 21→17 | `9d81ba25…` |
| Express | node 22→20 | `10607508…` |
| FastAPI | python 3.12→3.11 | `d5c0605c…` |
| Django | django 5.1.4→5.0.1 (framework) | `d1c007b2…` |
| Go | go 1.22→1.21 | `e926ef61…` |

**HONESTY:** these prove **DETERMINISM** — the version flows correctly into every §1 spot, twice-identical — **NOT that the combination BUILDS or BOOTS.** Validity/compatibility (e.g. does FastAPI 0.115.6 run on Python 3.11) is **org-policy (Day 13) + toolchain (Day 18)**, not Day 11.

---

## 6. Resolve-then-pin + invariants (DC-5)

- **Resolve-then-pin:** `resolveVersions('Spring Boot', {java:'latest'})` → `{java:'21', springBoot:'3.3.5', node:'22'}` — concrete, written into the blueprint **before** generation.
- **Reject-at-generate:** `versionTokens({java:'latest'})` **throws** — a non-concrete version reaching generation is an error, never a silent lookup (ADR-003).
- **Store round-trip:** the snapshot now carries `versions`; `canonicalStringify` → parse → `restoreProjectModel` → generate → **== MAXIMAL** (unperturbed). *(Note: the store's blueprint canonical bytes change because `versions` is now in the snapshot — the OUTPUT digest is unchanged. The blueprint sha used in Day-8/10 store proofs is a store-artifact hash, not a frozen output hash.)*
- **Invariants:** generator **pure-Node** (`deps {}`, 0 native modules); **no frozen hash moved**; the 5 version baselines are **additive**.

---

## 7. What changed

- **New:** `generator/src/core/versions.ts`.
- **Model:** `core/project-model.ts` (+`versions` field, get/set, default, restore).
- **Plugins (5):** `+versionTokens` import + merge into the token assembly; `express-plugin.ts` nodemailer anchor updated (§4).
- **Templates (11 files):** 13 version spots tokenized.
- **Harness:** `day20-regression.ts` (+`VERSION_BASELINES` + PART 1g + honest count).
- **Generation core (entity-codegen, regen) — untouched.** No AI, no new deps.

---

## 8. Forward-flags

- **[2 days] — scope status:** the full 5-stack language+framework version-ification is **COMPLETE** in one pass (all 5 stacks, default byte-identical + non-default baselines). The second day of the budget is available for the **deferred ancillary infra pins** (maven/nginx/alpine) if wanted — flagged, not done.
- **Validity/bootability NOT proven** — a non-default version is deterministic, not necessarily buildable/compatible (Day 13/18).
- **Ancillary infra images** (maven 3.9, nginx 1.27, alpine 3.20) left as fixed constants — a possible later "infra pins" pass.
- **Sidecar resources** must be re-synced (`sync-gen`) for a packaged build since templates changed (auto via `beforeBuildCommand`; `resources/gen` is gitignored/regenerated).
- **Standing:** generated-project toolchain pins (the machine's Java 20≠21 etc. — Day 18); signing Phase 4.

---

## 9. What Day 13 picks up

**The org-policy allow/ban layer ON TOP of these pins** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 13): a pure, versioned input that runs BEFORE the wizard — removes banned framework/version choices, sets approved defaults, tags soft/hard enforcement. Because it's a pure input, the same (blueprint + profile) still yields byte-identical output; **default-absent (no profile) is a literal bypass** that reproduces the frozen hashes. It governs exactly the framework+version pins Day 11 just made first-class.

---

**Day 11 verdict:** framework + version — the most important structural input — is now explicit, pinned, and governed, fed through the same token mechanism that already governs DB versions, with the default set to the versions today's output already implies. The default path is a proven literal bypass (44/44 byte-identical, CI-enforced); a non-default version produces its own twice-identical additive baseline (determinism, not bootability). One tokenization interaction (an email transform anchored on a version literal) was diagnosed and fixed rather than re-baselined. "Latest" is resolve-then-pin, never resolve-at-generate. The core stays pure-Node; no frozen hash moved. **Day 13 layers org-policy on top.**
