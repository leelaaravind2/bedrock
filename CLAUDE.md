# Thraksha — root CLAUDE.md (read this first, every session)

**The thesis:** *Reduce AI reliance for anything software can do deterministically. A 10-second deterministic pass beats burning tokens for a huge monthly bill.* AI is confined to creative/judgment gaps — always opt-in, detachable, developer-keyed. It is **NEVER** in the generation path.

## Read-first order (every session)
1. [`docs/THRAKSHA-GUARDRAILS.md`](docs/THRAKSHA-GUARDRAILS.md) — the constitution (hard rules, 3 determinism killers, the one line).
2. [`docs/THRAKSHA-ECOSYSTEM-PLAN.md`](docs/THRAKSHA-ECOSYSTEM-PLAN.md) — the 3-month roadmap (§4 architecture).
3. [`docs/THRAKSHA-MONTH-1.md`](docs/THRAKSHA-MONTH-1.md) (…-2, -3) — the day-by-day.
4. [`docs/HARNESS-DISCIPLINE.md`](docs/HARNESS-DISCIPLINE.md) — the nine go-forward rules.
5. The latest `docs/daily/eco-day-NN-report.md`, then the REAL code.

## Session structure (every numbered day = 3 sessions, separate windows)
**Plan** (write `eco-day-NN-plan.md`, no code) → **Execute** (build, gate after each step, no report) → **Report** (`eco-day-NN-report.md`, re-confirm from clean). A day isn't done until the report is written.

## Repo layout
- **`generator/`** — the deterministic core. **Pure Node, ZERO dependencies, no native modules.** Model in → byte-identical code out. 5 backend plugins + a DB-provider seam; the wizard server; the harness. See [`generator/CLAUDE.md`](generator/CLAUDE.md).
- **`desktop/`** — the Tauri v2 shell: a bundled-Node **sidecar** that runs the generator, and a shell-side **SQLite** blueprint store (rusqlite bundled). See [`desktop/CLAUDE.md`](desktop/CLAUDE.md).
- **`docs/`** — the constitution/plans/daily reports. **`scripts/`** — build tooling (resources sync). **`Design/`** — Figma exports (later).

## The determinism gate (the backstop)
```
cd generator && npm run build && npm run day20:regress    # → PASS: 43 frozen + 10 relationship + 1 MAXIMAL, byte-identical
```
This is the single source of truth. It must be green at the end of every day. A pre-commit hook runs it (`git config core.hooksPath .githooks` — one-time setup). CI runs it on push across ubuntu/windows/macos.

## Do NOT (the guardrails, in one place)
- **No AI in the generation path** — not inputs, structure, or the generator's own logic (ADR-001).
- **No native module in `generator/`** — it stays pure-Node (that's what keeps the sidecar bundle clean). SQLite lives in the **shell** only.
- **Never move a frozen hash.** New features add NEW baselines; the default/empty path is a literal bypass that reproduces the frozen 43+10. A moved hash = STOP-and-report finding, never a silent re-baseline.
- **LF only.** Output is LF (LD-1 normalizes templates at read; `.gitattributes` enforces it). Never emit CRLF.
- **Resources are COPIES.** `desktop/src-tauri/resources/gen` is a copy of the generator — run **`npm run sync-gen`** (in `desktop/`) before a `tauri build` (it's wired into `beforeBuildCommand`; `sync-gen:check` is the freshness guard).

## Operational quirks (learned the hard way)
- **cargo-on-PATH:** Rust is at `~/.cargo/bin` but not always on the shell PATH — `export PATH="$HOME/.cargo/bin:$PATH"` before any Rust/Tauri command.
- **Forward-slash paths to spawned processes** (Windows splits backslash args — the Day-5 `EISDIR 'E:'` bug).
- **Git: commit directly to `main`, linear history, no branches / no PRs.** Pushes may need the user's own terminal (this shell has no TTY for auth).
- **No external formatter** (no Prettier) — formatting determinism is the generator's internal `reindent`. Don't invent a formatter config.
