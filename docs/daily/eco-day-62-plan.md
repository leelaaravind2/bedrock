# Eco-Day 62 — PLAN: THE WIZARD DATA MODEL — entities / fields / relationships

**Day 62 — the sensation push (Days 61–70).** Day 61 shipped the wizard **core** (settings-only → a real
project *shell*, UI==CLI proven). Day 62 adds the **data model**: the user defines **entities** with
**fields** and **relationships**, appended to `BlueprintChoices.entities` — turning the shell into a real
app with the user's own data. **SHELL/UI ONLY over the certified engine — a THIN CLIENT: no generation
logic in JS. The engine already accepts this exact shape** (the same the CLI/`--model` + the certified
baselines use).

**This session is PLAN ONLY. No code, no builds.** It resolves the exact Entity/Field/Relationship shape +
the field-type enum, the has-many-explicit + decimal rules, the dynamic UI, the extended pure serializer,
the UI==CLI proof (with entities), and the honest split — from the real code.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. The exact shape the wizard collects (read live this session — the plan is built on it)

From [`generator/src/core/project-model.ts`](../../generator/src/core/project-model.ts) —
`BlueprintChoices.entities: EntitySpec[]`:

```
EntitySpec       = { name, fields: FieldSpec[], relationships?: RelationshipSpec[] }
FieldSpec        = { name, type, required?, unique?, defaultValue?, validation? }
RelationshipSpec = { kind: 'belongs-to' | 'has-many', target: <entity name>, required? }
```

**The field-type enum (the REAL strings — from the postgres codegen `switch`, verbatim; the dropdown uses
these):**

| Type | Notes |
|---|---|
| `String` · `Text` · `Integer` · `Long` · `Boolean` · `Date` · `DateTime` | scalar |
| `Decimal` | money/precision — precision+scale live in **`validation: { precision, scale }`** (money-grade defaults **precision 19, scale 4**, Day 27) |

**The engine rules the wizard MUST respect (produce VALID choices — the wizard is not the source of truth,
the engine is):**
- **`belongs-to` order (engine-enforced):** a `belongs-to` `target` must be a **declared, EARLIER** entity
  — `addEntity` throws otherwise (`"belongs-to X, which must be defined earlier"`). The wizard collects
  entities in order and offers `belongs-to` targets = **earlier** entities (a UI nicety; the engine
  enforces).
- **`has-many` is EXPLICIT (Day 25):** the wizard **collects** `has-many` (a kind choice) — it **NEVER
  auto-infers** it from a `belongs-to`. Auto-inference would diverge from the certified baselines (a
  FINDING). `has-many` is the inverse view (may point forward — not order-checked); targets = any declared
  entity.
- **Relationship targets reference DECLARED entities** (by name) — the wizard offers a dropdown of the
  declared entity names, never free text.

**The certified relationship baseline to reproduce (PART 1d — 10 TeamTracker hashes):** TeamTracker =
`Team` → `Application`(belongs-to Team) → `Ticket`(belongs-to Application, Team) → `Comment`(belongs-to
Ticket), settings `Spring Boot / React / PostgreSQL / Web App / multiUser / Simple login`. A wizard-built
TeamTracker must reproduce it byte-for-byte (the killer UI==CLI proof — §3).

---

## 1. THE EXTENDED PURE SERIALIZER (DC-2 — still a thin client)

Extend [`wizard-choices.js`](../../desktop/src/wizard-choices.js) `buildBlueprintChoices(sel)` to append
`entities` — **pure field→JSON, no generation logic** (no `assembleBlueprint`, no `buildFileSet`; those
stay in the Node engine). Design:

