# Bedrock

**Define your app. See its architecture drawn. See exactly what a change will touch — before it touches
it. Generate a project you own outright.**

Bedrock is a deterministic, **AI-free** app generator. You describe intent as a **blueprint**; Bedrock
projects it to **byte-identical, deployable code** — 7 project types × 5 backend stacks — with no AI in
the generation path. It ships as a Windows desktop app, free on the Microsoft Store.

> **AI guesses; Bedrock knows.**

> **Bedrock** is the shipping desktop product; **Thraksha** is the deterministic generator engine inside
> it. (The engine name persists as inert provenance in generated output; the product ships as Bedrock.)

---

## The thesis

> **Reduce AI reliance to only what software cannot do deterministically.** A 10-second deterministic
> pass beats burning tokens for a huge monthly bill.

From the [Constitution](docs/CONSTITUTION.md):
- **The blueprint is the source of truth; source code is a deterministic projection of it** (Laws 1–3).
- **Whenever deterministic engineering is possible, it takes precedence over AI** (Law 4); every action
  is reproducible (Law 6). **AI is optional — the system must function without it** (Law 15), never in
  the generation path ([ADR-001](docs/adr/ADR-001-ai-is-a-plugin.md)).
- **Exporting a project never reduces its functionality** (Law 21) — delete Bedrock, the project still
  builds and runs.

**The Map is the visible dividend of the determinism discipline.** Because generation is a pure function
of the blueprint, a blueprint *diff* yields an **exact** output diff — Bedrock shows precisely which
files a change will affect *before* generating (previewed == real, byte-for-byte). A truthful impact
preview is only *possible* because the code is a deterministic projection of the blueprint. That is the
difference between guessing and knowing.

---

## What it does

**The engine (deterministic, AI-free):**
- **Deterministic generation** — 7 project types × 5 stacks (Spring / Express / FastAPI / Django / Go),
  byte-identical.
- **Figma token ingestion**, **deterministic CI/CD**, and the **exporter** (Law 21 — standalone).
- **Security, deterministic-first** — a CERTAIN Semgrep gate + an optional, detachable, developer-keyed
  AI advisory scan (never the gate).

**The product (built over the frozen certified engine):**

The desktop app is **screen-routed** — it opens on a **Welcome**, flows through the **guided wizard**
(App name → Project type → Your stack → Data model → Review), and **Create** opens the project's
**workspace**: the diagram front and centre, with Edit / Preview impact / Verify / Export / Save-versions
(the raw command harness tucked in an Advanced corner). One screen at a time.

- **A guided wizard** — describe your app; the wizard's blueprint is byte-identical to the CLI's
  (UI==CLI).
- **Persistent projects** — save a blueprint, load it back; the round-trip is lossless and it generates
  identically.
- **The Map** — your architecture **drawn** (deterministic, faithful); the **exact impact** of an edit
  highlighted before generating; and a **two-version diff**.
- **Verify** — Bedrock generates your project twice and compares every file: proof of **reproducibility**
  (byte-identity — *not* correctness or security).
- **Standalone export** — a project with **no functional dependency on Bedrock** (delete Bedrock; it
  still builds and runs).

**Each capability at its proven level, with the complete boundary ledger →
[`CAPABILITIES.md`](CAPABILITIES.md).** The v0.2.0 release state → [`RELEASE-NOTES.md`](RELEASE-NOTES.md).

---

## Verify the determinism (any time)

```
cd generator && npm run build && npm run day20:regress
```

Re-proves the frozen backstop: **103 baked digests + 10 relationship hashes + non-hash gates, 203 OK / 0
FAIL, MAXIMAL `366e19d9…`**. Same input → byte-identical output. The crown-jewel MAXIMAL cell has not
moved from Eco-Day 29 through Eco-Day 70.

---

## Documentation

- **End-user manual** — [`docs/manual/00-overview.md`](docs/manual/00-overview.md) through `11-faq.md`
  (install, the wizard, the data model, save/load, the Map, impact preview, compare, Verify, export,
  troubleshooting, FAQ).
- **Architecture** — [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md),
  [`DETERMINISM.md`](docs/architecture/DETERMINISM.md),
  [`VERIFICATION-LADDER.md`](docs/architecture/VERIFICATION-LADDER.md).
- **The complete limitations ledger** — [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) (read alongside
  [`CAPABILITIES.md`](CAPABILITIES.md); neither is complete without the other).

## Going live (the Microsoft Store)

**Release scope:** Bedrock / Microsoft Store / MSIX / **Microsoft signs at certification** (no cert / EV
/ token / notarization) / **Windows-only**. The certified system is release-ready in-repo; going live is
a 4-step runbook on a Windows machine + Partner Center:
**[`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md)** (MakeAppx wrap → packaged
launch + live GUI walkthrough → name reservation → Store submission).

---

## The rules

Bedrock is governed by [`docs/THRAKSHA-GUARDRAILS.md`](docs/THRAKSHA-GUARDRAILS.md) (the constitution of
the build) and the [ADRs](docs/adr/). Determinism is the crown jewel; AI is always opt-in, detachable,
and the developer's own key and bill.

**Status:** v0.2.0 — the end-user system certified (Eco-Day 69) + released (Eco-Day 70); the close of the
70-day build. Release-ready in-repo; going live is the 4-step Store runbook.
