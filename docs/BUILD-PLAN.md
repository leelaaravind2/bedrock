# Thraksha Build Plan (MVP)

**The core principle: build one thin slice end-to-end, then thicken it.**

Do NOT build the kernel, event bus, compiler, and plugins as separate big systems
first — that leads to months of work with nothing that runs. Instead, build the
**smallest thing that goes all the way through and produces a running app**, then
add to it. Each step below produces something that actually runs.

After every step, **you** (the human) check the result against the five ADRs. That
check is your job and cannot be delegated.

---

## Step 1 — Empty-project generator (Phase A → runnable shell)

**Goal:** Turn the 7 Phase-A answers into a real Spring + React + PostgreSQL
project with Docker Compose that actually runs. No entities yet — just the empty,
professional, runnable shell.

- Input: the Phase-A answers, hardcoded for now (no UI yet).
- Output: a complete project folder that runs with `docker compose up`.

**Done when:** the generated project runs, AND it still runs after Thraksha is
deleted (this proves the export guarantee — Law 21).

**Check:** ADR-001 (no AI anywhere), ADR-005 (multi-user decided up front).

---

## Step 2 — The internal model (the "map")

**Goal:** A simple in-memory representation of the project — its Phase-A settings
and an (initially empty) list of entities. This is the Project Model.

- Keep it a plain data structure for now, not a database.

**Done when:** the project's settings and entity list can be held, read, and
updated in memory.

---

## Step 3 — Entity spec → generated code (the heart)

**Goal:** Take one entity (per INTAKE-SPEC) and generate its code.

- Input: one entity — name, fields (name, type, required, unique).
- Output: Spring entity class, repository, REST controller, PostgreSQL migration,
  basic validation.
- **Critically:** split generated vs developer files per ADR-002. Scaffolding goes
  in Thraksha-owned `...Base` files; an empty developer logic file is created once
  and never touched again.

**Done when:** adding an entity produces a working CRUD REST API for it, and the
project still runs.

**Check:** ADR-002 (file separation is real), ADR-004 (defaults applied and shown).

---

## Step 4 — Regenerate safely

**Goal:** Prove the hardest problem is solved — change something and regenerate
without losing developer work.

- Add a field to the entity, regenerate.
- The Thraksha-owned file updates; the developer file is untouched.
- Show a **preview** before regenerating: "this will change these files; your files
  are safe."

**Done when:** you can write logic in a developer file, regenerate ten times, and
that logic is provably untouched every time.

**Check:** ADR-002 (guaranteed by structure), ADR-003 (preview, deterministic),
Law 33 (reversible).

---

## Step 5 — Versioning + rollback

**Goal:** Save each version of the project; allow reverting to a previous one.

**Done when:** any change can be undone and the project restored to a prior state.

**Check:** Laws 32, 33, 34.

---

## Step 6 — Minimal UI

**Goal:** A simple interface over Steps 1–5, so a human can click through the
Phase-A wizard and add entities, instead of hardcoding inputs.

**Done when:** a person can create a project and add entities entirely through the
UI, with no code editing of inputs.

---

## Step 7 — Stop and evaluate (this is the MVP)

You now have the full loop:

> wizard → add entity → generate → regenerate-safely → version/rollback →
> export-and-run

**That is the MVP.** It proves the entire idea works. Do not add more until this
loop is solid and trustworthy.

Everything else — more stacks, the visual flow editor, knowledge packs, the AI
plugin, org profiles, import — comes **after**, each added onto this proven core,
never replacing it.

---

## The rule that holds through all seven steps

After each step, ask of the result:

1. ADR-001 — does generation still work with AI deleted?
2. ADR-002 — is developer code guaranteed safe from regeneration?
3. ADR-003 — same input, same output? Conflicts go to the human?
4. ADR-004 — only mandatory things asked; defaults shown, not hidden?
5. ADR-005 — multi-user decided up front, no casual toggle?

If any answer is "no," stop and fix it before moving on. Catching these is the
human's 30%. The machine will not catch them.
