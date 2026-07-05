# Day 12 — Plan: Coding-style engine — the SECOND option: `namingConvention`

**Session 1 of 3 — PLANNING ONLY. No implementation, no code edits this session. Output: this file.**

Day 12 adds the **second** coding-style option — `namingConvention` (`default` / `camelCase` / `snake_case`) — onto the engine Day 11 already built and proved. **No new machinery.** Day 11 delivered the neutral `CodingStyle` in [`src/core/style.ts`](../../generator/src/core/style.ts), the no-op default, threading via `EntityGenerationContext.style`, and a per-plugin `formatFiles` post-pass. Formatting is a whitespace post-pass; **naming touches identifiers, so it is applied DURING codegen via `context.style` in each plugin's serialization step — never a post-pass.**

Reads honored: [`docs/CONSTITUTION.md`](../CONSTITUTION.md) (esp. **Law 25** — the kernel holds no technology-specific logic), [`docs/adr/`](../adr) (ADR-001 no AI, ADR-002 file separation, ADR-003 determinism), [`docs/21-DAY-PLAN.md`](../21-DAY-PLAN.md) (Days 11–14), [`day-11-report.md`](day-11-report.md) (the proven engine being reused), [`week-01-summary.md`](week-01-summary.md) (the full 20-hash digests — the blocking backstop).

Grounding: this session read the **actual serialization code of all five plugins** (`plugins/{go,spring,express,python,django}/entity-codegen.ts`) plus [`core/plugin.ts`](../../generator/src/core/plugin.ts), [`core/project-model.ts`](../../generator/src/core/project-model.ts), and [`core/regen.ts`](../../generator/src/core/regen.ts). The per-stack token tables in §4 are read off the real code, not assumed.

---

## 1. CRITICAL FRAMING (unchanged from the whole style arc)

Every style option is a **finite, explicit, deterministic switch**: same model + same style → byte-identical output, **always** (ADR-003). No probabilistic "code personality." The **default** style must reproduce all **20 recorded hashes** byte-for-byte — the blocking gate that proves naming is purely additive. `default` is not "coincidentally equal" to the current output; the transform is genuinely **bypassed** on the default path.

---

## 2. Precise scope — what `namingConvention` governs

- **Values:** `'default' | 'camelCase' | 'snake_case'`. Default (and absent) ⇒ `'default'`.
- **GOVERNS:** the **JSON API serialization KEY** of the entity's **OWN DECLARED scalar fields**, and *only* that key. The **canonical source** of the name is the field's **declared name in the Project Model** (`Field.name`).
  - `'camelCase'` ⇒ key = `camelCase(declaredName)`
  - `'snake_case'` ⇒ key = `snake_case(declaredName)`
  - `'default'` ⇒ each stack emits exactly the key its codegen produces today — **NO transform** (bypassed).
- **Applied at each stack's SERIALIZATION mechanism only** (see §4 for exact tokens):
  - **Go:** the struct field's `json:"<key>"` tag.
  - **Spring:** `@JsonProperty("<key>")` on the DTO field.
  - **Express:** the response object key (`rowToObject`) **AND** the request read key (`dto` validate) — **moved together**.
  - **FastAPI:** Pydantic field `alias="<key>"` (+ `populate_by_name` / `model_config` so both directions work).
  - **Django:** DRF serializer field named `<key>` with `source="<attr>"`.
- **DOES NOT GOVERN** (leave each at its current per-stack default): **DB column names** (SQL stays `snake_case` always), `id`, **audit fields** (`created_at`/`updated_at`, `createdAt`/`updatedAt`), **belongs-to FK keys** (`applicationId`/`teamId` etc.), **owner/multi-user fields** (`owner_id`/`ownerId`/`owner`), and any **language-forced internal identifier**. Naming sets the **wire NAME** of a declared field — **never** the internal attribute name, **never** the DB column, **never** the attribute↔column mapping.

---

## 3. The two risks the plan explicitly guards

