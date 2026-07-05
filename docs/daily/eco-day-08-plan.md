# Eco-Day 08 — PLAN (Session 1 of 3): Local SQLite store for blueprint/project state

**Phase 0, Day 8. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 8 persists the Project Model / blueprint locally so a developer can **save and reload projects**. The blueprint becomes the *persisted source of truth*, so it must serialize **canonically** and **round-trip byte-identical**, and a saved-then-loaded model must **regenerate the frozen 43+10 byte-identical** — or the determinism story cracks at the persistence layer. This is a Phase-0 foundation, not a feature.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1 hard rules, §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 (the local store is a **shell** concern; the deterministic core stays **pure**; the blueprint hashes stably) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 8 (SQLite store, canonical sorted-key JSON) → [`eco-day-05-report.md`](eco-day-05-report.md) (the sidecar is clean **because** the generator is pure-Node with zero native modules; SQLite is the **first native module** and would complicate the bundle) → the actual model/blueprint shape (done this session).

> **Grounded this session (read the real model):** decisive facts in §1. Preliminary reconnaissance; Session 2 re-derives empirically.

---

## 1. What the model's persistence actually looks like (the facts that decide the fork)

| Fact | Evidence | Consequence |
|---|---|---|
| **A snapshot round-trip already exists** | `getState(): ProjectState` (phaseA + entities + defaultsApplied + style + integrations + description) → `restoreProjectModel(snapshot)` "reproduces that version's output byte-for-byte (ADR-003)"; the day20-regression PART 1e guard already proves `setStyle/setDescription` survive get/set + restore | The **save/load primitive is done** — Day 8 wires a *store* around it, it does not invent round-trip. |
| **`ProjectState` is plain JSON-serialisable data** | the interface is arrays + primitives + small option objects | No custom (de)serialization needed; JSON suffices. |
| **A file-based store precedent exists** | `versioning.ts` `VersionStore` already writes snapshots as `JSON.stringify(record, null, 2)` to disk (no database) | The concept is proven; Day 8 adds a *queryable* store, and is a **new** store (leave `versioning.ts` untouched — out of scope). |
| **Serialization is STABLE-by-construction, NOT sorted-key** | `getState()` builds objects in fixed key order; phaseA via the `PHASE_A_KEYS` canonical loop; but **no recursive sorted-key serializer exists** (grep: the only `.sort()` calls are on file/relPath lists) | Byte-identical round-trip is *already achievable*, but the Month-1 "canonical **sorted-key** JSON" does **not** exist yet — add it (additively, §3). |
| **No "generate from a saved snapshot" production entry** | `restoreProjectModel` is used only in gates/tests; `generate.ts` uses a hardcoded demo; `server.ts` builds via HTTP routes | A tiny **additive bridge entry** is needed so a loaded blueprint can be regenerated (§4). |
| **`desktop/` has no store yet** | grep of `desktop/src-tauri` + `package.json` = no sql/sqlite/db | Clean slate for Option A. |
| **The generator is pure Node, zero native modules** | `dependencies: {}`, no `.node` files (Day 5) | The Day-5 sidecar bundle is clean **because of this** — the fork below must protect it. |

---

## 2. THE STORE-LOCATION DECISION — Option A (shell/Rust side). Recommended, with reasoning.

### Option A — store on the SHELL / Rust side ✅ RECOMMENDED
The desktop shell owns persistence via **Tauri's official SQL plugin** (`tauri-plugin-sql` with the `sqlite` feature; SQLite compiled into the Rust binary via `sqlx`) — or Rust `rusqlite` as an alternative. **The generator stays pure Node — untouched, zero native deps, the Day-5 sidecar bundle exactly as proven.** The generator's job remains "model in → byte-identical code out"; it never owns a database. The shell saves/loads the blueprint (as canonical JSON) and hands it to the sidecar for generation.

### Option B — store on the GENERATOR / Node side (`better-sqlite3`)
Persistence lives in the Node generator. This introduces a **native `.node` module into the generator** — the exact thing that made SEA non-viable and that the Day-5 bundle is clean for avoiding. It would force per-target native binaries into the sidecar bundle **and** mix persistence into the deterministic core (violating architecture §4: "the store is a shell concern; the deterministic core stays pure").

### Recommendation & reasoning (decided by the code, not defaulted)
**Option A.** Three independent reasons, each grounded:
1. **Architecture §4 says so explicitly** — the local store is a shell concern; the core stays pure. Persistence is not a generation concern.
2. **It protects the Day-5 proven asset** — the sidecar works *because* the generator has zero native modules. Tauri's SQL plugin puts SQLite in the **Rust/shell binary** (`desktop.exe`), which the sidecar bundle (`node.exe` + `dist/`+`plugins/` resources) never touches. The Day-5 byte-identical proof stays valid unchanged.
3. **The code already supports it cleanly** — `getState()`/`restoreProjectModel()` give a JSON snapshot in/out; the shell only needs to *store JSON bytes* and hand them back. No generator change is required to persist (only the additive canonical serializer §3 + bridge entry §4, both pure-Node and hash-neutral).

