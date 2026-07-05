# ADR-002 — Generated Code and Developer Code Live in Physically Separate Files

**Status:** Accepted · **Derives from:** Constitution Laws 7, 8, 10, 19, 20, 21

---

## The decision

Code that **Thraksha generates** and code that the **developer writes** must live
in **separate files**. Regeneration rewrites only the files Thraksha owns. It must
be **structurally impossible** for regeneration to touch a developer's file.

This is not "be careful not to overwrite." It is "build it so overwriting cannot
happen."

---

## Why (in plain terms)

This is *the* problem that has killed almost every tool like Thraksha.

The first generation is easy — the project is empty, so there's no conflict. The
danger is the **second** time. By then the developer has hand-written their real
business logic into the code. If regeneration overwrites it, their work is gone,
and they will never trust the tool again.

The only approach that has ever worked reliably is to keep the two kinds of code
so completely separate that the generator literally never opens the developer's
files.

---

## What this looks like in practice

For one entity, say `Ticket`:

```
Files Thraksha OWNS (regenerated freely, developer must not edit):
   TicketBase.java          ← entity fields, CRUD, REST scaffolding
   TicketRepository.java
   TicketControllerBase.java
   (migration files, DTOs)

Files the DEVELOPER OWNS (Thraksha must NEVER touch after creating once):
   Ticket.java              ← extends TicketBase; developer's real logic
   TicketService.java       ← the actual business logic
```

- The generated files connect to the developer files through a stable seam
  (e.g. the developer class extends the generated base class).
- When the developer changes a setting and regenerates, Thraksha rewrites the
  `...Base` files. The developer's files are never opened, so their work is safe
  **by construction.**
- **Ownership transfer rule:** once Thraksha hands a file to the developer (a
  logic file), Thraksha **stops owning it** and never regenerates it. Ownership
  moves to the developer and never moves back without explicit action.
- Both sets of files are normal code. The exported project runs perfectly outside
  Thraksha with no special markers (this protects Laws 19–21).

---

## What would VIOLATE this rule (watch for these)

- ❌ Generating and hand-editable logic in the same file.
- ❌ Any code path where regeneration writes to a file the developer can edit.
- ❌ "We'll merge intelligently" — no. Separation, not merging. (See ADR-003.)
- ❌ Regenerating a file that was previously handed to the developer.
- ❌ Special comment markers that the project depends on to run (breaks export).

---

## How to check

Ask: **"If a developer writes 50 lines of their own logic, then regenerates ten
times, are those 50 lines guaranteed untouched?"** It must be *guaranteed* by the
file structure — not by hoping the regenerator is careful.
