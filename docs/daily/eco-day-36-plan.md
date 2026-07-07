# Eco-Day 36 — PLAN: CLI + GraphQL + static-site+API project types `[2 days]`

**Phase 3, Day 36. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 36 adds the **three
remaining project archetypes**: **CLI** (an arg-parse entrypoint + a command→handler
table, run-to-exit — no HTTP, no loop), **GraphQL API** (ONE endpoint + a deterministic
SDL schema + resolvers replacing the many REST route/controller files), and
**static-site+API** (the web-app projection + a static-output build stage). Each new type
is a **new `projectType` enum value + an entrypoint/route-table projection reusing the
existing domain layer** — the pattern Day 34 proved for cron-worker/queue-consumer. The
**existing types (Web App / API-only / Cron Worker / Queue Consumer) stay byte-identical.**
**`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md)
(§1.1 no baseline moves silently; §2 the 3 determinism killers — **unstable iteration
order is the load-bearing risk for GraphQL SDL**; §3 STOP-and-report; §4 honesty) →
[`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 36 (lines 84–87) + Day 38 (the next
day — CI/CD, out of scope) → [`eco-day-34-report-pass2.md`](eco-day-34-report-pass2.md)
(the gate: **86 baked + 10 TeamTracker + non-hash 1c–1q**; the entrypoint/route-table
projection pattern) → the REAL project-type handling: `core/project-model.ts` (the
`projectType` enum + the type↔frontend constraint, line ~424) and each stack's
`generateProjectShell`/`generateEntity` (the Day-34 `workerKind` branch + the REST
route/controller layer GraphQL replaces).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code):**
> - **The enum is `projectType: 'Web App' | 'API-only' | 'Cron Worker' | 'Queue Consumer'`**
>   (`core/project-model.ts:56`). The **type↔frontend constraint** (line ~424) currently
>   reads `if (projectType !== 'Web App' && frontend !== 'None') → frontend = 'None'`. This
>   is the LINE Day 36 must **refine** (see §2.1): CLI + GraphQL are frontendless (join the
>   rule), but **static-site+API REQUIRES a frontend** (it is web-app + a static build), so
>   it must be treated like Web App, not forced to None.
> - **Only Spring scaffolds a frontend** (`plugins/spring/templates/frontend/**`, 8 files;
>   subtraction keyed on `frontend === 'None'`). The other 4 stacks (Express/FastAPI/Django/
>   Go) are **frontendless** — for them "Web App" already == "API-only". ⇒ **static-site+API
>   is inherently Spring-centric** (the only stack with a UI to render statically).
> - **The Day-34 branch pattern** (`plugins/express/express-plugin.ts:677+`): a `workerKind`
>   discriminator skips the HTTP entrypoint (`src/server.js`/`src/app.js` — the route table),
>   pushes the worker entrypoint + table, and `generateEntity` branches on `context.projectType`.
>   Day 36 **generalizes `workerKind` → a `projectKind`** covering CLI + GraphQL too.
> - **The domain layer** (reused byte-identically, proven Day 34) = per-entity
>   `model/repository/dto/service.base` + the dev `service` + `db/migrate/seed/auth` +
>   migrations. **The REST route/controller layer GraphQL replaces** = `app.js` (the
>   route table / router auto-mount) + `server.js` + per-entity `controller.base`/`routes.base`/
>   `routes` (Express); the peers in each stack (FastAPI `router_base`/`main.py`, Go
>   `handler_base`/`register.go`, Django `views_base`/`config/urls.py`, Spring `*ControllerBase`).
> - **No fixture uses a new type** ⇒ adding CLI/GraphQL/static output per stack is a **literal
>   bypass by construction** (the new branch fires only for the new types; existing baselines untouched).
> - **The additive precedents:** Day 34 (workers — a new type, additive, own baselines, one
>   booted stack + the rest generation-only) is the exact template; the Figma
>   `design-tokens.json` core artifact (Day 31) is the precedent for a **deterministic,
>   sorted, model-derived artifact** — the SDL schema is the same shape of problem.

---

## 0. What Day 36 is — three archetypes as entrypoint/route-table projections

All three **reuse the deterministic domain layer** (entities/repositories/services/
migrations) and change only the entrypoint + the "route table":

