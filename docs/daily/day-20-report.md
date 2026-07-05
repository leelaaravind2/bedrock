# Day 20 — End-of-Day Report: Full-system integration + regression proof (the certification)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new features, no harness change beyond re-running. The only files touched are cleanup.
**Status: CERTIFIED — the full regression holds. All 43 recorded digests + the 10 TeamTracker relationship hashes reproduce byte-identical from a clean rebuild; guard-the-guard is diff-empty against every primary source. The consolidated regression harness (`npm run day20:regress`) is now the canonical tool, PROVEN byte-identical to the sum of the individual gates (which remain as the cross-check). The maximal-composition cell — every feature switched on at once — is deterministic (`33f3ec4b…`, twice-identical), driven end-to-end through the real HTTP chain, and BOOTED: the four-part detachable ai-hook proof + a live composed FK round-trip. Nothing drifted across 20 days of accumulation. Both debts paid.**

> **This report is a self-contained handoff — Day 21 (polish + final docs) starts fresh.** It is the canonical "what the whole system proves" record. §1 the regression result, §2 the harness, §3 the interaction proof, §4 the debts, §5 known limitations, §6 the Day-21 backlog, §7 the all-laws certification.

Plan: [`docs/daily/day-20-plan.md`](day-20-plan.md). Precedent: [`day-19-report.md`](day-19-report.md). Guardrails: **ALL of them** — this is the day every ADR/Law is certified together (§7).

---

## 1. THE FULL REGRESSION RESULT — nothing drifted in 20 days

From a **clean rebuild** (`rm -rf dist && tsc`), `npm run day20:regress` — **exit 0, zero FAIL:**

- **The 20 web-app matrix** (5 backends × 2 DBs × 2 models) — byte-identical.
- **The 23 alternative baselines** — 5 naming (`snake_case` Task), 2 formatting (Express), 4 architecture `simple`, 2 composition, 6 api-only, 2 email, 2 ai-hook — byte-identical, each with its **non-hash checks** green (naming wire-keys per stack; simple collapse; composition content; api-only manifest-only; email coherence; ai-hook coherence + **detachability CRUD-diff**).
- **The 10 TeamTracker relationship hashes** — reproduced via the UI `addEntity` path (incl. the multi-edge Ticket), byte-for-byte == the matrix baselines (UI==CLI on the relationship path).
- **The property cases RE-DERIVED this run** (not cited): api-only == web-app **MANIFEST-ONLY** (the 3 lines: projectType, frontend, and the recorded ADR-004 default — no code change); description-provided == blank ± **only the README**.
- **Guards:** `setStyle`/`setDescription` survive get/set + snapshot restore; naming helpers fire.

### Guard-the-guard — diff-empty against every primary source
| Baseline group | Harness | Primary source | Diff |
|---|---|---|---|
| 20 web-app matrix | 20 | [`week-01-summary.md`](week-01-summary.md) (16) + [`day-09`](day-09-report.md)/[`day-10`](day-10-report.md) (4 Go) | **0** |
| 13 style-alternatives | 13 | [`week-02-summary.md`](week-02-summary.md) §4 | **0 missing** |
| 6 api-only | 6 | `day16-gate` `API_ONLY` / [`day-16-report`](day-16-report.md) | **0 missing** |
| 2 email + 2 ai-hook | 4 | [`day-17`](day-17-report.md) / [`day-18-report`](day-18-report.md) | **0 missing** |

**43 recorded digests, all byte-identical, all traced to their source report.** No hash moved.

---

## 2. THE CONSOLIDATED HARNESS — canonical, and TRUSTED BECAUSE VALIDATED

`day20-regression.ts` (run: **`npm run day20:regress`**) replaces running `day12`–`day19` serially: it re-confirms all 43 digests + every gate's non-hash checks + the property re-derivations + the relationship UI==CLI, in **one fast process**, using the **exact `/${relPath}\n` + content hash convention** the gates use (so it does not fork the digest space).

**It is trusted BECAUSE it was validated against the gates it replaces — not asserted equivalent (GATE 0):**
- All **8 individual gates + 3 demos exit 0** (the independent reference — the backstop holds via the original gates).
- The harness asserts **43** distinct digests; the reference set (every 64-hex baked in the 8 gate files + recorded in the source reports) is also **43**; **reference-not-in-harness = 0** (diff-empty both ways).
- **The individual gates remain intact** as the cross-check (Day 21 may retire them now that the harness is trusted). The harness changed NO generated output and moved NO baseline — test scaffolding only.

