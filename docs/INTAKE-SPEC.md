# Thraksha Intake Specification (MVP)

**This is the exact set of questions the MVP asks a developer.** It is deliberately
small. The research produced ~60 possible questions; this MVP asks ~12. Everything
not listed here is either auto-handled (a default) or deferred to a later release.

The guiding rule (from ADR-004): **ask only what changes the structure of the whole
project, or what the software cannot possibly guess. Default everything the software
can know. Defer everything not needed to make a real app run.**

---

## Phase A — Project setup (asked once, up front)

These create a runnable, empty, professionally-structured project. For the MVP we
start with **one choice of each** — more options are added later as plugins.

| # | Question | Kind | MVP options / default |
|---|----------|------|----------------------|
| 1 | Project name | Mandatory | (free text) |
| 2 | Project type | Mandatory | **Web App** (only option in MVP) |
| 3 | Backend stack | Mandatory | **Spring Boot** (only option in MVP) |
| 4 | Frontend | Mandatory | **React** or None |
| 5 | Database | Mandatory | **PostgreSQL** or None |
| 6 | **Multi-user?** | Mandatory | yes / no — **default: multi-user-ready** (see ADR-005) |
| 7 | Authentication | Default | None / Simple login — default: Simple login |

**Deferred (NOT in the MVP, not even shown):** microservices, multi-tenancy,
async/event-driven, caching, i18n, observability config, cloud/Kubernetes/Terraform,
multiple stacks. These are the "overfunctional" traps — they are explicitly out of
scope for the first build.

---

## Phase B — Entity definition (per entity)

After the empty project exists, the developer adds business objects one at a time.
This is the "baby questionnaire" — a specification with mandatory, optional, and
defaulted fields.

### Per entity

| # | Question | Kind | If blank |
|---|----------|------|----------|
| 8 | Entity name | Mandatory | (blocks) |
| 9 | Fields (at least one) | Mandatory | (blocks) |
| 10 | Relationships | Optional | none |
| 11 | Basic validation | Optional | sensible default per field type |

### Per field (inside question 9)

| Field property | Kind | If blank |
|----------------|------|----------|
| Field name | Mandatory | (blocks) |
| Field type (String, Integer, Decimal, Boolean, Date, DateTime, etc.) | Mandatory | (blocks) |
| Required? | Default | optional |
| Unique? | Default | no |
| Default value | Optional | none |
| Validation (max length, range) | Optional/Default | default for the type |

---

## Auto-handled — never asked (these are defaults, per ADR-004)

The platform fills these in automatically and shows them to the developer, but does
not ask:

- **Primary key** → an auto-generated ID. Not asked.
- **Timestamps** (created / modified) → on by default. Not asked.
- **CRUD + REST API** for each entity → generated automatically. Not asked.
- **Table/collection names** → derived from the entity name. Not asked.
- **Multi-user scoping fields** → added automatically when multi-user is on (ADR-005).

---

## What this intake produces

With these ~12 answers, the platform can generate a **complete, runnable web app**:

- Spring Boot backend with an entity, repository, REST CRUD API per entity
- React frontend
- PostgreSQL database with migrations
- Multi-user-safe data scoping
- Docker Compose so it runs immediately
- README, git repository, initial commit
- Opens in VS Code and **runs** — and runs even if Thraksha is removed (Law 21)

That is the entire v1.0 demo. Small enough to actually finish; complete enough to
prove the whole idea.

---

## How this maps to file ownership (ties to ADR-002)

For each entity, generation produces two groups of files:

- **Thraksha-owned (regenerated freely):** entity base class, repository,
  controller base, DTOs, migration.
- **Developer-owned (created once, never touched again):** the logic subclass and
  service class, where the developer writes their real business logic.

This separation is what makes "change a setting and regenerate" safe.
