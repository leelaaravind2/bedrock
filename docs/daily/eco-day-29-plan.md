# Eco-Day 29 — PLAN: field-key consistency (the mixed-key fix) — **THE FIRST DELIBERATE RE-BASELINE**

**Phase 2, Day 29. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 29 closes the documented **mixed-key** limitation: **FK wire keys follow the SAME naming convention as declared fields**, routed through the SAME transform (`applyNaming`) at the serialization boundary. **This DELIBERATELY MOVES a frozen baseline** — the FIRST intentional re-baseline of the ecosystem phase. **⚠️ EXTRA SCRUTINY:** the usual "no baseline moves" rule is *inverted* — a documented set moves **on purpose**, and **every OTHER hash must stay byte-identical** (a stray move = a FINDING, STOP).

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (**§1.1** — *no baseline moves SILENTLY; a DELIBERATE re-baseline is allowed ONLY when intentional, documented old→new + rationale, isolated, recorded*; **§3** STOP-and-report; **§4** honesty) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 29 (lines 55–58) → [`eco-day-27-report.md`](eco-day-27-report.md) (current gate: **70 baked + 10 TeamTracker + non-hash**) → the REAL code: `core/style.ts` (`applyNaming`), each stack's FK wire-key emission (the bypass), and the harness fixtures (which are snake_case + FK).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code — the root cause + the exact enumeration):**
> - **The transform:** `applyNaming(declaredName, convention)` ([core/style.ts](../../generator/src/core/style.ts)) — `'default'`/`'camelCase'` leave `teamId` unchanged; `'snake_case'` → `team_id`. Each plugin routes **declared scalar fields** through it via `wireKey(field, ctx) = applyNaming(field.name, ctx.naming)`. Its JSDoc is explicit: *"governs the wire key ONLY — never the DB column."*
> - **THE ROOT CAUSE — FK wire keys BYPASS `applyNaming`.** Every stack emits the belongs-to FK wire key from a HARDCODED camelCase base, not routed through `applyNaming`: Express `fkDataKey = ${decapitalize(target)}Id` (e.g. `teamId`), Go `fkJsonKey` (json tag `teamId`), Spring the DTO field `private Long teamId;` with **no `@JsonProperty`**, Python/Django similar. So under `snake_case`, declared fields become `due_date` but FK keys stay `teamId` — **MIXED**.
> - **Empirically confirmed (MAXIMAL, Express, snake_case):** the DTO emits **`teamId`/`applicationId`/`ticketId`** (camelCase, 40 occurrences) as wire keys alongside snake_case declared fields, while the DB columns are `team_id` etc. This is the documented mixed-key limitation.
> - **THE EXACT ENUMERATION — only MAXIMAL is a frozen snake_case+FK baseline (⇒ the sole mover):**
>   - The snake_case fixtures use **`buildTaskModel`** — Task has **NO relationship** (no FK) → the 5 `naming` baselines + the snake_case `composition` baselines are byte-identical (no FK to reroute).
>   - The FK-bearing fixtures — the 20-matrix (no FK), the **10 TeamTracker** (PART 1d), the **10 has-many** (PART 1m), api-only TeamTracker — all use **DEFAULT naming** → `applyNaming('teamId','default')` = `teamId` unchanged → **byte-identical**.
>   - The **MAXIMAL cell** (`buildMaxCellModel`, **Express, snake_case, multi-edge belongs-to**) is the ONLY frozen fixture that is snake_case **and** FK-bearing → **it is the one baseline that moves** (`929c379f9e98ec34…` → a new hash). *(camelCase + FK: none in the backstop, and would be byte-identical anyway.)*
> - **The DB column is unaffected** (always snake_case `team_id`); the fix touches ONLY the JSON **wire key** — surgical by nature.

---

## 0. What Day 29 is — the mixed-key fix, done as a documented re-baseline

Under a `snake_case` project, declared fields serialize as `due_date` but a belongs-to FK serializes as `teamId` — inconsistent (mixed) keys. Day 29 routes the FK wire key through the **same `applyNaming`** the declared fields use, so a `snake_case` project emits `team_id` for the FK too. Because the mixed-key behavior was **documented frozen output** (the MAXIMAL cell), fixing it **moves that baseline** — deliberately, documented, isolated, and re-certified.

