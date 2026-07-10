# Bedrock — Release Notes

## Days 71–75 — the product shell (post-v0.2.0 refinement, hash-neutral)

A **shell/UX arc** over the **unchanged certified v0.2.0 engine**. The desktop app became a proper
screen-routed product, and the UI==CLI proof was committed as a runnable gate. **No `generator/src`
change; no frozen hash moved; the crown-jewel MAXIMAL `366e19d9…` is unmoved.** The engine certification
(v0.2.0) is carried, not re-opened.

**What changed (shell only):**
- **A screen router** — the app opens on **Welcome** and shows one screen at a time: Welcome → the
  **full-window guided wizard** → the **project workspace**. The old wall of cards is gone.
- **The workspace** — Create (= `save_blueprint` only) opens a project's home: the **diagram front and
  centre**, with verbs **Edit / Preview impact / Verify / Export / Save version**, each calling an
  existing certified command. The raw command harness moved to an **Advanced corner**, reachable only
  once a project exists. The workspace reads an **abstract project handle** (`{ name, choices, storeId? }`),
  never a bare store row — so the later file-as-truth change is a store swap, not a UI rewrite.
- **The Stack regroup** — Backend / Frontend / Database / Auth collected on **one Stack screen** (four
  fields) instead of four steps, via a pure, **unit-tested** field→key mapping. The blueprint's meaning
  is unchanged (the serializer is untouched).
