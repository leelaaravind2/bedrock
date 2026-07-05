# Day 10 — End-of-Day Report: Go Step 3 (dropdown + live boot both databases) — the Go arc complete

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new work, no coding-style engine.
**Status: DONE — Go is a fully proven fifth peer. It is selectable in the UI dropdown (routes UI==CLI), and a Go project booted live on BOTH PostgreSQL and MySQL — migrations, CRUD across relationships, and FK enforcement all work, and the Day-9-deferred MySQL runtime-type behavior (`TINYINT(1)`→bool, `DATETIME`→time) is confirmed. No bug surfaced; the full 20-hash matrix is intact.**

Plan: [`docs/daily/day-10-plan.md`](day-10-plan.md). Final step of the 3-step Go recipe (Days 8–10). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), Law 25 (core neutral).

**Go was born after relationships and MySQL already existed, and it reached full peer status — five capabilities, two databases, live on real databases — mostly by inheriting the seams and representations Week 1 built. The clearest demonstration yet of the compounding payoff of the architecture: the fifth backend needed no new core mechanism.**

---

## 1. What Day 10 closed

- **Dropdown wiring:** `<option value="Go">Go</option>` added to `ui/index.html`; the `ui:demo` dropdown-proof extended to five stacks (Go baseline `d158529a…`). Go is selectable end-to-end and routes to the Go plugin. Front-end + demo only — no generation-logic change.
- **Live boot — Go on MySQL** (priority): booted against real `mysql:8`; cleared the Day-9-deferred runtime-type check.
- **Live boot — Go on Postgres:** Go's first live run, booted against real `postgres:16`.

The two files changed this session — `ui/index.html` (a UI asset) and `src/ui-three-stacks-demo.ts` (a demo script) — are **not** part of any generated project, so generation output is byte-identical.

---

## 2. THE 20-HASH MATRIX — intact (blocking proof)

Re-generated from a clean rebuild. **All 20 byte-identical to their recorded values, all deterministic** — no template was touched this session, so nothing moved:

