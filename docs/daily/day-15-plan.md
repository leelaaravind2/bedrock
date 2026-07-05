# Day 15 — Plan: API-only project type — the type mechanism + coherent generation (Week 3 opens)

**Session 1 of 3 — PLANNING ONLY. No implementation, no code edits. Output: this file.**

Day 15 adds **API-only** as a second project **type** (a backend with no frontend), proving the project-type mechanism — *"type decides what is asked and generated."* The **Web-App** type is unaffected: the 20 hashes stay frozen. Day 15 = the type mechanism + coherent API-only generation on a chosen subset with a **coherence check** (does the API-only project actually stand up?). Wiring into the wizard + proving across all stacks is **Day 16**.

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) (Law 21 runs-standalone, Law 25 core-neutral), [`docs/adr/`](../adr) (ADR-001..005, esp. ADR-004 shown-not-hidden), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 15 = design + generation; Day 16 = wizard + across-stacks), [`docs/INTAKE-SPEC.md`](../INTAKE-SPEC.md) (Phase-A Q2 type; Q4 frontend React/None; Q5 database), [`week-01-summary.md`](week-01-summary.md) + [`week-02-summary.md`](week-02-summary.md) + [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md) (the 20-hash digests).

---

## 1. RECONNAISSANCE — the three questions, resolved empirically (Session 1's core job)

### Recon 1 — Does a `type` field exist? Where is the byte-safe introduction point?
**Yes — `projectType` already exists** (Phase-A Q2, mandatory) with a single value `'Web App'` ([`project-model.ts`](../../generator/src/core/project-model.ts): `projectType: 'Web App'`). It is in `PHASE_A_KEYS`, set by every demo model, and — critically — **already rendered in the GENERATION-MANIFEST** (`buildManifest` in `regen.ts` renders every Phase-A entry as `- <k>: <v>`, so `- projectType: Web App` is in all 20 outputs today).
**Byte-safe introduction point: EXTEND `projectType` to `'Web App' | 'API-only'` (default `'Web App'`)** — do **not** add a separate new field. See §3a and the manifest resolution in §4.

### Recon 2 — THE FORK: what is the real state of the frontend-`None` / no-frontend branch?
**Resolved empirically — the fork is ASYMMETRIC. Four of five stacks are ALREADY coherent backend-only; only Spring scaffolds a frontend.** Evidence (read off the templates):

| Stack | frontend folder | compose services | README frontend refs | displayName |
|---|---|---|---|---|
| **Express** | none | `db`, `backend` only | none | `Express + PostgreSQL` |
| **FastAPI** | none | `db`, `backend` only | none | `FastAPI + PostgreSQL` |
| **Django** | none | `db`, `backend` only | none | `Django + PostgreSQL` |
| **Go** | none (`internal/web` is Go backend code) | `db`, `backend` only | none | `Go + PostgreSQL` |
| **Spring** | **`frontend/` (8 files)** | `db`, `backend`, **`frontend`** (nginx, `3000:80`, `depends_on: backend`) | **many** (README lines 8, 25, 28–29, 62, 67–69, 77) + header "full stack … React (nginx)" | **`Spring Boot + React + PostgreSQL`** |

**Conclusion:** the plugins never read the `frontend` answer — it is **nominal** for four stacks (`frontend: 'React'` generates *nothing*; those projects are already API-only in structure and have already booted, Weeks 1–2). **Spring is the ONLY stack where `projectType='API-only'` changes the output**, because it is the only stack that scaffolds a frontend. So Spring is where the "coherent subtraction" work AND the mechanism proof live — the reverse of Day 13's Express/FastAPI logic (there the collapse was in the backend, present everywhere; here the subtraction is the frontend, present only in Spring).

### Recon 3 — The manifest + the `database:'None'` premise
- **`buildManifest` renders Phase-A** (confirmed) — so `projectType` (and `frontend`) already appear. This is what makes the reuse in §3a byte-safe (§4).
- **CORRECTION to the task premise:** there is **no proven `database:'None'` implementation to mirror.** `selectDatabaseProvider` ([`database-registry.ts`](../../generator/src/plugins/database-registry.ts)) maps only `PostgreSQL`/`MySQL` and **throws** for anything else; the UI's `<option>None</option>` for database is a **latent, unwired option** (selecting it would error). Day 5a extracted the provider *seam* and added providers — it never built a coherent "no database" subtraction. So Day 15's Spring frontend-subtraction is **built fresh** (there is no `database:None` precedent). The nearest real precedent is the **token-substitution shell mechanism itself** (how the compose already gates `__DB_*__` fragments) — reuse that pattern (§3c).

