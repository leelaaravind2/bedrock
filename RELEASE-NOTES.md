# Bedrock — Release Notes

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
