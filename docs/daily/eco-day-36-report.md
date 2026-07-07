# Eco-Day 36 — REPORT: CLI + GraphQL + static-site+API project types `[2 days]`

**Phase 3, Day 36. EXECUTE + REPORT (combined session).** Three new `projectType`
archetypes — **CLI**, **GraphQL API**, and **Static Site + API** — added as deterministic
entrypoint/route-table projections that **reuse the domain layer unchanged**, extending the
Day-34 `projectKind` seam. **Express (Node) CLI + GraphQL are done + BOOTED**; **Spring
static-site+API is done, generation-only**; the other 4 stacks' CLI/GraphQL are **honestly
STAGED to pass 2** (like Day 34). The **existing types stay byte-identical** — no frozen
hash moved, and the frontend-constraint refactor is byte-neutral.

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS,
145 OK / 0 FAIL, 89 digests** (86 from before + 3 new archetype baselines).

---

## 1. What shipped (Stage 1)

### 1.1 The three archetypes
- **CLI** — `src/cli.js` (stdlib `process.argv` arg-parse + dispatch + run-to-exit — **NO
  dependency**) + `src/commands.js` (the **command→handler table**, auto-discovering
  `src/entities/<e>/<e>.commands.js`) + a per-entity command slice (`ticket:list|get|create|
  update|delete`) calling the SAME domain service. No HTTP, no loop.
- **GraphQL API** — `src/graphql-server.js` (ONE `POST /graphql` endpoint) + `src/resolvers.js`
  (the merged resolver table) + **`schema.graphql`** (the **deterministic SDL**) + a per-entity
  resolver slice, replacing the many REST route/controller files with **one schema + resolver
  set**. The `graphql` reference runtime is a **gated generated-project dep**.
- **Static Site + API** — the web-app projection (Spring + its React frontend, **frontend
  KEPT**) + an **additive** `static-build.sh` (renders the frontend to `frontend/dist` static
  assets via `vite build`). Swaps nothing; adds a build stage. Spring-centric (only Spring
  scaffolds a frontend).

### 1.2 The enum + the frontend-constraint REFINEMENT
- `projectType: … | 'CLI' | 'GraphQL API' | 'Static Site + API'`
  ([`core/project-model.ts`](../../generator/src/core/project-model.ts)). Additive union values.
- The Day-34 rule (`projectType !== 'Web App' → frontend None`) is **refined** into an explicit
  `FRONTENDLESS_PROJECT_TYPES` set = {API-only, Cron Worker, Queue Consumer, **CLI**,
  **GraphQL API**}. **`Static Site + API` is deliberately ABSENT** — it KEEPS its frontend
  (like Web App), which a plain `!== 'Web App'` test would have wrongly stripped. **Proven
  byte-neutral for existing types** (DC-2): API-only + workers stay frontendless with their
  reason strings preserved byte-identical; Web App untouched.

### 1.3 The deterministic SDL — the new load-bearing property
`schema.graphql` is a **pure, sorted projection** of the model
([`core/graphql-sdl.ts`](../../generator/src/core/graphql-sdl.ts) — a single home for the
ordering, like the Day-31 `canonicalTokens`): **types sorted by entity name** (ascending
code-unit compare, NOT `localeCompare`), **fields in declared model order** then FK/owner/audit,
queries/mutations grouped per entity in a fixed op order (`list/get`, `create/update/delete`),
scalars in a fixed order (`DateTime` always; `Decimal` gated). **Never** hash/`Map`/object-key
iteration order.

### 1.4 Where the projection lives
[`plugins/express/express-plugin.ts`](../../generator/src/plugins/express/express-plugin.ts):
`generateProjectShell` skips `src/server.js` + `src/app.js` for CLI/GraphQL (an `endpointKind`
alongside the Day-34 `workerKind`) and emits the CLI/GraphQL entrypoint + table + `schema.graphql`;
`generateEntity` branches to `generateCliEntityFiles` / `generateGraphqlEntityFiles`
([`entity-codegen.ts`](../../generator/src/plugins/express/entity-codegen.ts)), reusing the
domain builders byte-identically. [`plugins/spring/spring-plugin.ts`](../../generator/src/plugins/spring/spring-plugin.ts):
`Static Site + API` keeps the web-app walk (frontend retained) and pushes `static-build.sh`.

