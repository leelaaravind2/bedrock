# Day 18 — Plan: Harden the integrations pattern + the SECOND integration (the AI HOOK)

**Session 1 of 3 — PLANNING ONLY.** No implementation, no code edits. This file is the sole output. Sessions 2 (Execution) and 3 (Evaluation + Closing) are scoped below with explicit done-conditions.

**Carry-over context:** [`day-17-report.md`](day-17-report.md) — the integrations pattern (§1), the ADR-001 invariant (§2), the two-sided manifest-trap resolution (§3), the baselines/subset (§4), the gate-suite note (§5). The AI hook is a **mechanical sibling of the email slice**, not new machinery.

**Guardrails:** ADR-001 (the one that matters most today), ADR-003 (determinism), ADR-004 (shown-not-hidden), Law 25 (core-neutral), Law 21 (runs-standalone). No baked secrets. The 20-hash `none` backstop is non-negotiable.

---

## 0. What Day 18 is (in one paragraph)

Harden the Day-17 integrations pattern and add the **SECOND integration: the AI HOOK** — a **detachable RUNTIME hook the generated app can use**. Same neutral-concept + gated-section shape email used (Day-17 §1/§3). **No probabilistic anything (ADR-003)** — no "code personality," no AI in Thraksha's generation path. The AI hook is the direct test of ADR-001 for a case that *looks* like it violates it: the generated app will contain code that calls an AI API, and that is **correct**.

---

## 1. THE TWO ADR-001 PROPERTIES (state both — only ONE is covered by the email precedent)

Day 18 must prove **two** distinct properties. The email slice proved the first; the second is new and is the load-bearing proof of the day.

### Property 1 — THRAKSHA MAKES NO AI CALL *(covered by the email precedent)*
The AI-client code is emitted as **INERT TEMPLATE STRINGS** (`AI_SERVICE_PY` / `AI_SERVICE_JS`), exactly as `EMAIL_SERVICE_PY` / `EMAIL_SERVICE_JS` are today. Thraksha's own process imports no AI SDK and calls no model. **"Delete the hook → generation byte-identical."** This grep-cleans the same way `smtplib` / `nodemailer` / `net` / `socket` / `tls` did in Day 17 (report §2/§9): the AI tokens (`openai` / `anthropic` / a model call / a provider URL) appear **only inside the template-string constants**, never as a real import in `src/core` or `src/plugins`.

### Property 2 — THE HOOK IS GENUINELY OPTIONAL TO THE GENERATED APP *(NEW — email didn't have to prove this)*
The generated app **MUST boot and run normal CRUD** with the AI key UNSET, the hook **present-but-dormant**, and — critically — **the app's core behavior must NOT depend on the hook.** The trap: an AI hook wired so deep the app won't start without a key, or whose AI path is load-bearing for a normal request. **Detachable is a RUNTIME claim**; the **inert boot is the load-bearing proof of the day** (not the hash — the hash will pass by construction under `none`).

---

## 2. STATE THE ADR-001 LINE PRECISELY (so a cold session doesn't flinch)

> The generated app WILL contain code that calls an AI API (e.g. `import openai` in a template string). **This is CORRECT: ADR-001 forbids AI in THRAKSHA'S generation path, not in the apps Thraksha generates.** The generated app calling a model at ITS runtime is exactly like it calling SMTP at its runtime (Day 17). **The line: Thraksha emits the inert AI-client code; Thraksha never calls a model.**

