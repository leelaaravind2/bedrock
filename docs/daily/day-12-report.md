# Day 12 — End-of-Day Report: Coding-style engine — the SECOND option, `namingConvention`

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no architecture-depth, no wizard UI. The only code touched this session is **test-only asserts** in the gate harness.
**Status: DONE — `namingConvention` (`default` / `camelCase` / `snake_case`) is a deterministic switch on the declared-field JSON wire key, landed on ALL FIVE stacks (Go, Spring, Express, FastAPI, Django). The blocking backstop holds: default reproduces all 20 recorded hashes byte-for-byte, so the option is purely additive. The FastAPI runtime fix is proven LIVE against real Postgres — the exact multi-word POST that used to 500 now round-trips.**

Plan: [`docs/daily/day-12-plan.md`](day-12-plan.md). Step 2 of the coding-style arc (Days 11–14), on the engine Day 11 built. Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), Law 25 (core neutral).

**Naming is the entangled option: unlike formatting (a whitespace post-pass, meaning-preserving by grammar), naming touches identifiers, so it is applied DURING codegen via `context.style` at each stack's serialization boundary. The discipline is that it moves the WIRE KEY only — never the DB column, the internal attribute, or the attribute↔column mapping. A mistake there generates fine but fails at runtime; that is why the FastAPI path was booted, not just generated.**

---

## 1. What was built (Session 2, verified this session)

- **`src/core/style.ts`** (technology-neutral, Law 25) — the engine's kernel additions:
  - `NamingConvention = 'default' | 'camelCase' | 'snake_case'`; `CodingStyle` gains a top-level `namingConvention`; `defaultCodingStyle = { formatting: { indent: 'default' }, namingConvention: 'default' }`.
  - Pure, generic string helpers: `toSnakeCase` (`dueDate → due_date`), `toCamelCase` (`due_date → dueDate`), and `applyNaming(declaredName, convention)` — `default` is a **literal bypass** (returns the name unchanged). Generic string math only; no per-language logic.
- **Model** (`project-model.ts`) — the load-bearing edit: `getStyle()`/`setStyle()` deep-copies now carry `namingConvention` (they previously copied only `formatting` — dropping it would have silently made the whole feature a no-op). `restoreProjectModel` defaults pre-naming snapshots to `namingConvention: 'default'` so old versions regenerate byte-for-byte.
- **Threading** — each plugin's `generateEntity` maps `context.style.namingConvention` into its per-plugin `EntityCodegenContext` (a new `naming` field) and applies `wire(f) = applyNaming(f.name, naming)` at its serialization boundary. No new machinery — the Day-11 `EntityGenerationContext.style` seat carries it. `formatFiles` is untouched (formatting stays a post-pass).
- **Demo** — `src/task-model.ts`: a **multi-word** `Task` entity (`dueDate` DateTime, `isUrgent` Boolean), `multiUser: true`, relationship-free — the guard for the single-word blind spot.

### Per-stack mechanism — which token moves, which must NOT (verified §5)

| Stack | Wire-key mechanism (moves) | MUST-NOT-change (verified unchanged) |
|---|---|---|
| **Go** | `json:"<key>"` tag in the response struct **and** the `${Name}Input` struct (together) | Go identifier (`DueDate`), DB column, `id`/`ownerId`/`createdAt`/`updatedAt` tags, FK json keys |
| **Spring** | conditional `@JsonProperty("<key>")` on the DTO field (+ import, only when emitted) | Java DTO field name (getters/setters/`applyTo`/`fromEntity`), `@Column(name=…)`, id/owner/audit props |
| **Express** | `rowToObject` output key **and** `dto` `body.<key>` read (together) | `row.<column>` accessor, internal `data.<declaredName>` contract, SQL columns, FK/owner/id/audit keys |
| **FastAPI** | Pydantic `Field(alias="<key>")` + `populate_by_name` (only when wire ≠ attr) | SQLAlchemy attribute/column (`due_date`), migration, `owner_id`/`created_at`/`updated_at` |
| **Django** | explicit DRF `serializers.<T>Field(source="<attr>")` named `<key>` in `Meta.fields` (only when wire ≠ attr) | model attribute/column (`due_date`, Option A), `db_table`, owner/audit/FK, id |

