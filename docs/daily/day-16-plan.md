# Day 16 — Plan: API-only in the wizard + prove across all five stacks

**Session 1 of 3 — PLANNING ONLY. No implementation, no code edits. Output: this file.**

Day 16 wires `projectType` into the wizard (a type selection that gates the frontend question) and proves API-only end-to-end across all five stacks. **NO new generation machinery** — the type mechanism, the type↔frontend constraint, and the Spring frontend-subtraction are DONE and boot-proven (Day 15). Day 16 is **UI wiring + the across-stacks proof only**. Web-App baselines stay frozen (the 20 hashes).

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) (Law 25, ADR-004 shown-not-hidden), [`docs/adr/`](../adr) (ADR-001..005), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 16 = "API-only: wizard + prove across stacks"), [`day-15-report.md`](day-15-report.md) (the type mechanism + constraint + Spring subtraction — what we now wire into the UI), [`day-14-report.md`](day-14-report.md) (the PROVEN pattern to mirror: the Style screen + per-stack gating + UI==CLI), [`week-01`](week-01-summary.md)/[`week-02-summary.md`](week-02-summary.md) + [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md) (the 20-hash digests).

Grounding: this session read the real UI ([`ui/index.html`](../../generator/ui/index.html) Screen 1 + `setSettings` + `renderBlueprint`) and server ([`src/server.ts`](../../generator/src/server.ts) `POST /api/settings`), and **empirically probed the model** to resolve the crux in §3.

---

## 1. RECONNAISSANCE — resolved empirically

### Recon 1 — Is `projectType` a live wizard control?
**Yes, but single-valued.** Screen 1 has `<select id="projectType"><option>Web App</option></select>` — a live control with only one option. **Day 16 ADDS the `API-only` option** to this existing select (it does not create the control).

### Recon 2 — Is `frontend` a live wizard control?
**Yes.** Screen 1 has `<select id="frontend"><option>React</option><option>None</option></select>` — a live React/None selector. **Day 16 GATES this existing control** (hides it when API-only); it does not create it.

### Recon 3 — The settings path already carries both + enforces the constraint
`setSettings()` already sends `projectType: <projectType>.value` and `frontend: <frontend>.value` in the `POST /api/settings` body → `createProjectModel(body)` → which (Day 15) **already normalizes `projectType='API-only'` ⟹ `frontend='None'` and records it in `defaultsApplied`**. So **Day 16 needs NO server change and NO new endpoint** — the wizard must *reflect* a constraint the model already enforces, not re-implement it. (ADR-004 visibility is also partly wired: the blueprint header shows `p.projectType`; a Frontend chip shows `p.frontend`; `renderDefaults('settingsDefaults', …)` already renders applied defaults on Screen 1.)

**Size of the day: SMALL and front-end-only** — add one `<option>`, hide the frontend question on API-only with a shown consequence, and mirror the Day-14 gating discipline (inverted). Plus the across-stacks UI==CLI proof harness.

---

## 2. THE KEY DESIGN POINT — the UI must not DISAGREE with the model (Day-14 gating, inverted)

Day 14's rule was *"never let the UI claim a style a stack won't deliver."* Day 16's danger is the **inverse**: the model **already** normalizes `API-only ⟹ frontend=None`. So if the wizard lets someone pick API-only while still **showing** the frontend question as `React`, the model silently overrides it — and now the UI and the model disagree about what was chosen.

**The clean design: selecting `projectType='API-only'` HIDES the frontend question entirely** (there is nothing to ask — the type determines it), shown as a **stated consequence** (ADR-004 — visible, not silent), never a silent override. `projectType='Web App'` shows the frontend question normally (React or None). This mirrors Day 14's gating, inverted: the wizard must not hold or display a combination the model won't deliver (no visible `API-only + React`).

---

## 3. THE EMPIRICAL CRUX — which api-only output the wizard produces (grounded, not assumed)

Probed the model directly (Spring DemoApp, API-only, Postgres):

| Submitted `frontend` | model records? | hash |
|---|---|---|
| `'React'` (model normalizes → None **and records the default**) | ✅ `defaultsApplied: [frontend=None, "API-only projects have no frontend…"]` | **`97aef817…`** — the Day-15 baseline |
| `'None'` (already None → model records nothing) | ❌ `defaultsApplied: []` | `1fc7f87c…` — a sibling, no defaults-applied line |

