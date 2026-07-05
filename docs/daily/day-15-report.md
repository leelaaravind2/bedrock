# Day 15 — End-of-Day Report: API-only project type — the type mechanism + a coherent Spring frontend-subtraction (Week 3 opens)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no new type/subtraction work. The only code touched is gate/test scaffolding + cleanup.
**Status: DONE — `projectType` now supports `'API-only'` (a literal Web-App bypass — all 20 hashes frozen). API-only implies no frontend (model-enforced, recorded). Spring — the ONLY stack that scaffolds a frontend — subtracts it coherently, and BOTH variants booted live on real Postgres: Spring web-app first (clearing a standing Week-1 residual — Spring's first-ever live boot), then Spring API-only (the frontend-subtracted project stands up, CRUD round-trips, nothing dangles on `:3000`). The four already-backend-only stacks are formalized, not subtracted.**

Plan: [`docs/daily/day-15-plan.md`](day-15-plan.md). Opens Week 3 (project types). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), ADR-004 (choices shown), Law 21 (standalone), Law 25 (core neutral).

**The type mechanism threads through as a literal Web-App bypass (reused `projectType`, unchanged string → 20 hashes frozen by construction). The one stack where API-only actually changes the output is Spring; the sequenced boot proves the subtraction is coherent at runtime without letting a first-time-Spring issue and an API-only issue masquerade as each other.**

---

## 1. What was built (Session 2, verified this session)

- **`projectType` extended** ([`project-model.ts`](../../generator/src/core/project-model.ts)) to `'Web App' | 'API-only'` (default `'Web App'` — the *exact* string kept, which is the literal bypass that freezes the 20 hashes). `restoreProjectModel` defensively defaults `projectType` for hand-edited snapshots.
- **The type↔frontend constraint** (core, a **generic project-shape rule** — Law-25-legal like the `multiUser`/`auth` normalization): `projectType='API-only'` ⟹ `frontend='None'`, **recorded in `defaultsApplied`** (ADR-004 — shown, never silent). Web-App leaves frontend as chosen.
- **Spring frontend subtraction** ([`spring-plugin.ts`](../../generator/src/plugins/spring/spring-plugin.ts)) — keyed on `frontend === 'None'`, a **literal bypass** otherwise. Transforms run only on the API-only path (Web-App = no transform = byte-identical):

| Touch-point | Web-App | API-only |
|---|---|---|
| `frontend/` subtree (8 files) | generated | **omitted** (walk skips `frontend/**`) |
| compose `frontend:` service (nginx, `3000:80`) | present | **removed** |
| compose header ("full stack … React (nginx)") | present | **"backend-only API … Spring Boot"** |
| README frontend refs (stack row, `:3000`, "frontend page", layout tree, `cd frontend && npm …`) | present | **rewritten to an API-only run** |
| `displayName` (cosmetic, no hash) | `Spring Boot + React + PostgreSQL` | unchanged (UI label only) |

- **The four already-backend-only stacks (Express/FastAPI/Django/Go): no shell work** — API-only changes only the manifest (they had no frontend to subtract).

### The recon findings that shaped it (Session 1)
- **The fork is asymmetric.** Only Spring scaffolds a frontend (folder + nginx compose service + README refs); Express/FastAPI/Django/Go are **already coherent backend-only** (their `frontend: 'React'` answer is nominal — it generates nothing). So Spring is the *only* stack where API-only changes output, and the only one that proves "type decides what is generated."
- **Two corrected premises:** (a) **the manifest trap is avoided, not worked around** — `projectType` is *already* a rendered manifest line, so reusing it keeps Web-App byte-identical by construction (no new line, no gated emission); (b) **`database:'None'` does not exist** — `selectDatabaseProvider` throws for anything but PostgreSQL/MySQL, so there was no proven subtraction pattern to mirror; the Spring subtraction was built fresh on the token-substitution mechanism.

---

## 2. THE BACKSTOP — 20 Web-App hashes byte-identical (proof)

