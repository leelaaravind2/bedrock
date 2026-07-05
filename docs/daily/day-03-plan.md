# Day 3 — Plan: Relationships in generated code (Django) + cross-stack proof

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Scope: `belongs-to` FK generation for the Django plugin, matching Spring/Express/FastAPI, then a four-stack proof. Completes relationships across the whole platform.**

Reads honored: `docs/CONSTITUTION.md`, `docs/adr/` (ADR-001/002/003/004, Law 25), `docs/21-DAY-PLAN.md` (Day 3), and Days 1–2 outputs ([day-01-plan](day-01-plan.md)/[report](day-01-report.md), [day-02-plan](day-02-plan.md)/[report](day-02-report.md)).

---

## 0. What Days 1–2 already give us (reuse, no core change)

- The Project Model stores normalized `Relationship { kind: 'belongs-to' | 'has-many', target, required }` per entity, in authored order, and `addEntity` **already rejects belongs-to forward references** (target must be defined earlier). Migration ordering is guaranteed for every stack.
- Three stacks already generate relationships: **Spring** (scalar `Long <t>Id` + JPA `@Column` + SQL FK/idx), **Express** (threaded raw SQL), **FastAPI** (scalar `Column(BigInteger)` + Pydantic schema + SQL FK/idx). Frozen cross-stack naming:
  - FK column `<snake(target)>_id`; referenced table `<plural(snake(target))>`; referenced column `id`; (SQL stacks also) constraint `fk_<table>_<target>`, index `idx_<table>_<target>_id`.
- Established hashes to preserve: TeamTracker/Spring `9e01210c…`, TeamTracker/Express `dca2b4a7…`, TeamTracker/FastAPI `6d422010…`.
- Each plugin's `generateEntity(entity, ctx)` already receives the full `Entity` (with `relationships`). **No core change and no `BackendPlugin` interface change** — Day 3 is Django-plugin-local.
- Demo: Team; Application→Team; Ticket→Application, Team; Comment→Ticket.

**Guiding invariant:** every FK emission is a **loop over `belongs-to` relationships**, so a relationship-free entity is **byte-identical** to today (the blocking gate).

---

## 1. Django generation — the idiomatic decision (honest Django specifics)

**Decision: use Django's `models.ForeignKey` — NOT a scalar field.** Rationale (this is the honest Django-specific the task asked for):

- The Django plugin **already generates an owner `ForeignKey`** today:
  `owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")`.
  A belongs-to FK is the *same thing* pointed at another entity — so it mirrors existing, proven code exactly. A scalar `BigIntegerField` masquerading as a FK would be un-idiomatic Django (no ORM integrity, no real DB constraint without hacks).
- A `ForeignKey` makes Django **auto-create the real DB foreign-key constraint + index** — the same *logical* schema the SQL stacks hand-write. And because Django derives the column from the field name as `<field>_id`, naming the field `<snake(target)>` yields column **`<snake(target)>_id`**, honoring the frozen column naming.

**Honest caveat on "schema agreement":** the frozen agreement is honored for the **column name** (`team_id`) and the **referenced table** (`teams`), and a real FK constraint + index exist in all four stacks. But Django **auto-generates the constraint/index identifier strings** (e.g. `tickets_team_id_…_fk_teams_id`), so those *names* differ from the SQL stacks' literal `fk_tickets_team` / `idx_tickets_team_id`. This is an unavoidable ORM difference (the same is already true of Django's owner FK) — the *logical* schema matches; the constraint/index *names* are framework-generated. This will be stated plainly in the Day-3 report.

**API contract note (honest):** DRF exposes a `ForeignKey` as a writable primary-key field named after the model field (`application`, `team`), so a create is `POST {"title": …, "application": 5, "team": 2}`. The key differs from FastAPI's `application_id` — but API keys already vary per stack (Spring camelCase `applicationId`). The **DB column agrees** (`application_id`), which is what "schema agreement" means.

### What changes (all Thraksha-owned; developer files untouched)

Per `belongs-to { target: T, required }` on entity `X`. Field name `f = snake(T)` (e.g. `application`, `team`); column auto = `<f>_id`; target app label = `T.toLowerCase()` (= the entity slug).

**1) `models.py` — add a `ForeignKey` (mirrors the owner FK), after the entity fields, before `owner`:**
```py
application = models.ForeignKey("application.Application", on_delete=models.PROTECT, related_name="+"[, null=True, blank=True])
```
- `on_delete=models.PROTECT` — an idiomatic, safe default (Django app-level guard). At the DB level Django emits a plain FK (NO ACTION), matching the other stacks' DB behavior; `on_delete` is enforced in Django app code.
- `related_name="+"` — no reverse accessor, so multiple entities can point at the same target (e.g. Application→Team and Ticket→Team) without clashes. Mirrors the owner FK.
- `null=True, blank=True` when optional (the default, ADR-004); omitted when `required` (NOT NULL).
- `to="<slug>.<Target>"` — the per-entity app label + model name.