### Risk 1 — field↔column mapping must survive
The rename moves the **WIRE KEY only**; the internal **attribute↔column mapping stays intact**. A mistake here **generates fine but FAILS AT RUNTIME.** Per stack, the exact token that changes vs. must-not-change is enumerated in §4. Headline invariants:
- **Express:** transform the response key + request key **together**, but keep `row.<column>` accessor, the internal `data.<declaredName>` dto→repository contract, and SQL columns `snake_case`.
- **FastAPI:** add an **alias** — do **NOT** rename the Python attribute (renaming it breaks the SQLAlchemy `Model(**data)` mapping). **See §4.4 — this stack has a latent multi-word bug the default path must also fix.**
- **Go:** `json` tag only; Go identifier + DB column untouched.
- **Spring:** `@JsonProperty` only; Java DTO field name (used by getters/setters/`applyTo`/`fromEntity`) + `@Column(name=…)` untouched.
- **Django:** serializer field + `source` only; model attribute + column untouched.

### Risk 2 — the single-word blind spot
Every current demo declared field is **single-word** (`title`, `code`, `priority`, `done`, `name`, `email`, …), so it is **invariant under any naming convention** — `camelCase`/`snake_case`/`default` all produce the same key. **The 20-hash matrix structurally cannot detect a bad `default`-path transform.**

**Guard:** add a **multi-word demo model** — a `Task` entity with `dueDate` and `isUrgent` (single entity, relationship-free), as a new `src/task-model.ts` — and generate it under `'default'` to confirm each stack emits the declared field keys **VERBATIM** (`dueDate`, `isUrgent`), i.e. the transform is genuinely bypassed on default. This catches what the 20-hash matrix can't.

Recommended `Task` shape (mirrors [`demoapp-model.ts`](../../generator/src/demoapp-model.ts)):

```ts
// src/task-model.ts  — multi-word field names are the whole point.
model.addEntity({
  name: 'Task',
  fields: [
    { name: 'dueDate',  type: 'DateTime', required: true }, // multi-word, required
    { name: 'isUrgent', type: 'Boolean' },                  // multi-word, optional
  ],
});
```

- **`multiUser: true`** is recommended for `Task` so the output contains `ownerId`/`owner` alongside `createdAt`/`updatedAt` — this lets Session 3 *prove* the owner + audit keys keep their frozen representations even under `snake_case` (the documented known-limitation in §7).
- `Task` is a **new** model → it has **no frozen hash**, so anything it exposes about multi-word default behaviour is a discovery to record, not a regression.

---

## 4. Per-stack mechanism — exactly which token changes, which must NOT

A single neutral core helper produces the wire key from the declared name; each plugin calls it only at its serialization boundary. Notation: `wire(f)` = `applyNaming(f.name, ctx.naming)` (= `f.name` when `naming === 'default'`).

### 4.1 Go — `plugins/go/entity-codegen.ts` — one concept, two emission points (clean)
- **CHANGE:** the argument to `jsonTag(...)` for the entity's own declared scalar fields, in **both**:
  - `buildModel` response struct: `jsonTag(f.name)` → `jsonTag(wire(f))` (line ~189).
  - `buildValidate` `${name}Input` request struct: `jsonTag(f.name)` → `jsonTag(wire(f))` (line ~401). Moved together with the response.
- **MUST NOT change:** `goFieldName(f)` (exported Go identifier — used in `scanArgs`, `writeVals`, `toEntity`), `columnName(f)` (DB column — `columns` const, `store.go`, migration), `jsonTag('id'|'ownerId'|'createdAt'|'updatedAt')`, and `fkJsonKey(r)` (FK wire keys). The required-FK validation message uses `fkJsonKey(r)` — untouched.
- Staging: **one-spot concept → land fully.**

### 4.2 Spring — `plugins/spring/entity-codegen.ts` — add an annotation (clean)
- Today Spring emits **no** `@JsonProperty`; Jackson serializes by the DTO Java field name (= `f.name`). So the wire key today == the declared name.
- **CHANGE:** in `buildDto`, on each **declared-field** DTO property (the `fieldDecls` loop, lines ~353–359), prepend `@JsonProperty("<wire(f)>")` — **only when `wire(f) !== f.name`.** Add the import `com.fasterxml.jackson.annotation.JsonProperty` **only when at least one annotation is emitted.** ⇒ `default` (and every single-word field) emits **nothing** ⇒ 20 hashes frozen.
- **MUST NOT change:** the Java DTO field name `f.name` (drives `get<Cap>`/`set<Cap>`, `fromEntity`, `applyTo`, and the entity `accessors`), `columnName(f)` in `@Column(name=…)` on `${Entity}Base`, the `id`/`ownerId`/`createdAt`/`updatedAt` DTO props, and the FK props (`fkFieldName`).
- Staging: **one-spot annotation → land fully.**

