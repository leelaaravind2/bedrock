# Day 19 — End-of-Day Report: Wizard enrichment (description → README, relationships in the entity screen, integration screen)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no wiring change. The only code touched is the gate/test scaffolding (`day19-gate.ts`, added in Session 2) + cleanup.
**Status: DONE — the wizard now captures the full intake end-to-end. A project DESCRIPTION flows to the README when provided (blank ⇒ byte-identical). Belongs-to RELATIONSHIPS are declarable in the entity screen (target = a previously-added entity, multi-edge supported) and feed the EXISTING Day 1–4 FK generation — Day 19 wired the UI, it did NOT change the engine. A thin neutral INTEGRATION selection (email/AI) is wired via `POST /api/integrations` mirroring `/api/style`. Proven at BOTH layers: the gate harness (model) AND the live HTTP routes (browser path). The 20-hash default backstop is frozen; UI-declared TeamTracker reproduces all 10 baselines byte-for-byte.**

> **This report is a self-contained handoff — Day 20 (the FULL-SYSTEM REGRESSION) starts in a fresh session with no carry-over context.** §1 is what the enriched wizard captures, §2 the load-bearing UI==CLI proof, §3 the FOUR Day-20 carries, §4 the stale-comment finding, §5 the route-layer result.

Plan: [`docs/daily/day-19-plan.md`](day-19-plan.md). Precedent: [`day-18-report.md`](day-18-report.md). Guardrails: **Law 25 (core-neutral)**, ADR-001, ADR-003 (determinism), ADR-004 (shown-not-hidden).

---

## 1. WHAT THE ENRICHED WIZARD NOW CAPTURES (the full intake, end-to-end)

The wizard now captures **description + type + relationships + style + integrations** and reflects all of it in the blueprint (ADR-004). Three additions, all **ADDITIVE — the engine is untouched:**

- **Project description → README.** A neutral, optional model value (`getDescription`/`setDescription`, default `''`) — **NOT a Phase-A key** (kept out of the Phase-A render, so the input-side trap stays closed). Captured on the Project screen; sent on `POST /api/settings` and threaded to `setDescription` (never a setting). When provided, a **neutral core post-process** ([`regen.ts`](../../generator/src/core/regen.ts) `buildFileSet`) injects it as a paragraph under the README's H1 — technology-agnostic, same for every stack (Law 25). Blank ⇒ no injection ⇒ the README (and the 20-hash backstop) are byte-identical.
- **Belongs-to relationships in the entity screen.** The entity screen gains a belongs-to control whose target is a dropdown of **previously-added entities only** (the engine requires the target to exist earlier — forward references are rejected, so the invalid case is unrepresentable in the UI). `addEntity()` now sends `relationships: [{ kind:'belongs-to', target }]` (omitted when none) in the EXISTING `POST /api/entities` → `addEntity(spec)` path. **Multiple belongs-to edges per entity are supported.** This feeds the EXISTING Day 1–4 FK generation — Day 19 changed no generation code.
- **Integration screen (email/AI).** A thin neutral selection folded into the Style step, wired via a new `POST /api/integrations` route that **mirrors `/api/style` exactly** (the server fills omitted members from `defaultIntegrations`, hands the opaque value to `setIntegrations`, and **never inspects** it — Law 25). Default `{none,none}` is a literal bypass. *(The stepper label still reads "Style"; the integration selects live on that screen — a cosmetic relabel is a deferrable polish, not a finding.)*

**Model / route / UI touch-points (the whole change surface):**

| Concern | Model (`project-model.ts`) | Route (`server.ts`) | UI (`ui/index.html`) | Engine |
|---|---|---|---|---|
| Description | `get/setDescription`, in `ProjectState`, restore-defaulted `''` | `description` on `POST /api/settings` → `setDescription` | textarea on Project screen; blueprint line | README inject in `regen.ts` (neutral) |
| Relationships | *(already existed — `RelationshipSpec`/`createRelationship`)* | *(already accepted — `POST /api/entities`)* | belongs-to dropdown (prior entities, multi-edge) | **UNCHANGED** (Day 1–4 FK codegen) |
| Integrations | *(already existed — Days 17/18)* | **new** `POST /api/integrations` (mirrors `/api/style`) | email/AI selects on Style screen; blueprint chips | plugin-gated (Days 17/18) |

