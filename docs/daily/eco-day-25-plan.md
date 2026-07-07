# Eco-Day 25 — PLAN: has-many relationships `[2 days]`

**Phase 2, Day 25. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 25 closes the **has-many** depth limitation — the **REVERSE PROJECTION** of the belongs-to FK Thraksha already generates correctly. **NO new DB concept:** the FK stays on the child; the PARENT gains a collection accessor. A definite right answer — software builds it whole. **`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) (the depth limitations; the relationship model) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 25 (lines 45–48) → [`eco-day-20-report.md`](eco-day-20-report.md) (the gate set + the v0.1 limitations — has-many is one) → the REAL relationship code (read this session; see Grounded below).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code — and it changes the design vs the idealized brief):**
> - **`has-many` is ALREADY in the model — but IGNORED by every plugin.** `RelationshipSpec`/`Relationship` (`core/project-model.ts`) already carry `kind: 'belongs-to' | 'has-many'`. `addEntity` allows a has-many to point forward (it's "the inverse view"). But **all 5 stacks filter to belongs-to only** — every `entity-codegen.ts` has `belongsToRels = entity.relationships.filter(r => r.kind === 'belongs-to')`, and **nothing reads has-many**. So has-many is a declared-but-unprojected no-op today.
> - **NO frozen baseline declares has-many** (grep across teamtracker/maxcell/task/demoapp/harness → **0**). TeamTracker (PART 1d) and MaxCell (`929c379f…`) use belongs-to ONLY. **⇒ reading has-many is a LITERAL BYPASS by construction** — no existing project declares it, so the frozen backstop is byte-identical without any gating flag.
> - **THE BIG FINDING — the codebase uses SCALAR FKs + raw/simple SQL, NOT ORM object graphs.** The belongs-to FK is a **scalar column on the CHILD**: Spring `Long <target>Id`, Python `<target>_id = Column(BigInteger)`, **Go `<Target>ID *int64` over raw `database/sql`** (NOT GORM), Express a raw-SQL `<target>_id` column. Django is the one real ORM FK — `models.ForeignKey(..., related_name="+")` — where **`"+"` explicitly DISABLES the reverse accessor**. **⇒ the idealized brief (`@OneToMany mappedBy`, GORM slice, SQLAlchemy `back_populates`) does NOT fit this code**: there is no `@ManyToOne` object to `mappedBy`, no GORM, no `relationship()`. The faithful reverse projection here is a **query-based collection accessor** (§2), not an ORM object collection. This is a genuine finding — the plan designs against the real code.
> - **The FK already exists — no schema change.** belongs-to emits the child's `<parent>_id` column + a real SQL FK constraint (`ctx.sql.foreignKey`, `on_delete=PROTECT` in Django). has-many reuses THAT column; it adds only the parent-side accessor. **No new column, no migration that alters schema.**
> - **The existing list query is the template for the reverse.** Express/Go/Python/Spring already emit an owner-scoped list (`SELECT … FROM <table> WHERE owner_id = $1 ORDER BY id`). The reverse accessor is the SAME shape with `WHERE <parent>_id = ?` (+ owner scope) — a minimal, faithful extension.
> - **Relationships flow through `assembleBlueprint` already** (`entities[].relationships` → `addEntity`), so a has-many rides the SAME UI==CLI path PART 1d proves for belongs-to — UI==CLI is structural.

---

## 0. What Day 25 is — the reverse projection of an FK we already generate

belongs-to puts an FK on the child and generates its column, constraint, CRUD writes, and validation. **has-many is the OTHER SIDE of that same FK:** a parent "has many" X iff X "belongs to" it. Day 25 gives the PARENT a **collection accessor** over the children that already carry its FK — a deterministic reverse projection, no new DB concept, software builds it whole.

---

## 1. THE DETERMINISM SPINE (same pattern, now across 5 stacks × 2 DBs)

1. **The DEFAULT (no has-many) is a LITERAL BYPASS.** A project without a has-many declaration reproduces the frozen backstop byte-identical — **50 baked + 10 TeamTracker + non-hash gates** (PART 1c/1e/1h/1i/1j/1k/1l). By construction: no frozen baseline declares has-many, and the plugins only project has-many when it is declared. **Proof (execute):** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS, byte-identical. **A moved frozen hash = a FINDING, STOP** (never a re-baseline).
2. **has-many DECLARED → NEW twice-identical baselines across all 5 stacks × 2 DBs** (additive; never replacing a frozen hash). Each stack's reverse projection is deterministic (generated twice → byte-identical). Recorded in a new **PART 1m** (10 new baked baselines).
3. **UI==CLI for has-many** — a wizard-declared has-many (via `assembleBlueprint`'s `entities[].relationships`) == the programmatic path, byte-identical (the Day-16 structural property extends to the has-many declaration — the same `addEntity` seam PART 1d proves for belongs-to).
4. **The collection ROUND-TRIPS LIVE in ≥1 boot** (determinism-≠-validity bridge for THIS feature): declare has-many, generate, **boot ONE stack**, confirm the parent's collection endpoint actually returns its children. Prove it GENERATES deterministically (baselines) AND (in one boot) actually WORKS. Honest scope: name which stack was booted vs generation-only.

---

## 2. THE ARCHITECTURAL RECOMMENDATION — a query-based collection accessor (the faithful reverse for THIS code)

Because the codebase uses **scalar FKs + raw/simple SQL** (not ORM object graphs — §Grounded), the reverse projection is a **query-based collection accessor on the parent**, reusing the child's existing FK column. Parent-only, no child change, no schema change, uniform across all 5 stacks.

### 2.1 The declaration — explicit has-many, validated as the reverse of a belongs-to
- has-many is generated ONLY when **explicitly declared** on the parent (`{ kind: 'has-many', target: 'Child' }` — already modeled). This makes the default a literal bypass **by construction** (no gating flag; no frozen baseline declares it).
- **Validation:** `Parent has-many Child` requires a matching `Child belongs-to Parent` (so the FK column `<snake(parent)>_id` exists on the child table). An orphan has-many (no matching belongs-to) is a **clear error** (or a manifest-noted no-op) — this keeps "reuses an existing FK, no schema change" TRUE. The check needs the full entity set, so it lives in the model / a `buildFileSet`-level pass (which sees `model.getEntities()`).
- **Rejected alternative — auto-inferring the reverse from every belongs-to:** it would add accessors to existing belongs-to projects (TeamTracker) and **MOVE frozen hashes** unless gated. Explicit declaration is cleaner, already modeled, and a bypass by construction.

### 2.2 The per-stack reverse accessor (query-based; derives the child table + FK by convention)
For `Parent has-many Child`, the child table is `pluralize(snake(Child))` and the FK column is `<snake(Parent)>_id` — the SAME convention belongs-to uses — so the parent's emitter derives the query without needing the child object. Each stack emits: a **repo method**, a **service method**, and a **nested route** `GET /api/<parents>/:id/<children>` returning the collection:

| Stack | Reverse accessor (query-based, reuses the existing FK column) |
|---|---|
| **Express** (raw SQL) | repo `list<Children>By<Parent>Id` → `SELECT … FROM <child_table> WHERE <parent>_id = $1 [AND owner_id = $2] ORDER BY id`; a nested router route on the parent |
| **Go** (raw `database/sql`) | a repo/query method `List<Children>By<Parent>ID` + an `net/http` handler (same SELECT shape) |
| **Python** (FastAPI, SQLAlchemy Core scalar) | a query function + a FastAPI route (SELECT by the FK column) |
| **Spring** (JPA, scalar FK) | a Spring-Data derived query `List<Child> findBy<Parent>Id(Long)` on the child repo + a service/controller route on the parent *(faithful to scalar FKs; `@OneToMany mappedBy` needs a `@ManyToOne` object the child does not have)* |
| **Django** (real ForeignKey) | **either** the same query accessor (`Child.objects.filter(<parent>_id=…)`) **or** the idiomatic `related_name` flip (`"+"` → the collection name, ORM-level, no schema change). **Recommend the query accessor** for parent-only/no-child-change uniformity; note `related_name` as the idiomatic option |

**No schema change:** every accessor reuses the existing `<parent>_id` column; no new column/table/schema-altering migration. (Django `related_name`, if chosen, is ORM-level — the column is unchanged.)

### 2.3 Declarative options — FIXED sensible defaults (deterministic; not exposed as knobs on Day 25)
Since the reverse is a query accessor (not an ORM loader), map the options to query behaviour with FIXED defaults:
- **Loading = LAZY (on-demand):** the collection is fetched by calling the accessor/route (a separate query), never eager-joined. Query accessors are inherently lazy.
- **Cascade = NONE:** the existing belongs-to FK already uses `RESTRICT`/`PROTECT` (deleting a parent with children is prevented at the DB). has-many adds no cascade delete.
- **Bidirectional (data-level):** parent→children (the new accessor) + child→parent (the existing FK). Both directions are queryable; no ORM back-reference object is added.
- **Multi-user (ADR-005):** the reverse query is **owner-scoped** (`… AND owner_id = ?`) to match the existing owner-scoped list — the collection returns the requester's children of that parent. Single-user: `WHERE <parent>_id = ?` only.

These are fixed and deterministic on Day 25 (one declaration → one projection). Exposing them as user knobs is future work.

---

## 3. What the plan resolves (the five questions, answered from the real code)

1. **belongs-to today:** a scalar `<parent>_id` FK column on the CHILD + a real SQL FK constraint + CRUD writes/validation. has-many is the reverse — the parent side of that same FK.
2. **New declaration vs inferred reverse:** **explicit declaration** (already modeled), **validated** as the reverse of a matching belongs-to. (Explicit ⇒ literal bypass by construction; auto-inference would move frozen hashes — rejected.)
3. **Per-stack reverse projection:** a **query-based collection accessor** (§2.2) reusing the child's existing FK column — because the code uses scalar FKs + raw SQL, NOT ORM object graphs (the idealized `@OneToMany mappedBy`/GORM slice/`back_populates` don't fit; Go isn't GORM). Django may optionally use `related_name`.
4. **Declarative options + fixed defaults:** lazy / no-cascade / bidirectional-data-level / owner-scoped (§2.3) — fixed, deterministic.
5. **NO SCHEMA CHANGE:** the `<parent>_id` FK already exists (belongs-to). has-many adds only the parent-side query accessor. Confirmed no new column/migration. If a design step seems to need one, that's a **finding** (it should be pure reverse projection).

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### Stage 1 — the reverse projection across the 5 stacks + the default-bypass gate + the new baselines
- **DC-1:** read explicit has-many + the model/`buildFileSet` **validation** (a has-many requires a matching belongs-to; orphan ⇒ error). The **query-based reverse accessor** (repo + service + nested route) in each of the 5 `entity-codegen.ts`, deriving the child table + FK by convention, with the fixed declarative defaults (§2.3).
- **DC-2 (DEFAULT = LITERAL BYPASS — load-bearing):** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full set (50 baked + 10 TeamTracker + non-hash) byte-identical. No has-many declared anywhere in the frozen fixtures ⇒ no frozen hash moves. **A moved hash = a finding, STOP.**
- **DC-3 (NEW BASELINES — additive):** a has-many fixture (e.g. `Parent has-many Child` + `Child belongs-to Parent`, or a TeamTracker-with-has-many) generated across **5 stacks × 2 DBs = 10 new twice-identical baselines**, recorded in a new **PART 1m** (baked; never replacing a frozen hash). Each reverse projection deterministic.

### Stage 2 — UI==CLI + the live round-trip + honest scope
- **DC-4 (UI==CLI):** the has-many declaration through `assembleBlueprint` (`entities[].relationships`) == the programmatic path, byte-identical (extend the PART-1d/PART-1i style to has-many). Structural — same `addEntity` seam.
- **DC-5 (THE LIVE ROUND-TRIP):** declare `Parent has-many Child`, generate, **boot ONE stack** (recommend **Express** — fastest, most-booted in prior days), POST a parent + 2 children (belongs-to the parent), `GET /api/<parents>/:id/<children>` → the collection **returns the children**. Proves the reverse projection WORKS at runtime. **Honest:** state which stack booted; the other 4 are generation-only (deterministic baselines, not booted).
- **DC-6 (invariants):** generator pure-Node (`deps {}`, 0 native); **no frozen hash moved** (default); **NO schema change** (the FK already exists — confirm no new column/migration); the new baselines additive.

**Execute scope guard (every stage):** just has-many (the reverse belongs-to projection). **NOT** decimal/money (Day 27), **NOT** field-key (Day 29). **No frozen hash moves on the default path** (a moved hash is a finding, STOP). **NO schema change** — has-many adds only the parent-side accessor; if it seems to need a new column/migration, that's a finding. No AI. No signing. Commit to `main`. Don't compress the 2 days — the 5-stack × 2-DB matrix + a live boot may need multiple passes; stage honestly.

---

## 5. REPORT — done-conditions

[`eco-day-25-report.md`](eco-day-25-report.md): the has-many declaration (explicit, validated as the reverse of a belongs-to); **the honest architectural finding** (scalar FKs + raw SQL ⇒ a query-based collection accessor, NOT the idealized ORM collections; Go isn't GORM); the 5 per-stack reverse accessors + the fixed declarative options/defaults; **the default-bypass proof** (no has-many → frozen backstop byte-identical); **the new twice-identical baselines** (5 stacks × 2 DBs, additive, PART 1m); **UI==CLI**; **the live round-trip** (which stack booted, the collection returning its children); **the no-schema-change confirmation** (the FK already exists — no new column/migration); **invariants** (pure-Node, no frozen hash moved). **Forward-flags:** `[2 days]` scope status; **which stacks were boot-tested vs generation-only** (be honest — likely one boot); **determinism ≠ validity** (baselines prove determinism; one boot proves it works); what **Day 27** picks up (decimal/money type).

---

## 6. Scope guard — OUT for Day 25
- Just has-many (the reverse belongs-to projection). **NOT** decimal/money (Day 27), **NOT** field-key (Day 29).
- **Do NOT move any frozen hash on the default path (no has-many)** — it MUST be byte-identical. A moved hash = a finding, STOP.
- **NO schema change** — has-many adds only the parent-side accessor; the FK already exists on the child. If has-many seems to need a new column/migration, that's a **finding** (it should be pure reverse projection).
- No AI. No signing. **`[2 days]`** — don't compress; boot-test at least one stack, be honest about the rest.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + ecosystem (depth/relationship model) + Month-2 Day 25 + Day-20 report + the REAL relationship code across the 5 stacks? — ✅ (this session).
2. Only Day-25's job (has-many reverse projection)? — yes; **not** decimal/money, **not** field-key.
3. Which frozen baselines must NOT move? — **all** (50 baked + 10 TeamTracker + non-hash gates). No frozen fixture declares has-many, so reading it is a bypass by construction; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — **yes, by construction**: no has-many declared ⇒ the plugins project nothing new ⇒ frozen backstop byte-identical.
6. Three killers checked? — no clock/RNG/UUID in the reverse accessor (deterministic string templates over declared order); LF only; stable order (has-many in authored order; the reverse query derives names by pure convention). No has-many value flows anywhere nondeterministic.
7. A gate that can actually FAIL? — **DC-2** (a moved default hash ⇒ has-many leaked into a belongs-to-only baseline), **DC-3** (a stack's reverse projection non-deterministic ⇒ twice-differ), **DC-4** (UI≠CLI for has-many), **DC-5** (the booted collection does NOT return the children ⇒ the projection is wrong), **DC-6** (a new column/migration appears ⇒ NOT a pure reverse projection — a finding). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) auto-inferring the reverse and moving TeamTracker's frozen hashes (use EXPLICIT declaration); (ii) forcing the idealized ORM collections onto a scalar-FK/raw-SQL codebase (design the faithful query accessor instead — the honest finding); (iii) adding a column/migration (must be pure reverse, no schema change); (iv) claiming all 5 stacks were boot-tested when only one was (§5 honesty); (v) a Django `related_name` change quietly moving a frozen hash (it's gated on the has-many declaration; default stays `"+"`) — all guarded.

---

*Day 25 closes has-many as what it truly is: the deterministic REVERSE PROJECTION of the belongs-to FK Thraksha already generates. The FK stays on the child; the parent gains a collection accessor — and because this codebase uses scalar FKs + raw/simple SQL (not ORM object graphs — Go isn't GORM, the FKs are scalar, Django's reverse is disabled with `related_name="+"`), the faithful reverse is a query-based collection accessor reusing the existing FK column, NOT the idealized ORM collections. No new DB concept, no schema change. The default (no has-many declared) is a literal bypass by construction — no frozen baseline declares it, so the 50 baked + 10 TeamTracker + non-hash gates reproduce byte-identical; a has-many declaration produces new twice-identical baselines across 5 stacks × 2 DBs (additive), rides the same assembleBlueprint seam (UI==CLI), and round-trips live in one boot (the parent's collection returns its children). Determinism proven by baselines; correctness proven by one boot; the rest generation-only and stated honestly. Day 27 picks up the decimal/money type.*
