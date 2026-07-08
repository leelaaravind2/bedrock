# Eco-Day 36 — REPORT (PASS 2 of 2): CLI + GraphQL for Go / FastAPI / Django / Spring

**Phase 3, Day 36, pass 2. EXECUTE + REPORT (combined).** Stage 1 (commit `f879150`)
delivered **Express** CLI + GraphQL (booted) + the shared deterministic SDL builder
(`core/graphql-sdl.ts`) + Spring static-site+API. Pass 2 applies the SAME pattern —
entrypoint/route-table projections reusing the domain layer, GraphQL from the shared
SDL builder — to the remaining **4 stacks: Go, FastAPI, Django, Spring**, one at a time
with a default-bypass gate after each. These 4 are **generation-only** (no Go/Java
toolchain, heavy Python, Docker down): determinism is proven via the twice-identical
baselines + the domain-reuse diff + the **shared-SDL identity** — **not compiled or
booted** (honest per GUARDRAILS §4).

Backstop re-confirmed from clean: **`npm run build && npm run day20:regress` → PASS,
156 OK / 0 FAIL, 97 digests** (89 from Stage 1 + 8 new CLI/GraphQL baselines).

`[2 days]` scope is now **COMPLETE**: all **5 stacks × {CLI, GraphQL} = 10** baselines
(Express booted in Stage 1; these 4 generation-only) + Spring static-site+API.

---

## 1. The per-stack projection (each in the stack's idiom)

Every stack reuses its domain layer **byte-identically** and swaps only the HTTP
entrypoint + the entity route/controller layer:

| Stack | CLI (entrypoint + command layer) | GraphQL (endpoint + resolvers) | gated dep (GraphQL) |
|---|---|---|---|
| **Go** | `main.go` (stdlib `flag`/`os.Args`) + `internal/commands/register.go` + `<e>/commands.go` (`RunCommand`) | `main.go` + `internal/graphql/resolver.go` (graph-gophers, `UseFieldResolvers`) + `<e>/graphql.go` | `graph-gophers/graphql-go` (go.mod) |
| **FastAPI** | `app/cli.py` (stdlib `argparse`) + `app/commands.py` + `<e>/commands.py` | `app/main.py` (ariadne ASGI) + `app/resolvers.py` + `<e>/graphql.py` | `ariadne` (requirements) |
| **Django** | a **management command** per entity (`python manage.py <e> <op>`) — idiomatic, no dep | `graphql_app.py` (ariadne view) + `config/urls.py` `/graphql` + `<e>/graphql.py` | `ariadne` (requirements) |
| **Spring** | `CliRunner` (`CommandLineRunner`) + `EntityCommand` + `<Name>Command` (`@Component`) | `<Name>GraphqlController` (`@QueryMapping`/`@MutationMapping`) + `schema.graphqls` | `spring-boot-starter-graphql` (pom) |

**CLI** = an arg-parse entrypoint + a command→handler table + per-entity CRUD commands
calling the domain, run-to-exit — **stdlib arg-parse everywhere, no dependency**.
**GraphQL** = one endpoint + resolvers wired to the **SHARED** `schema.graphql` (the SDL
is byte-identical across all 5 stacks — one core builder) + a per-entity resolver slice.
Where the domain can't be reached from a different package/security context, the
projection reuses the **repository + Dto** directly (Go's exported `Graphql*` funcs kept
in-package for `toEntity`; Spring's `@Controller` over the repository, like the Day-34
listener) — never the request-scoped service.

---

## 2. The determinism proofs

### 2.1 DEFAULT = LITERAL BYPASS after every stack
`npm run day20:regress` stayed **byte-identical (89 baked + non-hash gates)** after Go,
after FastAPI, after Django, and after Spring — no fixture uses CLI/GraphQL for these
stacks, so the gated branches move **no frozen hash**. A moved hash would have been a
finding; none moved.

### 2.2 New twice-identical baselines (PART 1r pass 2, additive) — 8 new
Recorded in [`day20-regression.ts`](../../generator/src/day20-regression.ts):

| Stack | CLI | GraphQL API |
|---|---|---|
| **Go** | `a669810613246f9c…` | `a6e71d7388435dd7…` |
| **FastAPI** | `9a70ea43242a6bf5…` | `26926a766ee4ef89…` |
| **Django** | `0e0fed5d91b8bef5…` | `8c99bbcc423e13c8…` |
| **Spring Boot** | `7bab6b86018985a9…` | `d99f0e852779955c…` |

Total CLI/GraphQL baselines now **10** (Express `553b797e…`/`5b3cd7ec…` from Stage 1 + these 8).

### 2.3 DOMAIN-REUSE + SHARED-SDL (asserted in PART 1r pass 2)
- **Domain-reuse per stack×type:** diffing the projection against its **api-only twin** —
  every shared file byte-identical except the legit-rewritten shell files (entrypoint /
  manifest / package-manifest / README / urls); the **removed** set contains the HTTP
  route/controller marker (Go `handler_base.go`, FastAPI `router_base.py`, Django
  `views_base.py`, Spring `*ControllerBase.java`); the **added** set is the CLI command /
  GraphQL resolver layer. The domain (models/repos/dto/serializers/service-base/migrations)
  is byte-identical.
