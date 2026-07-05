# Eco-Day 00 — REPORT (Session 3 of 3): Orientation & ground-truth confirmation

**Phase 0, Day 0. Verify + document only — no code, no features, no audit conclusions, no frozen hash touched.** This is the orientation record every later ecosystem day builds on: a fresh Claude Code session reading only this file should understand the codebase and know the certified backstop reproduces from clean.

Plan: [`eco-day-00-plan.md`](eco-day-00-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md). Predecessor certification: [`day-20-report.md`](day-20-report.md).

---

## THE VERDICT

> ✅ **GROUND CONFIRMED — the 43 + 10 backstop reproduces byte-identical from a clean build; Day 1 may audit.**

The load-bearing check passed: from a clean rebuild, `npm run day20:regress` reproduces the certified **43 recorded digests + 10 TeamTracker relationship hashes** byte-identical, exit 0, zero FAIL. No hash moved. The ground everything stands on is real and reachable. Day 1 (the determinism audit) is unblocked.

Two forward-flags and one reproducibility nuance travel with this verdict — stated plainly below, not smoothed over (GUARDRAILS §4).

---

## 1. The codebase map (the navigation reference for the phase)

Repo root: `E:\Software`. **The repo is NOT a git repository** (no `.git`; manual backup in use). The generator lives under [`generator/`](../../generator/); the regression runs from there (`cd generator && npm run build && npm run day20:regress`).

### 1.1 Generator core — the technology-neutral kernel · [`generator/src/core/`](../../generator/src/core/)
| File | Role |
|---|---|
| [`project-model.ts`](../../generator/src/core/project-model.ts) | The Project Model / blueprint = single source of truth (Law 2). `PhaseASettings`/`PhaseASettingsInput` (projectName, projectType `Web App`\|`API-only`, backend, frontend, database, multiUser, auth); `FieldSpec`/`Field`; `RelationshipSpec`/`Relationship` (`belongs-to`\|`has-many`); `EntitySpec`/`Entity`. `createProjectModel()` validates mandatory inputs + applies **and records** defaults (ADR-004); **API-only forces `frontend='None'`**. `setStyle`/`setIntegrations`/`setDescription`; `getState`/`restoreProjectModel` (canonical round-trip — the persisted source of truth). |
| [`plugin.ts`](../../generator/src/core/plugin.ts) | The kernel↔plugin seam (Laws 25–28) — the ONLY thing the core knows about a backend. `BackendPlugin` (`generateProjectShell`, `generateEntity`, `describeEntityDefaults`, optional `formatFiles`); `GeneratedFile {relPath, content, ownership:'thraksha'\|'developer'}`; `EntityGenerationContext`. |
| [`regen.ts`](../../generator/src/core/regen.ts) | File-separation / preview / update engine: **`buildFileSet(model, plugin)`** (the generation entry the harness AND the server both call), `computePlan`, `renderPreview`, `applyPlan` (writes disk; developer files created-once, never overwritten — ADR-002). The neutral README description inject lives here. |
| [`database.ts`](../../generator/src/core/database.ts) | DB-provider seam. Holds the load-bearing **`TIMESTAMPTZ` JSDoc** determinism anchor — do not touch incidentally (GUARDRAILS §1.5). |
| [`style.ts`](../../generator/src/core/style.ts) | 3-axis coding-style engine: `formatting.indent`, `namingConvention`, `architectureDepth`. `defaultCodingStyle` (a no-op literal bypass); `applyNaming`/`toSnakeCase`/`toCamelCase`. |
| [`integrations.ts`](../../generator/src/core/integrations.ts) | Email + AI-hook option model. `defaultIntegrations` = `{email:'none', ai:'none'}` (literal bypass). |
| [`versioning.ts`](../../generator/src/core/versioning.ts) | `VersionStore` — blueprint version history (save/list/rollback). |

### 1.2 The 5 backend plugins · [`generator/src/plugins/`](../../generator/src/plugins/)
`spring/`, `express/`, `python/` (= FastAPI), `django/`, `go/` — each with `<name>-plugin.ts` + `entity-codegen.ts`. Generation is via **TypeScript string templates inside these files** (not external template files). Selection: [`registry.ts`](../../generator/src/plugins/registry.ts) → `selectBackendPlugin(model)` maps the `backend` string → factory (`Spring Boot`→spring, `Express`→express, `FastAPI`→python, `Django`→django, `Go`→go); `availableBackends()` lists them.

### 1.3 DB provider seam · [`generator/src/plugins/database/`](../../generator/src/plugins/database/)
`postgres.ts`, `mysql.ts`, selected via [`database-registry.ts`](../../generator/src/plugins/database-registry.ts) → `selectDatabaseProvider(model)`. The backend receives a provider; it never learns which database (Law 25).

