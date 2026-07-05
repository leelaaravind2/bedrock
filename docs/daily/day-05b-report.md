# Day 5b — End-of-Day Report: MySQL as a second database provider (behind the seam)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new work, no dropdown, no live boot.
**Status: DONE — MySQL is a second `DatabaseProvider` behind the Day-5a seam. All eight Postgres hashes are byte-identical (frozen); MySQL generates deterministically for Django, FastAPI, and Spring with correct MySQL dialect and the same logical schema as Postgres.**

Plan: [`docs/daily/day-05b-plan.md`](day-05b-plan.md). Part of the Day-5 arc (5a seam → **5b MySQL** → Day-6 prove+dropdown+live). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), Law 25 (core neutral).

**MySQL was added purely as a new provider — the four backend plugins and the core contract were not changed in shape. Postgres output did not move a single byte, including the `schema_migrations` residual, which is now dialect-aware without disturbing the frozen gates.**

---

## 1. What was added

A second `DatabaseProvider` implementing the same seam Day 5a extracted — no core-contract change, no backend-logic change.

- **`src/plugins/database/mysql.ts`** — `mySqlProvider`, holding every MySQL string: the `SqlDialect` (`identityPrimaryKey`, `bigInt`, `columnType`, `timestampDefaultNow`, `foreignKey`, `index`), the MySQL users-table DDL, and the shell `tokens()` (Docker image, port, volume, compose env/healthcheck fragments, drivers, connection URL/scheme/engine, JDBC/Flyway artifacts, display name, and the `schema_migrations` timestamp).
- **`src/plugins/database-registry.ts`** — one line: `MySQL: mySqlProvider`. Selecting the Phase-A `database` answer `'MySQL'` now routes to it, exactly as `'PostgreSQL'` routes to `postgresProvider`.
- **`schema_migrations` residual closed** (the Day-5a hand-off): the two custom migrate-runners' bookkeeping DDL is now dialect-aware via a `__DB_SCHEMA_MIGRATIONS_TS__` token — see §5.
- **Provider token surface completed for a real second dialect:** the docker-compose `db` service carried Postgres facts beyond the image (init env-var **names**, the data-volume path, and the `pg_isready` healthcheck). These are now provider tokens so the generated MySQL compose is coherent MySQL, not a Postgres/mysql hybrid. Two token values (the compose env block and the healthcheck) embed the shell's project tokens; each plugin now substitutes provider tokens **before** project tokens so they resolve. This reordering is byte-safe (no existing token value embeds a project token) and was proven by the frozen gates.

MySQL and Postgres are selected by the same `database` answer; the backend receives a provider handle and never learns which database it is (Law 25).

---

## 2. THE EIGHT-HASH GUARANTEE (blocking proof) — all byte-identical

Postgres output was re-generated from a clean rebuild and compared to the frozen values. **All eight match, byte-for-byte:**

| Model | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| **DemoApp** (gates) | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ |
| **TeamTracker** (relationships) | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ |

Full digests verified this session (e.g. Spring/DemoApp `010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c`, Django/TeamTracker `e509309cd6c500e6633e0dca3d3fe52a695802e29ec4114e8c1fccac624e52c6`).

**No Postgres hash moved.** MySQL is a new branch never taken when Postgres is selected; the only edits to shared/Postgres-reachable code (the token-merge reorder, the Django driver-token split, the `schema_migrations` substring token, and the compose tokenisation) were all engineered to expand to the exact prior Postgres bytes. The `two-stacks` and `ui:demo` demos (which write to disk and assert the DemoApp baselines through the real UI/server path) also pass — confirming byte-identity on the disk path, not just the in-memory file set.

---

## 3. MySQL generation — deterministic, and dialect-correct

### 3.1 Determinism + established hashes

Each MySQL combination was generated **twice → byte-identical**. The new MySQL hashes (hash axis is now `backend × database × model`):

| Model | Django | FastAPI | Spring |
|---|---|---|---|
| **DemoApp** | `8b07a1b2…` | `cd87d6e3…` | `3112d3f7…` |
| **TeamTracker** | `3b3e6a6f…` | `5c788c70…` | `4c4640ba…` |

(For the record, Express+MySQL also generates deterministically — `5b5d40b7…` / `210a2fb4…` — but is **not** claimed as supported; see §4.)

No AI, no randomness, no wall-clock in the path — dialect selection is a deterministic switch (ADR-001/003).

### 3.2 Correct MySQL dialect throughout (verified on generated output)

