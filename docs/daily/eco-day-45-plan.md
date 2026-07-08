# Eco-Day 45 — PLAN: optional developer-keyed AI security scan (detachable) `[2 days]`

**Phase 4, Day 45. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 45 adds the **AI-ADVISORY**
security tier: **opt-in, the developer's own key, DEFAULT OFF, and strictly AFTER + SEPARATE from the
deterministic Semgrep scan (Day 43).** The deterministic scan is the **gate** (CERTAIN); the AI scan
**suggests** (ADVISORY, review required) and is **NEVER the gate**. It follows the Day-23 detachable-AI
template EXACTLY: a **pure scan-core over an injected suggester** (fixture-tested with a FAKE) + an
**impure AI edge** (developer key from env, builtin `fetch`, no SDK, structural default-off).
**`[2 days]` — stage honestly.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md)
(§1.2 **AI is NEVER in the generation path; every AI capability is default-off, detachable,
developer-keyed; the detachability proof is mandatory**; §3 STOP-and-report — *don't claim a live AI
call that didn't run*; §4 honesty) → [`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md) Day 45 (the
AI-advisory tier) + the security model (deterministic-first / AI advisory-last, never the gate) + Day
47 (the Map — the next day) → [`eco-day-43-report.md`](eco-day-43-report.md) (the deterministic
CERTAIN tier — `core/scan.ts`, read-only, `security.yml`; the AI runs AFTER it) →
[`eco-day-23-report.md`](eco-day-23-report.md) (the **EXACT template** — the detachable developer-keyed
AI FILL: pure core / impure edge / structural default-off / delete-the-key-still-works) → the REAL
code: [`core/scan.ts`](../../generator/src/core/scan.ts) (the deterministic scan + its `FindingClass`
= `'certain'`, already anticipating `'advisory'`) and [`fill/fill-core.ts`](../../generator/src/fill/fill-core.ts)
+ [`fill/fill-ai.ts`](../../generator/src/fill/fill-ai.ts) (the injected-`SlotFiller` core + the
`aiConfigFromEnv`/`makeAiFiller` env-key/builtin-fetch edge to mirror).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read live from the REAL code):**
> - **The Day-23 template is exact.** `fill-core.ts`: `SlotFiller = (spec) => Promise<string>` is
>   INJECTED; `buildFillSpecs`/`orchestrateFill` are PURE (fixture-tested with a FAKE deterministic
>   filler — no AI in the test). `fill-ai.ts`: `aiConfigFromEnv(env)` returns **null unless
>   `THRAKSHA_AI_FILL_KEY` is set** — *"no key ⇒ no config ⇒ no filler ⇒ no fetch, NO call SITE
>   reached. Not a flag that could be left on."* `makeAiFiller` uses Node's **builtin `fetch`**
>   (OpenAI-compatible body) — **no AI SDK, `deps {}` stays**. The AI-scan mirrors this 1:1.
> - **The deterministic scan already anticipates this.** `core/scan.ts` types `FindingClass =
>   'certain'` with the comment *"Day-45 AI findings are 'advisory' (a distinct class)."* The AI tier
>   adds the `'advisory'` class — the deterministic (CERTAIN) findings are the GATE; the AI (ADVISORY)
>   findings are suggestions.
> - **The deterministic scan is READ-ONLY + separate from generation** (Day 43): `buildFileSet` never
>   imports `core/scan.ts`. The AI scan attaches at the SAME read-only seam, AFTER the deterministic
>   scan — **0 generation-path refs, 0 deterministic-path refs** (the detachability proof by construction).
> - **No developer key here** ⇒ the AI edge is **fixture/FAKE-suggester tested** (CI-enforced); the
>   LIVE AI call is **honest-manual/deferred** (exactly as Day 23's live fill was deferred).
> - **AI output ≠ deterministic** (like Day-23 slot content): the AI advisory output is variable + lives
>   OUTSIDE any gate and OUTSIDE the frozen backstop; only the pure scan-core (over a FAKE suggester) is
>   deterministic + CI-enforced.

---

## 0. What Day 45 is — the AI-advisory tier: opt-in, keyed, detachable, never the gate

The deterministic Semgrep scan (Day 43) is the CERTAIN gate. Day 45 adds an **optional** AI review
that runs **after** it and **suggests** additional issues (ADVISORY, review required). It is
**default-off structurally** (no key ⇒ no call site), **developer-keyed** (their model, their bill),
**detachable** (delete the key/layer → the deterministic scan + export still work), and **never in the
generation path** (ADR-001). Its output is variable and explicitly outside any gate.

---

## 1. THE DETACHABILITY + DETERMINISM SPINE (mirrors Day 23)

1. **THE DETACHABILITY PROOF (load-bearing, mandatory §1.2).** Delete the AI key/layer → the
   deterministic Semgrep scan still runs + export still works. **By construction:** 0 refs from the
   deterministic path (`core/scan.ts`) OR the generation path (`buildFileSet`) into the AI-scan edge.
   **Explicitly:** a gate that removes/ignores the AI edge and confirms the deterministic scan +
   `exportProject` are unaffected.
2. **DEFAULT OFF, DEVELOPER-KEYED, STRUCTURALLY.** No `THRAKSHA_AI_SCAN_KEY` ⇒ `aiScanConfigFromEnv`
   returns null ⇒ NO suggester is built ⇒ **NO AI call site is reached** (not a flag). The developer's
   own key, read ONLY by the AI edge (the Day-23 env-key pattern). Thraksha ships no key.
3. **AI NEVER IN GENERATION (ADR-001).** The AI scan reads a project + writes ADVISORY findings; it
   NEVER touches generation (0 generation-path refs — `buildFileSet` never imports it). `deps {}` stays
   (builtin `fetch`, no SDK).
4. **CERTAIN vs ADVISORY (visibly distinct).** Deterministic findings = **CERTAIN** (`class: 'certain'`,
   the gate — Day-43 `--error` fails CI). AI findings = **ADVISORY** (`class: 'advisory'` + a
   `suggestion`, review required) — **NEVER the gate** (they never fail CI). The two classes are
   visibly separate (distinct label + section).
5. **AI-OUTPUT ≠ DETERMINISTIC.** The deterministic scan is reproducible + CI-enforced (PART 1u); the
   AI advisory output is variable (model/key-dependent) + explicitly OUTSIDE any gate and OUTSIDE the
   frozen backstop — like Day-23 slot content (never seen by `buildFileSet`). Only the pure scan-core
   (over a FAKE deterministic suggester) is CI-enforced.

---

## 2. THE ARCHITECTURE — pure scan-core over an injected suggester + an impure keyed edge

### 2.1 The pure scan-core (`scan/ai-scan-core.ts` — mirrors `fill-core.ts`, fixture-testable)
- **`AdvisoryFinding`**: `{ path, line, severity, issue, suggestion, class: 'advisory' }` — the AI
  SUGGESTS + gives a rationale; review required; distinct from the CERTAIN deterministic finding.
- **`ScanSpec`**: `{ path, module: string }` — the scannable unit is a **WHOLE MODULE** (the full file
  content), not a single line — so the AI has module context (avoid cross-file/local blind spots).
- **`AiSuggester = (spec: ScanSpec) => Promise<AdvisoryFinding[]>`** — the INJECTED suggester (the AI
  is passed in; the core never calls a model).
- **`buildScanSpecs(files) → ScanSpec[]`** — PURE: one spec per source module (skip non-code / binary /
  the manifest); deterministic order (sorted). Takes an in-memory file list (fixture-friendly).
- **`orchestrateAiScan(specs, suggester) → AdvisoryFinding[]`** — PURE orchestration over the injected
  suggester; aggregates + sorts findings deterministically (given a deterministic suggester).
- **`promptFor(spec) → string`** — a **NEUTRAL, STRUCTURED** security-review prompt (see §2.3).
- **Fixture-tested with a FAKE deterministic suggester** (a new **PART 1v**, CI-enforced) — the core is
  proven deterministic with NO AI, exactly like Day-23's fake filler.

### 2.2 The impure AI edge (`scan/ai-scan-ai.ts` — mirrors `fill-ai.ts`, default-off structural)
- **`aiScanConfigFromEnv(env) → AiScanConfig | null`** — reads **`THRAKSHA_AI_SCAN_KEY`** (a SEPARATE
  key from the fill key); returns **null if no key** (the STRUCTURAL default-off — no config ⇒ no
  suggester ⇒ no call site). Endpoint/model via `THRAKSHA_AI_SCAN_ENDPOINT`/`_MODEL` (model-agnostic).
- **`makeAiSuggester(config) → AiSuggester`** — the developer's model via **builtin `fetch`**
  (OpenAI-compatible chat-completions), parsing the structured response into `AdvisoryFinding[]`
  (all stamped `'advisory'`). **No AI SDK, no HTTP client — `deps {}` stays.**
- **`aiSuggesterFromEnv(env) → AiSuggester | null`** = config ? `makeAiSuggester` : null.
- **`aiScanViaEnv(files, env) → { enabled: boolean; findings: AdvisoryFinding[] }`** — the wrapper: no
  key ⇒ `{ enabled: false, findings: [] }` (no call). The Day-23 `fillViaEnv` shape.

### 2.3 The neutral-prompt / whole-module-context design
- **Whole-module context:** one spec per module (the full file), so the AI sees the module's structure
  — avoiding the single-line/cross-file blind spots a line-scoped scan has.
- **Neutral prompt (avoid framing/polarity bias):** NOT a leading *"find the vulnerabilities in this
  code"* (which biases toward hallucinated findings). A NEUTRAL, STRUCTURED review request: *"Review
  this module for security issues. For each issue, return {severity, line, issue, suggestion}. If there
  are none, return an empty list."* Structured JSON output; framing-neutral; the model may return zero
  findings without pressure.

### 2.4 AFTER + SEPARATE — the deterministic scan is the gate, the AI runs after
- The `scan` action / CLI runs the **deterministic scan FIRST** (Day-43 `scanProject` → CERTAIN
  findings; **the gate** — non-zero exit on CERTAIN findings). **THEN**, only if `THRAKSHA_AI_SCAN_KEY`
  is set, it runs the **AI scan** (`aiScanViaEnv` → ADVISORY findings) and prints them in a **separate
  ADVISORY section** — **never affecting the exit code** (advisory is not the gate). With no key, the
  AI section is silently absent. The AI scan is **read-only** (reads the project; changes nothing).

### 2.5 What is provable HERE vs deferred (honest, §4)
- **PROVABLE HERE:** the pure scan-core is deterministic (fixture-tested with a FAKE suggester, PART
  1v); the structural default-off (`aiScanConfigFromEnv` null without a key ⇒ no call site); the
  detachability (delete the AI edge → the deterministic scan + `exportProject` still run; 0 refs from
  the deterministic/generation path); the CERTAIN-vs-ADVISORY distinction; `deps {}` + builtin fetch;
  the default backstop byte-identical.
- **DEFERRED / honest-manual:** the LIVE AI call (no developer key here — exactly as Day-23's live fill
  was deferred). State plainly — do NOT claim a live AI call that didn't run (§3).

### 2.6 The dependency question (the recurring finding)
- **Thraksha core stays `deps {}`** — the AI edge uses Node's builtin `fetch` (no AI SDK, no HTTP
  client, no native module). The AI is the developer's own model + key + bill — Thraksha ships nothing.

