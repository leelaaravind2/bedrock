# Eco-Day 53 — REPORT: the Fable-5 hardening pass — concern #1: the `run_sidecar` result contract

**Phase 4, Day 53 — the release stretch.** The first concern of the Fable-5 hardening pass, run exactly
under the [Day-53 plan](eco-day-53-plan.md)'s protocol: **the deterministic gate green FIRST, Fable 5
ADVISORY (never the gate), hand-reviewed + hand-applied one change at a time, ONE concern, no silent hash
move.** The concern (Day-52 gap #6): `run_sidecar` returned `Result<String, String>`, **conflating a real
spawn/environment failure with an expected deterministic gate signal** — `scan.js` exits 1 when the
CERTAIN scan finds an issue ([scan.ts:69](../../generator/src/scan.ts)), so scan-with-findings surfaced
as an `Err` string with the findings buried inside it. **RESOLVED**: a structured
`SidecarResult { stdout, stderr, exit_code }` where **`Err` = real spawn/environment failures ONLY** and
**any completed run — whatever its exit code — returns as DATA.** **SHELL-ONLY: no generator source
changed.**

**Backstop re-confirmed from clean:** `rm -rf dist && npm run build && npm run day20:regress` → **PASS,
194 OK / 0 FAIL, 103 baked digests asserted, MAXIMAL `366e19d9…` unchanged — no frozen hash moved.**
`cargo check` → **Finished, 0 warnings.** `sync-gen:check` → **OK, stamp `c43773ae…` UNCHANGED** (the
sidecar == the certified generator; no sync needed — the generator didn't change).

---

## 1. The deterministic-gate-first baseline (DC-0) — GREEN before anything was applied

| Gate | Result |
|---|---|
| `npm run build && npm run day20:regress` | PASS — 194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9deda1caf` |
| `cargo check` (desktop/src-tauri) | Finished clean, 0 warnings |
| **Semgrep — HONESTY (§4)** | **Not runnable here, stated plainly:** the pinned `thraksha-*` rules target the *generated project* stacks and Semgrep's native core doesn't run on this Windows shell (Day 43). For this **shell-only Rust** change the CERTAIN gate = `cargo check` + `day20:regress` + the sidecar spawn-target digest proof. **No Semgrep run is claimed.** |

Fable 5 was **not** consulted before this baseline was green (the plan's order held).

## 2. The Fable-5 advisory input (honest-manual)

**Leela ran Fable 5 with her own access** (no AI key in this shell) and pasted the review verbatim — an
ADVISORY input, per the Day-45 discipline applied to Thraksha's own code. Fable 5 confirmed the defect
(three outcomes collapsed into two variants: env-failure / exit-0 / exit-≠0, with (b)-vs-(c) semantics
pushed into the error channel) and made 5 suggestions + an explicit null result for the rest of the file.
**Nothing was auto-applied; every suggestion was triaged below.**

## 3. The triage (DC-1) — ACCEPT / REJECT / DEFER, every suggestion accounted for

| # | Suggestion | Verdict | Why |
|---|---|---|---|
| S1 | `SidecarResult {stdout, stderr, exit_code: Option<i32>}`, `Err` = spawn/env failure only | **ACCEPT** | The core fix; std-only + `serde::Serialize` derive. **Verified against the real Cargo.toml (not assumed): serde 1 + `derive` is ALREADY an explicit dependency** ([Cargo.toml:24](../../desktop/src-tauri/Cargo.toml)) — **zero new crates**. Thin invoker preserved (it reports faithfully; it doesn't editorialize a gate signal into an error). |
| S1-alt | Hand-rolled JSON-string fallback | **REJECT** | Moot — S1's no-new-dep condition holds; hand-rolled JSON escaping is a bug farm (Fable 5's own rationale). |
| S2 | Propagate `Result<SidecarResult, String>` through the 5 commands | **ACCEPT** | Pure pass-throughs; the contract lives in ONE place (`run_sidecar`). "Completed = data" covers every surface uniformly (scan exit 1 = findings; exit 2 = usage; no special-casing). |
| S3 | `lib.rs` self-test lockstep: header from the REAL exit code | **ACCEPT** | The flagged blast radius. `{:?}` on `Some(0)` prints exactly `Some(0)` → the passing header is **byte-identical** to the old hardcoded one, AND the header is now **truthful** (a non-zero emitter exit can no longer masquerade as `Some(0)` success). |
| S4 | Both streams carried separately (findings-visibility not regressed) | **ACCEPT** (a DC-3 assertion, no separate code) | The old `Err` concat's one virtue survives, improved: stdout + stderr are **separate fields** (§4 proof below). |
| S5 | Null result on the rest of commands.rs (path hygiene / `push_opt` / lossy-UTF8 sound) | **ACCEPT-as-noted** (no change) | An honest null result — recorded, nothing applied. |
| — | `--json` generator output / retry-timeout / front-end wiring / touching scan.ts | **DEFER** (documented, not applied) | Generator change / new behavior / other days — outside the ONE concern per the plan's scope guard. scan.ts's exit contract is correct; the shell adapts to it. |

## 4. The hand-applied change (DC-2) — one atomic step, gated

**S1+S2+S3 are ONE atomic compile unit** — a return-type change and its call sites cannot land separately
without a broken intermediate state; the plan flagged exactly this (`lib.rs` "in lockstep"). Applied by
hand as one step:

- [`commands.rs`](../../desktop/src-tauri/src/commands.rs) — the `SidecarResult` struct
  (`#[derive(serde::Serialize)]` — crosses the `invoke()` boundary; serde already explicit, no new
  crate); `run_sidecar → Result<SidecarResult, String>`; the `status.success()` branch **deleted** — after
  `.output().await` the return is **unconditionally** `Ok(SidecarResult { stdout, stderr, exit_code })`;
  the 5 commands' signatures propagate the type (bodies unchanged — still thin pass-throughs).
- [`lib.rs`](../../desktop/src-tauri/src/lib.rs) — the self-test match updated in lockstep:
  `Ok(r) => format!("SIDECAR_EXIT {:?}\n{}", r.exit_code, r.stdout)` (the Day-5 `SIDECAR_EXIT` header
  contract preserved byte-for-byte in the passing case, now truthful).

**Gate after the applied step:** `cargo check` → Finished, 0 warnings. `npm run day20:regress` →
**194 OK / 0 FAIL, 103 baked, MAXIMAL unchanged — no hash moved** (structurally guaranteed for a
shell-only change; proven anyway, per the plan).

## 5. The contract proof (DC-3) — honest legs, each labeled

- **(a) Err = REAL FAILURE ONLY — code-path asserted:** grep-proven: exactly **4 `Err` sources**, all
  pre-completion environment failures (`no resource_dir` l.49, `entry not found` l.56, `sidecar resolve`
  l.67, `spawn failed` l.75) and **one unconditional `Ok(SidecarResult{..})`** (l.82) after
  `.output().await` — **a completed run cannot reach `Err`** (there is no `success()` branch to divert it).
- **(b) COMPLETED RUN = DATA + invoker-equivalence — proven LIVE at the spawn target:** the bundled node
  against `resources/gen/dist/flow-map.js` → **exit 0, stdout == the generator CLI byte-identical**
  (`cmp` clean) — nothing regressed.
- **(c) THE NON-ZERO-EXIT LEG — honest split:** Semgrep is absent on this shell, so a **live
  scan-with-findings was NOT run and is NOT claimed.** Instead: **(live, synthetic)** the bundled node
  against `resources/gen/dist/export.js` with no args → a **completed run, exit 2**, usage on stderr,
  empty stdout — a real non-zero completion at the exact spawn target; **(code-path asserted)** the Rust
  mapping is **unconditional** `Ok{exit_code}` (leg (a)), so this run arrives as
  `Ok { exit_code: Some(2), stderr: usage }` — and a scan exit-1 identically as
  `Ok { exit_code: Some(1), stdout: findings }`. **The SIDECAR_EXIT header tripwire proven live** (a
  compiled std-only Rust check, scratchpad, not committed): `format!("SIDECAR_EXIT {:?}", Some(0i32))` ==
  `"SIDECAR_EXIT Some(0)"` **byte-identical to the old passing header**; `Some(1)`/`None` render
  truthfully distinct.
- **(d) THE SELF-TEST PAYLOAD — proven at the spawn target:** the bundled node against
  `resources/gen/dist/day20-regression.js --emit-digests` → **exit 0, exactly 103 `DIGEST` lines,
  byte-identical to the generator CLI's emission** (`cmp` clean). The 5 commands + the self-test compile
  through the new contract (`cargo check` clean). **The in-app packaged launch of the self-test remains
  DEFERRED** (no GUI session here — the same honest deferral as Day 52's click-through).
- **(S4 assertion) findings-visibility:** `SidecarResult` carries **both streams as separate fields** —
  the old contract's stdout+stderr concat survives, improved (the caller renders them distinctly).

## 6. No-silent-hash-move + invariants (DC-4)

- **`git status`: ONLY `desktop/src-tauri/src/commands.rs` + `lib.rs` modified** (+ the Day-53 plan/report
  docs). **The generator is UNTOUCHED** — zero generation-path risk by construction, and proven: 103 baked
  + MAXIMAL byte-identical from clean.
- **The sidecar stamp UNCHANGED:** `sync-gen:check` → OK, `c43773ae…` — the resources still == the
  certified generator; no sync needed.
- **No new crate:** `Cargo.toml` unmodified (serde was already explicit). **Generator `deps` absent
  (≡ `{}`)** — pure-Node core intact.
- **No AI wired into the product (ADR-001):** Fable 5 was a dev-time advisory review; nothing of it ships.
  `commands.rs` is still a **thin invoker** — spawn + shape the result, no logic.

## 7. Forward-flags

- **Concern #1 RESOLVED — Day-52 gap #6 CLOSED.** Scan-with-findings now returns as
  `Ok { exit_code: 1, stdout: findings }` — results-with-exit-code, not a rejected promise with findings
  buried in a debug string. **This unblocks the front-end** (gap #1): rejected promise = environment
  problem; `exit_code 0` = clean; `exit_code 1` on scan = findings to render from stdout.
- **Next:** the release work resumes — **Day 55: MSIX packaging + the front-end UI (consuming the new
  `SidecarResult` contract) + the Bedrock Store identity.** If the hardening pass continues with a next
  concern (error-handling in the generator edges, dead-code), it runs under the same plan protocol —
  one concern, gated.
- **Honesty ledger:** Fable 5 ADVISORY (Leela ran it with her own access, pasted verbatim; an earlier
  execute attempt was **stopped** because the paste placeholder was empty — no suggestions were invented);
  every suggestion triaged (5 accept / 1 reject / the out-of-scope set deferred); hand-applied under the
  gate; the exit-1 leg **synthetic + code-path-asserted, not a live scan** (Semgrep absent — stated, not
  faked); the in-app self-test launch deferred (no GUI session); **the backstop is the truth — 103 baked
  byte-identical, no silent hash move.**

---

*Day 53 ran the first concern of the Fable-5 hardening pass under the plan's full protocol. The
deterministic gate was green FIRST (194 OK / 0 FAIL, 103 baked, MAXIMAL `366e19d9…`; cargo check clean;
Semgrep honestly not runnable for shell Rust — no faked run). Fable 5's advisory review (run by Leela,
honest-manual, pasted verbatim) was triaged suggestion-by-suggestion: S1 (the structured `SidecarResult
{stdout, stderr, exit_code}`, Err = spawn/environment failures only), S2 (propagate through the 5
commands), S3 (the lib.rs self-test lockstep — the SIDECAR_EXIT header now truthful yet byte-identical in
the passing case), and S4 (both streams carried separately) ACCEPTED; S1-alt (hand-rolled JSON) REJECTED
as moot; S5 an honest null result; --json/retry/front-end/scan.ts DEFERRED as out of the one concern.
S1+S2+S3 were hand-applied as one atomic compile unit (a return-type change + its call sites), then gated:
cargo check clean, day20:regress 194 OK / 103 baked byte-identical — no silent hash move (shell-only, so
structurally impossible; proven anyway). The contract was proven honestly: Err-only-on-env-failure
code-path-asserted (4 pre-completion Err sources, one unconditional Ok); completed-run-as-data +
invoker-equivalence live (flow-map sidecar == CLI byte-identical, exit 0); the non-zero leg via a live
synthetic (export.js usage exit 2 at the exact spawn target) + the unconditional-Ok assertion — NOT a
claimed live scan; the header tripwire live (`Some(0)` byte-identical, `Some(1)`/`None` truthful); the
self-test payload live at the spawn target (103 DIGEST lines, sidecar == CLI byte-identical) with the
in-app launch honestly deferred. Invariants: generator untouched (git-proven), sidecar stamp `c43773ae…`
unchanged, deps {} intact, Cargo.toml unmodified (serde was already explicit — no new crate), no AI in
the product (ADR-001), the shell still a thin invoker. Concern #1 resolved; gap #6 closed; the front-end
unblocked. Day 55 resumes the release: MSIX + the front-end UI on the new contract + the Bedrock
identity.*
