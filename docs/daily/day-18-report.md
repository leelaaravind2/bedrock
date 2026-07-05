# Day 18 — End-of-Day Report: Harden the integrations pattern + the SECOND integration (the AI HOOK)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no wiring change. The only code touched is the gate/test scaffolding (`day18-gate.ts`, added in Session 2) + cleanup.
**Status: DONE — the neutral optional-`integrations` concept now has TWO members (`{ email, ai }`, both gated). The AI HOOK is wired end-to-end on FastAPI (stdlib `urllib`) and Express (Node built-in `fetch`) as a DETACHABLE add-on surface — an isolated `POST /api/ai/explain` on its own `/api/ai/*` namespace, `isConfigured()`-guarded, graceful-503 when unconfigured, wired to NOTHING in the CRUD path. FastAPI booted live on real Postgres with `AI_API_KEY` UNSET and passed the FOUR-PART detachable proof — including part 4: normal CRUD is BYTE-FOR-BYTE identical whether the hook is configured or not. Thraksha's generation path makes ZERO AI calls (ADR-001). No baked keys; no new dependency.**

> **This report is a self-contained handoff — Day 19 starts in a fresh session with no carry-over context.** §1–§5 are the reusable pattern (now two-member), the completed ADR-001 precedent, the detachable-shape rule, the baselines/subset, and the gate-suite note that Day 19+ needs.

Plan: [`docs/daily/day-18-plan.md`](day-18-plan.md). Precedent: [`day-17-report.md`](day-17-report.md) (§1 pattern, §2 the ADR-001 invariant). Guardrails: **ADR-001 (the one that matters most today)**, ADR-002/003, ADR-004 (shown-not-hidden), Law 21, Law 25.

---

## 1. THE INTEGRATIONS PATTERN NOW HAS TWO MEMBERS (the reusable shape, confirmed extensible)

`Integrations` is now `{ email: 'none' | 'smtp', ai: 'none' | 'hook' }` — **two neutral, optional model concepts, both defaulting to `none` (a literal bypass), both rendered via the SAME gated manifest section.** Day 18 added `ai` with **no new machinery** — exactly the extension Day-17 §1 predicted:

- **`ai` is a NEUTRAL, OPTIONAL model value — NOT a Phase-A key.** Defined in [`src/core/integrations.ts`](../../generator/src/core/integrations.ts) (`AiHook = 'none' | 'hook'`; `defaultIntegrations = { email: 'none', ai: 'none' }`), carried in `ProjectState`, read via `model.getIntegrations()`, set via `model.setIntegrations(...)`. **Both members are copied on get/set** (`{ email, ai }`) — dropping one would silently make that integration a no-op (the file warns of this); a positive guard confirms `ai` survives the copy. `restoreProjectModel` defaults old snapshots (`ai: state.integrations.ai ?? 'none'`), so pre-Day-18 snapshots regenerate byte-for-byte.
- **The manifest renders it via the SAME gated section** (`buildManifest` in `regen.ts`): `activeIntegrationLines` now pushes an `ai:` line only when `ai !== 'none'`. For `none` it spreads nothing → the manifest is byte-identical → the 20-hash backstop is frozen.
- **Per-stack wiring lives in the PLUGIN**, gated on `model.getIntegrations().ai === 'hook'` — a LITERAL BYPASS otherwise (mirrors the `email === 'smtp'` gate). The core stays neutral (Law 25).

**To add a THIRD integration later, the shape is identical (and now proven twice):** extend the `Integrations` type, add ONE gated `activeIntegrationLines` line, add per-stack wiring in the plugins gated on the value, keep it **out of Phase-A**, and **never record a `none` default**. *(Day 19 does NOT add an integration — this is forward context.)*

---

## 2. THE ADR-001 PRECEDENT — COMPLETE (the day's headline capability)

**Day 18 is the strongest ADR-001 test in the plan — a case that LOOKS like it violates the rule (an AI integration) — and it held.** State it plainly for reuse:

> **Thraksha emits inert AI-client template strings the generated app runs at ITS runtime; Thraksha itself makes ZERO AI calls.** An AI integration is a **detachable runtime hook the app can use** — never AI in Thraksha's generation path.

