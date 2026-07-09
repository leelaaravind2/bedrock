# Eco-Day 67 — REPORT: THE DIFF MAP — compare two SAVED blueprints

**Day 67 — the sensation push (Days 61–70).** Bedrock becomes a tool you **PLAN with**: pick two saved
versions — **A (from)** and **B (to)** — and see the **exact certified delta** between them, visual + text.
It is the **SAME already-proven pair machinery** (`impact_preview` + `impact_nodes`, PART 1w/1z) + `flow_svg`,
pointed at **two blueprints loaded from the Day-63 store**. **A pure thin-client JS day — no new engine,
command, generator file, PART, or Rust change.** The ENGINE computes the delta; **JS only paints.**

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
203 OK / 0 FAIL, 103 baked digests + 10 TeamTracker + non-hash (PART 1c–1z), MAXIMAL `366e19d9…` — no
frozen hash moved; PART 1w/1x/1y/1z unchanged.** `git status` → only `desktop/src/` + docs. **No generator
source, no Rust change** (`src-tauri/` unmodified → `cargo check` unneeded). Generator `deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. The compare UI (DC-1) — pick A + B from the store → text delta + B's diagram painted

A new **"Compare versions"** card ([`index.html`](../../desktop/src/index.html) +
[`main.js`](../../desktop/src/main.js)):
- Two `<select>` — **A (from)** and **B (to)** — populated by `list_blueprints` (`name · #id · created_at`),
  refreshed on load + after each save. Directional, labeled.
- **"Compare A → B"** → `compareVersions(idA, idB)`:
  1. `load_blueprint(idA)` + `load_blueprint(idB)` → two **REAL** BlueprintChoices (the Day-63 round-trip is
     lossless + non-mutating — never fabricated/reconstructed).
  2. `impact_preview({ current: A, proposed: B })` → the certified **TEXT delta** (rendered verbatim, stays
     visible).
  3. `flow_svg(B)` → inject **B's** certified diagram.
  4. `impact_nodes({ current: A, proposed: B })` → **`paintImpact`** toggles the Day-66 classes on B's SVG
     (`clearImpactHighlight` first).
- **Coexists** with the Day-64/66 baseline-vs-edits flow (unchanged).

### Why B's diagram is drawn
**B (proposed/newer)** — the delta highlights *what changed to reach B*; B is the target. A deleted-in-B
entity has no node in B's diagram (§2) — surfaced in the text delta, never ghosted. (Consistent with Day
66's proposed diagram.)

## 2. NO new engine / command / file / PART / Rust change (DC-1/DC-2)

Confirmed live (in the plan session and re-confirmed here) that the `{ current, proposed }` pair contract
works **unchanged** with two full blueprints. **The diff Map adds no new engine behavior** — so **no
ceremonial PART was added**: PART 1w (previewed==real) + PART 1z (deterministic + total/disjoint attribution
+ faithful + empty bypass) + the Day-63 lossless round-trip already cover it. **`cargo check` unneeded — no
Rust was touched** (stated plainly, not run for show).

## 3. The headless proof (DC-2, load-bearing)

Reusing the existing certified surfaces + the real Day-63 store round-trip (no new PART):

