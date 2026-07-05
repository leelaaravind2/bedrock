# Eco-Day 08 — REPORT (Session 3 of 3): Local SQLite store for blueprint/project state

**Phase 0, Day 8. Verify + document only — no code changes, no features, no UI, no frozen hash touched.** This is the closing record for persisting the Project Model / blueprint: the blueprint now has a local home, **round-trips byte-identical**, and a **saved→loaded→generated** model reproduces the frozen 43+10+MAXIMAL — with the deterministic core left pure.

Plan: [`eco-day-08-plan.md`](eco-day-08-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1 hard rules, §4 honesty). Architecture: [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 (the store is a **shell** concern; the core stays **pure**). Predecessor: [`eco-day-05-report.md`](eco-day-05-report.md) (the pure-Node sidecar the store must protect). Execute-notes: `scratchpad/day08/eco-day-08-EXECUTE-NOTES.md`.

---

## THE VERDICT

> ✅ **The blueprint persists in a SHELL-SIDE SQLite store (Option A — `rusqlite` bundled in `desktop.exe`), round-trips BYTE-IDENTICAL, and saved→loaded→generated == the frozen 43+10+MAXIMAL.** The generator stays **pure Node** (0 native modules); the Day-5 sidecar is **untouched**; **no frozen hash moved**. **Day 8 closed.**

Persistence did not perturb generation, and the store lives exactly where architecture §4 says it should — in the shell, never the deterministic core.

---

## 1. Backstop re-confirmation from clean (the Session-3 gate)

`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, exit 0**: 44 digests (43 frozen + 1 MAXIMAL), 43+10 byte-identical, MAXIMAL twice-identical. Generator **`dependencies: {}`**, **0 native `.node` modules**, `versioning.ts` **untouched**. The additive persistence pieces changed nothing about generation.

---

## 2. The decision — Option A (store on the shell/Rust side), reasoned three ways

**Recommended and implemented: Option A.** SQLite lives in the shell binary (`desktop.exe`) via Rust `rusqlite`; the generator never owns a database.

1. **Architecture §4 says so** — the local store is a shell concern; the deterministic core stays pure. Persistence is not a generation concern.
2. **It protects the Day-5 proven asset** — the sidecar is byte-identical *because* the generator is pure Node with zero native modules. Putting SQLite in the Rust/shell binary means the sidecar bundle (`node.exe` + `dist/`+`plugins/` resources) is never touched.
3. **The code already supported it** — `getState()`/`restoreProjectModel()` give a JSON snapshot in/out (already "regenerate byte-for-byte"); the shell only needs to store/return JSON bytes.

**Option B (`better-sqlite3` in the generator) — rejected:** it would inject the **first native `.node` module** into the sidecar bundle (the exact thing that made SEA non-viable and the Day-5 bundle clean) and mix persistence into the deterministic core. The cost was weighed and refused.

---

## 3. The stages — each gated

### DC-1 — `canonicalStringify` (pure, additive, no native dep)
New `generator/src/core/canonical-json.ts`: recursively **sorted-key** JSON, **arrays left in order** (entity/field order is meaningful and must survive), code-unit key sort (no locale — matches the rest of the codebase). Pure TS, no dependency → the generator stays pure-Node. Additive — **`versioning.ts` untouched** (built beside it).

### DC-2 — `generate-from-snapshot` bridge (additive, hash-neutral)
New `generator/src/generate-from-snapshot.ts` (`npm run gen:snapshot`): reads a snapshot JSON → the **existing** `restoreProjectModel` → `buildFileSet` → emits `DIGEST <sha256>` (same `/${relPath}\n`+content convention). It only calls existing generation logic — no reordering, no new model-setup. **Hash-neutral proven:** clean build → `day20:regress` PASS; generator `dependencies: {}` unchanged.

### DC-3 — Store round-trip byte-identical (shell/Rust SQLite)
`desktop/src-tauri/src/blueprint_store.rs`: `BlueprintStore` (rusqlite) — `blueprints(id, name, canonical_json TEXT, sha256)`, `save`/`load`/`load_sha`; registered as `pub mod blueprint_store` in `lib.rs`. `cargo test blueprint_round_trips_byte_identical` → **PASS**: Node wrote the canonical MAXIMAL blueprint, the store **saved→loaded** it, and the round-tripped bytes matched.
- **Gate:** `sha256(input) == sha256(SQLite-round-tripped)` = `ccdd8521…`, both **2105 UTF-8 bytes** → **byte-identical through the store.** Save-twice identical + sha integrity asserted in-test.
- **Honest false-alarm diagnosis (a credit to verifying by hash, not by length):** an apparent **"2103 vs 2105"** surfaced first — but it was a **units artifact**: Node's `String.length` counts **UTF-16 code units** (2103), while the file is **2105 UTF-8 bytes** (the description's em-dash `—` is 1 code unit but **3 UTF-8 bytes**). **Not a byte diff** — confirmed identical by sha256. Correctly diagnosed as a measurement artifact, not a determinism issue.

### DC-4 — LOAD-BEARING GATE: saved → loaded → generated == frozen 43+10 (proven two ways)
- **Node level, 6 cells (independent of SQLite):** Spring/Express DemoApp, Go/Django TeamTracker, FastAPI DemoApp, and MAXIMAL — `getState()` → `canonicalStringify` → parse → `restoreProjectModel` → `buildFileSet` → digest. **round-trip-stable = true AND regen == frozen = true for all 6.**
- **End-to-end through the real SQLite store (MAXIMAL):** the **store-round-tripped** bytes, fed to `generate-from-snapshot`, regenerate `929c379f…` == **frozen MAXIMAL** exactly.
- **Empirically confirms the reasoning:** canonical **key order affects only STORED bytes, never generated output** — generation reads the reconstructed model (ordered arrays + phaseA by known keys), not the stored JSON's key order.

### DC-5 — Invariants
- **Sidecar still byte-identical:** refreshed the Day-5 standalone bundle with the CURRENT `dist`+`plugins`, re-ran → **44/44 byte-identical** vs the Day-2 native manifest. The store (in `desktop.exe`) never touched the sidecar.
- **Generator still pure-Node:** `dependencies: {}`, **0** native modules.
- **Backstop green from clean; no frozen hash moved.**

---

## 4. What changed

- **`generator/` — additive only (hash-neutral):** `src/core/canonical-json.ts` (new), `src/generate-from-snapshot.ts` (new), `package.json` (+`gen:snapshot` script). **`versioning.ts` untouched.**
- **`desktop/` — the Option A store (shell layer):** `src-tauri/src/blueprint_store.rs` (new), `src-tauri/src/lib.rs` (+`pub mod blueprint_store`), `src-tauri/Cargo.toml` (+`rusqlite { features = ["bundled"] }`, +`sha2`).
- **SQLite is in the shell binary (`desktop.exe`), never the generator/sidecar.**

---

## 5. Forward-flags

- 🚩 **RESOURCES-ARE-COPIES — now the top open flag (hit twice).** DC-5 required a **manual refresh** of the sidecar bundle's `gen/` from the current `dist`+`plugins` — the Day-5 staleness risk demonstrated again. **Day 9 should SCRIPT the generator→resources refresh with a freshness guard (a check that the shipped resources match the current generator build), closing this flag.** Treat it as a **Day-9 deliverable**.
- 🚩 **The store is wired + test-proven, NOT yet UI-driven** — a wizard to create/edit/pick blueprints is later (out of Day-8 scope). Today's proof is the store module + `cargo test` + the end-to-end loop.
- ✅ **`rusqlite` bundled compiled clean on Windows-MSVC first try** — the MSVC install from Day 4 paid off; no sqlx/link fighting, no escape-hatch needed. SQLite bundled from source, in `desktop.exe` only.
- 🚩 **Read-only resource dir** (Day 5): the generate-to-disk path still needs an explicit **writable** output dir.
- 🚩 **Standing flags:** macOS/Linux deferred; cross-OS determinism proof **not yet in CI** (manual/one-time); generated-project toolchain pins (Java 20≠21, Python 3.14≠3.13, mvn/go/podman absent); **no git** (manual backup); **CLAUDE.md/.gitattributes needed Day 9**.

---

## 6. What Day 9 picks up

**CLAUDE.md + hooks + determinism CI** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 9) — the build-discipline scaffolding: a lean hierarchical `CLAUDE.md` (pointing at [`../HARNESS-DISCIPLINE.md`](../HARNESS-DISCIPLINE.md)); hooks; and wiring the existing determinism harness into CI. **Plus: close the resources-are-copies flag** (§5 — the scripted refresh + freshness guard).

> **Two Day-9 notes carried from earlier findings:** (1) **there is no external Prettier to pin** (the Eco-Day-1 erratum) — so the Month-1 Day-9 "pin Prettier + plugins" item **has no target**; CI should wire the existing `day20:regress` determinism harness instead, keep `.gitattributes` (`* text=auto eol=lf`) as git-layer hygiene, and rely on the generator's own LF guarantee (LD-1) + guard (LD-2). (2) The repo is **not under git** — Day 9's CI/hooks work implies establishing version control first (or the CI wiring is designed against that reality).

---

## 7. Scope & cleanup

- **Verify + document only.** No code changed this session; no features; no UI; no signing; no macOS/Linux builds; **no frozen hash moved.** The from-clean re-confirmation rebuilt `dist/` (expected).
- The temp store test db (`%TEMP%/thraksha-blueprint-test.sqlite`) was cleaned; scratch confined to `scratchpad/day08/`; `desktop/…/target` gitignored. `generator/` generation output and `output/` untouched.

---

**Day 8 verdict, restated:** the blueprint has a local home without any cost to the deterministic core. The store lives on the shell side (`rusqlite` bundled in `desktop.exe`) — Option A, chosen to keep the generator pure-Node and the Day-5 sidecar exactly as proven — and SQLite, the first native module, went into the shell binary, never the generator. A blueprint saved → loaded round-trips **byte-identical** (sha256-verified, after correctly dismissing a UTF-16-vs-UTF-8 length false alarm), and saved→loaded→generated reproduces the frozen 43+10+MAXIMAL — proven at the Node level across six cells and **end-to-end through the real SQLite store**. The generator stays pure-Node (0 native modules), the sidecar is unchanged (44/44), and no frozen hash moved. The one flag that now demands action: **the sidecar resources are copies and were manually refreshed twice — Day 9 must script that refresh with a freshness guard.** **Day 8 is closed; Day 9 is CLAUDE.md + hooks + determinism CI (and closing the resources flag).**
