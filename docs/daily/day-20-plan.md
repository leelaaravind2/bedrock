# Day 20 — Plan: Full-system integration + regression proof

**Session 1 of 3 — PLANNING ONLY.** No implementation, no code edits. This file is the sole output. Sessions 2 (Execution) and 3 (Evaluation + Closing) are scoped below with explicit done-conditions.

**Carry-over context:** [`day-19-report.md`](day-19-report.md) — the four Day-20 carries (description canonical/sibling; the relationship UI==CLI proof; the DEFERRED Express ai-hook boot; the GATE-SUITE CONSOLIDATION), the stale-comment finding, and the route-layer result.

**Guardrails (ALL of them — this is the prove-everything-together day):** ADR-001 (no AI in generation), ADR-002 (file separation), ADR-003 (determinism — every default path a literal bypass), ADR-004 (choices shown), ADR-005 (multi-user foundational), Law 21 (standalone), Law 25 (core neutral). **`TIMESTAMPTZ` JSDoc untouched. No baseline moves.**

---

## 0. What Day 20 is — and the SCOPE TRAP it must not fall into

Day 20 is the **full-system regression** — the "prove everything together" checkpoint before Day 21's polish. But "prove EVERYTHING together" is combinatorially a **trap**: the full cross-product is now `2 types × 5 backends × 2 DBs × 4 indents × 3 namings × 2 depths × 2 email × 2 ai × relationship variations` = **thousands of cells.** That is NOT the regression. The honest regression is **TWO bounded things**, and the cross-product is **explicitly OUT**:

- **Part 1 — RE-CONFIRM every FROZEN BASELINE holds** (a bounded, enumerable set — §2). This proves nothing *drifted* as features accumulated.
- **Part 2 — ONE representative FULL-PATH, end-to-end, live** (§3). This proves the features *compose* — the interaction the per-feature days structurally could not test (each feature was proven additive in ISOLATION; nobody has generated them all at once).

**Together they ARE the regression.** The cross-product is out because it is combinatorial and low-value: each feature is individually proven; the only residual risks are **drift** (Part 1) and **interaction** (Part 2), both bounded. State this framing explicitly in the report.

---

## 1. RECONNAISSANCE — what each existing gate checks (so the consolidated harness reproduces it faithfully)

| Gate | Digests it owns | Non-hash checks it makes |
|---|---|---|
| `day12` (naming) | 5 naming `snake_case` Task hashes | per-stack wire-key content (Go `json:`, Spring `@JsonProperty`, Express `rowToObject`+dto, FastAPI Pydantic `alias`, Django DRF `source`); multi-word Task twice-identical; `setStyle` round-trip guard; `toSnakeCase`/`toCamelCase` unit checks |
| `day13` (arch depth) | 4 `simple` baselines | 20-matrix under default; `architectureDepth` round-trip guard; Express `simple`+`snake` compositionality (twice-identical + merged-module content) |
| `day14` (style → wizard, **HTTP**) | 2 composition baselines | fresh wizard == 20 (UI==CLI); UI==CLI for style (`/api/style`==`setStyle`); composition content spot-checks |
| `day15` (api-only) | *(computes api-only diffs)* | 20 web-app frozen; api-only == web-app ± 2 manifest lines (4 backend-only stacks); Spring api-only twice-identical; Spring api-only static coherence (no `frontend/`, no `:3000`, compose db+backend) |
| `day16` (type → wizard, **HTTP**) | 6 api-only baselines | fresh wizard == 20 + UI==CLI (web-app); wizard api-only == the 6 baselines + UI==CLI |
| `day17` (email) | 2 email baselines *(computed, recorded in report)* | 20 under `none`; email twice-identical + differs-from-none; per-stack email coherence (wired, declMatch, no baked secret, README truthful) |
| `day18` (ai-hook) | 2 ai-hook baselines (baked `AI_FROZEN`) | 20 under `none`; `ai` survives get/set; ai-hook twice-identical + differs-from-none; coherence; **detachability CRUD-diff** |
| `day19` (wizard enrichment) | *(re-uses the 20)* | 20 default; UI==CLI full TeamTracker chain (10); rel-free bypass; description blank/provided; `setDescription` round-trip guard |
| demos (`two-stacks`/`python:demo`/`ui:demo`) | — | file separation (ADR-002); Python multi-user; UI==CLI for all 5 backends |

**Hashing convention (uniform, verified):** every gate hashes `/${relPath}\n` + content over the sorted file set. The HTTP gates (`day14`/`day16`) hash the on-disk tree with the *same* convention, which is why UI==CLI holds — the disk tree equals the in-memory `GeneratedFile[]`. The consolidated harness MUST use this exact convention or it silently forks the digest space.

---