**The honest cost of A** (recorded): SQLite is added to the **shell** build (sqlx/SQLite compiled into `desktop.exe`) — a one-time Rust build-complexity/size cost on Windows-MSVC, and a possible Session-2 hiccup (bundled-SQLite compile). It is **not** a native module in the *generator*, so it does not complicate the sidecar. Acceptable and correct.

---

## 3. Canonical serialization — what exists, what to add (hash-neutral by construction)

- **Exists:** a *stable-by-construction* snapshot — the same model always serializes to the same JSON bytes via `getState()` + `JSON.stringify` (fixed key order + `PHASE_A_KEYS` loop). So a byte-identical round-trip is *already* achievable.
- **Missing:** a **recursive sorted-key canonical serializer** (the Month-1 "canonical sorted-key JSON"). Grep confirms none exists.
- **Add (additive, pure-Node, hash-neutral):** a `canonicalStringify(state)` helper — recursively sort object keys, stable array order, stable number/string formatting — producing canonical blueprint bytes independent of construction order (future-proof + spec-aligned). It is a **pure function, no native dependency**, so it keeps the generator pure-Node.
- **THE KEY DETERMINISM INSIGHT (why sorted-key storage is hash-neutral for generation):** canonical **key order affects only the STORED bytes, never the generated output.** Generation reads the *reconstructed model* — entity and field **arrays** (order preserved by JSON), and phaseA **by known keys** — not the stored JSON's key order. So sorting keys for storage cannot move a generated hash. Session 2 **proves** this (the 43+10 regenerate byte-identical after the round-trip).
- **Scope note:** the new `canonicalStringify` is used by the **new** Day-8 store. Do **not** rewrite `versioning.ts`'s existing serialization (out of scope; and its files aren't part of the frozen 43+10 anyway).

---

## 4. The bridge: "generate from a saved snapshot" (additive, hash-neutral)

The shell→sidecar generate path needs the sidecar to regenerate from a **loaded** blueprint. No such entry exists. Add a **tiny additive Node entry** (e.g. `generate-from-snapshot.ts`): read a snapshot JSON (stdin or arg) → `restoreProjectModel` → `buildFileSet` → emit its digest (and/or write to an explicit **writable** out dir — never the read-only resource dir, per the Day-5 flag). 
- **Additive + hash-neutral:** a new entry that only *calls existing* generation logic; it changes no generation code. Session 2 proves the 43+10 regenerate byte-identical through it, and that `day20:regress` stays green.
- This is the natural bridge for Option A: shell stores blueprint → loads → hands snapshot to the sidecar → sidecar regenerates via this entry.

---

## 5. SESSION 2 (EXECUTE) — done-conditions

Put at the top of the Session-2 prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### DC-1 — Wire the store on the shell side (Option A); generator stays pure-Node
- Add Tauri SQL plugin (`tauri-plugin-sql` + `sqlite`, and the JS binding) to `desktop/` — **not** `generator/`. Define a minimal schema (e.g. `blueprints(id, name, canonical_json, sha256, created_at)`). No UI (plumbing only).
- **Verify the generator remains pure-Node** — no native module added to `generator/` (`dependencies` still `{}`, no `.node` in `generator/node_modules`).

### DC-2 — Add the canonical serializer + the bridge entry (both additive, proven hash-neutral)
- Add `canonicalStringify` (pure, sorted-key) + `generate-from-snapshot` entry (§3, §4).
- **Prove hash-neutral:** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS, 43+10+MAXIMAL byte-identical (the additive pieces move no hash).

### DC-3 — Round-trip byte-identical (the persistence proof)
- Take a known blueprint (e.g. a matrix cell or the `maxcell-fixture`), `getState()` → `canonicalStringify` → **store in SQLite** → **load** → **byte-identical** canonical JSON (and identical sha256). **Save twice → identical** (idempotent). Confirm the round-trip preserves entity/field order.

### DC-4 — THE LOAD-BEARING GATE: saved → loaded → generated byte-identical to the frozen 43+10
- Load a stored blueprint → `restoreProjectModel` → `buildFileSet` (via the bridge entry) → **hash == its frozen value**. Do this for a representative subset (ideally drive several matrix cells + the maximal cell through store→load→generate). **Persistence must not perturb generation.** If any regenerated hash differs from frozen → **STOP**: the finding is that persistence/canonicalization perturbed generation (diagnose at the byte level; do not smooth).

