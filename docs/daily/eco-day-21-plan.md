# Eco-Day 21 — PLAN: The slot mechanism (typed content slots) `[2 days]`

**Phase 2, Day 21. PLANNING ONLY.** This session writes this plan and nothing else — no implementation, no builds, no file changes except this plan. Day 21 is the **FIRST creative-side day** — a conceptual shift. Everything through Day 20 was **STRUCTURAL** (a definite right answer; software builds it whole). Day 21 introduces the **CREATIVE** half of the thesis for the first time: the generator emits a **byte-identical structural SHELL** with clearly-marked, **TYPED PLACEHOLDERS** (slots) where creativity is required — *"software builds the shell + a clearly-marked plug a human OR optional AI fills"* becoming real code. Day 21 builds **ONLY the slot MECHANISM — NOT the AI fill** (that's Day 23: detachable, developer-keyed, default-off). **`[2 days]` — staged, not compressed.**

**Read this session (required order):** [`../THRAKSHA-GUARDRAILS.md`](../THRAKSHA-GUARDRAILS.md) (§1.1 no baseline moves silently; §1.4 Law 21 standalone; §3 STOP-and-report; §4 honesty) → [`../THRAKSHA-ECOSYSTEM-PLAN.md`](../THRAKSHA-ECOSYSTEM-PLAN.md) §"structural-vs-creative division" (lines 35–43: *software builds the shell; a plug — human OR optional AI — fills the creative part*), §"Phase 2" (line 156), ADR-001 (no AI in generation) → [`../THRAKSHA-MONTH-2.md`](../THRAKSHA-MONTH-2.md) Day 21 (lines 35–37) + Day 23 (lines 40–42, what picks up the fill) → [`eco-day-20-report.md`](eco-day-20-report.md) (Phase 1 certified; the canonical `assembleBlueprint` seam is where new inputs attach; the gate set: 49 baked + 10 TeamTracker + non-hash gates) → the REAL generator (read this session).

**Git (for execute):** commit to `main`, no branches, no PRs.

> **Grounded this session (read from the REAL generator, not assumed):**
> - **The optional-layer pattern is established and proven FOUR times.** `versions` (Day 11), `integrations` (Day 17), `description` (Day 19), `style` (Day 14) are each an **additive `ProjectState` field** with: a getter/setter on `ProjectModel` (`core/project-model.ts`), a default that is a **literal bypass**, threading through `createProjectModel` (default) + `restoreProjectModel` (with a `?? default` back-compat for older snapshots), and an optional dimension on `BlueprintChoices` in `assembleBlueprint` (`core/assemble.ts`) that fires its setter **only when supplied**. **Slots follow this identical, already-validated path** — none of the prior four moved a frozen generated hash.
> - **`buildFileSet` already has the exact POST-PROCESS seam a slot needs** (`core/regen.ts` lines 88–104, the **Day-19 description insert**): after the plugin builds the shell, a neutral, technology-agnostic step optionally edits `README.md`; **BLANK/empty is a literal bypass** (README + backstop byte-identical). This is the model for rendering slot placeholders.
> - **`README.md` is the ONE universal, agnostic slot SITE** — every stack (`plugins/{spring,express,python,django,go}/templates/README.md`) emits it. Only **Spring** ships a frontend (`plugins/spring/templates/frontend/App.jsx`), so a landing-page slot would be **per-stack, not agnostic** — out of scope for a scoped Day 21 (Law 25 favours the agnostic README site; richer per-stack sites are additive later, same mechanism).
> - **No `day20:regress` gate hashes a frozen canonical STATE.** `canonicalStringify(getState())` appears ONLY in PART 1i as an **equality** check (`s1===s2===cli`, `n1===n2`) — never against a recorded state digest. So adding a `slots` key to `ProjectState` keeps PART 1i green (all sides gain the key) and **cannot** move a frozen hash; the frozen backstop is over **generated-file** digests (`buildFileSet` output), which empty slots do not touch.
> - **The detection-layer separation precedent (Day 18) is exactly the pattern for the content layer:** the detection report is **never imported by `src/core`/`src/plugins`** (0 refs, a re-verified invariant) — so no env value reaches generation. The **slot CONTENT layer** gets the same treatment: a separate module `buildFileSet`/plugins never import (0 refs), so content cannot perturb the shell **by construction**.

---

## 0. What Day 21 is — the conceptual shift (structural → creative)

| | STRUCTURAL (Days 0–20) | CREATIVE (Day 21+) |
|---|---|---|
| Who builds it | software, whole, byte-identical | software builds the **shell**; a **plug** (human OR optional AI) fills the creative part |
| Example | entities, CRUD, migrations, config | a landing-page tagline, a product overview, UI copy |
| Determinism | same input → same bytes | the **structural shell** is byte-identical **regardless of fill**; content is a **separate, detachable layer** |

Day 21 builds the **mechanism** for the creative half: a **typed slot** rendered as a clearly-marked placeholder in the shell, a **`type → component` map with an `UnknownSection` fallback**, and a **SEPARATE content layer keyed to slots** the shell never depends on. **No AI (Day 23 is the fill).**

---

## 1. THE DETERMINISM SPINE — the NEW load-bearing property (make it explicit)

Three requirements, all load-bearing:

1. **The structural SHELL is BYTE-IDENTICAL across empty / partial / full slot-CONTENT states.** This is the new crown-jewel property and the whole point of the creative layer being detachable (Law 21 for the creative path: no content → still a complete, valid shell). **PREFERRED proof: BY CONSTRUCTION** — `buildFileSet(model, plugin)` **never receives slot content** as an argument; content lives in a separate object the generation path does not import (0 refs, like Day-18 detection). So no content state can vary the shell — it is structurally impossible, not merely tested. The gate confirms it explicitly (empty/partial/full → identical shell hash) **and** the 0-refs grep proves the separation.
2. **A project WITH the slot mechanism (default: no slots declared) reproduces the frozen backstop byte-identical.** Slots are **ADDITIVE**; the default (empty `slots: []`) is a **literal bypass** (the README post-process is a no-op for empty slots, exactly like the Day-19 blank description). **Proof (execute):** `cd generator && rm -rf dist && npm run build && npm run day20:regress` → PASS, the full current set (49 baked + 10 TeamTracker + non-hash gates 1c/1e/1h/1i/1j) byte-identical. **A moved frozen hash = a FINDING, STOP** (never a re-baseline).
3. **NO AI anywhere (ADR-001).** Day 21 is the slot MECHANISM only — the shell + typed placeholders + the separate content layer. No AI fill (Day 23). The generator core stays pure-Node and AI-free. An **ADR-001 sweep** confirms no AI import/call in the slot mechanism.

---

## 2. THE ARCHITECTURAL RECOMMENDATION — declarations (structural) vs content (creative), split so determinism is safe BY CONSTRUCTION

Split the slot system into **two layers**, mirroring the proven structural/creative separations (Day-13 profile, Day-18 detection):

### 2.1 Slot DECLARATIONS — structural, part of the blueprint (drives the shell)
- A **`SlotDecl = { id: string; type: string }`** list. It answers *"which slots exist and what TYPE is each"* — structural intake, like entities/style. It attaches as an **additive `ProjectState` field `slots: SlotDecl[]`** (default `[]`), with `getSlots`/`setSlots` on `ProjectModel`, threaded through `createProjectModel` (default `[]`) + `restoreProjectModel` (`state.slots ?? []` back-compat) + an optional `slots?` on `BlueprintChoices` in `assembleBlueprint` (fires `setSlots` only when supplied). **The identical path versions/integrations/description already took.**
- Declarations DRIVE the shell: `buildFileSet` renders a **typed placeholder** per declared slot (§2.3). Declaring slots is a **new additive baseline** (the README gains a placeholder section); the default (no slots) is the **literal bypass** (frozen backstop).

### 2.2 Slot CONTENT — creative, a SEPARATE layer the shell never imports
- A separate module (e.g. `core/slot-content.ts`) defining **`SlotContent = Record<slotId, { value: string }>`** + an **`emptyContent(decls)`** scaffold builder. This is the schema the **Day-23 fill** produces (a human or the optional, detachable, developer-keyed AI writes it).
- **It is NEVER imported by `buildFileSet`/plugins** (0 refs — a re-verified invariant, exactly like the detection report). So the shell is a pure function of (structural model incl. declarations), **independent of content by construction** — requirement (1) holds structurally, not by luck.

### 2.3 The shell placeholder + the `type → component` map + `UnknownSection` (the mechanism)
- The **slot SITE (scoped, agnostic): `README.md`** — a `buildFileSet` post-process mirroring the Day-19 description insert. When `slots.length > 0`, append a clearly-marked **"Content slots"** section; each slot renders via the map. Empty `slots` ⇒ **no section ⇒ literal bypass** (README + backstop byte-identical). *(Only the README — universal — is touched; the runnable CODE/shell is literally untouched by slots in Day 21, the most determinism-safe scoping. Richer per-stack sites, e.g. a frontend landing page, are additive later using this same mechanism.)*
- The **`type → component` map**: `SLOT_RENDERERS: Record<string, (decl: SlotDecl) => string>` — each renders a clearly-marked, valid-markdown placeholder block (an HTML comment marker `<!-- THRAKSHA-SLOT id=… type=… (creative — fill in the content layer; EMPTY IS VALID) -->` + a visible blockquote TODO). **1–2 known proof types** (e.g. `tagline`, `overview`), each with a distinct placeholder ("component").
- **`UnknownSection` fallback**: `renderSlot(decl) = (SLOT_RENDERERS[decl.type] ?? unknownSection)(decl)` — an unknown type renders a generic, clearly-marked "unrecognized slot type — fill manually" placeholder. **Graceful, never a throw, never a silent drop.**
- Every placeholder is **valid markdown that breaks nothing** (README is documentation) → the shell is **complete and valid with slots empty** (Law 21, creative path).

> **Why this is determinism-safe (the spine restated):** the content layer has **no write-path into `buildFileSet`** (0 refs). The shell is rendered from **declarations only**. Therefore the shell is byte-identical across all content states **by construction**, the default (no declarations) reproduces the frozen backstop, and no AI is anywhere near the generation path.

---

## 3. What the plan resolves (the five questions, answered from the real generator)

1. **WHERE do slots attach?** The scoped, agnostic creative SITE is **`README.md`** (universal across all 5 stacks; already a `buildFileSet` post-process seam — Day 19). Candidate creative regions enumerated: the README tagline/overview (chosen), and — noted but OUT of scope for Day 21 — the Spring frontend landing copy (per-stack, not agnostic). **Scoped: the mechanism + 1–2 proof slot types at the README site**, not every possible slot.
2. **HOW is a slot represented in the shell?** A **clearly-marked typed placeholder** (HTML-comment marker + visible TODO blockquote) rendered by the `type→component` map. **It stays VALID with the slot empty** because it is inert markdown documentation — it breaks no build and touches no runnable code; the placeholder is byte-identical whether or not content exists.
3. **WHERE does slot content live?** In the **SEPARATE `SlotContent` layer** (`core/slot-content.ts`), keyed by slot ID — **NOT** in the structural templates, **NOT** an argument to `buildFileSet`, **NOT** imported by the generation path (0 refs). Fill (Day 23) writes only this layer.
4. **The `type → component` map + `UnknownSection`:** the map selects a placeholder renderer by the slot's TYPE; an unknown type falls back to `UnknownSection` (a graceful generic placeholder — no throw, no silent drop).
5. **Shell-byte-identical-across-slot-states — by construction or explicit?** **BY CONSTRUCTION** (preferred, per the prompt): the content layer never touches `buildFileSet` (a 0-refs invariant, like Day-13 profile / Day-18 detection). The gate proves it explicitly too (empty/partial/full → identical shell hash) as a guard that can actually fail if the separation is ever broken.

---

## 4. STAGING (`[2 days]`) + done-conditions

Top of each execute prompt, verbatim: **"STOP and report rather than write a clean-looking close if a proof fails."**

### Stage 1 — the DECLARATION layer + the shell placeholder mechanism + the default-bypass gate (structural half)
- **DC-1:** slot **declarations** — `SlotDecl`, the `slots: SlotDecl[]` `ProjectState` field + `getSlots`/`setSlots` + `createProjectModel`/`restoreProjectModel` threading (`?? []` back-compat) + the `slots?` dimension on `BlueprintChoices`/`assembleBlueprint` (setter fires only when supplied). The **`type→component` map + `UnknownSection`** + the **README post-process** in `buildFileSet` (append the "Content slots" section when `slots.length > 0`; empty ⇒ bypass).
- **DC-2 (STRUCTURAL BASELINE PRESERVED — load-bearing):** `rm -rf dist && npm run build && npm run day20:regress` → **PASS**, the full set (49 baked + 10 TeamTracker + non-hash) byte-identical. The default (no slots) is a literal bypass; PART 1i stays green (the new `slots:[]` key added on all sides keeps `s1===s2===cli`). **A moved hash = a finding, STOP.**
- **DC-3 (the additive baseline):** a project with slots **DECLARED** (content empty) → a complete, VALID structural shell (Law 21 creative path — inert markdown placeholders, runnable code untouched) that generates **twice-identical**; record its **own new baseline** (a new **PART 1k** in `day20:regress` + a `slots-demo`, additive). Include an **unknown-type** slot to prove the `UnknownSection` fallback in real output.

### Stage 2 — the SEPARATE content layer + the by-construction invariance proofs + the ADR-001 sweep (creative-separation half)
- **DC-4:** the **separate content layer** — `core/slot-content.ts` (`SlotContent` + `emptyContent(decls)`), the Day-23 fill target. **NOT imported by `buildFileSet`/plugins.**
- **DC-5 (SHELL BYTE-IDENTICAL ACROSS SLOT STATES — load-bearing, by construction):** with a slots-declared model fixed, construct `SlotContent` in **empty / partial / full** states and assert **`buildFileSet(model, plugin)` is byte-identical across all three** (trivially true — content is not an argument; proven explicitly as a guard) **AND** a **0-refs grep** (`slot-content`/`SlotContent`/`emptyContent` absent from `src/core/regen.ts` + `src/plugins`) proves the separation structurally (mirror Day-18's detection 0-core-refs).
- **DC-6 (ADR-001 no-AI sweep + invariants):** no AI import/call anywhere in the slot mechanism (declarations, map, content layer); generator stays **pure-Node** (`deps {}`, 0 native modules); **no frozen hash moved** (default path); **content layer has 0 write-path into generation** (DC-5 grep). Content **INFORMS the future fill**, it never mutates the shell.

**Execute scope guard (every stage):** just the slot **MECHANISM** (typed placeholders + `type→component` map + `UnknownSection` + the separate content layer). **NOT** the AI fill (Day 23). **NOT** has-many/decimal/field-key (Days 25/27/29). **No frozen hash moves on the default path** (a moved hash is a finding, STOP). **The content layer must NOT touch `buildFileSet`** (shell byte-identical across slot states BY the separation). **No AI. No signing.** Commit to `main`. Don't compress the 2 days — if the mechanism + the content layer + the proofs need multiple passes, stage honestly.

---

## 5. REPORT — done-conditions

[`eco-day-21-report.md`](eco-day-21-report.md): the slot **mechanism** (the typed placeholder + the `type→component` map + `UnknownSection` + the SEPARATE content layer keyed to slots); the **shell-byte-identical-across-slot-states proof** (by construction — content never an argument to `buildFileSet`; 0-refs verified; empty/partial/full → identical shell hash); the **structural-baseline-preserved proof** (default no-slots = the frozen 49+10+non-hash byte-identical); the **valid-shell-with-empty-slots proof** (Law 21 creative path — declared-but-empty → a complete valid shell + its own additive baseline, incl. the `UnknownSection` fallback in real output); the **ADR-001 no-AI sweep**; **invariants** (pure-Node, no frozen hash moved, content-layer 0 write-path into generation). **Forward-flags:** `[2 days]` scope status (done vs pending); **determinism ≠ validity** (the shell is byte-identical and valid; the slot CONTENT's *quality* is a creative concern, not a generation guarantee); the scoping note (README site proven; richer per-stack sites additive later); what **Day 23** picks up (the optional, **detachable, developer-keyed AI FILL** that writes ONLY slot content, never structure — generation always runs first, shell + empty slots; delete the key/layer → the project still generates completely).

---

## 6. Scope guard — OUT for Day 21
- Just the slot **MECHANISM** (typed placeholders + `type→component` map + `UnknownSection` + separate content layer). **NOT** the AI fill (Day 23). **NOT** has-many/decimal/field-key (Days 25/27/29). **NOT** per-stack frontend/landing-page slot sites (additive later; Day 21 is the agnostic README site).
- **Do NOT move any frozen hash on the default path (no slots)** — it MUST be byte-identical. A moved hash = a finding, STOP.
- **The slot content layer must NOT touch the structural shell / `buildFileSet`** (the shell is byte-identical across slot states BY the separation). No content write-path into generation.
- **NO AI** (Day 21 is the mechanism; AI fill is Day 23). No signing.
- **`[2 days]`** — don't compress; if the mechanism + proofs need multiple passes, stage honestly.

---

## 7. Pre-flight checklist (GUARDRAILS §6) — for the execute + report sessions
1. Read guardrails + ecosystem (structural-vs-creative + ADR-001) + Month-2 Day 21/23 + Day-20 report + the real generator? — ✅ (this session).
2. Only Day-21's job (the slot mechanism)? — yes; **not** the AI fill, **not** depth features, **not** per-stack sites.
3. Which frozen baselines must NOT move? — **all** (49 baked + 10 TeamTracker + non-hash gates). Default (no slots) is a literal bypass; `day20:regress` byte-identical before/after.
4. New AI touchpoints? — **none** (ADR-001; Day 21 is the mechanism only — the ADR-001 sweep is DC-6).
5. Default/empty path a literal bypass? — **yes**: empty `slots: []` ⇒ the README post-process is a no-op ⇒ frozen backstop byte-identical (the exact Day-19-blank-description pattern).
6. Three killers checked? — no clock/RNG/UUID in the placeholder rendering (declaration-order, pure string templates); LF only (append LF-normalized markdown); stable order (slots render in declared order). Content never enters generation (the #1 discipline this day).
7. A gate that can actually FAIL? — **DC-2** (a moved default hash ⇒ slots leaked into the frozen shell), **DC-5** (shell hash varies across content states ⇒ the content layer touched `buildFileSet`, or the 0-refs grep is non-zero), **DC-3** (declared-but-empty shell invalid or non-twice-identical), **DC-6** (an AI import in the mechanism / a native module). Report honestly if any fails.
8. Overclaim / scope drift? — the live risks: (i) letting slot CONTENT reach `buildFileSet` (breaks shell invariance — must be 0-refs by construction); (ii) a moved default hash silently re-baselined (§3 — a finding, STOP); (iii) claiming the slot mechanism is "AI-ready" as if AI were present (it is NOT — Day 23); (iv) implying the shell is byte-identical *and* the content is deterministic/"correct" (determinism ≠ validity — the shell is deterministic; slot content quality is a creative concern); (v) drifting into per-stack landing-page slots (out of scope — README only) — all guarded.

---

*Day 21 makes the creative half of the thesis real for the first time — as a MECHANISM, no AI. The generator emits a byte-identical structural shell with clearly-marked, TYPED placeholders (a `type→component` map with an `UnknownSection` fallback) at an agnostic README site, and slot CONTENT lives in a SEPARATE layer the generation path never imports — so the shell is byte-identical across empty/partial/full content states BY CONSTRUCTION, exactly as the Day-13 profile and Day-18 detection layers are quarantined from generation. The default (no slots) is a literal bypass reproducing the frozen backstop; a slots-declared project produces its own additive baseline and a complete, valid shell with slots empty (Law 21, creative path). No AI, no frozen hash moved, the core stays pure-Node. Day 23 picks up the optional, detachable, developer-keyed AI FILL that writes ONLY the separate slot content — never the structure.*
