# Day 16 — End-of-Day Report: API-only in the wizard + proven across all five stacks

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no wiring change. The only code touched is gate/test scaffolding + cleanup.
**Status: DONE — `projectType` is selectable in the wizard (Web App / API-only). Selecting API-only HIDES the frontend question and forces `frontend=None`, shown three ways (never silent). A fresh untouched wizard reproduces all 20 Web-App hashes; wizard-driven API-only output is byte-identical to the Day-15 CLI baselines across all five stacks (UI==CLI); and a wizard-chosen Spring API-only project booted live (no frontend, CRUD round-trips). Front-end wiring only — the server and engine are untouched.**

Plan: [`docs/daily/day-16-plan.md`](day-16-plan.md). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), ADR-004 (choices shown), Law 25 (core neutral).

**Day 16 changed no generated file's bytes and no server code: it added one `<select>` option, an explicit frontend-submission conditional, and a hide-the-frontend-question gate. The whole 20-hash backstop and the Day-15 api-only baselines are frozen by construction — the work is UI + capture + display, proven equal to the CLI/engine path.**

---

## 1. What was built (Session 2, verified this session)

- **The `API-only` option** added to the existing single-valued `projectType` select on Screen 1 (Web App stays first/default).
- **The explicit frontend-submission conditional** in `setSettings` — the load-bearing, *documented* design decision:
  ```js
  // API-only projects have no frontend. We submit a non-None frontend ('React') so the
  // model normalizes it to None AND RECORDS the ADR-004 default (defaultsApplied), which
  // is the canonical api-only baseline (Day-15: 97aef817…). Submitting 'None' directly
  // would skip the recorded-default line and produce the divergent sibling (1fc7f87c…).
  frontend: projectType === 'API-only' ? 'React' : document.getElementById('frontend').value,
  ```
- **The hide-frontend gate** (`onTypeChange`): API-only hides the frontend question and shows a stated consequence; Web App shows it normally; re-evaluated on every type change and on load.
- **No server change, no new endpoint.** `POST /api/settings` already carried `projectType` + `frontend`, and `createProjectModel` already enforces `API-only ⟹ frontend=None` and records it (Day 15). The wizard *reflects* the model's constraint; it does not re-implement it.

### The recon finding that sized the day
Both controls were **already live** on Screen 1 (`projectType` single-valued `Web App`; `frontend` = React/None), and `setSettings` already sent both → `createProjectModel` already enforced the constraint. So Day 16 was **front-end-only**: add one option, gate the existing frontend control.

---

## 2. THE RECORDED-DEFAULT MECHANISM — a deliberate, documented design choice (state for Day 20)

**This is not a quirk — it is the design.** Probed on the model (Spring DemoApp, API-only, Postgres):

| Submitted `frontend` | model records the default? | hash | is it the wizard's output? |
|---|---|---|---|
| **`'React'`** → model normalizes to None **AND records** the ADR-004 default | ✅ `defaultsApplied: [frontend=None, "API-only projects have no frontend…"]` | **`97aef817…`** — the canonical Day-15 baseline | **YES** — the wizard always submits React under API-only |
| `'None'` (submitted directly) → already None, nothing to record | ❌ `defaultsApplied: []` | `1fc7f87c…` — the divergent **sibling** | NO — reachable via CLI or a None-then-API-only path, valid, but never the wizard's output |

The two differ by **exactly one manifest line** — the ADR-004 "defaults applied" note. **The wizard deliberately submits `frontend='React'` under API-only so the model records *why* the frontend is None, producing the canonical recorded-default baseline `97aef817…`.** The `React` is immaterial and never shown as the user's choice (the question is hidden); the forced-None is surfaced via the recorded default + the consequence note + the None chip.

**For Day 20's full regression: the CANONICAL api-only baseline is the recorded-default variant (`97aef817…` etc.) — the wizard's output. The `1fc7f87c…` sibling exists and is valid but is not what the wizard produces.**

