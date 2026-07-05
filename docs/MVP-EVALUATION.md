# Thraksha MVP Evaluation (Step 7 — "Stop and Evaluate")

**Date:** 2026-06-30 · **Status:** MVP complete and verified · **Decision:** core
is proven; proceed to Path A (second backend) as the next move.

This is the human checkpoint mandated by BUILD-PLAN Step 7. It is not a build
record — it is a conscious evaluation of whether the MVP loop is solid and the
core guarantees hold, written down so the project has a permanent, honest line
that says *the core is proven before we expand.*

---

## 1. What the MVP proves (in plain terms)

The whole idea of Thraksha — **describe intent in a small model, and let a
deterministic engine turn it into real, running software you can still own and
edit by hand** — is now demonstrated end-to-end by a single thin slice:

> set Phase-A settings → add an entity → preview → generate → version → roll back

Concretely, the MVP proves five things that normally kill tools like this:

1. **Model → working software.** A tiny Project Model (Phase-A answers + entities
   with typed fields) generates a complete, owner-scoped **Spring Boot + React +
   PostgreSQL** CRUD app that compiles and is wired to run via Docker Compose.
2. **Generated and developer code never collide.** Generated scaffolding lives in
   Thraksha-owned `…Base` files; the developer's real logic lives in separate
   files that the generator is *structurally incapable* of overwriting.
3. **You can see before you leap.** An accurate dry-run preview shows exactly what
   regeneration will create / change / leave untouched — and what it promises is
   exactly what happens on confirm.
4. **Change is reversible.** Each model state is a numbered version; rolling back
   reproduces that version's generated output *byte-for-byte*, while preserving
   the developer's hand-written files.
5. **It's trustworthy because it's deterministic.** Same model → same output,
   every time, with no AI and no randomness anywhere in the generation path.

---

## 2. Verified state (this evaluation's checks)

All checks below were run against the current codebase and **passed**.

| Check | Result |
|---|---|
| DemoApp generates to the canonical hash (ADR-003) | **`196f5472a84eb83001bd4693f9581dbdd92073de9e6f27d3e97da050ea0e02d2`** (36 files) |
| Fresh generation into a clean dir reproduces that hash | ✅ identical |
| Engine loop — preview demo (predict → apply) | ✅ PASS — prediction == reality, developer file untouched |
| Engine loop — version demo (save → change → rollback) | ✅ PASS — rollback reproduced v1 exactly (`8d758ad2…`, ≠ v2), developer `openCount()` preserved |
| UI loop over real HTTP — settings → entity → preview → generate → version → rollback | ✅ PASS — UI-generated DemoApp hashes `196f5472…`; rollback left all 3 developer files untouched |
| No AI / no timestamps / no randomness in `src/` | ✅ none found |
| TypeScript strict build | ✅ clean |

### ADR compliance

- **ADR-001 (no AI in generation).** Generation is pure templates + deterministic
  code emission. A search of the source finds no model calls, no network, no AI.
  Delete any "AI plugin" and generation is unaffected — there is none in the path.
- **ADR-002 (file separation).** Each entity splits into Thraksha-owned files
  (`…Base`, repository, DTO, migration) and developer-owned files (`Ticket.java`,
  `TicketService.java`, `TicketController.java`). The write phase overwrites
  Thraksha files but writes developer files **only if absent** and never opens an
  existing one. Demonstrated: hand-written logic survived regeneration *and*
  rollback, byte-for-byte.
- **ADR-003 (determinism).** Same model → identical output (hash above), proven
  across repeated runs, across the script path and the UI path, and across
  versions on rollback. No timestamps or randomness affect output.
- **ADR-004 (mandatory / optional / default, shown not silent).** Mandatory
  answers block when missing; `required`→optional, `unique`→no, and per-type
  validation defaults are applied **and printed/recorded** (manifest + UI).
- **ADR-005 (multi-user up front).** Multi-user is a Phase-A construction-time
  setting with no later toggle; every entity is built owner-scoped on the
  `BaseOwnedEntity` foundation from day one.

---

## 3. Scope boundary — in scope vs deliberately deferred

This is an honest accounting, not a criticism. The MVP is intentionally small.

**In scope (built and working):**

