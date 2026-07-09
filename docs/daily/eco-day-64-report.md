# Eco-Day 64 — REPORT: THE LINKED PROJECT VIEW — flow map + impact preview on the user's OWN blueprint

**Day 64 — the sensation push (Days 61–70).** The maps now run on the user's **saved/loaded blueprint** —
including **the impact of the user's pending edit**: load a project, change something, and see **exactly
which files that change will affect, before generating**. This is the first moment Bedrock shows a
developer something no AI tool can — *the preview is a function of the input, byte-for-byte.* **SHELL/UI
ONLY over the certified engine — a THIN CLIENT; the engine computes the maps, JS renders stdout verbatim.**

**A PURE thin-client JS day: NO new command, NO Rust change** (all three surfaces already accept `--model`).

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked + 10 TeamTracker + non-hash (PART 1c–1x), MAXIMAL `366e19d9…` — no frozen hash
moved.** `git status` → only `desktop/src/{index.html, main.js}` + docs; **`generator/` untouched; no Rust
change (Cargo.toml unmodified)**; generator `deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. The confirmed `--model` contracts (read live — no new command, no Rust change)

| Command | `--model` shape | Notes |
|---|---|---|
| `flow_map` → `flow-map.js` | a **single** `BlueprintChoices` | projects the declared model (Day 50). |
| `impact_preview` → `map.js` | a **`{ current, proposed }` PAIR** | each `assembleBlueprint`-ed → `previewImpact` (Day 47). |
| `export_project` → `export.js` | a **single** `BlueprintChoices` | Day 61. |

- **When `--model` is supplied, the backend rides each blueprint's `settings.backend`** — the UI passes
  **only `model`**, never `backend`.
- All three already accept `--model` → **Day 64 changed only 2 JS files** (`index.html`, `main.js`).

## 2. The project view (DC-1) + the honest pair (DC-2, load-bearing)

A **"Project view — maps & impact"** card ([`index.html`](../../desktop/src/index.html)) operating on the
current wizard blueprint ([`main.js`](../../desktop/src/main.js)):

- **View flow map** → `invoke('flow_map', { model: JSON.stringify(buildBlueprintChoices(selections)) })` →
  renders the certified `renderFlowMap` text (the user's OWN entities/lifecycle/graph).
- **Preview impact of edits** → `invoke('impact_preview', { model: JSON.stringify({ current: baselineChoices,
  proposed: buildBlueprintChoices(selections) }) })` → renders the certified `renderImpact` delta.
- **Generate / Export** → `export_project` (Review, Day 61).

**The honest pair (DC-2):**
- **`baselineChoices`** = the **last SAVED or LOADED** blueprint — set (as an immutable snapshot) in the
  Day-63 `saveProject` / `loadProject` handlers, with a label (`#N (saved)` / `#N (loaded)`).
- **`proposed`** = the wizard's **current** `buildBlueprintChoices(selections)`.
- **The compelling flow:** load a saved project → edit the data model → **Preview impact** → the exact
  delta of *that edit*.
- **No baseline yet ⇒ an honest hint** ("Save or load a project first…") — **never a fabricated baseline**
  (verified in the static preview).

**THIN CLIENT (load-bearing):** the UI builds the `{ current, proposed }` **pair object — pure data (two
`BlueprintChoices`, NO diff)** — and renders the command's **stdout VERBATIM**. `previewImpact` (the
engine) computes the delta; there is **no JS-computed diff** (which would break the PART-1w previewed==real
guarantee).

## 3. UI == CLI + PREVIEWED == REAL (DC-3, load-bearing)

A headless proof (`node`, importing the real wizard serializer + the real certified engine):

- **(a) flow_map on the wizard's TeamTracker** — stdout **twice-identical** (deterministic), reflects the
  **DECLARED** entities (Team/Application/Ticket/Comment + their belongs-to edges) — a **projection of the
  declared model, not parsed from code** (Day 50) — and UI==CLI (drives the wizard's own blueprint).
- **(b) THE STAR — impact PREVIEWED == REAL for a wizard edit**, tied to actual on-disk export:

  ```
  impact PREVIEWED == REAL — previewed {add:0, change:4, delete:0} == the real on-disk export delta,
  byte-exact (add-severity-to-Ticket)
  ```

  The pair `{ current: TeamTracker, proposed: TeamTracker + a new `severity` field on Ticket }` →
  `previewImpact` predicts **4 changed files**; exporting BOTH blueprints to disk and diffing the real
  trees yields **the identical changed-file SET**, and every previewed `before`/`after` is **byte-exact to
  the actual on-disk export bytes**. **The previewed impact of the user's edit is EXACTLY what generation
  does** — the PART-1w guarantee, now for the wizard's own pair. (Reused `previewImpact` + real
  `export.js`; the diff logic was not reinvented.)