**Two discoveries fixed as part of landing naming** (latent, never exercised because every prior demo field was single-word):
- **FastAPI ORM mismatch** — the Pydantic field name was `f.name` while the SQLAlchemy attribute is `columnName(f)` (snake_case). For a multi-word field these diverge and `Model(**data)` raises. Fixed by making the attribute the snake_case column and setting the wire key via `alias` (byte-identical for single-word ⇒ 20 hashes frozen). **Now live-proven** (§4).
- **Django camelCase column** — Django derived the DB column from the attribute, so a multi-word attribute produced a camelCase column. Reconciled (Option A) to a snake_case model attribute (byte-identical for single-word), keeping columns snake_case cross-stack; the wire key rides on the serializer's `source=`.

---

## 2. THE BLOCKING BACKSTOP — default reproduces all 20 hashes (proof)

`npm run day12:gate` from a **clean rebuild** (`rm -rf dist && npm run build`). **Exit 0, zero FAIL lines. All 20 byte-identical under default** — 5 backends × 2 databases × 2 models:

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ | `d158529a…` ✅ |
| Postgres | TeamTracker | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ | `6aea8b04…` ✅ |
| MySQL | DemoApp | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ | `9ff40acb…` ✅ |
| MySQL | TeamTracker | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ | `7408a3e2…` ✅ |

16 non-Go: 16/16. Go's four: 4/4. The `default` path is a literal bypass (`applyNaming(name, 'default') === name`), and every existing caller supplies no style, so the option changes output only when a developer explicitly picks a non-default value. The `two-stacks`, `python:demo`, and `ui:demo` demos also pass (§6), so the threading disturbs nothing.

### Guard the guard — the 20 gate digests literally match the source reports

A gate that hard-codes a wrong digest would pass against itself. The 20 digests baked into `src/day12-gate.ts` were extracted and diffed against their source reports — the 16 Spring/Express/FastAPI/Django digests in [`week-01-summary.md`](week-01-summary.md) and Go's **four** in [`day-09-report.md`](day-09-report.md) / [`day-10-report.md`](day-10-report.md). **The diff is empty — all 20 match byte-for-byte:**

```
PG DemoApp     Spring  010098cd…07c   ==  gate Spring Boot|PostgreSQL|DemoApp
PG DemoApp     Express a437a302…d65   ==  gate Express|PostgreSQL|DemoApp
PG DemoApp     FastAPI dca2254f…843   ==  gate FastAPI|PostgreSQL|DemoApp
PG DemoApp     Django  68601cc5…a18   ==  gate Django|PostgreSQL|DemoApp
PG TeamTracker Spring  9e01210c…d66   ==  gate Spring Boot|PostgreSQL|TeamTracker
PG TeamTracker Express dca2b4a7…9cf   ==  gate Express|PostgreSQL|TeamTracker
PG TeamTracker FastAPI 6d422010…0d1   ==  gate FastAPI|PostgreSQL|TeamTracker
PG TeamTracker Django  e509309c…2c6   ==  gate Django|PostgreSQL|TeamTracker
MY DemoApp     Spring  3112d3f7…d4e   ==  gate Spring Boot|MySQL|DemoApp
MY DemoApp     Express d4b57b52…33f   ==  gate Express|MySQL|DemoApp
MY DemoApp     FastAPI cd87d6e3…8b4   ==  gate FastAPI|MySQL|DemoApp
MY DemoApp     Django  8b07a1b2…5f3   ==  gate Django|MySQL|DemoApp
MY TeamTracker Spring  4c4640ba…ce9   ==  gate Spring Boot|MySQL|TeamTracker
MY TeamTracker Express bfa4a536…649   ==  gate Express|MySQL|TeamTracker
MY TeamTracker FastAPI 5c788c70…b7b   ==  gate FastAPI|MySQL|TeamTracker
MY TeamTracker Django  3b3e6a6f…30a   ==  gate Django|MySQL|TeamTracker
Go/DemoApp/PG      d158529a…067  (day-09 §2 frozen)   ==  gate Go|PostgreSQL|DemoApp
Go/TeamTracker/PG  6aea8b04…35e  (day-09 §3)          ==  gate Go|PostgreSQL|TeamTracker
Go/DemoApp/MY      9ff40acb…ba7  (day-09 §3)          ==  gate Go|MySQL|DemoApp
Go/TeamTracker/MY  7408a3e2…5ec  (day-09 §3)          ==  gate Go|MySQL|TeamTracker
```
`diff` of the two 20-line sets: **identical, 20 == 20.**

