# Determinism

Determinism is the product. Same input → byte-identical output, proven by frozen output hashes. This
document describes how that is enforced and what the numbers mean.

## The backstop

```
cd generator && npm run build && npm run day20:regress
```

This is the single source of truth. It must be green at the end of every build day; a pre-commit hook
runs it and blocks a red commit; CI runs it across ubuntu/windows/macos. Expected:

**203 OK / 0 FAIL** — 103 baked digests + 10 TeamTracker relationship hashes + the non-hash gates
(PART 1c–1z). The authoritative list of what it checks is the harness itself
(`generator/src/day20-regression.ts`); never trust a summary over the code.

## What day20:regress covers

- **The 103 baked digests** — 43 frozen + 60 additive.
- **The 10 TeamTracker relationship hashes** — the belongs-to foreign-key structure across five stacks ×
  two databases (PART 1d).
- **The non-hash gates (PART 1c–1z)** — each asserts a property rather than a byte-hash (for example,
  PART 1t: Law 21's zero functional dependency; PART 1y: flow-SVG determinism and faithfulness; PART 1z:
  impact attribution total and disjoint). Non-hash checks can be *added* without changing the 103 (the
  Day-58 → Day-69 count grew 194 → 203 via PART 1y[4] + 1z[5], both non-hash).

### The digest arithmetic — 43 / 103 / 10 / 203, reconciled from the source

Read from `generator/src/day20-regression.ts`; each number is derived from named constants/loops, not
from the print (Block-A audit, F20). Two of the four compose cleanly; the fourth does not.

- **43 = the frozen baseline set** = the eight frozen digest tables, summed:
  `FROZEN` (20; the 5 stacks × 2 DBs × {DemoApp, TeamTracker} matrix, L59–80) + `NAMING` (5, L82–88) +
  `FORMATTING` (2, L90–93) + `SIMPLE` (4, L95–100) + `COMPOSITION` (2, L102–105) + `API_ONLY` (6,
  L107–114) + `EMAIL` (2, L116–119) + `AI_HOOK` (2, L121–124). `20+5+2+4+2+6+2+2 = 43`. ✔ clean.