---

## 2. THE UI==CLI RELATIONSHIP PROOF (the load-bearing proof of the day)

Relationships change GENERATED CODE (the FK column, the constraint, the join), so the backstop is sharper than "empty path frozen." **Replaying the FULL TeamTracker chain through the server's public path (`createProjectModel` + `addEntity` per entity, with UI-shape relationship specs, including the multi-edge Ticket that belongs-to Application AND Team) reproduces all 10 TeamTracker baselines BYTE-FOR-BYTE** across 5 backends × 2 DBs:

```
Spring PG 9e01210c…  Express PG dca2b4a7…  FastAPI PG 6d422010…  Django PG e509309c…  Go PG 6aea8b04…
Spring MY 4c4640ba…  Express MY bfa4a536…  FastAPI MY 5c788c70…  Django MY 3b3e6a6f…  Go MY 7408a3e2…
```

The full chain with the multi-edge Ticket is deliberate — a single-edge test could pass while multi-relationship ordering diverged (the relationship-path analogue of the single-word blind spot). **If the UI-declared model had diverged from the engine, this would FAIL; it does not.** The relationship-free path (canonical DemoApp, entities carry no relationships) reproduces its baseline — a literal bypass.

---

## 3. THE FOUR DAY-20 CARRIES (all in writing — Day 20 is the regression that must account for them)

1. **Description — canonical vs sibling.** The canonical baseline is the **BLANK-description path** (README byte-identical → 20 frozen). A **provided** description is a **valid README sibling, not the frozen output** (real user content legitimately changing a hashed file). **Day 20's regression must hash the blank-description path.**
2. **The relationship UI==CLI proof** (§2) — Day 20 re-confirms it in the full regression (UI-declared full TeamTracker chain == the 10 baselines).
3. **The DEFERRED Express ai-hook runtime boot.** Day 18's four-part detachable boot ran **FastAPI only**; Express was covered structurally (CRUD-diff + `node --check`) but **not booted**. **Fold the full four-part detachable boot on Express into Day 20's regression.**
4. **The gate-suite consolidation.** `day12`–`day19` gates + `ui:demo`/`two-stacks`/`python:demo` now run serially and slow (open since Days 17 AND 18; Day 19 adds `day19-gate`). **Day 20 should build a CONSOLIDATED regression harness, not run ten-plus scripts one by one.**

---

## 4. THE STALE-COMMENT FINDING (a real, corrected finding — not a passing nit)

[`teamtracker-model.ts:9–14`](../../generator/src/teamtracker-model.ts) still claims relationships are *"carried as model metadata … No half-working relationship codegen is introduced."* **This is FALSE.** The plugins demonstrably generate belongs-to FKs — verified this session: TeamTracker's migrations contain `team_id`, `application_id`, `ticket_id` columns with `ALTER TABLE … ADD CONSTRAINT fk_… FOREIGN KEY … REFERENCES …` and indexes, and the manifest renders each belongs-to. The comment describes an earlier state and now misleads. **A one-line comment fix belongs on a later cleanup day — NOT via a demo-model edit now (that would risk the frozen hashes). Leave the demo-model source and its baselines alone.**

---

## 5. THE ROUTE-LAYER RESULT (the gap Session 2 flagged — the harness proved the model layer, NOT the HTTP routes)

Everything in Sessions 2 went through `createProjectModel` + `addEntity` directly. The two NEW route behaviours sit on the actual HTTP path the browser hits, which was never exercised. This session drove the **REAL running server** (`node dist/server.js`) and proved **both threaded correctly** (nothing silently dropped):

