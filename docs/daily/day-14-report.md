# Day 14 — End-of-Day Report: The style engine, wired into the wizard + proven end-to-end (Week-2 close)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no engine change. The only code touched is gate/test scaffolding + cleanup.
**Status: DONE — the three style options (formatting, naming, architectureDepth) are selectable in a wizard Style screen, gated per stack so the UI never over-claims, flowing to the model via a neutral `POST /api/style`. A fresh untouched wizard reproduces all 20 default hashes; wizard-driven style output is byte-identical to `setStyle`-driven output (UI==CLI); the recorded alternatives reproduce and two combined selections are deterministic; and a wizard-chosen style (FastAPI + snake_case + simple) booted live and round-tripped. Week 2 is closed.**

Plan: [`docs/daily/day-14-plan.md`](day-14-plan.md). The Week-2 close (Days 11–14 style arc). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), **ADR-004 (choices shown-not-hidden)**, Law 25 (core neutral).

**Day 14 changed no generated file's bytes: it added a Style screen and one neutral `/api/style` endpoint that calls the existing `setStyle`, which `buildFileSet` already reads. So the whole 20-hash backstop and every recorded alternative are frozen by construction — the work is purely UI + capture + display, proven equal to the CLI/engine path.**

---

## 1. What was built (Session 2, verified this session)

