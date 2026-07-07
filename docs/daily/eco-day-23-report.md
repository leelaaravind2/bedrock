# Eco-Day 23 — REPORT: The optional, detachable, developer-keyed AI fill `[2 days]`

**Phase 2, Day 23 — the FIRST time AI appears in Thraksha.** And it proves the thesis holds *under* it: AI fills **ONLY slot CONTENT**, through a narrow boundary, via a **pure fill-core** (fixture-tested, AI-free) behind an **impure AI-edge** (the developer's own key, builtin `fetch`, **default OFF**) — the exact [Day-18](eco-day-18-report.md) detachable pattern. The fill writes only the separate `SlotContent` layer the generation path never imports (Day 21), so **delete it → the project still generates completely**; the generator core stays **pure-Node and AI-free**.

Plan: [`eco-day-23-plan.md`](eco-day-23-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.2 AI never in generation + the mandatory detachability proof; §1.4 Law 21; §3 STOP-and-report; §4 honesty). Builds on [`eco-day-21-report.md`](eco-day-21-report.md) (the slot mechanism + `SlotContent`, the fill target) and [`eco-day-18-report.md`](eco-day-18-report.md) (the pure-core/impure-edge template).

---

## THE VERDICT

> ✅ **AI is present — and every guarantee still holds.** A **pure fill-core** (`fill/fill-core.ts`: `buildFillSpecs` / `orchestrateFill(specs, filler) → SlotContent` — deterministic given an INJECTED filler, fixture-tested with a fake filler) behind an **impure AI-edge** (`fill/fill-ai.ts`: the developer's key from env, builtin `fetch`, model-agnostic, **DEFAULT OFF structurally**). The fill writes **ONLY** the separate `SlotContent` layer — the generation path has **0 refs** into it (by construction, like Day-18 detection). **THE DETACHABILITY PROOF:** delete/disable the fill layer → the project generates completely (shell + empty slots) — proven by construction (0 generation-path refs) **and** explicitly (backstop byte-identical, and the `fill-demo` runs default-off with no key, generation unaffected). **AI-off = shell byte-identical; AI-on = only `SlotContent` changes** (the Day-21 by-construction invariance). The **generator core is wholly AI-free** (`src/core` = 0 AI refs); AI lives ONLY in the detachable edge. Generator stays **pure-Node** (`deps {}`, 0 native — builtin `fetch`, **no AI SDK**); **no frozen hash moved**.
>
> **`day20:regress`: 74 OK / 0 FAIL, 50 baked digests** (unchanged — the fill layer emits no generated files).

Every DC passed. **Honesty:** **no LIVE AI call was made** — this shell has no developer key/bill. The deterministic gate uses a **fake/fixture filler** (CI-enforced); the AI edge is **built + wired**; a real call is **optional/manual**, the developer's own key.

---

## 1. The benchmark result (Execute DCs)

### Stage 1 — the pure fill-core + fixtures + detachability-by-construction

**DC-1 — the pure fill CORE ✅** ([fill/fill-core.ts](../../generator/src/fill/fill-core.ts)): `fillContextOf(state)` (project context, pure), `buildFillSpecs(decls, context) → FillSpec[]` (one spec per slot, declared order), the `SlotFiller` boundary (injected — the core never knows fake vs real), `orchestrateFill(specs, filler) → SlotContent` (assembles results into the separate content layer — writes **only** `SlotContent`, never files). **No AI here.**

**DC-2 — fixtures (new PART 1l, CI-enforced, no live AI) ✅.** With a **FAKE deterministic filler**: `buildFillSpecs` derives the right specs from the blueprint; `orchestrateFill` produces the expected `SlotContent` deterministically and writes only content keys; a throwing/empty filler **degrades to unfilled** (no crash — Law 21); two differing fillers change CONTENT while the shell stays byte-identical (**determinism ≠ AI-output**); **DEFAULT OFF is structural** (no key → no filler / no call site). Added to `day20:regress` (PART 1l — the PART-1j analogue).

**DC-3 — DETACHABILITY BY CONSTRUCTION + backstop byte-identical (load-bearing) ✅.** `grep` for fill imports in `src/core/regen.ts` + `src/plugins` → **0** (generation never depends on fill). Clean `build && day20:regress` → **PASS**, the full set (50 baked + 10 TeamTracker + non-hash) byte-identical — adding the fill layer moved **no** frozen hash.

### Stage 2 — the impure AI edge + opt-in surface + explicit detachability + ADR-001 sweep

**DC-4 — the impure AI EDGE ✅** ([fill/fill-ai.ts](../../generator/src/fill/fill-ai.ts)): `aiConfigFromEnv` reads the developer's key/endpoint/model from env (ONLY here); `makeAiFiller` calls the model via **builtin `fetch`** (OpenAI-compatible by default, endpoint/model overridable — **model-agnostic**, the developer's choice); on any error/timeout it returns `''` (graceful → unfilled). **DEFAULT OFF, structural:** `aiFillerFromEnv` returns `null` without a key — no filler is constructed, so no call site is ever reached. Opt-in surfaces: the `fill-demo` CLI (`npm run fill`) and a `GET /api/fill-slots` server route (mirrors `/api/detect`), both thin wrappers over `fillViaEnv`. **ZERO deps** (builtin `fetch`); **NEVER imported by generation.**

**DC-5 — EXPLICIT DETACHABILITY + default-off (live on this machine) ✅.** `npm run fill`: generation runs **FIRST** (24-file shell + 2 empty typed placeholders, valid), then the fill reports **`THRAKSHA_AI_FILL_KEY set? NO → AI fill OFF (no call made)`**, `enabled: false`, empty content — **no AI call, generation unaffected**. Delete/disable the layer ⇒ generation is unchanged. AI-on ⇒ only `SlotContent` changes, the shell byte-identical (the Day-21 by-construction invariance, re-proven in PART 1l (d)).

**DC-6 — ADR-001 sweep + invariants ✅.**
- **`src/core` is wholly AI-free** — 0 AI/`fetch` refs of any kind. The deterministic core never touches AI.
- **The only AI in `src/plugins`** is the **pre-existing Day-18 `integrations.ai='hook'` EMITTED template strings** (`await fetch(AI_CHAT_URL…)`, `gpt-4o-mini` — *generated-app* code the app runs at ITS runtime; `git diff` confirms these emitters are **untouched** by Day 23, and they're part of the frozen shell). **This is NOT Thraksha calling a model.**
- **Thraksha's own AI execution is confined to `fill/fill-ai.ts`** (the detachable edge, reached only with a developer key).
- Generator **pure-Node** (`deps {}`, **0** native modules — builtin `fetch`, no AI SDK); **no frozen hash moved**.

---

## 2. The distinction that governs Day 23 (do NOT conflate)

| | `integrations.ai = 'hook'` (Day 18) | `fillSlot` / the AI edge (Day 23) |
|---|---|---|
| What it is | **Emitted TEMPLATE CODE** in the generated project | **Thraksha itself calls an AI** at design time |
| Who calls the model | the **generated app**, at ITS runtime | **Thraksha**, once, to produce content |
| What it touches | the **frozen structural shell** (generated code) | **only `SlotContent`** (the separate layer) |
| Determinism | deterministic (inert strings, gate-covered) | non-deterministic output, **outside the backstop** |

Day 23's fill **never** touches the `ai='hook'` code or any other structure — it writes only the separate content layer.

---

## 3. Determinism ≠ AI-output (stated precisely)

- **The SHELL is deterministic + gate-covered** — 50 baked digests + 10 TeamTracker + non-hash gates, byte-identical from clean.
- **Slot CONTENT (AI- or hand-filled) is explicitly OUTSIDE the backstop** — creative, variable, developer-owned. A live model returns different text each call; that content lives in the **non-hashed** `SlotContent` layer and **never becomes a generation input**.
- **The fill CORE is fixture-tested** (deterministic given a fake filler, PART 1l, CI-enforced). **The live AI OUTPUT is not gate-able — and must not be** (gating creative text is a category error). PART 1l (d) proves the boundary: varying fills change content, the shell is invariant.

---

## 4. What changed

- **New:** [`generator/src/fill/fill-core.ts`](../../generator/src/fill/fill-core.ts) (pure core), [`generator/src/fill/fill-ai.ts`](../../generator/src/fill/fill-ai.ts) (impure AI edge — the ONLY place Thraksha calls a model), [`generator/src/fill-demo.ts`](../../generator/src/fill-demo.ts) (the opt-in demo surface).
- **Server:** `generator/src/server.ts` (+`GET /api/fill-slots` — the opt-in route, default-off).
- **Harness:** `generator/src/day20-regression.ts` (+PART 1l — the fill-core fixtures incl. structural default-off; +imports).
- **`package.json`:** +`fill` script.
- **Generation core (`regen`/`buildFileSet`/model/templates/plugins) — UNTOUCHED.** No AI added to the core; the `ai='hook'` emitters are byte-identical; no new dep; no native module; no generated byte changed.

---

## 5. Forward-flags & honest boundaries

- **`[2 days]` scope status — DONE:** the pure fill-core + fixtures + the impure AI edge + the opt-in surfaces (CLI + route) + all detachability/ADR-001 proofs. **PENDING (out of scope):** has-many (Day 25).
- **Live AI call: NOT run (honest).** This automated shell has **no developer key/bill**, so **no live model call was made**. The deterministic gate uses a **fake/fixture filler** (CI-enforced); `fill-demo` ran **default-off** (no key → no call, `enabled:false`). The edge is **built + wired** (builtin `fetch`, OpenAI-compatible body); a real call is **optional/manual** — the developer runs it with their own key (`THRAKSHA_AI_FILL_KEY=… npm run fill`).
- **Provider-agnostic (the Fable/Mythos note):** Thraksha's fill uses the **developer's key/model of choice** — endpoint + model are env-overridable; it is tied to **no specific provider**.
- **Determinism ≠ validity/quality:** the shell is deterministic and valid with slots empty; the quality of AI-filled content is a creative concern, never a generation guarantee.
- **v0.1 depth limits still stand** (has-many/decimal/field-key — Days 25/27/29); signing → Phase 4. Phase-1 carried boundaries unchanged (Day 23 added no generation feature — only a detachable design-time enhancement).

---

**Day 23 verdict, restated:** AI enters Thraksha for the first time — and the thesis holds under it. AI fills ONLY slot CONTENT, through a narrow `fillSlot` boundary, via a pure fill-core (fixture-tested with a fake filler, CI-enforced — PART 1l) behind an impure AI-edge (the developer's own key from env, builtin `fetch`, ZERO deps, DEFAULT OFF structurally — no key means no call site exists). The fill writes only the separate `SlotContent` layer the generation path never imports (0 refs), so: delete the AI layer/key → the project still generates completely (shell + empty slots — proven live by `fill-demo`, default-off on this keyless machine); AI-off → the frozen backstop reproduces byte-identical (50 baked + 10 + non-hash, 74 OK / 0 FAIL); AI-on → only content changes, the shell byte-identical by the Day-21 construction. The generator core is wholly AI-free (`src/core` = 0 AI refs; the plugin `fetch`/`gpt` strings are the pre-existing Day-18 `ai='hook'` emitted generated-app code, frozen and untouched); pure-Node, `deps {}`, no AI SDK, no frozen hash moved. The shell is deterministic and gate-covered; the AI-generated content is creative, variable, developer-owned, and explicitly OUTSIDE the backstop — the entire point of the thesis. Day 25 picks up has-many relationships.
