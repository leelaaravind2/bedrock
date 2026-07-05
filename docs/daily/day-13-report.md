# Day 13 — End-of-Day Report: Coding-style engine — the THIRD option, `architectureDepth`

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no new depth work. The only code touched this session is gate/npm/test scaffolding.
**Status: DONE — `architectureDepth` (`'default' | 'simple'`) is a deterministic switch that BRANCHES THE FILE SET, landed on Express + FastAPI. `'default'` reproduces all 20 recorded hashes byte-for-byte (literal bypass). `'simple'` emits a flatter file set (repository layer removed, base layers merged into one CRUD module) that PRESERVES the developer seam in both depths and BOOTS LIVE — both stacks' `'simple'` variant round-trips a full TeamTracker create → FK → update → read-back through the collapsed data-access path on real Postgres.**

Plan: [`docs/daily/day-13-plan.md`](day-13-plan.md). Step 3 of the coding-style arc (Days 11–14), on the engine Day 11 built and Days 11–12 proved. Guardrails: ADR-001 (no AI), ADR-002 (file separation — the crux), ADR-003 (determinism), Law 21 (standalone), Law 25 (core neutral).

**Architecture depth is the meatiest style option. Formatting (Day 11) was a whitespace post-pass; naming (Day 12) was a during-codegen identifier tweak; depth changes WHICH files are generated. That means static checks (parse/py_compile/node --check) cannot prove it: a merged CRUD module can generate and parse yet fail to `commit()`, read stale after a write, drop the FK on the collapsed insert path, or expose a router the shell never mounts. Only the boot proves it. The four boots are the day.**

---

## 1. What was built (Session 2, verified this session)

- **`src/core/style.ts`** (technology-neutral, Law 25) — `ArchitectureDepth = 'default' | 'simple'`; `CodingStyle` gains a top-level `architectureDepth`; `defaultCodingStyle` extended. No helper — depth is a plain value the plugin branches on.
- **Model** (`project-model.ts`) — the load-bearing edit (same lesson as Day 12): `getStyle()`/`setStyle()` deep-copies now carry `architectureDepth`; `restoreProjectModel` defaults pre-depth snapshots to `'default'`.
- **Branch, not new machinery** — each landed plugin's `generateEntity` does `depth === 'simple' ? generateSimpleEntityFiles(ctx) : generateEntityFiles(ctx)`. The existing `generateEntityFiles` is **untouched**, so `'default'` is a literal bypass and the 20 hashes are frozen by construction. `EntityGenerationContext.style` already carried the value (Day-11 seat); the core's `buildFileSet` needed no change.

### Per-stack collapse — grounded in the real files

**FastAPI** (`app/entities/<slug>/`): `repository.py` removed; `service_base.py` + `router_base.py` merged into one `crud_base.py` (`class <Name>ServiceBase` doing SQLAlchemy CRUD inline + `build_<slug>_router`). Thraksha code modules **6 → 4**. Files DemoApp: 25 → 23.

**Express** (`src/entities/<slug>/`): `model.js` + `repository.js` removed; `service.base.js` + `controller.base.js` + `routes.base.js` + the data access merged into one `crud.base.js` (validate via kept `dto.js` → CRUD vs `pool` → router). Thraksha code files **6 → 2**. Files DemoApp: 24 → 20.

**The developer seam (`service.*` + `routes.*`) is present, developer-owned, and unchanged-in-role in BOTH depths** — the shells (`app/main.py`, `src/app.js`) auto-discover the `routes` file by a fixed name, so it must and does keep its export shape. In `'simple'` the seam files import the merged `crud_base`/`crud.base` instead of the layered modules; only the Thraksha base-layer count changes. Multi-user owner scoping (ADR-005) and belongs-to FK columns/writes are unchanged — they live in the model/schema/migration and the CRUD SQL the merged module still emits.

---

## 2. THE BLOCKING BACKSTOP — `'default'` reproduces all 20 hashes (proof)

`npm run day13:gate` from a **clean rebuild** (`rm -rf dist && npm run build`). **Exit 0, zero FAIL. All 20 byte-identical under `'default'`:**

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ | `d158529a…` ✅ |
| Postgres | TeamTracker | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ | `6aea8b04…` ✅ |
| MySQL | DemoApp | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ | `9ff40acb…` ✅ |
| MySQL | TeamTracker | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ | `7408a3e2…` ✅ |

**Accounting (corrected from the Session-2 note):** the **untouched** stacks are Spring / Django / Go = **3 backends × 2 DBs × 2 models = 12 hashes**; the two **landed** stacks (Express, FastAPI) = **8 hashes**; **12 + 8 = 20**. All 20 were verified, not just the 8 landed — the untouched 12 confirm the branch did not leak into the other plugins, the landed 8 confirm the `'default'` bypass is literal.

