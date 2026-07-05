# Day 2 — Plan: Relationships in generated code (Express + FastAPI)

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Scope: `belongs-to` FK generation for the Express and FastAPI plugins, matching Day 1's Spring behavior. Django is Day 3.**

Reads honored: `docs/CONSTITUTION.md`, `docs/adr/` (ADR-001/002/003/004, Law 25), `docs/21-DAY-PLAN.md` (Day 2), and Day 1's outputs [`day-01-plan.md`](day-01-plan.md) / [`day-01-report.md`](day-01-report.md).

---

## 0. What Day 1 already gives us (reuse, no core change)

- The Project Model already stores normalized relationships on every entity: `Relationship { kind: 'belongs-to' | 'has-many', target, required }`, in authored order. `addEntity` already **rejects belongs-to forward references** (target must be defined earlier) — so migration ordering is guaranteed for every stack, for free.
- `has-many` is recorded (blueprint) and generates **no schema** — unchanged on Day 2.
- Each plugin's `generateEntity(entity, ctx)` already receives the full `Entity` (with `relationships`). **No `BackendPlugin` interface change and no core change is needed** — Day 2 is plugin-local, exactly like Day 1's Spring work.
- Day 1 froze the naming conventions Day 2 must match for cross-stack consistency:
  - FK column: `<snake(target)>_id` (e.g. `team_id`, `application_id`)
  - referenced table: `<plural(snake(target))>` (e.g. `teams`, `applications`), referenced column `id`
  - FK constraint: `fk_<table>_<snake(target)>` (e.g. `fk_applications_team`)
  - index: `idx_<table>_<snake(target)>_id`
- Demo: Team; Application→Team; Ticket→Application, Team; Comment→Ticket. Migrations already number `V2 teams → V3 applications → V4 tickets → V5 comments` (valid dependency order).

**Guiding invariant (all Day 2 work):** every FK emission is a **loop over `belongs-to` relationships**, so a relationship-free entity produces **byte-identical** output to today. This is the blocking gate.

---

## 1. FastAPI generation (the clean case)

FastAPI uses SQLAlchemy (ORM) + Pydantic (schemas). The FK rides through the schema, so **only three builders change; repository/service/router are untouched.**

Per `belongs-to { target: T, required }` on entity `X`:

### 1.1 `model.py` — add a scalar FK column (mirrors `owner_id`)

Insert after the entity's field columns, **before** `owner_id`/audit columns (fixed position):

```py
application_id = Column(BigInteger, index=True)   # scalar; the DB FK constraint lives in the migration
```

**Decision:** scalar `Column(BigInteger, index=True)` — *not* `ForeignKey('applications.id')` / `relationship()`. This mirrors exactly how `owner_id` is modeled today (scalar, no ORM association), keeps parity with Spring's scalar `Long <t>Id`, and avoids ORM-level target-table coupling/ordering. The real referential constraint is in the SQL migration (§1.3). Object-graph/`relationship()` navigation is explicitly out (§4). `BigInteger` is already imported.

### 1.2 `schemas.py` — carry the FK so CRUD can set the parent

- **`XCreate`** (writable): add `application_id: Optional[int] = None` (or `application_id: int` when `required`). Because `create`/`update` do `Model(**payload.model_dump())` / `setattr`, the FK flows straight through — **no repository change**.
- **`XRead`** (response): add `application_id: Optional[int] = None` so the parent id is returned.
- Placement mirrors the model: after entity fields, before `owner_id`. `Optional` import already present when any optional field/owner exists (and it will, since the FK default is optional).

### 1.3 `migrations/V<n>__create_<table>.sql` — real FK column + constraint + index

Add the column after the field columns / before `owner_id` (like Spring), and after the table:

```sql
application_id BIGINT[ NOT NULL],
...
ALTER TABLE tickets ADD CONSTRAINT fk_tickets_application FOREIGN KEY (application_id) REFERENCES applications (id);
CREATE INDEX idx_tickets_application_id ON tickets (application_id);
```

### 1.4 Unchanged (FastAPI)

`repository.py`, `service_base.py`, `router_base.py`, and both developer files (`service.py`, `routes.py`) — **no change**. The FK is just another attribute carried by the Create schema and the model.

---

## 2. Express generation (the threaded case)

Express uses raw `pg` SQL with **positional placeholders** — no ORM — so the FK must be threaded through the repository's column lists. It is treated as an extra **writable column**, sitting with the entity fields.

