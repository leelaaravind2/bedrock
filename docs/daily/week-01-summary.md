# Week 1 — Summary & Checkpoint (Days 1–7)

**Day 7 — the Week 1 checkpoint. Prove-and-stabilize only; no new features built.**
**Status: STABLE — full regression passes (16/16 matrix combinations byte-identical to their recorded hashes, deterministic), no drift found, no fixes needed. Ready for Week 2.**

Scope of this document: verify everything Week 1 delivered still holds together, record all frozen baselines in one place, and surface every honest residual before Week 2 builds on top. Guardrails re-confirmed: ADR-001 (no AI), ADR-002 (file separation), ADR-003 (determinism), ADR-004 (defaults shown), Law 25 (core neutral).

---

## 1. What Week 1 delivered

Two milestones, both built statically, proven deterministically, and **proven live** against real databases:

### 1a. Relationships across all four stacks (Days 1–4) — live-proven
- `belongs-to` foreign-key generation in **Spring, Express, FastAPI, Django**, reusing one stack-agnostic model representation (`RelationshipSpec` in the core: generic `belongs-to`/`has-many` + `target` + `required`).
- Each stack emits its **idiomatic** FK (Spring scalar `Long <target>Id` + `ALTER…CONSTRAINT`; Express threaded positional SQL; FastAPI raw SQL `ALTER…CONSTRAINT`; Django `models.ForeignKey` + migration dependency graph) — same **logical** schema, per-stack **literal** idiom.
- **Additive:** relationship-free models are byte-identical to pre-relationship output (the four DemoApp gates never moved).
- **Live (Day 4):** TeamTracker (Team → Application → Ticket → Comment) booted against real PostgreSQL — FastAPI (mechanism A), Django (mechanism B, dependency graph resolved), Express (bonus). Related data created with parents, fetched back intact, and **every FK enforced** by the database.

### 1b. Database provider seam + MySQL as a second database (Days 5a–6) — live-proven
- **Day 5a:** extracted a technology-neutral `DatabaseProvider` seam (SQL dialect + shell tokens) with **zero output change** — the eight Postgres hashes stayed byte-identical.
- **Day 5b:** added **MySQL** as a second provider (Django/FastAPI/Spring), closed the `schema_migrations` residual dialect-aware, all Postgres frozen.
- **Day 6:** finished **Express MySQL** (a neutral `runtime.supportsReturning` capability + an Express-owned mysql2 adapter that rewrites `$N`→`?`, normalizes results, and casts `TINYINT(1)`→bool), wired MySQL into the UI dropdown, and **booted Express + MySQL live** — migrations applied, CRUD + relationships worked, and the MySQL FK was enforced (errno 1452).

Databases now plug in the way backends do; the core knows only "a database provider."

---

## 2. The proven capability matrix (Day-7 regression)

**Full matrix verified this checkpoint — 4 backends × 2 databases × 2 models (relationship-free DemoApp + related TeamTracker), each generated twice: all 16 byte-identical to recorded hashes, all deterministic.**

| Capability | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| Entity CRUD generation | ✅ | ✅ | ✅ | ✅ |
| Relationships (belongs-to FK) | ✅ | ✅ | ✅ | ✅ |
| File separation (ADR-002) | ✅ | ✅ | ✅ | ✅ |
| **PostgreSQL** generation | ✅ | ✅ | ✅ | ✅ |
| **MySQL** generation | ✅ | ✅ | ✅ | ✅ |
| Booted live — relationships (PG) | ⚠️ family-proven¹ | ✅ | ✅ | ✅ |
| Booted live — MySQL | ⚠️ gen-proven² | ✅ | ⚠️ gen-proven² | ⚠️ gen-proven² |

¹ Spring not booted; its FK mechanism (`ALTER…CONSTRAINT`) is live-proven via FastAPI/Express (§5).
² Generation-proven + static dialect-correct; only Express was booted on MySQL (§5).

**Cross-stack logical-schema consistency (verified):** the SQL backends (Spring/Express/FastAPI) emit the identical table set (`users, teams, applications, tickets, comments`) and identical four FK constraints (`fk_applications_team`, `fk_tickets_application`, `fk_tickets_team`, `fk_comments_ticket`); Django expresses the same model via ORM ops. Same logical schema everywhere; dialect/runtime differences only.

