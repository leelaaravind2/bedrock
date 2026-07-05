# Thraksha — Generator + Project Model (TypeScript)

Turns one Project Model into a complete, runnable backend — as **Spring Boot**,
**Express (Node.js)**, **FastAPI (Python)**, *or* **Django (Python)**, all from
the same blueprint, with a working CRUD REST API for every entity.

The generator is written in **TypeScript**: sources live in `src/` and compile
to plain JavaScript in `dist/`, which Node runs. TypeScript is a build-time tool
only — there are **no runtime dependencies**; the generated project is unaffected
by the language choice.

There is **no AI, no network, and no randomness** anywhere in generation
(ADR-001, ADR-003).

## Architecture: a technology-agnostic core + backend plugins (Laws 25–28)

The engine is split so the kernel knows nothing about any technology:

- **`src/core/`** — the technology-agnostic kernel: the Project Model, the
  `GeneratedFile`/ownership contract, the preview/plan/apply engine, versioning,
  and the manifest. It contains **no Java, Spring, JPA, Node, or Express logic**.
  It asks a backend plugin to produce files through one interface
  ([`src/core/plugin.ts`](src/core/plugin.ts)): `generateProjectShell(model)`,
  `generateEntity(entity, context)`, `describeEntityDefaults(entity)`.
- **`src/plugins/spring/`** — the Spring Boot + PostgreSQL plugin (Java/JPA/Flyway
  templates and codegen).
- **`src/plugins/express/`** — the Express + PostgreSQL plugin (Node/Express/pg),
  a *peer* implementing the same interface.
- **`src/plugins/python/`** — the FastAPI + PostgreSQL plugin
  (Python/FastAPI/SQLAlchemy/Pydantic), a *peer* implementing the same interface.
- **`src/plugins/registry.ts`** — the composition layer that maps the model's
  `backend` answer to a plugin (`Spring Boot` → spring, `Express` → express,
  `FastAPI` → python). Adding a backend is one line here; **the core never changes.**

Same model + `backend: 'Spring Boot'` → a Spring app (hash `196f5472…`).
Same model + `backend: 'Express'` → an Express app (its own stable hash). Both
are deterministic and both keep developer files separate from generated files
(ADR-002).

## The Project Model ("the map")

[`src/project-model.ts`](src/project-model.ts) is a plain in-memory structure
holding one project's **Phase-A settings** (name, type, backend, frontend,
database, multi-user, auth) and its **entities** (name; fields with
name/type/required/unique/default/validation; optional relationships). The
shapes are real TypeScript types, so mistakes are caught at compile time.

[`src/demoapp-model.ts`](src/demoapp-model.ts) builds the DemoApp model. The
generator reads it — see [`src/generate.ts`](src/generate.ts). `npm run demo`
shows the model API with no code generation.

## Entities → working code (Step 3)

For each entity in the model, [`src/entity-codegen.ts`](src/entity-codegen.ts)
emits a complete CRUD slice. The files are split by **ownership** (ADR-002):

| File (for entity `Ticket`, package `…​.ticket`) | Owner | Regenerated? |
|---|---|---|
| `TicketBase.java` (`@MappedSuperclass`, fields, extends `BaseOwnedEntity`) | Thraksha | every run |
| `TicketRepository.java` (owner-scoped finders) | Thraksha | every run |
| `TicketDto.java` (validation from field rules) | Thraksha | every run |
| `TicketServiceBase.java` (CRUD + owner scoping) | Thraksha | every run |
| `TicketControllerBase.java` (CRUD endpoints) | Thraksha | every run |
| `db/migration/V2__create_tickets.sql` | Thraksha | every run |
| `Ticket.java` (`@Entity` extends `TicketBase`) | **Developer** | **created once, never touched** |
| `TicketService.java` (`@Service` extends base) | **Developer** | **created once, never touched** |
| `TicketController.java` (`@RestController` extends base) | **Developer** | **created once, never touched** |

**The seam:** each developer class *extends* the generated base class. Spring
discovers the concrete `@Entity` / `@Service` / `@RestController`; all generated
scaffolding is inherited. Both sets of files are ordinary Java — no Thraksha
markers the project needs to compile or run (Laws 19–21).

