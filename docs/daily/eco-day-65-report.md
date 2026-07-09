# Eco-Day 65 — REPORT: THE VISUAL MAP — the drawn diagram (deterministic layout)

**Day 65 — the sensation push (Days 61–70).** The certified TEXT flow map is now a **drawn SVG diagram** —
entities as boxes, relationships as labelled arrows, the request lifecycle as a chain — rendered in the
Bedrock window. **The diagram is a RENDER of the certified projection** (`buildFlowMap`): the renderer lays
out + draws; it never re-derives or parses the architecture. Its **determinism + faithfulness are proven
as a new harness PART (1y)**, and it lands via **NEW generator files only** — no existing output moved.

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
**198 OK** / 0 FAIL (194 + the 4 new PART-1y checks), **103 baked digests unchanged**, **MAXIMAL
`366e19d9…` unmoved**. `cargo check` → clean. The bundled node reproduces the **103 frozen digests
byte-identical** (packaged == certified). Generator `deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. How the renderer gets the graph (the resolved mechanism — NOT parsed text)

`buildFlowMap(model)` already returns a **structured, deterministic, PART-1x-proven `FlowMap`**
(nodes/edges with stable ids: `app`, `entity:<Name>`, `route:<Name>`…`table:<Name>`, `integration:*`).
The CLI emitted **text only**, and the shell WebView **cannot import** the Node module — so the graph
reaches the drawing **only via a sidecar emit**. **Parsing the rendered text is forbidden** (a
re-derivation). The safest shape — **NEW FILES ONLY** (no existing generator file modified, so every frozen
output is byte-identical *by construction*):

- **[`generator/src/map/flow-svg.ts`](../../generator/src/map/flow-svg.ts)** (NEW, pure): `renderFlowSvg(map:
  FlowMap) → string` — the **drawing analogue of `renderFlowMap`**. Reads ONLY the `FlowMap` (a projection
  of the declared model); a **hand-rolled SVG string** (no viz library; `deps {}` untouched). It decides
  nothing about the architecture.
- **[`generator/src/flow-svg.ts`](../../generator/src/flow-svg.ts)** (NEW CLI driver): mirrors
  `flow-map.ts`'s `--model` contract; emits `renderFlowSvg(buildFlowMap(model))`.

**Read-only projection:** never in `buildFileSet`/the generation path; the plugins/`buildFileSet` never
import it — so no baked digest can move.

## 2. The deterministic layout (the rules that kill drift)

- **Iterate the FlowMap's GIVEN order** (entities declared-order; edges sorted by `buildFlowMap`;
  integrations email-then-ai). Positions are looked up by id (never iterating a `Map`/`Set` into output);
  the output order is driven by the ordered `nodes`/`edges` arrays + the fixed `LAYERS` array.
- **INTEGER-grid coordinates only** — every position from integer arithmetic (`ENT_TOP + i*ROW_H`,
  `LIFE_X + k*LIFE_STEP`, centers via `>>1`). **No floats ⇒ no drift.**
- **No timestamps / ids / randomness / locale** — labels are the FlowMap's deterministic strings; numbers
  via template literals (no `toLocaleString`); the only ids are the stable FlowMap node/edge ids.
- **Layout:** the `app` box on top; each entity a swimlane (entity box + its 6 lifecycle boxes across);
  relationship/integration arrows connect box centers with an arrowhead marker.

## 3. The drawn diagram + the Day-66 hook

Boxes = entities (+ app + lifecycle + integrations), labelled arrows = relationships/lifecycle/integration.
**Every element carries its stable FlowMap id:** `<g data-node-id="entity:Ticket">`, `<line
data-from="entity:Ticket" data-to="entity:Team" data-kind="relationship">`. So **Day 66's impact highlight
is a cheap class-toggle** on `[data-node-id="entity:X"]` — no re-layout, no re-render. (Preview-verified:
the injected SVG's `data-node-id`/`data-from` hooks are queryable.)

## 4. PART 1y (NEW, non-hash) — determinism + faithfulness — DC-3 (load-bearing)

Added to [`day20-regression.ts`](../../generator/src/day20-regression.ts) beside PART 1x (the **harness** —
not the generation path). **4 checks, all green:**

- **(A) DETERMINISTIC (in-process):** `renderFlowSvg(buildFlowMap(m))` **byte-identical twice**.
- **(A2) DETERMINISTIC (FRESH PROCESS):** the `flow-svg` CLI spawned **twice → identical stdout**, AND ==
  the in-process render — no process-state / iteration-order / float / locale leak.
- **(B) FAITHFUL:** a structural read of **our own emitted** `data-node-id` / `data-from|to|kind`
  attributes (NOT a re-derivation) → the drawn sets are **one-to-one with `buildFlowMap`'s nodes/edges**
  (= the declared entities/relationships) — **no phantom, no missing** (`16n/17e`).
- **(C) INTEGRATION LITERAL BYPASS:** no integrations declared ⇒ zero integration boxes/arrows drawn.

**NON-HASH — bakes no digest: 103 stays 103.** The OK count grew **194 → 198** (additive — the normal
add-a-feature discipline); the **frozen 103 + 10 + MAXIMAL are byte-identical**.

## 5. Generation untouched (DC-4) — new files only

- **Backstop byte-identical (from clean):** 198 OK / 0 FAIL; **103 baked + 10 TeamTracker + MAXIMAL
  `366e19d9…` unchanged**; PART 1x unchanged.
- **`git status` — no existing generation-path file modified:** the generator changes are **2 NEW files**
  (`map/flow-svg.ts`, `flow-svg.ts`) + `day20-regression.ts` (the **harness**, additive PART 1y). `core/`,
  `plugins/`, `templates/`, `map/flow-map.ts`, `map/impact-map.ts` — **untouched** (grep-empty).
- **`deps {}`** (generator `dependencies` absent); the SVG is hand-rolled (no viz library).

## 6. The flow_svg command + the sidecar payload (DC-5)

- **New thin invoker** [`flow_svg(backend?, model?)`](../../desktop/src-tauri/src/commands.rs) → `run_sidecar
  ("flow-svg.js", …)` — **mirrors `flow_map` exactly** (the Day-53 `SidecarResult` contract); registered
  additively in `lib.rs` `generate_handler!` (the 5 existing invokers + the `setup()` self-test untouched).
- **`cargo check` clean.**
- **The sync-gen STAMP legitimately CHANGED** (a new sidecar entry): `c43773ae… (237 files) →
  `550395db21400b65… (241 files)` — this is `resources/gen` **tracking the 2 new dist entries**
  (`dist/flow-svg.js` + `dist/map/flow-svg.js`), **NOT a generation-hash move**. Proven: the **bundled node
  reproduces the 103 frozen digests byte-identical** to the certified generator (packaged == certified);
  the self-test payload (103 digests + the `SIDECAR_EXIT` contract) is intact.