---

## 3. What the plan resolves (answered from the real code)
1. **The `scanProject`→findings interface / the pure scan-core:** `buildScanSpecs`/`orchestrateAiScan`
   over an injected `AiSuggester`, fixture-testable with a FAKE (mirrors `fill-core`) (§2.1).
2. **The impure AI edge:** `aiScanConfigFromEnv` (developer key, structural default-off) +
   `makeAiSuggester` (builtin fetch, model-agnostic) (mirrors `fill-ai`) (§2.2).
3. **How it runs AFTER + separate:** the deterministic scan is the gate (first, CERTAIN); the AI runs
   after (ADVISORY), only with a key, never affecting the exit code (§2.4).
4. **Neutral-prompt / whole-module context:** structured framing-neutral prompt + whole-module specs (§2.3).
5. **CERTAIN vs ADVISORY in the findings shape:** `class: 'certain' | 'advisory'` (§1.4).
6. **Live AI call here?** No — fixture/FAKE-suggester tested; the live call is honest-manual/deferred (§2.5).

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than claim a live AI call that didn't run."**

- **DC-1 — the scan-core + fixtures + the impure edge.** `scan/ai-scan-core.ts` (`AdvisoryFinding`,
  `ScanSpec`, `buildScanSpecs`, `orchestrateAiScan`, `promptFor`) over an injected `AiSuggester` +
  fixtures (a FAKE deterministic suggester, a new PART 1v, CI-enforced). `scan/ai-scan-ai.ts`
  (`aiScanConfigFromEnv` — `THRAKSHA_AI_SCAN_KEY`, structural default-off; `makeAiSuggester` — builtin
  fetch, model-agnostic). The `scan` action runs the deterministic scan FIRST, then the AI scan
  (ADVISORY, opt-in). No AI SDK as a dep.
