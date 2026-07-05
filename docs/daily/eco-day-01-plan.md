# Eco-Day 01 — PLAN (Session 1 of 3): Determinism ground-truth audit + harness discipline

**Phase 0, Day 1. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no lock-down changes, no harness edits, no audit *conclusions* (Session 2 runs the checks and confirms; Session 3 records). Day 0 confirmed the ground reproduces; **Day 1 audits it** — proves the existing generator's determinism holds, plans the minimal *hash-neutral* lock-downs, and writes the go-forward harness discipline for the next 3 months.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) → [`../CONSTITUTION.md`](../CONSTITUTION.md) + [`../adr/ADR-003-determinism.md`](../adr/ADR-003-determinism.md) → the Day-0 outputs [`eco-day-00-plan.md`](eco-day-00-plan.md) + [`eco-day-00-report.md`](eco-day-00-report.md) → the REAL generator code (done this session).

> **What this plan is grounded on:** I read the actual emission paths this session — the 5 plugins, the DB providers, `regen.ts`, `style.ts`, and the on-disk templates. The observations in §1 are **preliminary audit signals from reading the code**; Session 2 must *formally confirm* each (grep sweeps + twice-run diffs + EOL scans), never take them on faith. Where I found something that contradicts a prior doc, it is flagged (§6).

---

## 0. Day-0 verdict carried in

Day 0: **GROUND CONFIRMED** — `npm run day20:regress` reproduces the **43 digests + 10 relationship hashes** byte-identical from clean. Two forward-flags travel: **(a) cross-OS untested (Windows 11 only)**; **(b) toolchains ≠ intended pins**. One nuance: the maximal digest `33f3ec4b…` is un-reproducible (§4 decides its disposition). Day 1 builds directly on this.

---

## 1. THE DETERMINISM AUDIT — what to inspect, how, and what "clean" looks like

Session 2 runs this against **both** the generator source and a **full generated project** (drive a real generation — e.g. the maximal cell and a couple of matrix cells — to disk in scratch and inspect the emitted bytes, not just the source). The audit is a *finding-producing* pass: a clean result is a finding ("clean, here's the proof"); a dirty result is a STOP-and-report finding.

### Killer #1 — Embedded timestamps / dates / UUIDs / randomness (the #1 killer)
- **How to detect:**
  1. Full grep of `generator/src` for value-producing calls: `new Date`, `Date.now`, `\.now\(\)` **as a JS call** (not inside emitted strings), `Math.random`, `crypto.randomUUID`, `randomBytes`, `performance.now`, `process.hrtime`, `uuid`. Repeat over `generator/dist` (the actually-run code) to catch anything transpilation introduces.
  2. Twice-run byte-diff: generate the same model twice into two scratch dirs, diff the trees. (day20:regress already proves twice-identical for the 43 in-process; Session 2 adds an *on-disk* twice-diff of a full project to cover the write path.)
- **The distinction the audit MUST state (preliminary finding):** grep hits for `now()`/`func.now()`/`CURRENT_TIMESTAMP` in [`plugins/database/postgres.ts`](../../generator/src/plugins/database/postgres.ts), [`plugins/python/entity-codegen.ts`](../../generator/src/plugins/python/entity-codegen.ts), [`plugins/go/entity-codegen.ts`](../../generator/src/plugins/go/entity-codegen.ts), [`plugins/express/entity-codegen.ts`](../../generator/src/plugins/express/entity-codegen.ts) are **literal text inside emitted SQL/ORM strings** — the *generated app's* runtime DB defaults. They are byte-identical every run (deterministic content), NOT timestamps read during generation. Only a value **executed in the generation path** is a killer.
- **Preliminary signal:** **zero** `new Date`/`Date.now`/`Math.random`/`randomUUID` in `src` (grepped this session). Provisional CLEAN.
- **"Clean" =** no nondeterministic value is read during generation; two runs are byte-identical on disk; every timestamp-shaped token in output is a fixed string that is part of the generated app's *runtime* behaviour.

