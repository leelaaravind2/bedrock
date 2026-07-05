# Eco-Day 01 — REPORT (Session 3 of 3): Determinism ground-truth audit + harness discipline

**Phase 0, Day 1. Verify + document only — no code changes, no features, no frozen hash touched.** This is the closing record for Day 1: the determinism audit result, the hash-neutral lock-downs that landed, the maximal-baseline retirement + replacement, and the go-forward discipline. Session 2 (Execute) ran and was verified; this report is the delayed Session 3 that formally closes the day.

Plan: [`eco-day-01-plan.md`](eco-day-01-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (esp. §2 the three killers, §4 honesty). Predecessor: [`eco-day-00-report.md`](eco-day-00-report.md). Execute-notes source: `scratchpad/day00/eco-day-01-EXECUTE-NOTES.md`.

---

## THE VERDICT

> ✅ **DAY 1 CLOSED — the three determinism killers are audited and locked; the certified backstop reproduces byte-identical from a clean build; the ground is ready for Day 2 (cross-OS).**

The three killers each resolved as **CONFIRMED-CLEAN** (killers #1, #3) or **CLEAN-AND-NOW-LOCKED** (killer #2 — LF emission was correct but unenforced; it is now guaranteed at the generator and guarded). Every lock-down was proven hash-neutral: the **43 frozen digests + 10 TeamTracker relationship hashes reproduce byte-identical from clean**, exit 0. The maximal composition cell is reproducible again (as a new, honestly-labelled Day-1 baseline). No frozen hash moved.

---

## 1. From-clean re-confirmation (the formal Session-3 gate)

`cd generator && rm -rf dist && npm run build` → exit 0. `npm run day20:regress` → **exit 0, PASS**:

```
=== PART 1f: LF-emission guard + MAXIMAL composition baseline (Eco-Day 1) ===
  OK   LD-2: no emitted file contains a CR byte (LF emission guaranteed)
  OK   MAXIMAL composition cell twice-identical == recorded baseline  929c379f9e98ec34

[digest-manifest] 44 digests asserted (43 frozen + 1 MAXIMAL)
Day-20 regression: PASS (43 frozen + 1 MAXIMAL baselines + non-hash checks + property re-derivations)
```

- **43 frozen digests** — byte-identical (`--emit-digests` → 43 non-MAXIMAL, values unchanged: e.g. `Spring Boot|PostgreSQL|DemoApp 010098cd…`, `Express|PostgreSQL|TeamTracker dca2b4a7…`, `Go|MySQL|TeamTracker 7408a3e2…`).
- **10 TeamTracker relationship hashes** — reproduced via the UI `addEntity` path, byte-for-byte (PART 1d OK).
- **MAXIMAL cell** — `929c379f9e98ec34c3a42bafe814ebb65fffde0820d754176a7c7ab95c825e20`, twice-identical (both in `day20:regress` and the retained `npm run maxcell` driver).

**No hash moved. The backstop holds from clean.**

---

## 2. The three-killer determinism audit — results

The audit inspected the real emission paths (all 5 plugins, the DB providers, `regen.ts`, `style.ts`, the on-disk templates) and a full generated project's bytes — not just the source.

### (a) Killer #1 — Embedded timestamps / dates / UUIDs / randomness → **CONFIRMED-CLEAN**
- **Method:** grep `generator/src` (and `dist`) for value-producing calls executed *in the generation path*: `new Date`, `Date.now`, `.now()` as a JS call, `Math.random`, `crypto.randomUUID`/`randomBytes`, `performance.now`, `process.hrtime`, `uuid`. Plus the twice-run byte-identity the harness already proves.
- **Result:** **zero** such calls in the generation path. The grep hits for `now()` / `func.now()` / `CURRENT_TIMESTAMP` (in `plugins/database/postgres.ts`, `plugins/python/entity-codegen.ts`, `plugins/go/entity-codegen.ts`, `plugins/express/entity-codegen.ts`) are **literal text inside emitted SQL/ORM strings** — the *generated app's* runtime DB defaults, byte-identical every run — **not** timestamps read during generation. No clock, no RNG, no UUID in the generation path.
- **Clean =** no nondeterministic value is read during generation; every timestamp-shaped token in output is a fixed runtime-default string. Confirmed.

### (b) Killer #2 — Line endings (CRLF vs LF) → **CLEAN, and now LOCKED (LD-1 + LD-2)**
- **The finding:** all 5 plugins build the project *shell* by reading on-disk template files from `generator/plugins/<stack>/templates/` via `fs.readFile(tf,'utf8')` + `applyTokens`, with **no CRLF→LF normalization**. Entity CRUD is emitted via `.join('\n')` (explicit LF). So **output line-endings = the on-disk template files' line-endings.** All 83 template files are currently **LF** → output is LF today — but only *because the files happen to be LF*, with **no generator-level enforcement**. That is the latent risk: a template re-saved CRLF by a Windows editor, or a future `git` checkout with `autocrlf`, would silently flip output to CRLF and break every hash cross-OS.
- **LD-1 — the load-bearing lock (hash-neutral):** each of the 5 plugins now normalizes at read — `(await fs.readFile(tf,'utf8')).replace(/\r\n?/g,'\n')` — **exactly one line per plugin** (`express-plugin.ts:383`, `python-plugin.ts:339`, `spring-plugin.ts:183`, `django-plugin.ts:95`, `go-plugin.ts:98`). Because the templates are already LF, this is a **literal no-op today → moves no hash** (proven: LD-1 applied in isolation, rebuilt, `day20:regress` PASS, 43+10 byte-identical). It converts "output is LF by accident" into "the generator *guarantees* LF regardless of template state."
- **LD-2 — the guard (a gate that can fail):** `day20:regress` PART 1f now asserts **no emitted file contains a CR byte** across the 20-cell matrix + the maximal cell. Proven **non-vacuous**: an injected CR into emitted content is detected (flagged `.env.example`); clean runs show none. *(Note: a CR injected into a template does not trip LD-2 — LD-1 strips it first; LD-2 is the backstop for a CR reaching output via a path that bypasses template-read, e.g. a future entity-codegen literal or a new plugin without LD-1.)*
- **Clean/Locked =** LF emission is guaranteed at the generator (LD-1), not inherited from LF templates, and verified every run (LD-2).

### (c) Killer #3 — Key ordering / canonical JSON / unstable iteration → **CONFIRMED-CLEAN**
- **Method:** grep the generation path for `JSON.stringify` over model-derived objects/maps, and for `Object.keys`/`entries`/`for…in`/`Map`/`Set`/`readdir` iteration flowing into emitted content.
- **Result:** the only `JSON.stringify` over objects is version-store **metadata** (`versioning.ts:82,91`) and HTTP responses (`server.ts`) — **not** emitted project files. Emitted `package.json`/config are **static template files**. The manifest is composed from **ordered arrays**. `applyTokens` iterates a fixed object-literal token map (JS preserves string-key insertion order → deterministic). `walk()` **explicitly sorts** readdir entries; `hashFiles` and the write phase sort by `relPath`. **No emitted byte depends on hash-map/`Set`/`readdir` order.** Confirmed clean.
- **Cross-OS bonus finding (recorded for Day 2, positive):** the `/${relPath}\n`+content digest is **OS-independent** — `relPath` is normalized to forward slashes at the plugin (`.split(path.sep).join('/')`) and entity-codegen uses literal `/`, never raw `path.sep` into `GeneratedFile.relPath`; sorts use **default code-unit comparison** (no `localeCompare` anywhere). So the digest convention itself is **not** an OS-dependent bug — it de-risks Day 2 rather than being a Day-2 target.

---

## 3. The formatter finding (LD-3 + "there is nothing external to pin")

- **The finding, stated plainly:** the generator uses **no external formatter** — no Prettier/ESLint/dprint/biome anywhere in dependencies. The "formatting" axis is the generator's own internal `reindent` (`core/style.ts`), deterministic in-repo code. So the plan's/Month-1's "pin the formatter (Prettier) + plugins" item **has no target here.** The formatting-determinism guarantee is simply that `reindent` is deterministic compiled source.
- **LD-3 — the only adjacent hygiene lock (hash-neutral):** `devDependencies` were caret ranges; they are now exact-pinned to the installed versions — `typescript 5.9.3`, `@types/node 22.20.0`. The TS compiler version does **not** affect generated output (the generator emits fixed strings regardless of which TS built it), so this is build-reproducibility hygiene only. `npm ci` remains clean (exit 0).
- **Flagged for Day 9:** an erratum was appended to [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 9 — drop the Prettier pin (no target), keep `.gitattributes` as git-layer hygiene, and note the load-bearing LF guarantee already lives at the generator (LD-1) + guarded (LD-2).

---

## 4. The maximal baseline — RETIRED and REPLACED (stated honestly)

**This is a deliberate, documented change — not a re-derivation.**

- **The retired artifact:** the Day-20 maximal-composition digest **`33f3ec4b…`** is **un-reproducible.** It was driven through the HTTP wizard with an **ad-hoc description string that was never recorded** (docs show `description:'…'`), and the driver (`recheck.mjs`) was **deleted at Day-20 cleanup**. Since a provided description flows into the generated README, the exact bytes are unrecoverable. Critically, `33f3ec4b…` was **RECORD-ONLY** — it was *never* a live `day20:regress` assertion — so it was proving nothing a gate could re-check.
- **The replacement (a Day-1 creation):** Day 1 established a **new, reproducible** maximal baseline, **`929c379f9e98ec34c3a42bafe814ebb65fffde0820d754176a7c7ab95c825e20`**, by fixing the one missing input as a committed fixture:
  - `generator/src/maxcell-fixture.ts` — the durable source of truth: the canonical `MAXCELL_DESCRIPTION` constant + `buildMaxCellModel()` (Express · API-only · PostgreSQL · multi-user · multi-edge TeamTracker · snake+four+simple · `{email:smtp, ai:hook}` · the canonical description).
  - `generator/src/maxcell-driver.ts` (`npm run maxcell`) — the **retained** driver (never deleted at cleanup — the exact failure that killed `33f3ec4b…`), printing the digest twice-identical.
  - Baked as a **live** `day20:regress` assertion (`MAXIMAL|MaxCell`, PART 1f), twice-identical == recorded.
- **Honesty line:** **`929c379f…` is a new Day-1 baseline that *replaces* the un-reproducible Day-20 `33f3ec4b…`. It is NOT a reproduction of the Day-20 certified value.** The old hash is retired; the composition-proof capability is restored, now permanently reproducible.
- **Additive & isolated:** this moved **none** of the 43 frozen digests or 10 relationship hashes (verified). The manifest grew from 43 to 44 (43 frozen + 1 MAXIMAL).

---

## 5. Go-forward harness discipline

The durable discipline for the next 3 months was written to **[`../HARNESS-DISCIPLINE.md`](../HARNESS-DISCIPLINE.md)** — the nine rules (backstop reproduces every day; new features add their own baselines; the empty/default path is a literal bypass; hash-neutral before it lands; a moved hash is a STOP-and-report finding; deliberate re-baselines are rare/documented/isolated; the three killers audited for any output change; LF guaranteed + guarded; cross-OS joins the gate after Day 2; guard-the-guard always holds). A pointer to it belongs in the Day-9 root `CLAUDE.md`.

**Errata landed this day (visible appends, not silent rewrites):**
- [`eco-day-00-report.md`](eco-day-00-report.md) §1.9 — corrected: `generator/plugins/*/templates/` **ARE** the live project-shell path for all 5 stacks (the Day-0 grep gave a false negative). Those 83 LF template files are load-bearing, not deletable scratch.
- [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 9 — "pin Prettier" has no target (§3 above).

---

## 6. Forward-flags carried from Day 0 (still open)

- 🚩 **Cross-OS untested — Windows 11 only.** Byte-identity has only ever been proven on Windows; macOS/Linux unproven. **Day 2's job.** Day 1 de-risked the two likely breakers (EOL via LD-1; readdir/path order via the §2c findings), but the proof is not done.
- 🚩 **Toolchains do not match intended pins:** Java **20 ≠ 21**, Python **3.14 ≠ 3.13**, and **mvn / go / podman absent**. (Day-18 detect-and-guide territory; recorded, not acted on. None block `day20:regress` — pure Node.)
- 🚩 **Repo is not under git** — manual backup in use; "clean build" = `rm -rf dist && npm run build`.
- 🚩 **No root `CLAUDE.md`, no `.gitattributes`, no formatter config** — all **needed Day 9**.

---

## 7. What Day 2 picks up

**The cross-OS determinism proof** ([`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 2): run the same generation on macOS/Windows/Linux; hash and diff; the 43 + 10 (+ MAXIMAL) must be byte-identical across all three. Day 1 hands Day 2 a de-risked ground: LF emission is now guaranteed at the generator (not inherited from LF templates), directory-iteration order is neutralized (sorted `walk()` + sorted hash), and the digest `relPath` is OS-independent. If a cross-OS diff still appears, it is the finding — diagnose before concluding.

---

## 8. Scope & cleanup

- **Verify + document only.** No code changed this session; no features; **no frozen hash moved or touched.** The from-clean re-confirmation rebuilt `dist/` (expected).
- Ports free (4317/4319/4321), no leftover Thraksha servers; scratch contained in `scratchpad/day00/`; repo `output/` untouched.

---

**Day 1 verdict, restated:** the generator's determinism was audited and **holds** — no clock/RNG/UUID in the generation path (killer #1 clean), key/iteration order stable (killer #3 clean), and LF emission — correct but previously unenforced — is now **guaranteed at the generator (LD-1) and guarded (LD-2)** (killer #2 locked), all hash-neutral. There is no external formatter to pin (LD-3 pins devDeps only). The un-reproducible Day-20 maximal `33f3ec4b…` is **retired** and replaced by a new, reproducible, harness-asserted Day-1 baseline `929c379f…` (a replacement, not a re-derivation). The **43 + 10 reproduce byte-identical from clean.** **Day 1 is closed; Day 2 may prove cross-OS.**