```
FIELD_TYPES = ['String','Text','Integer','Long','Decimal','Boolean','Date','DateTime']  // the real enum

toFieldSpec(f):                            // omit default-valued keys → clean minimal JSON
  spec = { name: f.name, type: f.type }
  if f.required → spec.required = true
  if f.unique   → spec.unique = true
  if f.type === 'Decimal' and (f.precision or f.scale set) → spec.validation = { precision?, scale? }
  return spec

toEntitySpec(e):
  spec = { name: e.name, fields: e.fields.map(toFieldSpec) }
  if e.relationships.length → spec.relationships = e.rels.map(r => ({ kind: r.kind, target: r.target }))
  return spec

buildBlueprintChoices(sel):
  choices = { settings }                   // Day-61, unchanged
  if sel.entities?.length → choices.entities = sel.entities.map(toEntitySpec)   // else OMIT (Day-61 bypass)
  return choices
```

- **Omitting default-valued keys** (`required`/`unique` only when true; `relationships` only when present;
  `validation` only for Decimal-with-precision) makes the wizard emit the **exact minimal shape** the
  demos/CLI write — so a wizard-built TeamTracker **deep-equals** the certified TeamTracker choices AND
  generates byte-identical (§3).
- **No entities ⇒ `entities` OMITTED** ⇒ the Day-61 settings-only shell is a **literal bypass**, unchanged.
- Still **pure + DOM-free** ⇒ Node imports it for the headless UI==CLI proof.

---

## 2. THE DYNAMIC UI (DC-1 — add/remove entities/fields/relationships)

A new **"Data model"** step in the wizard flow (inserted before Review), driven by a
`sel.entities: [{ name, fields: [{name,type,required,unique,precision?,scale?}], relationships:
[{kind,target}] }]` array in the wizard state. Vanilla JS, no bundler, dynamic DOM:

- **Entities:** an "Add entity" button; each entity a card with a name input + a remove button.
- **Fields (per entity):** an "Add field" row: name input + **type `<select>` (the 8 real types)** +
  required/unique checkboxes; **when type = `Decimal`, reveal precision + scale inputs** (→ `validation`).
  Remove per field.
- **Relationships (per entity):** an "Add relationship" row: **kind `<select>` (belongs-to / has-many)** +
  **target `<select>` (declared entity names** — for `belongs-to`, earlier entities; for `has-many`, any).
  Remove per relationship.
- **Review** shows the full assembled `BlueprintChoices` **including `entities`** (the JSON), then
  "Generate ▸" → `export_project({ targetDir, model: JSON.stringify(choices) })` (the **same** Day-61
  wiring — no new command).
- **Empty data model is valid** — no entities ⇒ the Day-61 shell (the bypass). Optional: a "Load
  TeamTracker example" button (pure-data preset, like the Day-61 templates) that pre-fills the 4 related
  entities — a strong demo + the visible tie to the certified baseline.

**THIN CLIENT (load-bearing):** the UI only **collects** entity/field/relationship data into `sel.entities`
and hands it to the pure serializer. **No validation logic that reimplements the engine** (the engine
enforces order/validity; the wizard's target dropdowns are a nicety). No generation logic in JS.

---

## 3. UI == CLI WITH ENTITIES (DC-3, load-bearing) — the wizard's blueprint == the CLI's

Extend the headless proof (`node`, importing the **real** `wizard-choices.js` + the **real** certified
`export.js`) to cover entities/fields/relationships — byte-identical for representative sets:

- **(a) A relationship set == the CERTIFIED TeamTracker:** the wizard's TeamTracker selections →
  `buildBlueprintChoices` → **deep-equals** `buildTeamTrackerModel`'s choices AND `export --model` →
  **byte-identical** to the CLI TeamTracker tree (Spring Boot). This ties the wizard directly to the
  **certified 10-baseline** (PART 1d) — the wizard reproduces a frozen relationship structure. *(Optional
  stronger tie: `assembleBlueprint(wizardTTChoices).getState()` deep-equals `buildTeamTrackerModel(...)`
  state.)*
- **(b) A Decimal/money field:** an entity with a `Decimal` field + `validation: { precision, scale }` —
  wizard vs hand-built CLI choices → `export --model` **byte-identical** (proves the wizard collects
  precision/scale into the right channel, Day 27).
- **(c) An EXPLICIT has-many:** an entity with a `has-many` relationship — wizard vs CLI **byte-identical**
  (proves the wizard **collects** has-many, does not auto-infer it — Day 25).

Each leg: distinct real output (non-vacuous), wizard tree == CLI tree. **The wizard is another producer of
the SAME `assembleBlueprint` seam — not a second construction path**, now with the full data model.

---

## 4. THE SPINE — generation untouched; thin client; honest

1. **THIN CLIENT:** `buildBlueprintChoices` (extended with entities) stays a **pure** field→JSON
   serializer; the wizard collects data + calls the **existing** `export_project` via `--model`. **No
   generation logic in JS.**
2. **UI == CLI (load-bearing):** the wizard's blueprint **with entities** == the CLI's for the same
   entities/fields/relationships (§3) — incl. a relationship (TeamTracker) + a decimal + a has-many.
3. **GENERATION UNTOUCHED:** no generator source change; the frozen backstop byte-identical (103 baked +
   10 TeamTracker + non-hash PART 1c–1x, 194 OK, MAXIMAL `366e19d9…`). **A moved hash = FINDING, STOP.**
4. **VALID ENTITIES:** has-many explicit; the real 8-type field enum; relationship targets = declared
   entities; belongs-to order respected — the engine accepts the wizard's entities unchanged (proven via
   §3, incl. reproducing the certified TeamTracker + a decimal + a has-many).