### 1.4 Model / blueprint demo definitions · [`generator/src/`](../../generator/src/)
[`demoapp-model.ts`](../../generator/src/demoapp-model.ts) (canonical DemoApp, single Ticket), [`teamtracker-model.ts`](../../generator/src/teamtracker-model.ts) (multi-entity Team→Application→Ticket→Comment, multi-edge; the Day-21 comment fix is here), [`task-model.ts`](../../generator/src/task-model.ts) (multi-word Task, for naming baselines).

### 1.5 Gates / harness · [`generator/src/`](../../generator/src/)
- **The canonical backstop:** [`day20-regression.ts`](../../generator/src/day20-regression.ts) → `npm run day20:regress`. Asserts the **43 digests + 10 relationship hashes + all non-hash checks + property re-derivations + guards** in one pure-Node process (no Docker, no DB, no network). `--emit-digests` dumps the 43. The frozen values are baked as `FROZEN`/`NAMING`/`FORMATTING`/`SIMPLE`/`COMPOSITION`/`API_ONLY`/`EMAIL`/`AI_HOOK` const maps.
- **Individual cross-check gates:** [`day12-gate.ts`](../../generator/src/day12-gate.ts) … [`day19-gate.ts`](../../generator/src/day19-gate.ts) (`npm run day12:gate` … `day19:gate`) — the reference that validated the consolidated harness (GATE 0). Still intact.
- **Demos:** `two-stacks-demo.ts` (ADR-002 file separation), `python-step2-demo.ts`, `ui-three-stacks-demo.ts` (UI==CLI), `model-demo.ts`, `preview-demo.ts`, `version-demo.ts`.

### 1.6 The digest / output convention (load-bearing — do not fork)
`sha256` over, for each `GeneratedFile` **sorted by `relPath`**: `` `/${relPath}\n` `` then `Buffer.from(content, 'utf8')`. Identical in every gate, the harness ([`day20-regression.ts:110`](../../generator/src/day20-regression.ts)), and the Day-0 disk driver.

### 1.7 The wizard UI · [`generator/src/server.ts`](../../generator/src/server.ts) + [`generator/ui/index.html`](../../generator/ui/index.html)
Thin `node:http` server (no framework); `npm run ui`; PORT 4317 (env-overridable). Routes: `GET /`, `GET /api/state`, `POST /api/settings` (→ createProjectModel + setDescription), `POST /api/style`, `POST /api/integrations`, `POST /api/demoapp`, `POST /api/entities`, `GET /api/preview`, `POST /api/generate` (→ applyPlan writes disk), `POST /api/versions/save|rollback`, `GET /api/versions|files|file`. Each route is a thin call into the engine — **no generation logic in the server** (Law 25).

### 1.8 Where output is written on disk
- Generated projects (canonical): [`output/`](../../output/) at repo root (`DemoApp/`, `TeamTracker/`, `arA/` present); overridable via `THRAKSHA_UI_OUTPUT`.
- Version snapshots: [`.thraksha/versions/`](../../.thraksha/); overridable via `THRAKSHA_UI_STORE`.

### 1.9 Stray artifacts — IDENTIFY, do NOT delete (not part of the live path)
- `generator/Express/DemoApp/` — a committed generated project tree (scratch output, not source).
- `generator/plugins/{django,express,go,python,spring}/templates/` — external template folders **not referenced by any `src` code** (grep-confirmed); the live generation is the TS string templates in `src/plugins/*/`. Legacy/asset scratch. Flag for a future cleanup day; untouched now.

> **⚠ ERRATUM (Eco-Day 1, 2026-07-03) — the second bullet above is WRONG.** `generator/plugins/*/templates/` **ARE the live project-shell templates for all 5 stacks.** Every plugin reads them at generation time via `DEFAULT_TEMPLATES_DIR` + `fs.readFile(tf,'utf8')` + `applyTokens` (`express-plugin.ts:364,383` and the parallel sites in django/go/python/spring). The Day-0 grep used imprecise patterns and missed the array-form `path.join(HERE,'..','..','..','plugins','<stack>','templates')`, producing a false negative. These 83 (LF) template files are **load-bearing**, not deletable scratch. The entity CRUD is emitted separately via `.join('\n')` string arrays in `src/plugins/*/entity-codegen.ts`; the *shell* comes from these template files. See [`eco-day-01-report.md`](eco-day-01-report.md) / [`eco-day-01-plan.md`](eco-day-01-plan.md) §6. *(`generator/Express/DemoApp/` in the first bullet remains unverified stray output — not touched.)*

---

## 2. DC-2 — Clean build + regression (THE LOAD-BEARING GATE) — ✅ PASS

**"Clean" operational definition** (no git → no git-clean possible): `cd generator && rm -rf dist && npm run build`, then `npm run day20:regress` — exactly the Day-20 certification's `rm -rf dist && tsc` ([`day-20-report.md`](day-20-report.md) §1). Deps: `npm ci` → `added 3 packages, 0 vulnerabilities`.

