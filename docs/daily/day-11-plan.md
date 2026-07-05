# Day 11 — Plan (REVISED): The coding-style engine — design + FORMATTING (indentation) first

**Session 1 of 3 — PLANNING ONLY. No implementation this session.**
**Revised order: FORMATTING is the first style option (the safest — it changes how code *looks*, never what it *means*). Naming convention moves to Day 12. Day 11 builds the whole style-engine machinery + the first formatting switch. The safety backstop: a DEFAULT style reproduces all 20 recorded hashes byte-for-byte.**

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md), [`docs/adr/`](../adr) (ADR-001/002/003, Law 25), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Days 11–14), [`week-01-summary.md`](week-01-summary.md), [`day-10-report.md`](day-10-report.md) (the 20-hash matrix is the regression backstop). Reviewed the actual generated indentation per stack (grounding in §3).

**CRITICAL FRAMING (highest-risk determinism day): every style option is a finite, explicit switch — same model + same style → byte-identical output, always (ADR-003). No probabilistic "personality," nothing unpredictable. Formatting is the *safest* first option because, in a brace-delimited language, altering non-semantic whitespace is provably behavior-preserving by the language spec — the code is byte-different but cannot mean anything different. The default style is a literal no-op, which makes the 20-hash backstop airtight.**

---

## 1. Why formatting first (the safety argument)

Formatting changes **whitespace only** — never identifiers, structure, or values. In a **brace-delimited language (JavaScript, Java, Go)**, leading whitespace is **non-semantic**: the parser ignores it. So re-indenting such code is **provably meaning-preserving by the language grammar** — not an empirical hope but a guarantee. This makes formatting the lowest-risk place to prove the style engine works, before Day 12's naming (which touches identifiers) and Day 13's architecture depth (which changes the file set).

The corollary — and the discipline for this plan — is that formatting must touch **only** non-semantic whitespace, and **only** in files where whitespace is non-semantic. Anything whitespace-*significant* (YAML, Python) or meaning-bearing (SQL, JSON structure, string contents) is out of scope for a whitespace transform.

---

## 2. The style-engine design (the foundational deliverable)

Day 11 builds the whole machinery; Days 12–14 add options into it. Design it well.

### 2.1 Where style lives (the model)
A new **optional, separate** section on the Project Model — chosen *after* setup, distinct from Phase-A:
```ts
// core/project-model.ts — technology-neutral (Law 25): generic style concepts,
// no per-language logic. The kernel stores intent; plugins apply it.
interface CodingStyle {
  formatting: { indent: 'default' | 'two-space' | 'four-space' | 'tab' }; // Day 11
  // naming → Day 12; architectureDepth → Day 13 (added later, same shape)
}
```
Set via `model.setStyle(style)` (or supplied at generation); **absent ⇒ `{ formatting: { indent: 'default' } }`.** A model with no style section behaves exactly as today.

### 2.2 How style flows into generation
The style threads through the same path `multiUser` already does — the core reads `model.getStyle()` in `buildFileSet` and passes a neutral `CodingStyle` handle to the plugins (via the `EntityGenerationContext` and/or the plugin factory). **The core never interprets it** — it does not know what "indent" means for a given language. Each **plugin owns its language's formatting** (which files, what the source unit is, whether the transform is safe). Law 25 holds: the kernel carries generic style intent; plugins apply.

### 2.3 How "default" reproduces current output (the backstop mechanism)
Formatting is applied as a **conditional, post-generation transform** the plugin runs over its own files:
- **`indent: 'default'` ⇒ the transform is a no-op ⇒ the plugin's files are returned exactly as the codegen produced them ⇒ all 20 hashes reproduced byte-for-byte.**
- The codegen itself is **untouched** — formatting is a separate pass applied *only* when a non-default option is selected. This is what makes the backstop airtight: the default path literally does nothing, and all existing callers (demos, CLI, UI) supply no style ⇒ default ⇒ 20 hashes frozen.

Recommended placement (Session-2 choice, keeping core neutral): the plugin exposes/owns a formatting step invoked after its generation; the actual whitespace transform is a **shared, generic, pure util** (`reindent(content, sourceUnit, targetUnit)`) that the plugin calls on the specific files it knows are safe. The util is language-agnostic string math; the *decision of what to apply it to* is the plugin's.

---

## 3. Day 11's option — FORMATTING: indentation width (precise, data-grounded scope)

**Option:** `formatting.indent ∈ { 'default', 'two-space', 'four-space', 'tab' }` (Day 11 implements `'default'` + at least one alternative, e.g. `'four-space'`).

**The transform:** rewrite **leading whitespace only** (the run of spaces before the first non-space char) by indent *depth*: `newLeading = (leadingSpaces / sourceUnit) × targetWidth`. It never touches string contents, trailing content, or inline alignment — so in a brace-delimited language it cannot change meaning.

