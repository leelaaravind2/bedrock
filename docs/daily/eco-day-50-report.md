# Eco-Day 50 — REPORT: The Map's flow map + the Phase-4 MID-BENCHMARK

**Phase 4, Day 50 — the LAST feature day before the release stretch (Days 51–60).** Two parts:

1. **The flow map** — the Map's second half: `buildFlowMap(model)` projects the **DECLARED** blueprint
   (entities + relationships + integrations) into a request-lifecycle / data-flow map — **NOT parsed
   from generated code** (parsing would be inference; this is traceability). Traceability is **free +
   exact** because generation is deterministic: every declared node maps to a **known output artifact
   set**. **READ-ONLY**: it reads **only the model** (even less than the impact map — never
   `buildFileSet`), emits nothing, moves **no frozen hash**.
2. **The Phase-4 mid-benchmark** — a **composition-only** driver proving the Phase-4 stack coheres on
   **one** project: export (Law 21) + deterministic Semgrep scan (CERTAIN) + AI advisory scan
   (ADVISORY/detachable) + impact-map preview (exact) + flow map, each at its **proven/honest level**.

Backstop re-confirmed from clean: **`rm -rf dist && npm run build && npm run day20:regress` → PASS,
194 OK / 0 FAIL, 103 baked digests (unchanged), MAXIMAL `366e19d9…` unchanged — no frozen hash
moved.** `deps {}`, 0 native. **`npm run bench:phase4-mid` → PASS (6/6).**

---

## 1. The flow map core (`map/flow-map.ts`, beside `impact-map.ts`) — DC-1

[`map/flow-map.ts`](../../generator/src/map/flow-map.ts) (pure-Node, no deps):
- **`buildFlowMap(model): FlowMap`** — a **pure projection of the DECLARED model**. It reads only
  `getPhaseASettings` / `getEntities` / `getIntegrations` — **never `buildFileSet`, never generated
  output**. Projects:
  - an **`app`** root node carrying `projectType`/`backend`/`frontend`/`database`/`auth`/`multiUser`;
  - per entity, the universal request-**lifecycle** chain `route → controller → service → repository →
    model → table` (nodes + `lifecycle` edges) — the KNOWN convention every entity implies (the route
    node carries the CRUD set; `has-many` adds the parent-side collection accessor), projected from the
    **declared entity**, not parsed;
  - **`relationship`** edges (the entity graph): one per declared `belongs-to`/`has-many`, labelled with
    the kind + FK direction;
  - **`integration`** edges: `app →` an active `email`/`ai` integration; **none declared ⇒ no
    node/edge** (the literal bypass).
- **`renderFlowMap(map)`** — a human text tree/adjacency (per-entity lifecycle, the entity graph, the
  integrations). **NO graph/viz library** — pure text.
- **CLI** [`flow-map.ts`](../../generator/src/flow-map.ts) (`npm run flow-map [--backend <name>]`) —
  prints the map for a representative two-entity + relationship + integration model. Read-only.

Sample (`npm run flow-map`): `Team`/`Ticket` each show the full lifecycle chain, the
`⇄ has-many/belongs-to` entity-graph edges, and the `email (smtp)` integration edge — `16 nodes,
17 edges`, "a projection of the declared blueprint; nothing generated".

---

## 2. The traceability anchor (PART 1x, CI-enforced) — DC-2 (load-bearing)

Added to [`day20-regression.ts`](../../generator/src/day20-regression.ts) as **PART 1x** (5 checks,
CI-enforced on 3 OSes via `determinism.yml`). This is the flow-map analogue of the impact map's
previewed==real — the projection is proven **faithful + exact**:

- **(A) DETERMINISTIC** — `buildFlowMap(model)` twice → **byte-identical** `FlowMap` (a pure projection;
  entities in declared order, relationships sorted — no iteration-order leak).
- **(B) FAITHFUL PROJECTION** — nodes/edges are **one-to-one with the DECLARED model**: entity nodes ==
  declared entities; each declared relationship → exactly one matching edge (correct `from`/`to`/kind);
  integration edges present **iff** active; every entity has all 6 lifecycle nodes + the `app→entity`
  edge; and **NO phantom node** (every node id resolves to a declared source: `app` / a declared entity
  / a lifecycle layer of a declared entity / an active integration). Plus the **integration literal
  bypass**: no integrations declared → **zero** integration nodes/edges.