**Re-confirmed twice this day (Session 2 execute + Session 3 re-confirm), both from a clean `dist`:**

```
> tsc                                    (build exit 0, no type errors)

=== PART 1a: 20 web-app matrix (default path — the blocking backstop) ===
  OK   Spring Boot|PostgreSQL|DemoApp      010098cdb40d38c9
  OK   Express|PostgreSQL|DemoApp          a437a302cc597ed1
  …  (all 20 OK: 5 backends × 2 DBs × {DemoApp, TeamTracker})
=== PART 1b: naming (5) · formatting (2) · simple (4) · composition (2) · api-only (6) · email (2) · ai-hook (2) ===
  OK   …  (all green + per-stack non-hash coherence checks)
=== PART 1c: property cases RE-DERIVED this run ===
  OK   api-only == web-app, MANIFEST-ONLY (3 manifest lines)
  OK   description-provided sibling: only README differs + injected
=== PART 1d: UI==CLI relationship path (10 TeamTracker via addEntity) ===
  OK   UI-declared TeamTracker (incl. multi-edge Ticket) == 10 baselines byte-for-byte
  OK   relationship-free DemoApp reproduces baseline (literal bypass)
=== PART 1e: guards ===
  OK   setStyle/setDescription survive get/set + restore
  OK   naming helpers (toSnakeCase/toCamelCase/applyNaming) fire correctly

[digest-manifest] 43 digests asserted
Day-20 regression: PASS (43 baselines + non-hash checks + property re-derivations)      (exit 0)
```

`--emit-digests` confirmed exactly **43 DIGEST lines**, byte-identical to the frozen record — e.g. `Spring Boot|PostgreSQL|DemoApp 010098cdb40d38c9…`, `Express|PostgreSQL|DemoApp a437a302cc597ed1…`, `Go|MySQL|TeamTracker 7408a3e2377e0a4b…`. Breakdown: 20 web-app matrix + 5 naming + 2 formatting + 4 simple + 2 composition + 6 api-only + 2 email + 2 ai-hook = **43**. The **10 TeamTracker relationship hashes** reproduced via the UI `addEntity` path == the matrix baselines byte-for-byte (UI==CLI).

**→ The certified 43 + 10 reproduce byte-identical from a clean build. No hash moved. No `src`/generated/`output/` file changed (only the expected `dist/` rebuild).**

---

## 3. DC-3 — The maximal digest: a KNOWN NUANCE (Day-20's certification stands; only one hash is un-reproducible)

The maximal-composition digest **`33f3ec4b…`** ([`day-20-report.md`](day-20-report.md) §3) is **baked nowhere in `src`** — it was a live HTTP-chain artifact, not a harness value. Session 2 drove the real Day-20 §3 chain to test its reproducibility. The honest result:

- **The generation chain RUNS (server is pure Node ✓).** `node dist/server.js` came up fine; no Docker or toolchain needed for generation.
- **The maximal cell is DETERMINISTIC ✓.** Driving `POST /api/settings → /api/style → /api/integrations → /api/entities ×4 → /api/generate` for the exact maximal cell (Express · API-only · multi-edge TeamTracker · snake+four+simple · `{email:smtp, ai:hook}` · projectName `MaxCell`), hashed with the §1.6 convention, produced a **twice-identical** digest — `4fed884986aa2461…` for the **blank-description** variant.
- **But `33f3ec4b…` is NOT reproducible from the shipped repo.** The maximal cell's single unrecorded free variable is the **description string**: API-only forces `frontend='None'`, multiUser/auth take defaults, and style/integrations/entities are all pinned by the report — everything is fixed **except the provided description**, which the docs record only as `description:'…'` (a literal ellipsis). Per [`day-19-report.md`](day-19-report.md), a provided description flows into the **README inject only**, so `33f3ec4b…` (provided) differs from `4fed8849…` (blank) **solely in the README bytes**. The Day-20 driver (`recheck.mjs`) that carried the exact inputs was **deleted at Day-20 cleanup** ([`day-20-report.md`](day-20-report.md) §8). Without the exact user prose, byte-identity to `33f3ec4b…` is unreachable.

**Why this is a nuance, not a failure:** the load-bearing backstop — the **43 + 10** — is fully intact and reproduces from clean (§2). Day-20's certification of the maximal cell (deterministic, twice-identical, and booted coherently *at that time*) **stands as a dated record**. What Day 0 surfaces is narrower and honest: **unlike the 43+10, the maximal digest has neither a harness NOR recorded inputs** — it is a recorded-artifact-only value, and that one specific hash cannot be re-derived from the repo as shipped.

**Carry forward (do not chase now):** if the maximal composition is wanted as a durable, re-provable baseline, a future day should either bake it into the harness with a **fixed** description or record the exact inputs — a small, deliberate act, not a Day-0 fix.