- **Auto-increment PK:** `id BIGINT AUTO_INCREMENT PRIMARY KEY` (users table and every entity).
- **Timestamps:** `created_at`/`updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- **Booleans:** `TINYINT(1)` (e.g. `done TINYINT(1)`, `enabled TINYINT(1) NOT NULL DEFAULT TRUE`).
- **Decimal:** `DECIMAL(19, 2)` — implemented in the provider (not exercised by DemoApp/TeamTracker, which have no Decimal field; honest note).
- **FK constraints:** `ALTER TABLE tickets ADD CONSTRAINT fk_tickets_team FOREIGN KEY (team_id) REFERENCES teams (id);` — standard SQL, byte-identical to Postgres; enforced because MySQL 8 defaults to InnoDB.
- **Indexes:** `CREATE INDEX …` / `CREATE UNIQUE INDEX ux_tickets_code ON tickets (code);` — byte-identical to Postgres.
- **Driver per backend:** Node `mysql2`; FastAPI `PyMySQL==1.1.1`; Django `mysqlclient==2.2.4`; Spring `com.mysql:mysql-connector-j` + `flyway-mysql`.
- **Connection config:** FastAPI `mysql+pymysql://…`; Django `ENGINE = django.db.backends.mysql`; Spring `jdbc:mysql://…:3306/…`; port `3306` everywhere.
- **Docker image:** `mysql:8`, with `MYSQL_DATABASE/USER/PASSWORD/ROOT_PASSWORD` init env, `mysqladmin ping` healthcheck, and a `/var/lib/mysql` data volume.
- **Bookkeeping table:** `schema_migrations (… applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)` (§5).
- **No unresolved tokens:** a scan of every MySQL output across all backends and both demo models found **zero** stray `__DB_*__` placeholders.

### 3.3 Same logical schema, different dialect (the honest list)

MySQL and Postgres produce the **same logical schema** — same tables (`users`, `teams`, `applications`, `tickets`, `comments`), same columns in the same order, same relationships (`fk_tickets_team`, `fk_tickets_application`, `fk_comments_ticket`, `fk_applications_team`), same FK/index **names**, same migration file structure and V-numbering, same application code. They differ **only** in dialect literals:

