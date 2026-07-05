# Thraksha — The Consolidated 21-Day Report

**The closing record of the 21-day build.** What each week set out to prove, what it proved, and at what level. This is the arc; [`../CAPABILITIES.md`](../CAPABILITIES.md) is the capability-by-capability record, and the daily reports are the primary proof.

**Date:** 2026-07-02 · **Status:** v0.1 closed. The deterministic core is certified — 43 recorded digests + 10 TeamTracker relationship hashes + the maximal-composition digest, all frozen and re-provable via `npm run day20:regress`.

---

## The one idea, proven end-to-end

> Describe intent in a small, deterministic Project Model — and a **plugin-based engine with no AI in its generation path** turns it into real, running software the developer still owns and can edit by hand.

Over 21 days this grew from a single Spring slice into 5 backends × 2 databases × 2 project types, with a deterministic coding-style engine, optional integrations (including a detachable AI hook), relationships, and a full wizard — **without a single frozen hash drifting.** The clean seam architecture (backend plugins + database providers, a technology-neutral kernel) is what made every addition additive.

---

## Week 1 (Days 1–7) — Foundation: stacks, relationships, the database seam

**What it set out to prove:** that the deterministic model→code loop holds across more than one technology, with real relationships and more than one database, without breaking file separation or determinism.

**What it proved:**
- **4 backend stacks** (Spring, Express, FastAPI, Django) each generating real CRUD from one stack-agnostic model.
- **`belongs-to` foreign keys** across all four, each stack emitting its idiomatic FK — same logical schema, per-stack literal idiom; **relationship-free models byte-identical** to before (additive).
- **A `DatabaseProvider` seam + MySQL** as a second database, extracted with zero output change to the Postgres hashes.
- **Live-proven** against real PostgreSQL (TeamTracker Team→Application→Ticket→Comment, FKs enforced) and MySQL (Express, FK errno 1452).
- **16 frozen baselines** (8 Postgres + 8 MySQL), all re-confirmed at the Day-7 checkpoint.

*(Source: [`week-01-summary.md`](week-01-summary.md). Standing residual at the time: Spring not yet booted — cleared on Day 15.)*

## Week 2 (Days 8–14) — The Go 5th stack + the deterministic style engine

**What it set out to prove:** that a 5th stack plugs in with no kernel change, and that "coding style" can be a set of **deterministic switches** — never probabilistic "code personality" (ADR-003).

**What it proved:**
- **Go** as a 5th backend, live-proven on **both** databases (CRUD, FK enforcement, runtime types), with no new core interface — it consumed the existing seams. The matrix grew to **20 frozen hashes** (5 × 2 × 2).
- **A 3-axis coding-style engine** — formatting (indent), naming convention (wire keys), architecture depth (`simple` collapses layers) — each a **literal bypass at its default**, so default output reproduces all 20 hashes byte-for-byte. `simple` **booted live** on Express + FastAPI.
- **Wired into the wizard** (Day 14): a Style screen, a neutral `POST /api/style`, per-stack applicability gating, ADR-004 visibility, UI==CLI.
- **13 recorded style-alternative baselines** (5 naming + 2 formatting + 4 simple + 2 composition), all twice-identical.

*(Source: [`week-02-summary.md`](week-02-summary.md).)*

## Week 3 (Days 15–21) — Project types, integrations, wizard enrichment, certification, close

**What it set out to prove:** a second project type, the optional-integrations pattern (including AI *only* as a detachable hook), the full intake captured in the wizard — then prove the whole system together, and close honestly.

**What it proved:**
- **API-only project type** (Day 15–16) — a literal Web-App bypass (20 hashes frozen); the one stack that subtracts a frontend is Spring, and its **first-ever live boot** (web-app full-stack, then api-only) happened here, **clearing the standing Spring residual** — all 5 backends have now booted on Postgres.
- **The optional-integrations pattern** (Day 17–18) — email (SMTP) and a **detachable AI hook**. The AI hook is the sharpest ADR-001 test in the plan and it held: Thraksha emits inert AI-client code the app runs at *its* runtime; **generation makes no AI call**; the hook is detachable (booted inert, four-part proof).
- **Wizard enrichment** (Day 19) — project description → README, `belongs-to` relationships declarable in the entity screen (UI-declared == engine, byte-for-byte), the integration screen — the full intake captured end-to-end, proven at the model AND HTTP-route layers.
- **Full-system regression certification** (Day 20) — all **43 recorded digests + 10 relationship hashes** byte-identical; a **consolidated harness** (`npm run day20:regress`) proven byte-identical to the sum of the individual gates; and the genuinely new proof: every feature **composes** — a maximal cell (every feature at once) deterministic through the real HTTP chain (`33f3ec4b…`) AND booted coherently (composed FK round-trip live).
- **The close** (Day 21) — two cosmetic fixes (held to the same regression gate — proven hash-neutral) and this honest final documentation.

*(Sources: [`day-15-report.md`](day-15-report.md) … [`day-20-report.md`](day-20-report.md).)*

---

## Closing v0.1 accounting

*(A new record of the v0.1 close. The dated [`../MVP-EVALUATION.md`](../MVP-EVALUATION.md) checkpoint (2026-06-30) is left intact as history.)*

### In scope and done
- 5 backend stacks (generated + UI==CLI); all 5 booted on Postgres; MySQL booted on Express + Go.
- 2 databases behind a provider seam; 2 project types (Web App + API-only).
- 3-axis deterministic coding-style engine, wired into the wizard, gated per stack.
- 2 optional integrations — email + the detachable AI hook (ADR-001-honest).
- Scalar `belongs-to` relationships (UI-declared == engine); multi-user owner scoping (ADR-005).
- The wizard: full intake (type/style/integrations/relationships/description), choices shown (ADR-004).
- Determinism: 43 digests + 10 relationship hashes + the maximal-composition digest frozen; a consolidated regression harness validated against the individual gates.
- Every ADR and Law certified with a concrete proof location ([`day-20-report.md`](day-20-report.md) §7).

### Deliberately deferred (documented, not hidden — full list in [`../CAPABILITIES.md`](../CAPABILITIES.md) §3)
- MySQL live-boot on Spring/FastAPI/Django (generation-proven only); Spring MySQL boot.
- `has-many` schema; richer relationships (cascade, many-to-many, self-relations, object-graph nav).
- `DECIMAL` exercised by a demo; graceful bad-FK 4xx; FK keys unified under `namingConvention` (the mixed-key seam); cross-depth switching; style self-recorded in the manifest; MySQL env-var renaming; MySQL boolean read-back on ORM stacks.

---

## Verdict

**v0.1 is closed and honest.** The platform does what it claims — deterministic, plugin-based, developer-owned code generation across 5 stacks and 2 databases — and it says exactly where each claim was proven and what was deliberately left. Nothing drifted across 21 days; nothing is overclaimed. The rules that governed the build (the Constitution + the five ADRs) still govern any future change, and the regression backstop re-proves the deterministic core on demand.
