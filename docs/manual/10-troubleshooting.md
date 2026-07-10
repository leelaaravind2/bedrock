# Troubleshooting

Bedrock's error surface is deliberately honest: a friendly message on top, the raw engine output always
one click away (never swallowed), and a clear distinction between "the environment failed" and "the
engine ran and reported something" (Day 68; source: `desktop/src/main.js` `setOutput` / `renderResult` /
`setEnvError`).

## Reading a result

Every command result falls into one of two categories:

- **An environment failure** — the generator could not run at all (the sidecar is missing or could not
  start). Bedrock says exactly that and keeps the raw error under **Technical details**. This is *not* a
  problem with your project.
- **A completed run** — the engine ran and returned data, whatever its exit code. Exit 0 is a clean run;
  a non-zero exit on a scan means findings (data, not a crash); other non-zero codes mean the generator
  ran and reported a problem, and its own message is shown verbatim.

The raw engine output (stdout/stderr, a stack, the full run) is always reachable under the collapsible
**Technical details** — friendly is not the same as hiding.

## Common cases

- **"Open inside the Bedrock window…"** — you are seeing a fallback because Bedrock's backend is not
  attached (for example, previewing the UI outside the packaged app). Generation, saving, the diagram,
  and export need the packaged app; the wizard and the assembled blueprint JSON still work without it.
- **Export/Generate: "enter a folder first"** — Export needs a target folder before it can write.
- **A raw `--model` input** (Advanced corner) must be valid `BlueprintChoices` JSON or a path to a
  `.json` file; Bedrock validates this before invoking, so a bad value produces guidance rather than a raw
  stack.
- **Toolchain guidance** (Advanced → Detect toolchains) tells you which machine tools a stack needs
  (e.g. Java/Maven for Spring Boot) and links to install pages when one is missing or mismatched.

## Where the store lives

Saved blueprints live at `%APPDATA%/com.thraksha.bedrock/bedrock-blueprints.sqlite`. A storage error while
saving or loading is reported as a storage error (your wizard input stays intact).

[SCREENSHOT-NEEDED: an environment-error result showing the friendly message with the "Technical details"
disclosure expanded to reveal the raw engine output.]
