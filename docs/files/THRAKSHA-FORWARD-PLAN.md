# THRAKSHA / BEDROCK — THE FORWARD PLAN (Day 71 → Stage 2)
### The day-by-day reference. Any session — human, Claude, or other — executes days from here via the Master Change Prompt.

> **In-repo home:** `docs/THRAKSHA-FORWARD-PLAN.md` · **Companion:** `docs/THRAKSHA-KNOWLEDGE-BOOK.md` (read Parts I–III first).
> **How to use:** each day below fills the Master Change Prompt's slots (Appendix A of the
> Knowledge Book). Session 1 (PLAN) reads the real code and CORRECTS this plan where the code
> disagrees — this plan is a hypothesis, the repo is the experiment. Day numbers continue the
> eco-day series; if the repo's reports show different numbering, **the repo wins — renumber
> here, don't force reality to match the plan.** A genuinely multi-day unit is split, never
> compressed. One load-bearing thing per day.

---

## THE ARC AT A GLANCE

| Block | Days | Outcome |
|---|---|---|
| **A. Close the current arc** | 71–75 (~5 build days) | The shell is a product: router, welcome, workspace, docs, re-certified release |
| **A′. Leela-machine track** (parallel) | — | Pre-71 control smoke · Half-B on the new shell · the 4 Store steps |
| **B1. The format** | 76–81 (~6) | The blueprint is a canonical, diffable text file; exports are self-describing; the loop closes honestly |
| **B2. The CLI** | 82–88 (~7) | `bedrock generate/verify/check/impact/export` on npm; cross-OS proven |
| **B3. The gate** | 89–91 (~3) | CI drift-gate (Action + pre-commit), dogfooded; Phase B certified, v0.3.0 |
| **C. Stage 2 (evidence-gated)** | 92–116 (~25, only as triggers fire) | MCP server · Generation-Gap regeneration · deterministic migrations · attestations |
| **D. Calendar items (not build days)** | ongoing | Decision gates · spec publication · design partner · institutional continuity |

**Standing invariants for every day:** Knowledge Book Part VI in full. Backstop green at
every close. Live GUI checks are Leela's and stay PENDING until she runs them.

---

## THE THREE DECISION GATES (Leela only — no session decides these implicitly)

- **GATE-NAME:** the single global product name across Microsoft Store + npm + docs.
  Context: "Bedrock" collides with Amazon Bedrock (AWS's flagship AI platform — an identity
  and search problem for an AI-free tool) and the npm name is likely taken; a Store variant
  is already prepared. **Blocks:** Store step 3 (reservation, ~$19) and Day 87 (npm publish).
  Also fixes **GATE-FILENAME** (the blueprint's on-disk name — provisional `bedrock.json`
  used below; a rename before Day 79 is one token, after Day 79 it is a documented change).
- **GATE-LICENSE:** publishing the CLI to npm ships the engine (source or dist) publicly —
  the open-source question arrives concretely. Options: full OSS license / source-available
  / dist-only license. **Blocks:** Day 87. Prepare-by: Day 85.

---

# BLOCK A — CLOSE THE CURRENT ARC (Days 71–75)

### Day 71 — The screen router + Welcome + the wizard as a full-window flow
- **Goal:** one screen at a time — Welcome → wizard → (workspace placeholder); the wall of
  cards is gone.
- **In scope:** a shell-side screen router (pure UI state); Screen 0 Welcome (product name,
  one line of what it is, two buttons: *Create a new project* / *Open existing*); the
  existing wizard steps rendered full-window, **steps and semantics untouched**.
- **Decision already made:** *Open existing* = **open a saved blueprint from the store**
  (Day-63 capability — it exists, so the button is LIVE, listing saved blueprints).
  Open-from-folder is NOT this button; it arrives Day 80. Label accordingly.
- **Out of scope:** the workspace (Day 72); the Stack regroup (Day 73); any change to
  `buildBlueprintChoices`; any new wizard field; any engine file.
- **Done:** (1) app opens on Welcome only; (2) every certified flow remains reachable;
  (3) serializer output for the 4 templates (incl. TeamTracker) byte-identical to the Day-62
  baselines — UI==CLI re-proven even though steps are untouched (Move 3); (4) backstop
  203/0; (5) live click-through **PENDING (Leela)**.

### Day 72 — The workspace (the new thing)
- **Goal:** *Create project* produces a project the tools attach to.
- **Decisions already made:** Create project = **save the blueprint only** (the blueprint IS
  the project; export is a later, explicit verb). The old command harness moves to an
  **Advanced** corner of the workspace — reachable only once a project exists, never on
  Welcome.