**A. `POST /api/integrations` threads to the model and stays frozen when empty:**
- `settings → /api/integrations {email:none, ai:none} → entities → GET /api/state` shows `{none,none}`; the reconstructed model hashes to **`dca2254f…` — the frozen FastAPI/PG/DemoApp baseline** (the empty path THROUGH THE ROUTE is a literal bypass).
- `/api/integrations {email:smtp}` → state shows `email:smtp` (not dropped); the reconstructed model hashes to **`efd3d6a8…` — the Day-17 FastAPI email baseline** (the route actually threads the selection to `setIntegrations`).

**B. description on `POST /api/settings` threads to `setDescription`:**
- Blank description → state `''`; hashes to **`dca2254f…`** (blank path through the route is a bypass).
- Provided description → state carries it (not dropped); the README injects it under the H1 (H1 still first line, no dangling token); the model is a **sibling (differs from the frozen baseline)** — correct. `POST /api/generate` ran end-to-end (23 files written).

**Verdict: both routes thread their values correctly through the HTTP path.** No silent drop.

### Browser-JS confirm (the UI itself, live)
Drove the real wizard in a browser (preview server on 4317):
- The entity screen declares belongs-to; the Ticket target dropdown offered **only prior entities** (`["Team", "Application"]` — Comment not yet added), proving the constraint is enforced in the UI.
- **Multi-edge works:** Ticket declared `belongs-to Application` AND `belongs-to Team`; `GET /api/state` reflects both.
- The blueprint reflects the **full intake**: the description line, chips for Backend/Frontend/Database/Multi-user/Auth + Naming/Indent/Architecture + **`Email: smtp` / `AI: none`**, and **3 relationship lines drawn** (Application→Team, Ticket→Application, Ticket→Team).
- Screens advance in a sensible order: **Project → Entities → Style → Blueprint → Generated**, each showing its choices (ADR-004).

---

## 6. Gate results — DEFAULT 20 frozen + guard-the-guard + the UI==CLI hashes

`npm run day19:gate` from a **clean rebuild** (`rm -rf dist && tsc`) — **exit 0, zero FAIL.** Five sections:
- **DEFAULT:** all **20 hashes byte-identical** on the default path (no description, no UI relationship beyond the demos, no integration) — both the Phase-A lines and the `(none)` defaults line unmoved.
- **UI==CLI:** the full TeamTracker chain via `addEntity` == all 10 baselines byte-for-byte (§2).
- **REL-FREE:** canonical DemoApp is structurally relationship-free AND hashes to its baseline (literal bypass).
- **DESCRIPTION:** blank ⇒ README byte-identical (hash unmoved); provided ⇒ README differs, contains the text, H1 still first (a valid sibling).
- **GUARD:** `setDescription('x')` survives the get/set + snapshot round-trip; a pre-Day-19 snapshot (no `description`) defaults to `''`.

### Guard the guard (20 == 20, diff EMPTY)
The 20 digests baked into `day19-gate.ts`, diffed against sources — **16 in [`week-01-summary.md`](week-01-summary.md) + Go's 4** (`d158529a…` in [`day-09`](day-09-report.md); `6aea8b04…`/`9ff40acb…`/`7408a3e2…` in [`day-10`](day-10-report.md)): **20 sources, 20 baked, 20/20 present, missing = (none).**

**No regressions:** `day12`–`day18` gates + `ui:demo` / `two-stacks` / `python:demo` all PASS on the current build.

---

## 7. Engine-untouched re-confirm (what makes "20 frozen" trustworthy)

