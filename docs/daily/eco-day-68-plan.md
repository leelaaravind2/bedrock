# Eco-Day 68 — PLAN: TRUST POLISH + THE STANDALONE-EXPORT EXPERIENCE

**Day 68 — Phase C, TRUST (Days 61–70).** The engine already earned the trust (byte-identical generation,
Law 21, previewed==real). Day 68 makes that honesty **FELT by a stranger who has read none of the
reports** — three trust surfaces, all **shell/UI**: friendly errors (no raw stack traces), the **visible
determinism "Verify" proof**, and the **standalone-export experience** (Law 21 as a felt feature). **It
creates no new guarantee — it SHOWS the existing one.**

**This session is PLAN ONLY. No code, no builds.**

**RELEASE SCOPE (LOCKED):** Bedrock / Microsoft Store / MSIX / Microsoft-signs-at-certification /
Windows-only.

---

## 0. THE FINDINGS (read live this session — all three parts are pure shell/UI)

- **The raw-ENOENT case reproduces** (the failure Leela hit): `node export.js <dir> --model
  /nonexistent.json` → `Error: ENOENT … open '…nonexistent.json'` + a **Node stack trace** → `process.exit(1)`.
  In the shell that returns `Ok{ exit_code: 1, stderr: <the stack> }` — and the current `renderResult`
  shows it as a **raw blob** ("completed (exit 1)"). This is the primary thing to humanize.
- **`export.ts` already prints the Law-21 facts** ([`export.ts:73`](../../generator/src/export.ts)):
  `Exported <name> (<N> files) → <dir>` + `Standalone: 0 functional Thraksha references; run … docker
  compose up --build`. **The export experience surfaces the ENGINE's own stdout** — no JS assertion.
- **PART 1t proves the exact Law-21 level** ([`day20-regression.ts:1294`](../../generator/src/day20-regression.ts)):
  standalone = **0 FUNCTIONAL Thraksha refs (0 dependency-manifest entries + 0 functional imports)** +
  pinned Dockerfile; **inert provenance comments (THRAKSHA-OWNED) REMAIN and are NOT stripped** (stripping
  moves frozen hashes); the **live container boot is DEFERRED**.
- **Verify needs NO engine change** — confirmed live: `impact_nodes({ current: M, proposed: M })` →
  `{"nodes":[],"edges":[]}` (empty = byte-identical). `previewImpact` runs `buildFileSet` **TWICE**
  internally, so pointing the pair at **a blueprint vs itself** is a **real double-generation + diff** whose
  empty result IS the byte-identity proof (the PART-1z-C empty bypass, reused as a user Verify).

**→ NO generator change, NO Rust change, NO new command, NO new PART.** A pure thin-client JS day (the
Day-64/67 shape); the 103 baked byte-identical by construction.

---

## 1. PART 1 — FRIENDLY ERRORS + GUARDS (friendly ≠ hiding) — DC-1

Humanize the SidecarResult branches in `main.js` **while preserving the raw truth** (an expandable
`<details>` — never discarded, never paraphrased into an untruth, never a fabricated success, never an
invented diagnosis of engine internals):

