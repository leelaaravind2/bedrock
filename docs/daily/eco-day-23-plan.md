# Eco-Day 23 — PLAN: The optional, detachable, developer-keyed AI fill `[2 days]`

**Phase 2, Day 23. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 23 is **the FIRST time AI appears in Thraksha** — under the strict conditions the thesis demands: **AI fills ONLY slot CONTENT, OUTSIDE the generation path, with the DEVELOPER'S OWN key, DEFAULT OFF, as a detachable POST-step.** This is the payoff of [Day 21](eco-day-21-report.md): because `SlotContent` is a separate layer the shell never imports, an AI fill writes content **without ever touching the deterministic structure**. Day 23 proves AI can be **present AND** the determinism / Law-21 guarantees still hold. **`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.2 AI is NEVER in the generation path + the mandatory detachability proof; §1.4 Law 21; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §structural-vs-creative + the detachable-AI principle (opt-in, developer's own key, out of the deterministic path) + ADR-001 → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 23 (lines 40–42) → [`eco-day-21-report.md`](eco-day-21-report.md) (the slot mechanism: `SlotDecl`, the separate `SlotContent` layer — the fill TARGET — the shell byte-identical across slot states by construction, 0 generation-path refs) → [`eco-day-18-report.md`](eco-day-18-report.md) (the DETACHABLE pattern this follows: pure core / impure edge / developer-keyed / default-off) → the REAL slot layer (`core/slots.ts`, `core/slot-content.ts`) + `detect/probe.ts` (the edge template).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code, not assumed):**
> - **The fill TARGET is already built + separate.** `core/slot-content.ts`: `SlotContent = Record<slotId, { value: string }>`, `emptyContent(decls)` (the empty scaffold), `contentFillState(decls, content)` (empty/partial/full). **`buildFileSet` never imports this layer** (Day-21's 0-refs invariant) — so anything written INTO `SlotContent` cannot reach the shell. **The fill writes ONLY here.**
> - **CRUCIAL distinction — `integrations.ai` is NOT this.** `core/integrations.ts` `ai: 'hook'` (Day 18) emits **inert AI-client TEMPLATE code into the GENERATED project** — *"the app calls the model at ITS runtime; Thraksha never does (ADR-001)"*. That is **generated structural code**, part of the deterministic shell. **Day 23's `fillSlot` is the opposite direction:** Thraksha ITSELF calls an AI **at design time** to produce slot CONTENT for the separate `SlotContent` layer. The plan must NOT conflate them — one is emitted template code (in the shell, frozen), the other is a detached design-time enhancement (never in the shell). *(Fable/Mythos note: Thraksha's own fill uses the DEVELOPER'S key/model of choice — it is model-agnostic, tied to no specific provider.)*
> - **The Day-18 template is exact and reusable.** `detect/detect-core.ts` (pure, fixture-testable) + `detect/probe.ts` (impure edge — "**NEVER imported by buildFileSet / plugins / model, so it CANNOT reach generation**", **ZERO third-party deps** — `child_process` is a builtin). Day 23 mirrors: `fill/fill-core.ts` (pure) + `fill/fill-ai.ts` (impure AI edge). The AI edge needs **no dependency**: Node's **global `fetch` is a builtin** (Node 18+), so any developer-configured HTTP AI endpoint is reachable with `deps {}` intact.
> - **The env-key pattern is established.** `server.ts` already reads opt-in config from env (`THRAKSHA_ORG_PROFILE`, `THRAKSHA_UI_OUTPUT`, `PORT`). A **developer AI key** follows the same shape (env/settings-level), read **ONLY by the impure edge** — Thraksha ships no key.
> - **The current gate set (Day 21):** **50 baked digests** (43 frozen + 5 version + 1 MAXIMAL + **1 SLOTS**) + **10 TeamTracker** + non-hash gates PART 1c/1e/1h/1i/1j/**1k**. Day 23 adds a non-hash **PART 1l** (fill-core fixtures — the CI-enforced deterministic gate, like PART 1j).

---

## 0. What Day 23 is — the first AI, under strict conditions (a controlled first)

Everything through Day 21 is AI-free. Day 23 introduces AI **for the first time** — but confined exactly as the thesis requires:

| Condition | How Day 23 satisfies it |
|---|---|
| AI only where genuinely creative | fills slot CONTENT (a tagline, an overview) — never structure |
| Opt-in / default OFF | no key / feature off ⇒ **no AI call is ever made**, no network |
| Developer's own key + bill | the key is settings/env-level, the developer's; Thraksha ships none |
| Out of the deterministic path | writes ONLY `SlotContent` (the separate layer); `buildFileSet` never sees it |
| Detachable (Law 21) | delete the AI layer/key ⇒ the project **still generates completely** (shell + empty slots) |

Day 23 is the **proof that AI can be present and every guarantee still holds** — the entire point of the thesis.

---

## 1. THE DETERMINISM + DETACHABILITY SPINE (the load-bearing proofs)

1. **THE DETACHABILITY PROOF (Law 21, creative path) — the load-bearing gate.** Delete the AI layer/key ⇒ the project **STILL generates completely and validly** (shell + empty slots, exactly the Day-21 mechanism). AI is **never the gate** — a detachable enhancement. **Proof:** BY CONSTRUCTION (the fill layer is not imported by `buildFileSet`/regen/plugins — 0 refs, grep-verified) **+ explicitly** (with the fill layer absent/off, `day20:regress` is byte-identical and complete).
2. **AI NEVER IN THE GENERATION PATH (ADR-001).** The fill writes ONLY `SlotContent`; it NEVER touches `buildFileSet`/structure/templates. **Proof BY CONSTRUCTION:** the fill layer is a *consumer* that produces `SlotContent`, never a producer of structure — 0 refs INTO generation. The shell is byte-identical whether AI-fill is **present-but-off** or **on** (only CONTENT changes) — this is the **same Day-21 by-construction invariance** (content is not an argument to `buildFileSet`), now with the content produced by AI instead of a human.
3. **DEFAULT OFF, DEVELOPER-KEYED.** No key / feature off ⇒ **no AI call ever, no network, no generation dependency on any AI service**. Enforced **structurally**, not just by a flag: (a) generation never invokes fill (fill is a *separate* opt-in step); (b) the impure edge makes no call unless a key is present; (c) Thraksha ships no key and **no AI SDK** (`deps {}`).
4. **DETERMINISM ≠ THE AI OUTPUT.** The SHELL is deterministic (byte-identical, gate-covered). The AI-generated CONTENT is **NOT deterministic** (an AI returns different text each call) — **and that is FINE**, because content lives in the separate **non-hashed** layer, explicitly **OUTSIDE** the backstop. The backstop covers the shell; slot content (AI- or hand-filled) is creative, variable, developer-owned. **The fill CORE is fixture-tested deterministically (a fake filler); the live AI OUTPUT is NOT gate-able — and must not be gated.**

---

## 2. THE ARCHITECTURE — a pure fill-CORE behind an impure AI-EDGE (the Day-18 mirror)

Split the fill so determinism is protected **by construction**, exactly as Day 18 split detection:

### 2.1 The pure fill CORE (`fill/fill-core.ts`) — deterministic, fixture-testable, no AI
Pure functions over the model + slot declarations (no network, no key, no AI):
- **`buildFillSpecs(model, decls) → FillSpec[]`** — one spec per declared slot: `FillSpec = { slotId, type, context }`, where `context` is project-derived creative-prompt input (projectName, projectType, a short entity/backend summary). Pure derivation from the blueprint.
- **`SlotFiller = (spec: FillSpec) => Promise<string>`** — the narrow **fill boundary** (like Day-18's probe boundary). The core takes a filler as an INJECTED argument — it never knows whether it's a fake or a real AI.
- **`orchestrateFill(specs, filler) → Promise<SlotContent>`** — calls the injected filler per spec (in declared order) and assembles the results into a `SlotContent` object keyed by slotId. **Writes ONLY `SlotContent`** — it returns the content layer, it never returns/touches files.
- **`applyFills(base, results) → SlotContent`** — merges results into a `SlotContent` (over `emptyContent`), so a partial fill is well-defined.

Because the core takes an injected filler, it is **fixture-tested with a FAKE deterministic filler** (`spec => \`FIXED:${spec.slotId}\``) — proving the orchestration deterministically, with **no AI and no network** (CI-enforced, PART 1l — the Day-18 PART 1j analogue). This is the **load-bearing testable deliverable.**

### 2.2 The impure AI EDGE (`fill/fill-ai.ts`) — quarantined, developer-keyed, default-off
The thin layer that implements a real `SlotFiller` by calling the developer's AI:
- Reads the **developer's key + endpoint/model** from settings/env (e.g. `THRAKSHA_AI_FILL_KEY` + optional `_ENDPOINT`/`_MODEL`). **Builtin `fetch` only — ZERO deps.**
- Builds the prompt from the `FillSpec`, calls the configured model, returns the content string.
- **DEFAULT OFF:** no key ⇒ the edge is **not constructed / returns "not configured"**, and the opt-in surface skips the fill entirely (graceful, like Day-18's "AI is not configured" 503 — never an error that blocks anything). **No key ⇒ no call, ever.**
- **NEVER imported by `buildFileSet`/regen/plugins/model** (0 refs) — quarantined at the I/O boundary, exactly like `probe.ts`.

### 2.3 The opt-in surface (where fill is invoked — a SEPARATE step, never generation)
- A `fill-demo` CLI (like `detect-demo`) and/or a server route (like `/api/detect`) that: runs generation FIRST (shell + empty slots, unchanged), then — only if a key is configured — calls `orchestrateFill(buildFillSpecs(model, decls), aiFiller)` and **returns/shows the resulting `SlotContent`**. The developer sees the filled content; it is **their** content to use.
- **Fill's output is `SlotContent`** — the separate layer object. It is NEVER written into the shell / `buildFileSet` output. (If persisted, it goes to a SEPARATE developer-owned artifact outside the backstop — noted, not required for Day 23's proofs.)

> **Why this is determinism-safe (the spine restated):** generation = `buildFileSet(model)` → shell + empty slots (Day 21). Fill is a *separate* opt-in step that produces `SlotContent`. The fill layer has **no write-path into generation** (0 refs). So detachability + ADR-001 + AI-off-byte-identical hold **by construction**, and the AI output — necessarily non-deterministic — is confined to the non-hashed content layer.

---

## 3. What the plan resolves (the five questions, answered from the real code)

1. **The `fillSlot(spec) → content` interface:** `SlotFiller = (FillSpec{slotId,type,context}) => Promise<string>`; `orchestrateFill(specs, filler) → SlotContent`. It writes ONLY to `SlotContent` (the separate layer) — it has no access to files/templates/`buildFileSet` (it doesn't import them). Content is keyed to the slot by `slotId`.
2. **WHERE the key lives + the default-off gate:** settings/env-level (`THRAKSHA_AI_FILL_KEY` + optional endpoint/model), read ONLY by `fill/fill-ai.ts`. **"No key / off ⇒ no AI ever" is enforced structurally**: generation never calls fill; the edge makes no call absent a key; no AI SDK is a dependency (so there is literally nothing to call by default). Not a bypassable flag — the call site doesn't exist without a key + an explicit opt-in invocation.
3. **The pure-core / impure-edge split:** `fill/fill-core.ts` (spec-building, orchestration, fill-state — fixture-testable with a fake filler) behind `fill/fill-ai.ts` (the real AI/network call). Mirrors `detect/detect-core.ts` + `detect/probe.ts`.
4. **HOW detachability is proven:** **BY CONSTRUCTION** (the fill layer is not imported by generation — 0 refs; removing it leaves generation complete) **+ an explicit "delete the layer/key → still generates"** gate (generation produces shell + empty slots; the frozen backstop reproduces byte-identical).
5. **The honest framing / CI-enforceable gates:** the **shell** is deterministic + gate-covered (50 baked + 10 + non-hash). **Slot CONTENT (AI or hand-filled) is explicitly OUTSIDE the backstop** — creative, variable, developer-owned. The **fill CORE is fixture-tested** (PART 1l, deterministic, CI-enforced); the **live AI output is NOT gate-able** (and must not be — gating creative text would be a category error). **Honesty:** the automated shell has no developer key/bill, so a **LIVE AI call is likely NOT run** — the deterministic gate uses the fake/fixture filler; the impure edge is built + wired but a real call is optional/manual (the developer's own key). State this precisely in the report.

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### Stage 1 — the pure fill CORE + fixtures + detachability-by-construction (the load-bearing, AI-free half)
- **DC-1:** `fill/fill-core.ts` — `buildFillSpecs` (specs from model+decls), `SlotFiller` boundary, `orchestrateFill(specs, filler) → SlotContent`, `applyFills`. Writes ONLY `SlotContent`; imports nothing from the generation path.
- **DC-2 (fixtures, CI-enforced — PART 1l):** a **FAKE deterministic filler** → `orchestrateFill` produces the expected `SlotContent` keyed by slotId; `buildFillSpecs` derives the expected specs from a fixture model; a partial fill is well-defined. **No AI, no network** — deterministic, added to `day20:regress` (PART 1l, the PART-1j analogue).
- **DC-3 (DETACHABILITY BY CONSTRUCTION + AI-OFF byte-identical — load-bearing):** grep `buildFileSet`/regen/plugins for imports of `fill/` → **0**. `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full set (50 baked + 10 TeamTracker + non-hash) byte-identical — the fill core is present but generation never calls it. **A moved hash = a finding, STOP.**

### Stage 2 — the impure AI EDGE + the opt-in surface + default-off + explicit detachability + the ADR-001 sweep
- **DC-4:** `fill/fill-ai.ts` — the real `SlotFiller` (developer key from env, builtin `fetch`, model-agnostic), **default-off** (no key ⇒ no call, graceful "not configured"). The opt-in surface (a `fill-demo` CLI and/or a server route) that generates FIRST, then fills ONLY when keyed, returning `SlotContent`. **ZERO deps** (builtin fetch); NEVER imported by generation.
- **DC-5 (DEFAULT-OFF + EXPLICIT DETACHABILITY):** with **no key**, the opt-in surface makes **no AI call**, no network, and returns unfilled content gracefully — generation is unaffected. **Delete/disable the fill layer** ⇒ the project still generates completely (shell + empty slots) — proven explicitly. **AI-on ⇒ only `SlotContent` changes, structure byte-identical** (the Day-21 invariance; if a live call isn't run, prove with the fake filler that filled content does not alter `buildFileSet` output).
- **DC-6 (ADR-001 sweep + invariants):** the generator CORE has **no AI** — grep `src/core` + `src/plugins` + `buildFileSet` for AI/network refs → **0** (AI lives ONLY in `fill/fill-ai.ts`, which only writes `SlotContent`). Generator **pure-Node** (`deps {}`, 0 native modules — the AI edge uses builtin `fetch`, no SDK); **no frozen hash moved.**

**Execute scope guard (every stage):** just the optional detachable developer-keyed AI FILL (writes only `SlotContent`). **NOT** new slot types/sites (Day 21 scoped to README). **NOT** has-many/decimal/field-key (Days 25/27/29). **The fill must NEVER touch generation/structure/`buildFileSet`** (0 refs). **DEFAULT OFF** (no key ⇒ no call ever). **No AI SDK as a generator dependency** (`deps {}` stays; builtin `fetch` only). **No frozen hash moves** (a moved hash is a finding, STOP). No signing. Commit to `main`. Don't compress the 2 days — if the core + fixtures + the edge + the opt-in surface + the proofs need multiple passes, stage honestly.

---

## 5. REPORT — done-conditions

[`eco-day-23-report.md`](eco-day-23-report.md): the `fillSlot`/`orchestrateFill` interface (writes ONLY `SlotContent`); the **pure-core / impure-edge split** (`fill/fill-core.ts` + `fill/fill-ai.ts`, the Day-18 mirror); the **default-off developer-keyed gate** (env key, no key ⇒ no call, ZERO deps / no AI SDK); **THE DETACHABILITY PROOF** (delete → still generates — by construction: 0 generation-path refs; + explicit: backstop byte-identical with the fill layer present/off); **AI-off = shell byte-identical** (+ AI-on only content changes, the Day-21 by-construction invariance); the **ADR-001 sweep** (0 AI refs in core/plugins/`buildFileSet`); the **determinism-≠-AI-output framing** (shell gate-covered; slot content explicitly outside the backstop — creative, variable, developer-owned; the fill CORE fixture-tested, the live output not gate-able); **invariants** (pure-Node, `deps {}`, no frozen hash moved). **Forward-flags:** `[2 days]` scope status (done vs pending); **whether a REAL AI call was tested** (with what key) vs **fixture/fake-fill only** — be honest (likely fixture-only for the deterministic gate; a live call is optional/manual, the developer's key); the **Fable/Mythos note** (Thraksha's fill uses the developer's key/model of choice — not tied to any provider); what **Day 25** picks up (has-many relationships).

---

## 6. Scope guard — OUT for Day 23
- Just the optional detachable developer-keyed AI FILL (writes only `SlotContent`). **NOT** new slot types/sites (Day 21 scoped README). **NOT** has-many/decimal/field-key (Days 25/27/29).
- **The AI fill must NEVER touch generation/structure/`buildFileSet`** — it writes ONLY the separate `SlotContent` layer. 0 generation-path refs.
- **DEFAULT OFF** — no key / off ⇒ no AI call ever, no network, no generation dependency on any AI service.
- **NO AI in the generator core (ADR-001)** — the AI lives ONLY in the detachable fill layer. **No AI SDK as a generator core dependency** (`deps {}` stays; builtin `fetch` only).
- No signing. **`[2 days]`** — don't compress; stage honestly.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + ecosystem (structural-vs-creative + detachable-AI + ADR-001) + Month-2 Day 23 + Day-21 + Day-18 + the real slot layer? — ✅ (this session).
2. Only Day-23's job (the detachable AI fill of `SlotContent`)? — yes; **not** new slot sites, **not** depth features.
3. Which frozen baselines must NOT move? — **all** (50 baked + 10 TeamTracker + non-hash gates). The fill layer is not in the generation path; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **yes, the first ever** — and each is: **default OFF**, **detachable** (delete ⇒ still generates), **developer-keyed** (their key/bill), **writes only `SlotContent`** (never structure). The detachability proof (DC-3/DC-5) is mandatory (§1.2).
5. Default/empty path a literal bypass? — **yes**: no key / fill not invoked ⇒ the Day-21 mechanism (shell + empty slots) reproduces the frozen backstop byte-identical.
6. Three killers checked? — no clock/RNG/UUID in the pure core (deterministic given a deterministic filler); the AI output is non-deterministic **by nature** and is quarantined in the non-hashed content layer — **it never becomes a generation input** (the #1 discipline this day).
7. A gate that can actually FAIL? — **DC-3** (a moved default hash ⇒ the fill leaked into generation; or 0-refs grep non-zero), **DC-2** (the fake-filler orchestration is non-deterministic / writes outside `SlotContent`), **DC-5** (a call made with no key ⇒ default-off broken; or filled content alters `buildFileSet` output), **DC-6** (an AI ref in core / an AI SDK dep). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) an AI value reaching `buildFileSet`/structure (must be 0-refs by construction); (ii) claiming the AI output is deterministic/gate-covered (it is NOT — determinism ≠ AI-output; only the shell is); (iii) adding an AI SDK to `deps` (must stay `{}` — builtin `fetch`); (iv) a default-off flag that's bypassable rather than structural (no key ⇒ no call site); (v) claiming a live AI call was run when only the fixture/fake-fill was (§5 honesty); (vi) conflating `integrations.ai` (emitted template code, in the frozen shell) with the design-time fill (never in the shell) — all guarded.

---

*Day 23 introduces AI to Thraksha for the first time — and proves the thesis holds under it. AI fills ONLY slot CONTENT, through a narrow `fillSlot` boundary, via a pure fill-core (fixture-testable with a fake filler, CI-enforced) behind an impure AI-edge (the developer's own key, builtin `fetch`, ZERO deps, default OFF) — the exact Day-18 detachable pattern. The fill writes only the separate `SlotContent` layer the generation path never imports, so: delete the AI layer/key → the project still generates completely and validly (Law 21, creative path); AI-off → the frozen backstop reproduces byte-identical; AI-on → only content changes, the shell byte-identical by the Day-21 construction; the generator core stays pure-Node and AI-free (ADR-001, `deps {}`). The shell is deterministic and gate-covered; the AI-generated content is creative, variable, developer-owned, and explicitly OUTSIDE the backstop — the entire point of the thesis. Day 25 picks up has-many relationships.*
