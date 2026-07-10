# Eco-Day 73 — PLAN: the Stack regroup (four steps → one screen, four fields) + UI==CLI re-proof

**MODE: PLAN.** No code, no build. Master Change Prompt filled. Block task table + full findings in
`eco-day-71-plan.md`. Baseline `ff6e991`, backstop 203/0, MAXIMAL `366e19d9` unmoved.

## THE STANDING INVARIANTS (verbatim)
1. Same input → byte-identical output; frozen 103+10+MAXIMAL byte-identical at every close. **A moved
   baked hash is a FINDING → STOP.**
2. Every new capability's default/empty/off path is a **literal bypass** (the manifest trap).
3. **Block A is SHELL/UI ONLY.** No `generator/src/` changes. Existing PARTs unchanged.
4. The shell is a thin client. No generation logic / JS diffs / path heuristics in JS or Rust.
5. `generator/package.json` → `"dependencies": {}`. Any new Rust crate is deliberate + documented.
6. AI never in the generation path (ADR-001).
7. Claim only what is proven. Verify = reproducibility. Law 21 = no FUNCTIONAL dependency.
8. Stamp ≠ hash. The bundled node reproduces the 103 frozen digests.
9. New root/new-dir files → explicit `.gitignore` un-ignore rule + `git status` shows the file.
10. No ceremonial proofs — every gate names the failure it catches.

> Rule 20 (gate after every step) is NOT suspended. **This is the ONE wizard-semantics change of the
> arc, isolated on its own day on purpose** — the router (71) was proven against an UNCHANGED wizard
> first (seam-first). A plan that merges 71 and 73 is wrong.

## 1–3. Context / invariants / read-first
As `eco-day-71-plan.md` §1–3. Additionally read THIS day, precisely: `desktop/src/wizard-choices.js`
(`STEPS`, `buildBlueprintChoices`, `FRONTENDLESS`, `BACKENDS/FRONTENDS/DATABASES/AUTHS`) and the
settings-step rendering in `main.js` (`renderSettingsStep`, `captureCurrentStep`, `renderStep`,
`DATA_STEP`/`REVIEW_STEP`/`TOTAL`).

## 4. The task
- **DAY-ID:** `eco-day-73`
- **GOAL (one load-bearing thing):** Backend / Frontend / Database / Auth collected on **one screen,
  four fields** — replacing the four separate wizard steps — with **UI==CLI re-proven byte-identical
  vs the certified baselines** for all templates incl. TeamTracker.
- **WHY:** four one-field steps for a single "your stack" decision is friction. One screen, four
  fields is the right shape. It is the arc's only change to *how the wizard is structured*, which is
  exactly why it is alone on a day: the byte-identity gate must distinguish "we regrouped the UI"
  from "we changed what a blueprint means."
- **IN SCOPE:** one Stack screen with four fields (Backend, Frontend, Database, Auth), the SAME choice
  sets (`BACKENDS/FRONTENDS/DATABASES/AUTHS`), writing into the SAME
  `selections.{backend,frontend,database,auth}` keys. The wizard step sequence collapses those four
  steps into one; `projectName` + `projectType` remain their own steps; the data-model + review steps
  are unchanged.
- **OUT OF SCOPE (explicit):** any new option value; ANY change to `buildBlueprintChoices` /
  `toFieldSpec` / `toEntitySpec` / a preset / the `FRONTENDLESS` forcing logic (the blueprint's
  meaning); any serializer semantic change; the workspace; anything else at all.
- **DESIGN NOTES (resolved by reading code — the load-bearing subtlety):**
  - The four steps to collapse are `STEPS` indices for `backend/frontend/database/auth`. `STEPS`
    lives in `wizard-choices.js`, **but `buildBlueprintChoices` does NOT read `STEPS`** — it reads
    `sel` keys directly. So changing `STEPS` (and the `renderSettingsStep`/`captureCurrentStep` step
    machinery in `main.js`) is **necessary and permitted**, and it will **not** move the harness
    digests. That is a feature of the gate's design AND its blind spot (see the gate note).
  - **Keep the four selects writing the exact keys** `selections.backend`, `selections.frontend`,
    `selections.database`, `selections.auth`. The `FRONTENDLESS` type↔frontend nicety in
    `buildBlueprintChoices` stays where it is (the engine remains the source of truth); do not
    duplicate or move it into the new screen.
  - Prefer, if it costs nothing, a single small **pure** mapping from the Stack screen's four field
    values to those four keys — so the wiring is at least *reviewable* even though the live click is
    the only full proof.

## 5. Done-conditions
1. One Stack screen renders four fields with the same choice set. — PENDING (Leela) live for wiring.
2. Serializer output for all templates incl. TeamTracker **byte-identical to the Day-61/62
   baselines** (blank `f95bc87d504d`/15f · restApi `6f6e543a2aff`/15f · crud `54b0852cb532`/15f ·
   worker `fbc6c6e9aad2`/15f · TeamTracker `9e01210c55a5`/63f). — **gate = A73-1 harness.**
3. Backstop 203/0; MAXIMAL unmoved. — **gate = A73-2.**
4. Live check — **PENDING (Leela).**

## 6. Proof & gates
- **A73-1** — the regroup. Gate: the **A71-1 UI==CLI harness reproduces ALL recorded digests incl.
  TeamTracker.** This is **the gate that matters** — the only thing standing between "we regrouped
  four steps" and "we silently changed what a blueprint means." It goes **RED** iff the regroup
  touches `buildBlueprintChoices` / a preset / the `FRONTENDLESS` logic / drops or renames a
  selection key that the serializer reads.
- **A73-2 ✦ close** — Gate: backstop **203/0**, MAXIMAL unmoved (rent: catch a stray `generator/src`
  touch — the regroup is shell-only).

> **The gate's blind spot, stated honestly (F4/F5):** because the serializer ignores `STEPS`, the
> harness will stay green even if the new Stack screen writes a select into the WRONG key (e.g.
> `database` into `auth`). That specific *four-selects-write-the-right-keys* wiring is a **LIVE GUI
> check = PENDING (Leela)** — no non-GUI proxy is invented. The recommended pure mapping (Design
> Notes) makes it reviewable, but the live click is the only full proof. Do not report the regroup
> "done" on the harness alone.

## 7. Environment constraints
No GUI here — done-condition (1)/(4) wiring is Leela's, PENDING. Rest as `eco-day-71-plan.md` §7.

## OUT-OF-SCOPE, restated (Rule 19)
New option values · serializer/preset edits · `FRONTENDLESS` changes · the workspace · new engine
capability · a new PART. Any of these in execution = STOP.
