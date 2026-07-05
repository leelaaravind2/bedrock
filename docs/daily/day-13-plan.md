# Day 13 — Plan: Coding-style engine — the THIRD option: `architectureDepth`

**Session 1 of 3 — PLANNING ONLY. No implementation, no code edits. Output: this file.**

Day 13 adds the **third** coding-style option — `architectureDepth` (`'default' | 'simple'`) — onto the engine Day 11 built and Days 11–12 proved. **No new machinery:** reuse `CodingStyle`, the no-op default, and the `EntityGenerationContext.style` seat. This is the **meatiest** option: formatting was a whitespace post-pass (Day 11), naming was a during-codegen identifier tweak (Day 12); **architecture depth BRANCHES THE FILE SET** — it changes *which files* are generated, not just their contents. `'default'` reproduces today's (layered) file set byte-for-byte; `'simple'` emits a flatter file set.

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) (esp. **Law 21** — a generated project runs even if Thraksha is removed; **Law 25** — the kernel holds no technology-specific logic), [`docs/adr/`](../adr) (ADR-001 no AI, ADR-002 file separation, ADR-003 determinism, ADR-005 foundational decisions), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 13), [`day-11-report.md`](day-11-report.md) (the engine reused), [`day-12-report.md`](day-12-report.md) (naming, just landed), [`week-01-summary.md`](week-01-summary.md) + [`day-09-report.md`](day-09-report.md) / [`day-10-report.md`](day-10-report.md) (the 20-hash digests).

Grounding: this session read the current `core/{style,project-model,plugin,regen}.ts` and each plugin's file-set builder + developer/Thraksha split (`plugins/{spring,express,python,django,go}/`). The per-stack file tables in §4 are read off the real code. **Key grounding fact:** both recommended stacks' shells **auto-discover the developer-owned routes seam by a fixed filename** — Express `src/app.js` scans `src/entities/<name>/<name>.routes.js` (exporting `{ basePath, router }`); FastAPI `app/main.py` scans `app/entities/<name>/routes.py` (exposing `router` + `base_path`). **That developer file must therefore exist and keep its export shape in BOTH depths, or the shell won't mount the entity.** This locks the seam design (§3).

---

## 1. CRITICAL FRAMING — two burdens beyond Days 11/12

1. **Deterministic switch (ADR-003).** Same model + same depth → byte-identical, always. `'default'` is a **literal bypass** = the current file set = all 20 hashes frozen. The file-set branch is a fixed, sorted array per entity — no order-dependence in *which* files appear (the core already sorts by `relPath` in `regen.ts`, but the plugin returns a stable list regardless).
2. **NEW this Day — BOTH VARIANTS MUST BOOT.** `'simple'` produces a structurally different app; generation-proof is not enough. **Booting the `'simple'` variant is the headline proof** (as FastAPI's live boot was Day 12's headline). Boot budget is planned honestly against the session limit (§6).

---

## 2. Precise scope

