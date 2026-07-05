# Day 3 — End-of-Day Report: Relationships (Django) + four-stack cross-proof

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features this session.
**Status: DONE — all done-conditions met, four-stack cross-proof passing (42/42 checks).**

Plan: [`docs/daily/day-03-plan.md`](day-03-plan.md). Completes Days 1–2 ([d1](day-01-report.md) Spring, [d2](day-02-report.md) Express+FastAPI). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), ADR-004 (defaults shown), Law 25 (core neutral).

---

## 1. What was built (Session 2)

`belongs-to` foreign-key generation for the **Django** plugin — the fourth and final stack — via idiomatic `models.ForeignKey`, reusing Days 1–2's stack-agnostic model representation. **Django-plugin-local only: no core change, no `BackendPlugin` interface change.**

The decisive choice: Django **already generates an owner `ForeignKey`** (from its multi-user work), so belongs-to FKs mirror that exact, proven idiom. Per `belongs-to { target: T, required }` on entity `X` (field `<snake(T)>`, e.g. `application`):

- **`models.py`**: `application = models.ForeignKey("application.Application", on_delete=models.PROTECT, related_name="+"[, null=True, blank=True])` — placed after fields, before owner. Django derives the column `application_id` and creates the real DB FK constraint + index automatically.
- **`0001_initial.py`**: the FK field tuple (after fields, before owner) **and** the migration dependency `("<target_app>", "0001_initial")` per belongs-to (Django resolves order by dependency graph, not V-numbers). `import django.db.models.deletion` gated on `multiUser OR belongsTo`.
- **`serializers.py`**: FK added to `Meta.fields`, **not** `read_only_fields` → DRF writable `PrimaryKeyRelatedField`, so a create/update sets the parent.
- **`describeEntityDefaults`**: a shown line per relationship (ADR-004).
- Unchanged: ViewSet, apps, `__init__.py`, and both developer files. Everything gated on belongs-to → relationship-free entities byte-identical.

---

## 2. Proof / results (all passing, 42/42)

### 2.1 Baseline gates — DemoApp byte-identical, all four (blocking)

