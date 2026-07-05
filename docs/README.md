# Thraksha — Guardrails for Implementation

**Read this first. It explains what these documents are and how to use them.**

---

## What is this folder?

Before any code is written for Thraksha, this folder defines the **rules that all
code must obey** — no matter who writes it (you, a teammate, or Claude Code).

These are not suggestions. They are the boundaries that keep Thraksha *Thraksha*
instead of slowly turning into "just another code generator that wraps AI."

Every one of these rules came from a real decision where the obvious-looking
choice was the wrong one. They are written down so that, when someone is deep in
the code and tempted to take the easy path, the rule stops them.

---

## What's in here?

| File | What it is |
|------|------------|
| `CONSTITUTION.md` | The permanent laws of the platform. The highest authority. |
| `adr/ADR-001-ai-is-a-plugin.md` | AI must be detachable. Never in the generation path. |
| `adr/ADR-002-file-separation.md` | Generated code and developer code live in separate files. |
| `adr/ADR-003-determinism.md` | Same input → same output. Conflicts go to the human. |
| `adr/ADR-004-mandatory-optional-default.md` | How the system asks for information. |
| `adr/ADR-005-multi-user-is-foundational.md` | Multi-user is decided up front, never bolted on later. |
| `INTAKE-SPEC.md` | The exact questions the software asks a developer (the MVP set). |
| `BUILD-PLAN.md` | The order to build things, as bounded steps. |
| `CAPABILITIES.md` | **What Thraksha v0.1 actually does** — every capability at its proven level, with the complete limitations set. |
| `daily/21-day-report.md` | The consolidated 21-day arc — what each week proved (the closing record). |
| `daily/` | The day-by-day build reports (Days 1–21) + the Week-1/Week-2 checkpoints — the primary proof record. |
| `MVP-EVALUATION.md` | The dated MVP checkpoint (2026-06-30) — a historical record, kept intact. |

---

## Status: v0.1 is closed

The 21-day build is complete. **[`CAPABILITIES.md`](CAPABILITIES.md)** is the external-facing record of what shipped — every capability stated at its *actual proven level* (generated / booted-live-on-a-database / composed), with the complete known-limitations set in the same document. **[`daily/21-day-report.md`](daily/21-day-report.md)** is the closing arc.

The deterministic core has a standing regression backstop — 43 recorded digests + 10 relationship hashes + the maximal-composition digest, all frozen. Re-prove it any time:

```
cd generator && npm run build && npm run day20:regress
```

Everything below (the Constitution + ADRs) is unchanged — the rules that governed the build still govern any future change.

---

## How to use these with Claude Code

This is the important part. **The documents only work if Claude Code actually
reads them on every task.** Here is the simple routine:

1. **Keep this folder in your project.** Commit it to git. It lives alongside
   the code, forever.

2. **Start every Claude Code task by pointing it at the rules.** For example:

   > "Before you do anything, read `docs/CONSTITUTION.md` and all files in
   > `docs/adr/`. Everything you build must obey them. Now: [your task]."

3. **After Claude Code finishes a piece, you check it against the ADRs yourself.**
   Ask: *did this break any of the five rules?* This check is your job. Claude
   Code will not catch these violations on its own, because to the machine they
   look perfectly fine.

4. **If a rule ever needs to change,** change the document *first*, write down why,
   then change the code. Never let the code drift away from the rules silently.

---

## The one-sentence summary of everything in here

> The human decides the rules and the questions and checks the work.
> The machine does the building.
> The rules below are how the human stays in control.

This is the same philosophy Thraksha itself is built on, applied to building
Thraksha. The developer owns intent; the machine owns mechanics; the developer
verifies. If you understand the platform, you understand your own role.
