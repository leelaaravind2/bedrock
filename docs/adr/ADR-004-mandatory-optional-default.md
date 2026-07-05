# ADR-004 — Every Specification Is Mandatory / Optional / Default

**Status:** Accepted · **Derives from:** Constitution Laws 7, 11, 13, 22, 23

---

## The decision

Every piece of information the platform asks a developer for is one of three kinds:

- **Mandatory** — generation cannot proceed without it. The platform blocks and
  asks.
- **Optional** — the developer may leave it as **"not specified."** This is a
  valid answer, not an error.
- **Default** — when left blank, the platform fills it with a known-good value
  from the knowledge pack or the organization profile.

**Defaults are applied automatically, but never silently.** The developer is shown
what was filled in and why, and can override it.

---

## Why (in plain terms)

This is what makes the tool pleasant instead of an interrogation, and it is also
where a lot of the platform's value lives.

A developer who fills in only the essentials of a `User` entity should still get a
*complete, professional, secure* result — proper validation, indexing, audit
fields, password hashing — because the **defaults encode expert knowledge the
developer didn't have to know.** That is "reduce reliance on AI, increase ease of
programming" made real: the developer supplies intent, the platform supplies
expertise.

But a default that fills itself in *invisibly* is dangerous — a developer could
ship something they never realized was decided for them. So defaults must always
be visible.

---

## What this looks like in practice

For a single field on an entity:

| Question | Kind | If blank |
|----------|------|----------|
| Field name | Mandatory | (blocks) |
| Field type | Mandatory | (blocks) |
| Required? | Default | defaults to optional |
| Unique? | Default | defaults to no |
| Validation (length/range) | Optional/Default | sensible default for the type |
| Default value | Optional | none |

- The org profile plugs in here too: a company that forbids a database means that
  option is **filtered out** (never shown), and the approved one becomes the
  default. Org policy overrides defaults (Law 23).
- **Simple mode** = show only mandatory + a few common fields, trust the defaults.
  **Advanced mode** = expose all the optional fields to override every default.
  Same underlying spec; simple mode just hides the optional parts.

---

## What would VIOLATE this rule (watch for these)

- ❌ Asking the developer for something the platform could safely default.
- ❌ Filling in a default without showing the developer it happened.
- ❌ Treating "not specified" as an error for a field that should be optional.
- ❌ Letting a default override an explicit organization policy.

---

## How to check

Ask: **"Can a developer fill in only the mandatory fields and still get a
complete, runnable, professional result — and can they see every default that was
applied on their behalf?"** Both halves must be yes.
