# Day 14 — Plan: Wire the coding-style engine into the wizard + prove it end-to-end (Week-2 close)

**Session 1 of 3 — PLANNING ONLY. No implementation, no code edits. Output: this file.**

Day 14 wires the **three existing** style options into the wizard, proves the whole engine end-to-end, and writes the Week-2 summary. **NO new generation machinery, NO new options** — the engine is done: formatting (Day 11), naming (Day 12), architectureDepth (Day 13). Day 14 is **UI wiring + regression + summary only**. This closes Week 2.

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) (Law 25 core neutral; Law 23 org policy), [`docs/adr/`](../adr) (ADR-001 no AI, ADR-002 separation, ADR-003 determinism, **ADR-004 choices shown-not-hidden**, ADR-005 foundational), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 14), [`day-11-report.md`](day-11-report.md) / [`day-12-report.md`](day-12-report.md) / [`day-13-report.md`](day-13-report.md) (the three options), [`week-01-summary.md`](week-01-summary.md) + [`day-09-report.md`](day-09-report.md) / [`day-10-report.md`](day-10-report.md) (the 20-hash digests).

**Grounding (real UI + server code):**
- The wizard ([`ui/index.html`](../../generator/ui/index.html)) is a 4-screen stepper: **Project (1) → Entities (2) → Blueprint (3) → Generated (4)**. Screen 1 has the `backend` and `database` `<select>` controls; `setSettings()` → `POST /api/settings` → `createProjectModel(body)`.
- The server ([`src/server.ts`](../../generator/src/server.ts)) holds one in-memory `model`. `POST /api/generate` calls `buildFileSet(model, currentPlugin())`, and **`buildFileSet` already reads `model.getStyle()`** — so style flows into generation the moment `setStyle` is called. There is **no style endpoint yet**; style is only ever set programmatically (`setStyle` in demos/gates).
- `GET /api/state` returns `model.getState()`, which **already includes `style`** (the Project Model JSON on Screen 2 shows it).
- `backend`/`database` are opaque strings (Law 25 — no allow-list in the core; the registry maps them).
- The `GENERATION-MANIFEST.txt` (`buildManifest` in `regen.ts`) renders Phase-A settings + defaults + entities + files. It shows `backend`/`database` (they are Phase-A) but **not** `style` (style is a separate section). **Adding style to the manifest would change that generated file and MOVE all frozen hashes** (default and recorded alternatives) — so it is out (see §5).

---

## 1. CRITICAL FRAMING

- **A fresh wizard with no style touched MUST produce the default style = all 20 hashes byte-for-byte.** The style screen defaults every control to `'default'`; an untouched flow is a literal bypass (and `createProjectModel` already seeds `defaultCodingStyle`, so even skipping the screen is safe).
- **UI == CLI for style.** A style selected in the wizard must produce output **byte-identical** to the same style supplied programmatically via `setStyle`. That equality **is** the "wired end-to-end" proof — the exact mirror of the existing backend-dropdown UI==CLI proof ([`ui-three-stacks-demo.ts`](../../generator/src/ui-three-stacks-demo.ts)).
- **Deterministic throughout (ADR-003):** same model + same UI selections → byte-identical, twice.

---

## 2. The style-selection screen (the new UI work)