- **In scope:** Review screen → Create → workspace; workspace = the diagram front and
  centre + verbs: Edit (re-enter wizard on this blueprint), Preview impact, Verify, Export,
  Save/versions; Advanced corner hosting the harness. Every verb calls an EXISTING certified
  command — zero new engine capability.
- **Out of scope:** Compare-in-workspace polish (existing compare stays reachable via
  Advanced); any file-on-disk linkage (Day 79); any engine change.
- **Design note (forward-compat):** do not bake in "a project == a SQLite row" — Day 78
  makes a file the truth. Keep the workspace's project handle abstract.
- **Done:** (1) full path Welcome→wizard→Review→Create→workspace works; (2) each verb
  round-trips to its certified command with rendered engine output (PREVIEWED==REAL
  unchanged); (3) UI==CLI 4-template proof repeated; (4) backstop 203/0; (5) live
  walkthrough **PENDING (Leela)**.

### Day 73 — The Stack regroup (four steps → one screen, four fields) + UI==CLI re-proof
- **Goal:** Backend/Frontend/Database/Auth collected on one screen, four fields — the one
  wizard-semantics change of the arc, isolated on its own day (seam-first: the router was
  proven against an UNCHANGED wizard first).
- **Out of scope:** any new option value; any serializer semantic change; anything else.
- **Done:** (1) one Stack screen, four fields, same choice set; (2) serializer output
  byte-identical to Day-62 baselines for all 4 templates; (3) backstop 203/0; (4) live
  check **PENDING (Leela)**.

### Day 74 — Documentation day
- Run `docs/files/BEDROCK-DOCS-DAY-PROMPT.md` exactly as written (Knowledge Book
  Appendix B). <!-- F1 path correction (Eco-Day 75): the prompt lives in docs/files/, not docs/prompts/. -->
 Docs-only; every claim carries a proof pointer; the three verbatim honesty
  lines embedded; `[SCREENSHOT-NEEDED]` list collected for Leela; backstop tail pasted.

### Day 75 — Re-certify + release the shell arc
- **Goal:** the 71–74 work certified together, from clean.
- **In scope:** full backstop from clean; packaged sidecar still reproduces the 103
  (packaged==certified; stamp move legitimate if dist entries changed — say the load-bearing
  claim); UI==CLI consolidated statement; RELEASE-NOTES + CAPABILITIES updated (honest
  limitations carried forward); version notes (installer string bump remains the one-line
  submission-wrap edit — hash-independent); tag.
- **Done:** consolidated `eco-day-75-report.md` — the arc's certification record, listing
  every PENDING live item by name.

### Block A′ — Leela-machine track (parallel; honest-manual)
1. **Pre-71 control (BEFORE Day 71 lands, one launch):** smoke the 8 Half-B items against
   the current wall-of-cards shell. Purpose: a control — if something fails after the
   restructure, you'll know whether the router broke it or it was never right. Cheap; not
   the full re-authored walkthrough.
2. **After Day 75:** the full Half-B walkthrough against the NEW shell (PASS criteria:
   `eco-day-69-report.md` §3). Any failure = a real finding → a fix day is inserted here.
3. **Store steps 1–4** (`desktop/src-tauri/msix/README.md`): MakeAppx local-test wrap →
   packaged launch + Half-B → **GATE-NAME** → reservation (~$19) → submission wrap
   (0.1.0→0.2.0 one-line manifest edit) → submit. Timeboxed; the Store is a checkbox, not
   the channel — if Partner Center gets messy, park it without guilt and proceed to B1.

---

# BLOCK B1 — THE FORMAT (Days 76–81): the blueprint becomes canonical text

### Day 76 — Format design + spec draft (a design day — no product code)
- **Read first (resolve empirically):** `buildBlueprintChoices`, the store schema,
  `project-model.ts` (the real 8-type field enum), the Day-62/63 reports.
- **Decide and write into `docs/BLUEPRINT-FORMAT.md` v0.1:** the filename (provisional
  `bedrock.json` — GATE-FILENAME); **`schemaVersion` as the FIRST field from day one**
  (formats without versions die ugly); canonical serialization (sorted keys, LF, UTF-8 no
  BOM, fixed number/string forms); exactly what's IN (choices, entities, fields,
  relationships, explicit intent fields) and OUT (`created_at`, store row ids — Rule 26);
  the versioning policy (additive-only within a major; breaking = major + migration note);
  the compatibility promise, stated plainly (the SQLite lesson: a source-of-truth format
  signs up to be readable for decades — write the sentence and mean it).