## 7. The shell as a thin display (DC-6)

The Project view (Day 64) gains **"View diagram"** → `invoke('flow_svg', { model:
JSON.stringify(buildBlueprintChoices(selections)) })` → the returned certified SVG string is **inserted**
into a `#diagram` container. **THIN DISPLAY:** no JS layout, no re-derivation, no text-parsing — it inserts
the certified SVG (from our generator, not user HTML). **The text map stays available** ("Flow map (text)").

## 8. Verification + the honest split (DC-7)

**Verified HERE:**
- `node --check` (main.js + wizard-choices.js) — OK; `cargo check` clean.
- **PART 1y green** (determinism in-process + fresh-process; faithfulness 16n/17e; bypass).
- The certified `flow-svg` sidecar produces a **6792-byte SVG, 16 boxes / 17 edges** (matches the FlowMap).
- **Static browser preview:** the Project view's "View diagram" button binds; the no-backend guard fires;
  **the thin-display path renders injected certified SVG** (`svgTag: svg`, diagram visible) and the
  **`data-node-id` / `data-from` hooks are queryable** (Day-66 ready); **zero console errors**.

**DEFERRED (Leela's Windows machine — honest-manual):**
- The **live packaged GUI diagram** — clicking "View diagram" in the running Bedrock window → `flow_svg`
  through the Tauri backend → the drawn SVG in the WebView. **No claimed live render.**

**The INTERACTIVE impact highlight is Day 66** — this day is the **drawn diagram** (stated, not overclaimed).

## 9. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **The visual Map** (drawn diagram, deterministic + faithful, PART 1y) | **DONE (build-here)** |
| 1 | **Day 66 — the interactive impact Map** — highlight the `previewImpact` delta on the diagram via the `data-node-id` class toggle | NEXT |
| 2 | **Day 67 — the diff Map** (two-blueprint compare) | Phase B |
| 3 | **Live packaged GUI diagram render** | Leela's Windows machine (honest-manual) |
| 4 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 65 turned the certified text flow map into a DRAWN SVG diagram — the visual Map. The deciding read:
`buildFlowMap` already returns a structured, deterministic, PART-1x-proven `FlowMap`; the CLI emitted text
only and the WebView can't import the Node module, so the graph reaches the drawing only via a sidecar emit
(parsing the text is forbidden). Resolved with the safest shape — NEW FILES ONLY: a pure
`generator/src/map/flow-svg.ts` (`renderFlowSvg(FlowMap) → hand-rolled SVG`, beside `renderFlowMap`, no viz
library, `deps {}` untouched) + a new CLI driver `flow-svg.ts` — no existing generator file modified, so
every frozen output is byte-identical by construction. The layout is deterministic: iterate the FlowMap's
given order, integer-grid coordinates (no float drift), no timestamps/ids/randomness/locale; every element
carries its stable FlowMap id (`data-node-id`) so Day 66's highlight is a class toggle. A new non-hash PART
1y (mirroring PART 1x) proves it: (A) `renderFlowSvg` byte-identical twice + (A2) across a FRESH process
(the CLI spawned twice == the in-process render); (B) FAITHFUL — the drawn `data-node-id`/`data-edge` sets
one-to-one with `buildFlowMap` (= the declared entities/relationships), 16n/17e, no phantom/missing; (C) the
integration bypass. NON-HASH ⇒ 103 stays 103; the OK count grew 194→198 (additive). A new thin `flow_svg`
Rust command (mirrors `flow_map`) surfaces it; the shell's Project view is a THIN DISPLAY (inserts the
certified SVG — no JS layout/re-derivation/parsing; the text map stays). Generation untouched: no existing
generation-path file modified (2 new files + the harness PART), 103 baked + 10 + MAXIMAL `366e19d9…`
byte-identical, `deps {}`; the sync-gen stamp legitimately changed (237→241 files, `550395db…`) tracking
the 2 new dist entries — NOT a generation-hash move, and the bundled node still reproduces the 103 frozen
digests byte-identical (packaged == certified); `cargo check` clean + the self-test lockstep intact.
Honest: the module + CLI + PART 1y + the command + the display + `node --check` + a static preview
(injected SVG renders; the Day-66 hooks queryable; zero console errors) HERE; the live packaged GUI diagram
render DEFERRED to Leela's machine; the interactive highlight is Day 66. This is the "whoa" day — a
developer SEES their architecture, projected exactly from their declaration, byte-identical every time.*