- **103 = `digestManifest.length`** — every digest added via `bake()` (L279) and emitted by
  `--emit-digests` (L1787). It is the **43 frozen + 60 additive** ecosystem baselines (MAXIMAL 1 + version
  5 + slots 1 + has-many 10 + decimal 10 + field-key 5 + Figma 1 + worker 10 + CLI/GraphQL/static 11 +
  CI/CD 5 + security 1 = 60; `43+60 = 103`). ✔ clean. **NB:** the print's parenthetical `(43 frozen +
  1 MAXIMAL)` is a *partial label*, not the full composition — it names 44 of the 103.
- **10 = the TeamTracker relationship hashes** (PART 1d, L376–387) — the 5 stacks × 2 DBs TeamTracker
  subset, re-asserted a *second* way, via the `addEntity` UI path, against the **same** `FROZEN` values
  already inside the matrix of 20. They are **not 10 additional baked digests** beyond the 103; they are
  a re-proof (UI==CLI) of ten digests the 103 already contains.
- **203 = the count of passing `record()` assertions** (`pass`/OK lines, L217–218) — the per-digest
  comparisons **plus** every non-hash property check. **This does NOT compose as `103 + N`:** some digest
  groups are asserted in a *single* batched `record()` (e.g., the 10 TeamTracker UI digests → one
  `record(uiOk,…)` at L387), while many `record()` lines assert non-hash properties that `bake()` no
  digest. `digestManifest.length` (→103) and the `record()`-OK tally (→203) count **different things**;
  they intersect but do not add. **Honest statement:** 43, 103 and 10 reconcile to named source
  constants; 203 is a structural assertion-count, not an arithmetic sum of the others — and should be
  reported as "203 checks passed," never as "203 digests."

## MAXIMAL — the crown jewel

The maximal-composition cell (every feature at once) has digest **`366e19d9deda1caf…`**. It has not moved
since Eco-Day 29. A moved MAXIMAL is an unconditional STOP.

There is exactly one deliberate re-baseline in its history: Eco-Day 29, the field-key consistency fix
(old `929c379f…` → new `366e19d9…`), documented in `day20-regression.ts` with old → new + rationale. That
is what a legitimate re-baseline looks like — intentional, documented, isolated, recorded.

## The re-baseline policy

- A hash you did **not** intend to move that moves is a **finding → STOP**. It means latent
  nondeterminism was masked, or something flows into output that should not. Diagnose *why* before
  concluding anything; never silently re-baseline to make the light green.
- A **deliberate** re-baseline is allowed only when it is intentional, documented (old → new +
  rationale), isolated (no *other* baseline moves), and recorded in the day's report.

The three determinism killers to check against any output-touching change: embedded
timestamps/dates/UUIDs/random values; CRLF vs LF (output is LF-only; LD-1 normalizes at read, LD-2 guards
no emitted CR); and unstable key/iteration order (the model is serialized with sorted keys; the digest
sorts by `relPath` with code-unit comparison, making it OS-independent).

## The digest convention

`sha256` over, for each generated file sorted by `relPath`: `` `/${relPath}\n` `` then the UTF-8 content.
`relPath` is forward-slashed at the plugin; sorts use default code-unit comparison (no `localeCompare`).
This is what makes the digest identical across operating systems. The committed UI==CLI harness
(`desktop/tools/ui-cli-proof.mjs`) reuses this exact convention to prove the wizard's output byte-identical
to the certified baselines. (As of Block A, `hashFiles` is **re-implemented**, not imported — a
maintenance trap tracked as F14-C/F16, scheduled for extraction to a canonical module on Day 75c.)

### The four UI==CLI free-leg baselines — provenance (Block-A audit, F19)

The harness asserts five digests. **One is anchored:** TeamTracker (`9e01210c55a5…`) is the Spring
Boot|PostgreSQL entry of the **frozen** table — proven byte-identical daily since Eco-Day 29. **Four are
the harness's own** (blank / restApi / crud / worker — settings-only templates, not in the frozen 103).
Their history must be stated with its qualifier, because it is easy to over-flatten:

- The Day-61 report recorded these four as **12-char prefixes** (`f95bc87d504d` / `6f6e543a2aff` /
  `54b0852cb532` / `fbc6c6e9aad2`) — an ad-hoc, uncommitted proof (F3).
- Day 71 rebuilt the harness and reproduced all four **prefixes exactly on first run**, then recorded the
  **full 64-char digests** as the committed baseline (a 48-bit prior-match, plus the anchor leg vouching
  for the harness on certified ground).
- **The precise claim:** *no **frozen** hash (the 103 / the 10 / MAXIMAL) moved, and no re-baseline of a
  frozen hash occurred.* It is **not** the stronger "no baseline of any kind entered the repo" — four
  new full-length harness baselines did, disclosed, backed by matching prefixes and the anchor. The
  short-hand "no re-baseline occurred anywhere in the arc" must never appear without this qualifier.

## Stamp ≠ hash (the sync-gen stamp)

The **sync-gen stamp** is a content hash of the sidecar payload (`resources/gen`). It changes
**legitimately** when new dist entries land — for example it grew from `c43773ae…`/237 files (Day 58) to
`83ffd0ad…`/245 files (Day 69) as the flow-svg and impact-nodes entries were added. **That is not a
generation-hash move.** The load-bearing claim is always stated as: *the bundled node still reproduces the
103 frozen digests byte-identical* — never as the stamp. Confusing the two in either direction is a
failure: panicking at a stamp is noise; shrugging at a moved baked hash is catastrophe.

## Packaged == certified

The shipped sidecar must reproduce the 103 frozen digests byte-identical to the certified generator. This
is proven by running the bundled node against
`resources/gen/dist/day20-regression.js --emit-digests` (proof: `eco-day-69-report.md` DC-2, bundled node
v22.21.0 reproduces the 103). If the bundled binary or a fresh `resources/gen` is absent in a given
environment (both are gitignored, regenerated not committed), the packaged re-proof is deferred and named
as such — never faked.
