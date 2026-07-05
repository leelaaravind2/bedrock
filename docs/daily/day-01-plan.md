# Day 1 — Plan: Relationships in generated code (design + Spring)

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Scope: model representation of relationships + Spring plugin generation. Other stacks are Days 2–3.**

Reads honored as binding: `docs/CONSTITUTION.md`, `docs/adr/` (esp. ADR-001, ADR-002, ADR-003, ADR-004; Law 25), `docs/INTAKE-SPEC.md`, `docs/21-DAY-PLAN.md` (Day 1).

---

## 0. Where we start (facts this plan builds on)

- The Project Model already carries a per-entity `relationships` field (`EntitySpec.relationships?: unknown[]` → stored `Entity.relationships: unknown[]`). `createEntity` copies it verbatim; nothing normalizes or interprets it today.
- **No plugin reads `relationships` for generation** — Spring/Express/FastAPI/Django entity codegen use only `entity.fields` (+ `multiUser`). So relationships are currently *blueprint-only metadata*.
- The blueprint viewer already draws connections by reading each relationship's `target` (via `relTarget()` = `rel.target || rel.to || rel.entity || rel.name`).
- The TeamTracker demo already authors relationships in the shape `{ type: 'belongs-to', target: '<Entity>' }` for: Application→Team, Ticket→Application, Ticket→Team, Comment→Ticket.
- Spring per-entity generation (Thraksha-owned, regenerated) produces: `XBase.java` (`@MappedSuperclass`, `@Column` fields, extends `BaseOwnedEntity`), `XRepository.java`, `XDto.java`, `XServiceBase.java`, `XControllerBase.java`, `V<n>__create_<table>.sql`. Developer-owned (created once): `X.java`, `XService.java`, `XController.java`.
- **Owner scoping is the precedent to copy.** Multi-user stores the owner as a **scalar `Long ownerId`** with `@Column(name = "owner_id")` on `BaseOwnedEntity` + an `owner_id BIGINT` column + `idx_<table>_owner_id`. Relationships will mirror this scalar-FK pattern exactly.
- Current baselines that MUST NOT move for relationship-free models: **Spring `010098cd…`**, Express `a437a302…`, FastAPI `dca2254f…`, Django `68601cc5…` (all from the single-`Ticket` DemoApp, which has **no** relationships).

---

## 1. Model representation (technology-neutral, minimal, deterministic)

Add a small, generic normalized shape in the **Project Model** (core) — no Java/JPA/SQL words anywhere; the core only records intent (Law 1, Law 25). Plugins interpret it.

### 1.1 The shape

```ts
// input (what a model author / future UI supplies)
interface RelationshipSpec {
  kind: 'belongs-to' | 'has-many';   // mandatory
  target: string;                     // mandatory — the related entity's name
  required?: boolean;                 // default: false (optional) — ADR-004
}

// stored (normalized on the entity)
interface Relationship {
  kind: 'belongs-to' | 'has-many';
  target: string;
  required: boolean;                  // resolved (default false)
}
```

