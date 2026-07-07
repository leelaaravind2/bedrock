# Eco-Day 25 — REPORT: has-many relationships `[2 days]` — PASS 2 (Go / Python / Django / Spring)

**Phase 2, Day 25 — pass 2 of 2.** Pass 1 delivered **Express** end-to-end ([`eco-day-25-report.md`](eco-day-25-report.md)). Pass 2 applies the SAME proven **query-based reverse accessor** to the remaining four stacks — **one at a time, with a default-bypass gate after each** — completing has-many across all 5 stacks × 2 DBs. **NO schema change; the default (no has-many) stays byte-identical.**

Plan: [`eco-day-25-plan.md`](eco-day-25-plan.md). Pass 1: [`eco-day-25-report.md`](eco-day-25-report.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§3 STOP-and-report; §4 honesty — *be honest which stacks are runtime-verified vs generation-only*).

---

## THE VERDICT

> ✅ **has-many is now COMPLETE across all 5 stacks.** Each stack gained the same **query-based reverse collection accessor** — `GET /api/<parents>/{id}/<children>` — reusing the child's existing scalar FK column, **gated exactly like belongs-to** (empty ⇒ byte-identical). **The default backstop reproduced byte-identical after EVERY stack** (52 baked + 10 + non-hash, no frozen hash moved). The 8 new baselines are **twice-identical and additive** (→ **10 total has-many baselines**, 60 baked, PART 1m). **NO schema change** in any stack — vs the belongs-to-only twin, only the parent's accessor + the manifest note differ; migrations/models and the child are untouched. **UI==CLI** holds. Generator stays **pure-Node** (`deps {}`, 0 native); **no frozen hash moved**.
>
> **Verification (honest):** Express **runtime-verified** (pass 1). FastAPI + Django **syntax-verified** (`py_compile` clean on Python 3.14). **Go + Spring generation-only** — no Go/Java toolchain here to compile; code written to mirror the proven pattern. `day20:regress`: **91 OK / 0 FAIL**.

---

## 1. The four stacks (each the query-based reverse accessor, gated)