---

## 3. The helpers actually transform — closing the camelCase gap

`Task`'s fields are declared camelCase (`dueDate`, `isUrgent`), so `toCamelCase` is a no-op on them and **camelCase output == default for every stack** (correct, but it means a *broken* `toCamelCase` would be invisible in the Task section — the mirror of the single-word blind spot). Closed with a **test-only** assert block in `day12-gate.ts` (no regeneration, no model change) that fires the non-trivial branch of each helper. **All 9 pass:**

```
OK  toCamelCase('start_date') === 'startDate'
OK  toCamelCase('due_date')   === 'dueDate'
OK  toCamelCase('dueDate')    === 'dueDate'      (idempotent)
OK  toSnakeCase('dueDate')    === 'due_date'
OK  toSnakeCase('isUrgent')   === 'is_urgent'
OK  toSnakeCase('due_date')   === 'due_date'     (idempotent)
OK  applyNaming('start_date','default')   === 'start_date'   (literal bypass)
OK  applyNaming('start_date','camelCase') === 'startDate'
OK  applyNaming('startDate','snake_case') === 'start_date'
```
Plus the Session-2 round-trip guard, re-confirmed: `setStyle({…, namingConvention: 'snake_case'})` → `getStyle().namingConvention === 'snake_case'` (the field survives the copy), and a fresh model defaults to `'default'`.

---

## 4. LIVE BOOT — FastAPI on real Postgres (the headline; the runtime fix proven)

Everything else is static. The FastAPI fix repairs a **runtime** break, so it was booted, not just generated. Recipe: `docker compose up --build` (`postgres:16-alpine` + FastAPI), migrations applied, admin seeded, HTTP Basic `admin:admin123`, Task router at `/api/tasks`. Startup log: `Applied migration V1__init.sql`, `Applied migration V2__create_tasks.sql`, `Seeded default user "admin"`, `Uvicorn running on http://0.0.0.0:8000`.

### 4a. `default` convention — the exact POST that used to 500

```
POST /api/tasks   {"dueDate":"2026-07-01T09:30:00Z","isUrgent":true}
→ HTTP 201
  {"id":1,"dueDate":"2026-07-01T09:30:00Z","isUrgent":true,
   "owner_id":1,"created_at":"2026-07-01T21:29:48.520206Z","updated_at":"2026-07-01T21:29:48.520206Z"}

GET  /api/tasks/1
→ HTTP 200   (identical body — dueDate reads back with the value intact)
```
Before the fix, `Model(**data)` with the key `dueDate` raised at runtime (the attribute is `due_date`). Now the alias exposes `dueDate` on the wire, `model_dump()` feeds `due_date` to the ORM, and it **round-trips: 201 + persisted + read back.** (Bonus: `populate_by_name=True` means a client may send `due_date` too — POSTing `{"due_date":…}` to the default app also returned 201, id 2. Both directions work.)

### 4b. `snake_case` convention — wire key `due_date`

```
POST /api/tasks   {"due_date":"2026-07-01T09:30:00Z","is_urgent":true}
→ HTTP 201
  {"id":1,"due_date":"2026-07-01T09:30:00Z","is_urgent":true,
   "owner_id":1,"created_at":"...","updated_at":"..."}

GET  /api/tasks/1  → HTTP 200  (reads back due_date)

# control — camel key on the snake app (no alias on this path):
POST /api/tasks   {"dueDate":"…","is_urgent":false}
→ HTTP 422  {"detail":[{"type":"missing","loc":["body","due_date"],"msg":"Field required", …}]}
```
The 422 proves the wire key genuinely **is** `due_date` on the snake path (the camel key is rejected), not merely coincidentally accepted. Both live paths round-trip; the accessor/column mapping did not move. Containers + volumes were torn down (`compose down -v`); they never touched the deterministic generation path.

---

## 5. Static per-stack checks — only the wire key moved (snake_case Task, all five)

Generated the multi-word `Task` under `snake_case` for each stack and inspected the serialization boundary. **Declared wire key transformed to `due_date` / `is_urgent`; `id`, audit, owner, DB columns, and internal attributes all unchanged:**

