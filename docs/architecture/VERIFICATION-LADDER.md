# The verification ladder

Not every stack is proven to the same level. Bedrock states each stack's level honestly rather than
rounding "generated" up to "runs". These are environment limits, openly declared — not hidden.

## The ladder (per stack)

| Stack | Level | What that means |
|---|---|---|
| **Express** | **runtime / booted** | A generated project (or surface) was run live and its behaviour observed. |
| **FastAPI** | **syntax-level** | The generated output is verified at the syntax level, not booted. |
| **Django** | **syntax-level** | The generated output is verified at the syntax level, not booted. |
| **Go** | **generation-only** | Deterministic output verified in-process; not compiled or run (no Go toolchain here). |
| **Spring Boot** | **generation-only** | Deterministic output verified in-process; not compiled or run (no Java toolchain here). |

Proof levels are defined in `CAPABILITIES.md` §1; the per-stack assignment is `CAPABILITIES.md` §4
("Verification levels").

## Why the gaps exist

They are **environment limits**, stated plainly:

- **Go and Spring Boot are generation-only** because there is no Go or Java toolchain in the build
  environment. The output is deterministic and byte-identical to its frozen baselines; it has not been
  compiled or booted here.
- **FastAPI and Django are syntax-level** — verified for syntactic validity, not booted (Python is heavy
  in this environment and the Docker daemon is down).
- **Express is booted** — the one stack run live end to end.

Every stack, at every level, has its **generated output** verified in-process against frozen baselines —
the ladder is about *running*, not about *generation*, which is deterministic for all five.

## Composition benchmarks

The phase composition benchmarks pass at their honest levels: phase1 16/16 + phase2 13/13 + phase3 24/24
+ phase4-mid 6/6 + export 16/16 = **75/75** (proof: `eco-day-69-report.md` DC-4; `RELEASE-NOTES.md`
"Composition").

## The honest reading

"Generation-deterministic" is not the same as "booted". "Deterministic-certain" is not the same as
"AI-advisory". This document, `CAPABILITIES.md`, and [../LIMITATIONS.md](../LIMITATIONS.md) preserve those
distinctions everywhere. A strengths list is never read without its equally complete limitations list.