| Branch | Human message (header) | Raw detail (expandable, always kept) |
|---|---|---|
| **Rejected promise (`Err`)** | "Bedrock's generator couldn't start — an environment problem, not your project." | `String(err)` |
| **`Ok{exit_code:0}`** | success (the command's own stdout — the result) | — (stdout is the result) |
| **`Ok{exit_code:1}` on scan** | "CERTAIN findings — review required" (data, not an error) | the scan findings (stdout) |
| **`Ok{exit_code:2}` (usage)** | "Bedrock needs an input." + the usage line | stderr (the usage) |
| **`Ok{exit_code≠0}` other (e.g. ENOENT)** | "Bedrock's engine ran and reported an error — see the details." | stdout + stderr (the raw stack) |

- **The results area** gains a `<details id="output-details">Technical details<pre>…</pre></details>`
  below the human `#output`; `setOutput(kind, title, body, rawDetail?)` fills it (shown when raw exists,
  hidden otherwise). **The raw stack is ALWAYS reachable** — friendly, not hidden.
- **NO invented diagnoses:** the exit≠0 message is generic ("the engine reported an error — details
  below") + the exact raw text. We do NOT parse the stack to guess "the file is missing" (a heuristic
  about internals). We DO give a **pre-invoke input hint** (below), which is guidance, not a diagnosis.
- **Pre-invoke validation (prevents the ENOENT before it happens):**
  - Wizard Generate: target dir non-empty (already guarded); project name non-empty (defaults MyApp).
  - **The Advanced raw `--model` box:** before invoking, check the value is **valid JSON OR a plausible
    file path**; if neither, hint "Enter a BlueprintChoices JSON or a file path" and **do not invoke** (this
    is exactly what produced Leela's ENOENT).
  - Compare/Verify: require a saved project / a blueprint.
- **Empty states** on each card (My projects "(no saved projects yet)", Compare "(no saved projects)", the
  diagram "No project generated yet") — already present; confirm + tidy.

**HONESTY CONSTRAINT:** never swallow an error, fabricate a success, paraphrase an engine message into
something it didn't say, or invent a diagnosis. The raw detail stays reachable.

---

## 2. PART 2 — THE VISIBLE DETERMINISM PROOF ("Verify") — DC-2 (load-bearing honesty)

A **"Verify determinism"** action (in the Project view card, on the current blueprint) that **REALLY runs
generation twice** — reusing the certified pair surfaces, **no engine change, no canned badge**:

- `model = buildBlueprintChoices(selections)`; `pair = JSON.stringify({ current: model, proposed: model })`.
- `invoke('impact_nodes', { model: pair })` → parse → **`nodes.length === 0 && edges.length === 0` ⇒
  BYTE-IDENTICAL** (the engine generated the blueprint TWICE via `previewImpact`'s two `buildFileSet` runs
  and found 0 differences). `invoke('impact_preview', { model: pair })` → the human text ("0 add, 0
  change, 0 delete, N unchanged") shown as the detail.
- **The claim, worded EXACTLY:** *"Verified — Bedrock generated your project **twice, independently**, and
  compared every file: **0 differences**. The same blueprint always produces byte-identical code. (This
  proves **reproducibility** — generation is a pure function of your blueprint — **not** correctness or
  security.)"*
- **If NOT empty** (must never happen for a blueprint vs itself): show the differences honestly as an
  unexpected result — never hide it.

**REAL, not canned:** the empty result comes from the engine actually double-generating + diffing (PART
1z-C proves this mechanism). The JS check is `nodes.length === 0` — comparing the ENGINE's structured
result to empty, **not** a JS-computed diff. **A canned "✓ deterministic" badge would be a FINDING** — the
exact plausible-but-unverified output Bedrock exists to replace.

---

## 3. PART 3 — THE STANDALONE-EXPORT EXPERIENCE (Law 21, felt) — DC-3

At export success, surface the **ENGINE's own facts** + a **static Law-21 explainer at its PROVEN level**:

- On `export_project` exit 0, the stdout already carries `Exported <name> (<N> files) → <dir>` + `Standalone:
  0 functional Thraksha references; run … docker compose up --build`. **Show it** (the file count is real
  per-export data; the standalone line is the engine's CI-proven guarantee).
- Add a **static explainer** (always-true, matching PART 1t — NOT a per-export JS assertion): *"This is a
  **standalone** project — **no functional dependency on Bedrock** (0 dependency-manifest entries, 0
  functional imports; CI-proven, PART 1t). It keeps **inert provenance comments** (ownership markers) that
  don't affect build/run. Run it with Bedrock deleted: `cd <dir> && docker compose up --build`. (The live
  container boot is **not run here**.)"*
- **LAW 21 AT ITS PROVEN LEVEL ONLY:** "no FUNCTIONAL dependency" — **NOT** "no mention of Bedrock
  anywhere" (inert provenance comments remain). The **live container boot was never run** — do not claim
  it. **JS does NOT scan the exported tree to assert Law 21** (PART 1t proves it; the UI states it at that
  level).

---

## 4. THE SPINE — make the honesty visible; create no new guarantee

1. **FRIENDLY ≠ HIDING:** humanize the SidecarResult branches; never swallow/fabricate/paraphrase-into-
   untruth/invent-a-diagnosis. Raw detail always reachable.
2. **THE VERIFY PROOF IS REAL:** it actually double-generates (via `impact_nodes`/`impact_preview` on a
   blueprint vs itself, PART 1z-C) — never a canned badge. A fake/assumed verification = a FINDING.
3. **LAW 21 AT ITS PROVEN LEVEL:** functional-dependency-free (0 deps + 0 functional imports; static +
   require-graph); inert provenance comments REMAIN; live boot DEFERRED. No overclaim; the Verify claim is
   about **byte-identity, not correctness/security**.
4. **NO ENGINE CHANGE:** reuse `export`/`impact_preview`/`impact_nodes`/the SidecarResult (confirmed §0).
   *(No new file needed; if one were, it'd be NEW FILES ONLY + flagged + proven — not needed.)*
5. **GENERATION UNTOUCHED:** the 103 baked + 10 + MAXIMAL `366e19d9…` byte-identical; PART 1w/1x/1y/1z
   unchanged; `deps {}`. **A moved BAKED hash = FINDING, STOP.** *(No generator/Rust change ⇒ untouched by
   construction; proven anyway.)*
6. **HONEST:** the UI + the Verify mechanism + `node --check` + a static preview HERE; the **live packaged
   GUI** (a real Verify run, a real export, the friendly errors in the running app) DEFERRED to Leela's
   machine — no claimed live run.

### The generation-untouched proof (run in EXECUTE)
- `cd generator && npm run day20:regress` → 203 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…` byte-identical;
  PART 1w/1x/1y/1z unchanged.
- `git status --short` → only `desktop/src/` + docs; **no `generator/` source, no Rust change**
  (`src-tauri/` unmodified → `cargo check` unneeded, stated); `deps {}`.

---

## 5. EXECUTE done-conditions

1. **FRIENDLY ERRORS + GUARDS:** the SidecarResult branches render as human messages with raw detail in an
   expandable `<details>` (never discarded); pre-invoke validation (name / target dir / a valid JSON-or-
   path for the raw `--model` box — the ENOENT case prevented) with specific hints; empty states on each
   card. **No raw stack as the primary UI; no swallowed errors, no fabricated successes, no invented
   diagnoses.**
2. **THE VERIFY PROOF:** a "Verify determinism" action that REALLY runs generation twice (via
   `impact_nodes`/`impact_preview` on the blueprint vs itself) and shows **byte-identical / 0 differences**
   — never a canned badge. Claim worded exactly (reproducibility, **not** correctness/security).
3. **THE STANDALONE-EXPORT EXPERIENCE:** at export, surface the ENGINE's own facts (file count + the
   standalone line + the container command) + the Law-21 guarantee **at its proven level** (functional-
   dependency-free; inert provenance comments remain; live boot not run here). **No overclaim; no JS
   Law-21 assertion.**
4. **NO ENGINE CHANGE (verify):** reuse existing surfaces. *(No new generator file/command/PART/Rust —
   confirmed §0.)*
5. **GENERATION UNTOUCHED:** 103 baked + 10 + MAXIMAL `366e19d9…` byte-identical (from clean); PART
   1w/1x/1y/1z unchanged; git only `desktop/src/` + docs; no generator source; no Rust change (stated);
   `deps {}`. **A moved BAKED hash = FINDING, STOP.**
6. **Honest:** the UI + mechanisms + `node --check` + a static preview HERE; the live packaged GUI (Verify,
   export, friendly errors in the running app) DEFERRED (Leela's machine) — no claimed live run.

## 6. REPORT done-conditions

`eco-day-68-report.md`: the friendly-error mapping (per SidecarResult branch; raw detail preserved in
expandable details; the ENOENT case specifically fixed) + validation/empty states; **THE VERIFY
MECHANISM** (exactly how it proves byte-identity — a REAL double-generation via `impact_nodes`/
`impact_preview` on the blueprint vs itself, PART 1z-C reused; the precise claim wording; **no engine
change**); the standalone-export experience (the engine's own facts surfaced + the Law-21 wording at its
PROVEN level — functional-dependency-free, inert provenance comments remain, live boot deferred); the
generation-untouched proof (103 baked + MAXIMAL byte-identical; PART 1w/1x/1y/1z unchanged; no generator/
Rust change; `deps {}`); honest build-here vs deferred. **Forward-flags:** Day 69 = the final packaged
re-certification (wizard + visual/interactive/diff Map + Verify + export through the packaged MSIX; the
backstop + PART 1y/1z green; the packaged sidecar reproducing the 103 digests); Day 70 = release + the 4
Store steps.

---

## 7. SCOPE GUARD — OUT

- **NOT** the re-certification (Day 69) or the release (Day 70).
- **Friendly ≠ hiding:** never swallow an error, fabricate a success, paraphrase an engine message into
  something it didn't say, or invent a diagnosis — a **fabricated/canned verification = a FINDING**.
- **The Verify proof must REALLY run** (a real double-generation) — no canned "✓ deterministic" badge.
- **Law 21 stated AT ITS PROVEN LEVEL ONLY** (functional-dependency-free + static/require-graph; **inert
  provenance comments REMAIN**; the **live container boot is DEFERRED** — do NOT claim it).
- The **Verify claim is about byte-identity, NOT correctness/security**.
- **PREFER no engine change** (any = NEW FILES ONLY, flagged, proven — not needed).
- The **103 baked + 10 + MAXIMAL byte-identical** (a move = FINDING, STOP); PART 1w/1x/1y/1z untouched;
  `deps {}`.
- The **live packaged GUI runs are Leela's-machine** (honest — no claimed live run). **No AI** (ADR-001).

## 8. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails (§4 honesty — the day's theme) + the extension doc + Day-67/66/53/41 reports + the real
   code (`export.ts`, PART 1t, `main.js` render/guard, the ENOENT path) + confirmed Verify-by-empty-bypass —
   **yes**.
2. Session = **PLAN** — this file only; no code, no build — **yes**.
3. Frozen baselines NOT to move: 103 baked + 10 + MAXIMAL `366e19d9…`; Day 68 is shell-only — moves
   nothing; proven anyway — **understood**.
4. AI touchpoints: **none** — Verify + errors + export are AI-free reuse of certified surfaces (ADR-001) —
   **yes**.
5. The default/empty path a literal bypass: Verify IS the empty bypass (model vs itself → 0); no existing
   output changed — **honored**.
6. The three determinism killers: N/A (no generator output touched — shell-only) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + the Verify's real double-run + `git status`;
   a canned verify / an overclaimed Law 21 / a moved hash = STOP — **yes**.
8. Overclaim / out-of-scope watch: no correctness/security claim from Verify; no live-boot claim from
   export; no invented diagnosis; no canned badge; no live GUI run claimed — **guarded**.

---

*Day 68 plan: trust polish + the standalone-export experience — Phase C, making the honesty FELT. All three
surfaces are pure shell/UI (confirmed by reading the code: no generator change, no Rust, no new command, no
new PART). PART 1 — friendly errors: humanize the SidecarResult branches (Err = "the generator couldn't
start, an environment problem"; exit 2 = "needs an input"; other exit≠0 incl. the ENOENT Leela hit = "the
engine reported an error — see details") with the RAW detail always kept in an expandable `<details>`
(friendly ≠ hiding — never swallowed, fabricated, paraphrased-into-untruth, or diagnosed by a heuristic),
plus pre-invoke validation (a valid-JSON-or-path check on the Advanced `--model` box PREVENTS the ENOENT) +
empty states. PART 2 — the visible determinism "Verify": a REAL double-generation reusing the certified
pair surfaces — `impact_nodes({ current: this-blueprint, proposed: this-blueprint })` → empty ⇒ Bedrock
generated the project TWICE (previewImpact's two buildFileSet runs) and found 0 differences (byte-identical)
— worded exactly ("reproducibility, a pure function of your blueprint — NOT correctness or security"); a
canned badge would be a FINDING; NO engine change (the empty bypass, PART 1z-C, reused). PART 3 — the
standalone-export experience: surface export.ts's OWN stdout (file count + "0 functional Thraksha
references" + the container command) + a static Law-21 explainer at its PROVEN level (no FUNCTIONAL
dependency — 0 deps + 0 functional imports, CI-proven PART 1t; inert provenance comments REMAIN; the live
container boot is DEFERRED, not claimed). Generation untouched: no generator/Rust change ⇒ the 103 baked +
10 + MAXIMAL `366e19d9…` byte-identical, PART 1w/1x/1y/1z unchanged, `deps {}` (cargo check unneeded —
stated). Honest: the UI + the Verify mechanism + `node --check` + a static preview HERE; the live packaged
GUI (Verify, export, friendly errors in the running app) DEFERRED to Leela's machine. No code this session —
this is the day the honesty stops being in the docs and starts being in the app, where a stranger who has
read nothing can SEE that Bedrock knows.*