**2) `migrations/0001_initial.py` — add the FK field tuple + a dependency on the target app:**
- Field tuple after the entity field tuples, before the owner tuple:
  ```py
  ("application", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="+", to="application.application"[, null=True])),
  ```
- `dependencies`: keep the existing owner `swappable_dependency`, then add `("<targetSlug>", "0001_initial")` per belongs-to (authored order):
  ```py
  dependencies = [
      migrations.swappable_dependency(settings.AUTH_USER_MODEL),
      ("application", "0001_initial"),
      ("team", "0001_initial"),
  ]
  ```
- `import django.db.models.deletion` is already emitted when multi-user (owner uses it); gate it on `multiUser OR belongsTo present` so a single-user relationship model still imports it.
- Django's migration executor topologically sorts by this dependency graph (more robust than filename order) — and Day 1's guard guarantees the target app exists.

**3) `serializers.py` — expose the FK writable (so CRUD sets the parent):**
- Add `application`, `team` to `Meta.fields` (after entity fields, before `owner`), and **do NOT** add them to `read_only_fields`. DRF's `ModelSerializer` makes them writable `PrimaryKeyRelatedField`s, required per the model's null/blank. So `perform_create` still sets `owner` server-side while the parent FKs come from the request body.

**4) `describeEntityDefaults` — show each relationship (ADR-004):**
`X belongs-to T: <f>_id, required=false (default: optional)`.

**Unchanged (Django):** `views_base.py` (ModelViewSet CRUD already handles serializer FK fields; owner scoping unchanged), `apps.py`, `__init__.py`, and both developer files (`views.py`, `urls.py`). Everything gated on belongs-to present → relationship-free entities byte-identical.

---

## 2. Determinism & baselines (blocking gates)

### 2.1 Additivity — relationship-free byte-identical

Gated loops in `models.py`, `serializers.py`, `0001_initial.py`, `describeEntityDefaults` → an entity with `relationships: []` emits zero added/reordered bytes. Guardrails (Session 2): insert FK lines only inside the loop, at the fixed position (after fields, before owner); no new whitespace in the relationship-free path; authored order, no maps/timestamps/randomness (ADR-003); gate the `deletion` import on `multiUser OR belongsTo`.

### 2.2 Baselines

| Model / stack | Hash | Day-3 expectation |
|---|---|---|
| DemoApp / **Django** | `68601cc5…` | **must stay identical** (blocking gate) |
| DemoApp / Spring | `010098cd…` | untouched (not modified) |
| DemoApp / Express | `a437a302…` | untouched (not modified) |
| DemoApp / FastAPI | `dca2254f…` | untouched (not modified) |