`npm run day15:gate` from a **clean rebuild** — **exit 0, zero FAIL. All 20 Web-App hashes byte-identical** (Spring's 4 especially — the `frontend !== 'None'` literal bypass held):

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ | `d158529a…` ✅ |
| Postgres | TeamTracker | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ | `6aea8b04…` ✅ |
| MySQL | DemoApp | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ | `9ff40acb…` ✅ |
| MySQL | TeamTracker | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ | `7408a3e2…` ✅ |

### Guard the guard — the 20 gate digests match the source reports
The 20 baked into `src/day15-gate.ts`, diffed against sources (16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md)): **`16/16` non-Go + `4/4` Go present, full diff EMPTY (20 == 20).**

### The four backend-only stacks — API-only = Web-App ± the manifest only
For Express/FastAPI/Django/Go, the API-only output differs from the Web-App twin in **exactly** the `GENERATION-MANIFEST.txt`, in the two Phase-A lines (`projectType: Web App→API-only`, `frontend: React→None`) + the recorded ADR-004 default line — **no code/compose/README change** (they had no frontend). Vacuous to boot, verified by hash:
```
Express  DemoApp api-only  c5210f732522aca1cd1dbbcbd82dbadc47e6b9af781b40ab07520c28d9e99645
FastAPI  DemoApp api-only  46b3fda4db97ffdd492f945d2df2711be7a158fd513bbdcee07b36e741109e3b
Django   DemoApp api-only  5634e7ce00a3db7d964b43253016660e3a89705616b097d7b4bb17f81ba97cd1
Go       DemoApp api-only  5d67f242d3ad71acadf5682133889e678e9ee2b3c257a1aad7790cffe1d41502
```

### Spring API-only baselines (twice-identical; 8 frontend files removed, 36→28)
```
Spring DemoApp     api-only  97aef817192e9537a12fd5ad069616623e7488aa3fc07da3fd7be4442fae74e3
Spring TeamTracker api-only  190594dd857cb0a2e29d03b919f767b82c5383e6e2052756a9e2cc3e92e17f3b
```
**No regressions:** day12/13/14 gates + `ui:demo` / `two-stacks` / `python:demo` all PASS on the current build.

---

## 3. THE HEADLINE — the sequenced Spring boot on real Postgres

Booted in the mandated order (`postgres:16-alpine` + Spring, `docker compose up --build`, HTTP Basic `admin:admin123`), each torn down with `-v`, so a failure would be diagnosable — never letting a first-time-Spring issue and an API-only issue masquerade as each other.

### 3a. Spring WEB-APP first — does base Spring even come up? (YES — a standing residual CLEARED)
`docker compose config` valid; all three containers started (`db`, `backend`, **`frontend`**). Backend log: Flyway `Successfully applied 2 migrations … v2`, `Tomcat started on port 8080`, `Started DemoAppApplication in 7.481 seconds`.
```
GET  /api/health              → {"app":"DemoApp","status":"ok"}
GET  http://localhost:3000/   → 200        (frontend served — full stack wired)
POST /api/tickets  {"title":"Fix login","code":"BUG-1","priority":3,"done":false}
 → 201  {"id":1,...,"ownerId":1,"createdAt":…,"updatedAt":…}
GET  /api/tickets/1           → 200        (round-trips, owner-scoped)
```
**Spring has never booted live in the whole project — this is its first-ever live boot, full-stack (db + backend + frontend), migrations + CRUD + owner scoping. The standing Week-1 residual is cleared.** (A real milestone, stated plainly — and the prerequisite that makes the next step a clean test of the subtraction.)

### 3b. Spring API-only second — did the subtraction stay coherent at runtime? (YES)
`docker compose config` **valid, services = `db` + `backend` only, `0` frontend references**; only **two** containers started (no `frontend`). Backend log: migrations applied, Tomcat up, `Started DemoAppApplication in 8.454 seconds`.
```
GET  /api/health              → {"app":"DemoApp","status":"ok"}
POST /api/tickets  {"title":"API only","code":"BUG-9","priority":5,"done":true}
 → 201  {"id":1,...,"ownerId":1,...}
GET  /api/tickets/1           → 200
GET  http://localhost:3000/   → HTTP 000   (refused — NO frontend container, no dangling reference)
running containers: springapi-backend-1, springapi-db-1   (no frontend)
```
**The frontend-subtracted Spring project stands up: `db + backend` compose comes up, migrations apply, CRUD round-trips, and nothing dangles on `:3000`.** Because web-app booted first, this is unambiguously a test of the *subtraction* — it held.

---

## 4. Static coherence re-confirm (the absent ≠ coherent guard)