### Killer #2 — Line endings (CRLF vs LF) — generator-level emission, not just git
- **The real finding to confirm (this is the load-bearing one for Day 1):** all 5 plugins build the project **shell** by reading on-disk template files from `generator/plugins/<stack>/templates/` via `fs.readFile(tf, 'utf8')` + `applyTokens` (e.g. [`express-plugin.ts:364,383`](../../generator/src/plugins/express/express-plugin.ts), and the parallel `DEFAULT_TEMPLATES_DIR`/`readFile` in django/go/python/spring plugins). **There is NO CRLF→LF normalization on read.** Entity CRUD is emitted separately via `.join('\n')` arrays (explicit LF). So: **output line-endings = the on-disk template files' line-endings.**
- **How to detect:**
  1. Scan all files under `generator/plugins/*/templates/` for CR bytes (`grep -lU $'\r'` or equivalent). Also scan `generator/src` (multi-line template literals would capture source EOL — though current emission uses `.join('\n')`, confirm no multi-line literal leaks CRLF).
  2. Scan the **emitted** generated project on disk for any `\r`.
  3. Confirm the read/format path preserves rather than transforms EOL: `reindent` in [`style.ts:152`](../../generator/src/core/style.ts) uses `.split('\n')`/`.join('\n')` — CRLF would survive as stray `\r`; confirm no path introduces `\r`.
- **Preliminary signal:** all **83** template files are **LF**; **0** CRLF; emitted output is LF. So output is LF **today — but only because the templates happen to be LF, with no enforcement.** This is exactly the *latent* risk: a template re-saved by a Windows editor, or a future `git` checkout with `autocrlf=true` (once the repo is under git), silently flips output to CRLF and breaks every hash cross-OS.
- **"Clean" =** the generator *guarantees* LF emission regardless of on-disk template state — not "the templates currently happen to be LF." That guarantee is the Session-2 lock-down (§2, LD-1/LD-2).

### Killer #3 — Key ordering / canonical JSON (unstable iteration order)
- **How to detect:**
  1. Grep the generation path for `JSON.stringify` over model-derived **objects/maps**, and for `Object.keys`/`Object.entries`/`for...in`/`Map`/`Set` iteration whose result flows into **emitted file content**.
  2. Inspect every emitted file that is JSON (generated `package.json`, `.json` config): is it a **static template** (deterministic) or **serialized from an object** (order-risk)?
  3. Inspect `applyTokens` (`out.split(k).join(v)` over a `tokens` object) — token application order.
- **Preliminary signal:** the only `JSON.stringify` over objects is in [`versioning.ts:82,91`](../../generator/src/core/versioning.ts) (version-store **metadata**, not project output) and [`server.ts:105`](../../generator/src/core/server.ts) (HTTP responses, not files). Emitted `package.json`/config are **static template files**. The manifest is composed from **ordered arrays**. `applyTokens` iterates a fixed object-literal token map (JS preserves string-key insertion order → deterministic). `walk()` **explicitly sorts** readdir entries ([`express-plugin.ts:132`](../../generator/src/plugins/express/express-plugin.ts)), and `hashFiles` sorts by `relPath`. Provisional CLEAN.
- **"Clean" =** no emitted byte depends on hash-map/`Set` iteration order or `readdir` order; anything order-sensitive is explicitly sorted; any emitted JSON is either static or serialized with sorted keys.

### Formatter version pinning — THE FINDING (the plan's premise doesn't match this codebase)
- **Detect:** grep `package.json`/`package-lock.json` for `prettier`/`eslint`/`dprint`/`biome`.
- **Preliminary finding:** **there is NO external formatter anywhere in the dependencies.** The "formatting" axis is the generator's own internal [`reindent`](../../generator/src/core/style.ts) (deterministic `.split('\n')`/`.join('\n')` code), version-pinned by *being compiled source*. So **there is nothing external (Prettier + plugins) to pin** — the plan's "pin the formatter version already in use" has **no target** here. State this plainly rather than inventing a Prettier pin the code doesn't use.
- **The only adjacent hygiene item:** `devDependencies` are caret ranges (`typescript: ^5.7.2`, `@types/node: ^22.10.2`) — not exact. The TS compiler version does **not** affect *generated output* (the generator emits fixed strings regardless of which TS built it), so this is **not** an output-determinism risk — only build-reproducibility hygiene. Exact-pinning is *hash-neutral* and optional (§2, LD-3).

### Bonus audit note (cross-OS relevant — record for Day 2)
`readdir` order is OS/filesystem-dependent, but determinism is preserved **twice over**: `walk()` sorts entries by name, and `hashFiles`/the write phase are order-independent (sorted by `relPath`). This is a *positive* finding — but it is a cross-OS robustness point to re-verify on macOS/Linux in Day 2.