- **(C) THE TRACEABILITY ANCHOR (node → real artifact)** — for **Express** (concrete): every entity
  node's lifecycle artifacts **EXIST** in `buildFileSet(model)` output (SOUNDNESS — routes/controller/
  service/repository/model + a `migrations/…create_<entity>s` table for each entity), **and** every
  entity dir under `src/entities/` is a **declared** entity (COVERAGE — nothing generated is
  untraceable). Attribution is by **entity name on the relPath** — neutral, **no per-stack filename
  logic in `map/`**. This ties the logical projection to REAL deterministic output and is **exact
  because generation is deterministic**.
- **(D) READ-ONLY** — building a flow map leaves `buildFileSet` output **byte-identical** before/after.

**Honest granularity (§4):** the anchor is **concrete for Express** (where the file names are known);
the universal lifecycle is asserted to exist there. The other 4 stacks are **reasoned/staged**
(generation-only) — the lifecycle chain is universal; only concrete file names differ (the prior-day
precedent: Express booted, others generation-only). No claim that `map/` knows each stack's per-layer
filename (that lives in plugins). Soundness+coverage at entity granularity + Express lifecycle-existence
is the faithful, provable claim — no overclaim.

---

## 3. Read-only / default bypass — DC-4 (load-bearing)

- **0 generation-path refs into `map/flow-map.ts`** (grep-proven): `core/regen.ts`, the plugins, and
  `classify`/`applyPlan` do **not** import it. It is imported **only** by the proof
  (`day20-regression.ts`), the CLI (`flow-map.ts`), and the mid-benchmark (`phase4-mid-benchmark.ts`).
- **Reads even less than the impact map** — `flow-map.ts` imports **only** the `ProjectModel`/`Entity`
  **types** (`import type … from '../core/project-model.js'`); it never calls `buildFileSet`. The
  generation path never imports it — the direction is one-way, read-only.
- **Emits nothing** — `buildFlowMap` returns a `FlowMap` object, never a `GeneratedFile`. PART 1x check
  (D) asserts `buildFileSet` byte-identical before/after.
- **Adds no baked digest** — PART 1x asserts structural/existence equalities (like PART 1w/1v). The
  **103 baked + 10 TeamTracker + non-hash reproduce byte-identical**. **No frozen hash moved.**

---

## 4. The Phase-4 mid-benchmark — DC-3

[`phase4-mid-benchmark.ts`](../../generator/src/phase4-mid-benchmark.ts) +
`"bench:phase4-mid"` (mirrors `bench:phase3`): composition-only, on **one** two-entity Express project,
exit 1 on any divergence (a FINDING — this is MID-phase, not a certification). **→ PASS (6/6):**

| Check | Surface | Honest level |
|---|---|---|
| **M1** | export standalone (Law 21, Day 41) | exported tree == `buildFileSet` byte-for-byte (disk round-trip) + `package.json` Thraksha-free + 0 functional imports — **proven HERE** |
| **M2** | deterministic Semgrep scan (CERTAIN, Day 43) | the 2 pinned artifacts added + twice-identical + pinned (version/actions/rules); the Day-43 baseline `8407fa2c…` **intact**; artifacts project-independent — **the Semgrep RUN honest-manual/deferred (Windows)** |
| **M3** | AI advisory scan (ADVISORY/detachable, Day 45) | FAKE suggester → deterministic ADVISORY (`class:'advisory'`, never the gate); **no key ⇒ NO call** (default-off); **delete-key ⇒ export/scan still run** — **live AI call deferred** |
| **M4** | impact-map preview (exact, Day 47) | `previewImpact` (add a Label entity) add/change == a brute-force content compare (`+9 ~1`); **byte-for-byte previewed==real cited from PART 1w** |
| **M5** | flow map (Day 50) | faithful projection (entity nodes == declared; relationship edges == declared) + every entity node's artifacts exist in the SAME project's `buildFileSet` |
| **M6** | coherence (read-only overlay) | `buildFileSet(base)` **byte-identical** after export + scan + ai-scan + impact-map + flow-map all ran — the whole Phase-4 stack is a **read-only overlay**; generation is untouched |

> **M2 caught a real mismatch first** (I initially compared the composed 2-entity project's whole-set
> hash to the DemoApp baseline — different projects, different hash). Fixed honestly: M2 now checks the
> **pinned artifacts** on the composed project (project-independent, pure from the config) **and**
> re-confirms the Day-43 baseline on DemoApp. A gate that can fail, reported and corrected (§3).

**Composition-only:** the only new artifacts this day are `map/flow-map.ts` (+ the CLI) and the
benchmark driver. It **bakes no digest** and exercises existing surfaces.

---

## 5. Invariants — DC-5

- **Generator pure-Node, `deps {}`, 0 native** — the flow map is a pure-Node projection (nodes/edges =
  plain objects; text render). **No graph/viz library** as a Thraksha dep.
