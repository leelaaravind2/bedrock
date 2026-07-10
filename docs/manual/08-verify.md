# Verify — the reproducibility proof

The workspace's **Verify** verb proves that your project is reproducible. It is not a canned badge:
Bedrock actually generates your project **twice, independently**, and compares every file.

## What it does

Verify runs the certified double-generation of your current blueprint against itself. The engine
generates the project once, generates it again, and diffs the two. A byte-identical result — zero
differing files — is the proof. (Mechanically, this reuses the impact pipeline's empty-bypass: identical
input ⇒ zero impacted nodes and edges; proof: PART 1z empty bypass, `eco-day-68-report.md`.)

If the two generations ever differed — which must be impossible for a deterministic engine on a blueprint
compared against itself — Bedrock shows that honestly as an unexpected finding rather than hiding it.

## What Verify proves — and what it does not (verbatim)

> Verify proves REPRODUCIBILITY — the same blueprint produces byte-identical output. It does not prove
> correctness, security, or bug-freedom.

Reproducibility means generation is a pure function of your blueprint: the same blueprint always yields
the same bytes. That is the whole of what Verify certifies. Whether the generated application is *correct*
for your needs, *secure*, or *bug-free* is a separate question Verify does not and cannot answer. Any UI
string or document implying otherwise would be a defect.

[SCREENSHOT-NEEDED: the Verify result showing "Verified — byte-identical" and "0 differences across two
independent generations".]
