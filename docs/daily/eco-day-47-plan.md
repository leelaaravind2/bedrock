# Eco-Day 47 — PLAN: The Map — impact preview (Terraform-`plan`-style) `[3 days]`

**Phase 4, Day 47. PLANNING ONLY.** This session writes this plan and nothing else — no
implementation, no builds, no file changes except this plan. Day 47 is **the STAR FEATURE**: show
**EXACTLY** which files/lines a change will affect, **BEFORE** generating — exactly computable
**because generation is deterministic**. Given `(current model, proposed model)`: regenerate both to a
temp/in-memory tree via `buildFileSet` (pure, no side effects), **hash-precheck** the changed file set
via the existing frozen-hash convention, then **line-diff** only the changed files → a machine-readable
plan `{ file, action: add|change|delete|no-op, before, after }`, shown as a **"preview changes" gate**
(the Terraform plan→review→apply split). **`[3 days]` — stage honestly; do NOT compress.**

**THE LOAD-BEARING PROPERTY (the star feature's whole value): the previewed plan EXACTLY matches what
generation actually does — previewed-diff == real-diff, BYTE-FOR-BYTE, no approximation.** This is
truthful ONLY because generation is a pure function of the blueprint. If a preview can be false
("will change" that doesn't / "won't change" that does), the feature is worthless. We PROVE it exact.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1
determinism is the crown jewel — no baseline moves silently; §3 **STOP-and-report** — *don't claim an
exact preview that wasn't proven exact*; §4 honesty — *the preview is EXACT not approximate; prove it*)
→ [`../THRAKSHA-MONTH-3.md`](../THRAKSHA-MONTH-3.md) Day 47 (the Map: impact preview — *"the previewed
plan EXACTLY matches what generation actually does; the preview must be truthful, not approximate"*) +
Day 50 (the Map's flow map + Phase-4 mid-benchmark — the NEXT unit, out of scope here) →
[`eco-day-45-report.md`](eco-day-45-report.md) (current gate: **103 baked + 10 TeamTracker + non-hash
1c/1v**; the read-only/detachable layering template) → the REAL code:
[`core/regen.ts`](../../generator/src/core/regen.ts) (**`buildFileSet`** — the pure model→file-set
function; **`computePlan`/`classify`/`applyPlan`** — the existing regen-against-disk path),
[`maxcell-driver.ts`](../../generator/src/maxcell-driver.ts) (**`hashFiles`** — the `/${relPath}\n` +
content digest convention), [`export.ts`](../../generator/src/export.ts) (export == `buildFileSet`
byte-for-byte via `applyPlan` — the disk-write anchor), and
[`day20-regression.ts`](../../generator/src/day20-regression.ts) (PART 1u/1v pattern — how an additive
non-hash PART is added + CI-enforced).

**Git (for execute):** commit to `main`, no branches, no PRs.

---

## 0. Grounded this session — resolved by reading the REAL code

Every unknown the task flagged, answered from live code (not memory):

- **`buildFileSet` is ALREADY a pure `(model, plugin) → GeneratedFile[]` function the Map can call
  twice with no side effects.** [`core/regen.ts:84`](../../generator/src/core/regen.ts) — it pushes
  into a local `files` array (shell → description → slots → tokens → entities → CI → security →
  manifest → format) and `return`s it. **No `fs` write, no global mutation, no clock/RNG.** Its purity
  is the whole determinism thesis and is proven twice-identical everywhere by `day20:regress`. The Map
  selects the plugin per-model (`selectBackendPlugin(model)`), so a backend change is a legitimate
  proposed change (each model picks its own plugin).
- **The frozen-hash convention (the precheck basis) is `hashFiles`** in
  [`maxcell-driver.ts:22`](../../generator/src/maxcell-driver.ts) and identically in every gate:
  `sha256` over each `GeneratedFile` **sorted by `relPath`**, `` h.update(`/${relPath}\n`) `` then
  `h.update(Buffer.from(content,'utf8'))`. **Applied PER-FILE** (one file's ``/${relPath}\n`` + content)
  this is the Map's per-file hash — the SAME primitive as the backstop, OS-independent (forward-slashed
  relPath, code-unit sort, no `localeCompare`). The Map does not fork the digest space; it reuses the
  building block.
- **The existing regen path (`computePlan`) diffs a file set against a project DIRECTORY on disk** —
  `classify` reads disk (`pathExists`/`bytesEqual`) and buckets create/change/unchanged/create-once/
  untouched. **The Map is DIFFERENT: it is a model→model diff** (two `buildFileSet` outputs), computed
  in-memory, **not against disk**. `computePlan` is the *apply-against-disk* half of Terraform; the Map
  is the *plan-from-two-generations* half. The Map REUSES `applyPlan`+`buildFileSet` only inside its
  correctness proof (to materialize + regen for real) — never to compute the preview.
- **`buildFileSet` output == what lands on disk, byte-for-byte.** [`export.ts`](../../generator/src/export.ts)
  + PART 1t prove `applyPlan(dir, buildFileSet(model))` writes the file set byte-identically (LF
  preserved, no drift). So a model's in-memory generation == its on-disk generation — the anchor that
  makes the correctness proof non-circular (the preview is verified THROUGH the real fs write/read).
- **`applyPlan` NEVER deletes** ([`core/regen.ts:321`](../../generator/src/core/regen.ts)) — it only
  creates/changes/skips; developer files are re-checked and never overwritten (ADR-002). So the Map's
  `delete` action is a **file-SET projection** ("generation no longer emits this file"), not a claim
  that regen removes it. This asymmetry is handled HONESTLY in the correctness proof (§3, delete case).
- **deps `{}` stays.** The line-diff is a small pure-Node LCS differ isolated in the Map module — **no
  diff library** as a Thraksha core dependency. The load-bearing contract is byte-exact `before`/`after`
  (full contents); the line-level hunks are a derived, deterministic display nicety over those.

---

## 1. What Day 47 is — the Map: a truthful, read-only impact preview

The Map answers *"if I make this change, exactly what happens?"* **before** anything is written.
Because output is a pure function of the blueprint, `(current, proposed)` → an **exact** output diff:

1. **Two generations.** `buildFileSet(current)` and `buildFileSet(proposed)` — pure, no side effects.
2. **Hash-precheck (instant file-set identification).** Per-file hash (the frozen-hash convention) of
   each set → maps keyed by `relPath`. Compare:
   - in proposed only → **`add`**
   - in current only → **`delete`**
   - in both, hash differs → **`change`**
   - in both, hash equal → **`no-op`**
3. **Line-diff only the changed files.** For `change`, diff `before` vs `after`; for `add`/`delete`,
   `before`/`after` is `''`/full content (or full content/`''`); `no-op` has no diff.
4. **The machine-readable plan** `{ file, action, before, after, hunks? }`, presented as the
   **"preview changes" gate**: preview → **approve** → apply (`applyPlan`/`POST /api/generate`).

The Map is **READ-ONLY**: it is a projection of two deterministic generations; it emits **nothing** into
the real project and has **zero** write-path into generation. Default backstop stays byte-identical.

---

## 2. The plan shape `{ file, action, before, after }` — how each action is determined

```ts
// generator/src/map/impact-map.ts  (new module — pure-Node, no deps)
export type ImpactAction = 'add' | 'change' | 'delete' | 'no-op';

export interface ImpactEntry {
  file: string;          // relPath (forward-slashed, as the digest convention requires)
  action: ImpactAction;
  before: string;        // current content ('' for add)
  after: string;         // proposed content ('' for delete)
  hunks?: LineHunk[];    // derived, deterministic line-diff — DISPLAY ONLY (change/add/delete)
}
export interface ImpactPlan {
  entries: ImpactEntry[];       // sorted by file (code-unit) — stable, OS-independent
  add: string[]; change: string[]; delete: string[]; noOp: string[];
}
export function previewImpact(current: ProjectModel, proposed: ProjectModel): Promise<ImpactPlan>;
export function fileHash(f: GeneratedFile): string;              // per-file `/${relPath}\n`+content sha256
```

**Action derivation (from the two per-file hash maps `C` = current, `P` = proposed):**

| `relPath` in `C` | in `P` | `C.hash` vs `P.hash` | action  | before / after |
|---|---|---|---|---|
| ✓ | ✓ | equal    | `no-op`  | (identical; no hunks) |
| ✓ | ✓ | differ   | `change` | current / proposed |
| ✗ | ✓ | —        | `add`    | `''` / proposed |
| ✓ | ✗ | —        | `delete` | current / `''` |

Ownership (`thraksha`/`developer`) is carried through for display, but the diff basis is the emitted
file set — the Map previews **generation output**, and developer-owned files that already exist are
still surfaced honestly (a `create-once` developer file the proposed set introduces shows as `add`).

---

## 3. THE CORRECTNESS PROOF (load-bearing) — previewed-diff == real-diff, byte-for-byte

The preview is an *in-memory two-generation diff*. To prove it is not merely self-consistent but
matches **what generation actually does on disk**, we close the loop THROUGH the real filesystem
write/read path developers use — an independent anchor, so the proof is **not circular**:

1. `preview = previewImpact(current, proposed)` — pure, in-memory (two `buildFileSet` calls +
   hash-precheck + line-diff).
2. **Materialize current for real:** `applyPlan(tmp, buildFileSet(current))` → `tmp` now IS the current
   project on disk, byte-for-byte (export identity, PART 1t). Record each file's on-disk bytes =
   `disk_before`.
3. **Apply proposed for real:** `real = applyPlan(tmp, buildFileSet(proposed))` — the developer's actual
   regen, same write engine as `POST /api/generate`. Read each touched file's on-disk bytes =
   `disk_after`.
4. **Assert byte-for-byte (a gate that can FAIL):**
   - `real.created` set == `preview.add`; each added file's `disk_after` == `preview.after`.
   - `real.changed` set == `preview.change`; each changed file's `disk_after` == `preview.after` **and**
     its `disk_before` == `preview.before`.
   - `real.unchanged` set == `preview.no-op` (skipped — Law 39).
   - **`delete` (the applyPlan asymmetry, handled honestly):** `applyPlan` never deletes (ADR-002), so
     the orphaned files remain on `tmp`. Assert `preview.delete` == `{ files on disk in tmp that are in
     buildFileSet(current) } \ { relPaths of buildFileSet(proposed) }` — a **disk-anchored file-SET
     property**. The report states plainly: the Map's `delete` means *"generation no longer emits this
     file"* (accurate); the regen writer leaves it (developer-safe) — the Map surfaces it so the
     developer decides. No overclaim that apply removes it.
5. **Twice-identical:** `previewImpact` run twice is byte-identical (deterministic — it is a pure
   function of two deterministic generations).

**Fixture cases (representative, cover every action):**
(i) add a field to an entity → `change` on a few files; (ii) add an entity → `add` files; (iii) set a
description / toggle an integration → `change` README only; (iv) identical models → all `no-op` (empty
plan); (v) `Web App` ⇄ `API-only` (or Static-Site±frontend) → `add`/`delete` of frontend files (the
delete case).

**The hash-precheck correctness (no missed/false change):** independently assert the changed set from
per-file hashes == the changed set from a brute-force full-content compare, over every fixture case —
so the hash-precheck (the instant identifier) is proven to agree with ground truth (no false
will-change, no missed change).

**Verifiability:** this is **fully string/hash-provable with NO toolchain** (pure-Node `fs` to a temp
dir — like the CI/CD YAML determinism, PART 1s). It is added to `day20:regress` as a new **PART 1w**
and thereby **CI-enforced** on all 3 OSes (`determinism.yml` already runs `day20:regress`). This is the
star feature's provable heart.

---

## 4. READ-ONLY / default-bypass — the Map moves no hash

- **New, isolated module.** `generator/src/map/impact-map.ts` (+ `map/line-diff.ts` for the isolated
  pure-Node differ), mirroring `scan/`, `detect/`, `fill/`. `buildFileSet`, the plugins, and
  `classify`/`applyPlan` do **not** import it. The Map imports FROM generation (reads it); generation
  never imports the Map.
- **Emits nothing into the generated set.** The Map is not called inside `buildFileSet`; it produces an
  `ImpactPlan` object, not a `GeneratedFile`. No new artifact appears in any project's output.
- **Adds no baked digest.** PART 1w asserts *equalities* (preview == real), not new frozen baselines —
  like PART 1v (AI-scan core) and PART 1l (fill core), which bake nothing. The **103 baked + 10
  TeamTracker + non-hash 1c/1v reproduce byte-identical**; the Map is purely additive.
- **A moved frozen hash = FINDING, STOP** (§1.1/§3). Not a re-baseline. Adding the Map must move
  nothing; if it does, latent nondeterminism was masked — diagnose, don't smooth over.
- **deps `{}` stays; core pure-Node, 0 native.** The line-differ is pure-Node LCS, isolated in `map/`;
  no diff library becomes a Thraksha dependency.

---

## 5. The Terraform split (preview → approve → apply) — CLI + server; UI honest

- **CLI (provable here):** `generator/src/map.ts` (`npm run map`), mirroring `export.ts`/`scan.ts` — a
  thin driver over `(base model, a proposed change)` that prints the `ImpactPlan` (the preview gate).
  **Read-only** (writes nothing). This is the plan→review half; apply stays `export`/`generate`.
- **Server (additive, testable here):** a new `POST /api/impact` route in `server.ts` taking the
  current + proposed blueprint (both via `assembleBlueprint` — the Day-16 UI==CLI seam) → returns the
  `ImpactPlan` JSON, to sit as the **"preview changes" gate BEFORE `POST /api/generate`**. The existing
  `GET /api/preview` (against disk) and `POST /api/generate` routes are **unchanged**; `/api/impact` is
  purely additive (no generation-path change).
- **Full interactive wizard front-end — HONEST/DEFERRED.** The live HTML/JS wiring (*edit an input →
  see the map re-render → click approve → generate*) is scoped as follow-up, exactly as Day-23's live
  AI fill was deferred. The **Map core + correctness proof + CI enforcement + CLI + the `/api/impact`
  endpoint** are proven HERE; the interactive UI polish is stated plainly as not-yet-wired (§4 — carry
  the limitation forward; no overclaim that the wizard live-previews yet).

---

## 6. Execute done-conditions (staged `[3 days]` — do NOT compress)

**Stage 1 (Day 47a) — the Map core: two-generation diff + hash-precheck + plan shape.**
1. `map/impact-map.ts`: `fileHash` (per-file frozen-hash convention), `previewImpact(current, proposed)`
   → `ImpactPlan` (two `buildFileSet` calls → per-file hash maps → add/change/delete/no-op → line-diff
   changed files), `{ file, action, before, after, hunks? }` sorted by `file`. `map/line-diff.ts`:
   isolated pure-Node deterministic LCS line-differ (LF-only; hunks are display-only).
2. Gate: `npm run build` clean; `previewImpact` twice-identical on a sample change; **`day20:regress`
   byte-identical** (module not in the generation path — no hash moved).

**Stage 2 (Day 47b) — THE CORRECTNESS PROOF + hash-precheck correctness, CI-enforced (PART 1w).**
3. Add PART 1w to `day20-regression.ts`: for each fixture case (i–v), `preview == real` (materialize
   current via `applyPlan` → apply proposed via `applyPlan` → read disk → assert
   add/change/no-op/delete byte-for-byte per §3), plus `preview.before/after` == disk bytes, plus the
   twice-identical check, plus the hash-precheck == brute-force-content-compare agreement.
4. Gate: **PART 1w green**; `day20:regress` green (103 baked + 10 + non-hash + PART 1w); the proof is a
   gate that can actually FAIL (a false will-change/won't-change ⇒ red). CI (`determinism.yml`) runs it
   on ubuntu/windows/macos unchanged.

**Stage 3 (Day 47c) — the Terraform split (CLI + additive endpoint) + read-only/bypass proof.**
5. `map.ts` CLI (`npm run map`, read-only preview print) + `POST /api/impact` (additive; existing
   routes unchanged).
6. Read-only proof (grep): **0 refs** from `buildFileSet`/the plugins/`classify`/`applyPlan` into
   `map/`; the Map emits no `GeneratedFile`; **no frozen hash moved** (backstop byte-identical). A moved
   hash = STOP-and-report finding.
7. Invariants re-confirmed: generator pure-Node (`deps {}`, 0 native — the line-differ isolated in
   `map/`); the Map reads generation, never writes it; ADR-001 (no AI anywhere in the Map — it is a
   deterministic diff).

> **STOP and report rather than write a clean-looking close if a proof fails.** A green PART 1w that
> hides a real preview/real-diff mismatch is worse than an honest red. If the preview is not exact,
> report it — do NOT claim an exact preview that wasn't proven exact.

---

## 7. Report done-conditions (`eco-day-47-report.md`)

- **The Map core:** two-generation diff (`previewImpact` over two pure `buildFileSet` calls) +
  hash-precheck (per-file frozen-hash convention) + the `{ file, action, before, after }` plan shape.
- **THE CORRECTNESS PROOF (load-bearing):** previewed-diff == real-diff, **byte-for-byte**, across all
  fixture cases (add/change/delete/no-op), **CI-enforced** (PART 1w on 3 OSes) — no false
  will-change/won't-change; the delete-case asymmetry stated honestly.
- **The hash-precheck correctness:** changed set via per-file hash == via brute-force content compare
  (no missed/false change), proven.
- **The read-only / default-bypass proof:** 0 generation-path refs into `map/`; the Map emits nothing;
  **103 baked + 10 TeamTracker + non-hash reproduce byte-identical** (no frozen hash moved).
- **Invariants:** generator pure-Node `deps {}` + 0 native (line-differ isolated); the Map reads, never
  writes generation; no AI (deterministic diff).
- **Forward-flags:** `[3 days]` scope status — the Map core + correctness proof done + CI-enforced;
  **any live UI wiring deferred/honest** (the `/api/impact` endpoint + CLI proven; the interactive
  wizard front-end not yet wired — carried as a limitation, no overclaim). **Day 50 picks up:** the
  Map's **flow map** (request lifecycle / routes / data-flow projection) + the **Phase-4 mid-benchmark**
  (export standalone + deterministic scan + optional AI scan + impact-map preview together).

---

## 8. SCOPE GUARD — what this day is NOT

- **Only the Map's impact preview.** NOT the flow map (Day 50); NOT signing (Day 55).
- **The Map is READ-ONLY** — it never changes generation. A moved frozen hash = **finding, STOP** (not
  a re-baseline).
- **The preview must be EXACT** — previewed-diff == real-diff byte-for-byte. **No approximation.** Prove
  it; if not proven exact, STOP and report.
- **No diff library as a Thraksha core dep** — `deps {}` stays; pure-Node LCS differ, isolated in `map/`.
- **The Map is a projection of two deterministic generations** (current + proposed) — truthful ONLY
  because generation is a pure function of the blueprint.
- **`[3 days]` — don't compress.** The Map core + the correctness proof is the provable heart; any live
  interactive UI wiring is honest/deferred.

---

*Day 47 plans the STAR FEATURE — the Map's Terraform-`plan`-style impact preview: given `(current,
proposed)`, `previewImpact` runs the pure `buildFileSet` twice, uses the existing per-file frozen-hash
convention (`` `/${relPath}\n` `` + content) to identify the changed file SET instantly
(add/change/delete/no-op), and line-diffs only the changed files → a machine-readable plan `{ file,
action, before, after }`, shown as a "preview changes" gate (preview→approve→apply). THE CORRECTNESS
PROOF is load-bearing and is the whole value: previewed-diff == real-diff, BYTE-FOR-BYTE — proven by
materializing the current model to a temp dir via `applyPlan`, applying the proposed model for real,
reading disk back, and asserting add/change/no-op/delete match the preview byte-for-byte (the delete
asymmetry — `applyPlan` never deletes, ADR-002 — stated honestly as a file-SET projection). This is
truthful ONLY because generation is deterministic (output = a pure function of the blueprint), and it
is fully string/hash-provable with no toolchain — added as PART 1w to `day20:regress` and CI-enforced
on 3 OSes. The Map is READ-ONLY: a new isolated `map/` module that reads generation and never writes
it, emits no `GeneratedFile`, and moves no frozen hash — the 103 baked + 10 TeamTracker + non-hash
checks reproduce byte-identical (a moved hash = finding, STOP). deps `{}` stays (the line-differ is a
pure-Node LCS, isolated). The Map core + correctness proof + CI enforcement + a read-only CLI (`npm run
map`) + an additive `POST /api/impact` endpoint are provable HERE; the full interactive wizard
front-end is honest/deferred (like Day-23's live AI fill). Day 50 picks up the Map's flow map + the
Phase-4 mid-benchmark.*