### 4.3 Express — `plugins/express/entity-codegen.ts` — response key + request key, moved together (clean)
- **CHANGE (both, together):**
  - **Response key** — `buildRepository` → `rowToObject` mapping (line ~238): `${f.name}: row.${columnName(f)}` → `${wire(f)}: row.${columnName(f)}`. **LHS wire key transforms; `row.<column>` accessor unchanged.**
  - **Request read key** — `buildDto` / `validationLinesFor` (lines ~363–392): the reads `body.${f.name}` → `body.${wire(f)}`.
- **MUST NOT change:**
  - `columnName(f)` — the SQL column and the `row.<column>` accessor.
  - The **internal `data.<declaredName>` key** written by the dto (`data.${f.name} = …`, line ~392) — because the repository's `writeVals` reads `data.${f.name}` (line ~232). This is the dto→repository contract and is **not** a wire key; keep it as the declared name so the mapping holds.
  - `fkDataKey(r)` (FK keys), `ownerId`/`id`/`createdAt`/`updatedAt` in `rowToObject`, the SQL migration.
  - The `${slug}.model.js` field-metadata array (`name: '<f.name>', column: '<column>'`) — this **documents the declared name**, is not read at runtime for serialization, and is left as the declared name (not a wire key).
- **Sub-decision for Session 2 (name it, then be consistent):** the validation **error message** strings (`'${n} is required'`, etc.) derive from `n = f.name`. Recommendation: use `wire(f)` in these messages (the client only ever saw the wire key, so an error naming a key it did not send is confusing). This is cosmetic but must be **deterministic and consistent** with the request read key.
- Staging: **two-spot, same stack → land fully.**

### 4.4 FastAPI — `plugins/python/entity-codegen.ts` — alias plumbing (HEAVIER + a latent-bug fix)
**Discovery (this session):** the Pydantic schema field name is currently `f.name`, while the SQLAlchemy model **attribute** is `columnName(f)` (`snake_case`). For single-word fields these coincide; **for a multi-word field they diverge and `repository.insert_*` does `${Name}(**data)`, which raises at RUNTIME** because the dict key (`dueDate`) is not a model attribute (`due_date`). This is exactly the **single-word blind spot** (Risk 2) hiding a **field↔column** break (Risk 1). Day 12 must fix it *as part of* landing FastAPI naming.

- **Mechanism:**
  1. Make the Pydantic `Create`/`Read` field name (the **Python attribute**) `columnName(f)` (the `snake_case` ORM attribute). **Byte-identical for single-word** (`snake_case` of a single lowercase word is itself) ⇒ 20 hashes frozen.
  2. Express the wire key via `Field(alias="<wire(f)>")`, merged into the existing `Field(...)` call (which may already carry `max_length`). Add `populate_by_name=True` to the `model_config` of **both** `Create` and `Read` (`Read` already has `from_attributes=True`).
  3. **Emit the alias + `populate_by_name` ONLY when `wire(f) !== columnName(f)`** ⇒ single-word `default` emits no alias and no config change ⇒ **no-op ⇒ 20 hashes frozen.**
- **Directional correctness:**
  - **Input:** the router already calls `payload.model_dump()` (dumps by **attribute** name = `snake_case`) → matches `${Name}(**data)`. Leave the router as-is. `populate_by_name=True` lets a client also send the attribute name, but the alias is the wire contract.
  - **Output:** FastAPI serializes response models with `response_model_by_alias=True` **by default**, so the wire key = the alias. Confirm this default in Session 2 (no router change expected).