Day 19 fed the EXISTING engine; it did not change it:
- **FK/relationship codegen lives ONLY in the 5 plugin `entity-codegen.ts` files** (`django`/`express`/`go`/`python`/`spring`) — **none edited this session.** No FK generation in `src/core` (the only `belongs-to` mention there is a descriptive comment on `RelationshipSpec`).
- **`getDescription` touches only the neutral README inject** (`project-model.ts` field + `regen.ts:94`) — never codegen.
- **`POST /api/integrations` mirrors `/api/style`** — `setIntegrations(merged)`, opaque to the core (never inspects the values — Law 25).
- The UI relationship spec (`{ kind:'belongs-to', target }`) is structurally identical to the demos' `RelationshipSpec`.
- The `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched.

---

## 8. ADR / Law compliance

- **ADR-001 (no AI in generation):** unchanged — the `/api/integrations` route is a neutral pass-through; the AI hook remains the detachable runtime hook from Day 18; generation makes no AI/network call.
- **ADR-002 (file separation):** intact — no generation-logic change; `two-stacks` / `python:demo` re-confirm developer files untouched.
- **ADR-003 (determinism):** the empty/default path is a literal bypass — **20 frozen, proven through BOTH the harness AND the live HTTP routes**; UI-declared relationships reproduce the engine byte-for-byte; a provided description is a legitimate sibling, not a moved baseline.
- **Law 25 (core neutral):** description + relationship + integrations are neutral intake values; the entity screen feeds the EXISTING generation; the README inject is a technology-agnostic post-process; `/api/integrations` mirrors `/api/style` and never inspects; no per-stack logic in the kernel; FK codegen + `TIMESTAMPTZ` JSDoc untouched.
- **ADR-004 (shown-not-hidden):** description + relationships + integrations are optional (blank/none valid) and shown (blueprint chips/lines + the README when provided), never silent.

---

## 9. Cleanup & scope

Preview server stopped; the route-proof server (port 4319) killed; the temporary `E:\Software\.claude\launch.json` removed; the scratch `day19-out` / `day19-store` / `route-check.mjs` / `server.log` removed (absolute paths). Residue check clean: **0 docker containers, 0 listening ports (4317/4319), no repo `output/` dir, no scratch boot dirs.** The recurring OS-handle-on-output-dir thread (Days 14–16) did not recur.

**Scope held:** no new features, no wiring change, no re-baselining of the 20 default hashes or the 10 TeamTracker baselines. Only gate/test scaffolding + cleanup this session. This was **UI wiring to an existing engine — no codegen change.**

---

## 10. What Day 20 picks up

**Day 20 — the FULL-SYSTEM REGRESSION.** Exercise the now-large feature matrix end-to-end and lock it down:
- **A full end-to-end pass:** pick a project type, a stack (of 5), a database (of 2), related entities (belongs-to), a coding style, an integration — generate / browse / blueprint end-to-end.
- **Confirm ALL default-path baselines hold:** both project types (Web App + API-only), all 5 backends, both databases, all style options — the 20 default hashes + the API-only sibling + the style/type/integration baselines.
- **Fold in the deferred Express ai-hook boot** (§3.3) — the full four-part detachable boot on Express (Day 18 booted FastAPI only).
- **Build the consolidated regression harness** (§3.4) — one entry point over the day12–day19 gates + demos, instead of ten-plus scripts run serially.
- **Catch any interaction bugs** across the feature matrix (type × style × relationships × integrations × description), now that all intake flows are captured end-to-end.

---

**Day 19 verdict:** the wizard now captures the full intake end-to-end — a project description that flows to the README when provided (blank the canonical frozen baseline, provided a valid sibling), belongs-to relationships declarable in the entity screen (multi-edge, prior-entity targets only) that feed the EXISTING Day 1–4 FK generation, and a neutral integration selection wired via `/api/integrations` mirroring `/api/style`. It is proven at **both layers** — the gate harness (model) and the **live HTTP routes** the browser depends on — with the load-bearing UI==CLI proof holding (UI-declared full TeamTracker chain == the 10 baselines byte-for-byte) and the 20-hash default backstop frozen. The engine was fed, not changed (FK codegen untouched; grep-confirmed). **Day 20 is the full-system regression** — with the deferred Express boot and the consolidated harness folded in.
