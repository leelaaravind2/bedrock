# Export — a standalone project you own

The workspace's **Export** verb writes your project to a folder you choose. What you get is a project you
own outright: it has **no functional dependency on Bedrock**.

## How to export

In the workspace, enter a target folder and click **Export**. Bedrock generates the full project into
that folder via the certified `export_project` command. (Power users can also drive a raw export from the
**Advanced** corner.)

## What "standalone" means, precisely (verbatim)

> No FUNCTIONAL dependency — 0 dependency-manifest entries and 0 functional imports (static + require-graph,
> PART 1t). Inert provenance comments remain. The exported project's live container boot has not been run
> in this environment.

In plain terms:

- The exported project's dependency manifests list **zero** Bedrock/Thraksha packages, and its source has
  **zero** functional imports of anything Bedrock. This is verified statically and by require-graph
  analysis (PART 1t; `eco-day-41-report.md`; `bench:export`).
- **Inert provenance comments remain** in the source — ownership markers that do not affect the build or
  the runtime. Their presence is why the honest claim is "no *functional* dependency."
- **"No trace of Bedrock" is never claimed** — it would be false while the provenance comments remain.
- The exported project ships with a container command (e.g. `docker compose up --build`). The **live
  container boot has not been run in this environment** (the Docker daemon is down here) — the standalone
  guarantee is proven statically and by require-graph, not by a live boot. See [../LIMITATIONS.md](../LIMITATIONS.md).

Delete Bedrock, and the exported project still builds and runs (Law 21). That exit promise is part of
Bedrock's identity — a legitimate ratchet may make Bedrock valuable to keep, never impossible to leave.

[SCREENSHOT-NEEDED: the workspace after an export, showing the engine's file count, the "0 functional
Thraksha references" line, and the standalone-project note with the container command.]