**Established this Day:** TeamTracker / **Django** hash (it gains FK fields). TeamTracker/Spring `9e01210c…`, /Express `dca2b4a7…`, /FastAPI `6d422010…` stay unchanged (their plugins aren't touched).

### 2.3 Reuse & neutrality (Law 25)

- **No core change; no `BackendPlugin` interface change.** Only `src/plugins/django/entity-codegen.ts` is edited.
- Add a small plugin-local helper set mirroring the other plugins: `belongsToRels`, plus Django-specific `fkFieldName = snake(target)`, `fkColumnName = <snake(target)>_id` (for the manifest line), `fkTargetRef = "<slug>.<Target>"`, `fkTargetAppLabel = target.toLowerCase()`. All Django/DRF specifics stay in the plugin; the core keeps only generic relationship *kinds*.
- Post-change check: `grep -ri "foreign\|ForeignKey\|fk_" src/core/` finds nothing new (only the Day-1 doc comment).

---

## 3. Cross-stack proof plan (the Day-3 headline — Session 3)

Prove **all four stacks** generate the TeamTracker related model correctly and deterministically.

1. **Determinism, per stack:** generate TeamTracker twice for each of Spring / Express / FastAPI / Django → byte-identical each. **Record all four hashes** (three known + Django new).
2. **Blocking gates:** DemoApp unchanged for all four (`010098cd…`, `a437a302…`, `dca2254f…`, `68601cc5…`).
3. **FK placement consistent across all four** (the cross-stack claim):

   | Entity FK | column (all four stacks) | referenced table |
   |---|---|---|
   | Application → Team | `team_id` | `teams` |
   | Ticket → Application | `application_id` | `applications` |
   | Ticket → Team | `team_id` | `teams` |
   | Comment → Ticket | `ticket_id` | `tickets` |
   | Team | (none) | — |

   Verify the `<target>_id` column appears in each stack's schema artifact: Spring `…Base.java` + migration; Express repository `COLUMNS`/insert + migration; FastAPI `model.py` + migration; Django `models.py` FK field (column derived) + `0001_initial.py`.
4. **Django-specific static:** `models.py` has `application = models.ForeignKey(...)` / `team = ...`; `0001_initial.py` has the FK tuple(s) + `("<target>", "0001_initial")` dependency(ies); serializer lists the FK(s) writable (not read-only); `Team` has only the owner FK (no belongs-to). Column names resolve to `<target>_id`.
5. **Migration-ordering validity, all four:** SQL stacks — every `REFERENCES <table>` points at a table created in an earlier `V<n>`; Django — every belongs-to adds a `(target, '0001_initial')` dependency and the target app exists (Day-1 guard).
6. **ADR-004:** each stack's TeamTracker manifest shows the belongs-to lines; each stack's DemoApp manifest unchanged.
7. **File separation (ADR-002):** for Django (and spot-checks on the others), write hand logic into a developer file (Django `views.py`), regenerate twice → byte-identical; a tampered Thraksha file is rewritten.
8. **Blueprint:** the TeamTracker model already renders as four connected boxes (proven earlier); re-confirm the relationship data feeding it is intact (stack-agnostic — one check).
9. **ADR-001 / Law 25:** no AI/network; core + interface unchanged.

---

## 4. Scope guard — explicitly OUT for Day 3

- **Live run** (Docker compile/boot, real related-data round-trip across stacks) → **Day 4**.
- **UI relationship picker** → **Day 19**.
- **`has-many`** schema/codegen (recorded + drawn only); **object-graph navigation** beyond the single FK field (reverse accessors are disabled via `related_name="+"`; no `select_related`, nested serializers, or `@ManyToOne` graphs).
- **Cascade/`on_delete` tuning** beyond the single documented default (`PROTECT`); many-to-many/join tables; self-relations; forward references (already errored by Day-1's guard).
- **Multi-word entity-name edge case:** for the demo (single-word Team/Application/Ticket/Comment) the field name, app label, and `<target>_id` column coincide. Aligning them for multi-word PascalCase names (e.g. `UserProfile`) is noted but deferred.
- Any developer-file change; any change to the Spring/Express/FastAPI plugins or the core.

---

## 5. Done-conditions (Session 2) & proof method (Session 3)

### 5.1 Session 2 must achieve
1. Django `belongs-to` generation: `ForeignKey` in `models.py` (after fields, before owner), FK tuple + `(target, '0001_initial')` dependency in `0001_initial.py` (deletion import gated on `multiUser OR belongsTo`), FK writable in `serializers.py`, relationship line in `describeEntityDefaults`. **All gated on belongs-to present.**
2. **No** change to Django `views_base/views/urls/apps`, **no** core change, **no** interface change, **no** change to the other three plugins or any developer file.

### 5.2 Session 3 verification (blocking — a Day isn't done until all pass)
- **Baseline gate:** DemoApp/Django `== 68601cc5…` (byte-identical); other three DemoApp hashes re-confirmed unchanged.
- **Determinism:** TeamTracker/Django twice-identical; **record its hash**. Re-confirm Spring/Express/FastAPI TeamTracker hashes unchanged (`9e01210c…`, `dca2b4a7…`, `6d422010…`).
- **Cross-stack correctness:** the §3 FK-placement table holds in all four stacks; Django static checks pass; migration ordering valid in all four.
- **ADR-004** manifest lines (Django) present; DemoApp/Django manifest unchanged.
- **File separation** (Django) developer files byte-identical after regen.
- **ADR sweep:** no AI (ADR-001); core + interface unchanged (Law 25).
- **Live check:** deferred to **Day 4**, noted honestly — Day 3 proves all four stacks statically (deterministic, correct schema, valid ordering).

### 5.3 Definition of "Day 3 done"
Django generates real `belongs-to` foreign keys via idiomatic `ForeignKey` (column `<target>_id`, real DB FK + index, FK writable so CRUD sets the parent), deterministically; DemoApp/Django stays **`68601cc5…`**; TeamTracker/Django has a new recorded hash; **all four stacks** generate the TeamTracker related model correctly and deterministically with consistent FK placement; core neutral, interface unchanged, separation and ADRs hold. Written up in `docs/daily/day-03-report.md` (Session 3).

---

## 6. Risk notes (for Session 2)

- **Relationship-free byte drift** (top risk) — the belongs-to loop must be fully gated in all four Django builders; diff DemoApp/Django output first, before anything else, to hold `68601cc5…`.
- **Migration dependency correctness** — belongs-to must add `(target_app, '0001_initial')` to `dependencies`; without it Django can't resolve the FK. The demo's authored order (Team→Application→Ticket→Comment) makes all dependencies backward, so the graph is acyclic.
- **`deletion` import gating** — needed whenever a FK tuple is emitted (owner *or* belongs-to); ensure a single-user relationship model still imports it (edge case; the demo is multi-user so it's already imported).
- **Honest naming caveat** — do not claim identical `fk_…`/`idx_…` constraint names for Django; assert column + referenced-table agreement and "a real FK + index exist," and state the auto-generated-name difference plainly in the report.
