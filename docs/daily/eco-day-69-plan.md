# Eco-Day 69 — PLAN: THE FINAL PACKAGED RE-CERTIFICATION (the end-user Bedrock system)

**Day 69 — Phase C, TRUST (Days 61–70). VERIFY + CERTIFY, NOT BUILD.** Day 58 certified the ENGINE +
the packaged shell (a command harness). Days 61–68 built the actual **PRODUCT** (wizard → store → the
maps → Verify → export). **Day 69 certifies the whole END-USER system, packaged** — the extension's
analogue of Day 58. Everything was built 61–68; Day 69 **verifies + certifies + settles the
honest-manual ledger.** It mirrors the [Day-58 report](eco-day-58-report.md) format.

**This session is PLAN ONLY. No code, no product builds.** (The live gate enumeration below was run
read-only to make the plan concrete — no source changed.)

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

**The day has TWO HALVES, both scoped explicitly:**
- **HALF A — what the SHELL can prove** (automated; this session's execute).
- **HALF B — what only LEELA can prove** (the live packaged GUI runs; the honest-manual ledger, finally
  settled — an ordered 8-item checklist she runs on her Windows machine).

---

## 0. THE REAL GATE SET — enumerated LIVE this session (the accounting Day 69 must reproduce)

`npm run day20:regress` → **PASS, 203 OK / 0 FAIL**. `--emit-digests` → **103 DIGEST lines**. MAXIMAL
`366e19d9deda1caf`. The full PART set is **1a → 1z** (the extension added **1y** + **1z**):

### The baked accounting (unchanged from Day 58 — the extension baked NOTHING)
- **103 baked digests = 43 frozen + 60 additive:**
  - **43 frozen** = 20 web-app matrix **[1a]** + 23 alt (naming 5 + formatting 2 + simple 4 +
    composition 2 + api-only 6 + email 2 + ai-hook 2) **[1b]**.
  - **60 additive** = MAXIMAL 1 **[1f]** + version 5 **[1g]** + slots 1 **[1k]** + has-many 10 **[1m]**
    + decimal 10 **[1n]** + field-key 5 **[1o]** + Figma 1 **[1p]** + worker 10 **[1q]** +
    CLI/GraphQL/static 11 **[1r]** + CI/CD 5 **[1s]** + security 1 **[1u]**.
  - `1 + 5 + 1 + 10 + 10 + 5 + 1 + 10 + 11 + 5 + 1 = 60`; `43 + 60 = 103`. ✓
- **+ 10 TeamTracker** relationship hashes **[1d]** (UI==CLI via `addEntity`).
- **+ non-hash gates:** 1c / 1e / 1h / 1i / 1j / 1l / 1t / 1v / 1w / 1x **and now 1y / 1z**.

### The 194 → 203 OK reconciliation (the extension's ONLY gate delta)
- Day 58 = **194 OK**. The extension added exactly **+9 non-hash OK checks**:
  - **PART 1y — the visual Map** (`renderFlowSvg`, Day 65) = **4 OK**: deterministic (twice) +
    deterministic fresh-process (CLI == in-process) + faithful (drawn `data-node-id`/`data-edge` sets
    one-to-one with `buildFlowMap`, `16n/17e`) + integration literal-bypass.
  - **PART 1z — the interactive impact Map** (impacted nodes, Day 66) = **5 OK**: deterministic (twice)
    + deterministic fresh-process + attribution TOTAL+DISJOINT (each entity's files == its own
    `generateEntity` emit, `entities=4, appFiles=27`) + faithful vs previewed==real (`impacted=[app,
    entity:Ticket], changed=4`) + empty bypass (`{current, current}` ⇒ 0 nodes/0 edges).
  - `194 + 4 + 5 = 203`. ✓ **Both PARTs are NON-HASH — 103 stays 103** (Days 65/66 added generator
    FILES only; Days 61–64, 67, 68 were shell/UI). No frozen hash moved by the entire extension.

### The current sync-gen stamp (payload growth — NOT a hash move)
- `src-tauri/resources/gen/REFRESH-STAMP.json` → **`83ffd0ad4683920ed9b26fbf743bf650bd20af1b5f32cd376488573212cf3055`, 245 files.**
- Lineage (all legitimate payload growth): Day 58 `c43773ae` **[237]** → +`dist/flow-svg.js` +
  `dist/map/flow-svg.js` (Day 65) → `550395db` **[241]** → +`dist/impact-nodes.js` +
  `dist/map/impact-nodes.js` (Day 66) → **`83ffd0ad` [245]** (current).
- **The load-bearing claim is NOT the stamp** (it's a content hash of a GROWN payload — expected to
  change). It is: **the bundled node reproduces the 103 FROZEN DIGESTS byte-identical** (packaged ==
  certified). A changed stamp is payload tracking; a moved digest would be a FINDING.

### The command surface (registered in `lib.rs` `invoke_handler`) — **10 commands**
- **5 Day-52 thin invokers:** `detect_toolchains`, `export_project`, `flow_map`, `impact_preview`,
  `scan_project`.
- **+ `flow_svg`** (Day 65) **+ `impact_nodes`** (Day 66).
- **+ 3 store commands** (Day 63): `save_blueprint`, `load_blueprint`, `list_blueprints`.

---

## 1. THE SPINE (design invariants for the execute session)

1. **VERIFY + CERTIFY, NOT BUILD.** No new features. The only permissible new artifact is documentation
   + (optionally) re-running existing benchmark drivers. **No generator change.** A moved BAKED hash =
   FINDING, STOP.
2. **THE PACKAGED PATH IS LOAD-BEARING.** The bundled node (with the extension's new entries)
   reproduces the 103 frozen digests byte-identical ⇒ the PACKAGED generator == the certified
   generator. The stamp changed legitimately (`c43773ae`→`83ffd0ad`); the digests must not.
3. **THE EXTENSION MOVED NO FROZEN HASH.** 61–68 were shell/UI + read-only projections (new generator
   FILES only on 65/66). Prove: 103 baked + 10 + MAXIMAL `366e19d9` byte-identical from clean; PART
   1w/1x unchanged; 1y/1z green and non-hash.
4. **HALF B IS LEELA'S, AND IS NOT CLAIMED BY THE SHELL.** The execute session produces the checklist
   and records ONLY the results Leela supplies. If unrun, the report says **PENDING** plainly, and Day
   70 carries them. **NEVER claim a live GUI run.**
5. **CARRY THE COMPLETE BOUNDARY LEDGER FORWARD** (Day-58's, updated — §5), each boundary with its
   proof location and its honest level.

---

## 2. HALF A — THE AUTOMATED CERTIFICATION (execute DCs)

### DC-A1 — The full backstop from clean, REAL gate accounting
`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 203 OK / 0 FAIL**;
`--emit-digests` → **103 DIGEST lines**. Enumerate live and reconcile against §0: 103 baked (43 frozen
+ 60 additive) + 10 TeamTracker + non-hash 1c–1z; MAXIMAL `366e19d9deda1caf` **UNMOVED**; **PART 1w/1x
unchanged**; **PART 1y/1z green and non-hash** (the +9). No frozen hash moved.

### DC-A2 — The packaged-path re-certification (load-bearing)
1. `cd desktop && npm run sync-gen:check` → **OK — `resources/gen` == the certified generator
   byte-for-byte**; record the CURRENT stamp (`83ffd0ad…`, 245 files) and note the legitimate growth
   vs Day-58 (`c43773ae`, 237).
2. The **bundled node** (`binaries/node-<triple>.exe`) run against
   `resources/gen/dist/day20-regression.js --emit-digests` → **103 DIGEST lines**; **`cmp` against the
   certified system-node emission → BYTE-IDENTICAL (empty diff)**.
   → **The PACKAGED generator == the certified generator.** The stamp's growth (new `dist` entries) is
   distinguished, in words, from a digest move (which would be a FINDING).

### DC-A3 — The shell compiles + the command surface + the self-test lockstep
- `export PATH="$HOME/.cargo/bin:$PATH"` first. `cargo check` clean; `cargo test` (the
  `blueprint_store` round-trip) green; the **sidecar self-test lockstep** (the `SIDECAR_EXIT` contract,
  Day 53) green.
- The **10-command surface** (§0) registered in `lib.rs` + compiling; the `setup()` self-test
  untouched. Confirm the shell is a thin invoker (`commands.rs`/`store_commands.rs`/`main.js` carry 0
  generation logic — grep for `buildFileSet`/`assembleBlueprint`/`generate`/`reindent` → empty).

### DC-A4 — The composition benchmarks + the END-USER path proofs (re-run existing surfaces)
- **Benchmarks** (existing drivers; no generation change): `bench:phase1` / `bench:phase2` /
  `bench:phase3` / `bench:phase4-mid` / `bench:export` — each at its honest level (the Day-58 75/75
  shape; record the actual pass counts live).
- **The end-user path, headlessly (re-run the existing proofs, don't reinvent):**
  - **UI==CLI** — `buildBlueprintChoices` → the CLI `--model` path byte-identical, **incl. the
    certified TeamTracker** (Day 61/62, PART 1d).
  - **The store round-trip** — lossless + non-mutating (Day 63; `cargo test`).
  - **previewed==real** — a wizard edit's preview == the real on-disk delta (Day 64, PART 1w).
  - **The visual Map** — deterministic + faithful (PART 1y).
  - **The impacted nodes** — faithful vs previewed==real (PART 1z).
  - **Verify** — `{current: M, proposed: M}` ⇒ empty (the PART 1z-C empty bypass, the Day-68 surface).

### DC-A5 — A packaged tauri build IF cheap; else honest-manual
- **Attempt** `tauri build --bundles msi nsis` with the current shell **only if it completes cheaply**
  (WiX/NSIS cached — Day 55/65 precedent). PASS = the **Bedrock-identity** artifacts (`productName:
  Bedrock`, `identifier: com.thraksha.bedrock`) + the **certified sidecar** (with the new `flow-svg`/
  `impact-nodes` entries) staged.
- **If it needs heavy downloads / disk (C: is tight): STOP the attempt and mark it honest-manual — do
  NOT force it.** Record which path was taken. The packaged-path determinism proof (DC-A2) stands
  regardless — it does not depend on producing the installer.

### DC-A6 — Invariants + the ADR-001 sweep
- **Generator pure-Node:** `dependencies: {}`, **0 native modules** (SQLite is shell-side only).
- **No AI in the product (ADR-001 sweep):** `src/core/` + `src/plugins/` import **0** refs to `fill/`
  or the scan AI edge (grep-empty); the only AI is the **detachable, developer-keyed advisory edges**
  (fill Day-23, scan Day-45) + the **dev-time Fable-5 pass** (Day-53/68 code review, hand-applied) —
  **neither in generation nor shipped.**
- **The shell is a thin client/display:** the maps/Verify are **engine-computed; JS/Rust only paint**
  (`main.js` inserts the certified SVG, toggles classes from the engine's impacted-id set, and checks
  the engine's structured Verify result against empty — it computes no diff/layout).
- **NO frozen hash moved by the entire extension (61–68).**

---

## 3. HALF B — THE LIVE PACKAGED-GUI CHECKLIST (Leela's Windows machine — the honest-manual ledger, SETTLED)

Every Day-61..68 report deferred the LIVE packaged GUI runs (no GUI session in this shell). **Day 69 is
where they get RUN — by Leela.** The execute session DELIVERS this ordered checklist and records ONLY
the results she supplies. **Each item = what to click · what a PASS looks like · what a FAILURE means.**
Any FAIL = a FINDING, reported honestly, NOT papered over. **The execute session must NOT claim any live
run.** If unrun at report time → **PENDING**, and Day 70 carries them.

| # | Action (what to click) | PASS looks like | A FAILURE would mean |
|---|---|---|---|
| **1. LAUNCH** | Open the packaged Bedrock (the msi/nsis-installed app; or `tauri dev` if the packaged build is unavailable — **state which**). | The Bedrock window opens; the header reads "Bedrock"; status shows the wizard ready. | The packaged sidecar/resource path is broken (the class of bug that only appears packaged, per desktop/CLAUDE.md). |
| **2. WIZARD → GENERATE** | Walk the wizard (name → project type → backend → frontend → database → auth → data model: add an entity + a field + a relationship, **or** load the TeamTracker preset) → Generate/Export to a folder. | A real project tree on disk at the target folder; the engine's success stdout **+ the standalone-export note** rendered (Day 68). | The sidecar didn't spawn, or the `--model` path failed — the raw error must appear in "Technical details" (Day 68), never swallowed. |
| **3. SAVE + LIST + LOAD** | "Save project" → confirm it appears in **My projects** → click it to load → the wizard repopulates. | The SQLite file materializes at `%APPDATA%/com.thraksha.bedrock/bedrock-blueprints.sqlite`; the loaded blueprint matches what was saved (Day 63 lossless round-trip). | The store path/permissions failed, or the round-trip is lossy (a real Day-63 regression). |
| **4. VIEW DIAGRAM** | Project view → **View diagram**. | The certified SVG renders in the window — boxes + arrows for the **user's own** entities (Day 65). | The `flow_svg` command or the thin-display insertion path broke. |
| **5. PREVIEW IMPACT (the sensation)** | Load a saved project → edit it (add a field) → **Preview impact of edits**. | The certified **text delta** renders **AND** the diagram highlights **exactly** the impacted nodes (the entity + app) — Day 66. | A mismatch between the text delta and the highlight would break previewed==real / the faithful attribution (a PART 1w/1z finding). |
| **6. COMPARE VERSIONS (the diff Map)** | Save two versions → **Compare A → B**. | B's diagram is painted with the delta; a **deleted** entity (removed in B) appears in the **TEXT delta** with **no ghost node** on the diagram (Day 67). | A ghost node for a deleted entity, or a JS-computed diff, would violate the Day-67 thin-client rule. |
| **7. VERIFY DETERMINISM** | Project view → **Verify determinism**. | **"Verified — byte-identical"** — a REAL double-generation through the **packaged sidecar** (M-vs-M ⇒ empty), Day 68. | A **non-empty** result = a GENUINE FINDING (the packaged sidecar is nondeterministic) — **report it, do not hide it.** |
| **8. FRIENDLY ERRORS** | Paste a bad value (not JSON, not a path) into the Advanced `--model` box → run. Then, if convenient, force a real engine error. | The **validation hint fires and NO invoke happens** (the Day-68 pre-invoke fix); a forced engine error shows a **human header + the raw stack reachable in "Technical details"**. | An un-validated bad input reaching the sidecar (the ENOENT reappears), or a swallowed/re-worded error, would be a Day-68 regression. |

**Reporting:** each item → Leela reports **PASS/FAIL + a screenshot where useful**. The report records
those results verbatim; unrun items are **PENDING** (an honest answer), carried to Day 70.

---

## 4. THE CERTIFICATION TABLE — shape (each end-user capability at its PROVEN level + proof location)

The execute/report session fills this (mirroring Day-58 §2), each row at its proven level:

| Capability | Proven level | Proof location |
|---|---|---|
| **Wizard / UI==CLI** — collected choices → the CLI `--model` byte-identical | Structural (UI==CLI byte-identical), incl. **certified TeamTracker** | Days 61/62; PART 1d; DC-A4 |
| **Data model** — entities/fields/relationships, has-many explicit | UI==CLI byte-identical (10 relationship hashes) | Day 62; PART 1d/1m; DC-A4 |
| **The blueprint store** — save/list/load | Lossless + non-mutating round-trip (SQLite, shell-side) | Day 63; `cargo test`; DC-A3/A4 |
| **The linked project view** — previewed == real, byte-for-byte | CI-proven exact | Day 64; PART 1w; DC-A1/A4 |
| **The visual Map** — `renderFlowSvg`, deterministic + faithful | Deterministic (incl. fresh-process) + faithful (one-to-one with `buildFlowMap`) | Day 65; **PART 1y**; DC-A1 |
| **The interactive impact Map** — impacted nodes | Deterministic + total/disjoint attribution + faithful vs previewed==real + empty bypass | Day 66; **PART 1z**; DC-A1 |
| **The diff Map** — two saved blueprints; no ghost nodes | Thin-client (engine computes the delta; JS only paints) | Day 67; PART 1w/1z reused; DC-A4 |
| **The trust surfaces** — friendly errors + pre-invoke validation + the REAL Verify + the standalone-export note | Verify = **reproducibility** (M-vs-M ⇒ empty), NOT correctness/security; friendly ≠ hiding (raw always reachable); Law 21 at its proven level (static, PART 1t) | Day 68; PART 1z-C / 1t; DC-A4 |
| **The packaged path** — the sidecar == the certified generator | The bundled node reproduces the 103 frozen digests byte-identical | Days 51/58/**69**; **DC-A2** |
| **The full frozen backstop** (Day-29-recertified) | 103 baked + 10 TeamTracker + non-hash 1c–1z, byte-identical | **DC-A1** (203 OK / 0 FAIL) |

---

## 5. THE COMPLETE BOUNDARY LEDGER (Day-58's, carried forward + UPDATED)

- **Verification levels (the stacks):** **Express runtime/booted**; **FastAPI/Django syntax-level**;
  **Go/Spring generation-only** (no Go/Java toolchain here). Benchmarks verify the generated output for
  all 5 in-process.
- **Verify (Day 68) proves REPRODUCIBILITY, not correctness/security** — a pure function of the
  blueprint (byte-identity), nothing more. State this explicitly on the Verify row.
- **The visual Map's granularity boundary (NEW — Day 65/66):** the highlight is **entity / app / edges**
  only — there is **NO per-lifecycle-layer highlight** (it would be uncertifiable without a heuristic;
  the attribution is the emitters' OWN per-entity file set, PART 1z total/disjoint).
- **The store-backed picker — NOW DONE (UPDATE Day-58's "deferred"):** Day 63 shipped the SQLite
  save/list/load commands + the wizard's My-projects picker. (The Day-58 ledger listed it deferred.)
- **Exporter / Law 21:** the **static + require-graph standalone** proof passes (PART 1t); the **live
  `docker compose up` container boot is DEFERRED** (Docker daemon down — honest-manual, never claimed).
- **Security:** the deterministic **Semgrep** scan is **CI/Linux-only** (Semgrep's native core doesn't
  run on this Windows shell); the **AI-advisory scan + creative fill** are pure-core CI-proven with FAKE
  suggesters; **live AI is developer-keyed and DEFERRED**.
- **Figma:** ingestion core CI-proven (fixture, PART 1p); the **Figma-plugin edge honest-manual**.
  **static+API is Spring-centric**; **GitLab CI is a staged 2nd provider**.
- **The packaged / Store path (Leela's Windows/Store machine — honest-manual, NOT claimed):** the live
  packaged GUI run-through (**Half B**, this day); the **MakeAppx MSIX wrap** (Windows SDK not on this
  shell; manifest + recipe authored Day 55); the **"Bedrock" name reservation — NOT reserved** (common
  word; a variant prepared); the **Store submission** (Microsoft signs at certification). **The 4 Store
  steps** (MakeAppx wrap → packaged launch → Bedrock name reservation → Store submission) remain
  Leela's.
- **Cross-OS:** generation determinism is OS-independent by construction (LF-only; sorted walk; the
  digest forward-slashes `relPath`) and **CI-enforced across ubuntu/windows/macos** for *generation*;
  the **desktop BUILD is Windows-only** (macOS/Linux Tauri build deferred).
- **Carried Phase-1/2/3 boundaries:** no live DB boot (Docker down); the **Day-29 re-baseline** (MAXIMAL
  `366e19d9`) stands (documented old→new, isolated); `detect_toolchains` is a shell-out to the certified
  probe; the `tauri.conf.json` CRLF git-normalization is shell config, not generator output.

---

## 6. EXECUTE done-conditions

1. **HALF A — full backstop from clean:** `rm -rf dist && npm run build && npm run day20:regress` →
   PASS; the real gate set byte-identical (103 baked + 10 + non-hash 1c–1z; **203 OK**); MAXIMAL
   `366e19d9` UNMOVED; PART 1w/1x unchanged; PART 1y/1z green (the +9).
2. **HALF A — packaged-path re-cert:** `sync-gen:check` (record the CURRENT stamp `83ffd0ad`/245) + the
   bundled node reproduces the 103 frozen digests byte-identical (packaged == certified); the stamp's
   legitimate growth distinguished from a hash move.
3. **HALF A — the shell:** `cargo check` + `cargo test` + the sidecar self-test lockstep; the
   10-command surface registered + compiling; the `setup()` self-test untouched; thin-client grep clean.
4. **HALF A — benchmarks + end-user path proofs re-run:** `bench:phase1/2/3/phase4-mid/export` (record
   the live counts) + UI==CLI (incl. TeamTracker) + store round-trip + previewed==real + PART 1y + PART
   1z + Verify (M-vs-M ⇒ empty).
5. **HALF A — a packaged tauri build (msi/nsis) IF cheap; else honest-manual (do NOT force it).**
   Invariants: `deps {}`, no AI (ADR-001 sweep), thin client/display, no frozen hash moved by the
   extension.
6. **HALF B — the live checklist DELIVERED** (8 ordered items with PASS criteria + what a FAILURE
   means); the report records ONLY the results Leela supplies (**PENDING** if unrun). **NO claimed live
   GUI run.**
7. **THE CERTIFICATION:** each end-user capability at its proven level + proof location (§4); the
   complete updated boundary ledger (§5); the verdict.

## 7. REPORT done-conditions

`eco-day-69-report.md` (mirror the Day-58 format): the **verdict**; the certification table (§4) each
row with its **proof location**; the full backstop + packaged-path proofs (DC-A1/A2) + the OK/stamp
reconciliation; the benchmarks + end-user path proofs; the invariants/ADR-001 sweep; **the Half-B live
checklist + its results (or PENDING, honestly)**; **the complete updated boundary ledger** (the
store-picker now DONE; the visual Map's granularity boundary; Verify = reproducibility not correctness;
the live container boot still deferred; the 4 Store steps still Leela's); **the verdict** (the end-user
Bedrock system certified — OR, if a DC or a Half-B item failed: the honest finding + what is NOT
certified); the **handoff to Day 70** (release + the 4 Store steps).

---

## 8. SCOPE GUARD — OUT

- **NO new features** (certification only). **NO generator change** (a moved BAKED hash = FINDING,
  STOP). **PART 1y/1z stay non-hash** (103 stays 103).
- The **ONLY** new artifacts are **docs** + optionally re-run benchmark drivers.
- **The execute session must NOT claim any live GUI run** — Half B's results come from Leela; **PENDING
  is an honest answer**, carried to Day 70.
- The **sync-gen stamp changing is EXPECTED** (payload growth `c43773ae`→`83ffd0ad`); the load-bearing
  claim is the bundled node reproducing the **103 frozen digests**.
- **Do NOT force a heavy tauri build** (C: is tight; the packaged-path proof, DC-A2, stands without the
  installer).
- **No AI** (ADR-001). Release scope LOCKED (Bedrock / Store / MSIX / Windows-only).

## 9. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails (§4 honesty — certify only what's proven; §3 STOP over a failed proof) + the Month-3
   ex doc (Day 69 = re-certify packaged) + the Day-58 template + the extension reports (61–68, for the
   deferred live items → Half B) + Day-55 (the packaged build / MSIX recipe) + enumerated the REAL gate
   set live (PART 1a–1z, per-PART baked accounting, 203 OK, the current stamp `83ffd0ad`/245) — **yes**.
2. Session = **PLAN** — this file only; no code, no product build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9`; Day 69 certifies, moves nothing —
   **understood**.
4. AI touchpoints: **none** — certification is AI-free; the ADR-001 sweep is a check, not a change —
   **yes**.
5. The default/empty path a literal bypass: unchanged; the certification re-runs existing proofs —
   **honored**.
6. The 3 determinism killers: N/A (no generator output touched) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` from clean + the packaged-node digest
   `cmp` + `cargo check/test` + the benchmarks + Half B's live runs; a moved hash / a non-empty Verify /
   a claimed-but-unrun GUI item = STOP/PENDING, honestly — **yes**.
8. Overclaim / out-of-scope watch: no live GUI run claimed (Half B = Leela's, PENDING if unrun); Verify
   = reproducibility not correctness; the live container boot not claimed; the stamp-change explained as
   payload growth, not a hash move — **guarded**.

---

*Day 69 plan: the final packaged re-certification of the END-USER Bedrock system — the Day-58 analogue
for the 70-day extension. Two halves, both scoped. HALF A (automated, this session's execute): the full
backstop from clean (203 OK / 0 FAIL, 103 baked + 10 + non-hash 1c–1z, MAXIMAL `366e19d9` unmoved, PART
1w/1x unchanged, PART 1y/1z green — the extension's +9 non-hash OK checks, 103 stays 103); the
packaged-path re-cert (`sync-gen:check` at the current stamp `83ffd0ad`/245 — grown legitimately from
Day-58's `c43773ae`/237 via the flow-svg + impact-nodes dist entries — and the bundled node reproducing
the 103 frozen digests byte-identical, so packaged == certified); `cargo check`/`cargo test`/the sidecar
lockstep + the 10-command surface; the composition benchmarks + the end-user path proofs (UI==CLI incl.
TeamTracker, store round-trip, previewed==real, PART 1y, PART 1z, Verify M-vs-M ⇒ empty); an if-cheap
packaged tauri build (else honest-manual — do not force it); the invariants (deps {}, no AI ADR-001, thin
client). HALF B (Leela's Windows machine — the honest-manual ledger finally settled): an ordered 8-item
live checklist (launch → wizard/generate → save/list/load → view diagram → preview impact → compare
versions → Verify → friendly errors), each with a PASS criterion and what a FAILURE means; the report
records ONLY the results she supplies (PENDING if unrun — Day 70 carries them; the shell never claims a
live run). The certification table (each end-user capability at its proven level + proof location) + the
complete updated boundary ledger (the store-picker now DONE; the visual Map's entity/app granularity
boundary; Verify = reproducibility not correctness/security; the live container boot still deferred; the
4 Store steps still Leela's). No code this session — this certifies the PRODUCT a stranger will use, not
just the engine, and hands a clean, honest ledger to Day 70 (release).*
