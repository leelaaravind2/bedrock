# Day 9 — Plan: Go Step 2 (relationships + multi-user + MySQL + file-sep hardening)

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Goal: bring Go to full peer status — add belongs-to relationships, confirm/extend multi-user owner scoping, and complete MySQL support through the `DatabaseProvider` seam, hardening file separation throughout. Go was born into the existing seams and model representation, so this is largely "wire Go into existing patterns," not inventing mechanisms.**

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md), [`docs/adr/`](../adr) (ADR-001/002/003/005, Laws 25–28), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 9), the Day-8 plan/report ([plan](day-08-plan.md)/[report](day-08-report.md)), [`week-01-summary.md`](week-01-summary.md), and the other backends' relationship + MySQL implementations (FastAPI/Express codegen, Express's Day-6 MySQL runtime handling, the `SqlDialect`/`RuntimeSqlDialect` seam).

**Day 9 adds three capabilities to Go using existing machinery: the `RelationshipSpec` model representation (relationships), the Day-8 owner-scoping conditionals (multi-user), and the `SqlDialect` + `runtime.supportsReturning` seam (MySQL). No new core interface. Go's DemoApp/Postgres gate (`d158529a…`) stays frozen; Go's TeamTracker and MySQL hashes are newly established.**

---

## 0. Where Go stands (entering Day 9)

From Day 8, Go already has: a `BackendPlugin` peer (`createGoPlugin`), entity CRUD on Postgres via `ctx.sql`, **multi-user owner scoping** (owner_id column + owner-scoped queries — the `mu` conditionals in `store.go`/`service_base.go`/`handler_base.go`/migration), file separation (`service.go`/`routes.go` developer-owned), the runnable shell + Docker, and additive Go provider tokens (driver import/name/require + DSN format, with **MySQL values already present**, incl. `parseTime=true&multiStatements=true`). Its entity codegen **does not read `entity.relationships`** and uses Postgres `$N` + `RETURNING` runtime SQL. Day 9 closes exactly those two gaps.

---

## 1. Relationships in Go (belongs-to FKs) — pure codegen, reuse the model representation

Mirror the other four stacks exactly, reusing the shared `RelationshipSpec` (`{ kind:'belongs-to', target, required }`) and the identical naming so the logical schema matches cross-stack. **No core change** — `entity.relationships` already exists.

Add the same per-plugin helpers the others have (`belongsToRels`, `fkColumnName` = `<snake(target)>_id`, `fkDataKey` = `<camel(target)>Id`, `fkRefTable` = plural target, `fkConstraintName` = `fk_<table>_<target>`), then emit FKs as a **loop over belongs-to** (empty for relationship-free entities → DemoApp byte-identical):

| Go artifact | What a belongs-to `target` adds |
|---|---|
| **Struct** (`<slug>.go`) | `${Pascal(target)}ID *int64 \`json:"${camel(target)}Id"\`` (nullable unless required), placed after fields, before `OwnerID` |
| **Store** (`store.go`) | the FK column in `columns`, in the scan args, and in insert cols/placeholders/values (a writable column like a field) |
| **Validate** (`validate.go`) | FK field on `${Name}Input` (`*int64`), a required-check when `required`, and the `toEntity` mapping |
| **Migration** (`V*.sql`) | the FK column `${col} ${ctx.sql.bigInt()}${notNull}`, then `ctx.sql.foreignKey(table, fk_name, col, refTable)` and `ctx.sql.index(idx_name, table, col, false)` |
| **Manifest** (`describeEntityDefaults`) | a belongs-to line per relationship (ADR-004 — shown) |

**Dialect-correct FK for BOTH databases, free:** the FK column, constraint, and index come from `ctx.sql.bigInt()` / `foreignKey()` / `index()` — and those methods already emit the correct dialect for Postgres **and** MySQL (Day 5b proved FK/index SQL is byte-identical across the two; `bigInt()` is `BIGINT` in both). So Go's relationship DDL is automatically right for MySQL with zero extra work — the seam does it.

**Migration ordering:** V-numbering follows entity index (V1 users, V2 first entity, …), identical to the other stacks, so every FK references a table created in an earlier migration (Application→Team, Ticket→Application+Team, Comment→Ticket). Reuse; no new logic.

