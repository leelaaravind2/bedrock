# Eco-Day 50 — PLAN: The Map's flow map + the Phase-4 MID-BENCHMARK

**Phase 4, Day 50. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 50 has **two parts**:

1. **The flow map** — the Map's second half: a **request-lifecycle / routes / data-flow** visualization
   that is a **DIRECT PROJECTION of the DECLARED blueprint** (entities, relationships, integrations),
   **NOT parsed/inferred from generated code**. Traceability is **free + exact** because generation is
   deterministic — every declared node maps to a **known output artifact set** (the same `buildFileSet`
   basis the impact map uses). Machine-readable + human-renderable; **READ-ONLY** (0 generation-path
   refs), sitting in `map/` beside `impact-map.ts`.
2. **The Phase-4 mid-benchmark** — a **composition-only** driver (like `bench:phase1/2/3`) proving the
   Phase-4 stack **coheres as one**: export standalone (Law 21, Day 41) + deterministic Semgrep scan
   (CERTAIN, Day 43) + optional AI advisory scan (ADVISORY/detachable, Day 45) + impact-map preview
   (exact, Day 47) + the flow map (Day 50), composed on **one** project, each at its **proven/honest
   level**. **NOT a new feature** — it exercises existing surfaces (like Day 30/40, but MID-phase).

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1
no baseline moves silently; §3 **STOP-and-report** — *don't claim a traceability that isn't a faithful
projection of the model*; §4 honesty — *the flow map is a projection, exact not inferred; provable HERE,
any live UI renderer deferred*) → [`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md) Day 50 (the flow
map = the declared blueprint projected into request-lifecycle/routes/data-flow; the mid-benchmark = the
Phase-4 stack together) + Days 52/55/58/60 (the Phase-4 close — Fable-5 hardening, signing, final
regression, release — **out of scope here**) → [`eco-day-47-report.md`](eco-day-47-report.md) (the
read-only `map/` precedent — `previewImpact`, PART 1w, 0 generation-path refs, the previewed==real
anchor to MIRROR for the flow map's traceability anchor) → [`eco-day-41-report.md`](eco-day-41-report.md)
+ [`eco-day-43-report.md`](eco-day-43-report.md) + [`eco-day-45-report.md`](eco-day-45-report.md) (the
mid-benchmark's ingredients + their **honest levels**) → the REAL code:
[`core/project-model.ts`](../../generator/src/core/project-model.ts) (**the projection SOURCE** — what
the model declares: entities/fields/relationships/integrations/settings),
[`map/impact-map.ts`](../../generator/src/map/impact-map.ts) (the read-only precedent the flow map sits
beside), [`phase3-benchmark.ts`](../../generator/src/phase3-benchmark.ts) (the composition-only
benchmark pattern to mirror), [`core/integrations.ts`](../../generator/src/core/integrations.ts) (the
integration intent the flow map projects into edges).

**Git (for execute):** commit to `main`, no branches, no PRs.

---

## 0. Grounded this session — resolved by reading the REAL code

- **What the blueprint DECLARES (the projection source)** — [`project-model.ts`](../../generator/src/core/project-model.ts):
  - **Phase-A settings:** `projectName`, `projectType` (Web App / API-only / Cron Worker / Queue
    Consumer / CLI / GraphQL API / Static Site + API), `backend`, `frontend`, `database`, `multiUser`,
    `auth`.
  - **Entities** (`getEntities()`): `{ name, fields[{name,type,required,unique,…}], relationships[] }`.
  - **Relationships** (`Relationship`): `{ kind: 'belongs-to' | 'has-many', target, required }` —
    `belongs-to` owns the FK to `target`; `has-many` is the inverse view. **This is the data-flow /
    entity-graph edge source.**
  - **Integrations** (`getIntegrations()`): `{ email: 'none'|'smtp', ai: 'none'|'hook' }` — the
    **integration edge** source (a mailer the app calls / an AI hook the app exposes; ADR-001 — the
    generated APP calls them, never Thraksha).
  - Plus `cicd`, `security`, `versions`, `slots`, `designTokens`, `description`.
- **Routes are NOT explicitly declared — they are CONVENTION over entities.** Every entity implies a
  known CRUD route set (`GET/POST /api/<entities>`, `GET/PUT/DELETE /api/<entities>/:id`) and a
  known lifecycle chain (**Route → Controller → Service/Domain → Repository → Table**). The Day-47
  developer-file probe confirmed the Express entity emits exactly these layers: `*.routes[.base].js`,
  `*.controller.base.js`, `*.service.js`, `*.repository.js`, `*.model.js`, `migrations/V*__create_*.sql`.
  So the flow map projects the lifecycle from the **declared entity** (a known implied set), **not** by
  parsing generated code. `has-many` adds a known parent-side collection accessor
  (`GET /api/<parents>/:id/<children>`) — a declared-relationship projection (Day-25 basis).
- **`map/impact-map.ts` is the read-only precedent.** It reads generation (`buildFileSet`) and is never
  imported by it (0 generation-path refs); it emits no `GeneratedFile`; it is pure-Node with the
  line-diff isolated (`deps {}`). The flow map sits **beside** it and follows the SAME discipline — but
  the flow-map CORE reads only the **model** (`getState`/`getEntities`/`getIntegrations`), so it needs
  even less: no `buildFileSet` call in the core (only the traceability ANCHOR touches `buildFileSet`).
- **The benchmark pattern** — [`phase3-benchmark.ts`](../../generator/src/phase3-benchmark.ts): a
  `check(ok,label)` collector, `PASS/FAIL (n/m)`, **exit 1 on any divergence** (a FINDING), on-demand
  `npm run bench:phaseN`. It composes existing surfaces and **bakes no digest into the frozen backstop**.
  The mid-benchmark mirrors this exactly (`bench:phase4-mid`).
- **`deps {}` stays.** The flow map is a pure-Node projection (nodes + edges as plain objects; a
  text/adjacency render). **No graph/viz library** as a Thraksha core dep (any live graphical renderer
  is a deferred UI concern, exactly like the impact map's wizard front-end).

---

## 1. PART 1 — the flow map: a projection of the DECLARED model

### 1.1 The core (`map/flow-map.ts`, beside `impact-map.ts`)
`buildFlowMap(model): FlowMap` — a **pure projection of the declared model** (no `buildFileSet` in the
core, no parsing of generated code). Shape:

```ts
export type FlowNodeKind = 'app' | 'entity' | 'route' | 'controller' | 'service' | 'repository' | 'table' | 'integration';
export interface FlowNode { id: string; kind: FlowNodeKind; label: string; entity?: string; }
export type FlowEdgeKind = 'lifecycle' | 'relationship' | 'integration'; // request-lifecycle | entity graph | integration
export interface FlowEdge { from: string; to: string; kind: FlowEdgeKind; label?: string; }
export interface FlowMap { nodes: FlowNode[]; edges: FlowEdge[]; }
export function buildFlowMap(model: ProjectModel): FlowMap;
export function renderFlowMap(map: FlowMap): string; // human text (indented tree / adjacency) — NO viz lib
```

Projection rules (all from the DECLARED model, sorted for determinism):
- **Per entity:** a `route → controller → service → repository → table` **lifecycle** chain (nodes +
  `lifecycle` edges) — the universal request lifecycle every stack generates. The route node carries
  the known CRUD set + (for a `has-many` parent) the collection accessor.
- **Relationship edges** (`relationship`, the data-flow / entity graph): one edge per declared
  `belongs-to`/`has-many`, `from`→`to` by `target`, labelled with the kind (and FK direction).
- **Integration edges** (`integration`): from the `app` node to an `integration` node for each ACTIVE
  integration (`email: 'smtp'`, `ai: 'hook'`); **none declared ⇒ no integration node/edge** (the literal
  bypass — an empty-integrations project's flow map has zero integration edges).
- **The `app` root** carries `projectType`/`backend`/`frontend`/`database`/`auth`/`multiUser` context.

Machine-readable (`FlowMap` object) + `renderFlowMap` (human text). **READ-ONLY** — returns an object,
emits no `GeneratedFile`.

### 1.2 A CLI + honest UI stance
- **CLI** `flow-map.ts` (`npm run flow-map [--backend <name>]`) — print the flow map for a
  representative model (mirrors `map.ts`/`export.ts`). Read-only.
- **Optional additive server route** `POST /api/flow` (like `/api/impact`) returning the `FlowMap`
  JSON — **additive**, existing routes unchanged. **In scope only if trivial; the live graphical
  renderer (a drawn diagram in the wizard) is DEFERRED/HONEST** (exactly as the impact map's
  interactive front-end was deferred — the projection + traceability are the provable heart).

---

## 2. PART 1 — the flow map's determinism + traceability proof (a new PART, CI-enforced)

The flow map's load-bearing property is **faithful, exact traceability** — the analogue of the impact
map's previewed==real. Two proofs, added to `day20-regression.ts` as **PART 1x** (CI-enforced, 3 OSes):

- **(A) DETERMINISM — same model → same flow map.** `buildFlowMap(model)` twice → **byte-identical**
  serialization (a pure projection of the declared model; sorted nodes/edges — no map/set iteration
  order leaks). A gate that can FAIL.
- **(B) FAITHFUL PROJECTION (structural) — the map reflects the DECLARED model exactly, not inference.**
  The `FlowMap`'s nodes/edges correspond **one-to-one** to the model: entity nodes == the declared
  entities; each `relationship` edge == a declared relationship (correct `kind` + `target`); integration
  edges present **iff** the integration is active; **no phantom node/edge** (nothing in the map that the
  model didn't declare) and **no missing node** (every declared entity/relationship/active-integration
  is present). This proves it is a projection of the DECLARED blueprint, not parsed from output.
- **(C) TRACEABILITY ANCHOR (load-bearing) — every declared node → a KNOWN, REAL output artifact set.**
  The flow-map analogue of "previewed==real": for a concrete stack (**Express — the booted stack**),
  assert that each entity node's expected lifecycle artifacts **EXIST** in `buildFileSet(model)` output
  (SOUNDNESS — no node maps to a non-generated artifact) **and** that every entity-scoped generated file
  is attributed to exactly one entity node (COVERAGE — the map accounts for the real deterministic
  output; nothing generated is untraceable). This ties the logical projection to REAL generation output
  and is **EXACT because generation is deterministic** (the same declared node always yields the same
  artifact set). The other 4 stacks are **reasoned/staged (generation-only, honest)** — the lifecycle
  chain is universal; only the concrete file names differ (per prior-day precedent: Express booted,
  others generation-only).

> **Honest note on the anchor's granularity:** the artifact attribution is by **entity name on the
> relPath** (neutral string-matching, like `impact-map` sorting relPaths — no per-stack logic in
> `map/`). The universal lifecycle chain is asserted to EXIST for Express (where the file names are
> known); it is NOT claimed that `map/` knows each stack's per-layer filename (that lives in plugins).
> Soundness+coverage at entity granularity + lifecycle-existence for Express is the faithful, provable
> claim — no overclaim.

---

## 3. PART 1 — read-only / default bypass (the flow map moves no hash)

- **0 generation-path refs into `map/flow-map.ts`** (grep-proven): `buildFileSet`, the plugins, and
  `classify`/`applyPlan` do **not** import it. The flow-map core reads only the **model**; the
  traceability anchor (in the regression) calls `buildFileSet` — one-way, read-only.
- **Emits nothing into the generated set** — `buildFlowMap` returns a `FlowMap` object, never a
  `GeneratedFile`. PART 1x asserts `buildFileSet` output is byte-identical before/after building a flow
  map (like PART 1w check E).
- **Adds no baked digest** — PART 1x asserts structural/existence equalities, not new frozen baselines
  (like PART 1w/1v). The **103 baked + 10 TeamTracker + non-hash reproduce byte-identical**.
- **A moved frozen hash = FINDING, STOP** (§1.1/§3) — never a re-baseline.

---

## 4. PART 2 — the Phase-4 mid-benchmark (composition-only)

`phase4-mid-benchmark.ts` + `"bench:phase4-mid": "node dist/phase4-mid-benchmark.js"` (mirrors
`phase3-benchmark.ts`): composes the Phase-4 stack on **one** project, each at its **proven/honest
level**, `exit 1` on any divergence (a FINDING, not a certification — this is MID-phase).

- **M1 — export standalone (Law 21, Day 41):** `exportProject`/`buildFileSet` == disk byte-identity +
  **0 functional Thraksha refs** (dependency manifests clean, no Thraksha import/require). **Provable
  HERE.**
- **M2 — deterministic Semgrep scan (CERTAIN, Day 43):** `security: { scan: 'semgrep' }` → the pinned
  `security.yml` + `semgrep-rules.yml` twice-identical == the Day-43 baseline (`8407fa2c…`); the wiring
  is deterministic + read-only + separate from `ci.yml`. **The actual Semgrep RUN is
  honest-manual/deferred** (Windows — Semgrep's native core; runs in the generated CI on ubuntu).
- **M3 — optional AI advisory scan (ADVISORY/detachable, Day 45):** the pure scan-core over a **FAKE**
  suggester → deterministic ADVISORY findings (`class:'advisory'`, never the gate); **default-off
  structurally** (no key ⇒ no call site); **delete-the-key ⇒ the deterministic scan + export still
  run.** The **live AI call is deferred** (no developer key).
- **M4 — impact-map preview (exact, Day 47):** `previewImpact` on a representative change → the changed
  set matches a brute-force content compare (a composition check; the full byte-for-byte previewed==real
  is **cited from PART 1w**, CI-enforced).
- **M5 — flow map (Day 50):** `buildFlowMap(model)` faithful projection (nodes/edges == the declared
  model) + the traceability anchor (each entity node's lifecycle artifacts EXIST in the SAME project's
  `buildFileSet` output).
- **M6 — composition coherence / read-only overlay:** all five surfaces run on the **SAME one project**,
  each read-only; the project's `buildFileSet` is **byte-identical whether or not** any of
  export/scan/ai-scan/impact/flow ran — the whole Phase-4 stack is a **read-only overlay** on
  deterministic generation (the thesis: generation is untouched; everything else reads it).

**NOT a new feature; bakes no digest** — the only new artifacts this day are `map/flow-map.ts` (+ its
CLI/route) and the benchmark driver. `PASS (n/m)` on-demand; a divergence is a FINDING → exit 1.

---

## 5. Execute done-conditions

1. **The flow map core** (`map/flow-map.ts`): `buildFlowMap(model)` → a machine-readable `FlowMap`
   (nodes + edges: per-entity lifecycle chain, relationship edges, integration edges) + `renderFlowMap`.
   A **projection of the DECLARED model** (reads the model, not generated code). Read-only. + a
   `flow-map.ts` CLI (`npm run flow-map`).
2. **The determinism + traceability proof** (PART 1x, CI-enforced): (A) same model → same flow map
   (twice-identical); (B) faithful projection (nodes/edges == the declared model, no phantom/missing);
   (C) the **traceability anchor** — every entity node → its lifecycle artifacts EXIST in
   `buildFileSet(model)` (Express, soundness + coverage), exact because generation is deterministic.
3. **Read-only / default bypass:** `rm -rf dist && npm run build && npm run day20:regress` → PASS, the
   full backstop byte-identical (**103 baked + 10 + non-hash**); **0 generation-path refs** into
   `map/flow-map.ts`; the flow map emits nothing. A moved hash = finding, STOP.
4. **The Phase-4 mid-benchmark** (`phase4-mid-benchmark.ts` + `bench:phase4-mid`): M1 export standalone
   + M2 deterministic scan + M3 AI advisory (detachable) + M4 impact-map + M5 flow-map + M6 composition
   coherence, on **one** project, each at its honest level → `PASS`.
5. **Invariants:** generator pure-Node (`deps {}`, 0 native — the flow map is a pure-Node projection,
   **no graph/viz library**); no frozen hash moved; the flow map + mid-benchmark **read, never write**
   generation.

> **STOP and report rather than write a clean-looking close if a proof fails.** If the flow map is not
> a faithful projection of the model (a phantom/missing node, or a claimed artifact that isn't
> generated), that is a FINDING — do NOT claim a traceability that isn't exact. If any frozen hash
> moves, STOP — the flow map must be read-only.

---

## 6. Report done-conditions (`eco-day-50-report.md`)

- **The flow map core:** the declared-model projection (entities × lifecycle layers + relationship
  edges + integration edges) + the machine-readable/renderable shape; sits in `map/` beside
  `impact-map.ts`.
- **The determinism + traceability proof:** same model → same map; faithful projection (== the declared
  model); the traceability anchor (every declared entity node → its known lifecycle artifacts EXIST in
  `buildFileSet`, exact because deterministic) — the new **PART 1x**, CI-enforced; honest granularity
  (entity-level attribution + Express lifecycle existence; other stacks reasoned/staged).
- **The read-only / default-bypass proof:** 0 generation-path refs; backstop byte-identical.
- **THE MID-BENCHMARK:** the Phase-4 stack composed (export + scan + ai-scan + impact-map + flow-map),
  each at its honest level; the result (`PASS n/m`).
- **Invariants:** `deps {}` stays; no graph/viz lib; no frozen hash moved.
- **Forward-flags:** the flow map's honest level (projection + traceability **exact**; any live
  graphical UI renderer **deferred/honest**); the mid-benchmark result; **what the Phase-4 close /
  Days 51–60 pick up** — the **Fable-5 hardening pass** over Thraksha's own code (Day 52), **code
  signing + notarization** (Day 55), the **final full-system regression** (Day 58), and the **release**
  (Day 60).

---

## 7. SCOPE GUARD — what this day is NOT

- **Only the flow map + the mid-benchmark.** NOT the Phase-4 close; NOT signing (Days 51–60).
- **The flow map is a PROJECTION of the DECLARED MODEL** — entities/relationships/integrations — **not
  parsed/inferred from generated code** (that would be inference, not traceability).
- **READ-ONLY** — the flow map + mid-benchmark never change generation. A moved frozen hash = **finding,
  STOP** (not a re-baseline).
- **The mid-benchmark is COMPOSITION-ONLY** — no generation change; the only new artifacts are the
  flow-map core (+ CLI/route) and the benchmark driver. It exercises existing surfaces, each at its
  proven/honest level.
- **No graph/viz library as a Thraksha core dep** — `deps {}` stays; pure-Node projection + text render.
- **Traceability is EXACT because generation is deterministic** (every declared node → a known artifact
  set); the flow-map core + traceability proof + mid-benchmark are provable HERE; **any live graphical
  renderer is honest/deferred.**

---

*Day 50 plans the Map's second half + the Phase-4 mid-benchmark. The flow map (`map/flow-map.ts`, beside
the read-only `impact-map.ts`) is a PURE PROJECTION of the DECLARED blueprint — `buildFlowMap(model)`
reads the model's entities/relationships/integrations (never parses generated code) and projects a
request-lifecycle / data-flow map: per-entity `route→controller→service→repository→table` lifecycle
chains, `belongs-to`/`has-many` relationship edges (the entity graph), and integration edges for active
`email`/`ai` (none declared ⇒ no edge, the literal bypass) — machine-readable (`FlowMap` nodes+edges) +
a text render (NO viz library, `deps {}` stays). Its load-bearing property is faithful, EXACT
traceability (the flow-map analogue of the impact map's previewed==real): PART 1x proves (A) same model
→ same map (deterministic), (B) the map reflects the DECLARED model one-to-one (no phantom/missing node
— a projection, not inference), and (C) the traceability anchor — every declared entity node's lifecycle
artifacts EXIST in `buildFileSet(model)` output (Express, soundness + coverage), exact because
generation is deterministic. The flow map is READ-ONLY: 0 generation-path refs, emits no
`GeneratedFile`, moves no frozen hash (103 baked + 10 + non-hash byte-identical). The Phase-4
mid-benchmark (`phase4-mid-benchmark.ts` + `bench:phase4-mid`, mirroring `bench:phase3`) is
composition-only: export standalone (Law 21) + the deterministic Semgrep scan (CERTAIN, run deferred on
Windows) + the optional AI advisory scan (ADVISORY/detachable, live call deferred) + the impact-map
preview (exact, byte-for-byte cited from PART 1w) + the flow map, composed on ONE project, each at its
proven/honest level, plus a read-only-overlay coherence check (buildFileSet byte-identical whether or
not any Phase-4 surface ran) — exit 1 on any divergence (a FINDING, mid-phase, not a certification).
Generator pure-Node `deps {}` + 0 native (no graph/viz lib); the flow map + mid-benchmark read, never
write generation; no frozen hash moved. The flow-map core + traceability proof + mid-benchmark are
provable HERE; any live graphical UI renderer is honest/deferred. The Phase-4 close (Days 52–60) picks
up the Fable-5 hardening pass, code signing + notarization, the final full-system regression, and the
release.*
