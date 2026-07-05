# Day 10 — Plan: Go Step 3 (dropdown wiring + live boot on BOTH databases)

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Goal: complete the Go arc — (a) wire Go into the UI backend dropdown so it is selectable end-to-end, and (b) boot a Go project live on BOTH PostgreSQL and MySQL, proving Go actually runs (migrate, CRUD across relationships, FK enforced) and clearing the Day-9-deferred Go+MySQL runtime-type check (`TINYINT(1)`→bool, `DATETIME`→`time.Time`).**

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md), [`docs/adr/`](../adr) (ADR-001/002/003/005, Laws 25–28), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 10), the Day-8/9 plans+reports, [`week-01-summary.md`](week-01-summary.md), and the prior dropdown wiring (MySQL, Day 6) + live boots (relationships Day 4, MySQL Day 6).

**This is the last step for Go. It changes no generation logic — the dropdown is one UI option (routing already resolves "Go"), and the live boot runs the already-frozen generated projects. The only reason a Go hash could move is an in-template bug-fix surfaced by the boot — scoped so the frozen gates hold.**

---

## 0. Where Go stands (entering Day 10)

Go is a full peer at the **generation** level (Days 8–9): entities, CRUD, multi-user, belongs-to relationships, both databases — 4 Go hashes, all deterministic, and **both dialects compile** (`go build ./...` in a golang:1.22 container). What remains: it is not yet **selectable in the UI**, and it has never been **run** (only compiled). Day 10 closes both, and confirms the one honest gap Day 9 flagged — the MySQL runtime type behavior.

---

## 1. Dropdown wiring (front-end + routing only)

- **Current:** [`ui/index.html:207-212`](../../generator/ui/index.html) — the backend `<select>` offers `Spring Boot / Express / FastAPI / Django` as `<option value="X">X</option>`, where the value is the **registry key**.
- **Change:** add one line — `<option value="Go">Go</option>`. That is the entire wiring.
- **Routing already works:** the value flows to `settings.backend` → `POST /api/settings` → `createProjectModel(body)` (which treats `backend` as an **opaque string** — Law 25, **no allow-list**) → `selectBackendPlugin(model)` → `createGoPlugin`. Confirmed: the server has no hardcoded backend list, and `availableBackends()` already includes Go (Day 8).
- **Dropdown proof (UI==CLI):** extend the `ui-three-stacks-demo` (the demo that POSTs each dropdown value through the real server and checks the output hash equals the CLI hash) to include **Go** with baseline `d158529a…` — proving the "Go" dropdown value routes to the Go plugin and the UI path equals the engine path, exactly as the other four are proven.
- **No generation-logic change; no hash impact.** `index.html` is a UI asset, not part of any generated project (like the MySQL option in Day 6).

---

## 2. Live boot — Go on PostgreSQL (Go's first live run)

**Vehicle:** the generated project's own `docker compose up --build` (db + backend services, port 8080, healthcheck) — the most faithful boot, mirroring Day 4. Model: a **TeamTracker-shaped** project (Team → Application → Ticket → Comment, multi-user), Go + PostgreSQL. Fallback if compose networking is fiddly on Docker Desktop: build the Go binary in a `golang:1.22` container and run it against a `postgres:16` container (the Day-6 shape).

**Functional test (HTTP; Basic auth `admin:admin123` from the seeded user):**
1. **Build + boot + migrate:** compose builds the Go image (multi-stage Dockerfile), starts Postgres, waits healthy; the Go `main.go` applies migrations `V1__init … V5__create_comments` on startup and seeds admin.
2. **Health:** `GET /api/health` → `{"status":"ok",...}` (public, no auth).
3. **CRUD across the relationship chain:** create `Team` → `Application` (with `teamId`) → `Ticket` (with `applicationId`, `teamId`, `done`) → `Comment` (with `ticketId`).
4. **Parent ids stored/returned:** `GET /api/tickets/1` → `applicationId` and `teamId` round-trip.
5. **FK enforcement:** `POST /api/tickets` with a non-existent `teamId` (e.g. 999999) → rejected (Postgres FK violation surfaced as an error), proving the DB enforces the FK, not just declares it.
6. **Runtime types (Postgres, low-risk but verified):** `done` returns as a JSON boolean; `createdAt` as an ISO timestamp — `lib/pq` maps `BOOLEAN`→bool and `TIMESTAMPTZ`→`time.Time` natively.

---

## 3. Live boot — Go on MySQL (clears the Day-9-deferred runtime-type risk)

