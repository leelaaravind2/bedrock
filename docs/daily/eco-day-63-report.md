# Eco-Day 63 — REPORT: WIRE THE BLUEPRINT STORE — SQLite persistence (save / load / list)

**Day 63 — the sensation push (Days 61–70).** Bedrock now **keeps projects**: the shell-side SQLite
blueprint store ([`blueprint_store.rs`](../../desktop/src-tauri/src/blueprint_store.rs), since Day 8) is
exposed as **save / load / list Tauri commands**, and the wizard can save its blueprint and load saved ones
back. **SHELL-ONLY over the CERTIFIED engine — the store is shell-side SQLite; it does NOT touch the
generator.** This was the **first Rust change since Day 52**, so the gate ran `cargo check` + `cargo test` +
the sidecar self-test lockstep — all green.

**Backstop byte-identical from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked + 10 TeamTracker + non-hash (PART 1c–1x), MAXIMAL `366e19d9…` — no frozen hash
moved.** `git status` → only `desktop/` + docs; **`generator/` untouched**; **Cargo.toml unmodified (no new
crate)**; generator `deps {}`.

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 1. `blueprint_store.rs` as found + what was added (DC-1)

**As found: a COMPLETE SQLite module, NOT a stub** — `open` (schema + the `blueprints` table),
`save(name, json) → id`, `load(id) → json`, `load_sha`, sha256 integrity, and a passing round-trip
`#[test]` with a `THRAKSHA_BP_IN/OUT` env bridge built for exactly this end-to-end proof.

**Added (Day 63), staying Tauri-free / unit-testable:**
- **`created_at`** column (`TEXT NOT NULL DEFAULT (datetime('now'))`) — **shell storage metadata for the
  picker ONLY**: SQLite-generated, never supplied by the caller, **outside the `canonical_json` and outside
  the generation path** — so it is **not a determinism vector** (the blueprint round-trips byte-identical
  regardless). **A timestamp never enters the blueprint JSON.**
- **`list() → Vec<BlueprintMeta>`** (`{ id, name, created_at }`, newest first) — metadata only, never the
  blueprint bytes. `BlueprintMeta` derives `serde::Serialize` (serde is a non-Tauri crate) so a command can
  return it while the module stays Tauri-free.
- The round-trip `#[test]` extended with a `list()` assertion (count, newest-first, `created_at` present).
- **Migration caveat (honest):** `CREATE TABLE IF NOT EXISTS` won't add `created_at` to a pre-existing
  table; Bedrock is **pre-release (no shipped DBs)**, so a fresh schema is correct (a later `ALTER TABLE`
  is a v0.2 concern).

## 2. The store commands (DC-2) — shell-side, separate, honest Result

**A NEW module** [`store_commands.rs`](../../desktop/src-tauri/src/store_commands.rs), kept **separate from
`commands.rs`** so the distinction is structural — `commands.rs` = sidecar thin-invokers; `store_commands.rs`
= shell-side in-proc SQLite storage:

| `#[tauri::command]` | JS invoke | Returns |
|---|---|---|
| `save_blueprint(app, name, model_json)` | `invoke('save_blueprint', { name, modelJson })` | `Result<i64, String>` (row id) |
| `load_blueprint(app, id)` | `invoke('load_blueprint', { id })` | `Result<String, String>` (canonical JSON) |
| `list_blueprints(app)` | `invoke('list_blueprints')` | `Result<Vec<BlueprintMeta>, String>` |

- **Honest Result shape — `Result<T, String>`, NOT `SidecarResult`:** these are in-proc DB calls, not a
  sidecar process spawn — there is **no exit code** for a SQLite call, so the Day-53
  `SidecarResult { stdout, stderr, exit_code }` would be dishonest. A storage error = `Err`; success =
  `Ok(data)`.
- Each command resolves `app.path().app_data_dir()` (→ **`%APPDATA%/com.thraksha.bedrock/
  bedrock-blueprints.sqlite`** on Windows), creates the dir on first use, opens the store, runs the op,
  maps `rusqlite::Error → String`. **No generation logic.**
- **`lib.rs`:** `pub mod store_commands;` + the 3 commands appended to `generate_handler!` — **additive**;
  the 5 sidecar invokers + the `setup()` self-test are **untouched**.
- **No new crate:** `rusqlite` (bundled) + `sha2` + `serde_json` + `serde` were already in Cargo.toml —
  **Cargo.toml unmodified**.

## 3. The wizard save/load UI (DC-3, thin client)

[`index.html`](../../desktop/src/index.html) + [`main.js`](../../desktop/src/main.js):
- **Save (Review):** a **"Save project"** button → `invoke('save_blueprint', { name, modelJson:
  JSON.stringify(buildBlueprintChoices(selections)) })` → "Saved as #N".
