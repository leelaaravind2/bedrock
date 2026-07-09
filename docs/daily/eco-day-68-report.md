# Eco-Day 68 — REPORT: TRUST POLISH + THE STANDALONE-EXPORT EXPERIENCE (Phase C)

**Day 68 — Phase C, TRUST (Days 61–70).** The engine already earned the trust (byte-identical
generation, Law 21, previewed==real). Day 68 makes that honesty **FELT by a stranger who has read none
of the reports** — three trust surfaces, all **pure shell/UI**: friendly errors (no raw stack as the
primary UI, but the raw always reachable), a **visible determinism "Verify" proof** that REALLY runs
generation twice, and the **standalone-export experience** (Law 21 as a felt feature at its proven
level). **It creates no new guarantee — it SHOWS the existing one.**

A **pure thin-client JS day** (the Day-64/67 shape): **no generator change, no Rust change, no new
command, no new PART** — confirmed unnecessary in the plan session and again here. Files touched:
`desktop/src/index.html`, `desktop/src/main.js`, `docs/`.

---

## 1. Baseline (before + after — proven from clean)

- **Before:** `cd generator && npm run day20:regress` → PASS, 103 baked (43 frozen + 1 MAXIMAL + version
  baselines), MAXIMAL `366e19d9deda1caf`, 203 OK / 0 FAIL.
- **After (rebuilt from clean):** `npm run build && npm run day20:regress` → **PASS**, 103 digests
  asserted, MAXIMAL `366e19d9deda1caf` **UNMOVED**, **203 OK / 0 FAIL**; `PART 1w / 1x / 1y / 1z` all
  present and green.
- `git status --short` → **only** `desktop/src/index.html`, `desktop/src/main.js`, and the docs. **No
  `generator/` source; no Rust change** (`src-tauri/` unmodified ⇒ `cargo check` unneeded — stated, not
  run for show); generator `deps {}` untouched.

Generation is untouched **by construction** (no generator/Rust file changed) and proven anyway.

---

## 2. PART 1 — Friendly errors + guards (friendly ≠ hiding) — DC-1

The Day-53 **SidecarResult** contract is honored exactly: a **rejected** promise = an ENVIRONMENT
failure ONLY; a **resolved** run (any `exit_code`) = **DATA, not a crash**. Each branch now renders a
human header; the engine's OWN message is shown, **never swallowed, never re-worded into a claim it
didn't make, never diagnosed by a heuristic**. The raw `stdout`+`stderr` stays in an expandable
`<details id="output-details">` — **always reachable**.

### The friendly-error mapping (per SidecarResult branch)

