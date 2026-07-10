# Create a project — the wizard, screen by screen

The wizard collects a **blueprint** and nothing more. It performs no generation itself; it assembles the
exact `BlueprintChoices` JSON that the certified engine already accepts (the same object the command-line
`--model` path uses). The wizard's output is byte-identical to the CLI's — proven by the committed
UI==CLI harness (`desktop/tools/ui-cli-proof.mjs`; `npm run ui-cli`) and PART 1d.

The wizard is presented full-window, one step at a time. As of the post-Stack-regroup shell it is **five
steps**:

## 1. App name

A single text field. Defaults to `MyApp`; an empty name falls back to `MyApp`.

## 2. Project type

One of seven: **Web App, API-only, Cron Worker, Queue Consumer, CLI, GraphQL API, Static Site + API**.
The type shapes what gets generated (for example, worker types produce a job/handler entrypoint rather
than an HTTP route).

## 3. Your stack

One screen, four fields:

- **Backend** — Spring Boot, Express, FastAPI, Django, or Go.
- **Frontend** — React or None.
- **Database** — PostgreSQL or MySQL.
- **Auth** — Simple login or None.

Each field writes exactly its own choice into the blueprint (`backend`, `frontend`, `database`, `auth`).
That field-to-key correspondence is covered by a unit test (`desktop/tools/stack-fields.test.mjs`;
`npm run test:stack`) so a mis-wired field is caught mechanically, not only by eye.

**Frontendless types.** Some project types (API-only, Cron Worker, Queue Consumer, CLI, GraphQL API) run
without a frontend. For those, the **engine** normalizes Frontend to *None* regardless of what you pick
here — the constraint lives in the certified engine (`buildBlueprintChoices` / `createProjectModel`),
not in the screen, so the blueprint's meaning stays the engine's to decide.

[SCREENSHOT-NEEDED: the "Your stack" screen with the four fields Backend / Frontend / Database / Auth.]

## 4. Data model

Add entities, their fields, and relationships — or leave it empty for a settings-only shell. This step
is documented in full in [03-data-model.md](03-data-model.md).

## 5. Review → Create

Review shows the assembled blueprint as JSON (the exact bytes that drive generation). **Create project**
saves the blueprint and opens its workspace. Export is not a side effect of Create — it is an explicit
verb in the workspace (see [09-export.md](09-export.md)).

## Templates

The wizard offers pre-filled starting points (Blank, REST API, CRUD app, Worker). Selecting one
pre-fills the fields; everything stays editable. Templates are pure data — they never bypass the wizard
or the engine.

## Editing an existing project

From a project's workspace, **Edit** re-enters this same wizard on that blueprint. Opening a saved
project (Welcome → *Open a saved project*) loads its blueprint losslessly (see
[04-projects-save-load.md](04-projects-save-load.md)).
