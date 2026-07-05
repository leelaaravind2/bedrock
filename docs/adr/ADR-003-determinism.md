# ADR-003 — Generation and Merge Are Deterministic; Conflicts Go to the Human

**Status:** Accepted · **Derives from:** Constitution Laws 4, 5, 6, 7, 33

---

## The decision

Two parts:

1. **Generation is deterministic.** The same input (the same Project Model +
   the same versioned knowledge pack + the same org profile) always produces
   **exactly the same output.** No randomness, no AI, no scores.

2. **Merge is deterministic and "dumb."** Because generated and developer code
   are separate (ADR-002), there is almost no merging to do. When a true conflict
   *does* occur, the platform **stops and asks the developer.** It never resolves
   a conflict automatically by guessing, scoring, or AI.

---

## Why (in plain terms)

Determinism is the whole product. It is *why* a developer can trust Thraksha
without re-reading everything. If the same input could produce different output —
whether because of AI, randomness, or a changing quality score — then Thraksha is
just a guessing machine again, and the developer has to verify everything, which
defeats the point.

A merge especially must never be a judgment call, because a wrong guess there
destroys or corrupts the developer's work — the exact disaster ADR-002 exists to
prevent. You cannot make the safety mechanism itself a guess.

---

## About the rating / feedback system (important)

The platform **does** collect developer ratings of generated code. This is a good
idea — but it has **one job, and it is not merging.**

- ✅ **Correct use:** ratings aggregate over time → low-rated patterns are flagged
  → a **human** improves the template → the improved template is validated and
  **frozen into a new version** → *future* generations use the better template.

- ❌ **Forbidden use:** ratings (or any score) influencing what a merge does, or
  what a single generation produces *right now*. That would make generation
  non-deterministic.

In short: **ratings improve the templates between versions, through human review.
Ratings never touch a live generation or a live merge.**

---

## What this looks like in practice

- Generation: Project Model + frozen knowledge pack → templates → code. Run it
  twice, byte-for-byte identical output.
- Conflict (rare — only when a developer changed the visual logic *and*
  hand-edited the same generated piece): the platform **shows both versions and
  asks the developer to choose.** Same as how git stops and asks you. The rule
  "on conflict, ask the human" is itself deterministic — it does the same thing
  every time.
- Every change is versioned, so even a wrong human choice is reversible (Law 33).

---

## What would VIOLATE this rule (watch for these)

- ❌ Any randomness or AI in generation output.
- ❌ A merge that auto-picks a version based on a rating, score, or model.
- ❌ Output that differs between two runs with identical input.
- ❌ Resolving a conflict silently instead of asking the developer.

---

## How to check

Ask two questions:
1. **"Run generation twice with the same input — is the output identical?"**
2. **"When two changes truly conflict, does the platform ask the human rather
   than decide for them?"**

Both must be yes.