### DC-5 — The Day-5 sidecar is still byte-identical; determinism intact
- **Option A confirmation:** the store is a separate shell concern; the sidecar bundle is unchanged — re-run the Day-5 proof (at minimum the DC-1 standalone relocated bundle; ideally the packaged spawn) → 44 digests byte-identical. *(If the shell now also does store→load→sidecar end-to-end, prove that path regenerates byte-identical too.)*
- **generator/ determinism intact** — `day20:regress` green; **no frozen hash moved**; generator still pure-Node.

**Session 2 scope guard:** no real wizard UI/forms (save/load plumbing only); no new stacks/types/integrations/features; no signing; no macOS/Linux builds; **do not add a native module to the generator** (Option A keeps it pure-Node); **do not move any frozen hash** (the canonical serializer + bridge are additive/hash-neutral — prove it); leave `versioning.ts` untouched. No report file (Session 3 writes it).

---

## 6. SESSION 3 (REPORT) — done-conditions

Session 3 writes [`eco-day-08-report.md`](eco-day-08-report.md):
- **Re-confirm from clean:** `day20:regress` green (43+10+MAXIMAL byte-identical); generator pure-Node preserved.
- **The store-location decision + reasoning** (Option A; why not B — protecting the Day-5 sidecar + architecture §4).
- **The canonical serialization state** — that stable-by-construction already existed, and the sorted-key `canonicalStringify` added (additive, hash-neutral), with the "key order ≠ generation" insight.
- **The byte-identical round-trip proof** (DC-3) and **the saved→loaded→generated byte-identical gate** (DC-4).
- **Sidecar-still-clean confirmation** (DC-5) — the pure-Node bundle is unchanged; Day-5 proof holds.
- **Verdict line:** "The blueprint persists locally (shell-side SQLite), round-trips byte-identical (canonical JSON), and a saved→loaded blueprint regenerates the frozen 43+10 byte-identical; the generator stays pure-Node and the Day-5 sidecar is unchanged; Day 8 done." — or the honest finding if round-trip/regeneration wasn't byte-identical.
- **Forward-flags:** the resources-are-copies refresh flag (Day 5) still open; installer size; the shell now carries SQLite (a Rust build cost); macOS/Linux deferred; standing flags (no git; CLAUDE.md/.gitattributes needed Day 9; cross-OS proof not yet in CI; generated-project toolchain pins). **Day 9 = CLAUDE.md + hooks + determinism CI; Day 10 = the Phase-0 benchmark.**

---

## 7. SCOPE GUARD — OUT for Day 8
- **No real wizard UI / forms** — persistence plumbing only (save/load a model, not a UI to edit it).
- **No new stacks/types/integrations/features.**
- **No signing** (Phase 4); **no macOS/Linux builds.**
- **Do NOT introduce a native module into the GENERATOR** unless Option B is deliberately chosen with justification (recommendation is A — keep the generator pure-Node).
- **Do NOT move any frozen hash.** The canonical serializer + bridge entry, if added, are additive and **proven** hash-neutral.
- Leave `versioning.ts` (the existing file store) untouched.

---

## 8. Pre-flight checklist (GUARDRAILS §6) — for Session 2
1. Read guardrails + ecosystem §4 + Month-1 Day 8 + eco-day-05 report + the real model? — ✅ (this session).
2. Which session, only its job? — Session 2 = EXECUTE (store on the shell, canonical serializer + bridge, the round-trip + regeneration gates). No report; no features.
3. Which frozen baselines must NOT move? — the **43 + 10** (+ MAXIMAL). Persistence + canonicalization are additive/hash-neutral; DC-2/DC-4 prove it.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — the store is additive; the generator's generation path is unchanged (a saved model regenerates the same bytes).
6. Three killers checked? — determinism is the gate (round-trip + regeneration byte-identical); canonical key order is proven not to reach generation.
7. A gate that can actually FAIL? — **YES: DC-3 round-trip byte-identity, DC-4 saved→loaded→generated == frozen, DC-2/DC-5 day20:regress green.** A divergence is the finding.
8. Overclaim / scope drift? — the live risks are (i) adding a native module to the generator (keep it pure-Node — Option A), (ii) building a UI (plumbing only), (iii) letting canonicalization perturb generation (DC-4 forbids it) — §7 guards all three.

---

*Day 8 gives the blueprint a home without touching the deterministic core. The store lives on the shell side (Tauri SQL / Rust SQLite) precisely to keep the generator pure-Node and the Day-5 sidecar bundle exactly as proven — SQLite, the first native module, goes into the shell binary, never the generator. The save/load primitive already exists (`getState`/`restoreProjectModel`); Day 8 wraps it in a store, adds a sorted-key canonical serializer (additive, hash-neutral — key order never reaches generation), and proves the load-bearing gate: a blueprint saved → loaded → regenerated is byte-identical to the frozen 43+10. If it isn't, that's the finding. The thesis governs; the core stays pure.*
