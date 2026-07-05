# Day 17 — Plan: The optional-integrations pattern + the FIRST integration (EMAIL)

**Session 1 of 3 — PLANNING ONLY. No implementation, no code edits. Output: this file.**

Day 17 designs the **optional-integrations wizard pattern** — *"need X? → how? → config?"* — and implements **ONE integration (EMAIL)** end-to-end on a chosen subset, with a coherence check. It is a **deterministic branch** (ADR-003 — no probabilistic anything): **"none" (the default) changes nothing (20 hashes frozen); "email" adds deterministic wiring.** Day 18 hardens + adds a second integration (the AI hook — **earmarked, NOT built today**).

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) (Law 21 runs-standalone, Law 25 core-neutral), [`docs/adr/`](../adr) (**ADR-001 — no AI/network in the generation path, the one that matters most today**; ADR-004 mandatory/optional/default shown-not-silent — the intake pattern reused; ADR-002/003/005), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Day 17 = pattern + first integration; Day 18 = harden + second), [`docs/INTAKE-SPEC.md`](../INTAKE-SPEC.md) (Q7 Auth — the existing "need X? which? default" precedent), [`day-15-report.md`](day-15-report.md) (the coherence bar + the manifest-trap discipline), [`day-16-report.md`](day-16-report.md) (the ADR-004 recording), [`week-01`](week-01-summary.md)/[`week-02-summary.md`](week-02-summary.md) + [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md) (the 20-hash digests).

Grounding: this session read the real `auth` intake path, `buildManifest` (`regen.ts`), the shell config/env mechanism (`__TOKEN__` + `.env.example`), and each candidate stack's dependency-install path.

---

## 1. Reconnaissance — grounded, not assumed

- **`auth` is the intake-shape precedent, and it is NOMINAL.** No plugin reads the `auth` answer — `require_user` is always emitted; `auth='None'` changes nothing (like `frontend='React'` was nominal for four stacks). So `auth` teaches the **intake SHAPE** (a defaultable Phase-A answer with a default recorded in `defaultsApplied` when it takes effect — ADR-004), **not** a live shell branch. Day 17 reuses that *discipline* (ask, default, show-when-active), not the storage location.
- **The manifest renders every Phase-A key unconditionally.** `buildManifest` does `...Object.entries(inputs).map(([k,v]) => '- ${k}: ${v}')` (all Phase-A keys) + a `Phase-A defaults applied:` section (`getDefaultsApplied()`, `(none)` for the demos, since they provide all 7 answers). **So (a) a new Phase-A key would add a line → move all 20 hashes, and (b) recording a `'none'` default in `defaultsApplied` would change the `(none)` line → also move them.** Both are the manifest trap; §3b resolves them.
- **Shells add config via env placeholders.** The compose/`.env.example` use `__DB_*__` tokens; secrets are env vars (`PGPASSWORD=__DB_PASSWORD__`), never baked literals. Every stack has a `.env.example`. This is the exact surface email plugs into (`SMTP_*` placeholders).
- **Dependency-install friction differs by stack:** Express `Dockerfile` uses `RUN npm install --omit=dev` with `package-lock.json*` (optional glob) → **adding `nodemailer` to `package.json` resolves cleanly** (no lockfile constraint). FastAPI can use **stdlib `smtplib`** → **no dependency change** at all. Go `net/smtp` and Django/Spring built-ins vs Maven complete the picture (§4).

---

## 2. The integration choice — EMAIL first (settled; rationale)

**Email, not the AI hook, is the first integration.** Day 17's job is to prove the **pattern** (the deterministic branch), not to stress-test the hardest ADR boundary at the same time. Email has a real config surface (SMTP host/port/from + credentials-as-env) that exercises *"how? → config?"* **without ADR-001 weight**. The **AI hook is the better SECOND integration (Day 18)** precisely because, by then, the pattern is proven — so the AI hook can be a focused test of just the *"the generated app may call AI / Thraksha never does"* line. Doing AI first inverts the difficulty curve.

---

## 3. The two things the plan gets right

