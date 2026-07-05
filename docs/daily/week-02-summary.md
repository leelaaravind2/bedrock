# Week 2 — Summary & Checkpoint (Days 8–14)

**The Week-2 close. Prove-and-stabilize + the authoritative Week-2 record.**
**Status: STABLE — the full 20-hash matrix (5 backends × 2 databases × 2 models) re-confirmed byte-identical; the Go arc (Days 8–10) and the deterministic coding-style engine (Days 11–14) landed, the latter wired into the wizard and gated per stack. Default-style output reproduces every Week-1 baseline; every style alternative is deterministic. Ready for Week 3.**

Scope of this document: the authoritative Week-2 record — the frozen baselines, Week-2's additions, the style applicability matrix, every recorded style-alternative baseline, the documented v1 limitations, and the standing residuals — the way [`week-01-summary.md`](week-01-summary.md) is for Week 1. Guardrails re-confirmed: ADR-001 (no AI), ADR-002 (file separation), ADR-003 (determinism), ADR-004 (choices shown), ADR-005 (multi-user foundational), Law 25 (core neutral).

---

## 1. What Week 2 delivered

### 1a. The Go backend — a fifth stack (Days 8–10), live on both databases
- A Go (`net/http` + `database/sql`) `BackendPlugin` peer, built via the proven 3-step recipe: entity CRUD (Day 8) → file separation + multi-user + belongs-to relationships + MySQL runtime handling (Day 9) → dropdown wiring + **live boot on both databases** (Day 10).
- Go reached full peer status with **no new core interface** — it consumed the existing seams (backend-plugin, database-provider, the `RelationshipSpec` model, `runtime.supportsReturning`).
- **Live-proven on both PostgreSQL and MySQL** (Day 10): CRUD across relationships, FK enforcement (Postgres `fk_…` violation; MySQL errno 1452), and the runtime-type behaviour (`TINYINT(1)`→bool, `DATETIME`→time).

### 1b. The deterministic coding-style engine (Days 11–14)
A post-setup engine of **finite, explicit, deterministic switches** (ADR-003 — never probabilistic "code personality"). The default of every option is a **literal bypass**, so default output reproduces all 20 recorded hashes byte-for-byte; the engine is purely additive.
- **Day 11 — formatting (indentation):** the engine machinery (neutral `CodingStyle`, no-op default, `EntityGenerationContext.style` threading, per-plugin `formatFiles` post-pass) + `formatting.indent` reindenting Express `.js` (a provably cosmetic, brace-safe switch).
- **Day 12 — naming convention:** `namingConvention` (`camelCase`/`snake_case`) governs the JSON API **wire key** of declared scalar fields across all five stacks (Go `json` tag, Spring `@JsonProperty`, Express `rowToObject`+dto, FastAPI Pydantic `alias`, Django DRF `source`), leaving DB columns / attributes / mappings intact. Live-proven on FastAPI (fixed a latent multi-word ORM bug).
- **Day 13 — architecture depth:** `architectureDepth` (`simple`) **branches the file set** — removes the repository layer and merges the base layers into one CRUD module, preserving the developer seam in both depths. Landed on Express + FastAPI, **both `simple` variants booted live** with a full TeamTracker FK + multi-user round-trip.
- **Day 14 — wired into the wizard:** a Style screen (3 controls, defaulting to `default`), a neutral `POST /api/style` → `setStyle`, per-stack applicability gating, ADR-004 visibility (Blueprint chips). Fresh wizard = 20 hashes; UI==CLI for style; composition proven; a wizard-chosen style booted live.

---

## 2. THE FROZEN 20-HASH MATRIX — the blocking backstop (re-confirmed this checkpoint)