5. **HONEST build-here vs deferred:** the wizard + entities wiring + `node --check` + a static preview
   (add/remove entities/fields/relationships, the review JSON) + the headless UI==CLI (with entities) are
   **HERE**; the **live packaged GUI generate** (clicking through the data model in the running Bedrock
   window → a project on disk) is **DEFERRED** to Leela's Windows machine — **no claimed live wizard run.**

### The generation-untouched proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` byte-identical.
- `git status --short` → only `desktop/` (shell UI) + docs; **no `generator/` source**; `deps {}`.

---

## 5. EXECUTE done-conditions

1. **THE DATA-MODEL UI:** add/remove entities; per entity add/remove fields (name + the **real 8-type
   enum**, incl. Decimal precision/scale) + relationships (belongs-to/has-many, target = a declared
   entity). Dynamic, a "Data model" step before Review; the Review shows the full `BlueprintChoices` incl.
   `entities`.
2. **`buildBlueprintChoices` EXTENDED (still pure):** appends `entities` (default-valued keys omitted;
   Decimal → `validation`); **no entities ⇒ `entities` omitted** (the Day-61 bypass preserved). `node
   --check` passes.
3. **UI == CLI (load-bearing):** the wizard's blueprint WITH entities == the CLI's, **byte-identical**, for
   **(a)** the certified TeamTracker (relationship set), **(b)** a Decimal/money field, **(c)** an explicit
   has-many.
4. **VALID ENTITIES:** has-many explicit (not auto-inferred); the real field-type enum; targets = declared
   entities — the engine accepts the wizard's entities unchanged.
5. **GENERATION UNTOUCHED:** frozen backstop byte-identical (103 baked + 10 + non-hash, MAXIMAL
   `366e19d9…`); git only `desktop/` + docs; no generator source; `deps {}`. **A moved hash = FINDING,
   STOP.**