**Vehicle:** the same, with the MySQL provider (`docker compose up --build` → `mysql:8` + Go backend). Model: TeamTracker, Go + MySQL.

**Same functional test as §2** (build/boot/migrate, CRUD chain, parent ids, FK), **PLUS the explicit runtime-type verification Day 9 deferred** — all observable in the HTTP responses:
- **`TINYINT(1)` → proper `bool`:** create a `Ticket` with `done:true`, `GET` it → the JSON `done` is `true` (a boolean), **not** `1`. If `database/sql`'s `driver.Bool` conversion failed, the scan would 500 — a clean boolean round-trip proves it.
- **`DATETIME` → `time.Time` (parseTime working):** `GET` a `Ticket` → `createdAt`/`updatedAt` are valid RFC3339 timestamps. If `parseTime=true` (set in the Go MySQL DSN token) weren't honored, the scan into `time.Time` would fail — a valid timestamp proves it.
- **MySQL FK enforcement:** `POST` a `Ticket` with a bad `teamId` → **InnoDB rejects it (errno 1452, `ER_NO_REFERENCED_ROW_2`)**, surfaced by the app — the MySQL analogue of the Day-6 Express proof.
- **Insert-then-select path exercised:** every create/update runs Go's MySQL `Exec`+`LastInsertId`+select-back (no `RETURNING`), so a correct round-trip also proves that Day-9 codegen live.

This is the honest verification Day 9 explicitly deferred: the runtime-type facts a generation hash could not prove are confirmed by a real boot.

---

## 4. Realistic scope / coverage (honest, like Day 4 / Day 6)

**Goal: boot Go live on BOTH databases.** If time is tight, prioritize by value:
1. **Go + MySQL first (higher value)** — it clears the deferred runtime-type risk (bool/datetime) *and* exercises the MySQL insert-then-select path + FK 1452. This is the boot that proves something not already known.
2. **Go + Postgres second** — Go's first live run, but lower-risk (lib/pq is mature; `BOOLEAN`/`TIMESTAMPTZ` are native). If squeezed, a lighter Postgres boot (boot + migrate + one CRUD round-trip + FK) is acceptable.

**State the actual coverage honestly in Session 3** — which stack(s) booted, on which database(s), and what each proved — exactly as Day 4 (Spring not booted; mechanism-A family-proven) and Day 6 (only Express booted on MySQL) did. No over-claiming: if only one boots, say so.

---

## 5. Bug-handling & the frozen gates (precise)

Every live day has surfaced real bugs (Day 4: FastAPI passlib / Django contenttypes; earlier pre-baseline runs). Expect the Go boot may too — most likely in the run-only surface (Docker build details, DB-connection timing, migration application, the MySQL insert-then-select / FK / type-scan paths) since the Go **code** is already compile-verified.

**Any bug is fixed in-template, and the fix is scoped to protect the frozen gates:**

| Where the fix lands | Which Go hashes move | Allowed? |
|---|---|---|
| MySQL-runtime path (`supportsReturning=false` branch, MySQL tokens/DSN) | Go/DemoApp/MySQL + Go/TeamTracker/MySQL | ✅ re-record honestly |
| Relationship codegen (belongs-to) | Go/TeamTracker/Postgres + Go/TeamTracker/MySQL | ✅ re-record honestly |
| **Dialect-neutral shell** (Dockerfile, `main.go`, `db.go`, migrate runner) | **ALL 4 Go hashes incl. Go/DemoApp/Postgres** | ⚠️ see below |

- **Frozen, must NOT move:** the **16 other-backend hashes** and **Go/DemoApp/Postgres `d158529a…`**.
- **A dialect-neutral shell fix is the one case that would move Go/DemoApp/Postgres** (a shell file is in every Go project, DemoApp included). Preference: scope fixes to the dialect/relationship path so DemoApp/Postgres never moves. If a genuine neutral-shell bug makes a fix unavoidable (a broken Dockerfile must be fixed — shipping a broken shell to preserve a hash would be wrong), it is a **deliberate, documented re-baseline** of Go's shell-affected hashes, flagged loudly in the report with the reason — **never silent** — while the 16 non-Go gates stay frozen. This is judged unlikely because the Go shell already compiles (Days 8–9); the more probable fixes are dialect-scoped.
- **Determinism preserved:** live-boot artifacts (images, containers, DB rows) are runtime-only and torn down (`down -v`); they never touch the deterministic generation path. Any re-recorded Go hash is re-verified twice-identical.

---

## 6. Scope guard — explicitly OUT for Day 10