| Stack | Declared wire key → moved | Cross-cutting keys / mapping → unchanged |
|---|---|---|
| **Go** | `json:"due_date"`, `json:"is_urgent"` in **both** `task.go` and `validate.go` | `json:"id"`, `json:"ownerId"`, `json:"createdAt"`, `json:"updatedAt"` (frozen camelCase); struct fields `DueDate`/`IsUrgent`; migration columns snake |
| **Spring** | `@JsonProperty("due_date")`, `@JsonProperty("is_urgent")` | Java fields `dueDate`/`isUrgent`; `id`/`ownerId`/`createdAt`/`updatedAt` carry **no** `@JsonProperty`; `@Column(name="due_date")` |
| **Express** | `due_date: row.due_date`, `is_urgent: row.is_urgent`; dto `body.due_date` | accessor `row.due_date` stays; internal `data.dueDate = body.due_date` **contract preserved**; `ownerId`/`createdAt`/`updatedAt` frozen; `COLUMNS`/`INSERT` snake |
| **FastAPI** | `due_date`/`is_urgent` schema fields, **no alias** (wire==attr on snake path) | model `due_date = Column(…)`; `owner_id`/`created_at`/`updated_at` untouched |
| **Django** | plain `ModelSerializer`, `fields=["id","due_date","is_urgent","owner","created_at","updated_at"]` | model attrs `due_date`/`is_urgent`; `owner`/`created_at`/`updated_at`; `db_table="tasks"` |

The Express `rowToObject` snake_case case is the clearest Risk-1 proof: `due_date: row.due_date` (wire key moved; `row.<column>` accessor unchanged) with the dto still writing `data.dueDate` (the declared-name contract the repository reads) — the wire key moved, the attribute↔column mapping did not.

### Task baseline digests (each generated twice → byte-identical)

`camelCase == default` for every stack (the declared names are already camelCase — the transform ran and produced the same key; §3 proves the transform itself is not broken). `snake_case` differs:

| Stack | `default` == `camelCase` | `snake_case` |
|---|---|---|
| Spring | `9644db031e6a5e3d692dbec8b85aa8c1970a33b8fa46cf297f59d455cb970886` | `0484560720f22c1ff627979b78d734ef71e337ea39b18e6357d086b38630baeb` |
| Express | `0ad830e07c507dc19b84b9157b4becf42e3d166199649df629bd5ad2e83d1879` | `f79bbb16a9219d5f7135c654a6d2779c917400523d1671626606c19451f02b29` |
| FastAPI | `6d021709dc9f2033d61d40e1aede00113c29aa2dcf5c2e1db502940648026e9c` | `c8aebb183788b7b5b7bf62584ac450aaae44669672f289560c887113bd0eb4bd` |
| Django | `45d8c59d2535567e321b9f203820235bfe7478eba4263ae51d37842be4dc1c64` | `f0c2c76599d596b801428696567fd574fa84f182818942b5fddf23f8dc27bcef` |
| Go | `2aff30cb54e9b1d09e43a08c10ba72447135310f2a9134a6c67e872f29779fc0` | `e5cc7b8c11420036a94b0d444291de6437840c0f6a281044b9dce05f77670026` |

---

## 6. ADR / Law compliance

