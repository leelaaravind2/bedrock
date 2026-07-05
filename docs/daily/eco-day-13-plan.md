# Eco-Day 13 — PLAN: Org-policy allow/ban layer `[3 days]`

**Phase 1, Day 13. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 13 makes **ADR-004 real**: an **org-profile** — a pure, versioned INPUT that runs BEFORE the wizard and (a) removes banned choices from the option set, (b) sets approved defaults, (c) tags soft/hard enforcement. It governs exactly the framework+version pins Day 11 made first-class. **`[3 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §2 + ADR-004 → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 13 → [`eco-day-11-report.md`](eco-day-11-report.md) (version pins are first-class) → the real model (read this session).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session:** the option set is currently **implicit** (registries define valid values — `availableBackends()`, the `DATABASES` map, `DEFAULT_VERSIONS`, the style enums; the UI presents them). There is **no explicit option-set descriptor and no org-policy code** (genuinely new). `createProjectModel` applies defaults from a small `PHASE_A_DEFAULTS` (only `multiUser`/`auth`) + `defaultVersionsFor(backend)` (Day 11). These facts shape the design below.

---

## 0. THE ARCHITECTURAL INSIGHT (the whole determinism story rests on this)

**The org-profile is a SEPARATE, ADDITIVE input-shaping layer. It NEVER touches `createProjectModel`, the plugins, or generation.** It operates only on the **option set** (input metadata): it filters *which* choices are available and *what* the defaults are. Once a **concrete** blueprint is chosen, generation runs **identically** — byte-for-byte.

**Consequences (both load-bearing):**
- **Profile-ABSENT is a literal bypass BY CONSTRUCTION.** No generation code changes, so the frozen 43+10+MAXIMAL+version baselines cannot move. `day20:regress` is green because generation is untouched — the proof confirms the additive module touched nothing.
- **Same (blueprint + profile) → byte-identical output, always** — trivially, because the profile doesn't reach generation. A profile-forced default just picks *which concrete value* enters the blueprint; that blueprint then generates deterministically (Day 11 already proved non-default concrete blueprints are twice-identical).

This is exactly the Day-11 discipline (versions don't leak into the frozen manifest) extended: **profile enforcement metadata is input/wizard-side, NEVER in generated output.**

---

## 1. The OPTION SET (enumerated from the real model — the dimensions the profile filters)

| Dimension | Choosable values (today) | Default today | Source |
|---|---|---|---|
| `projectType` | `Web App`, `API-only` | (mandatory) | `PhaseASettings` literal union |
| `backend` | `Spring Boot`, `Express`, `FastAPI`, `Django`, `Go` | (mandatory) | `availableBackends()` |
| `frontend` | `React`, `None` | (mandatory; API-only forces `None`) | `PhaseASettings` |
| `database` | `PostgreSQL`, `MySQL` | (mandatory) | `DATABASES` map |
| `multiUser` | `true`, `false` | `true` | `PHASE_A_DEFAULTS` |
| `auth` | `Simple login`, … | `Simple login` | `PHASE_A_DEFAULTS` |
| `versions.<key>` | per-stack pins (`java`, `springBoot`, `node`, `express`, `python`, `fastapi`, `django`, `go`) | `DEFAULT_VERSIONS[backend]` | Day 11 `versions.ts` |
| `style.indent` | `default`, `two-space`, `four-space`, `tab` | `default` | `style.ts` |
| `style.namingConvention` | `default`, `camelCase`, `snake_case` | `default` | `style.ts` |
| `style.architectureDepth` | `default`, `simple` | `default` | `style.ts` |

**Day 13 makes this set EXPLICIT** as a pure descriptor (additive — the profile filters it). The Month-1 examples ("ban Java 8, force Java 21, only allow Postgres, default to Express") target `backend`, `database`, and `versions.*` — but the schema is general across all dimensions.

**How defaults apply today (the profile layers a forced-default BEFORE this):** `createProjectModel` → for each Phase-A key, `provided ?? PHASE_A_DEFAULTS[key]`; versions → `defaultVersionsFor(backend)`. The profile's **effective default = profile-forced-default ?? existing-default**, resolved into the concrete blueprint *before* `createProjectModel` sees it (resolve-then-pin, Day 11 style) — so generation stays profile-independent.

---

## 2. The org-profile SCHEMA (versioned, canonical)

A versioned object (schema version pinned, like the blueprint), serialized with `canonicalStringify` (Day 8) so a given profile is reproducible:

```
OrgProfile {
  profileVersion: "1"            // pinned schema/version — part of provenance (§5)
  id: string                     // e.g. "acme-standard"
  dimensions: {
    <dimension>: DimensionRule   // keys: backend | database | projectType | frontend |
                                 //       versions.java | versions.node | … | style.namingConvention | …
  }
}
DimensionRule {
  allow?: string[]        // allow-list: if present, ONLY these remain
  ban?: string[]          // ban-list: these are removed
  forceDefault?: string   // the org-approved default for this dimension
  enforcement: "hard" | "soft"   // hard = removed/locked; soft = advisory (flagged, still allowed)
}
```

- **Profile-absent** = no profile object (`undefined`/null). **Serialization:** canonical (sorted keys), so the same profile always yields the same bytes — reproducible and hashable.
- **Where it lives:** a canonical JSON input — loadable from a file (e.g. `org-profile.json`) or the shell SQLite store (Day 8). The **application function is pure** (generator-side, no native dep); *where the file lives* is a loading detail.

---

## 3. The APPLICATION layer (a pure function — the heart of Day 13)

```
applyProfile(fullOptionSet, profile?) → {
  optionSet:  filtered set   // hard bans removed; allow-list applied
  defaults:   effective defaults   // forceDefault ?? existing default, per dimension
  advisories: SoftFlag[]     // { dimension, value, message } for soft rules
}
```

- **Pure & deterministic:** sorted iteration, no clock/RNG → same `(fullOptionSet, profile)` → identical result (twice-identical). It produces **metadata**, not generated files.
- **Profile-ABSENT → identity:** `optionSet` = the full set, `defaults` = existing defaults, `advisories` = []. This is the literal bypass at the option-set level; combined with §0 (generation untouched), the frozen output is byte-identical.
- **Does NOT modify** `createProjectModel`/plugins/generation. The wizard (Day 16) will consume `optionSet`+`defaults`+`advisories`; Day 13 provides the function + proofs, not the UI.

---

## 4. Soft vs Hard enforcement (input-side; NEVER in generated output)

- **HARD ban** → the value is **removed** from `optionSet` (unselectable). **Hard forceDefault** → the value is set and **locked** (can't be changed).
- **SOFT** → the value **stays selectable** but is **flagged** (an advisory: "your org discourages MySQL"). **Soft forceDefault** → applied as the default, but the user may override (flagged if they do).
- **Both are surfaced INPUT-SIDE** (the wizard shows the filtered set + advisories). **NEITHER leaks into generated output** — profile enforcement metadata (which rules applied, soft/hard tags, advisories) is blueprint/wizard-side, **NEVER in `GENERATION-MANIFEST.txt`** (the Day-11 rule: like versions, profile metadata is shown-in-the-blueprint, never manifest-recorded — recording it would move every frozen hash).

---

## 5. The versioning tuple (precise, honest)

- **OUTPUT reproduction = the CONCRETE blueprint ALONE.** The profile shapes the input and the wizard resolves forced defaults into a concrete blueprint (resolve-then-pin, Day 11); generation depends only on that blueprint. **The profile is NOT required to regenerate byte-identical output.**
- **Provenance/governance reproduction = (blueprint version, profile version).** To reconstruct *why these choices were available and defaulted*, you need the profile version. So the `(blueprint, profile)` tuple is the **audit/provenance record**, not the output-reproduction key. State both precisely — do not overclaim that the profile pins the output (it pins the decision context; the blueprint pins the output).

---

## 6. STAGING (`[3 days]` — do NOT compress) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### Stage 1 — Schema + option-set descriptor + `applyProfile` + the LITERAL BYPASS
- **DC-1:** explicit **option-set descriptor** (§1, additive, pure) + the versioned **OrgProfile schema** (§2) + `canonicalStringify` serialization.
- **DC-2:** the pure **`applyProfile`** function (§3): profile-absent → identity; a concrete profile → filtered set + effective defaults + advisories, **twice-identical**.
- **DC-3 (LOAD-BEARING):** profile-ABSENT → `day20:regress` **44/44+5 byte-identical** (43 frozen + 10 + MAXIMAL + 5 version baselines). Since generation is untouched (§0), this confirms the additive layer moved nothing. **A moved hash = a finding, STOP, do not re-baseline.**

### Stage 2 — Soft vs Hard enforcement (input-side, not output)
- **DC-4:** a concrete profile (e.g. **ban MySQL (hard), force backend=Express (hard-default), ban `java` 8 / force `java` 21, discourage `Go` (soft)**) → `applyProfile` **deterministically** yields: `database` set = {PostgreSQL} (MySQL removed), `backend` default = Express, `versions.java` locked to 21, a soft advisory on Go — **twice-identical**.
- **DC-5:** hard removes / soft flags-but-allows; **neither appears in any generated file** (grep the generated manifest/output for profile metadata → absent). The Day-11 rule holds.

### Stage 3 — Resolve-into-blueprint + versioning tuple + full proofs + report
- **DC-6:** a profile-forced default resolved into a **concrete** blueprint (e.g. profile forces `java` 21 → blueprint `versions.java='21'`) **generates deterministically** — if the forced value equals the current default, **byte-identical to the existing baseline**; if it differs (e.g. forces `java` 17), it's a normal non-default blueprint (Day-11-deterministic, twice-identical). Reuse/extend the Day-11 baseline proof — no NEW frozen baseline needed unless a new concrete cell is recorded (additive).
- **DC-7:** the **provenance tuple** demonstrated — output reproduced from the concrete blueprint alone (profile-independent); `(blueprint, profile)` recorded as the governance/audit record. Profile serializes canonically (store round-trip stable).
- **DC-8 (invariants):** generator still **pure-Node** (`deps {}`, 0 native modules); **no frozen hash moved** (profile-absent); profile visibility wizard-side, not manifest; `canonicalStringify` handles the profile stably.

**Execute scope guard (every stage):** just the org-policy allow/ban INPUT layer; **NOT** the wizard rebuild (Day 16 surfaces the filtered set), **NOT** toolchain detect-and-guide (Day 18), no new stacks/types; the profile **must not inject anything into generated output** (input governance only); enforcement metadata **never** in the frozen manifest; no AI; no signing; **no frozen hash moved on profile-absent** (a moved hash is a finding, not a re-baseline). Commit to `main`. Don't compress the 3 days.

---

## 7. REPORT — done-conditions

[`eco-day-13-report.md`](eco-day-13-report.md): the **profile schema** (versioned) + canonical serialization; the **option-set descriptor**; the **application layer** (`applyProfile`, pure); the **literal-bypass proof** (profile-absent = frozen byte-identical, 44/44+5); the **profile-present determinism proof** (filtered set + defaults, twice-identical; the resolved concrete blueprint generates deterministically); **soft vs hard** (input-side, proven not in output); the **versioning-tuple note** (output = concrete blueprint alone; `(blueprint, profile)` = provenance); **invariants** (pure-Node, no frozen hash moved). **Forward-flags:** `[3 days]` scope status (done vs pending); **validity ≠ determinism** (a profile filters the input deterministically; whether the chosen project BUILDS/BOOTS is Day-18 toolchain); what **Day 16** picks up (the progressive-disclosure wizard that SURFACES the profile-filtered option set + defaults + advisories).

---

## 8. Pre-flight checklist (GUARDRAILS §6) — for the execute sessions
1. Read guardrails + ecosystem §2 + Month-1 Day 13 + eco-day-11 + the real model? — ✅ (this session).
2. Only Day-13's job (the org-policy input layer)? — yes; not the wizard/toolchain.
3. Which frozen baselines must NOT move? — **43 + 10 + MAXIMAL + 5 version** on the **profile-absent** path. The profile is a separate input layer; generation is untouched.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — **YES, structurally:** profile-absent → identity option-set + generation untouched → byte-identical. Prove it (DC-3).
6. Three killers checked? — the profile produces metadata (no clock/RNG into output); `applyProfile` is pure/sorted; `canonicalStringify` stable for the profile.
7. A gate that can actually FAIL? — **DC-3 (profile-absent 44/44+5 byte-identical) is load-bearing; DC-2/DC-4 (applyProfile twice-identical).**
8. Overclaim / scope drift? — the live risks: (i) letting profile metadata leak into the frozen manifest (§4 forbids), (ii) claiming the profile pins the OUTPUT (it pins the decision context; the concrete blueprint pins the output — §5), (iii) claiming a filtered/forced choice BUILDS (determinism ≠ validity — Day 18) — all guarded.

---

*Day 13 realizes ADR-004 as a pure, versioned org-profile that governs the framework+version choices Day 11 made first-class — allow/ban/force-default with soft/hard enforcement. The profile is a separate input-shaping layer: it filters which options are available and what the defaults are, but never touches generation, so profile-absent is a literal bypass by construction and the frozen 43+10+MAXIMAL+version baselines reproduce byte-identical. A concrete profile deterministically produces its filtered set and forced defaults; the resulting concrete blueprint generates exactly as Day 11 proved. Enforcement metadata is input-side, never in the frozen output. The output is pinned by the concrete blueprint alone; the profile version is the provenance record. Staged across three days; the core stays pure-Node; no frozen hash moves. Day 16 surfaces the filtered options in the progressive-disclosure wizard.*