---

## 2. What "coherent API-only" means (the bar the boot must clear)

A frontend-free-but-*incoherent* project is the failure mode (compose still lists a frontend service whose build context is gone; README still says "run the frontend"). **Coherent API-only = the `db + backend` compose stands up, the backend serves, migrations apply, a CRUD round-trip works, README describes an API-only run, and there is NO dangling frontend reference** (no `frontend:` service, no `./frontend` build context, no `:3000`, no `frontend/` folder). The headline proof is *"the API-only project boots and serves,"* not *"the frontend files are absent."*

---

## 3. The design

### 3a. The type value — extend `projectType`, a literal Web-App bypass
- `projectType: 'Web App' | 'API-only'`, default `'Web App'`; absent ⇒ `'Web App'` (createProjectModel already treats projectType as mandatory-present; the demos all pass `'Web App'`).
- **Byte-safe by construction:** every existing model keeps `projectType='Web App'` (same string) → its manifest line is **identical** → the 20 hashes are frozen automatically. API-only projects get `projectType='API-only'` (a new value, no frozen hash). This follows the **relationships-alias precedent** (Day 1: introduce a concept, default it, make the default a byte-for-byte no-op).
- `restoreProjectModel`: projectType is mandatory and present in every snapshot as `'Web App'`, so restore already reproduces old versions byte-for-byte. Add a **defensive** default (`projectType ?? 'Web App'`) for robustness against hand-edited snapshots — a no-op for real snapshots.