| Concept | PostgreSQL | MySQL 8 |
|---|---|---|
| Auto-increment PK | `BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY` | `BIGINT AUTO_INCREMENT PRIMARY KEY` |
| Timestamp type + default | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| Boolean | `BOOLEAN` | `TINYINT(1)` |
| Decimal | `NUMERIC(19, 2)` | `DECIMAL(19, 2)` |
| FK constraint / index SQL | `ALTER TABLE … ADD CONSTRAINT … REFERENCES …;` / `CREATE [UNIQUE] INDEX …;` | **identical** |
| `VARCHAR(n)` / `TEXT` / `INTEGER` / `BIGINT` / `DATE` | — | **identical** |
| `schema_migrations` timestamp | `TIMESTAMPTZ NOT NULL DEFAULT now()` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` |
| Driver (Node/FastAPI/Django/Spring) | `pg` / `psycopg2-binary` / `psycopg2-binary` / `org.postgresql:postgresql`+`flyway-database-postgresql` | `mysql2` / `PyMySQL` / `mysqlclient` / `com.mysql:mysql-connector-j`+`flyway-mysql` |
| Connection scheme / engine | `postgresql+psycopg2` · `jdbc:postgresql` · `django.db.backends.postgresql` | `mysql+pymysql` · `jdbc:mysql` · `django.db.backends.mysql` |
| Docker image / init env / healthcheck / volume / port | `postgres:16-alpine` · `POSTGRES_*` · `pg_isready` · `/var/lib/postgresql/data` · 5432 | `mysql:8` · `MYSQL_*`(+root) · `mysqladmin ping` · `/var/lib/mysql` · 3306 |

**Honest MySQL semantics:** `DATETIME` carries no timezone (the app stores UTC); a column default must be `CURRENT_TIMESTAMP` (not `now()`); `updated_at` is left app-managed (no `ON UPDATE CURRENT_TIMESTAMP`) so its behaviour matches Postgres exactly; FK enforcement relies on InnoDB (the MySQL 8 default, so no explicit `ENGINE` clause). Django's ORM handles all of these automatically per `ENGINE`.

---

## 4. Which backends got MySQL — stated exactly

**MySQL is supported on three backends: Django, FastAPI, and Spring.** All three consume the seam and have their runtime query SQL abstracted (Django ORM, SQLAlchemy, Hibernate), so once `mySqlProvider` exists they generate correct, runnable MySQL projects with no backend-logic change — the DDL, drivers, connection, image, and compose are all provider-supplied.

**Express is deliberately NOT claimed for MySQL.** Its DDL generates as MySQL (and deterministically), but its hand-written repositories still emit `$1, $2, …` placeholders and `updated_at = now()` — Postgres runtime SQL that mysql2 rejects (`?` placeholders, `CURRENT_TIMESTAMP`). That is a **runtime-SQL divergence outside the DDL seam**; wiring it needs a placeholder abstraction and is Day 6's focused work. We do not over-claim Express-MySQL.

---

## 5. The `schema_migrations` residual — closed, dialect-aware, Postgres byte-identical

The Day-5a hand-off: the two custom migrate-runners (`express/templates/src/migrate.js`, `python/templates/app/migrate.py`) held their bookkeeping DDL inline with a Postgres timestamp, left inline because FastAPI's is a 3-line concatenated string literal that a whole-DDL token would have reflowed (moving the FastAPI hash).

**Resolution (byte-safe):** only the contiguous divergent substring `TIMESTAMPTZ NOT NULL DEFAULT now()` was tokenised as `__DB_SCHEMA_MIGRATIONS_TS__` — the surrounding DDL is standard SQL, identical across dialects. The token expands to the exact prior string for Postgres, so the physical structure (including FastAPI's 3-line split) is untouched. Verified this session:

- **Postgres** — FastAPI & Express: `… applied_at TIMESTAMPTZ NOT NULL DEFAULT now())` (byte-identical to before; the FastAPI/Express Postgres hashes did **not** move).
- **MySQL** — FastAPI & Express: `… applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`.

**No Postgres hash moved.** The preferred path in the plan held — the residual was extracted without any baseline re-establishment.

---

## 6. ADR / Law compliance

- **ADR-003 (determinism):** every combination (Postgres and MySQL) generates twice-identical. ✅
- **ADR-002 (file separation):** `two-stacks` (Express) and `ui:demo` (FastAPI) confirm a developer file survives repeated regeneration through the provider path, byte-identical. The seam only affects Thraksha-owned dialect output. ✅
- **ADR-001 (no AI):** no AI/network in generation — providers return fixed strings. ✅
- **Law 25 (core neutral):** `src/core/` contains no dialect logic — a grep for MySQL/Postgres dialect literals finds only the interface's explanatory comments and the single illustrative `TIMESTAMPTZ` **JSDoc example** on `timestampDefaultNow()` (documentation, not logic — left untouched, as intended). Every MySQL literal lives only in `src/plugins/database/mysql.ts`. The core knows "a database provider," not "MySQL." ✅

---

## 7. Scope — held

**In scope, done:** the MySQL provider behind the seam; registration; the `schema_migrations` residual closed dialect-aware; MySQL generation for Django/FastAPI/Spring (entities **and** relationships); eight Postgres hashes frozen; six MySQL hashes established.

**Deliberately out (per the arc → Day 6):**
- **Database dropdown wiring** (MySQL as a selectable UI option).
- **Cross-stack MySQL proof** (the covered backends side-by-side on one related model, asserted logically equal).
- **Live MySQL boot** (`docker compose up` a MySQL project; migrations apply; related data + FK enforcement work).
- **Express MySQL** (the `$1`→`?` / `now()`→`CURRENT_TIMESTAMP` runtime-placeholder change).
- MongoDB, multiple databases per project — not in this arc.

**Honest notes (not defects):**
- The compose tokenisation was **larger than the plan's "essentially free" framing** anticipated — the `db` service carried Postgres init env-var names, a volume path, and the `pg_isready` healthcheck, not just the image tag. All are now provider tokens so the MySQL compose is coherent; *running* it is Day 6.
- **Cosmetic residual:** app-side env-var **names** are kept Postgres-flavoured for byte-identity — `PGPORT`/`pg_port` (functional for MySQL, just Postgres-named) and Spring's vestigial, unused `.env.example` `POSTGRES_*` override keys. Flagged, not hidden; a later cleanup can neutralise the names with its own re-established hashes if desired.
- `DECIMAL(19,2)` is implemented but not exercised by the demo models (no Decimal field).

---

## 8. What Day 6 picks up

**Day 6 — prove MySQL across the stacks + the dropdown + live.**
1. **Wire MySQL into the database dropdown** so a developer selects it in the UI (the registry already resolves it; this is UI/flow wiring), confirming the Postgres path stays unaffected.
2. **Cross-stack MySQL proof:** one related model generated as MySQL across the covered backends, shown to carry the same logical schema (same tables/columns/relationships) with each stack's correct dialect.
3. **Live MySQL boot:** `docker compose up` a generated MySQL project, confirm the migrations apply, related data can be created across the FK relationships, and FK enforcement works — mirroring the relationships' static-then-live cadence.
4. **Express MySQL:** add the runtime-placeholder abstraction (`$1`→`?`, `now()`→`CURRENT_TIMESTAMP`) so Express joins the MySQL-supported set.

Then Day 7 is the Week-1 checkpoint (prove-and-stabilise; no new features).

---

**Day 5b verdict:** MySQL is a real second database, added the way the seam intended — a new provider holding every dialect string, one registry line, and zero backend-logic change. The eight Postgres hashes are byte-identical (the seam and the byte-safe residual extraction guaranteed it), and MySQL generates deterministically for Django, FastAPI, and Spring with correct MySQL dialect and the same logical schema as Postgres. The `schema_migrations` residual is closed without disturbing a single Postgres byte. Express, the dropdown, cross-stack proof, and the live boot are Day 6. Day 5b is **done**.
