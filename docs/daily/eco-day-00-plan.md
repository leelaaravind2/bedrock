# Eco-Day 00 — PLAN (Session 1 of 3): Orientation & ground-truth confirmation

**Phase 0, Day 0. PLANNING ONLY.** This session writes this plan and nothing else — no code, no build, no regression run, no audit conclusions, no file changes anywhere except this plan file. Day 0 is orientation before any audit or build: a fresh session must MEET the codebase, the rules, and the certified backstop, and confirm the project builds and the regression reproduces — *before* Day 1 audits determinism on top of it.

**Read-first order (done this session, and required for every ecosystem session):**
1. [`docs/THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) — the constitution (session structure, thesis, hard rules, three determinism killers, the one line).
2. [`docs/THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) — the founding roadmap.
3. [`docs/THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) — the Phase-0/Phase-1 day-by-day.
4. v0.1 record: [`docs/CONSTITUTION.md`](../CONSTITUTION.md), [`docs/adr/ADR-001..005`](../adr/), [`docs/daily/21-day-report.md`](21-day-report.md), [`docs/daily/day-20-report.md`](day-20-report.md) (the certification), [`docs/CAPABILITIES.md`](../CAPABILITIES.md).
5. The real codebase under [`generator/`](../../generator/).

> **This is a PLAN.** Everything below is *how Session 2 will execute and Session 3 will report* — the confirmations are designed here, run there. Nothing is resolved by assumption; where this plan states a fact, it was read from the real docs/code this session (paths, commands, and the harness internals were opened, not guessed).

---

## 0. What Day 0 IS and is NOT

- **Day 0 IS:** read everything → build from a clean state → RUN the existing regression → confirm the certified frozen backstop reproduces. Output: a MAP of the codebase + a CONFIRMATION the ground exists and is reachable.
- **Day 0 is NOT:** the determinism audit (Day 1), any lock-down, any feature, any Tauri/desktop work, any change to any file, any conclusion about the three determinism killers. Just confirm the baseline reproduces and map where things are.

**The load-bearing check (the single most important thing Day 0 does):** from a clean build, `npm run day20:regress` must reproduce the certified baselines byte-identical. **If it does not reproduce, that is the #1 finding of Day 0 — STOP, report it, and do NOT proceed to Day 1.** A certified backstop that is not reproducible as-shipped is the whole game.

---

## 1. Ground-truth facts established THIS session (so Session 2 starts from truth, not assumption)

These were read from the real repo this session and shape the plan. Session 2 re-confirms them empirically; they are recorded here so a fresh session is not surprised.

### 1.1 The repo is NOT a git repository
`git rev-parse` fails at [`E:\Software`](../../); there is no `.git`. **Consequence:** "clean checkout" as literally phrased in the task is not achievable — there is no VCS to clone/clean from. Session 2's operational definition of "clean build" is therefore: **delete the compiled output and rebuild from `src/`** — i.e. `rm -rf generator/dist && (cd generator && npm ci || npm install) && npm run build`. This mirrors exactly what the Day-20 certification itself used (`rm -rf dist && tsc`, [`day-20-report.md`](day-20-report.md) §1). Session 2 must state this operational definition explicitly in its evidence and NOT claim a git-clean it cannot perform.

### 1.2 The regression lives in `generator/`, not repo root
Verify command (from [`CAPABILITIES.md`](../CAPABILITIES.md) §5): `cd generator && npm run build && npm run day20:regress`. The npm script is `day20:regress` → `node dist/day20-regression.js` ([`generator/package.json`](../../generator/package.json)). It is a **pure Node process — no Docker, no database, no network, no live boot** for the digest set.

### 1.3 What `npm run day20:regress` ACTUALLY asserts — and what it does NOT
Read directly from [`generator/src/day20-regression.ts`](../../generator/src/day20-regression.ts):
- **IN the harness (the automated one-command backstop):** the **43 recorded digests** (20 web-app matrix + 5 naming + 2 formatting + 4 simple + 2 composition + 6 api-only + 2 email + 2 ai-hook) + the **10 TeamTracker relationship hashes** (re-derived via the UI `addEntity` path, asserted byte-equal to the matrix baselines) + every non-hash check (naming wire-keys, simple collapse, composition content, api-only/email/ai-hook coherence + ai-hook detachability, property re-derivations, guards). Digest convention: files sorted by `relPath`, `sha256` of `/${relPath}\n` + UTF-8 content per file.
- **NOT in the harness — a ground-truth nuance the task phrasing glosses:** the **maximal-composition digest `33f3ec4b0ae9bb7c76e39a68f36ff395f4a4c5d35115c149824b482dd8087e22`** is **baked nowhere in `src`** (grep for `33f3ec4b`/`MaxCell` → absent). In Day 20 it was produced **separately**, driven end-to-end through the live HTTP chain (`POST /api/settings → /api/style → /api/integrations → /api/entities ×4 → /api/generate`, projectName `MaxCell`) and hashed off disk ([`day-20-report.md`](day-20-report.md) §3). The **Part-2 live boot** (four-part detachable ai-hook + composed FK round-trip) is likewise separate and needs Docker + Postgres.

**Therefore, honestly:** the task says "the 43 + 10 + maximal reproduce byte-identical" via `npm run day20:regress`. That is imprecise — the one command reproduces **43 + 10 (+ all non-hash checks)**; the **maximal digest is a separate reproduction** requiring the HTTP-server chain, and the live boot is a further separate step requiring Docker. Session 2 must NOT paper over this by claiming one command covers all three. See §4 for how Session 2 handles the maximal digest and the boot.

### 1.4 Environment probed read-only this session (Session 2 records the authoritative inventory)
| Tool | Present? | Version seen | Note vs. blueprint pins (Month-1 Day 11 target) |
|---|---|---|---|
| Node | ✅ | v22.21.0 | matches `node:22` pin |
| npm | ✅ | 10.9.4 | — |
| TypeScript (local) | ✅ | 5.9.3 | build toolchain present |
| Docker | ✅ | 29.6.1 | needed only for live boot (out of Day-0 mandatory scope) |
| Podman | ❌ | — | alternative container runtime absent |
| Java (JDK) | ✅ | 20.0.1 | blueprint pins **java:21** — mismatch (a Day-18 *detect-and-guide* concern, NOT Day 0's problem; recorded, not acted on) |
| Maven (`mvn`) | ❌ | not found | Spring build/boot toolchain absent |
| Python | ✅ | 3.14.0 | blueprint pins **3.13** — newer than pin |
| Go | ❌ | not found | Go build/boot toolchain absent |
| git | ✅ | 2.50.0 | present, but repo is not initialized (§1.1) |
| **OS** | — | **Windows 11 (Windows_NT 10.0.26200), Git Bash / MINGW64** | **This records "which single OS" the 21 days + Day 0 ran on: Windows.** Cross-OS (macOS/Linux) is unproven — the biggest inherited risk, per GUARDRAILS §2. Day 0 only records the current OS; the cross-OS proof is Day 2, not now. |

None of the missing toolchains (mvn, go, podman) block the Day-0 mandatory check: `day20:regress` is pure generation and needs only Node. They matter only for *live boots* (out of Day-0 mandatory scope) and for later Phase-1 Day-18 detect-and-guide.

### 1.5 CLAUDE.md / determinism-CI scaffolding status (map only, do not build)
- No root [`CLAUDE.md`](../../) and no `generator/CLAUDE.md` exist. Per Month-1 Day 9 this is expected — the lean hierarchical CLAUDE.md is a Day-9 deliverable. Session 2 confirms this and records "**needed Day 9**" (does NOT create it — that would be out-of-scope building).
- No `.gitattributes`, `.editorconfig`, `.prettierrc*` anywhere. Line-ending normalization + formatter pinning (killers #2 and the Prettier pin) are **not yet in place** — that is a Day-1 (audit) / Day-9 (CI) concern. Day 0 **maps this as "absent", draws NO conclusion** about whether output is already LF-clean (that's Day 1's audit).

---

## 2. SESSION 2 (EXECUTE) — done-conditions

Session 2 produces a written codebase map + a build-and-run confirmation + an environment inventory, changing **no** source/generated/frozen files. The only file Session 2 creates is the map/notes scaffolding it will carry into the Session-3 report (a working scratch is fine under the scratchpad; the durable artifact is the Session-3 report). **No report file yet.**

Put this at the top of the Session-2 prompt, verbatim (GUARDRAILS §3): **"STOP and report rather than write a clean-looking close if a proof fails."**

### DC-1 — The codebase map is WRITTEN (the navigation reference for the whole phase)
A written map (in Session-2 scratch, folded into the Session-3 report) covering, with real paths:

- **Generator core (technology-neutral kernel)** — [`generator/src/core/`](../../generator/src/core/):
  - [`project-model.ts`](../../generator/src/core/project-model.ts) — the Project Model / blueprint (single source of truth; `PhaseASettings`, entities/fields, `createProjectModel`/`restoreProjectModel`, `getState`; ADR-004 defaults-shown, ADR-005 multi-user up-front).
  - [`plugin.ts`](../../generator/src/core/plugin.ts) — the kernel↔plugin seam (`BackendPlugin`, `GeneratedFile{relPath,content,ownership}`, `EntityGenerationContext`; Laws 25–28).
  - [`regen.ts`](../../generator/src/core/regen.ts) — the file-separation / build-file-set / preview / update engine (`buildFileSet`).
  - [`database.ts`](../../generator/src/core/database.ts) — the DB-provider seam (note the load-bearing `TIMESTAMPTZ` JSDoc — a determinism anchor, do not touch).
  - [`style.ts`](../../generator/src/core/style.ts) — the 3-axis coding-style engine (formatting / naming / architecture depth; `defaultCodingStyle`, `applyNaming`, `toSnakeCase`/`toCamelCase`).
  - [`integrations.ts`](../../generator/src/core/integrations.ts) — email + AI-hook option model (`defaultIntegrations`).
  - [`versioning.ts`](../../generator/src/core/versioning.ts) — blueprint version history.
- **The 5 backend plugins** — [`generator/src/plugins/`](../../generator/src/plugins/): `spring/`, `express/`, `python/` (FastAPI), `django/`, `go/`, each with `<name>-plugin.ts` + `entity-codegen.ts`; selected via [`registry.ts`](../../generator/src/plugins/registry.ts) (`selectBackendPlugin`).
- **The DB provider seam** — [`generator/src/plugins/database/`](../../generator/src/plugins/database/) (`postgres.ts`, `mysql.ts`) + [`database-registry.ts`](../../generator/src/plugins/database-registry.ts).
- **Model/blueprint demo definitions** — [`demoapp-model.ts`](../../generator/src/demoapp-model.ts), [`teamtracker-model.ts`](../../generator/src/teamtracker-model.ts) (note the stale-comment fix landed Day 21 — verify the comment now reads correctly), [`task-model.ts`](../../generator/src/task-model.ts).
- **Gates / harness** — [`day12-gate.ts`](../../generator/src/day12-gate.ts) … [`day19-gate.ts`](../../generator/src/day19-gate.ts) (the individual cross-check gates) + [`day20-regression.ts`](../../generator/src/day20-regression.ts) (the canonical consolidated harness, `npm run day20:regress`). Demos: `two-stacks`, `python:demo`, `ui:demo`.
- **The output/digest convention** — the `/${relPath}\n` + UTF-8 content, files sorted by `relPath`, sha256 (§1.3). Map where generated output is written on disk ([`output/`](../../output/) at repo root; note the stray [`generator/Express/DemoApp`](../../generator/Express/) tree and `generator/plugins/` — identify whether these are scratch/generated artifacts, do not delete).
- **The wizard UI** — [`generator/src/server.ts`](../../generator/src/server.ts) (the HTTP routes: `/api/settings`, `/api/style`, `/api/integrations`, `/api/entities`, `/api/generate`, `/api/versions/*`, `/api/files`, …) + [`generator/ui/index.html`](../../generator/ui/index.html); run script `npm run ui`.
- **Local version store** — [`.thraksha/versions/`](../../.thraksha/) at repo root.

**DC-1 done when:** a fresh session could navigate the repo from the map alone, without re-discovering any of the above.

### DC-2 — Clean build succeeds; `npm run day20:regress` RUN and PASSING (THE load-bearing check)
Procedure Session 2 runs (from [`generator/`](../../generator/)):
1. **Clean:** `rm -rf dist` (operational "clean" per §1.1 — no git-clean available; state this in evidence).
2. **Install:** `npm ci` if `package-lock.json` supports it, else `npm install` (record which; note deps are only `typescript` + `@types/node`).
3. **Build:** `npm run build` (tsc) — must exit 0 with no type errors.
4. **Run the backstop:** `npm run day20:regress` — capture the **full stdout** (it prints per-check `OK/FAIL`, the digest-manifest count, and the final `Day-20 regression: PASS/FAIL` line). Optionally `-- --emit-digests` to dump the asserted digests for the record.

**DC-2 PASSES only when:** `day20:regress` exits 0 with **zero FAIL**, the **43 digests + 10 relationship hashes** reproduce byte-identical, and the digest-manifest count printed matches the certified count. Paste the real output into the Session-3 report — do not summarize it away.

**If it does NOT reproduce:** STOP. This is the critical finding. Session 2 diagnoses *why* (GUARDRAILS §3 corollary — diagnose before concluding; most 21-day "failures" were fixture bugs, but you only know by diagnosing) and records the exact failing check + diff. **Day 1 is blocked until the baseline reproduces.** Do not smooth it, do not re-baseline, do not touch any frozen hash.

### DC-3 — The maximal digest + live boot, handled HONESTLY (not conflated with DC-2)
Because `33f3ec4b…` is not in the one-command harness (§1.3), Session 2:
- **(a) Reproduce the maximal digest via the HTTP chain (attempt; report the result either way).** Start the wizard server (`npm run ui` → `node dist/server.js`), drive the exact Day-20 §3 chain with projectName `MaxCell` (settings=Express/API-only/PostgreSQL/multiUser → style snake+four+simple → integrations {email:smtp, ai:hook} → 4 TeamTracker entities incl. the multi-edge Ticket → generate), hash the generated tree with the §1.3 convention, and confirm it equals `33f3ec4b0ae9bb7c76e39a68f36ff395f4a4c5d35115c149824b482dd8087e22`. Tear the server down; leave no scratch. If a scripted driver is needed, keep it in the scratchpad — do NOT add it to `src`.
- **(b) The live-boot coherence (Docker + Postgres, Day-20 Part 2) is OUT of Day 0's mandatory scope.** Day 0 confirms *generation reproduces*, not runtime coherence (already certified Day 20). Docker is present but re-booting is heavy and not required to confirm "the ground exists." Session 2 records this as an explicit **deferral with reason**, not a silent omission.
- If (a) cannot be completed cleanly in Session 2, that is **not** a DC-2 failure (DC-2 = the 43+10 harness) — record it honestly as "maximal digest reproduction: [done / deferred, reason]". The load-bearing gate remains DC-2.

### DC-4 — Environment inventory recorded
Session 2 re-runs the §1.4 probes and records the authoritative table: Node/npm/tsc, Docker/Podman, Java/Maven/Python/Go, git, and **the current OS (Windows 11 / MINGW64)** — with the explicit note that the 21 days + Day 0 are **single-OS (Windows)**; macOS/Linux are unproven (Day 2's job, not Day 0's). Flag the blueprint-pin mismatches (java 20 vs pin 21; python 3.14 vs pin 3.13) as *recorded observations for later days*, not Day-0 actions. This is an inventory, NOT the Day-18 detect-and-guide feature.

### DC-5 — Folder + naming convention + CLAUDE.md status confirmed
- Confirm [`docs/daily/`](.) exists and the `eco-day-NN-plan.md` / `eco-day-NN-report.md` convention is in use (this plan is the first `eco-` file; the v0.1 `day-NN-*` files coexist as history).
- Confirm **no root `CLAUDE.md` exists** and record "**needed Day 9**" (per Month-1 Day 9). **Do not create it** — that is Day-9 building, out of scope.

**Session 2 scope guard:** no report file; no source/generated/frozen changes; no new features; do not move or touch any frozen hash; do not create CLAUDE.md or `.gitattributes`/formatter config; do not delete the stray output artifacts (identify only).

---

## 3. SESSION 3 (REPORT) — done-conditions

Session 3 writes [`docs/daily/eco-day-00-report.md`](eco-day-00-report.md) — the orientation record, self-contained, the foundation every later ecosystem day builds on. Verify + document only; no new features.

The report MUST contain:
1. **The codebase map** (DC-1) — the durable navigation reference, with real paths.
2. **The build-and-run confirmation** (DC-2) — the operational "clean" definition (§1.1), the actual pasted `day20:regress` output, and the explicit statement that the **43 + 10 reproduce byte-identical** (or, if not, the finding).
3. **The maximal-digest + boot honesty note** (DC-3) — whether `33f3ec4b…` was reproduced via the HTTP chain, and that the live boot was deferred (with reason). No conflation of the three into "one command did it all".
4. **The environment inventory** (DC-4) — including which single OS, and the unproven-cross-OS caveat.
5. **Folder/naming + CLAUDE.md status** (DC-5).
6. **The verdict line** — one of:
   - ✅ **"The ground is confirmed; Day 1 may audit."** — iff DC-2 passed (43+10 byte-identical from clean).
   - 🛑 **"The ground is NOT confirmed; here is the finding; Day 1 is blocked until resolved."** — iff DC-2 failed, with the diagnosed cause.

**Session 3 also re-confirms from clean** (guard-the-guard): a fresh session reading only this report should understand the codebase and know the backstop reproduces. Re-confirm at least DC-2 once more from a clean rebuild before writing the verdict.

**Session 3 scope guard:** verify + document + honest caveats only; no features; no hash moves; carry every limitation forward (the maximal-not-in-harness nuance, the cross-OS gap, the toolchain/pin mismatches).

---

## 4. Scope guard — OUT for Day 0 (restated)

- **NO audit conclusions** — Day 1 does the determinism audit (the three killers). Day 0 only CONFIRMS the baseline reproduces and MAPS the code. Do not conclude anything about timestamps/CRLF/key-order from the absence of `.gitattributes`.
- **NO Tauri / desktop / sidecar / shell work** (Day 4+).
- **NO changes to any file** except this plan (Session 1) and the report (Session 3). Session 2 changes nothing durable in `src`/output/frozen.
- **NO features, stacks, project types, integrations, CLAUDE.md, formatter config.**
- **Do NOT move or touch any frozen hash** — the 43 + 10 + maximal are the ground; Day 0 confirms them, it does not adjust them.
- **The live boot / cross-OS proof are later days** (Day 2 cross-OS; runtime coherence already certified Day 20).

---

## 5. Pre-flight checklist status (GUARDRAILS §6, for Session 2)

1. Read guardrails + ecosystem plan + Month-1? — ✅ (this session).
2. Which session — and only its job? — Session 2 = EXECUTE (build/run/map/inventory), no report, no features.
3. Which frozen baselines must NOT move? — the **43 digests + 10 relationship hashes + the maximal `33f3ec4b…`**. Day 0 confirms, never moves.
4. Every new AI touchpoint default-off/detachable/keyed? — N/A (no new capability Day 0).
5. Default/empty path a literal bypass? — N/A (nothing built); the *check* is that the existing default paths reproduce (DC-2).
6. Three killers checked for output touched? — N/A (Day 0 touches no output; the audit is Day 1).
7. A gate that can actually FAIL, reported honestly? — **YES: `day20:regress` (DC-2) is the gate; a non-reproducing backstop is the reportable finding.**
8. About to overclaim / drift out of scope? — the one live risk is claiming "one command reproduced 43+10+maximal"; §1.3/DC-3 prevent it.

---

*Day 0 confirms the ground exists and is reachable, and maps it — so Day 1 can audit determinism on ground that is known to hold. Read, build, run, document. No audit, no build-features, no assumptions. The thesis governs; the backstop is the ground.*