- **CLI** — an **arg-parse entrypoint** (stdlib — no dep) + a **command → handler table**
  (the analog of the route table: per-entity CRUD commands `<entity> list|get|create|update|delete`)
  + **run-to-exit**. No HTTP, no long-running loop. (Structurally the CLOSEST to a worker —
  an entrypoint swap with a dispatch table, minus the loop.)
- **GraphQL API** — **ONE endpoint** (`/graphql`) + a **deterministic SDL schema**
  (`schema.graphql`: a GraphQL type per entity; queries/mutations from CRUD) + **resolvers**
  wiring each field to the domain service. Replaces the MANY REST route/controller files with
  ONE schema + resolver set. **The SDL must be byte-identical run-to-run — stable type/field
  ordering (the new load-bearing determinism property).**
- **static-site+API** — the **web-app projection** (Spring + its React frontend) + a
  **static-output build stage** (a deterministic build config/step that produces static
  assets). This is an **ADDITIVE build stage on top of web-app**, not an entrypoint swap —
  and it **keeps the frontend** (unlike the frontendless archetypes).

This is a definite structural mapping — software builds it whole (not creative). The
existing types are a literal bypass.

---

## 1. THE DETERMINISM SPINE

1. **The EXISTING types are a LITERAL BYPASS.** Adding three enum values + the new branches
   does NOT change Web App / API-only / Cron Worker / Queue Consumer generation (the branch
   fires only for the new types; no fixture uses them). **Proof (execute):** `rm -rf dist &&
   npm run build && npm run day20:regress` → PASS, the full backstop byte-identical
   (**86 baked + 10 TeamTracker + non-hash gates 1c–1q**). **A moved frozen hash = a FINDING,
   STOP** (never a re-baseline).
2. **Each new type → NEW twice-identical baselines (additive, PART 1r).** A CLI fixture, a
   GraphQL fixture (per stack as scoped), a static-site+API fixture (Spring) → generated twice
   → byte-identical → recorded in a new **PART 1r**, never replacing a frozen hash.
