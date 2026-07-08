# Eco-Day 63 — PLAN: WIRE THE BLUEPRINT STORE — SQLite persistence (save / load / list)

**Day 63 — the sensation push (Days 61–70).** Days 61–62 built the wizard (settings + data model, UI==CLI
proven). Day 63 makes Bedrock **keep projects**: expose the existing shell-side SQLite blueprint store
([`blueprint_store.rs`](../../desktop/src-tauri/src/blueprint_store.rs), since Day 8) as **save / load /
list Tauri commands**, and wire the wizard to save its blueprint and load saved ones back. **SHELL-ONLY
over the CERTIFIED engine — the store is shell-side SQLite; it does NOT touch the generator.**

**This is the FIRST new Tauri command since Day 52 — a Rust change.** So the gate includes **`cargo check` +
the sidecar self-test**, not just `node --check`. It is still shell-only (the generator is untouched).

**This session is PLAN ONLY. No code, no builds.**

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. THE CURRENT STATE (read live this session — the scope hinges on it)

**`blueprint_store.rs` is a COMPLETE SQLite module, NOT a stub** — this makes Day 63 a clean *wire-existing-
storage* day, not a build-storage day:

| Present today | Missing (Day 63 adds) |
|---|---|
| `BlueprintStore::open(path)` — opens/creates the SQLite DB + the `blueprints` table (`id, name, canonical_json, sha256`) | a **`list()`** query (id, name, timestamp) for the picker |
| `save(name, json) → id` · `load(id) → json` · `load_sha(id)` | a **`created_at`** column (picker metadata) |
| A passing round-trip `#[test]` (`blueprint_round_trips_byte_identical`) with a **`THRAKSHA_BP_IN/OUT` env bridge** (built for exactly this end-to-end proof) | the **Tauri command layer** (no `#[tauri::command]` yet; not in `generate_handler!`) |
| `sha256` integrity via `sha2` | the **wizard save/load UI** |

**Cargo.toml — NO new crate needed:** `rusqlite = { version = "0.32", features = ["bundled"] }` + `sha2 =
"0.10"` + `serde_json = "1"` + `serde { derive }` are **already dependencies**. The store already uses
rusqlite+sha2. (The generator's `deps {}` is a SEPARATE invariant — the Rust shell may have crates; the
generator stays pure-Node. **No `deps {}` change.**)

**lib.rs today:** `pub mod blueprint_store;` (compiled, unexposed) + `pub mod commands;` +
`generate_handler![export_project, scan_project, impact_preview, flow_map, detect_toolchains]` + the
`setup()` self-test through `run_sidecar`. Day 63 is **additive**: a new module + 3 commands + a longer
`generate_handler!` — the self-test and the sidecar invokers are untouched.

---

## 1. THE STORE COMMANDS (shell-side storage — NOT sidecar invokers)

**A NEW module** `desktop/src-tauri/src/store_commands.rs` (kept separate from `commands.rs` so the
distinction is structural: `commands.rs` = **sidecar thin-invokers**; `store_commands.rs` = **shell-side
SQLite storage**). `blueprint_store.rs` stays **Tauri-free** (pure storage + its test).

**The honest Result shape (NOT `SidecarResult`):** storage ops are pure-Rust SQLite calls, **not a process
spawn** — so a **clean `Result<T, String>`** is the honest contract (a storage error = `Err`; success =
`Ok(data)`). This is deliberately different from the Day-53 `SidecarResult { stdout, stderr, exit_code }`,
which wraps a *completed sidecar process* — there is no exit code for an in-proc DB call.

| `#[tauri::command]` | JS invoke (camelCase → snake_case) | Returns |
|---|---|---|
| `save_blueprint(app, name, model_json)` | `invoke('save_blueprint', { name, modelJson })` | `Result<i64, String>` (the row id) |
| `load_blueprint(app, id)` | `invoke('load_blueprint', { id })` | `Result<String, String>` (the canonical `BlueprintChoices` JSON) |
| `list_blueprints(app)` | `invoke('list_blueprints')` | `Result<Vec<BlueprintMeta>, String>` |

- `BlueprintMeta { id: i64, name: String, created_at: String }` — `#[derive(serde::Serialize)]` (serde is
  already a dep). Crosses `invoke()` as `{ id, name, created_at }`.
