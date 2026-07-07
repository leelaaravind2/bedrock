# Eco-Day 21 — REPORT: The slot mechanism (typed content slots) `[2 days]`

**Phase 2, Day 21 — the FIRST creative-side day.** Everything through Day 20 was **STRUCTURAL** (a definite right answer; software builds it whole). Day 21 makes the **CREATIVE** half of the thesis real for the first time — *as a MECHANISM, no AI*: the generator emits a **byte-identical structural SHELL** with clearly-marked, **TYPED PLACEHOLDERS** (slots), and slot **CONTENT lives in a SEPARATE layer the shell never imports**. The AI fill is **Day 23** (detachable, developer-keyed, default-off) — **not** this day.

Plan: [`eco-day-21-plan.md`](eco-day-21-plan.md). Guardrails: [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §1.4 Law 21; §3 STOP-and-report; §4 honesty). Thesis: [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §structural-vs-creative + ADR-001. Builds on [`eco-day-20-report.md`](eco-day-20-report.md) (the `assembleBlueprint` seam; the 49-baked + 10-TeamTracker + non-hash gate set) and the 4×-proven optional-field pattern (versions/integrations/description/style).

---

## THE VERDICT

> ✅ **The slot MECHANISM lands, determinism-safe BY CONSTRUCTION.** Slot **declarations** (`SlotDecl{id,type}`) are an **additive `ProjectState.slots` field** (the identical path versions/integrations/description/style took); they drive a **`type→component` map with an `UnknownSection` fallback** that renders clearly-marked, **INERT** typed placeholders into the universal `README.md` (via the Day-19 post-process seam). Slot **CONTENT** lives in a **SEPARATE layer** (`core/slot-content.ts`) that the generation path **NEVER imports** — so the structural shell is **byte-identical across empty/partial/full content states BY CONSTRUCTION** (content is not an argument to `buildFileSet`; **0 refs** in `regen`/plugins — the Day-18 detection-separation pattern). The **default (no slots) is a literal bypass**: the frozen backstop reproduces **byte-identical** (49 baked + 10 TeamTracker + non-hash gates). A slots-declared project produces its **own additive baseline** and a **complete, valid shell with slots empty** — only the README gains inert docs; **the runnable code is byte-identical to the no-slots default** (Law 21, creative path). **NO AI anywhere** (ADR-001 sweep clean); generator stays **pure-Node**; **no frozen hash moved**.
>
> **Day 23 picks up the optional, detachable, developer-keyed AI FILL** — it writes ONLY the separate slot content, never structure.

Every DC passed. `day20:regress`: **69 OK / 0 FAIL**, **50 baked digests** (was 49; +1 SLOTS baseline; the 49 frozen unchanged).

---

## 1. The benchmark result (Execute DCs)

### Stage 1 — declaration layer + placeholder mechanism + default-bypass

**DC-1 — the slot DECLARATION layer ✅.** `SlotDecl{id,type}` ([core/slots.ts](../../generator/src/core/slots.ts)); an additive `slots: SlotDecl[]` field on `ProjectState` with `getSlots`/`setSlots` on `ProjectModel`, threaded through `createProjectModel` (default `[]`), `restoreProjectModel` (`state.slots ?? []` back-compat), and an optional `slots?` dimension on `BlueprintChoices`/`assembleBlueprint` (fires `setSlots` only when supplied). The **`type→component` map** (`SLOT_RENDERERS`) + **`UnknownSection`** fallback + the **README post-process** in `buildFileSet` (append the "Content slots" section when `slots.length > 0`; empty ⇒ `renderSlotsSection` returns `''` ⇒ no-op).

**DC-2 — DEFAULT = LITERAL BYPASS (load-bearing) ✅.** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full backstop byte-identical: **49 baked** (43 frozen + 5 version + 1 MAXIMAL) + **10 TeamTracker** + non-hash gates 1c/1e/1h/1i/1j. Adding the `slots` field moved **no** frozen hash — the backstop hashes generated **files** (empty slots ⇒ no README change), and PART 1i's `canonicalStringify(getState())` is an **equality** check (`s1===s2===cli`), so the new `slots:[]` key added on all sides keeps it green. **No hash moved.**

**DC-3 — the slots-DECLARED additive baseline ✅ (new PART 1k).** An Express|PostgreSQL DemoApp with slots `[tagline, overview, mystery]` declared (content empty) → generated **twice-identical** → recorded as a **new additive baseline** `f85da4db…` (differs from the no-slots default `a437a302…`; never replaces a frozen hash). **Law 21 (creative path):** vs the default, **ONLY `README.md` changes** — the runnable code shell is **byte-identical**; slots add only inert markdown documentation. The `type→component` map renders `tagline`/`overview`, and the **`UnknownSection` fallback** renders `mystery` (unknown type) gracefully — visible in the real output, LF only.

### Stage 2 — separate content layer + by-construction invariance + no-AI sweep

**DC-4 — the SEPARATE content layer ✅.** [core/slot-content.ts](../../generator/src/core/slot-content.ts): `SlotContent = Record<slotId, {value}>`, `emptyContent(decls)` (the empty scaffold), `contentFillState(decls, content)` (empty/partial/full inspection). This is the Day-23 fill target — a plain data layer.

**DC-5 — SHELL BYTE-IDENTICAL ACROSS SLOT STATES (by construction) ✅.**
- **By construction:** the content layer is **never imported by the generation path** — `grep` for actual `slot-content` imports in `src/core/regen.ts` + `src/plugins` → **0** (the single textual hit is a *comment* on `regen.ts:114` explaining the separation). `SlotContent` is never a parameter to `buildFileSet`. Content **cannot** vary the shell.
- **Empirically (PART 1k):** with declarations fixed, three `SlotContent` states — **empty / partial / full** — all yield the **same shell hash** `f85da4db…` (the content states are inspected by the separate layer, never passed to `buildFileSet`).

**DC-6 — ADR-001 no-AI sweep + invariants ✅.** No AI/network reference anywhere in the slot mechanism (`slots.ts`, `slot-content.ts`) → **0**. Generator **pure-Node** (`dependencies: {}`, **0** native modules); **no frozen hash moved** (default path); content layer has **0 write-path** into generation (DC-5).

**Round-trip (store safety) ✅.** A slots-declared model round-trips `getState() → restoreProjectModel → buildFileSet` **byte-identical**; a legacy snapshot with no `slots` key restores to `slots: []` (back-compat — older versions regenerate byte-for-byte).

---

## 2. What the mechanism is (the shape)

- **Declarations (structural, in the blueprint):** `slots: SlotDecl[]` on `ProjectState`. Which slots exist + each's TYPE. Default `[]` = literal bypass. Drives the shell.
- **The `type→component` map + `UnknownSection`:** `renderSlot(decl) = (SLOT_RENDERERS[decl.type] ?? unknownSection)(decl)`. Known types (`tagline`, `overview`) render distinct inert placeholders; an unknown type falls back to a graceful, clearly-marked "unrecognized type — fill manually" block (never a throw, never a silent drop).
- **The placeholder (in the shell):** a clearly-marked HTML-comment marker (`<!-- THRAKSHA-SLOT id="…" type="…" — … EMPTY IS VALID … -->`) + a visible TODO blockquote, appended to `README.md`. Inert markdown — breaks no build, touches no runnable code; byte-identical whether or not content exists.
- **Content (creative, SEPARATE):** `SlotContent` in `slot-content.ts`, keyed by slot id — the Day-23 fill target. Never imported by generation. The shell is content-invariant by construction.

---

## 3. What changed

- **New:** [`generator/src/core/slots.ts`](../../generator/src/core/slots.ts) (declarations + `type→component` map + `UnknownSection` + `renderSlotsSection`), [`generator/src/core/slot-content.ts`](../../generator/src/core/slot-content.ts) (the separate `SlotContent` layer).
- **Model:** `generator/src/core/project-model.ts` (+`slots` field on `ProjectState`, `getSlots`/`setSlots`, `makeModel`/`createProjectModel`/`restoreProjectModel` threading with `?? []` back-compat).
- **Seam:** `generator/src/core/assemble.ts` (+optional `slots?` on `BlueprintChoices`).
- **Generation:** `generator/src/core/regen.ts` (+the README slots post-process — the ONLY generation-path touch, guarded by `slots.length > 0`).
- **Harness:** `generator/src/day20-regression.ts` (+PART 1k — the slots-declared baseline, the Law-21 only-README proof, the `UnknownSection` fallback, the by-construction empty/partial/full invariance; +imports).
- **Templates / plugins — UNTOUCHED.** No per-stack change; the README post-process is agnostic (Law 25). No AI, no new deps, no native module.

---

## 4. Forward-flags & honest boundaries

- **`[2 days]` scope status — DONE:** the slot MECHANISM (typed placeholders + `type→component` map + `UnknownSection` + the separate content layer + all four determinism proofs) is complete. **PENDING (out of scope, flagged):** the **AI FILL** (Day 23).
- **Scoped to the universal README site.** Day 21 proves the mechanism at `README.md` (agnostic, every stack). **Per-stack landing-page / frontend-copy slots** (e.g. the Spring `App.jsx`) are **out of scope** — additive later using this same `type→component` map (only Spring ships a frontend, so those are per-stack, not agnostic).
- **Determinism ≠ validity (restated for the creative path):** the shell is byte-identical **and** valid with slots empty. The **quality** of eventual slot CONTENT is a creative concern — never a generation guarantee. A filled slot is *content*, not *proof the copy is good*.
- **What Day 23 picks up:** the optional, **detachable, developer-keyed AI FILL** — a narrow `fillSlot(spec) → content` interface, default OFF, the developer's own key/bill (the Day-18 detachable pattern). Generation ALWAYS runs first (shell + empty slots); the fill is a POST-step that writes **ONLY** the separate `SlotContent` layer, **never** structure. Delete the key/layer → the project still generates completely (Law 21). The mechanism is already shaped for it: `SlotContent` is the target; the shell is content-invariant, so the fill cannot perturb it.
- **v0.1 depth limits still stand** (has-many/decimal/field-key — Days 25/27/29); signing → Phase 4. Phase 1's carried boundaries (packaged-path Rust detect pending, macOS/Linux desktop build deferred, 3-OS CI user-confirmed) are unchanged — Day 21 added no generation feature to the structural core, only a creative *mechanism*.

---

**Day 21 verdict, restated:** the creative half of the thesis is real for the first time — a MECHANISM, no AI. The generator emits a byte-identical structural shell with clearly-marked, TYPED placeholders (a `type→component` map with an `UnknownSection` fallback) at the universal README site, and slot CONTENT lives in a SEPARATE layer the generation path never imports — so the shell is byte-identical across empty/partial/full content states **by construction**, exactly as the Day-13 profile and Day-18 detection layers are quarantined from generation. The default (no slots) is a literal bypass reproducing the frozen backstop (49 baked + 10 TeamTracker + non-hash, byte-identical from clean); a slots-declared project records its own additive baseline (`f85da4db…`, +1 → 50 baked) and yields a complete, valid shell with slots empty — only inert README documentation added, the runnable code byte-identical to the default. NO AI (ADR-001 sweep clean), generator pure-Node, no frozen hash moved. Day 23 picks up the optional, detachable, developer-keyed AI fill that writes ONLY the separate slot content — never the structure.
