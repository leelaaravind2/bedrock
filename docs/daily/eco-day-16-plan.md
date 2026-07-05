# Eco-Day 16 — PLAN: Progressive-disclosure wizard rebuild `[2 days]`

**Phase 1, Day 16. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 16 rebuilds the input surface as **progressive disclosure** (ADR-004): grow the input surface **without an interrogation**. The wizard now surfaces framework+version (Day 11) and the org-policy-filtered option set + defaults + advisories (Day 13). **`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §2 + ADR-004 → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 16 → [`eco-day-11-report.md`](eco-day-11-report.md) (versions) + [`eco-day-13-report.md`](eco-day-13-report.md) (`applyProfile`/`fullOptionSet`) → the real UI/server/model (read this session).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session:** the current input surface is a **5-step wizard** ([`ui/index.html`](../../generator/ui/index.html): Project → Entities → Style&integrations → Blueprint → Generated) driven by [`server.ts`](../../generator/src/server.ts), which is **"a THIN front end… every endpoint just calls the modules"** — the routes call the exact same model API the CLI uses (`createProjectModel`, `setStyle`, `setIntegrations`, `setDescription`, `addEntity`, `buildFileSet`). **UI==CLI is already STRUCTURAL** at the model-API level (day20-regression PART 1d proves "UI-declared TeamTracker == 10 baselines byte-for-byte"). **Two gaps: framework-version pins (Day 11 `setVersions`) and the org-profile (Day 13 `applyProfile`/`fullOptionSet`) are NOT wired to the server/UI yet.** *(Note: the existing `/api/versions/*` routes are the version-SNAPSHOT store, not the framework-version pins — a naming collision to keep distinct.)*

---

## 0. The two determinism requirements (the spine — load-bearing)

1. **The default (simple-mode, no-profile, accept-defaults) path is a LITERAL BYPASS.** A user who opens the wizard, accepts all smart defaults, and generates → the SAME blueprint as today → the frozen **49** (43 + 10 + MAXIMAL + 5 version) reproduce **byte-identical**. The rebuild must not change what the default blueprint is.
2. **UI == CLI, BYTE-IDENTICAL (the new gate).** A blueprint assembled through the wizard produces output **byte-identical** to the same blueprint assembled programmatically. The wizard is a **faithful front-end** — it assembles the SAME `ProjectState`; it adds no divergence, no UI-injected value, no ordering difference.

---

## 1. THE ARCHITECTURAL RECOMMENDATION — one canonical `assembleBlueprint(choices)` both feed (structural UI==CLI)

Today the server builds the model **incrementally + statefully** across routes (`createProjectModel`, then `setStyle`/`setIntegrations`/`addEntity`…), and the CLI/programmatic path calls the same model API directly. UI==CLI holds because both hit the same model API — but it's proven case-by-case, not structural.

**Recommendation:** extract the "choices → `ProjectModel`" sequence into ONE canonical, pure function **`assembleBlueprint(choices: BlueprintChoices): ProjectModel`** that **both** the server (UI backend) and the CLI/programmatic path call. Then:
- **UI==CLI becomes STRUCTURAL, not coincidental:** same `choices` → same `assembleBlueprint` → same `ProjectState` → (since `buildFileSet` is a pure function of `ProjectState`) same output, byte-for-byte. The proof reduces to `canonicalStringify(wizardState) === canonicalStringify(cliState)`.
- **It's an additive extraction, NOT a behavior change:** `assembleBlueprint(defaultChoices)` must produce the EXACT `ProjectState` the current path produces → generation byte-identical (the literal-bypass gate proves it). If it moves a hash, the extraction changed behavior — a finding, STOP.
- `BlueprintChoices` = `{ settings (name/type/backend/frontend/database/multiUser/auth), versions?, style?, integrations?, description?, entities[] }` — a plain, canonical, JSON-serialisable object (the wizard collects it; the CLI passes it). It carries only concrete values (versions resolved by Day-11 resolve-then-pin; profile forced-defaults already resolved in — Day 13).

*(Alternative if the refactor is deemed too large for `[2 days]`: keep the incremental server path and prove UI==CLI empirically per the PART-1d pattern, extended to a version pick + a profile-filtered choice. The plan PREFERS the canonical `assembleBlueprint` — structural over coincidental — but either must pass the same gates.)*

---

## 2. The progressive-disclosure design (the 3 modes + toggle + persistence + smart-defaults)

**Smart defaults — required vs defaulted (default set = TODAY's implied, so simple-mode = literal bypass):**
- **REQUIRED** (changes structure / unguessable): `projectName`, `projectType`, `backend`, `database`, and the entities.
- **DEFAULTED** (to today's implied values): `frontend` (React for Web App; `None` forced for API-only), `multiUser`=`true`, `auth`=`Simple login`, `versions`=`DEFAULT_VERSIONS[backend]`, `style`=all `default`, `integrations`=`none`, `description`=`''`. Accepting these = the current default blueprint.

**The three disclosure modes:**
- **STAGED** — wizard steps for the required backbone only (Project basics: name/type/backend/database; Entities). Simple mode shows just these + "accept smart defaults → generate."
- **CONDITIONAL** — an **"Advanced"** toggle reveals optional dimensions, hidden until asked: `frontend` override, `multiUser`, `auth`, **framework+version pins**, style axes, integrations. (Deploy targets/RBAC are future placeholders — not new generation this day.)
- **CONTEXTUAL** — reveal an option only when a prior choice implies it: e.g. `belongs-to` relationship config only after a **2nd** entity exists; hide `frontend` for **API-only** (projectType forces `None`); style axes **gated per-stack applicability** (the style engine already disables non-applicable values — the wizard must respect this).

**Simple/Advanced toggle with persistence:** the mode preference persists (browser `localStorage`, or the shell store). **Persistence is a UI PREFERENCE — it is NOT a blueprint value and MUST NOT leak into the blueprint or generated output** (it changes what's *shown*, never what's *generated*).

---

## 3. Surfacing Day-11 versions + Day-13 org-policy in the wizard

- **Org-profile runs FIRST (before the wizard presents anything):** load the profile (a file / the shell store; **absent = no profile**), compute `applyProfile(fullOptionSet(), profile)` → `{optionSet, defaults, advisories}`. The wizard presents the **filtered `optionSet`**, pre-selects the **forced `defaults`**, and shows **`advisories`** (soft-rule flags) inline. **Profile-absent → the full option set + existing defaults → simple-mode is the literal bypass.** Enforcement metadata stays wizard-side (never in the blueprint/output — the Day-11/13 rule).
- **Framework+version pins (Advanced/contextual):** once `backend` is chosen, surface its version keys (`DEFAULT_VERSIONS[backend]`) — default = the current pin (simple-mode leaves them). A non-default pick goes into `choices.versions`; `assembleBlueprint` applies `resolveVersions(backend, choices.versions)` (resolve-then-pin) so the blueprint carries concrete pins. A profile hard-force locks a version (unselectable); a soft rule flags it.

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."** cargo on PATH for any sidecar re-check.

### Stage 1 — the canonical assembly path + the two determinism gates (load-bearing)
- **DC-1:** `assembleBlueprint(choices) → ProjectModel` — the single canonical path; the server (UI backend) and the CLI/programmatic path both feed it. `BlueprintChoices` canonical.
- **DC-2 (LITERAL BYPASS, load-bearing):** `assembleBlueprint(defaultChoices)` → the exact current `ProjectState`; `cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, 49 byte-identical**. A moved hash = a finding (the extraction changed behavior), STOP, do NOT re-baseline.
- **DC-3 (UI==CLI, STRUCTURAL):** for a **default** choices set AND a **non-default** set (incl. a framework+version pick + an org-policy-filtered choice): the wizard-backend path (server routes / `assembleBlueprint`) and the programmatic path produce the **same canonical `ProjectState`** (`canonicalStringify` equal) → **byte-identical output**. Prefer the structural proof (same choices → same `assembleBlueprint` → same state); the byte-diff is the confirmation.

### Stage 2 — the progressive-disclosure UI + surfacing versions/profile
- **DC-4:** the wizard rebuilt as staged/conditional/contextual + Simple/Advanced toggle + persistence; smart-defaults (required vs defaulted, default = today's implied). Simple-mode + accept-defaults reaches `assembleBlueprint(defaultChoices)` → the literal bypass (DC-2).
- **DC-5:** the wizard **surfaces** the profile-filtered option set + forced defaults + advisories (Day 13) and the version pins (Day 11); profile-absent = full set. A wizard-driven non-default blueprint (a version pick + a profile-filtered choice) → **UI==CLI byte-identical** (DC-3), and no profile/UI metadata in the output.
- **DC-6 (invariants):** generator still **pure-Node**; **no frozen hash moved** (default path); **no UI-injected nondeterminism** (UI==CLI byte-identical is the proof); the mode-preference persistence does not touch the blueprint; `canonicalStringify`/store round-trip still holds.

**Execute scope guard (every stage):** just the progressive-disclosure wizard + surfacing Day-11/Day-13 inputs + the UI==CLI proof; **NOT** toolchain detect-and-guide (Day 18), no new stacks/types/generation features; **no frozen hash moved on the default/simple-mode path** (a moved hash is a finding, not a re-baseline); the wizard injects **no** nondeterministic value or ordering; no AI; no signing. Commit to `main`. Don't compress the 2 days.

---

## 5. REPORT — done-conditions

[`eco-day-16-report.md`](eco-day-16-report.md): the progressive-disclosure design (3 modes + Simple/Advanced toggle + persistence + smart-defaults, default = today's implied); how versions + org-policy surface in the wizard; the **canonical `assembleBlueprint`** (structural UI==CLI); the **LITERAL-BYPASS proof** (simple-mode = frozen 49 byte-identical); the **UI==CLI proof** (byte-identical, default + non-default, structural — same `ProjectState`); invariants (pure-Node, no frozen hash moved, no UI-injected nondeterminism, persistence not in the blueprint). **Forward-flags:** `[2 days]` scope status (done vs pending — e.g. deploy-targets/RBAC placeholders not generation); **determinism ≠ validity** (the wizard assembles a deterministic blueprint; whether it BUILDS/BOOTS is Day-18 toolchain); what **Day 18** picks up (toolchain detect-and-guide) and **Day 20** (Phase-1 close/benchmark — a project generated through the wizard with a pinned, policy-checked framework+version, default paths reproducing the frozen hashes).

---

## 6. Pre-flight checklist (GUARDRAILS §6) — for the execute sessions
1. Read guardrails + ecosystem §2 + Month-1 Day 16 + eco-11/13 + the real UI/server/model? — ✅ (this session).
2. Only Day-16's job (progressive-disclosure wizard + surfacing + UI==CLI)? — yes; not toolchain (Day 18).
3. Which frozen baselines must NOT move? — **43 + 10 + MAXIMAL + 5 version** on the **default/simple-mode** path. `assembleBlueprint(defaultChoices)` must equal today's `ProjectState`.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — **YES:** simple-mode + no-profile + accept-defaults = today's blueprint. Prove it (DC-2).
6. Three killers checked? — the wizard produces a canonical `ProjectState` (no clock/RNG/UI-order into output); `assembleBlueprint` deterministic; `canonicalStringify` stable.
7. A gate that can actually FAIL? — **DC-2 (simple-mode 49 byte-identical) is load-bearing; DC-3 (UI==CLI byte-identical, default + non-default).**
8. Overclaim / scope drift? — the live risks: (i) the `assembleBlueprint` extraction silently changing the default `ProjectState` (moves a hash — a finding), (ii) a UI-injected value/ordering breaking UI==CLI, (iii) mode-preference persistence leaking into the blueprint, (iv) claiming a wizard-chosen combo BUILDS (determinism ≠ validity — Day 18) — all guarded.

---

*Day 16 grows the input surface without an interrogation — staged backbone, conditional Advanced, contextual reveals, a Simple/Advanced toggle with persistence, aggressive smart defaults that only require what changes structure. The wizard surfaces the framework+version pins (Day 11) and the org-policy-filtered option set + defaults + advisories (Day 13). The determinism spine: a canonical `assembleBlueprint(choices)` both the wizard backend and the CLI feed, so UI==CLI is structural (same choices → same ProjectState → same output), and simple-mode + no-profile + accept-defaults is a literal bypass reproducing the frozen 49 byte-identical. The wizard injects no nondeterminism; the mode preference never touches the blueprint; the core stays pure-Node; no frozen hash moves. Day 18 adds toolchain detect-and-guide; Day 20 closes Phase 1.*