**Recommended: a dedicated Style screen inserted as step 3**, post-setup (after Entities, before Blueprint/Generate): **Project (1) → Entities (2) → Style (3) → Blueprint (4) → Generated (5)**. This renumbers Blueprint→4 and Generated→5 in the stepper + `goTo()` + `data-step` sections (front-end only; no engine change). *(Acceptable lighter alternative if the renumber proves fiddly: a Style panel at the top of the Blueprint screen, above "Generate project" — still post-setup/at-generate. Pick one; the recommendation is the dedicated screen, matching the 21-day plan's "style-selection screen.")*

Three `<select>` controls reflecting the real option shapes (each defaulting to `'default'`):
- **Formatting — indent:** `default | two-space | four-space | tab` (`CodingStyle.formatting.indent`)
- **Naming convention:** `default | camelCase | snake_case` (`CodingStyle.namingConvention`)
- **Architecture depth:** `default | simple` (`CodingStyle.architectureDepth`)

**Flow to the model:** a new `POST /api/style` (sibling of `/api/settings`) whose body is the full `CodingStyle` shape `{ formatting: { indent }, namingConvention, architectureDepth }`. The handler calls `requireModel().setStyle(body)` and returns `{ state: model.getState() }`. The screen POSTs on **"Next"** (and re-POSTs on control change), always sending a complete object (unset controls = `'default'`). Because `buildFileSet` reads `getStyle()`, the subsequent preview/generate use the chosen style with **no generation-logic change**.

**Server stays neutral (Law 25).** The `/api/style` handler is a pass-through: it constructs the `CodingStyle` object from the body (defensively merging over `defaultCodingStyle` to fill any omitted member, so a partial client can't break determinism) and calls `setStyle`. **It never inspects the values** — it does not know what `'simple'` means or which stack supports it. Style is opaque structured data to the core.

---

## 3. THE KEY DECISION — per-stack option applicability + gating (resolve explicitly)

Not all options affect all five stacks (this is what actually landed across Days 11–13):

| Option | Applies to | Elsewhere |
|---|---|---|
| **namingConvention** (`camelCase`/`snake_case`) | **all 5** (Spring, Express, FastAPI, Django, Go) | — |
| **formatting.indent** (`two-space`/`four-space`/`tab`) | **Express only** (`.js` reindent) | a no-op on Spring/FastAPI/Django/Go — produces default output |
| **architectureDepth `simple`** | **Express + FastAPI only** | Spring/Django/Go: `'default'` only (their `generateEntity` has no `simple` branch → a `simple` request silently yields default output) |

**Gating behavior (hard requirement — the UI must never claim a style it will not deliver; ADR-004 shown-not-hidden):** the Style screen reads the current backend (from `model.getState().phaseA.backend`) on entry and **disables the non-applicable `<option>` values, pinning that control to `default`, with a short visible reason.** Exact per-stack gating:

| Backend | naming | indent | depth |
|---|---|---|---|
| **Express** | all enabled | all enabled | `default`, `simple` |
| **FastAPI** | all enabled | **default only** — *"Indentation formatting currently affects Express `.js` only."* | `default`, `simple` |
| **Spring Boot** | all enabled | **default only** (same reason) | **default only** — *"Layered structure only for this stack (simple: Express/FastAPI)."* |
| **Django** | all enabled | **default only** (same reason) | **default only** (same reason) |
| **Go** | all enabled | **default only** (same reason) | **default only** (same reason) |

- The gating is **front-end/composition knowledge** (a small JS applicability map), the same tier as the backend `<option>` list — **NOT kernel logic**. The core/kernel stays neutral: `setStyle` accepts any value; an inapplicable value is a harmless no-op at that stack's plugin (it doesn't branch). The UI's job is to tell the truth about what will be delivered.
- **Re-gate on backend change:** if the developer goes back to Screen 1 and changes backend, re-entering the Style screen re-evaluates applicability and resets any now-inapplicable control to `default` (with the visible reason). **Do NOT silently fall back** to a different style than shown.

---

## 4. ADR-004 — the chosen style is shown (hash-safe surface)

The selected style must be visible, consistent with how backend/database/relationships are shown. **Surface: the wizard/UI, NOT the manifest.**
- **Blueprint screen (4):** add style chips to the existing `bp-summary` chip row — `Naming: …`, `Indent: …`, `Architecture: …` — read from `state.style` (alongside the existing Backend/Database/Multi-user chips).
- **Style screen (3):** shows the current selection and each gating reason inline.
- The Project Model JSON (Screen 2) already renders `state.style` verbatim.
- **Deliberately NOT the GENERATION-MANIFEST:** adding style lines there would change a generated (hashed) file and move BOTH the 20 default hashes AND every recorded alternative hash (naming/formatting/simple) — violating the "hashes unmoved" backstop. Recording style in the wizard summary satisfies ADR-004 (shown, not hidden) without touching output bytes. *(A future day could add a manifest style section behind a deliberate re-baseline; out of scope for Day 14.)*

---

## 5. Engine changes — NONE (only UI + server wiring)

- **No `core/` change, no plugin change, no generation-logic change.** The only new code is: the Style screen (`ui/index.html`), the `POST /api/style` route (`src/server.ts`, neutral pass-through), and gate/demo scaffolding.
- `CodingStyle` / `defaultCodingStyle` / `setStyle` / `buildFileSet`-reads-`getStyle()` all already exist (Days 11–13). The 20 default hashes and all recorded alternative hashes must stay **unmoved** — guaranteed by construction (no generated file's bytes change).

---

## 6. The regression matrix (proportionate — NOT the full cross-product)

The full cross-product (4 indent × 3 naming × 2 depth × 5 backends × 2 DBs × 2 models) is combinatorial and low-value — the three options are **independent** and each is already individually proven (Days 11–13). The Week-2-close regression is a **representative set**:

**(1) BLOCKING — default/default/default across all 20** (5 backends × 2 DBs × 2 models), byte-identical to the frozen digests (16 in `week-01-summary.md`, Go's 4 in `day-09`/`day-10`), reproduced through **BOTH** paths:
- the CLI/gate path (the Day-13 gate harness), **and**
- a **fresh, untouched wizard** flow (`POST /api/settings` → generate with no/all-default `/api/style`) → hash == frozen. This proves the wizard's default path is a literal bypass.
- With the **guard-the-guard** digest cross-check (as Days 12/13): the 20 baked digests diff-empty against the source reports.

**(2) Per-option determinism — reproduce the already-recorded alternatives (twice-identical, not new hashes):**
- **naming** (Day 12): the per-stack `snake_case` Task hashes reproduce (Spring `0484560720f2…`, Express `f79bbb16a921…`, FastAPI `c8aebb183788…`, Django `f0c2c76599d5…`, Go `e5cc7b8c1142…`).
- **formatting** (Day 11): Express `four-space` (`d3ae91b0…`) and `tab` (`c81fb0f5…`) reproduce.
- **simple** (Day 13): Express + FastAPI × DemoApp + TeamTracker on Postgres (`f340374447eb…`, `1f06af0d…`, `c60a4521…`, `a85d7f92…`) reproduce.

**(3) UI == CLI for style** — for a representative selection set, prove wizard-driven output (drive the real UI server: `POST /api/settings` → `POST /api/style` → `POST /api/generate`) == `setStyle`-driven output, **byte-identical**:
- **Express + snake_case + four-space + simple** (all three options; Express supports all).
- **FastAPI + snake_case + simple** (naming + depth; indent gated to default).
- **one all-default** (any stack) — confirms the bypass equality.

**(4) Composition — the genuinely new proof this day** — 1–2 COMBINED multi-option selections generated **twice → byte-identical**, proving the three options compose. Use the **multi-word `Task` model** (so `snake_case` is actually visible — DemoApp/TeamTracker are single-word), scoping `simple` to Express + FastAPI:
- **Composition A:** Express + `Task` + `snake_case` + `four-space` + `simple` → twice-identical; spot-check the merged `crud.base.js` carries `due_date` wire keys **AND** four-space indent (all three options visible in one file).
- **Composition B:** FastAPI + `Task` + `snake_case` + `simple` → twice-identical; spot-check `schemas.py` alias + `crud_base.py`.
- These are **new** hashes (combining options is the new surface) — record them as the Day-14 composition baselines.

*(TeamTracker relationship-survival under `simple` was already live-proven Day 13; not re-booted here.)*

---

## 7. The Week-2 summary — `docs/daily/week-02-summary.md` (the authoritative Week-2 record)

Mirror `week-01-summary.md`. Contents:
- **The frozen 20-hash matrix** (re-confirmed this session) — the blocking backstop.
- **Week-2's additions:** the Go arc (Days 8–10 — 5th stack, relationships, both DBs, live on both); the coding-style engine (Days 11–14 — formatting, naming, architectureDepth, wired into the wizard).
- **The style option applicability matrix** (§3).
- **The recorded style-alternative baselines** in one place: naming (5 per-stack `snake_case` Task hashes), formatting (Express `four-space`/`tab`), simple (4 hashes), and the Day-14 composition hashes.
- **The documented v1 limitations gathered across Week 2:**
  1. cross-stack **FK-key convention** differs (FastAPI/Django `team_id` snake vs Express/Go `teamId` camel) + naming's declared-fields-only **mixed-key** wire object (Day 12).
  2. **cross-depth switching unsupported** — depth fixed at project creation (Day 13).
  3. **`simple` is Postgres-baselined only** (collapse is dialect-independent) (Day 13).
  4. **formatting affects Express `.js` only** (other stacks: no-op) (Day 11).
  5. **`simple` on Express + FastAPI only** (Spring/Django/Go deferred) (Day 13).
- **Standing residuals** (carried from Week 1 + Week 2): Spring never booted live; MySQL live-proven only on Express + Go (FastAPI/Django/Spring MySQL generation-proven); `has-many` records no schema; relationship scope minimal (scalar FKs).

---

## 8. Done-conditions

### 8.1 Session 2 (Execution)
1. Style-selection screen added to the wizard (3 controls, each defaulting to `'default'`); selections flow to the model via a neutral `POST /api/style` → `setStyle`; the core stays neutral (opaque style value; server never inspects it).
2. Per-stack applicability gating implemented per §3 (non-applicable `<option>` values disabled, control pinned to `default`, with a visible reason; re-gated on backend change).
3. The chosen style shown in the wizard (Blueprint style chips + Style-screen summary; §4) — **not** the manifest (hash-safety).
4. UI==CLI for style proven for the representative selections (§6.3); a fresh untouched wizard reproduces the 20 default hashes.
5. **No generation-logic change** — only UI + the `/api/style` wiring. The 20 default hashes and all recorded alternative hashes are **unmoved**.

### 8.2 Session 3 (Evaluation + Closing)
- The regression matrix (§6) run and green: 20 default hashes (CLI **and** fresh wizard); per-option alternatives reproduce twice-identical; UI==CLI for style byte-identical; combined selections twice-identical.
- **Guard-the-guard** on the 20 digests (as Days 12/13) — diff-empty against the sources.
- **ADR sweep:** no AI (ADR-001); determinism (ADR-003); Law 25 (core neutral — style opaque to the server; no per-stack style logic in the kernel; the applicability map is front-end/composition knowledge); `TIMESTAMPTZ` JSDoc in `core/database.ts` untouched; ADR-004 (style shown in the wizard).
- **Optional live confirm:** one wizard-driven generate booted (if budget allows), stated honestly (booted vs generation-proven).
- Write [`docs/daily/day-14-report.md`](day-14-report.md) **AND** [`docs/daily/week-02-summary.md`](week-02-summary.md).

---

## 9. Scope guard — explicitly OUT for Day 14

- **No new style options, no new generation logic, no new stacks/databases/entity kinds.**
- **No architectureDepth `simple` for Spring/Django/Go** (deferred; the wizard gates it).
- **No full cross-product regression** (proportionate representative set only — §6).
- **No style in the GENERATION-MANIFEST** (would move frozen hashes; ADR-004 satisfied via the wizard).
- **Probabilistic / "personality" variation** — forbidden (ADR-003).
- **Do NOT let the wizard claim a style it will not deliver** — the applicability gating is a hard requirement.

---

## 10. Constraints (baked into every step)

- **ADR-001 (no AI):** the `/api/style` route is a pure pass-through; no AI/network in the generation path.
- **ADR-003 (determinism):** default is a literal bypass; all 20 default hashes frozen; alternatives twice-identical; same UI selections → byte-identical twice.
- **ADR-002 (file separation):** unchanged — no generation-logic change; developer files stay created-once (the existing demos re-confirm).
- **Law 25 (core neutral):** style is an **opaque structured value**; the server/UI carry no per-stack style logic in the kernel (the applicability map is composition-layer/front-end knowledge, like the backend option list). The `TIMESTAMPTZ` JSDoc in `core/database.ts` stays untouched.
- **ADR-004 (choices shown, not hidden):** the chosen style is visible in the wizard; the gating tells the truth about what each stack will deliver.
- **The 20-hash default backstop is non-negotiable.**

**Definition of "Day 14 done":** the three style options are selectable in a wizard style screen (defaulting to `'default'`, gated per stack so the UI never over-claims), flow to the model via a neutral `/api/style` endpoint, and are shown in the wizard (ADR-004); a fresh untouched wizard reproduces all 20 default hashes; wizard-driven style output is byte-identical to `setStyle`-driven output (UI==CLI); the recorded alternatives reproduce and 1–2 combined selections are deterministic (composition proven); the engine is untouched; the Week-2 summary is written. Written up in [`docs/daily/day-14-report.md`](day-14-report.md) + [`docs/daily/week-02-summary.md`](week-02-summary.md).