- **Shared-SDL identity:** the GraphQL `schema.graphql` is **byte-identical across all 5
  stacks** (Go/FastAPI/Django/Spring/Express), from the ONE `core/graphql-sdl.ts` builder —
  asserted directly. The ordering is the shared deterministic rule proven in Stage 1
  (sorted by name, never iteration order); no stack re-derives it.

---

## 3. Verification levels (honest, per §4)

| Claim | Level |
|---|---|
| Existing types byte-identical after every stack | **Proven** — 156 OK / 0 FAIL from clean |
| Go/FastAPI/Django/Spring CLI + GraphQL twice-identical baselines | **Proven** — recorded, re-derived each run |
| Domain reused unchanged (== api-only twin) | **Proven** — asserted in PART 1r pass 2 |
| GraphQL SDL identical across all stacks (one core builder) | **Proven** — asserted |
| Express CLI runs to exit / GraphQL query + mutation resolve | **Booted** (Stage 1) — the reference lifecycle |
| Go / FastAPI / Django / Spring CLI + GraphQL runtime | **Generation-only** — no toolchain to compile/boot here; reasoned from Express + each stack's CRUD patterns |

**Determinism ≠ validity:** generation + the SDL are deterministic and the domain-reuse
is mechanically proven; the 4 new stacks' *runtime* correctness is reasoned, not run.
Two honest runtime caveats carried forward: the GraphQL **custom scalars** (`DateTime`,
`Decimal`) may need a per-runtime scalar registration; the Spring CLI **runs alongside the
web server** unless `spring.main.web-application-type=none` is set (both noted in the
generated READMEs).

---

## 4. Invariants (all confirmed)

- **Generator pure-Node, `deps {}`, 0 native modules** — verified: `dependencies: {}`;
  **no `graph-gophers` / `ariadne` / `graphql-java` / `spring-boot-starter-graphql` /
  `graphql` / `picocli` anywhere in the generator's `package.json`**. Every arg-parse is
  **stdlib** (Go `flag`, Python `argparse`, Django management command, Spring
  `CommandLineRunner`); every GraphQL runtime is a **gated GENERATED-PROJECT dep**
  (go.mod / requirements.txt / pom.xml), gated on the type.
- **No frozen hash moved** — existing types are a literal bypass (§2.1).
- **The domain layer is reused unchanged per stack** (§2.3) — entrypoint/route-controller
  swap only; no CLI/GraphQL required a domain-file change (that would have been a finding).
- **New baselines additive** — 97 digests = 89 + 8; nothing replaced.

---

## 5. Completed `[2 days]` status + forward

- **Express** (Stage 1): CLI + GraphQL — **done + booted**; static-site+API — **done, gen-only**.
- **Go / FastAPI / Django / Spring** (pass 2): CLI + GraphQL — **done, generation-only**
  (baselines + domain-reuse + shared-SDL proven; not compiled/booted).
- **All 5 stacks × {CLI, GraphQL} = 10 baselines + Spring static-site+API** — Day-36 scope **complete**.
- **The static-site+API limitation (carried):** only Spring scaffolds a frontend, so
  static-site+API stays Spring-centric; the frontendless stacks have no UI to render statically.
- **Day 38 picks up:** CI/CD pipeline generation (per stack/provider; pinned action +
  runtime versions from the blueprint; deterministic, hashed artifacts).
- **Invariant to carry:** any GraphQL/CLI/arg-parse library stays a generated-project dep,
  gated on the type — never Thraksha core (`deps {}` stays).

---

*Day 36 pass 2 extended CLI + GraphQL to Go, FastAPI, Django, and Spring as deterministic
entrypoint/route-table projections that reuse each stack's domain layer byte-identically
(proven vs the api-only twin) and swap only the HTTP entrypoint + route/controller layer —
a stdlib arg-parse CLI (Go `flag`, Python `argparse`, Django management command, Spring
`CommandLineRunner`) with a command→handler table, and a GraphQL endpoint wired to the
SHARED deterministic `schema.graphql` (byte-identical across all 5 stacks from the one
`core/graphql-sdl.ts` builder) with per-stack resolvers (graph-gophers / ariadne /
spring-graphql). The default stayed byte-identical after every stack (no frozen hash
moved); 8 new twice-identical additive baselines bring the CLI/GraphQL total to 10 (5
stacks × 2 types), with Express (Stage 1) the booted reference and these 4 generation-only
(no toolchain; honest per §4). Every arg-parse is stdlib; every GraphQL runtime is a gated
generated-project dependency — Thraksha core stays deps {} with 0 native modules; no AI, no
frozen hash moved. Day 38 picks up CI/CD pipeline generation.*