**Per-stack applicability — grounded in the actual generated output (measured this session):**

| Stack | Indent in generated code | Day-11 scope | Why |
|---|---|---|---|
| **Express (JS)** | 2-space, **clean** (197 indented lines, **0 non-2-multiple**) | ✅ **IN** | brace-delimited (whitespace non-semantic) + clean multiples → the reindent is provably safe & exact |
| Spring (Java) | 4-space but **ragged** (428 lines, **83 non-4-multiple** — continuation alignment) | ⚠️ deferred | brace-safe, but the simple depth-rescale doesn't apply to alignment lines; needs a real indent/alignment-aware pass (later) |
| Go | **tabs** (gofmt) | ➖ N/A | a space-width option doesn't apply; Go stays gofmt/tabs |
| FastAPI / Django (Python) | 4-space, clean (0 non-4-multiple) | ⚠️ deferred | whitespace is **semantic** in Python — a width change is meaning-preserving only if perfectly uniform; higher stakes, deferred until hardened |
| — config/data files (`.yml`, `.sql`, `.json`, Dockerfile, `.md`) | — | ⛔ never | YAML whitespace is **semantic**; SQL uses column-**alignment**; JSON structure is meaning-bearing — a whitespace transform here risks correctness → excluded |

**Day 11 delivers the option on Express (JavaScript)** — the one stack that is both brace-delimited (safe) and clean-multiple (exact). This is the Day-1 pattern (prove the engine on the safest representative stack); extending the transform to Spring (alignment-aware) and Python (semantic-safe) is honest follow-on hardening, noted, not claimed done. Go is idiomatically tab-forced (N/A).

**Definitions:**
- `'default'` → no transform → Express `.js` stay 2-space (current) → 20 hashes.
- `'two-space'` → reindent Express `.js` to 2-space (identity for Express — it is already 2-space).
- `'four-space'` → reindent Express `.js` to 4-space (the clear demonstration).
- `'tab'` → reindent to a single tab per level (available; a valid JS style).

**Which files it affects, precisely:** only Express's **`.js` code files** (entity codegen output + the `src/*.js` shell). **Not** `package.json` (JSON/config), **not** `docker-compose.yml`/`.env`/README/`.sql`/`Dockerfile`. The generated project's `.js` is byte-different (indent width) but behaviorally identical.

---

## 4. Honest scope of formatting — what it touches vs. never touches

- **Touches:** the leading whitespace of Express `.js` code files, changing indent *width* only.
- **Never touches:** string/literal contents (the reindent operates only before the first non-space char); inline alignment inside a line; SQL migration text (whitespace-insensitive but alignment-formatted — excluded); YAML (`docker-compose.yml` — whitespace **semantic**); JSON (`package.json` — structure meaning-bearing); Python/Go files; identifiers, values, or any token.
- **Meaning-preservation is a language guarantee, not a check:** because JS ignores leading whitespace, re-indented `.js` is behavior-identical by the grammar. (A live spot-boot of a reindented Express project is a nice-to-have, not required to *prove* correctness — the language spec does that; generation-determinism is what Day 11 proves.)
- **If a formatting change would risk correctness, it is out** — which is exactly why Spring (ragged alignment), Python (semantic whitespace), YAML/SQL/JSON are excluded from Day 11.

---

## 5. Determinism & the 20-hash backstop (blocking)

- **Default reproduces all 20 hashes byte-identical (blocking gate).** With `indent: 'default'` (or no style), the formatting transform is a no-op → today's output. Diff all 20 first; a single moved hash means the default path isn't a true no-op.
- **The alternative is deterministic.** For `'four-space'` (and `'tab'`), regenerate Express **twice → byte-identical**; establish new hashes for the **affected combos only** — realistically **Express × DemoApp × Postgres** (and optionally TeamTracker). Formatting is **dialect- and model-independent** in effect (it rescales `.js` whitespace regardless of the DB or entity set), so a representative Express hash suffices; the full 20-combo alternative matrix is *not* needed Day 11 (state which combos were recorded).
- **`reindent` is a pure, total function** of `(content, sourceUnit, targetWidth)` — no AI, no randomness, no wall-clock.

---

## 6. Phasing Days 11–14 (revised, confirmed) — the backstop rule on every day

| Day | Option | Deliverable | Backstop |
|---|---|---|---|
| **11** | **Formatting (indentation)** | style-engine machinery + `formatting.indent` on Express `.js` | default = 20 hashes |
| **12** | **Naming convention** | `namingConvention` (camelCase / snake_case) on API field keys (was the old Day-11 plan) | default = 20 hashes |
| **13** | **Architecture depth** | `architectureDepth` (simple vs layered controller/service/repository) — changes *which files* are generated | default (current layering) = 20 hashes |
| **14** | **Wizard + prove** | the style-selection screen in the wizard (post-setup); wire all options end-to-end; full regression + Week-2 summary | **all default-style output = all 20 hashes**; every combination deterministic |