```
OK  the diff of two loaded blueprints == the certified delta: ["app","entity:Ticket"]
OK  EMPTY BYPASS: A vs A ⇒ zero impacted nodes/edges
OK  NO GHOST NODE: deleted Ticket absent from impacted (["app"]); the deletion IS in the certified TEXT delta
```
plus the **real store round-trip** (the store's own Rust test, env-bridged with a diff-map blueprint):
```
STORE ROUND-TRIP: saved A == loaded A BYTE-IDENTICAL (Day-63 lossless, re-asserted for a diff-map blueprint)
```

- **(a) The diff is on the REAL versions:** `load_blueprint` returns **byte-identical** JSON (asserted via
  the store's own test), so the pair the shell feeds == the saved A/B, and `impact_nodes`/`impact_preview`
  give the certified delta.
- **(b) EMPTY BYPASS:** A vs A ⇒ zero impacted nodes/edges.
- **(c) NO GHOST NODE:** A→Bdel (Ticket removed) ⇒ **`entity:Ticket` absent** from the impacted set (it has
  no node in B's diagram — structurally guaranteed by `impactedNodes` ∩ the proposed-diagram nodes), while
  the deletion **IS** in the certified TEXT delta.

## 4. The honest edge-case decisions + rationales (DC-4)

- **No ghost node (structurally guaranteed):** `impactedNodes` intersects with `buildFlowMap(proposed)`'s
  node ids, so an entity absent from B cannot be highlighted. The compare card carries a **STATIC,
  always-true note** ("Deleted entities appear in the text delta, not the diagram — B has no node for a
  removed entity") — **always-true guidance, NOT a JS-computed observation about this diff**, and never a
  silent drop.
- **Different backend / project type: ALLOW + WARN.** The engine answers any pair truthfully (a backend
  change is a legitimate proposed change — `impact-map.ts`); the shell reads two settings values for a UI
  warning — **not a diff computation** — and never overrides the engine. No blocking.
- **A vs A:** the empty bypass — no special-casing in JS; the engine answers "no changes."
- **Direction:** the diff is A→B, labeled from/to.

## 5. The granularity boundary (restated — NOT reintroduced per-layer)

Same as Day 66: highlight **entity nodes + the `app` node + relationship edges** (certifiable via the
emitters' attribution + the declared-model diff). **Per-lifecycle-layer nodes are NOT highlighted** —
uncertifiable without a heuristic. **We highlight what we can certify, not what would look good.**

## 6. Generation untouched (DC-3) + JS only paints

- **Backstop byte-identical (from clean):** 203 OK / 0 FAIL; 103 baked + 10 + MAXIMAL `366e19d9…`
  unchanged; **PART 1w/1x/1y/1z unchanged**.
- **`git status`:** only `desktop/src/index.html` + `desktop/src/main.js` + docs. **No generator source,
  no Rust change** (`Cargo.toml`/`src-tauri/` unmodified); `deps {}`.
- **JS only paints:** the text delta + the impacted ids come from the engine (`previewImpact` /
  `impactedNodes`); `compareVersions` reads two settings values for a warning, otherwise it invokes +
  renders + paints. **No JS-computed diff, no path heuristic, no re-derivation.**

## 7. Verification + the honest split (DC-4)

**Verified HERE:**
- `node --check` (main.js + wizard-choices.js) — OK.
- The **headless proof** (§3) — the certified delta on a loaded pair, the empty bypass, no ghost node, +
  the real store round-trip byte-identical.
- **Static browser preview:** the Compare card + both selects render (populated under the no-backend
  guard); the deleted-entity static note is present; the Compare button binds + the no-backend guard fires;
  injecting a certified SVG + a real impacted set **paints B's diagram** (`entity:Ticket` → `impact-change`,
  CSS applied — rect stroke `rgb(217,119,6)` amber) and clears; **zero console errors**.

**DEFERRED (Leela's Windows machine — honest-manual):**
- The **live packaged GUI compare** — picking two saved projects in the running Bedrock window and seeing
  B's diagram painted. **No claimed live run.**

## 8. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **The diff Map** (compare two saved blueprints; the proven pair surfaces; no ghost nodes; empty bypass) | **DONE (build-here)** |
| 1 | **Day 68 — trust polish** (friendly errors — e.g. the raw ENOENT on bad input; the visible determinism **"Verify"** proof) + **the standalone-export experience** (Law 21 as a felt feature) | NEXT |
| 2 | **Day 69 — final packaged re-certification** | Phase D |
| 3 | **Live packaged GUI compare** | Leela's Windows machine (honest-manual) |
| 4 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 67 built the diff Map — compare two SAVED blueprints. It is a PURE THIN-CLIENT JS day: the
`{ current, proposed }` pair contract works UNCHANGED with two full blueprints (confirmed live), so the diff
Map points the ALREADY-PROVEN certified surfaces (`impact_preview` + `impact_nodes`, PART 1w/1z) + `flow_svg`
at two blueprints loaded from the Day-63 store — no new engine, command, generator file, PART, or Rust
change (cargo check unneeded — no Rust touched, stated plainly). A new "Compare versions" card picks A (from)
+ B (to) from `list_blueprints`, loads both via `load_blueprint` (REAL blueprints — the Day-63 round-trip is
lossless, re-asserted byte-identical via the store's own test), and drives `impact_preview` (the text delta,
verbatim) + `flow_svg` on B (the target/newer diagram) + `impact_nodes` → `paintImpact` toggles the Day-66
classes on B's certified SVG. JS ONLY PAINTS — the engine computes the delta; a JS-computed diff/heuristic
= a FINDING. The honest edge cases: a deleted-in-B entity has NO node in B's diagram (structurally
guaranteed by `impactedNodes` ∩ the proposed-diagram nodes — proven: A→Bdel ⇒ entity:Ticket absent, the
deletion in the TEXT delta), surfaced by a STATIC always-true note (never a JS observation, never dropped);
different backend/type is ALLOW + WARN (the engine answers any pair truthfully; the shell never overrides
it); A vs A is the empty bypass. The same granularity boundary as Day 66 (entity + app + edges; NO
per-lifecycle-layer). The headless proof reused PART 1w/1z + the Day-63 round-trip (no ceremonial new PART).
Generation untouched: the 103 baked + 10 + MAXIMAL `366e19d9…` byte-identical, PART 1w/1x/1y/1z unchanged,
only `desktop/src/` + docs, no generator source, no Rust change, `deps {}`. Verified HERE: the headless
proof + `node --check` + a static preview (the Compare card + selects render, the deleted-entity note is
present, the diff paints on B's diagram with CSS applied, zero console errors); the live packaged GUI
compare DEFERRED to Leela's machine. This is the day Bedrock becomes a tool you PLAN with: two saved
versions, the exact certified delta between them.*