**5 backends × 2 databases × 2 models. Any future day must keep all 20 byte-identical.** Re-confirmed byte-identical this checkpoint via the CLI/gate path **and** a fresh untouched wizard (Day 14), with the guard-the-guard digest cross-check (diff-empty against week-01-summary + day-09/day-10).

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` | `a437a302…` | `dca2254f…` | `68601cc5…` | `d158529a…` |
| Postgres | TeamTracker | `9e01210c…` | `dca2b4a7…` | `6d422010…` | `e509309c…` | `6aea8b04…` |
| MySQL | DemoApp | `3112d3f7…` | `d4b57b52…` | `cd87d6e3…` | `8b07a1b2…` | `9ff40acb…` |
| MySQL | TeamTracker | `4c4640ba…` | `bfa4a536…` | `5c788c70…` | `3b3e6a6f…` | `7408a3e2…` |

Full digests (the reference other days cite):
```
PG DemoApp     Spring  010098cdb40d38c99ddcc7b86642f9b9c022ea39f73723d3255a0f0d74d5007c
PG DemoApp     Express a437a302cc597ed1809551bdf31fafea569176829db16122b0ea78c68ffd4d65
PG DemoApp     FastAPI dca2254f86c532bb24af06f439b300613a6dc7918346063f704c68f98b1d5843
PG DemoApp     Django  68601cc5c77e4938c162d04c1c58d976b808421a90c66e5f3fd2f215a63caa18
PG DemoApp     Go      d158529a241677905a4be97f14b6a6419de55e95bee999883beb9f661cb4d067
PG TeamTracker Spring  9e01210c55a5a0a6d5c43cfa7e282a0b47f5f47f8780bbe48a733b3fe5e45d66
PG TeamTracker Express dca2b4a7a301df5e47ead65dc9f8cda26414a1ec1f24a055e8f1834c0cf1c9cf
PG TeamTracker FastAPI 6d422010e4c5c66da2950a19ad050765cd81bfd65b1842658377a1d67463b0d1
PG TeamTracker Django  e509309cd6c500e6633e0dca3d3fe52a695802e29ec4114e8c1fccac624e52c6
PG TeamTracker Go      6aea8b048aaf7112957de6bb8984d687bd5d725614f91826a9bf602b5e86135e
MY DemoApp     Spring  3112d3f76989b4c04715bb9e983c15d3f91485d32c6c62733a567e209268bd4e
MY DemoApp     Express d4b57b52d07448b161c9310cd06702984492ebed9f192abc7a5712d9b254f33f
MY DemoApp     FastAPI cd87d6e324aa1e84339162a2088acdba40ad660ea5def7804ecad70ca1ecd8b4
MY DemoApp     Django  8b07a1b2bd072698002cd2db944d5fe08b11f0d0cbf156993e1abf8edf47e5f3
MY DemoApp     Go      9ff40acbcc693f9d67b662e07dfb499f24930753f812b40c0e349d3c91771ba7
MY TeamTracker Spring  4c4640ba26531e5596973f51dd05d38153559799c131a1a8a2217069cb4c0ce9
MY TeamTracker Express bfa4a536ce5f44cb51de4ac7602a399ece4a77fb36bcb92f5c234d0c3cb87649
MY TeamTracker FastAPI 5c788c7089e92754416cecd129682faec642fbfed32b9aa3e3e0487208c04b7b
MY TeamTracker Django  3b3e6a6fb4afd1bbf712a9c1a190d7187135bf908c283b0a6ed6ecb10bf2830a
MY TeamTracker Go      7408a3e2377e0a4b4f3d465ed20cfa35716e3de65efd38d77d616ec76a1c55ec
```

---

## 3. The style option applicability matrix

Not all options affect all five stacks (what actually landed). The Day-14 wizard **gates** the non-applicable values (disabled + visible reason) so the UI never claims a style it will not deliver (ADR-004); the kernel stays neutral (an inapplicable value is a harmless no-op at that plugin).

| Option | Applies to | Elsewhere |
|---|---|---|
| **namingConvention** (`camelCase`/`snake_case`) | **all 5** stacks | — |
| **formatting.indent** (`two-space`/`four-space`/`tab`) | **Express only** (`.js` reindent) | no-op → default output |
| **architectureDepth `simple`** | **Express + FastAPI only** | Spring/Django/Go: `default` only |

---

## 4. Recorded style-alternative baselines (all reproduced this checkpoint, twice-identical)

These are the reference hashes for the non-default style outputs. All reproduce byte-identical under the full `CodingStyle` (default-except-the-chosen-option is a literal bypass).

### Naming — `snake_case` on the multi-word `Task` model (Day 12)
```
Spring  0484560720f22c1ff627979b78d734ef71e337ea39b18e6357d086b38630baeb
Express f79bbb16a9219d5f7135c654a6d2779c917400523d1671626606c19451f02b29
FastAPI c8aebb183788b7b5b7bf62584ac450aaae44669672f289560c887113bd0eb4bd
Django  f0c2c76599d596b801428696567fd574fa84f182818942b5fddf23f8dc27bcef
Go      e5cc7b8c11420036a94b0d444291de6437840c0f6a281044b9dce05f77670026
```
(default/camelCase are byte-identical to the frozen defaults for single-word fields; `Task`'s fields are already camelCase, so `camelCase == default`.)

### Formatting — Express DemoApp indentation (Day 11)
```
Express four-space  d3ae91b0fbbf28ff448caa87d3bfe7f38b48fceda1547990e2c4b34b990320be
Express tab         c81fb0f52ef8ad30e6cc20c47d7863ff8142f2310b96f9d070ef696312c79b99
```

### Architecture depth — `simple` on Postgres (Day 13)
```
Express DemoApp      simple  f340374447eb612787f1a37ef1efd59c6990f3adcb3189415110416f0f76e767
Express TeamTracker  simple  1f06af0d7bc80e534bddefd43303ddef336344929b362d78bf395a7739b2b9f3
FastAPI DemoApp      simple  c60a4521918034d9eba54346565e06196c43d5ff6811cca61b56aa828ff34c4a
FastAPI TeamTracker  simple  a85d7f9260f813e30405ad649924a95a0388cf52d2d9c5978df720736006d869
```

### Composition — combined multi-option, multi-word `Task`, Postgres (Day 14)
```
A  Express  snake_case + four-space + simple  58f0af062d8cc1561ce59567e9956618f5c107ed7e38eba6e9e58b484eab841b
B  FastAPI  snake_case + simple               c57edf42455085e8a694bb1e9c10db6f7e2bca0349f959bbf1f26d6140a5b45e
```

---

## 5. Documented v1 limitations (deliberate — carried forward, to revisit)

1. **Cross-stack FK-key convention + naming's mixed-key wire object (Day 12).** FastAPI/Django use snake FK wire keys (`team_id`); Express/Go use camel (`teamId`). And because naming governs declared fields only, a `snake_case` project serializes a mixed object — declared fields follow the convention while `id`/audit/owner/FK keep their frozen per-stack representation.
2. **Cross-depth switching unsupported (Day 13).** `architectureDepth` is fixed at project creation; the `simple` developer seam is created-once with imports pointing at the merged module. Switching an existing project's depth would orphan those imports — a deliberate migration, not a toggle (ADR-005 philosophy).
3. **`simple` is Postgres-baselined only (Day 13).** The collapse is dialect-independent; a MySQL `simple` run would only re-prove the provider seam already locked by the 20-hash matrix.
4. **Formatting affects Express `.js` only (Day 11).** A non-default indent on Spring/FastAPI/Django/Go is a no-op → default output; the wizard gates it.
5. **`simple` on Express + FastAPI only (Day 13).** Spring/Django/Go support `default` only; the wizard gates `simple`.
6. **The generated project does not self-record its style (Day 14).** `backend`/`database` are in the manifest as Phase-A, but style is not — a manifest style line would move all frozen hashes. Style visibility is wizard-side only (Blueprint chips + Style screen). Future path: a provenance file excluded from the hash computation, or a manifest style section behind a deliberate re-baseline.

---

## 6. Standing residuals (carried from Week 1 + Week 2)

- **Spring has never been booted live** (static + family-proven — its FK mechanism is the same `ALTER…CONSTRAINT` SQL proven live via FastAPI/Express).
- **MySQL is live-proven only on Express + Go.** FastAPI/Django/Spring MySQL are generation-proven + static-dialect-correct, not booted on MySQL.
- **`has-many` records no schema** (only `belongs-to` produces FKs — the inverse is the blueprint view).
- **Relationship scope is minimal** — scalar `belongs-to` FKs only (no object-graph navigation, cascade tuning, many-to-many, or self-relations).
- **`DECIMAL`/`NUMERIC(19,2)`** exists in both providers but is unexercised by the demo models.

---

## 7. Checkpoint verdict — stable, ready for Week 3

Week 2 delivered a genuinely more capable, still fully deterministic platform:
- **5 backend stacks** (Spring, Express, FastAPI, Django, **Go**), Go live-proven on both databases.
- **A deterministic coding-style engine** — formatting, naming, architecture depth — wired into the wizard, **gated per stack**, with `simple` live-proven on Express + FastAPI.
- **20 frozen baselines** re-confirmed byte-identical (CLI + fresh wizard); **13 recorded style-alternative baselines** (5 naming + 2 formatting + 4 simple + 2 composition), all reproduced twice-identical.
- **Guardrails intact:** no AI, deterministic (default = literal bypass), file-separated, core-neutral (style is opaque to the server; the applicability map is front-end knowledge), ADR-004 (style shown in the wizard). `BackendPlugin` interface unchanged; `TIMESTAMPTZ` JSDoc untouched.

The clean seam architecture is what made all of Week 2 additive: Go was a new backend plugin, and the style engine is deterministic options threaded through the existing `CodingStyle` seat — none required touching the kernel.

### What Week 3 builds (from the 21-day plan)
- **Day 15–16 — API-only project type:** a second project type (backend, no frontend), proving the project-type machinery; web-app baselines unaffected.
- **Day 17–18 — optional-integrations pattern:** the "need X? → how? → config?" wizard branch, 1–2 integrations built (AI only as a detachable hook, ADR-001).
- **Day 19 — wizard enrichment:** project description → README, relationships declared in the entity screen, style/integration/type screens flowing cleanly.
- **Day 20 — full-system integration + regression proof:** type × stack × database × entities × style × integration, end-to-end, with the full baseline regression.
- **Day 21 — demo polish + final documentation** (`docs/CAPABILITIES.md` + the consolidated 21-day report).

**The 20-hash matrix above is the backstop for all of Week 3: every default path must keep it byte-for-byte.**
