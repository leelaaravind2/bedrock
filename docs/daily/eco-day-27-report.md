# Eco-Day 27 — REPORT: decimal / money field type

**Phase 2, Day 27.** A proper **decimal/money** field type with configurable **precision/scale**: exact decimals, deterministically, across all 5 stacks. **Storage `NUMERIC(p,s)`** (never float, never Postgres `money`; scale ≥4 default) with the value carried as a **STRING on the wire** — no float drift, by construction.

Plan: [`eco-day-27-plan.md`](eco-day-27-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§3 STOP-and-report; §4 honesty). Builds on the gate from [`eco-day-25-report-pass2.md`](eco-day-25-report-pass2.md) (60 baked + 10 TeamTracker + non-hash).

---

## THE VERDICT

> ✅ **Decimals are exact across all 5 stacks.** A `Decimal` field maps to **`NUMERIC(precision, scale)`** (Postgres) / **`DECIMAL(p,s)`** (MySQL) — **never float/double/`money`** — with configurable precision/scale (default **19/4**, scale ≥4) read from `field.validation.precision`/`.scale`. The value is a **STRING end-to-end** (no float drift): Spring `BigDecimal`→`@JsonSerialize(ToStringSerializer)`, FastAPI `Decimal` (Pydantic v2 JSON-string), Django `DecimalField` (DRF string default), **Go `string`** (already), **Express** numeric-string (**the float-drift bug fixed**). **The finding:** exactness = NUMERIC(p,s) + string wire, **NOT decimal libraries** — so **no new generated-project dependency** (Go go.mod / Express package.json unchanged), and Thraksha core stays **`deps {}`**. The **default (no decimal field) is a literal bypass by construction** (no frozen fixture uses Decimal) — the **60 baked + 10 TeamTracker + non-hash gates reproduce byte-identical**; a decimal field yields **10 new twice-identical baselines** (5×2, additive, PART 1n → **70 baked**). **No frozen hash moved.**
>
> **Exact round-trip:** Express **runtime-verified** (`"12345678901234.5678"` survives exactly — a JS float drifts to `…568`); FastAPI + Django **syntax-verified** (`py_compile`); Go + Spring **generation-only** (no toolchain here). `day20:regress`: **107 OK / 0 FAIL**.

---

## 1. The benchmark result (Execute DCs)

### DC-1 — the field type + precision/scale + per-stack NUMERIC + string wire ✅
- **Shared `decimalPrecision`/`decimalScale`** helpers ([core/project-model.ts](../../generator/src/core/project-model.ts)) read `field.validation.precision`/`.scale` (defaults 19/4) — so every stack maps the SAME field to the SAME precision/scale.
- **Storage:** `SqlDialect.columnType` extended with `precision`/`scale` → `NUMERIC(p,s)` / `DECIMAL(p,s)` ([postgres.ts](../../generator/src/plugins/database/postgres.ts) / [mysql.ts](../../generator/src/plugins/database/mysql.ts)). Verified: default `price`→`NUMERIC(19,4)`, custom `cost{precision:10,scale:2}`→`NUMERIC(10,2)`.
- **Per-stack language + string wire:** Spring `@Column(precision,scale)` + `BigDecimal` + `@JsonSerialize(using=ToStringSerializer.class)`; FastAPI `Numeric(p,s)` + `Decimal`; Django `DecimalField(max_digits,decimal_places)` (DRF string default); Go `string` (already); Express numeric-string validation + string storage. **The Express float-drift fix:** `typeof === 'number'` → a numeric-string regex + `String(...)` storage.

### DC-2 — DEFAULT = LITERAL BYPASS (load-bearing) ✅
Clean `build && day20:regress` → **PASS**, the full backstop byte-identical (60 baked + 10 TeamTracker + non-hash). No frozen fixture uses `Decimal`, and every decimal change is gated (Decimal-only branches / additive opts) ⇒ **no frozen hash moved.** *(A test-regex bug surfaced during PART 1n — my Django assertion demanded `)` right after `decimal_places=2` while an optional field emits `, null=True, blank=True)`; diagnosed as a fixture-regex bug, not a generation failure, and fixed. The generated Django was always correct.)*

### DC-3 — NEW BASELINES (additive) ✅ — 10, twice-identical
A `Product { name, price:Decimal, cost:Decimal(10,2) }` fixture across **5 stacks × 2 DBs**, each twice-identical, recorded in **PART 1n**:

| | PostgreSQL | MySQL |
|---|---|---|
| Spring Boot | `1dec96da…` | `b47c92f4…` |
| Express | `cf8f1863…` | `81f0ff4d…` |
| FastAPI | `8c83311b…` | `7fe5a209…` |
| Django | `338c8edb…` | `16d94375…` |
| Go | `f9316be0…` | `f0747e84…` |

PART 1n also asserts, per stack: **exact `NUMERIC(p,s)` (default 19/4 + configurable 10/2), NEVER float/double/`money`**, and the **string-wire** markers. → **70 baked total.**