---

## 3. THE BACKSTOP — 20 Web-App frozen + UI==CLI across all five stacks (proof)

`npm run day16:gate` from a **clean rebuild** — **exit 0, zero FAIL.** Driving the REAL UI server (`POST /api/settings` → `/api/entities` → `/api/generate`, exactly as the browser does):

**Web-App — fresh untouched wizard reproduces all 20 (frozen + UI==CLI):**

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ | `d158529a…` ✅ |
| Postgres | TeamTracker | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ | `6aea8b04…` ✅ |
| MySQL | DemoApp | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ | `9ff40acb…` ✅ |
| MySQL | TeamTracker | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ | `7408a3e2…` ✅ |

20/20 `frozen=true` **and** `UI==CLI=true`. Web-App is a literal bypass.

**API-only — wizard == the Day-15 baselines, all five stacks (UI==CLI):**

| Stack / model | wizard hash | == Day-15 baseline | UI==CLI |
|---|---|---|---|
| Spring Boot / DemoApp (the real subtraction) | `97aef817…` | ✅ | ✅ |
| Spring Boot / TeamTracker | `190594dd…` | ✅ | ✅ |
| Express / DemoApp | `c5210f73…` | ✅ | ✅ |
| FastAPI / DemoApp | `46b3fda4…` | ✅ | ✅ |
| Django / DemoApp | `5634e7ce…` | ✅ | ✅ |
| Go / DemoApp | `5d67f242…` | ✅ | ✅ |

This is the **"across all stacks" proof** — a hash-level equality of wizard-path vs CLI-path for **both** types on all five backends (Spring subtracts its frontend; the four backend-only stacks are Web-App ± the two manifest lines + the recorded default).

### Guard the guard
The 20 Web-App digests baked into `src/day16-gate.ts`, diffed against sources (16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md)): **`16/16` non-Go + `4/4` Go present, full diff EMPTY (20 == 20).**

**No regressions:** the day12/13/14/15 gates + `ui:demo` / `two-stacks` / `python:demo` all PASS on the current build.

---

## 4. Browser-JS re-confirm (the gating is front-end — the API path can't prove it)

Drove the real preview (awaiting async renders):

- **Web App:** frontend field **shown**, consequence hidden.
- **API-only:** frontend field **hidden**, consequence **shown** — *"Frontend: None — API-only projects have no frontend (the project type sets it to None)."*
- **Full API-only submit (Spring):** model `phaseA = { projectType: 'API-only', frontend: 'None' }`; `defaultsApplied` records `frontend=None` ("API-only projects have no frontend…"); Screen-1 note shows *"Defaults applied (shown, ADR-004): frontend=None …"*; blueprint header shows **`API-only`**; the chip shows **`Frontend: None`**.
- **Switch back to Web App:** the frontend field is **re-shown**.
- **The wizard never displays `API-only + React`.**

A screenshot (Screen 1 under API-only) confirms the frontend question is gone, replaced by the consequence note, with the recorded-default note at the bottom — both ADR-004 surfaces visible.

---

## 5. Wizard-driven API-only live boot (closes the wizard→running-app loop)

Drove the wizard end-to-end for **Spring API-only** on Postgres (`Day16Api`, `POST /api/settings` API-only → entities → generate), then `docker compose up --build`. The wizard generated **no frontend** (`frontend/` absent; model `frontend=None`); `docker compose config` valid with **only `db` + `backend`**; only two containers started.
```
GET  /api/health            → {"status":"ok","app":"Day16Api"}
(Flyway: Successfully applied 2 migrations … v2 ; Started … in 10.9s)
POST /api/tickets  {"title":"Wizard api-only","code":"W-1","priority":2,"done":false}
 → 201  {"id":1,...,"ownerId":1,...}
GET  /api/tickets/1         → 200
GET  http://localhost:3000/ → HTTP 000   (refused — NO frontend container)
```
**A wizard-chosen API-only produced a running app** — no frontend, CRUD round-trips, owner-scoped, nothing dangling on `:3000`. (This is byte-identical to the Day-15 Spring api-only boot by the UI==CLI proof; the value added here is proving the *wizard path* itself yields a running app.) Torn down with `-v`.

