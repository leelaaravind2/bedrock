# Eco-Day 27 — PLAN: decimal / money type

**Phase 2, Day 27. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 27 adds a proper **decimal/money** field type with **precision/scale**: exact decimal handling, deterministically, across all 5 stacks. **Storage `NUMERIC(p,s)` — NEVER float, NEVER Postgres `money`; scale ≥4 default. The wire value is a STRING** (no float drift). A single-day unit.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 27 (lines 50–53) → [`eco-day-25-report-pass2.md`](eco-day-25-report-pass2.md) (the gate: **60 baked + 10 TeamTracker + non-hash**) → the REAL field-type mapping (`core/database.ts` `SqlDialect.columnType`; each stack's `entity-codegen.ts` language-type helper).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL code — and it reshapes the brief):**
> - **`Decimal` ALREADY EXISTS as a partially-mapped type — but NO fixture uses it.** `grep` for a `Decimal` field across the frozen fixtures (maxcell/teamtracker/demoapp/task) → **0**. So "DECIMAL unexercised" holds: **any change to the Decimal mapping is a LITERAL BYPASS by construction** (non-decimal projects are byte-identical; a decimal field is a new, additive output).
> - **Storage already NUMERIC — but fixed scale=2, not configurable.** `columnType('Decimal')` returns **`NUMERIC(19, 2)`** (Postgres) / **`DECIMAL(19, 2)`** (MySQL). Day 27 makes **precision/scale configurable** (default scale **≥4**) and threads it through every stack.
> - **The exactness mechanism is NUMERIC(p,s) + a STRING wire — NOT decimal libraries (the finding).** **Go already maps `Decimal → string`** ("no native decimal; the driver returns NUMERIC as text"). **node-postgres returns NUMERIC/DECIMAL as a JS string** by default (to avoid precision loss). Java uses **`BigDecimal`**, Python **`Decimal`**, Django **`DecimalField`** — all exact native types. So exactness comes from **NUMERIC(p,s) storage + string serialization**, and **no new decimal LIBRARY is required** for CRUD store/retrieve. This diverges from the brief's "Go decimal lib / JS decimal lib" — like Day 25's ORM-vs-query-accessor finding, the real code already solves it more simply. *(A decimal lib is only needed for in-app arithmetic — out of scope; if ever added it is a GATED generated-project dep, never a Thraksha core dep.)*
> - **The one real bug: Express treats Decimal as a JS `number` (float drift).** `validationLinesFor` for `'Decimal'` asserts `typeof body.<w> === 'number'` — a float, which loses precision. Day 27 fixes this to a **numeric STRING** (validate a numeric string; pg returns/accepts NUMERIC as string). This is the load-bearing correctness fix.
> - **Deps are gated tokens.** `go.mod` (`__DB_GO_DRIVER_REQUIRE__` + crypto) and `package.json` (`__DB_NODE_DRIVER__` + express/bcryptjs) are template-tokenised. IF a decimal lib were ever added it MUST be **gated on a decimal field** (so non-decimal manifests stay byte-identical) — but the string approach needs **no new dep at all**.

---

## 0. What Day 27 is — exact decimals, deterministically, across 5 stacks

A `decimal`/`money` field type that stores as `NUMERIC(p,s)` (exact, never float, never `money`), carries the value **as a string on the wire** (cross-stack fidelity, no float drift), and maps to each language's exact decimal type internally. Precision/scale are field options with sensible fixed defaults (scale ≥4). The default (no decimal field) reproduces the frozen backstop.

---

## 1. THE DETERMINISM SPINE

1. **The DEFAULT (no decimal field) is a LITERAL BYPASS.** A project without a decimal field reproduces the frozen backstop byte-identical (**60 baked + 10 TeamTracker + non-hash gates**). **By construction:** no frozen fixture uses `Decimal`, so changing the Decimal mapping (precision/scale, string serialization, the Express fix) touches nothing existing. **Proof (execute):** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS, byte-identical. **A moved frozen hash = a FINDING, STOP** (never a re-baseline).
2. **A decimal field DECLARED → NEW twice-identical baselines across 5 stacks × 2 DBs** (additive; never replacing a frozen hash). Each stack's decimal mapping deterministic (generated twice → byte-identical). Recorded in a new **PART 1n** (10 new baked baselines).
3. **A decimal value ROUND-TRIPS EXACTLY (no float drift) in ≥1 verified stack.** Input `"19.9900"` → validated as a numeric string → stored `NUMERIC(19,4)` → read back → returned **exactly `"19.9900"`** (never parsed to a float). Honest about which stack is runtime-verified vs generation-only (like Day 25).

---

## 2. THE DESIGN — NUMERIC(p,s) + string wire + native exact types (no new deps)

### 2.1 The field options: precision + scale (defaults, scale ≥4)
- `precision` and `scale` are optional field options, carried in `field.validation` (the same channel `maxLength` uses — read via a `maxLengthOf`-style helper). Add `precisionOf(field)` / `scaleOf(field)`.
- **Defaults:** `precision` default **19**, `scale` default **4** (≥4, money-grade). So a bare decimal field ⇒ `NUMERIC(19,4)`. *(The current hardcoded `(19,2)` becomes the `(19,4)` default — safe because no fixture uses Decimal.)*

### 2.2 Storage: `columnType('Decimal', { precision, scale })` → `NUMERIC(p,s)`
- Extend `SqlDialect.columnType`'s `opts` with `precision?`/`scale?` (additive — String still uses `maxLength`). Postgres `NUMERIC(p,s)`, MySQL `DECIMAL(p,s)`. **Never `FLOAT`/`DOUBLE`/`money`.**

### 2.3 The wire value is a STRING (the exactness guarantee), per-stack language type
| Stack | Internal type | Wire (JSON) | How string fidelity is achieved | New dep? |
|---|---|---|---|---|
| **Express** | string | **string** | **FIX the float bug:** validate a numeric-string (regex e.g. `/^-?\d+(\.\d+)?$/`); pg returns/accepts NUMERIC as a string | **none** |
| **Go** | `string` (already) | **string** | already string end-to-end (driver returns NUMERIC as text) | **none** |
| **Spring** | `BigDecimal` | **string** | serialize BigDecimal as a string (Jackson `ToStringSerializer` on the field, or a String DTO field — resolve in execute) | none |
| **FastAPI** | `Decimal` | **string** | Pydantic field/serializer emits Decimal as a string (resolve the v2 mechanism in execute); SQLAlchemy `Numeric(p,s)` | none |
| **Django** | `DecimalField(max_digits=p, decimal_places=s)` | **string** | DRF serializes `DecimalField` as a string by default (`COERCE_DECIMAL_TO_STRING`) — already exact | none |

- **Precision/scale threading:** `columnType(opts)` (SQL), Django `max_digits=p, decimal_places=s`, Python `Numeric(p,s)`, Spring `@Column(precision=p, scale=s)` — all from `precisionOf`/`scaleOf`.
- **No new generated-project dependency** (the string approach; Go already proves it). If Express validation ever needs a lib (it does not — a regex suffices), it would be **gated** on a decimal field so non-decimal `package.json` stays byte-identical. **Thraksha core stays `deps {}`.**

### 2.4 Why this is determinism-safe
No frozen fixture declares a decimal field ⇒ the default path is byte-identical **by construction**. A decimal field is a new additive output with its own twice-identical baselines. The value is a string end-to-end (never a float), so exactness is structural.

---

## 3. What the plan resolves (answered from the real code)

1. **field-type → column / language-type today:** `columnType(logicalType, opts)` (SQL) + per-stack language helpers (`javaTypeOf`→BigDecimal, Python→Decimal, Django→DecimalField, Go→string, Express→JS number). Decimal is partially mapped (NUMERIC(19,2)); Day 27 completes it (configurable p/s, string wire, Express fix).
2. **NUMERIC(p,s) + language mapping:** §2.2/§2.3 — NUMERIC(p,s) storage; BigDecimal/Decimal/DecimalField/string internal; **string on the wire** for all 5.
3. **Do Go/JS need a decimal library?** **NO** (the finding) — Go already uses string; node-postgres returns NUMERIC as string. Exactness = NUMERIC storage + string wire, not a lib. (A lib is arithmetic-only, out of scope; would be a gated generated-project dep, never core.)
4. **Precision/scale options + defaults:** `field.validation.precision`/`.scale`; defaults precision 19 / scale 4 (≥4). §2.1.
5. **How string serialization avoids float drift:** the value is never parsed to a float in any stack — validated as a numeric string, stored in NUMERIC(p,s) (the DB enforces scale), read back as a string. §2.3.

---

## 4. STAGING + done-conditions

Top of the execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

- **DC-1:** the decimal/money field type + `precision`/`scale` options (defaults 19 / ≥4); `columnType` extended to `NUMERIC(p,s)`; the per-stack language-type + **string wire** mapping (§2.3), including the **Express float-drift fix** (numeric-string validation).
- **DC-2 (DEFAULT = LITERAL BYPASS — load-bearing):** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full backstop byte-identical (60 baked + 10 TeamTracker + non-hash). No fixture declares a decimal field ⇒ no frozen hash moves. **A moved hash = a finding, STOP.**
- **DC-3 (NEW BASELINES — additive):** a decimal fixture (e.g. a `Product { name, price:Decimal }`, plus a non-default precision/scale case) → generated across **5 stacks × 2 DBs = 10 new twice-identical baselines**, recorded in a new **PART 1n** (baked; never replacing a frozen hash). Each mapping deterministic.
- **DC-4 (EXACT ROUND-TRIP — no float drift):** verify on ≥1 stack that `"19.9900"` round-trips exactly (input → numeric-string validate → NUMERIC(p,s) → string out), never touching a float. **Honest:** state which stack is runtime-verified (e.g. Express via the generated router + a stubbed pg returning the NUMERIC string, as Day-25 pass 1 did) vs syntax-verified (FastAPI/Django `py_compile`) vs generation-only (Go/Spring — no toolchain). A real DB boot is deferred (Docker daemon down); NUMERIC(p,s) DB-side exactness is a standard Postgres/MySQL guarantee.
- **DC-5 (invariants):** generator **pure-Node** (`deps {}`, 0 native — **no decimal lib as a Thraksha dep**; any generated-project decimal lib, if ever added, is gated + generated-project-only); **no frozen hash moved** (default); the new baselines additive.

**Execute scope guard:** only decimal/money (`NUMERIC(p,s)` + precision/scale + string wire). **NOT** field-key (Day 29). **NUMERIC only — never `FLOAT`/`DOUBLE`/`money`.** **No frozen hash moves on the default path** (a moved hash is a finding, STOP). **No decimal lib as a Thraksha core dep** (`deps {}` stays); any generated-project decimal lib is gated on a decimal field. No AI. No signing. Commit to `main`. Stage honestly (5×2 matrix; verify ≥1 stack for exact round-trip, honest about the rest).

---

## 5. REPORT — done-conditions

[`eco-day-27-report.md`](eco-day-27-report.md): the decimal/money field type + precision/scale options; **the per-stack NUMERIC(p,s) + language-type + string-wire mapping** (and the honest finding — string wire + NUMERIC storage, NOT decimal libraries; Go already string; the Express float-drift fix); the **default-bypass proof** (no decimal → frozen backstop byte-identical, by construction); the **new twice-identical baselines** (5 stacks × 2 DBs, additive, PART 1n); the **exact-round-trip proof** with the **honest verification level per stack** (which runtime-verified vs syntax-verified vs generation-only — like Day 25); **invariants** (pure-Node, `deps {}` — no decimal lib as a core dep, no frozen hash moved). **Forward-flags:** verification levels honestly stated; what **Day 29** picks up — **field-key consistency, THE FIRST DELIBERATE RE-BASELINE** (it will intentionally MOVE baselines; document old → new + rationale).

---

## 6. Scope guard — OUT for Day 27
- Only decimal/money (`NUMERIC(p,s)` + precision/scale + string wire). **NOT** field-key (Day 29).
- **`NUMERIC(p,s)` only** — never `FLOAT`/`DOUBLE`, never Postgres `money`.
- **Do NOT move any frozen hash on the default path (no decimal)** — byte-identical. A moved hash = a finding, STOP (not a re-baseline).
- **No decimal lib as a Thraksha CORE dep** (`deps {}` stays). Any generated-project decimal lib is gated on a decimal field (generated-project-only) — and the recommended string approach needs none.
- No AI. No signing.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + Month-2 Day 27 + Day-25 report + the REAL field-type mapping across the 5 stacks? — ✅ (this session).
2. Only Day-27's job (decimal/money)? — yes; **not** field-key (Day 29).
3. Which frozen baselines must NOT move? — **all** (60 baked + 10 TeamTracker + non-hash). No fixture uses Decimal, so the mapping change is a bypass by construction; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none.**
5. Default/empty path a literal bypass? — **yes, by construction**: no decimal field ⇒ the Decimal mapping is never exercised ⇒ frozen backstop byte-identical.
6. Three killers checked? — no clock/RNG/UUID (fixed NUMERIC + string templates); LF only; stable order. The decimal value is a STRING end-to-end (never a float → no drift).
7. A gate that can actually FAIL? — **DC-2** (a moved default hash ⇒ the Decimal change leaked into a non-decimal baseline), **DC-3** (a stack's decimal mapping non-deterministic ⇒ twice-differ), **DC-4** (the round-trip drifts / a float appears — exactness broken), **DC-5** (a decimal lib sneaks into Thraksha `deps` / a native module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) emitting `FLOAT`/`DOUBLE`/`money` instead of `NUMERIC` (exactness lost — the whole point); (ii) leaving Express on `typeof number` (float drift persists); (iii) adding a decimal lib to Thraksha's `deps {}` (must stay empty) or ungated to every generated project (moves go.mod/package.json hashes); (iv) claiming exact round-trip on a stack that was only generation-only (§4 honesty); (v) a moved default hash silently re-baselined (a finding, STOP) — all guarded.

---

*Day 27 makes decimals exact, deterministically, across all 5 stacks: `NUMERIC(p,s)` storage (never float, never `money`; scale ≥4 default) with the value carried as a STRING on the wire — so there is no float drift, by construction. Reading the real code reshaped the brief: exactness comes from NUMERIC storage + string serialization (Go already does this; node-postgres returns NUMERIC as a string), NOT from decimal libraries — so no new generated-project dependency is needed, and Thraksha's core stays `deps {}`. The one real fix is Express's float-typed validation → a numeric string. No frozen fixture uses Decimal, so the default (no decimal field) is a literal bypass by construction — the 60 baked + 10 TeamTracker + non-hash gates reproduce byte-identical; a decimal field yields new twice-identical baselines across 5 stacks × 2 DBs (additive, PART 1n), and a value round-trips exactly (verified honestly per stack). Day 29 picks up field-key consistency — the FIRST deliberate re-baseline of the ecosystem phase.*
