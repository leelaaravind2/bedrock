# Bedrock — Release Notes

## v0.1.0 — the honest release state

**Bedrock v0.1.0** is the close of the 60-day ecosystem build: a deterministic, AI-free app generator +
the Bedrock desktop shell. **Certified** (Eco-Day 58), **documented** (Eco-Day 60), **release-ready**.

**Ships as:** Bedrock — FREE via the Microsoft Store as an **MSIX** (Microsoft signs at certification —
**no** cert / EV / token / notarization). **Windows-only** (macOS/Linux desktop out of scope this release).

### Certified (in-repo)

- **The frozen backstop:** `npm run day20:regress` → **194 OK / 0 FAIL, 103 baked digests + 10 TeamTracker
  relationship hashes + non-hash gates (PART 1c–1x), MAXIMAL `366e19d9…`** — byte-identical from clean, no
  frozen hash moved (Eco-Day 58 DC-1).
- **Packaged-path determinism:** the shipped sidecar — the bundled node **v22.21.0** — reproduces the
  certified generator's **103 digests byte-identical** (Eco-Day 58 DC-2). Determinism survives into the
  bundle: the packaged generator == the certified generator.
- **Composition:** the phase benchmarks pass at their honest levels — phase1 16/16 + phase2 13/13 + phase3
  24/24 + phase4-mid 6/6 + export 16/16 = **75/75** (Eco-Day 58 DC-3).
- **AI-free (ADR-001):** 0 generation-path AI refs; the only AI is the detachable, developer-keyed advisory
  edges + the dev-time Fable-5 pass — neither in generation nor shipped. Generator **pure-Node** (`deps
  {}`, 0 native).

### What ships (in-repo)

The certified deterministic generator (7 project types × 5 stacks) + Figma ingestion + deterministic CI/CD
+ the exporter (Law 21) + the security layers (Semgrep CERTAIN + the detachable AI advisory) + the Map
(exact impact + traceable flow) + the Bedrock desktop shell (5 thin-invoker commands + the `SidecarResult`
contract + the front-end + the Bedrock identity) + the built **Bedrock MSI + NSIS** (with the certified
sidecar staged) + the MSIX **`AppxManifest.xml` + wrap recipe**.

### What's deferred / honest-manual (Leela's Windows/Store machine)

The 4 go-live steps — **MakeAppx MSIX wrap → packaged launch + sidecar-under-MSIX test → Bedrock name
reservation → Store submission** (runbook: [`desktop/src-tauri/msix/README.md`](desktop/src-tauri/msix/README.md));
the live AI / live Semgrep / live Docker boot (developer-keyed / CI-Linux / daemon); the store-backed
`--model` picker (the raw textarea shipped); the macOS/Linux desktop build (Windows-only). The **complete
boundary ledger** is in [`CAPABILITIES.md`](CAPABILITIES.md) §3 — none dropped.

### The 60-day arc (Phases 0–4)

**core determinism** (byte-identical generation, the frozen backstop) → **the ecosystem seam** (every input
an additive layer through `assembleBlueprint`, default = a literal bypass) → **breadth** (7 project types ×
5 stacks + Figma + CI/CD) → **export + security + the Map** (Law 21 + deterministic-first security + exact
impact/traceable flow) → **the shell + packaging + certification** (thin-invoker commands, the
`SidecarResult` contract, the Bedrock identity, the packaged-path determinism, the full-system
certification).

**The measure held:** the software does everything it can deterministically — for free, for certain,
byte-identical — and confines AI to the genuinely irreducible creative/judgment gaps, always opt-in, always
detachable, always the developer's own bill.
