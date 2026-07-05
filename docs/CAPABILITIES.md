# Thraksha v0.1 — Capabilities

**What Thraksha v0.1 does, stated at its ACTUAL proven level.** This is the external-facing capability record. It is written to be honest by construction: **every capability cites where it was proven, at the level it was proven** (generated / booted-live-on-a-database / composed), and the complete limitations set (§3) sits in the same document — a strengths list is not read without its limitations.

**Date:** 2026-07-02 · **Status:** v0.1 closed. The regression backstop is the consolidated harness (`npm run day20:regress`): 43 recorded digests + 10 TeamTracker relationship hashes + the maximal-composition digest, all frozen. See [`daily/day-20-report.md`](daily/day-20-report.md) for the certification.

---

## 1. The proof levels (read this first)

Claims are stated at one of these levels — never collapsed upward:

- **Generated** — the output is produced deterministically and byte-identical to a recorded baseline (and, where noted, UI==CLI: the wizard produces the same bytes as the CLI/engine path). Proven, but not run.
- **Booted live** — a generated project was `docker compose up`'d against a **real database**, and its behaviour verified (CRUD, relationships, FK enforcement, owner scoping). The database it booted on is always named.
- **Family-proven** — a mechanism was proven live via a *sibling* stack that shares it (e.g. an FK mechanism proven on FastAPI/Express covers the same SQL emitted by another stack), rather than booting that stack itself.

---

## 2. Capabilities — each at its proven level, with a source

| # | Capability | Proven level | Proof source |
|---|---|---|---|
| 1 | **5 backend stacks** — Spring Boot, Express, FastAPI, Django, Go | **Generated** deterministically (all 5) + **UI==CLI** (all 5) | 20-hash matrix ([`week-01-summary.md`](daily/week-01-summary.md) §3; [`day-09`](daily/day-09-report.md)/[`day-10`](daily/day-10-report.md) for Go); `ui:demo` (UI==CLI five stacks) |
| 2 | **Live boot — PostgreSQL** | **All 5 booted live on Postgres.** Express/FastAPI/Django (Day 4), Go (Day 10), **Spring (Day 15 — its first-ever live boot: web-app full-stack, then api-only)**; plus FastAPI email (Day 17), FastAPI ai-hook (Day 18), Express composed (Day 20) | [`day-15-report.md`](daily/day-15-report.md) §3 (Spring); [`week-01-summary.md`](daily/week-01-summary.md) §5; [`day-10`](daily/day-10-report.md); [`day-20-report.md`](daily/day-20-report.md) §3 |
| 3 | **Live boot — MySQL** | **Express + Go ONLY.** Spring/FastAPI/Django on MySQL are **Generated** + static-dialect-correct, **not booted** | Express ([`day-06`](daily/day-06-report.md) era, [`week-01`](daily/week-01-summary.md) §5), Go ([`day-10`](daily/day-10-report.md)); [`week-02-summary.md`](daily/week-02-summary.md) §6 |
| 4 | **2 databases behind a provider seam** (PostgreSQL, MySQL) | **Generated** both (the 20-matrix spans both); **booted** per rows 2–3 | [`week-01-summary.md`](daily/week-01-summary.md) §1b; the 20-hash matrix |
| 5 | **2 project types** — Web App, API-only | **Generated** both; **api-only booted** (Spring, the one stack that subtracts a frontend); Web-App is a literal bypass (frozen) | [`day-15-report.md`](daily/day-15-report.md) (Spring api-only boot); `day15`/`day16` gates; api-only baselines (6) |
| 6 | **3-axis coding-style engine** — formatting / naming / architecture | **Generated**, deterministic. Applicability is **per-stack** (see below); `simple` **booted** on Express + FastAPI | [`week-02-summary.md`](daily/week-02-summary.md) §3/§4 (13 style baselines); `simple` boot ([`day-13`](daily/day-13-report.md)) |
| 7 | **2 optional integrations** — email (SMTP) + a **detachable AI hook** | **Generated** + coherent; ai-hook **booted detachable** (four-part proof) on FastAPI (Day 18) and the composed Express cell (Day 20) | [`day-17-report.md`](daily/day-17-report.md) (email), [`day-18-report.md`](daily/day-18-report.md) + [`day-20-report.md`](daily/day-20-report.md) §3 (ai-hook boot) |
| 8 | **Relationships** — scalar `belongs-to` foreign keys | **Generated**; **UI-declared == engine** byte-for-byte; **FK enforced live** (Postgres + MySQL) | Days 1–4 ([`week-01-summary.md`](daily/week-01-summary.md) §1a); [`day-19-report.md`](daily/day-19-report.md) §2 (the 10 TeamTracker hashes) |
| 9 | **Determinism / regression backstop** | 43 recorded digests + 10 relationship hashes **frozen**; the consolidated harness is **proven byte-identical to the sum of the individual gates** | [`day-20-report.md`](daily/day-20-report.md) §1/§2 |
| 10 | **Feature composition** | Every feature at once is **deterministic** (twice-identical, `33f3ec4b…`) AND **booted coherently** (composed FK round-trip live) | [`day-20-report.md`](daily/day-20-report.md) §3 (the maximal cell) |
| 11 | **Multi-user (owner scoping)** — foundational (ADR-005) | **Generated** into every entity; **live** in the composed boot (`ownerId` on every row) | [`day-20-report.md`](daily/day-20-report.md) §3.2; ADR-005 |
| 12 | **The wizard** — full intake, choices shown (ADR-004) | Type + style + integrations + relationships + description captured end-to-end; **UI==CLI** | [`day-14`](daily/day-14-report.md)/[`day-16`](daily/day-16-report.md)/[`day-19-report.md`](daily/day-19-report.md) |