- **Values:** `'default' | 'simple'`. Default (and absent) ⇒ `'default'`, kept as a **literal bypass** so the backstop is airtight (`'default'` ≡ the current layered structure).
- **`'simple'`** = a flatter structure: the **repository (data-access) layer is removed and the remaining Thraksha base layers merge into one CRUD module** whose handlers do CRUD directly against the ORM/DB. The exact collapse is per-stack and idiomatic (§4), grounded in the real files — not invented.
- **Orthogonal to Day 11 formatting and Day 12 naming.** `'simple'` changes *which* files exist; those files must STILL get naming (wire keys) and formatting applied. The wire-key logic that lived in the removed layers (Express `rowToObject`, FastAPI Pydantic `alias`) moves into the merged file and keeps working. Plan **ONE combined spot-check** (Express `'simple'` + `snake_case`), not a full matrix (§7).
- **Depth is chosen up front, not a mid-project toggle** (consistent with ADR-005's philosophy for structural decisions). The developer files are created-once; switching an *existing* project's depth is a deliberate migration, out of scope — Day 13 supplies depth programmatically at generation; the wizard (Day 14) captures it up front.

---

## 3. THE CRUX — ADR-002 seam preservation (the single hardest constraint)

Today the developer-owned seam is built from the layers: developer owns `service.js`/`routes.js` (Express), `service.py`/`routes.py` (FastAPI), `service.go`/`routes.go` (Go), `views.py`/`urls.py` (Django), `${Entity}.java`/`${Entity}Service.java`/`${Entity}Controller.java` (Spring); Thraksha regenerates the base layers behind them.

**The locked invariant (non-negotiable, ADR-002):** `architectureDepth` varies the count of **THRAKSHA-owned base layers**; the **DEVELOPER-owned seam file(s) exist and are stable in BOTH depths** — same filenames, same role (business-logic home + shell mount point), never overwritten by regeneration. If a proposed `'simple'` design cannot preserve a developer seam, **that design is wrong — revise it, don't weaken ADR-002.**

The design that satisfies this cleanly (for both recommended stacks): **keep the same two developer files in both depths; collapse only the Thraksha base-layer count behind them.** Because the shell auto-discovers the developer `routes` file by a fixed name, that file *must* stay — which forces the correct seam. The developer's business-logic file (`service.*`) also stays in both depths; in `'simple'` it wires to the merged CRUD module instead of the layered ones (its *content* differs, but its identity, ownership, and role are stable, and regeneration never touches it).

Per-stack resolution (for the landed subset) — the four required answers:

**FastAPI**
- **Collapses in `'simple'`:** `repository.py` (removed) + `service_base.py` + `router_base.py` merge into ONE Thraksha `crud_base.py` (holds `class ${Name}ServiceBase` doing SQLAlchemy CRUD directly, and `build_${slug}_router(service)`).
- **Where dev logic lives:** `service.py` — `class ${Name}Service(${Name}ServiceBase)` (override any CRUD method), exactly as in `'default'`.
- **How the chain still routes through a dev file:** `main.py` auto-mounts `routes.py` (dev) → `routes.py` builds the router from `crud_base` + the dev `service` → endpoints call `service.*`.
- **Invariant:** `service.py` + `routes.py` are developer-owned and created-once in **both** depths; only the number of Thraksha base modules changes (5 code → 3).

**Express**
- **Collapses in `'simple'`:** `model.js` + `repository.js` + `service.base.js` + `controller.base.js` + `routes.base.js` merge into ONE Thraksha `${slug}.crud.base.js` (validates via the kept `dto.js`, does CRUD directly against the `pool`, builds the router). `dto.js` and the migration stay.
- **Where dev logic lives:** `${slug}.service.js` — the developer's domain module, wired into the router, exactly as in `'default'`.
- **How the chain still routes through a dev file:** `app.js` auto-mounts `${slug}.routes.js` (dev) → `routes.js` builds the router from `crud.base` + the dev `service` → handlers do CRUD.
- **Invariant:** `${slug}.service.js` + `${slug}.routes.js` are developer-owned and created-once in **both** depths; Thraksha base code files drop from 6 to 2 (`dto.js` + `crud.base.js`).

The explicit `'simple'` vs `'default'` file tables are in §4.

---

## 4. Per-stack file sets — grounded in the real code (landed subset)

`dir` = the entity's package dir (Express `src/entities/<slug>`, FastAPI `app/entities/<slug>`). T = Thraksha-owned (regenerated), D = developer-owned (created-once).

### 4.1 FastAPI (`plugins/python/entity-codegen.ts` → `generateEntityFiles`)

| File | `'default'` | `'simple'` | Note |
|---|---|---|---|
| `__init__.py` | T | T | package marker |
| `model.py` | T | T | SQLAlchemy model (unchanged) |
| `schemas.py` | T | T | Pydantic Create/Read — **carries the Day-12 naming alias** |
| `repository.py` | T | — | data-access layer **removed** |
| `service_base.py` | T | — | merged → `crud_base.py` |
| `router_base.py` | T | — | merged → `crud_base.py` |
| `crud_base.py` | — | T | **new:** `ServiceBase` (inline ORM CRUD) + `build_<slug>_router` |
| `migrations/V…__create_<table>.sql` | T | T | schema (unchanged; FKs identical) |
| `service.py` | **D** | **D** | subclass ServiceBase; imports `.crud_base` in simple |
| `routes.py` | **D** | **D** | shell-mounted; imports `.crud_base` in simple |

Thraksha code modules: **6 → 4** (repository gone; service_base + router_base merged). Developer files: **2 in both**.

### 4.2 Express (`plugins/express/entity-codegen.ts` → `generateEntityFiles`)

| File | `'default'` | `'simple'` | Note |
|---|---|---|---|
| `<slug>.model.js` | T | — | field metadata (informational; not on the runtime path) → dropped |
| `<slug>.repository.js` | T | — | data-access + `rowToObject` → merged into `crud.base.js` |
| `<slug>.dto.js` | T | T | validation — **carries the Day-12 naming read key** |
| `<slug>.service.base.js` | T | — | merged → `crud.base.js` |
| `<slug>.controller.base.js` | T | — | merged → `crud.base.js` |
| `<slug>.routes.base.js` | T | — | merged → `crud.base.js` |
| `<slug>.crud.base.js` | — | T | **new:** validate (dto) + CRUD vs `pool` (+ `rowToObject`) + router |
| `migrations/V…__create_<table>.sql` | T | T | schema (unchanged) |
| `<slug>.service.js` | **D** | **D** | developer domain module |
| `<slug>.routes.js` | **D** | **D** | shell-mounted `{ basePath, router }` |

Thraksha code files: **6 → 2** (`dto.js` + `crud.base.js`). Developer files: **2 in both**.

**Both collapses keep the migration and the developer seam byte-stable in role; the multi-user owner scoping (ADR-005) and belongs-to FK columns are unchanged — they live in the model/schema/migration and the CRUD SQL, which the merged module still emits.**

---

## 5. The engine changes (reuse Day 11 — no new machinery)

### 5.1 Core — `src/core/style.ts` (technology-neutral, Law 25)
- Add `export type ArchitectureDepth = 'default' | 'simple';`
- Extend `CodingStyle` with a top-level `readonly architectureDepth: ArchitectureDepth;`.
- Extend `defaultCodingStyle` → `{ formatting: { indent: 'default' }, namingConvention: 'default', architectureDepth: 'default' }`.
- **No helper needed** — depth is a plain value the plugin branches on. Law 25: the core carries only the generic `'simple'`/`'default'` value; **which files collapse is each plugin's decision.**

### 5.2 Model — `src/core/project-model.ts`
- **Load-bearing (same lesson as Day 12):** the `getStyle()`/`setStyle()` deep-copies MUST carry `architectureDepth` — extend both `{ formatting: {...}, namingConvention, architectureDepth }`. Forgetting it silently makes depth a no-op. Signatures unchanged.
- `restoreProjectModel` defaults pre-depth snapshots: `architectureDepth: state.style.architectureDepth ?? 'default'` (old versions regenerate byte-for-byte).

### 5.3 Threading — `src/core/plugin.ts` + each landed plugin
- `EntityGenerationContext.style` already carries the whole `CodingStyle`. **No `buildFileSet` change** — it already loops entities and calls `plugin.generateEntity(entity, { …, style })`.
- Each landed plugin's `generateEntity` reads `context.style.architectureDepth` and **branches the returned file set**: `depth === 'simple' ? generateSimpleEntityFiles(entity, ctx) : generateEntityFiles(entity, ctx)`. The existing `generateEntityFiles` is **untouched** — so the `'default'` path is a literal bypass and the 20 hashes are frozen by construction. The per-plugin `ctx` (naming, sql, multiUser) is passed to both branches, so naming/formatting compose in `'simple'` too.

### 5.4 Demos / baselines
- Reuse the Day-12 `day12-gate.ts` harness pattern (or a sibling) to hash `'default'` (the 20) and the new `'simple'` baselines. `'simple'` is exercised via `setStyle({ …, architectureDepth: 'simple' })` on `buildDemoAppModel` / `buildTeamTrackerModel` for the landed stacks. (Wizard UI is Day 14.)

---

## 6. Honest staging — recommend **Express + FastAPI** for full landing

**Recommendation: land Express and FastAPI FULLY** (generate + boot BOTH variants + seam-preserved + deterministic). **Justification, grounded in the real code and project history:**
- **They boot fastest.** Node (`node server.js`) and uvicorn start in seconds with no compile step; both have proven live-boot recipes (Express Day 4/Day 6; FastAPI Day 4/Day 12). Go needs `go build` (slower image), Spring needs a Maven/Gradle build (slowest — and Spring has **never** been booted live in the whole project, a standing Day-10 residual), Django boots but its collapse is more entangled (DRF `ModelViewSet` + `ModelSerializer` + a real migration graph + router in the dev `urls.py`).
- **They collapse most cleanly.** FastAPI's `repository`/`service_base`/`router_base` are plain Python modules; Express's layers are plain JS factories — merging them into one CRUD module is idiomatic ("drop the repository/service split"). The shell-auto-discovered `routes` seam is identical in both, so the ADR-002 story is airtight.
- **Boot budget (honest).** Four boots — Express{default, simple} + FastAPI{default, simple} — via `docker compose up --build`, each ~1–3 min (Day-12 booted two FastAPI variants comfortably), plus TeamTracker relationship-create calls and the regen/seam proofs (fast, no Docker). Total well within the session limit.
  - **Fallback (stated in advance):** if four boots won't fit, boot **both `'simple'` variants** (the headline) + confirm **one `'default'`** still boots (the `'default'` structure is the already-live-proven frozen one, lowest-risk), and mark the other `'default'` boot as generation-proven only — stated plainly. Prefer not to; four boots should fit.

**Stage honestly (design noted, deferred to Day 14 or later):** **Spring** (heavy annotation wiring; never booted live), **Django** (already relatively flat; migration-graph entanglement), **Go** (compile step). Their `'simple'` collapse would follow the same principle (remove the store/repository layer; merge base layers behind the stable `service`/`routes` (or `views`/`urls`) seam) — recorded, not built. **Boot-ability + seam preservation matter more than stack count.**

---

## 7. The backstop + new baselines

- **`'default'` (blocking).** All **20 hashes byte-for-byte** (5 backends × 2 DBs × 2 models; 16 in `week-01-summary.md`, Go's 4 in `day-09`/`day-10`). `architectureDepth: 'default'` is a no-op on the file set (literal bypass — the existing `generateEntityFiles` is untouched). Verified via the gate harness with the guard-the-guard digest cross-check (as Day 12).
- **`'simple'` new baselines.** For each landed stack (Express, FastAPI), establish `'simple'` hashes for **DemoApp AND TeamTracker** on **Postgres**, each generated **twice → byte-identical**, recorded. **TeamTracker proves relationships survive the collapse** — the belongs-to FKs must still generate correctly (columns + constraints in the migration; FK write path in the merged CRUD module) in the flatter structure.
- **Compositionality spot-check (ONE, not a matrix):** generate **Express `'simple'` + `snake_case`** twice → byte-identical, and confirm the wire keys (`due_date` in the merged `crud.base.js` `rowToObject` + `body.due_date` in `dto.js`) transformed correctly — proving depth composes with naming. (Optionally the same for FastAPI `'simple'` + `snake_case` via the `schemas.py` alias, time permitting.)

---

## 8. Done-conditions

### 8.1 Session 2 (Execution)
1. Extend `CodingStyle` with `architectureDepth: 'default' | 'simple'` (default `'default'`); `getStyle`/`setStyle` deep-copy **carries it** (load-bearing); `restoreProjectModel` defaults pre-depth snapshots to `'default'`.
2. Branch the file set on `context.style.architectureDepth` inside each **landed** plugin's `generateEntity` (Express, FastAPI). Core stays neutral (Law 25): the kernel carries only the generic value; WHICH files collapse is the plugin's decision. `'default'` path unchanged → byte-identical.
3. `'simple'` emitted for Express + FastAPI per the §3/§4 design; the developer seam (`service.*` + `routes.*`) present and wired in both depths.
4. Keep all **20 hashes byte-identical under `'default'`** (blocking). Establish `'simple'` DemoApp + TeamTracker (Postgres) hashes (twice-identical) for Express + FastAPI.

### 8.2 Session 3 (Evaluation + Closing)
- **20-hash matrix byte-identical under `'default'`** (blocking) — verified against `week-01-summary.md` + `day-09`/`day-10`, with the guard-the-guard digest cross-check.
- **`'simple'` baselines recorded** (DemoApp + TeamTracker, twice-identical) for Express + FastAPI.
- **BOOT both variants for each landed stack:** `'default'` still boots + CRUD round-trips; **`'simple'` boots + CRUD round-trips**, including a **relationship create on TeamTracker** (create a parent, then a child with its FK, read it back) to prove the collapsed structure handles FKs. Report actual request/response evidence; be explicit about what booted vs generation-proven only.
- **ADR-002 proof in BOTH depths:** write hand logic into the developer seam file (`service.*`), tamper a Thraksha base file, regenerate **twice** → developer file byte-identical, tampered base rewritten — run under **`'simple'` AND `'default'`**.
- **Compositionality spot-check:** `'simple'` + `snake_case` on Express (and optionally FastAPI) still generates correctly (twice-identical; wire keys transformed in the merged file).
- **ADR sweep:** no AI (ADR-001); determinism (ADR-003, `'default'` a literal bypass); **Law 25** (core neutral — no per-stack file logic in the kernel; only the generic depth value); the `TIMESTAMPTZ` JSDoc in `core/database.ts` untouched; **Law 21** (the `'simple'` project runs standalone — proven by the boot, no Thraksha markers needed to run).
- **Honest staging table** (Express + FastAPI landed; Spring/Django/Go deferred with design noted). Write [`docs/daily/day-13-report.md`](day-13-report.md).

---

## 9. Scope guard — explicitly OUT for Day 13

- **Wizard style-selection UI → Day 14.** Day 13 supplies `architectureDepth` programmatically (via `setStyle` / the demo models).
- **No new engine machinery** — reuse Day 11's (`CodingStyle`, no-op default, `EntityGenerationContext.style`). The only additive core surface is the neutral `architectureDepth` value.
- **Probabilistic / "personality" variation** — forbidden (ADR-003).
- **New backends, databases, entity kinds, project types** — out.
- **Do NOT weaken or remove the developer seam to make `'simple'` easier** — ADR-002 is a hard gate. The `service.*` + `routes.*` seam exists in both depths.

---

## 10. Constraints (baked into every step)

- **ADR-001 (no AI):** the file-set branch is pure, deterministic code; no AI/network in the generation path.
- **ADR-003 (determinism):** same model + depth → byte-identical; `'default'` is a literal bypass (existing `generateEntityFiles` untouched); the `'simple'` file list is a stable, sorted array; all 20 default hashes frozen; `'simple'` baselines twice-identical.
- **ADR-002 (file separation — the crux):** the developer seam (`service.*` + `routes.*`) is developer-owned, created-once, and byte-stable-in-role across **both** depths; regeneration never opens it. Proven by the tamper/regen test in both depths.
- **Law 25 (core neutral):** the kernel carries only `architectureDepth`; the collapse decision lives entirely in each plugin. The `TIMESTAMPTZ` JSDoc in `core/database.ts` stays untouched.
- **Law 21 (standalone):** the `'simple'` output is ordinary Node/Python — it runs after Thraksha is removed (proven by the live boot). The 20-hash `'default'` backstop is non-negotiable.

**Definition of "Day 13 done":** `architectureDepth` (`'default'`/`'simple'`) is a deterministic switch on the **generated file set**, landed on Express + FastAPI; `'default'` reproduces all 20 hashes byte-for-byte; `'simple'` emits a flatter file set (repository layer removed, base layers merged) that **preserves the developer seam in both depths** and **boots live** with CRUD + a TeamTracker relationship round-trip; ADR-002 holds under both depths; depth composes with naming/formatting; Spring/Django/Go are honestly staged. Written up in [`docs/daily/day-13-report.md`](day-13-report.md).