| Stack | Reverse accessor (reuses the child's existing FK column) | Default-bypass gate |
|---|---|---|
| **Go** (raw `database/sql`) | `ReverseCollection(query, args)` on the ServiceBase (generic map row-scan) + a handler `reverseApplication` + `mux.HandleFunc("GET /api/teams/{id}/applications", …)`. `ph()` picks `$N`/`?`. | ✅ 52 baked byte-identical |
| **FastAPI** (SQLAlchemy) | `@router.get("/{item_id}/applications")` → `db.execute(text("SELECT * FROM applications WHERE team_id = :pid AND owner_id = :oid ORDER BY id"))` → `[dict(row) …]`; gated `from sqlalchemy import text`. | ✅ 52 baked byte-identical |
| **Django** (DRF) | `@action(detail=True, url_path="applications")` → `apps.get_model("application","Application").objects.filter(team_id=pk, owner=request.user).order_by("id").values()` → `Response(...)`; gated `action`/`Response`/`apps` imports. `related_name="+"` untouched. | ✅ 52 baked byte-identical |
| **Spring** (JPA) | `@GetMapping("/{id}/applications")` → `jdbcTemplate.queryForList("SELECT * FROM applications WHERE team_id = ? AND owner_id = ? ORDER BY id", id, currentUser.requireCurrentUserId())` → `List<Map<String,Object>>`; gated `JdbcTemplate`/`CurrentUserProvider`/`Map` imports + beans. | ✅ 52 baked byte-identical |

Every one is **gated on `hasManyRels(entity)`** (empty for a has-many-free entity → byte-identical), the exact discipline that keeps belongs-to-free entities byte-identical. The child table + FK column are derived by the SAME convention belongs-to uses, so **no child-side change** is needed (Django's `related_name="+"` is deliberately left disabled — the reverse is a fresh `@action`, not a related_name flip).

---

## 2. The determinism spine (verified)

- **DEFAULT = LITERAL BYPASS after EVERY stack ✅** — I ran `rm -rf dist && npm run build && npm run day20:regress` after each of Go, Python, Django, Spring: **PASS, 52 baked byte-identical** each time (no frozen fixture declares has-many; the additions are gated). No frozen hash moved at any point.
- **NEW twice-identical baselines (additive) ✅** — 8 new baselines recorded in PART 1m (Go/FastAPI/Django/Spring × PG/MySQL), each twice-identical:

  | | PostgreSQL | MySQL |
  |---|---|---|
  | Go | `44576771…` | `4b1ed952…` |
  | FastAPI | `7ec9c914…` | `29a0bdce…` |
  | Django | `e5d3984e…` | `b0aaae8f…` |
  | Spring | `54cc1f02…` | `371a3612…` |

  Combined with Express (pass 1: `46662579…` / `0daab037…`) → **10 has-many baselines, 60 baked total.**
- **NO SCHEMA CHANGE (all 5 stacks) ✅** — PART 1m asserts, per stack, that vs the belongs-to-only twin the ONLY differing files are the **parent's accessor** (route/handler/service/controller/view) + the **manifest note** — never a migration/SQL/model schema file, never a file under the child (`application`) dir. The FK already exists; has-many is a pure parent-side accessor.
- **UI==CLI ✅** — the has-many declaration through `assembleBlueprint` == the programmatic path, byte-identical (`46662579…`).

---

## 3. Verification levels (honest — §4)

- **Express — RUNTIME-verified** (pass 1): the real generated router returned the 2 owner-scoped children via the exact SQL (stubbed pool; Docker daemon down).
- **FastAPI + Django — SYNTAX-verified**: `python -m compileall` on the full generated project + `py_compile` on the reverse-route files → **clean** (Python 3.14). The generated Python, including the reverse routes, is syntactically valid.
- **Go + Spring — generation-only**: no Go toolchain (the Day-18 finding) and no standalone Java/Spring compile here, so these are **not compile/runtime-verified**. The code mirrors each stack's existing CRUD patterns (Go: `database/sql` + `web.WriteJSON`; Spring: `JdbcTemplate` + `CurrentUserProvider`) and reuses only already-imported/autoconfigured beans. **Determinism is proven; runtime correctness is reasoned, not executed.**
- A full DB-backed boot of any stack remains blocked (Docker daemon down; no local DBs).

---

## 4. What changed (pass 2)

- **4 plugins:** `generator/src/plugins/{go,python,django,spring}/entity-codegen.ts` — each +`hasManyRels`/`childTable`/`reverseFkColumn` + a gated reverse accessor (per §1) + the has-many manifest note. **All gated** so has-many-free entities are byte-identical.
- **Harness:** `generator/src/day20-regression.ts` — PART 1m extended to all 5 stacks × 2 DBs (10 baselines) + per-stack no-schema-change + the 5-stack reverse-accessor presence check.
- **The model, `assembleBlueprint`, templates, migrations — UNTOUCHED.** No AI, no new dep, no native module, no frozen byte changed.

---

## 5. Forward-flags & completed status

- **`[2 days]` unit — COMPLETE.** has-many is done across all 5 stacks × 2 DBs, determinism-verified (default-bypass + twice-identical + no-schema-change), UI==CLI, with honest verification levels (Express runtime; FastAPI/Django syntax; Go/Spring generation-only).
- **Determinism ≠ validity** — the 10 baselines + default-bypass prove determinism; Express's runtime round-trip (pass 1) proves the pattern works; the other stacks apply the identical pattern in their idiom (syntax-verified for Python; reasoned for Go/Spring).
- **A live DB boot of the non-Express stacks** is deferred to an environment with the toolchains + a running Docker daemon.
- **v0.1 limits** (decimal/money, field-key) still stand; signing → Phase 4.
- **What Day 27 picks up:** the decimal/money type.

---

**Day 25 verdict (both passes), restated:** has-many is the deterministic reverse projection of the belongs-to FK — now complete across all 5 stacks. Because the codebase is scalar-FK + raw/simple SQL (not ORM object graphs — Go isn't GORM, Django's reverse is disabled with `related_name="+"`), the faithful reverse is a query-based collection accessor reusing the child's existing FK column: `GET /api/<parents>/{id}/<children>`, owner-scoped — implemented per stack (Express raw SQL, Go `database/sql` generic scan, FastAPI `text()`, Django DRF `@action`, Spring `JdbcTemplate`). **No schema change** in any stack (only the parent accessor + manifest differ vs the belongs-to-only twin). The default (no has-many) is a literal bypass by construction — the frozen backstop reproduced byte-identical after every stack; the 10 has-many baselines (5 × 2) are additive and twice-identical (60 baked); UI==CLI holds. Verification is honest: Express runtime-verified, FastAPI/Django syntax-verified (py_compile), Go/Spring generation-only (no toolchain here). Generator pure-Node, no frozen hash moved, 91 OK / 0 FAIL. Day 27 picks up decimal/money.
