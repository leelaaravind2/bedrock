# Eco-Day 16 — REPORT: Progressive-disclosure wizard rebuild `[2 days]`

**Phase 1, Day 16.** The input surface is rebuilt as **progressive disclosure** (ADR-004): it grows without an interrogation — a required backbone, a conditional *Advanced* layer, contextual reveals, a persisted Simple/Advanced toggle, aggressive smart defaults. It now **surfaces the Day-11 framework+version pins and the Day-13 org-policy-filtered option set + forced defaults + soft advisories** — all **WITHOUT changing what the default blueprint generates.** The determinism spine is a **single canonical `assembleBlueprint(choices)`** that both the wizard backend and the CLI/programmatic path feed, so UI==CLI is **structural**, and simple-mode + no-profile + accept-defaults is a **literal bypass** that reproduces the frozen **49** byte-identical.

Plan: [`eco-day-16-plan.md`](eco-day-16-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§3 the one line; §4 honesty — a moved default hash is a finding, not a re-baseline). Builds on [`eco-day-11-report.md`](eco-day-11-report.md) (versions) + [`eco-day-13-report.md`](eco-day-13-report.md) (org-policy).

---

## THE VERDICT

> ✅ **A single canonical `assembleBlueprint(choices: BlueprintChoices): ProjectModel` is the ONE path the wizard backend AND the CLI/programmatic path (the demo builders, the harness) both feed.** So UI==CLI is **STRUCTURAL, not coincidental**: same choices → same canonical `ProjectState` → byte-identical output (`buildFileSet` is pure over state). The extraction is **faithful & additive** — `assembleBlueprint(defaultChoices)` reproduces the EXACT current `ProjectState`, so the default path is a **literal bypass**: the frozen **49** (43 + 10 + MAXIMAL + 5 version) reproduce **byte-identical** (`day20:regress` PASS from clean; **no frozen hash moved**). The wizard is rebuilt as progressive disclosure (staged / conditional / contextual + Simple/Advanced toggle with `localStorage` persistence), surfacing the version pins (Day 11) and the profile-filtered options + forced defaults + advisories (Day 13). **Persistence is UI-only — it never touches the blueprint.** No profile/enforcement metadata reaches the output. Generator still **pure-Node** (`deps {}`, 0 native modules).
>
> **Day 18 = toolchain detect-and-guide; Day 20 = Phase-1 close/benchmark.**

---

## 1. The two determinism requirements (the spine) — both proven

1. **LITERAL BYPASS.** Simple-mode + no-profile + accept-defaults → the SAME blueprint as today → the frozen 49 reproduce byte-identical. **Proven** (DC-2 below): `assembleBlueprint(defaultChoices)` == the current `ProjectState`; the demo builders now feed it and `day20:regress` is green from clean.
2. **UI == CLI, BYTE-IDENTICAL.** A blueprint assembled through the wizard produces output byte-identical to the same blueprint assembled programmatically. **Proven structurally** (DC-3) — one canonical assembly path both feed — **and confirmed live** (§6): a wizard-driven generate on disk hashes to exactly the frozen `Express|PostgreSQL|DemoApp` baseline `a437a302…`.

---

## 2. The canonical `assembleBlueprint` (DC-1) — the architectural recommendation, taken

New **`generator/src/core/assemble.ts`**:

```ts
interface BlueprintChoices {
  settings: PhaseASettingsInput;   // name/type/backend/frontend/database/multiUser/auth
  versions?: Partial<StackVersions>;  // resolve-then-pin; omitted ⇒ current-implied pins
  style?: CodingStyle;                // omitted ⇒ no-op style
  integrations?: Integrations;        // omitted ⇒ none
  description?: string;               // omitted ⇒ ''
  entities?: EntitySpec[];            // added in order (belongs-to targets must precede)
}
function assembleBlueprint(choices): ProjectModel   // createProjectModel → set* (only when supplied) → addEntity*
```