- **The coding-style engine (Days 11–14)** — naming/formatting/architecture-depth options. Not now.
- **MongoDB, multiple databases per project, more backends/frontends** — out.
- No change to generation logic beyond an in-template bug-fix (if the boot surfaces one); no change to the core, the model representation, or the other four plugins.

---

## 7. Done-conditions & proof

### 7.1 Session 2 must achieve
1. Add `<option value="Go">Go</option>` to `ui/index.html`; extend the dropdown-proof demo to include Go (UI==CLI, baseline `d158529a…`).
2. Boot Go live on **MySQL** (priority) — migrate, CRUD chain, parent ids, FK 1452, and the runtime-type checks (bool/datetime); and on **Postgres** — migrate, CRUD, FK. Capture evidence (logs / HTTP responses).
3. Fix any surfaced bug in-template, scoped to protect the frozen gates; re-record only the affected Go hash(es), twice-identical.
4. Keep the 16 other-backend hashes and Go/DemoApp/Postgres frozen (unless an unavoidable, documented neutral-shell re-baseline — §5).

### 7.2 Session 3 verification (blocking)
- **Frozen gates:** the 16 other-backend hashes + Go/DemoApp/Postgres `d158529a…` byte-identical. If a neutral-shell fix forced a re-baseline, it is documented with the reason and the new Go hashes recorded; the 16 non-Go gates are unmoved.
- **Full matrix deterministic:** all 20 combinations twice-identical; Go's four hashes recorded (unchanged unless a documented fix).
- **Dropdown:** "Go" selectable in the UI and routes to the Go plugin (UI==CLI for Go); other stacks' paths unaffected.
- **Live boot — evidence:** what actually booted (honest coverage table §7.3), migrations applied, CRUD + relationships functioned, FK enforced (Postgres violation / MySQL 1452), and — on MySQL — `done` a boolean and `createdAt` a timestamp (the deferred check, cleared).
- **ADR sweep:** no AI; file separation intact; core neutral / interfaces unchanged; JSDoc `TIMESTAMPTZ` left as-is.
- **Output:** `docs/daily/day-10-report.md`; note the Go arc complete and Day 11 = coding-style engine (Week 2).

### 7.3 Honest live-coverage table (to appear in the Session 3 report)

| Stack | Database | Booted live (Day 10) | Proves |
|---|---|---|---|
| Go | **MySQL** | ✅ (priority) | migrate, CRUD, relationships, FK (1452), **TINYINT(1)→bool, DATETIME→time** |
| Go | **Postgres** | ✅ (goal) | Go's first live run — migrate, CRUD, relationships, FK enforced |
| (Spring/Express/FastAPI/Django) | — | not re-booted | proven in Weeks 1 (Day 4/6); unchanged this Day |

(If only one Go boot completes, mark the other "not booted this Day — generation + compile-proven" and say so plainly.)

### 7.4 Definition of "Day 10 done"
Go is selectable in the UI dropdown and routes to the Go plugin; a Go project has booted live on at least MySQL (ideally both databases) — migrations apply, CRUD across relationships works, the FK is enforced, and the deferred MySQL runtime-type behavior (bool/datetime) is confirmed; the 16 other-backend gates and Go/DemoApp/Postgres stay frozen (or an unavoidable neutral-shell change is documented); the 20-hash matrix is accounted for. Go is a fully proven fifth peer. Written up in `docs/daily/day-10-report.md`.

---

## 8. Risk notes (for Session 2)

- **Frozen-gate protection is the discipline:** prefer dialect/relationship-scoped fixes (which move only Go's MySQL/TeamTracker hashes). Guard Go/DemoApp/Postgres — diff it after any template edit.
- **Docker build for Go** needs network (module downloads) at compose build time; the images (`postgres:16`, `mysql:8`, `golang:1.22`, `alpine`) are already local from prior days. Budget for the Go image build.
- **MySQL boot timing:** the compose healthcheck (`mysqladmin ping`) gates the backend (`depends_on: service_healthy`) — confirm the Go backend waits for it, and that `db.Open`'s `Ping` retries or the healthcheck ordering suffices; a connection-timing fix (if needed) is a neutral-shell change — handle per §5.
- **Runtime-type confirmation is the headline** — assert `done` is JSON `true/false` (not `1/0`) and `createdAt` is a timestamp, from a real MySQL response. Do not claim it from generation.
- **Honesty over completeness:** if only Go+MySQL boots, that still clears the deferred risk and is a complete, honest result — state the coverage plainly; do not imply a Postgres boot that did not happen.
- **Don't start Week 2** (coding-style) — Day 10 finishes Go and stops.