The line is drawn exactly as it was for email's SMTP (report §2): what Thraksha *generates* is inert code the app runs; Thraksha the generator never performs the integration's action. **Both ADR-001 properties were proven:**

- **(a) Thraksha makes no AI call (source-level).** A grep of `src/` for any real `import`/`require` of an AI SDK or HTTP client (`openai` / `anthropic` / `node-fetch` / `urllib` / `http.client`) returns **NONE**. The `openai` / `api.openai.com` tokens appear **only inside the backtick-quoted `AI_SERVICE_PY` / `AI_SERVICE_JS` string constants** (`python-plugin.ts:219`, `express-plugin.ts:268`) and two comments — never as executable Thraksha code. Deleting the hook leaves generation byte-identical (`none` = literal bypass).
- **(b) The hook is detachable to the generated app.** Proven TWO independent ways: the **structural** Step-3 CRUD-diff (§4/§6) and the **runtime** four-part boot (§3), which catches a coupling the diff cannot (an import side effect, shared state, middleware ordering).

---

## 3. THE HEADLINE — the four-part detachable-and-inert boot (part 4 is load-bearing)

Booted **FastAPI ai-hook** on real Postgres (`docker compose up --build`), **`AI_API_KEY` UNSET** (0 AI/SMTP refs in the compose file). A clean start alone is not the proof — a hook can be dormant yet still load-bearing — so all FOUR were proven, with **part 4 (CRUD identical configured-vs-unconfigured) front and centre**:

**1. The app comes up with `AI_API_KEY` unset.** `GET /api/health → {"status":"ok","app":"DemoApp"}`; `Application startup complete`, no `ImportError`/`Traceback`. Because `app/main.py` imports the AI module **at startup** (`from . import ai`), a broken hook would fail the boot — so **startup success is itself evidence the hook is wired (not orphaned) AND that its import has no fatal side effect.**

