# Thraksha — Go-Forward Harness Discipline (the nine rules)

**Status:** Standing discipline for the ecosystem phase (established Eco-Day 1, 2026-07-03). This is the determinism-integrity contract every ecosystem day runs on. It sits under [`THRAKSHA-GUARDRAILS.md`](THRAKSHA-GUARDRAILS.md) (the constitution) and is the operational "how we keep the backstop honest" companion to it. A pointer to this file belongs in the Day-9 root `CLAUDE.md`.

**The backstop it protects:** the **43 frozen digests + 10 TeamTracker relationship hashes** (re-provable via `cd generator && npm run day20:regress`), plus the additive **MAXIMAL** composition baseline (Eco-Day 1). The 43 + 10 must be byte-identical at the end of **every single day**.

---

## The nine rules

1. **The frozen backstop reproduces every day.** `npm run day20:regress` is green and the **43 + 10** (and the **MAXIMAL** cell) are byte-identical at the end of every day. Non-negotiable. If it isn't, the day is not done.

2. **New features add their OWN baselines.** A new capability records its own new, twice-identical digests for its non-default paths (traced to the report that introduced them). It never edits an existing frozen value to make a gate pass.

3. **The empty/default path is a literal bypass.** Every new capability, when unused/off/blank, reproduces the existing frozen hashes *exactly* — proven, not assumed. A feature that is off changes nothing. (The strongest form: the change is a literal no-op on the default path — e.g. Eco-Day 1 LD-1.)

4. **Hash-neutral before it lands.** Any lock-down/refactor/cleanup is proven to move **no** hash *before* it is committed — run the regression before and after, per isolated change, so neutrality is attributable to one change. Land plugin changes and harness changes separately.

5. **A moved hash is a STOP-and-report finding — never a silent re-baseline.** If a change you believed cosmetic moves a hash, that hash was masking latent nondeterminism (or something now flows into output that shouldn't). Diagnose *why*, report it, and fix the cause. Do not quietly update the recorded value to make the gate green (a green that hides a red is worse than an honest red).

6. **A deliberate re-baseline is rare, documented, and isolated.** Allowed only when intentional: old → new value + rationale, **no *other* hash moves**, recorded in that day's report. (e.g. changing the committed `MAXCELL_DESCRIPTION` deliberately re-baselines only `MAXIMAL`.)

7. **The three killers are audited for any output-touching change.** Before a new generator path ships, check: (1) no timestamp / date / UUID / RNG read in the generation path — timestamp-shaped tokens in output must be fixed *runtime-default strings*, not values read at generation time; (2) LF line endings — the generator guarantees LF (LD-1 normalizes templates at read), and no emitted file contains a CR; (3) stable key/iteration order — no emitted byte depends on hash-map/`Set`/`readdir` order (sort explicitly; emit JSON as static or sorted-key).

8. **LF is guaranteed at the generator and verified by a guard.** Line endings are normalized to LF **at template read** in every plugin (LD-1), so output is LF regardless of on-disk template state or a future git EOL flip — not merely because the templates happen to be LF. `day20:regress` asserts **no emitted file contains a CR byte** (LD-2) — a guard that can actually fail. `.gitattributes` (`* text=auto eol=lf`) is *additional* git-layer hygiene (Day 9), not the load-bearing fix.

9. **The cross-OS check joins the gate once Day 2 lands, and guard-the-guard always holds.** After Day 2 proves/fixes byte-identity on macOS/Windows/Linux, cross-OS identity becomes a standing gate condition. Independently: every baseline traces to a source report, and the consolidated harness stays byte-identical to the sum of the individual gates it replaces (the individual `day12`–`day19` gates remain as the cross-check).

---

## Notes for a cold session

- **Verify command:** `cd generator && npm run build && npm run day20:regress` → expect `PASS (43 frozen + 1 MAXIMAL baselines …)`, exit 0. `-- --emit-digests` dumps every asserted digest; `npm run maxcell` prints the MAXIMAL cell digest twice (twice-identical).
- **The digest convention (do not fork):** `sha256` over, for each `GeneratedFile` sorted by `relPath`: `` `/${relPath}\n` `` then UTF-8 content. `relPath` is always forward-slashed at the plugin (`.split(path.sep).join('/')`), so the digest is OS-independent; sorts use default code-unit comparison (no `localeCompare`).
- **The MAXIMAL fixture is the source of truth:** `generator/src/maxcell-fixture.ts` holds the committed `MAXCELL_DESCRIPTION` + `buildMaxCellModel()`; the retained driver is `generator/src/maxcell-driver.ts` (`npm run maxcell`). Neither is deleted at cleanup — that deletion is exactly what made the old `33f3ec4b…` un-reproducible.
- **No AI in the generation path (ADR-001); generated vs developer files separate (ADR-002); same input → byte-identical output (ADR-003).**