### DC-4 — EXACT ROUND-TRIP (no float drift) ✅
- **Express — RUNTIME-verified:** the real generated `product.dto.js` `validate` was called with `"12345678901234.5678"` (more precision than a JS float holds) → `data.price === "12345678901234.5678"` (exact string). **A JS float would have drifted** (`Number("12345678901234.5678")` = `12345678901234.568`) — exactly the drift the old `typeof number` validation caused, now prevented. A number input `19.99` is coerced to `"19.99"` (never a lossy float); `"abc"` is rejected. Combined with `NUMERIC(19,4)` storage + node-postgres returning NUMERIC as a string, the round-trip is exact.
- **FastAPI + Django — SYNTAX-verified:** `python -m compileall` clean on the generated decimal projects (Python 3.14); `Column(Numeric(19,4))`/`(10,2)` + `Decimal`, `DecimalField(max_digits=…, decimal_places=…)`.
- **Go + Spring — generation-only:** no Go/Java toolchain here to compile. The mapping reuses each stack's proven exact type (Go `string` + NUMERIC; Spring `BigDecimal` + `NUMERIC` + `ToStringSerializer`). Determinism proven; runtime correctness reasoned.
- A DB-backed boot is deferred (Docker daemon down); `NUMERIC(p,s)` DB-side exactness is a standard Postgres/MySQL guarantee.

### DC-5 — invariants ✅
- Thraksha core **pure-Node** (`deps {}`, 0 native modules).
- **NO decimal library** anywhere — Go `go.mod` (only `lib/pq`) and Express `package.json` (only `express` + `pg`) are unchanged; the string approach needs none.
- **No frozen hash moved**; the new baselines additive.

---

## 2. The finding: exactness = NUMERIC + string, not libraries (correcting the brief)

The idealized brief called for a "Go decimal lib / JS decimal lib". Reading the real code reshaped it (like Day 25's ORM-vs-query-accessor):
- **Go already maps `Decimal → string`** ("no native decimal; the driver returns NUMERIC as text").
- **node-postgres returns NUMERIC/DECIMAL as a JS string** by default (to avoid precision loss).
- Java/Python/Django already use exact native types (`BigDecimal`/`Decimal`/`DecimalField`).

So exactness comes from **`NUMERIC(p,s)` storage + a STRING wire** — and **no decimal library is needed for CRUD store/retrieve**. A lib is only for in-app arithmetic (out of scope); if ever added it would be a **gated generated-project dep**, never a Thraksha core dep. This keeps Thraksha `deps {}` and adds **zero** new generated-project dependencies.

---

## 3. What changed

- **Core:** `core/project-model.ts` (+`decimalPrecision`/`decimalScale` shared helpers); `core/database.ts` (columnType opts +`precision`/`scale`).
- **Dialects:** `plugins/database/{postgres,mysql}.ts` (`Decimal` → `NUMERIC(p,s)`/`DECIMAL(p,s)`, default 19/4).
- **5 plugins:** `plugins/{express,go,python,django,spring}/entity-codegen.ts` — thread precision/scale into the SQL/ORM column; per-stack string wire (Express float-drift fix + string storage; Spring `@Column(precision,scale)` + `ToStringSerializer` gated import; FastAPI `Numeric(p,s)`; Django `DecimalField(max_digits,decimal_places)`; Go precision/scale into its migration). All gated so non-decimal output is byte-identical.
- **Harness:** `day20-regression.ts` (+PART 1n — 10 decimal baselines + exact-NUMERIC + string-wire checks).
- **The model, `assembleBlueprint`, templates — UNTOUCHED.** No AI, no new dep, no native module, no frozen byte changed.

---

## 4. Forward-flags & honest boundaries

- **Verification levels (honest):** Express **runtime-verified** (exact string round-trip, no drift); FastAPI + Django **syntax-verified** (`py_compile`); Go + Spring **generation-only** (no toolchain). A real DB boot is deferred (Docker daemon down).
- **Determinism ≠ validity** — the 10 baselines + default-bypass prove determinism; the Express round-trip proves the exactness mechanism; the DB-side `NUMERIC(p,s)` guarantee is standard.
- **v0.1 limits** (field-key) still stand; signing → Phase 4.
- **What Day 29 picks up:** **field-key consistency — THE FIRST DELIBERATE RE-BASELINE of the ecosystem phase.** It will intentionally MOVE baselines (the mixed-key limitation was documented frozen behavior); Day 29 must document old → new + rationale, with NO other baseline moving.

---

**Day 27 verdict, restated:** decimals are now exact across all 5 stacks — `NUMERIC(p,s)` storage (never float, never `money`; default scale 4, configurable) with the value carried as a STRING on the wire, so there is no float drift by construction. Reading the real code reshaped the brief: exactness is NUMERIC storage + string serialization (Go already does it; node-postgres returns NUMERIC as a string), NOT decimal libraries — so no new generated-project dependency, and Thraksha core stays `deps {}`. The one real fix was Express's float-typed validation → a numeric string (proven at runtime: a 14-digit-plus-4 decimal survives exactly, where a JS float drifts). No frozen fixture uses Decimal, so the default is a literal bypass by construction — the 60 baked + 10 TeamTracker + non-hash gates reproduce byte-identical; a decimal field yields 10 new twice-identical baselines (5×2, additive, PART 1n → 70 baked). Verification is honest: Express runtime-verified, FastAPI/Django syntax-verified, Go/Spring generation-only. Generator pure-Node, no frozen hash moved, 107 OK / 0 FAIL. Day 29 picks up field-key — the first deliberate re-baseline.
