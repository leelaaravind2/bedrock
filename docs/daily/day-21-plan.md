# Day 21 — Plan: Demo polish + final documentation (the v0.1 close)

**Session 1 of 3 — PLANNING ONLY.** No implementation, no code edits. This file is the sole output. This is the FINAL day. Sessions 2 (Execution) and 3 (Evaluation + Closing) are scoped below.

**Carry-over context:** [`day-20-report.md`](day-20-report.md) — the CERTIFICATION: the **43 frozen digests + 10 TeamTracker relationship hashes + the maximal-composition digest `33f3ec4b…`**, the trusted consolidated harness (`npm run day20:regress`), the all-laws certification (§7), the whole-system known-limitations list (§5), and the two-item Day-21 polish backlog (§6).

**Guardrails:** ADR-003 (determinism — the 43 + 10 + maximal digest are frozen), **HONESTY (the governing constraint of the final docs — state what's proven, name what isn't, never overclaim)**, and the whole Constitution (Day 20 certified every ADR/Law). **No new features. No hash moves. The engine is untouched — the only code changes are UI text + a comment.**

---

## 0. What Day 21 is

The v0.1 close, in three parts:
1. **The two cosmetic fixes** from the Day-20 backlog (§2) — held to the same regression gate as everything else.
2. **Final documentation** (§3) — a `docs/README.md` pass, a new `docs/CAPABILITIES.md`, and the consolidated 21-day report — each capability at its **proven level**, every limitation carried forward.
3. **Closing v0.1 accounting** (§3.5) — in-scope-and-done vs deliberately-deferred, honest per the existing MVP-EVALUATION shape.

**No new features. No hash moves.** The 43 digests + 10 relationship hashes + the maximal-composition digest are the frozen record every Day-21 change must keep byte-identical.

---

## 1. THE REAL RISK OF THE FINAL DAY — the docs must not OVERCLAIM

Days 1–20 could fail by breaking something. **Day 21's failure mode is the docs claiming MORE than the 20 days proved.** The capabilities/final docs are the EXTERNAL-FACING record — they must be honest **by construction**: every capability claim traceable to a proof, every documented limitation carried forward. The discipline that made the build trustworthy governs the docs too. Three honesty traps, named:

### Trap 1 — "5 BACKENDS" HAS TEXTURE (and the precise statement corrects even the loose framing)
All 5 backends **generate deterministically** (the 20-hash matrix + `ui:demo` UI==CLI for all five). But live-boot coverage is NOT uniform — **state it exactly as the reports do, not "5 backends fully working on both DBs":**
- **Booted live on PostgreSQL:** Express, FastAPI, Django, Go (CRUD + relationships; plus the Day-17/18/20 FastAPI email/ai-hook + Express composed boots).
- **Spring: NEVER booted live** — generation + **family-proven** (its `ALTER…CONSTRAINT` FK mechanism is the same SQL proven live via FastAPI/Express). *(Note: even the Day-20 handoff's shorthand "all 5 booted on Postgres" overshoots — the authoritative reports [week-01 §5, week-02 §6, day-20 §5] say Spring was never booted. The docs must say "4 of 5 booted on Postgres; Spring family-proven." This correction IS the honesty discipline in action.)*
- **Booted live on MySQL:** Express + Go **only**. FastAPI/Django/Spring on MySQL are generation-proven + static-dialect-correct, **not booted**.

### Trap 2 — LIMITATIONS CARRIED FORWARD, NOT BURIED
A strengths list without an equally-honest limitations list is the classic overclaim. The docs must carry the **complete** whole-system set (Day-20 §5 + week-01 §5 + week-02 §5/§6):
1. Spring never booted (family-proven).
2. MySQL live only on Express + Go (the other three generation-proven on MySQL).
3. `has-many` records no schema (only `belongs-to` produces FKs — the inverse is the blueprint view).
4. Relationship scope minimal — scalar `belongs-to` FKs only (no object-graph nav, cascade tuning, many-to-many, self-relations, forward refs).
5. `DECIMAL`/`NUMERIC(19,2)` exists in both providers but is unexercised by the demo models.
6. Cross-depth switching unsupported (`architectureDepth` fixed at creation; a deliberate migration, not a toggle).
7. Style not self-recorded in the generated manifest (a style line would move all frozen hashes; visibility is wizard-side).
8. **Mixed-key FK serialization (confirmed under composition)** — in a snake_case project the FK wire key stays `teamId` (camel) beside snake declared fields; `namingConvention` governs declared fields only. Observed live in the Day-20 maximal cell; documented since Day 12/13.
9. Ungraceful bad-FK error (FastAPI/Express surface a non-existent parent as HTTP 500 vs Django's 400) — deferred optional hardening.
10. Cosmetic naming residuals in MySQL projects (`PG*` env var names) — functional, renaming would move Postgres hashes.
11. MySQL boolean read-back live-verified for Express only (ORM stacks expected-but-not-verified).

### Trap 3 — PROVEN vs GENERATION-PROVEN (preserve the daily reports' distinction)
CAPABILITIES.md states each capability at its **actual** proof level — what BOOTED live (and on which DB) vs what's generation/family-proven. Never collapse "generates correctly" into "runs live."

---

## 2. THE COSMETIC FIXES — trivial, but held to the same gate as everything else

Two fixes (Day-20 §6), both claimed to touch NO hash:

| # | File / location | Change | Nature |
|---|---|---|---|
| 1 | [`generator/ui/index.html:176`](../../generator/ui/index.html) | `<span class="step-label">Style</span>` → **"Style & integrations"** | UI text only |
| 2 | [`generator/src/teamtracker-model.ts:9–14`](../../generator/src/teamtracker-model.ts) | The stale comment ("relationships are carried as model metadata … No half-working relationship codegen is introduced") → a corrected one-line note that the plugins DO generate belongs-to FKs (the 10 TeamTracker baselines bake in `team_id`/`application_id`/`ticket_id` + constraints) | **Comment only** — leave the demo-model logic and its hashes alone |

**CRITICAL — "confident it won't move a hash" is exactly the assumption this project refused to make.** The plan requires: make the fixes, THEN **re-run `npm run day20:regress` and PROVE the 43 + 10 + maximal digest are STILL byte-identical.** The last change to the codebase is held to the same gate as the first.
- Fix 1 touches `ui/index.html` — the UI is not part of any generated output or hashed model, so it cannot move a generation hash; the regression proves it.
- Fix 2 is inside a JS comment block in `teamtracker-model.ts` — comments are code, not generated output, so it cannot move a generation hash; but `teamtracker-model.ts` DRIVES the 10 TeamTracker baselines, so the regression MUST confirm those 10 are unmoved. **If either fix moves a hash → STOP and report it as a real finding** (a UI label or a comment moving a hash means it wasn't as isolated as assumed).

---

## 3. THE FINAL DOCS (the set, each claim grounded in a proof)

### 3.1 `docs/CAPABILITIES.md` (NEW) — what Thraksha v0.1 does, each capability at its PROVEN level
Every claim cites where it was proven (a day report / a frozen baseline / the harness). Recommended capability→proof table:

| Capability | Proven level | Proof source |
|---|---|---|
| 5 backend stacks generate deterministically | Generate + UI==CLI (all 5) | 20-hash matrix (week-01 §3, day-09/10); `ui:demo` |
| Live boot — PostgreSQL | Express/FastAPI/Django/Go booted; **Spring family-proven (not booted)** | week-01 §5 (Days 1–4), day-10, day-17/18/20 boots |
| Live boot — MySQL | **Express + Go only**; others generation-proven | week-01 §5, day-10, week-02 §6 |
| 2 databases behind a provider seam | Generate + boot (per above) | week-01 §1b, the 20-hash matrix (both DBs) |
| 2 project types (Web App + API-only) | Both proven; api-only == web-app manifest-only | Day 15/16 gates, day-20 §1 (re-derived) |
| 3-axis style engine (formatting/naming/architecture) | Deterministic; applicability per stack | week-02 §3/§4 (13 style baselines) |
| 2 integrations (email + detachable AI hook) | Generate + coherence; ai-hook booted detachable | day-17/18 baselines, day-20 §3 (four-part boot) |
| Relationships (scalar belongs-to) | UI-declared == engine, byte-for-byte | day-19 §2, the 10 TeamTracker hashes |
| Determinism / regression backstop | 43 digests + 10 relationship hashes frozen | day-20 (the consolidated harness) |
| Feature composition | Deterministic + booted coherently | day-20 §3 (maximal cell `33f3ec4b…`) |
| Multi-user (owner scoping) | Live in the composed boot | day-20 §3.2 (ADR-005) |
| The wizard (full intake, ADR-004 shown) | Type/style/integrations/relationships/description | day-19, day-14/16 (UI==CLI) |

**CAPABILITIES.md MUST include a Known-Limitations section = the complete Trap-2 set (§1.2).** The strengths and the limitations live in the same doc.

### 3.2 The limitations doc / section
The complete whole-system set (§1.2, 11 items). Recommended as a dedicated section within `docs/CAPABILITIES.md` (so no strengths claim is read without its limitation), cross-linked from the 21-day report.

### 3.3 `docs/README.md` pass — accurate to the shipped v0.1 state
`docs/README.md` is currently the **guardrails-index** ("Read this first"), listing only the Constitution/ADRs/INTAKE/BUILD-PLAN. The pass adds the shipped-state artifacts to its index — `CAPABILITIES.md`, the consolidated 21-day report, the `daily/` arc — and states v0.1 is closed. **Accurate to what shipped, not the pre-build aspiration.** No overclaim.

### 3.4 The consolidated 21-day report (NEW — recommend `docs/daily/21-day-report.md`)
The arc, what each week proved:
- **Week 1 (Days 1–7)** — foundation: 4 stacks, relationships (belongs-to FKs), the database-provider seam + MySQL, file separation, determinism. (Source: `week-01-summary.md`.)
- **Week 2 (Days 8–14)** — the Go 5th stack (live on both DBs) + the deterministic coding-style engine (formatting/naming/architecture), wired into the wizard. (Source: `week-02-summary.md`.)
- **Week 3 (Days 15–21)** — the API-only project type, the optional-integrations pattern (email + the detachable AI hook), wizard enrichment (description → README, relationships in the entity screen, integration screen), the full-system regression (day 20), and this polish/docs close (day 21).
This is the project's closing record — each week's proof, the standing residuals, the v0.1 verdict.

### 3.5 Closing v0.1 accounting
In-scope-and-done vs deliberately-deferred, honest per the MVP-EVALUATION's shape. **Recommend a NEW closing section (in the 21-day report or CAPABILITIES.md), NOT overwriting [`docs/MVP-EVALUATION.md`](../MVP-EVALUATION.md)** — that doc is a dated historical checkpoint (2026-06-30, "core is proven, proceed to Path A"); overwriting it would erase the honest historical line. The v0.1 accounting is a new record that sits alongside it.

---

## 4. Session 2 (EXECUTION) — done-conditions

1. **The two cosmetic fixes made** (§2), and the consolidated regression re-run **PROVES the 43 + 10 + maximal-composition digest are STILL byte-identical** (the fixes moved no hash — proven, not assumed). If either moves a hash → STOP and report.
2. **`docs/CAPABILITIES.md` written** — every capability at its proven level, each claim traceable to a source (§3.1); the "5 backends" texture and proven-vs-generation-proven distinctions stated precisely; the complete Known-Limitations section included.
3. **The limitations section** — the complete whole-system set (§1.2, all 11 items), carried forward.
4. **The `docs/README.md` pass + the consolidated 21-day report + the v0.1 accounting** — accurate to the shipped state, honest about deferrals; the historical MVP-EVALUATION left intact.
5. **NO new features; NO hash moves; the engine untouched** (the fixes are UI text + a comment).

**Blocking guardrail:** the post-fix regression (`npm run day20:regress`) must be green with the 43 + 10 + maximal digest byte-identical BEFORE the docs are considered final. A moved hash is a finding, not a re-baseline.

---

## 5. Session 3 (EVALUATION + CLOSING) — done-conditions

- **Final regression from clean:** `rm -rf dist && tsc && npm run day20:regress` green; the **43 + 10 + maximal-composition digest byte-identical** (the last proof that the final shipped state == the Day-20 certified state); guard-the-guard diff-empty.
- **The docs reviewed for HONESTY:** no capability overclaimed; every limitation from the Trap-2 set present; proven-vs-generation-proven preserved; the "5 backends / MySQL coverage / Spring-not-booted" texture stated precisely (matching the reports, not the loose shorthand).
- **The cosmetic fixes confirmed applied** (the stepper reads "Style & integrations"; the comment corrected) **and confirmed hash-neutral** (the regression proved it).
- **Final ADR/Law sanity** — nothing regressed (the Day-20 §7 certification still holds).
- **Write [`docs/daily/day-21-report.md`](day-21-report.md)** — the FINAL report. **No forward handoff (this is the end)** — instead a closing statement: what shipped, what's proven (at each level), what's deliberately deferred, and the v0.1 verdict. The 43 + 10 + maximal digest are the permanent frozen record.

---

## 6. Scope guard — OUT for Day 21

- ❌ No new features / stacks / databases / types / style options / integrations.
- ❌ **No hash moves** — if a cosmetic fix moves a hash, STOP (it wasn't isolated).
- ❌ No re-baselining anything (the 43 + 10 + maximal digest are frozen).
- ❌ **No OVERCLAIMING in the docs** — every capability at its proven level; every limitation carried forward; proven-vs-generation-proven preserved.
- ❌ No rich frontend generation; no probabilistic variation.
- ❌ Do NOT overwrite the historical `MVP-EVALUATION.md` (dated checkpoint — the v0.1 accounting is a new, separate record).

---

## 7. Constraints (bake into every step)

- **ADR-003 (determinism)** — the 43 digests + 10 relationship hashes + the maximal-composition digest are frozen; the final regression proves the shipped state == the certified state.
- **HONESTY (the governing constraint of the final docs)** — state what's proven, name what isn't, never overclaim; the same discipline that governed the build governs its documentation. Every capability claim cites a proof; every limitation is carried forward.
- **No hash moves.** The engine is untouched — the only code changes are the UI label + the comment.

---

**Day 21 plan verdict:** the v0.1 close is two cosmetic fixes held to the full regression gate (UI label + a comment — proven hash-neutral, not assumed) plus an honest final-docs set: `CAPABILITIES.md` (each capability at its proven level, with a complete Known-Limitations section), a `docs/README.md` pass, and the consolidated 21-day report, with a closing v0.1 accounting that leaves the historical MVP-EVALUATION intact. The governing constraint is HONESTY — the docs must not claim more than the 20 days proved, so the plan names the three overclaim traps (the "5 backends" texture with Spring never booted and MySQL live on Express+Go only; the complete 11-item limitations set carried forward; proven-vs-generation-proven preserved) and even corrects the handoff's own loose shorthand to match the authoritative reports. The final regression is the last proof that the shipped state is the certified state. **Nothing moves; nothing is overclaimed.**
