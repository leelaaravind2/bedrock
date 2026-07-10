# The Map — your architecture, drawn

From a project's workspace, Bedrock draws your blueprint as a diagram — the **flow map**. It is the
visible dividend of the determinism discipline: because generation is a pure function of the blueprint,
the diagram is an exact, faithful projection of the declared model, not an approximation.

## What it shows

The map draws your **entities** as nodes, your **relationships** as edges, and the application's
lifecycle around them. The diagram is produced by the certified engine (`renderFlowSvg(buildFlowMap(…))`)
and inserted verbatim by the shell — the shell paints; it does not compute the layout, re-derive
anything, or parse code. The workspace shows the diagram front and centre; **View diagram / Redraw
diagram** re-renders it, and **Flow map (text)** shows the same graph as text.

## It is deterministic and faithful

- **Deterministic:** the same model produces a byte-identical SVG, every time — including from a fresh
  process (integer grid, given-order iteration, no floats, no timestamps, no randomness, no locale).
- **Faithful:** the drawn nodes and edges are one-to-one with `buildFlowMap` — exactly the declared
  entities and relationships, no phantom nodes and none missing.

Proof: **PART 1y**, `eco-day-65-report.md`.

## The granularity boundary (verbatim)

The map highlights what Bedrock can certify, and only that:

> Entity + app nodes + relationship edges are highlighted (certified by the emitters' own file
> attribution); per-lifecycle-layer nodes are not — we highlight what we can certify, not what would look
> good.

Highlighting individual lifecycle layers would require a heuristic, and a heuristic is a guess. Bedrock
does not guess; it highlights only the nodes and edges whose file attribution the emitters themselves
provide (PART 1z; see [06-impact-preview.md](06-impact-preview.md)).

## Related views

- **Preview impact** — see exactly which nodes a pending edit will touch: [06-impact-preview.md](06-impact-preview.md).
- **Compare versions** — the diff map between two saved blueprints: [07-compare-versions.md](07-compare-versions.md).

[SCREENSHOT-NEEDED: a project's workspace with the drawn flow map front and centre (e.g. the TeamTracker
example, showing Team/Application/Ticket/Comment and their belongs-to edges).]
