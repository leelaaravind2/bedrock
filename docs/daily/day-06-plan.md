# Day 6 — Plan: Complete the MySQL story (Express + dropdown + cross-proof + live boot)

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Goal: finish the database arc — (a) make Express generate correct MySQL (its hand-written runtime SQL is the last piece outside the DDL seam), (b) wire MySQL into the UI database dropdown, (c) cross-stack proof that all four backends generate MySQL deterministically with one consistent logical schema, and (d) a live MySQL boot proving a MySQL-based project actually runs (migrations apply, CRUD + relationships work, the MySQL FK is enforced).**

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md), [`docs/adr/`](../adr) (ADR-001/002/003, Laws 25–28), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 6), and the Day-5 arc: [`day-05-plan.md`](day-05-plan.md), [`day-05a-plan.md`](day-05a-plan.md)/[`report`](day-05a-report.md), [`day-05b-plan.md`](day-05b-plan.md)/[`report`](day-05b-report.md).

**Day 6 is additive to Postgres and completes MySQL. The eight Postgres hashes stay byte-identical — including Express Postgres (`a437a302…` / `dca2b4a7…`), which the Express-MySQL work must not disturb.** MySQL for Django/FastAPI/Spring is already done and stays frozen; Express MySQL is the new provider consumer; the dropdown/cross-proof/live boot close the arc.

---

## 0. Where the arc stands (entering Day 6)

- **Seam (Day 5a):** `DatabaseProvider` = `sql: SqlDialect` (DDL) + `tokens()` (shell) in [`core/database.ts`](../../generator/src/core/database.ts). Backends receive a provider handle; core stays neutral (Law 25).
- **MySQL provider (Day 5b):** [`plugins/database/mysql.ts`](../../generator/src/plugins/database/mysql.ts), registered `MySQL → mySqlProvider`. **Works on Django, FastAPI, Spring** (runtime SQL ORM/Hibernate/SQLAlchemy-abstracted). Six MySQL hashes established.
- **The one gap — Express.** Express writes its SQL **by hand** in generated code, so its runtime queries are Postgres-shaped and outside the DDL seam. Day 5b deliberately did **not** claim Express-MySQL.
- **Frozen:** the eight Postgres hashes (four gates + four TeamTracker) and the six Django/FastAPI/Spring MySQL hashes.

---

## 1. Part A — Express MySQL (the meaty piece)

### 1.1 Concrete inventory — every Postgres-runtime-ism in Express (traced this session)

The DDL already comes from `ctx.sql` (Day 5a). What remains is **runtime** query/driver code:

| Location | Postgres-ism | MySQL needs |
|---|---|---|
| `entity-codegen.ts` `buildRepository` — insert/update | `… RETURNING ' + COLUMNS`, read `rows[0]` | **MySQL 8 has no `RETURNING`** → insert-then-select-back (via `insertId`), update-then-select-back |
| `buildRepository` — all queries | `$1, $2, …` positional placeholders | mysql2 uses `?` |
| `buildRepository` — result shape | pg `const { rows } = …` / `const { rowCount } = …` | mysql2 returns `[rows, fields]` / `ResultSetHeader{affectedRows, insertId}` |
| `buildRepository` — update | `updated_at = now()` | **`now()` is valid MySQL runtime SQL — no change** (only the DDL *default* had to be `CURRENT_TIMESTAMP`, already handled) |
| `templates/src/db.js` | `const { Pool } = require('pg'); new Pool(...)` | mysql2: `require('mysql2/promise').createPool(...)`; different result shape |
| `templates/src/migrate.js` | `$1`, `{ rowCount }`, `pool.connect()` + `client.query('BEGIN'/'COMMIT'/'ROLLBACK')` | mysql2 pool/connection API + `?` |
| `templates/src/auth.js` | `$1`, `const { rows } = …` | `?` + mysql2 result shape |
| `templates/src/seed.js` | `$1, $2`, `const { rowCount } = …` | `?` + mysql2 result shape |

**FastAPI/Spring/Django have none of this** — their runtime SQL is abstracted. Express is genuinely the harder case; that is why it was deferred to its own day.

### 1.2 The design — a pg-shaped MySQL `db.js` adapter + one codegen branch

The key move keeps the change small and keeps Express Postgres byte-identical: **push almost all divergence into a MySQL-only `db.js` adapter that presents the exact interface the pg pool presents**, so every call site keeps writing `$N` and `{ rows }`.