- **DC-2 (LOAD-BEARING) — THE DETACHABILITY PROOF.** Delete the AI key/layer → the deterministic
  Semgrep scan still runs + `exportProject` still works. **By construction:** 0 refs from `core/scan.ts`
  (deterministic) OR `buildFileSet` (generation) into the AI-scan edge. **Explicitly:** a gate proving
  the deterministic scan + export are unaffected with the AI removed. **AI is NEVER the gate.**
- **DC-3 — DEFAULT OFF, STRUCTURALLY.** No `THRAKSHA_AI_SCAN_KEY` ⇒ `aiScanConfigFromEnv` null ⇒ no
  suggester ⇒ **no AI call site reached** (not a flag); `aiScanViaEnv` returns `{ enabled: false, [] }`.
  The deterministic scan + export + the frozen backstop (**103 baked + 10 + non-hash**) byte-identical.
- **DC-4 — the pure scan-core is deterministic (PART 1v).** `buildScanSpecs`/`orchestrateAiScan` over a
  FAKE deterministic suggester → the same specs + the same aggregated ADVISORY findings twice; the
  neutral-prompt (framing-neutral, structured) + whole-module context are present.
- **DC-5 — CERTAIN vs ADVISORY + ADR-001 sweep.** The two finding classes are visibly distinct (CERTAIN
  = the gate; ADVISORY = suggestions, never the gate); the AI advisory output is OUTSIDE the backstop
  (not baked). **0 AI refs in the generation path** (`buildFileSet`/plugins); the AI lives only in the
  detachable scan edge; `deps {}` stays (builtin fetch, no SDK).
