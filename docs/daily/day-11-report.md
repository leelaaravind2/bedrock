# Day 11 — End-of-Day Report: The coding-style engine + FORMATTING (first switch)

**Session 3 of 3 — EVALUATION + CLOSING.** Verify-and-document only; no new work, no naming/architecture-depth.
**Status: DONE — a deterministic coding-style engine exists with a no-op default; the first option (formatting/indentation) reindents Express `.js` as a provably cosmetic switch. The blocking backstop holds: default style reproduces all 20 recorded hashes byte-for-byte, so the engine is purely additive.**

Plan: [`docs/daily/day-11-plan.md`](day-11-plan.md) (revised: formatting first, naming → Day 12). Step 1 of the coding-style arc (Days 11–14). Guardrails: ADR-001 (no AI), ADR-002 (separation), ADR-003 (determinism), Law 25 (core neutral).

**Formatting is the safest first option because, in a brace-delimited language, altering non-semantic whitespace is meaning-preserving *by the language grammar* — the code is byte-different but cannot mean anything different. That, plus a default style that is a literal no-op, is what makes the 20-hash backstop airtight.**

---

## 1. What was built

- **`src/core/style.ts`** (technology-neutral) — the engine's kernel:
  - `CodingStyle { formatting: { indent: IndentStyle } }` and `defaultCodingStyle` (the no-op default). `IndentStyle = 'default' | 'two-space' | 'four-space' | 'tab'` — generic formatting concepts, no per-language logic.
  - `indentUnitFor(indent)` → the unit string (`''` for `'default'`, which the caller treats as "apply nothing" — the backstop).
  - `reindent(content, sourceSpaces, unit)` — a **pure, total** function that rewrites the **leading whitespace only** of each line by indent depth; blank/whitespace-only lines pass through; a ragged (non-multiple) line **throws** rather than produce a garbled indent.
- **Model** (`project-model.ts`) — `getStyle()`/`setStyle()` (default `defaultCodingStyle`); `style` added to `ProjectState`; `restoreProjectModel` defaults pre-style snapshots to the no-op style (old versions still regenerate byte-for-byte).
- **Threading** (`plugin.ts` + `regen.ts`) — `buildFileSet` reads `model.getStyle()`, passes it via `EntityGenerationContext.style` (the seat for Day-12 naming, which is applied *during* codegen), and calls an **optional** `BackendPlugin.formatFiles(files, style)` hook *after* generation (formatting is a post-pass). Default ⇒ the hook is a no-op.
- **Express plugin** — implements `formatFiles`: when `indent` ≠ default, reindents **only its `.js`** files (source unit 2). All other files (`package.json`, `docker-compose.yml`, `.sql`, README, …) are returned untouched. The `'default'` branch returns the files unchanged.

**How Days 12–14 plug in:** naming (Day 12) reads `context.style` in each plugin's codegen (identifier-level, applied during generation); architecture depth (Day 13) branches the file set on `context.style`; both extend the same `CodingStyle` shape, thread through the same context, and obey the same default-is-a-no-op backstop. No new machinery needed — Day 11 built the framework.

---

## 2. THE BLOCKING BACKSTOP — default style reproduces all 20 hashes (proof)

Re-generated from a clean rebuild with **default style** (no `setStyle`, or `indent: 'default'`). **All 20 byte-identical, deterministic:**

| Database | Model | Spring | Express | FastAPI | Django | Go |
|---|---|---|---|---|---|---|
| Postgres | DemoApp | `010098cd…` ✅ | `a437a302…` ✅ | `dca2254f…` ✅ | `68601cc5…` ✅ | `d158529a…` ✅ |
| Postgres | TeamTracker | `9e01210c…` ✅ | `dca2b4a7…` ✅ | `6d422010…` ✅ | `e509309c…` ✅ | `6aea8b04…` ✅ |
| MySQL | DemoApp | `3112d3f7…` ✅ | `d4b57b52…` ✅ | `cd87d6e3…` ✅ | `8b07a1b2…` ✅ | `9ff40acb…` ✅ |
| MySQL | TeamTracker | `4c4640ba…` ✅ | `bfa4a536…` ✅ | `5c788c70…` ✅ | `3b3e6a6f…` ✅ | `7408a3e2…` ✅ |

16 non-Go: 16/16, zero mismatches. Go's four: all match. **The engine is purely additive** — it changes output only when a developer explicitly picks a non-default option. Guaranteed by construction: the default path (`unit === ''`) returns the codegen output unchanged, and every existing caller (demos, CLI, UI) supplies no style. The `two-stacks`, `ui:demo`, `version:demo`, and `python:demo` demos also pass (the style threading, incl. `getState`/versioning, disturbs nothing).

---

## 3. The formatting option — deterministic, uniform, strictly cosmetic

Verified on `Express / DemoApp / Postgres` (formatting is dialect- and model-independent in effect, so a representative Express combo is sufficient — §4 of the plan):

