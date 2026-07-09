# Eco-Day 66 — REPORT: THE INTERACTIVE IMPACT MAP — highlight exactly what a change touches

**Day 66 — THE SENSATION (Days 61–70).** Edit a project and the drawn diagram **highlights EXACTLY the
nodes the change touches — before a byte is written.** The highlight is the **CERTIFIED delta, visualized**:
the impacted node ids are computed by the ENGINE (a new read-only projection, NEW FILES ONLY) from
`previewImpact`'s changed files under the **emitters' own file attribution — not a JS path heuristic**. The
shell **only paints** (class toggles on the Day-65 `data-node-id` hooks).

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
**203 OK** / 0 FAIL (198 + the 5 new PART-1z checks), **103 baked digests unchanged**, **MAXIMAL
`366e19d9…` unmoved**; PART 1w/1x/1y unchanged. `cargo check` clean. The bundled node reproduces the **103
frozen digests byte-identical** (packaged == certified). Generator `deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. THE CERTIFIED FILE→NODE ATTRIBUTION (from the emitters — NOT a path heuristic)

`buildFileSet` ([`core/regen.ts:138`](../../generator/src/core/regen.ts)) generates files **one entity at a
time** via `plugin.generateEntity(entity, { index, multiUser, projectName, projectType, style })` — so
**each entity's files are exactly what its own emitter produces**; `generateProjectShell` produces
everything else → the **`app`** node. [`map/impact-nodes.ts`](../../generator/src/map/impact-nodes.ts)
`fileOwners(model)` recovers that ownership with the **SAME `generateEntity` call** (same context):
`relPath ∈ generateEntity(X)` ⇒ `entity:X`; every other generated file ⇒ `app`. **This is the emitters'
own partition — no regex, no path pattern-match.**

> **Honesty note:** PART 1x's traceability check uses a path pattern — but that is a **test heuristic in the
> harness**, never a shipped mapping. Day 66 uses the **emitter**, and PART 1z proves the partition is total
> + disjoint (§4) — a heuristic would gap or overlap.

## 2. THE HONEST GRANULARITY BOUNDARY (load-bearing honesty)

We highlight **entity nodes + the `app` node + ADDED relationship edges** — all certifiable (the emitters'
ownership + the declared-model diff). We **deliberately do NOT** highlight the per-**lifecycle-layer** nodes
(`route:X` / `service:X` / `repository:X` / `model:X` / `table:X`): generated files are **not tagged by
layer**, so per-layer attribution would require a **path heuristic** — the forbidden path. **We highlight
what we can certify (the entity), not what would look good (the layer).**

## 3. THE IMPACTED-NODES MODULE + CLI (new files only) — DC-1/DC-2

- [`generator/src/map/impact-nodes.ts`](../../generator/src/map/impact-nodes.ts) (NEW, pure):
  `impactedNodes(current, proposed) → { nodes: [{id, action}], edges: [{from, to, action}] }`. Impacted
  nodes = the owners (via `fileOwners`) of `previewImpact`'s non-no-op changed files (add/change from
  proposed, delete from current), **∩ the nodes present in `buildFlowMap(proposed)`** (the shown diagram —
  a deleted-whole-entity has no proposed node, shown only in the text delta). **Per-node action rule:** a
  node whose entity is **new in proposed** → `add`; otherwise → `change` (`app` is never "added"). Added
  relationship **edges** come from the **declared-model diff** (relationships in proposed not in current) —
  certified, not a file heuristic. Deterministic (sorted), read-only.
- [`generator/src/impact-nodes.ts`](../../generator/src/impact-nodes.ts) (NEW CLI driver): `--model` = a
  `{ current, proposed }` pair (like `map.js`); emits the JSON.

## 4. PART 1z (NEW, non-hash, load-bearing) — DC-3

Added to [`day20-regression.ts`](../../generator/src/day20-regression.ts) beside PART 1y (the **harness**,
not the generation path). **5 checks, all green:**

- **(A) DETERMINISTIC (in-process):** the impacted-id set **byte-identical twice**.
- **(A2) DETERMINISTIC (FRESH PROCESS):** the CLI spawned **twice → identical stdout**, == the in-process
  set.
- **(B1) ATTRIBUTION TOTAL + DISJOINT:** for `buildFileSet(proposed)`, each entity's files == its own
  `generateEntity` emit, **pairwise disjoint**, all ⊆ `buildFileSet` (`entities=4, appFiles=27`) — proving
  the mapping is the **emitters' own**, not a heuristic (a heuristic would gap/overlap).
- **(B2) FAITHFUL, anchored to previewed==real:** for the **Day-64 pair** (TeamTracker → + a `severity`
  field on Ticket, whose previewed==real is proven byte-exact), the impacted node set == **EXACTLY** the
  owners of the real changed files — **no phantom, no missing**. Result: **`impacted=[app, entity:Ticket]`,
  changed=4** — the severity-add touches Ticket's slice **and** an app-level file (surfaced honestly by
  computing the real owners, not a hardcoded guess); `entity:Ticket` highlighted (the sensation).
- **(C) EMPTY BYPASS:** an identical `{ current, current }` pair ⇒ **ZERO** impacted nodes/edges.

**NON-HASH — bakes NO digest: 103 stays 103.** OK count grew **198 → 203** (additive). **PART 1w/1x/1y
unchanged.**

## 5. Generation untouched (DC-4) — new files only

- **Backstop byte-identical (from clean):** 203 OK / 0 FAIL; **103 baked + 10 TeamTracker + MAXIMAL
  `366e19d9…` unchanged**; PART 1w/1x/1y unchanged.
- **`git status` — no existing generation-path file modified:** the generator changes are **2 NEW files**
  (`map/impact-nodes.ts`, `impact-nodes.ts`) + `day20-regression.ts` (the **harness**, additive PART 1z).
  `core/`, `plugins/`, `templates/`, `map/flow-map.ts`, `map/impact-map.ts`, `map/flow-svg.ts` —
  **untouched** (grep-empty).
- **`deps {}`** (generator `dependencies` absent); no heavy dep.

## 6. The impact_nodes command + the sidecar payload (DC-5)

- **New thin invoker** [`impact_nodes(backend?, model?)`](../../desktop/src-tauri/src/commands.rs) →
  `run_sidecar("impact-nodes.js", …)` — **mirrors `flow_svg`/`flow_map` exactly** (the Day-53
  `SidecarResult` contract); registered additively in `lib.rs` `generate_handler!` (the existing invokers
  + the `setup()` self-test untouched). `cargo check` clean.
- **The sync-gen STAMP legitimately CHANGED** (2 new dist entries): `550395db… (241 files) →
  83ffd0ad4683920e… (245 files)` — `resources/gen` **tracking `dist/impact-nodes.js` +
  `dist/map/impact-nodes.js`**, **NOT a generation-hash move**. Proven: the **bundled node reproduces the
  103 frozen digests byte-identical** (packaged == certified); the self-test payload + `SIDECAR_EXIT`
  contract intact.

## 7. The highlight — the shell ONLY paints (DC-6)

[`main.js`](../../desktop/src/main.js): **"Preview impact"** now does two invokes on the same `{ current:
baseline, proposed: edited }` pair:
1. `impact_preview` → the certified **text delta** (Day 64) — **stays visible**.
2. `impact_nodes` → `{ nodes, edges }` (DATA) → **`paintImpact`** toggles `impact-add` / `impact-change` /
   `impact-delete` classes on the certified SVG's `[data-node-id]` / `[data-from][data-to]` (matched by
   exact attribute value — no CSS-selector injection). **`clearImpactHighlight`** wipes the prior set first.
   If no diagram is drawn, it hints "View diagram" (honest — no fabricated render).
- **JS does NOT compute what changed** — it receives the impacted ids and paints. A JS heuristic would be a
  FINDING. The highlight is a *view* of the same certified truth as the text delta, never a substitute.

## 8. Verification + the honest split (DC-7)

**Verified HERE:**
- `node --check` (main.js + wizard-choices.js) — OK; `cargo check` clean.
- **PART 1z green** (determinism in-process + fresh-process; attribution total+disjoint; faithful vs
  previewed==real; empty bypass).
- The `impact-nodes` sidecar produces valid JSON (`{"nodes":[{"id":"app","action":"change"},{"id":"entity:
  Ticket","action":"change"}],…}` for the demo change).
- **Static browser preview:** injecting a certified SVG + a real impacted-id set, the paint mechanism adds
  `impact-change` to `entity:Ticket` (**CSS applied** — rect stroke `rgb(217,119,6)` amber), adds
  `impact-add` to the edge, leaves the **un-impacted `entity:Team` untouched** (no phantom), and
  `clearImpactHighlight` removes all classes; the Preview-impact button binds; the no-baseline guard fires;
  **zero console errors**.

**DEFERRED (Leela's Windows machine — honest-manual):**
- The **live packaged GUI highlight** — clicking "Preview impact" in the running Bedrock window → the boxes
  light up. **No claimed live run.**

**The diff Map is Day 67** — this day is the interactive highlight of a single change (stated, not
overclaimed).

## 9. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **The interactive impact Map** (impacted nodes from the emitters' attribution; PART 1z; class-toggle highlight) | **DONE (build-here)** |
| 1 | **Day 67 — the diff Map** — compare two SAVED blueprints (the Day-63 store makes it possible) | NEXT |
| 2 | **Day 68 — trust + the export experience** | Phase C |
| 3 | **Live packaged GUI highlight render** | Leela's Windows machine (honest-manual) |
| 4 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 66 built the interactive impact Map — the sensation. The deciding read resolved the file→node
attribution honestly: `buildFileSet` generates files one entity at a time via `plugin.generateEntity`
(each entity's own emitter owns its files) + `generateProjectShell` (→ `app`) — a CERTIFIED attribution
from the emitters, NOT a path heuristic (PART 1x's path pattern is a harness test heuristic, never
shipped). A new pure `generator/src/map/impact-nodes.ts` (+ a new CLI driver, NEW FILES ONLY) computes, for
a `{ current, proposed }` pair, the impacted node ids from `previewImpact`'s changed files under that
attribution (each changed file → its `entity:X`/`app` owner, ∩ the proposed diagram) + added relationship
edges from the declared-model diff — deterministic, read-only. The honest granularity boundary is stated:
entity + app nodes + added edges (certifiable), NOT per-lifecycle-layer nodes (uncertifiable without a
heuristic — we highlight what we can certify, not what would look good). A new thin `impact_nodes` Rust
command (mirrors `flow_svg`) surfaces it; the shell's "Preview impact" gains a class-toggle highlight on the
Day-65 `data-node-id`/`data-from|to` hooks — JS ONLY PAINTS (the engine computes what's impacted; the
certified text delta stays visible). A new non-hash PART 1z (mirroring 1w/1y) proves it: (A) DETERMINISTIC
twice + fresh process; (B1) the attribution is TOTAL + DISJOINT over `buildFileSet` (proving it's the
emitters', not a heuristic); (B2) FAITHFUL for the Day-64 previewed==real pair — the impacted set is EXACTLY
the owners of the real changed files (`[app, entity:Ticket]`, no phantom/missing), the severity-add
highlighting Ticket; (C) empty bypass. NON-HASH ⇒ 103 stays 103; OK grew 198→203. New files only ⇒ the 103
baked + 10 + MAXIMAL `366e19d9…` byte-identical (proven from clean); PART 1w/1x/1y unchanged; `deps {}`;
`cargo check` + the self-test lockstep (the bundled node reproduces the 103 digests; the sync-gen stamp
legitimately changed 241→245 files, `83ffd0ad…`, tracking the 2 new dist entries — NOT a generation-hash
move). Verified HERE: PART 1z + `node --check` + a static preview (the paint mechanism highlights the
impacted node with CSS applied, leaves un-impacted nodes untouched, clears cleanly; zero console errors);
the live packaged GUI highlight DEFERRED to Leela's machine; the diff Map is Day 67. This is the day a
developer sees EXACTLY what their change will touch, before it touches it — the thing no AI can do.*