### 3b. The type↔frontend constraint (settle explicitly)
`projectType` and `frontend` are **not independent**: **API-only IMPLIES no frontend.** The clean model: `projectType` is the higher-level concept that **constrains** the lower answer.
- **`projectType === 'API-only'` ⟹ the model normalizes `frontend` to `'None'`** — enforced in `createProjectModel` (core), recorded in `defaultsApplied` (ADR-004 — shown, never silent). This is a **generic project-shape rule** ("API-only has no frontend"), not technology-specific, so it is Law-25-clean to live in the kernel (like the existing `multiUser`/`auth` normalization).
- `projectType === 'Web App'` allows `frontend` = React **or** None (unchanged).
- **The wizard (Day 16) must never permit the contradictory pairing** (API-only + React); the model enforcing the constraint is what makes that impossible — the same gating discipline as Day 14 (the model/UI must not hold a combination it won't deliver coherently).

### 3c. The coherent subtraction — Spring only, keyed on `frontend === 'None'`, token-gated
The subtraction is a **frontend-slice** concern: **`frontend === 'None'` ⟹ omit the frontend slice.** (`projectType='API-only'` forces `frontend='None'` per §3b, so API-only triggers it; a Web-App + None project would also get a coherent backend-only Spring shell — correct.) This mirrors how `database` drives the DB slice via the DatabaseProvider seam; the kernel holds the neutral answer, the **Spring plugin** decides how its shell subtracts (Law 25). It is a **literal bypass** for `frontend !== 'None'`, so Spring's 4 Web-App hashes stay frozen.

**Spring frontend touch-point inventory (every place the frontend leaks into the shell) — what the subtraction must handle:**

| Touch-point | Web-App (today) | API-only (`frontend='None'`) |
|---|---|---|
| `frontend/` folder (8 files: Dockerfile, nginx.conf, index.html, package.json, vite.config.js, src/App.jsx, src/main.jsx, .dockerignore) | generated | **omitted** (the shell walk skips the `frontend/**` subtree) |
| `docker-compose.yml` — `frontend:` service block (nginx, `3000:80`, `depends_on: backend`) | present | **removed** |
| `docker-compose.yml` — header comment ("full stack … + React (nginx)") | present | **"backend-only" wording** |
| `README.md` — frontend refs (stack table row, `:3000` URL, "frontend page" description, structure tree `frontend/`, compose comment "db + backend + frontend", `cd frontend && npm …`) | present | **removed / adjusted to an API-only run** |
| `displayName` (plugin property, cosmetic — not in any hash) | `Spring Boot + React + PostgreSQL` | `Spring Boot + PostgreSQL` (optional; affects only the UI label) |

**Mechanism (byte-safe):** gate the frontend-specific fragments behind the existing **token-substitution** pattern the Spring shell already uses (`__DB_*__` fragments). Introduce frontend tokens (e.g. `__COMPOSE_FRONTEND_SERVICE__`, `__README_FRONTEND_*__`) whose **Web-App values are the EXACT current text** (so Web-App output is byte-identical → 4 Spring hashes frozen) and whose API-only values are empty/alternative; skip the `frontend/**` subtree when `frontend==='None'`. Session 2 chooses the precise tokenization; the invariant is **Web-App = literal bypass; API-only = coherent backend-only shell.**

**The other four stacks (Express/FastAPI/Django/Go): no shell work.** They are already backend-only; `projectType='API-only'` changes only the two manifest lines (`projectType`, `frontend`). Their API-only output is byte-identical to Web-App **except those two lines** — a formalization of intent, not a subtraction. They already boot (Weeks 1–2).

---

## 4. The manifest — the trap is AVOIDED, not worked-around

The task frames a manifest trap: adding a **type line** would move all 20 hashes, resolved by gated emission (emit only when `type ≠ web-app`). **The reconnaissance shows the trap is avoidable entirely:** `projectType` is **already** a rendered Phase-A line. By **reusing** `projectType` (§3a) and keeping the Web-App value the exact string `'Web App'`, the manifest line is **byte-identical for Web-App by construction** — no new line, no gated emission, no restore-defaulting needed. API-only naturally renders `- projectType: API-only` (+ `- frontend: None`, from the §3b normalization), which is new output with no frozen hash.

*(Had we added a separate lowercase `type` field, the task's gated-emission discipline — "emit only when ≠ web-app" — would be the correct fix. Reuse makes it unnecessary and is strictly cleaner; recommended.)*

---

## 5. Scope — the landed subset, recommended with justification

**The type mechanism is universal (near-free, model-level); the shell subtraction lands on Spring (the only stack that has a frontend); the coherence boot is Spring API-only.** Justification, grounded in the §1 inventory (NOT copied from Day 13's Express/FastAPI logic, which does not transfer):
- **Type mechanism → all 5 stacks.** `projectType='API-only'` + the frontend='None' constraint + the (already-rendered) manifest line are model-level and cost nothing per stack.
- **Frontend subtraction → Spring only.** Express/FastAPI/Django/Go have **nothing to subtract** — their API-only output equals Web-App except two manifest lines, so "landing" API-only there is *vacuous* (no bytes change; the mechanism is unexercised). **Spring is the only stack where `projectType='API-only'` produces different output**, so it is the only stack that actually **proves** "type decides what is generated." Landing Spring's coherent subtraction IS the day's substance.
- **Coherence boot (headline) → Spring API-only.** Boot the frontend-subtracted Spring project: `db + backend` compose stands up, migrations apply, a CRUD round-trip works, **no dangling frontend reference**. This is the meaningful boot (the only stack with a subtraction to validate at runtime) and doubles as **Spring's first-ever live boot** (a standing residual since Week 1).
- **The other four: confirmed, not re-worked.** Their API-only output is byte-identical to Web-App except the two manifest lines (verified by hash), and they have already booted — stated plainly, no re-boot needed.

**Fallback (stated in advance).** Spring has never booted (Maven build — the slowest, first-time). If Spring's first boot surfaces Spring-general issues unrelated to API-only, or won't fit the session: prove the Spring API-only subtraction **statically** (`docker compose config` validates the compose has only `db + backend`, no `./frontend` build context; no `frontend/` folder; README consistent) AND boot **FastAPI API-only** (fast, already backend-only) to confirm the type path runs end-to-end — then state plainly that Spring's subtracted project is generation + static-coherence-proven, its live boot deferred to Day 16. Do not fake a boot.

---

## 6. Done-conditions

### 6.1 Session 2 (Execution)
1. `projectType` extended to `'Web App' | 'API-only'` (default `'Web App'`); threaded so Web-App is a **literal bypass**; `restoreProjectModel` defensively defaults old snapshots to `'Web App'`. **No new manifest line** — the reused `projectType` line is byte-identical for Web-App (§4).
2. The **type↔frontend constraint** enforced in `createProjectModel`: `projectType='API-only'` ⟹ `frontend='None'`, recorded in `defaultsApplied` (ADR-004).
3. **Spring API-only generation** — the coherent frontend subtraction per the §3c inventory (frontend folder omitted; compose `frontend` service removed + header adjusted; README consistent), token-gated so Web-App (`frontend !== 'None'`) is a literal bypass. Reuse the existing token-substitution mechanism (there is no `database:None` precedent — §1 recon 3).
4. Keep all **20 hashes byte-identical under Web-App** (blocking). Establish **Spring API-only baselines** (DemoApp on Postgres, twice-identical; optionally TeamTracker to show relationships survive — they are backend-only, unaffected by the frontend removal). Record the four other stacks' API-only hashes too (each = its Web-App output ± the two manifest lines) for completeness.

### 6.2 Session 3 (Evaluation + Closing)
- **20-hash matrix byte-identical under Web-App** (blocking) + guard-the-guard (diff-empty against week-01-summary + day-09/day-10).
- **API-only baselines recorded** (twice-identical) for the landed subset — Spring (the meaningful subtraction) + the four already-coherent stacks.
- **COHERENCE BOOT (headline):** at least one API-only project boots — **Spring API-only** preferred (db + backend stands up, migrations apply, CRUD round-trip, **no dangling frontend reference**; also Spring's first live boot). Fallback per §5, stated honestly (booted vs generation+static-coherence-proven).
- **ADR sweep:** no AI (ADR-001); determinism (ADR-003 — Web-App is a literal bypass, all 20 frozen, API-only twice-identical); Law 25 (`projectType` is a neutral model value + a generic type↔frontend constraint; the per-stack shell subtraction lives in the Spring plugin, not the kernel); Law 21 (API-only runs standalone — proven by the coherence boot); ADR-004 (type shown — the reused `projectType` manifest line + the recorded frontend=None default; wizard UI is Day 16); `TIMESTAMPTZ` JSDoc in `core/database.ts` untouched.
- Write [`docs/daily/day-15-report.md`](day-15-report.md).

---

## 7. Scope guard — explicitly OUT for Day 15

- **Wizard type-selection UI + prove-across-all-stacks → Day 16.** Day 15 supplies `projectType` programmatically.
- **No new backends / databases / entity kinds / style options.**
- **No rich frontend generation** — React stays scaffolded for Web-App; API-only omits it (per the 21-day plan, rich frontend is out of scope).
- **No shell subtraction for Express/FastAPI/Django/Go** — they are already backend-only; nothing to subtract.
- **Probabilistic variation** — forbidden (ADR-003).
- **Do NOT let the model hold an incoherent `projectType`↔`frontend` combination** (API-only + React) — the §3b constraint forbids it.

---

## 8. Constraints (baked into every step)

- **ADR-001 (no AI):** the type value + the shell subtraction are pure, deterministic code; no AI/network in the generation path.
- **ADR-003 (determinism):** Web-App is a **literal bypass** (reused `projectType='Web App'`, unchanged output → 20 hashes frozen); API-only twice-identical.
- **ADR-002 (file separation):** unchanged — the subtraction only omits Thraksha-owned shell files; developer files are unaffected.
- **Law 25 (core neutral):** `projectType` is a neutral model value; the type↔frontend constraint is a generic project-shape rule (kernel-OK, like `multiUser`); the **per-stack frontend-slice subtraction is plugin/composition-layer** (the Spring plugin), never the kernel. The `TIMESTAMPTZ` JSDoc in `core/database.ts` stays untouched.
- **Law 21 (standalone):** the API-only project is ordinary Spring/Node/Python — it runs after Thraksha is removed (proven by the coherence boot; no dangling frontend refs).
- **ADR-004 (choices shown):** `projectType` renders in the manifest (already); the API-only→frontend=None normalization is recorded in `defaultsApplied`.
- **The 20-hash Web-App backstop is non-negotiable.**

**Definition of "Day 15 done":** `projectType` supports `'API-only'` (a literal Web-App bypass — all 20 hashes frozen); API-only implies no frontend (model-enforced, recorded); the Spring shell subtracts its frontend coherently (folder omitted, compose frontend service removed, README consistent, Web-App byte-identical); a Spring API-only project boots and serves with no dangling frontend reference; the four already-backend-only stacks' API-only output is byte-identical to Web-App except the two manifest lines. Written up in [`docs/daily/day-15-report.md`](day-15-report.md).
