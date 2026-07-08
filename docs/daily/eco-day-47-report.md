# Eco-Day 47 — REPORT: The Map — impact preview (Terraform-`plan`-style) `[3 days]`

**Phase 4, Day 47. THE STAR FEATURE.** The Map shows **EXACTLY** which files/lines a change will
affect, **BEFORE** generating — exactly computable **because generation is deterministic** (output = a
pure function of the blueprint). Given `(current model, proposed model)`, `previewImpact` generates
**both** in memory via the pure `buildFileSet`, uses the existing **per-file frozen-hash convention**
to identify the changed file SET instantly (add/change/delete/no-op), and **line-diffs only the changed
files** → a machine-readable plan `{ file, action, before, after }`, shown as a **"preview changes"
gate** (plan → review → apply).

**THE LOAD-BEARING PROPERTY — PROVEN EXACT, NOT APPROXIMATE:** the previewed plan matches what
generation actually does **byte-for-byte** (previewed before/after == the bytes real generation writes
to disk), **CI-enforced** as **PART 1w**. The Map is **READ-ONLY**: a projection of two in-memory
generations that emits nothing into the real project and moves **no frozen hash**.

Backstop re-confirmed from clean: **`rm -rf dist && npm run build && npm run day20:regress` → PASS,
189 OK / 0 FAIL, 103 baked digests (unchanged), MAXIMAL `366e19d9…` unchanged — no frozen hash
moved.** deps `{}`, 0 native.

---

## 1. What shipped (staged `[3 days]`)

### Stage 1 — the Map core
- **[`map/impact-map.ts`](../../generator/src/map/impact-map.ts)** (pure-Node, no deps):
  - **`previewImpact(current, proposed)`** — calls `buildFileSet` **twice** (each model selects its own
    plugin — a backend change is a legitimate proposed change), pure, no side effects; delegates to
    `diffFileSets`.
  - **`diffFileSets(curFiles, propFiles)`** — the testable heart: builds per-file hash maps, classifies
    every `relPath` (sorted by code unit), line-diffs only the changed files → **`ImpactPlan`**
    (`entries` + `add`/`change`/`delete`/`noOp`), each entry `{ file, action, ownership, before,
    after, hunks? }`. **`before`/`after` are the full, byte-exact contents** (the load-bearing
    contract); `hunks` are a derived, display-only rendering.
  - **`fileHash(f)`** — the **EXACT** frozen-hash primitive (maxcell-driver's `hashFiles`) applied to
    ONE file: `sha256` over `` `/${relPath}\n` `` + UTF-8 content. Same building block as the backstop
    ⇒ OS-independent, no forked digest space; two files hash-equal **iff** byte-identical.
  - **`renderImpact(name, plan)`** — the human "preview changes" gate text (unified-diff-style hunks).
- **[`map/line-diff.ts`](../../generator/src/map/line-diff.ts)** — an **isolated pure-Node LCS line
  differ** (`diffLines`/`toHunks`), deterministic, LF-only (LD-2). **NO diff library** — `deps {}`
  stays. Display-only: a differ bug can never make the preview inexact (the correctness proof reads
  `before`/`after`, not `hunks`).

### Stage 2 — the correctness proof + hash-precheck correctness (PART 1w, CI-enforced)
Added to [`day20-regression.ts`](../../generator/src/day20-regression.ts) as **PART 1w** (12 checks,
CI-enforced on 3 OSes via `determinism.yml`). Five representative deltas cover **every** action.

### Stage 3 — the Terraform split (CLI + additive endpoint)
- **CLI** [`map.ts`](../../generator/src/map.ts) (`npm run map [--backend <name>]`) — prints the impact
  preview for a representative change (add a field to Ticket). **READ-ONLY** (writes nothing).
- **Server** — additive **`POST /api/impact`** in [`server.ts`](../../generator/src/server.ts): diffs
  the **live** model (current) against a **proposed** blueprint (`assembleBlueprint` — the Day-16
  UI==CLI seam) → the `ImpactPlan` JSON, to sit as the gate BEFORE `POST /api/generate`. The existing
  `GET /api/preview` and `POST /api/generate` routes are **unchanged**.
- **The interactive wizard front-end is DEFERRED/HONEST** (see §6).

---

## 2. THE CORRECTNESS PROOF (load-bearing) — previewed == real, byte-for-byte

The proof is **non-circular**: it closes the loop through the **real filesystem write/read** path
developers use, anchored on the export==`buildFileSet` identity (PART 1t — `applyPlan` writes
`buildFileSet` byte-for-byte). For each fixture:

- **(A) Previewed before/after == the bytes REAL generation writes to disk.** Materialize **each** model
  to its own clean temp dir via `applyPlan` (clean dir ⇒ all create/create-once ⇒ disk ==
  `buildFileSet`, for **thraksha AND developer** files), read the trees back, and assert every entry's
  `before` == the current model's on-disk bytes and `after` == the proposed model's on-disk bytes —
  **byte-for-byte**. This is the primary, ownership-agnostic proof: the preview shows the literal bytes
  generation lands.
- **(C) Apply proposed FOR REAL onto the materialized-current tree.** `applyPlan(tmp, curFiles)` then
  `applyPlan(tmp, propFiles)`; the writer's buckets match the preview: `real.created == add∩thraksha`,
  `real.changed == change∩thraksha`, `real.unchanged == no-op∩thraksha`, and each thraksha add/change
  file's on-disk bytes == the previewed `after`. **Developer files are protected** (created once, then
  untouched — ADR-002), and **`delete` files are LEFT on disk** with the current bytes (see §4).

