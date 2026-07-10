# Eco-Day 73 — CLOSE RECORD (EXECUTE session, Block A batched)

**MODE: EXECUTE close record** (the consolidated report is Day 75's). Factual per §6 of the block
brief. Baseline: Days 71–72 CLOSED + committed (`ba258f9`, `f1b665f`); backstop 203/0; MAXIMAL
`366e19d9` unmoved.

**Day-73 goal (one load-bearing thing):** Backend / Frontend / Database / Auth collected on **one
Stack screen (four fields)** — replacing the four separate wizard steps — with **UI==CLI re-proven
byte-identical** for all five templates incl. TeamTracker. This is the arc's ONLY change to how the
wizard is structured; the byte-identity gate must distinguish "we regrouped the UI" from "we changed
what a blueprint means."

---

## 1. What was built (files, precisely)

- **`desktop/src/stack-fields.js`** (NEW) — the PURE, DOM-free, engine-free field↔key mapping.
  `STACK_FIELDS` declares the four fields (backend/frontend/database/auth, each bound to its choice
  set BACKENDS/FRONTENDS/DATABASES/AUTHS imported from `wizard-choices.js`). `applyStackFields(sel,
  values)` writes EXACTLY `selections.{backend,frontend,database,auth}` and nothing else. The
  FRONTENDLESS type↔frontend nicety is NOT duplicated here — it stays in `buildBlueprintChoices`.
- **`desktop/tools/stack-fields.test.mjs`** (NEW) — the unit test (6 checks). Proves the property the
  UI==CLI harness cannot (it ignores STEPS/the DOM): each field writes its own key, the wrong-key bug
  (`database` → `auth`) is caught, unrelated keys untouched, null is a no-op.
- **`desktop/package.json`** — added `"test:stack": "node tools/stack-fields.test.mjs"`.
- **`desktop/src/wizard-choices.js`** — **STEPS array ONLY**: the four `backend/frontend/database/
  auth` steps collapsed into one `{ id: 'stack', label: 'Your stack', kind: 'stack' }`; `projectName`
  + `projectType` stay their own steps. `buildBlueprintChoices` / `toFieldSpec` / `toEntitySpec` /
  `TEMPLATES` / `TEAMTRACKER_EXAMPLE` / `FRONTENDLESS` / `choicesToSelections` **untouched** (the
  serializer's meaning). The serializer does not read STEPS, so this is byte-neutral.
- **`desktop/src/main.js`** — imports `STACK_FIELDS`/`applyStackFields`; `renderSettingsStep` gains a
  `stack` branch → `renderStackStep` (four selects, each `onchange` routed through `applyStackFields`);
  `captureCurrentStep` gains a `stack` branch (reads the four selects in `STACK_FIELDS` order, applies
  via the mapping). No serializer logic in JS.
- **`docs/daily/eco-block-A-ledger.md`** — updated after each task.

**NOT touched:** any `generator/src/` file; the serializer functions in `wizard-choices.js`;
`styles.css` (F11); `.claude/launch.json` (a temporary fresh-port preview config was added then
reverted — empty diff at close).

**`.gitignore` (Rule 28):** `desktop/src/` and `desktop/tools/` are already un-ignored (tracked
siblings exist); `git status` shows both new files as `??`. No un-ignore rule needed.

## 2. Gates (pasted)

**A73-1 — `npm run test:stack`:**
```
  OK   STACK_FIELDS keys == [backend, frontend, database, auth] in order
  OK   each field offers the certified choice set (BACKENDS/FRONTENDS/DATABASES/AUTHS)
  OK   applyStackFields writes each field to its own key, no extra keys
  OK   database value lands in `database` only — auth/backend untouched (the F4 wrong-key guard)
  OK   unrelated keys (projectName/projectType/entities) untouched
  OK   null/undefined values is a no-op
stack-fields unit test: PASS (6 checks)
```
This is the gate that converts "wrong key" from a live-only risk (F4/F5) to a proven property.

**A73-2 — `npm run ui-cli` (THE gate: all five reproduce despite the regroup):**
```
  OK   ANCHOR TeamTracker  63/63 files · digest 9e01210c55a5 · == 9e01210c55a5 (full committed baseline)
  OK   free   blank        15/15 files · digest f95bc87d504d · == f95bc87d504d (full committed baseline; transcribed f95bc87d504d)
  OK   free   restApi      15/15 files · digest 6f6e543a2aff · == 6f6e543a2aff (full committed baseline; transcribed 6f6e543a2aff)
  OK   free   crud         15/15 files · digest 54b0852cb532 · == 54b0852cb532 (full committed baseline; transcribed 54b0852cb532)
  OK   free   worker       15/15 files · digest fbc6c6e9aad2 · == fbc6c6e9aad2 (full committed baseline; transcribed fbc6c6e9aad2)
  OK   five digests DISTINCT (5/5) — identical digests would prove nothing
UI==CLI harness: PASS
```
`git diff -- desktop/src/wizard-choices.js` shows ONLY the STEPS block (comment + 4 steps → 1).
`git diff --stat generator/` → empty.
Live (fresh-origin static preview, plain browser — no Tauri): the wizard is now **5 steps** (App
name → Project type → **Your stack** → Data model → Review), the Stack screen renders **four selects**
(Backend/Frontend/Database/Auth), and setting them to Go/None/MySQL/None writes the assembled
BlueprintChoices settings to EXACTLY `{backend:'Go', frontend:'None', database:'MySQL', auth:'None'}`
— each field to its own key, no cross-wiring. **0 console errors.** (Note: the first preview served
cached ES modules; a fresh origin/port was used to load the new modules — a tooling detail, not a
code issue.)

**A73-3 — day close:**
```
Day-20 regression: PASS (43 frozen + 1 MAXIMAL + 5 version baselines + non-hash checks + property re-derivations)
  → 203 OK / 0 FAIL
  → MAXIMAL composition cell twice-identical == recorded baseline  366e19d9deda1caf  (UNMOVED)
$ git diff --stat generator/   → (empty)
$ git status --porcelain
 M desktop/package.json
 M desktop/src/main.js
 M desktop/src/wizard-choices.js
 M docs/daily/eco-block-A-ledger.md
?? desktop/src/stack-fields.js
?? desktop/tools/stack-fields.test.mjs
```

## 3. Proven vs PENDING (honesty)

- **PROVEN (reproducible commands):** the serializer meaning is byte-identical across the regroup
  (harness 5/5, incl. the frozen-anchored TeamTracker); the field↔key wiring is **unit-tested**
  (`npm run test:stack`); engine + serializer functions untouched (STEPS-only diff; backstop 203/0).
- **INSPECTED, not proven:** the Stack screen writing the right keys was **inspected in a plain browser
  without Tauri** (unreproducible — no committed test); the full in-Bedrock check is PENDING (Leela).
  [downgraded Day 75b, F12-A]
- **PENDING — Leela's machine:** the full in-Bedrock wizard click-through (with the store +
  generation round-trips) end-to-end on the new 5-step flow. The specific F4/F5 concern
  (four-selects-write-the-right-keys) is now covered by the unit test + the plain-browser demo, but
  the complete Half-B walkthrough on the new shell remains PENDING (Block A′.2).

## 4. Baseline record

No frozen hash moved (A73-3: 103 + MAXIMAL byte-identical; harness 5/5 unchanged). No re-baseline.
No new engine baseline (the regroup adds no engine capability — Move 11).

## 5. Findings

No new code findings. The Stack regroup touched `wizard-choices.js` STEPS only (permitted; the
serializer ignores STEPS) — proven by the STEPS-only diff + the harness reproducing all five.
F1–F11 stand.

## 6. Commit

`eco-day-73: Stack regroup — four settings steps into one Stack screen (four fields) + pure
field->key mapping & unit test; UI==CLI reproduces all five incl. TeamTracker (backstop green, 203
OK / 0 FAIL)`. Hash recorded in the ledger post-commit. Not pushed.
