# Day 19 — Plan: Wizard enrichment (description → README, relationships in the entity screen, clean screen flow)

**Session 1 of 3 — PLANNING ONLY.** No implementation, no code edits. This file is the sole output. Sessions 2 (Execution) and 3 (Evaluation + Closing) are scoped below with explicit done-conditions.

**Carry-over context:** [`day-18-report.md`](day-18-report.md) — the two-member `integrations` pattern, the completed ADR-001 precedent, the detachable-add-on rule, the staging state, and the **still-open gate-suite-consolidation note (now TWO days open — Days 17 & 18)**. Also carried: **the Express ai-hook runtime boot was DEFERRED in Day 18** — fold it into Day 20's regression.

**Guardrails:** ADR-001 (no AI in generation), ADR-003 (determinism — empty/default path a literal bypass), ADR-004 (optional + shown-not-hidden), Law 25 (core-neutral; the wizard feeds the EXISTING engine). Engine untouched. **The 20-hash default backstop is non-negotiable.**

---

## 0. What Day 19 is

Enrich the intake wizard so the richer specification is captured end-to-end: **(1) a project description → the README; (2) relationships declarable in the entity screen, feeding the EXISTING Day 1–4 belongs-to FK generation; (3) the type/style/integration screens flow cleanly.** Everything is **ADDITIVE — the engine is untouched, generation is deterministic.** The 20 hashes stay frozen on the empty/default path. This day changes what the UI *captures and feeds in*, never how code is *generated*.

---

## 1. RECONNAISSANCE — resolved empirically (this sizes the day and sets the backstop)

### 1.1 THE RELATIONSHIP FORK → **FORK 1 (the smaller one): the model already captures relationships AND the plugins already generate FKs from them. Day 19 EXPOSES the declaration in the UI; it builds nothing new in the engine.**

Evidence from the code (not the demos):
- **The model captures relationships today.** [`project-model.ts`](../../generator/src/core/project-model.ts) defines `RelationshipSpec` (`kind: 'belongs-to' | 'has-many'`, `target`), `Relationship` (normalised), `EntitySpec.relationships?: RelationshipSpec[]`, `createRelationship(spec)`, and `createEntity` maps `spec.relationships` into the stored entity (relationship-free entities keep an empty list, byte-identical to before). It even enforces deterministic ordering — a `belongs-to` target must be defined earlier (`project-model.ts:396`).
- **The plugins ALREADY generate FK columns from belongs-to** (Day 1–4 codegen, wired across all 5 backends). E.g. `python/entity-codegen.ts:197,677–694` and `spring/entity-codegen.ts:256,715–736` loop over `belongsToRels(entity)` to emit a scalar FK column mirroring `owner_id`, plus `postgres.ts:74` `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY … REFERENCES …`, plus a manifest line "`belongs-to adds a FK column`" (ADR-004 shown).
- **Confirmed by generating TeamTracker (FastAPI/Postgres):** its belongs-to links produce real FK columns (`team_id`, `application_id`, `ticket_id`), FK constraints (`fk_applications_team`, `fk_tickets_application`, …), indexes, and manifest lines. **The TeamTracker baselines already bake in these FKs.**
- **The server already accepts relationships.** `POST /api/entities` ([`server.ts:237`](../../generator/src/server.ts)) does `readJson<EntitySpec>(req)` → `requireModel().addEntity(spec)`. Because `EntitySpec.relationships` already exists, the server-side plumbing is DONE — the gap is purely that the entity-screen JS (`addEntity()` in `ui/index.html:524`) builds only `{ name, fields }`, dropping relationships.

> **Doc nit to flag (not a Day-19 fix):** [`teamtracker-model.ts:9–14`](../../generator/src/teamtracker-model.ts) claims relationships are "carried as model metadata … No half-working relationship codegen is introduced." That comment is **stale/misleading** — the plugins demonstrably generate FK columns from belongs-to. The report should note the comment reads as if relationships are metadata-only, which the FK codegen contradicts.

### 1.2 THE DESCRIPTION → **NEW field.** `PHASE_A_KEYS` = `projectName, projectType, backend, frontend, database` (`project-model.ts`) — there is **no** description field today. INTAKE-SPEC Q1 (project name) is its sibling on the Project screen. It flows to the **README only** (see §2.1) — **NOT** as a Phase-A key (that would re-open the input-side trap: an unconditional line in the `Project (Phase A)` manifest render moving all 20 hashes — Day-17 §3).

