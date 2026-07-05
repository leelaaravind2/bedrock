# Day 4 — Plan: Relationships hardening + LIVE RUN

**Session 1 of 3 — PLANNING ONLY. No build/boot this session.**
**Goal: compile and boot a related project (TeamTracker) against a real PostgreSQL and prove `belongs-to` relationships actually *function* end-to-end — closing the static-only gap from Days 1–3, and hardening any template bug a real boot surfaces.**

Reads honored: `docs/CONSTITUTION.md`, `docs/adr/` (ADR-001/002/003/004, Law 25), `docs/21-DAY-PLAN.md` (Day 4), and Days 1–3 outputs (all `day-0N-plan.md` / `day-0N-report.md`).

---

## 0. Where we are (why Day 4 exists)

Days 1–3 built `belongs-to` FK generation across all four stacks and proved it **statically** — deterministic hashes, correct FK placement, valid migration ordering. Nothing has been **compiled and run against a real database** yet. Day 4 turns "the FK column exists in the generated code" into "I created a Team, created a Ticket under it, fetched it back with the parent id, and the database enforced the constraint."

Established, frozen relationship-free baselines (the gates that must not move): Spring `010098cd…`, Express `a437a302…`, FastAPI `dca2254f…`, Django `68601cc5…`.
Current TeamTracker (relationship) hashes: Spring `9e01210c…`, Express `dca2b4a7…`, FastAPI `6d422010…`, Django `e509309c…`.

---

## 1. Which stacks to run live, and why (honest coverage strategy)

Running all four fully is time-heavy — Spring alone is a multi-minute Maven download+compile. But there are only **two distinct relationship mechanisms** to prove:

| Mechanism | Stacks | How the FK constraint is created |
|---|---|---|
| **A — raw SQL `ALTER TABLE … ADD CONSTRAINT fk_…`** in a `.sql` migration | Spring, Express, **FastAPI** | hand-written SQL; Postgres enforces |
| **B — Django ORM `ForeignKey`** + migration **dependency graph** | **Django** | Django auto-creates the constraint; `migrate` orders by dependency graph |

**Plan — boot live, both mechanisms:**
- **FastAPI** — represents mechanism A (Spring/Express/FastAPI all emit the same `ALTER TABLE … ADD CONSTRAINT … REFERENCES` SQL; Postgres enforces it identically). Fast Python-slim build; has booted before.
- **Django** — represents mechanism B (the genuinely different path: ORM `ForeignKey`, auto-named constraint, and the **migration dependency graph** that Day 3 introduced — the highest-value new thing to prove actually resolves at `migrate` time). Fast; has booted before.

**Lighter checks (honest):**
- **Express** — a *bonus* live boot **if time allows** (fast Node build). It shares mechanism A with FastAPI, so booting it is confirmatory, not essential.
- **Spring** — **static + mechanism-proven-by-family**, not booted this session (Maven build too heavy to fit reliably). Its FK SQL is byte-for-byte the same *kind* as FastAPI's (`ALTER TABLE … ADD CONSTRAINT fk_… REFERENCES teams (id)`), which **is** booted and enforced by the same Postgres — so mechanism A is live-proven. Spring's specific compile/boot is a candidate for a later spot-check; Day 4 will say this plainly rather than imply Spring was run.

This gives honest, representative live coverage: **both mechanisms proven live**, every stack either booted or covered by an identical-mechanism boot, with the gaps stated explicitly.

---

## 2. The functional test — the exact steps that prove relationships *work*

Run against the TeamTracker model (Team → Application → Ticket → Comment). Auth: HTTP Basic `admin` / `admin123` (both shells seed it). Endpoints are owner-scoped; all rows created by the same user.

For each booted stack:

**A. Boot & migrate.**
1. `docker compose up --build -d` on a freshly generated TeamTracker.
2. Confirm migrations applied: FastAPI — `V1..V5` applied in order; Django — `migrate` applies `auth` + per-entity `0001_initial` in **dependency order** (team → application → ticket → comment). Confirm health endpoint returns ok. (This alone proves Day 3's dependency graph resolves — the top Django risk.)

**B. Happy path — create children under parents, fetch back (proves persistence + wiring).**
3. `POST` a **Team** → capture `teamId`.
4. `POST` an **Application** with the parent set (FastAPI body `{"name":…, "team_id": teamId}`; Django body `{"name":…, "team": teamId}`) → capture `appId`; confirm the response echoes the parent.
5. `POST` a **Ticket** with both parents (`application_id`+`team_id` / `application`+`team`) → capture `ticketId`; confirm parents echoed.
6. `POST` a **Comment** with `{"body":…, "ticket": ticketId / "ticket_id": ticketId}`.
7. `GET` the Ticket back → **assert `application_id`/`team_id` (or `application`/`team`) are stored and returned with the correct values.** This is the "fetched it back with the parent" proof.

**C. Constraint enforcement — the FK is real, not decorative (the key proof).**
8. **DB-level (definitive, app-independent):** `docker compose exec db psql` → `\d tickets` shows a `FOREIGN KEY (application_id) REFERENCES applications(id)` (and `team_id`), and a direct `INSERT INTO tickets (…, application_id, …) VALUES (…, 999999, …)` is **rejected by Postgres** with a foreign-key violation. This proves the constraint exists and is enforced at the database, independent of app error-handling.
9. **App-level (idiomatic, honest difference):** `POST` a Ticket referencing a **non-existent** parent id.
   - **Django** → DRF's `PrimaryKeyRelatedField` validates the pk exists → clean **400** ("invalid pk / object does not exist"). App-layer rejection *plus* the DB constraint.
   - **FastAPI** → scalar FK, no app-layer existence check → the DB FK rejects the insert (IntegrityError). Expect a non-2xx rejection. (If it surfaces as an ugly 500 / broken session, that is a hardening candidate — see §3.)
   Both outcomes prove "you cannot attach a child to a non-existent parent." The *how* differs by framework — stated honestly, not smoothed over.

**Done = for each booted stack: B all succeed with parents stored/returned, and C shows the bad-FK insert rejected.** That is "relationships function," not merely "generate."

---

## 3. Bug-handling protocol (real boots surface real bugs)

Precedent from earlier live runs: FastAPI's `passlib`/bcrypt incompatibility and Django's `contenttypes`/`INSTALLED_APPS` gap were both found by booting and fixed in the templates. Day 4 assumes the same may happen — likely candidates now: Django migration-dependency resolution at `migrate` time, a FastAPI FK/SQL ordering issue, or ungraceful error handling on a bad-FK insert.

**Protocol for any bug found:**
1. **Fix it in the template/plugin**, never in a one-off generated copy — so *every future project* is correct.
2. **Regenerate** the affected project and **re-run** the functional test until it passes.
3. **Re-check the determinism gates** (§4) before closing.

**Where a fix may live, and its hash impact — the determinism guard:**
- **Preferred: a fix in the relationship codegen** (the `belongs-to` emission in an entity-codegen). This is gated on `belongsTo` present, so it **leaves relationship-free DemoApp byte-identical** — the four frozen baselines hold; only the relevant TeamTracker hash changes → **re-establish and record it honestly**.
- **Escalation: a fix in shared shell/common code** (e.g. a shell template, `requirements.txt`, `settings.py`) touches *every* project including DemoApp → it **would move a frozen baseline**. This is a bigger decision. Rule: prefer to avoid; if a shared fix is genuinely required for correctness (Constitution: correctness > convenience), it is allowed, but then **all affected DemoApp baselines must be re-established and recorded with the reason stated plainly** in the Day-4 report — never silently. Given relationships are additive and both shells already boot, Day 4 *expects* any bug to be in the relationship path (baselines stay frozen); a shell fix is the flagged, documented exception.

**Optional hardening (do not over-scope):** gracefully mapping a FastAPI FK IntegrityError to a 4xx (with a session rollback) is a *nice-to-have*, not required — it is broader than relationships and would touch shared repository codegen (moving baselines). Day 4 proves the constraint is *enforced* (rejection happens); polishing the error code is deferred unless it blocks the proof.

---

## 4. Determinism guard (run after any fix, before closing)

- **The four relationship-free gates stay frozen:** DemoApp/Spring `010098cd…`, /Express `a437a302…`, /FastAPI `dca2254f…`, /Django `68601cc5…` — byte-identical. If any moved, a fix leaked into shared code (see §3 escalation) — stop, and either re-scope the fix to be gated or re-establish+document the baseline deliberately.
- **Generation stays deterministic:** any regenerated TeamTracker is byte-identical across two runs; record the current TeamTracker hash for each stack whose codegen changed.
- **No AI / no randomness / no timestamps** in the generation path (ADR-001/003). Live-run scripts, Docker, and DB data are runtime artifacts — they never touch the deterministic generation output.

---

## 5. Scope guard — explicitly OUT for Day 4

- **UI relationship picker → Day 19.**
- **MySQL (second database) → Days 5–6.** Day 4 is Postgres-only.
- **`has-many` codegen, object-graph navigation** (nested serializers, `select_related`, eager JOINs), cascade/`on_delete` tuning, many-to-many, self-relations.
- **Full four-stack live boot** — Spring is static+family-proven this session (§1); a Spring live boot is a later spot-check, not Day 4's commitment.
- **Broad robustness polish** (graceful 4xx for DB errors, pagination, etc.) beyond what's needed to prove the FK functions (§3).
- Any change to the core or the `BackendPlugin` interface (none expected; live-run work is scripts + optional template fixes).

---

## 6. Done-conditions (Session 2) & proof method (Session 3)

### 6.1 Session 2 must achieve
1. Generate TeamTracker for **FastAPI** and **Django**; `docker compose up --build` each; confirm migrations apply (Django in dependency order) and health is up.
2. Run the **functional test** (§2 B+C) on both: children created under parents, fetched back with parent ids stored/returned, and a bad-FK insert **rejected** (DB-level via psql, plus app-level).
3. (Optional, if time) the same live boot+test for **Express**.
4. Any bug found → fixed in template/plugin, regenerated, re-proven (§3), with the determinism gates re-checked (§4).
5. Capture concrete evidence (HTTP responses showing stored/returned parent ids; the psql FK-rejection; migration logs) for the report.

### 6.2 Session 3 verification & documentation
- **"Relationships function live"** concretely = for each booted stack: parents persist and are returned on read; the DB foreign-key constraint exists and rejects a non-existent parent. Report the actual evidence.
- **Honest coverage matrix:** exactly which stacks were **booted live** (target: FastAPI, Django; possibly Express) vs **static + mechanism-proven** (Spring), and why (time), with the mechanism-family argument stated so the reader sees the feature is proven across the platform without over-claiming.
- **Bugs found + fixed:** each with root cause, the template/plugin fix, and its **honest hash impact** — relationship-free gates still frozen (or, if a shared fix was unavoidable, the re-established baselines with the reason).
- **Gates:** the four DemoApp baselines byte-identical; TeamTracker hashes current/recorded (updated only where a fix changed them); determinism holds.
- **ADR sweep:** no AI (ADR-001), file separation intact (ADR-002), determinism (ADR-003), defaults shown (ADR-004), core + interface untouched (Law 25).
- **Output:** `docs/daily/day-04-report.md`, plus note what Day 5 picks up (MySQL as a second database).

### 6.3 Definition of "Day 4 done"
At least one stack from **each** relationship mechanism (FastAPI for SQL-`ALTER`-constraint; Django for ORM/dependency-graph) is **booted live against real PostgreSQL** and demonstrably **functions**: related data is created with parents, fetched back with those parents, and the DB rejects a non-existent parent. Any bug surfaced is fixed in the template/plugin and re-proven. The four relationship-free baselines remain frozen (any moved hash re-established and documented honestly). Written up in `docs/daily/day-04-report.md` with an honest live-vs-static coverage matrix.

---

## 7. Risk notes (for Session 2)

- **Django migration dependency graph is the #1 live risk** — Day 3 introduced `("<target>", "0001_initial")` dependencies across per-entity apps. If `migrate` can't resolve them (wrong app label, missing dependency, cycle), the boot fails. Booting Django is precisely what proves this; a fix (if needed) lives in the Django migration builder (gated on belongs-to → baselines frozen).
- **FK insert ordering / session state (FastAPI)** — a bad-FK insert raises IntegrityError; if it breaks the SQLAlchemy session for later requests, that's a robustness note (optional hardening, §3). Use the psql DB-level check as the *definitive* constraint proof so the app's error-handling style doesn't cloud it.
- **Time** — keep to the two fast Python stacks first; Express only if they finish clean; do **not** start a Spring Maven build that could blow the session. Report coverage honestly rather than rushing a fourth boot.
- **Determinism drift from a fix** — before closing, always re-run the four DemoApp gates; a moved gate means a fix leaked into shared code and must be re-scoped or deliberately re-established with documentation.
- **Teardown** — live containers/volumes are throwaway; ensure `docker compose down -v` so nothing persists into later days.