- **Each command:** resolve `app.path().app_data_dir()` (→ `%APPDATA%/com.thraksha.bedrock` on Windows),
  ensure the dir exists, `BlueprintStore::open(<dir>/bedrock-blueprints.sqlite)`, run the op, **map
  `rusqlite::Error → String`** (`.map_err(|e| e.to_string())`). Per-call open is fine for SQLite (or a
  managed `tauri::State<Mutex<…>>` — an optional refinement; per-call is simpler and thread-safe).
- **No generation logic.** These are storage ops only; they never spawn the sidecar or touch generation.
- **`blueprint_store.rs` additions:** a `created_at TEXT DEFAULT (datetime('now'))` column on the table +
  `list() → Vec<(i64, String, String)>` (`SELECT id, name, created_at ORDER BY id DESC`). **`created_at` is
  a clock read, but it is SHELL STORAGE METADATA for the picker — entirely OUTSIDE the generation path AND
  outside the blueprint JSON** (the `canonical_json` round-trips byte-identical regardless). This is the
  guardrails' "a clock outside generation is fine" distinction — no determinism impact.
- **Migration note (honest):** `CREATE TABLE IF NOT EXISTS` won't add `created_at` to a pre-existing table;
  Bedrock is **pre-release (no shipped DBs)**, so a fresh schema is correct — flag it (a later `ALTER
  TABLE` migration is a v0.2 concern).
- **`lib.rs`:** `pub mod store_commands;` + append the 3 commands to `generate_handler!` (additive — the
  self-test + the 5 sidecar invokers unchanged).

**Save semantics:** `save` **inserts a new row** (matches the existing `store.save`) — each save is a saved
snapshot; `list` shows all (newest first). Upsert-by-id / rename / delete are UX refinements for a later
day (noted, not built).

---

## 2. THE WIZARD SAVE / LOAD UI (thin client)

[`main.js`](../../desktop/src/main.js) + [`wizard-choices.js`](../../desktop/src/wizard-choices.js):

- **Save (Review step):** a **"Save project"** button → `invoke('save_blueprint', { name:
  selections.projectName, modelJson: JSON.stringify(buildBlueprintChoices(selections)) })` → render the
  returned id ("Saved as #N").
- **My projects (a panel/section):** on load + after a save, `invoke('list_blueprints')` → render the list
  (name · id · created_at); clicking one → `invoke('load_blueprint', { id })` → **parse the JSON** →
  re-populate the wizard via a **PURE inverse mapper** in `wizard-choices.js`:
  `choicesToSelections(choices) = { ...choices.settings, entities: choices.entities ?? [] }` (the inverse of
  `buildBlueprintChoices` — thin **data mapping**, NOT generation logic) → `renderStep()`.
- **THIN CLIENT:** the wizard only collects + invokes + renders. `buildBlueprintChoices` /
  `choicesToSelections` are pure serializer/deserializer; no generation logic in JS. Result rendering reuses
  the existing status/output area (a storage `Err` → an env-error-style message; `Ok` → the id/list).

---

## 3. THE ROUND-TRIP (DC-3, load-bearing) — LOSSLESS + NON-MUTATING

Proven HERE (no GUI needed — the store test already has the `THRAKSHA_BP_IN/OUT` bridge for exactly this):

1. **`cargo test` — save→load byte-identical** (the existing `blueprint_round_trips_byte_identical`,
   extended if needed): `load(save(json)) == json` byte-for-byte + the `sha256` integrity check +
   save-twice identical. **The store persists the canonical bytes verbatim.**
2. **The Node bridge — loaded → generate byte-identical, incl. the CERTIFIED TeamTracker:**
   - Feed the wizard's **TeamTracker `BlueprintChoices` JSON** (`buildBlueprintChoices(TEAMTRACKER_EXAMPLE)`,
     Day 62) as `THRAKSHA_BP_IN`; the Rust test round-trips it through a REAL on-disk SQLite file → writes
     the round-tripped bytes to `THRAKSHA_BP_OUT`.
   - A Node script: `export.js --model <THRAKSHA_BP_OUT>` (the LOADED blueprint) → tree POST;
     `export.js --model <original TT JSON>` (PRE-save) → tree PRE. **Assert PRE == POST byte-identical**
     (the store did not corrupt/reorder/mutate the blueprint) **AND POST == the certified
     `buildTeamTrackerModel` file-set** (a saved+loaded TeamTracker still reproduces the PART-1d baseline).
   - Cover a 2nd representative blueprint (e.g. a Decimal-field entity set) for breadth.

→ **The store is lossless (save→load byte-identical) and non-mutating (loaded→generate == pre-save
generate, incl. reproducing a certified baseline).** A corrupted/reordered blueprint = a **FINDING, STOP.**