---

## 1. THE INVERTED DETERMINISM SPINE (extra scrutiny)

1. **The re-baseline is DELIBERATE + DOCUMENTED — never silent (§1.1).** Exactly **one** frozen baked baseline moves: **`MAXIMAL|MaxCell`** (`929c379f9e98ec34…` → new). Record **old → new + the rationale** (FK wire keys `teamId`/`applicationId`/`ticketId` → `team_id`/`application_id`/`ticket_id` under snake_case). The move is intentional, isolated, and recorded in the report + the harness constant.
2. **ONLY the intended baseline moves — the load-bearing GUARD.** Every OTHER frozen hash stays byte-identical — the 20-matrix, the 23 alternatives (incl. the Task snake_case ones — no FK), the 10 TeamTracker (default naming), the 5 version, the 10 has-many (default), the 10 decimal, the non-hash gates. **A hash moving that SHOULDN'T is the finding — STOP** (it means the fix wasn't surgical: it perturbed default/camelCase output, or a DB column, or a non-FK path). The harness IS the guard: update ONLY the `MAXIMAL` expected constant; if any other baked assertion goes red, a stray move happened → STOP.
3. **The re-baseline is a NEW CERTIFIED STATE.** After Day 29, the new MAXIMAL hash IS the frozen backstop; `day20:regress` is green on the new state. The Phase-2 benchmark (Day 30) runs against this certified state.

---

## 2. THE FIX — route FK wire keys through `applyNaming` (surgical, per stack)

