# The data model — entities, fields, relationships

The data-model step describes your application's entities. It is optional: a project with no entities is
a valid settings-only shell (a literal bypass that reproduces the settings-only baseline byte-identical).
Add entities to generate a full CRUD application.

## Entities

Each entity has a name and a list of fields, and may declare relationships to other entities. Add an
entity with **+ Add entity**; remove one with **remove entity**.

## Field types (the real eight)

A field has a name and a **type**. The supported types are exactly the eight the database code generator
understands (source of truth: `generator/src/plugins/database/postgres.ts`, `SUPPORTED_TYPES`; mirrored
in the wizard's `FIELD_TYPES`):

**String, Text, Integer, Long, Decimal, Boolean, Date, DateTime.**

No other types exist; the wizard offers exactly these and no more.

A field may also be marked **required** (default: optional) and **unique** (default: not unique). Only
non-default flags are written into the blueprint, so a field carries the minimal shape.

## Decimal precision and scale

A **Decimal** field may carry a precision and a scale. If you leave them blank, the engine applies its
money-grade defaults (precision 19, scale 4). Precision/scale are validated and only meaningful for
Decimal fields (proof: PART 1n, the ten decimal relationship baselines; `eco-day-62-report.md`).

## Relationships

A relationship has a **kind** and a **target** entity:

- **belongs-to** — a foreign key to an earlier entity. The engine requires the target to be an entity
  defined earlier (it enforces the dependency order).
- **has-many** — a one-to-many link to another entity.

**has-many is collected explicitly and is never inferred from a belongs-to.** If you want a has-many
link, you declare it; Bedrock does not guess it for you (a minted rule — never infer intent the user did
not state; proof: PART 1d/1m, the ten TeamTracker/has-many relationship hashes).

## The TeamTracker example

The data-model step offers a **Load TeamTracker example** — four related entities (Team, Application,
Ticket, Comment) with belongs-to relationships. This example reproduces the certified TeamTracker
structure that anchors the determinism backstop: generating it yields the frozen digest
`9e01210c55a5…` (Spring Boot / PostgreSQL), the same digest the backstop asserts daily (proof: the
UI==CLI harness anchor leg, `eco-day-71-report.md` §2; PART 1a/1d).

[SCREENSHOT-NEEDED: the data-model step with the TeamTracker example loaded, showing the four entities
and their belongs-to relationships.]