**2. Normal CRUD round-trips** (the dormant hook doesn't break the app):
```
POST /api/tickets  (Basic admin:admin123)  → 201  {"id":1,...,"owner_id":1,...}
GET  /api/tickets/1                          → 200
GET  /api/tickets/1  (no auth)               → 401   (owner-scoping intact)
```

**3. The AI hook is REACHABLE-BUT-DORMANT** (public endpoint, mounts before the auth gate):
```
POST /api/ai/explain  (NO auth token)  → 503  {"detail":"AI is not configured"}   ← graceful, not a crash/500
in-container:  app.ai.is_configured()  → False                                     (unset ⇒ dormant)
# genuinely READS the declared env var (fresh process, key set) — NO network call made:
AI_API_KEY=dummy-not-real python -c "import app.ai; print(app.ai.is_configured())" → True   (AI_API_KEY read as 'dummy-not-real')
```

**4. THE CORE PATH DOES NOT DEPEND ON THE HOOK** (the load-bearing proof). The SAME CRUD sequence was run on a fresh DB **twice** — once with `AI_API_KEY` unset, once with it set to a dummy value — and the responses were **byte-for-byte IDENTICAL** (timestamps normalized): same status codes (201/201/200/200/401), same JSON shape, same `owner_id` scoping, same autoincrement (`id` 1,2). The app booted **configured** (`is_configured() → True`) with CRUD unaffected. The AI endpoint is the ONLY surface whose behavior changes between the two states. **This proves the AI is an ADD-ON, not a dependency — "detachable," not merely "dormant."**

**No real AI call was made anywhere** — the AI endpoint was never hit in the configured run. Torn down with `-v` (0 containers, 0 volumes, boot dir removed). **Express boot: honestly DEFERRED** — FastAPI (stdlib, fastest) fully carried the four-part runtime proof; Express detachability is covered by the structural Step-3 CRUD-diff (§4), the `node --check` of the generated `ai.js`/`app.js` (Session 2), and the twice-identical baseline. Its `require('./ai')` at startup is the wired-at-startup analogue.

---

## 4. STATIC DETACHABILITY RE-CONFIRM (pairs the runtime proof with the structural one)

The Step-3 CRUD-diff in `day18-gate.ts` proves, per stack, that the ai-hook output equals the `none` output **except the AI add-on seams**:

- **CRUD untouched:** every non-seam file (all entity routers/handlers, models, config, db, compose, migrations, auth) is **byte-identical** to the `none` output (`crudUntouched=true`, both stacks). Removing the AI block from the mount file reproduces the `none` mount file exactly (`mountReconstructs=true`).
- **Only the AI module is added:** `app/ai.py` (FastAPI) / `src/ai.js` (Express) — `onlyAiAdded=true`.
- **The manifest legitimately differs** — it gains the gated `Integrations (ADR-004 — shown):` header, the `- ai: hook …` line, and `[T] app/ai.py` in the file listing (count 24→25). This is ADR-004 "shown" on a **traceability artifact, NOT a CRUD change.**
- **Declaration-match:** the module reads exactly `AI_API_KEY, AI_PROVIDER, AI_MODEL` — the same three declared in `.env.example` (no dangling either direction).
- **No baked key:** grep of the generated output finds only empty env placeholders (`noBakedKey=true`).
- **README truthful:** "exposed optional endpoint; inert until configured; the app calls the model, Thraksha never does" — not "AI-enriches every response" (`readmeTruthful=true`).

### The AI-hook addition — per landed stack

| Stack | Module | Mechanism | Dependency | Files added / edited (gated) | Wired at startup | Mount |
|---|---|---|---|---|---|---|
| **FastAPI** | `app/ai.py` (new) | stdlib `urllib` | **none** | `app/ai.py`; `.env.example` (AI_*); `README.md`; `app/main.py` (mount block) | `main.py` imports `ai` | `include_router(ai.router, prefix="/api/ai")` |
| **Express** | `src/ai.js` (new) | Node built-in `fetch` | **none** | `src/ai.js`; `.env.example` (AI_*); `README.md`; `src/app.js` (mount line) | `app.js` requires `./ai` | `app.use('/api/ai', require('./ai').router)` |

Env config is identical across both: `AI_API_KEY`, `AI_PROVIDER`, `AI_MODEL` — **placeholders only, never a baked secret.** Neither stack adds a dependency (email already proved that facet via `nodemailer`; the AI hook's job was detachability).

---

## 5. THE BASELINES + SUBSET STATE

**Landed (AI hook):** FastAPI + Express — both **ai-hook DemoApp / Postgres, twice-identical:**
```
FastAPI  ai-hook  aabc7159733aaa661f6cf8bc2dab8ec7421eb90e2446acf6407a004eee33b20d   (adds app/ai.py)
Express  ai-hook  a17c6ad4dfc3a01bd5f7cfbe008bbac622fae0d67443f5f0293f6b26507c2cec   (adds src/ai.js)
```
Each **differs from its `none` output** (the addition is real) and is coherent (§4). Baked into `AI_FROZEN` in `day18-gate.ts`.

**Staged (both integrations, same seam):** **Spring / Django / Go** are staged for *both* email and the AI hook — each follows the same gated-addition principle (the `.env.example` / README / startup wire-point transforms + one added module file, gated on the integration value). When those stacks are added, the AI hook reuses the exact seam email defined. *(Spring's first-boot cost remains a known drag — don't force it.)*

---

## 6. THE GROWING GATE SUITE (still open — a note for Day 20)

There are now `day12:gate` … `day18:gate` scripts plus `ui:demo` / `two-stacks` / `python:demo`. Several start an in-process server and run serially, so running the full set one-by-one is slow. **Day 20's full regression should consider a consolidated harness** rather than invoking seven-plus gate scripts sequentially. *(Carried unchanged from Day 17 §5.)*

---

## 7. Gate results — 20-none frozen (both sides) + guard-the-guard + the two baselines

`npm run day18:gate` from a **clean rebuild** (`rm -rf dist && tsc`) — **exit 0, zero FAIL.**
- **NONE:** all **20 hashes byte-identical** under `{email:none, ai:none}` — both the Phase-A lines and the `(none)` defaults line unmoved (the two-sided trap held for the second member).
- **GUARD:** `setIntegrations({email:none, ai:hook})` → `getIntegrations().ai === 'hook'` (ai survives the copy; not a silent no-op).
- **AI HOOK:** FastAPI `aabc7159…` and Express `a17c6ad4…`, **twice-identical**, each differs from its `none` output, coherence + detachable all OK.

### Guard the guard (20 == 20, diff EMPTY)
The 20 digests baked into `day18-gate.ts`, diffed against sources — **16 in [`week-01-summary.md`](week-01-summary.md)** (Spring/Express/FastAPI/Django × {PG,MY} × {DemoApp,TeamTracker}) **+ Go's 4** (`d158529a…` in [`day-09`](day-09-report.md); `6aea8b04…` / `9ff40acb…` / `7408a3e2…` in [`day-10`](day-10-report.md)): **20 source digests, 20 baked, 20/20 present, missing = (none).**

**No regressions:** `day12`–`day17` gates + `ui:demo` / `two-stacks` / `python:demo` all PASS on the current build.

---

## 8. ADR / Law compliance

- **ADR-001 (no AI in generation — the one that matters):** **BOTH properties** (§2). (a) Thraksha's own code imports no AI SDK/HTTP client (grep → NONE); the `openai`/provider-URL tokens live only inside the `AI_SERVICE_*` string constants. (b) The generated app's hook is detachable — the structural CRUD-diff (§4) + the runtime four-part boot (§3). **Generation makes zero AI calls.** This is the precedent completed today.
- **ADR-002 (file separation):** the AI hook adds Thraksha-owned shell files only (`app/ai.py` / `src/ai.js` + gated edits); developer files untouched (`two-stacks` / `python:demo` re-confirm).
- **ADR-003 (determinism):** `none` is a literal bypass (20 frozen); ai-hook is twice-identical; **no config values are baked** (env placeholders only), so no non-determinism.
- **ADR-004 (shown-not-hidden):** the `ai` choice is rendered via the gated manifest section (`- ai: hook …`); `none` legitimately shows nothing (the section spreads `[]`).
- **Law 25 (core neutral):** `ai` is a neutral model value; the per-stack AI wiring lives in the plugins (grep → no `/api/ai` / `explain` / provider URL in `src/core`). The `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched.
- **Law 21 (standalone):** the ai-enabled project booted under `docker compose` with no Thraksha present, the hook inert until `AI_API_KEY` is set.

---

## 9. Cleanup & scope

Boot torn down `-v` (**0 containers, 0 volumes**); the generated `boot-fastapi-ai` and `day18` scratch dirs removed (absolute paths — the relative-path slip from prior days avoided); no `docker-compose.override.yml` residue; no preview scaffolding (`launch.json` not recreated); no `output/` dir. The recurring OS-handle-on-output-dir thread (Days 14–16) did not recur.

**Scope held:** no new integrations, no new stacks/types/options, no re-baselining of the 20 `none` hashes or the two ai-hook baselines. Only gate/test scaffolding + cleanup this session.

---

## 10. What Day 19 picks up

**Day 19 — wizard enrichment (details + relationships in the entity screen).** All additive; engine untouched; deterministic.
- **Project description → README** — capture a free-text project description and thread it into the generated README.
- **Relationships in the entity screen** — let a developer declare "belongs-to" in the UI, feeding the Day 1–4 relationship generation (so the richer intake is captured end-to-end).
- **Screens flow cleanly** — ensure the style / integration / type screens (the `integrations` concept now has two members — email + ai — both surfaced) all flow cleanly together.

Day 19 does **not** add an integration; the two-member `Integrations` concept is complete and frozen-by-default. The wizard work sits on top of it.

---

**Day 18 verdict:** the optional-integrations pattern now carries **two members** (`{ email, ai }`), both neutral, both gated, `none`-by-default a literal bypass — the 20-hash backstop is frozen on both manifest sides (guard-the-guard 20==20). The **AI HOOK** is the strongest ADR-001 test in the plan and it held: Thraksha emits inert AI-client template strings the app runs at its runtime and makes **zero AI calls** (source grep clean), while the hook is genuinely **detachable** to the generated app — proven structurally (CRUD byte-identical to `none` except the single mount line) and at runtime (FastAPI booted with `AI_API_KEY` unset; **CRUD is byte-for-byte identical configured-vs-unconfigured** — the AI is an add-on, not a dependency). No baked keys; no new dependency. **Day 19 enriches the wizard.**