The gate's Step 3 checks passed (`noFrontendDir`, `noFrontendService`, `noPort3000`, `composeHasDbBackend`, `readmeClean`), and `docker compose config` parsed clean above. The generated Spring API-only `docker-compose.yml` — only `db` + `backend`, backend-only header, no `./frontend`, no `:3000`:
```yaml
# DemoApp — backend-only API: PostgreSQL + Spring Boot.
...
services:
  db:
    image: postgres:16-alpine
    ...
  backend:
    build: ./backend
    ...
    ports:
      - "8080:8080"

volumes:
  db-data:
```
The README describes an API-only run (no frontend refs): *"A multi-user-ready backend API shell (no frontend)"*, the stack table has no Frontend row, only the backend health URL, and the project-layout tree is `db + backend` with `└── backend/` as the last entry.

---

## 5. ADR / Law compliance

- **ADR-001 (no AI):** grep of `src/core` + `src/plugins` for `fetch`/`axios`/`openai`/`anthropic`/`api_key`/`require('http(s)')` → **NONE** (the `net/http` / Spring HTTP occurrences are generated-template strings — same adjudication as prior days).
- **ADR-002 (file separation):** the subtraction omits only Thraksha-owned shell files; developer files unaffected — `two-stacks`/`python:demo` re-confirm.
- **ADR-003 (determinism):** Web-App is a **literal bypass** (reused `projectType='Web App'`, unchanged output → 20 hashes frozen); API-only twice-identical.
- **Law 25 (core neutral):** `projectType` is a neutral model value; the type↔frontend constraint is a **generic project-shape rule** in the kernel (like `multiUser`); the **per-stack frontend subtraction lives in the Spring plugin**, not core (grep confirms no `stripComposeFrontend`/`apiOnlyReadme` in `src/core`). `buildManifest` (`regen.ts`) is **untouched** (no new manifest line); the `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched.
- **Law 21 (standalone):** the API-only project is ordinary Spring — it booted under `docker compose` with no Thraksha markers and no dangling frontend refs (§3b).
- **ADR-004 (choices shown):** `projectType` renders in the manifest (reused line); the `frontend=None` normalization is recorded in `defaultsApplied`.

---

## 6. Cleanup

Both boots torn down with `docker compose down -v`; **0 containers, no Spring residue**. Pre-flight had cleared a stale `demoapp` compose project (a db + backend + **frontend** left running 17h from a prior session) before booting. The generated `spring-web` / `spring-api` project dirs were removed. `output/{DemoApp,TeamTracker,arA}` pre-date this session.

---

## 7. Scope — held

**In scope, done:** `projectType='API-only'` (literal Web-App bypass); the type↔frontend constraint (recorded); the coherent Spring frontend subtraction; 20 Web-App hashes frozen + guard-the-guard; API-only baselines (Spring + the four formalized stacks); the sequenced Spring boot (web-app residual cleared, api-only coherence proven); static coherence.

**Deliberately out:** the wizard type-selection UI (Day 16); new backends/databases/types/style options; rich frontend generation; `simple` for Spring/Django/Go. No re-baselining of any of the 20 Web-App hashes.

---

## 8. What Day 16 picks up

**Day 16 — API-only: wizard + prove across all stacks.** Wire `projectType` into the wizard (a type selection that **gates the frontend question** — API-only forbids the `API-only + React` pairing, mirroring Day 14's applicability gating), and prove API-only end-to-end across all five backends (four are already backend-only; Spring is the one that subtracts). Web-App baselines unaffected — the 20-hash matrix remains the non-negotiable backstop.

---

**Day 15 verdict:** the project-type mechanism is real. `projectType` gained `'API-only'` as a literal Web-App bypass (all 20 hashes frozen, guard-the-guard confirmed); API-only implies no frontend (model-enforced, ADR-004-recorded); and Spring — the only stack with a frontend — subtracts it coherently. The sequenced boot is the proof: **Spring web-app booted first (clearing its standing Week-1 residual — Spring's first live boot, full-stack), then Spring API-only booted with the frontend subtracted** — db + backend up, migrations applied, CRUD round-tripped, `:3000` refused, no dangling frontend. The four already-backend-only stacks are formalized, not subtracted (byte-identical ± two manifest lines). Written up here; **Day 16 wires it into the wizard and proves it across all five.**