### 1.3 THE INTEGRATION SCREEN → **not wired into the wizard.** `server.ts` has `/api/settings`, `/api/style`, `/api/entities`, `/api/demoapp`, `/api/preview`, `/api/generate`, versions, files — **no `/api/integrations`**. Days 17–18 set integrations programmatically (`setIntegrations` in gates/demos). The stepper is **Project → Entities → Style → Blueprint → Generated** (`ui/index.html:172–180`); the "type" screen is `projectType` on the Project screen (Day 16), "style" is step 3 (Day 14) — **there is no integration selection UI at all.** See §2.3 for the decision.

### 1.4 Day 1–4 FK generation is UNTOUCHED by this day. Day 19 wires the UI to *feed* `addEntity({ …, relationships })`; it does not change `belongsToRels`, the FK column emission, the constraint DDL, or the manifest rendering. (Scope guard.)

---

## 2. THE THREE PIECES — design

### 2.1 Piece A — Project description → README (the two-outputs / "sibling not canonical" shape)

**Design: description is a NEUTRAL, OPTIONAL model value — a sibling of `CodingStyle`/`Integrations`, NOT a Phase-A key.**
- Stored in the model closure (`setDescription()` / `getDescription()`, default `''`), carried in `ProjectState`, defaulted for old snapshots in `restoreProjectModel` (`?? ''`) so pre-Day-19 snapshots regenerate byte-for-byte.
- **Captured on the Project screen** (step 1), under Project name (its INTAKE sibling). Plumbed WITHOUT entering Phase-A: extend the `POST /api/settings` body with an optional `description` and have the server call `model.setDescription(body.description ?? '')` explicitly (kept out of `PHASE_A_KEYS`), OR a dedicated `POST /api/description` route mirroring the `/api/style` neutral pass-through. Either keeps description out of the Phase-A render. *(Settle the exact plumbing in Session 2; the invariant is: description never becomes a Phase-A key.)*
- **Flows to the README when provided** via a **gated per-plugin transform** (the exact shape of the email/AI README sections — Law 25: the plugin owns its README): when `getDescription()` is non-blank, inject the description paragraph just under the README H1 title. **Blank ⇒ no transform ⇒ the README is byte-identical ⇒ the 20 hashes stay frozen.** Land it on the backends the UI offers (all 5 is a uniform trivial title-paragraph insert; at minimum the FastAPI + Express pair — Session 2's call, noted).
- **Shown in the blueprint** via `getState()` (unhashed UI view — always safe, ADR-004 satisfied there). If also rendered in the hashed `GENERATION-MANIFEST.txt`, it MUST be **gated** (a line only when non-blank), never unconditional — same discipline as the integrations gated section.

**The canonical-baseline note (state it, for Day 20):** the canonical baseline is the **BLANK-description path** (README byte-identical → 20 frozen). A **provided** description is a **valid sibling, not the frozen output** — real user content legitimately changing a hashed file (the README), exactly like Day 16's API-only sibling. **Day 20's regression must hash the blank-description path.**

### 2.2 Piece B — Relationships declarable in the entity screen (expose existing capture; the UI==CLI invariant)

**Design: add a belongs-to declaration to the entity screen; thread it into the POST body the server already accepts.**
- On the entity screen (step 2), add a "Relationships (optional)" control: a **belongs-to** row whose **target is a dropdown of already-added entities** (belongs-to requires the target to exist earlier — `project-model.ts:396` — so only prior entities are offered; this makes the invalid case unrepresentable in the UI, mirroring Day 16's type↔frontend gating).
- `addEntity()` (`ui/index.html:524`) gains `relationships: [{ kind: 'belongs-to', target }]` in the POST body (omitted/`[]` when none declared). The server (`addEntity(spec)`) already maps it via `createRelationship` → the existing FK generation. **No engine change.**
- **Shown in the blueprint** — `getState()` already serialises `entities[].relationships` (`project-model.ts:485`); the blueprint view renders belongs-to as connections (the TeamTracker demo already relies on this). Confirm/extend the blueprint render so a UI-declared relationship appears (ADR-004).

**THE KEY INVARIANT (sharper than "empty path frozen" — relationships change GENERATED CODE):**
1. **An entity with NO declared relationship reproduces its current hash EXACTLY** — the relationship-free path is a literal bypass (`belongsToRels` loop empty → byte-identical). DemoApp's single relationship-free `Ticket` is the witness.
2. **UI-declared relationships reproduce the TeamTracker baselines byte-for-byte** — declaring TeamTracker's belongs-to links through the server's `POST /api/entities` path must hash **identically** to the programmatic `buildTeamTrackerModel` path. This is a **UI==CLI proof ON THE RELATIONSHIP PATH** (mirrors Day 16's UI==CLI for the type), not merely "empty path frozen." **If UI-declared relationships don't reproduce the TeamTracker baselines, the UI wiring diverged from the engine — a real finding, STOP and report.**

### 2.3 Piece C — Screen-flow cleanup + the integration-screen decision (the lightest piece)

**"Flow cleanly" concretely means:** the screens advance in a sensible order (Project → Entities → Style/Integrations → Blueprint → Generated), each screen **shows its choices** (ADR-004 — defaults/consequences visible, as the type↔frontend consequence and the style summary already do), and **the blueprint reflects the full intake: description + relationships + type + style + integrations.**

**The integration-screen decision (recommended, but the deferrable stretch):** because there is **no** integration UI today (§1.3) and a done-condition is "the blueprint reflects … integrations," **add a thin integration selection** — two selects (Email: `none`/`smtp`; AI: `none`/`hook`) — wired via a `POST /api/integrations` route that **mirrors `/api/style` exactly** (neutral pass-through: the server merges omitted members from `defaultIntegrations`, hands the opaque value to `model.setIntegrations(...)`, and **never inspects** it — Law 25). **Default `none` for both ⇒ the empty path is byte-identical ⇒ 20 frozen.** To avoid renumbering the stepper, fold the two selects into the **Style screen (step 3)** (or add a dedicated step — Session 2's call). Adding a *selection* for the two EXISTING integrations is **not** adding a new integration (scope-clean).

> **Priority order if the session strains:** description (2.1) and relationships (2.2) are the headline pieces; **the integration screen is the lightest and is deferrable.** Even without it, the blueprint reflects integrations when set via a loaded demo — but wiring the selection completes the wizard and is recommended.

---

## 3. THE BACKSTOP (non-negotiable) + the invariants restated

- **20-hash matrix byte-identical on the DEFAULT path** (no description, no UI-declared relationship beyond what the demos already carry) — BOTH manifest sides (Phase-A lines AND the `(none)` defaults line). This is blocking at every gate.
- **The relationship-free path is a literal bypass** (§2.2 invariant 1).
- **UI==CLI on the relationship path** (§2.2 invariant 2): server-driven TeamTracker relationships == the four TeamTracker baselines.
- **Description: blank ⇒ frozen; provided ⇒ a coherent README sibling** (§2.1). Guard-the-guard on the 20 digests stays intact (16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md)).

---

## 4. THE GATE (a `day19-gate.ts` sibling of `day18-gate.ts`) — what Session 2 lands / Session 3 runs

1. **DEFAULT (blocking):** the 20-hash matrix byte-identical on the default path (5 backends × 2 DBs × 2 models, `{email:none, ai:none}`, no description) — both manifest sides + guard-the-guard (20 == 20, diff EMPTY).
2. **UI==CLI relationship path:** build the TeamTracker model by replaying its entities+relationships **through the server's `addEntity(spec)` path** (the code path the UI POSTs to) and assert the resulting file set hashes **==** the `buildTeamTrackerModel` baselines, for the landed stacks. (This is the programmatic analogue of the browser flow, exactly as `ui-three-stacks-demo` proves UI==CLI for the type; the browser-JS confirm is a separate Session-3 check.)
3. **Relationship-free reproduces:** an entity with `relationships: []` (or omitted) hashes identically to the same entity today (DemoApp `Ticket` witness).
4. **Description:** blank ⇒ README byte-identical (hash unmoved); a provided description ⇒ the README differs, contains the text, and is otherwise coherent (a valid sibling), on the landed stacks.
5. **Positive guard:** `setDescription('x')` then `getDescription() === 'x'` survives the get/set + snapshot round-trip (mirrors the Day-18 `ai`-survives-copy guard).

---

## 5. Session 2 (EXECUTION) — done-conditions

1. **Description captured (Project screen) → flows to README when provided; blank ⇒ README byte-identical ⇒ hashes frozen.** Description is a neutral optional model value (not a Phase-A key), shown in the blueprint (ADR-004), and gated everywhere it touches a hashed surface.
2. **Relationships declarable in the entity screen** — the belongs-to target dropdown (prior entities only) threads `relationships` into the existing `POST /api/entities` → `addEntity(spec)` path. An entity with no relationship reproduces its current hash; UI-declared TeamTracker relationships reproduce the TeamTracker baselines byte-for-byte (UI==CLI on the relationship path). **Engine untouched** (no change to FK generation).
3. **Screen flow clean** — sensible order, each screen shows its choices, the blueprint reflects description + relationships + type + style + integrations; add the thin integration selection + `POST /api/integrations` neutral pass-through (recommended; deferrable if the session strains, noted honestly).
4. **20 hashes byte-identical on the default path (blocking)** — no description, no UI-declared relationship beyond the demos. Land `day19-gate.ts` (§4). Prior gates (day12–18) + demos still PASS.

**STOP-AND-REPORT guardrail:** if a UI-declared relationship does NOT reproduce the TeamTracker baselines (the UI diverged from the engine), or if the default path drifts off the 20 (either manifest side), **STOP and surface it** rather than writing a clean-looking gate.

---

## 6. Session 3 (EVALUATION + CLOSING) — done-conditions

- **20-hash matrix byte-identical on the default path** (blocking) + **guard-the-guard** (20 == 20, diff EMPTY).
- **UI==CLI on the relationship path:** server-driven TeamTracker relationships == the four TeamTracker baselines, byte-for-byte.
- **Description:** blank ⇒ frozen; a provided description ⇒ a coherent README (shown; **sibling, not canonical**).
- **Browser-JS confirm:** in the running UI, the entity screen declares a belongs-to; the blueprint reflects description + relationships (+ type + style + integrations); the screens advance cleanly.
- **ADR sweep:** no AI (ADR-001); determinism (ADR-003 — the empty/default path a literal bypass, provided-description a legitimate sibling); **Law 25** (description + relationship are neutral intake values; the wizard feeds the EXISTING generation — no per-stack logic added to the kernel; grep → no new generation logic in `src/core`); **ADR-004** (description + relationships optional and shown, never silent). **Engine untouched** (no change to FK generation — diff the entity-codegen FK path).
- **Write [`docs/daily/day-19-report.md`](day-19-report.md)** — a self-contained handoff for **Day 20 (the full-system regression)**. It MUST carry:
  1. **The description canonical note** — blank-description path is the frozen baseline; a provided description is a valid sibling. Day 20 hashes the blank path.
  2. **The relationship UI==CLI proof** — UI-declared TeamTracker relationships == the baselines.
  3. **The DEFERRED Express ai-hook runtime boot** (from Day 18) — fold into Day 20's regression (the full four-part detachable boot on Express).
  4. **The gate-suite consolidation note — now TWO days open (Days 17 & 18, and Day 19 adds `day19-gate`)** — Day 20's full regression should use a consolidated harness, not eight-plus scripts run serially.

---

## 7. Scope guard — OUT for Day 19

- ❌ No change to how relationships/FKs are **GENERATED** (Days 1–4 own that; Day 19 only feeds the UI to it).
- ❌ No new backends / databases / project types / style options / integrations (adding a *selection screen* for the two EXISTING integrations is in scope; adding a new integration is not).
- ❌ No rich frontend generation.
- ❌ No probabilistic variation (ADR-003).
- ❌ Do NOT let a UI-declared relationship diverge from the engine's programmatic path (the UI==CLI invariant is blocking).
- ❌ No re-baselining of the 20 default hashes or the TeamTracker relationship baselines.

---

## 8. Constraints (bake into every step)

- **ADR-001** — no AI anywhere in generation.
- **ADR-003** — deterministic; the empty/default path is a literal bypass; the 20 hashes frozen; a provided description is a legitimate sibling, not a moved baseline.
- **Law 25** — description + relationship are **neutral intake values**; the entity screen feeds the EXISTING engine; no per-stack (technology-specific) logic added to the kernel. The `TIMESTAMPTZ` JSDoc in `core/database.ts` stays untouched.
- **ADR-004** — description + relationships are optional (blank/none is a valid answer, not an error) and shown (README/blueprint when provided; the gated manifest line if rendered).
- **Engine untouched.** The 20-hash default backstop is non-negotiable.

---

**Day 19 plan verdict:** the relationship fork resolves to the **smaller** one — the model captures relationships and the plugins already generate the belongs-to FKs (verified: TeamTracker's `team_id`/`application_id`/`ticket_id` columns + constraints are real, and the server's `POST /api/entities` already accepts `relationships`), so Day 19 **exposes** the declaration in the entity UI and threads it, without touching the engine. The **description** is a new neutral optional value that flows to the README when provided (blank ⇒ frozen — a sibling, not the canonical baseline) and never becomes a Phase-A key. The **screen-flow** piece is lightest: make the wizard flow cleanly and — recommended, deferrable — add a thin neutral integration selection so the blueprint reflects the full intake. The sharp backstop is **UI==CLI on the relationship path** (UI-declared TeamTracker == the baselines) on top of the frozen-20 default path — with a live STOP-AND-REPORT if the UI diverges from the engine.
