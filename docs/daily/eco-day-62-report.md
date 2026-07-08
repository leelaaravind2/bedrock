# Eco-Day 62 — REPORT: THE WIZARD DATA MODEL — entities / fields / relationships

**Day 62 — the sensation push (Days 61–70).** Day 61's settings-only wizard gains a **data model**: the
user defines **entities** with **fields** and **relationships**, appended to `BlueprintChoices.entities` —
turning the project shell into a real app with the user's own data. **SHELL/UI ONLY over the certified
engine — a THIN CLIENT: no generation logic in JS. The engine already accepts this exact shape.**

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked digests + 10 TeamTracker + non-hash (PART 1c–1x), MAXIMAL `366e19d9…` — no
frozen hash moved.** `git status` → only `desktop/` (shell UI) + docs; **`generator/` untouched**; generator
`deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. The extended pure serializer (DC-1, thin client)

[`wizard-choices.js`](../../desktop/src/wizard-choices.js) — `buildBlueprintChoices` now appends
`entities`, still **pure + DOM-free** (no `assembleBlueprint`/`buildFileSet` — those stay in the Node
engine):

- **`FIELD_TYPES`** = the **real 8** (from the postgres codegen switch): `String · Text · Integer · Long ·
  Decimal · Boolean · Date · DateTime`. `RELATIONSHIP_KINDS` = `belongs-to · has-many`.
- **`toFieldSpec`** omits default-valued keys (`required`/`unique` only when true); **Decimal** → `validation:
  { precision, scale }` only when set (omitted ⇒ the engine's money defaults 19/4, Day 27).
- **`toEntitySpec`** omits `relationships` when none; **`has-many` is carried through EXPLICITLY** — whatever
  the user collected, never inferred from a `belongs-to`.
- **`buildBlueprintChoices`**: `{ settings }` + `entities` **only when present**. **No entities ⇒ `entities`
  OMITTED ⇒ the Day-61 settings-only shell is a LITERAL BYPASS** — verified: `buildBlueprintChoices({…,
  entities: []})` deep-equals `{ settings }` (no `entities` key), byte-identical to Day 61.
- **`TEAMTRACKER_EXAMPLE`** — the certified TeamTracker as a wizard-shaped preset (pure data, like the
  Day-61 templates) — the visible tie to the PART-1d baseline.

## 2. The data-model UI (DC-2)

[`index.html`](../../desktop/src/index.html) + [`main.js`](../../desktop/src/main.js) — a dynamic **"Data
model"** step (step 7 of 8, before Review), built with programmatic DOM (add/remove with live model
updates):
- **Entities:** "+ Add entity" / "remove entity"; each a card with a name input.
- **Fields (per entity):** "+ field" — name + a **type `<select>` (the 8 real types)** + required/unique
  checkboxes; **type = Decimal reveals precision + scale inputs** (placeholders 19 / 4 → `validation`).
- **Relationships (per entity):** "+ relationship" — kind `<select>` (belongs-to / has-many) + a target
  `<select>` of **declared entity names** (belongs-to → **earlier** entities, mirroring the engine's order
  rule; has-many → any other). **has-many is only ever added by an explicit user choice.**
- **"Load TeamTracker example"** pre-fills the 4 related entities (pure data).
- **Review** shows the full `BlueprintChoices` incl. `entities` + an entity count; **Generate ▸** →
  `invoke('export_project', { targetDir, model })` — the **same** Day-61 wiring (no new command).
- **THIN CLIENT:** the UI only collects data into `sel.entities` and hands it to the pure serializer — no
  validation that reimplements the engine (the engine enforces order/validity). No generation logic in JS.

## 3. UI == CLI WITH ENTITIES (DC-3, load-bearing) — byte-identical, incl. the certified TeamTracker

A headless proof (`node`, importing the **real** `wizard-choices.js` + the **real** certified engine):

```
OK  TeamTracker  — wizard == CERTIFIED buildTeamTrackerModel (PART 1d), byte-identical (63 files, 9e01210c55a5…)
OK  Decimal      — validation{precision:12,scale:2} → NUMERIC(12, 2) in output; wizard==CLI byte-identical (24 files)
OK  has-many     — explicit has-many carried through; engine accepts; wizard==CLI byte-identical (33 files)
UI==CLI WITH ENTITIES: PASS (3/3) — the wizard reproduces the certified TeamTracker + handles decimal +
explicit has-many. Not a 2nd construction path.
```

- **(a) TeamTracker — the killer tie:** the wizard's TeamTracker choices → `assembleBlueprint` →
  `buildFileSet` is **byte-identical (63 files) to the certified `buildTeamTrackerModel`** — the *source*
  of the 10 frozen PART-1d relationship baselines. The wizard reproduces a certified relationship structure
  exactly.
- **(b) Decimal:** the wizard's `Decimal` field with precision/scale → `validation: { precision: 12, scale:
  2 }` → **`NUMERIC(12, 2)`** in the generated SQL (grep-confirmed); wizard==CLI byte-identical.
- **(c) has-many:** the wizard's explicit `has-many` is carried into the choices (deep-equal), the engine
  accepts it, wizard==CLI byte-identical — **collected, not auto-inferred** (Day 25).

**The wizard is another producer of the SAME `assembleBlueprint` seam — not a second construction path**,
now with the full data model.

## 4. Generation untouched (DC-4) + the thin-client invariant

- **Backstop byte-identical (from clean):** 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9deda1caf`.
- **The no-entities bypass byte-identical:** `buildBlueprintChoices` with `entities: []` / omitted ⇒ `{
  settings }` only (Day-61 shape) — asserted deep-equal.