The FK wire key gets the SAME treatment declared fields already get: a **wire key** (JSON, `applyNaming`'d) that is DISTINCT from the **internal identifier** (unchanged), so under `default`/`camelCase` the output is byte-identical and only `snake_case` changes.

- **The rule:** wherever a stack emits the belongs-to FK **JSON key**, replace the hardcoded camelCase base with `applyNaming(<currentCamelBase>, ctx.naming)`. The **internal** data key / Java field name / attribute stays as-is (like declared fields keep `data.<declaredName>` while the wire key moves).
- **Per stack (the exact sites, confirmed by reading):**
  - **Express** — `fkDataKey(rel)` (`teamId`) is used as BOTH the rowToObject wire key and the dto read/store key. Split: `fkWireKey = applyNaming(fkDataKey, naming)` for the JSON boundary (`rowToObject` LHS, `body.<wire>`), keep the internal `data.<fkDataKey>` contract → the repository is untouched. (Mirrors the declared-field split already in `validationLinesFor`/`rowToObject`.)
  - **Go** — `fkJsonKey(rel)` (the `json:"teamId"` tag) → `applyNaming(fkJsonKey, ctx.naming)`. The Go struct field `TeamID` (internal) is unchanged.
  - **Spring** — the DTO FK field `private Long teamId;` gains `@JsonProperty(applyNaming("teamId", naming))` **only when it differs** (the same gated `@JsonProperty` pattern declared fields use) → snake_case emits `@JsonProperty("team_id")`; default/camelCase emit nothing (byte-identical).
  - **FastAPI** — the FK schema field gets a Pydantic `alias=applyNaming(...)` **only when it differs** (the same alias pattern declared fields use).
  - **Django** — the FK is exposed at the DRF serializer boundary; route its wire key through `applyNaming` via the SAME `drfFieldExpr`/wire-key mechanism declared fields use (source-mapped serializer field when wire ≠ attr).
- **Surgical guarantees:** the transform touches ONLY the JSON wire key. It does NOT touch: the DB column (`team_id`, already snake_case), the SQL FK constraint, the internal attribute/field/`data.` contract, or the has-many reverse raw-row output (Day 25 — separate, default-naming baselines, unaffected). So `default`/`camelCase` are byte-identical **by construction** (`applyNaming` is a no-op / identity for `teamId` there).

---

## 3. The ENUMERATION — old → new (what moves) vs what stays

**MOVES (deliberate, documented — exactly one baked baseline):**

| Baseline | Old hash | New hash | Why |
|---|---|---|---|
| `MAXIMAL\|MaxCell` (Express, snake_case, multi-edge FK) | `929c379f9e98ec34…` | *(computed in execute)* | FK wire keys `teamId`/`applicationId`/`ticketId` → `team_id`/`application_id`/`ticket_id` (now honor snake_case, matching declared fields) |

**STAYS byte-identical (the guard — a move here = finding, STOP):** the 20-matrix; the 23 alternatives incl. the 5 `naming` snake_case (Task, **no FK**) + the snake_case `composition` (Task, no FK); the **10 TeamTracker** (default naming); the **5 version**; the **10 has-many** (default naming); the **10 decimal** (no FK); the non-hash gates (1c/1e/1h/1i/1j/1k/1l/1m/1n).

**NEW additive coverage (proves the fix across all 5 stacks — NOT a move):** a **snake_case + belongs-to** fixture (e.g. `Team` + `Application belongs-to Team`, snake_case naming) generated across the **5 stacks** → new baselines recording the FIXED FK wire key (`team_id`), in a new **PART 1o**. This demonstrates "FK keys honor the convention across all 5 stacks" beyond MAXIMAL's single (Express) backend, and gives regression coverage. Additive (new baked digests → e.g. 75 baked), never replacing a frozen hash.

---

## 4. THE ONLY-INTENDED-MOVED PROOF (how the guard is run)

- **The harness is the guard.** Every baked baseline asserts `got === <recorded>`. In execute: apply the fix, then run `day20:regress`. Only `MAXIMAL` should go red (its recorded constant is now stale). Update **ONLY** the `MAXIMAL` constant to the new value. Re-run: **green**. If ANY OTHER baked assertion (or the 10 TeamTracker, or a non-hash gate) goes red → **a stray move happened → STOP** and diagnose (the fix leaked into default/camelCase, a DB column, or a non-FK path).
- **Belt-and-suspenders (recommended):** capture `--emit-digests` BEFORE the fix; after the fix + the MAXIMAL update, diff → the ONLY differing baked line is `MAXIMAL` (plus the new PART 1o additions). This is the explicit "only-intended-moved" artifact for the report.
- **UI==CLI:** the FK wire key flows through the SAME `assembleBlueprint`/plugin path for both UI and CLI, so UI==CLI holds unchanged (re-confirm PART 1i green).
- **Cross-check the stray-move surface:** confirm no assertion elsewhere encodes the OLD mixed-key form (e.g. a `namingWireKeys`-style check on an FK) — `namingWireKeys` checks Task's declared fields only (no FK), so it is unaffected; verify in execute.

---

## 5. STAGING + done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."** And the inverted note: **"exactly ONE baseline (MAXIMAL) moves; ANY OTHER moved hash is a finding — STOP."**

- **DC-1 — the fix:** route the belongs-to FK wire key through `applyNaming` in all 5 stacks (§2), splitting the wire key from the internal identifier so `default`/`camelCase` are byte-identical.
- **DC-2 (ONLY-INTENDED-MOVED — load-bearing, inverted):** `rm -rf dist && npm run build && npm run day20:regress` → **exactly `MAXIMAL` goes red** (stale constant). Update ONLY the `MAXIMAL` constant to the new hash; re-run → **green**. Confirm via `--emit-digests` diff that the ONLY moved baked line is `MAXIMAL`. **A stray move = finding, STOP** (do not update any other constant to "make it green").
- **DC-3 — the documented re-baseline:** record old (`929c379f…`) → new (computed) + rationale, in the harness comment + the report. The move is deliberate, isolated, certified.
- **DC-4 — FK keys honor the convention across all 5 stacks:** a snake_case + FK fixture → the FK wire key is `team_id` (snake_case) in every stack; recorded as NEW additive baselines (PART 1o). Verify snake_case ⇒ `team_id`, default/camelCase ⇒ `teamId` (byte-identical).
- **DC-5 — UI==CLI + invariants:** UI==CLI still holds (PART 1i green); generator **pure-Node** (`deps {}`, 0 native); **ONLY** the documented `MAXIMAL` baseline moved; **no OTHER frozen hash moved**; the new coverage additive.

**Execute scope guard:** only field-key consistency (FK wire keys → `applyNaming`). **NOT** new features. The re-baseline is **DELIBERATE + DOCUMENTED** (old→new + rationale). **ONLY the FK-key-affected baseline (MAXIMAL) moves** — any OTHER moved hash is a **FINDING, STOP** (never update another constant to hide it). Surgical: touch ONLY the FK JSON wire key (never the DB column, the internal identifier, or a non-FK path). No AI. No signing. Commit to `main`.

---

## 6. REPORT — done-conditions

[`eco-day-29-report.md`](eco-day-29-report.md): the **OLD mixed-key behavior** (documented — snake_case declared fields + camelCase FK keys, with the empirical example); the **fix** (FK wire keys through the same `applyNaming`, per stack, wire-key/internal split); the **enumerated old → new** (MAXIMAL `929c379f…` → new + rationale) as the FIRST deliberate re-baseline; the **only-intended-moved proof** (the `--emit-digests` diff shows ONLY `MAXIMAL` moved; all other frozen hashes byte-identical); the **new certified state** (day20:regress green on the new backstop); **FK keys honor the convention across all 5 stacks** (PART 1o); **UI==CLI**; **invariants** (pure-Node; ONLY MAXIMAL moved). **Forward-flags:** the desktop-store MAXIMAL reference (`929c379f…` in the Day-10 DC-4 store round-trip) will need the same update **if** that test is re-run (flag it — separate from day20:regress); what **Day 30** picks up — **Phase 2 close / the benchmark**, run against THIS newly-certified field-key state.

---

## 7. Scope guard — OUT for Day 29
- Only field-key consistency (FK wire keys → `applyNaming`). **NOT** new features/types/stacks.
- The re-baseline is **DELIBERATE + DOCUMENTED** (old→new + rationale) — never silent (§1.1).
- **ONLY the FK-key-affected baseline (MAXIMAL) moves.** Any OTHER moved hash is a **FINDING — STOP** (diagnose; never silently re-baseline it).
- Surgical: touch ONLY the FK JSON **wire key**. Never the DB column, the SQL constraint, the internal identifier, or a non-FK path.
- No AI. No signing.

---

## 8. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails (§1.1 the deliberate-re-baseline rule) + Month-2 Day 29 + Day-27 report + the real `applyNaming` + per-stack FK-key sites? — ✅ (this session).
2. Only Day-29's job (the mixed-key FK fix)? — yes; a documented re-baseline, not a new feature.
3. Which baselines must NOT move? — **all except `MAXIMAL`**. The one deliberate mover is enumerated; every other frozen hash stays byte-identical (the guard).
4. New AI touchpoints? — **none.**
5. Is `default`/`camelCase` byte-identical? — **yes, by construction** (`applyNaming` is identity for `teamId` there); only `snake_case` changes.
6. Three killers checked? — no clock/RNG/UUID; the fix is pure `applyNaming` string math; LF only; stable order. The DB column is untouched (only the JSON wire key moves).
7. A gate that can actually FAIL? — **DC-2** (the inverted guard: exactly MAXIMAL red, then green; a stray red = finding), **DC-4** (FK key not snake_case in some stack), **DC-5** (UI≠CLI; a non-FK hash moved). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) a stray move (the fix leaks into default/camelCase, a DB column, or a non-FK path) — the harness guard catches it, **STOP**, don't paper over; (ii) silently re-baselining a second hash to "make it green" (forbidden — §1.1); (iii) touching the DB column or internal identifier (must be wire-key-only); (iv) forgetting the desktop-store MAXIMAL reference (flag it, don't silently skip); (v) undocumented old→new (must be recorded) — all guarded.

---

*Day 29 closes the mixed-key limitation as the FIRST deliberate re-baseline of the ecosystem phase: FK wire keys now flow through the SAME `applyNaming` transform as declared fields, so a snake_case project emits `team_id` for a belongs-to FK instead of the old mixed `teamId`. The fix is surgical — only the JSON wire key moves, never the DB column or the internal identifier — so `default`/`camelCase` output is byte-identical by construction. Exactly ONE frozen baked baseline moves: the MAXIMAL cell (`929c379f…` → a new hash, Express + snake_case + multi-edge FK), the only frozen fixture that combines a non-default naming with an FK; every other frozen hash stays byte-identical, and the harness itself is the guard (a stray red = a finding, STOP). The move is deliberate, documented old→new + rationale, isolated, and re-certified as the new backstop, with new PART-1o coverage proving FK keys honor the convention across all 5 stacks. Day 30 closes Phase 2 with the benchmark, run against this newly-certified field-key state.*
