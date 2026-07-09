# Eco-Day 66 — PLAN: THE INTERACTIVE IMPACT MAP — highlight exactly what a change touches

**Day 66 — THE SENSATION (Days 61–70).** Load a project, edit it (add a field/entity/relationship), and
the **drawn diagram highlights EXACTLY the nodes the change touches — before a byte is written.** This is
the thing no AI tool can do truthfully. **The highlight is the CERTIFIED delta, visualized:** the impacted
node ids are computed by the ENGINE (a new read-only projection, NEW FILES ONLY); **JS only paints** (class
toggles on the Day-65 `data-node-id` hooks). **No JS path heuristic, no re-derivation — that would be
decoration pretending to be a proof.**

**This session is PLAN ONLY. No code, no builds.**

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. THE DECIDING READ — the file→node attribution IS certified (from the emitters, not paths)

The whole day hinged on: *can a changed file be attributed to a diagram node WITHOUT a JS path heuristic?*
**Yes — the engine already owns the attribution by construction:**

- **`buildFileSet(model, plugin)`** ([`core/regen.ts:138`](../../generator/src/core/regen.ts)) generates
  files **one entity at a time**: `plugin.generateEntity(entity, { index, multiUser, projectName,
  projectType, style })` returns **exactly that entity's files** (its full CRUD slice). The plugin doc
  ([`core/plugin.ts:87`](../../generator/src/core/plugin.ts)): *"Produce ALL files for ONE entity … the
  core calls this once per entity."* `plugin.generateProjectShell(model)` produces everything **not** tied
  to an entity (build/config/auth/manifest/tokens/ci) → the **`app`** node.
- **So the certified attribution is:** `relPath ∈ generateEntity(X)` ⇒ owned by **`entity:X`**; everything
  else ⇒ **`app`**. This is the **SAME emitter call `buildFileSet` uses** — the ownership is exact by
  construction, **NOT** a path regex. (Contrast: PART 1x's traceability check used a path pattern — that is
  a *test heuristic in the harness*, never a shipped mapping. Day 66 uses the **emitter**, not paths.)
- **`previewImpact(current, proposed)`** ([`map/impact-map.ts`](../../generator/src/map/impact-map.ts))
  gives the changed files (`ImpactPlan { entries:[{file, action}], add, change, delete, noOp }`).
- **`buildFlowMap(proposed)`** gives the node ids that EXIST on the shown (proposed) diagram.

**→ A new pure module computes the impacted node ids from `previewImpact` + the certified per-entity
attribution. Option (b) — no existing generation-path file modified, NEW FILES ONLY (the Day-65 shape).**

---

## 1. THE IMPACTED-NODES PROJECTION (new files only) — DC-1

- **[`generator/src/map/impact-nodes.ts`](../../generator/src/map/impact-nodes.ts)** (NEW, pure):
  `impactedNodes(current: ProjectModel, proposed: ProjectModel): { nodes: {id, action}[], edges: {from,
  to, kind, action}[] }`.
  - **Attribution (certified):** for a model, `attribution(model)` = a `relPath → nodeId` map built from
    the emitters: for each entity `plugin.generateEntity(entity, ctx)` → its relPaths own `entity:<name>`;
    every other relPath ⇒ `app`. `ctx` is replicated from `buildFileSet` exactly (`{ index, multiUser,
    projectName, projectType, style }`). **Certified by construction** (the same call `buildFileSet` makes)
    — proven **total + disjoint** by PART 1z.
  - **Impacted nodes:** `previewImpact(current, proposed)` → for each non-no-op entry, its owner node =
    `attribution(proposed).get(file)` (add/change) or `attribution(current).get(file)` (delete). The
    impacted **node set** = those owners **∩ the ids present in `buildFlowMap(proposed)`** (the shown
    diagram). Per-node `action` = **`add`** if the entity is new in proposed, else **`change`** (a
    surviving entity whose slice changed). Deleted-whole-entities have no proposed node → not highlightable
    (shown in the text delta) — stated, not faked.
  - **Impacted edges (certified declared-model diff, not a file heuristic):** relationship edges **added**
    in proposed vs current (comparing the DECLARED relationships of each model) → highlighted on the
    proposed diagram (they exist); removed ones are absent (text delta).
  - **Deterministic:** sorted output; reads only the models + the emitters; **no writes, no AI, no clock.**
- **[`generator/src/impact-nodes.ts`](../../generator/src/impact-nodes.ts)** (NEW CLI driver): `--model` =
  a `{ current, proposed }` BlueprintChoices **pair** (same shape as `map.js`); emits
  `JSON.stringify(impactedNodes(assemble(current), assemble(proposed)))` to stdout.