---

## 6. ADR / Law compliance

- **ADR-001 (no AI):** grep of `src/core` + `src/plugins` → **NONE** (no `fetch`/`axios`/`openai`/`anthropic`/`api_key`).
- **ADR-002 (file separation):** no generation-logic change; `two-stacks`/`python:demo` re-confirm developer files created-once.
- **ADR-003 (determinism):** Web-App a literal bypass (20 frozen, CLI **and** fresh wizard); API-only reproduces the Day-15 baselines via the recorded-default path.
- **Law 25 (core neutral):** `projectType` is a neutral model value; the type↔frontend constraint is a **generic project-shape rule already in core** (Day 15); the wizard's **hide-frontend-when-API-only** lives in `ui/index.html` only (grep confirms no `onTypeChange`/`frontendConsequence` in `src/core`/`src/plugins`). **`server.ts` untouched** (0 `projectType` refs); `buildManifest` (`regen.ts`) untouched; the `TIMESTAMPTZ` JSDoc in `core/database.ts` untouched.
- **ADR-004 (choices shown):** the type is shown (blueprint header); the forced `frontend=None` is shown **three ways** — the model's recorded default (Screen-1 note), the consequence note at selection, and the None blueprint chip. Never silent.

---

## 7. Cleanup

The wizard-driven boot torn down `-v` (**0 containers, no residue**); the `Day16Api` project dir removed (after an OS-handle retry — the recurring lingering-handle thread from Days 14/15, benign); **`.claude/launch.json` (preview scaffolding) recreated for the boot and REMOVED again** (closing the accumulating-scaffolding thread — it is not in the repo). No stray `.mjs`. `output/{DemoApp,TeamTracker,arA}` pre-date this session.

---

## 8. Scope — held

**In scope, done:** the `API-only` wizard option; the explicit recorded-default conditional; the hide-frontend gating (re-evaluates on type change; never shows `API-only + React`); ADR-004 visibility (header + None chip + recorded default + consequence); 20 Web-App frozen + guard-the-guard; UI==CLI for API-only across all five stacks; the wizard-driven boot.

**Deliberately out:** new generation logic / stacks / databases / types / style options; rich frontend generation; any server change. No re-baselining of any of the 20 Web-App hashes or the Day-15 api-only baselines.

---

## 9. What Day 17 picks up

**Day 17 — optional-integrations branch: design + first integration.** Design the **"need X? → how? → config?"** wizard pattern and implement ONE integration end-to-end (pick the cleanest — e.g. email; or AI **as a detachable hook** the *generated* app can use, never AI in Thraksha's generation path — ADR-001). Prove the branch is deterministic: **"no" changes nothing** (the 20 Web-App hashes stay frozen — the literal-bypass discipline again); **"yes" adds the integration's wiring** deterministically (twice-identical). Same backstop; same shown-not-hidden discipline.

---

**Day 16 verdict:** the project-type mechanism is wired into the wizard and proven across all five stacks. `projectType` is selectable (Web App / API-only); selecting API-only hides the frontend question and forces `frontend=None`, shown three ways (never silent — no visible `API-only + React`). A fresh untouched wizard reproduces all 20 Web-App hashes (guard-the-guard confirmed); wizard-driven API-only output is byte-identical to the Day-15 CLI baselines across all five backends (UI==CLI); and a wizard-chosen Spring API-only booted live with no frontend. The deliberate **recorded-default mechanism** (submit `React` → model records the None default → the canonical `97aef817…` baseline) is documented here for Day 20; the `1fc7f87c…` sibling is valid but not the wizard's output. Server and engine untouched. **Day 17 opens the optional-integrations pattern.**