---

## 2. The determinism proofs

### DC-2 — EXISTING TYPES = LITERAL BYPASS (load-bearing)
`rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full frozen backstop
byte-identical (**86 baked + non-hash gates 1c–1q**). No fixture uses a new type; the
**frontend-constraint refactor moved no manifest line** for existing types. A moved hash would
have been a finding; none moved.

### DC-3 — new twice-identical baselines (PART 1r, additive) + DOMAIN-REUSE
Recorded in [`day20-regression.ts`](../../generator/src/day20-regression.ts) PART 1r:

| type (DemoApp, PG) | baseline (twice-identical) |
|---|---|
| Express CLI | `553b797e7a8a8a09…` |
| Express GraphQL API | `5b3cd7ecb941e20c…` |
| Spring Static Site + API | `0062805b100bb793…` |

**Domain-reuse (asserted in PART 1r):**
- **CLI / GraphQL** vs the **api-only twin** — every shared file byte-identical except the
  legitimately-rewritten manifest/package.json/README; **removed** = `server.js`, `app.js`,
  `controller.base`/`routes.base`/`routes.js`; **added** = CLI `cli.js`+`commands.js`+
  `<e>.commands.js` / GraphQL `graphql-server.js`+`resolvers.js`+`schema.graphql`+`<e>.resolvers.js`.
  The domain (model/repository/dto/service.base + migration + dev service) is byte-identical.
- **Static Site + API** vs the **web-app twin** — web-app byte-identical, **frontend KEPT**,
  the ONLY addition is `static-build.sh` (an additive build stage; no swap).

### DC-4 — GraphQL SDL DETERMINISM (the new load-bearing gate)
`schema.graphql` is **twice-identical byte-for-byte**, and — the load-bearing assertion — is a
**sorted projection**: re-deriving the SDL from a **reversed entity insertion order** yields a
**byte-identical** schema (types come out `Apple` before `Zebra` regardless of insert order).
The ordering does NOT depend on iteration order.

### DC-5 — THE BOOT (Express, both types — actually RUNS)
Booted via Node over a **stubbed pool** (Docker down / no DB — the Day-25/34 pattern):
- **CLI:** the command table exposes all 5 CRUD commands; `ticket:list` returns the stub row
  through the domain service; `ticket:create --title Hello` validates via the shared dto +
  creates (id 99); `ticket:get 1` fetches — the command→domain→result path **runs to exit**.
- **GraphQL:** a **REAL `graphql()` execution** against the generated `schema.graphql` +
  resolvers — query `{ tickets { id title } ticket(id: 1) { id title } }` → `{"tickets":[{"id":"1",
  "title":"A"}],"ticket":{"id":"1","title":"A"}}` (no errors); mutation `createTicket(input:{title:"Made"})`
  → `{"createTicket":{"id":"99","title":"Made"}}`. The SDL parses (`buildSchema` accepted it),
  the resolvers wire to the field names, the whole GraphQL lifecycle runs over the domain.

---

## 3. Stage 2 — the other 4 stacks (CLI/GraphQL): HONESTLY STAGED to pass 2

**Not implemented this pass — deliberately staged, not crammed** (the plan's Stage 2 permits
this, "like Day 34 pass 2"). CLI + GraphQL for Go/FastAPI/Django/Spring are generation-only (no
Go/Java toolchain, heavy Python, Docker down — none bootable/compilable here), and each needs a
per-stack arg-parse idiom + a per-stack GraphQL runtime + resolvers. The **shared SDL builder**
(`core/graphql-sdl.ts`) already gives every stack the same deterministic schema; pass 2 adds the
per-stack entrypoints/resolvers as additive PART-1r baselines, one stack at a time with a
default-bypass gate after each. Express (Node) is the boot-verifiable stack and is **done +
booted for both CLI and GraphQL** — the provable heart of the `[2 days]`.

---

## 4. Verification levels (honest, per §4)

| Claim | Level |
|---|---|
| Existing types byte-identical (incl. the frontend refactor byte-neutral) | **Proven** — 145 OK / 0 FAIL from clean |
| Express CLI / GraphQL / Spring static+API twice-identical baselines | **Proven** — recorded, re-derived each run |
| Domain reused unchanged (CLI/GraphQL == api-only twin; static+API == web-app twin) | **Proven** — asserted in PART 1r |
| GraphQL SDL deterministically ordered (never iteration order) | **Proven** — byte-identical under reversed insert |
| Express CLI runs to exit / GraphQL query + mutation resolve | **Booted** — real `graphql()` + command handlers over a stub pool |
| Spring static-site+API | **Generation-only** — no JDK/node-build here to run `static-build.sh` |
| Go / FastAPI / Django / Spring CLI + GraphQL | **Staged** (pass 2) — not written this pass |

**Determinism ≠ validity:** generation + the SDL are deterministic and Express is boot-verified;
the other stacks' runtime correctness is reasoned/deferred, not run.

---

## 5. Invariants (all confirmed)

- **Generator pure-Node, `deps {}`, 0 native modules** — verified: `dependencies: {}`; **no
  `graphql` / `yargs` / `commander` / `minimist` in the generator's `package.json`**. The
  `graphql` runtime is a **gated GENERATED-PROJECT dep** (present in the generated GraphQL
  project's package.json only); CLI uses **stdlib `process.argv`** — no dep at all.
- **No frozen hash moved** — existing types are a literal bypass; the frontend-constraint
  refactor is byte-neutral (DC-2).
- **The domain layer is reused unchanged** — CLI/GraphQL swap only the entrypoint + route/command/
  resolver layer; static+API adds only a build stage (DC-3).
- **The GraphQL SDL is deterministically ordered** (DC-4) — the new load-bearing property, in
  one shared core builder.
- **New baselines additive** — 89 digests = 86 + 3; nothing replaced.

---

## 6. Forward-flags

- **`[2 days]` scope status:** Express (Node) × {CLI, GraphQL} — **done + booted**. Spring
  static-site+API — **done, generation-only**. Go/FastAPI/Django/Spring × {CLI, GraphQL} —
  **staged to pass 2** (generation-only; no toolchain to boot/compile).
- **The static-site+API limitation (stated plainly):** only Spring scaffolds a frontend, so
  static-site+API is Spring-centric — the frontendless stacks (Express/FastAPI/Django/Go) have
  no UI to render statically; a universal minimal static-client is explicitly deferred (not Day 36).
- **Day 38 picks up:** CI/CD pipeline generation (per stack/provider; pinned action + runtime
  versions from the blueprint; deterministic, hashed artifacts).
- **Invariant to keep:** any GraphQL/CLI/arg-parse library stays a **generated-project** dep,
  gated on the type — never Thraksha core (`deps {}` stays).

---

*Day 36 added CLI, GraphQL API, and Static Site + API as deterministic entrypoint/route-table
projections that reuse the domain layer unchanged: CLI (a stdlib arg-parse entrypoint + a
command→handler table, run-to-exit, no dep), GraphQL API (one `/graphql` endpoint + a
deterministically-ordered `schema.graphql` + resolvers, replacing the many REST route/controller
files, `graphql` a gated generated-project dep), and Static Site + API (web-app + an additive
`static-build.sh` stage, frontend KEPT — Spring-centric). The type↔frontend constraint was
refined into an explicit frontendless set so Static Site + API retains its frontend, proven
byte-neutral for existing types; the existing backstop reproduces byte-identical (86 baked +
non-hash). Each new type yields a new twice-identical additive baseline (PART 1r; 89 digests);
the CLI/GraphQL domain files are byte-identical to the api-only twin and static+API's web-app is
byte-identical to the web-app twin (the reuse proof); and the GraphQL SDL is deterministically
ordered — byte-identical under reversed insertion order, sorted by name, never iteration order
(the new load-bearing property, in one shared core builder). Express (Node) CLI runs to exit and
GraphQL answers a real query + mutation over a stubbed pool; Spring static+API is generation-only,
and the other 4 stacks' CLI/GraphQL are staged to pass 2 (Day-34 pattern). Any GraphQL/CLI/arg-parse
library is a gated generated-project dependency — Thraksha core stays deps {} with 0 native
modules; no AI, no frozen hash moved. Day 38 picks up CI/CD pipeline generation.*