### Guard the guard — the 20 gate digests literally match the source reports

The 20 digests baked into `src/day13-gate.ts`, extracted and diffed against their sources (16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09-report.md`](day-09-report.md) / [`day-10-report.md`](day-10-report.md)). **Empty diff — 20 == 20:**

```
PG DemoApp     {Spring 010098cd… Express a437a302… FastAPI dca2254f… Django 68601cc5… Go d158529a…}   all ==
PG TeamTracker {Spring 9e01210c… Express dca2b4a7… FastAPI 6d422010… Django e509309c… Go 6aea8b04…}   all ==
MY DemoApp     {Spring 3112d3f7… Express d4b57b52… FastAPI cd87d6e3… Django 8b07a1b2… Go 9ff40acb…}   all ==
MY TeamTracker {Spring 4c4640ba… Express bfa4a536… FastAPI 5c788c70… Django 3b3e6a6f… Go 7408a3e2…}   all ==
diff(source_sorted, gate_sorted) → (empty)   counts: source=20 gate=20
```

### The 4 `'simple'` baselines reproduce (twice-identical, Postgres)

| Stack | DemoApp `'simple'` | TeamTracker `'simple'` |
|---|---|---|
| Express | `f340374447eb612787f1a37ef1efd59c6990f3adcb3189415110416f0f76e767` | `1f06af0d7bc80e534bddefd43303ddef336344929b362d78bf395a7739b2b9f3` |
| FastAPI | `c60a4521918034d9eba54346565e06196c43d5ff6811cca61b56aa828ff34c4a` | `a85d7f9260f813e30405ad649924a95a0388cf52d2d9c5978df720736006d869` |

Each generated twice → byte-identical (the `'simple'` file list is a stable, sorted array — ADR-003). **TeamTracker proves relationships survive the collapse**: the FK columns + constraints in the migration and the FK write path in the merged CRUD module are present (verified statically, then live in §3).

---

## 3. THE HEADLINE — the `'simple'` variants boot and round-trip on real Postgres

Four boots via `docker compose up --build` against `postgres:16-alpine`, each torn down with `down -v`. HTTP Basic `admin:admin123` (seeded); TeamTracker is multi-user so every row is owner-scoped to the logged-in user. Express :8080, FastAPI :8000. Migrations `V1…V5` applied on every boot.

### 3a. Express `'simple'` / TeamTracker — full round-trip through the collapsed data-access path

```
POST /api/teams        {"name":"Platform","description":"core"}
 → 201  {"id":"1","name":"Platform",...,"ownerId":"1", ...}
POST /api/applications {"name":"Billing","status":"active","teamId":1}
 → 201  {"id":"1","name":"Billing","status":"active","teamId":"1","ownerId":"1", ...}
POST /api/tickets      {"title":"Fix login","code":"BUG-1","priority":3,"done":false,"applicationId":1,"teamId":1}
 → 201  {"id":"1",...,"applicationId":"1","teamId":"1","ownerId":"1", ...}      # FK write via merged crud.base
GET  /api/tickets/1
 → 200  {...,"applicationId":"1","teamId":"1",...}                             # FK values round-trip
PUT  /api/tickets/1    {... "priority":9,"done":true ...}
 → 200  {...,"priority":9,"done":true,"updatedAt":"…52.425Z"}                  # commit + update path
GET  /api/tickets/1
 → {...,"priority":9,"done":true,...}                                          # persisted, no stale read
GET  /api/tickets      (no Authorization)  → 401                              # owner scoping intact
```

### 3b. FastAPI `'simple'` / TeamTracker — full round-trip through the collapsed data-access path

```
POST /api/teams        {"name":"Platform","description":"core"}
 → 201  {"id":1,...,"owner_id":1, ...}
POST /api/applications {"name":"BillingFix","status":"active","team_id":1}
 → 201  {"id":2,"name":"BillingFix","status":"active","team_id":1,"owner_id":1, ...}   # FK write via merged crud_base
POST /api/tickets      {"title":"FKtest","code":"BUG-2","priority":1,"done":false,"application_id":2,"team_id":1}
 → 201  {"id":2,...,"application_id":2,"team_id":1,"owner_id":1, ...}
GET  /api/tickets/2
 → 200  {...,"application_id":2,"team_id":1,...}                                        # FK values round-trip
PUT  /api/tickets/1    {... "priority":9,"done":true ...}
 → 200  {...,"priority":9,"done":true,"updated_at":"…08.286Z"}                          # commit + refresh
GET  /api/tickets/1
 → {...,"priority":9,"done":true,...}                                                   # persisted, no stale read
GET  /api/tickets      (no Authorization)  → 401                                        # owner scoping intact
```

**Honest note on the FastAPI FK key.** FastAPI's belongs-to FK wire key is `team_id` / `application_id` (snake, derived from `fkColumnName`), whereas Express/Go use `teamId` (camel). This is a **pre-existing cross-stack convention** (a Week-1 relationship residual), **identical in both depths — not a Day-13 regression**. The first FastAPI attempt used the Express camel key by mistake and the FK came back `null` (Pydantic ignored the unknown key); re-sending the correct `team_id`/`application_id` persisted and round-tripped the FKs, as shown above. Confirmed the schema field is `team_id: Optional[int]` in both `'default'` and `'simple'`.

**What the two `'simple'` boots prove:** the merged CRUD **persists** (`commit`), **reads-after-write correctly** (no stale read — the update is visible on the next GET; SQLAlchemy `refresh` / Express `RETURNING` survived the move out of the repository layer), the **FK write path survived the collapse at runtime**, the **router was auto-mounted** (every entity endpoint answered — no 404 from the shell scan), and **multi-user survived** (owner-scoped rows; 401 without auth).

### 3c. `'default'` still boots after the Day-13 core edits (smoke)

The `'default'` structure is historically live-proven (Express Day 4/6, FastAPI Day 4/12); the smoke boot only confirms it STILL boots after the core `architectureDepth` edits.

```
Express default:  POST /api/teams → 201 ; POST /api/applications {"teamId":1} → 201  {"id":"1",...,"teamId":"1","ownerId":"1"} ; GET /api/applications/1 → 200
FastAPI default:  POST /api/teams → 201 ; POST /api/applications {"team_id":1} → 201  {"id":1,...,"team_id":1,"owner_id":1} ; GET /api/applications/1 → 200
```

### Coverage table — booted vs generation-proven

| Stack | `'default'` | `'simple'` |
|---|---|---|
| **Express** | ✅ booted (smoke: create + FK + read-back) | ✅ **booted FULL** (TeamTracker create → FK → update → read-back → owner scoping) |
| **FastAPI** | ✅ booted (smoke: create + FK + read-back) | ✅ **booted FULL** (TeamTracker create → FK → update → read-back → owner scoping) |
| Spring / Django / Go | generation-frozen (untouched; 12 default hashes) | not implemented (deferred, §7) |

All four boots torn down with `compose down -v`; no container/volume residue; the live runs never touched the deterministic generation path.

---

## 4. ADR-002 — same-depth tamper/regen in BOTH depths, BOTH stacks (4 runs)

For each of Express and FastAPI, in each of `'simple'` and `'default'`: generate fresh → write hand logic into the developer seam (`service.*`) → tamper a Thraksha base file → regenerate **twice**. **All 4 pass:**

| Stack | Depth | Tampered base | dev seam unchanged | hand logic kept | tampered base rewritten |
|---|---|---|---|---|---|
| Express | simple | `ticket.crud.base.js` | ✅ | ✅ | ✅ |
| Express | default | `ticket.repository.js` | ✅ | ✅ | ✅ |
| FastAPI | simple | `crud_base.py` | ✅ | ✅ | ✅ |
| FastAPI | default | `service_base.py` | ✅ | ✅ | ✅ |

This proves **same-depth regeneration safety** — the only supported mode (§6). The developer's file survived byte-identical with its hand-written logic; the tampered Thraksha base was rewritten (marker gone). The existing `two-stacks` / `python:demo` / `ui:demo` demos also PASS on the current build (developer files safe, UI==CLI for all five).

---

## 5. Compositionality — depth composes with naming

Express `'simple'` + `namingConvention: 'snake_case'` on the multi-word `Task` model, generated twice → byte-identical. In the **merged** `crud.base.js`: `due_date: row.due_date` and `is_urgent: row.is_urgent` — the **wire key transformed** while the `row.<column>` accessor stayed the snake_case column; the dto reads `body.due_date`; and the internal dto→crud contract `data.dueDate` / `data.isUrgent` held. The Day-12 naming logic moved into the collapsed file and still works — depth and naming are orthogonal.

---

## 6. Three documented v1 limitations (deliberate, mirror Day 12's known-limitation section)

1. **Depth is fixed at project creation.** The `'simple'` developer `service.*` is created-once with imports pointing at `crud_base`/`crud.base`. Switching an existing project's depth is **unsupported** — it would orphan the created-once seam file's imports (they'd still point at the layered/merged modules that the new depth no longer emits). Depth is chosen up front (Day 14 wizard), consistent with ADR-005's philosophy for structural decisions.
2. **The ADR-002 proof is same-depth** (§4) — generate simple → tamper → regen simple; likewise default. That is the only supported regeneration mode; cross-depth regeneration is out of scope for the reason above.
3. **`'simple'` baselines are Postgres-only by design.** The collapse is dialect-independent (it changes which files exist, not the SQL dialect); a MySQL `'simple'` run would only re-prove the database-provider seam already locked by the 20-hash matrix. Noted, not hashed.

---

## 7. ADR / Law compliance

- **ADR-001 (no AI):** grep of `src/core` + `src/plugins` for `fetch`/`axios`/`openai`/`anthropic`/`api_key`/`require('http(s)')` → **NONE**. (The `net/http` / `org.springframework.http` occurrences are generated-template strings — the emitted apps' HTTP code — not generator calls; same adjudication as Day 12.) The file-set branch is pure, deterministic code.
- **ADR-002 (file separation — the crux):** the developer seam (`service.*` + `routes.*`) is developer-owned, created-once, and byte-stable-in-role across **both** depths — proven live by the 4-run tamper/regen (§4).
- **ADR-003 (determinism):** `'default'` is a literal bypass (existing `generateEntityFiles` untouched); all 20 default hashes byte-identical; the `'simple'` file list is a stable sorted array; all 4 `'simple'` baselines twice-identical.
- **Law 25 (core neutral):** the kernel carries only `architectureDepth`; the collapse decision lives entirely in each plugin (`grep src/core` for `crud_base`/`generateSimple`/etc. → NONE). The `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched (1 occurrence, unchanged).
- **Law 21 (standalone):** the `'simple'` project is ordinary Node/Python — it ran under `docker compose` with no Thraksha markers needed to boot or serve (§3), and continues to run after Thraksha is removed.

---

## 8. Honest staging — Express + FastAPI landed; Spring/Django/Go deferred

| Stack | `'simple'` collapse | Status |
|---|---|---|
| **Express** | model+repository dropped; 3 base layers merged → `crud.base.js` | ✅ landed — **booted FULL** (both depths) |
| **FastAPI** | repository dropped; service_base+router_base merged → `crud_base.py` | ✅ landed — **booted FULL** (both depths) |
| Spring | remove repository/heavy annotation base; merge behind `${Entity}Service`/`${Entity}Controller` seam | ⏸ deferred (design noted; Spring never booted live — a standing residual) |
| Django | already relatively flat; merge `views_base` behind `views.py`/`urls.py` seam; migration-graph entanglement | ⏸ deferred (design noted) |
| Go | remove `store.go`; merge behind `service.go`/`routes.go` seam | ⏸ deferred (design noted; compile step) |

Boot-ability + seam preservation were prioritized over stack count (plan §6): the two stacks that boot fastest and collapse most cleanly were landed **fully** — generation-frozen, `'simple'`-baselined, and **live-round-tripped in both depths** — rather than spreading a shallower proof across five.

---

## 9. Scope — held

**In scope, done:** core `architectureDepth` (neutral value); Express + FastAPI `'simple'` file-set branch; the developer seam preserved and wired in both depths; 20-hash `'default'` backstop + guard-the-guard; 4 `'simple'` baselines twice-identical; **4 live boots** (both `'simple'` full FK+multi-user round-trips, both `'default'` smoke); same-depth ADR-002 in both depths both stacks; compositionality with naming; the three documented limitations.

**Deliberately out:** the wizard style-selection UI (Day 14); cross-depth migration (documented limitation); Spring/Django/Go `'simple'` (deferred); probabilistic variation (ADR-003); new backends/databases/entity kinds. No re-baselining of any of the 20 default hashes.

---

## 10. What Day 14 picks up

**Day 14 — wire the style engine into the wizard + prove the whole thing (Week-2 close).** All three style options now exist programmatically — formatting (Day 11), naming (Day 12), architecture depth (Day 13). Day 14 adds the **style-selection screen** to the wizard (post-setup), wires the options end-to-end, runs a **full regression**, and writes the **Week-2 summary**. The invariant across the whole arc holds and must be re-proven: **default-style output keeps all 20 baselines frozen**, so the style engine is provably additive; every non-default combination is deterministic (twice-identical).

---

**Day 13 verdict:** the coding-style engine gained its meatiest option. `architectureDepth` (`'default'`/`'simple'`) is a deterministic switch that branches the generated file set — landed on Express + FastAPI, `'default'` reproducing all 20 hashes byte-for-byte (guard-the-guard confirmed), `'simple'` collapsing the repository/base layers into one CRUD module while preserving the developer seam in both depths. The headline held: both `'simple'` variants **booted on real Postgres and round-tripped a full TeamTracker create → FK → update → read-back with owner scoping** through the collapsed data-access path — proving persistence, no stale reads, FK survival, router auto-mount, and multi-user at runtime, which no static check could. ADR-002 holds same-depth in both depths; depth composes with naming; the three v1 limitations are documented; Spring/Django/Go are honestly deferred. Day 13 is **done**.