### 1.1 The honest granularity boundary (state it plainly)
We highlight at the **entity + app node** granularity (+ **added relationship edges**) — **certified** by
`generateEntity`/`generateProjectShell` ownership and the declared-relationship diff. We do **NOT**
individually highlight the per-**lifecycle-layer** nodes (`route:X` vs `service:X`): files are **not** tagged
by layer, so per-layer attribution would require a **path heuristic** — which is exactly the forbidden
re-derivation. The entity node carries the impact; the layer nodes are the entity's projection. **We
highlight what we can certify (the entity), not what we'd have to guess (the layer).**

---

## 2. THE THIN COMMAND (mirror flow_svg) — DC-2

**New thin invoker** [`impact_nodes(backend?, model?)`](../../desktop/src-tauri/src/commands.rs) →
`run_sidecar("impact-nodes.js", …)` — mirrors `flow_svg`/`flow_map` exactly (the Day-53 `SidecarResult`
contract), registered **additively** in `lib.rs` `generate_handler!` (the existing invokers + the `setup()`
self-test untouched). `cargo check` + the sidecar self-test lockstep.

---

## 3. THE HIGHLIGHT — the shell ONLY paints — DC-3

In the Project view (Day 64/65): **"Preview impact"** now does two invokes:
1. `impact_preview` (Day 64) → the certified **text delta** (stays visible — the highlight is a *view* of
   the same truth, never a substitute).
2. `impact_nodes` → `{ nodes, edges }` → **JS toggles CSS classes** on the already-rendered certified SVG:
   `[data-node-id="entity:X"]` and `[data-from="…"][data-to="…"]` get `impact-add` / `impact-change` /
   `impact-delete` classes (a small stylesheet — a colored outline/fill). **JS does NOT compute what
   changed** — it receives the impacted ids as DATA and paints. Clearing = remove the classes.
- If the diagram isn't drawn yet, "Preview impact" can draw it first (`flow_svg`) then paint — a display
  sequence, still no computation of the delta in JS.
- **A JS path heuristic / regex / re-derivation of the impacted set = a FINDING** (decoration pretending
  to be a proof). The engine decides WHAT is impacted; JS only paints.

---

## 4. PART 1z (NEW, non-hash, load-bearing) — mirrors 1w/1y — DC-4

Added to `day20-regression.ts` beside PART 1y (the **harness**, not the generation path):

- **(A) DETERMINISTIC:** `impactedNodes(current, proposed)` **byte-identical twice** in-process AND
  **across a FRESH PROCESS** (spawn `impact-nodes.js --model <pair>` twice → identical stdout, == the
  in-process result).
- **(B1) CERTIFIED ATTRIBUTION (total + disjoint):** for `buildFileSet(proposed)`, **every relPath is
  owned by exactly one node** — each entity's files == `generateEntity(entity)`, the rest == `app`; **no
  orphan, no overlap.** This certifies the attribution is the emitters', not a heuristic.
- **(B2) FAITHFUL (no phantom, no missing) — anchored to previewed==real:** for the **Day-64 pair whose
  previewed==real is proven** (current = TeamTracker, proposed = TeamTracker + a new field on Ticket),
  `previewImpact`'s changed files are each owned (by the certified attribution) by the impacted set; the
  impacted node set == **exactly** those owners (∩ the proposed diagram) — **NO phantom** (no highlighted
  node whose files didn't change), **NO missing** (every changed file's on-diagram owner is highlighted).
  **Anchor:** `entity:Ticket` ∈ impacted (the field-add on Ticket highlights Ticket — the sensation).
- **(C) EMPTY BYPASS:** `impactedNodes(m, m)` (identical pair) ⇒ `previewImpact` has zero changes ⇒
  **ZERO impacted nodes/edges** (no spurious highlight).

**NON-HASH — bakes NO digest: 103 stays 103.** The OK count grows additively (like PART 1y). **PART
1w/1x/1y unchanged.**

---

## 5. THE SPINE — certified delta visualized; new files only; JS paints; honest

1. **THE HIGHLIGHT IS THE CERTIFIED DELTA:** the impacted node/edge set comes from the engine (a new
   read-only module, NEW FILES ONLY) via `previewImpact` + the certified emitter attribution. **No JS
   heuristic, no re-derivation, no parsing.**
2. **FAITHFUL (PART 1z):** the highlighted set is EXACTLY the owners of the real changed files (no
   phantom/missing), anchored to the previewed==real pair.