They differ by **exactly one manifest line** — the ADR-004 "defaults applied" note. **The `React`→override→**record** variant (`97aef817…`) is BOTH the Day-15 baseline the proof targets AND the more ADR-004-compliant output** (it records *why* the frontend is None; the `None`-direct variant has `frontend: None` with no explanation).

**Design consequence:** the wizard, for API-only, submits a **non-None** frontend so the model performs its normalization **and records the None default** — reproducing the Day-15 baselines byte-for-byte. The submitted `React` is **immaterial and never shown as the user's choice** (the frontend question is hidden); the forced-None is surfaced by the model's **recorded default** + the UI consequence note + the None blueprint chip. This is not a "silent override" — the override is *recorded and shown* (that is precisely ADR-004's mechanism).

**Determinism guard:** the wizard must ensure API-only *always* submits a non-None frontend (so the record always fires → always `97aef817…`, regardless of the user's prior frontend pick). Session 2 picks the mechanism (e.g. on API-only, hide the frontend field and reset its value to `React`; or `setSettings` sends `frontend: projectType==='API-only' ? 'React' : <control>.value`). The **invariant**: wizard API-only output == the Day-15 CLI baseline.

---

## 4. The design (reflect-the-model-constraint; front-end only)

1. **Add `<option>API-only</option>`** to the `projectType` select (Screen 1). Web-App stays the first/default option.
2. **On `projectType` change (and on entry):**
   - **API-only** → **hide** the frontend field; show a stated consequence inline (e.g. *"API-only projects have no frontend — it will be set to None."*); ensure the submitted frontend is non-None (§3 guard) so the model records the None default.
   - **Web App** → **show** the frontend field normally (React/None).
3. **Submit path unchanged** — `setSettings` → `POST /api/settings` → `createProjectModel` (which normalizes + records). **No server change, no new endpoint.**
4. **ADR-004 visibility (already largely wired — confirm + lean on it):**
   - the blueprint header already shows `p.projectType` (→ "API-only");
   - the Frontend chip shows `p.frontend` (→ the normalized `None`);
   - `renderDefaults('settingsDefaults', …)` already renders the model's recorded `frontend = None` default on Screen 1;
   - plus the Style-screen-style stated consequence at selection time.
5. **No generation-logic change** — only `ui/index.html` + gate/demo scaffolding. The 20 Web-App hashes and the Day-15 api-only baselines are unmoved by construction.

---

## 5. The proof (mirror Day 14's UI==CLI shape)

**(1) BLOCKING — default-through-the-wizard (Web App) reproduces all 20 hashes** byte-for-byte (16 in `week-01-summary.md`, Go's 4 in `day-09`/`day-10`), via a fresh untouched wizard flow (drive the real server: `POST /api/settings` (Web App) → `/api/entities` → `/api/generate`) **AND** the CLI/gate path, with the **guard-the-guard** digest cross-check (diff-empty against the sources).

**(2) UI == CLI for the type — the "across all stacks" proof.** For each of the five backends, a wizard-chosen `projectType='API-only'` produces output **byte-identical** to the programmatic/CLI path — the **Day-15 baselines**:
- **Spring** (the real subtraction): DemoApp `97aef817…`, TeamTracker `190594dd…`.
- **Express** `c5210f73…`, **FastAPI** `46b3fda4…`, **Django** `5634e7ce…`, **Go** `5d67f242…` (each = its Web-App twin ± the two manifest lines + the recorded default).

This is a **hash-level equality of wizard-path vs CLI-path for BOTH types on all five** — the "across all stacks" proof, not a re-boot. (The harness drives `/api/settings` with `projectType='API-only'` + a non-None `frontend`, per §3, so the model records the default and the wizard output matches the Day-15 baselines.)

**(3) The constraint reflected in the UI.** Browser-driven (as Day 14): selecting API-only **hides** the frontend question and shows the consequence; the model records `frontend=None`; the blueprint shows `API-only` + `Frontend: None`. Confirm the wizard **cannot hold or display the incoherent `API-only + React` pairing** (mirror Day 14's "never hold a combination it won't deliver").

**(4) OPTIONAL (budget permitting) — ONE wizard-driven API-only boot** end-to-end (Spring api-only preferred — the real subtraction; already boot-proven Day 15, so this closes the wizard→running-app loop; or a fast backend-only stack). Stated honestly (booted vs hash-proven). Not required — UI==CLI byte-identity + the Day-15 boot already establish that a wizard selection produces the exact bytes that ran.

---

## 6. Done-conditions

### 6.1 Session 2 (Execution)
1. `projectType` wired into the wizard: the `API-only` option added to the existing select; selection flows via the existing `POST /api/settings` path (no new endpoint — confirmed §1).
2. The frontend question reflects the constraint: **API-only hides it** (submitting a non-None frontend so the model records `None`, per §3); **Web App shows it** normally; re-evaluated on type change. **Never silently override** — the forced-None is shown (recorded default + consequence note + None chip).
3. ADR-004 visibility: the chosen type + the forced `frontend=None` shown in the wizard (blueprint header/chip + Screen-1 defaults note), consistent with backend/database/style.
4. Default-through-the-wizard reproduces the 20 hashes (blocking); UI==CLI byte-identical for API-only across all five stacks (Spring subtracts; four are ± the manifest lines) — against the Day-15 baselines.
5. **NO generation-logic change** — only UI + the (existing) settings wiring. The 20 Web-App hashes and the Day-15 api-only baselines unmoved.

### 6.2 Session 3 (Evaluation + Closing)
- 20 Web-App hashes byte-identical (CLI **and** fresh wizard) + guard-the-guard diff-empty.
- UI==CLI byte-identical for API-only on all five stacks (against the Day-15 baselines `97aef817…`/`190594dd…`/`c5210f73…`/`46b3fda4…`/`5634e7ce…`/`5d67f242…`).
- The constraint reflected: the wizard cannot produce/display `API-only + React`; `frontend=None` shown (recorded default + consequence) when API-only.
- Optional one wizard-driven API-only boot, stated honestly.
- **ADR sweep:** no AI (ADR-001); determinism (ADR-003 — Web-App a literal bypass); Law 25 (`projectType` neutral; the type↔frontend constraint is generic project-shape, already in core; the UI applicability — hide-frontend-when-API-only — is front-end/composition knowledge, like Day-14's gating); ADR-004 (type + forced `frontend=None` shown, not silent); `TIMESTAMPTZ` JSDoc in `core/database.ts` untouched; `buildManifest` untouched. Write [`docs/daily/day-16-report.md`](day-16-report.md).

---

## 7. Scope guard — explicitly OUT for Day 16

- **No new generation logic, no new stacks/databases/types/style options.**
- **No re-baselining** of any of the 20 Web-App hashes or the Day-15 api-only baselines.
- **No rich frontend generation** — React stays scaffolded for Web-App.
- **No server change** — the settings path already carries `projectType` + enforces the constraint.
- **Do NOT let the wizard hold or claim an incoherent `type↔frontend` combination** (no visible `API-only + React`).

---

## 8. Constraints (baked into every step)

- **ADR-001 (no AI):** the UI wiring is inert front-end code; no AI/network in the generation path.
- **ADR-003 (determinism):** Web-App is a literal bypass (unchanged `projectType='Web App'` → 20 hashes frozen); API-only reproduces the Day-15 baselines (the §3 determinism guard ensures the recorded default always fires).
- **ADR-002 (file separation):** unchanged — no generation-logic change; developer files stay created-once (the demos re-confirm).
- **Law 25 (core neutral):** `projectType` is a neutral model value; the type↔frontend constraint is a **generic project-shape rule already in core** (Day 15); the wizard's **hide-frontend-when-API-only** is front-end/composition knowledge (like the backend option list / Day-14 style gating), not kernel logic. `buildManifest` and the `TIMESTAMPTZ` JSDoc stay untouched.
- **ADR-004 (choices shown):** the type is shown (blueprint header); the forced `frontend=None` is shown three ways — the model's recorded default (Screen-1 note), the consequence note at selection, and the None blueprint chip. Never silent.
- **The 20-hash Web-App backstop is non-negotiable.**

**Definition of "Day 16 done":** `projectType` is selectable in the wizard (Web App / API-only); selecting API-only hides the frontend question and forces `frontend=None`, shown (not silent); a fresh untouched wizard reproduces all 20 Web-App hashes; wizard-driven API-only output is byte-identical to the Day-15 CLI baselines across all five stacks (UI==CLI); the wizard cannot hold `API-only + React`; the engine is untouched. Written up in [`docs/daily/day-16-report.md`](day-16-report.md).
