# Thraksha — GUARDRAILS (Read This First, Every Session)

**This document is read at the start of EVERY session — Plan, Execute, or Report — before any other work.** It is the constitution of the ecosystem phase. If anything in a task conflicts with this document, this document wins. Nothing here is optional.

> **If you are a fresh Claude Code session with no memory of prior days:** this file, plus `docs/THRAKSHA-ECOSYSTEM-PLAN.md` and the relevant `THRAKSHA-MONTH-N.md`, are your full context. Read all three before acting. Then read the REAL code — never assume.

---

## THE SESSION STRUCTURE (memorize this — it governs every single day)

**Every numbered day is THREE sessions, run in order, in separate Claude Code windows. Never combine them. Never skip one.**

| Session | Name | What it does | What it produces | What it must NOT do |
|---|---|---|---|---|
| **Session 1** | **PLAN** | Read guardrails + plan + month file + the REAL code. Resolve unknowns by reading actual files. | `docs/daily/eco-day-NN-plan.md` — done-conditions, gates, scope guards. | **No code. No building.** |
| **Session 2** | **EXECUTE** | Build in order. A hash/verification gate after every step. | The code + passing gates. | **No report. Don't stop at a green that hides a red.** |
| **Session 3** | **REPORT** | Re-confirm from clean. Guard-the-guard. The benchmark if it's a phase close. | `docs/daily/eco-day-NN-report.md` — self-contained handoff. | **No new features. Only verify + document + cleanup.** |

**A day is not done until all three sessions are done and the report is written.** The month files list each day's *Goal / Gate / Output* — the Goal drives Session 1's plan, the Gate is Session 2's proof, the Output is Session 3's report. Session 1 (writing the plan) is ALWAYS implied first, even when a day's entry only shows Goal/Gate/Output.

**The check-then-build gate:** review the plan (end of Session 1) before executing; review the execution (end of Session 2) before closing. This single discipline caught every real bug in the 21 days.

---

## 0. THE THESIS (everything serves this — if a decision violates it, the decision is wrong)

> **Reduce AI reliance for anything software can do deterministically. A 10-second deterministic pass beats burning tokens for a huge monthly bill.**

Software does everything with a **definite, certain structure** — free, instant, byte-identical. AI is confined to the few things that genuinely need **creativity or judgment**, and even then it is **optional, detachable, advisory/creative-only, and the developer's own key and bill.**

Before building anything, ask: *does this keep AI out of the deterministic path, and does it do deterministically everything that can be done deterministically?* If no, stop.

---

## 1. THE HARD RULES (never violated, no exception, no "just this once")

### 1.1 Determinism is the crown jewel
- **Same input → byte-identical output.** Proven by frozen output hashes.
- Every new capability's **default/empty/unused path MUST be a literal bypass** that reproduces the existing frozen hashes exactly. A feature that is off must change nothing.
- **No baseline moves silently.** The frozen backstop (the original 43 digests + 10 relationship hashes + the maximal digest, plus every ecosystem baseline) reproduces at the end of every single day.
- A **deliberate re-baseline** (e.g. the Month-2 field-key fix) is allowed ONLY when: it is intentional, documented (old → new + rationale), isolated (no *other* baseline moves), and recorded in the report. If a change moves a hash you did NOT intend to move → **STOP and report it as a finding** (it means latent nondeterminism was masked).

### 1.2 AI is NEVER in the generation path
- Not for inputs, not for structure, not for the generator's own logic.
- AI only ever: fills creative **slots** (content, never structure) OR **advises** (security findings stamped ADVISORY, never the gate).
- Every AI capability is: **default OFF**, **detachable** (delete it → everything still works), **developer-keyed** (their model, their bill, set in settings).
- **The detachability proof is mandatory** for any AI feature: remove the key/layer → the product still generates/exports/scans completely and validly. If it can't, the AI is load-bearing — that's a violation; fix the design.

### 1.3 Generated vs developer code stay in separate files (ADR-002)
- No round-trip sync. No protected regions. No bidirectional model↔code merge. (All research-confirmed dead-ends.)
- The only safe enhancement is a **non-destructive update** with diff-preview + conflict markers — **never a silent overwrite** of developer code.

### 1.4 The generated project runs standalone (Law 21)
- Delete Thraksha → the exported project still builds and runs. Every export must be provable this way.
- This also applies to the creative path: delete the AI fill → the project still generates completely (slots stay as placeholders).

### 1.5 The core stays neutral (Law 25)
- The kernel holds NO technology-specific logic. Per-stack logic lives in plugins. New capabilities are neutral model values + per-stack plugin projections.
- `buildManifest` and the `TIMESTAMPTZ` JSDoc in `core/database.ts` are load-bearing determinism anchors — do not touch them incidentally.

### 1.6 Ask only what changes structure or what software can't guess (ADR-004)
- Default everything the software can know (and **show** the default — never silent). Defer everything not needed to run.
- Grow the input surface with **progressive disclosure** (simple/advanced modes), never an interrogation. More options in a form is NOT the goal; more *deployable capability* is.

