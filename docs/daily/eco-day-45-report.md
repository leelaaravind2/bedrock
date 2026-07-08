# Eco-Day 45 — REPORT: optional developer-keyed AI ADVISORY security scan (detachable)

**Phase 4, Day 45.** The **AI-ADVISORY** security tier: opt-in, the developer's own key, **DEFAULT
OFF (structurally)**, and strictly **AFTER + SEPARATE** from the deterministic Semgrep scan (Day 43).
The deterministic scan is the **gate** (CERTAIN); the AI scan **suggests** (ADVISORY, review
required) and is **NEVER the gate**. It follows the Day-23 detachable-AI-fill template exactly — a
**pure scan-core over an injected suggester** (fixture-tested with a FAKE) + an **impure AI edge**
(developer key from env, builtin `fetch`, no SDK). **Delete the key/layer → the deterministic scan +
export still run.**

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS, 177 OK / 0 FAIL,
103 baked digests (unchanged), MAXIMAL `366e19d9…` unchanged — no frozen hash moved.**

---

## 1. What shipped

- **The pure scan-core** ([`scan/ai-scan-core.ts`](../../generator/src/scan/ai-scan-core.ts), mirrors
  `fill-core.ts`): `buildScanSpecs` (one **whole-module** spec per source file — module context, no
  cross-file blind spots; non-code skipped; sorted), `promptFor` (a **NEUTRAL structured** prompt —
  *"if none → []"*, *"do not invent issues"*, no leading *"find the vulnerabilities"* framing),
  `orchestrateAiScan` over an **injected `AiSuggester`** → `AdvisoryFinding[]` (`class: 'advisory'`).
  NO AI, NO network, NO key here.
- **The impure AI edge** ([`scan/ai-scan-ai.ts`](../../generator/src/scan/ai-scan-ai.ts), mirrors
  `fill-ai.ts`): `aiScanConfigFromEnv` reads **`THRAKSHA_AI_SCAN_KEY`** → **null without a key** (the
  structural default-off); `makeAiSuggester` calls the developer's model via **builtin `fetch`**
  (OpenAI-compatible, temperature 0, model-agnostic, parses structured JSON → ADVISORY findings; any
  error → `[]`, graceful). **No AI SDK — `deps {}` stays.**
- **The runner** ([`src/scan.ts`](../../generator/src/scan.ts)): the deterministic scan runs **first**
  (CERTAIN, the gate); the AI scan runs **after** (ADVISORY, only with a key) in a **separate,
  visibly-distinct section**; **only CERTAIN findings affect the exit code**.

---

## 2. The proofs

### DC-1/DC-2 — the pure scan-core + fixtures (PART 1v, CI-enforced) ✅
`buildScanSpecs`/`promptFor`/`orchestrateAiScan` are proven with a **FAKE deterministic suggester**
(no AI, no key, no network — like the Day-23 fill core, PART 1l), added to `day20:regress` as
**PART 1v** (4 checks): whole-module specs (non-code skipped); the neutral structured prompt; a
deterministic ADVISORY result twice-identical (`class: 'advisory'`); a throwing suggester degrades to
0 findings (graceful, never a crash).

### DC-3 — DETACHABILITY BY CONSTRUCTION (load-bearing) ✅
Grep-proven: **0 refs** to the AI-scan layer from the deterministic scan (`core/scan.ts`), the
generation path (`core/regen.ts` / the plugins), OR the export path (`src/export.ts`). The AI-scan
core is imported only by the fixture; the AI edge only by the CLI runner. Adding the layer moved **no
frozen hash** (103 baked unchanged).

### DC-4 — the impure AI edge: DEFAULT OFF STRUCTURALLY + developer-keyed + no SDK ✅
`aiScanConfigFromEnv({})` → **null** (no key ⇒ no config ⇒ no suggester ⇒ `aiScanViaEnv` returns
`{ enabled: false, [] }` — **NO call site reached**, not a flag). With a key: the config is built
(`sk-fake` / `my-model` — model-agnostic). The edge uses **builtin `fetch`** (no SDK). The key is read
**only** in the AI edge.

### DC-5 — DETACHABILITY EXPLICIT (load-bearing) ✅
With the AI absent/disabled (no key): **`exportProject` still writes a 24-file standalone tree**; the
**deterministic scan still runs (the gate)**; the scan CLI runs end-to-end → the deterministic tier,
**no advisory section, exit 0** (Semgrep absent here, so it guides — the deterministic *path* is
intact and unaffected by the AI). **Delete the AI key/layer → the deterministic scan + export still
run. AI is NEVER the gate.**

