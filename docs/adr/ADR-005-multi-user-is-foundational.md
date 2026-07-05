# ADR-005 — Multi-User Is a Foundational Up-Front Decision, Never a Later Toggle

**Status:** Accepted · **Derives from:** Constitution Laws 4, 6, 43

---

## The decision

Whether an application is **single-user or multi-user** is asked **once, at the
start**, as a foundational project decision — alongside the database and the tech
stack. It is **not** a setting a developer can flip later from a settings page.

The safe default is **multi-user-ready**: every entity is built so that user
ownership and per-user data scoping are possible from day one, even if not yet
used.

---

## Why (in plain terms)

User ownership touches **everything** — every data table (who owns this row?),
every database query (scope to the current user), every authentication and
authorization flow, every screen. It is one of a small set of decisions that are
*cheap to make early* and *brutally expensive to change later.*

If a project is built single-user and someone later "adds multi-user from
settings," the platform would have to rewrite the entire architecture — and that
is exactly the kind of large, risky, error-prone regeneration that makes a tool
faulty and untrustworthy.

The fix is simple: **don't offer that dangerous switch.** Decide it up front. And
because *having* the multi-user structure but not using it costs almost nothing,
while *adding* it later costs almost everything, the safe default is to build
multi-user-ready from the start.

Think of it like plumbing in a house: you decide where the bathrooms go before
you pour the foundation. You don't add one later by jackhammering the slab.

---

## What this looks like in practice

- The Phase A project wizard includes the question: **"Multi-user? yes / no"** —
  decided before any entity exists.
- Default: multi-user-ready.
- This same principle applies to the *other* "expensive-to-change-late"
  decisions identified in research. For the **MVP**, only multi-user is in scope;
  but the same rule (decide up front, never a late toggle) is the template for
  future foundational decisions such as multi-tenancy, monolith-vs-services, and
  SQL-vs-NoSQL when they are added later.

---

## What would VIOLATE this rule (watch for these)

- ❌ A "convert to multi-user" button in project settings.
- ❌ Generating single-user code in a way that fights a later multi-user change.
- ❌ Treating user-isolation as something that can be patched on per-entity after
  the fact.

---

## How to check

Ask: **"Is the single-vs-multi-user decision made before the first entity exists,
and is there NO way to flip it casually later?"** Both must be yes. If a developer
genuinely needs to change it, that is a deliberate, heavyweight migration — not a
toggle.