- **Under default:** single-word ⇒ no alias (frozen). Multi-word `Task` under default ⇒ `wire(f) = dueDate`, attribute = `due_date`, so an alias `dueDate` **is** emitted (+ `populate_by_name`), which simultaneously (a) fixes the latent ORM mismatch and (b) emits the declared key **verbatim** on the wire. `Task` has no frozen hash, so this is acceptable and is recorded as a fix.
- **MUST NOT change:** the SQLAlchemy column/attribute derivation for the **model** (`columnName(f)` in `buildModel`), the migration, `id`/`owner_id`/`created_at`/`updated_at`, FK columns (`fkColumnName`).
- Staging: **heavier (serializer plumbing) → aim to land; honest-stage if it runs long.**

### 4.5 Django — `plugins/django/entity-codegen.ts` — serializer `source` (HEAVIEST)
**Discovery (this session):** the Django model **attribute** is currently `f.name`, and Django derives the **DB column** from the attribute, so a multi-word declared field yields a **camelCase column** (`dueDate`) in Django — diverging from every other stack's `due_date`, and from "DB stays `snake_case` always." DRF `ModelSerializer` uses the model attribute as both the serializer field name and the wire key.

- **Mechanism (wire key):** keep the model attribute as the canonical Python attr; in `buildSerializer`, declare an **explicit** field `<wire(f)> = serializers.<Type>Field(source="<attr>")` and place `<wire(f)>` in `Meta.fields` in place of `<attr>`. DRF **forbids** `source` equal to the field name (assertion error at import), so emit the explicit field + `source` **ONLY when `wire(f) !== attr`** ⇒ single-word `default` declares nothing ⇒ **byte-identical ⇒ 20 hashes frozen.** This requires a small **logical-type → DRF-field-class** map (`CharField`/`IntegerField`/`BooleanField`/`DateField`/`DateTimeField`/`DecimalField`, honoring `required`/`allow_null`) — the extra plumbing that makes Django the heaviest.
- **Column-consistency decision for Session 2 (recommend Option A):**
  - **Option A (recommended):** set the model attribute to `snakeCase(f.name)` (so the column is `snake_case`, matching all other stacks and "DB stays `snake_case`") — **byte-identical for single-word** ⇒ 20 hashes frozen. Update the migration tuple `("${f.name}", …)` → `("${snakeCase(f.name)}", …)` in lockstep. Then the serializer's `source` is the `snake_case` attr, and even the **default** wire key for a multi-word field is expressed via an explicit `source` field (attr `due_date` ≠ declared `dueDate`) — acceptable, `Task` has no frozen hash.
  - **Option B:** leave the attribute = `f.name` (multi-word ⇒ camelCase column in Django only). Simpler but keeps a cross-stack column inconsistency. **Not recommended.**
- **MUST NOT change:** `db_table`, `created_at`/`updated_at`, `owner`, the FK fields (`fkFieldName`), `id`.
- Staging: **heaviest (explicit DRF fields + type map + attribute reconciliation) → top candidate to defer if time runs short.**

---

## 5. The engine changes (reuse Day 11 — no new machinery)

### 5.1 Core — `src/core/style.ts` (technology-neutral, Law 25)
- Add `export type NamingConvention = 'default' | 'camelCase' | 'snake_case';`
- Extend `CodingStyle` with a top-level member `readonly namingConvention: NamingConvention;` (sibling of `formatting`).
- Extend `defaultCodingStyle` → `{ formatting: { indent: 'default' }, namingConvention: 'default' }`.
- Add **pure, generic string helpers** (generic string math only — **NO per-language logic**, Law 25):
  - `toSnakeCase(name)` — e.g. `dueDate → due_date`, `isUrgent → is_urgent` (same regex the plugins already use locally).
  - `toCamelCase(name)` — e.g. `due_date → dueDate`, `dueDate → dueDate` (split on `_`/`-`/space; lower first token, capitalize the rest).
  - `applyNaming(declaredName, convention)` — dispatcher: `default ⇒ declaredName` unchanged (the bypass), `camelCase ⇒ toCamelCase`, `snake_case ⇒ toSnakeCase`.