6. **Honest:** authored + wiring + `node --check` + static preview + the headless UI==CLI (with entities)
   HERE; the live GUI generate DEFERRED (Leela's machine) — no claimed live run.

## 6. REPORT done-conditions

`eco-day-62-report.md`: the data-model UI (add/remove entities/fields/relationships; the 8-type enum; the
has-many-explicit + decimal precision/scale handling; the belongs-to order nicety); the extended pure
serializer (entities appended, defaults omitted, bypass preserved); the UI==CLI proof WITH entities
(byte-identical — TeamTracker + decimal + has-many); the generation-untouched proof; the thin-client
invariant; honest build-here vs deferred. **Forward-flags:** Day 63 (the linked project view — the flow
map + impact on the wizard's FULL blueprint, now meaningful with entities); the punch-list.

---

## 7. SCOPE GUARD — OUT

- **NOT** the linked map view (Day 63); **NOT** the visual Map (Days 64–66).
- The wizard is a **THIN CLIENT** — no generation logic in JS (a reimplementation = a FINDING); it reuses
  the **existing `export_project`/`--model`** path (no new engine/command).
- **has-many is EXPLICIT** — the wizard **collects** it; **auto-inference = a FINDING** (diverges from the
  certified baselines).
- The **field-type enum is the REAL 8** — no invented types; Decimal precision/scale → `validation`.
- **NO generator source change** — a moved hash = FINDING, STOP.
- The **live GUI generate is Leela's-machine** (honest — no claimed live run).
- **`deps {}`; no AI** (ADR-001).

## 8. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-61 report + the real types (`EntitySpec`/`FieldSpec`/
   `RelationshipSpec`, the 8-type enum, the decimal `validation` channel, the belongs-to order rule, the
   TeamTracker baseline) + `wizard-choices.js`/`main.js` — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 TeamTracker + MAXIMAL `366e19d9…`; the wizard is shell/UI
   — moves nothing; the entities reproduce (not move) the 10 TeamTracker baselines — **understood**.
4. AI touchpoints: **none** — thin client of the AI-free commands (ADR-001) — **yes**.
5. The default/empty path a literal bypass: no entities ⇒ `entities` omitted ⇒ the Day-61 settings-only
   shell, unchanged — **honored**.
6. The three determinism killers: N/A (no generator output touched — shell/UI only) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + `git status` + the headless UI==CLI (with
   entities); a moved hash / a divergence = STOP — **yes**.
8. Overclaim / out-of-scope watch: no live GUI run claimed; has-many explicit (no auto-infer); the real
   enum only; maps not in scope — **guarded**.

---

*Day 62 plan: the wizard data model — entities/fields/relationships, SHELL/UI over the certified engine.
The wizard gains a dynamic "Data model" step (add/remove entities; per entity add/remove fields [name + the
REAL 8-type enum — String/Text/Integer/Long/Decimal/Boolean/Date/DateTime, with Decimal precision/scale →
`validation`] + relationships [belongs-to/has-many, target = a declared entity]) collected into
`sel.entities` and appended to `BlueprintChoices.entities` by the EXTENDED but still-PURE
`buildBlueprintChoices` (default-valued keys omitted so the wizard emits the exact minimal shape the CLI
writes; no entities ⇒ `entities` omitted ⇒ the Day-61 settings-only bypass preserved) — driving the SAME
existing `export_project` via `--model` (no new command, no generation logic in JS). The engine's rules are
respected: `belongs-to` targets must be earlier-declared (engine-enforced; a UI nicety mirrors it),
`has-many` is EXPLICIT (collected, never auto-inferred — Day 25), the field-type enum is the real 8, and
relationship targets reference declared entities — so the wizard produces VALID `BlueprintChoices` the
engine accepts unchanged. UI==CLI (with entities) is proven headlessly and byte-identical for
representative sets: (a) the wizard reproduces the CERTIFIED TeamTracker relationship structure (the
10-baseline, PART 1d) byte-for-byte, (b) a Decimal/money field, (c) an explicit has-many — the wizard is
another producer of the SAME `assembleBlueprint` seam, not a second construction path. Generation
untouched: no generator source change, the frozen backstop byte-identical (103 baked + 10 + non-hash,
MAXIMAL `366e19d9…`), git only `desktop/` + docs, `deps {}`, no AI (ADR-001). Honest: authored + wiring +
`node --check` + static preview + the headless UI==CLI (with entities) HERE; the live packaged GUI generate
DEFERRED to Leela's Windows machine — no claimed live wizard run. Day 63 picks up the linked project view
(the flow map + impact on the wizard's FULL blueprint — now meaningful with entities). No code this
session — the plan turns the wizard's shell into a real app with the user's own data model.*
