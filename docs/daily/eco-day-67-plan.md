# Eco-Day 67 — PLAN: THE DIFF MAP — compare two SAVED blueprints

**Day 67 — the sensation push (Days 61–70).** Days 64/66 diff **baseline-vs-current-edits**; Day 67 diffs
**two SAVED versions**: "here's my project at A, here's it at B, here's exactly the delta" — making Bedrock
a tool you **PLAN with**, not just generate from. **It is the SAME certified pair machinery (impact_preview
+ impact_nodes + flow_svg, PART 1w/1z already prove it) pointed at two blueprints loaded from the Day-63
store.** Expected shape: a **PURE THIN-CLIENT JS day** — no new command, no new generator file, no new PART,
no Rust change.

**This session is PLAN ONLY. No code, no builds.**

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. THE CONFIRMATION — the pair contract works UNCHANGED with two full blueprints (no gap)

Confirmed live (`impact-nodes.js --model '{ "current": A, "proposed": B }'` with two full blueprints):
- **`{A, B}`** (add `severity` to Ticket) → `{"nodes":[{"id":"app","action":"change"},{"id":"entity:Ticket","action":"change"}],"edges":[]}` — the certified delta (same as Day 66).
- **`{A, A}`** (empty bypass) → `{"nodes":[],"edges":[]}`.
- **Deleted-in-B** (A has Ticket, B removes it) → `{"nodes":[{"id":"app","action":"change"}],"edges":[]}` —
  **`entity:Ticket` is absent** (B's diagram has no Ticket node → NO ghost; the deletion surfaces in the
  text delta).

**→ The existing surfaces suffice with two loaded blueprints as the pair. NO new engine, NO new command,
NO new generator file, NO new PART, NO Rust change.** The store already provides `list_blueprints` →
`[{id, name, created_at}]` and `load_blueprint(id)` → the raw BlueprintChoices JSON (lossless, Day 63); the
shell (`main.js`) already has `paintImpact`/`clearImpactHighlight` (Day 66) and `viewDiagram` (Day 65). Day
67 is **pure thin-client wiring.**

---

## 1. THE COMPARE UI (DC-1) — pick A + B from the store → text delta + B's diagram painted

