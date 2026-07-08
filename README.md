# Bedrock

**A deterministic, AI-free app generator.** You describe intent as a **blueprint**; Bedrock projects it to
**byte-identical, deployable code** — 7 project types × 5 backend stacks — with no AI in the generation
path. It ships as a Windows desktop app, free on the Microsoft Store.

> **Bedrock** is the shipping desktop product; **Thraksha** is the deterministic generator engine inside
> it. (The engine name persists as inert provenance in generated output; the product ships as Bedrock.)

---

## The thesis

> **Reduce AI reliance to only what software cannot do deterministically.** A 10-second deterministic pass
> beats burning tokens for a huge monthly bill.

From the [Constitution](docs/CONSTITUTION.md):
- **The blueprint is the source of truth; source code is a deterministic projection of it** (Laws 1–3).
- **Whenever deterministic engineering is possible, it takes precedence over AI** (Law 4); every action is
  reproducible (Law 6). **AI is optional — the system must function without it** (Law 15), never in the
  generation path ([ADR-001](docs/adr/ADR-001-ai-is-a-plugin.md)).
- **Exporting a project never reduces its functionality** (Law 21) — delete Bedrock, the project still
  builds and runs.

**The Map is the visible dividend of the determinism discipline:** because generation is a pure function of
the blueprint, a blueprint *diff* yields an **exact** output diff — Bedrock shows precisely which
files/lines a change will affect *before* generating (previewed == real, byte-for-byte).

---

## What it does

- **Deterministic generation** — 7 project types × 5 stacks (Spring / Express / FastAPI / Django / Go),
  byte-identical.
- **Figma token ingestion**, **deterministic CI/CD**, and the **exporter** (Law 21 — standalone).
- **Security, deterministic-first** — a CERTAIN Semgrep gate + an optional, detachable, developer-keyed AI
  advisory scan (never the gate).
- **The Map** — exact impact preview + a traceable flow map.
- **The Bedrock desktop shell** — a thin invoker of the certified generator (packaged, determinism-preserving).

**Each capability at its proven level, with the complete boundary ledger →
[`CAPABILITIES.md`](CAPABILITIES.md).** The v0.1.0 release state → [`RELEASE-NOTES.md`](RELEASE-NOTES.md).

---

## Verify the determinism (any time)

```
cd generator && npm run build && npm run day20:regress
```

Re-proves the frozen backstop: **103 baked digests + 10 relationship hashes + non-hash gates, 194 OK / 0
FAIL, MAXIMAL `366e19d9…`**. Same input → byte-identical output.

---

## Going live (the Microsoft Store)

**Release scope:** Bedrock / Microsoft Store / MSIX / **Microsoft signs at certification** (no cert / EV /
token / notarization) / **Windows-only**. The certified system is release-ready in-repo; going live is a
4-step runbook on a Windows machine + Partner Center: **[`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md)**
(MakeAppx wrap → packaged launch test → name reservation → Store submission).

---

## The rules

Bedrock is governed by [`docs/THRAKSHA-GUARDRAILS.md`](docs/THRAKSHA-GUARDRAILS.md) (the constitution of
the build) and the [ADRs](docs/adr/). Determinism is the crown jewel; AI is always opt-in, detachable, and
the developer's own key and bill.

**Status:** v0.1.0 — certified (Eco-Day 58) + documented (Eco-Day 60), release-ready.