---

## 2. THE THREE DETERMINISM KILLERS (audit for these in anything that touches output)

The research flagged these as the #1 causes of broken reproducibility. Any new generation code must be checked against all three:

1. **Embedded timestamps / dates / UUIDs / random values** in output — the leading killer. Derive any needed IDs from content hashes; never read `now()` or unseeded RNG in the generation path.
2. **Line endings (CRLF vs LF)** — now a real cross-OS risk (Tauri targets macOS/Windows/Linux). Normalize to LF in output; `.gitattributes` + explicit `endOfLine: lf`.
3. **Unsorted object/map keys / unstable iteration order** — serialize the model canonically (sorted keys); iterate maps/sets in a stable order.

Also: **pin the formatter (Prettier) + plugin versions**, and ensure formatter config exists *before* formatting runs.

**Cross-OS is new this phase.** The 21 days were single-OS. Byte-identity must now hold across macOS/Windows/Linux. If it was never proven cross-OS, that is the biggest inherited risk — surface it, don't assume it.

---

## 3. THE ONE LINE THAT MATTERS MOST

> **STOP and report rather than write a clean-looking close if a proof fails.**

A gate that can't fail is worthless. A green that hides a red is worse than an honest red. Every real bug in the 21 days surfaced because a gate was allowed to fail and was reported honestly instead of smoothed over. Put this line in every Session-2 (Execute) prompt as a note to yourself.

Corollaries:
- A determinism check that fails is a **finding**, not an inconvenience. Diagnose *why* before concluding "bug" or "fine" (most 21-day "failures" were test-fixture bugs — but you only know that by diagnosing, not assuming).
- If a cosmetic change moves a hash, that's a real finding (something flows into output it shouldn't) — never a silent re-baseline to make the gate green.
- If a benchmark can't be met honestly, report that it can't. A thin or faked proof on a certification day is worse than a failure.

---

## 4. HONESTY IN CLAIMS AND DOCS (non-negotiable)

- State what is **proven**; name what **isn't**; never overclaim.
- Preserve **proven-vs-generation-proven** and **certain-vs-advisory** distinctions everywhere (in reports, in the UI, in the final docs).
- Booted-live is not the same as generation-proven. Deterministic-certain is not the same as AI-advisory. Say which.
- Carry **every documented limitation forward** — a strengths list without an equally-complete limitations list is an overclaim.
- Stale docs are a finding: if a comment/summary drifts false as the code evolves, flag it and correct it — don't let it mislead a future cold session.
- **Never claim the product does something the deterministic core can't, or that the AI layer does something it can't guarantee.** "Suggests root cause" is a scaffolded slot, not a guarantee. Say so.

---

## 5. SCOPE DISCIPLINE (what NOT to build)

Explicitly out of the 3-month scope (do not drift into these):
- **Bundling heavy toolchains** (JDK/Python/Go/Docker) into the installer — impossible to do honestly. Detect-and-guide + container path only.
- **General screenshot-to-code / AI "guess the app"** — nondeterministic; violates the thesis.
- **Round-trip / bidirectional sync / protected regions** — dead ends.
- **A full plugin marketplace, multi-user cloud sync, hosted service** — larger, later.
- **The any-project bug/quality engine** — a dedicated follow-on AFTER this plan (needs arbitrary-codebase understanding, the genuinely hard part).
- **A VS Code-class general editor** — Thraksha is a specialized intent-to-deployable machine; the developer exports to their own editor.

If a task starts pulling toward any of these, stop and confirm it's actually in scope.

---

## 6. PRE-FLIGHT CHECKLIST (run mentally before every session)

Before planning or building anything:
1. Have I read this file + the ecosystem plan + the relevant month file?
2. Which session am I in — Plan, Execute, or Report — and am I doing only that session's job?
3. Do I understand which frozen baselines this work must NOT move?
4. Is every new AI touchpoint default-off, detachable, and developer-keyed?
5. Is the default/empty path of what I'm building a literal bypass?
6. Have I checked the three determinism killers for any output I touch?
7. Is there a gate that can actually FAIL, and will I report honestly if it does?
8. Am I about to overclaim, or drift into out-of-scope territory?

If any answer is unclear, resolve it (read the real code) before proceeding.

---

## 7. WHAT SUCCESS LOOKS LIKE (the measure, every day and at the end)

**Every day:** does the empty/default path still reproduce the frozen backstop, and is every new capability a literal bypass when unused? Delete the AI, delete Thraksha — does it still generate, build, run?

**At the end:** *does the software do everything it can deterministically, for free and for certain, and confine AI to the genuinely irreducible creative/judgment gaps — always opt-in, always detachable, always the developer's own bill?*

If yes, the thesis held. That is the whole game.

---

*Read this first. Every session. No exceptions. The discipline is the product.*