- **DC-6 — invariants.** Generator pure-Node (`deps {}`, 0 native); the AI scan read-only + detachable;
  no unintended frozen hash moved.

**Execute scope guard (every stage):** only the optional developer-keyed AI ADVISORY scan. **NOT** the
Map (Day 47). The AI scan is **ADVISORY** (never the gate — the deterministic scan is the gate).
**DEFAULT OFF structurally** (no key ⇒ no call site). The AI **NEVER touches generation** (0
generation-path refs, ADR-001). **No AI SDK as a core dep** (`deps {}` — builtin fetch). **Delete the
key → the deterministic scan + export still work** (the detachability proof). No signing. Commit to
`main`. Don't compress the 2 days — the pure core + fixtures + the detachability proof is the provable
heart; the live AI call is honest-manual/deferred.

---

## 5. REPORT — done-conditions

[`eco-day-45-report.md`](eco-day-45-report.md): the pure scan-core + the FAKE-suggester fixtures (PART
1v, CI-enforced); the impure AI edge (structural default-off, developer-keyed `THRAKSHA_AI_SCAN_KEY`,
builtin fetch, model-agnostic); **THE DETACHABILITY PROOF** (delete the key/layer → the deterministic
scan + export still run; 0 refs from the deterministic/generation path); **CERTAIN vs ADVISORY**
(visibly distinct — the deterministic scan is the gate, the AI is advisory); the **ADR-001 sweep** (0
generation-path AI refs; `deps {}`, builtin fetch, no SDK); **AI-output ≠ deterministic** (the advisory
output is variable + outside the backstop); **invariants**. **Forward-flags:** `[2 days]` status;
**live AI call vs fixture** (honest — fixture/FAKE here, live deferred without a key); the neutral-prompt
/ whole-module design; what **Day 47** picks up (**the Map** — Terraform-`plan`-style impact preview,
the flagged star feature, built on the deterministic-generation exactness basis).

---

## 6. Scope guard — OUT for Day 45
- Only the optional developer-keyed AI ADVISORY scan. **NOT** the Map (Day 47).
- **The AI scan is ADVISORY — NEVER the gate** (the deterministic Semgrep scan is the gate).
- **DEFAULT OFF structurally** — no key ⇒ no AI call site (not a flag).
- **The AI NEVER touches generation** — 0 generation-path refs (ADR-001); the AI lives only in the
  detachable scan edge.