| Database | Model | Spring | Express | FastAPI | Django | **Go** |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` | `a437a302…` | `dca2254f…` | `68601cc5…` | **`d158529a…`** (frozen) |
| Postgres | TeamTracker | `9e01210c…` | `dca2b4a7…` | `6d422010…` | `e509309c…` | **`6aea8b04…`** |
| MySQL | DemoApp | `3112d3f7…` | `d4b57b52…` | `cd87d6e3…` | `8b07a1b2…` | **`9ff40acb…`** |
| MySQL | TeamTracker | `4c4640ba…` | `bfa4a536…` | `5c788c70…` | `3b3e6a6f…` | **`7408a3e2…`** |

16 non-Go: frozen (16/16, zero mismatches). Go's four: byte-identical to Day-9 values, twice-identical. No bug forced any re-baseline.

---

## 3. Dropdown — Go selectable, all five route UI==CLI

`ui:demo` drives the real UI server for each dropdown value and checks the generated output equals both the recorded baseline and the CLI/engine hash:

```
dropdown "Spring Boot" -> 010098cd…  (UI == CLI OK)
dropdown "Express"     -> a437a302…  (UI == CLI OK)
dropdown "FastAPI"     -> dca2254f…  (UI == CLI OK)
dropdown "Django"      -> 68601cc5…  (UI == CLI OK)
dropdown "Go"          -> d158529a…  (UI == CLI OK)
RESULT: PASS — one model -> Spring/Express/FastAPI/Django/Go via the dropdown; UI == CLI for all five.
```

The "Go" value routes to the Go plugin and the UI path equals the engine path; the other four are unaffected. (Routing needed no server change — `backend` is an opaque string, no allow-list; `availableBackends()` → `Spring Boot, Express, FastAPI, Django, Go`.)

---

## 4. Live boot — Go on MySQL (the Day-9 deferral, CLEARED)

Booted the generated Go + MySQL TeamTracker via `docker compose up --build` (`mysql:8` + Go backend). Backend log: `Applied migration V1__init … V5__create_comments`, `Seeded default user "admin"`, `listening on :8080`.

**Functional + runtime-type test (HTTP, Basic `admin:admin123`):**
- **CRUD across the chain:** Team → Application(`teamId`) → Ticket(`applicationId`,`teamId`,`done:true`) → Comment(`ticketId`), all `201`.
- **Relationships round-trip:** `GET /api/tickets/1` → `applicationId:1, teamId:1`.
- **`TINYINT(1)` → bool (deferred check):** `done` returns **`true`** — a JSON boolean, **not** `1`. `database/sql`'s `driver.Bool` conversion works. ✅
- **`DATETIME` → `time.Time` (deferred check):** `createdAt` = **`"2026-07-01T17:18:55Z"`** — a valid RFC3339 timestamp; `parseTime=true` (Go MySQL DSN token) honored. ✅
- **Insert-then-select / `LastInsertId` path (Day-9 codegen) live:** create + update round-trips return the stored row (update via update-then-select, so a no-op update still returns the row).
- **FK enforcement:** `POST` a Ticket with `teamId:999999` → **`Error 1452 (23000): … a foreign key constraint fails (fk_tickets_team … REFERENCES teams (id))`** — InnoDB enforces the FK. ✅

Every runtime fact Day 9 could not prove from generation is now confirmed by a real boot.

---

## 5. Live boot — Go on Postgres (Go's first live run)

Booted the generated Go + Postgres TeamTracker via `docker compose up --build` (`postgres:16` + Go backend). Migrations `V1…V5` applied, admin seeded, listening.
- **CRUD chain + relationships round-trip:** Team → Application → Ticket → Comment created; `GET /api/tickets/1` → `applicationId:1, teamId:1`; `done:true` (native `BOOLEAN`), `createdAt` a timestamp (`TIMESTAMPTZ`).
- **Update round-trip** (Postgres `RETURNING` path): `done:false`, `updatedAt` advanced.
- **FK enforcement:** bad `teamId` → **`pq: … violates foreign key constraint "fk_tickets_team"`**. ✅

Both databases booted; both PASS.

---

## 6. Zero bugs — the dividend of Day-8/9 compile discipline

**No bug surfaced in either boot; no template fix was needed** — both Go projects ran correctly on the first attempt. This is a direct payoff of the static discipline: the Go code was compile-verified (`go build ./...`) on Day 8 (DemoApp) and Day 9 (TeamTracker, both dialects), so the deterministically-generated code actually runs. (Contrast earlier live days that did surface real bugs — Day 4's FastAPI passlib / Django contenttypes — which were fixed and baked into the frozen baselines.) Live artifacts (images, containers, volumes) were torn down (`compose down -v`); they never touched the deterministic generation path.

---

## 7. Honest live-coverage table (all five backends)

Which backend has been booted live on which database, across the whole project so far:

| Backend | PostgreSQL — live | MySQL — live | Notes |
|---|---|---|---|
| Spring | ❌ never booted | ❌ generation-proven | relationship mechanism-A **family-proven** via FastAPI/Express (Day 4); MySQL static-dialect-proven (Day 5b) |
| Express | ✅ Day 4 | ✅ Day 6 | booted on both |
| FastAPI | ✅ Day 4 | ❌ generation-proven | MySQL static-dialect-proven (Day 5b) |
| Django | ✅ Day 4 | ❌ generation-proven | MySQL static-dialect-proven (Day 5b) |
| **Go** | ✅ **Day 10** | ✅ **Day 10** | **booted on both**; runtime-type deferral cleared |

**Honest standing residuals (unchanged from the Week-1 summary, restated):** Spring has never been booted live (static + family-proven); FastAPI/Django/Spring have not been booted on **MySQL** (generation + static-dialect-proven, not run). Go and Express are the two backends proven live on both databases. These are candidates for a future spot-boot pass, not blockers — every backend's mechanism is live-proven by a family member.

---

## 8. ADR / Law compliance

- **ADR-001 (no AI):** no AI/network in the generator or the Go plugin.
- **ADR-002 (file separation):** intact — no generation occurred that could touch developer files; the two changed files are a UI asset and a demo script.
- **ADR-003 (determinism):** all 20 combinations twice-identical; live-run artifacts torn down, never touching generation.
- **Law 25 (core neutral) + interface unchanged:** `src/core` not modified (its one `TIMESTAMPTZ` is the JSDoc example — left as-is); `BackendPlugin` keeps its five members; Go is registered by the composition layer only.

---

## 9. The Go arc (Days 8–10) — complete

| Day | Step | Delivered | Hashes |
|---|---|---|---|
| **8** | 1 | Go `BackendPlugin` peer; multi-user, file-separated entity CRUD on Postgres **via the seam**; runnable shell; compiles | Go/DemoApp/Postgres `d158529a…` (5th gate) |
| **9** | 2 | belongs-to relationships + MySQL through the seam (reusing `RelationshipSpec`, `SqlDialect`, `runtime.supportsReturning`); both dialects compile | Go/TeamTracker/PG, Go/DemoApp/MySQL, Go/TeamTracker/MySQL |
| **10** | 3 | dropdown wiring + **live boot on both databases**; runtime-type deferral cleared | (all four unchanged — zero-bug boot) |

Go needed **no new core interface** across the whole arc — it consumed the backend-plugin seam (Path-A), the database-provider seam (Day 5a), the relationship model representation (Day 1), and the runtime-SQL fact (Day 6). A fifth stack, added additively.

**Platform state now:**
- **5 backend stacks** — Spring, Express, FastAPI, Django, **Go**.
- **2 databases** — PostgreSQL, MySQL — behind a clean provider seam.
- **Real relationships** (belongs-to FKs) across all five stacks, both databases.
- **20-hash matrix** (5 backends × 2 databases × 2 models), all deterministic and frozen/recorded.
- **Live-proven** on real databases: relationships (Day 4), MySQL (Day 6), and now Go on both (Day 10).

---

## 10. Scope — held

**In scope, done:** Go dropdown wiring (UI==CLI for five stacks); Go live boot on MySQL (deferral cleared) and Postgres; 20-hash matrix intact; zero-bug boot.

**Deliberately out:** the **coding-style engine (Days 11–14)**; MongoDB; multiple databases per project; more backends/frontends. Not started.

---

## 11. What's next — Days 11–14: the deterministic coding-style engine

The Go arc closes Week-2's first thread. Next is the capability the user specifically asked for: a **coding-style engine** — a post-setup screen where the developer picks style options the generator applies **deterministically** (ADR-003 preserved — deterministic switches, never probabilistic "code personality"):
- **Day 11** — design + first option: **naming convention** (camelCase / snake_case).
- **Day 12** — **formatting** options (indentation, quote style).
- **Day 13** — **architecture depth** (e.g. simple vs. layered controller/service/repository) — changes *what files* are generated.
- **Day 14** — wire the style-selection screen into the wizard; prove all combinations deterministic; **default-style output must keep all 20 baselines frozen**.

The 20-hash matrix is the regression backstop: the default style must reproduce every current hash byte-for-byte, so style is provably additive.

---

**Day 10 verdict:** Go is complete — selectable in the dropdown (UI==CLI for all five stacks) and live-proven on both PostgreSQL and MySQL, with the Day-9-deferred runtime-type behavior (`TINYINT(1)`→bool, `DATETIME`→time) confirmed and MySQL FK enforcement (errno 1452) shown. No bug surfaced; the full 20-hash matrix is intact. The platform now generates 5 backends × 2 databases with real relationships, deterministic and live-proven. The Go arc is **done**; Week 2 turns to the coding-style engine.