**Multi-user (ADR-005):** when the project is multi-user, every entity extends
`BaseOwnedEntity` (an `owner_id` + audit columns), its table carries `owner_id`,
and the service scopes every read/write to the current user (resolved by
`common/CurrentUserProvider`). The data shape is always multi-user-*ready*;
scoping is *active* only when multi-user is on.

**Defaults shown (ADR-004):** `required` defaults to optional, `unique` to no,
String length to 255. The generator prints every applied default and records it
in `GENERATION-MANIFEST.txt` — never silent.

### The ADR-002 write mechanism

The generator does **not** bulk-delete the project (that would destroy developer
code — the exact anti-pattern ADR-002 forbids). Instead:

- **Thraksha-owned files** are overwritten every run.
- **Developer-owned files** are written **only if absent**. Once a developer
  file exists, the generator never opens it again.

So a developer can write 50 lines of logic, regenerate ten times, and those
lines are guaranteed untouched — *by construction*, not by careful merging.

## Build & run

Requires Node.js 18+.

```bash
cd generator
npm install                 # TypeScript + @types/node (dev only)
npm run build               # compiles src/ -> dist/

npm run preview             # DRY RUN: show what would change, write NOTHING
npm run generate -- --yes   # apply Spring (default); writes ./output/DemoApp (hash 196f5472…)
npm run generate -- --yes --backend Express   # same model, Express backend instead
npm run generate -- --yes --backend FastAPI   # same model, FastAPI (Python) backend instead
npm run generate -- --yes --backend Django    # same model, Django (Python) backend instead
npm run generate            # interactive: show preview, then prompt to confirm
npm run demo                # Project Model demonstration (no generation)
npm run preview:demo        # Step 4 proof: change model, preview, apply, verify
npm run two-stacks          # Path A proof: one model -> Spring AND Express, both deterministic
```

Then build & run the generated project (standard, no Thraksha needed):

```bash
cd ../output/DemoApp
docker compose up --build
```

The Ticket CRUD API is owner-scoped, so it requires login (default
`admin` / `admin123`):

```bash
# create
curl -u admin:admin123 -X POST http://localhost:8080/api/tickets \
  -H 'Content-Type: application/json' \
  -d '{"title":"First ticket","code":"T-001","priority":1,"done":false}'

curl -u admin:admin123 http://localhost:8080/api/tickets          # list
curl -u admin:admin123 http://localhost:8080/api/tickets/1        # read one
curl -u admin:admin123 -X PUT http://localhost:8080/api/tickets/1 \
  -H 'Content-Type: application/json' \
  -d '{"title":"Updated","code":"T-001","priority":2,"done":true}' # update
curl -u admin:admin123 -X DELETE http://localhost:8080/api/tickets/1 # delete
```

## Regeneration preview (Step 4)

Before writing anything, the generator computes a **dry-run plan** and shows
exactly what regeneration will do, then waits for explicit confirmation:

- Thraksha-owned files marked `CREATE` / `CHANGE` / `unchanged` (skipped).
- Developer-owned files marked `SAFE` — *"will NOT be touched (ADR-002)"*.
- A summary line, e.g. *"4 generated files will be written (0 new, 4 changed);
  29 unchanged and skipped. 3 of your files will NOT be touched."*

The preview ([`src/regen.ts`](src/regen.ts)) and the actual write share **one
`classify()` function**, so the preview is accurate by construction — what it
predicts is exactly what the apply does. Every line states its reason (Law 13).
Nothing is written until you pass `--yes` or answer the interactive prompt;
`--preview` only ever shows the plan. Because identical files are skipped
(Law 39), the predicted change set equals the real change set exactly.

## Versioning + rollback (Step 5)

