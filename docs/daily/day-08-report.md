# Day 8 — End-of-Day Report: Go as a fifth backend, Step 1 (plugin + entity CRUD on Postgres)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new work, no relationships/MySQL.
**Status: DONE — Go is a fifth `BackendPlugin` peer generating deterministic, file-separated, multi-user entity CRUD on PostgreSQL through the existing `DatabaseProvider` seam. The sixteen existing hashes are byte-identical; Go's baseline is established; the core and both seam interfaces are unchanged; and the generated Go compiles.**

Plan: [`docs/daily/day-08-plan.md`](day-08-plan.md). Step 1 of the 3-step Go recipe (Days 8–10). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), ADR-004 (defaults shown), ADR-005 (multi-user foundational), Law 25 (core neutral).

**Go arrived after relationships and MySQL already existed, yet it plugged in as a pure peer: a new `plugins/go/` tree, one registry line, and additive provider token keys. No existing plugin, the core, or any existing hash was touched — the clearest possible proof that the backend + database seams hold for a brand-new stack.**

---

## 1. What was built

A Go backend plugin implementing the existing `BackendPlugin` interface, registered under the key `Go` (`availableBackends()` → `Spring Boot, Express, FastAPI, Django, Go`).

- **`src/plugins/go/go-plugin.ts`** (`createGoPlugin`) — walks the Go template shell, token-substitutes it, generates each entity's slice, and emits the compile-time entity route registry (see §5). Receives the injected `DatabaseProvider`; defaults to Postgres.
- **`src/plugins/go/entity-codegen.ts`** — per entity: the struct + JSON tags (`<slug>.go`), owner-scoped `database/sql` data access (`store.go`), request validation (`validate.go`), the CRUD service base (`service_base.go`), the HTTP handlers + route registration (`handler_base.go`), and the SQL migration — **all DDL obtained from `ctx.sql`** (the `SqlDialect` seam). Plus the developer-owned `service.go` / `routes.go`.
- **`plugins/go/templates/`** — the runnable Go shell: `main.go` (config → db → migrate → seed → serve), `internal/{config,db,auth,web,migrate,seed}`, `migrations/V1__init.sql` (users table from the provider token), `go.mod`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`. **`internal/db/db.go` gets the driver import, driver name, and DSN format from provider tokens** — nothing hardcodes one database.
- **Additive Go provider tokens** on both providers: `__DB_GO_DRIVER_IMPORT__`, `__DB_GO_DRIVER_NAME__`, `__DB_GO_DRIVER_REQUIRE__`, `__DB_GO_DSN_FORMAT__` (Postgres values in `postgres.ts`, MySQL values in `mysql.ts` for symmetry; Go consumes only the Postgres path this Day).

**Stack (stated):** Go 1.22 standard-library `net/http` (`ServeMux` method routing — no web framework) + `database/sql` with **`github.com/lib/pq`** (chosen over pgx for straightforward multi-statement migration `Exec` via `database/sql`), `$N` placeholders + `INSERT … RETURNING`, HTTP Basic auth via `golang.org/x/crypto/bcrypt`. Two dependencies total.

---

## 2. THE SIXTEEN-HASH GUARANTEE (blocking proof) — all byte-identical

Re-generated from a clean rebuild and compared to the recorded values. **All sixteen match, byte-for-byte, deterministically** — Go moved nothing:

| Model | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| **DemoApp — Postgres** | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ |
| **TeamTracker — Postgres** | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ |
| **DemoApp — MySQL** | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ |
| **TeamTracker — MySQL** | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ |

Guaranteed by construction: Go lives entirely under `plugins/go/` + `src/plugins/go/`, plus one registry line and *new* provider token keys unreferenced by existing templates (adding an unused key to `tokens()` is a no-op for every existing backend's substitution). `two-stacks` and `ui:demo` also pass.

---

## 3. Go generation — deterministic, idiomatic, and it compiles

- **Deterministic:** DemoApp / Go / Postgres generated **twice → byte-identical**. **Established hash (the fifth DemoApp gate):**
  `d158529a241677905a4be97f14b6a6419de55e95bee999883beb9f661cb4d067` (24 files).
  Because it is multi-user + relationship-free + Postgres — the same shape as the other four DemoApp gates — it is expected to stay frozen through Go's Day-9 relationships/MySQL work (additive), exactly as those gates did.
- **Idiomatic Go (verified on output):** a `Ticket` struct with `json` tags (value types for required fields, pointers for optional); a `Store` with `List/FindByID/Insert/Update/Delete` using `$N` placeholders + `RETURNING` and owner scoping; a `TicketInput` + `Validate()` (required + maxLength) + `toEntity`; net/http handlers with `ServeMux` method routing; a per-entity SQL migration; a multi-stage `Dockerfile` + `docker-compose.yml`.
- **It compiles.** `go build -mod=mod ./...` succeeded in a `golang:1.22-alpine` container (deps `lib/pq` + `x/crypto` resolved) — the generated project is not merely deterministic but correct Go. (This is a static compile-check; the live boot is Day 10.)
- **No unresolved tokens** in any Go output; the only SQL-dialect string in any `.go` file is `migrate.go`'s `schema_migrations` DDL, which is the `__DB_SCHEMA_MIGRATIONS_TS__` provider token (dialect-aware seam) — identical in kind to the other stacks' migrate runners.

---

## 4. Seam reuse — Go gets its dialect from the provider, hardcodes nothing (the architectural proof)

This is the headline architectural check: **does the `DatabaseProvider` seam work for a brand-new backend?** Yes.

- **No hardcoded Postgres in the Go plugin.** A grep across `src/plugins/go/` and `plugins/go/templates/` for Postgres-specific literals (`TIMESTAMPTZ`, `GENERATED BY DEFAULT`, `lib/pq`, `postgres://`, `sslmode`, `:5432`, `postgres:16`, `pg_isready`, `psycopg`, `jdbc:`) found **none** — except the plugin's `displayName: 'Go + PostgreSQL'`, which is display metadata identical in pattern to the other four peers (`'FastAPI + PostgreSQL'`, …) and never appears in generated output. The DDL comes from `ctx.sql`; the driver/DSN come from `tokens()`.
- **Swapping the provider swaps Go's database with no plugin change** — the definitive proof:

  | `database` answer | `go.mod` driver | `sql.Open(...)` |
  |---|---|---|
  | PostgreSQL | `github.com/lib/pq` | `"postgres"` |
  | MySQL | `github.com/go-sql-driver/mysql` | `"mysql"` |

  Selecting MySQL already routes Go's connection facts through the seam (full Go+MySQL generation — placeholders/`RETURNING` runtime handling — is Day 9). Go reuses the exact seam the other four backends use; the seam is confirmed backend-agnostic.