**The maximal BOOT is DEFERRED** (Day-20 Part 2 runtime coherence: four-part detachable ai-hook + composed FK round-trip). It needs Docker + Postgres; it is runtime verification already certified on Day 20 and is **out of Day-0 mandatory scope** (Day 0 confirms *generation* reproduces, not runtime). Not attempted; not faked.

---

## 4. DC-4 — Environment inventory + the two forward-flags (read-only; no action taken)

| Tool | Present | Version | vs. intended Phase-1 pin |
|---|---|---|---|
| Node | ✅ | v22.21.0 | matches `node:22` |
| npm | ✅ | 10.9.4 | — |
| TypeScript | ✅ | 5.9.3 | — |
| Docker | ✅ | 29.6.1 | (boots only) |
| Podman | ❌ | — | absent |
| **Java (JDK)** | ✅ | **20.0.1** | **≠ pin java:21** |
| **Maven (`mvn`)** | ❌ | not found | absent (Spring build/boot) |
| **Python** | ✅ | **3.14.0** | **≠ pin 3.13** |
| **Go** | ❌ | not found | absent (Go build/boot) |
| git | ✅ | 2.50.0.windows.2 | present, but **repo NOT initialized** |

- **OS: Windows 11 — `Windows_NT 10.0.26200`, MINGW64.** This is the single OS the 21 days + Day 0 ran on.

### 🚩 Forward-flag (a): cross-OS is UNTESTED (Windows 11 only)
Byte-identity has only ever been proven on Windows. macOS/Linux are unproven — the single biggest inherited risk (GUARDRAILS §2: CRLF/LF, path separators). **This is Day 2's job, not Day 0's** — Day 0 only records which OS.

### 🚩 Forward-flag (b): installed toolchains do NOT match the intended pins
Java **20 ≠ 21**, Python **3.14 ≠ 3.13**, and **mvn / go / podman are absent**. None block DC-2 (the regression is pure Node). These are exactly what Day-18 detect-and-guide will handle — recorded here as already-true on the build machine, not acted on.

### Other ground-truth notes
- **The repo is not under git** (no `.git`; manual backup in use). "Clean checkout" is therefore not achievable; "clean build" = `rm -rf dist && npm run build` (used throughout).
- **Scaffolding not yet present (all "needed Day 9"):** no root `CLAUDE.md`, no `generator/CLAUDE.md`, no `.gitattributes`, no Prettier config. Line-ending normalization + formatter pinning are Day-1 (audit) / Day-9 (CI) concerns — **not created** this session.
- `docs/daily/` exists; the `eco-day-NN-{plan,report}.md` naming is in use (this is the first `eco-` day; the v0.1 `day-NN-*` files coexist as history).

---

## 5. What Day 1 picks up

The ground is confirmed, so Day 1 can audit determinism on ground known to hold:
- **The three-determinism-killers audit** (GUARDRAILS §2), on the real generation path: (1) embedded timestamps / dates / UUIDs / unseeded RNG; (2) line endings (CRLF vs LF) — pointed at by the *absent* `.gitattributes` + `endOfLine:lf`; (3) unsorted object/map keys / unstable iteration order. **Day 0 drew NO conclusions about these** — it only mapped that the config is absent; the audit is Day 1's.
- **The go-forward harness discipline:** new features add baselines; every empty/default path stays a literal bypass reproducing the frozen hashes; a lock-down that would move a hash is a STOP-and-report finding (GUARDRAILS §1.1, §3).
- Any pure lock-down Day 1 makes must be proven **hash-neutral** against the 43 + 10 confirmed here.

Day 1 should also keep the §3 nuance in view: the maximal `33f3ec4b…` is not re-provable from the repo; the load-bearing baseline is the **43 + 10**, and that is what every future day must keep byte-identical.

---

## 6. Scope & cleanup

- **Verify + document only.** No code changed; no features; no audit conclusions; no Tauri/desktop work; **no frozen hash moved or touched**. The only build artifact regenerated is `dist/` (compiled output, expected — the same step the certification uses).
- Session-2's maximal-cell generation, HTTP driver, and logs live only in scratch (`day00/`); repo `output/` untouched. Server processes torn down; no listening ports left; residue clean.

---

**Day 0 verdict, restated:** the ground is confirmed and mapped. From a clean build, the certified **43 digests + 10 TeamTracker relationship hashes reproduce byte-identical** — the deterministic backstop is real and reachable, and no hash moved. Carried forward honestly: the maximal-composition digest `33f3ec4b…` is a known un-reproducible nuance (unrecorded description; no harness) while Day-20's certification stands; **cross-OS is untested (Windows-only)**; and **the machine's toolchains do not match the intended pins**. Day 1 may audit determinism.