- **ADR-001 (no AI):** grep of `src/core` + `src/plugins` for `fetch`/`http.`/`axios`/`openai`/`anthropic`/`api_key` → the only hits are **generated-code strings** (Go `net/http`, Spring `org.springframework.http` inside template literals — the emitted apps' HTTP server code), **not** generator behaviour. No AI/network in the generation path. The key transform is pure string math.
- **ADR-002 (file separation):** `two-stacks` (Express dev `ticket.service.js` unchanged by regen, `openCount()` logic present, Thraksha base regenerated), `python:demo` (FastAPI separation + multi-user), and `ui:demo` (UI==CLI for all five) all **PASS** on the current build. Naming is applied only inside Thraksha-owned codegen; developer files are created-once and never re-touched.
- **ADR-003 (determinism):** `default` is a literal bypass; all 20 default hashes byte-identical; every alternative twice-identical. Same model + style → byte-identical output.
- **Law 25 (core neutral):** `namingConvention` + `toSnakeCase`/`toCamelCase`/`applyNaming` are generic string math in `src/core/style.ts`; **which token, in which file** lives entirely in each plugin. A grep of `src/core` for per-stack serialization tokens (`json:`/`@JsonProperty`/`rowToObject`/`pydantic`/`alias=`/`serializers.`) returns **nothing**. The `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched.

---

## 7. Known v1 limitation — the mixed-key wire object (documented, deliberate)

Because scope is **declared-fields-only**, a non-default project serializes a **mixed** object: the declared fields follow the chosen convention, while the cross-cutting keys (`id`, audit, owner, and — in related models — FK) keep their **per-stack frozen representation** (the ones the 20-hash matrix locks down). This is deliberate for v1, recorded to revisit later — **not accidental.**

Real evidence — the Express `snake_case` `Task` serialized object (`rowToObject`, `multiUser: true`):
```
{ id, due_date, is_urgent, ownerId, createdAt, updatedAt }
   └ frozen ┘ └── declared (snake) ──┘ └──── frozen (camelCase) ────┘
```
The declared `due_date`/`is_urgent` sit next to the frozen `ownerId`/`createdAt`/`updatedAt`. (In Go and Spring the same mix appears; in a related model the FK key `applicationId` would likewise stay frozen.) FastAPI/Django froze their audit/owner keys as snake, so their snake_case object reads uniformly — but the keys are still kept as their frozen representation, not re-derived from the convention. Live confirmation (FastAPI snake, §4b): `{"id":1,"due_date":…,"is_urgent":true,"owner_id":1,"created_at":…,"updated_at":…}`.

Also documented (fixed this Day, not pre-existing regressions): the **FastAPI ORM mismatch** and **Django camelCase column** discoveries (§1) — both invisible before because every prior demo field was single-word.

---

## 8. Honest staging — all five landed

| Stack | Mechanism | Status |
|---|---|---|
| Go | `json` tag (both structs) | ✅ landed |
| Spring | `@JsonProperty` (conditional) | ✅ landed |
| Express | `rowToObject` key + dto read | ✅ landed |
| FastAPI | Pydantic `alias` + `populate_by_name` (+ ORM fix) | ✅ landed — **live-booted** |
| Django | explicit DRF field + `source` (+ column reconcile) | ✅ landed |

No deferral. Go/Spring/Express/Django are generation- and static-proven; FastAPI is additionally **runtime-proven live** on Postgres (both conventions round-trip). The other four stacks' naming is generation + static-proven, not booted this Day — an honest, standing residual consistent with the project's live-coverage table (Express/Go booted live earlier; Spring never booted; FastAPI now booted for naming).

---

## 9. Scope — held

**In scope, done:** `namingConvention` (neutral core value + pure helpers), threaded through all five plugins at their serialization boundaries; the multi-word `Task` demo; the two latent-bug fixes; 20-hash backstop proven; guard-the-guard; helper-branch asserts; FastAPI live round-trip; per-stack static checks; the documented v1 limitation.

**Deliberately out:** architecture depth (Day 13); wizard style-selection UI (Day 14); renaming id/audit/FK/owner keys on the wire (documented v1 limitation); probabilistic/"personality" variation (forbidden — ADR-003); new backends/databases/entity kinds. No re-baselining of any of the 20 default hashes.

---

## 10. What Day 13 picks up

**Day 13 — architecture depth (simple vs layered).** The meatier style option: it changes *which files* are generated (e.g. a layered controller/service/repository split vs a simpler structure), not just an identifier — so it branches the file set on `context.style` rather than transforming a token. Same engine, same seat (`CodingStyle` + `EntityGenerationContext.style`), same blocking backstop: **default (current layering) = the 20 hashes, byte-for-byte.** Then Day 14 wires the style-selection screen into the wizard and proves all combinations end-to-end.

---

**Day 12 verdict:** the coding-style engine gained its second option. `namingConvention` (`default`/`camelCase`/`snake_case`) is a deterministic switch on the declared-field JSON wire key, landed on all five stacks via each stack's own serialization mechanism, leaving DB columns, `id`, audit, owner, FK keys, and internal attribute↔column mappings untouched. The multi-word `Task` demo exercised what the single-word 20-hash matrix structurally cannot, surfacing and fixing two latent bugs. The blocking backstop holds — all 20 default hashes byte-identical, the gate's own digests verified against the source reports — and the FastAPI runtime fix is proven live: the exact multi-word POST that used to 500 now round-trips on real Postgres. Day 12 is **done**.
