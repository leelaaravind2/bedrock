# Day 4 — End-of-Day Report: Relationships hardening + LIVE RUN

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features this session.
**Status: DONE — relationships proven to *function* live; all gates frozen; no bugs surfaced, no fixes needed.**

Plan: [`docs/daily/day-04-plan.md`](day-04-plan.md). Closes the static-only gap from Days 1–3 ([d1](day-01-report.md)/[d2](day-02-report.md)/[d3](day-03-report.md)). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), ADR-004 (defaults shown), Law 25 (core neutral).

---

## 1. What was proven (Session 2 — the live run)

Three TeamTracker projects were generated and booted against **real PostgreSQL** via Docker Compose, one from each relationship *mechanism*, and relationships were proven to **function end-to-end** — not merely generate.

- **FastAPI** — mechanism **A** (raw SQL `ALTER TABLE … ADD CONSTRAINT fk_… REFERENCES`).
- **Django** — mechanism **B** (ORM `ForeignKey` + the migration **dependency graph** Day 3 introduced).
- **Express** — mechanism **A** bonus (uniquely exercises the Day-2 *threaded positional-SQL repository* at runtime).

---

## 2. THE CRITICAL GATE CHECK — relationship-free baselines (verified this session)

**All four frozen, byte-identical. No gate moved.**

| Stack | Baseline | Result |
|---|---|---|
| Spring | `010098cd…` | ✅ FROZEN |
| Express | `a437a302…` | ✅ FROZEN |
| FastAPI | `dca2254f…` | ✅ FROZEN |
| Django | `68601cc5…` | ✅ FROZEN |

This is guaranteed and independently evidenced: a change-surface check confirms **no `src/*.ts` and no plugin template changed since the Day-3 report** — i.e. no code was touched during the live run at all. There is therefore no possibility of gate drift, and none was found.

---

## 3. Live functional proof (per booted stack)

### 3.1 FastAPI (mechanism A) — booted, functions, FK enforced ✅
- **Boot & migrate:** container up, health `{"status":"ok","app":"TeamTracker"}`; migrations applied in order: `V1__init → V2__create_teams → V3__create_applications → V4__create_tickets → V5__create_comments`.
- **Chain created:** Team(1) → Application(1, `team_id=1`) → Ticket(1, `application_id=1, team_id=1`) → Comment(under ticket 1).
- **Fetched back:** `GET /api/tickets/1` → `application_id=1, team_id=1` (parents stored and returned).
- **FK constraints real (`\d tickets`):** `fk_tickets_application FOREIGN KEY (application_id) REFERENCES applications(id)`, `fk_tickets_team`, `fk_comments_ticket` — the literal frozen names, plus `idx_tickets_application_id`/`idx_tickets_team_id`.
- **Enforcement:** DB-level direct insert with `application_id=999999` → `ERROR: violates foreign key constraint "fk_tickets_application"`. App-level POST with a bad parent → **HTTP 500** (`psycopg2 ForeignKeyViolation` → SQLAlchemy `IntegrityError`) — the idiomatic scalar-FK behavior (rejection at the DB layer).

