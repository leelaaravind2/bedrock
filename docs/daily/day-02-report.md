# Day 2 — End-of-Day Report: Relationships in generated code (Express + FastAPI)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features this session.
**Status: DONE — all done-conditions met, every proof passing (27/27 checks).**

Plan: [`docs/daily/day-02-plan.md`](day-02-plan.md). Builds on Day 1 ([plan](day-01-plan.md) / [report](day-01-report.md)). Guardrails honored: ADR-001 (no AI), ADR-002 (file separation), ADR-003 (determinism), ADR-004 (defaults shown), Law 25 (core neutral).

---

## 1. What was built (Session 2)

`belongs-to` foreign-key generation for **Express** and **FastAPI**, matching Day 1's Spring behavior — reusing Day 1's stack-agnostic model representation with **no core change and no `BackendPlugin` interface change**. Frozen naming reused across all stacks: column `<target>_id`, constraint `fk_<table>_<target>`, index `idx_<table>_<target>_id`, referenced table `<plural(target)>`.

**FastAPI (the clean case) — `src/plugins/python/entity-codegen.ts`**
- `model.py`: scalar FK `<t>_id = Column(BigInteger, index=True)` — mirrors `owner_id`, not a `relationship()` object graph.
- `schemas.py`: FK carried in `<Entity>Create` (writable, so a create/update sets the parent id) and `<Entity>Read` (returned).
- migration: FK column + `ALTER TABLE … ADD CONSTRAINT fk_…` + `CREATE INDEX idx_…`.
- Because `create`/`update` do `Model(**payload.model_dump())` / `setattr`, the FK flows through automatically — **`repository.py`, `service_base.py`, `router_base.py` are unchanged.**

**Express (the threaded case) — `src/plugins/express/entity-codegen.ts`**
- `repository.js`: introduced a `writeCols` / `writeVals` notion (`fields + belongs-to FKs`) threaded through `COLUMNS`, `rowToObject`, `insert`, and `update`. Positional `$N` placeholder indices are **derived from `writeCols.length`**, so `owner_id`/`id` positions shift correctly (both multi-user and single-user branches).
- `dto.js`: FK validated as an integer (`<t>Id`), with a presence check when required — so `POST … {"applicationId": 7}` sets the parent.
- migration: FK column + constraint + index. **`service.base.js`, `controller.base.js`, `routes.base.js` unchanged.**

Both plugins: `describeEntityDefaults` gained a shown line per relationship (ADR-004). Every FK emission is a loop over belongs-to relationships → **empty for relationship-free entities**.

---

## 2. Proof / results (all passing)

### 2.1 Baseline gates — relationship-free byte-identical (blocking)

| Model / stack | Hash | Result |
|---|---|---|
| DemoApp / **Express** | `a437a302…` | ✅ unchanged |
| DemoApp / **FastAPI** | `dca2254f…` | ✅ unchanged |
| DemoApp / Spring | `010098cd…` | ✅ unchanged (not modified) |
| DemoApp / Django | `68601cc5…` | ✅ unchanged (Django is Day 3) |

### 2.2 Determinism (ADR-003) — established hashes

- TeamTracker / **Express** generated twice → byte-identical. **Stable hash:** `dca2b4a7a301df5e47ead65dc9f8cda26414a1ec1f24a055e8f1834c0cf1c9cf`.
- TeamTracker / **FastAPI** generated twice → byte-identical. **Stable hash:** `6d422010e4c5c66da2950a19ad050765cd81bfd65b1842658377a1d67463b0d1`.

(TeamTracker/Spring stays `9e01210c…` from Day 1; TeamTracker/Django is still relationship-free until Day 3.)

### 2.3 Static correctness

FK placement, both stacks: `Application`→`team_id`; `Ticket`→`application_id`+`team_id`; `Comment`→`ticket_id`; `Team`→none.

**Express (threading verified precisely):**
- `COLUMNS = 'id, title, code, priority, done, application_id, team_id, owner_id, created_at, updated_at'` ✅
- `rowToObject` maps `applicationId: row.application_id`, `teamId: row.team_id` ✅
- `insert`: `INSERT INTO tickets (…, application_id, team_id, owner_id) VALUES ($1, $2, $3, $4, $5, $6, $7)` with values `[…, data.applicationId, data.teamId, ownerId]` ✅
- `update`: `SET … application_id = $5, team_id = $6, updated_at = now() WHERE id = $7 AND owner_id = $8` ✅ (placeholder arithmetic correct — see §3)
- `dto.js` validates `applicationId` + `teamId` as integers ✅

**FastAPI:** scalar FK columns in `model.py`; FK in both `TicketCreate` (writable) and `TicketRead`; `repository.py` / `service_base.py` / `router_base.py` contain no FK text (untouched) ✅

**Migrations, both stacks:** `applications` has `team_id BIGINT` + `fk_applications_team FOREIGN KEY (team_id) REFERENCES teams (id)` + `idx_applications_team_id`; `tickets` has `application_id` + `team_id`; **every `REFERENCES <table>` points at a table created in an earlier `V<n>` migration** (`V2 teams → V3 applications → V4 tickets → V5 comments`). ✅

### 2.4 Defaults shown (ADR-004)

