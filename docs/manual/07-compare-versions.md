# Compare versions — the diff map

Bedrock can compare two saved blueprints and show you the exact delta between them — the **diff map**. It
lives in the workspace's **Advanced** corner, under **Compare versions**.

## How to use it

Pick **A (from)** and **B (to)** from your saved projects, then **Compare A → B**. Bedrock:

1. Loads both blueprints from the store (the round-trip is lossless, so A and B are exactly the saved
   versions).
2. Shows the certified **text delta** — the exact per-file add/change/delete between A and B.
3. Draws **B's** diagram and highlights the change *into* B.

The engine computes the delta; the shell only paints. There is no JavaScript-side diffing and no path
heuristics (proof: `CAPABILITIES.md` §3, "the two-version diff"; `eco-day-67-report.md`).

## No ghost nodes

An entity that exists in A but was removed in B has **no node in B's diagram** — Bedrock does not invent
a ghost node for it. A removed entity appears in the **text delta** (as deletions), not on the diagram.
This keeps the drawing faithful to B's actual model.

If A and B use a different backend or project type, Bedrock still answers truthfully but warns you that
the delta will be large — reading two settings values to warn is a UI courtesy, not a diff computation;
the engine remains the source of the delta.

[SCREENSHOT-NEEDED: a Compare A → B result showing B's diagram with the change highlighted and the text
delta listing the added/changed/removed files.]
