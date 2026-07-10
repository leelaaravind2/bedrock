# BEDROCK — MASTER CHANGE PROMPT (template for ANY create/modify work)

> How to use: copy this whole file into a fresh Claude Code session, fill every `{SLOT}`,
> delete nothing else. One load-bearing thing per day. If a task needs two of these, it is
> two days. Written for the two-prompt rhythm: run once as PLAN (Session 1 — no code),
> review, then run as EXECUTE+REPORT (Session 2/3).

**MODE: {PLAN | EXECUTE+REPORT}**

---

## 1. Cold-session context (you have no memory of prior days — this is your full context)

Repo: `E:\Software` (Windows). Product: **Bedrock** (internal name Thraksha) — a
**deterministic, AI-free code generator**. The blueprint is the source of truth; code is a
byte-identical projection. "AI guesses; Bedrock knows."

- `generator/` — pure-Node TypeScript engine, **deps {} — this never changes**, 0 native modules.
- `desktop/` — Tauri v2 shell (Rust) + bundled-node sidecar (`resources/gen`) + SQLite
  blueprint store (`rusqlite`; `store_commands.rs` kept structurally separate from
  `commands.rs`; in-proc DB calls return `Result<T, String>`, never SidecarResult).
- The certified backstop: `npm run day20:regress` from `generator/` →
  **203 OK / 0 FAIL** — 103 baked digests + 10 TeamTracker hashes + non-hash PARTs 1c–1z.
  Crown jewel: **MAXIMAL `366e19d9`**, unmoved since Day 29. The bundled sidecar reproduces
  the 103 frozen digests byte-identical (packaged == certified).
- Git/GitHub is the sole backup. Commit directly to `main`; no branches; a pre-commit hook
  runs `day20:regress` and blocks red commits; **Leela pushes** (this shell has no TTY).

## 2. Immutable invariants (if the task conflicts with these, the task is wrong — STOP)

1. **A moved baked hash is a FINDING → STOP.** Never a silent re-baseline. A deliberate
   re-baseline is allowed ONLY if intentional, documented (old → new + rationale), isolated,
   and recorded in the report.
2. **Shell work is SHELL/UI ONLY** over the certified engine: no generator source changes;
   the 103 + 10 + MAXIMAL stay byte-identical; PARTs 1w/1x/1y/1z unchanged.
3. **The shell is a thin client.** It collects choices and calls certified commands; it renders
   the engine's output. No generation logic in JS or Rust. No JS-computed diffs. No path
   heuristics. The engine computes; JS paints.
4. **Engine extension = NEW FILES ONLY** (the Day-65/66 shape): a new pure module + a new CLI
   driver; no existing generation-path file modified → frozen output byte-identical *by
   construction* — and prove it anyway.
5. **The manifest trap:** any new type/enum touching the model can silently move ALL frozen
   hashes even if no generated code changed. Every new capability's default/empty/off path
   MUST be a **literal bypass** reproducing the frozen hashes exactly.
6. **deps {} stays deps {}** in `generator/`. Any new Rust crate is a deliberate, documented
   `Cargo.toml` addition — never silent.
7. **No AI anywhere in the product** (ADR-001).
8. **Claim only what is proven.** Verify = REPRODUCIBILITY, never correctness. Law 21 = no
   FUNCTIONAL dependency (inert provenance comments remain; never "no trace"). Deferred
   items stay named PENDING until actually run.

## 3. Read first (mandatory, before writing anything)

1. `docs/THRAKSHA-GUARDRAILS.md` — §1.1, §3, §4, §5.
2. The governing arc doc: `{GOVERNING-DOC, e.g. docs/THRAKSHA-MONTH-3 ex.md or the Phase-B doc}`.
3. The previous day's report: `{PATH}`.
4. **The real code** this task touches: `{FILES/DIRS — list them}`. Resolve unknowns
   empirically. Read the code; correct the idealized brief — this has caught real defects
   repeatedly (Tauri's camelCase arg default; has-many must be explicit, never inferred;
   `created_at` in the storage row, never the blueprint JSON; the `.gitignore` root
   whitelist swallowing new root files).

## 4. The task

- **DAY-ID:** `{eco-day-NN}`
- **GOAL (one sentence, one load-bearing thing):** `{...}`
- **WHY (one short paragraph):** `{...}`
- **IN SCOPE:** `{bullets}`
- **OUT OF SCOPE (explicit):** `{bullets — name the tempting adjacent things and forbid them}`
- **DESIGN NOTES / open questions to resolve by reading code first:** `{...}`

## 5. Done-conditions (numbered; each one checkable, none ceremonial)

`{1..N — concrete, provable statements. If a change adds no new engine behavior, do NOT
invent a PART for it. If it adds new engine behavior via new files, name the new non-hash
PART or the new baseline explicitly here.}`

## 6. Proof & gates

- **After every step:** the hash/verification gate. Never batch steps past a gate.
- **End of day, from clean:** `npm run day20:regress` → 203 OK / 0 FAIL (or 203+ if this day
  legitimately ADDS baselines — a new baseline is generated twice-identical and recorded).
- **UI==CLI** wherever the shell collects choices: the wizard path and the programmatic path
  must produce byte-identical blueprints/output against the certified TeamTracker baseline.
- **Sync-gen stamp semantics:** it is a content hash of the sidecar payload; it legitimately
  changes when new dist entries land. That is NOT a generation-hash move. The load-bearing
  claim is always: the bundled node still reproduces the 103 frozen digests.
- New baselines (if any): `{names}` — twice-identical, documented, isolated.

> **STOP and report rather than write a clean-looking close if a proof fails.**
> A gate that can't fail is worthless. A green that hides a red is worse than an honest red.

## 7. Environment constraints (honest-manual, not Bedrock limits — never fake these)

No GUI session here (every live click-through is Leela's, on her machine — mark it PENDING).
Docker daemon down. No Go/Java toolchain. Semgrep's native core doesn't run on Windows.
No dev AI key. No MakeAppx. C: drive is tight — never force a heavy build. Verification
ladder stays honest: Express runtime; FastAPI/Django syntax-level; Go/Spring generation-only.

## 8. Mode rules

**If MODE = PLAN (Session 1):** produce `docs/daily/{DAY-ID}-plan.md` ONLY — explicit
done-conditions, gates, scope guards, the read-first findings, and any correction of this
brief where the code disagrees with it. **No code. No file changes outside the plan doc.**

**If MODE = EXECUTE+REPORT (Sessions 2–3):** build in the smallest steps that each pass a
gate; then re-confirm from clean; then write `docs/daily/{DAY-ID}-report.md` — self-contained
(a fresh session must be able to continue from it alone): what was built, every gate's
result (paste the regress tail), any finding, any deliberate baseline change (old → new +
why), deferred items each marked PENDING, and the exact commit hash. Commit to `main`:
`{DAY-ID}: {one-line summary} (backstop green, {203} OK / 0 FAIL)`. Leela pushes.

## 9. Filled micro-example (delete when using)

> DAY-ID: eco-day-73 · GOAL: regroup the four stack steps into one screen, four fields,
> with UI==CLI re-proven byte-identical vs the certified TeamTracker baseline. · OUT OF
> SCOPE: any change to `buildBlueprintChoices` semantics; any new field; the workspace.
> Done-conditions: (1) one Stack screen renders four fields; (2) serializer output for the
> 4 templates byte-identical to Day-62 baselines; (3) regress 203/0; (4) live click-through
> PENDING (Leela).