---

## 3. THE INTERACTION PROOF — the features COMPOSE (proven at generation AND runtime)

Each feature was proven additive in ISOLATION on its own day; **nobody had generated them all at once.** Day 20 does — the genuinely new certification.

**The maximal cell:** `Express · API-only · multi-edge TeamTracker (Ticket belongs-to Application AND Team) · snake_case + four-space + simple · integrations {email:smtp, ai:hook} · a provided description`. Express is the ONLY stack where every style axis AND an integration can all be non-default at once (formatting is Express-only; simple is Express+FastAPI; email/ai are FastAPI+Express).

- **Deterministic (generation):** driven **end-to-end through the real HTTP chain** — `POST /api/settings → /api/style → /api/integrations → /api/entities ×4 → /api/generate` — and hashed directly off the unbroken chain (Debt #2). Generated **twice → byte-identical** (same project name): **`33f3ec4b0ae9bb7c76e39a68f36ff395f4a4c5d35115c149824b482dd8087e22`** (the new Day-20 interaction artifact; re-confirmed from clean this session). UI==CLI held (disk == reconstructed CLI). *(This digest is projectName-specific — `MaxCell` — as generation embeds the name; it is a recorded composition artifact, not a re-baseline of anything frozen.)*

- **Coherent (runtime) — BOOTED** on real Postgres, `AI_API_KEY` UNSET (Session-2 evidence, re-stated; nothing this session raised a doubt):
  1. **Comes up key-unset** — health ok, `MaxCell backend listening`, no error; `require('./ai')` and `require('./email')` load at startup ⇒ both wired.
  2. **Composed CRUD + FK round-trip LIVE** — `POST /api/teams → 201` (owner-scoped), `POST /api/applications {teamId:1} → 201`, `GET /api/applications/1 → 200` with `teamId` intact — the FK round-trips with **api-only + simple-collapsed structure + snake_case declared fields + camel FK key + owner scoping ALL composed.** This is the interaction coherence the hash can't prove (a twice-identical project can still be subtly broken at runtime).
  3. **AI reachable-but-dormant** — `POST /api/ai/explain → 503 {"detail":"AI is not configured"}` (not a crash); `isConfigured()` false unset, true when `AI_API_KEY` set (read-proof, no network); email `sendEmail` callable + `isConfigured() === false` (wired-but-inert).
  4. **CRUD identical configured-vs-unconfigured** — the same sequence on a fresh DB with `AI_API_KEY=dummy` was **byte-identical** to the unset run (timestamps normalized). The AI is an **add-on, not a dependency** — on the maximal composition (Debt #1, stronger than a focused boot).

  No real AI/SMTP call; torn down `-v`.

---

## 4. BOTH DEBTS PAID

- **Debt #1 — the deferred Express ai-hook runtime boot** (Day 18 booted FastAPI only): paid, and folded into the maximal-cell boot (§3) — the four-part detachable proof ran on the composed Express project.
- **Debt #2 — the end-to-end HTTP-chain hash** (Day 19 proved threading + generate as two linked steps): paid — the maximal cell was hashed directly off the unbroken `settings→style→integrations→entities→generate` chain (§3).

---

## 5. Known limitations — the whole-system view (documented, carried forward)

The deliberate v1 limitations from Weeks 1–2 stand (Spring never booted live — family-proven; MySQL live-proven on Express + Go only; `has-many` records no schema; scalar `belongs-to` FKs only; `DECIMAL` unexercised; cross-depth switching unsupported; style not self-recorded in the manifest). Day 20 adds one **confirmed-under-composition** observation:

- **Mixed-key serialization, now observable in a shipping-shaped composed project.** In the snake_case maximal cell, the FK wire key came back **`teamId` (camelCase)** beside snake_case declared fields — this is the **documented Day-12/13 mixed-key limitation** (`namingConvention` governs DECLARED fields; `id`/audit/owner/FK keep their frozen per-stack representation), now alive and user-visible in the composed api-only project and **behaving exactly as documented**. Not a new bug. A future day could unify FK keys under `namingConvention` (would move baselines — out of scope now). Recorded here because Day 20 is the closest thing to a whole-system checkpoint: this seam is real and worth carrying forward.

*(For the record, not limitations: two Session-2 checks were corrected — an api-only diff check that expected "exactly 2" manifest lines when the recorded-default variant legitimately has 3; and a determinism check that used two different project names. Both were test-harness bugs; **no drift was found** and no baseline moved.)*

---

## 6. THE DAY-21 POLISH BACKLOG (cosmetic — both touch no hash)

1. **The "Style" stepper label** should read **"Style & integrations"** — the integration selects were folded into that wizard screen (Day 19); the label wasn't updated. UI text only.
2. **The stale [`teamtracker-model.ts:9–14`](../../generator/src/teamtracker-model.ts) comment** claims relationships are *"metadata only … No half-working relationship codegen is introduced"* — **FALSE** (the plugins generate belongs-to FKs; the 10 TeamTracker baselines bake in `team_id`/`application_id`/`ticket_id` + constraints). A one-line comment fix — leave the demo-model logic and its hashes alone.

---

## 7. ADR / LAW CERTIFICATION — all of them, with where each was proven this regression

| Law | Certified by (this regression) |
|---|---|
| **ADR-001** — no AI in generation | grep `src/core`+`src/plugins` → **no** real `import`/`require` of any AI SDK; `api.openai.com` appears ONLY inside the `AI_SERVICE_*` backtick string constants (`python-plugin.ts:219`, `express-plugin.ts:268`) + comments. The ai-hook is the generated app's **detachable runtime hook** — the four-part boot (§3). Generation makes no AI/network call. |
| **ADR-002** — file separation | `two-stacks` + `python:demo` PASS from clean — developer files created-once, untouched by regeneration. |
| **ADR-003** — determinism | Every default/`none`/blank path a literal bypass; all **43 baselines byte-identical**; the maximal composition **twice-identical** (`33f3ec4b…`). |
| **ADR-004** — mandatory/optional/default, shown | description/relationships/integrations/style all optional-and-shown (blueprint chips + README); the recorded default is real — the api-only property re-derivation confirmed the `frontend=None` `defaultsApplied` line. |
| **ADR-005** — multi-user up front | `owner_id`/`ownerId` scoping live in the composed boot — the FK round-trip carried `ownerId` on every row (§3.2). |
| **Law 21** — standalone | the composed project **booted under `docker compose` with no Thraksha present**, inert until keyed. |
| **Law 25** — core neutral | all feature values (type/style/integrations/description/relationships) are neutral in `src/core`; per-stack FK/wiring lives in the plugins (no `belongsToRels`/FK codegen in `src/core`); the `TIMESTAMPTZ` JSDoc in `core/database.ts` is **untouched**. |

This certification is the report's spine: every law has a concrete proof location this regression.

---

## 8. Cleanup & scope

The re-confirm server + scratch (`day20-out`/`day20-store`/`recheck.mjs`/`day20-server.log`) removed (absolute paths); no docker residue; no `launch.json`; no repo `output/`. Residue check clean: **0 containers, 0 listening ports, no scratch dirs.** The OS-handle thread did not recur.

**Scope held:** no new features, no harness change beyond re-running, no re-baselining of any of the 43 digests / 10 relationship hashes / the maximal-composition digest. Only cleanup touched files.

---

## 9. What Day 21 picks up

**Day 21 — demo polish + final documentation** (the v0.1 close). No new features; no hash moves.
- The two cosmetic fixes (§6): the "Style" → "Style & integrations" stepper label; the stale `teamtracker-model.ts:9–14` comment.
- A final pass over the docs/README — and `docs/CAPABILITIES.md` + the consolidated 21-day report (per the 21-day plan).
- Any closing v0.1 accounting. The consolidated harness (`npm run day20:regress`) is the regression backstop; the 43 digests + 10 relationship hashes + the maximal-composition digest are the frozen record every Day-21 change must keep byte-identical.

---

**Day 20 verdict:** the full-system regression is CERTIFIED. Across 20 days of accumulation — 5 backends, 2 databases, 2 project types, a 3-axis coding-style engine, 2 optional integrations, relationships, and a description — **nothing drifted**: all 43 recorded digests + the 10 TeamTracker relationship hashes reproduce byte-identical, guard-the-guard diff-empty against every primary source. The consolidated harness is now the canonical regression tool, **trusted because it was validated byte-identical against the individual gates it replaces**. And the genuinely new proof: every feature **composes** — the maximal cell is deterministic through the real HTTP chain (`33f3ec4b…`, twice-identical) AND booted coherently (four-part detachable ai-hook + a live composed FK round-trip with snake declared fields beside a camel FK key, api-only, simple-collapsed, owner-scoped). Every ADR and Law is certified with a concrete proof location. **Day 21 is polish + final docs.**
