# Day 1 — End-of-Day Report: Relationships in generated code (design + Spring)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features built this session.
**Status: DONE — all done-conditions met, every proof passing.**

Plan: [`docs/daily/day-01-plan.md`](day-01-plan.md). Guardrails honored: ADR-001 (no AI), ADR-002 (file separation), ADR-003 (determinism), ADR-004 (defaults shown), Law 25 (core technology-neutral).

---

## 1. What was built (Session 2)

Relationships now generate real foreign keys in Spring, additively.

**Project Model (core, technology-neutral) — `src/core/project-model.ts`**
- New `RelationshipSpec` / `Relationship` types + `createRelationship()`: normalized shape `{ kind: 'belongs-to' | 'has-many', target, required }`. `required` defaults to `false` (optional, ADR-004). `type` accepted as an alias for `kind` (back-compat).
- `createEntity` normalizes `relationships` (relationship-free entities keep `[]`, byte-identical to before).
- `addEntity` rejects a **`belongs-to` forward reference** (target must be defined earlier) with a deterministic error, guaranteeing migration ordering. `has-many` (the inverse view) is not existence-checked and generates no schema.

**Spring plugin (Thraksha-owned files only) — `src/plugins/spring/entity-codegen.ts`**
- **Scalar FK**, mirroring the proven `ownerId` pattern (not a `@ManyToOne` object graph — deferred): each `belongs-to` adds `@Column(name = "<target>_id") private Long <target>Id;` + accessors to `XBase.java`.
- `XDto.java` carries the FK (writable; `@NotNull` only when required) across fields / `fromEntity` / `applyTo` / accessors, so CRUD can set the parent id on create/update.
- Migration gains the `<target>_id BIGINT` column, an `ALTER TABLE … ADD CONSTRAINT fk_<table>_<target> FOREIGN KEY … REFERENCES <target_table>(id)`, and `CREATE INDEX idx_<table>_<target>_id`.
- `describeEntityDefaults` shows each relationship (ADR-004).
- Every emission is a **loop over belongs-to relationships** → empty for relationship-free entities, so nothing is added or reordered. Repository / service / controller bases and all developer files are untouched. `BackendPlugin` interface unchanged.

**Demo content — `src/teamtracker-model.ts`**: `belongsTo()` now returns the canonical `{ kind: 'belongs-to', target }`. Model: Team; Application→Team; Ticket→Application, Team; Comment→Ticket.

---

## 2. Proof / results (all passing)

### 2.1 Baseline gate — relationship-free models byte-identical (blocking)

| Model / stack | Hash | Result |
|---|---|---|
| DemoApp / **Spring** | `010098cd…` | ✅ unchanged |
| DemoApp / Express | `a437a302…` | ✅ unchanged |
| DemoApp / FastAPI | `dca2254f…` | ✅ unchanged |
| DemoApp / Django | `68601cc5…` | ✅ unchanged |

Relationships are additive: an entity with no relationships generates the exact same bytes as before the change.

### 2.2 Determinism (ADR-003)

