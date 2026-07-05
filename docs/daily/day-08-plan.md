# Day 8 — Plan: Go as a fifth backend, Step 1 (plugin + entity CRUD on Postgres)

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Goal: add Go as a fifth backend plugin — a true peer implementing `BackendPlugin` — generating entity CRUD on PostgreSQL through the existing `DatabaseProvider` seam. Day 8 is Step 1 of the proven 3-step recipe (Days 8–10). Additive: every existing hash stays byte-identical; the core is not touched; `BackendPlugin` is implemented as-is.**

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md), [`docs/adr/`](../adr) (ADR-001/002/003/004/005, Laws 25–28), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Days 8–10), [`week-01-summary.md`](week-01-summary.md), and the existing plugins (Spring/Express/FastAPI/Django) + the `BackendPlugin`/`DatabaseProvider` seams.

**Go arrives *after* relationships and MySQL exist. To be a genuine peer it must eventually support entities + CRUD, multi-user, file separation, relationships (belongs-to FKs), and both databases through the seam. Days 8–10 build it up; Day 8 lays the foundation such that its baseline is a *lasting* gate, not a throwaway.**

---

## 1. Go stack choice (stated plainly)

Idiomatic, minimal, deterministic — standard library first, two small dependencies:

- **Language:** Go **1.22+** (needed for `net/http` method-aware routing).
- **HTTP / router:** the **standard library** — `net/http` with `http.ServeMux` 1.22 pattern routing (`mux.HandleFunc("GET /api/tickets/{id}", …)`). **No external web framework.** Minimal, idiomatic, zero-dependency routing.
- **Database access:** the **standard library `database/sql`** with the **`pgx` driver** (`github.com/jackc/pgx/v5/stdlib`) for Postgres. **Hand-written SQL** (no ORM) — Go is a *mechanism-A / hand-SQL* backend, exactly like Express. Postgres uses `$1` positional placeholders and `INSERT … RETURNING` for read-back. **The DDL comes from the `SqlDialect` seam** (`ctx.sql.*`), never hardcoded.
- **JSON:** `encoding/json` with struct tags.
- **Auth (Simple login):** HTTP Basic against the `users` table; password hashing via `golang.org/x/crypto/bcrypt` (matches the other stacks).
- **Migrations:** a tiny Go migration runner applying `migrations/V*.sql` in filename order once each, recording in `schema_migrations` — the Go equivalent of `migrate.js`/`migrate.py`. The V1 users table and the `schema_migrations` timestamp come from **provider tokens** (dialect-aware already).
- **Dependencies (whole project):** just **`pgx`** + **`x/crypto`**. No framework, no ORM.
- **Container:** multi-stage Dockerfile (`golang:1.22` build → slim runtime); `docker-compose.yml` assembled from provider tokens.

Rationale: this is the smallest genuinely-idiomatic Go web+DB stack, it keeps generation deterministic (fixed templates + fixed emission), and — because it hand-writes SQL against `database/sql` — it consumes the **same** `SqlDialect` DDL seam the other SQL stacks use, and will face the **same** MySQL runtime divergence (`$N`→`?`, no `RETURNING`) that the `runtime.supportsReturning` seam capability already solves for Express (Day 9 reuse).

---

## 2. Phasing across Days 8–10 (honest split)

The 21-day plan nominally lists Day 8 = "plugin + entity CRUD", Day 9 = "file separation + multi-user + relationships", Day 10 = "dropdown + live run". **I adjust one thing deliberately: multi-user owner scoping and file separation move into Day 8** (not Day 9). Reasoning:

- **Gate comparability (the decisive reason).** The four existing DemoApp gates are **multi-user + relationship-free + Postgres**. They stayed byte-identical through the relationships work (Days 1–3) and the MySQL work (Days 5–6) because relationships/MySQL are *additive*. If Go's Day-8 DemoApp output is **also** multi-user + relationship-free + Postgres, its Day-8 hash becomes a **real fifth gate** that will likewise stay frozen through Go's Day-9 relationships+MySQL work. A single-user Day-8 hash would instead be **transient** — owner scoping reshapes every query, table, and handler, so it would be superseded in Day 9 (wasted baseline + extra churn).
- **ADR-005 alignment.** Multi-user is foundational — it "touches everything" and is expensive to retrofit. Building the entity CRUD multi-user-ready from the first cut is truer to ADR-005 than adding owner scoping as a later layer.
- **File separation is structural (ADR-002).** The thraksha/developer split shapes the file layout; establishing it in Day 8 avoids reshaping (and re-hashing) Day-8 files in Day 9. The task's own constraints list ADR-002 as a Day-8 obligation.
- **It stays finishable.** "Multi-user, file-separated, single-entity CRUD on one database" is exactly the proven Step-1 size each existing backend was built at.

