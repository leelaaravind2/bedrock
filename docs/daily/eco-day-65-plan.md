# Eco-Day 65 — PLAN: THE VISUAL MAP — the drawn diagram (deterministic layout)

**Day 65 — the sensation push (Days 61–70).** Days 61–64 rendered the engine's stdout verbatim. Day 65
introduces a **NEW ARTIFACT** — a **drawn diagram**: the certified flow map rendered as boxes-and-arrows
SVG in the Bedrock window. The "whoa" moment: a developer **SEES** their architecture, projected exactly
from their declaration. **The diagram is a RENDER of the certified projection — it never re-derives or
parses the architecture; and its determinism + faithfulness are PROVEN as a new harness PART.**

**This session is PLAN ONLY. No code, no builds.**

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. THE DECIDING READ — how the renderer gets the graph (resolved from real code)

- **`buildFlowMap(model)`** ([`map/flow-map.ts`](../../generator/src/map/flow-map.ts)) returns a
  **structured, machine-readable `FlowMap { nodes: FlowNode[], edges: FlowEdge[] }`** — stable ids (`app`,
  `entity:<Name>`, `route:<Name>`…`table:<Name>`, `integration:email|ai`), **already deterministic**
  (entities in declared order; relationships sorted by target then kind), and **proven by PART 1x**
  (deterministic + one-to-one with the declared model). `renderFlowMap` is *only a text renderer over this
  structure*.
- **The CLI (`flow-map.ts`) emits TEXT only** — `renderFlowMap(buildFlowMap(m))`. **No structured/JSON/SVG
  emit exists anywhere** (grep-confirmed).
- **The shell WebView cannot import `buildFlowMap`** (it's Node/generator-side; the WebView calls Tauri
  commands that spawn the sidecar). **Parsing the rendered TEXT to rebuild the graph is FORBIDDEN** (a
  re-derivation = a FINDING).

**→ The structured graph is deterministic and reachable in-engine, but reaching the shell requires the
sidecar to EMIT it. That is an ADDITIVE generator-directory change. There is no way to get the graph to
the drawing without one — so the day requires a FLAGGED, additive, literal-bypass generator addition.**

### The options (honest) + the recommendation