- **Done:** the spec committed; a worked TeamTracker example file in the spec; decision log
  of every choice with its reason; backstop trivially green.

### Day 77 — The canonical serializer/reader (NEW FILES ONLY in generator/)
- **In scope:** `writeBlueprintFile` / `readBlueprintFile` as new pure modules + a new CLI
  driver — the Day-65/66 shape; no existing generation-path file touched.
- **Proofs (new non-hash PART 2a in the harness):** (1) fixpoint — write→read→write is
  byte-identical; (2) equivalence — read(file)→generate produces byte-identical output to
  the store-path generate for all 4 templates incl. certified TeamTracker; (3) canonical —
  two serializations of the same in-memory blueprint are byte-identical.
- **Done:** PART 2a green; frozen 103 untouched by construction and proven (203+1).

### Day 78 — Shell integration: the file becomes the truth, SQLite becomes the index
- **In scope:** Save writes the canonical file (SQLite row keeps metadata + a path/copy);
  Load prefers the file; the workspace shows the file's location; an export-to-file command
  migrates existing store rows.
- **Out of scope:** watching the file for external edits (later); multi-file blueprints.
- **Done:** (1) save→load→save fixpoint through the UI; (2) UI==CLI via the FILE path against
  TeamTracker; (3) an existing pre-78 row migrates losslessly; (4) backstop green.

### Day 79 — `bedrock.json` into every export (the parked linkage, resolved by reading code)
- **The known risk, stated up front:** whether this moves frozen hashes depends on whether
  the file lands inside `buildFileSet` or is written alongside it by the export driver.
  **READ THE CODE FIRST.** Required outcome: the 103 do NOT move → therefore write it
  alongside, via the export driver, outside `buildFileSet`. If the code structure genuinely
  forces it inside, STOP — that becomes an explicitly-flagged additive-optional design
  reviewed before execution, never a silent hash move.
- **Proofs:** (1) every export tree contains the blueprint file, byte-identical to its
  source blueprint (new non-hash PART 2b); (2) all frozen digests byte-identical; (3) Law
  21 unaffected — the file is inert data, zero functional imports (re-run the PART 1t
  logic over an export containing it).
- **Done:** exports are self-describing; 203+2; the linkage gap named in the handoff is
  closed.

### Day 80 — Open existing → from folder (reopen, NOT inference)
- **Goal:** Welcome gains open-from-folder: read the folder's OWN `bedrock.json`, import it
  as a blueprint. Reading a manifest Bedrock wrote is reading, not guessing — the border
  (Knowledge Book I.3.3) is respected and must be stated in the UI copy.
- **Proofs:** export → delete the store row → open the folder → regenerate → byte-identical
  to the original export. A folder WITHOUT the manifest gets the honest refusal message
  ("not a Bedrock-exported project — Bedrock does not guess blueprints from code").
- **Done:** the loop closes honestly; backstop green.

### Day 81 — Format hardening + the promise
- **In scope:** `schemaVersion` enforcement (unknown major → a clear, deterministic refusal
  — never a guess); friendly deterministic errors for malformed/wrong-typed files (negative
  tests with exact expected messages); the compatibility promise finalized; spec bumped to
  v1.0-rc and committed.
- **Done:** negative-path tests in the harness; spec v1.0-rc; backstop green.

---

# BLOCK B2 — THE CLI (Days 82–88)

### Day 82 — The CLI package skeleton + `generate`
- **Structure:** a NEW package (e.g. `cli/`) depending on the local generator. **Preference:
  the CLI also holds deps {}** — hand-rolled argv parsing over a framework; the zero-dep
  story is part of the identity. Any dep is a documented decision.
- **Commands:** `bedrock --version` · `bedrock generate <blueprint> -o <dir>`.
- **Done:** generate(file) output byte-identical to the engine baseline for TeamTracker;
  exit codes 0/≠0 correct; backstop green.

### Day 83 — `verify` and `check` (the heart of the product)
- **`bedrock verify <blueprint>`:** double-generation into temp dirs, byte-compare, exit
  0/1. Output states EXACTLY what was proven: reproducibility, never correctness (Rule 10).
