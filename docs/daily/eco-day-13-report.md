# Eco-Day 13 — REPORT: Org-policy allow/ban layer

**Phase 1, Day 13 (`[3 days]` unit — completed in one execute pass; staged internally).** ADR-004 is now real: a pure, versioned **org-profile** governs which framework/version choices are available and what the defaults are — **allow/ban/force-default with soft/hard enforcement** — as a **separate input-shaping layer that never touches generation.** Profile-absent is a literal bypass **by construction**.

Plan: [`eco-day-13-plan.md`](eco-day-13-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§4 honesty). Builds on [`eco-day-11-report.md`](eco-day-11-report.md) (the version pins it governs).

---

## THE VERDICT

> ✅ **The org-policy allow/ban layer is a pure, additive input-shaping module — `applyProfile(fullOptionSet, profile?) → {optionSet, defaults, advisories}` — that NEVER touches `createProjectModel`, the plugins, or generation.** Profile-ABSENT → the 49 frozen digests (43 + 10 + MAXIMAL + 5 version) reproduce **byte-identical** (a literal bypass by construction). A concrete profile deterministically filters the option set + forces defaults (twice-identical); the resolved concrete blueprint generates exactly as Day 11 proved. Soft/hard enforcement is input-side; **no profile metadata leaks into generated output.** Generator still **pure-Node**; **no frozen hash moved.**
>
> **Day 16 = the progressive-disclosure wizard that surfaces the profile-filtered options.**

---

## 1. The org-profile schema (versioned, canonical) — DC-1

New `core/org-profile.ts`:
```
OrgProfile { profileVersion, id, dimensions: { <dim>: DimensionRule } }
DimensionRule { allow?: string[], ban?: string[], forceDefault?: string, enforcement: 'hard'|'soft' }
```
`profileVersion` is pinned like the blueprint (the provenance tuple, §6). Serialized with `canonicalStringify` (Day 8) — a given profile is reproducible (round-trip stable, DC-7). Pure Node, no dependency.

## 2. The explicit option-set descriptor + `applyProfile` — DC-2

- **The option set was implicit** (registries + UI). Made **explicit** (additive): `fullOptionSet()` builds the choosable dimensions + values from the real sources — `availableBackends()`, the new `availableDatabases()`, `DEFAULT_VERSIONS` (per `versions.<key>`), the style enums, `projectType`/`frontend`/`multiUser`/`auth`.
- **`applyProfile(full, profile?)`** is **pure and deterministic** (sorted iteration, no clock/RNG) → `{optionSet, defaults, advisories}`. It produces **metadata, not files.**
  - **Profile-absent = IDENTITY:** full option set, existing defaults, no advisories.
  - **Profile-present:** hard bans/allow-lists remove values; `forceDefault` sets the effective default; soft rules raise advisories (value stays selectable).

## 3. THE LITERAL BYPASS — by construction + confirmed (DC-3, load-bearing)