- **My projects (a card):** `invoke('list_blueprints')` renders the saved list (name · #id · created_at);
  clicking one → `invoke('load_blueprint', { id })` → parse → **re-populate** the wizard via a **PURE
  inverse mapper** `choicesToSelections(choices)` in `wizard-choices.js` (settings spread + entities;
  `validation.{precision,scale}` → the field's precision/scale) — thin **data mapping**, NOT generation
  logic → jump to Review.
- **THIN CLIENT:** the wizard only collects + invokes + renders; `buildBlueprintChoices` /
  `choicesToSelections` are pure serializer/deserializer. No generation logic in JS.

## 4. THE ROUND-TRIP (DC-4, load-bearing) — LOSSLESS + NON-MUTATING

Proven HERE via `cargo test` + the `THRAKSHA_BP_IN/OUT` bridge, driven with the **wizard's TeamTracker**
`BlueprintChoices`:

- **(a) Lossless (save→load byte-identical):** `cargo test blueprint_round_trips_byte_identical` passes
  (`load(save(json)) == json` + sha256 integrity + save-twice + `list()`); and end-to-end, the bytes
  round-tripped through a **real on-disk SQLite file** are `cmp`-identical to the input
  (`SQLite save→load: BYTE-IDENTICAL`).
- **(b) Non-mutating (loaded → generate == pre-save == certified):**

  ```
  save→load NON-MUTATING: export(pre-save) == export(loaded) == certified buildTeamTrackerModel
      pre  = 9e01210c55a5a0a6…
      post = 9e01210c55a5a0a6…  (loaded from SQLite)
      cert = 9e01210c55a5a0a6…  (PART-1d source)
  ```

  A saved+loaded TeamTracker generates **byte-identical to pre-save AND to the certified
  `buildTeamTrackerModel`** (the source of the 10 frozen PART-1d relationship baselines). **The store
  neither corrupts, reorders, nor re-encodes the blueprint.**

## 5. The Rust gate + generation untouched (DC-5)

- **`cargo check`** → Finished, 0 warnings. **`cargo test`** → the store round-trip green.
- **The sidecar self-test lockstep:** the additive commands don't touch `run_sidecar`/`setup()` — the
  **bundled node reproduces the 103 frozen digests byte-identical** to the certified generator
  (`sync-gen:check` OK, `c43773ae…`); the `SIDECAR_EXIT {:?}` header (unchanged from Day 53) still prints
  `Some(0)` on success.
- **Backstop byte-identical (from clean):** 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9deda1caf`.
- **git scope:** only `blueprint_store.rs`, `lib.rs`, `store_commands.rs` (new), `index.html`, `main.js`,
  `wizard-choices.js` + docs. **`generator/` untouched.** **Cargo.toml unmodified.** Generator `deps {}`.

## 6. Verification + the honest split (DC-6)

**Verified HERE:** `cargo check` + `cargo test`; the round-trip proof (§4); `node --check` on both JS
modules; a **static browser preview** — zero console errors, the **My projects card** renders with its
no-backend guard ("open inside Bedrock to see saved projects"), the **Review "Save project" button**
present.

**DEFERRED (Leela's Windows machine — honest-manual):** the **live packaged GUI save/load** — clicking
"Save project" in the running Bedrock window, the SQLite file materializing under `%APPDATA%`, loading it
back through the WebView. Needs the Tauri backend (no GUI session here). **No claimed live persistence run.**

## 7. Forward-flags

| # | Item | Status |
|---|---|---|
| — | **Blueprint store wired** (save/load/list; lossless non-mutating round-trip incl. certified TeamTracker) | **DONE (build-here)** |
| 1 | **Day 64 — the linked project view** — flow-map + impact + export on a SAVED/loaded blueprint | NEXT |
| 2 | **Days 65–67 — the visual/interactive Map** (the sensation) | Phase B |
| 3 | **Live packaged GUI save/load** (SQLite under `%APPDATA%`) | Leela's Windows machine |
| 4 | Store UX refinements — upsert-by-id / rename / delete; the `ALTER TABLE` migration | later |
| 5 | The 4 Store steps (MakeAppx wrap → packaged launch → name reservation → submission) | Leela's Windows/Store machine |

---

*Day 63 wired the blueprint store — SQLite persistence (save/load/list), SHELL-ONLY over the certified
engine. `blueprint_store.rs` was found a COMPLETE module (open/save/load/load_sha + a passing round-trip
`#[test]` with a `THRAKSHA_BP_IN/OUT` bridge), so the day added only a `list()` + a `created_at` metadata
column (SQLite-generated picker metadata — outside the blueprint JSON and the generation path, never a
determinism vector) while keeping the module Tauri-free. A NEW `store_commands.rs` (separate from the
sidecar `commands.rs`) exposes save_blueprint/load_blueprint/list_blueprints as `#[tauri::command]`s with an
HONEST `Result<T, String>` (in-proc SQLite storage — deliberately NOT the Day-53 SidecarResult, which wraps
a completed process; there is no exit code for a DB call), registered additively in `lib.rs`
`generate_handler!` (the 5 sidecar invokers + the self-test untouched); the SQLite file lives under
`app_data_dir()` (`%APPDATA%/com.thraksha.bedrock`). No new crate — rusqlite (bundled) + sha2 + serde_json +
serde were already present (Cargo.toml unmodified; the generator's `deps {}` is a separate, untouched
invariant). The wizard gained a Review "Save project" + a "My projects" list with click-to-load
(load_blueprint → a PURE `choicesToSelections` inverse mapper → re-populate) — a thin client, no generation
logic in JS. The load-bearing round-trip is LOSSLESS + NON-MUTATING and proven HERE: `cargo test` +
end-to-end, the wizard's TeamTracker round-tripped through a real on-disk SQLite file is byte-identical
(save→load), and `export --model <loaded>` == `export --model <pre-save>` == the certified
`buildTeamTrackerModel` (all `9e01210c…`) — a saved+loaded TeamTracker still reproduces the PART-1d
baseline. The Rust gate: `cargo check` clean + `cargo test` + the sidecar self-test lockstep (the bundled
node reproduces the 103 digests; the `SIDECAR_EXIT` header unchanged). Generation untouched: the frozen
backstop byte-identical from clean (194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…`), git only `desktop/` +
docs, `generator/` untouched, Cargo.toml unmodified, generator `deps {}`, no AI (ADR-001). Verified HERE:
cargo check/test + the round-trip + `node --check` + a static preview (the My projects card, the guard, the
Save button, zero console errors); the live packaged GUI save/load DEFERRED to Leela's Windows machine (no
claimed live persistence run). Day 64 picks up the linked project view — the maps + export on a SAVED/loaded
blueprint.*