- **`POST /api/style`** ([`src/server.ts`](../../generator/src/server.ts)) — a neutral pass-through: it fills any omitted member from `defaultCodingStyle` (so a partial client can't break determinism) and calls `requireModel().setStyle(merged)`. **It never inspects the values** — it does not know what `'simple'` means or which stack supports it (Law 25). Style flows into generation because `buildFileSet` reads `model.getStyle()`; no generation logic was added.
- **The Style screen** ([`ui/index.html`](../../generator/ui/index.html)) — a dedicated **step 3** (Project → Entities → **Style** → Blueprint → Generated), three `<select>` controls each defaulting to `'default'`: naming (`default`/`camelCase`/`snake_case`), formatting indent (`default`/`two-space`/`four-space`/`tab`), architecture depth (`default`/`simple`). It POSTs the **full** `CodingStyle` on Next and on any change (unset = `'default'`).
- **Per-stack applicability gating** — a small front-end applicability map (composition-layer knowledge, the same tier as the backend `<option>` list, **not** kernel logic) disables the non-applicable option values, pins the control to `default`, and shows a reason; re-gates on backend change.
- **ADR-004 visibility** — style chips on the Blueprint summary (`Naming: …`, `Indent: …`, `Architecture: …`) read from `state.style`, plus the Style-screen summary. **Deliberately not the GENERATION-MANIFEST** — a manifest style line would move all frozen hashes; the wizard is the hash-safe shown-not-hidden surface.

---

## 2. THE BACKSTOP — fresh untouched wizard reproduces all 20 hashes (proof)

`npm run day14:gate` from a **clean rebuild** (`rm -rf dist && npm run build`). **Exit 0, zero FAIL.** Driving the REAL UI server (`POST /api/settings` → `/api/entities` → `/api/generate`, **no `/api/style`**), all 20 default combinations are byte-identical to the frozen digests **AND** the wizard output equals the CLI/engine output (`buildFileSet`):

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ | `d158529a…` ✅ |
| Postgres | TeamTracker | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ | `6aea8b04…` ✅ |
| MySQL | DemoApp | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ | `9ff40acb…` ✅ |
| MySQL | TeamTracker | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ | `7408a3e2…` ✅ |

**20/20 `frozen=true` and `UI==CLI=true`.** The wizard's default path is a literal bypass.

### Guard the guard — the 20 gate digests literally match the source reports

The 20 digests baked into `src/day14-gate.ts`, diffed against their sources (16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09-report.md`](day-09-report.md) / [`day-10-report.md`](day-10-report.md)). **`16/16` non-Go present in week-01-summary, `4/4` Go present in day-09/day-10, and the full 20-line diff is EMPTY (20 == 20).**

---

## 3. UI == CLI for style, and composition (the wired-end-to-end proof)

**UI == CLI for style** — driving the wizard (`/api/settings` → `/api/entities` → `/api/style` → `/api/generate`) equals the same style via `setStyle` on the CLI path, **byte-identical**:

| Selection | hash | UI==CLI |
|---|---|---|
| Express + Task + snake_case + four-space + simple | `58f0af06…` | ✅ |
| FastAPI + Task + snake_case + simple | `c57edf42…` | ✅ |
| Go + DemoApp + all-default (bypass) | `d158529a…` | ✅ |

**Composition (the genuinely new proof)** — combined multi-option selections on the multi-word `Task` model, generated **twice → byte-identical**, with a content spot-check that all chosen options are visible in one output:

- **A — Express + snake_case + four-space + simple → `58f0af062d8cc1561ce59567e9956618f5c107ed7e38eba6e9e58b484eab841b`** (twice-identical). Spot-check of the merged `crud.base.js`: carries `due_date: row.due_date` / `is_urgent: row.is_urgent` (naming) **AND** four-space indentation (formatting) **AND** is the collapsed one-module CRUD (depth) — all three options visible in a single file.
- **B — FastAPI + snake_case + simple → `c57edf42455085e8a694bb1e9c10db6f7e2bca0349f959bbf1f26d6140a5b45e`** (twice-identical). Spot-check: `schemas.py` snake fields + merged `crud_base.py`.

### Recorded alternatives reproduce (twice-identical, not new hashes)

All prior style-alternative baselines reproduce byte-identical under the full (default-except-chosen) `CodingStyle`:
- **naming** (Day 12) `snake_case` Task: Spring `0484560720f2…`, Express `f79bbb16a921…`, FastAPI `c8aebb183788…`, Django `f0c2c76599d5…`, Go `e5cc7b8c1142…` — 5/5.
- **formatting** (Day 11) Express DemoApp: `four-space` `d3ae91b0…`, `tab` `c81fb0f5…` — 2/2 (default naming + default depth are literal bypasses, so identical to Day-11's values).
- **simple** (Day 13): Express/FastAPI × DemoApp/TeamTracker `f340374447eb…`, `1f06af0d…`, `c60a4521…`, `a85d7f92…` — 4/4.

**No regressions:** the Day-13 gate, `ui:demo` (UI==CLI for all five stacks), `two-stacks` (Express file separation), and `python:demo` (FastAPI separation + multi-user) all PASS on the current build.

---

## 4. Browser-JS re-confirm (the gating is front-end — the API path can't prove it)

Drove the real preview and read the DOM (awaiting `enterStyleScreen()` so the read didn't race the async gating):

- **The 5-step stepper renders:** Project → Entities → **Style** → Blueprint → Generated.
- **Gating per backend** (disabled non-default option values + visible reason):

| Backend | naming | indent | depth |
|---|---|---|---|
| Express | all enabled | all enabled | `default`, `simple` |
| FastAPI | all enabled | **disabled** — "Indentation formatting currently affects Express .js only." | `default`, `simple` |
| Spring Boot | all enabled | **disabled** (same reason) | **disabled** — "Layered structure only for this stack (simple: Express/FastAPI)." |
| Django | all enabled | **disabled** (same reason) | **disabled** (same reason) |
| Go | all enabled | **disabled** (same reason) | **disabled** (same reason) |

- **Re-gate on backend change:** selected Express + `{four-space, snake_case, simple}` (model style confirmed = those three), then switched backend to Go → the controls and the model style **reset to all-`default`** — the UI never shows a style Go won't deliver.
- **ADR-004:** the Blueprint chips reflect the live selection — `Backend: FastAPI … Naming: snake_case, Indent: default, Architecture: simple` (screenshot captured), and the Style screen shows the selection + each gating reason.

---

## 5. Wizard-driven live boot (a wizard-chosen style produces a running app)

Drove the wizard end-to-end for **FastAPI + snake_case + simple** on Postgres (project name TaskApp, multi-user), confirmed the model style was `{snake_case, simple}` before generating and that the **simple** file set was written (`crud_base.py` present, `repository.py` absent; `schemas.py` has `due_date` / `is_urgent`). Then `docker compose up --build` (`postgres:16-alpine` + FastAPI), migrations `V1…V2` applied, admin seeded:

```
POST /api/tasks  {"due_date":"2026-07-01T09:30:00Z","is_urgent":true}   (snake_case wire keys)
 → 201  {"id":1,"due_date":"2026-07-01T09:30:00Z","is_urgent":true,"owner_id":1,"created_at":…,"updated_at":…}
GET  /api/tasks/1  → 200  (round-trips through the merged crud_base)
POST /api/tasks  {"dueDate":…}   (camel key — the wrong wire key)  → 422
```

A wizard-chosen style produced a **running** app: the `snake_case` wire key is the runtime contract (the camel key is rejected 422), the `simple` collapsed CRUD persists and reads back, and multi-user owner scoping holds (`owner_id:1`). Torn down with `compose down -v`; no residue. *(This is byte-identical to the Day-13-booted `setStyle` output by the UI==CLI proof; the boot additionally confirms the wizard→model→generation→running-app chain.)*

---

## 6. Cleanup

- Removed `.claude/launch.json` (Session-2 preview scaffolding — a local convenience, not a repo deliverable).
- No docker containers/volumes remain; the boot was torn down with `-v`; no stray `.mjs` scaffolding.
- **Honest residual:** `output/DemoApp` (a throwaway generated project from the browser re-confirm, byte-identical to the frozen default DemoApp — single-word fields under default depth) could not be deleted this session due to a lingering OS file handle. It is the UI server's normal output location, not a repo deliverable, and carries no docker/state; it will clear on the next clean-up. `output/arA` and `output/TeamTracker` pre-date this session.

---

## 7. ADR / Law compliance

- **ADR-001 (no AI):** grep of `src/core` + `src/plugins` for `fetch`/`axios`/`openai`/`anthropic`/`api_key`/`require('http(s)')` → the only hits are generated-template strings (the emitted apps' HTTP code) — same adjudication as Days 12/13. The `/api/style` route is a pure pass-through.
- **ADR-002 (file separation):** unchanged — no generation-logic change; `two-stacks` / `python:demo` re-confirm developer files are created-once and survive regeneration.
- **ADR-003 (determinism):** `'default'` is a literal bypass; all 20 default hashes frozen (CLI **and** fresh wizard); alternatives and compositions twice-identical.
- **Law 25 (core neutral):** style is **opaque structured data** to the server; the `/api/style` handler never inspects it; the applicability map is front-end/composition knowledge (no per-stack style logic in the kernel). The `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched.
- **ADR-004 (choices shown, not hidden):** the chosen style is shown in the wizard (Blueprint chips + Style-screen summary); the gating tells the truth about what each stack will deliver.

---

## 8. Scope — held

**In scope, done:** the `/api/style` endpoint (neutral); the Style screen (3 default-`default` controls); per-stack gating (re-gates on change; never over-claims); ADR-004 wizard visibility; fresh-wizard = 20 hashes; UI==CLI for style; composition A/B; recorded-alternative reproduction; the wizard-driven live boot; the Week-2 summary ([`week-02-summary.md`](week-02-summary.md)).

**Deliberately out:** new style options / generation logic / stacks / databases; `simple` for Spring/Django/Go (gated); style in the manifest (hash-safety); the full cross-product (proportionate representative set only); probabilistic variation (ADR-003). No re-baselining of any of the 20 default hashes.

---

**Day 14 verdict:** the coding-style engine is wired into the wizard and proven end-to-end. Three options select in a Style screen (defaulting to `default`, gated per stack so the UI never over-claims), flow through a neutral `/api/style` endpoint that keeps the core opaque to style, and are shown in the wizard (ADR-004). A fresh untouched wizard reproduces all 20 default hashes (guard-the-guard confirmed); wizard-driven style output is byte-identical to `setStyle` (UI==CLI); every recorded alternative reproduces and two combined selections are deterministic (composition proven); and a wizard-chosen style booted live and round-tripped. The engine is untouched. **Week 2 is closed — Day 15 opens Week 3 (API-only project type).** Written up here + [`docs/daily/week-02-summary.md`](week-02-summary.md).