The five fixtures + observed plan (from the run):

| Fixture | Action exercised | Plan (`+add ~change -delete =no-op`) |
|---|---|---|
| add a field to Ticket | `change` | `+0 ~5 -0 =19` |
| add a Team entity | `add` | `+9 ~1 -0 =23` |
| set a description | `change` (README) | `+0 ~1 -0 =23` |
| identical models | `no-op` | `+0 ~0 -0 =24` |
| remove the Team entity | `delete` | `+0 ~1 -9 =23` |

**A gate that can FAIL:** a false "will change" / "won't change", or an `after` that doesn't match the
disk bytes, turns PART 1w red. The star feature's whole value is this exactness — proven, not claimed.

---

## 3. The hash-precheck correctness (no missed / no false change)

PART 1w independently asserts, per fixture, that the hash-precheck classification **==** a brute-force
full-content compare: `preview.change == { common files where content differs }`,
`preview.noOp == { common where content equal }`, `preview.add/delete == the set differences`; and that
`fileHash` agrees with byte-equality on **every** common file. So the instant per-file-hash identifier
is proven to agree with ground truth — no missed change, no false change. Then only the changed files
are line-diffed.

---

## 4. The `delete` honesty (ADR-002 — a file-SET projection, not a disk-delete)

`applyPlan` **never deletes** ([`core/regen.ts`](../../generator/src/core/regen.ts)). So the Map's
`delete` means **"the proposed model no longer EMITS this file"** — a file-SET projection, **NOT**
"generation removes it from disk". PART 1w proves this honestly: `preview.delete ==
{ relPaths(current) } \ { relPaths(proposed) }`, and after a real apply the orphaned files are **still
on disk with their current bytes** (developer-safe). The Map surfaces them so the developer decides;
`renderImpact` labels them *"no-longer-generated (ADR-002 — not removed from disk)"*. No overclaim.

---

## 5. READ-ONLY / default-bypass — the Map moves no hash

- **0 generation-path refs into `map/`** (grep-proven): `core/regen.ts` (`buildFileSet`), the plugins,
  and `classify`/`applyPlan` do **not** import the Map. The Map is imported **only** by the proof
  (`day20-regression.ts`), the CLI (`map.ts`), and the server (`server.ts`). The Map **calls**
  `buildFileSet` (reads generation); generation never imports the Map — the direction is one-way.
- **Emits nothing into the generated set** — `previewImpact` returns an `ImpactPlan` object, never a
  `GeneratedFile`. PART 1w check (E): `buildFileSet` output is **byte-identical before/after** running a
  preview.
- **Adds no baked digest** — PART 1w asserts *equalities* (preview == real), like PART 1v/1l. The
  **103 baked + 10 TeamTracker + non-hash 1c/1v reproduce byte-identical**; the Map is purely additive.
- **No frozen hash moved.** Confirmed from clean (189 OK / 0 FAIL, MAXIMAL `366e19d9…`). A moved hash
  would be a STOP-and-report finding — none occurred.

