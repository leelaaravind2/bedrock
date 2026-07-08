# Eco-Day 53 — PLAN: the Fable-5 hardening pass — the protocol + the first concern

**Phase 4, Day 53 — the release stretch (Month-3 Day-52 entry, `[3 days]`).** Now the codebase is
**functionally complete** (Day-52 closed the P0 command surface), Fable 5 (an AI) reviews Thraksha's
**OWN code** for cross-file / architectural issues the deterministic scanners can't catch. **This is AI
touching the crown-jewel codebase** — so it obeys the SAME discipline every AI touch in Thraksha has
obeyed: the **Day-45 template applied to Thraksha itself** — deterministic-first, ADVISORY-not-the-gate,
hand-reviewed + hand-applied, ONE concern at a time, no silent hash move.

**This session is PLAN ONLY. No code, no builds, NO Fable-5 run.** The plan **GOVERNS** the pass. Between
this plan and the execute session, **Leela** runs Fable 5 with her **own** AI access (there is no
developer AI key in the shell — honest-manual, exactly as Day-23's live fill and Day-45's live AI scan
were deferred) and pastes the suggestions back. The execute session then reviews + hand-applies the
ACCEPTED ones under the gate.

---

## 0. The discipline this pass inherits (Day-45, applied to Thraksha's own code)

| Rule | Source | How it binds Day 53 |
|---|---|---|
| **Deterministic gate FIRST** | Day-45 §1 | The CERTAIN baseline (Semgrep where it applies + `day20:regress` 103 baked + `cargo check` + the sidecar self-test) is green BEFORE any Fable-5 input is applied. Fable 5 never runs before the gate is green. |
| **Fable 5 is ADVISORY, never the gate** | GR §1.2, Day-45 DC-6 | Fable 5 **SUGGESTS**; the deterministic scanners + the backstop are the CERTAIN gate. A suggestion is a hypothesis to verify, not a verdict. |
| **Hand-reviewed + hand-applied** | Day-52 Month-3 entry ("human-verify every AI finding") | Leela reviews EACH suggestion; the execute session applies ACCEPTED ones BY HAND, deliberately. **NO suggestion lands automatically.** |
| **No silent hash move (load-bearing)** | GR §1.1, §3 | NO applied fix moves a frozen hash silently. A mover is **rejected** OR a **documented deliberate re-baseline** (Day-29-style: surgical, old→new, in the report). Never silent. |
| **One concern at a time** | Day-45 (one tier) + the one-stack-at-a-time gate | Scope the pass to **ONE** concern, proven green before any next concern. |
| **A one-time dev-phase step, NOT a product feature** | GR §1.2, ADR-001 | This hardens Thraksha's code; it ships nothing. Fable 5 is **NOT wired into Thraksha** (that would violate ADR-001). It is a dev-time review — a senior engineer reading the code. |
| **The live call is honest-manual** | GR §4, Day-45 §3 | No AI key in the shell → **Leela** runs Fable 5 and pastes the suggestions. Honest accept-vs-reject; the backstop is the truth. |

---

## 1. THE FIRST CONCERN (scoped to ONE) — the `run_sidecar` result contract (Day-52 gap #6)

**The concern:** the shared spawn/capture primitive
[`run_sidecar`](../../desktop/src-tauri/src/commands.rs) returns `Result<String, String>`, which
**conflates two semantically different outcomes into one `Err` channel**:

1. A **real failure** — `resource_dir()` unresolved, the entry not found, the sidecar failing to spawn
   (lines 30, 38, 49, 57 of `commands.rs`).
2. A **deterministic GATE SIGNAL** — `scan.js` **exits 1 when the CERTAIN (deterministic) scan finds an
   issue** ([`scan.ts:69`](../../generator/src/scan.ts)). This is the EXPECTED, correct behavior of the
   gate — and its **valid findings are on stdout** — yet it currently returns as
   `Err("[sidecar exit Some(1)]\n<stdout><stderr>")` ([`commands.rs:69`](../../desktop/src-tauri/src/commands.rs)).

