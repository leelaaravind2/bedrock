# Saving and loading projects

Bedrock keeps your projects in a local blueprint store (SQLite, on your own machine). A project *is* its
blueprint; the store persists the exact canonical `BlueprintChoices` JSON.

## Save

Creating a project (Review → **Create project**) saves its blueprint and returns a store id. In a
project's workspace, **Save version** saves the current blueprint again as a new entry — useful for
keeping successive versions.

The store file lives under your Windows app-data directory
(`%APPDATA%/com.thraksha.bedrock/bedrock-blueprints.sqlite`; source:
`desktop/src-tauri/src/store_commands.rs`).

## List and open

- **Welcome → Open a saved project** lists your saved blueprints (newest first) and opens the one you
  pick.
- The workspace's **Advanced** corner also lists **All saved projects**.

Opening a saved project loads its blueprint into the workspace. Because the round-trip is lossless (see
below), the loaded blueprint generates identically to when you saved it.

## Lossless, non-mutating round-trip

The store round-trips the canonical JSON **verbatim** — the bytes you load are byte-identical to the
bytes you saved (proof: `blueprint_store.rs` byte-identity test; `cargo test`; `CAPABILITIES.md` §3,
"persistent projects"). Saving and loading changes nothing about the blueprint.

## Storage metadata stays out of the blueprint

The store records a **`created_at`** timestamp and a row **id** for each saved project. These live in the
storage row **only** — never inside the blueprint JSON. This is deliberate: it keeps the blueprint a pure
description of the application, so the round-trip stays lossless and non-mutating (a minted rule; source:
`store_commands.rs` `list_blueprints` returns `BlueprintMeta { id, name, created_at }` separate from the
model JSON).

## A note on the future

Today the SQLite store is the truth for saved projects. A later build day makes a canonical blueprint
**file** the truth and demotes the store to an index; the workspace already treats a project as an
abstract handle (name + choices + optional store id) rather than a bare row id, so that change will not
alter how projects behave in the UI.

[SCREENSHOT-NEEDED: the "Open a saved project" list on Welcome showing several saved blueprints with
their names, ids, and created_at timestamps.]
