# Thraksha — generator/ CLAUDE.md (the deterministic core)

**What this is:** the pure-Node generation engine. Model in → **byte-identical** code out. No AI, no network, no clock, no randomness. See the root [`../CLAUDE.md`](../CLAUDE.md) and [`../docs/HARNESS-DISCIPLINE.md`](../docs/HARNESS-DISCIPLINE.md) first.

## Hard invariants
- **PURE NODE, ZERO deps.** `package.json` `dependencies: {}`; only `node:*` built-ins + relative imports. **No native modules** (no `.node`). Adding a runtime dependency is a design smell — stop and reconsider.
- **Determinism is the product.** Same input → identical bytes. Proven by `npm run day20:regress` (43 frozen digests + 10 TeamTracker relationship hashes + the MAXIMAL cell).

## The digest convention (do NOT fork)
`sha256` over, for each `GeneratedFile` **sorted by `relPath`**: `` `/${relPath}\n` `` then UTF-8 content. `relPath` is always forward-slashed at the plugin (`.split(path.sep).join('/')`); sorts use default code-unit comparison (no `localeCompare`). This makes the digest OS-independent.

## Layout
- `src/core/` — `project-model.ts` (the blueprint; `getState`/`restoreProjectModel` round-trip byte-for-byte), `plugin.ts` (the kernel↔plugin seam), `regen.ts` (`buildFileSet` — the generation entry), `database.ts` (the `TIMESTAMPTZ` JSDoc is a determinism anchor — don't touch), `style.ts` (`reindent` + naming), `canonical-json.ts` (sorted-key serializer for the store).
- `src/plugins/{spring,express,python,django,go}/` — the 5 backends. Each reads its **shell templates from `generator/plugins/<stack>/templates/`** at runtime via `import.meta.url` → `path.join(HERE,'..','..','..','plugins',...)`. Those 83 LF template files are the LIVE shell path (not scratch). Entity CRUD is emitted via `.join('\n')` string arrays in `entity-codegen.ts`.
- The harness: `day20-regression.ts` (`npm run day20:regress`, `--emit-digests`); the `day12`–`day19` gates are the cross-check. `maxcell-fixture.ts` + `maxcell-driver.ts` = the MAXIMAL baseline. `generate-from-snapshot.ts` = regenerate from a saved blueprint.

## Add-a-feature discipline (the go-forward rule)
1. New capability records its OWN new twice-identical baselines.
2. Its default/empty/unused path is a **literal bypass** that reproduces the existing frozen hashes exactly.
3. Prove it hash-neutral: `day20:regress` byte-identical before/after.
4. A moved frozen hash = STOP-and-report (latent nondeterminism), never a silent re-baseline.

## The 3 determinism killers — check for any output-touching change
1. **No timestamp/date/UUID/RNG in the gen path** — `now()`/`func.now()` in output are emitted runtime-default *strings* (fine); a `new Date()`/`Math.random()` executed during generation is a killer (there are none).
2. **LF only** — LD-1 normalizes templates at read (`.replace(/\r\n?/g,'\n')`); LD-2 (a `day20:regress` check) asserts no emitted file has a CR.
3. **Stable order** — no map/`Set`/`readdir` order into output; `walk()` sorts; the digest sorts by `relPath`.