### DC-6 — CERTAIN vs ADVISORY + ADR-001 sweep + invariants ✅
- **CERTAIN vs ADVISORY (visibly distinct):** deterministic findings carry `class: 'certain'` and are
  the gate (non-zero exit); AI findings carry `class: 'advisory'` + a `suggestion` and **never affect
  the exit code**. Different classes, different sections, different behaviour.
- **ADR-001:** **0 AI-scan refs in the generation/export/deterministic-scan path** — the AI lives ONLY
  in `scan/ai-scan-ai.ts` (+ the CLI runner). No AI in generation.
- **AI-output ≠ deterministic:** the pure core (over a FAKE suggester) is deterministic + CI-enforced;
  the LIVE AI advisory output is variable + **OUTSIDE the backstop** (never baked — like Day-23 slot
  content).
- **Invariants:** generator pure-Node (`dependencies: {}`, **0 native**); **no AI SDK / HTTP client**
  (builtin `fetch`); no frozen hash moved.

---

## 3. Honest verification level (§4)

- **No live AI call was made** — there is no developer key in this environment (exactly as Day-23's
  live fill was deferred). The pure scan-core is **fixture/FAKE-suggester tested** (PART 1v, CI-enforced),
  and the edge's config path is verified with a fake key (config built, model-agnostic). The **LIVE AI
  call is honest-manual/deferred** — the developer sets `THRAKSHA_AI_SCAN_KEY` (+ optional
  `THRAKSHA_AI_SCAN_ENDPOINT`/`_MODEL`) with their own model + bill. No claimed call that didn't run.
- **Provider-agnostic:** OpenAI-compatible by default, fully overridable — the developer's model of choice.

---

## 4. Forward-flags

- **`[2 days]` status:** the pure scan-core + fixtures + the detachability proof (by construction +
  explicit) + the impure edge + default-off structural + the ADR-001 sweep — **done + proven**. The
  live AI call is **honest-manual/deferred** (no key here).
- **Live AI call vs fixture:** **fixture/FAKE here** (deterministic), live deferred (no key) — stated plainly.
- **Day 47 picks up:** **the Map** — a Terraform-`plan`-style impact preview (the flagged star
  feature), built on the deterministic-generation exactness basis (a blueprint diff → an exact output
  diff, because generation is a pure function of the blueprint).

---

*Day 45 adds the AI-advisory security tier as a detachable, developer-keyed, default-off layer that
runs strictly AFTER and SEPARATE from the deterministic Semgrep gate — following the Day-23
detachable-AI template exactly: a PURE scan-core (`buildScanSpecs`/`orchestrateAiScan`/`promptFor`)
over an INJECTED `AiSuggester`, fixture-tested with a FAKE deterministic suggester (PART 1v,
CI-enforced), plus an IMPURE AI edge (`aiScanConfigFromEnv` reading `THRAKSHA_AI_SCAN_KEY` — structural
default-off, no key ⇒ no config ⇒ no suggester ⇒ no AI call site; `makeAiSuggester` via Node's builtin
`fetch`, model-agnostic, no SDK — `deps {}` stays). The deterministic scan is the CERTAIN gate (runs
first, non-zero exit on findings); the AI scan is ADVISORY (`class: 'advisory'` + a suggestion,
whole-module context, a NEUTRAL structured prompt to avoid framing/polarity bias) and NEVER affects
the exit code — the two finding classes are visibly distinct. THE DETACHABILITY PROOF is load-bearing
and proven both ways: by construction (0 refs from the deterministic scan `core/scan.ts`, the
generation path `buildFileSet`, or the export path `src/export.ts` into the AI layer) and explicitly
(with the AI absent/disabled, `exportProject` and the deterministic scan still run; the CLI exits 0).
The AI never touches generation (ADR-001 — 0 generation-path refs; the AI lives only in
`scan/ai-scan-ai.ts` + the CLI runner); its advisory output is variable and OUTSIDE the frozen
backstop (never baked). Default-off ⇒ the frozen backstop byte-identical (103 baked + 10 TeamTracker +
non-hash, 177 OK / 0 FAIL, MAXIMAL `366e19d9…`). The pure core + fixtures + the detachability proof are
proven HERE; the LIVE AI call is honest-manual/deferred (no developer key, exactly as Day-23's live
fill). Generator pure-Node `deps {}` + 0 native (builtin fetch, no SDK); no frozen hash moved. Day 47
picks up the Map — the Terraform-plan-style impact preview.*