- **Faithful, ADDITIVE extraction** of the exact `createProjectModel → setVersions/setStyle/setIntegrations/setDescription → addEntity` sequence — NOT a behavior change. Each **omitted** optional dimension leaves the model's own current-implied default in place (**no setter fires** — the literal bypass). Only `settings` is required.
- **Both paths feed it:** `buildDemoAppModel` and `buildTeamTrackerModel` were refactored to construct a `BlueprintChoices` and call `assembleBlueprint` (so the *programmatic/CLI* path IS the canonical path); the server's new `POST /api/assemble` calls the SAME function (the *wizard backend* path). **UI==CLI reduces to `canonicalStringify(wizardState) === canonicalStringify(cliState)`.**
- **The org-profile is deliberately absent from `assembleBlueprint`** — it shapes the *options* the wizard presents, never generation. The wizard resolves the (profile-filtered) selection into the concrete values above; `assembleBlueprint` only ever sees concrete choices, so no profile/enforcement metadata can reach the blueprint or output.

## 3. The progressive-disclosure design (DC-4)

**Smart defaults — required vs defaulted (default set = today's implied ⇒ simple-mode = literal bypass):**
- **REQUIRED** (changes structure / unguessable): `projectName`, `projectType`, `backend`, `database`, the entities.
- **DEFAULTED** (to today's implied): `frontend` (React for Web App; `None` forced for API-only), `multiUser`=`true`, `auth`=`Simple login`, `versions`=`DEFAULT_VERSIONS[backend]`, `style`=all `default`, `integrations`=`none`, `description`=`''`.

**The three disclosure modes:**
- **STAGED** — simple mode shows only the required backbone (name/type/backend/database) + entities + generate. The Advanced dimensions carry smart defaults (shown as a note).
- **CONDITIONAL** — an **Advanced** toggle (top-right, persisted) reveals `frontend` override, `multiUser`, `auth`, `description`, **framework+version pins**, coding style, integrations — hidden until asked.
- **CONTEXTUAL** — an option appears only when a prior choice implies it: **belongs-to** rows only once a prior entity exists (the engine requires the target to precede); the **frontend** question is hidden for API-only (the type forces `None`); style axes are **gated per-stack** (indent → Express, `simple` depth → Express/FastAPI — the existing style-engine applicability, respected by the wizard, never over-claimed).

**Smart-default pre-selection (honest, not order-dependent):** `applyProfile` **sorts** option values, so the wizard pre-selects TODAY'S IMPLIED backbone explicitly (`Web App` / `Spring Boot` / `PostgreSQL` / `React`) rather than relying on select order — so accepting simple-mode defaults reproduces the current default blueprint. An org `forceDefault` overrides the implied value; a `ban` that removes it falls back to the first surviving option.

**Simple/Advanced toggle with persistence:** the mode preference persists in `localStorage` (`thraksha.mode`). **It is a UI PREFERENCE — it changes what is SHOWN, never what is GENERATED.** It is read/written only by `setMode`/`initMode` and toggles a body class; it is never part of `BlueprintChoices` and never reaches the server. (Confirmed: `buildChoices()` reads only the form controls + entities; the mode is not among them.)

## 4. Surfacing versions (Day 11) + org-policy (Day 13) in the wizard (DC-5)

- **Org-profile runs FIRST.** New `GET /api/options` loads the profile (file at `THRAKSHA_ORG_PROFILE`; **absent/unreadable ⇒ null ⇒ no profile**), computes `applyProfile(fullOptionSet(), profile)`, and returns `{ optionSet, defaults, advisories, defaultVersions, profileId }`. The wizard populates every select from the **filtered `optionSet`** (banned values never appear), pre-selects the **forced `defaults`**, and renders **advisories** (soft-rule flags) inline in an org-policy banner. **Profile-absent ⇒ the full set + existing defaults + no banner ⇒ simple-mode is the literal bypass.** Enforcement metadata is **wizard-side only** — `/api/assemble` is profile-free, so nothing reaches the blueprint/output.
- **Framework+version pins (Advanced/contextual).** Once `backend` is chosen, the wizard renders its version keys from `DEFAULT_VERSIONS[backend]`, defaulted to the current pin (simple-mode leaves them → omitted from `choices` → literal bypass). A non-default pin goes into `choices.versions`; `assembleBlueprint` applies `resolveVersions` (resolve-then-pin) so the blueprint carries concrete pins. A profile **hard-force** (allow-list of one) **locks** the field (disabled + "Locked by org policy"); an allow-list of many becomes a select; a **soft** rule flags via advisory.
- **Naming-collision kept distinct:** the existing `/api/versions/*` routes remain the version-**SNAPSHOT** store; the framework-version pins are surfaced via `/api/options` (`defaultVersions`) — a deliberate split, noted in the code.

## 5. The literal-bypass proof (DC-2, LOAD-BEARING)

`cd generator && rm -rf dist && npm run build && npm run day20:regress` → **PASS, all 49 byte-identical** (43 frozen + 10 relationship + MAXIMAL + 5 version). The demo builders now route through `assembleBlueprint`; the assembled state is byte-for-byte the previous `createProjectModel+addEntity` sequence's. **No frozen hash moved.** *(Had the extraction changed a byte, a hash would have moved — a finding to diagnose, never re-baseline. None did.)* The pre-commit hook + 3-OS CI re-verify on commit/push.

## 6. The UI==CLI proof (DC-3) — structural + confirmed live

**Structural (new harness gate PART 1i, a gate that can FAIL):**
- **DEFAULT choices** (`Express|PostgreSQL|DemoApp`, backbone + entities only): `assembleBlueprint(defaultChoices)` twice → `canonicalStringify` **equal** (deterministic) → **equal to the canonical CLI builder's state** → hash == frozen **`a437a302…`**. *(The wizard choices produce the SAME `ProjectState` as the programmatic builder AND the frozen baseline — simple-mode literal bypass, structurally.)*
- **NON-DEFAULT choices** (a framework+version pin **+** an org-policy-forced choice): a profile hard-forces `backend=Express` and hard-bans `MySQL`; `applyProfile` confirms `defaults.backend==='Express'` and `MySQL` removed. The user accepts the forced Express, keeps PostgreSQL, pins **node 20**. `assembleBlueprint(ndChoices)` twice → `canonicalStringify` equal → hash == the additive **`10607508…`** (Express node-20) version baseline, and a scan of every generated file for `profile/forceDefault/enforcement/advisory` metadata → **none**. *(The output is pinned by the concrete blueprint alone; the profile only shaped the input — the Day-13 provenance framing.)*

**Confirmed live (the byte-diff confirmation):** the rebuilt wizard was driven over HTTP against the running server — `GET /api/options` (no profile → full set), `POST /api/assemble` (default DemoApp/Express), `POST /api/generate` — and the generated project **on disk** hashed (same `/${relPath}\n`+content convention) to **`a437a302…`**, exactly the frozen baseline. The profile-loaded path was exercised too (`MySQL` banned → removed, `Express` force-defaulted, `snake_case` soft advisory surfaced).

## 7. Invariants (DC-6)

- **Generator pure-Node:** `dependencies: {}`, **0** native modules (re-checked from clean).
- **No frozen hash moved** (default/simple-mode path — all 49 byte-identical from clean).
- **No UI-injected nondeterminism:** UI==CLI byte-identical (structural + live) is the proof; the wizard injects no clock/RNG/ordering — `assembleBlueprint` is pure and the choices are a canonical, JSON-serialisable object.
- **Mode-preference persistence does not touch the blueprint:** `localStorage` mode is read only by `setMode`/`initMode`, never enters `BlueprintChoices`, never reaches the server.
- **`canonicalStringify`/store round-trip still holds** (unchanged; the store is a shell concern).

---

## 8. What changed

- **New:** `generator/src/core/assemble.ts` (`BlueprintChoices` + `assembleBlueprint`).
- **Refactor (feed the canonical path):** `generator/src/demoapp-model.ts`, `generator/src/teamtracker-model.ts` (now build `BlueprintChoices` and call `assembleBlueprint`; assembled state byte-identical).
- **Server:** `generator/src/server.ts` (+`POST /api/assemble`, +`GET /api/options`, +`loadOrgProfile`; the old incremental routes remain for back-compat).
- **UI:** `generator/ui/index.html` **rebuilt** as the progressive-disclosure wizard (staged/conditional/contextual + Simple/Advanced toggle + persistence + smart defaults; surfaces version pins + profile).
- **Harness:** `generator/src/day20-regression.ts` (+PART 1i — canonical `assembleBlueprint` UI==CLI structural: default → frozen; non-default version+profile → version baseline, no metadata leak).
- **Generation core (`project-model`, plugins, `regen`, `entity-codegen`, templates) — UNTOUCHED.** No AI, no new deps, no native module.

## 9. Forward-flags

- **`[2 days]` scope status:** the progressive-disclosure wizard + the canonical `assembleBlueprint` + the UI==CLI structural gate + surfacing Day-11 versions & Day-13 profile are **COMPLETE**. **Deploy targets / RBAC remain future placeholders — NOT generation this day** (no new stacks/types/generation features were added).
- **Determinism ≠ validity:** the wizard assembles a **deterministic** blueprint (same choices → byte-identical output). Whether a chosen combination (e.g. a non-default framework version, or a profile-forced stack) actually **BUILDS/BOOTS** is **Day-18 toolchain**, not Day 16. A profile can force a combination that doesn't compile — a validity concern, out of scope here.
- **Profile source:** the wizard loads the profile from a file (`THRAKSHA_ORG_PROFILE`); the shell **SQLite** store as an alternate source is a desktop-side wiring detail (the generator stays pure-Node) — flagged, not done.
- **Sidecar resources:** `desktop/src-tauri/resources/gen` is a copy — re-sync (`npm run sync-gen`) before a `tauri build` (auto via `beforeBuildCommand`; `resources/gen` is gitignored/regenerated). Day 16 added a src file + changed the UI, so a packaged build must re-sync.
- **Standing:** signing (Phase 4).

## 10. What Day 18 / Day 20 pick up

- **Day 18 — toolchain detect-and-guide** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md)): detect the machine's JDK/Node/Python/Go and guide (or container-path) — turning a *deterministic* wizard blueprint into a *buildable* one. Detect-and-guide only (no bundling heavy toolchains — GUARDRAILS §5).
- **Day 20 — Phase-1 close / benchmark:** a project generated **through the wizard** with a pinned, policy-checked framework+version, default paths reproducing the frozen hashes — the full intent-to-deployable path, benchmarked.

---

**Day 16 verdict:** the input surface is rebuilt as progressive disclosure — a required backbone, a conditional Advanced layer, contextual reveals, a persisted Simple/Advanced toggle, smart defaults that only require what changes structure — and it surfaces the framework+version pins (Day 11) and the org-policy-filtered option set + forced defaults + soft advisories (Day 13). The determinism spine is a single canonical `assembleBlueprint(choices)` that the wizard backend and the CLI both feed, so UI==CLI is structural (proven by the new PART-1i gate and confirmed live to the frozen `a437a302…`), and simple-mode + no-profile + accept-defaults is a literal bypass reproducing the frozen 49 byte-identical. The wizard injects no nondeterminism; the mode preference never touches the blueprint; no profile/enforcement metadata reaches the output; the core stays pure-Node; no frozen hash moved. **Day 18 adds toolchain detect-and-guide; Day 20 closes Phase 1.**