**The resulting split:**

| Day | Step | Scope | New Go hashes |
|---|---|---|---|
| **8** | 1 | Go plugin as `BackendPlugin` peer; **entity CRUD on Postgres via the seam**; **multi-user owner scoping**; **file separation** (thraksha/developer split, stable seam); validation; migration via `ctx.sql`; runnable Go shell; registry entry; additive Go provider tokens. **No relationships, no MySQL.** | **DemoApp / Go / Postgres** (the 5th gate) |
| **9** | 2 | **Relationships** (belongs-to FKs via the existing model representation) **+ MySQL** via the seam (reusing `runtime.supportsReturning` + Go MySQL driver tokens + `$N`→`?` handling, mirroring Express Day 6). Go generates TeamTracker + both databases. | TeamTracker/Go/PG+MySQL, DemoApp/Go/MySQL |
| **10** | 3 | **UI dropdown** ("Go" option) **+ live boot** (Go+Postgres and Go+MySQL): migrate, CRUD, relationships, FK enforced. | — (verification) |

Day 9 is well-sized: relationships codegen **plus** the Express-Day-6-equivalent MySQL runtime work for Go (placeholders + insert-then-select). Day 10 adds the dropdown and the live Docker boots.

---

## 3. Day 8 specifics — exactly what the Go plugin generates

Mirrors the FastAPI structure (explicit SQL + hand-written handlers + a thraksha/developer split), in idiomatic Go. Module path derived deterministically from the project slug.

### 3.1 Per-entity slice (`generateEntity`) — entity `Ticket`, multi-user
| File | Ownership | Contents |
|---|---|---|
| `internal/entities/ticket/ticket.go` | thraksha | struct + `json` tags + column metadata (field order = model order) |
| `internal/entities/ticket/store.go` | thraksha | `database/sql` data access: `FindAll(ownerID)`, `FindByID(id, ownerID)`, `Insert(data, ownerID)`, `Update(id, data, ownerID)`, `Remove(id, ownerID)` — `$N` placeholders, `INSERT/UPDATE … RETURNING`, owner-scoped `WHERE owner_id = $N` (ADR-005) |
| `internal/entities/ticket/validate.go` | thraksha | request-body validation (required / type / maxLength) — deterministic, mirrors the other stacks' DTO validation (ADR-004) |
| `internal/entities/ticket/handler_base.go` | thraksha | HTTP handlers (list/get/create/update/delete): JSON decode → validate → call the service → JSON encode; error→status mapping |
| `internal/entities/ticket/routes_base.go` | thraksha | registers `GET/POST/PUT/DELETE /api/tickets[/{id}]` on the mux, wired to the handler |
| `migrations/V{index+2}__create_tickets.sql` | thraksha | DDL entirely from `ctx.sql.*` (identity PK, column types, timestamps, owner_id via `bigInt()`, indexes) |
| `internal/entities/ticket/service.go` | **developer** | business logic; created once, then never regenerated — the stable seam (see §3.3) |
| `internal/entities/ticket/routes.go` | **developer** | custom routes; created once, then never regenerated |

