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

- **The 103 baked digests** — 43 frozen (the 20 web-app matrix + 23 alternative baselines: naming,
  formatting, architecture, composition, api-only, email, ai-hook) + 60 additive (MAXIMAL, versions,
  slots, has-many, decimal, field-key, Figma, worker, CLI/GraphQL/static, CI/CD, security). The extension
  (Days 61–70) baked nothing new — 103 stayed 103 (proof: `eco-day-69-report.md` DC-1).
- **The 10 TeamTracker relationship hashes** — the belongs-to foreign-key structure across five stacks ×
  two databases (PART 1d).
- **The non-hash gates (PART 1c–1z)** — each asserts a property rather than a byte-hash (for example,
  PART 1t: Law 21's zero functional dependency; PART 1y: flow-SVG determinism and faithfulness; PART 1z:
  impact attribution total and disjoint). Non-hash checks can be *added* without changing the 103 (the
  Day-58 → Day-69 count grew 194 → 203 via PART 1y[4] + 1z[5], both non-hash).

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
to the certified baselines.

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