- **No AI SDK / HTTP-client library as a Thraksha core dep** (`deps {}` stays — builtin `fetch`).
- **Delete the key → the deterministic scan + export still work** (the mandatory detachability proof).
- No signing. **`[2 days]`** — stage honestly; the live AI call is honest-manual/deferred (no key here).

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails (§1.2 the detachability proof is mandatory) + Month-3 Day 45 + the Day-43 (CERTAIN)
   + Day-23 (the detachable-AI template) reports + `core/scan.ts` + `fill-core`/`fill-ai`? — ✅ (this session).
2. Only Day-45's job (the AI-advisory scan)? — yes; **not** the Map.
3. Which frozen baselines must NOT move? — **all** (103 baked + 10 TeamTracker + non-hash; MAXIMAL
   `366e19d9…`). The AI edge is default-off + read-only + outside generation; `day20:regress`
   byte-identical before/after.
4. Is every new AI touchpoint default-off, detachable, developer-keyed? — **yes** (the whole point):
   structural default-off (no key ⇒ no call site), detachable (delete → deterministic scan + export
   still run), developer-keyed (`THRAKSHA_AI_SCAN_KEY`, their model/bill). The detachability proof is a DC.
5. Default/empty path a literal bypass? — yes: no key ⇒ no AI; the scan-core is fixture-tested with a
   FAKE; the AI never emits generation.
6. Three killers checked? — the pure scan-core is deterministic (fixture); the AI output is variable +
   OUTSIDE the backstop (never baked — like Day-23 slot content). No AI SDK. Builtin fetch.
7. A gate that can actually FAIL? — **DC-2** (a ref from the deterministic/generation path into the AI
   edge — not detachable), **DC-3** (an AI call site reachable without a key — not structural
   default-off; or a moved frozen hash), **DC-4** (a non-deterministic scan-core over a fake suggester),
   **DC-5** (an AI ref in the generation path / an AI SDK in `deps` / CERTAIN and ADVISORY conflated).
   Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) claiming a LIVE AI call that didn't run (no key →
   honest-manual/deferred); (ii) the AI becoming a gate (it's advisory — only the deterministic scan
   gates); (iii) an AI ref leaking into generation / the deterministic path (breaks detachability +
   ADR-001); (iv) an AI SDK added to `deps {}` (builtin fetch only); (v) a flag-based (not structural)
   default-off (must be no-key⇒no-call-site); (vi) drifting into the Map (Day 47) — all guarded.

---

*Day 45 adds the AI-advisory security tier as a detachable, developer-keyed, default-off layer that
runs strictly AFTER and SEPARATE from the deterministic Semgrep scan — following the Day-23
detachable-AI template exactly: a PURE scan-core (`buildScanSpecs`/`orchestrateAiScan`/`promptFor`) over
an INJECTED `AiSuggester`, fixture-tested with a FAKE deterministic suggester (PART 1v, CI-enforced),
plus an IMPURE AI edge (`aiScanConfigFromEnv` reading `THRAKSHA_AI_SCAN_KEY` — structural default-off,
no key ⇒ no config ⇒ no suggester ⇒ no AI call site; `makeAiSuggester` via Node's builtin `fetch`,
model-agnostic, no SDK — `deps {}` stays). The deterministic scan is the CERTAIN gate (runs first,
`--error`/non-zero exit on findings); the AI scan is ADVISORY (`class: 'advisory'` + a suggestion,
review required, whole-module context, a NEUTRAL structured prompt to avoid framing/polarity bias) and
NEVER affects the exit code — the two finding classes are visibly distinct. THE DETACHABILITY PROOF is
load-bearing: delete the AI key/layer → the deterministic scan + `exportProject` still run — by
construction (0 refs from the deterministic path `core/scan.ts` or the generation path `buildFileSet`
into the AI edge) and explicitly (a gate). The AI never touches generation (ADR-001); its advisory
output is variable and OUTSIDE any gate and OUTSIDE the frozen backstop (like Day-23 slot content) —
only the pure scan-core (over a fake suggester) is deterministic + CI-enforced. Default-off ⇒ the
frozen backstop byte-identical (103 baked + 10 TeamTracker + non-hash). The pure core + fixtures + the
detachability proof are provable HERE; the LIVE AI call is honest-manual/deferred (no developer key,
exactly as Day-23's live fill). Day 47 picks up the Map — the Terraform-plan-style impact preview.*