A new **"Compare versions"** card in the left column (beside "My projects"), driven by `list_blueprints`:
- Two `<select>` — **A (from / older)** and **B (to / newer)** — each populated with the saved projects
  (`name · #id · created_at`). Populated on load + after each save (reuse `refreshProjects`'s data).
- A **"Compare A → B"** button → `compareVersions(idA, idB)`:
  1. `load_blueprint(idA)` → A (`JSON.parse`); `load_blueprint(idB)` → B. **Both are REAL loaded
     blueprints** (the Day-63 round-trip is lossless + non-mutating — a loaded blueprint generates
     identically to what was saved; never fabricate/reconstruct a version).
  2. **Warn (not restrict)** if `A.settings.backend !== B.settings.backend` or `A.settings.projectType !==
     B.settings.projectType` — a UI note ("A and B use different backends/project types — the delta will be
     large; comparing versions of the same project is the typical use"). *Reading two settings values is
     not a delta computation.* Allow it: the pair contract + `previewImpact` are backend-agnostic and
     correct for any pair (a backend change is a legitimate proposed change — `impact-map.ts`); restricting
     would be the shell deciding validity the engine already handles.
  3. `impact_preview({ current: A, proposed: B })` → the certified **TEXT delta** (rendered; stays visible).
  4. `flow_svg(B)` → inject **B's diagram** (the target/newer version — the delta shows what changed to
     reach B; consistent with Day 66's proposed diagram).
  5. `impact_nodes({ current: A, proposed: B })` → `{ nodes, edges }` → **`paintImpact`** toggles the Day-66
     classes on B's certified SVG (`clearImpactHighlight` first).
- **The compare card coexists** with the Project-view "Preview impact" (baseline-vs-edits): both drive the
  same certified surfaces; the compare card just sources the pair from **two saved versions** instead of
  baseline+edits.

### 1.1 Which diagram is drawn — B (state why)
**B (proposed/newer).** The delta highlights *what changed to GET to B*; B is the target you're moving
toward. A deleted-in-B entity has no node in B's diagram (§2) — surfaced in the text delta, never ghosted.

---

## 2. THE HONEST EDGE CASES (DC-4)

- **Deleted-in-B entity (proven, no ghost):** an entity in A but absent from B has **no node in B's
  diagram**, so `impact_nodes` never returns it (confirmed: the deleted-Ticket case → only `app`). Its
  removal appears in the **`impact_preview` TEXT delta** (the engine's `delete` / "no-longer-generated"
  entries). The compare card carries a **STATIC honest note**: *"Entities removed in B appear in the text
  delta below, not the diagram (B has no node for a removed entity)."* **No ghost node, not silently
  dropped, and NO JS-computed diff** — the deletion is the engine's text-delta output; the note is
  always-true guidance.
- **Different backend / project type:** **ALLOWED + WARNED** (§1 step 2) — the engine computes the
  (large) delta truthfully; the warning is UX guidance, not a gate.
- **A vs A (compare a version with itself):** the **empty bypass** — zero impacted nodes/edges + a no-op
  text delta (confirmed `{A,A}` → `[]`). An honest "no changes between these versions."
- **A and B swapped:** the diff is directional (A→B); swapping shows the reverse delta (adds become
  deletes). Honest — the UI labels A "from" and B "to".

---

## 3. THE HEADLESS PROOF (DC-3) — the certified delta, on saved-and-loaded blueprints

Provable HERE (no GUI; **reuses the existing certified surfaces + the Day-63 round-trip — no new PART**,
because the diff Map adds **no new engine behavior**; PART 1w/1z already prove the pair machinery):

- **The pair drives the certified delta:** `impact_nodes`/`impact_preview` on `{ current: A, proposed: B }`
  (two full blueprints) == the certified delta (confirmed §0). Assert the impacted set for a known pair.
- **The store round-trip is lossless (Day-63):** `save_blueprint(A)` → `load_blueprint` → **byte-identical**
  A (proven Day 63 — the SQLite TEXT round-trip returns the canonical JSON verbatim). So `load_blueprint`'s
  A/B == the saved A/B ⇒ the diff is on the **real saved versions**, not a reconstruction. Re-confirm the
  round-trip (the existing `cargo test` / the store JSON check) and note the diff Map inherits it.
- **The empty bypass:** `impact_nodes({A, A})` → zero nodes/edges (confirmed §0).
- **The deleted-in-B honesty:** `impact_nodes({A, Bdel})` → the deleted entity's node is **absent** (no
  ghost); `impact_preview` shows its files as `delete` (confirmed §0).

**No new PART is warranted** — the diff Map is the proven pair machinery on two loaded blueprints. (If
execution surprisingly needs new engine behavior: STOP, and use the Day-65/66 NEW-FILES-ONLY shape + a
flagged proof + the backstop byte-identical. Not expected.)

---

## 4. THE SPINE — shell-only; the certified delta; the store's real versions; honest

1. **SHELL-ONLY:** reuse `impact_preview` / `impact_nodes` / `flow_svg` with the pair = `{ current: A,
   proposed: B }` (two loaded blueprints). **No new engine, command, generator file, or PART; no Rust
   change.**
2. **THE DELTA IS THE CERTIFIED DELTA:** the text delta + the impacted ids come from the ENGINE
   (`previewImpact`/`impactedNodes`). **JS ONLY PAINTS.** No JS-computed diff, path heuristic, or
   re-derivation (a FINDING).
3. **THE BLUEPRINTS ARE THE STORE'S:** A and B are REAL loaded blueprints (Day-63 lossless round-trip) —
   never fabricated/reconstructed.
4. **THE DELETED-ENTITY HONESTY:** no ghost node; surfaced in the text delta + a static note.
5. **THE SAME GRANULARITY BOUNDARY as Day 66:** entity + app nodes + added/removed relationship edges
   (certifiable); **NO per-lifecycle-layer highlight** (uncertifiable — don't add it to look impressive).
6. **GENERATION UNTOUCHED:** the 103 baked + 10 + MAXIMAL `366e19d9…` byte-identical; PART 1w/1x/1y/1z
   unchanged; `deps {}`. **A moved BAKED hash = FINDING, STOP.** *(No generator/Rust change ⇒ the backstop
   is untouched by construction; proven anyway.)*
7. **HONEST:** the compare UI + the headless proof + `node --check` + a static preview HERE; the **live
   packaged GUI compare DEFERRED** to Leela's machine.

### The generation-untouched proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → 203 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` byte-identical;
  PART 1w/1x/1y/1z unchanged.
- `git status --short` → only `desktop/src/` (the compare UI) + docs; **no `generator/` source, no Rust
  change** (Cargo.toml + `src-tauri/` unmodified); `deps {}`. *(If Rust is untouched, `cargo check` is
  unnecessary — state it plainly.)*

---

## 5. EXECUTE done-conditions

1. **THE COMPARE UI:** a "Compare versions" card — pick A + B from `list_blueprints` → `load_blueprint`
   both → `impact_preview` (text delta) + `impact_nodes` (impacted ids) + `flow_svg` on **B** (diagram) →
   `paintImpact` the delta on B's diagram (the Day-66 class toggle). The certified text delta stays visible.
2. **NO NEW ENGINE (verify):** the existing commands + the `{ current, proposed }` pair suffice — **no new
   command/file/PART/Rust change** (confirmed §0). *(If a genuine gap appeared: NEW FILES ONLY + flagged +
   backstop byte-identical — not expected.)*
3. **THE HEADLESS PROOF:** two blueprints through `impact_preview`/`impact_nodes` produce the certified
   delta; the store round-trip is lossless (loaded == saved, Day-63); `{A, A}` ⇒ empty bypass;
   deleted-in-B ⇒ no ghost node (+ the delete in the text delta).
4. **THE HONEST EDGE CASES:** deleted-in-B surfaced in the text delta + a static note (no ghost, not
   dropped); different-backend/type allowed + warned; A-vs-A empty; direction (A→B) labeled.
5. **GENERATION UNTOUCHED:** 103 baked + 10 + MAXIMAL byte-identical (from clean); PART 1w/1x/1y/1z
   unchanged; git only `desktop/src/` + docs; no generator source; **no Rust change** (stated); `deps {}`.
   **A moved BAKED hash = FINDING, STOP.**
6. **Honest:** the compare UI + the headless proof + `node --check` + static preview HERE; the live
   packaged GUI compare DEFERRED (Leela's machine); the same granularity boundary as Day 66 restated.

## 6. REPORT done-conditions

`eco-day-67-report.md`: the compare UI (pick A + B from the store → text delta + impacted ids + B's diagram
painted); **whether any new engine/command/file/PART was needed (expected: NONE — state it plainly, the
diff Map is the proven pair machinery on two loaded blueprints)**; the headless proof (saved-and-loaded
pair → the certified delta; the Day-63 lossless round-trip; A-vs-A empty bypass; deleted-in-B no-ghost);
the honest edge cases (deleted-in-B in the text delta + note; different-backend allowed+warned); the
generation-untouched proof (103 baked + MAXIMAL byte-identical; PART 1w/1x/1y/1z unchanged; no Rust change;
`deps {}`); the granularity boundary restated (entity/app/edges — no per-layer); JS only paints; honest
build-here vs deferred. **Forward-flags:** Day 68 = trust polish (friendly errors + the visible determinism
"Verify" proof) + the standalone-export experience (Law 21 as a felt feature); the punch-list.

---

## 7. SCOPE GUARD — OUT

- **NOT** the trust polish / export experience (Day 68).
- The delta is the **CERTIFIED delta** (`previewImpact` / `impactedNodes`) — a JS-computed diff, path
  heuristic, or re-derivation = a **FINDING**. The shell **ONLY PAINTS**.
- The **SAME granularity boundary** as Day 66 (entity + app + relationship edges; **NO per-lifecycle-layer
  highlight** — do not add it to look impressive).
- **A and B are REAL loaded blueprints** from the store (never fabricated/reconstructed).
- A **deleted-in-B entity gets NO ghost node** — surface it in the text delta + a static note, honestly.
- **PREFER no new engine/command/generator file/PART** (if genuinely needed: NEW FILES ONLY, flagged,
  backstop proven — not expected).
- The **103 baked + 10 + MAXIMAL byte-identical** (a move = FINDING, STOP); PART 1w/1x/1y/1z untouched;
  `deps {}`.
- The **live packaged GUI compare is Leela's-machine** (honest — no claimed live run). **No AI** (ADR-001).

## 8. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-66/65/64/63 reports + the real code (`main.js` the store +
   paint wiring, `store_commands.rs`, `commands.rs` the pair shapes) + confirmed the pair contract works
   with two full blueprints — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; Day 67 is shell-only (no
   generator/Rust change) — moves nothing; proven anyway — **understood**.
4. AI touchpoints: **none** — the delta is the AI-free certified projection (ADR-001) — **yes**.
5. The default/empty path a literal bypass: A-vs-A ⇒ zero (the empty bypass, confirmed); no existing output
   changed — **honored**.
6. The three determinism killers: N/A (no generator output touched — shell-only; the engine surfaces are
   unchanged + proven) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` (103+10+MAXIMAL + PART 1w/1x/1y/1z) + the
   headless proof + `git status`; a moved hash / a ghost node / a JS diff = STOP — **yes**.
8. Overclaim / out-of-scope watch: no new engine claimed (verify none needed); no JS diff; no ghost node;
   no per-layer highlight; no live GUI run claimed — **guarded**.

---

*Day 67 plan: the diff Map — compare two SAVED blueprints. Confirmed live that the `{ current, proposed }`
pair contract works UNCHANGED with two full blueprints (`{A,B}` → the certified delta `[app,
entity:Ticket]`; `{A,A}` → empty; deleted-in-B → `[app]` only, `entity:Ticket` ABSENT — no ghost, the
deletion in the text delta) — so Day 67 is a PURE THIN-CLIENT JS day: NO new engine, command, generator
file, PART, or Rust change. A new "Compare versions" card picks A (from) + B (to) from `list_blueprints`,
loads both via `load_blueprint` (REAL blueprints — the Day-63 round-trip is lossless + non-mutating, never
fabricated), and drives the ALREADY-PROVEN certified surfaces on the pair: `impact_preview` (the text
delta, stays visible) + `flow_svg` on B (the target/newer diagram) + `impact_nodes` (the impacted ids) →
`paintImpact` toggles the Day-66 classes on B's certified SVG. JS ONLY PAINTS — the engine computes the
delta (`previewImpact`/`impactedNodes`, PART 1w/1z); a JS-computed diff/heuristic/re-derivation = a FINDING.
The same honest granularity boundary as Day 66 (entity + app + relationship edges; NO per-lifecycle-layer
highlight). Honest edge cases: a deleted-in-B entity has no node in B's diagram (surfaced in the text delta
+ a static note — no ghost, not silently dropped, no JS diff); different backend/project type is
ALLOWED + WARNED (the engine handles any pair truthfully; restricting would be the shell overriding the
engine); A-vs-A is the empty bypass; the diff is directional (A→B, labeled). The headless proof reuses the
existing surfaces + the Day-63 lossless round-trip (loaded == saved ⇒ the diff is on the real versions) —
no new PART, because the diff Map adds no new engine behavior. Generation untouched: the 103 baked + 10 +
MAXIMAL `366e19d9…` byte-identical, PART 1w/1x/1y/1z unchanged, no generator source, no Rust change
(Cargo.toml + `src-tauri/` unmodified), `deps {}`. Honest: the compare UI + the headless proof + `node
--check` + a static preview HERE; the live packaged GUI compare DEFERRED to Leela's machine. No code this
session — this is the day Bedrock becomes a tool you PLAN with: two saved versions, the exact certified
delta between them, visual + text.*
