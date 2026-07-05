# Eco-Day 05 — PLAN (Session 1 of 3): The Node sidecar (highest-risk plumbing) `[3 days]`

**Phase 0, Day 5. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no wiring, no file changes except this plan. Day 5 is the **first time the shell and the generator connect**: the Node generator must run **from inside the packaged Tauri app** and produce **byte-identical** output there (the 43+10 must reproduce when the generator is spawned as a *sidecar*, not just run directly). This is the riskiest Phase-0 plumbing — the plan resolves the HOW before any wiring and sequences each risky piece as a **separately-proven step**.

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.4 standalone, §3 the one line, §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §4 (**bundled** sidecar; **never** shell out to system `node`; verify-before-spawn; stdin/stdout or localhost) → [`../THRAKSHA-MONTH-1.md`](../THRAKSHA-MONTH-1.md) Day 5 (`[3 days]`) → [`eco-day-04-report.md`](eco-day-04-report.md) (the shell state + the **cargo-on-PATH** flag) → the actual generator build (done this session).

> **Grounded this session (read the real generator):** decisive facts that determine the approach — see §1. Preliminary reconnaissance only; Session 2 re-derives empirically.

---

## 1. What the generator actually is (the facts that decide the approach)

| Fact | Evidence | Consequence |
|---|---|---|
| **Zero runtime dependencies** | `package.json` → `dependencies: {}` (only devDeps `typescript`/`@types/node` for the build) | Nothing to bundle but the JS + Node itself. |
| **No native modules** | `node_modules` = `@types`, `typescript`, `undici-types`; **no `.node` files** | No `better-sqlite3`/N-API to complicate bundling (SQLite is Day 8, not yet). |
| **Pure Node built-ins** | all imports are `node:*` or relative `./` | Runs on any Node 22; no external resolution at runtime. |
| **ESM + `import.meta.url` everywhere** | `generate.ts`, `server.ts`, `version.ts`, **all 5 plugins** compute `HERE = path.dirname(fileURLToPath(import.meta.url))` | **The critical complication (below).** |
| **Templates read from the filesystem at runtime** | each plugin: `DEFAULT_TEMPLATES_DIR = path.join(HERE, '..','..','..','plugins','<stack>','templates')` → `fs.readFile` of the 83 LF template files | The bundle **must ship those 83 files on disk**, at the exact relative offset the code expects. |
| **Existing one-shot entries** | `generate.ts` (`node dist/generate.js [outDir] --yes`), `day20-regression.js` (`--emit-digests`) both run purely off `dist/` + `plugins/` | **Reusable with zero source changes** (§2). |
| **Output is Node-patch-independent** | Day-2 proof (22.21.0 vs 22.23.1 → identical) | Any pinned Node 22 binary is fine for the sidecar. |

**The determinism-across-boundary risk, precisely:** the generator resolves its 83 template files *relative to the running module's location* (`import.meta.url`). Any bundling scheme that changes where the code runs from, or that doesn't ship those files at the expected offset, will break template reads → non-byte-identical output (or a crash). **This single fact decides Option 1 vs Option 2.**

---

## 2. THE APPROACH DECISION — bundled Node + resourced files (NOT a single-file SEA)

