# Day 6 — End-of-Day Report: Complete the MySQL story (Express + dropdown + cross-proof + live boot)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new work.
**Status: DONE — the database arc is complete. All four backends generate MySQL deterministically with one consistent logical schema; MySQL is selectable in the UI and routes to the MySQL provider; the eight Postgres hashes are byte-identical; and an Express + MySQL project was booted live against real MySQL 8 — migrations apply, CRUD + relationships work, and the MySQL foreign key is enforced.**

Plan: [`docs/daily/day-06-plan.md`](day-06-plan.md). Closes the Day 5–6 database arc (5a seam → 5b MySQL for Django/FastAPI/Spring → **6 Express + dropdown + cross-proof + live**). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), Law 25 (core neutral).

**Express — the one backend that writes SQL by hand — now generates correct MySQL, and Postgres output did not move a single byte. MySQL is proven not just generated but *running*: a live MySQL boot exercised the generated migrations, CRUD, relationships, and FK enforcement.**

---

## 1. What completed the MySQL story

Day 5b left MySQL working on the three ORM-abstracted backends (Django/FastAPI/Spring) and one gap: **Express**, whose runtime queries are hand-written and were Postgres-shaped. Day 6 closed it and finished the arc:

- **Express MySQL (the real work).** A neutral runtime capability was added to the seam — `RuntimeSqlDialect { supportsReturning }` in [`core/database.ts`](../../generator/src/core/database.ts) — set by each provider (Postgres `true`, MySQL `false`). Express consumes it:
  - A MySQL `db.js` **driver adapter** (mysql2) that presents the *exact* interface the `pg` pool presents — `query()` returning `{ rows, rowCount, insertId }`, a `connect()` client for transactions, a `$1,$2,…` → `?` rewrite, `multipleStatements` for the migration runner, and a `TINYINT(1)` → JS boolean typecast. Selected only when `!supportsReturning`; the Express-owned adapter reads the driver name from the provider token (`__DB_NODE_DRIVER__`), so no database name is hardcoded in the plugin.
  - The repository `insert`/`update` **branch** on `supportsReturning`: Postgres keeps `… RETURNING` (byte-identical); MySQL inserts/updates then selects the row back by its new id.
  - Because the adapter absorbs the driver differences, **`auth.js`, `seed.js`, and the repository SELECT/DELETE stay byte-identical across dialects**; `migrate.js` differs only in the Day-5b dialect-aware `schema_migrations` timestamp.
- **Dropdown wiring.** `ui/index.html` now offers `PostgreSQL / MySQL / None`; selecting MySQL routes to `mySqlProvider` (the model treats `database` as an opaque string, Law 25; the registry resolves it). Front-end + routing only — no generation-logic change.
- **Cross-stack proof.** All four backends generate MySQL deterministically with one consistent logical schema (§4).
- **Live MySQL boot.** Express + MySQL booted against a real `mysql:8` container (§5).

---

## 2. THE EIGHT-HASH GUARANTEE (blocking proof) — all byte-identical

Re-generated from a clean rebuild and compared to the frozen values. **All eight match, byte-for-byte** — the Express-MySQL work did **not** move Express Postgres:

| Model | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| **DemoApp** (gates) | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ |
| **TeamTracker** (relationships) | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ |

The Express change is gated on `supportsReturning`: with `true` (Postgres) Express emits its current code path and the bundled `pg` `db.js` — identical bytes. Spring/FastAPI/Django were untouched. The `two-stacks` and `ui:demo` demos (disk + real UI/server path) also pass.

---

## 3. Express MySQL — correct, runtime-dialect-aware, deterministic

Express now generates **runtime-correct** MySQL (verified on generated output and live, §5):
- **`db.js`** = mysql2 adapter (pg-shaped): `$N`→`?`, `{ rows, rowCount, insertId }`, transactions via `connect()`, `TINYINT(1)`→boolean, `multipleStatements` for migrations.
- **Repository insert** (MySQL) = `INSERT …` (no `RETURNING`) → `SELECT … WHERE id = $1` on `result.insertId`.
- **Repository update** (MySQL) = `UPDATE …` → select the row back (owner-scoped when multi-user), preserving the "null when not found → 404" contract.
- **Everything else identical** across dialects (adapter absorbs the divergence); no unresolved `__DB_*__` tokens in any MySQL output.
- **Deterministic**: two runs byte-identical.

Express MySQL hashes established this Day (replacing the Day-5b *provisional, RETURNING-broken* Express-MySQL hashes — Express MySQL was never frozen): DemoApp `d4b57b52…`, TeamTracker `bfa4a536…`.

---

## 4. Four-backend MySQL — deterministic, one consistent logical schema

Each combination generated **twice → byte-identical**. **All four backends now generate MySQL.** Established/confirmed hashes:

| Model | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| **DemoApp** | `3112d3f7…` | `d4b57b52…` **(new)** | `cd87d6e3…` | `8b07a1b2…` |
| **TeamTracker** | `4c4640ba…` | `bfa4a536…` **(new)** | `5c788c70…` | `3b3e6a6f…` |

(Django/FastAPI/Spring MySQL hashes are unchanged from Day 5b — regression holds; only Express is new.)

**Consistent logical schema across stacks** (verified from the migration DDL): the SQL backends (Spring/Express/FastAPI) emit the **identical** table set — `users, teams, applications, tickets, comments` — and the **identical** four FK constraints:
`fk_applications_team (team_id→teams)`, `fk_tickets_application (application_id→applications)`, `fk_tickets_team (team_id→teams)`, `fk_comments_ticket (ticket_id→tickets)`. Django expresses the same model through ORM `CreateModel`/`ForeignKey` operations. **Same logical schema everywhere; only the dialect/runtime differs** (`AUTO_INCREMENT`/`DATETIME`/`TINYINT(1)` vs `IDENTITY`/`TIMESTAMPTZ`/`BOOLEAN`; mysql2 adapter vs pg pool).