**Column order** matches the other stacks: `id, fields…, FK cols…, owner_id, created_at, updated_at` — so the logical schema (tables/columns/relationships/names) agrees cross-stack (the Day-3 logical-vs-literal principle).

---

## 2. Multi-user owner scoping in Go — confirm and compose with relationships

Day 8 already established owner scoping (the `mu` branch: `owner_id` column, `WHERE owner_id = $N`, `ownerID` params, `auth.UserID(r)` in handlers). Day 9 **confirms** it and ensures relationships compose cleanly:

- The FK columns are **independent of owner scoping** — they are additional writable columns; queries stay owner-scoped exactly as before. Adding the belongs-to loop to the existing `mu`-aware column lists is orthogonal (FK cols slot between fields and `owner_id`).
- No new multi-user mechanism — owner scoping and FKs are the same composition the other four stacks already ship (e.g. TeamTracker's `tickets` has both `application_id`/`team_id` FKs and `owner_id`).
- Verified by generating TeamTracker (multi-user + relationships) and checking every entity is both owner-scoped and FK-wired.

---

## 3. MySQL for Go — mostly automatic via the seam; the runtime-SQL divergence is the real work

Day 8 proved the driver swaps via the seam. Most of a correct MySQL project is **already automatic** because Go consumes the seam:

- **DDL** — `ctx.sql` = `mySqlProvider.sql` → `BIGINT AUTO_INCREMENT`, `DATETIME`/`CURRENT_TIMESTAMP`, `TINYINT(1)`, `DECIMAL(19,2)`, FK/index (same syntax). Go's migrations are MySQL-correct with no Go change.
- **Driver / DSN** — the Day-8 Go tokens: `github.com/go-sql-driver/mysql`, `sql.Open("mysql", …)`, DSN `%s:%s@tcp(%s:%s)/%s?parseTime=true&multiStatements=true`. Already present.
- **Docker** — Go's `docker-compose.yml` uses the provider compose tokens (`mysql:8`, `MYSQL_*` env, `mysqladmin` healthcheck, `/var/lib/mysql`) → a MySQL-correct compose automatically.

**The genuine Day-9 work is the runtime SQL divergence** (the Go analogue of Express's Day-6 work), driven by the **existing** `runtime.supportsReturning` fact — thread it into Go's `EntityCodegenContext` (a plugin-local type, from `database.runtime.supportsReturning`; **no core change**):

1. **`RETURNING` → insert-then-select (codegen branch on `supportsReturning`).** Postgres (`lib/pq` has no `LastInsertId`) keeps `INSERT … RETURNING`/`UPDATE … RETURNING` via `QueryRow` — the Day-8 code, **byte-identical**. MySQL (`go-sql-driver` has no `RETURNING`) does `Exec("INSERT …")` → `res.LastInsertId()` → `QueryRow("SELECT … WHERE id = …")`; and `Exec("UPDATE …")` → select the row back. Same "null when not found" contract. This mirrors Express's `insertMethod`/`updateMethod` branch, adapted to Go's `LastInsertId`.
2. **Placeholders `$N` → `?`.** Go emits dialect placeholders directly in codegen via a placeholder function derived from the same `supportsReturning` axis (returning/Postgres → `$${i}`, no-returning/MySQL → `?`). For the **shell** template files (`auth.go`, `seed.go`, `migrate.go` — 5 `$N` occurrences total, max index 2), tokenise them with **additive** provider tokens `__DB_PH1__`/`__DB_PH2__` (Postgres `$1`/`$2`, MySQL `?`/`?`). Postgres values reproduce the exact Day-8 bytes → **Go's Postgres shell stays byte-identical**.

   *Why direct codegen, not Express's runtime rewrite:* Express kept `$N` and rewrote to `?` inside a `db.js` adapter. The Go analogue — a `*sql.DB` wrapper — would change the type threaded through `store.go`/shell signatures and thus **move Go's frozen Postgres gate**. Emitting dialect placeholders in codegen (and tokenising the few shell placeholders) keeps Postgres byte-identical while producing correct MySQL. A per-stack idiom difference, honestly noted.

3. **Runtime type mapping (confirm at Day-10 boot).** `database/sql` scans MySQL `TINYINT(1)` into `*bool` via its built-in `driver.Bool` conversion, and `DATETIME` into `time.Time` via `parseTime=true` (already in the Go MySQL DSN). These are expected-correct but are **runtime** facts — verified at the Day-10 live boot, not provable by generation. Flagged as the main Go+MySQL runtime risk (if the boot surfaces a mismatch, it is fixed in-template and Go's MySQL hash re-recorded — never a frozen gate).

**Same logical schema, dialect-only differences** (the four-stack principle, now Go too): same tables/columns/relationships/names; Postgres `IDENTITY`/`TIMESTAMPTZ`/`BOOLEAN`/`$N`/`RETURNING` vs MySQL `AUTO_INCREMENT`/`DATETIME`/`TINYINT(1)`/`?`/insert-then-select.

---

## 4. File-separation hardening

The relationship and MySQL code all lands in **thraksha-owned** files (`store.go`, `handler_base.go`, `validate.go`, `<slug>.go`, migration) and shell tokens; the **developer-owned** `service.go`/`routes.go` are unaffected (they embed the base / register routes and never mention fields or FKs). Harden by proving the split holds under the new code:
- Generate TeamTracker (multi-user + relationships), Postgres **and** MySQL; write hand logic into `service.go`; regenerate twice → developer file byte-identical, a tampered `*_base.go` regenerated.
- Confirm the developer files are **identical across databases** (they carry no dialect), so switching DB never rewrites a developer file.

---

## 5. The frozen gates (blocking) — precise

**Frozen — must not move:**
- The **eight Postgres** and **eight MySQL** hashes of the other four backends (Spring/Express/FastAPI/Django) — Go touches none of them.
- **Go DemoApp / Postgres = `d158529a241677905a4be97f14b6a6419de55e95bee999883beb9f661cb4d067`.** DemoApp has **no relationships** (belongs-to loop empty → no change) and is already multi-user + Postgres. The placeholder work must resolve to `$N` for Postgres (shell tokens → `$1`/`$2`; codegen placeholder → `$i`; `supportsReturning=true` → the Day-8 `RETURNING` branch verbatim) → **byte-identical**. This is the #1 risk — **diff Go/DemoApp/Postgres first**, before trusting any new output.

**Newly established (Go's remaining three baselines):**
- **Go / TeamTracker / Postgres** — relationships added.
- **Go / DemoApp / MySQL** — MySQL added.
- **Go / TeamTracker / MySQL** — relationships + MySQL.

After Day 9 the full matrix is complete: **5 backends × 2 databases × 2 models = 20 hashes** (16 pre-existing frozen + Go's 4, of which DemoApp/Postgres was Day-8-frozen and 3 are new). Each new Go output must be twice-identical (determinism) and recorded.

---

## 6. Reuse & neutrality — confirm NO core interface change

- **Relationships** reuse the existing `RelationshipSpec`/`Relationship` model types (no core change) — Go adds only plugin-local FK helpers, exactly as the other four plugins did.
- **Dialect DDL** (incl. FK/index) comes from the existing `SqlDialect` (`ctx.sql`).
- **MySQL runtime** reuses the existing `runtime.supportsReturning` fact (added for Express, Day 6) — threaded into Go's plugin-local `EntityCodegenContext`. No new seam method.
- **Driver/DSN/Docker** reuse the Day-8 Go tokens (MySQL values already present).
- **The only additions are additive provider token *keys*** (`__DB_PH1__`/`__DB_PH2__`) — unreferenced by any other backend's templates, so their presence is a no-op for the sixteen existing hashes; and Postgres values preserve Go's Postgres bytes.
- **`src/core` is not modified** (the JSDoc `TIMESTAMPTZ` example stays). `BackendPlugin`, `DatabaseProvider`, `SqlDialect`, `RuntimeSqlDialect` interfaces are all unchanged. Law 25 holds.

---

## 7. Scope guard — explicitly OUT for Day 9

- **UI dropdown wiring ("Go" option) → Day 10.**
- **Live boot (Go + Postgres, Go + MySQL) → Day 10** — migrate, CRUD, relationships, FK enforced. Day 9 is **generation-proven only**; the runtime type-mapping notes (§3.3) are confirmed there.
- MongoDB, multiple databases per project, more stacks — out.
- No change to the model representation, the core, or the other four plugins.

---

## 8. Done-conditions & proof

### 8.1 Session 2 must achieve
1. Add belongs-to FK generation to Go's `entity-codegen.ts` (struct/store/validate/migration/manifest) via the shared `RelationshipSpec`, as a loop over belongs-to (empty → DemoApp unchanged).
2. Thread `supportsReturning` into Go's `EntityCodegenContext`; branch insert/update (RETURNING vs insert-then-select via `LastInsertId`); emit dialect placeholders; tokenise the shell placeholders (`__DB_PH1__`/`__DB_PH2__`, additive, Postgres-preserving).
3. Keep Go/DemoApp/Postgres byte-identical; establish Go/TeamTracker/Postgres, Go/DemoApp/MySQL, Go/TeamTracker/MySQL (each twice-identical, recorded).
4. Keep all sixteen other hashes frozen; no core change.

### 8.2 Session 3 verification (blocking)
- **Sixteen existing hashes byte-identical** + **Go/DemoApp/Postgres `d158529a…` byte-identical** (the blocking gates).
- **Go relationships correct:** TeamTracker's Go output has FK columns (`team_id`, `application_id`, `ticket_id`), `ctx.sql.foreignKey`/`index` FK constraints + indexes, writable FK in the input, valid migration ordering; the FK is dialect-correct for both Postgres and MySQL.
- **Go MySQL correct + deterministic:** Go/DemoApp/MySQL and Go/TeamTracker/MySQL twice-identical, hashes recorded; migrations show `AUTO_INCREMENT`/`DATETIME`/`TINYINT(1)` + MySQL FK; store uses `?` placeholders + insert-then-select (no `RETURNING`); `sql.Open("mysql")`, `mysql:8` compose; **same logical schema** as Go/Postgres.
- **Determinism / no-leak:** no unresolved `__DB_*__` tokens in any Go output; Go .go files carry no hardcoded dialect literals (only `migrate.go`'s seam-provided `schema_migrations` token).
- **File separation:** developer `service.go` survives double regeneration (Postgres and MySQL); identical across databases.
- **ADR sweep + Law 25:** no AI; core neutral/unchanged; interfaces unchanged.
- **(Optional) compile-check** the generated Go (Postgres and MySQL) via the `golang:1.22` container, as in Day 8 — strengthens confidence ahead of the Day-10 boot.
- **Output:** `docs/daily/day-09-report.md`; note Day 10 = dropdown + live boot.

### 8.3 Definition of "Day 9 done"
Go generates deterministic, file-separated, multi-user entity CRUD **with belongs-to relationships** on **both** PostgreSQL and MySQL through the seam — same logical schema, dialect-only differences. Go/DemoApp/Postgres stays frozen; Go/TeamTracker/Postgres, Go/DemoApp/MySQL, Go/TeamTracker/MySQL are established; the sixteen other hashes are byte-identical; the core and all seam interfaces are unchanged. Go is a full peer (generation-proven); only the dropdown + live boot remain (Day 10). Written up in `docs/daily/day-09-report.md`.

---

## 9. Risk notes (for Session 2)

- **Go/DemoApp/Postgres byte-drift is the #1 risk.** The placeholder tokenisation (shell tokens + codegen placeholder fn) and the `supportsReturning` branch must reproduce the exact Day-8 bytes for Postgres: shell tokens → `$1`/`$2`; codegen placeholder → `$i`; `supportsReturning=true` → the current `RETURNING` insert/update verbatim; belongs-to loop empty for DemoApp. Diff Go/DemoApp/Postgres before anything else.
- **Placeholder-style/RETURNING proxy:** both keyed off `supportsReturning`. This is exact for Postgres (returning + `$N`) and MySQL (no-returning + `?`); note honestly that a hypothetical DB breaking that correlation would need a dedicated placeholder fact — not needed now.
- **MySQL `LastInsertId` path:** ensure the insert-then-select selects the row back by the new id (owner-scoped select is unnecessary for the just-inserted row; the update path must stay owner-scoped and return null when not found).
- **Runtime type mapping** (`TINYINT(1)`→`*bool`, `DATETIME`→`time.Time`) is a Day-10 boot confirmation, not a Day-9 claim — don't assert live correctness from generation alone.
- **Determinism traps:** sort relationship iteration by authored order (as the model gives it); no map iteration; field/FK order follows the model.
- **Don't pull Day-10 forward:** no dropdown, no live boot this session.