---

## 4. THE SPINE — shell-only; the Rust gate; honest

1. **SHELL-ONLY, GENERATION UNTOUCHED:** the store is shell-side SQLite; **no generator source change**. The
   frozen backstop byte-identical (103 baked + 10 + non-hash PART 1c–1x, 194 OK, MAXIMAL `366e19d9…`). **A
   moved hash = FINDING, STOP.**
2. **THE RUST GATE (this is a Rust change):** `cargo check` clean (0 warnings) + `cargo test` (the store
   round-trip) + **the sidecar self-test lockstep** — the additive commands don't touch `run_sidecar` or
   `setup()`, so the bundled node still reproduces the **103 digests** (the Day-53 `SIDECAR_EXIT` contract
   unaffected; prove via the bundled-node `--emit-digests` == certified, the Day-58 DC-2 mechanism).
3. **NO SILENT NEW CRATE:** none needed — rusqlite+sha2+serde_json already in Cargo.toml (verified). If that
   were false, a new crate would be a **documented deliberate** addition (§1.1) — but it is not.
4. **HONEST build-here vs deferred:** the commands + `cargo check`/`cargo test` + the round-trip proof
   (Rust test + the Node bridge, incl. TeamTracker) are **HERE**; the **live packaged GUI save/load**
   (clicking "Save project" in the running Bedrock window; the SQLite file on disk under `%APPDATA%`) is
   **DEFERRED** to Leela's Windows machine — **no claimed live persistence run.**

### The generation-untouched proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` byte-identical.
- `git status --short` → only `desktop/` (shell) + docs; **no `generator/` source**; generator `deps {}`.

---

## 5. EXECUTE done-conditions

1. **THE STORE COMMANDS:** `save_blueprint` / `load_blueprint` / `list_blueprints` as `#[tauri::command]`s
   (new `store_commands.rs`, calling `blueprint_store.rs`), registered in `lib.rs` `generate_handler!`.
   Shell-side SQLite storage (NOT sidecar spawns) with an honest `Result<T, String>` (storage error = Err;
   success = Ok(data)). `blueprint_store.rs` gains `list()` + `created_at`. No generation logic.
2. **THE WIZARD SAVES/LOADS:** Review "Save project" (`save_blueprint`) + a "My projects" list
   (`list_blueprints`) + click-to-load (`load_blueprint` → `choicesToSelections` → re-populate). Thin
   client.
3. **THE ROUND-TRIP (load-bearing):** `cargo test` save→load byte-identical + the Node bridge loaded→export
   byte-identical to pre-save (incl. the certified TeamTracker reproducing its baseline). Lossless +
   non-mutating.
4. **`cargo check` clean + the sidecar self-test lockstep** — the bundled node still reproduces the 103
   digests; the `SIDECAR_EXIT` contract + the 5 invokers unchanged.
5. **GENERATION UNTOUCHED:** frozen backstop byte-identical (103 baked + 10 + non-hash, MAXIMAL
   `366e19d9…`); git only `desktop/` + docs; no generator source; generator `deps {}`. **A moved hash =
   FINDING, STOP.**
6. **Honest:** commands + `cargo check`/`cargo test` + the round-trip proof HERE; the live packaged GUI
   save/load DEFERRED (Leela's machine); no new Cargo.toml crate (verified present); the generator's `deps
   {}` untouched.

## 6. REPORT done-conditions

`eco-day-63-report.md`: the CURRENT STATE of `blueprint_store.rs` (complete module, as found); the store
commands (save/load/list — the shapes, the honest `Result` form, shell-side-not-sidecar, the SQLite
`%APPDATA%` location, the `created_at` metadata note); the wizard save/load UI + the pure inverse mapper;
**THE ROUND-TRIP PROOF** (save→load byte-identical + loaded→generate byte-identical, incl. TeamTracker);
`cargo check` + the self-test lockstep; the generation-untouched proof (backstop byte-identical, only
`desktop/` + docs, generator `deps {}`); **no new crate** (verified); honest build-here vs deferred (the
live GUI save/load = Leela's machine). **Forward-flags:** Day 64 (the linked project view — the maps +
export on a SAVED/loaded blueprint); the punch-list.

---

## 7. SCOPE GUARD — OUT

- **NOT** the linked map view (Day 64); **NOT** the visual Map (Days 65–67).
- The store is **shell-side SQLite** — it does NOT touch the generator (**a generator change = a FINDING**).
- The store commands are **shell-side storage, NOT sidecar invokers** — distinguish honestly (a clean
  `Result`, not `SidecarResult`); keep `blueprint_store.rs` Tauri-free.
- **NO generator source change** — a moved hash = FINDING, STOP.
- **No new crate** (verified present); were one needed it would be a **documented deliberate** Cargo.toml
  addition — the generator's `deps {}` is separate + untouched.
- The **round-trip must be LOSSLESS + NON-MUTATING** — a corrupted/reordered blueprint = a FINDING.
- The **live packaged GUI save/load is Leela's-machine** (honest — no claimed live persistence).
- **No AI** (ADR-001).

## 8. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + the extension doc + Day-62/52/53 reports + the real code (`blueprint_store.rs` [the
   deciding read], `Cargo.toml`, `lib.rs`, `commands.rs`, the wizard) — **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; the store is shell-side — moves
   nothing; a saved+loaded TeamTracker *reproduces* (not moves) the baseline — **understood**.