- **The flow map + mid-benchmark read, never write generation** — 0 generation-path refs; the flow map
  reads only the model.
- **No AI anywhere in the flow map** (ADR-001) — a deterministic projection.
- **No frozen hash moved** — 103 baked + 10 + non-hash byte-identical from clean (194 OK / 0 FAIL).

---

## 6. Forward-flags

- **The flow map's honest level:** the projection + traceability are **exact**; the anchor is
  **concrete for Express**; the **other-stack anchor is reasoned/staged** (generation-only, honest) and
  **any live graphical renderer is deferred/honest** (the CLI + the machine-readable `FlowMap` are
  proven; a drawn diagram in the wizard is follow-up — exactly as the impact map's interactive
  front-end was deferred).
- **The mid-benchmark result:** **PASS (6/6)** — the Phase-4 stack coheres (export + scan + ai-scan +
  impact-map + flow-map), each at its honest level; the whole stack is a read-only overlay on
  deterministic generation.
- **The release stretch (Days 51–60) picks up:**
  - **Day 52 — the Fable-5 hardening pass over Thraksha's OWN code.** This is **ADVISORY-ONLY**, gated
    behind the deterministic scanners **+ the backstop**: run the deterministic gate FIRST (Semgrep +
    the full `day20:regress`), THEN Fable 5 **suggests** cross-file/architectural issues the scanners
    miss. **Leela reviews + applies each fix by hand; no suggestion lands that moves a frozen hash
    silently** (a moved hash = a FINDING, or a documented deliberate re-baseline — the Day-45 discipline
    applied to Thraksha's own code), scoped **one concern at a time**. A one-time dev-phase step, **not
    a product feature**.
  - **Day 55** — code signing + notarization (macOS Developer ID + Windows EV), automated in CI.
  - **Day 58** — the final full-system regression (the certification): all frozen baselines cross-OS,
    the signed sidecar path, export standalone, the Map's truthfulness, the security layers.
  - **Day 60** — release + the honest closing docs.

---

*Day 50 completes the Map and benchmarks the Phase-4 stack. The flow map (`map/flow-map.ts`, beside the
read-only `impact-map.ts`) is a PURE PROJECTION of the DECLARED blueprint — `buildFlowMap(model)` reads
only the model's entities/relationships/integrations (never `buildFileSet`, never generated code) and
projects a request-lifecycle / data-flow map: per-entity `route→controller→service→repository→model→
table` chains (the KNOWN convention every entity implies), `belongs-to`/`has-many` relationship edges
(the entity graph), and integration edges for active `email`/`ai` (none ⇒ no edge, the literal bypass)
— machine-readable (`FlowMap` nodes+edges) + a text render (NO viz library, `deps {}` stays). Its
load-bearing property is faithful, EXACT traceability (the flow-map analogue of the impact map's
previewed==real): PART 1x proves (A) same model → same map (deterministic), (B) the map is one-to-one
with the DECLARED model (every entity/relationship/active-integration → its node/edge; NO phantom node —
a projection, not inference), and (C) the traceability anchor — every entity node's lifecycle artifacts
EXIST in `buildFileSet(model)` (Express concrete, soundness + coverage; other stacks reasoned/staged),
exact because generation is deterministic. The flow map is READ-ONLY: 0 generation-path refs, reads only
the model, emits no `GeneratedFile`, moves no frozen hash (103 baked + 10 + non-hash byte-identical, 194
OK / 0 FAIL, MAXIMAL 366e19d9). The Phase-4 mid-benchmark (`phase4-mid-benchmark.ts` +
`bench:phase4-mid`, mirroring `bench:phase3`) is composition-only: export standalone (Law 21) + the
deterministic Semgrep scan (CERTAIN, artifacts pinned + the Day-43 baseline intact, the RUN deferred on
Windows) + the optional AI advisory scan (ADVISORY/detachable — default-off, delete-key-still-scans, the
live call deferred) + the impact-map preview (exact, byte-for-byte cited from PART 1w) + the flow map,
composed on ONE project, plus a read-only-overlay coherence check (buildFileSet byte-identical whether or
not any Phase-4 surface ran) — PASS (6/6). Generator pure-Node `deps {}` + 0 native (no graph/viz lib);
the flow map + mid-benchmark read, never write generation; no AI (ADR-001); no frozen hash moved. The
flow-map core + traceability anchor + mid-benchmark are provable HERE; the other-stack anchor + any live
graphical renderer are honest/deferred. The release stretch (Days 51–60) picks up the Fable-5 hardening
pass (ADVISORY-ONLY, gated behind the deterministic scanners + the backstop, hand-reviewed, no silent
hash move), code signing + notarization, the final full-system regression, and the release.*
