# THRAKSHA / BEDROCK — Days 61–70: The Sensation Push

**Status:** Extension of the 60-day plan. Days 1–60 delivered the certified engine +
the packaged shell (thin command harness). Days 61–70 build the **end-user product** —
the creation wizard + the Map as the centerpiece — so that Bedrock becomes something a
developer *reaches for the way they now reach for AI*.

---

## The thesis these 10 days serve

A developer today asks an AI "build me X" and gets a plausible black box they must read,
trust, and debug. Bedrock gives the same speed with **none of the trust problem**: you
declare what you want, and you get software that is **exact, inspectable, reproducible,
and yours forever.**

The emotional core is the Map: **"show me exactly what this will do, before it does it."**
No AI tool can do that truthfully — AI output is not a function of its input. Bedrock's is.

> **Positioning: "AI guesses; Bedrock knows."**

Days 61–63 make Bedrock **usable** (the wizard). Days 64–66 make it **loved** (the visual,
interactive Map). Days 67–68 make it **shippable and trusted**. Days 69–70 **certify and
release**.

---

## The non-negotiable invariant (all 10 days)

**Everything in Days 61–70 is SHELL / UI work over the already-certified engine.**
- No generator source changes. The crown jewel — **MAXIMAL `366e19d9`** and the full
  backstop (103 baked + 10 TeamTracker + non-hash PART 1c–1x) — stays **byte-identical**
  the entire time. A moved hash is a **FINDING, STOP** — never silent.
- The front-end is a **thin client**: it collects choices and calls the existing certified
  commands (`assembleBlueprint` / export / scan / impact / flow-map). **No generation
  logic in JS/Rust.** No reimplementation.
- Determinism of any *new* UI-side artifact (e.g. the visual Map layout) is itself proven:
  same blueprint → same diagram, byte-identical, CI-enforced as a new non-hash PART.
- Honesty (§4) carried every day: what's built/verified in-shell vs deferred to Leela's
  Windows/Store machine (the packaged GUI launch, MakeAppx wrap, Store submission).
- `deps {}` stays; 0 native; no AI in the product (ADR-001). Any visual-Map rendering uses
  a pure/isolated approach — no heavy graph/viz library as a core dep.

Each day runs the **Plan → Execute+Report** rhythm. Each is gated on the backstop staying
green before and after.

---

## PHASE A — The wizard + the living project (Days 61–63)
*Make Bedrock usable: a guided front door, and a project you can immediately see.*

### Day 61 — The wizard core
**Goal:** replace the raw-JSON textareas with a guided creation flow.
- A step-through UI: **app name → backend → frontend → database → auth → project type.**
- Collects `BlueprintChoices` and hands them to the existing `assembleBlueprint` +
  export/generate commands. The demo bypass (empty input) still works.