### 3.2 Django (mechanism B) — booted, dependency graph resolved, functions, FK enforced ✅
- **Boot & migrate (the flagged #1 risk — retired):** `migrate` resolved the dependency graph correctly at runtime: `contenttypes/auth → team.0001_initial → application.0001_initial → … → ticket.0001_initial → comment.0001_initial`. Application migrated after Team, Ticket after Application+Team, Comment after Ticket. Health ok; admin seeded.
- **Chain created:** Team(1) → Application(1, `team=1`) → Ticket(1, `application=1, team=1`) → Comment(under ticket 1). DRF keys are `team`/`application`/`ticket` (pk-writable).
- **Fetched back:** `GET /api/tickets/1/` → `application=1, team=1`.
- **FK constraints real (`\d tickets`):** `tickets_application_id_…_fk_applications_id FOREIGN KEY (application_id) REFERENCES applications(id)`, `tickets_team_id_…_fk_teams_id`, `comments_ticket_id_…_fk_tickets_id` — **Django auto-generated names**, same *logical* schema (this is exactly the Day-3 honest note).
- **Enforcement:** DB-level insert with `team_id=999999` → `ERROR: violates foreign key constraint "tickets_team_id_…_fk_teams_id"`. App-level POST with `application=999999` → DRF **HTTP 400** `{"application":["Invalid pk \"999999\" - object does not exist."]}` — clean app-layer pk validation.

### 3.3 Express (mechanism A, bonus) — booted, threaded SQL repo works, FK enforced ✅
- **Boot & migrate:** listening on `:8080`; migrations `V1..V5` applied in order; health ok.
- **Chain created + fetched back:** Team(1) → Application(1, `teamId=1`) → Ticket(1, `applicationId=1, teamId=1`) → Comment; `GET /api/tickets/1` → `applicationId=1, teamId=1`. This exercises the Day-2 threaded positional-SQL `insert`/`select` (the previously static-only risk) at runtime — it works.
- **FK constraints real:** `fk_tickets_application`, `fk_tickets_team`, `fk_comments_ticket`. DB-level bad-FK insert → `ERROR: violates foreign key constraint "fk_tickets_application"`.

### 3.4 The idiomatic difference, shown honestly
A non-existent parent is rejected everywhere, but *how* differs by framework — stated plainly, not smoothed over:
- **Django** → clean **400** at the app layer (DRF `PrimaryKeyRelatedField` validates the pk) *and* the DB constraint.
- **FastAPI / Express** → the **DB** rejects the insert (`IntegrityError`); FastAPI surfaces it as an ungraceful 500. Graceful 4xx mapping is optional hardening (broader than relationships; would move baselines) — **deliberately not done**; the psql check is the definitive constraint proof.

---

## 4. Bugs found + fixes

**None.** All three stacks booted clean and relationships functioned on the first attempt. **No template or plugin fix was required** (verified: no `src/*.ts` or plugin template changed since Day 3). This is a direct dividend of Days 1–3's static discipline — the deterministically-generated code actually runs. (Contrast with earlier pre-baseline live runs, which *did* surface real bugs — FastAPI's `passlib`/bcrypt and Django's `contenttypes` gaps — both already fixed and baked into the frozen baselines.)

---

## 5. Determinism (re-confirmed this session)

Every stack's TeamTracker generates **byte-identical across two runs** and matches its recorded hash (unchanged, since no code changed):

| Stack | TeamTracker hash |
|---|---|
| Spring | `9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66` |
| Express | `dca2b4a7a301df5e47ead65dc9f8cda26414a1ec1f24a055e8f1834c0cf1c9cf` |
| FastAPI | `6d422010e4c5c66da2950a19ad050765cd81bfd65b1842658377a1d67463b0d1` |
| Django | `e509309cd6c500e6633e0dca3d3fe52a695802e29ec4114e8c1fccac624e52c6` |

Live-run artifacts (Docker images, containers, DB rows) are runtime-only and were torn down (`down -v`); they never touch the deterministic generation path.

---

## 6. Honest coverage table (no over-claiming)

| Stack | Mechanism | Coverage on Day 4 | FK enforced |
|---|---|---|---|
| **FastAPI** | A (SQL `ALTER…CONSTRAINT`) | **Booted live** ✅ | DB reject + app 500 |
| **Django** | B (ORM FK + dependency graph) | **Booted live** ✅ | DB reject + DRF 400 |
| **Express** | A (threaded SQL) | **Booted live** ✅ (bonus) | DB reject |
| **Spring** | A (scalar + SQL `ALTER…CONSTRAINT`) | **Static + proven-by-family** (not booted) | — |

**Honest statement:** Spring was **not** compiled/booted this session (a Maven download+compile is multi-minute and risked the session). Its relationship output is proven **statically** (Day 1) and its FK mechanism is **identical in kind** to FastAPI/Express — the same `ALTER TABLE … ADD CONSTRAINT fk_… REFERENCES <table>(id)` SQL, enforced by the same PostgreSQL that rejected the bad FK in the two booted mechanism-A stacks. So **mechanism A is live-proven**; Spring's *specific* boot remains a candidate for a later spot-check. We claim exactly that — no more.

**What "relationships function live" means, met:** for each booted stack, related data was created with parents, fetched back with those parents intact, and the database rejected a non-existent parent. Both mechanisms (A and B) cleared this bar.

---

## 7. ADR compliance

- **ADR-002 (file separation):** intact — no regeneration occurred that could touch developer files; separation was proven per-stack Days 1–3.
- **ADR-001 (no AI):** no AI/network anywhere in `src/core/` or `src/plugins/`. Live-run scripts/Docker are runtime, outside generation.
- **ADR-003 (determinism):** re-confirmed (§5).
- **Law 25 (core neutral / interface unchanged):** no code changed this Day; core and `BackendPlugin` interface untouched.

---

## 8. Caveats (honest)

1. **Spring not booted** — static + family-proven only (§6). Honest, and the mechanism it uses *is* live-proven via FastAPI/Express.
2. **FastAPI/Express bad-FK → 500** — the DB constraint enforces (rejection happens); graceful 4xx mapping is deferred optional hardening, intentionally out of scope so as not to move baselines.
3. **Multi-user context** — all live data was created by the seeded `admin`; the FK proof is orthogonal to owner scoping (the DB constraint fires regardless).

---

## 9. Where we are — Week 1's relationships milestone

Days 1–4 delivered **relationships across the entire platform, built and now proven live**:
- **Built + static-proven** (Days 1–3): `belongs-to` FK generation in all four stacks, deterministic, additive (relationship-free baselines frozen), file-separated, core-neutral.
- **Proven live** (Day 4): related data actually functions against real PostgreSQL — created, fetched with parents, and FK-enforced — across **both** relationship mechanisms.

One blueprint (Team → Application → Ticket → Comment), four languages, real related data that works.

## 10. What's next

- **Day 5 — MySQL:** add a second database (MySQL) as a plugin/knowledge, generating migrations/schema for entities + relationships, wired so selecting MySQL routes correctly; Postgres baselines and the four backend hashes unchanged.
- **First, per the 21-day plan, Day 7 is the Week 1 checkpoint** — a prove-and-stabilize day (no new features): confirm relationships + MySQL are solid, run a clean end-to-end demo, and write the Week 1 summary before Week 2 builds on top.

---

**Day 4 verdict:** relationships don't just generate — they **function**. FastAPI (mechanism A), Django (mechanism B, dependency graph resolved), and Express (bonus) booted against real PostgreSQL; the Team→Application→Ticket→Comment chain was created, fetched back with parents intact, and the database enforced every foreign key. No bugs surfaced, no fixes needed, and the four relationship-free gates remain byte-identical. Day 4 is **done**.