**(1) Neutral seam addition (core stays neutral).** Add a small, generic runtime capability to `DatabaseProvider` — describing what a *hand-SQL* backend needs, with no dialect words:
```ts
// core/database.ts — neutral; no pg/mysql specifics
interface RuntimeSqlDialect {
  /** Can INSERT/UPDATE … RETURNING be used to read the row back in one statement? */
  supportsReturning: boolean;
}
interface DatabaseProvider { …; runtime: RuntimeSqlDialect; }
```
Postgres → `{ supportsReturning: true }`; MySQL → `{ supportsReturning: false }`. The ORM-abstracted backends ignore it; **only Express consumes it.** This is a justified, neutral seam extension (same category as `sql`/`tokens`), not a leak — the MySQL specifics stay in `mysql.ts`.

**(2) The MySQL `db.js` adapter (Express-owned).** For the non-RETURNING path, Express emits a small adapter that wraps `mysql2/promise` to mimic the pg pool:
- `query(sql, params)` → rewrite ascending `$N` → `?` (see invariant below), run, and **normalize the result to pg shape**: `{ rows, rowCount, insertId }` (rows = the array for SELECT / `[]` for DML; rowCount = `affectedRows` or `rows.length`; insertId from the `ResultSetHeader`).
- `connect()` → wrap `getConnection()` to return a client with the same `query(...)` (rewriting) and `release()`, so `migrate.js`'s `pool.connect()` + `client.query('BEGIN'/…/'COMMIT'/'ROLLBACK')` work unchanged (mysql2 executes `BEGIN`/`COMMIT`/`ROLLBACK` as SQL).
- Configure mysql2 `typeCast` so **`TINYINT(1)` → JS boolean** (and leave DECIMAL as string, matching pg), so a MySQL project's JSON responses match Postgres's — logical parity at the data layer, not just the schema.

**`$N`→`?` rewrite invariant (must hold, and it does):** every generated query uses `$1, $2, …` in **strictly ascending, single-use** order with the params array in the same order (verified across repository insert/update/select/delete, `auth.js`, `seed.js`, `migrate.js`). So a left-to-right `\$\d+ → ?` rewrite preserves positional binding. Session 2 asserts this by diffing adapter output against expected SQL; if any future query reused/reordered placeholders the invariant would need revisiting (none do today).