---

## 2. HASH-NEUTRAL LOCK-DOWNS (Session 2 — implementation) — must move NO hash

**The iron rule (GUARDRAILS §1.1, §3):** every lock-down is proven hash-neutral (`day20:regress` green + 43/10 byte-identical) **before it lands**. **If a lock-down would move a hash, STOP and report it** — that hash was masking latent nondeterminism; never silently re-baseline.

### LD-1 — Generator-level LF normalization on template read (the load-bearing fix)
- **What:** in each of the 5 plugins, immediately after `fs.readFile(tf, 'utf8')`, normalize `\r\n`→`\n` and lone `\r`→`\n` **before** token substitution / seam edits. (Single shared helper preferred, but Law 25 keeps it in the plugin/read layer, not the neutral core's content logic.)
- **Why hash-neutral:** the templates are **already LF** (§1 killer #2), so the replace is a **literal no-op today → moves no hash**. It converts "output is LF because the files happen to be LF" into "output is LF because the generator forces it" — robust to any future CRLF template or a git-checkout EOL flip. This is the generator *emitting LF itself*, per the Day-1 goal.
- **Proof it's neutral:** run `day20:regress` before/after → identical 43/10; on-disk twice-diff of a full project unchanged.
- **STOP condition:** if adding the normalization moves ANY hash, that means a template *currently* has CR bytes feeding a frozen hash — a latent-nondeterminism finding to report, not to paper over.

### LD-2 — Harness guard: assert LF emission (verify, don't just trust)
- **What:** add a check (in the regression harness or a small sibling verifier) that asserts **no emitted file's content contains `\r`** across a representative generation set (the matrix + the maximal cell). A guard that can FAIL.
- **Why hash-neutral:** it inspects output; it changes no generated byte. Adds a real failure mode (guard-the-guard for killer #2) that Day 2's cross-OS proof will lean on.

### LD-3 — (Optional) exact-pin devDependencies
- **What:** pin `typescript` and `@types/node` to exact versions (drop the caret). **Why hash-neutral:** does not change generated output at all; pure build-reproducibility hygiene. Optional — include only if it costs nothing and doesn't churn the lockfile in a way that complicates Day 9. Not load-bearing.

### Explicitly NOT a Day-1 lock-down
- **`.gitattributes` (`* text=auto eol=lf`) is git-layer hygiene** and the **repo is not under git yet** — it pairs with Day 9 (CLAUDE.md + hooks + CI). Note it as needed-Day-9; it is **not** the load-bearing fix. The load-bearing fix is LD-1 (the generator emits LF itself, independent of git).

---

## 3. CROSS-OS — record, do NOT prove (hand the 3-OS proof to Day 2)

Day 0 answered it honestly: **untested, Windows 11 only.** Day 1 records this as a standing audit finding and hands the actual macOS/Windows/Linux byte-identity proof to **Day 2** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 2). Do **not** attempt cross-OS here. Day 1's contribution to Day 2: LD-1 (LF-on-read) and the §1 `readdir`-sort finding **de-risk** the two most likely cross-OS breakers (EOL + directory-iteration order) *before* Day 2 runs — so Day 2 is more likely a clean confirmation than a firefight.

---

## 4. THE MAXIMAL-DIGEST GAP — DECISION (do not leave it floating)

**Decision: (a) canonicalize-and-record** — the achievable form of "make the maximal cell reproducible again" — **with `33f3ec4b…` explicitly retired.**

- **Why not literal reconstruction:** `33f3ec4b…` was produced from an *arbitrary user description string* that was **never recorded** (docs show `description:'…'`) and the Day-20 driver (`recheck.mjs`) was **deleted at cleanup**. The exact prose is **unrecoverable** — so the specific hash `33f3ec4b…` **cannot be honestly reproduced.** Say so plainly.
- **Why not just carry it as an open item (option b):** that leaves the maximal *composition proof* permanently un-reprovable — a hole in the one cell that proves every feature composes. The thesis wants the composition cell reproducible, and it costs almost nothing to restore.
- **The disposition (Session 2 mechanics):**
  1. **Define a fixed, canonical MaxCell description string** and **record it verbatim in-repo** (in the harness constant + the Day-1 report). This is the single missing input.
  2. **Compute a NEW maximal digest in-memory** — build the exact maximal model directly (`createProjectModel` Express · API-only · PostgreSQL · multiUser → `setStyle` snake+four+simple → `setIntegrations {email:'smtp', ai:'hook'}` → `addEntity ×4` the multi-edge TeamTracker → `setDescription(CANONICAL)`), hash via `buildFileSet` with the `/${relPath}\n`+content convention — **no HTTP needed** (UI==CLI is already established; optionally cross-check once via the HTTP chain). Generate **twice → confirm byte-identical**, and record the new digest as `MAXIMAL` in the harness.
  3. **Additive, moves no frozen hash:** this creates a *new* recorded baseline; it does **not** touch any of the 43+10. `33f3ec4b…` is documented as a **retired Day-20 artifact (input lost)**, replaced by the new canonical maximal baseline going forward.
- **Owner / day:** Day 1, Session 2 (compute + record); Session 3 verifies twice-identical + documents the retirement.
- **Honesty line for the report:** "`33f3ec4b…` cannot be reproduced (its input was never recorded); it is retired. A new canonical maximal cell with a recorded description is the go-forward composition baseline." No claim that the old hash returned.

---

## 5. GO-FORWARD HARNESS DISCIPLINE — the written rules (draft for the report)

The discipline the next 3 months run on (Session 3 finalizes this as a durable section, candidate home: the Day-1 report + a pointer for the Day-9 CLAUDE.md):

1. **The frozen backstop reproduces every day.** `npm run day20:regress` green; the **43 + 10** (and the new canonical **MAXIMAL**) byte-identical at the end of every day. Non-negotiable.
2. **New features add their OWN baselines.** A new capability records new twice-identical digests for its non-default paths; it never edits an existing frozen value.
3. **The empty/default path is a literal bypass.** Every new capability, when unused/off, reproduces the existing frozen hashes exactly — proven, not assumed. A feature that is off changes nothing.
4. **Hash-neutral before it lands.** Any lock-down/refactor is proven to move no hash *before* commit; a moved hash is a STOP-and-report finding (latent nondeterminism unmasked), never a silent re-baseline.
5. **A deliberate re-baseline is rare, documented, isolated.** Only when intentional (old→new + rationale, no *other* hash moves), recorded in that day's report.
6. **The three killers are audited for any output-touching change.** Timestamps/random, CRLF/LF, key-order — checked before a new generator path ships.
7. **LF is guaranteed at the generator** (LD-1) and **verified by a guard** (LD-2). Emitted output contains no `\r`, ever.
8. **The cross-OS check joins the gate once Day 2 lands** — byte-identity on macOS/Windows/Linux becomes a standing gate condition after Day 2 proves/fixes it.
9. **Guard-the-guard.** Baselines trace to a source report; the harness stays byte-identical to the sum of the individual gates it replaces.

---

## 6. AUDIT FINDING — Day-0 documentation drift to correct (honesty, GUARDRAILS §4)

**Finding:** [`eco-day-00-report.md`](eco-day-00-report.md) §1.9 (and the Session-2 notes) claim `generator/plugins/*/templates/` are "**not referenced by any src code** (grep-confirmed)" and legacy scratch. **This is FALSE.** All 5 plugins read these template files as the project **shell** on the live generation path (`DEFAULT_TEMPLATES_DIR` + `fs.readFile` in each plugin). The Day-0 grep used imprecise patterns (`plugins/express`, `/plugins/`, `templates/`) that missed the array-form `path.join(HERE,'..','..','..','plugins','<stack>','templates')`.
- **Correction (Session 3, honest, non-destructive):** record the correction in [`eco-day-01-report.md`](eco-day-01-report.md) and add a one-line **erratum pointer** at Day-0 §1.9 (do not silently rewrite the closed Day-0 record; annotate it). The live-path truth: those 83 LF template files are load-bearing; the earlier "delete-able scratch" framing was wrong.
- *(Still open/separate: `generator/Express/DemoApp/` — verify independently whether that particular tree is stray scratch output vs. something referenced; do not delete either way this day.)*

---

## 7. SCOPE GUARD — OUT for Day 1

- **Cross-OS proof** → Day 2 (record only here).
- **Tauri/desktop** → Day 4; **Node sidecar** → Day 5; **SQLite store** → Day 8; **CLAUDE.md / hooks / determinism CI / `.gitattributes`** → Day 9.
- **Any Phase-1 work** — framework+version field, org-policy layer, wizard rebuild, toolchain detect-and-guide → Days 11+.
- **No feature work, no new stacks/types/integrations.** Day 1 = **audit + hash-neutral lock-downs + the maximal decision + harness discipline** only.
- **Never move or touch a frozen hash** (the 43 + 10). The new MAXIMAL baseline is *additive*.

---

## 8. DONE-CONDITIONS & PROOF (Sessions 2 & 3)

### Session 2 (EXECUTE) must produce:
- **DC-1 — Audit findings, per killer**, from formal checks (not just this plan's preliminary signals): killer #1 (grep `src`+`dist` + on-disk twice-diff → clean/dirty), killer #2 (all templates + emitted output EOL scan → the LF finding), killer #3 (JSON/iteration sweep → clean/dirty), the formatter-pinning finding (no external formatter), the `readdir`-sort note. Each with its evidence.
- **DC-2 — The applied hash-neutral lock-downs:** LD-1 (LF-normalize on read, all 5 plugins), LD-2 (LF-emission guard), optionally LD-3 (exact-pin devDeps) — each proven hash-neutral (`day20:regress` green + 43/10 byte-identical before/after). **Any hash move → STOP + report, don't land it.**
- **DC-3 — The maximal-digest decision, executed:** canonical MaxCell description recorded verbatim; new `MAXIMAL` digest computed **twice-identical** and recorded; `33f3ec4b…` documented as retired. Additive — no frozen hash moved.
- **DC-4 — The go-forward harness discipline** captured (draft), and the Day-0 §1.9 correction noted.
- **Working notes** handed to Session 3. No report file yet. **"STOP and report rather than write a clean-looking close if a proof fails."**

### Session 3 (REPORT) verifies & writes `eco-day-01-report.md`:
- Re-confirm from clean: `day20:regress` **green**, 43 + 10 byte-identical, **and** each landed lock-down shown hash-neutral (before/after identical), the new MAXIMAL twice-identical.
- The determinism-audit ground-truth recorded per killer (clean, with proof) — the honest statement that the generator's determinism **holds**, with the LF guarantee now enforced (LD-1) and guarded (LD-2).
- The maximal-digest disposition documented (retired + canonical replacement).
- The go-forward harness discipline written as a durable section.
- The two forward-flags re-carried (cross-OS → Day 2; toolchain pins), and the Day-0 §1.9 erratum recorded.
- **Verdict line:** "Determinism audited and holds; LF emission enforced + guarded, hash-neutral; 43+10 intact; maximal cell re-canonicalized; Day 2 may prove cross-OS." (Or, if any check failed: the honest STOP finding + what's blocked.)

---

## 9. Pre-flight checklist (GUARDRAILS §6) — for Session 2
1. Read guardrails + ecosystem plan + Month-1 + ADR-003? — ✅ (this session).
2. Which session, only its job? — Session 2 = EXECUTE (audit + land hash-neutral lock-downs + record maximal + draft discipline). No report; no features.
3. Which frozen baselines must NOT move? — the **43 + 10**. Every lock-down proven neutral against them; the MAXIMAL is additive.
4. New AI touchpoints? — none (Day 1 adds no AI).
5. Default/empty path a literal bypass? — LD-1 is a *no-op today* (the strongest form of neutral); prove it.
6. Three killers checked? — that IS the day's audit (§1).
7. A gate that can actually FAIL? — LD-2 (LF-emission guard) + the before/after hash-neutral proof; report honestly if either fails.
8. Overclaim / scope drift? — the live risks are (i) inventing a Prettier pin the code doesn't have, and (ii) claiming `33f3ec4b…` was reproduced — §1/§4 forbid both.

---

*Day 1 proves the ground is not just reproducible (Day 0) but determinism-sound: no hidden clock/RNG in the generation path, LF emission guaranteed at the generator (not merely inherited from LF template files), key-order stable — and it writes the discipline that keeps it that way for three months. Audit, lock down only what moves no hash, decide the maximal cell, write the rules. No features. The thesis governs; the backstop is the ground.*