- The core **never interprets** where naming applies; each plugin decides its serialization boundary and calls `applyNaming`. (Formatting stays a `formatFiles` post-pass; naming is applied *inside* each plugin's `generateEntity`/codegen.)

### 5.2 Model — `src/core/project-model.ts`
- `defaultCodingStyle` change above flows through `createProjectModel` (already seeds `defaultCodingStyle`).
- **`getStyle()` / `setStyle()` — signatures unchanged (still `CodingStyle`), but the internal deep-copy MUST be extended.** Today both copy **only** `formatting` (`{ formatting: { ...style.formatting } }`, lines ~387/391). If left as-is, `namingConvention` is silently dropped. Fix both to carry it: `{ formatting: { ...s.formatting }, namingConvention: s.namingConvention }`. **This is a load-bearing edit — forgetting it makes naming silently a no-op.**
- **`restoreProjectModel` (line ~432)** — pre-naming snapshots have `formatting` but no `namingConvention`. Default it so old versions regenerate byte-for-byte:
  `state.style ? { formatting: state.style.formatting ?? defaultCodingStyle.formatting, namingConvention: state.style.namingConvention ?? 'default' } : defaultCodingStyle`.

### 5.3 Threading — `src/core/plugin.ts` + each plugin
- `EntityGenerationContext.style` already carries the whole `CodingStyle` (Day 11 seat). No core change needed beyond §5.1.
- Each plugin's `generateEntity` maps `context.style.namingConvention` into its per-plugin `EntityCodegenContext` (add a `naming: NamingConvention` field), and the codegen functions apply `wire(f)` at the boundaries in §4. `formatFiles` is untouched (formatting-only).

### 5.4 Demo — `src/task-model.ts`
- New multi-word model per §3; add a generation path so Session 3 can hash it per stack (mirror the existing demo entrypoints, e.g. `two-stacks-demo.ts` / `generate.ts`). Under `default`, generate to confirm verbatim keys; under `camelCase`/`snake_case`, generate **twice** per landed stack for the determinism proof.

---

## 6. Done-conditions

### 6.1 Session 2 (Execution)
1. Extend `CodingStyle` with `namingConvention` (default `'default'`); `getStyle`/`setStyle` **shape unchanged** but the copy carries the new field; `restoreProjectModel` defaults pre-naming snapshots to `'default'` (old versions regenerate byte-for-byte).
2. Neutral pure key-transform util in core (`toCamelCase`/`toSnakeCase`/`applyNaming`) — generic string math, **Law 25: no per-language logic in the kernel.** Each plugin decides WHERE to apply it.
3. Apply during codegen via `context.style.namingConvention` at each stack's serialization boundary per §4, honoring Risk 1 exactly (wire key moves; attribute + column + mapping do not). Include the **FastAPI latent-bug fix** (§4.4) and the **Django attribute/column reconciliation** (§4.5, Option A).
4. Add the multi-word `Task` demo model; generate under `default`.
5. Keep all **20 hashes byte-identical under `default`** (blocking). Establish `namingConvention`-alternative hashes for the multi-word demo under `camelCase` and `snake_case` (each generated **twice → byte-identical**) for whichever stacks landed.

### 6.2 Session 3 (Evaluation + Closing)
- **20-hash matrix re-confirmed byte-identical under `default`** (blocking) — 4 backends × 2 databases × 2 models, against the frozen digests in [`week-01-summary.md`](week-01-summary.md).
- **Multi-word `Task` under `default`:** keys **verbatim** per stack (`dueDate`, `isUrgent`); new baseline hashes recorded (twice-identical) for landed stacks.
- **`camelCase`/`snake_case`:** verified to transform **ONLY** the declared-field wire keys; `id`, audit (`created_at`/`updated_at`, `createdAt`/`updatedAt`), owner, FK keys, DB columns, and internal attributes verified **unchanged** (per-stack static check: grep the migration, the model/attribute, the accessors).
- **Runtime-safety check for Risk 1:** boot at least one stack (**Express or FastAPI preferred**), create + read back a `Task` with a multi-word field under a non-default convention, confirm the wire key is transformed **AND** the value round-trips (proves the accessor/column mapping did not move). Static verification for the rest; be honest about **what booted vs generation-proven only.**
- **ADR sweep:** no AI anywhere in `src/core` or `src/plugins`; file separation intact (developer files untouched); core neutral / `BackendPlugin` interface unchanged; the JSDoc `TIMESTAMPTZ` example in [`src/core/database.ts`](../../generator/src/core/database.ts) left untouched.
- **Honest staging table:** which stacks landed, which deferred.
- Write [`docs/daily/day-12-report.md`](day-12-report.md).

---

## 7. Known limitation to DOCUMENT (not fix)

Because scope is **declared-fields-only**, a `snake_case` project serializes a **mixed** object — e.g. `due_date`, `is_urgent` alongside `createdAt`, `updatedAt`, `ownerId` (and, in models with relationships, `applicationId`) — because the **audit / owner / FK keys keep their frozen cross-stack representations**. This is **deliberate for v1** (those cross-cutting fields have frozen cross-stack representations that the 20-hash matrix locks down). Record it as a **known, documented wire-inconsistency to revisit later** — not as accidental. Session 3 should *demonstrate* it via the `multiUser: true` `Task` under `snake_case` (mixed keys visible in the output).

Also document (discoveries this session, fixed as part of naming, not pre-existing regressions):
- **FastAPI** multi-word ORM mismatch (§4.4) — latent `Model(**data)` break for multi-word fields, never exercised because all demo fields were single-word. Fixed via attribute=`snake_case` + alias.
- **Django** multi-word column (§4.5) — Django derived a camelCase column from a multi-word attribute; reconciled to `snake_case` (Option A) so DB columns stay `snake_case` cross-stack.

---

## 8. Honest staging (call it in advance)

| Stack | Mechanism | Effort | Plan |
|---|---|---|---|
| **Go** | `json:"<key>"` tag (2 emission points, moved together) | one concept | **land fully** |
| **Spring** | `@JsonProperty("<key>")` on DTO field (conditional) | one annotation | **land fully** |
| **Express** | `rowToObject` key + `dto` read key (moved together) | two spots, same stack | **land fully** |
| **FastAPI** | Pydantic `alias` + `populate_by_name` (+ latent-bug fix) | serializer plumbing | **aim to land; honest-stage if long** |
| **Django** | explicit DRF field + `source` + type map (+ attr/column reconcile) | heaviest | **aim to land; first to defer** |

If the FastAPI/Django plumbing runs long, **land Go/Spring/Express fully, then stage FastAPI/Django honestly and say so plainly in the report — do not fake coverage.**

---

## 9. Scope guard — explicitly OUT for Day 12

- **Architecture depth → Day 13. Wizard style-selection UI → Day 14.** Day 12 supplies `namingConvention` **programmatically** (via `setStyle` / the demo model), not through a UI.
- **Renaming `id` / audit fields / FK keys / owner fields on the wire** — out (documented limitation §7).
- **Probabilistic / "personality" variation** — forbidden (breaks ADR-003).
- **New backends, databases, entity kinds** — out.
- **No new engine machinery** — reuse Day 11's (`CodingStyle`, no-op default, `EntityGenerationContext.style`). The only additive core surface is the neutral `namingConvention` value + the pure string helpers.

---

## 10. Constraints (baked into every step)

- **ADR-001 (no AI):** the key transform is pure string math; no AI/network anywhere in the generation path.
- **ADR-003 (determinism):** same model + same style → byte-identical output; `default` is a literal bypass; all 20 default hashes byte-identical; alternatives twice-identical.
- **ADR-002 (file separation):** naming is applied inside Thraksha-owned codegen only; developer files (`*.service.*`, `*.routes.*`, `${Entity}.java`, `${Entity}Service.java`, etc.) are created-once and never re-touched.
- **Law 25 (core neutral):** `namingConvention` and the string helpers are generic; **which token in which file** is each plugin's decision. No stack/file-type logic in the kernel. The `TIMESTAMPTZ` JSDoc in `core/database.ts` stays untouched.
- **field↔column mapping must not break** (Risk 1) — the wire key moves; the attribute, the column, and their mapping do not.

**Definition of "Day 12 done":** `namingConvention` (`default`/`camelCase`/`snake_case`) is a deterministic switch on the declared-field **wire keys**, applied during codegen at each landed stack's serialization boundary; the multi-word `Task` demo proves keys are verbatim under `default` and transformed correctly under the alternatives; DB columns / `id` / audit / owner / FK keys / internal attributes are provably unchanged; at least one stack round-trips a multi-word field live (Risk 1 proven, not just generated); all 20 default hashes are byte-identical (backstop); staging is honest. Written up in [`docs/daily/day-12-report.md`](day-12-report.md).