- **`bedrock check <blueprint> <dir>`:** regenerate, compare against the directory tree;
  report missing / extra / modified files in **sorted, deterministic order**; exit non-zero
  on drift. Detect-only — no writes (safe regeneration is Stage 2 and the help text says so).
- **Proofs:** clean tree → 0; a seeded one-byte edit → detected and named; a deleted file →
  detected; output order stable across runs.

### Day 84 — `impact` + `export`
- **`bedrock impact <blueprintA> <blueprintB>`:** the ENGINE's own per-entity file
  attribution (the PART-1z machinery) exposed as a sorted file list — no new heuristics,
  the certified attribution only, with its granularity boundary stated in `--help`.
- **`bedrock export`**: parity with the GUI export (including Day-79's manifest).
- **Done:** impact output cross-checked against PART-1z data; export byte-identical to GUI
  export for TeamTracker; backstop green.

### Day 85 — Cross-OS proof I (Linux CI) — the riskiest day of Phase B; treat it with respect
- **Goal:** GitHub Actions (ubuntu) runs the FULL backstop + the CLI suite. This finally
  answers the cross-OS question empirically (the Month-1 item that was honestly narrowed
  when the product went Windows-only — it must hold now).
- **Pinning:** the CI node version = the sidecar's bundled node version, exactly.
- **If any byte differs cross-OS → FINDING → STOP** (Move 4): audit the three killers
  (CRLF/LF; key/iteration order; embedded time/random). Expected state: output is
  LF-normalized already, so bytes should match — but expectation is not proof. Any fix must
  be proven hash-neutral on Windows; a forced re-baseline is the loud, documented,
  last-resort path (§VI.1.1), judged unlikely.
- **Done:** the 103 + 10 + MAXIMAL reproduce byte-identically on Linux; the workflow file
  committed; the honest claim upgraded from "Windows-proven" to "Windows+Linux-proven."

### Day 86 — Cross-OS proof II (macOS leg) + packaging wiring
- **In scope:** macOS CI leg; the OS×node matrix; `package.json` `bin` wiring; `npx` smoke
  (local pack, no publish) green on all three OSes in CI.
- **Done:** three-OS matrix green from clean; claim upgraded to three-OS.

### Day 87 — Publish readiness ⟂ **GATE-NAME + GATE-LICENSE**
- **In scope (buildable regardless of gates):** package README; `--help` text; LICENSE file
  slot; `npm pack` dry-run audited (exactly what ships — nothing unintended); the scoped-name
  fallback (`@scope/…`) prepared.
- **Blocked on the gates:** the actual `npm publish`. If gates are open when this day runs,
  publish; otherwise close the day honestly as "publish-ready, gates pending" — that is a
  complete day, not a failure.

### Day 88 — CLI documentation + version line
- **In scope:** `docs/manual/12-cli.md` (every command, exit codes, the honest boundaries:
  check is detect-only; verify is reproducibility-only); CAPABILITIES + RELEASE-NOTES for
  the 0.3.0 line; every claim with a proof pointer.

---

# BLOCK B3 — THE GATE (Days 89–91)

### Day 89 — The CI gate: GitHub Action + pre-commit hook
- **In scope:** a composite Action wrapping `bedrock check` (inputs: blueprint path, target
  dir; fails the PR on drift with the sorted drift list in the log); a copy-paste example
  workflow; a pre-commit hook sample. Opinionated defaults, minimal knobs (the Prettier
  lesson: for an enforcement tool, configurability is a bug).
- **Done:** in a fixture repo, a seeded drift turns the check red with the exact file named;
  a clean tree is green; docs for both.

### Day 90 — Dogfood: Bedrock guards Bedrock
- **Goal:** this repo runs `bedrock check` in its own CI against a committed fixture
  (blueprint + its exported tree). The guarantee guards its own house first; badge + docs.
- **Done:** the fixture check green in CI; a deliberate fixture edit on a branch of the
  fixture (test-only) proven red; report shows both.

### Day 91 — Phase B certification + release (v0.3.0)
- From clean: full backstop + CLI suite + the three-OS matrix + the gate fixture. The
  consolidated Phase-B report: everything proven at its named level; every PENDING listed;
  the limitations updated (no safe-regen yet; check is detect-only; the container boot
  remains un-run unless a CI leg changed that — if a Linux CI leg CAN now run the exported
  container boot, seize it here and finally clear that item; if not, it stays PENDING,
  named). Tag v0.3.0.

---

# BLOCK C — STAGE 2 (evidence-gated: a block starts ONLY when its trigger fires)

| Block | Trigger (write it in the starting day's plan) |
|---|---|
| MCP server (92–94) | An agent-tooling user/partner asks, or a deliberate distribution experiment is approved after v0.3.0 |
| Generation-Gap regeneration (95–104) | The first real team hits the edit-then-regenerate wall |
| Deterministic migrations (105–112) | A design partner needs schema evolution across blueprint versions |
| Attestations (113–116) | A regulated design partner (or concrete compliance requirement) exists |

### Days 92–94 — The MCP server
- Tools exposed: `generate` / `verify` / `check` / `impact` — thin wrappers over the CLI
  logic, deterministic outputs, **no network access, no AI in the path** (the server lets an
  AI *drive* Bedrock: the agent drafts/edits a blueprint file, a human reviews the diff,
  Bedrock projects deterministically — the border holds and the docs say so explicitly).
- Proofs: MCP-path output byte-identical to CLI-path output for the same inputs.

### Days 95–104 — Generation-Gap safe regeneration (a genuinely large unit — never compressed)
- **The pattern:** generated base files + hand-written extension files (Vlissides), NEVER
  protected regions (provably lossy — Knowledge Book I.3.2 stands).
- **The hash reality, faced up front:** a new file layout changes generated output. So it
  enters as an **opt-in blueprint field** (e.g. `layout: "generation-gap"`), **default
  absent = literal bypass** reproducing the frozen 103 exactly (Rule 2 — this is the
  manifest-trap discipline applied at full scale). The opt-in layout gets its OWN new
  baseline family, twice-identical, documented. Days: 2 design (per-stack base/extension
  layout, read every emitter first) · 5–6 implementation per-stack behind the flag · 1
  `bedrock regen` (regenerate bases; NEVER touch extension files; drift in a base = report,
  not overwrite) · 1–2 certification of the new family + the bypass proof.

### Days 105–112 — Deterministic migrations from blueprint lineage
- Blueprint vN→vN+1 → a deterministic DDL delta; the lineage becomes the schema history.
- **Renames are ambiguous by nature** (rename ≡ drop+add in the model): intent is recorded
  EXPLICITLY in the blueprint (a `renamedFrom` field), never inferred — Rule 25's genealogy.
- Twice-identical migration outputs; a golden lineage fixture in the harness; Postgres
  first, MySQL second (the proven dialect-seam order).

### Days 113–116 — Signed generation attestations
- A generation receipt: blueprint hash + engine version + output manifest hash, signed;
  in-toto/SLSA-shaped. `bedrock verify --attest` emits it; `bedrock check --attestation`
  validates a tree against one. Honest-ratchet rule stated in the docs: losing the chain
  loses the PROOF, never the code (Rule 37).

---

# BLOCK D — CALENDAR ITEMS (not build days; run alongside)

1. **GATE-NAME** — settle before Store step 3 AND Day 87. One name, all channels.
2. **GATE-LICENSE** — settle before Day 87. Prepare a one-page options memo by Day 85.
3. **Spec publication** (after Day 91): `BLUEPRINT-FORMAT.md` v1.0 published openly +
   a conformance fixture set (blueprint → expected output hashes) so a third party could
   implement a generator. The format outliving the tool is the survivability answer a
   solo-built substrate owes its users.
4. **Design-partner outreach** (after Day 91 — it needs the CLI to exist): one platform
   team or one regulated-industry team willing to run `bedrock check` in CI. One is enough.
   The pitch is the demo: `npx <name> verify` in their pipeline, watched live.
5. **Institutional continuity** (background, ongoing): the single-maintainer risk is the
   #1 threat and no feature fixes it. Steps in order of cheapness: the open spec (3) →
   extreme test discipline maintained (it lets strangers trust code without trusting a
   person) → a second contributor / sponsorship / a company or foundation decision.

---

## PLAN-MAINTENANCE RULES

- After every completed day, the report is the truth; if it contradicts this plan, update
  the plan (a one-line dated edit) — the plan never outranks a report.
- Inserted fix-days (e.g., a Half-B failure) take the next number; everything after shifts.
  Renumbering is normal; forcing reality into the numbering is the only failure.
- Any scope change to a future day happens HERE first (a dated edit), then in that day's
  plan — never silently inside an execution session.
- Stage-2 blocks without a fired trigger are not backlog debt; they are correctly parked.

*End of the Forward Plan. Companion: the Knowledge Book. The line, every day: does the
default path still reproduce the frozen hashes, and did every proof pay rent?*
