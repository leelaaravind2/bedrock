# Architecture

Bedrock is two layers with a hard boundary between them: a certified, pure generation **engine**, and a
thin desktop **shell** that drives it. The engine computes; the shell paints.

## The layers

```
E:\Software
├── generator/        Pure-Node TypeScript engine. dependencies: {} — always. 0 native modules.
│                     All generation logic. The certified core. Backstop: npm run day20:regress
└── desktop/          Tauri v2 shell (Rust) — the GUI product.
    ├── src/          The web UI (index.html + main.js): screens, wizard, workspace. A thin client.
    ├── src-tauri/    Rust: commands.rs (sidecar invokers) + store_commands.rs (SQLite store).
    │   └── resources/gen   The bundled-node sidecar: the certified engine, packaged.
    └── tools/        ui-cli-proof.mjs (UI==CLI harness) + stack-fields.test.mjs.
```

- **`generator/`** — the deterministic core. Pure Node, zero dependencies, no native modules. A blueprint
  in, a byte-identical file set out. It holds every piece of generation logic and the regression backstop
  (`day20-regression.ts`). It never imports the shell and never imports AI.
- **`desktop/`** — the Tauri v2 shell. It hosts the web UI, runs the generator as a **bundled-node
  sidecar** (never the system node), and owns the local **SQLite blueprint store** (`rusqlite`, the only
  native module, kept shell-side so the generator stays native-free).

## The dataflow

```
wizard screens  →  buildBlueprintChoices (a pure serializer, proven UI==CLI byte-identical)
                →  certified engine commands (via the sidecar)
                →  engine output  →  the shell renders it verbatim
```

The wizard collects choices and calls `buildBlueprintChoices` (`desktop/src/wizard-choices.js`), a pure,
DOM-free serializer that produces the exact `BlueprintChoices` JSON the engine's `--model` path accepts.
The shell then invokes certified commands (`export_project`, `flow_svg`, `impact_preview`,
`impact_nodes`, `save_blueprint`, …). The engine generates, diffs, and draws; the shell inserts the
result verbatim.

## The thin-client rule

The shell is a thin client: **the engine computes; JS paints.** There is no generation logic in
JavaScript or Rust, no JS-side diffing, and no path heuristics. The maps, the impact set, and Verify are
all engine-computed — the shell only toggles CSS classes and inserts the engine's SVG/text. This rule is
what lets the UI==CLI guarantee hold: the wizard is just another producer of the same `BlueprintChoices`,
never a second construction path (proof: PART 1d/1i; `npm run ui-cli`).

## The screen model (post-Day-72 shell)

The UI is a screen router (pure UI state; `desktop/src/main.js`): **Welcome → wizard → workspace**, one
screen at a time. The wizard is App name → Project type → Your stack → Data model → Review. **Create**
saves the blueprint and opens the **workspace**, where the diagram is front and centre and each verb
(Edit / Preview impact / Verify / Export / Save version) calls an existing certified command. The raw
command harness lives in an **Advanced** corner of the workspace, reachable only once a project exists.

## The packaged path

The whole product runs the generator through the bundled-node sidecar. `resources/gen/` is a **copy** of
the generator, refreshed by `npm run sync-gen` before every build. The load-bearing proof of the packaged
path is that the bundled node reproduces the 103 frozen digests byte-identical — see
[DETERMINISM.md](DETERMINISM.md).

## Why this shape

Keeping generation pure and native-free is what keeps the sidecar bundle clean and the determinism
guarantee portable. The one native module (SQLite) lives in the shell only. AI is never in the generation
path (ADR-001), so the certified core has no network, no clock, and no randomness.