## 4. Generation untouched (DC-4) + the thin-client invariant

- **Backstop byte-identical (from clean):** 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9deda1caf`.
- **git scope:** only `desktop/src/index.html` + `desktop/src/main.js` + docs. **`generator/` untouched;
  NO Rust change (Cargo.toml unmodified);** generator `deps {}`.
- **Thin client:** the UI passes blueprints as `--model` to the existing certified commands and renders
  stdout verbatim — **no generation logic, no JS-computed diff.**

## 5. Verification + the honest split (DC-5)

**Verified HERE:** the headless UI==CLI/previewed==real proof (§3); `node --check` on both JS modules; a
**static browser preview** — zero console errors, the **Project view card** renders, both buttons bind, the
**no-baseline hint fires** ("Preview impact — needs a baseline" — no fabricated baseline), and **View flow
map hits the no-backend guard** cleanly (env-error, no crash).

**DEFERRED (Leela's Windows machine — honest-manual):** the **live packaged GUI click-through** — loading
a project, clicking "View flow map" / "Preview impact" in the running Bedrock window and seeing the engine's
map/delta rendered. Needs the Tauri backend (no GUI session here). **No claimed live run.**

**TEXT maps this day** — the flow map + impact are the certified engine's **text** output; the **visual
drawn diagram is Days 65–67** (stated, not overclaimed).

## 6. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **Linked project view** (flow map + impact on the user's blueprint; previewed==real for the wizard's edit) | **DONE (build-here)** |
| 1 | **Day 65 — the visual Map** — the drawn diagram (deterministic layout, a new non-hash PART) | NEXT |
| 2 | **Days 66–67 — the interactive impact Map + the diff Map** (the sensation) | Phase B |
| 3 | **Live packaged GUI click-through** (maps + impact in the running app) | Leela's Windows machine |
| 4 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 64 wired the linked project view — the maps run on the USER'S blueprint, SHELL/UI over the certified
engine. Confirmed contracts (read live): `impact_preview` takes `--model` = a `{ current, proposed }`
BlueprintChoices PAIR, `flow_map`/`export_project` a single BlueprintChoices — all already accept `--model`,
so NO new command and NO Rust change (a pure thin-client JS day; only `index.html` + `main.js` changed; the
backend rides each blueprint's `settings.backend`). A "Project view" card runs, on the current wizard
blueprint: View flow map (`flow_map`, model = the blueprint → the user's own entity-graph/lifecycle) and
Preview impact (`impact_preview`, model = `{ current: the last saved/loaded baseline, proposed: the edited
blueprint }` → exactly which files the edit changes); the baseline is set on the Day-63 save/load (an
immutable snapshot, never fabricated — no baseline ⇒ an honest hint). The UI builds the pair JSON (pure
data — two BlueprintChoices, NO diff) and renders the command's stdout VERBATIM — the engine computes the
delta (`previewImpact`); a JS-computed diff would break the PART-1w previewed==real guarantee. The
load-bearing proof is headless: (a) flow_map on the wizard's TeamTracker is deterministic + a faithful
projection of the declared entities + UI==CLI; (b) impact PREVIEWED == REAL for a real edit (add a
`severity` field to Ticket) — `previewImpact` predicts 4 changed files, and exporting both blueprints to
disk and diffing the real trees yields the identical changed-file SET with byte-exact before/after (tied to
the actual on-disk export — the PART-1w guarantee for the wizard's own pair). Generation untouched: no
generator source change, no Rust change (Cargo.toml unmodified), the frozen backstop byte-identical (194 OK
/ 0 FAIL, 103 baked, MAXIMAL `366e19d9…`), git only `desktop/` + docs, generator `deps {}`, no AI
(ADR-001). Verified HERE: the headless proof + `node --check` + a static preview (the Project view card,
the no-baseline hint, the no-backend guard, zero console errors); the live packaged GUI click-through
DEFERRED to Leela's Windows machine (no claimed live run); TEXT maps this day — the visual drawn diagram is
Days 65–67. Day 65 picks up the visual Map — the drawn diagram with a deterministic layout.*