**(3) The one irreducible codegen branch — insert/update (`buildRepository`).** `RETURNING` cannot be shimmed cleanly, so branch on `database.runtime.supportsReturning`:
- **Postgres (`true`) → emit today's exact bytes** (`INSERT … RETURNING`, `rows[0]`). Byte-identical.
- **MySQL (`false`) → insert-then-select:** `INSERT …` (no RETURNING) → read `result.insertId` → `SELECT COLUMNS … WHERE id = $1` → `rowToObject(rows[0])`; update → `UPDATE …` → `SELECT COLUMNS … WHERE id = $1 [AND owner_id = $2]` → return the row (or null if 0 rows matched → 404, same contract as pg's empty RETURNING).

**(4) Everything else stays byte-identical across dialects** — because the adapter presents pg's interface, `auth.js`, `seed.js`, `migrate.js`, and the repository's SELECT/DELETE keep their `$N` + `{ rows }`/`{ rowCount }` code unchanged. Only `db.js` (dialect-selected) and the insert/update branch differ. Express selects the pg `db.js` vs the mysql2 adapter `db.js` from the neutral `supportsReturning` flag (Express owns both files; the provider only states the neutral fact).

### 1.3 Byte-identity guard (blocking)
With `supportsReturning: true`, Express takes the current code path and emits the current `db.js` → **Express Postgres output is byte-identical** (`a437a302…` DemoApp, `dca2b4a7…` TeamTracker). Diff Express Postgres first, before trusting any Express MySQL output.

### 1.4 Honest framing
This is **more involved than Django/FastAPI/Spring MySQL** (which were shell/DDL-only). Express hand-writes SQL, so it needs a driver adapter + a codegen branch. That is expected and was the whole reason for deferral — not seam breakage. The seam still holds: the *neutral* runtime fact lives in core, the MySQL specifics in `mysql.ts`, the driver adapter in the Express plugin.

---

## 2. Part B — Dropdown wiring (front-end + routing only)

- **Current:** [`ui/index.html:220`](../../generator/ui/index.html) — `<select id="database"><option>PostgreSQL</option><option>None</option></select>`. The value flows to `settings.database` → `POST /api/settings` → the model → `selectDatabaseProvider(model)`, which **already resolves `'MySQL'`** (registered Day 5b).
- **Change:** add `<option>MySQL</option>` to that select. That is the entire wiring — selecting MySQL routes to `mySqlProvider` exactly as a backend choice routes to its plugin.
- **No generation-logic change.** The core treats `database` as an opaque string (Law 25 — "which database values are valid is owned by plugins"), so no allow-list edit is needed; the registry already accepts MySQL and throws for anything uninstalled.
- **`None`** stays as-is (a non-provider placeholder, pre-existing, out of scope — selecting it is not a MySQL concern).
- `index.html` is a UI asset, **not** part of any generated project, so this change touches **no** generation hash.

---

## 3. Part C — Cross-stack proof (verified in Session 3)

Prove all four backends generate MySQL deterministically with one consistent logical schema, and that Postgres is untouched:
1. **Determinism:** for each `(backend × {DemoApp, TeamTracker})` with `database='MySQL'`, generate **twice → byte-identical**. Record hashes. Django/FastAPI/Spring MySQL hashes must equal their Day-5b values (regression); **Express MySQL hashes are newly established** (the Day-5b provisional Express-MySQL hashes `5b5d40b7…`/`210a2fb4…` were the *unsupported, RETURNING-broken* output and are expected to change — Express MySQL was never frozen).
2. **Consistent logical schema across stacks:** all four MySQL backends emit the same tables (`users`, `teams`, `applications`, `tickets`, `comments`), same columns/order, same relationships (`fk_tickets_team`, `fk_tickets_application`, `fk_applications_team`, `fk_comments_ticket`), same FK/index names — differing only in per-stack dialect/runtime. Assert by comparing the migration DDL set across stacks (already true for Django/FastAPI/Spring; confirm Express now matches).
3. **Eight Postgres hashes frozen** (blocking) — MySQL is additive; the Express change is gated behind `supportsReturning`.

---

## 4. Part D — Live MySQL boot (honest, one representative stack)

**Chosen live target: Express + MySQL.** It is the newly-completed and highest-risk path — the only stack whose runtime correctness is *not* guaranteed by an ORM. Booting it proves the adapter, the `$N`→`?` rewrite, insert-then-select, boolean typecast, and **InnoDB FK enforcement** all actually work. (If the Express live path hits an environment issue, FastAPI+MySQL is the lower-risk fallback; the committed target is Express+MySQL.)

**Procedure (mirrors Day 4's static-then-live cadence):**
1. Generate a TeamTracker (related entities) **Express + MySQL** project; `docker compose up --build` → `mysql:8` + backend, wait for the `mysqladmin ping` healthcheck.
2. Migrations apply on startup (`migrate.js`) against real MySQL; `seed.js` creates the admin user.
3. **CRUD + relationships (HTTP):** create a `Team`; create an `Application` referencing that team; create a `Ticket` under both; `GET` them back and confirm the FK data (`teamId`, `applicationId`) round-trips.
4. **FK enforcement (the MySQL proof):** attempt to create a `Ticket` with a non-existent `teamId` → expect MySQL to reject it (InnoDB FK error 1452), surfaced as a 4xx/500 — proving the FK is enforced by the database, not just declared. This is the MySQL analogue of Day 4's related-data live proof.
5. **Determinism unaffected:** the booted project is generated from the same deterministic path (no live edits fed back).

**Honest coverage:** exactly **one** stack is booted live (Express+MySQL), the same discipline as Day 4 (which booted one stack). The other three MySQL stacks are proven by deterministic generation + static dialect correctness (Day 5b), **not** booted live in this arc — stated plainly in the report.

**Bugs found in the boot are fixed in-template**, then the gates are re-checked: any fix to Express MySQL codegen/adapter must keep Express Postgres byte-identical and re-establish only the Express MySQL hash. No fix may move a Postgres hash.

---

## 5. The frozen gates (blocking)

- **Eight Postgres hashes byte-identical** — the four gates (`010098cd…`, `a437a302…`, `dca2254f…`, `68601cc5…`) and four TeamTracker (`9e01210c…`, `dca2b4a7…`, `6d422010…`, `e509309c…`). The Express-MySQL work is gated on `supportsReturning`; Spring/FastAPI/Django are untouched. Diff Postgres first.
- **Six Django/FastAPI/Spring MySQL hashes unchanged** (regression) — Day 6 touches only core (neutral additive field), the two providers (additive `runtime`), the Express plugin/templates, and `index.html`; none affect those three stacks' output.
- **Express MySQL deterministic** — twice-identical; its real hashes established now.

---

## 6. ADR / Law compliance

- **ADR-001 (no AI):** the adapter and codegen branch are pure/deterministic; no AI/network in generation.
- **ADR-003 (determinism):** every combination twice-identical; `supportsReturning` is a deterministic switch.
- **ADR-002 (file separation):** only THRAKSHA-owned files change (repository base, `db.js`); the developer-owned `*.service.js`/`*.routes.js` are untouched — verified by regenerating over a hand-edited file.
- **Law 25 (core neutral):** the new `runtime` capability is generic (“supports RETURNING?”), no pg/mysql words in core; MySQL specifics stay in `mysql.ts`; the driver adapter is Express-plugin-owned. The core still knows only “a database provider.”
- **Note (unchanged):** the illustrative `TIMESTAMPTZ` JSDoc example in `core/database.ts` is documentation — left as-is. The cosmetic `PGPORT`/`pg_port` naming residuals are acceptable-as-is (renaming would move Postgres hashes; not trivially cleanable), so left.

---

## 7. Scope guard — explicitly OUT for Day 6

- **MongoDB** (non-relational) and **multiple databases per project** — not in this arc.
- **More backends / frontends** — no new stacks; React stays scaffolded.
- **Booting all four MySQL stacks live** — one representative stack (Express+MySQL) is booted; the rest are generation-proven (honest coverage table below).
- No change to the entity/relationship **model representation**; no new dialect features beyond what MySQL needs to run.

---

## 8. Done-conditions & proof

### 8.1 Session 2 must achieve
1. Add the neutral `runtime: RuntimeSqlDialect` (`supportsReturning`) to the seam; Postgres `true`, MySQL `false`.
2. Express: MySQL `db.js` adapter (pg-shaped, `$N`→`?`, `{rows,rowCount,insertId}`, `TINYINT(1)`→bool), selected by the neutral flag; branch `buildRepository` insert/update on `supportsReturning` (Postgres byte-identical; MySQL insert-then-select).
3. Add `<option>MySQL</option>` to `ui/index.html`.
4. Keep Express Postgres byte-identical; keep the other seven Postgres hashes frozen; establish Express MySQL hashes.

### 8.2 Session 3 verification (blocking)
- **Eight Postgres hashes byte-identical** (incl. Express `a437a302…`/`dca2b4a7…`).
- **Four-stack MySQL determinism**: twice-identical; Django/FastAPI/Spring MySQL hashes match Day 5b; Express MySQL hashes recorded.
- **Consistent logical schema** across the four MySQL stacks (same tables/columns/relationships/names).
- **Static Express MySQL correctness**: `?` placeholders at runtime (via adapter), no `RETURNING`, insert-then-select present, `mysql2` driver, `mysql:8`, port 3306.
- **Dropdown**: selecting MySQL in the UI routes to `mySqlProvider` (UI==engine path), Postgres path unaffected.
- **Live boot**: Express+MySQL boots, migrates, CRUD+relationships work, FK enforced (error on bad FK). Coverage stated honestly.
- **ADR sweep** + file-separation spot-check (developer Express file survives regen through the new path).
- **Output:** `docs/daily/day-06-report.md`; note Day 7 = Week-1 checkpoint (prove-and-stabilise).

### 8.3 Honest coverage table (to appear in the Session 3 report)

| Backend | MySQL generation | Booted live on MySQL (Day 6) |
|---|---|---|
| Django | ✅ (Day 5b) | ❌ — generation-proven only |
| FastAPI | ✅ (Day 5b) | ❌ — generation-proven only (live fallback candidate) |
| Spring | ✅ (Day 5b) | ❌ — generation-proven only |
| **Express** | ✅ **NEW (Day 6)** | ✅ **booted live — CRUD + relationships + FK enforced** |

### 8.4 Definition of "Day 6 done"
All four backends generate MySQL deterministically with one consistent logical schema; MySQL is selectable in the UI dropdown and routes correctly; the eight Postgres hashes are byte-identical (Express Postgres included); Express MySQL hashes are established; and one MySQL project (Express) has been booted live proving migrations, CRUD, relationships, and FK enforcement work. The database arc (Postgres + MySQL across five-minus-one… four backends) is complete. Written up in `docs/daily/day-06-report.md`.

---

## 9. Risk notes (for Session 2)

- **Express Postgres byte-drift is the #1 risk.** The insert/update branch and the `db.js` selection must leave `supportsReturning:true` emitting today's exact bytes. Diff Express DemoApp + TeamTracker Postgres before writing MySQL code; a moved gate means the branch leaked into the Postgres path.
- **The `$N`→`?` rewrite** depends on ascending single-use placeholders — true today; assert it in Session 2 (diff adapter output for a multi-field, multi-FK entity like `Ticket`).
- **`RETURNING` semantics on “not found”**: MySQL update/delete must return the same not-found signal (null/false → 404) as pg’s empty RETURNING/`rowCount`. Test update/remove of a missing or wrong-owner id.
- **Boolean/decimal representation**: without the adapter’s `TINYINT(1)`→bool typecast, a MySQL Boolean would return `0/1` vs pg’s `true/false` — a logical-parity break at the data layer. Configure the adapter; verify in the live boot.
- **Live-boot environment**: needs Docker + `mysql:8`; the healthcheck must be green before the backend migrates (`depends_on: service_healthy` already set). If Express live is blocked by environment, fall back to FastAPI+MySQL and say so — do not claim a boot that did not happen.
- **Resist scope creep**: no MongoDB, no second-DB-per-project, no new stacks. Day 6 finishes MySQL and stops.