- **By construction:** the only generator changes are the **new** `org-profile.ts` and an **additive** `availableDatabases()` export. `createProjectModel`, the plugins, and generation are **untouched** (verified: no other `generator/src` change). So the generation path is literally unchanged.
- **Confirmed:** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, all 49 byte-identical** (43 frozen + 10 relationship + MAXIMAL + 5 version). **No frozen hash moved.** *(If any had moved, the layer wasn't additive — a finding. None did.)*

## 4. Profile-present determinism (DC-4)

A concrete profile (`ban MySQL` hard; `forceDefault backend=Express`; `versions.java` allow `[21]`/ban `8`/force `21` hard; `style.namingConvention` ban `snake_case` **soft**) → `applyProfile` **twice-identical**, and:
- hard ban → **MySQL removed** from `database` (PostgreSQL remains);
- `forceDefault` → `backend` default = **Express**;
- hard allow+force → `versions.java` locked to **`[21]`**;
- soft rule → an **advisory** raised for `snake_case`, which **stays selectable** (not removed).

## 5. Soft vs Hard — input-side, NOT in output (DC-5)

- **Hard** removes/locks the option; **soft** flags-but-allows. Both surfaced **input-side** (in the `applyProfile` result — for the Day-16 wizard).
- **No trace in generated output:** a profile-derived blueprint (profile forced Express + PostgreSQL + node default) generates **byte-identical** to the same concrete blueprint chosen **without** a profile — and equals the **frozen `Express|PostgreSQL|DemoApp` baseline** (`a437a302…`). A scan of every generated file for profile/enforcement/advisory metadata → **none.** Enforcement metadata is wizard-side, **never in `GENERATION-MANIFEST.txt`** (the Day-11 rule — recording it would move every frozen hash).

## 6. Resolve-into-blueprint + the provenance tuple (DC-6/7 — stated precisely)

- **Resolve-into-blueprint:** a `forceDefault` is resolved into the **concrete** blueprint *before* generation (resolve-then-pin, Day 11). If the forced value equals the current default → **byte-identical to the existing baseline**; if it differs → a normal non-default blueprint (Day-11-deterministic). Generation depends only on the concrete blueprint.
- **The provenance tuple (honest framing):** **OUTPUT reproduction = the concrete blueprint ALONE** — the profile does **not** touch generation, so it is **not** required to regenerate byte-identical output. The **`(blueprint version, profile version)` tuple is the PROVENANCE/audit record** (*how* the decision was made — which options were available, what was defaulted), **NOT the output key.** We do **not** claim the profile pins the output; it pins the decision context.

## 7. Invariants (DC-8)

- **Generator pure-Node:** `dependencies: {}`, **0** native modules.
- **No frozen hash moved** (profile-absent, all 49).
- **Profile metadata is wizard-side, never in the frozen manifest** (§5).
- **`canonicalStringify` handles the profile stably** (round-trip, DC-7).
- **CI-enforced going forward:** a new harness check (**PART 1h**) asserts `applyProfile` identity (profile-absent) + twice-identical determinism (a hard-ban/force-default profile) — a non-hash guard (the profile is metadata; it adds no output baseline). So the profile layer's determinism is now on the pre-commit hook + 3-OS CI, like the version baselines.

---

## 8. What changed

- **New:** `generator/src/core/org-profile.ts` (schema + `fullOptionSet` + `applyProfile`).
- **Additive export:** `generator/src/plugins/database-registry.ts` (`availableDatabases()`).
- **Harness:** `generator/src/day20-regression.ts` (+PART 1h org-policy determinism guard).
- **Generation core (`createProjectModel`, plugins, `regen`, templates) — UNTOUCHED.** No AI, no new deps, no native module.

---

## 9. Forward-flags

- **`[3 days]` scope status:** the org-policy allow/ban INPUT layer (schema + descriptor + `applyProfile` + soft/hard + resolve-into-blueprint + provenance) is **COMPLETE** in one execute pass. The remaining budget is available if a richer profile (e.g. version *ranges* / `min` constraints, or loading from the shell SQLite store vs a file) is wanted — flagged, not done.
- **Determinism ≠ validity:** `applyProfile` filters the input **deterministically**; whether the chosen (filtered/forced) project actually **BUILDS/BOOTS** is **Day-18 toolchain**, not Day 13. A profile can force a combination that doesn't compile — that's a validity concern, out of scope here.
- **Profile loading:** the application function is pure; *where* the profile file lives (a `org-profile.json`, or the shell SQLite store) is a loading detail — Day 16 (wizard) / a later day wires the source. Today it's passed in / demonstrated in-proof.
- **Standing:** signing (Phase 4); generated-project toolchain pins (Day 18).

---

## 10. What Day 16 picks up

**The progressive-disclosure wizard** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 16) — which **surfaces** the profile-filtered option set + effective defaults + advisories that `applyProfile` produces: staged/conditional/contextual disclosure, simple/advanced toggle, aggressive smart defaults, only asking what changes structure. Day 13 provides the governed option-set; Day 16 presents it. The default (no-profile, simple-mode) path must reproduce the frozen 49 — a literal bypass, now doubly enforced (the profile layer is additive AND the wizard's default path must byte-match).

---

**Day 13 verdict:** ADR-004 is realized as a pure, versioned org-profile that governs the framework+version choices Day 11 made first-class — allow/ban/force-default, soft/hard. It is a separate input-shaping layer: it filters the option set and sets defaults, but never touches generation, so profile-absent is a literal bypass by construction and the frozen 49 reproduce byte-identical. A concrete profile deterministically produces its filtered set and forced defaults (twice-identical); a forced default resolves into a concrete blueprint that generates exactly as Day 11 proved; and no profile/enforcement metadata leaks into any generated file. The output is pinned by the concrete blueprint alone — the profile version is the provenance record, not the output key. The core stays pure-Node; no frozen hash moved; the profile layer's determinism is now CI-enforced. **Day 16 surfaces the filtered options in the progressive-disclosure wizard.**