**Why this is a genuine cross-file / architectural issue (the kind Fable 5 catches, Semgrep can't):**
- The **contract** between the Rust command surface and the (Day-52 gap #1) front-end is wrong: a caller
  cannot tell "the scan found issues" (exit 1, expected, findings in stdout) from "the sidecar crashed"
  (a real error) **without string-parsing an error message**. The scan's whole POINT — its findings — is
  buried inside an error string.
- It is a **semantic mismatch with the generator's own exit-code convention**: `scan.js` (exit 1 =
  CERTAIN finding, the gate) and `export.js` (exit 2 = usage) each carry meaning in the exit code that
  `run_sidecar` **flattens away** into `Err`.
- The Day-52 report **already flagged it** (gap #6, and the inline comment at
  [`commands.rs:66-67`](../../desktop/src-tauri/src/commands.rs): *"A richer `{ stdout, exitCode }`
  result is a later refinement"*). Day 53 is that refinement.

**Why THIS concern first (highest-value, lowest-generation-risk):**
- **Zero generation-path risk.** `commands.rs` + `lib.rs` are the **desktop shell** — Rust, the thin
  invoker. The generator never imports them; they are **not in the generation path at all**. A fix here
  **cannot** move a frozen generation hash (`day20:regress` stays green **by construction** — the
  strongest possible no-silent-hash-move guarantee for a first pass).
- **Closes a real, documented gap** (#6) that **blocks the next real work** — the front-end UI (gap #1)
  needs a result contract it can render findings from without parsing error strings.
- **No dep, no AI, no generation logic** possible — it is a Rust return-type refinement in the shell.
- It is exactly a **cross-file coupling / error-handling-consistency** concern — the survey's highest-value
  candidate, and the Day-52 report's own named next refinement.

**In scope (the ONE concern):**
[`desktop/src-tauri/src/commands.rs`](../../desktop/src-tauri/src/commands.rs) (the `run_sidecar`
primitive + the 5 commands' result types) and its **one internal call site**
[`desktop/src-tauri/src/lib.rs:47-57`](../../desktop/src-tauri/src/lib.rs) (the startup self-test, which
matches `Ok(stdout)/Err(e)` — a return-type change ripples here and MUST be updated in lockstep).

**Explicitly OUT (do not drift):** the generator (any `src/` file — untouched), `blueprint_store.rs`, the
front-end `main.js` (gap #1 is a build task, not this hardening pass), the MSIX/name/packaging gaps
(#2–#5, external), and **any second concern**. If Fable 5 surfaces issues outside `run_sidecar`'s result
contract, they are **logged for a future pass, not applied** this session.

---

## 2. THE FABLE-5 PROMPT (Leela runs this with her own AI access — ADVISORY, scoped, whole-file)

> **Framing note for Leela (do NOT paste this line to Fable 5, it's for you):** Fable 5's output is
> **ADVISORY**. Paste the two whole files below for full context. Ask for **suggestions with rationale,
> NOT a rewrite** — we hand-apply. Save its raw reply verbatim for the execute session to triage.

**Prompt to Fable 5:**

```
You are reviewing a small, security-sensitive part of a Rust (Tauri v2) desktop shell. I want
suggestions with rationale — NOT a rewrite, NOT a patch. I will hand-apply anything I accept, one
change at a time, behind a deterministic test gate.

CONTEXT: This shell is a "thin invoker." Each Tauri command spawns a bundled Node sidecar (a certified
code generator) against a resourced entry script and returns its stdout. There is deliberately NO
generation logic in Rust. Determinism of the generator is sacred and is protected by a separate frozen
test baseline that this Rust code is NOT part of — so your suggestions here cannot and must not change
generator behavior.

THE ONE CONCERN — scope your review to this and ONLY this:
The shared primitive `run_sidecar` returns `Result<String, String>`. This conflates two very different
outcomes into the single `Err` channel:
  (a) a REAL failure — resource dir unresolved, entry not found, spawn failed;
  (b) an EXPECTED gate signal — the `scan.js` sidecar exits 1 when the deterministic security scan finds
      an issue. That is the correct, designed behavior, and its findings are printed to stdout. Today it
      still comes back as an Err string, forcing any caller to parse an error message to recover normal,
      expected findings.

Please review the `run_sidecar` result contract and the five commands + the one self-test call site for:
  1. How to model the result so a caller can distinguish (a) a real failure from (b) a non-zero exit that
     is an expected gate signal carrying valid stdout — ideally a structured result exposing stdout,
     stderr, and the exit code, rather than collapsing everything into Ok(String)/Err(String).
  2. Any place stdout/stderr/exit-code information is silently lost or muddled.
  3. Error-handling consistency across the five commands and the self-test call site (they all funnel
     through run_sidecar — will a contract change ripple cleanly, or are there hidden couplings?).
  4. Any cross-file coupling or footgun a caller (a future front-end calling these via `invoke`) would
     hit when trying to render scan findings vs. surface a real error.

For EACH suggestion give: (1) the specific location, (2) what is wrong and the concrete failure it
causes, (3) the suggested change in words (not a full rewrite), (4) your confidence and any risk. If a
piece of the current design is actually correct as-is, say so — I want a null result to be possible, not
padded findings. Do NOT propose adding dependencies, adding any AI, changing the generator, or changing
what the sidecar scripts do.

FILE 1 — desktop/src-tauri/src/commands.rs:
<PASTE THE WHOLE FILE>

FILE 2 — desktop/src-tauri/src/lib.rs:
<PASTE THE WHOLE FILE>
```

---

## 3. THE GATE PROTOCOL (for the EXECUTE session — the order is load-bearing)

**Step 0 — DETERMINISTIC GATE GREEN FIRST (the CERTAIN baseline, BEFORE applying anything):**
1. `cd generator && npm run build && npm run day20:regress` → **PASS, 103 baked digests, MAXIMAL
   `366e19d9…` unchanged.** (The generator is untouched by this concern, so this proves the starting
   backstop is clean and gives the byte-identical reference.)
2. `cd desktop && export PATH="$HOME/.cargo/bin:$PATH" && cargo check` (in `src-tauri`) → **Finished, 0
   warnings** — the shell compiles clean as the baseline.
3. **Semgrep** over the code where it applies (the pinned Day-43 rules) — the CERTAIN deterministic
   scanner. **HONEST NOTE:** Semgrep's pinned ruleset targets the *generated project* stacks; if it has
   no Rust coverage for `commands.rs`, say so plainly in the report — for a **shell-only** change the
   CERTAIN gate is carried by `cargo check` + `day20:regress` + the **sidecar self-test** (the bundled
   node reproducing the 103 digests through `run_sidecar`). Do not claim a Semgrep pass that didn't cover
   the changed file.

**Fable 5 does not run before Step 0 is green.** (Leela's live run happens between plan and execute; the
execute session receives the pasted suggestions AND confirms Step 0 green before touching code.)

**Step 1..N — hand-apply each ACCEPTED suggestion, ONE at a time, gate after EACH:**
For each accepted suggestion:
1. Apply it **by hand** (edit `commands.rs`; update the `lib.rs:47-57` self-test call site in lockstep —
   a result-type change ripples there).
2. `cargo check` → 0 warnings (the shell still compiles).
3. `npm run day20:regress` (generator) → **103 baked byte-identical** — proves the shell change did not
   somehow perturb the generator baseline (it can't, by construction; we prove it anyway).
4. **The sidecar self-test** — the load-bearing shell proof: the bundled node against
   `resources/gen/dist/day20-regression.js --emit-digests` (through the refactored `run_sidecar`) still
   **reproduces the 103 DIGEST lines** (this is exactly what `lib.rs`'s `setup()` exercises — confirm the
   result-contract change did NOT break the digest capture path).
5. **No silent hash move check:** the 103 baked digests + MAXIMAL are byte-identical to Step 0. If ANY
   moved → **STOP and report it as a finding** (GR §3). A shell-only change moving a generation hash
   would mean latent nondeterminism was masked — a real finding, never a silent re-baseline.

**Rejected suggestions:** log each with the reason (why it fails an ACCEPT criterion) — do not apply.

**Any hash-mover:** **reject** the fix, OR (only if the change is intentional, surgical, isolated, and
worth it) document it as a **deliberate re-baseline** (Day-29 style: old→new + rationale in the report).
For a shell-only concern this should be **impossible** — a mover here is a red flag, expect zero.

---

## 4. ACCEPT vs REJECT (a fix is ACCEPTED only if ALL hold)

**ACCEPT** iff:
- ✅ It **improves the code** — the result contract genuinely distinguishes a real failure from an
  expected gate-signal exit, and/or preserves stdout/stderr/exit-code the caller needs.
- ✅ It **moves no frozen hash silently** — `day20:regress` 103 baked byte-identical after the fix (a
  shell-only fix should move nothing).
- ✅ It **adds no dependency** — no new crate that pulls weight beyond what's already vendored; **no AI,
  no network, no clock/RNG**; and (generator invariant, untouched here) `deps {}` unchanged.
- ✅ It **adds no generation logic** and **wires no AI into the product** (ADR-001) — the shell stays a
  thin invoker; the fix is purely the Rust result contract + its call sites.
- ✅ It **compiles clean** (`cargo check`, 0 warnings) and the **sidecar self-test still reproduces the
  103 digests**.

**REJECT** if ANY of:
- ❌ It moves a frozen hash (and isn't a documented deliberate re-baseline).
- ❌ It adds a dependency / AI / network / generation logic.
- ❌ It puts generation logic in Rust or makes the shell more than a thin invoker.
- ❌ It's a stylistic wash, a false positive, or padding with no concrete failure behind it (Fable 5 is
  ADVISORY — high false-positive rates are expected; a suggestion with no real failure is a reject).
- ❌ It drifts outside the ONE concern (`run_sidecar`'s result contract + its call sites).

---

## 5. HOW THE PASS STAYS HONEST (§4)

- **Fable 5 is ADVISORY; Leela decides; the backstop is the truth.** The deterministic gate (Step 0)
  is the CERTAIN baseline; Fable 5's suggestions are hypotheses verified against it.
- **The live call is honest-manual.** Leela runs Fable 5 with her own access and pastes the raw reply;
  the execute session hand-applies only accepted ones. The report states plainly: Fable 5 ran (Leela),
  suggestions pasted, what was ACCEPTED vs REJECTED + **why** for each.
- **No claimed proof that didn't run.** If Semgrep doesn't cover Rust, say so; the CERTAIN gate for a
  shell-only change is `cargo check` + `day20:regress` + the sidecar self-test. A green that would hide a
  red is worse than an honest red (GR §3).
- **Advisory ≠ certain, proven ≠ generation-proven** carried into the report (GR §4): the result-contract
  improvement is proven at the shell (compiles + self-test reproduces the 103 digests); a full
  JS→`invoke()`→GUI render of the new contract remains **honest-manual/deferred** (no GUI session in the
  shell — same deferral as Day-52's click-through). Do not claim a GUI round-trip that didn't run.

---

## 6. EXECUTE done-conditions (the NEXT session, after Leela runs Fable 5)

1. **Deterministic gate GREEN FIRST** — `day20:regress` 103 baked + `cargo check` 0 warnings + Semgrep
   (where it applies, honestly noted) — the CERTAIN baseline before applying anything.
2. **Each ACCEPTED Fable-5 suggestion (for the ONE concern) hand-applied**, with `cargo check` + the
   sidecar self-test (103 digests reproduced) + `day20:regress` (103 baked byte-identical) **GREEN after
   each**; **rejected suggestions documented (why)**; any hash-mover **rejected OR documented as a
   deliberate re-baseline** (§1.1, never silent — expected: zero movers).
3. **The concern resolved** — `run_sidecar` (and the 5 commands + the `lib.rs` self-test call site) now
   expose a result contract that distinguishes a real failure from an expected gate-signal exit and
   preserves stdout/stderr/exit-code; the backstop **byte-identical**; `deps {}` unchanged; **no AI wired
   into the product** (ADR-001); **no generation logic changed** (guaranteed — shell only).
4. **Honest** — Fable 5 advisory (Leela ran it, pasted suggestions); the execute session hand-applied the
   accepted ones under the gate; what was accepted vs rejected + why; what stayed deferred (the GUI render
   of the new contract).

## 7. REPORT done-conditions

`eco-day-53-report.md` records: the concern; the deterministic-gate-first baseline; the Fable-5
suggestions (advisory, pasted verbatim); ACCEPTED vs REJECTED + why for each; each accepted fix +
`day20:regress`/self-test green after; the no-silent-hash-move proof (backstop byte-identical, or a
documented deliberate re-baseline); invariants (`deps {}`, no AI in the product, generation untouched,
shell stays a thin invoker). **Forward-flags:** the concern resolved; the next step — either the **next
concern** (if the pass continues: e.g. error-handling in the generator edges, or dead-code) OR the **next
release step** (Days 55+: MSIX packaging + the front-end UI consuming the new result contract + the
Bedrock identity); Fable 5 advisory / hand-applied / honest.

---

## 8. SCOPE GUARD — OUT (do not drift)

- **NOT** wiring Fable 5 into the product (ADR-001 — no AI in Thraksha; this is a DEV-TIME review only).
- **NOT** auto-applying suggestions (hand-reviewed + hand-applied ONLY).
- **NOT** more than ONE concern this pass (the `run_sidecar` result contract + its call sites); other
  Fable-5 findings are logged for a future pass, not applied.
- **NO** silent hash move — a mover is rejected OR a documented deliberate re-baseline (§1.1), never
  silent.
- **NO** dep / AI / network / generation-logic added by a fix; the shell stays a thin invoker.
- The deterministic gate is the CERTAIN truth; Fable 5 is ADVISORY. The live Fable-5 call is Leela's
  (honest-manual).
- **NOT** touching the generator, `blueprint_store.rs`, the front-end `main.js`, or the MSIX/name/packaging
  gaps.

---

## 9. PRE-FLIGHT (GR §6) — resolved for this plan

1. Read guardrails + Month-3 + Day-52 report + Day-45 report + surveyed the real code (commands.rs,
   lib.rs, the generator edges) — **yes**.
2. Session = **PLAN** — this file only, no code, no build, no Fable-5 run — **yes**.
3. Frozen baselines NOT to move: the 103 baked + MAXIMAL `366e19d9…` — the concern is **shell-only**, so
   these move by nothing; proven anyway after each fix — **understood**.
4. AI touchpoint default-off/detachable/developer-keyed: Fable 5 is **NOT wired in** — it's a dev-time
   review; the honest-manual live call is Leela's own key/bill — **yes**.
5. The default/empty path a literal bypass: N/A structurally — a shell result-type refinement adds no new
   path to the generator; the generator's frozen bypass is untouched — **noted**.
6. The three determinism killers checked for output-touching change: **none** — the concern touches no
   output (Rust shell only) — **confirmed**.
7. A gate that can FAIL + reported honestly: `day20:regress` + `cargo check` + the sidecar self-test; a
   moved hash = STOP-and-report — **yes**.
8. Overclaim / out-of-scope watch: no GUI round-trip claimed (deferred); ONE concern only — **guarded**.

---

*Day 53 plan: the Fable-5 hardening pass, governed by the Day-45 discipline applied to Thraksha's OWN
code. The ONE first concern is the `run_sidecar` result contract (Day-52 gap #6) — a shell-only,
zero-generation-risk, documented gap that conflates a real failure with an expected deterministic
gate-signal exit (`scan.js` exit 1) and buries scan findings in an error string. The Fable-5 prompt
(Leela runs it, ADVISORY, whole-file, suggestions-with-rationale-not-a-rewrite) and the gate protocol
(deterministic gate green FIRST → review each pasted suggestion → hand-apply ACCEPTED ones → cargo check
+ sidecar self-test + day20:regress after EACH → no silent hash move, a mover rejected or documented)
are set. ACCEPT = improves the code AND moves no frozen hash silently AND adds no dep/AI/generation-logic
AND keeps the shell a thin invoker; REJECT otherwise. Honest: Fable 5 advisory, Leela decides, the
backstop is the truth, no claimed proof that didn't run. No code, no Fable-5 run this session — the plan
GOVERNS the pass.*