- `createEntity` normalizes `relationships` into `Relationship[]` in **authored order** (no sorting, no maps — determinism).
- **Back-compat:** accept `type` as an alias for `kind` (the existing TeamTracker demo uses `type`). Session 2 will also update `teamtracker-model.ts` to the canonical `kind`. Either way `target` is unchanged, so the blueprint keeps working.
- **Defaults shown (ADR-004):** `required` defaults to `false`; the applied default is reported the same way field defaults are (via the plugin's `describeEntityDefaults` / manifest notes — see §2.4).

### 1.2 Semantics (smallest thing that covers the demo)

- **`belongs-to`** is the **only relationship that generates schema.** Entity `A belongs-to B` ⇒ `A` gets a foreign-key column referencing `B`. The FK physically lives on the "many" side. This alone fully models the demo chain Team → Application → Ticket → Comment (every link is a `belongs-to`).
- **`has-many`** is the **inverse view** of a `belongs-to` and generates **no column and no migration** on Day 1 (the FK already exists on the other side). It may be recorded in the model and drawn in the blueprint, but Spring codegen for `has-many` (e.g. a read-only `@OneToMany(mappedBy=…)` collection) is **explicitly deferred** (see §4). Keeping `has-many` schema-free avoids duplicate columns and keeps determinism trivial.

### 1.3 Deterministic constraints (validated, not guessed — ADR-003)

- **Target must exist** and must be **defined earlier in the model than the source** (topological/authoring order). This guarantees the referenced table's migration (`V<earlier>`) runs before the referencing one (`V<later>`), so an inline FK constraint is valid. The demo already satisfies this (Team before Application before Ticket before Comment).
- If a target is missing or is a forward reference, **fail loudly with a clear error** (deterministic: same input → same error), rather than emitting half-working SQL. Forward references / reordering are future scope.
- No self-relations on Day 1 (a `belongs-to` to the same entity) — deferred to Day 4 hardening "if trivial."

---

## 2. Spring generation — exactly what changes

All relationship output is **Thraksha-owned** and lives in files the platform already regenerates. **No new file types. No developer-file changes.** ADR-002 holds by construction: the FK is emitted only in `XBase.java` (mapped superclass), `XDto.java`, and the migration — never in `X.java` / `XService.java` / `XController.java`.

For each `belongs-to { target: T, required }` on entity `X` (deterministic naming):

| Thing | Convention (from `T`) | Example (Ticket belongs-to Application) |
|---|---|---|
| Java field | `${camel(T)}Id : Long` | `applicationId` |
| DB column | `${snake(T)}_id` | `application_id` |
| Target table | `plural(snake(T))` | `applications` |
| FK constraint | `fk_${sourceTable}_${snake(T)}` | `fk_tickets_application` |
| Index | `idx_${sourceTable}_${snake(T)}_id` | `idx_tickets_application_id` |

### 2.1 `XBase.java` (`@MappedSuperclass`) — scalar FK, mirroring `ownerId`

For each belongs-to, add (after the entity's own fields, in relationship order):

```java
@Column(name = "application_id"[, nullable = false])   // nullable=false only when required
private Long applicationId;

public Long getApplicationId() { return applicationId; }
public void setApplicationId(Long applicationId) { this.applicationId = applicationId; }
```

**Decision: scalar `Long fooId` + `@Column`, NOT a `@ManyToOne Foo foo` object graph.** Rationale: (a) it mirrors the proven `ownerId` handling exactly; (b) needs **no cross-entity import**, so the mapped-superclass base stays self-contained and ordering-independent; (c) it is the minimal deterministic unit. The richer JPA association object (`@ManyToOne`/`@JoinColumn` with the entity type, navigation, fetch/cascade) is deferred to complex relation types (Day 19+). This is the single most important simplifying choice of Day 1.

### 2.2 `V<n>__create_<table>.sql` — column + FK + index

Insert, in the CREATE TABLE, **after the declared field columns and before `owner_id`/audit columns** (a fixed position):

```sql
application_id BIGINT[ NOT NULL],
```

After the table, add (deterministic order — relationships in authored order, each block emitted the same way `owner_id`'s index is):

```sql
ALTER TABLE tickets
  ADD CONSTRAINT fk_tickets_application
  FOREIGN KEY (application_id) REFERENCES applications (id);

CREATE INDEX idx_tickets_application_id ON tickets (application_id);
```

(The inline-vs-ALTER form is a Session-2 detail; either is fine as long as it is byte-stable and the referenced table already exists per §1.3.)

### 2.3 `XDto.java` — make the FK usable through CRUD

Add `applicationId` to: the DTO field list, `fromEntity` (copy out for responses), `applyTo` (copy in on create/update), and accessors. Validation: `@NotNull` when `required`. This lets the existing CRUD actually set a parent on create (`POST /api/tickets {"title":…, "applicationId": 7}`) with **no change to repository/service/controller bases** — CRUD already round-trips whatever the DTO carries.

### 2.4 Defaults shown (ADR-004)

`describeEntityDefaults(entity)` (Spring) gains one line per relationship, e.g.
`Ticket belongs-to Application: application_id (optional — default; nullable)`.
The core renders these verbatim into `GENERATION-MANIFEST.txt` (it already renders the plugin's per-entity notes). No core interpretation.

### 2.5 What does NOT change (Spring)

`XRepository.java`, `XServiceBase.java`, `XControllerBase.java`, and all three developer files are **unchanged** on Day 1. No parent-scoped finders (`findAllByApplicationId`) — out of scope (§4).

---

## 3. Determinism & baselines (the critical guarantee)

### 3.1 Additivity — relationship-free output is byte-identical to today

Every relationship-emitting code path is **gated on a non-empty relationships list** and is realized as a **loop over `entity.relationships`**. For an entity with `relationships: []`:
- the loop body never runs → **zero** added/reordered lines in `XBase.java`, `XDto.java`, or the migration;
- the normalization in `createEntity` yields `relationships: []` → `getState()` is byte-identical → the model snapshot is unchanged.

Therefore the single-`Ticket` DemoApp (no relationships) must generate **exactly** the current bytes.

**Implementation guardrails for Session 2 (to avoid incidental drift):**
- Do not reorder imports, fields, or columns; insert relationship blocks only at the one fixed position, and only when present.
- No new blank lines / whitespace in the relationship-free path.
- No timestamps, no randomness, no map iteration — relationships processed in authored order (ADR-003).

### 3.2 Baselines

- **Must stay identical (relationship-free):** Spring **`010098cd…`** (DemoApp). Express `a437a302…`, FastAPI `dca2254f…`, Django `68601cc5…` are untouched by Day 1 (their codegen isn't modified) but will be re-confirmed anyway.
- **Intentionally changes (has relationships):** the **TeamTracker Spring** hash. Its current value `c8a46862…` was produced *without* FK codegen; once FKs generate, TeamTracker legitimately gains `*_id` columns and its Spring hash changes. Session 3 **re-establishes and records** the new TeamTracker Spring hash and proves it is deterministic across two runs. (Express/FastAPI/Django TeamTracker hashes stay as-is until Days 2–3.)

### 3.3 Core neutrality (Law 25)

- The only core change is generic relationship **normalization** in `project-model.ts` (`kind`/`target`/`required`, defaulting) — no technology words. The FK/`@Column`/SQL mapping lives entirely in the Spring plugin.
- The plugin already receives the full `Entity` (with `relationships`) via `generateEntity(entity, ctx)`; **no change to the `BackendPlugin` interface** is required.
- Verify post-change: `grep -ri "spring|jpa|fk|foreign" src/core/` finds nothing new.

---

## 4. Scope guard — explicitly OUT for Day 1

- **Other stacks:** Express + FastAPI (Day 2), Django (Day 3). Day 1 is Spring only.
- **UI for declaring relationships:** the entity-screen "belongs-to" picker is **Day 19**. Day 1 relationships are authored in model code (e.g. TeamTracker) only.
- **`has-many` schema/collection codegen** (`@OneToMany(mappedBy)`, nested reads) — recorded + drawn, not generated.
- **JPA association objects** (`@ManyToOne Foo foo` navigation, fetch type, cascade) — Day 1 uses scalar `fooId`.
- **Many-to-many / join tables, polymorphic, self-relations, `ON DELETE` behaviors** beyond a single documented default.
- **Parent-scoped finders / nested routes** (`/teams/{id}/tickets`), cascade delete, referential-action tuning.
- **Forward references / entity reordering** — Day 1 requires target defined earlier; else a clear deterministic error.
- **Any developer-file change or new developer-file type.**

---

## 5. Done-conditions (Session 2) & proof method (Session 3)

### 5.1 Session 2 must achieve

1. Generic relationship **normalization** in the Project Model (`kind`/`target`/`required`, authored order, `type`→`kind` alias, validation per §1.3).
2. Spring `belongs-to` FK generation: `XBase.java` scalar `fooId` + `@Column`; `XDto.java` field + fromEntity/applyTo/accessors (+`@NotNull` if required); migration `foo_id` column + FK constraint + index — **all gated on relationships present**, at the fixed positions in §2.
3. `describeEntityDefaults` (Spring) reports each relationship (ADR-004).
4. Update `teamtracker-model.ts` to canonical `kind` (demo content).
5. **No** change to Spring repository/service/controller bases, developer files, the core beyond §3.3, the `BackendPlugin` interface, or the other three plugins.

### 5.2 Session 3 verification (a Day is not done until every check passes)

**Baseline gate (blocking):**
- Regenerate **DemoApp / Spring** → hash **== `010098cd…`** (byte-identical; relationship-free unaffected). *If it drifts, stop and fix before closing.*
- Re-confirm Express `a437a302…`, FastAPI `dca2254f…`, Django `68601cc5…` unchanged (they should be, untouched).

**Determinism (ADR-003):**
- Generate **TeamTracker / Spring** twice → identical hash. **Record the new TeamTracker Spring hash** in the Day-1 report as the established value.

**Correctness (static inspection of generated TeamTracker Spring):**
- `ApplicationBase.java` has `applicationId`? No — has `teamId` + `@Column(name = "team_id")`; `TicketBase.java` has `applicationId` **and** `teamId`; `CommentBase.java` has `ticketId`. `TeamBase.java` has **no** FK.
- DTOs carry the FK field(s); `@NotNull` present only where `required`.
- Migrations contain `team_id BIGINT` etc., the `fk_…` constraint, and the `idx_…` index; the referenced table's migration has a **lower V-number** than the referencing one (ordering valid per §1.3).
- `GENERATION-MANIFEST.txt` lists each relationship default (ADR-004).

**File separation (ADR-002):**
- Confirm the generated developer files (`Ticket.java`, `TicketService.java`, `TicketController.java`, etc.) are byte-identical to the no-relationship equivalents' developer files (relationships never touch them). Optional: write a line into a developer file, regenerate, confirm untouched.

**Live check (optional, strong — full proof is Day 4):**
- `docker compose up` the TeamTracker Spring project; confirm it **compiles and boots** (the real test that the JPA/SQL is coherent), and that creating a `Ticket` with an `applicationId` persists and returns it. If Docker/compile is heavy, Day 1 may rely on static proof + the compile being deferred to Day 4's live run — **note honestly** in the report which was done.

**ADR sweep:** no AI in the generation path (ADR-001); determinism proven (ADR-003); separation intact (ADR-002); core neutral (Law 25); defaults shown (ADR-004).

### 5.3 Definition of "Day 1 done"

Spring generates real `belongs-to` foreign keys (column + migration + DTO + FK/index), deterministically; relationship-free models (DemoApp) keep **`010098cd…`** exactly; TeamTracker Spring has a new, recorded, reproducible hash; core stayed neutral; separation and the ADRs hold. Written up in `docs/daily/day-01-report.md` (Session 3).

---

## 6. Risk notes (for Session 2 to watch)

- **Incidental byte drift** in the relationship-free path is the top risk → keep every relationship emission strictly inside the per-relationship loop; diff DemoApp output first, before anything else.
- **Migration ordering** — enforce "target defined earlier"; error otherwise. Do not silently emit a constraint against a not-yet-created table.
- **Manifest churn** — adding relationship lines to `describeEntityDefaults` changes the manifest **only when relationships exist**; DemoApp's manifest (no relationships) must be unchanged.
- **Demo shape migration** — updating `teamtracker-model.ts` to `kind` must keep `target` so the blueprint's connectors keep rendering.