## 2. Part 1 — THE ENUMERATED FROZEN-BASELINE SET (43 recorded digests) + guard-the-guard

This is the FINITE, ENUMERABLE backstop. Every digest below must reproduce byte-for-byte, and each must be guard-the-guarded against its **source report** (diff-empty). **No digest moves; a drift is a FINDING, never a silent re-baseline.**

### 2a. The 20 web-app matrix (5 backends × 2 DBs × 2 models) — source: [`week-01-summary.md`](week-01-summary.md) §3 (16) + [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md) (4 Go)
```
PG DemoApp     Spring 010098cd…  Express a437a302…  FastAPI dca2254f…  Django 68601cc5…  Go d158529a…
PG TeamTracker Spring 9e01210c…  Express dca2b4a7…  FastAPI 6d422010…  Django e509309c…  Go 6aea8b04…
MY DemoApp     Spring 3112d3f7…  Express d4b57b52…  FastAPI cd87d6e3…  Django 8b07a1b2…  Go 9ff40acb…
MY TeamTracker Spring 4c4640ba…  Express bfa4a536…  FastAPI 5c788c70…  Django 3b3e6a6f…  Go 7408a3e2…
```
*(The 10 TeamTracker rows ARE the relationship baselines — the UI==CLI relationship proof (§3, Day-19 carry #2) reproduces exactly these.)*

### 2b. The 23 alternative baselines
| Group | Count | Digests | Source |
|---|---|---|---|
| **Naming** `snake_case` (multi-word `Task`) | 5 | Spring `0484560720…`, Express `f79bbb16a9…`, FastAPI `c8aebb1837…`, Django `f0c2c76599…`, Go `e5cc7b8c11…` | [`week-02-summary.md`](week-02-summary.md) §4 |
| **Formatting** (Express DemoApp) | 2 | four-space `d3ae91b0fb…`, tab `c81fb0f52e…` | week-02 §4 |
| **Architecture `simple`** (Postgres) | 4 | Express DemoApp `f340374447…`, Express TeamTracker `1f06af0d7b…`, FastAPI DemoApp `c60a452191…`, FastAPI TeamTracker `a85d7f9260…` | week-02 §4 |
| **Composition** (multi-word Task, PG) | 2 | Express snake+four+simple `58f0af062d…`, FastAPI snake+simple `c57edf4245…` | week-02 §4 |
| **API-only** (recorded-default variant, PG) | 6 | Spring DemoApp `97aef81719…`, Spring TeamTracker `190594dd85…`, Express DemoApp `c5210f7325…`, FastAPI DemoApp `46b3fda4db…`, Django DemoApp `5634e7ce00…`, Go DemoApp `5d67f242d3…` | [`day-16-report`](day-16-report.md) / `day16-gate` `API_ONLY` |
| **Email** (DemoApp, PG) | 2 | FastAPI `efd3d6a8d0…`, Express `62e0ef44cd…` | [`day-17-report`](day-17-report.md) §4/§6 |
| **AI-hook** (DemoApp, PG) | 2 | FastAPI `aabc715973…`, Express `a17c6ad4df…` | [`day-18-report`](day-18-report.md) §5 / `day18-gate` `AI_FROZEN` |

**Total = 20 + 23 = 43 distinct recorded digests.** Part 1 re-confirms all 43 byte-identical + guard-the-guards each against the source above (20==20 for the matrix; the 23 alternatives present in their gates == the report values).

**Not baked as digests (proven by property, not by a frozen hash — re-confirm the property):** api-only for the 4 backend-only stacks (== web-app ± the 2 manifest lines); the naming `default`/`camelCase` single-word cases (== the frozen defaults); the description-provided README (a sibling — see §3, Day-19 carry #1).

---

## 3. Part 2 — the ONE representative FULL-PATH (the interaction proof)

**Pick ONE rich combination with EVERY feature switched on at once and drive it END-TO-END through the REAL HTTP server**, then generate twice → byte-identical, and browse files + blueprint. This catches interaction bugs the per-feature days structurally could not.

### The combination — justified by the applicability matrix
The style/integration applicability is bounded (week-02 §3): `formatting.indent` is **Express-only**, `architectureDepth simple` is **Express + FastAPI only**, email/ai landed on **FastAPI + Express only**. **Express is the ONLY stack where every style dimension AND an integration can all be non-default at once.** So the maximal-composition cell is:

> **Express · PostgreSQL · API-only · TeamTracker (multi-edge: Ticket belongs-to Application AND Team) · `snake_case` + `four-space` + `simple` · integrations `{email:smtp, ai:hook}` (both on) · a provided description.**

Every dimension is non-default: the **type** (API-only), **relationships** (multi-edge chain), **all three style options**, **both integrations**, and a **description**. This is "everything together" — a representative full path, NOT the cross-product.

### The end-to-end HTTP chain (closes the route-layer seam — Day-19 carry, debt #2)
Drive the browser's exact path unbroken, then hash the generated output **directly** (one proof, not two linked steps):
```
POST /api/settings {…, projectType:'API-only', description:'…'} 
  → POST /api/style {snake_case, four-space, simple}
  → POST /api/integrations {email:'smtp', ai:'hook'}
  → POST /api/entities ×4 (Team; Application b-t Team; Ticket b-t Application,Team; Comment b-t Ticket)
  → POST /api/generate  → hash the on-disk tree (the buildFileSet convention)
```
- **Generate twice → byte-identical** (the composed path is deterministic — ADR-003). Record the composed digest as a NEW Day-20 interaction baseline (a legitimate new artifact, not a moved one).
- **Browse** the generated files + the blueprint (via the file viewer / `GET /api/state`) — confirm coherence: the `snake_case` wire keys, the `four-space` indent, the merged `simple` CRUD module, the FK columns (`team_id`/`application_id`/`ticket_id`), the email + ai wiring, the README description, and NO frontend (API-only). 
- **If the composed path is NOT deterministic or NOT coherent, that is a real interaction finding → STOP and report it** (do not paper over, do not re-baseline).

### The Express ai-hook detachable boot (Day-19 carry #3, debt #1)
Day 18 booted the ai-hook on **FastAPI only**; Express was structural-only. Fold in the **four-part detachable-and-inert boot on Express** (mirrors Day-18 §3), on a **focused Express ai-hook project** (default style — keep the boot proof about the hook, not the composition), on real Postgres, `AI_API_KEY` UNSET:
1. app comes up key-unset (require('./ai') at startup ⇒ wired; health ok);
2. normal CRUD round-trips (POST/GET tickets);
3. `POST /api/ai/explain` → graceful **503** (not a crash); `isConfigured() === false`; reads the env var when set (no real call);
4. **CRUD identical configured-vs-unconfigured** (the load-bearing part — the AI is an add-on, not a dependency).
No real AI call; tear down `-v`. *(Optionally, if clean and time permits, also boot the composed Part-2 Express project as a bonus — but the focused boot is the debt.)*

---

## 4. THE CONSOLIDATED HARNESS (a real task — but it must not weaken the backstop)

The gate suite (`day12`–`day19` + demos) runs serially and slow (flagged Days 17/18/19). Day 20 builds a **consolidated regression harness** — ONE entry point (e.g. `day20:regress`) covering Part 1 (all 43 digests + every gate's non-hash checks + guard-the-guard) and Part 2.

**CRITICAL CONSTRAINT — the consolidation must not silently weaken the backstop:**
- The consolidated harness must reproduce the **EXACT SAME DIGESTS** (same `/${relPath}\n`+content convention) **and the SAME CHECKS** as the sum of the individual gates. A harness that hashes differently, or drops a check, silently weakens the very backstop this day exists to prove.
- **PROVE byte-identical-to-the-individual-gates BEFORE trusting it:** run the individual `day12`–`day19` gates AND the consolidated harness, and show the consolidated harness asserts a **superset** of the individual digests+checks (every individual gate's digest set ⊆ the harness's; every individual check present). The cleanest proof: the harness reproduces each individual gate's PASS lines / digest set, diffed against running the gates directly.
- **Consolidation is test-scaffolding only** — it changes NO generated output and moves NO baseline. Keep the individual gates intact (do not delete them this day; Day 21 can retire them once the harness is trusted).
- Efficiency note: the harness should compute the 20-matrix and guard-the-guard **once** (many gates re-check it) and run the HTTP-server-driven checks (`day14`/`day16`/`day19` UI==CLI + Part-2 chain) against a single booted server instance.

---

## 5. Session 2 (EXECUTION) — done-conditions

1. **The consolidated regression harness** reproduces every individual gate's digests + checks; **proven byte-identical to the sum of the individual gates** (run both, diff/superset-check) BEFORE it is trusted. Changes no output, moves no baseline.
2. **Part 1:** all **43 enumerated digests** (§2) re-confirmed byte-identical + guard-the-guard against sources. The property-proven cases (backend-only api-only ± 2 lines; naming default/camel; description-provided sibling) re-confirmed by property.
3. **Part 2:** the maximal Express composition (§3) driven **end-to-end through the real HTTP server**, generated **twice → byte-identical**, files + blueprint coherent (browsed). If the composed path is NOT deterministic or NOT coherent → **STOP and report** the interaction finding.
4. **The Express ai-hook detachable boot** (the four-part proof, §3) folded in.

**Blocking guardrails:** if the default path drifts off any of the 43 (Part 1), if the composed full-path is non-deterministic or incoherent (Part 2), if a route silently drops its value (the HTTP chain), or if the Express ai-hook boot won't come up key-unset / crashes instead of 503 / CRUD differs configured-vs-unconfigured — **STOP and surface it**, never silent-re-baseline.

---

## 6. Session 3 (EVALUATION + CLOSING) — done-conditions

- **The consolidated harness green** — all 43 baselines held; **the byte-identical-to-individual-gates proof stated** (the harness is now the canonical regression tool).
- **The full-path interaction proof:** the composed-everything Express project generated **twice-identical**, coherent, browsed; the composed digest recorded as a new Day-20 interaction artifact.
- **The Express ai-hook boot** (four-part) + **the end-to-end HTTP-chain hash** (the unbroken route→bytes proof).
- **ADR sweep — ALL of them** (this is the prove-everything day): ADR-001 (no AI in generation; the ai-hook is the app's detachable runtime hook — grep `src/core`+`src/plugins` clean), ADR-002 (file separation — demos), ADR-003 (determinism — every default path a literal bypass; the composed path twice-identical), ADR-004 (choices shown — blueprint reflects type+style+relationships+integrations+description), ADR-005 (multi-user up front — `owner_id` in every entity), Law 21 (standalone — the booted Express project runs with no Thraksha present), Law 25 (core neutral — no per-stack logic in the kernel). `TIMESTAMPTZ` untouched.
- **Write [`docs/daily/day-20-report.md`](day-20-report.md)** — a self-contained handoff for **Day 21 (polish + final docs)**. It MUST carry:
  1. **The full regression result** — all 43 baselines held (Part 1), with the guard-the-guard.
  2. **The interaction proof** — the maximal Express composition twice-identical + coherent (Part 2).
  3. **The consolidated-harness note** — now the canonical regression tool, proven byte-identical to the individual gates.
  4. **The Day-21 polish backlog (STILL-OPEN cosmetic items):**
     - the **"Style" stepper label** should read **"Style & integrations"** (integrations were folded into that screen — Day-19 cosmetic);
     - the **stale [`teamtracker-model.ts:9–14`](../../generator/src/teamtracker-model.ts) comment** ("metadata only, no codegen" — FALSE; the plugins generate FKs) needs a one-line fix — a comment-only edit (leave the demo-model logic and its hashes alone).

---

## 7. Scope guard — OUT for Day 20

- ❌ **The full cross-product** (thousands of cells) — explicitly OUT. Part 1 (bounded baselines) + Part 2 (one deep full-path) IS the regression.
- ❌ No new features / stacks / databases / types / style options / integrations.
- ❌ **No re-baselining ANY frozen hash** — a drift is a FINDING to fix or report, never a silent re-baseline (the re-baseline discipline: deliberate, documented, never silent). Day 20 moves NOTHING.
- ❌ The consolidated harness changes NO generated output and moves NO baseline.
- ❌ No rich frontend generation; no probabilistic variation.
- ❌ The cosmetic backlog items (§6 4) are **Day-21 polish**, NOT Day-20 edits (a comment/label fix now touches source unnecessarily on a prove-and-stabilize day).

---

## 8. Constraints (bake into every step)

- **ADR-003** — determinism: every default path a literal bypass; the composed full-path twice-identical.
- **ADR-001** — no AI in generation; the ai-hook is the generated app's detachable runtime hook.
- **Law 25** — core neutral; the consolidated harness is test scaffolding, not kernel logic.
- **The re-baseline discipline** — a frozen hash is a drift-catcher; a legitimate fix that moves a baseline is deliberate and documented, NEVER silent — but **Day 20 moves NOTHING** (it is a prove-and-stabilize day).
- **The non-negotiable backstop:** all 20 web-app hashes + every recorded alternative baseline (43 total) + `TIMESTAMPTZ` untouched.

---

**Day 20 plan verdict:** the full-system regression is two bounded proofs, not the combinatorial cross-product (which is explicitly OUT). **Part 1** re-confirms the enumerated **43 recorded digests** (20 web-app + 5 naming + 2 formatting + 4 simple + 2 composition + 6 api-only + 2 email + 2 ai-hook) byte-identical with guard-the-guard — the drift check. **Part 2** drives ONE maximal-composition cell (Express · API-only · multi-edge TeamTracker · snake+four+simple · email+ai · description) end-to-end through the real HTTP server, generated twice-identical and browsed — the interaction check, closing the route-layer seam by hashing the generated bytes directly. The two debts are folded in: the **Express ai-hook four-part detachable boot** and the **end-to-end HTTP-chain hash**. The **consolidated harness** is built and PROVEN byte-identical to the sum of the individual gates before it is trusted — consolidation must not silently weaken the backstop. Nothing moves; a drift or interaction failure is a finding, never a re-baseline. The two cosmetic items are handed to Day-21 polish.