Each day finishable; the invariant across all four is that **default style reproduces the 20-hash matrix**, so style is provably additive. The engine built Day 11 (model section, threading, no-op-default backstop, plugin-applied transform) is what Days 12–13 plug their options into; Day 14 wires the UI and proves the whole thing.

---

## 7. Scope guard — explicitly OUT for Day 11

- **Naming convention → Day 12; architecture depth → Day 13; wizard style UI → Day 14.** Day 11 supplies style programmatically.
- **Probabilistic / "code personality" variation** — forbidden (breaks ADR-003). Never a style option.
- **Formatting on Spring/Go/Python and on YAML/SQL/JSON/config** — out (§3/§4): ragged alignment (Spring), semantic whitespace (Python/YAML), meaning-bearing (SQL/JSON). Express `.js` only this Day.
- **Quote-style** — a plausible sibling formatting switch, but it must re-delimit + re-escape string literals (edge cases); deferred in favor of the strictly-safer leading-whitespace transform. (Noted as a future formatting option under the same engine.)
- MongoDB, more backends/frontends — out.

---

## 8. Done-conditions & proof

### 8.1 Session 2 must achieve
1. `CodingStyle` type in core (neutral) + `model.setStyle`/`getStyle` (default `{ formatting: { indent: 'default' } }`); thread the style handle into generation (default for all existing callers).
2. A shared, pure `reindent(content, sourceUnit, targetWidth)`; the Express plugin applies it to its `.js` files when `indent` is non-default (no-op when `'default'`); other plugins/files untouched.
3. Keep all 20 hashes byte-identical under default; establish the formatting-alternative hashes for the representative Express combos (twice-identical).

### 8.2 Session 3 verification (blocking)
- **20 hashes byte-identical under default style** — the blocking backstop.
- **Alternative deterministic:** Express `'four-space'` (and `'tab'`) twice-identical, hashes recorded; a diff confirms **only leading whitespace changed** in `.js` files (no token/string/structure change), and **non-`.js` files are byte-identical to default** (columns/SQL/YAML/JSON/config untouched).
- **Meaning-preservation stated as a language guarantee** (JS ignores leading whitespace); optional: a quick spot-boot of a `'four-space'` Express project still runs (nice-to-have, not the proof).
- **Scope honesty:** Express only this Day; Spring (ragged)/Python (semantic)/Go (tabs)/config (semantic) explicitly deferred/excluded with the measured reasons.
- **ADR sweep:** no AI; `reindent` pure/deterministic (ADR-003); file separation intact (formatting touches only Thraksha-owned files' whitespace; developer files unaffected); core neutral (Law 25 — kernel carries `CodingStyle`, the Express plugin applies).
- **Output:** `docs/daily/day-11-report.md`; note Day 12 = naming convention.

### 8.3 Definition of "Day 11 done"
A deterministic coding-style engine exists (neutral `CodingStyle` in the model, threaded to plugins, default = no-op); the first formatting option (`formatting.indent`) reindents Express `.js` code files as a provably meaning-preserving whitespace switch; the default style reproduces all 20 hashes byte-identical (backstop proven); the `'four-space'`/`'tab'` alternatives generate deterministically with recorded Express hashes; non-`.js` files and all other stacks are untouched; the core stays neutral. Written up in `docs/daily/day-11-report.md`.

---

## 9. Risk notes (for Session 2)

- **Determinism is the whole point — be rigorous.** `reindent` must be a **pure, total** function; the `'default'` branch must be a literal no-op (the file passes through unchanged). Diff all 20 hashes before trusting anything.
- **The reindent must be exact — guard against ragged input.** The depth-rescale assumes leading whitespace is a clean multiple of the source unit (Express: verified 0 non-2-multiple). Session 2 must assert this on every `.js` line before transforming; if any line is non-multiple, the transform must not silently produce a fractional/garbled indent — it errors (caught by a test). This is precisely why Spring (83 ragged lines) is excluded.
- **Touch leading whitespace only — never string content.** Operate strictly on the `^ +` prefix; do not reformat inside lines (which could alter a string literal). This keeps the language-spec meaning-guarantee valid.
- **Never format whitespace-significant or meaning-bearing files** — exclude `.yml`, `.sql`, `.json`, Dockerfile, `.md`, `.py`, `.go` from the transform by construction (the Express plugin only reindents its `.js`). A stray YAML reindent would change program meaning — the exact thing formatting must never do.
- **Core neutrality:** keep `CodingStyle` generic; `reindent` is generic string math; *which files are safe to reindent* is the Express plugin's decision — no per-language logic in the kernel.
- **Don't pull Day 12–14 forward** — no naming, no architecture depth, no wizard UI.