| Option | What | Verdict |
|---|---|---|
| (a) **Generator-side SVG projection** — a new pure `map/flow-svg.ts` (`renderFlowSvg(FlowMap) → string`) beside `renderFlowMap`, a new CLI driver, a new day20:regress PART, a new `flow_svg` command; the shell **displays** the certified SVG | **RECOMMENDED** — additive + literal-bypass; the determinism/faithfulness PART lives **in the harness** (the prompt's requirement); the layout+draw is a certified deterministic projection (like the text map) |
| (b) Shell-side SVG renderer consuming a generator-emitted `FlowMap` JSON | Still needs the **same** additive generator emit (the JSON), AND the determinism PART could **NOT** live in `day20:regress` (the renderer would be shell-side) — fails "a new PART in the harness" |
| (c) Parse the rendered text | **FORBIDDEN** (re-derivation — a FINDING) |
| (d) Defer | No visual Map — defeats the day |

**RECOMMENDED: option (a).** Some additive generator emit is **unavoidable** (b also needs it); (a) puts
the SVG-as-projection + its determinism PART **in the certified harness**, which is the strongest,
prompt-aligned design. **This is a FLAGGED, deliberate, additive change — NOT silent.** *The execute
session confirms it moves NO frozen hash before proceeding; if it did, STOP.*

---

## 1. THE ADDITIVE GENERATOR CHANGE (flagged, literal-bypass) — the SVG projection

**All ADDITIVE (new files / a new PART) + literal-bypass (no existing output changes):**

- **`generator/src/map/flow-svg.ts`** (NEW, pure, beside `map/flow-map.ts`): `renderFlowSvg(map: FlowMap):
  string` — a **hand-rolled SVG string** (NO viz library; `deps {}` stays). It reads ONLY the `FlowMap`
  (which is a projection of the declared model) — it **does NOT** re-derive the architecture or read
  generated code. It is the drawing analogue of the text `renderFlowMap`.
- **`generator/src/flow-svg.ts`** (NEW CLI driver, mirrors `flow-map.ts`): parses `--model` via the
  existing `readModelArg`, emits `renderFlowSvg(buildFlowMap(model))` to stdout. Additive — **no existing
  generator file is modified**, so the text map + every frozen output stay byte-identical by construction.
- **A new day20:regress PART (`PART 1y`)** — the visual-Map analogue of PART 1x (§4).
- **`desktop/src-tauri/src/commands.rs`**: a new thin invoker **`flow_svg`** (spawns `flow-svg.js`, returns
  `SidecarResult` — the SVG in stdout), mirroring `flow_map`; registered in `lib.rs` `generate_handler!`
  (additive; the self-test + existing invokers untouched).

**Why this moves no frozen hash:** the 103 baked digests are `buildFileSet` output; the flow-svg module +
CLI are **read-only projections** (never in the generation path, never imported by `buildFileSet`/plugins).
PART 1x tests `buildFlowMap` (untouched). No existing file changes ⇒ the backstop (103 + 10 + MAXIMAL
`366e19d9…`) is byte-identical. `sync-gen` copies the new dist files (the stamp tracks new files — like
Day 52's stamp move, NOT a generation-hash move).

---

## 2. THE DETERMINISTIC LAYOUT (load-bearing) — explicit order, integer grid, no drift

`renderFlowSvg` lays out the `FlowMap` deterministically:

- **Iteration order = the FlowMap's given order** (already deterministic: entities in declared order via
  `buildFlowMap`; lifecycle in `LIFECYCLE` order; edges in `buildFlowMap`'s sorted order; integrations
  email-then-ai). **No `Object`/`Map`/`Set` iteration into output** — iterate the ordered `nodes`/`edges`
  arrays. Where a lookup is needed, sort keys explicitly.
- **Layered/swimlane layout** (mirrors the text map): the `app` node at top; each **entity** a box in
  declared order down the left; its **lifecycle chain** (route→controller→service→repository→model→table)
  a horizontal row of small boxes to the right; **relationship** arrows between entity boxes (labelled
  belongs-to/has-many); **integration** boxes below with app→ arrows.
- **Integer grid coordinates ONLY — no floats, no drift.** All positions from integer arithmetic
  (`TOP + i*ROW`, `LEFT + k*STEP`, all integer constants). If any value could be fractional, apply **one
  stable rounding rule** (`Math.round`) — but prefer pure integers so none is needed. `viewBox` computed
  from integer counts.
- **No timestamps / ids / randomness / locale.** Labels come from the `FlowMap` (deterministic strings);
  numbers via `String(n)` (no `toLocaleString`); the only ids are the **stable FlowMap node/edge ids**
  (see §5). No `Date`, no `Math.random`, no `crypto`.

→ **Same blueprint → the same `FlowMap` → the same coordinates → byte-identical SVG bytes.**

---

## 3. THE DRAWN DIAGRAM (in the project view; the text map stays)

- The shell's **Project view** (Day 64) gains a **"View diagram"** action → `invoke('flow_svg', { model:
  JSON.stringify(buildBlueprintChoices(selections)) })` → the returned SVG string is **injected** into a
  diagram container (the shell **displays** the certified SVG; it does not lay out).
- **The TEXT map stays available** ("View flow map", Day 64) — it is certified + useful.
- Boxes = entities (+ a compact field/summary), labelled arrows = relationships (belongs-to / has-many),
  the lifecycle chain per entity — all from the declared `FlowMap`.
- **THIN DISPLAY:** the shell injects the sidecar's SVG string; **no JS layout, no JS re-derivation, no
  text-parsing.** (The SVG is trusted, certified engine output — not user HTML.)

---

## 4. THE NEW NON-HASH PART 1y (load-bearing) — mirrors PART 1x

Added to `day20-regression.ts` beside PART 1x — the visual-Map traceability anchor:

- **(A) DETERMINISTIC:** `renderFlowSvg(buildFlowMap(m))` **twice → byte-identical**; and **across a fresh
  process** (spawn `flow-svg.js --model <m>` twice, `cmp` identical) — no process-state / iteration-order /
  float / locale leak. (Mirrors PART 1x's `JSON.stringify(buildFlowMap)===` determinism check.)
- **(B) FAITHFUL (one-to-one with the DECLARED model):** parse the SVG's **`data-node-id`** attributes →
  the set **==** `buildFlowMap(m).nodes` ids; the **`data-edge`** (`data-from`/`data-to`/`data-kind`)
  attributes → **==** `buildFlowMap(m).edges`. **One box per declared entity, one arrow per declared
  relationship + lifecycle edge — no phantom node, no missing node/edge.** Assert against the DECLARED
  entities/relationships (via `buildFlowMap`) — the PART-1x traceability discipline applied to the drawing.
- **(C) INTEGRATION LITERAL BYPASS:** no integrations declared ⇒ zero integration boxes/arrows (mirrors
  PART 1x's bypass check).

**This is a NON-HASH PART** (like 1c–1x): it asserts determinism + faithfulness, **not a frozen digest** —
so it adds **no baked baseline** (103 stays 103) and moves no hash. The `194 OK` count **grows** by PART
1y's checks (additive — the normal add-a-feature discipline); the **frozen 103 + 10 + MAXIMAL stay
byte-identical**.

---

## 5. NODE/EDGE IDS FOR DAY 66 (design the interactive highlight to be cheap)

Every drawn element carries its **stable FlowMap id** as a data attribute:
- each entity/lifecycle box → `<g data-node-id="entity:Ticket">` (etc.);
- each edge → `<line/​path data-from="entity:Ticket" data-to="entity:Team" data-kind="relationship">`.

So Day 66's **impact highlight** is a cheap DOM operation: an impact entry's `file` (relPath) → its entity
→ the node id → toggle a highlight class on `[data-node-id="entity:<X>"]`. **No re-layout, no re-render** —
Day 66 just toggles classes on the already-drawn, id-keyed SVG. (Design only; Day 66 builds it.)

---

## 6. THE SPINE — render of the certified projection; deterministic; no heavy dep; honest

1. **RENDER OF THE CERTIFIED PROJECTION:** the graph comes from `buildFlowMap` (the declared-model
   projection); `renderFlowSvg` lays out + draws — it **never** re-derives the architecture or parses code
   /rendered text. The shell **displays** the certified SVG.
2. **DETERMINISTIC LAYOUT (PART 1y):** same blueprint → byte-identical SVG (explicit order, integer grid,
   no float/timestamp/id/randomness/locale). Proven twice + fresh-process.
3. **FAITHFUL (PART 1y):** drawn node/edge sets one-to-one with the declared model — no phantom, no missing.
4. **NO HEAVY DEP:** hand-rolled SVG string; **generator `deps {}` untouched**; the shell adds no JS dep.
5. **GENERATION UNTOUCHED:** the frozen backstop (103 baked + 10 + MAXIMAL `366e19d9…`) **byte-identical**;
   the generator change is **additive + literal-bypass + FLAGGED** (new files + a new PART; no existing
   output changes). **A moved hash = FINDING, STOP.**
6. **HONEST:** the renderer + the determinism/faithfulness proof + `cargo check`/self-test lockstep + `node
   --check` + a static preview (the diagram renders) are **HERE**; the **live packaged GUI diagram** (in
   the running Bedrock window) is **DEFERRED** to Leela's machine. **The INTERACTIVE highlight is Day 66**
   — this day is the **drawn diagram** (stated, not overclaimed).

### The gate (this is an additive Rust + generator change → the full gate)
- `cd generator && npm run build && npm run day20:regress` → **103 baked + 10 + MAXIMAL byte-identical**,
  **+ PART 1y green** (the OK count grows — additive). A moved frozen hash = STOP.
- `cargo check` clean + the **sidecar self-test lockstep** (the additive `flow_svg` command doesn't touch
  `run_sidecar`/`setup()`; the bundled node still reproduces the 103 digests + the `SIDECAR_EXIT` header).
- `node --check` (shell JS); a static preview (the SVG injects + renders).
- `git status` → `desktop/` + the **flagged additive** `generator/src/{map/flow-svg.ts, flow-svg.ts}` +
  `day20-regression.ts` (PART 1y) + docs. **No existing generator output file modified; `deps {}` unchanged.**

---

## 7. EXECUTE done-conditions

1. **THE VISUAL MAP:** the flow map rendered as a **drawn inline-SVG diagram** in the project view —
   entities as boxes, relationships as labelled arrows, the request lifecycle as a readable chain. **The
   text map stays available.**
2. **THE GRAPH COMES FROM THE CERTIFIED PROJECTION** — `renderFlowSvg(buildFlowMap(model))` via the new
   `flow_svg` sidecar command; **NOT parsed text, NOT re-derived in JS.**
3. **DETERMINISTIC (PART 1y):** `renderFlowSvg` byte-identical twice + across a fresh process; explicit
   sort; no float/timestamp/id/randomness/locale.
4. **FAITHFUL (PART 1y):** the drawn `data-node-id`/`data-edge` sets are one-to-one with `buildFlowMap`'s
   nodes/edges (= the declared entities/relationships) — no phantom, no missing.
5. **NO HEAVY DEP** (hand-rolled SVG); **generator `deps {}` untouched.**
6. **GENERATION UNTOUCHED:** the frozen backstop (103 baked + 10 + MAXIMAL `366e19d9…`) byte-identical; the
   generator change is **additive + literal-bypass + FLAGGED** (no existing output changed); `cargo check`
   clean + the self-test lockstep; git only `desktop/` + the flagged additive generator files + docs. **A
   moved hash = FINDING, STOP.**
7. **Honest:** the renderer + the proof + `node --check` + static preview HERE; the live packaged GUI
   diagram DEFERRED (Leela's machine); the interactive highlight is **Day 66** (not overclaimed).

## 8. REPORT done-conditions

`eco-day-65-report.md`: how the renderer gets the graph (the certified `buildFlowMap` projection via the
new `flow_svg` sidecar — **NOT parsed text**; the additive-generator-change decision, flagged); the
deterministic layout (explicit sort + integer-grid + no-drift rules); the drawn diagram
(entities/relationships/lifecycle; the text map stays); **PART 1y** (determinism byte-identical across
runs/processes; faithfulness node/edge one-to-one with the declared model); no heavy dep; the
generation-untouched proof (backstop byte-identical; the generator change additive + literal-bypass +
flagged; `deps {}`); the Rust gate (cargo check + self-test lockstep); honest build-here vs deferred (the
live GUI diagram = Leela's machine); **Day 66 = the interactive impact highlight** (the node/edge ids
designed for it). **Forward-flags:** the punch-list.

---

## 9. SCOPE GUARD — OUT

- **NOT** the interactive impact highlight (Day 66) — this day is the **drawn diagram**; **NOT** the diff
  Map (Day 67).
- The renderer **LAYS OUT + DRAWS the certified projection** — it does **NOT** decide the architecture: **no
  JS re-derivation from the blueprint, no parsing the rendered TEXT** to rebuild the graph (either = a
  FINDING).
- The graph comes from the certified `buildFlowMap` projection (of the **declared** model, never parsed
  from generated code).
- **NO heavy graph/viz library** — hand-rolled SVG; the generator's `deps {}` untouched; the shell's JS
  dependency-light.
- The generator change is **additive + literal-bypass + FLAGGED** (new `map/flow-svg.ts` + `flow-svg.ts` +
  PART 1y; **no existing output file modified**) — the backstop byte-identical. **A moved hash = FINDING,
  STOP.**
- The **live packaged GUI diagram is Leela's-machine** (honest — no claimed live render).
- **No AI** (ADR-001).

## 10. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-64/50/47 reports + the real code (`map/flow-map.ts` [the
   deciding read — the structured `FlowMap`], `flow-map.ts` CLI [text-only], PART 1x in
   `day20-regression.ts`, `commands.rs`) — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; the additive SVG projection + PART
   1y move nothing (read-only, no existing file changed) — **understood; the execute session proves it**.
4. AI touchpoints: **none** — the SVG is a deterministic projection (ADR-001) — **yes**.
5. The default/empty path a literal bypass: no existing output changed (new files only); no-integrations ⇒
   no integration boxes (PART 1y bypass) — **honored**.
6. The three determinism killers designed out: explicit iteration order (no map/set into output); integer
   grid / stable rounding (no float drift); no timestamps/ids/randomness/locale — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` (103+10+MAXIMAL byte-identical + PART 1y) +
   `cargo check` + the self-test + the faithfulness assertion + `git status`; a moved hash / a
   phantom-or-missing node = STOP — **yes**.
