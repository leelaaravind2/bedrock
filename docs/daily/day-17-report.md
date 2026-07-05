# Day 17 — End-of-Day Report: The optional-integrations pattern + the FIRST integration (EMAIL)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no wiring change. The only code touched is gate/test scaffolding + cleanup.
**Status: DONE — a neutral, optional `integrations` model concept exists (default `none`, a literal bypass — all 20 hashes frozen), shown via a GATED manifest section. EMAIL is wired end-to-end on FastAPI (stdlib `smtplib`, no dependency) and Express (`nodemailer`, the dependency-addition facet). Both booted live on real Postgres with `SMTP_*` UNSET — the mailer is provably WIRED (loaded at startup, config reads the declared env vars) yet INERT (nothing sent). Thraksha's generation path makes ZERO SMTP/network calls (ADR-001).**

> **This report is a self-contained handoff — Day 18 starts in a fresh session with no carry-over context.** §1–§5 are the reusable pattern, the ADR-001 invariant, the manifest-trap resolution, the baselines/subset, and the gate-suite note that Day 18 needs.

Plan: [`docs/daily/day-17-plan.md`](day-17-plan.md). Guardrails: **ADR-001 (the one that matters most today)**, ADR-002/003, ADR-004 (shown-not-hidden), Law 21, Law 25.

---

## 1. THE INTEGRATIONS PATTERN — precisely (the reusable "need X? → how? → config?" shape)