3. **The GraphQL SDL is DETERMINISTIC — the new load-bearing property.** `schema.graphql`
   (and the resolver map order) is **byte-identical run-to-run**, with ordering **derived
   deterministically from the model (sorted), NEVER from hash-map / object-key iteration
   order** (determinism killer #3). The gate re-derives the SDL and asserts a stable, sorted
   ordering (see §2.3 + DC-4).
4. **At least one type BOOTS.** **Express CLI** runs to exit (a command dispatches to the
   domain and prints a result); **Express GraphQL** answers a query (a resolver → domain →
   response). **Honest** about which stack×type booted vs generation-only (Node is
   runtime-verifiable via a stubbed pool, as Days 25/27/34 did; Go/Java/Python are
   toolchain-gated; static-site+API is Spring-only ⇒ generation-only, no JDK/node-build here).

---

## 2. THE ARCHITECTURE — reuse the domain, swap the entrypoint/route-table

### 2.1 The enum + the type-shape constraint (the refinement Day 36 must make)
- **`projectType: … | 'CLI' | 'GraphQL API' | 'Static Site + API'`.** Additive union values.
  (Names are proposals — keep them clear; the manifest reason strings for the NEW types must
  be NEW, never reusing/moving API-only's frozen string.)
- **The type↔frontend constraint splits into an explicit membership test.** Today's line
  (`projectType !== 'Web App' → frontend None`) is **wrong for static-site+API** (which needs
  a frontend). Refine to:
  - **Frontendless types** (force `frontend = 'None'`): `API-only`, `Cron Worker`,
    `Queue Consumer`, **`CLI`**, **`GraphQL API`**.
  - **Frontend-having types** (leave frontend as chosen, like Web App): `Web App`,
    **`Static Site + API`**.
  - **CRITICAL determinism note:** this refactor MUST be byte-neutral for existing types —
    API-only + the two workers stay in the frontendless set (same forced-None, **same reason
    strings preserved byte-identical**), Web App stays untouched. A moved manifest line here =
    a finding (DC-2). Static-site+API is new (no fixture), so keeping its frontend moves no hash.

### 2.2 The domain layer is REUSED UNCHANGED; the entrypoint + route table is SWAPPED
- **Reused (byte-identical to the api-only/web-app twin):** each entity's domain files
  (`model/repository/dto/service.base` + the dev `service`) + `db/migrate/seed/auth` + the
  migrations. The Day-34 domain-reuse proof (worker domain == api-only twin) extends: the CLI/
  GraphQL project's domain files are byte-identical to the same-model api-only project's.
- **Swapped (per-stack `generateProjectShell`/`generateEntity` branch on `projectKind`):**
  - **CLI:** `server.js`/`app.js` (HTTP listen + route mount) → a **CLI entrypoint** (`cli.js`
    / `main.go` / `cli.py` / a Spring `CommandLineRunner`) + a **command table** (auto-
    discovered or generated, the analog of the route table); the entity HTTP route/controller
    layer → a per-entity **command handler** calling the reused domain service. Arg-parse is
    **stdlib** (Node `process.argv`, Go `flag`, Python `argparse`, Spring `CommandLineRunner`
    args) — **no dep**; a richer arg-parse lib, if ever used, is a **gated generated-project dep**.
  - **GraphQL:** `server.js`/`app.js` → a **GraphQL server entrypoint** mounting ONE `/graphql`
    endpoint over `schema.graphql` + resolvers; the MANY per-entity REST route/controller files
    → **one `schema.graphql` + a resolver set** (a per-entity resolver module calling the domain
    service). The GraphQL runtime lib (Node `graphql`; Python `strawberry`/`ariadne`; Go
    `gqlgen`/`graphql-go`; Spring `spring-boot-starter-graphql`) is a **gated generated-project
    dep** (`deps {}` core unchanged).
  - **static-site+API:** the web-app projection is UNCHANGED; a **static build stage** is ADDED
    (Spring: the React `frontend/**` builds to static assets — a deterministic build config /
    multi-stage Dockerfile / build script + a documented static output dir). This ADDS a
    build-stage artifact; it does not swap the entrypoint or the domain.

### 2.3 The GraphQL SDL — deterministic ordering (the new load-bearing property)
The SDL is a **pure, sorted projection of the model**, so the SAME model yields a
byte-identical `schema.graphql` every run (this is the Day-31 `canonicalTokens` shape of
problem — a sorted, deterministic, model-derived artifact):
- **Types:** one GraphQL `type` per entity, **entity types sorted by name** (ascending,
  code-unit — the same comparator the digest uses, NOT `localeCompare`).
- **Fields within a type:** in the **model's declared field order** (the `entity.fields` array
  is already deterministic), then FK fields (authored order), then `id`/owner/audit — a fixed,
  stable sequence. **Never** object-key/`Map` iteration order.
- **Scalar mapping:** a FIXED table (`String/Text→String`, `Integer/Long→Int`,
  `Decimal→Float` or a custom scalar — decide + document, `Boolean→Boolean`, `Date/DateTime→`
  a `DateTime` custom scalar or `String`, `id→ID`). Required → `!`, optional → nullable.
- **Queries/Mutations:** derived from CRUD, grouped per entity, entities sorted by name,
  operations in a fixed order (`list`, `get`, `create`, `update`, `delete`).
- **Resolvers:** the resolver map/object must also be emitted in **sorted (stable) order** —
  a resolver object literal built by iterating a `Map`/object is a killer-#3 risk; emit keys
  sorted.
- **Design decision the plan flags (execute resolves):** whether `schema.graphql` is emitted
  by a **shared, canonical sorted builder** (like `canonicalTokens`, since the SDL shape is
  spec-defined and largely stack-agnostic) with **per-plugin scalar conventions**, OR fully
  per-plugin. **Recommendation:** a shared deterministic ordering helper (the sort logic is
  the load-bearing part and should live in ONE place), invoked per-plugin so scalar/naming
  conventions stay plugin-owned (Law 25). Either way, the ORDERING rule above is the gate.

### 2.4 The dependency question (the recurring finding)
- **Thraksha core stays `deps {}`** — every projection is pure-Node string templates. **Any
  GraphQL runtime / arg-parse library is a GENERATED-PROJECT dependency** (in the generated
  `package.json`/`go.mod`/`requirements.txt`/`pom.xml`), **gated on the project type** so
  existing-type manifests are byte-identical. **Prefer NO dep where possible** (CLI via
  stdlib arg-parse). This is the amqplib/pika/decimal-lib finding again: a runtime lib belongs
  in the generated project, never the generator core.

### 2.5 Scope (`[2 days]` — honest, staged like Day 34)
- **Definite (boot-verified): Express (Node)** — **CLI + GraphQL**, booted (a `node cli.js
  <entity> list` runs to exit over a stubbed pool; a `/graphql` query resolves over a stubbed
  pool). Node is runtime-verifiable here (Days 25/27/34 precedent).
- **Generation-only (per the toolchain reality): the other 4 stacks** (Spring/FastAPI/Django/
  Go) for CLI + GraphQL — the same entrypoint/route-table projection, recorded as additive
  baselines + the domain-reuse diff (as Day-34 pass 2 did), **HONESTLY STAGED** to a pass 2 if
  too large this pass. No boot/compile here.
- **static-site+API: Spring-only, GENERATION-ONLY** (the only frontend-having stack; no JDK/
  node-build here to run the static build). The frontendless stacks have **no frontend to
  render statically** — documented limitation, not a silent gap; a universal minimal
  static-client is explicitly deferred (not Day 36).
- **Staging shape (recommended):** **Pass 1** = the provable heart — Express **CLI + GraphQL**
  booted + the **deterministic-SDL gate** + static-site+API (Spring, generation-only) + the
  default-bypass gate. **Pass 2** = CLI + GraphQL for the other 4 stacks (generation-only,
  one stack at a time with a default-bypass gate after each, exactly like Day-34 pass 2).

---

## 3. What the plan resolves (answered from the real code)

1. **The enum + where the entrypoint diverges + the frontend-constraint refinement:**
   `projectType` (core/project-model.ts) + the split into frontendless vs frontend-having
   sets (§2.1); the per-stack `generateProjectShell`/`generateEntity` `projectKind` branch
   generalizing Day-34's `workerKind` (§2.2).
2. **CLI mechanism:** an arg-parse entrypoint (stdlib — no dep) + a command→handler table
   (per-entity CRUD commands) reusing the domain service; run-to-exit (§2.2).
3. **GraphQL shape:** ONE `/graphql` endpoint + `schema.graphql` (types←entities,
   queries/mutations←CRUD) + resolvers→domain service; the GraphQL lib is a gated
   generated-project dep; the SDL is **deterministically ordered** (§2.3, the load-bearing gate).
4. **static-site+API shape:** web-app + a static build stage (Spring's React → static assets);
   an additive build stage, frontend retained; Spring-only + generation-only (§2.2, §2.5).
5. **Which stacks × types (honest scope):** Express CLI + GraphQL **boot-verified**; the other
   4 stacks generation-only / staged (pass 2); static-site+API Spring-only generation-only (§2.5).
6. **How the domain is reused unchanged:** the CLI/GraphQL project's domain files are
   byte-identical to the api-only twin — only the entrypoint + route/command/resolver layer
   differs (§2.2; the Day-34 domain-reuse gate, extended).

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking
close if a proof fails."**

### Stage 1 (pass 1) — the enum + the constraint refinement + Express CLI + GraphQL (booted) + the SDL-determinism gate + static-site+API (Spring, gen-only)
- **DC-1:** the three enum values + the type↔frontend constraint refinement (CLI/GraphQL →
  frontendless; static-site+API → frontend-having; existing types byte-neutral); the **Express**
  CLI (arg-parse entrypoint + command→handler table) and GraphQL (`/graphql` + deterministic
  `schema.graphql` + resolvers) projections, **reusing the domain layer unchanged**; the Spring
  static-site+API static-build-stage projection. Any GraphQL/arg-parse lib is a **gated
  generated-project dep** (`deps {}` core unchanged).
- **DC-2 (EXISTING TYPES = LITERAL BYPASS — load-bearing):** `rm -rf dist && npm run build &&
  npm run day20:regress` → **PASS**, the full backstop byte-identical (86 baked + 10 + non-hash).
  The new types are additive; existing types untouched; **the constraint refactor moves no
  manifest line** for existing types. **A moved hash = a finding, STOP.**
- **DC-3 (Express new baselines + domain reuse):** CLI + GraphQL (Express) → generated
  **twice-identical** → recorded in a new **PART 1r** (additive). **Prove domain reuse:** the
  CLI/GraphQL project's `model/repository/dto/service.base` + migrations are byte-identical to
  the same-model api-only project's (only the entrypoint + route/command/resolver layer differs).
- **DC-4 (GraphQL SDL DETERMINISM — the new load-bearing gate):** `schema.graphql` is
  **twice-identical byte-for-byte**; assert the ORDERING is stable and sorted (types sorted by
  entity name; fields in declared order; queries/mutations in the fixed order) and **does not
  depend on iteration order** — e.g. re-derive the SDL and assert equality, and assert the type
  block order matches the sorted entity-name order. A different insertion/iteration order must
  NOT change a byte.
- **DC-5 (THE BOOT — Express, both types):** `node cli.js <entity> list` (or `create`) **runs
  to exit** exercising the domain command handler over a stubbed pool (Day-34 stub pattern); a
  `/graphql` query **resolves** through the schema+resolvers → domain → response over a stubbed
  pool. Honest: Express booted; the rest generation-only.

### Stage 2 (pass 2) — CLI + GraphQL for the other 4 stacks (generation-only) + invariants
- **DC-6:** extend CLI + GraphQL to Spring/FastAPI/Django/Go as **generation-only** additive
  baselines (per-stack arg-parse/GraphQL idioms, gated deps), **one stack at a time with a
  default-bypass gate after each** (exactly Day-34 pass 2). Record baselines in PART 1r + the
  per-stack domain-reuse + per-stack SDL-determinism check. HONESTLY STAGE any stack×type too
  large this pass.
- **DC-7 (invariants):** generator **pure-Node** (`deps {}`, 0 native — **no GraphQL/arg-parse
  lib as a Thraksha core dep**; each is a gated generated-project dep only); **no frozen hash
  moved** (existing types); the **domain layer reused unchanged**; the SDL deterministically
  ordered per stack; the new baselines additive (PART 1r).

**Execute scope guard (every stage):** only CLI + GraphQL + static-site+API. **NOT** CI/CD
(Day 38). Existing types byte-identical (**a move = finding, STOP**). The **domain layer reused
unchanged** (entrypoint/route-table swap only; static+API adds a build stage, changes no domain
file). **GraphQL/CLI/arg-parse libs are generated-project deps only, never Thraksha core**
(`deps {}` stays). **The GraphQL SDL is deterministically ordered** (stable, sorted — never
iteration order). No AI. No signing. Commit to `main`.

---

## 5. REPORT — done-conditions

[`eco-day-36-report.md`](eco-day-36-report.md) (+ `-pass2` if staged like Day 34): the three
archetypes + the per-stack entrypoint/route-table projection (CLI command→handler table;
GraphQL one-endpoint + SDL + resolvers; static+API build stage; the domain reused unchanged);
the **default-bypass proof** (existing types byte-identical, by construction; the constraint
refactor byte-neutral); the **new twice-identical baselines** (PART 1r, additive; per stack as
scoped); the **GraphQL-SDL-determinism proof** (stable, sorted ordering; twice-identical; not
iteration-order); the **boot proof** (Express CLI runs to exit / GraphQL query resolves —
**honest verification level per stack**, Express booted vs the rest generation-only, static+API
Spring generation-only, like Day 25/34); **invariants** (pure-Node `deps {}` — GraphQL/CLI libs
generated-project-only; no frozen hash moved; domain reused unchanged). **Forward-flags:**
`[2 days]` scope status (which stacks×types booted vs generation-only vs staged); **determinism
≠ validity** (deterministic generation + SDL; runtime boot-verified for Express, reasoned for
the rest); what **Day 38** picks up (CI/CD pipeline generation — pinned actions/versions).

---

## 6. Scope guard — OUT for Day 36
- Only CLI + GraphQL + static-site+API. **NOT** CI/CD (Day 38).
- **The existing types MUST be byte-identical** — a moved hash = a FINDING, STOP (never a
  re-baseline). The frontend-constraint refactor must be byte-neutral for existing types.
- **The domain layer is reused unchanged** — the archetypes swap only the entrypoint/route-table
  (CLI/GraphQL) or ADD a build stage (static+API); a required domain-file change = a finding.
- **GraphQL/CLI/arg-parse libs are GENERATED-PROJECT deps only, gated on the type — never a
  Thraksha core dep** (`deps {}` stays).
- **The GraphQL SDL must be deterministically ordered** (stable, sorted — never hash/iteration
  order). This is the new load-bearing determinism property.
- No AI. No signing. **`[2 days]`** — stage honestly (Express booted for CLI+GraphQL; others
  generation-only/staged; static+API Spring generation-only).

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + Month-2 Day 36 + Day-34 pass-2 report + the real project-type enum +
   the constraint line + the Day-34 `workerKind` branch + the REST layer GraphQL replaces? — ✅
   (this session).
2. Only Day-36's job (the three archetypes)? — yes; **not** CI/CD (Day 38).
3. Which frozen baselines must NOT move? — **all** (86 baked + 10 TeamTracker + non-hash). New
   enum values are additive; no fixture uses them; the constraint refactor is byte-neutral for
   existing types; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/existing path a literal bypass? — **yes, by construction**: the new branch fires only
   for the new types; existing types unchanged.
6. Three killers checked? — no clock/RNG/UUID in the projection; LF only; **stable order —
   THE GraphQL SDL is the load-bearing case: types sorted by name, fields in declared order,
   resolvers emitted sorted; NEVER hash/`Map`/object-key iteration order.** Any GraphQL/arg-parse
   lib is a gated generated-project dep, not a core dep.
7. A gate that can actually FAIL? — **DC-2** (a moved existing hash ⇒ a new branch or the
   constraint refactor leaked into the default), **DC-3** (a new type non-deterministic / domain
   files differ from api-only), **DC-4** (the SDL is not byte-identical / its order depends on
   iteration), **DC-5** (the CLI doesn't run to exit / the GraphQL query doesn't resolve),
   **DC-7** (a GraphQL/arg-parse lib in Thraksha `deps` / a native module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) a moved existing hash silently re-baselined
   (a finding, STOP); (ii) the frontend-constraint refactor moving an existing manifest line
   (must be byte-neutral); (iii) a GraphQL/arg-parse lib added to Thraksha's `deps {}` (must stay
   empty — gated generated-project dep); (iv) changing the domain layer (must be reused unchanged);
   (v) claiming all stacks×types boot when only Express did (§4 honesty — booted vs generation-only
   vs staged; static+API Spring generation-only); (vi) a non-deterministic SDL passing a weak gate
   (the ordering gate must actually catch iteration-order); (vii) drifting into CI/CD (Day 38) — all guarded.

---

*Day 36 adds the three remaining project archetypes as deterministic entrypoint/route-table
projections that REUSE the domain layer unchanged: CLI (an arg-parse entrypoint + a
command→handler table, run-to-exit, no HTTP), GraphQL API (one `/graphql` endpoint + a
deterministically-ordered SDL schema + resolvers, replacing the many REST route/controller
files), and static-site+API (the web-app projection + an additive static-output build stage,
Spring-centric as the only frontend-having stack). They are new `projectType` enum values; the
existing types are a literal bypass by construction (no fixture uses the new types, so the 86
baked + 10 TeamTracker + non-hash gates reproduce byte-identical; the type↔frontend constraint
is refined into frontendless vs frontend-having sets, byte-neutral for existing types). Each new
type yields new twice-identical additive baselines (PART 1r); the CLI/GraphQL domain files are
byte-identical to the api-only twin (the reuse proof, extended from Day 34); and the GraphQL SDL
is deterministically ordered (sorted types, declared-order fields, sorted resolvers — never
iteration order — the new load-bearing property, twice-identical byte-for-byte). At least one
type boots — Express (Node) CLI runs to exit and GraphQL answers a query over a stubbed pool —
with the other 4 stacks generation-only/staged honestly (Day-34 pass-2 pattern) and static-site+API
Spring-only generation-only (no JDK/node-build here). Any GraphQL/CLI/arg-parse library is a gated
generated-project dependency, never a Thraksha core dep (`deps {}` stays, 0 native); no AI, no
frozen hash moved. Day 38 picks up CI/CD pipeline generation.*