| Branch | Human header (in `#output`) | Raw detail (expandable `<details>`, always kept) |
|---|---|---|
| **Rejected promise (`Err`)** — sidecar missing/broke | "Bedrock's generator couldn't start" / "Couldn't draw the diagram" etc. + "an environment problem, not your project" | `String(err)` |
| **`Ok{exit_code:0}`** | `<cmd> — done` (the command's own stdout is the result) | — (stdout is the result; details hidden) |
| **`Ok{exit_code:1}` on `scan_project`** | "`scan_project` — CERTAIN findings · review required" (data, not an error) | — (findings shown as body) |
| **`Ok{exit_code:2}` (usage)** | "Bedrock needs an input" + the engine's OWN usage line (stderr) | raw stdout+stderr |
| **`Ok{exit_code≠0}` other (e.g. the ENOENT)** | "Bedrock's generator ran and reported a problem" + "Its exact message is below — nothing is hidden or reworded." | **the raw stack** (stdout+stderr) |

- **The result area** gained `<details id="output-details"><summary>Technical details (raw engine
  output)</summary><pre id="output-raw">…</pre></details>` below `#output`. `setOutput(kind, title,
  body, rawDetail?)` fills it — shown (collapsed) when raw exists, hidden otherwise. A new
  `setEnvError(status, title, friendly, err)` routes every rejected-promise catch through the same
  path so `String(err)` is preserved as detail (previously it was dumped as the primary body).
- **NO invented diagnoses:** the `exit≠0` message is generic ("the engine reported a problem — details
  below") + the **exact raw text**. We do NOT parse the stack to guess "the file is missing." That
  would be a heuristic about engine internals.
- **The specific raw-ENOENT case (the failure Leela hit)** is now:
  1. **PREVENTED** at the source by pre-invoke validation (below), and
  2. if it still occurs (e.g. a path that exists at check-time but not at read-time), rendered as the
     engine's **own message** in the "ran and reported a problem" branch — never swallowed, never
     re-worded, no invented diagnosis.

### Pre-invoke validation (prevents the ENOENT rather than prettifying it)

- **The Advanced raw `--model` box:** before invoking, the value must be **valid JSON OR a plausible
  file path** (`validModelArg`: `JSON.parse` succeeds, or the string ends in `.json` / contains a
  slash). If neither, a specific hint fires — *"The model box must be a BlueprintChoices JSON object
  or a path to a `.json` file… or leave it blank to use the built-in demo model"* — and **the command
  is NOT invoked**. This is exactly what produced Leela's ENOENT. **Verified live** (static preview):
  a bad model input → **0 invokes**; valid JSON → 1 invoke; a path-like value → invokes. This is
  **guidance, not a diagnosis**.
- Wizard Generate: target dir non-empty (already guarded); project name defaults to `MyApp`
  (`captureCurrentStep`).
- Verify / Compare: require the Bedrock backend / saved projects (guarded).

### Empty states (confirmed + tidy)

My projects "(no saved projects yet)"; Compare "(no saved projects yet)"; the diagram "No project
generated yet"; the Project-view baseline label "No saved baseline yet…". All present and correct.

**Honesty constraint held:** nothing swallowed, nothing fabricated, no engine message paraphrased into
an untruth, no heuristic diagnosis of internals; the raw stack is ALWAYS reachable.

---

## 3. PART 2 — The visible determinism proof ("Verify") — DC-2 (load-bearing)

A **"Verify determinism"** button (Project-view card, on the CURRENT wizard blueprint) that **REALLY
runs generation twice** — reusing the certified pair surfaces, **no engine change, no canned badge**.

### The mechanism (exactly how it proves byte-identity)

- `model = JSON.stringify({ current: buildBlueprintChoices(selections), proposed:
  buildBlueprintChoices(selections) })` — **the same blueprint on both sides**.
- `invoke('impact_nodes', { model })`. Inside the engine, `previewImpact` runs `buildFileSet`
  **TWICE** (once for `current`, once for `proposed`) — a **genuine double-generation** — then diffs.
  Pointing the pair at a blueprint **vs itself** makes the diff's **empty result the byte-identity
  proof** (this is **PART 1z-C's empty bypass**, reused as a user-facing Verify).
- The JS check is `impacted.nodes.length === 0 && impacted.edges.length === 0` — it compares the
  **ENGINE's structured result** to empty. **JS computes no diff of its own.**
- `invoke('impact_preview', { model })` supplies the human "0 add, 0 change, 0 delete, N unchanged"
  text, shown as the expandable detail.

**Verified live** (static preview, with a stub backend): the button invokes `impact_nodes` **then**
`impact_preview` (a real double-generation call sequence); an empty `{nodes:[],edges:[]}` →
"Verified — byte-identical"; a (stubbed) **non-empty** result → **shown honestly** as "Verify —
UNEXPECTED difference (please report)", never hidden; an `exit≠0` from the engine → surfaced via
`renderResult` ("ran and reported a problem"), with the raw kept. **It is NOT a canned badge** — a
hardcoded "✓" would be the exact plausible-but-unverified output Bedrock exists to replace, and would
be a FINDING.

### The claim, worded EXACTLY

> **Verified — byte-identical.** Bedrock generated your project twice, independently, and compared
> every file: 0 differences. The same blueprint always produces byte-identical code. **This proves
> reproducibility — generation is a pure function of your blueprint — not correctness or security.**

The claim is about **byte-identity / reproducibility ONLY**. The UI never implies correctness,
security, or bug-freedom.

### If NOT empty (must never happen for a blueprint vs itself)

The difference is shown as an **unexpected result / real finding** — "That should be impossible for a
deterministic engine — this is a real finding, not a display glitch." Never hidden.

---

## 4. PART 3 — The standalone-export experience (Law 21, felt) — DC-3

On `export_project` **exit 0**, the shell surfaces the **ENGINE's own stdout** verbatim (from
`export.ts:73–74`):

```
Exported <name> (<N> files) → <dir>
Standalone: 0 functional Thraksha references; run the container path with:
  cd <dir> && docker compose up --build
```

The file count is real per-export data; the standalone line + the container command are the engine's
CI-proven facts. **JS asserts nothing** — it renders `r.stdout`.

Beside it, a **STATIC `#export-note`** (baked in `index.html`; JS only toggles `hidden`, computing
nothing about this particular export) states Law 21 **at its PROVEN level**:

> **Standalone project — you own this.** It has **no functional dependency on Bedrock**: 0
> dependency-manifest entries and 0 functional imports (statically verified + require-graph checked in
> CI, **PART 1t**). Inert provenance comments (ownership markers) remain in the source and don't affect
> build or run. Run it with Bedrock deleted using the `docker compose up --build` command shown above.
> **(The live container boot is not run here.)**

- **Law 21 at its proven level ONLY:** "no FUNCTIONAL dependency (0 dep entries + 0 functional imports;
  static + require-graph, PART 1t)". **NOT** "no mention of Bedrock anywhere" — inert provenance
  comments (`THRAKSHA-OWNED`) remain (stripping them would move frozen hashes, PART 1t). The **live
  container boot was never run** — the note says so; no boot is claimed.
- The note is shown ONLY on export success and hidden on every other output (`setOutput` hides it by
  default; `renderResult` reveals it for `export_project` exit 0). **Verified live** (static preview,
  screenshot): the engine's stdout + the static note render together on a stubbed `Exported
  TeamTracker (114 files)` success.

---

## 5. Honesty split — built + proven HERE vs deferred

- **Proven HERE:** `node --check src/main.js` and `src/wizard-choices.js` (both OK); a static browser
  preview (python `http.server` over `desktop/src`) exercising — with `window.__TAURI__` absent AND a
  stub backend — the friendly-error branches (raw detail expandable), pre-invoke validation firing
  **before** any invoke, the Verify button's real `impact_nodes`→`impact_preview` call sequence + its
  exact wording + the honest non-empty path, the export note toggling only on exit 0, the empty
  states, and **zero console errors**; the backstop from clean (203 OK / MAXIMAL unmoved).
- **DEFERRED to Leela's Windows machine (no live run claimed):** the LIVE packaged GUI — a real Verify
  double-generation through the packaged sidecar, a real `export_project` writing a tree, and the
  friendly errors in the running app. **No live packaged GUI run is claimed in this report.** (Also
  the live container boot of an exported project remains DEFERRED, per PART 1t.)

---

## 6. The generation-untouched proof (DC-4)

- `cd generator && npm run build && npm run day20:regress` → **PASS**; 103 digests asserted; MAXIMAL
  `366e19d9deda1caf` **byte-identical / UNMOVED**; **203 OK / 0 FAIL**; `PART 1w/1x/1y/1z` unchanged
  and green.
- `git status --short` → only `desktop/src/{index.html, main.js}` + docs. **No generator source; no
  Rust change** (`src-tauri/` untouched ⇒ `cargo check` unneeded — stated); `deps {}`.
- **No BAKED hash moved.** (A move would have been a FINDING → STOP.)

---

## 7. Forward-flags

- **Day 69 — final packaged re-certification:** the wizard + the visual/interactive/diff Map + Verify +
  export driven through the **packaged MSIX**; the backstop + `PART 1y/1z` green; the **packaged
  sidecar reproducing the 103 digests** (`resources/gen` synced — `sync-gen:check`). The deferred live
  GUI runs above are Day-69/Leela's-machine work.
- **Day 70 — release:** Bedrock / Microsoft Store / MSIX / Windows-only + the 4 Store steps.

---

## 8. Scope-guard checklist (all held)

- **Friendly ≠ hiding** — never swallowed / fabricated / re-worded / diagnosed; raw always reachable. ✔
- **The Verify proof REALLY runs** — a real double-generation (M-vs-M; `previewImpact` builds the file
  set twice); the JS check compares the engine's structured result to empty; **not a canned badge**; a
  non-empty delta is shown honestly. ✔
- **The Verify claim is byte-identity / reproducibility ONLY** — not correctness/security/bug-freedom. ✔
- **Law 21 at its PROVEN level ONLY** — "no FUNCTIONAL dependency (0 deps + 0 functional imports;
  static + require-graph, PART 1t)"; inert provenance comments REMAIN; the live container boot is NOT
  run (not claimed); never "no mention of Bedrock anywhere"; the explainer is STATIC (JS asserts
  nothing). ✔
- **Surface the ENGINE's own export stdout** — file count + the standalone line + the container command
  rendered from `r.stdout`. ✔
- **No generator change, no Rust change, no new command, no new PART.** ✔
- **The 103 baked + 10 + MAXIMAL `366e19d9` byte-identical; PART 1w/1x/1y/1z untouched; `deps {}`.** ✔
- **The live packaged GUI runs are Leela's-machine** (honest — no claimed live run). **No AI**
  (ADR-001). ✔

---

*Day 68: trust polish + the standalone-export experience — the day the already-earned honesty stops
living only in the docs and starts being visible in the app, where a stranger who has read nothing can
SEE that Bedrock knows. Three surfaces, all pure shell/UI: friendly errors (the raw stack always one
click away — friendly ≠ hiding), a REAL Verify double-generation (M-vs-M through the certified pair
surfaces — reproducibility, a pure function of your blueprint, never a canned badge), and the
standalone-export experience (the engine's own facts + Law 21 at its proven level — no functional
dependency, inert provenance comments remain, the live boot deferred). Generation untouched: 103 baked
+ MAXIMAL `366e19d9` byte-identical, PART 1w/1x/1y/1z unchanged, `deps {}`, no Rust (cargo check
unneeded — stated).*
