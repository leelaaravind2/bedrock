# Eco-Day 29 — REPORT: field-key consistency (the mixed-key fix) — **THE FIRST DELIBERATE RE-BASELINE**

**Phase 2, Day 29.** Closes the documented **mixed-key** limitation: a belongs-to FK's **wire key** now flows through the SAME `applyNaming` transform declared fields use, so a `snake_case` project emits `team_id` for the FK instead of the old mixed `teamId`. **This is the FIRST intentional re-baseline of the ecosystem phase** (§1.1's documented exception): **exactly one** frozen baseline moves (MAXIMAL), on purpose, documented old→new; **every other hash stays byte-identical.**

Plan: [`eco-day-29-plan.md`](eco-day-29-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (**§1.1** deliberate-re-baseline rule; §3 STOP-and-report; §4 honesty). Builds on the gate from [`eco-day-27-report.md`](eco-day-27-report.md) (70 baked + 10 TeamTracker + non-hash).

---

## THE VERDICT

> ✅ **The mixed-key limitation is closed, as a documented re-baseline.** A belongs-to FK's JSON **wire key** now routes through `applyNaming` (the same transform declared fields use), so under `snake_case` all 5 stacks emit a snake_case FK key. **Exactly ONE frozen baked baseline moved** — **`MAXIMAL|MaxCell`: `929c379f…` → `366e19d9…`** (Express + snake_case + multi-edge FK, the ONLY frozen fixture combining a non-default naming with an FK). The `--emit-digests` diff proves it: **MAXIMAL is the sole mover** (+ 5 new additive coverage baselines); **0 non-MAXIMAL baked digests changed**, and the 10 TeamTracker + non-hash gates stayed green. `default`/`camelCase` output is **byte-identical by construction** (`applyNaming` is identity for `teamId` there); only the JSON wire key moves — never the DB column or the internal identifier. Generator **pure-Node** (`deps {}`, 0 native); new certified state: **113 OK / 0 FAIL, 75 baked**.
>
> **A key diagnosis (refined the plan):** the camelCase-FK bug was in **Express / Go / Spring** only. **Python + Django ALREADY emit snake_case FK keys** (Python `application_id` via the column; Django `team` via the relation name) — so they were left UNTOUCHED (routing them through `applyNaming(camelBase)` would have moved their *default*-naming baselines). The fix is surgical: **only the 3 camelCase-FK stacks changed, and only MAXIMAL is a frozen mover.**

---

## 1. The OLD mixed-key behavior (documented)

`applyNaming(field.name, convention)` cases the wire key of **declared scalar fields** (`'default'`/`'camelCase'` leave `teamId` unchanged; `'snake_case'` → `team_id`). But the belongs-to **FK** wire key BYPASSED it — hardcoded camelCase in Express (`fkDataKey` = `teamId`), Go (json tag `teamId`), Spring (DTO field `teamId`, no `@JsonProperty`). So under `snake_case`, declared fields became `due_date` while the FK stayed `teamId` — **MIXED**. Empirically, the frozen **MAXIMAL** cell (Express, snake_case) emitted `teamId`/`applicationId`/`ticketId` (40 occurrences) as wire keys alongside snake_case declared fields.

---

## 2. The fix (surgical — wire key only, all camelCase-FK stacks)

The FK wire key gets the SAME wire-key/internal-identifier split declared fields already use:
- **Express** ([express/entity-codegen.ts](../../generator/src/plugins/express/entity-codegen.ts)): a `fkWireKey(rel, ctx) = applyNaming(fkDataKey(rel), ctx.naming)` for the JSON boundary (`rowToObject` LHS, `body.<wire>`, error messages); the internal `data.<fkDataKey>` contract (dto→repository) is UNCHANGED. Verified: `team_id: row.team_id` (wire:column), `data.teamId = body.team_id` (internal stays camelCase).
- **Go** ([go/entity-codegen.ts](../../generator/src/plugins/go/entity-codegen.ts)): the json tag + validation message route through `fkWireKey`; the Go struct field `TeamID` (internal) is unchanged.
- **Spring** ([spring/entity-codegen.ts](../../generator/src/plugins/spring/entity-codegen.ts)): the DTO FK field gains `@JsonProperty(applyNaming(...))` **only when it differs** (the same gated `@JsonProperty` pattern declared fields use); the Java field `teamId` (internal) is unchanged.
- **Python + Django — UNTOUCHED** (already snake_case-consistent — see the verdict's diagnosis).
- **Surgical guarantees:** touches ONLY the JSON wire key — never the DB column (`team_id`, already snake), the SQL FK constraint, the internal identifier, or the has-many reverse raw output. `default`/`camelCase` are byte-identical by construction.

---

## 3. THE DELIBERATE RE-BASELINE (documented old → new)

| Baseline | Old | New | Rationale |
|---|---|---|---|
| `MAXIMAL\|MaxCell` (Express, snake_case, multi-edge FK) | `929c379f9e98ec34c3a42bafe814ebb65fffde0820d754176a7c7ab95c825e20` | `366e19d9deda1cafcd6788e7fb703a66c7b113c3c6af2e66de932e08df3b7023` | FK wire keys `teamId`/`applicationId`/`ticketId` → `team_id`/`application_id`/`ticket_id` (now honor snake_case, matching declared fields; the mixed-key limitation closed). DB columns + internal identifiers unchanged. |

Recorded in the `MAXIMAL` constant's comment ([day20-regression.ts](../../generator/src/day20-regression.ts)) + here. Intentional, isolated, twice-identical, and re-certified as the new backstop (§1.1 satisfied).

---

## 4. THE ONLY-INTENDED-MOVED PROOF (the load-bearing guard)

- **The harness is the guard.** After the fix, `day20:regress` showed exactly ONE red assertion — `MAXIMAL` (its recorded constant now stale). I updated **ONLY** the `MAXIMAL` constant; re-run → **green**. No other baked assertion, no TeamTracker hash, no non-hash gate went red.
- **`--emit-digests` diff (pre-fix 70 vs final 75):** the ONLY changed baked line is `MAXIMAL` (929c379f → 366e19d9); the other 4 changes are the **new** additive `FKKEY|*` coverage lines. **0 non-MAXIMAL baked digests changed.**
- **UI==CLI** still holds (PART 1i green — the FK wire key flows through the same `assembleBlueprint`/plugin path for both UI and CLI).

---

## 5. Cross-stack coverage (PART 1o, additive) + invariants

- **PART 1o** — a `snake_case` + belongs-to fixture (`Application belongs-to Team`) across all 5 stacks → 5 new twice-identical baselines (→ **75 baked**), asserting the FK **wire key is snake_case** in every stack: Express `body.team_id`, Go `json:"team_id"`, Spring `@JsonProperty("team_id")`, FastAPI `team_id`, Django `"team"` (the snake relation name). This proves the fix (and the pre-existing Python/Django consistency) across all 5 stacks, beyond MAXIMAL's single Express backend.
- **Invariants:** generator **pure-Node** (`deps {}`, 0 native); **ONLY** `MAXIMAL` moved among frozen baselines; no DB column changed (wire key only); the new coverage additive.
- **Verification levels (honest):** the fix is a deterministic `applyNaming` string transform, verified in the **generated output** (snake_case wire keys) + the harness (twice-identical, only-MAXIMAL-moved). **Express** (the moved stack) output was inspected directly; Go/Spring are generation-only (no toolchain here); Python/Django untouched. No boot (Docker daemon down / no Go·Java toolchains).

---

## 6. What changed

- **3 plugins:** `plugins/{express,go,spring}/entity-codegen.ts` (+`fkWireKey` / `@JsonProperty` gating — FK wire key through `applyNaming`; internal identifier untouched). **Python + Django untouched.**
- **Harness:** `day20-regression.ts` (the `MAXIMAL` constant `929c379f…` → `366e19d9…` with documented old→new + rationale; +PART 1o cross-stack coverage).
- **The model, `assembleBlueprint`, templates, DB dialects — UNTOUCHED.** No AI, no new dep, no native module.

---

## 7. Forward-flags & honest boundaries

- **Historical references to the old hash are NOT edited:** `eco-day-01/02/04/08/10` reports cite `929c379f…` as the MAXIMAL that was true THEN — they are historical records, correct for their date. This report documents the deliberate move as of Day 29.
- **The desktop-store round-trip** (Day-8/10 DC-4) regenerated `929c379f…` from the SQLite-stored MAXIMAL blueprint. **No live desktop test hardcodes that value** (grep of `desktop/**` for `929c379f` = none; the store hash is computed, not asserted against a constant). If that round-trip is re-run, it now regenerates the new `366e19d9…` (the store round-trips the same blueprint → the new certified output). Flagged for honesty; nothing breaks.
- **The `maxcell` driver** computes (not hardcodes) — now prints `366e19d9…`, twice-identical.
- **What Day 30 picks up:** **Phase 2 close / the benchmark**, run against THIS newly-certified field-key state (the new MAXIMAL is now the frozen backstop).

---

**Day 29 verdict, restated:** the mixed-key limitation is closed as the first deliberate re-baseline of the ecosystem phase. A belongs-to FK's JSON wire key now flows through the SAME `applyNaming` transform declared fields use — so under snake_case all 5 stacks emit a snake_case FK key (Express/Go/Spring via the fix; Python/Django already, so untouched). The fix is surgical: only the JSON wire key moves, never the DB column or the internal identifier, so default/camelCase output is byte-identical by construction. Exactly ONE frozen baked baseline moved — MAXIMAL (`929c379f…` → `366e19d9…`), the only frozen fixture combining a non-default naming with an FK — documented old→new + rationale, isolated, twice-identical, and re-certified. The `--emit-digests` diff proves MAXIMAL is the sole mover (0 non-MAXIMAL baked changed; 10 TeamTracker + non-hash green), and new PART-1o coverage proves the fix across all 5 stacks (75 baked). UI==CLI holds; generator pure-Node, `deps {}`, 113 OK / 0 FAIL. Day 30 closes Phase 2 with the benchmark, run against this newly-certified field-key state.