---

## 3. Frozen baselines — all recorded hashes in one place

**These are the Week-1 reference hashes. Any future day must keep the eight Postgres hashes byte-identical; the eight MySQL hashes are the established MySQL baselines.** All 16 re-confirmed this checkpoint.

### PostgreSQL (the eight frozen gates)
| Model | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| **DemoApp** | `010098cd…` | `a437a302…` | `dca2254f…` | `68601cc5…` |
| **TeamTracker** | `9e01210c…` | `dca2b4a7…` | `6d422010…` | `e509309c…` |

### MySQL (established baselines)
| Model | Spring | Express | FastAPI | Django |
|---|---|---|---|---|
| **DemoApp** | `3112d3f7…` | `d4b57b52…` | `cd87d6e3…` | `8b07a1b2…` |
| **TeamTracker** | `4c4640ba…` | `bfa4a536…` | `5c788c70…` | `3b3e6a6f…` |

Full digests (for exact comparison):
```
PG DemoApp     Spring  010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c
PG DemoApp     Express a437a302cc597ed1809551bdf31fafea569176829db16122b0ea78c68ffd4d65
PG DemoApp     FastAPI dca2254f86c532bb24af06f439b300613a6dc7918346063f704c68f98b1d5843
PG DemoApp     Django  68601cc5c77e4938c162d04c1c58d976b808421a90c66e5f3fd2f215a63caa18
PG TeamTracker Spring  9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66
PG TeamTracker Express dca2b4a7a301df5e47ead65dc9f8cda26414a1ec1f24a055e8f1834c0cf1c9cf
PG TeamTracker FastAPI 6d422010e4c5c66da2950a19ad050765cd81bfd65b1842658377a1d67463b0d1
PG TeamTracker Django  e509309cd6c500e6633e0dca3d3fe52a695802e29ec4114e8c1fccac624e52c6
MY DemoApp     Spring  3112d3f76989b4c04715bb9e983c15d3f91485d32c6c62733a567e209268bd4e
MY DemoApp     Express d4b57b52d07448b161c9310cd06702984492ebed9f192abc7a5712d9b254f33f
MY DemoApp     FastAPI cd87d6e324aa1e84339162a2088acdba40ad660ea5def7804ecad70ca1ecd8b4
MY DemoApp     Django  8b07a1b2bd072698002cd2db944d5fe08b11f0d0cbf156993e1abf8edf47e5f3
MY TeamTracker Spring  4c4640ba26531e5596973f51dd05d38153559799c131a1a8a2217069cb4c0ce9
MY TeamTracker Express bfa4a536ce5f44cb51de4ac7602a399ece4a77fb36bcb92f5c234d0c3cb87649
MY TeamTracker FastAPI 5c788c7089e92754416cecd129682faec642fbfed32b9aa3e3e0487208c04b7b
MY TeamTracker Django  3b3e6a6fb4afd1bbf712a9c1a190d7187135bf908c283b0a6ed6ecb10bf2830a
```

---

## 4. Regression results (this checkpoint)

- **16/16 matrix combinations** byte-identical to recorded hashes, **deterministic** (twice-identical). No hash moved.
- **Relationships:** FK columns (`team_id`, `application_id`, `ticket_id`) present in every TeamTracker combination across both databases; **additivity** holds (DemoApp has no stray FK columns in any stack).
- **Both databases route:** `PostgreSQL → postgres` provider, `MySQL → mysql` provider; both selectable in the UI dropdown (`PostgreSQL / MySQL / None`); Postgres path unaffected.
- **ADR-001 (no AI):** no AI/network anywhere in `src/core` or `src/plugins`.
- **ADR-002 (file separation):** `two-stacks` (Express) and `ui:demo` (FastAPI) confirm developer files survive regeneration; `ui:demo` also confirms UI==engine for all four backends.
- **ADR-003 (determinism):** every combination twice-identical.
- **Law 25 (core neutral) + interface unchanged:** no dialect literals in `src/core` (the single `TIMESTAMPTZ` is the illustrative JSDoc example); `BackendPlugin` keeps its five members (`id`, `displayName`, `generateProjectShell`, `generateEntity`, `describeEntityDefaults`); the seam grew only by a neutral, additive `DatabaseProvider.runtime` capability.