Per `belongs-to { target: T, required }` on entity `X` (Express data key uses camelCase, like `ownerId`): column `application_id`, data key `applicationId`.

### 2.1 `<entity>.repository.js` — thread the FK through the SQL (the core change)

Introduce a **writable-columns** notion = `[...fields, ...belongsToFKs]` in fixed order, and thread it everywhere the repository currently uses `fields`:

- **`COLUMNS`** (SELECT list): insert `application_id` after the field columns, before `owner_id`.
- **`rowToObject`**: add `applicationId: row.application_id` (after fields, before `ownerId`).
- **`insert`**: `insertCols` and `insertValues` include the FK column / `data.applicationId`; **positional `$N` placeholders are recomputed from the writable-column count** (so `owner_id`'s index shifts correctly).
- **`update`**: `setClause` includes `application_id = $k`; the `id`/`owner_id` placeholder indices are recomputed from `writableCols.length`.

**Determinism risk to watch (Session 2):** the `$1,$2,…` indices are derived from array lengths. With **zero** FKs the arrays and indices are unchanged → byte-identical. The gate proof (§3) catches any drift.

### 2.2 `<entity>.dto.js` — validate + carry the FK

Add the FK to `validate(body)` so `data.applicationId` is a writable field: an **integer** check (reject non-integer), plus a presence check when `required`. Mirrors the field validation already generated. This lets `POST /api/tickets {"title":…, "applicationId": 7}` set the parent.

### 2.3 `<entity>.model.js` — metadata (optional, for completeness)

Optionally add a metadata entry for the FK (`{ name: 'applicationId', column: 'application_id', type: 'Long', … }`). Low value; include only if it stays trivially deterministic. Not required for CRUD to work (the repository/DTO carry it).

### 2.4 `migrations/V<n>__create_<table>.sql` — real FK column + constraint + index

Identical shape to FastAPI/Spring: `application_id BIGINT[ NOT NULL]` column + `ALTER TABLE … ADD CONSTRAINT fk_<table>_<t> FOREIGN KEY … REFERENCES <t_table>(id)` + `CREATE INDEX idx_<table>_<t>_id`.

### 2.5 Unchanged (Express)

`<entity>.service.base.js`, `<entity>.controller.base.js`, `<entity>.routes.base.js` (they pass `data` through), and both developer files (`<entity>.service.js`, `<entity>.routes.js`) — **no change**.

---

## 3. Determinism & baselines (the critical guarantee)

### 3.1 Additivity — relationship-free output byte-identical

For an entity with `relationships: []`, the belongs-to loop is empty in **every** builder above → zero added/reordered bytes. Implementation guardrails (Session 2):
- Insert FK blocks only at the one fixed position, only inside the loop.
- No new whitespace/blank lines in the relationship-free path.
- Relationships processed in authored order — no maps, no timestamps, no randomness (ADR-003).
- Express: recompute placeholder indices from array lengths (never hardcode an offset that assumes FKs).

### 3.2 Baselines

| Model / stack | Hash | Day-2 expectation |
|---|---|---|
| DemoApp / **Express** | `a437a302…` | **must stay identical** (blocking gate) |
| DemoApp / **FastAPI** | `dca2254f…` | **must stay identical** (blocking gate) |
| DemoApp / Spring | `010098cd…` | untouched (not modified Day 2) |
| DemoApp / Django | `68601cc5…` | untouched (Django is Day 3) |

**Intentionally established this Day:** TeamTracker / **Express** and TeamTracker / **FastAPI** hashes (they gain FK columns). Session 3 records both and proves each is deterministic across two runs. (TeamTracker/Spring stays `9e01210c…` from Day 1; TeamTracker/Django is still relationship-free until Day 3.)

### 3.3 Reuse & neutrality (Law 25)

- **No core change**; **no `BackendPlugin` interface change.** Both plugins already receive `entity.relationships`.
- Add a small, plugin-local helper set to each entity-codegen (mirroring Spring's `belongsToRels`, `fkColumnName`, `fkRefTable`, plus the stack's data/attr name — camel `applicationId` for Express, snake `application_id` for FastAPI). All Node/Python/SQL specifics stay inside the plugins; the core keeps only generic relationship *kinds*.
- Post-change check: `grep -ri "belongs-to\|foreign\|fk_" src/core/` finds nothing new.

---

## 4. Scope guard — explicitly OUT for Day 2

- **Django** relationship generation → Day 3.
- **Live run** (Docker compile/boot, real related-data round-trip) → Day 4.
- **UI** to declare relationships → Day 19.
- **`has-many`** schema/codegen (recorded + drawn only), and **object-graph mappings** (SQLAlchemy `relationship()`, JPA `@ManyToOne`, Express JOIN/eager-load helpers) — deferred.
- Parent-scoped finders / nested routes (`/teams/{id}/tickets`), cascade/`ON DELETE` tuning, many-to-many/join tables, self-relations, forward references (already errored by Day 1's guard).
- Any developer-file change or new file type; any change to the other stacks' output.

---

## 5. Done-conditions (Session 2) & proof method (Session 3)

### 5.1 Session 2 must achieve

1. **FastAPI:** FK in `model.py` (scalar column) + `schemas.py` (`XCreate` writable + `XRead`) + migration (column + constraint + index); repository/service/router unchanged; `describeEntityDefaults` shows each relationship (ADR-004). All gated on belongs-to present.
2. **Express:** FK threaded through `repository.js` (COLUMNS, rowToObject, insert, update — placeholders recomputed) + `dto.js` (validation) + migration (column + constraint + index); service/controller/routes bases unchanged; `describeEntityDefaults` shows each relationship. All gated.
3. **No** core change, **no** interface change, **no** change to Spring/Django output or to any developer file.

### 5.2 Session 3 verification (a Day is not done until every check passes)

**Baseline gate (blocking):**
- DemoApp / Express → `a437a302…` (byte-identical). DemoApp / FastAPI → `dca2254f…` (byte-identical). *If either drifts, stop and fix.*
- DemoApp / Spring `010098cd…` and DemoApp / Django `68601cc5…` re-confirmed unchanged.

**Determinism (ADR-003):**
- TeamTracker / Express generated twice → identical; **record the hash.**
- TeamTracker / FastAPI generated twice → identical; **record the hash.**

**Static correctness (per stack):**
- FKs where expected: `Application`→`team_id`; `Ticket`→`application_id` + `team_id`; `Comment`→`ticket_id`; `Team`→none.
- **FastAPI:** `model.py` has the FK column; `XCreate` **and** `XRead` include it; migration has column + `fk_…` constraint + `idx_…` index.
- **Express:** `repository.js` includes the FK column in `COLUMNS`, `rowToObject`, `insert`, and `update` (with correct placeholder count); `dto.js` validates it; migration has column + constraint + index.
- Migration ordering valid in both stacks: every `REFERENCES <table>` points at a table created in an earlier `V<n>` migration.

**Defaults shown (ADR-004):** each stack's TeamTracker `GENERATION-MANIFEST.txt` lists the belongs-to relationships; DemoApp's manifest (no relationships) is unchanged.

**File separation (ADR-002):** in each stack, write hand logic into a developer file (Express `ticket.service.js`; FastAPI `service.py`), regenerate twice → developer file byte-identical; a tampered Thraksha file is rewritten.

**ADR-001 / Law 25:** no AI/network in the generation path; core and `BackendPlugin` interface unchanged.

**Optional live check:** deferred to **Day 4** (the dedicated live-run day), noted honestly — Day 2 proves Express/FastAPI relationship output is correct and deterministic **statically**, consistent with how Day 1 closed for Spring.

### 5.3 Definition of "Day 2 done"

Express and FastAPI generate real `belongs-to` foreign keys (column + migration constraint + index, and the FK carried so CRUD can set the parent), deterministically; relationship-free DemoApp keeps **`a437a302…`** (Express) and **`dca2254f…`** (FastAPI) exactly; TeamTracker/Express and TeamTracker/FastAPI have new, recorded, reproducible hashes; Spring `010098cd…` and Django `68601cc5…` unchanged; core neutral, interface unchanged, separation and ADRs hold. Written up in `docs/daily/day-02-report.md` (Session 3).

---

## 6. Risk notes (for Session 2)

- **Express placeholder arithmetic** is the top risk — `$N` indices must derive from the writable-column count so `owner_id`/`id` positions shift correctly when FKs are present, and stay identical when absent. Diff DemoApp/Express output first, before anything else.
- **FastAPI import churn** — adding the FK to schemas must not change the `Optional`/`datetime` import lines for relationship-free entities (it won't: gated). Verify DemoApp/FastAPI bytes first.
- **Manifest churn** — relationship lines appear only when relationships exist; DemoApp manifests (both stacks) must be unchanged.
- **Cross-stack naming drift** — reuse Day 1's exact column/constraint/index names so all stacks agree on the schema; only the in-code data key differs per stack convention (camel vs snake).