3. **DETERMINISTIC (PART 1z):** same pair → same impacted-id set, byte-identical twice + fresh process.
4. **NEW FILES ONLY IN THE GENERATOR:** no existing generation-path file modified ⇒ **103 baked + 10 +
   MAXIMAL `366e19d9…` byte-identical BY CONSTRUCTION** — and PROVEN (flagged, not silent). PART 1w/1x/1y
   unchanged; PART 1z bakes no digest.
5. **THE SHELL ONLY PAINTS:** invoke → receive impacted ids (data) → toggle classes on the certified SVG.
   No layout, no re-render, no computing what changed.
6. **HONEST:** the module + CLI + command + highlight + PART 1z + `node --check` + a static preview HERE;
   the **live packaged GUI highlight DEFERRED** to Leela's machine. The **diff Map is Day 67** — not
   overclaimed.

### The gate (additive Rust + generator NEW files → the full gate)
- `cd generator && npm run build && npm run day20:regress` → **103 baked + 10 + MAXIMAL byte-identical + PART
  1z green** (OK count grows); PART 1w/1x/1y unchanged. A moved BAKED hash = STOP.
- `cargo check` clean + the **sidecar self-test lockstep** (the additive `impact_nodes` command doesn't
  touch `run_sidecar`/`setup()`; the bundled node still reproduces the 103 digests). **`sync-gen` stamp may
  legitimately change** (new `impact-nodes.js` dist entry — a payload-tracking change, NOT a hash move):
  record the new stamp; confirm the bundled node reproduces the 103 frozen digests byte-identical.
- `node --check` (shell JS); a static preview (the highlight class-toggles on an injected certified SVG).
- `git status` → `desktop/` + the NEW `generator/src/{map/impact-nodes.ts, impact-nodes.ts}` +
  `day20-regression.ts` (PART 1z) + docs. **No existing generation-path file modified; `deps {}`.**

---

## 6. EXECUTE done-conditions

1. **THE IMPACTED-NODES PROJECTION** — a NEW pure module + NEW CLI driver (NEW FILES ONLY) emitting the
   impacted node/edge ids (with actions) as JSON, from `previewImpact` + the certified per-entity/shell
   attribution + the declared-relationship diff. Deterministic, read-only. **No existing generation-path
   file modified.**
2. **THE NEW THIN COMMAND** `impact_nodes` (mirrors `flow_svg`; additive registration; the existing
   invokers + self-test untouched).
3. **THE HIGHLIGHT** — "Preview impact" also toggles classes on the certified SVG's
   `[data-node-id]`/`[data-from|to]` for the impacted ids (add/change/delete styling). **JS ONLY PAINTS;
   the certified text delta stays visible.**
4. **PART 1z** (NON-HASH, load-bearing): (A) deterministic twice + fresh process; (B1) certified
   attribution total+disjoint; (B2) faithful — no phantom/missing, anchored to the previewed==real pair;
   (C) empty bypass. **103 stays 103**; OK count grows.
5. **GENERATION UNTOUCHED:** 103 baked + 10 + MAXIMAL `366e19d9…` byte-identical (from clean); PART
   1w/1x/1y unchanged; new generator FILES only; `deps {}`; `cargo check` clean; the sidecar self-test
   lockstep (bundled node reproduces the 103 digests; the sync-gen stamp change recorded + distinguished
   from a hash move). **A moved BAKED hash = FINDING, STOP.**
6. **Honest:** everything provable HERE proven; the **live packaged GUI highlight DEFERRED** (Leela's
   machine); the **diff Map is Day 67** — not overclaimed.

## 7. REPORT done-conditions

`eco-day-66-report.md`: **THE FILE→NODE ATTRIBUTION** (from the emitters — `generateEntity` per entity +
`generateProjectShell` → app — NOT a JS path heuristic; the honest entity+app granularity boundary and why
per-layer isn't claimed); the impacted-nodes module + CLI (new files only); the new command; the highlight
(class toggle; add/change/delete; the text delta still shown); **PART 1z** (deterministic + certified
attribution [total/disjoint] + faithful [no phantom/missing, anchored to previewed==real] + empty bypass;
non-hash — 103 stays 103; OK count N); the generation-untouched proof (103 baked + MAXIMAL byte-identical;
PART 1w/1x/1y unchanged; new files only; `deps {}`); `cargo check` + self-test lockstep + the stamp note;
honest build-here vs deferred. **Forward-flags:** Day 67 = the diff Map (two saved blueprints compared —
the store makes this possible); the punch-list.

---

## 8. SCOPE GUARD — OUT

- **NOT** the diff Map (Day 67).
- The impacted set is computed by the **ENGINE** — a **JS path heuristic / regex / re-derivation = a
  FINDING** (decoration pretending to be a proof; exactly what Bedrock exists to replace).
- The shell **ONLY PAINTS** (class toggles on the certified SVG — no layout, no re-render, no computing
  what changed).
- **NEW GENERATOR FILES ONLY** — no existing generation-path file modified (the harness PART is not the
  generation path).
- **PART 1z is NON-HASH** — bake no digest (103 stays 103); the 103 baked + 10 + MAXIMAL byte-identical (a
  move = FINDING, STOP); PART 1w/1x/1y untouched.
- **No heavy dep** (`deps {}`). The **sync-gen stamp may legitimately change** (new dist entry) — but the
  bundled node must still reproduce the 103 digests.
- The **live packaged GUI highlight is Leela's-machine** (honest — no claimed live run). **No AI** (ADR-001).
- **We highlight only what we can certify (entity + app + added edges), never a guessed per-layer set.**

## 9. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-65/64/47/50 reports + the real code (`regen.ts` [the deciding
   read — per-entity `generateEntity`], `plugin.ts`, `impact-map.ts`, `flow-map.ts`, `flow-svg.ts`,
   `commands.rs`, the wizard) — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; the impacted-nodes module is a
   read-only projection (new files) — moves nothing; proven in execute — **understood**.
