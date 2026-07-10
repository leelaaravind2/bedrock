# Bedrock — Limitations (the complete boundary ledger, in one place)

Every documented limitation, gathered in one document. A strengths list without an equally complete
limitations list is an overclaim. This is harvested from `CAPABILITIES.md` §4, the Eco-Day 69/70 reports,
and `THRAKSHA-GUARDRAILS.md` §5. Where a limitation has a proof pointer, it is given.

## Verification ladder gaps

- **Go and Spring Boot are generation-only** — no Go/Java toolchain in this environment; the output is
  deterministic and byte-identical to its baselines but has not been compiled or booted.
- **FastAPI and Django are syntax-level** — verified for syntactic validity, not booted.
- **Express is the only booted stack.** (Full table: [architecture/VERIFICATION-LADDER.md](architecture/VERIFICATION-LADDER.md);
  `CAPABILITIES.md` §4.)

## The un-run container boot (Law 21)

The standalone-export guarantee is proven **statically and by require-graph** (0 dependency-manifest
entries + 0 functional imports, PART 1t). The **live `docker compose up --build` boot of an exported
project has never been run in this environment** (the Docker daemon is down). The claim is "no *functional*
dependency," never "no trace of Bedrock" — inert provenance comments remain in exported source.

## Platform

- **Windows-only** desktop this release. A macOS/Linux Tauri desktop build is deferred (needs Rust
  runners). Generation determinism itself is OS-independent by construction (LF-only, sorted walk, the
  digest forward-slashes `relPath`) and is CI-enforced across ubuntu/windows/macos for *generation*.

## No import, no round-trip

- **No import of arbitrary code** — Bedrock does not read an unknown codebase and guess a blueprint.
- **No round-trip / no protected regions / no model↔code merge** — generation is one-way. Editing
  generated code and re-parsing it into a blueprint is explicitly not supported.
- **Open-from-folder is not in this release** — "Open a saved project" opens a saved *blueprint* from the
  store, not a folder on disk. (`docs/manual/04-projects-save-load.md`.)

## The Map's granularity boundary

The impact highlight covers **entity + app nodes + relationship edges** only. There is **no
per-lifecycle-layer highlight** — it would require a heuristic, and Bedrock highlights what it can certify
(the emitters' own per-entity file attribution, PART 1z total/disjoint), not what would look good.
(`docs/manual/05-the-map.md`.)

## Verify is reproducibility only

Verify proves that the same blueprint produces byte-identical output. It does **not** prove correctness,
security, or bug-freedom. (`docs/manual/08-verify.md`.)

## Security layers (live vs core)

- The deterministic **Semgrep CERTAIN gate is CI/Linux-verified** — Semgrep's native core does **not** run
  on the Windows shell; the certain gate is CI-enforced, not run locally.
- The **AI-advisory security scan and the creative slot fill are pure-core CI-proven with FAKE
  suggesters**; the **live AI has never been run with a key** here — it is detachable, developer-keyed,
  and default-off. Delete the key and the deterministic Semgrep scan remains the gate and everything still
  generates/exports/scans. (`CAPABILITIES.md` §3–4.)

## Figma and CI/CD edges

- **Figma ingestion is core-CI-proven with a fixture**; the **Figma-plugin runtime edge is
  honest-manual** (not run here). Static+API coverage is Spring-centric.
- **CI/CD generation is string-provable across five stacks**; a **live green CI run is not verifiable
  here** (no runner). GitLab CI is a staged second provider.

## The packaged / Store path (Leela's Windows/Store machine — not claimed done here)

- **The live packaged-GUI walkthrough** (the Eco-Day-69 Half-B 8-item checklist: launch → wizard/generate
  → save/list/load → view diagram → preview impact → compare versions → Verify → friendly errors) is
  **PENDING** — to be run on a Windows machine before/alongside Store submission. PASS criteria:
  `docs/daily/eco-day-69-report.md` §3. No live GUI run is claimed.
- **The MSIX MakeAppx wrap, the "Bedrock" name reservation, and the Store submission** are the four
  go-live steps on Leela's machine (`desktop/src-tauri/msix/README.md`). Microsoft signs at certification.
- **Artifact-label note:** the in-repo installers carry the `0.1.0` version string from
  `tauri.conf.json`; it is set to `0.2.0` at the Store submission wrap — a one-line manifest edit that
  moves no frozen hash. The determinism certification is version-string-independent.

## Carried boundaries

- **No live DB boot** (Docker down).
- The **Eco-Day-29 re-baseline** (MAXIMAL `366e19d9…`) stands; the pre-ecosystem v0.1 21-day-core
  limitations remain in `docs/CAPABILITIES.md` §3.
- `detect_toolchains` is a shell-out to the certified probe (it reports what machine tools a stack needs;
  it installs nothing).

## A note on the word "verified" in older reports (Block-A audit, F18)

Pre-Block-A daily reports (e.g. `docs/daily/eco-day-18-report.md`, `eco-day-68-report.md`) use "verified
live" for **static-preview / stub-backend** observations of the shell — inspections, not reproducible
gated proofs. Those reports are **left unedited on purpose**: a daily report is the record of what a
session claimed at the time, and rewriting it destroys the audit trail. The practice was corrected at
**Eco-Day 75b**, after which live-preview observations are phrased *"inspected in a plain browser without
Tauri; unreproducible; PENDING (Leela),"* and reproducible proofs are one command with pasted output.
Read older "verified live" phrasing as **"inspected,"** not as a gated proof.

For the strengths side of this ledger, read `CAPABILITIES.md` alongside this file — neither is complete
without the other.