- Ends in a real, named project — "Generate / Export to a folder."
**Load-bearing:** thin client (no generation logic in JS); backstop byte-identical; the
wizard produces the *same* blueprint the CLI would (UI == CLI, the Day-16 seam).
**Deferred/honest:** the live packaged click-through (Leela's GUI).

### Day 62 — Entities, fields, relationships in the wizard
**Goal:** the substance of a real app — the data model.
- Dynamic UI: add/remove **entities**, their **fields** (name, type, decimal/money, etc.),
  and **relationships** (belongs-to / has-many).
- Feeds the same `BlueprintChoices`; the engine already accepts all of it.
**Load-bearing:** the wizard's entity/relationship output assembles a blueprint whose
generation reproduces the certified baselines (it's the same engine); no hash moved.

### Day 63 — The linked project view
**Goal:** the wizard's output flows straight into **its own maps** — the project is a live
thing, not a folder you generate and forget.
- After the wizard, the project view offers: **View flow map** + **Preview impact** +
  **Generate/Export** — all running on **the wizard's blueprint** (via `--model`), not the
  demo.
- Text maps for now (the certified `renderFlowMap` + the impact plan). The *visual* Map is
  Days 64–66.
**Load-bearing:** the map runs on the real blueprint (the `--model` path, already proven);
the flow-map traceability anchor (PART 1x) and the impact previewed==real proof (PART 1w)
hold for the wizard's project.

---

## PHASE B — The Map as the sensation (Days 64–66)
*Make Bedrock loved. This is the differentiator — three days, not one.*

### Day 64 — The visual Map (the "whoa" moment)
**Goal:** turn the text flow-map into a **drawn diagram** in the window — entities, the
request lifecycle (route→controller→service→repository→model→table), and relationships as
boxes and arrows. The developer *sees* their architecture, generated exactly from their
declaration.
**Load-bearing (new proof):** **deterministic layout** — same blueprint → same diagram,
byte-identical. Add as a new non-hash PART (the visual Map's analogue of the flow-map
traceability anchor): every drawn node/edge is one-to-one with the declared model (no
phantom, no missing). Pure/isolated rendering — `deps {}` stays.

### Day 65 — The interactive impact Map (the killer feature, made visceral)
**Goal:** the Terraform-plan preview, *visual and live*. Change something in the wizard
(add a field, add an entity, switch a relationship) and the Map **highlights exactly what
changes** — the precise files, tables, and lines the change touches, *before* committing.
**This is the thing no AI can do.** This is the sensation.
**Load-bearing:** the highlighted delta == the real generation delta, byte-for-byte
(the Day-47 previewed==real proof, now visual + interactive). Exact, not approximate.

### Day 66 — The diff Map (two-blueprint compare)
**Goal:** show **two versions side by side** — "here's my project now, here's it with this
change, here's the exact delta." Makes Bedrock a tool you *plan with*, not just generate
from. (Uses the blueprint store — Day 8 — for the versions.)
**Load-bearing:** the diff is exact (impact-map machinery); deterministic; read-only.

---

## PHASE C — Trust + "it's yours" (Days 67–68)
*Make Bedrock shippable to a stranger, and make the trust felt.*

### Day 67 — Friendly UX + the visible determinism proof
**Goal:** surface the honesty *in the app*, not just the docs.
- No raw stack traces (the ENOENT-on-bad-input → a human message); input validation;
  empty-state guidance; a short "what is this / why trust it" onboarding.
- **The "Verify" affordance:** re-generate and *show* the output is byte-identical to last
  time — let the developer *feel* the guarantee. This is what earns "rely on this like you
  can't rely on AI."
**Load-bearing:** all UI; backstop byte-identical.

### Day 68 — The standalone-export experience (the anti-lock-in moment)
**Goal:** make Law 21 a *feature the user sees*.
- "Export → a complete, standalone project that builds and runs with **Bedrock deleted**."
  The antidote to AI lock-in anxiety, made tangible: *you own this, forever, no dependency
  on us.*
**Load-bearing:** the exporter (Day 41, already certified) surfaced honestly — the static
+ require-graph standalone proof stands; the live container boot stays honest-manual.

---

## PHASE D — Certify + release (Days 69–70)

### Day 69 — Final full-system re-certification (packaged, everything)
**Goal:** prove the whole product holds together as the shipped thing.
- The backstop still byte-identical (all of 61–68 is shell/UI — no engine change).
- The wizard + visual Map + interactive impact + export all working through the packaged
  MSIX. The new UI-determinism PARTs (visual Map layout) green, CI-enforced.
- The packaged sidecar still reproduces the frozen digests (== certified generator).
**Verdict:** the end-user Bedrock system certified.

### Day 70 — Release close
**Goal:** the honest close of the 70-day build.
- Update CAPABILITIES.md / README.md / RELEASE-NOTES.md to reflect the **real product**
  (wizard + visual/interactive Map + export — no longer "deferred").
- The Store-submission runbook (the 4 ordered Leela's-machine steps).
- Final docs; the sensation stated plainly.

---

## The 4 Store steps (Leela's Windows/Store machine — after Day 70)
1. **MakeAppx MSIX wrap** — assemble payload → `MakeAppx.exe pack` → `.msix`.
2. **Packaged launch + sidecar-under-MSIX test** — sideload, launch, confirm end-to-end.
3. **Reserve "Bedrock"** in Partner Center (or a prepared variant); feed identity into the
   manifest.
4. **Store submission** — upload, listing, submit; Microsoft signs + certifies.

---

## Sensation feature ledger — what's IN the 70 vs the v0.2 north star

**IN (Days 61–70):**
- The creation wizard (name/backend/frontend/db/auth/entities/fields/relationships).
- The linked project view (maps run on *your* blueprint).
- **The visual, interactive Map** — the flagship: drawn architecture + live impact
  highlighting + two-version diff.
- The visible determinism proof ("Verify").
- The standalone-export experience (Law 21 as a felt feature).

**Strong candidates — fold in if a day has room, else v0.2:**
- **Templates / starting points** (REST-API / CRUD / worker) — fast first-use; lowers the
  30-second barrier. *Consider folding into Day 61.*
- **"Explain this project"** — a deterministic plain-English architecture summary from the
  blueprint (docs that never rot, because the blueprint is the truth).
- **Blueprint versioning + history** — the project remembers its evolution (pairs with the
  diff Map; the store exists).

**v0.2 north star (NOT in the 70 — genuinely harder, shouldn't rush):**
- **Round-trip / re-import** — what happens to developer edits when the blueprint is
  canonical. This is the feature that makes Bedrock a *daily* tool rather than a
  *scaffolding* tool. Name it; design it deliberately later.

---

## The one line that captures it
*The software does everything it can deterministically — free, certain, byte-identical,
inspectable, and owned — and the Map lets you see exactly what it will do before it does
it. AI guesses; Bedrock knows.*