4. AI touchpoints: **none** — the impacted set is a deterministic projection (ADR-001) — **yes**.
5. The default/empty path a literal bypass: `impactedNodes(m, m)` ⇒ zero highlights (PART 1z-C); no
   existing output changed — **honored**.
6. The three determinism killers: given-order/sorted output; no clock/RNG; no locale — reads only models +
   emitters — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` (103+10+MAXIMAL byte-identical + PART 1z) +
   `cargo check` + the self-test + the faithfulness/coverage assertions + `git status`; a moved hash / a
   phantom-or-missing highlight = STOP — **yes**.
8. Overclaim / out-of-scope watch: no JS heuristic; no per-layer claim; no live GUI run claimed; the diff
   Map is Day 67; the attribution is the emitters' not paths — **guarded**.

---

*Day 66 plan: the interactive impact Map — the sensation. The deciding read resolved the file→node
attribution honestly: `buildFileSet` generates files one entity at a time via `plugin.generateEntity(entity,
…)` (each entity's own emitter owns its files) + `generateProjectShell` (→ the `app` node) — a CERTIFIED
attribution from the emitters themselves, NOT a path heuristic. A new pure `generator/src/map/impact-nodes.ts`
(+ a new CLI driver `impact-nodes.ts`, NEW FILES ONLY, the Day-65 shape) computes, for a `{ current, proposed }`
pair, the impacted node ids from `previewImpact`'s changed files under that certified attribution (each
changed file → its owning `entity:X` or `app`, ∩ the proposed diagram's ids), plus added relationship edges
from the DECLARED-model diff — emitted as JSON, deterministic, read-only. The honest granularity boundary is
stated: we highlight the entity + app nodes (+ added edges) — certified — and deliberately NOT the per-
lifecycle-layer nodes (files aren't layer-tagged; per-layer would need a heuristic — the forbidden path). A
new thin `impact_nodes` Rust command (mirrors `flow_svg`) surfaces it; the shell's "Preview impact" gains a
class-toggle highlight on the Day-65 `data-node-id`/`data-from|to` hooks (add/change/delete styling) — JS
ONLY PAINTS (it receives the impacted ids as data; the engine decides what is impacted; the certified text
delta stays visible). A new non-hash PART 1z (mirroring 1w/1y) proves it: (A) DETERMINISTIC — the impacted
set byte-identical twice + across a fresh process; (B1) CERTIFIED ATTRIBUTION — every `buildFileSet(proposed)`
relPath owned by exactly one node (total + disjoint), so the attribution is the emitters' not a heuristic;
(B2) FAITHFUL — for the Day-64 previewed==real pair (add a field to Ticket) the impacted set is EXACTLY the
owners of the real changed files (no phantom, no missing), with `entity:Ticket` highlighted (the sensation);
(C) EMPTY BYPASS — an identical pair ⇒ zero highlights. NON-HASH ⇒ 103 stays 103; the OK count grows. New
files only ⇒ the 103 baked + 10 + MAXIMAL `366e19d9…` byte-identical (proven from clean); PART 1w/1x/1y
unchanged; `deps {}`; `cargo check` + the self-test lockstep (the bundled node still reproduces the 103
digests; the sync-gen stamp may change for the new dist entry — a payload-tracking change, not a hash move).
Honest: the module + CLI + command + highlight + PART 1z + `node --check` + a static preview HERE; the live
packaged GUI highlight DEFERRED to Leela's machine; the diff Map is Day 67. No code this session — this is
the day a developer sees EXACTLY what their change will touch, before it touches it.*
