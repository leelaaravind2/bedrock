# Impact preview — see what a change touches before it touches it

The workspace's **Preview impact** verb shows you exactly which files a pending edit will affect —
**before** you generate. This is the sharpest expression of "AI guesses; Bedrock knows": because the code
is a deterministic projection of the blueprint, a blueprint diff yields an *exact* output diff.

## How it works

You edit your project (via **Edit**), then Preview impact compares the saved baseline blueprint against
your edited one. The **engine** computes the impacted set — it generates both and diffs them — and returns
the impacted node and edge ids. The shell only **paints** those ids onto the already-drawn diagram (add
= green, change = amber, delete = red); it computes no diff of its own.

Bedrock also shows the certified **text delta** (the exact per-file add/change/delete counts) alongside
the highlighted diagram.

## Why the attribution is exact

The impacted files are not guessed from paths. They come from the **emitters' own per-entity file
attribution** — each entity's files are exactly what that entity's code generator emits. That mapping is
proven **total and disjoint** (every generated app file is attributed to exactly one owner), and the
highlighted nodes are proven to be **exactly** the owners of the real changed files — no phantom, none
missing (proof: **PART 1z**, `eco-day-66-report.md`).

Previewed == real, byte-for-byte: the preview shows precisely what generation will produce, because it
*is* a projection of the same deterministic generation (PART 1w/1x/1z).

## The empty case

Previewing a blueprint against itself yields zero impacted nodes and zero edges — no spurious highlight.
This same double-generation-and-compare is what **Verify** uses (see [08-verify.md](08-verify.md)).

[SCREENSHOT-NEEDED: the impact preview with a changed entity highlighted amber on the diagram and the
text delta (e.g. "+0 ~4 -0") shown beside it.]