**No regression or drift was found; no stabilizing fix was needed.**

---

## 5. Honest residuals & known limitations (carried into Week 2)

Surfaced deliberately — none are regressions or blockers; all are documented Week-1 decisions:

1. **Live-boot coverage is representative, not exhaustive.**
   - **Spring has never been booted live** (neither PG relationships nor MySQL). Its output is static + family-proven (its FK mechanism is the same `ALTER…CONSTRAINT` SQL that FastAPI/Express proved live).
   - **MySQL was booted live on Express only.** Django/FastAPI/Spring MySQL are generation-proven + static-dialect-correct, not booted on MySQL.
   - A future spot-boot of Spring, and of one ORM stack on MySQL, would fully close this — a candidate for a Week-2 stabilization pass, not a blocker.
2. **MySQL boolean runtime representation is only live-verified for Express.** The Express mysql2 adapter casts `TINYINT(1)`→boolean (proven live). For Spring (Hibernate), FastAPI (SQLAlchemy), and Django (ORM) on MySQL, boolean read-back is expected to be handled by the ORM but was **not** live-verified. SQLAlchemy in particular may return `0/1` for `TINYINT(1)` unless configured — worth a check if/when a MySQL ORM stack is booted.
3. **Ungraceful bad-FK error (FastAPI/Express).** A non-existent parent is rejected by the DB but surfaces as HTTP 500 (vs Django's clean 400). Graceful 4xx mapping is deferred optional hardening (would move baselines) — intentionally out of scope.
4. **Cosmetic naming residuals (accepted-as-is).** In MySQL projects, app-side env var names remain Postgres-flavored (`PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`, Python `pg_port`), and Spring's `.env.example` keeps vestigial unused `POSTGRES_*` keys. They are functional for MySQL; renaming them would move the frozen Postgres hashes, so they are left. Cosmetic only.
5. **The `TIMESTAMPTZ` JSDoc example in `core/database.ts`** is documentation illustrating the interface, not logic — intentionally left (core stays neutral).
6. **`DECIMAL`/`NUMERIC(19,2)` is implemented in both providers but not exercised** by the demo models (neither DemoApp nor TeamTracker has a Decimal field). The code path exists; its output is untested by a real model.
7. **`has-many` is recorded in the model but generates no schema** (only `belongs-to` produces FKs) — by design; the inverse view is for the blueprint.
8. **Relationship scope is deliberately minimal:** scalar FKs only — no object-graph navigation, cascade/`on_delete` tuning, many-to-many, self-relations, or forward references (forward refs are caught by a deterministic guard). Django's FK constraint/index **names** are ORM-auto-generated (differ from the SQL stacks' hand-written names) — logical schema matches; not a defect.

---

## 6. Checkpoint verdict — stable, ready for Week 2

Week 1 delivered a genuinely more capable platform, every capability deterministic and documented day-by-day:
- **4 backend stacks** (Spring, Express, FastAPI, Django), each generating real CRUD.
- **Real relationships** in generated code across all four stacks — live-proven against PostgreSQL.
- **2 databases** (PostgreSQL, MySQL) behind a clean provider seam — MySQL live-proven (Express).
- **16 frozen/established baselines** (8 Postgres gates + 8 MySQL), all re-confirmed byte-identical this checkpoint.
- **Guardrails intact:** no AI, deterministic, file-separated, core-neutral, `BackendPlugin` interface unchanged.

The full regression passes and no drift was found. **The platform is stable and ready for Week 2.**

### What Week 2 builds (from the 21-day plan)
- **Days 8–10 — Go backend** (5th stack) via the proven 3-step recipe (entity CRUD → file separation + multi-user + relationships → dropdown + live run). The frozen matrix above is its regression backstop.
- **Days 11–14 — the coding-style engine** (naming convention, formatting, architecture depth) as **deterministic switches** (ADR-003 preserved — no probabilistic "code personality"), wired into the wizard; default-style output must keep all Week-1 baselines frozen.

The clean seam architecture (backend plugins + database providers, core-neutral) is exactly what makes both additive: Go is a new backend plugin; a second database was a new provider; coding-style will be deterministic options — none require touching the kernel.