---

## 5. File separation (ADR-002) — established for Go

The Go generated-vs-developer split is in place, via a Go-idiomatic seam (interface/struct embedding): `service.go` (embeds `TicketServiceBase`) and `routes.go` (`Register`) are **developer-owned**; `store.go`, `*_base.go`, `<slug>.go`, and the migration are **thraksha-owned**. Proven this arc: hand-written business logic (`OpenCount()`) added to `service.go`, a marker tampered into `service_base.go`, then **two regenerations** → the developer file was **byte-identical** (logic survived) and the tampered base was **regenerated** (marker gone).

The compiled-language wrinkle handled honestly: because Go cannot discover entity packages at runtime (unlike FastAPI/Express), the plugin emits a generated `internal/entities/register.go` that statically imports and registers each entity's routes (sorted, deterministic) — the idiomatic Go equivalent of a component scan.

---

## 6. ADR / Law compliance

- **ADR-001 (no AI):** no AI/network in the generator — pure template + emission functions. (Grep hits for `http.Request` are Go *handler signatures* emitted as strings, not network calls in the generation path.)
- **ADR-002 (file separation):** established for Go (§5).
- **ADR-003 (determinism):** Go output twice-identical; sorted walks; no timestamps/randomness.
- **ADR-004 (defaults shown):** `describeEntityDefaults` feeds the manifest.
- **ADR-005 (multi-user foundational):** Go entity CRUD is owner-scoped from the first cut, so Go generates the canonical multi-user DemoApp.
- **Law 25 (core neutral) + interface unchanged:** `src/core` has **no** Go references and was not modified (its single `TIMESTAMPTZ` is the illustrative JSDoc example — left as-is). `BackendPlugin` keeps its five members (`id`, `displayName`, `generateProjectShell`, `generateEntity`, `describeEntityDefaults`); Go implements them as-is. The only seam growth was additive `DatabaseProvider` token *keys* (no interface change).

---

## 7. Scope — held

**In scope, done:** Go plugin as a `BackendPlugin` peer; multi-user, file-separated entity CRUD on PostgreSQL via the seam; validation; migration from `ctx.sql`; runnable Go shell + Docker; registry entry; additive Go provider tokens; sixteen existing hashes frozen; Go's DemoApp/Postgres gate established; generated Go compiles.

**Deliberately out (Days 9–10):**
- **Relationships (belongs-to FKs) → Day 9.** Go does not read `entity.relationships` yet.
- **MySQL → Day 9.** Go is Postgres-only this Day (driver routing already flows from the seam; the `$N`→`?` / no-`RETURNING` runtime handling is Day 9, mirroring Express Day 6).
- **UI dropdown wiring + live boot → Day 10.**

**Honest caveats (not defects):**
- The generated Go **compiles** but has **not been booted** against a real database — Day 10.
- Struct-field `gofmt` alignment is imperfect (cosmetic; no effect on compilation/determinism/hashing) — a later polish item.
- `lib/pq` was chosen over the plan's tentative `pgx` for straightforward multi-statement migration `Exec` — a minor, documented deviation.
- `displayName: 'Go + PostgreSQL'` is plugin metadata (consistent with the other peers); a database-aware display name is a Day-10 dropdown concern.

---

## 8. What Day 9 picks up

**Day 9 — Go Step 2: file-sep hardening + relationships + MySQL via the seam.**
1. **Relationships (belongs-to FKs):** consume the existing `RelationshipSpec` model representation (the same the other four plugins use) — add the FK column to the struct/store/migration, the FK constraint + index via `ctx.sql.foreignKey()`/`index()`, and the writable FK in the input. Then Go generates TeamTracker; establish its Go/Postgres hash.
2. **MySQL via the seam:** reuse `runtime.supportsReturning` (already in the seam from Express Day 6) so Go's insert/update becomes insert-then-select when `RETURNING` is absent, plus a dialect-aware DSN/placeholder path (the Go analogue of Express's mysql2 handling) — driven by the Go MySQL tokens already present on the provider. Establish Go's MySQL hashes.
3. **File-sep hardening:** confirm the split holds with relationships present.
Then **Day 10** wires Go into the UI dropdown and boots a Go project live (Postgres and MySQL) — migrate, CRUD, relationships, FK enforced.

---

**Day 8 verdict:** Go is a fifth backend peer — deterministic, file-separated, multi-user entity CRUD on PostgreSQL, obtained through the same `DatabaseProvider` seam the other four use, with zero hardcoded database specifics and a generated project that compiles. The sixteen existing hashes never moved; Go's baseline (`d158529a…`) is established. The backend and database seams are proven to accept a brand-new stack additively. Day 8 is **done**.