- **A committed UI==CLI harness** — `desktop/tools/ui-cli-proof.mjs` (`npm run ui-cli`): a single command
  that re-proves the wizard's blueprint is byte-identical to the CLI's for all five templates, anchored
  to the frozen TeamTracker digest `9e01210c55a5…` (inside the backstop's 103). Previously this proof was
  ad-hoc and uncommitted (finding F3, now closed).
- **The full documentation set** — `docs/manual/` (00–11), `docs/architecture/` (ARCHITECTURE /
  DETERMINISM / VERIFICATION-LADDER), and `docs/LIMITATIONS.md`.

**Re-certified (from clean, Eco-Day 75):**
- `rm -rf dist && npm run build && npm run day20:regress` → **203 OK / 0 FAIL**, 103 digests, MAXIMAL
  `366e19d9…` unmoved.
- **Packaged == certified:** the bundled node (`node-x86_64-pc-windows-msvc.exe`) against
  `resources/gen/dist/day20-regression.js --emit-digests` is **byte-identical** to the certified engine —
  103 DIGEST lines, MAXIMAL reproduced. The sync-gen stamp `83ffd0ad…` is **unchanged** from Day 70 (the
  arc added no generator dist entries) — not a hash move.
- **UI==CLI:** `npm run ui-cli` reproduces all five digests (TeamTracker + blank/restApi/crud/worker).

**Still deferred / honest-manual (Leela's machine — the shell has no GUI here):** the full in-Bedrock
walkthrough on the new shell (Welcome buttons + the live saved-project list; Create → workspace; each
workspace verb round-trip; the Stack screen inside Bedrock) — **PENDING**, alongside the existing Half-B
checklist (`docs/daily/eco-day-69-report.md` §3). See `docs/LIMITATIONS.md`.

**Installer version note:** `tauri.conf.json` still carries `0.1.0`; the `0.2.0` string is set at the
Store **submission wrap** (a one-line manifest edit that moves no frozen hash). This arc did **not** bump
it. The determinism certification is version-string-independent.

---

## v0.2.0 — the end-user product (the close of the 70-day build)

**Bedrock v0.2.0** is the close of the 70-day build: the deterministic, AI-free generator **+ the
end-user product built over it** (a guided wizard, persistent projects, the Map, Verify, and a
standalone export). **The end-user system is certified** (Eco-Day 69) and **released** (Eco-Day 70).

**Ships as:** Bedrock — FREE via the Microsoft Store as an **MSIX** (Microsoft signs at certification —
**no** cert / EV / token / notarization). **Windows-only** (macOS/Linux desktop out of scope this
release).

> **Artifact-label note (honest).** The fresh in-repo installers (Eco-Day 69: `Bedrock_0.1.0_x64…msi` /
> `…-setup.exe`) carry the `0.1.0` version string from `tauri.conf.json`, untouched by this docs-only
> release. The string is set to `0.2.0` at the Store **submission wrap** — a one-line manifest edit that
> changes no generation output (moves no frozen hash). The determinism certification is
> version-string-independent.

### Certified (in-repo, Eco-Day 69)

- **The frozen backstop:** `npm run day20:regress` → **203 OK / 0 FAIL, 103 baked digests + 10
  TeamTracker relationship hashes + non-hash gates (PART 1c–1z), MAXIMAL `366e19d9…`** — byte-identical
  from clean, **no frozen hash moved across the entire 70-day build** (the +9 OK vs Day 58 is PART 1y[4]
  + 1z[5], both non-hash — 103 stays 103).
- **Packaged-path determinism:** the shipped sidecar — the bundled node **v22.21.0** — reproduces the
  certified generator's **103 digests byte-identical**; sync-gen stamp **`83ffd0ad…`/245** (grown
  legitimately from Day-58's `c43773ae`/237 via the flow-svg + impact-nodes dist entries — payload
  tracking, not a hash move). The packaged generator == the certified generator.
- **Composition:** the phase benchmarks pass at their honest levels — phase1 16/16 + phase2 13/13 +
  phase3 24/24 + phase4-mid 6/6 + export 16/16 = **75/75**.
- **AI-free (ADR-001):** 0 generation-path AI refs; the wizard/store/Map/Verify are all AI-free; the only
  AI is the detachable, developer-keyed advisory edges + the dev-time Fable-5 pass — neither in
  generation nor shipped. Generator **pure-Node** (`deps {}`, 0 native).

### What ships (in-repo)

**The engine:** the certified deterministic generator (7 project types × 5 stacks) + Figma ingestion +
deterministic CI/CD + the exporter (Law 21) + the security layers (Semgrep CERTAIN + the detachable AI
advisory) + the flow/impact maps.

**The product:** the guided **wizard** (UI==CLI, incl. the certified TeamTracker) + the **data model**
(entities/fields/relationships, the 8-type field enum, Decimal, explicit has-many) + **persistent
projects** (the SQLite blueprint store, lossless non-mutating round-trip) + **the Map** (drawn/
deterministic/faithful + interactive impact, engine-computed + the two-version diff) + **Verify** (a real
double-generation proving reproducibility) + the **standalone export** (no functional dependency on
Bedrock).

**Packaged:** the fresh **Bedrock MSI + NSIS** (Eco-Day 69, with the certified sidecar + the new
flow-svg/impact-nodes entries staged) + the MSIX **`AppxManifest.xml` + the go-live wrap recipe**.

### What's deferred / honest-manual (Leela's Windows/Store machine)

- **The live packaged-GUI walkthrough** — the Eco-Day-69 **Half-B** 8-item checklist (launch →
  wizard/generate → save/list/load → view diagram → preview impact → compare versions → Verify → friendly
  errors). **Status: PENDING** — to be run before/alongside the Store submission (runbook step 2). No
  live GUI run is claimed.
- **The 4 go-live steps** — **MakeAppx MSIX wrap → packaged launch + live-GUI walkthrough → Bedrock name
  reservation → Store submission** (runbook:
  [`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md)).
- The **live container boot** (Law 21 — Docker daemon down); **live Semgrep** (CI/Linux); **live AI**
  (developer-keyed); the **macOS/Linux desktop build** (Windows-only). The **complete boundary ledger**
  is in [`CAPABILITIES.md`](CAPABILITIES.md) §4 — none dropped.

### The 70-day arc (in brief)

**Days 1–60 — the engine + the packaged shell** (Phases 0–4, certified Eco-Day 58): core determinism
(byte-identical generation, the frozen backstop) → the ecosystem seam (`assembleBlueprint`, default = a
literal bypass) → breadth (7 types × 5 stacks + Figma + CI/CD) → export + security + the maps → the shell
+ packaging + certification.

**Days 61–70 — the end-user product** ("the sensation push", certified Eco-Day 69): the wizard (61) →
the data model (62) → the blueprint store (63) → the linked project view / previewed==real (64) → the
visual Map (65, PART 1y) → the interactive impact Map (66, PART 1z) → the diff Map (67) → trust: friendly
errors + the real Verify + the standalone-export experience (68) → the final packaged re-certification
(69) → this release (70).

**The measure held:** the software does everything it can deterministically — for free, for certain,
byte-identical — and confines AI to the genuinely irreducible creative/judgment gaps, always opt-in,
always detachable, always the developer's own bill. **The crown jewel — MAXIMAL `366e19d9…` — has not
moved from Eco-Day 29 through Eco-Day 70.**