This is the same line the email slice draws (report §2): what Thraksha *generates* is inert template-string code the app runs at *its* runtime; Thraksha the generator makes zero SMTP/network/**AI** calls. ADR-001's own check applies verbatim: *"If I delete the AI plugin right now, does the project still generate correctly?"* — yes, `none` is a literal bypass.

---

## 3. THE DESIGN DECISION — what the AI hook DOES (settled conservatively)

**Recommended shape: an ADD-ON SURFACE the app EXPOSES but does NOT depend on.**

- **An AI-client module** — `app/ai.py` (FastAPI) / `src/ai.js` (Express) — exposing a single optional operation `explain(text)` / `summarize(text)` and an `isConfigured()` guard (mirroring email's `isConfigured()`). Reads `AI_API_KEY` / `AI_PROVIDER` / `AI_MODEL` from the environment. **With `AI_API_KEY` unset it returns a graceful "AI not configured" — it never raises at import and never constructs a request.** Only when keyed does it call the provider, **at the app's runtime.**
- **ONE dedicated, isolated optional endpoint** — `POST /api/ai/explain` — mounted on its own route namespace (`/api/ai/*`), that calls the module and, when unconfigured, returns a **graceful 503 `{"detail":"AI is not configured"}`** (or equivalent structured body) — **not a crash, not a 500.** This is the "reachable-but-dormant" surface the Session-3 boot proof hits.
- **Wired to NOTHING in the CRUD path.** The entity CRUD routers/handlers are **byte-identical to the non-AI shell** except for the single isolated mount/wire line (the exact analogue of email's one import/require line: `from . import email` / `require('./email')`). The AI route namespace is fully separate from the entity CRUD routes.

**Config as ENV PLACEHOLDERS only** — `AI_API_KEY` / `AI_PROVIDER` / `AI_MODEL`, empty placeholders in `.env.example`, read via `os.environ.get` / `process.env`. **NEVER a baked key or secret** — same no-baked-secrets bar as email (report §8).

### Why this shape (justification)
- **It maximizes detachability and makes Property 2 trivially provable.** A separate route namespace + an `isConfigured()` guard that returns before any client is constructed means the CRUD path cannot depend on the hook, and the app boots with the key unset.
- **Rejected shapes** (they make detachability harder to prove and easier to violate, and are OUT of scope): AI-assisted validation, AI-enriched CRUD responses, or any AI threaded into the normal request flow. **The AI is an ADD-ON SURFACE, not a dependency.**

### Dependency facet — deliberately NOT re-proven here
Email already proved the "add-a-dependency" facet at runtime via `nodemailer` (report §7). The AI hook's job is Property 2 (optional-to-the-app), not re-proving the dependency facet. **Recommendation: use STDLIB HTTP on BOTH stacks — Python `urllib.request`, Node built-in `fetch`/`https` — no new third-party dependency.** This mirrors FastAPI's stdlib-`smtplib` choice, guarantees a fast, reliable inert boot (the day's headline), and keeps the focus on detachability. The template still contains a recognizable AI-call token (a provider chat endpoint, model name) so the grep in §Property-1 has something concrete to confirm lives only in a string. *(Using an `openai`/`anthropic` SDK as a real dependency is a possible variant but adds install/boot variability that works against the headline proof — recommend against for Day 18.)*

---

## 4. THE BACKSTOP + manifest (same discipline as Day 17 — two-sided trap)

Extend the neutral core exactly as Day-17 §1 prescribes — **no new machinery**:

- **`integrations.ts`:** extend `Integrations` with `ai: 'none' | 'hook'`; extend `defaultIntegrations` to `{ email: 'none', ai: 'none' }`; `absent ⇒ 'none'`. **`none` = literal bypass.**
- **`activeIntegrationLines`:** add ONE more gated line for the active AI hook (analogous to the email line), pushed only when `integrations.ai !== 'none'`. Nothing emitted when `ai === 'none'`. Suggested line: `  - ai: hook — AI hook exposed (optional endpoint the app can call); API key read from the environment (the app calls the model, Thraksha never does — ADR-001)`.
- **The two-sided trap (report §3) — do not reintroduce either side:**
  1. Keep `ai` **OUT of Phase-A** (never enters the `Project (Phase A)` render → the Phase-A lines stay unmoved).
  2. **Never record a `none` default** in `defaultsApplied` (nothing was added → nothing to record → the `(none)` defaults line stays unmoved).
  With both `email` and `ai` at `none`, `activeIntegrationLines` returns `[]` → the gated `Integrations (ADR-004 — shown):` section spreads nothing → the manifest is **byte-identical** → **all 20 hashes frozen (both sides).**
- **Model wiring (`project-model.ts`):** `getIntegrations()` / `setIntegrations()` must copy **every** member (`email` AND `ai`) — dropping one silently makes that integration a no-op (the file already warns of this at line 439). `restoreProjectModel` defaults old snapshots: `ai: state.integrations.ai ?? 'none'` when `integrations` is present, `defaultIntegrations` when absent — so pre-Day-18 snapshots regenerate byte-for-byte (ADR-003).
- **Per-stack wiring lives in the PLUGIN**, gated on `model.getIntegrations().ai === 'hook'` — a **LITERAL BYPASS** otherwise (mirrors the `email === 'smtp'` gate at `python-plugin.ts:193` / `express-plugin.ts:255`). The core stays neutral (Law 25).

---

## 5. SCOPE — the landed subset (with justification)

**Recommended landed subset: FastAPI + Express** — the proven-clean, fast-booting pair email landed on (report §4). The AI hook **reuses the exact wiring seam email proved**: gated shell transforms (`.env.example`, `README.md`, the startup wire-point) + one added service file + one wire line. Prove the AI hook **fully on the clean pair first.**

**Secondary, only if clean and time permits:** add the STAGED email stacks (Spring / Django / Go — report §4). This is **not required** for Day 18 and the plan explicitly says: *email-stack expansion is secondary and only if it doesn't strain the session.* **Don't force the hard stacks.** Spring's first-boot cost in particular is a known drag.

---

## 6. Session 2 (EXECUTION) — done-conditions

1. **Core extended (neutral, Law 25).** `Integrations` gains `ai` (default `none`); `defaultIntegrations = { email:'none', ai:'none' }`; threaded so `none` is a **literal bypass**; `activeIntegrationLines` gated (one added line, emitted only when `ai !== 'none'`); `getIntegrations`/`setIntegrations` copy both members; `restoreProjectModel` defaults old snapshots (`ai ?? 'none'`). **The manifest handles it without moving the 20 hashes (BOTH sides — Phase-A lines AND the `(none)` defaults line).**
2. **AI-hook generation on the landed subset (FastAPI + Express).** The detachable add-on surface: the AI-client module (`app/ai.py` / `src/ai.js`) with `isConfigured()` + graceful-unconfigured, ONE isolated optional endpoint (`POST /api/ai/explain`), env-placeholder config (`AI_API_KEY`/`AI_PROVIDER`/`AI_MODEL`), truthful README. **Wired to NOTHING in the CRUD path** (single isolated mount line; CRUD handlers byte-identical to the non-AI shell). Reuse the email wiring seam. **NO baked keys.**
3. **Backstop + baselines.** Keep all **20 hashes byte-identical under `none`** (blocking). Establish **AI-hook baselines (twice-identical)** for FastAPI + Express (DemoApp, Postgres), each **differing from its `none` output** (the addition is real). Land these in a `day18-gate.ts` sibling of [`day17-gate.ts`](../../generator/src/day17-gate.ts) (NONE matrix + AI baselines + coherence + guard-the-guard), leaving the Day-17 gate intact.

**STOP-AND-REPORT guardrail (do not paper over):** if the design cannot keep the AI hook **fully detachable** from the CRUD path — e.g. the endpoint/module cannot be mounted without touching a CRUD handler, or the app won't boot with the key unset — **STOP and surface it as a real finding** rather than writing a clean-looking gate. A hook that has to touch the core request flow is a genuine ADR-001 (Property 2) violation worth reporting.

---

## 7. Session 3 (EVALUATION + CLOSING) — done-conditions

- **20-hash matrix byte-identical under `none`** (blocking) + **guard-the-guard** (the 20 digests diffed against sources — 16 in [`week-01-summary.md`](week-01-summary.md), Go's 4 in [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md); full diff EMPTY, 20 == 20).
- **AI-hook baselines recorded (twice-identical)** for FastAPI + Express, each differing from its `none` output.
- **THE DETACHABLE BOOT (the day's headline).** Boot the AI-enabled app (FastAPI; Express optional) on real Postgres via `docker compose up --build`, **`AI_API_KEY` UNSET** (0 AI refs in compose), and prove **all four**:
  1. **The app comes up** — `GET /api/health → ok`, `Application startup complete`, no `ImportError`/`Traceback`. Because the AI module is loaded at startup (like email), **startup success is itself evidence the hook is wired.**
  2. **Normal CRUD round-trips** — `POST /api/tickets → 201`, `GET /api/tickets/1 → 200` (the dormant hook doesn't break the app).
  3. **The AI hook is REACHABLE-BUT-DORMANT** — `POST /api/ai/explain` returns a **graceful "AI is not configured"** (503 or structured body), **not a crash**; in-container `import app.ai; isConfigured() == False`. Prove it genuinely READS the declared env var (fresh process, `AI_API_KEY` set → `isConfigured() == True`) **without making a real call** (mirrors email's SMTP read-proof, report §7).
  4. **The CORE PATH DOES NOT DEPEND ON IT** — CRUD works **identically** whether the hook is configured or not (the AI endpoint is the ONLY surface whose behavior changes). Prove the AI is an add-on, not a dependency.
  **No real AI call made.** Tear down with `-v`.
- **ADR sweep:**
  - **ADR-001 — BOTH properties.** (a) grep `src/core` + `src/plugins` → Thraksha imports **no AI SDK** and makes **no model call** (the `openai`/`anthropic`/client/provider-URL tokens live **only** in the `AI_SERVICE_*` template-string constants); (b) the generated app's AI hook is **detachable** (booted inert, core unaffected).
  - **No baked keys** — grep the generated outputs → **only env placeholders** (`AI_API_KEY=` empty, etc.).
  - **Determinism (ADR-003)** — `none` a literal bypass (20 frozen); AI hook twice-identical; no config values baked.
  - **ADR-004** — the `ai` choice shown via the gated section, never silent; `none` legitimately shows nothing.
  - **Law 25** — `ai` answer neutral in core; per-stack wiring in the plugin (grep → no AI wiring in `src/core`).
  - **Law 21** — the AI-enabled app runs standalone under `docker compose` (no Thraksha present), inert until keyed.
- **Write [`docs/daily/day-18-report.md`](day-18-report.md)** — a self-contained handoff for Day 19 (fresh session, no carry-over). It must state what Day 19 picks up:

  > **Day 19 — wizard enrichment.** Project description → README; relationships in the entity screen (developer declares "belongs-to" in the UI, feeding Day 1–4 relationship generation); and the style / integration / type screens all flowing cleanly end-to-end. All additive; engine untouched; deterministic.

---

## 8. Scope guard — OUT for Day 18

- ❌ **No probabilistic AI / "code personality"** (ADR-003).
- ❌ **No AI anywhere in Thraksha's generation path** (ADR-001) — the generated APP may call a model at ITS runtime; Thraksha never does.
- ❌ **No baked keys/secrets** — env placeholders only.
- ❌ **No AI threaded into the CRUD/core request path** — the hook is a detachable add-on surface only.
- ❌ **No new stacks/databases/entity kinds/types/style options** beyond the recommended subset (FastAPI + Express; staged email stacks strictly secondary).
- ❌ **No re-baselining** of the 20 `none` hashes or the two Day-17 email baselines.

---

## 9. Constraints (bake into every step)

- **ADR-001** — no AI in Thraksha's generation path; the generated app's AI call is at ITS runtime, like email's SMTP call.
- **ADR-003** — deterministic; `none` a literal bypass; 20 frozen; AI hook twice-identical; no config values baked.
- **ADR-004** — the active AI choice shown via the gated section, never silent; `none` legitimately shows nothing.
- **Law 25** — `ai` answer neutral in core; per-stack wiring in the plugin.
- **Law 21** — AI-enabled app runs standalone, inert until keyed.
- **No baked secrets.** The 20-hash `none` backstop is non-negotiable.

---

**Day 18 plan verdict:** the AI hook is a mechanical sibling of the email slice — the same neutral-concept + gated-section core (extend `Integrations` with `ai`, one more gated manifest line, per-stack plugin wiring gated on `ai === 'hook'`), the same two-sided manifest-trap discipline (20 frozen under `none`), the same coherence bar. It reproduces ADR-001 Property 1 (Thraksha makes no model call — grep-clean like email) and adds the NEW Property 2 (the hook is genuinely optional to the generated app — the detachable inert boot is the headline). Recommended subset: FastAPI + Express; email-stack expansion secondary. **Design confirmed detachable** (isolated `/api/ai/*` route, `isConfigured()` guard, single mount line, CRUD handlers untouched) — with a live STOP-AND-REPORT guardrail if execution shows the hook cannot stay off the CRUD path.