4. AI touchpoints: **none** — storage is AI-free (ADR-001) — **yes**.
5. The default/empty path a literal bypass: not applicable to storage; the wizard's no-entities bypass +
   the certified backstop stand — the store adds no generation path — **noted**.
6. The three determinism killers: N/A to generation (no generator output touched); the `created_at` clock is
   shell storage metadata OUTSIDE generation + the blueprint JSON — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + `cargo check`/`cargo test` + the Node bridge
   round-trip + `git status`; a moved hash / a non-byte-identical round-trip = STOP — **yes**.
8. Overclaim / out-of-scope watch: no live GUI save/load claimed; storage ≠ sidecar (honest Result); no new
   crate; maps not in scope — **guarded**.

---

*Day 63 plan: wire the blueprint store — SQLite persistence (save/load/list). The deciding read:
`blueprint_store.rs` is a COMPLETE SQLite module (open/save/load/load_sha + a passing round-trip `#[test]`
with a `THRAKSHA_BP_IN/OUT` env bridge built for exactly this), NOT a stub — so Day 63 is a clean
wire-existing-storage day: add a `list()` + a `created_at` metadata column, a NEW `store_commands.rs` with
three `#[tauri::command]`s (save_blueprint/load_blueprint/list_blueprints — shell-side SQLite storage, NOT
sidecar invokers, so an honest `Result<T, String>` [storage error = Err; success = Ok(data)], distinct from
the Day-53 SidecarResult which wraps a completed process), registered additively in `lib.rs`
`generate_handler!` (the 5 sidecar invokers + the self-test untouched). No new crate — rusqlite (bundled) +
sha2 + serde_json are already in Cargo.toml (the generator's `deps {}` is a separate, untouched invariant).
The SQLite file lives under `app_data_dir()` (`%APPDATA%/com.thraksha.bedrock`). The wizard gains a Review
"Save project" (save_blueprint on `buildBlueprintChoices`) + a "My projects" list (list_blueprints) +
click-to-load (load_blueprint → a PURE `choicesToSelections` inverse mapper → re-populate) — a thin client,
no generation logic in JS. The load-bearing round-trip is LOSSLESS + NON-MUTATING and provable HERE:
`cargo test` (save→load byte-identical + sha integrity + save-twice) plus the Node bridge — feed the
wizard's TeamTracker BlueprintChoices as `THRAKSHA_BP_IN`, round-trip through a real SQLite file to
`THRAKSHA_BP_OUT`, and prove `export --model <loaded>` == `export --model <pre-save>` byte-identical AND ==
the certified `buildTeamTrackerModel` (a saved+loaded TeamTracker still reproduces the PART-1d baseline).
The Rust gate: `cargo check` clean + `cargo test` + the sidecar self-test lockstep (the bundled node still
reproduces the 103 digests; the SIDECAR_EXIT contract unaffected). Generation untouched: no generator
source change, the frozen backstop byte-identical (103 baked + 10 + non-hash, MAXIMAL `366e19d9…`), git only
`desktop/` + docs, generator `deps {}`, no AI (ADR-001). Honest: commands + cargo check/test + the
round-trip HERE; the live packaged GUI save/load (the on-disk SQLite under the running app) DEFERRED to
Leela's Windows machine — no claimed live persistence run. Day 64 picks up the linked project view (the
maps + export on a SAVED/loaded blueprint). No code this session — this is the day Bedrock starts KEEPING
projects.*