### 3.2 Project shell (`generateProjectShell`)
`main.go` (load config → open DB → migrate → seed → build mux → register entities → `ListenAndServe :8080`); `internal/db/db.go` (open `database/sql` with the provider's Go driver token, DSN from env); `internal/auth/auth.go` (HTTP Basic against `users`, sets user id in context); `internal/config/config.go` (env config); `internal/migrate/migrate.go` (apply `V*.sql`, `schema_migrations` bookkeeping via the dialect token); `internal/seed/seed.go` (seed admin); `migrations/V1__init.sql` (users table from `__DB_USERS_TABLE_DDL__`); **`internal/entities/register.go`** (see §3.4); `go.mod` (tokenized module + pinned deps); `go.sum` (pinned — see §5); `Dockerfile`; `docker-compose.yml` (provider tokens); `.env.example`; `.gitignore`; `README.md`.

### 3.3 File separation (ADR-002) — the Go seam
Go has no inheritance, so the stable seam is a **Go interface + struct embedding**: the generated `handler_base.go` depends on a `TicketService` interface (defined in generated code); the developer's `service.go` provides the implementation by **embedding a generated base service** (which wraps the `store`) and may add/override methods. Regeneration rewrites `*_base.go`/`store.go`/`ticket.go`/migration; it **never** opens `service.go`/`routes.go`. Proof method identical to the other stacks: write hand logic into `service.go`, tamper a `*_base.go`, regenerate twice → developer file byte-identical, tampered marker gone.

### 3.4 The compiled-language difference (honest, not a defect)
FastAPI/Express **auto-discover** entity routers at runtime (filesystem scan + dynamic import). **Go is compiled and cannot import packages at runtime**, so the Go plugin emits a generated **`internal/entities/register.go`** that statically imports each entity package and registers its routes on the mux. It is produced in `generateProjectShell` (which sees the full, ordered model), is thraksha-owned, and is deterministic (sorted entity order). This is the idiomatic Go equivalent of a component scan — an explicit, honest difference from the interpreted stacks.

---

## 4. Reuse the seams — and confirm NO new core interface is needed

- **DDL dialect → the existing `SqlDialect` seam.** Go's migration codegen calls `ctx.sql.identityPrimaryKey()`, `columnType()`, `bigInt()`, `timestampDefaultNow()` (and, in Day 9, `foreignKey()`/`index()`) — it never writes `TIMESTAMPTZ`/`BIGINT …` literals. Go gets Postgres dialect from the **same** provider the others use.
- **Connection/driver facts → the existing `tokens()` seam, extended additively.** Add **Go tokens** to the providers: `__DB_GO_DRIVER_IMPORT__` (Postgres `github.com/jackc/pgx/v5/stdlib`), `__DB_GO_DRIVER_NAME__` (Postgres `pgx`), consumed by `go.mod`/`db.go`. Adding new token *keys* is additive — no existing template references them, so **no existing hash moves**, and `tokens(): Record<string,string>` is unchanged (no interface change). The MySQL values for these tokens and the dialect-aware DSN format land in Day 9 (like Express's dialect-selected `db.js`).
- **Runtime SQL facts (Day 9) → the existing `runtime.supportsReturning`.** Already in the seam (added for Express, Day 6). Go's Day-9 MySQL path reuses it (insert-then-select when RETURNING is absent) — **nothing new in core**.
- **Relationships (Day 9) → the existing model representation.** `RelationshipSpec`/`Relationship` (belongs-to/target/required) already exist; Go consumes them in Day 9 exactly as the other four plugins do.
- **Registry (composition, not core).** Add one line: `Go: createGoPlugin`. This is what makes `backend='Go'` selectable for generation/hashing in Day 8 (distinct from the **UI dropdown**, which is Day 10).

**Confirmed: Day 8 needs no new core interface.** `BackendPlugin` is implemented as-is (its five members); `DatabaseProvider`/`SqlDialect`/`RuntimeSqlDialect` are consumed unchanged; the only additions are a new plugin, a registry line, and additive provider token keys — all outside the kernel (Law 25 holds).

---

## 5. Go-specific wrinkles to handle in Session 2

- **`go.sum` determinism.** A Go build needs `go.sum` (cryptographic checksums of pinned deps). Options: ship a **pinned static `go.sum`** (computed once for the fixed `pgx`/`x/crypto` versions) — deterministic as a fixed template file — **or** ship `go.mod` only and let the Dockerfile run `go mod download` at build time (needs network, Day-10 live boot). Recommendation: pin `go.mod` versions and include a static `go.sum`; flag it as the one file whose bytes must be captured exactly.
- **Module path** derived deterministically from the slug (e.g. `module <slug>`), so imports are stable.
- **Deterministic emission:** sorted entity order in `register.go`, no timestamps, no map-iteration nondeterminism (sort all token/loop outputs).

---

## 6. The frozen gates (blocking)

- **All sixteen existing hashes stay byte-identical.** The eight Postgres (four DemoApp gates + four TeamTracker) and the eight MySQL baselines — Go touches **none** of the existing plugins, the core, or their templates. Go is a new `plugins/go/` + `src/plugins/go/` tree, one registry line, and additive provider token keys (unreferenced by existing templates). Diff all sixteen before trusting Go output; any movement means Go leaked into a shared file.
- **Establish Go's baseline:** DemoApp / Go / Postgres generated **twice → byte-identical**; record the hash (the fifth DemoApp gate). Because it is multi-user + relationship-free + Postgres, it is expected to stay frozen through Days 9–10 (relationships/MySQL are additive), exactly like the other four gates.
- **No TeamTracker/Go hash yet** — TeamTracker has relationships (Day 9). Go's Day-8 codegen does not read `entity.relationships` (like Spring pre-Day-1), so Go+TeamTracker is not generated/claimed this Day.

---

## 7. ADR / Law compliance

- **ADR-001 (no AI):** pure, total template + emission functions; no AI/network in generation.
- **ADR-002 (file separation):** established for Go this Day — `*_base.go`/`store.go`/migration are thraksha; `service.go`/`routes.go` are developer-owned via the interface/embedding seam; proven by the tamper-and-regenerate test.
- **ADR-003 (determinism):** same model → byte-identical Go output (twice-identical); no timestamps/randomness/unsorted iteration.
- **ADR-004 (defaults shown):** `describeEntityDefaults` returns Go's per-field default notes for the manifest.
- **ADR-005 (multi-user foundational):** Go entity CRUD is owner-scoped from the first cut.
- **Law 25 (core neutral) + interface unchanged:** no Go/SQL specifics in `src/core`; all Go logic in `plugins/go` + `src/plugins/go`; `BackendPlugin` and `DatabaseProvider` interfaces untouched. (The illustrative `TIMESTAMPTZ` JSDoc example in `core/database.ts` is documentation — left as-is.)

---

## 8. Scope guard — explicitly OUT for Day 8

- **Relationships (belongs-to FKs) → Day 9.** Go ignores `entity.relationships` this Day.
- **MySQL → Day 9.** Go is Postgres-only on Day 8 (via the seam, not hardcoded); Go MySQL driver tokens + DSN + `$N`→`?`/insert-then-select are Day 9.
- **UI dropdown wiring → Day 10** (the registry entry is Day 8; the `index.html` option + routing display are Day 10).
- **Live boot → Day 10.**
- **Multi-user hardening beyond owner scoping**, graceful bad-FK error mapping, object-graph navigation, MongoDB, more stacks — out.

---

## 9. Done-conditions & proof

### 9.1 Session 2 must achieve
1. `src/plugins/go/go-plugin.ts` (`createGoPlugin`) implementing `BackendPlugin`; `src/plugins/go/entity-codegen.ts`; `plugins/go/templates/` shell.
2. Entity CRUD on Postgres via the seam (`ctx.sql` DDL; Go driver tokens); multi-user owner scoping; file separation (thraksha/developer split); validation; migration; runnable shell incl. the generated `register.go`.
3. Registry line `Go: createGoPlugin`; additive Go provider tokens (Postgres values) on both providers.
4. Keep all sixteen existing hashes byte-identical; establish + record DemoApp/Go/Postgres.

### 9.2 Session 3 verification (blocking)
- **Sixteen existing hashes byte-identical** (8 PG + 8 MySQL) — the blocking gate.
- **Go deterministic:** DemoApp/Go/Postgres twice-identical; hash recorded.
- **Go correctness (static):** compiles conceptually (idiomatic Go), CRUD handlers + owner-scoped store + migration DDL-from-seam present; a grep confirms **no** dialect literals (`TIMESTAMPTZ`/`BIGINT GENERATED …`) in Go codegen — they come from `ctx.sql`; **no** Go token leakage (`__DB_*__`) in output.
- **File separation:** developer `service.go` survives a double regeneration byte-identical; tampered `*_base.go` restored.
- **ADR sweep + Law 25** (no core change; interfaces unchanged).
- **Output:** `docs/daily/day-08-report.md`; note Day 9 = relationships + MySQL for Go.

### 9.3 Definition of "Day 8 done"
Go is a fifth `BackendPlugin` peer generating deterministic, file-separated, multi-user entity CRUD on PostgreSQL through the existing `DatabaseProvider` seam; the sixteen existing hashes are byte-identical; DemoApp/Go/Postgres is established as the fifth gate; the core and both seam interfaces are unchanged. Written up in `docs/daily/day-08-report.md`.

---

## 10. Risk notes (for Session 2)

- **Accidental shared-file touch** is the only way an existing hash moves — keep Go entirely under `plugins/go/`+`src/plugins/go/`, one registry line, and *new* provider token keys (never edit an existing token's value). Diff all sixteen first.
- **Go determinism traps:** map iteration order, and any set/relationship ordering — sort everything; field order follows the model.
- **`go.sum`/module path** — capture `go.sum` bytes exactly (pin versions) or defer checksums to `go mod download` at build; decide in Session 2 and keep it deterministic either way.
- **Don't pull relationships/MySQL forward** — Go ignores `relationships` and selects only Postgres this Day; those are Day 9's focused work.
- **`register.go` must see all entities** — generate it in `generateProjectShell` (full model), sorted, thraksha-owned.
