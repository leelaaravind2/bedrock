# FAQ

Only questions the rest of this manual genuinely raises.

**Does Bedrock use AI to generate my code?**
No. Generation is AI-free — no AI in the inputs, the structure, or the generator's logic (ADR-001). The
only AI anywhere is a detachable, developer-keyed, default-off advisory layer that never touches
generation; delete the key and everything still generates, exports, and scans. See
[00-overview.md](00-overview.md) and `CAPABILITIES.md` §3.

**Is the wizard's output the same as the command-line's?**
Yes. The wizard assembles the exact `BlueprintChoices` the CLI `--model` path accepts, and the two are
byte-identical — proven by the committed UI==CLI harness (`npm run ui-cli`) and PART 1d.

**What does "deterministic" actually guarantee?**
The same blueprint always produces byte-identical output. Verify proves this for your own project; the
backstop proves it for the whole certified matrix (`npm run day20:regress` → 203 OK / 0 FAIL). See
[08-verify.md](08-verify.md) and [../architecture/DETERMINISM.md](../architecture/DETERMINISM.md).

**Can I open a project from a folder on disk?**
Not in this release. "Open a saved project" opens a *saved blueprint* from Bedrock's store, not a folder.
Opening a project from a folder arrives on a later build day. See [04-projects-save-load.md](04-projects-save-load.md).

**Which stacks are actually run versus just generated?**
Express is runtime/booted; FastAPI and Django are verified at syntax level; Go and Spring Boot are
generation-only in this environment (no Go/Java toolchain here). This is stated plainly, not hidden. See
[../architecture/VERIFICATION-LADDER.md](../architecture/VERIFICATION-LADDER.md) and [../LIMITATIONS.md](../LIMITATIONS.md).

**Does Verify mean my app is correct or secure?**
No. Verify proves reproducibility only — the same blueprint produces byte-identical output. It does not
prove correctness, security, or bug-freedom. See [08-verify.md](08-verify.md).

**If I delete Bedrock, does my exported project still work?**
Yes — the export has no functional dependency on Bedrock (Law 21). Inert provenance comments remain in the
source; "no trace of Bedrock" is never claimed. See [09-export.md](09-export.md).

**Which platforms does the desktop app run on?**
Windows only this release. A macOS/Linux desktop build is deferred. See [../LIMITATIONS.md](../LIMITATIONS.md).