### Rejected — Option 1: a single self-contained binary (Node SEA / pkg / esbuild)
- **Node SEA** embeds one JS blob into `node`, but (a) the generator is **ESM with `import.meta.url`**, which SEA treats poorly (SEA's main is CJS-oriented), and (b) the **83 template files are external** and read via `import.meta`-relative `fs.readFile`. To make SEA work you'd have to esbuild-bundle ESM→CJS **and** rewrite every plugin's template read to use SEA embedded assets (`sea.getAsset()`) — a **non-trivial change to all 5 plugins**, i.e. **not** "generator source untouched / hash-neutral." **Rejected.**
- **pkg** is unmaintained and ESM-hostile. **Rejected.**

### RECOMMENDED — Option 2: bundle a pinned Node runtime + ship `dist/` and `plugins/` as resources, layout preserved
Ship a **pinned `node.exe`** as the Tauri sidecar binary, and the generator's **`dist/`** and **`plugins/`** trees as Tauri **resources**, preserving the exact directory layout. The shell spawns the bundled node against an existing entry script.

- **Why it's the lowest-risk for determinism:** the **exact compiled JS runs unchanged**, and `import.meta.url` resolves to the resourced `dist/` location, so `path.join(HERE,'..','..','..','plugins','<stack>','templates')` lands on the shipped `plugins/<stack>/templates` at the correct offset (verified: `gen/dist/plugins/<stack>` → up 3 → `gen/` → `plugins/<stack>/templates`). **Byte-identical by construction, with ZERO generator source changes.**
- **Why it satisfies the hard rules:** it **never shells out to system `node`** (it spawns the *bundled* `node.exe`); it's fully self-contained; verify-before-spawn is a file existence check on the sidecar + entry + a template.
- **The pinned node:** obtain a pinned `node-v22.x-win-x64` `node.exe` (any Node 22 — output is patch-independent). Place as `desktop/src-tauri/binaries/node-x86_64-pc-windows-msvc.exe` (Tauri `externalBin` target-triple naming; host triple confirmed Day 4 = `x86_64-pc-windows-msvc`). Document the exact version.
- **Cost:** ~80 MB (`node.exe`) + a few hundred KB (`dist/` + 83 templates) added to the installer. Acceptable for Day 5; installer-size optimization is later.

### The communication design — one-shot, args + stdout (not a long-lived server)
- **Recommendation: one-shot invocation.** The shell spawns the sidecar with args, the sidecar runs and exits, the shell reads **stdout** (and exit code). Simpler and more deterministic than a spawned localhost server (no port, no lifecycle, no state). Architecture §4 explicitly allows "stdin/stdout or localhost"; one-shot stdout is the lower-risk choice for Day 5. *(The existing `server.ts` wizard remains a possible future interactive mode — not the Day-5 sidecar.)*
- **The byte-identical GATE reuses an existing entry — no new code:** spawn the sidecar as `node dist/day20-regression.js --emit-digests` → it prints the **44 `DIGEST` lines**; the shell captures them; diff against the **native Windows digest list** (captured Day 2, `scratchpad/day02/windows-digests.txt`). **Identical ⇒ determinism survived the sidecar boundary.** This writes nothing to disk (stdout only), so it **sidesteps the read-only-resource-dir problem** entirely.
- **The functional "generate a project" path** (a demonstration, not the load-bearing gate) reuses `node dist/generate.js <writableOutDir> --yes` — note it must be given an **explicit writable output dir** (a packaged app's resource dir is **read-only**; never write generated output into resources). Hash a produced cell → compare to the frozen value.
- **No new generator source is required for Day 5.** If a cleaner stdin/stdout protocol is wanted later, a **tiny additive `sidecar.ts`** entry may be added — but only if unavoidable, and **proven hash-neutral** (it must not change any existing generation path). For Day 5, prefer reusing `day20-regression.js` + `generate.js`.

---

## 3. The risks this approach must retire (and how)

| Risk | Mitigation (proven in Session 2) |
|---|---|
| **Template resolution breaks when relocated** (import.meta.url offset) | DC-1 runs the bundle from a **relocated dir** (not the dev checkout) and proves byte-identical *before* any Tauri. |
| **Packaged resource paths differ from dev** | DC-3 proves from a **packaged build**, not `tauri dev` (dev passing is not enough — the load-bearing proof). |
| **Read-only resource dir on write** | the byte-identical gate uses **stdout digest emission** (no writes); the generate demo uses an explicit **writable** out dir. |
| **Accidentally using system node** | the sidecar is the **bundled** `node.exe` via Tauri `externalBin`; verify the sidecar binary exists before spawn; clear error if missing. |
| **cargo not on default PATH** (Day-4 flag) | bake `export PATH="/c/Users/kplee/.cargo/bin:$PATH"` into **every** Rust/Tauri step from the first. |
| **Determinism breaks across the boundary** | the byte-identical gate at **each** stage; any divergence ⇒ STOP-and-report finding (do not smooth, do not re-baseline). |

---

## 4. SESSION 2 (EXECUTE) — done-conditions, sequenced as SEPARATE provable steps (this is `[3 days]` — do not collapse)

Put at the top of the Session-2 prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."** Every step ends with the byte-identical gate; a non-identical result is a real finding (determinism broke across the boundary), not something to work around. **cargo on PATH from step 1.**

### DC-1 — The STANDALONE bundle proof (de-risk the hardest piece FIRST, no Tauri)
- Assemble the sidecar **payload**: a pinned `node.exe` + a copy of `generator/dist/` and `generator/plugins/` into a **fresh directory OUTSIDE the generator checkout** (simulating the relocated resource layout, layout preserved).
- Prove byte-identical from the relocated bundle, run with the **bundled** node (not system node):
  - `<pinned node.exe> <bundle>/dist/day20-regression.js --emit-digests` → **44 digests == native** (`day02/windows-digests.txt`), diff **empty**.
  - `<pinned node.exe> <bundle>/dist/generate.js <tmpOut> --yes` → hash a produced cell → **== its frozen value**.
- **This is the load-bearing determinism-across-bundling proof, isolated from Tauri.** If it diverges here (template not found, path offset wrong, relocation broke resolution) → STOP; the bundling approach is wrong, fix before wiring.

### DC-2 — Wire as a Tauri sidecar; prove it spawns in `tauri dev` and generates byte-identical
- In `desktop/` (the shell layer — **not** `generator/`): place the pinned node as `src-tauri/binaries/node-x86_64-pc-windows-msvc.exe`; declare `externalBin`; ship `dist/` + `plugins/` via `bundle.resources` (layout preserved); add the **shell plugin** (`@tauri-apps/plugin-shell`) + a **capability** permitting the `node` sidecar; **verify-before-spawn** (check the sidecar binary + entry + a template exist; clear error if not).
- From `tauri dev`: the shell spawns the sidecar `node <resource>/dist/day20-regression.js --emit-digests`, captures stdout, and surfaces it (write to a known writable path / log). Diff the captured 44 digests vs native → **byte-identical**.
- *(Minimal shell wiring to observe the output — a startup call or one button — is additive to `desktop/`; still no real UI/features.)*

### DC-3 — Prove from a PACKAGED build (THE load-bearing proof)
- `tauri build` (release); run the **packaged** app; it spawns the sidecar (resolving resources from the packaged location, which differs from dev); capture the sidecar's 44 digests; diff vs native → **byte-identical**.
- **Dev passing is NOT enough.** This packaged proof is the day's real gate: the packaged shell spawns the *bundled* generator and reproduces the frozen 43+10.
- If dev passed but packaged diverges → STOP; the finding is a packaged-path/resource-resolution break (the classic sidecar trap).

### DC-4 — The invariants (checked at every stage)
- **Byte-identical gate** green at DC-1, DC-2, DC-3 (representative subset minimum = the 44-digest emission; ideally the full regress runs inside the sidecar).
- **`generator/` source UNTOUCHED** — verify files-only (no `.ts` changed). If a tiny additive `sidecar.ts` shim proved unavoidable, it is **additive + proven hash-neutral** (`day20:regress` byte-identical before/after) and nothing else in `generator/` changed.
- **Backstop still green from clean** — `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS, 43+10+MAXIMAL byte-identical.
- **No system node** used anywhere in the spawn path; **no frozen hash moved**.

**Session 2 scope guard:** no features/real UI/forms (the sidecar produces the SAME output); no new stacks/types/integrations; no code signing; no macOS/Linux sidecar builds (Windows only); do not change generator source except a proven-hash-neutral additive shim if unavoidable; do not shell out to system node; do not move any frozen hash. No report file (Session 3 writes it).

---

## 5. SESSION 3 (REPORT) — done-conditions

Session 3 writes [`eco-day-05-report.md`](eco-day-05-report.md):
- **Re-confirm from clean:** `day20:regress` green (43+10+MAXIMAL byte-identical); `generator/` provably untouched.
- **The sidecar approach chosen** (bundled node + resourced `dist/`+`plugins/`; why not SEA — the `import.meta.url` template-resolution blocker) and the communication design (one-shot, args + stdout; digest-emission gate).
- **The three proofs, in order:** DC-1 standalone-relocated-bundle byte-identical; DC-2 dev-spawn byte-identical; **DC-3 PACKAGED-spawn byte-identical (load-bearing)** — with the actual captured digest-diff results.
- **generator/ untouched** (files-only verified); any additive shim shown hash-neutral.
- **Any determinism-across-boundary findings** stated honestly (or "none — byte-identity held at every stage").
- **Verdict line:** "The packaged Tauri shell spawns the bundled Node generator and produces byte-identical output (43+10 reproduce across the sidecar boundary); generator untouched; no system node; Day 5 (sidecar) done." — or the honest finding if byte-identity broke at any stage.
- **Forward-flags:** macOS/Linux sidecar builds deferred (git+CI gap); installer size (~80 MB node) noted for a later optimization; cargo-on-PATH; standing flags (no git; CLAUDE.md/.gitattributes needed Day 9; cross-OS proof not yet in CI; generated-project toolchain pins). **Day 8 = the SQLite local store** (Phase 0 continues; note Day 5 is `[3 days]`).

---

## 6. SCOPE GUARD — OUT for Day 5

- **No features, no real UI, no forms** — the sidecar produces the SAME generation output, nothing new. (Minimal shell wiring only to *observe* the sidecar output for the gate.)
- **No new stacks/types/integrations.**
- **No code signing** (Phase 4).
- **No macOS/Linux sidecar builds** (Windows only; deferred like the rest).
- **Do NOT change generator source** except (if unavoidable) a tiny additive, hash-neutral entrypoint shim — and prove it hash-neutral.
- **Do NOT shell out to system node** — spawn the bundled node.
- **Do NOT move any frozen hash.**

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for Session 2
1. Read guardrails + ecosystem §4 + Month-1 Day 5 + eco-day-04 report? — ✅ (this session).
2. Which session, only its job? — Session 2 = EXECUTE (standalone → dev → packaged, each gated). No report; no features.
3. Which frozen baselines must NOT move? — the **43 + 10** (+ MAXIMAL). The sidecar reproduces them across the boundary; it never moves them.
4. New AI touchpoints? — none.
5. Default/empty path a literal bypass? — the sidecar runs the SAME generation; nothing new is generated.
6. Three killers checked? — determinism is the whole gate here (byte-identity across the boundary); LF/paths already locked (Day 1/2).
7. A gate that can actually FAIL? — **YES: the byte-identical digest-diff at DC-1/DC-2/DC-3.** A divergence is the finding.
8. Overclaim / scope drift? — the live risks are (i) claiming success on `tauri dev` alone (DC-3 packaged is load-bearing), (ii) silently changing generator source, (iii) using system node — §4/§6 forbid all three.

---

*Day 5 crosses the highest-risk seam in Phase 0: the generator must run **inside** the packaged shell and still be byte-identical. The generator's shape decides the approach — pure Node, no native deps, but templates read from disk via `import.meta.url`, which rules out a single-file SEA and points to a bundled pinned Node + the `dist/`+`plugins/` tree shipped as resources (exact files, exact layout, zero source change, byte-identical by construction). Prove the hardest piece **standalone and relocated first**, then in dev, then — the load-bearing proof — from a **packaged** build. Never system node; verify before spawn; a broken byte-identity is the finding, not something to smooth. The thesis governs; the deterministic core stays untouched.*