8. Overclaim / out-of-scope watch: no live GUI render claimed; no interactive highlight (Day 66); no
   text-parsing; the generator change flagged not silent — **guarded**.

---

*Day 65 plan: the visual Map — the drawn diagram. The deciding read resolved the mechanism honestly:
`buildFlowMap(model)` already returns a structured, deterministic, PART-1x-proven `FlowMap` (nodes/edges
with stable ids), but the CLI emits TEXT only and the shell WebView cannot import the Node module — so the
graph reaches the drawing ONLY via a sidecar emit, which is an ADDITIVE generator change (parsing the text
is forbidden). Recommended (flagged, additive, literal-bypass): a new pure `generator/src/map/flow-svg.ts`
(`renderFlowSvg(FlowMap) → hand-rolled SVG string`, beside `renderFlowMap`, no viz library, `deps {}`
untouched), a new CLI driver `flow-svg.ts` (emits `renderFlowSvg(buildFlowMap(model))` — no existing file
modified, so every frozen output is byte-identical by construction), a new thin `flow_svg` Rust command
(mirrors `flow_map`), and the shell's Project view displaying the certified SVG (a thin display — no JS
layout, no re-derivation, no text-parsing; the text map stays). The layout is deterministic: iterate the
FlowMap's given order (declared entities, sorted edges), integer-grid coordinates (no float drift), no
timestamps/ids/randomness/locale. A new non-hash PART 1y (mirroring PART 1x) proves it: (A) DETERMINISTIC —
`renderFlowSvg` byte-identical twice + across a fresh process; (B) FAITHFUL — the drawn `data-node-id`/
`data-edge` sets one-to-one with `buildFlowMap`'s nodes/edges (= the declared entities/relationships), no
phantom/missing; (C) the integration literal bypass. Every drawn element carries its stable FlowMap id
(`data-node-id`) so Day 66's impact highlight is a cheap class-toggle (no re-render). Generation untouched:
the frozen backstop (103 baked + 10 + MAXIMAL `366e19d9…`) byte-identical (the generator change is additive
+ literal-bypass + FLAGGED — new files + a new PART, no existing output modified; the OK count grows by
PART 1y; `deps {}` unchanged); the Rust gate is `cargo check` + the sidecar self-test lockstep. Honest: the
renderer + the determinism/faithfulness proof + `node --check` + a static preview HERE; the live packaged
GUI diagram DEFERRED to Leela's machine; the interactive highlight is Day 66 (this day is the drawn
diagram). No code this session — this is the "whoa" day: a developer SEES their architecture, projected
exactly from their declaration, byte-identical every time.*