| Stack | Hash | Result |
|---|---|---|
| Django | `68601cc5…` | ✅ unchanged (this Day's gate) |
| Spring | `010098cd…` | ✅ unchanged |
| Express | `a437a302…` | ✅ unchanged |
| FastAPI | `dca2254f…` | ✅ unchanged |

### 2.2 THE CROSS-STACK PROOF (the headline) — all four generate TeamTracker, deterministically

Each stack generated TeamTracker **twice → byte-identical**, matching its recorded hash:

| Stack | TeamTracker hash | Source |
|---|---|---|
| Spring | `9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66` | Day 1 |
| Express | `dca2b4a7a301df5e47ead65dc9f8cda26414a1ec1f24a055e8f1834c0cf1c9cf` | Day 2 |
| FastAPI | `6d422010e4c5c66da2950a19ad050765cd81bfd65b1842658377a1d67463b0d1` | Day 2 |
| **Django** | `e509309cd6c500e6633e0dca3d3fe52a695802e29ec4114e8c1fccac624e52c6` | **Day 3 (new)** |

**Consistent FK placement across all four stacks:**

| Relationship | FK column | referenced table | ✅ in all four |
|---|---|---|---|
| Application → Team | `team_id` | `teams` | ✅ |
| Ticket → Application | `application_id` | `applications` | ✅ |
| Ticket → Team | `team_id` | `teams` | ✅ |
| Comment → Ticket | `ticket_id` | `tickets` | ✅ |
| Team | (none) | — | ✅ |

Verified against each stack's schema artifact (Spring `…Base.java`/migration, Express repository/migration, FastAPI `model.py`/migration, Django `models.py` `ForeignKey`/`0001_initial.py`).

**Migration ordering / dependency validity, all four:** SQL stacks (Spring/Express/FastAPI) — every `REFERENCES <table>` points at a table created in an earlier `V<n>`. Django — every belongs-to adds `("<target>", "0001_initial")` to `dependencies` (Application→team; Ticket→application, team; Comment→ticket), so the dependency graph resolves targets first.

### 2.3 Honest cross-stack note — logical agreement vs literal idiom

The four stacks agree at the **logical schema** level, and that is what "cross-stack consistency" means here:
- **same FK column name** (`team_id`), **same referenced table** (`teams`), and **a real FK constraint + index exist** in every stack.

They differ, idiomatically and expectedly (not defects):
- **Constraint/index identifier strings.** Spring/Express/FastAPI hand-write the literal names `fk_<table>_<target>` / `idx_<table>_<target>_id`. Django's `ForeignKey` **auto-generates** the constraint/index names (e.g. `tickets_team_id_…_fk_teams_id`). The names differ; the objects (a real FK + an index on `team_id → teams(id)`) are equivalent.
- **API writable-field name.** FastAPI's schema key is `team_id`; Spring's DTO is camelCase `teamId`; Express's is `teamId`; Django/DRF exposes the FK as `team` (a writable primary-key field). The **DB column agrees** (`team_id`); the request-body key follows each framework's convention.

This is the expected, honest consequence of generating *idiomatic* code per stack rather than forcing one stack's spelling onto the others.

### 2.4 ADR-004 (defaults shown) + ADR-002 (separation)

- Each stack's TeamTracker `GENERATION-MANIFEST.txt` shows the belongs-to lines; each stack's DemoApp manifest (no relationships) is unchanged. ✅
- Django file separation: wrote hand logic into developer `views.py`, tampered Thraksha `models.py`, regenerated **twice** → developer file byte-identical, tampered marker gone. ✅ (Express/FastAPI/Spring separation proven Days 1–2.)

### 2.5 ADR-001 (no AI) + Law 25 (neutral core)

- No AI/network anywhere in `src/core/` or `src/plugins/` (grep for `openai|anthropic|langchain|api_key` and `fetch(|http.request|net.connect` → none). ✅
- **Day 3 touched only `src/plugins/django/entity-codegen.ts`.** The core was not modified; its only relationship strings are the generic Day-1 `Relationship` type + forward-reference guard (no Django/SQL). `BackendPlugin` interface unchanged (5 members). ✅

### 2.6 Honest caveat — live proof deferred

**Static proof only so far.** All four stacks are proven to *generate* the related model deterministically with correct schema and valid ordering/dependencies — but the generated code has **not** been compiled/booted against a real database yet. That is **Day 4**.

---

## 3. Scope — in vs deferred

**In scope, done this Day:** Django `belongs-to` via idiomatic `ForeignKey` (column + real FK/index + migration dependency + writable serializer field), deterministic, separation-safe; and the four-stack cross-proof.

**Deliberately deferred (per plan):**
- **Live run → Day 4** (compile + boot a related project, real related-data round-trip).
- **UI relationship picker → Day 19.**
- `has-many` schema/codegen; object-graph navigation (reverse accessors disabled via `related_name="+"`; no `select_related`/nested serializers); cascade/`on_delete` tuning beyond `PROTECT`; many-to-many; self-relations; forward references (errored by Day-1's guard).
- **Multi-word entity-name alignment** (field name / app label / column coincide for the single-word demo entities; noted for later).
- No change to the other three plugins, the core, or any developer file.

---

## 4. Caveats (honest)

1. **Static-only this Day** — live compile/boot of related data is Day 4 (§2.6).
2. **Django constraint/index names auto-generated** — logical schema matches; literal identifier strings differ from the SQL stacks (§2.3). Not a defect.
3. **DRF FK key is `team`, not `team_id`** — per-framework API convention; DB column agrees (§2.3).
4. **`on_delete=PROTECT`** is an app-level Django guard; at the DB level the FK is plain (NO ACTION), matching the other stacks.
5. **TeamTracker/Django hash established** (`e509309c…`) — expected (it gained FK fields). Only relationship-free baselines are frozen.

---

## 5. What Day 4 picks up

**Day 4 — Relationships hardening + live run.** Prove relationships don't just *generate* but *function*: pick at least one stack, `docker compose up` a related project (e.g. TeamTracker) against a real PostgreSQL, and confirm the related data actually works end-to-end — create a Team, create a Ticket under it (set `team`/`team_id`), fetch it back with the parent id, and confirm the DB FK constraint is enforced. Fix any template startup/wiring bugs surfaced by a real boot. Also harden edge cases (required vs optional relations; trivial self-relations if in scope). This closes the honest gap left by Days 1–3's static proof.

---

**Day 3 verdict:** Django now generates real `belongs-to` foreign keys via idiomatic `ForeignKey` — deterministic, additive, separation-safe, core-neutral — and **all four stacks** generate the TeamTracker related model correctly and deterministically, with consistent logical FK placement and valid migration ordering/dependencies. Relationships are complete across the whole platform (statically). Day 3 is **done**.