- **Default reproduces the frozen hash** `a437a302…`; **`two-space` == default** (the identity form of Express's 2-space source).
- **Deterministic (twice-identical), alternative hashes recorded:**
  - `four-space` → **`d3ae91b0fbbf28ff448caa87d3bfe7f38b48fceda1547990e2c4b34b990320be`**
  - `tab` → **`c81fb0f52ef8ad30e6cc20c47d7863ff8142f2310b96f9d070ef696312c79b99`**
- **Uniform, not patchy:** **197 / 197** indented `.js` lines reindented — every one.
- **Strictly cosmetic (the meaning-preservation proof):**
  - **0** non-`.js` files changed (package.json / compose / `.sql` / README byte-identical to default).
  - **0** `.js` files with any non-whitespace change (stripping leading whitespace from default and four-space yields identical content — only the indent differs).
  - **`node --check` on every reindented `.js` → all valid** (TeamTracker four-space project). The JS grammar guarantees leading whitespace is non-semantic; this confirms it empirically.

So a `four-space` Express project is byte-different from default but provably behaves identically.

---

## 4. Honest scope — Express `.js` only on Day 11 (measured, not hand-waved)

Formatting is applied to **Express `.js` code files only** this Day. The other stacks/files are excluded for reasons **measured from the actual generated output**, not assumed:

| Stack / files | Measured | Decision | Why |
|---|---|---|---|
| **Express `.js`** | 197 indented lines, **0 non-2-multiple**; **0 multi-line strings** | ✅ **IN** | brace-delimited (whitespace non-semantic) + clean multiples + no string spans → the reindent is provably safe & exact |
| Spring `.java` | 428 indented lines, **83 non-4-multiple** (continuation alignment) | ⚠️ deferred | brace-safe, but the depth-rescale can't handle alignment lines; needs an alignment-aware pass (later) |
| FastAPI/Django `.py` | clean 4-multiple (**0 ragged**) but whitespace is **semantic** | ⚠️ deferred | a width change is meaning-preserving only if perfectly uniform — higher stakes, deferred until hardened |
| Go `.go` | **tab-indented** (gofmt) | ➖ N/A | a space-width option doesn't apply; Go stays gofmt/tabs |
| `.yml` / `.sql` / `.json` / Dockerfile / `.md` | — | ⛔ never | YAML whitespace is **semantic**; SQL uses column-**alignment**; JSON structure is meaning-bearing — a whitespace transform here would risk correctness |

No over-claiming: Day 11 proves the *engine* + the formatting switch on the one stack where it is provably safe. Extending the reindent to Spring (alignment-aware) and Python (semantic-safe) is honest follow-on hardening; quote-style (needs string re-delimiting/escaping) is a deferred sibling formatting option.

---

## 5. ADR / Law compliance

- **ADR-001 (no AI):** `reindent` is pure string math; no AI/network anywhere.
- **ADR-003 (determinism):** `reindent` is a pure, total function; the default branch is a literal no-op; all 20 default hashes byte-identical; alternatives twice-identical. This being the highest-risk determinism day, the default path was verified first and holds.
- **ADR-002 (file separation):** the reindent's **safety precondition was verified** — Express `.js` files contain **0** backticks / multi-line strings, so every line's leading whitespace is genuinely indentation (never string content); the transform touches only the `^ +` prefix. Developer-owned `.js` (`*.service.js`, `*.routes.js`) are styled at first creation and then never regenerated (created-once), so separation is untouched — confirmed by `two-stacks` passing under default.
- **Law 25 (core neutral):** `src/core/style.ts` holds only generic style concepts (`IndentStyle` values are language-agnostic — "four-space indent" means the same everywhere) and generic string math; **no stack/file-type logic in the kernel**. The decision of *which files are safe to reindent and what their source unit is* lives entirely in the **Express plugin**. `formatFiles` is optional (plugins may omit it). (The "Express" mentions in `src/core/database.ts` are pre-existing JSDoc examples, not logic.) The JSDoc `TIMESTAMPTZ` example is untouched.

---

## 6. Scope — held

**In scope, done:** the style-engine machinery (neutral `CodingStyle`, no-op default, context threading, per-plugin `formatFiles` hook); formatting/indentation on Express `.js`; 20-hash backstop proven; alternative hashes established.

**Deliberately out:** naming convention (Day 12); architecture depth (Day 13); the wizard style-selection UI (Day 14); formatting on Spring/Python/Go and on YAML/SQL/JSON/config (§4); probabilistic/"personality" variation (forbidden — breaks ADR-003).

---

## 7. What Day 12 picks up

**Day 12 — naming convention (the entangled option), now on a proven engine.** Unlike formatting (whitespace-only, meaning-preserving by grammar), naming touches **identifiers**, so it is applied *during* codegen via `context.style` (the seat built today), not as a post-pass. The design work already scoped it (the earlier Day-11-as-naming draft): govern the JSON API field keys — `default` (current, reproduces the 20 hashes) vs `camelCase`/`snake_case` — via each stack's serialization mechanism, leaving DB columns (SQL snake_case) and language-forced internal identifiers unchanged; a multi-word demo model is needed to exercise it (the current demos are single-word). The backstop is identical: **default naming = the 20 hashes, byte-for-byte.** Then Day 13 (architecture depth) and Day 14 (wizard wiring + full regression + Week-2 summary).

---

**Day 11 verdict:** the coding-style engine is real and deterministic — a neutral `CodingStyle` in the model, a no-op default, context threading, and a per-plugin formatting hook, all designed for Days 12–14 to extend. The first option (formatting/indentation) reindents Express `.js` uniformly and provably cosmetically (0 non-whitespace changes, valid JS), with recorded `four-space`/`tab` hashes. And the blocking backstop is proven: **default style reproduces all 20 recorded hashes byte-for-byte** — the engine is purely additive. Day 11 is **done**.