### 3a. "none" is a LITERAL BYPASS — 20 hashes frozen
- Introduce the integration answer, **default `none`; absent ⇒ `none`.** `none` must reproduce all 20 hashes byte-for-byte (16 in `week-01-summary.md`, Go's 4 in `day-09`/`day-10`).
- `restoreProjectModel` defaults pre-integration snapshots to `none` (old versions regenerate byte-for-byte).
- The plugin wires email **only when the integration is active** — a literal bypass otherwise (mirrors the Spring frontend-subtraction keyed on `frontend='None'`, and the Day-13 depth branch). So each stack's Web-App/`none` output is byte-identical → the hashes stay frozen by construction.

### 3b. The manifest handling — GATED EMISSION (chosen), not a reused slot
There is **no existing rendered slot** for "integration" to reuse (unlike Day 15's `projectType`). So the trap is resolved by **gated emission**:
- **Store `integrations` as a NEW, neutral, optional model concept — NOT a Phase-A key** (like `CodingStyle`). This keeps it out of the `getPhaseASettings()` loop, so it cannot perturb the Phase-A manifest lines or the `(none)` defaults line.
- **`buildManifest` gains a GATED `Integrations:` section**, rendered **only when an integration is active**: `...(active.length > 0 ? ['', 'Integrations (ADR-004 — shown):', ...active] : [])`. For `none` this spreads an empty array → **the manifest is byte-identical → 20 hashes frozen.** For `email` the section appears (ADR-004 — the choice shown).
- **Why gated section over a Phase-A key + per-key filter:** integrations are optional add-ons, not foundational tech answers, so they mirror the style-section threading; and a section that emits *nothing* for `none` is more obviously byte-safe than special-casing a Phase-A key inside the render loop. `'none'` is legitimately silent (nothing was added, so there is nothing to show); ADR-004's "shown" obligation attaches to the **active** choice (email).

### The ADR-001 line (stated precisely, even though email sidesteps it)
The wiring Thraksha **generates** is **inert, deterministic code** — an email service the *generated app* calls **at its own runtime**, a config block, and env placeholders. **Thraksha the generator makes ZERO network/SMTP/AI calls; generation stays pure templates + deterministic emission.** The invariant: *"delete the email integration and generation is unaffected"* (`none` = literal bypass). Email makes this trivially true; **this is the invariant the AI hook (Day 18) will have to prove for a harder case.** **No secrets are ever baked** — only env placeholders.

### What "coherent email-enabled" means (the Day-15 coherence bar, inverted to an ADDITION)
The failure mode is an incoherent addition (a config referencing an env var nothing declares; a service imported but not wired; a README claiming email the code can't do). A **coherent** email-enabled project, per landed stack, has:
- an **email service/helper** the app can call (`send_email(...)` / `sendEmail(...)`);
- a **config block** reading SMTP host/port/from **from the environment**;
- credentials as **ENV PLACEHOLDERS** in `.env.example` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD`) — **never a baked secret**;
- any compose env passthrough (optional — email is inert until env is set);
- a **README** that describes the email capability truthfully ("wired via SMTP; set `SMTP_*` to enable; inert otherwise").
The end proof is a **coherent, still-runnable project** — the app **boots with email wired but inert** (env unset) — not "the email files are present."

---

## 4. The design — the email addition per candidate stack (grounded in the real shells)

| Stack | Email mechanism | Dependency? | Friction | Boot |
|---|---|---|---|---|
| **FastAPI** | stdlib `smtplib` — `app/email.py` service + SMTP config in `app/config.py` + `SMTP_*` in `.env.example` + README | **none** (stdlib) | **lowest** | fast (uvicorn) |
| **Express** | `nodemailer` — `src/email.js` service + `nodemailer` in `package.json` + `SMTP_*` in `.env.example` + README | **nodemailer** (`npm install`, no lockfile) | low (proves the *add-a-dependency* facet) | fast (node) |
| Go | stdlib `net/smtp` helper + `SMTP_*` env + README | none (stdlib) | low but **compiles** | slower |
| Django | built-in `django.core.mail` (SMTP backend in settings) + `SMTP_*` env | none (built-in) | medium (settings wiring) | fast |
| Spring | `spring-boot-starter-mail` + `application.yml` + a mail bean | **Maven dep** | higher | slowest (Maven, first-boot risk) |

Each stack's email wiring is **gated on the integration being active** and is a **literal bypass** otherwise (`none`/Web-App output byte-identical → hashes frozen).

**The integration answer's shape (Session-2 finalizes; recommended):** a neutral model value `integrations` with `email: 'none' | 'smtp'` (default `'none'`) — capturing *need X?* (`none` vs on) and *how?* (`smtp`, the single transport today). *config?* is env placeholders (not stored in the model → no config values baked → determinism preserved). Day 18 extends the same shape with `ai`.

---

## 5. Scope — the landed subset, recommended with justification

**Land email on FastAPI + Express; stage Spring/Django/Go for Day 18.** Justification, grounded in §4:
- **FastAPI — the cleanest minimal addition (primary).** stdlib `smtplib` → **no dependency**; `app/config.py` + `app/` already exist for the config + service; fastest boot; the most-booted stack. It proves the pattern's *minimal coherent addition*.
- **Express — the dependency-addition facet (secondary).** `nodemailer` in `package.json` (resolves cleanly under `npm install`, no lockfile) proves the pattern handles a **real runtime dependency + `package.json` wiring** — a genuine facet of *"config? → dependency"* that a stdlib-only proof would miss. Fast boot, boot-proven.
- Together they prove the pattern works **both with and without a new dependency** — a stronger pattern proof than two stdlib stacks, while both boot fast.
- **Deferred to Day 18:** Spring (Maven starter + `application.yml` + first-boot cost), Django (built-in email but settings wiring), Go (stdlib but compiles). Each follows the same gated-addition principle; Day 18 hardens the pattern and adds them alongside the AI hook. **Prove it fully on two rather than wiring five shells thinly.**

---

## 6. Done-conditions

### 6.1 Session 2 (Execution)
1. The **integration answer** in the model (a neutral optional `integrations`, default `none`); threaded so `none` is a **literal bypass**; `restoreProjectModel` defaults old snapshots to `none`; **`buildManifest` handles it via the gated `Integrations:` section** (nothing for `none` → 20 hashes untouched). Law 25: the value is neutral in core; the per-stack email wiring lives in the plugin.
2. **Email generation on FastAPI + Express** — coherent per §3 (service/helper, config block, `SMTP_*` env placeholders, README), reusing the auth-intake discipline (ADR-004 — the active choice shown via the gated manifest section). **NO baked secrets** (only env placeholders).
3. Keep all **20 hashes byte-identical under `none`** (blocking). Establish **email-enabled baselines** (FastAPI + Express, DemoApp on Postgres, twice-identical; optionally TeamTracker — email is shell-level, entity-independent).

### 6.2 Session 3 (Evaluation + Closing)
- **20-hash matrix byte-identical under `none`** (blocking) + guard-the-guard (diff-empty against week-01-summary + day-09/day-10).
- **Email baselines recorded** (twice-identical) for FastAPI + Express.
- **COHERENCE CHECK:** the email-enabled project is coherent — the config references only env vars it declares in `.env.example`; no dangling/imported-but-unwired service; README truthful — AND **still runnable**: ideally **one boot** (FastAPI preferred — cleanest, fastest) confirming the app comes up with email **wired-but-inert** (SMTP env unset), or a static coherence proof stated honestly.
- **ADR sweep:** ADR-001 (grep `src/core` + `src/plugins` → generation makes **no** SMTP/network/AI call; the email code is generated-template strings the **app** runs, not Thraksha); **no baked secrets** (grep for hardcoded credentials → none; only env placeholders); determinism (ADR-003, `none` a literal bypass); Law 25 (integration answer neutral; per-stack email wiring in the plugin, not the kernel); Law 21 (email-enabled project runs standalone); `TIMESTAMPTZ` JSDoc untouched. Write [`docs/daily/day-17-report.md`](day-17-report.md).

---

## 7. Scope guard — explicitly OUT for Day 17

- **The AI hook / a second integration → Day 18** (earmarked, not built).
- **No new backends / databases / entity kinds / types / style options.**
- **No probabilistic variation** (ADR-003).
- **No integration wiring for stacks outside FastAPI + Express** (staged for Day 18).
- **NO baked credentials** — env placeholders only.
- **Do NOT let generation itself perform any SMTP/network/AI call** (ADR-001) — the generated **app** may (at its runtime); Thraksha never does.

---

## 8. Constraints (baked into every step)

- **ADR-001 (no AI/network in generation):** the generated email service is inert template code the app runs at its runtime; the generator makes zero SMTP/network/AI calls. Delete the integration → generation unaffected.
- **ADR-003 (determinism):** `none` is a literal bypass (20 hashes frozen); email is twice-identical; no config values baked (env only), so no non-determinism.
- **ADR-002 (file separation):** the email addition adds Thraksha-owned shell files/edits only; developer files unaffected.
- **ADR-004 (choices shown):** the active integration is shown (the gated `Integrations:` manifest section); `none` legitimately adds nothing, so it is shown by absence (the wizard, Day 19, will show "Integrations: none").
- **Law 25 (core neutral):** the integration answer is a neutral model value; **which files/config/dependency email adds is the plugin's decision**; `buildManifest` renders the neutral value. The `TIMESTAMPTZ` JSDoc stays untouched.
- **Law 21 (standalone):** the email-enabled project is ordinary FastAPI/Express — it runs after Thraksha is removed (email inert until env set). **No baked secrets, ever.**
- **The 20-hash `none` backstop is non-negotiable.**

**Definition of "Day 17 done":** an optional-integrations answer exists (default `none`, a literal bypass — all 20 hashes frozen); `email` adds a coherent, deterministic email slice on FastAPI + Express (service + env-placeholder config + README, no baked secrets), shown via the gated manifest section (ADR-004); generation makes no SMTP/network call (ADR-001); the email-enabled project is coherent and boots wired-but-inert; Spring/Django/Go are honestly staged for Day 18. Written up in [`docs/daily/day-17-report.md`](day-17-report.md).