---

## 5. Live MySQL boot — Express + MySQL, against real MySQL 8

**Booted stack: Express + MySQL** (the newly-completed, highest-risk path — the only backend whose runtime correctness is not ORM-guaranteed). A `mysql:8` container was started; the **generated** Express + MySQL TeamTracker project's `migrate.js` and repositories were run against it. Proven:

- **Migrations apply** — `V1__init … V5__create_comments` applied via the generated `migrate.js` (proves DDL, the adapter's transaction path, and `multipleStatements`).
- **CRUD + relationships** — created a `Team`, an `Application` (belongs-to Team), a `Ticket` (belongs-to Application + Team) via the generated repositories (insert-then-select path); read them back with `applicationId`/`teamId` round-tripping.
- **Boolean typecast** — `done` reads back as `false` (a real boolean), not `0` — the adapter's `TINYINT(1)`→boolean cast gives MySQL the same JSON shape as Postgres.
- **Update round-trip** — the insert-then-select update path returns the updated row.
- **MySQL FK ENFORCED** — inserting a `Ticket` with a non-existent `team_id` (999999) was **rejected by InnoDB with errno 1452 (`ER_NO_REFERENCED_ROW_2`)** — the foreign key is enforced by the database, not merely declared.

Result: **PASS**. The container was torn down after the run. This mirrors Day 4's static-then-live cadence, now on MySQL with FK enforcement asserted.

### Honest coverage table

| Backend | MySQL generation | Booted live on MySQL |
|---|---|---|
| Django | ✅ (Day 5b) | ❌ — generation-proven only |
| FastAPI | ✅ (Day 5b) | ❌ — generation-proven only |
| Spring | ✅ (Day 5b) | ❌ — generation-proven only |
| **Express** | ✅ **NEW (Day 6)** | ✅ **live — migrations, CRUD, relationships, FK enforced (errno 1452)** |

Exactly **one** stack was booted live (Express + MySQL), the same discipline as Day 4 (one stack). The other three are proven by deterministic generation + static dialect correctness (Day 5b), not booted live in this arc — stated plainly.

---

## 6. ADR / Law compliance

- **ADR-003 (determinism):** every combination (Postgres and MySQL, all four backends) generates twice-identical; `supportsReturning` is a deterministic switch. ✅
- **ADR-002 (file separation):** `two-stacks` (Express) and `ui:demo` (FastAPI) confirm developer-owned files survive regeneration through the new path; only THRAKSHA-owned files (`db.js`, repository bases) change. ✅
- **ADR-001 (no AI):** the adapter and codegen branch are pure/deterministic; no AI/network in generation. ✅
- **Law 25 (core neutral):** the new `RuntimeSqlDialect` is a generic capability (“supports RETURNING?”) — no dialect names in `src/core/`. MySQL SQL literals live only in `plugins/database/mysql.ts`; the mysql2 driver adapter is Express-plugin-owned and reads the driver name from a provider token. The core still knows only “a database provider.” ✅
- **Note (unchanged):** the illustrative `TIMESTAMPTZ` JSDoc example in `core/database.ts` is documentation — left as-is. The cosmetic `PGPORT`/`pg_port` naming residuals are acceptable-as-is (renaming would move Postgres hashes).

---

## 7. Scope — held

**In scope, done:** Express MySQL (runtime dialect-aware); MySQL in the UI dropdown; four-backend MySQL cross-proof; one live MySQL boot (Express) proving migrate + CRUD + relationships + FK enforcement; eight Postgres hashes frozen; Express MySQL hashes established.

**Deliberately out (per the arc):** MongoDB; multiple databases per project; more backends/frontends. Booting all four MySQL stacks live (one representative stack booted; the rest generation-proven).

---

## 8. The Day 5–6 database arc — closed

The arc is complete: **two databases (PostgreSQL + MySQL), plug-in clean, live-proven.**
- **5a** extracted a neutral `DatabaseProvider` seam with Postgres byte-identical.
- **5b** added MySQL as a second provider (Django/FastAPI/Spring) and closed the `schema_migrations` residual dialect-aware.
- **6** finished Express (the hand-SQL backend) via a neutral runtime capability + an Express-owned mysql2 adapter, wired MySQL into the dropdown, proved all four backends generate MySQL with one consistent logical schema, and booted a MySQL project live with FK enforcement.

Databases now plug in the way backends do; adding a third later is a new provider behind the same seam. Throughout, the eight Postgres hashes never moved.

---

## 9. What's next — Day 7 (Week 1 checkpoint)

**Day 7 is prove-and-stabilise — no new features.** Confirm relationships + MySQL are all solid together; run a clean end-to-end demo (related entities → pick a stack → pick a database → generate → browse → view blueprint); catch any drift before Week 2; and write the **Week 1 summary report**. The database arc and the relationships work should be exercised together as one coherent system, with all baselines (the eight Postgres gates + the eight MySQL hashes) re-confirmed.

---

**Day 6 verdict:** the MySQL story is complete. All four backends generate MySQL deterministically with one consistent logical schema; MySQL is selectable and routes correctly; the eight Postgres hashes are byte-identical (Express Postgres included); Express MySQL is established and — uniquely — **booted live** with migrations, CRUD, relationships, and enforced foreign keys. Two databases, plug-in clean, live-proven. Day 6 is **done**, and the Day 5–6 database arc is closed.