- **git scope:** only `desktop/src/index.html`, `desktop/src/main.js`, `desktop/src/wizard-choices.js` +
  docs. **`generator/` untouched.** **`deps {}`**; **no AI** (ADR-001).
- **Thin client:** the serializer is pure data assembly; `main.js` only collects + invokes the existing
  command + renders. No generation logic in JS.

## 5. Verification + the honest split (DC-5)

**Verified HERE:**
- `node --check` on both modules — syntax OK.
- The **headless UI==CLI proof** (§3) — 3/3, byte-identical (TeamTracker tied to the certified baseline).
- **Static browser preview** (`python -m http.server` over `desktop/src`): the ES module loaded with **zero
  console errors**; the **Data model step** renders (step 7 of 8); the **TeamTracker preset loads 4
  entities** (Team/Application/Ticket/Comment); **add entity works**; **type = Decimal reveals
  precision/scale inputs**; the **Review shows the full BlueprintChoices with entities** (Ticket's 2
  belongs-to, code unique, body Text+required — the exact certified shape, defaults omitted).

**DEFERRED (Leela's Windows machine — honest-manual):**
- The **live packaged GUI generate** — clicking through the data model in the running Bedrock window →
  `invoke('export_project')` → a real project on disk. Needs the Tauri WebView + backend (no GUI session
  here). **No claimed live wizard run.**

## 6. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **Wizard data model** (entities/fields/relationships, UI==CLI incl. certified TeamTracker + decimal + explicit has-many) | **DONE (build-here)** |
| 1 | **Day 63 — the linked project view** — flow-map + impact + export on the wizard's FULL blueprint (now with entities, the maps are meaningful) | NEXT |
| 2 | **Days 64–66 — the visual/interactive Map** (the sensation) | Phase B |
| 3 | **Live packaged GUI wizard generate** | Leela's Windows machine (honest-manual) |
| 4 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 62 added the data model to the wizard — entities/fields/relationships, SHELL/UI over the certified
engine. The pure serializer `buildBlueprintChoices` (`wizard-choices.js`) now appends `entities` as minimal
`EntitySpec[]` (default-valued keys omitted; the real 8-type field enum; Decimal precision/scale →
`validation`; has-many carried EXPLICITLY, never inferred) — no entities ⇒ `entities` omitted ⇒ the Day-61
settings-only bypass byte-identical (asserted). A dynamic "Data model" step (add/remove entities → fields
[type dropdown of the 8; Decimal reveals precision/scale] → relationships [belongs-to/has-many, target = a
declared entity, belongs-to restricted to earlier entities mirroring the engine rule]) collects the data +
a "Load TeamTracker example" preset; Generate drives the SAME existing `export_project` via `--model` (no
new command, no generation logic in JS). UI==CLI with entities is proven headlessly and byte-identical
(3/3): the wizard's TeamTracker == the CERTIFIED `buildTeamTrackerModel` (the PART-1d source) byte-for-byte
via `buildFileSet` (63 files), a Decimal field → `NUMERIC(12, 2)` in real output, and an explicit has-many
carried through — the wizard is another producer of the SAME `assembleBlueprint` seam, not a second
construction path. Generation untouched: the frozen backstop byte-identical from clean (194 OK / 0 FAIL,
103 baked, MAXIMAL `366e19d9…`), git only `desktop/` + docs, `generator/` untouched, `deps {}`, no AI
(ADR-001). Verified HERE: `node --check` + the headless UI==CLI (with entities) + a static preview (the
data-model step, add entity, the Decimal reveal, the TeamTracker preset, the review-with-entities, zero
console errors); the live packaged GUI generate DEFERRED to Leela's Windows machine (no claimed live run).
Day 63 picks up the linked project view — the flow-map + impact + export on the wizard's FULL blueprint,
now meaningful with entities.*