- One stack: Spring Boot + React + PostgreSQL, multi-user-ready, simple login.
- Phase-A project setup and per-entity definition (name; fields with
  name/type/required/unique), per INTAKE-SPEC.
- Deterministic generation, file separation, preview, versioning + rollback.
- A minimal UI and CLIs over the one engine; a type-safe TypeScript codebase.
- A clean kernel/plugin seam (see §4) with the Spring backend behind it.

**Deliberately deferred (NOT built — and correctly so for an MVP):**

- **Only one of each technology.** No second backend, frontend, or database yet.
- **Entities only.** No workflows, business rules, relationships beyond the
  field level, or computed/derived logic generation.
- **No knowledge packs, no organization packs/profiles** (no org-policy override
  of defaults yet — ADR-004's org hook is designed-for, not built).
- **No AI explainer plugin** (ADR-001 keeps it *optional*; none is present).
- **No import** of an existing project into a model; **no blueprint compiler /
  execution-plan** machinery; **no project graph / evolution engine /
  engineering database.**
- **The UI is minimal and unstyled** — plumbing, not a product UI.
- Persistence of versions is local files; no remote storage or multi-user
  collaboration on the *platform* itself.

The MVP boundary is exactly the BUILD-PLAN's "small enough to finish, complete
enough to prove the idea." It is proven. It should not be expanded until a
deliberate next move is chosen — which it now is.

---

## 4. Next direction — Path A: prove the plugin architecture (NOT part of Step 7)

The chosen next direction is **Path A: prove the plugin architecture is real by
adding a second backend (Express)** — because the single most load-bearing claim
left unproven is Constitution Laws 25–28 (the kernel holds no technology-specific
logic; technologies are plugins). A second backend is the only honest proof.

Path A is two sub-moves:

- **Sub-move 1 — Extract the technology-agnostic core / plugin seam**
  (keeping DemoApp's hash identical at `196f5472…`).
  **Status: COMPLETED (2026-06-30), output unchanged.** The engine is now split
  into a technology-agnostic `core/` (Project Model, the `GeneratedFile`/ownership
  contract, the preview/plan/apply engine, versioning, the manifest) and a
  `plugins/spring/` plugin holding all Java/JPA/Flyway/template specifics. The
  core talks to backends only through a `BackendPlugin` interface
  (`generateProjectShell`, `generateEntity`, `describeEntityDefaults`). Verified:
  the core contains no Spring/Java/JPA logic, and DemoApp still hashes `196f5472…`.
  This was a *structural* refactor — it changed how Thraksha is written, never
  what it produces.

- **Sub-move 2 — Add the Express plugin.**
  **Status: NOT STARTED (this is the actual next move).** Implement the same
  `BackendPlugin` interface for a second backend, with **no change to the core**.
  Success = the core is untouched, DemoApp (Spring) still hashes `196f5472…`, and
  a new Express project generates from the same Project Model.

> This whole section is the *next* move. It is recorded here as the decision; it
> is **not** part of Step 7, and sub-move 2 has not been begun.

---

## 5. Future platform capabilities — constraints to preserve, not build now

The original vision names larger capabilities: multiple blueprint views, a
blueprint compiler / execution plans, knowledge packs, organization packs, a
project graph, an evolution engine, and an engineering database. For the MVP and
the immediate next move these are **constraints, not tasks**:

- **Do not build machinery for them now** (that is the "overfunctional trap" the
  intake spec warns against).
- **Do not make decisions that foreclose them.** The architecture must stay open:
  the Project Model remains the single source of truth (Law 2); generation stays
  deterministic and AI-free (ADR-001/003); plugins remain the only place
  technology lives (Laws 25–28); everything stays versioned and reversible
  (Laws 32–34). Each future capability must later attach through these existing
  contracts (Law 49), never as a parallel system.

In short: keep the seams clean and the guarantees intact, so these can be added
later as plugins/packs onto a proven core — never by rewriting it.

---

## Verdict

The MVP loop is **solid, deterministic, and trustworthy**. The five ADRs hold.
The core is proven. We may proceed — deliberately, one move at a time — beginning
with Path A sub-move 2 (the Express plugin), without expanding scope further.