- Each stack's TeamTracker `GENERATION-MANIFEST.txt` lists the relationships, e.g. `Application belongs-to Team: team_id, required=false (default: optional)` (+ Ticket→Application/Team, Comment→Ticket). ✅
- Each stack's DemoApp manifest (no relationships) has **no** `belongs-to` line — unchanged. ✅

### 2.5 File separation (ADR-002)

For **both** stacks: wrote hand logic into a developer file (Express `ticket.service.js`; FastAPI `service.py`), tampered a Thraksha file (repository.js / model.py), regenerated **twice** → developer file **byte-identical** (logic survived), tampered marker **gone** (Thraksha file rewritten). ✅

### 2.6 ADR-001 (no AI) + Law 25 (neutral core)

- No AI/network in `src/core/` or `src/plugins/` (grep for `openai|anthropic|langchain|api_key` and `fetch(|http.request|net.connect` → none). Pure templates + deterministic emission. ✅
- **Day 2 touched only the two plugin files** — the core was not modified at all. The one "foreign key" string in the core is a Day-1 doc comment on the generic `Relationship` type; the core carries only relationship *kinds* (`belongs-to`/`has-many`) + `target`, no Node/Python/SQL. `BackendPlugin` interface unchanged (same 5 members). ✅

### 2.7 Optional live check — honest note

Not run this Day. Per the plan, the **live related-data proof (Docker compile/boot, create-Team-then-Ticket-under-it round-trip) is Day 4.** Day 2 proves the Express and FastAPI relationship output is **correct and deterministic statically** (byte-identical, threading verified, migration ordering valid) — consistent with how Day 1 closed for Spring. **Caveat:** the generated code has not been executed against a live database yet.

---

## 3. The Express-threading risk — and how it was verified clean

Day 2's flagged risk was Express's hand-built positional SQL: adding FK columns must shift the `$N` placeholder indices for `owner_id`/`id` without disturbing the relationship-free case.

- **Mitigation:** all writable columns (fields + FKs) flow through one `writeCols` array; every index (`insert` placeholders, `update` `SET` list, `WHERE id`, `WHERE owner_id`) is derived from `writeCols.length`. With zero FKs the arrays and indices are unchanged.
- **Verified clean two ways:** (a) the blocking gate — DemoApp/Express is **byte-identical** to `a437a302…`, proving the relationship-free path didn't shift; (b) exact-string checks on TeamTracker/Ticket confirm the *with-FK* SQL: `VALUES ($1…$7)` for 4 fields + 2 FKs + owner, and `SET …application_id = $5, team_id = $6 … WHERE id = $7 AND owner_id = $8`. Both correct.

---

## 4. Scope — in vs deferred

**In scope, done this Day:** Express + FastAPI `belongs-to` generation (FK column + migration constraint + index; FK carried so CRUD sets the parent), deterministic, separation-safe, reusing Day 1's representation.

**Deliberately deferred (per plan — not scope creep):**
- **Django relationships → Day 3** (completes all four stacks). Django still generates relationship-free (no FK) today.
- **Live run → Day 4.** **UI relationship picker → Day 19.**
- `has-many` schema/codegen, object-graph mappings (SQLAlchemy `relationship()`, JPA `@ManyToOne`, Express JOINs), nested routes, cascade/`ON DELETE`, many-to-many, self-relations — future.
- No developer-file change; no change to Spring/Django output.

---

## 5. Caveats (honest)

1. **Static-only proof this Day** — see §2.7; live compile/boot of related data is Day 4.
2. **Two new hashes established** (TeamTracker/Express `dca2b4a7…`, TeamTracker/FastAPI `6d422010…`) — expected, they gained FK columns. Only *relationship-free* baselines are frozen.
3. **Scalar FK, not an ORM association** — `Long`/`int`/`BigInteger` scalar, no navigation/eager-load. Object-graph mapping is explicitly deferred.
4. **Cross-stack schema agreement** — all stacks emit the same column/constraint/index names; only the in-code data key differs by convention (Express camelCase `applicationId` in JS objects; FastAPI snake `application_id` as the Python attribute). This is intentional and keeps the DB schema identical across stacks.
5. **belongs-to targets must be authored before the referencing entity** — enforced by Day 1's core guard; inherited for free by Express/FastAPI.

---

## 6. What Day 3 picks up

**Day 3 — Relationships: Django + cross-stack proof.** Implement the same `belongs-to` FK generation for the **Django** plugin (FK column in the model + migration `0001_initial` + serializer/viewset wiring so CRUD sets the parent), matching Spring/Express/FastAPI. Then prove **all four stacks** generate the TeamTracker related model correctly and deterministically-per-stack, with the blueprint showing connected boxes. Gates to hold: DemoApp baselines for all four stacks unchanged (`010098cd…`, `a437a302…`, `dca2254f…`, `68601cc5…`), and the Day-1/Day-2 TeamTracker hashes for Spring/Express/FastAPI unchanged; TeamTracker/Django's hash established. No core change expected — the model representation is ready.

---

**Day 2 verdict:** Express and FastAPI now generate real `belongs-to` foreign keys — deterministic, additive, separation-safe, core-neutral — with the Express threading risk proven clean by both the byte-identical gate and exact SQL checks. Three of four stacks now do relationships. Day 2 is **done**.