- TeamTracker / Spring generated **twice → byte-identical**.
- **Established stable hash:** `9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66`.
  - (Supersedes the pre-relationship TeamTracker/Spring value `c8a46862…`, which was produced before FK generation existed. The change is intentional — TeamTracker legitimately gained FK columns. Express/FastAPI/Django TeamTracker hashes are unchanged; they don't generate relationships yet — Days 2–3.)

### 2.3 Static correctness

| Check | Result |
|---|---|
| `ApplicationBase` → `teamId` (`@Column(name="team_id")`) | ✅ |
| `TicketBase` → `applicationId` + `teamId` (two FKs) | ✅ |
| `CommentBase` → `ticketId` | ✅ |
| `TeamBase` → no FK (the parent owns none) | ✅ |
| `TicketDto` carries the FK field + accessors + `applyTo` wiring | ✅ |
| `applications` migration: `team_id BIGINT` + `fk_applications_team … REFERENCES teams (id)` + `idx_applications_team_id` | ✅ |
| Migration ordering valid: `V1 init → V2 teams → V3 applications → V4 tickets → V5 comments` | ✅ |
| Every FK `REFERENCES <table>` points at a table created in an **earlier** migration | ✅ |
| Forward-reference guard: belongs-to to an undefined entity → clean deterministic error | ✅ |

### 2.4 Defaults shown (ADR-004)

- `GENERATION-MANIFEST.txt` (TeamTracker) shows a line per relationship, e.g.
  `Application belongs-to Team: team_id, required=false (default: optional)` (and Ticket→Application/Team, Comment→Ticket).
- DemoApp's manifest (no relationships) contains **no** `belongs-to` line — unchanged.

### 2.5 File separation (ADR-002)

- Wrote hand logic into developer-owned `TicketService.java`, tampered Thraksha-owned `TicketBase.java`, regenerated **twice**:
  - developer file **byte-identical** (logic survived), tampered marker **gone** (Thraksha file rewritten).
- Relationships never touch developer files by construction (the developer-file builders don't read `relationships`).

### 2.6 ADR-001 (no AI) + Law 25 (neutral core)

- No AI/network/model calls anywhere in `src/core/` or `src/plugins/` (grep for `openai|anthropic|fetch(|http.request|api_key|langchain` → none). Generation is pure templates + deterministic emission.
- Core carries only generic relationship *kinds* (`belongs-to` / `has-many`) and `target` — the same neutrality as field *types* (`String` / `Integer`). No Spring/JPA/SQL/FK words in the core. The FK→`@Column`/SQL mapping lives entirely in the Spring plugin. `BackendPlugin` interface unchanged (same 5 members).

### 2.7 Optional live check — honest note

- **Docker is available**, but a Spring project's live proof requires a full Maven dependency download + compile + boot (several minutes). Per the plan, **the dedicated live related-data run is Day 4**; a heavy build here would duplicate that.
- Instead, a **static referential-coherence** check was run and passed: every FK `REFERENCES` target is created in an earlier migration, and the V-numbering is a valid topological order for the belongs-to graph.
- **Caveat (honest):** Day 1 proves the Spring relationship output is *correct and deterministic statically*; it has **not** been compiled/booted against a live database yet. That end-to-end proof (create a Team → create a Ticket under it → fetch it back) is **Day 4**.

---

## 3. Scope — in vs deferred

**In scope, done this Day:**
- Model relationship representation (`belongs-to` / `has-many`, `target`, `required` default).
- Spring `belongs-to` generation: FK column + constraint + index + entity Base field + DTO wiring.
- `has-many` recorded in the model (for the blueprint), generating no schema.
- Deterministic forward-reference guard.

**Deliberately deferred (per the plan — not scope creep):**
- **Express + FastAPI relationships → Day 2; Django → Day 3.** Those plugins do not generate relationships yet.
- **Live Docker compile/boot of related data → Day 4.**
- **UI to declare relationships (belongs-to picker in the entity screen) → Day 19.**
- `has-many` schema/`@OneToMany` collections, `@ManyToOne` association objects, many-to-many/join tables, self-relations, cascade/`ON DELETE` tuning, parent-scoped finders/nested routes — future / complex relation types.

---

## 4. Caveats

1. **Static-only proof for Spring this Day** — see §2.7. Correct and deterministic on paper; live compile/boot is Day 4.
2. **TeamTracker/Spring hash changed** (`c8a46862…` → `9e01210c…`) — expected and intended (it gained FKs). Only *relationship-free* baselines are frozen; TeamTracker's other three stacks stay put until Days 2–3.
3. **Scalar FK, not a JPA association** — `Long <target>Id`, deliberately minimal (no navigation/fetch/cascade). Richer object-graph mapping is a later, explicitly-deferred item.
4. **belongs-to targets must be authored before the referencing entity** — enforced by a clear error; forward references / reordering are future scope.

---

## 5. What Day 2 picks up

**Day 2 — Relationships: Express + FastAPI.** Implement the same `belongs-to` FK generation for the Express and FastAPI plugins, matching Spring's behavior (FK column + related wiring), deterministic, file separation intact. Prove each stack's relationship output is stable (record TeamTracker/Express and TeamTracker/FastAPI hashes), while the DemoApp baselines (`a437a302…`, `dca2254f…`) and Spring's frozen `010098cd…` stay unchanged. The Project-Model representation built today is stack-agnostic and ready for them to consume — no core changes expected on Day 2.

---

**Day 1 verdict:** the highest-value gap (real relationships in generated code) is opened correctly for Spring — deterministic, additive, separation-safe, core-neutral — with every proof passing. Day 1 is **done**.