### The style-engine applicability map (stated, not glossed — [`week-02-summary.md`](daily/week-02-summary.md) §3)
| Option | Applies to | Elsewhere |
|---|---|---|
| **namingConvention** (`camelCase`/`snake_case`) | all 5 stacks | — |
| **formatting.indent** (`two/four-space`/`tab`) | **Express only** (`.js` reindent) | no-op → default output |
| **architectureDepth `simple`** | **Express + FastAPI only** | Spring/Django/Go: `default` only |

The wizard **gates** the non-applicable values (disabled + visible reason) so it never claims a style it will not deliver.

### ADR-001 note on the AI hook (the capability that looks like it violates the rule)
The generated app can call an AI provider **at its own runtime** (an inert AI-client the app runs); **Thraksha's generation path makes no AI/model call** — the provider tokens live only inside template-string constants. The hook is a **detachable add-on**: deleting it leaves generation byte-identical, and a generated app boots and runs normal CRUD with the AI key unset (proven four ways, [`day-18`](daily/day-18-report.md)/[`day-20`](daily/day-20-report.md)).

---

## 3. Known limitations — the complete whole-system set (carried forward, none dropped)

Deliberate v1 boundaries. None are regressions; all are documented decisions carried from the daily reports and [`day-20-report.md`](daily/day-20-report.md) §5.

1. **MySQL live-boot coverage is Express + Go only.** Spring/FastAPI/Django on MySQL are Generated + static-dialect-correct, **not booted**. *(All 5 DID boot on Postgres — see row 2.)*
2. **`has-many` records no schema.** Only `belongs-to` produces a foreign key; `has-many` is the inverse view, drawn in the blueprint.
3. **Relationship scope is minimal** — scalar `belongs-to` FKs only. No object-graph navigation, cascade/`on_delete` tuning, many-to-many, self-relations, or forward references (forward refs are caught by a deterministic guard).
4. **`DECIMAL`/`NUMERIC(19,2)` is implemented in both providers but unexercised** — no demo model has a Decimal field, so the code path is Generated-but-untested by a real model.
5. **Cross-depth switching is unsupported.** `architectureDepth` is fixed at project creation; the `simple` developer seam is created-once with imports into the merged module. Switching an existing project's depth would orphan those imports — a deliberate migration, not a toggle.
6. **Style is not self-recorded in the generated manifest.** A style line in `GENERATION-MANIFEST.txt` would move all frozen hashes; style visibility is wizard-side only (Blueprint chips + Style screen).
7. **Mixed-key FK serialization (confirmed under composition).** `namingConvention` governs *declared* fields only; `id`/audit/owner/**FK** keys keep their frozen per-stack representation. So a `snake_case` project serializes snake declared fields **beside a camelCase FK key** (`teamId`) — observed live in the Day-20 maximal cell, behaving exactly as documented since Days 12–13. A future version could unify FK keys under `namingConvention` (would move baselines).
8. **Ungraceful bad-FK error (FastAPI/Express).** A non-existent parent is rejected by the DB but surfaces as HTTP 500 (vs Django's clean 400). Graceful 4xx mapping is deferred optional hardening (would move baselines).
9. **Cosmetic naming residuals in MySQL projects.** App-side env var names remain Postgres-flavoured (`PGHOST`/`PGPORT`/…, Python `pg_port`); Spring keeps vestigial `POSTGRES_*` keys. Functional for MySQL; renaming would move the frozen Postgres hashes, so they are left.
10. **MySQL boolean read-back is live-verified for Express only.** For Spring/FastAPI/Django on MySQL, `TINYINT(1)`→bool is expected via the ORM but **not** live-verified.
11. **Spring live-boot is Postgres-only.** Spring booted live on Postgres (Day 15) but has **not** booted on MySQL (limitation 1).

---

## 4. Documentation-drift notes (stale lines in dated records — flagged, not edited)

Two dated documents contain lines that were true when written and are now stale. The files are left as **historical records**; the current truth is here and in the day reports:

- **"Spring never booted live"** in [`week-01-summary.md`](daily/week-01-summary.md) §5 and [`week-02-summary.md`](daily/week-02-summary.md) §6 was true **through Day 14** and became **false on Day 15**, when Spring booted live on Postgres (web-app full-stack, then api-only — [`day-15-report.md`](daily/day-15-report.md) §3). The current truth: **all 5 backends have booted on Postgres.**
- The stale **"relationships are metadata only, no codegen"** comment in `teamtracker-model.ts` was corrected on Day 21 (the plugins do generate belongs-to FKs — the 10 TeamTracker baselines bake them in).

*(These are the same class of documentation-drift finding surfaced throughout the build: name the staleness, keep the dated record intact.)*

---

## 5. How to verify (the regression backstop)

```
cd generator && npm run build && npm run day20:regress
```
Re-confirms all 43 recorded digests + the 10 TeamTracker relationship hashes + every non-hash check, byte-identical to their recorded values (guard-the-guarded against the source reports). The individual `day12`–`day19` gates remain as the cross-check that validated the consolidated harness. Every capability above traces to a proof; this command re-proves the deterministic core on demand.