An optional integration is added as a **deterministic branch**, never probabilistic (ADR-003). The reusable shape (what Day 18's AI hook plugs into):

- **`integrations` is a NEUTRAL, OPTIONAL model concept — NOT a Phase-A key.** It mirrors `CodingStyle`: stored in the model closure ([`src/core/integrations.ts`](../../generator/src/core/integrations.ts) defines `Integrations { email: 'none' | 'smtp' }` + `defaultIntegrations = { email: 'none' }`), read via `model.getIntegrations()`, set via `model.setIntegrations(...)`, carried in `ProjectState`, and defaulted for old snapshots in `restoreProjectModel`. Keeping it out of Phase-A is deliberate (§3).
- **The manifest renders it via a GATED section** (`buildManifest` in `regen.ts`): `activeIntegrationLines(integrations)` returns `[]` when none, and the section is spread only when non-empty — `...(lines.length > 0 ? ['Integrations (ADR-004 — shown):', ...lines, ''] : [])`. For `none` this spreads nothing → the manifest is **byte-identical** → the 20-hash backstop is frozen.
- **Per-stack wiring lives in the PLUGIN, gated on the integration being active** — a LITERAL BYPASS otherwise (mirrors the Spring frontend-subtraction and the Day-13 depth branch). `generateProjectShell` reads `model.getIntegrations().email === 'smtp'` and, only then, transforms the shell (config/env/README/wire-point) and adds the service file. The core stays neutral (Law 25).

**To add a second integration (Day 18's AI hook):** extend `Integrations` with `ai: 'none' | 'hook'`, extend `activeIntegrationLines` (one more gated line), and add the per-stack wiring in the plugins gated on `ai === 'hook'`. No new machinery.

---

## 2. THE ADR-001 LINE — the invariant Day 18's AI hook MUST reproduce

**What Thraksha GENERATES is inert template-string code the generated APP runs at ITS runtime.** The email service (`smtplib` / `nodemailer`) exists only as string constants (`EMAIL_SERVICE_PY` / `EMAIL_SERVICE_JS`) that Thraksha emits — **Thraksha the generator makes ZERO SMTP/network calls.** Confirmed: a grep of `src/` for an actual `import smtplib` / `require('nodemailer')` / `net`/`socket`/`tls` in Thraksha's own code returns **NONE** — those tokens appear only inside the template-string constants. The invariant, stated for reuse:

> **"Delete the integration and generation is unaffected."** `none` is a literal bypass; an active integration adds inert code the app runs. Thraksha never performs the integration's action.

**Day 18's AI hook must prove this SAME property for a case that LOOKS like it violates it:** an AI integration is still a **detachable runtime hook the generated app can use** — never AI in Thraksha's generation path (ADR-001). If deleting the AI hook leaves generation byte-identical and Thraksha makes no AI call, the invariant holds.

---

## 3. THE MANIFEST-TRAP RESOLUTION — two-sided; do not reintroduce

The manifest trap here is **two-sided** — either side would move the frozen 20 hashes:
1. **A new Phase-A key** would add an unconditional `- integration: none` line to the `Project (Phase A)` render (`Object.entries(inputs)`), moving all 20.
2. **Recording a `none` default** in `defaultsApplied` would change the demos' current `(none)` defaults line, also moving all 20.

**The neutral-concept + gated-section design avoids BOTH:** `integrations` is not a Phase-A key (so it never enters the Phase-A render), and `none` is never recorded in `defaultsApplied` (nothing was added, so there is nothing to record — ADR-004's "shown" attaches to the *active* choice). The gated `Integrations:` section emits **nothing** for `none`. **GATE 0 confirmed both sides: the Phase-A lines AND the `(none)` defaults line are unmoved.** Day 18 must keep integrations out of Phase-A and never record an off-default.

---

## 4. THE BASELINES + SUBSET STATE

**Landed (email):** FastAPI + Express — both **email-enabled DemoApp / Postgres, twice-identical:**
```
FastAPI  email  efd3d6a8d0a6cc46b891a73210d211fd8e68f8f449e63b2d8d5fc11a98cfbe9f   (adds app/email.py)
Express  email  62e0ef44cd9aba923f5c6b1f51f7051721f596a2e31ea9b845e90b88016a8e50   (adds src/email.js + nodemailer)
```
**Staged for Day 18** (grounded in the real shells): **Spring** (`spring-boot-starter-mail` Maven dep + `application.yml` + a mail bean; note Spring's first-boot cost), **Django** (built-in `django.core.mail` + settings wiring), **Go** (stdlib `net/smtp` but compiles). Each follows the same gated-addition principle.

### The email addition — per landed stack

| Stack | Mechanism | Dependency | Files added / edited (gated) | Wired at startup |
|---|---|---|---|---|
| **FastAPI** | stdlib `smtplib` | **none** | `app/email.py` (new); `app/config.py` (SMTP fields, env-read); `.env.example` (SMTP_*); `README.md` | `app/main.py` imports `email` |
| **Express** | `nodemailer` | `"nodemailer": "6.9.16"` (resolves under `npm install`, no lockfile) | `src/email.js` (new); `package.json` (dep); `.env.example` (SMTP_*); `README.md` | `src/app.js` requires `./email` |

The env config surface is identical across both: `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD` — **placeholders only, never a baked secret**.

---

## 5. THE GROWING GATE SUITE (a note for Day 20)

There are now `day12:gate` … `day17:gate` scripts plus `ui:demo` / `two-stacks` / `python:demo`. Several start an in-process server and run serially, so running the full set one-by-one is slow (it exceeded a 2-minute batch this session and had to be split). **Day 20's full regression should consider a consolidated harness** rather than invoking six-plus gate scripts sequentially.

---

## 6. Gate results — 20-none frozen + guard-the-guard + the two baselines

`npm run day17:gate` from a **clean rebuild** — **exit 0, zero FAIL.**
- **NONE:** all **20 hashes byte-identical** under `integrations=none` (both the Phase-A lines and the `(none)` defaults line unmoved — the two-sided trap).
- **EMAIL:** FastAPI `efd3d6a8…` and Express `62e0ef44…`, **twice-identical**, each **differs from its none output** (the addition is real), and **coherent** (see §8).

### Guard the guard
The 20 digests baked into `src/day17-gate.ts`, diffed against sources (16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md)): **`16/16` non-Go + `4/4` Go present, full diff EMPTY (20 == 20).**

**No regressions:** day12–16 gates + `ui:demo` / `two-stacks` / `python:demo` all PASS on the current build.

---

## 7. THE HEADLINE — the wired-and-inert email boot (proves WIRED, not just started)

Booted **FastAPI email-enabled** on real Postgres (`docker compose up --build`), **`SMTP_*` UNSET** (0 SMTP refs in compose). A clean start alone is not the proof — a dangling ref or orphaned service could hide behind it — so all three were proven:

**1. The app comes up with `SMTP_*` unset.** `GET /api/health → {"status":"ok","app":"DemoApp"}`; `Application startup complete`, no `ImportError`/`Traceback`. Because `app/main.py` imports the email module **at startup**, a broken mailer would fail the boot — so **startup success is itself evidence the module is wired.**

**2. Normal CRUD still round-trips** (email dormant doesn't break the app):
```
POST /api/tickets {"title":"Email inert","code":"E-1","priority":1,"done":false}
 → 201  {"id":1,...,"owner_id":1,...}
GET  /api/tickets/1  → 200
```

**3. The email path is genuinely WIRED** (in-container, no mail sent):
```
python -c "import app.email; print(callable(app.email.send_email))"        → app.email imported OK; send_email callable: True
python -c "from app.config import settings; print(settings.smtp_host, settings.smtp_port, settings.smtp_from)"
                                                                            → smtp_host='' smtp_port=587 smtp_from=''   (unset ⇒ inert)
# prove it genuinely READS the declared env var (fresh process, var set):
SMTP_HOST=mail.example.com SMTP_FROM=no-reply@example.com python -c "from app.config import settings; print(settings.smtp_host, settings.smtp_from)"
                                                                            → smtp_host='mail.example.com' smtp_from='no-reply@example.com'
```

**Express (optional, done):** booted email-enabled with `SMTP_*` unset — `require('./email')` at startup succeeded (⇒ `nodemailer` installed via `npm install` **and** the module wired), `POST /api/tickets → 201`, and `require('./src/email')` reported `sendEmail` callable + `isConfigured() === false` (inert). This closes the **dependency-addition facet at runtime**: the added dependency actually installs and the require resolves.

Both booted **wired-and-inert**; no mail sent; torn down with `-v`.

---

## 8. Static coherence re-confirm (the absent ≠ coherent guard, both stacks)

- **Declaration-match:** the SMTP_* the config READS == those DECLARED in `.env.example` (both stacks: `SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_USER, SMTP_PASSWORD` — no dangling either direction).
- **Wired, not orphaned:** FastAPI `main.py` imports `email`; Express `app.js` requires `./email`.
- **No baked secret anywhere** — grep of both outputs found only empty env placeholders.
- **README truthful** — "wired via SMTP; set `SMTP_*` to enable; inert otherwise" (not "sends on signup").

Evidence — the `.env.example` SMTP block (identical both stacks) and the FastAPI read-site:
```
# Email (SMTP) — set these to enable outgoing mail; unset ⇒ wired but inert.
SMTP_HOST=
SMTP_PORT=587
SMTP_FROM=
SMTP_USER=
SMTP_PASSWORD=
```
```python
smtp_host: str = os.environ.get("SMTP_HOST", "")
smtp_port: int = int(os.environ.get("SMTP_PORT", "587"))
smtp_from: str = os.environ.get("SMTP_FROM", "")
smtp_user: str = os.environ.get("SMTP_USER", "")
smtp_password: str = os.environ.get("SMTP_PASSWORD", "")   # empty placeholder — no baked secret
```

---

## 9. ADR / Law compliance

- **ADR-001 (no AI/network in generation — the one that matters):** Thraksha's own code imports no `smtplib`/`nodemailer`/`net`/`socket`/`tls` (grep → NONE); those tokens live only inside the `EMAIL_SERVICE_*` template-string constants (the app's code Thraksha emits, not calls). **Generation makes zero SMTP/network calls.** This is the precedent Day 18's AI hook inherits (§2).
- **ADR-002 (file separation):** email adds Thraksha-owned shell files/edits only; developer files untouched (`two-stacks`/`python:demo` re-confirm).
- **ADR-003 (determinism):** `none` is a literal bypass (20 frozen); email is twice-identical; **no config values are baked** (env only), so no non-determinism.
- **Law 25 (core neutral):** `integrations` is a neutral model value; the per-stack email wiring lives in the plugins (grep → no email wiring in `src/core`); `buildManifest` renders the neutral value via the gated section. The `TIMESTAMPTZ` JSDoc in `core/database.ts` is untouched.
- **Law 21 (standalone):** the email-enabled project booted under `docker compose` with no Thraksha present, email inert until env set.

---

## 10. Cleanup & scope

Both boots torn down `-v` (**0 containers**); the generated `fastapi-email` / `express-email` dirs removed; no stray `.mjs`; no preview scaffolding (`launch.json` not recreated). `output/{DemoApp,TeamTracker,arA}` pre-date this session. *(The recurring OS-handle-on-output-dir thread from Days 14–16 did not recur; a relative-path typo initially skipped the removal, corrected with absolute paths.)*

**Scope held:** no second integration (AI hook is Day 18); no new stacks/types/options; no re-baselining of the 20 none hashes or the two email baselines.

---

## 11. What Day 18 picks up

**Day 18 — harden the integration branch + add the AI hook.** Add the **AI hook as a detachable RUNTIME hook** the generated app can use — reproducing the §2 ADR-001 invariant for a case that looks like it violates it (never AI in Thraksha's generation path; "delete the hook and generation is unaffected"). Deterministic: **off/none changes nothing** (the 20 hashes stay frozen — the literal-bypass discipline), **on adds wiring twice-identical**. Optionally add the staged email stacks (Spring/Django/Go). Same neutral-concept + gated-section shape (§1, §3); same coherence bar (§8).

---

**Day 17 verdict:** the optional-integrations pattern is real and deterministic. A neutral `integrations` model concept (default `none`, a literal bypass — 20 hashes frozen, guard-the-guard confirmed) renders via a gated manifest section that avoids the two-sided trap; per-stack email wiring lives in the plugins. EMAIL is coherent on FastAPI (stdlib) + Express (nodemailer), twice-identical, and **booted wired-and-inert** — the mailer loads at startup and reads exactly the declared `SMTP_*` env vars, yet sends nothing (no secret baked). Thraksha's generation path makes zero SMTP/network calls — the ADR-001 invariant Day 18's AI hook inherits. Spring/Django/Go are honestly staged. **Day 18 hardens the pattern and adds the AI hook.**