The **Project Model** is what gets versioned — it is the small source of truth.
Because generation is deterministic, any past version's output is regenerated
from its saved model, so only the tiny model snapshot is stored (not a copy of
every version's files).

```bash
npm run version -- save "what changed"   # snapshot the current model as the next version
npm run version -- list                  # show the version history (head marked *)
npm run version -- rollback 1            # restore v1's model and regenerate it
npm run version:demo                      # full-cycle proof (save, change, rollback)
```

- Versions are sequence-numbered (`v1`, `v2`, …) with a note — **no wall-clock
  timestamps** (ADR-003), stored as JSON under `<repo>/.thraksha/versions/<project>/`
  (override with `THRAKSHA_STORE` / `THRAKSHA_PROJECT`). Nothing version-related
  is written inside the generated project, so its hash is unaffected.
- **Rollback to vN reproduces vN's exact generated output** (same hash) because
  generation is deterministic.
- **Developer files survive rollback.** Rollback regenerates the target model
  with the same `applyPlan` that never overwrites an existing developer file
  (ADR-002). Thraksha files that the target version does not produce are removed
  — and only ever Thraksha-owned paths, never developer paths (Law 34).

## Minimal UI (Step 6)

A plain browser UI to drive the engine by clicking instead of running scripts.
It is a **thin front end**: a small `node:http` server ([`src/server.ts`](src/server.ts),
no web framework) holds one in-memory Project Model and maps each request to an
existing engine function — it reimplements nothing.

```bash
npm run build
npm run ui          # serves http://localhost:4317  (PORT to override)
```

Through the UI a person can: set Phase-A settings, add an entity (fields with
defaults shown), see the real preview, confirm & generate, save/list versions,
and roll back. Each action calls the real engine:

| UI action | Engine function |
|---|---|
| Set project settings | `createProjectModel()` |
| Load DemoApp example | `buildDemoAppModel()` |
| Add entity | `model.addEntity()` + `describeEntityDefaults()` |
| See preview | `buildFileSet()` + `computePlan()` + `renderPreview()` |
| Confirm & generate | `applyPlan()` |
| Save / list versions | `VersionStore.saveVersion()` / `.listVersions()` |
| Roll back | `VersionStore.rollback()` |

Building DemoApp through the UI yields the same hash as the script path
(`196f5472…`) — the server only passes data to the engine, which remains the
single source of determinism. Set `THRAKSHA_UI_OUTPUT` / `THRAKSHA_UI_STORE` to
write the project / versions somewhere other than the defaults.

## Determinism

Generating twice from the same model produces **byte-for-byte identical
output**: sorted traversal, fixed template content, model-ordered entity
emission, and nothing written contains a timestamp or random value. The preview,
the versioning snapshots, and the UI path are likewise deterministic — no
timestamps, no randomness anywhere that affects output.

## Layout

```
generator/
├── package.json        # build-time deps (TypeScript, @types/node) + scripts
├── tsconfig.json       # strict, NodeNext, src -> dist
├── src/
│   ├── core/                    # technology-AGNOSTIC kernel (no Java/Node/SQL logic)
│   │   ├── project-model.ts     #   Project Model + types; restore from snapshot
│   │   ├── plugin.ts            #   BackendPlugin interface (the kernel/plugin seam)
│   │   ├── regen.ts             #   file-set build + preview plan + apply (one classify())
│   │   └── versioning.ts        #   VersionStore (save/list/rollback), preserves dev files
│   ├── plugins/
│   │   ├── registry.ts          #   maps model.backend -> plugin (composition layer)
│   │   ├── spring/              #   Spring Boot + PostgreSQL plugin (Java/JPA/Flyway)
│   │   │   ├── spring-plugin.ts, entity-codegen.ts
│   │   ├── express/            #   Express + PostgreSQL plugin (Node/Express/pg) — a PEER
│   │   │   ├── express-plugin.ts, entity-codegen.ts
│   │   └── python/             #   FastAPI + PostgreSQL plugin (Python/SQLAlchemy/Pydantic) — a PEER
│   │       ├── python-plugin.ts, entity-codegen.ts
│   ├── demoapp-model.ts         # the DemoApp model (Phase-A + Ticket; optional backend)
│   ├── generate.ts, version.ts, server.ts        # CLIs + UI server (composition roots)
│   ├── model-demo.ts, preview-demo.ts, version-demo.ts, two-stacks-demo.ts
├── plugins/
│   ├── spring/templates/        # the Spring+React+Postgres shell (assets, tokenised)
│   ├── express/templates/       # the Express+Postgres shell (assets, tokenised)
│   └── python/templates/        # the FastAPI+Postgres shell (assets, tokenised)
├── ui/index.html       # plain HTML/JS front end (no framework)
└── dist/               # compiled JS (generated by `npm run build`)
```

Adding a third backend later = a new `src/plugins/<name>/` implementing
`BackendPlugin` + one line in `registry.ts`. **The core never changes.**
