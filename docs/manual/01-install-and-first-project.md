# Install and your first project

## Install

Bedrock ships as a free Windows desktop app on the Microsoft Store, packaged as an MSIX (Microsoft
signs it at certification). It is **Windows-only** this release; a macOS/Linux desktop build is deferred
(`../LIMITATIONS.md`). Install it from the Store and launch it like any other app.

> The going-live steps (MSIX wrap → packaged launch → name reservation → Store submission) are a
> Windows/Store-machine runbook: [`../../desktop/src-tauri/msix/README.md`](../../desktop/src-tauri/msix/README.md).

## The Welcome screen

Bedrock opens on a **Welcome** screen — one screen at a time, no wall of controls. It shows the product
name, a one-line description, and two buttons:

- **Create a new project** — enters the guided wizard.
- **Open a saved project** — lists the blueprints you have saved before (from Bedrock's local store)
  and opens the one you pick. This opens a *saved blueprint*, not a folder on disk.

[SCREENSHOT-NEEDED: the Welcome screen showing the product name, the one-line description, and the two
buttons "Create a new project" and "Open a saved project".]

## Create your first project, end to end

1. Click **Create a new project**. The wizard opens full-window.
2. **App name** — name your project (defaults to `MyApp`).
3. **Project type** — pick one of the seven types (e.g. *Web App*, *API-only*, *Cron Worker*).
4. **Your stack** — one screen with four fields: **Backend** (Spring Boot / Express / FastAPI / Django /
   Go), **Frontend** (React / None), **Database** (PostgreSQL / MySQL), and **Auth** (Simple login /
   None). Some project types run without a frontend; for those, the engine sets Frontend to *None*
   regardless of this field (see [02-create-a-project.md](02-create-a-project.md)).
5. **Data model** — add entities, fields, and relationships (optional; a project with no entities is a
   valid settings-only shell). See [03-data-model.md](03-data-model.md).
6. **Review** — the wizard shows the assembled blueprint as JSON. Click **Create project**.

Creating a project **saves the blueprint** and opens its **workspace** — the project's home, with its
diagram front and centre and the actions you can take on it (Edit, Preview impact, Verify, Export, Save
version). See [02-create-a-project.md](02-create-a-project.md) and the workspace verbs in
[05-the-map.md](05-the-map.md), [06-impact-preview.md](06-impact-preview.md), [08-verify.md](08-verify.md),
and [09-export.md](09-export.md).

Generation is deterministic: the same choices always produce the same code (proof:
`eco-day-69-report.md` DC-4; the wizard's blueprint is byte-identical to the CLI's — PART 1d).

[SCREENSHOT-NEEDED: the workspace immediately after Create, showing the project name, the verb bar, and
the drawn diagram.]