---

## 6. Honest verification level (§4)

- **Provable HERE, done + CI-enforced:** the Map core (`previewImpact`/`diffFileSets`/`fileHash` +
  the isolated line-diff), THE CORRECTNESS PROOF (previewed == real, byte-for-byte, non-circular
  through disk), the hash-precheck correctness, the `delete` honesty, the read-only/default-bypass
  proof — all in **PART 1w** (12 checks), run on ubuntu/windows/macos by `determinism.yml`.
- **The `POST /api/impact` endpoint is wired + smoke-tested HERE** (apples-to-apples: current = Express
  Ticket(title), proposed = Ticket(title, done) → `0 add, 5 change, 0 delete, 19 no-op` — identical to
  the CLI and PART 1w). The CLI (`npm run map`) prints the line-level preview.
- **The interactive wizard FRONT-END is DEFERRED/HONEST** — the live HTML/JS wiring (*edit an input →
  see the map re-render → click approve → generate*) is **not yet wired**. The Map core + correctness
  proof + CI enforcement + CLI + the `/api/impact` endpoint are proven; the front-end polish is carried
  forward as a known limitation (no overclaim that the wizard live-previews yet), exactly as Day-23's
  live AI fill was deferred.

---

## 7. Invariants

- **Generator pure-Node, `deps {}`, 0 native** — the line-diff is a pure-Node LCS, isolated in `map/`;
  **no diff library** is a Thraksha dependency.
- **The Map reads, never writes generation** — it calls `buildFileSet`; `buildFileSet` never imports
  the Map (0 generation-path refs). Read-only projection of two deterministic generations.
- **No AI anywhere in the Map** (ADR-001) — it is a deterministic diff.
- **No frozen hash moved** — 103 baked + 10 + non-hash byte-identical from clean.

---

## 8. Forward-flags

- **`[3 days]` status:** the Map **core + THE CORRECTNESS PROOF (byte-for-byte, CI-enforced) + the
  hash-precheck correctness + the read-only/default-bypass proof + the CLI + the `POST /api/impact`
  endpoint** — **done + proven HERE**. The **interactive wizard front-end is deferred/honest** (the
  endpoint + CLI are proven; the live in-wizard rendering is not yet wired).
- **Day 50 picks up:** **the Map's flow map** (request lifecycle / routes / data-flow projection —
  traceability is free because generation is deterministic) + the **Phase-4 mid-benchmark** (export
  standalone (Law 21) + deterministic scan + optional AI scan + impact-map preview all working
  together) + `day20:regress` green.

---

*Day 47 shipped the STAR FEATURE — the Map's Terraform-`plan`-style impact preview. `previewImpact`
runs the pure `buildFileSet` twice, uses the existing per-file frozen-hash convention (`` `/${relPath}\n` ``
+ content sha256) to identify the changed file SET instantly (add/change/delete/no-op), and line-diffs
only the changed files → a machine-readable plan `{ file, action, before, after }`, shown as a "preview
changes" gate. THE CORRECTNESS PROOF is load-bearing and proven EXACT: previewed before/after == the
bytes real generation writes to disk, **byte-for-byte** — materialize each model via `applyPlan`, read
disk back (non-circular via the export==`buildFileSet` anchor, PART 1t), and assert every
add/change/no-op/delete matches; developer files are protected (ADR-002) and `delete` is an honest
file-SET projection ("no longer emitted", not disk-removed). The hash-precheck is proven == a
brute-force content compare (no missed/false change). Added as PART 1w to `day20:regress` (12 checks),
CI-enforced on 3 OSes. The Map is READ-ONLY: an isolated `map/` module that reads generation and never
writes it (0 generation-path refs), emits no `GeneratedFile`, and moves no frozen hash — 103 baked + 10
TeamTracker + non-hash reproduce byte-identical (189 OK / 0 FAIL, MAXIMAL `366e19d9…`). The line-diff is
a pure-Node LCS, isolated — `deps {}` stays, 0 native, no AI (ADR-001). The Map core + correctness proof
+ CI enforcement + `npm run map` CLI + `POST /api/impact` are proven HERE; the interactive wizard
front-end is honest/deferred (like Day-23's live AI fill). Day 50 picks up the Map's flow map + the
Phase-4 mid-benchmark.*
