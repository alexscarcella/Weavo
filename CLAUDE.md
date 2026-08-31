# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository. It's a map, not a reference — architecture, data model, and workflow *details* live in
[docs/](docs/); read the linked doc before making a non-trivial change in that area.

## What this is

Master Plan (product name "Weavo") is a client-side, server-less web app that replaces an
Excel-based weekly resource allocation gantt (projects → baseline/release → task, with resources
allocated per week). It persists data as human-readable JSON files in a shared network/OneDrive
folder, opened directly via the browser's File System Access API — no backend, no build step.

- [docs/](docs/) — public-facing, GitHub-tracked documentation: [architecture.md](docs/architecture.md)
  (layers, state machine, render flow, testing, hard-won gotchas), [database.md](docs/database.md)
  (JSON schema, conflict detection, legacy migration), [glossary.md](docs/glossary.md) (terms),
  [deployment.md](docs/deployment.md) (hosting, backups, releases), [security.md](docs/security.md),
  [api.md](docs/api.md). Kept scrubbed of anything deployment/organization-specific — prefer it
  over `requirements/` for anything you write that will be committed.
- [requirements/master-plan-webapp_spec_v0.1.md](requirements/master-plan-webapp_spec_v0.1.md) is
  the authoritative spec (local-only, gitignored, predates some renames — trust the code/docs over
  it where they disagree). [requirements/backlog.md](requirements/backlog.md) tracks
  unimplemented/future work — don't implement from it without resolving its open questions first.

## Local-only files (not pushed to GitHub)

`requirements/` (spec, backlog, real source spreadsheet) and `sample-data/backup/` are gitignored
— the former is internal planning material and contains real project data, the latter is backups
of a real data folder. `.claude/` is gitignored too (machine-specific absolute paths). Don't assume
`git status`/`git log` reflect these; check the filesystem directly, and never `git add -f`
anything under these paths.

`graphify-out/` (the `/graphify` knowledge-graph build of this repo) is the one generated-output
directory that **is** committed, so the graph travels with the repo — only `graphify-out/cost.json`
is gitignored. Rebuild with `/graphify .` (full) or `/graphify . --update` (incremental); query an
existing graph with `/graphify query "<question>"` before grepping raw files.

## Hard constraints (non-negotiable, verified empirically)

- **No build step, no bundler, no TypeScript, no ES modules.** Every JS file is a classic script
  using the IIFE pattern `(function (MP) { ... })(window.MP = window.MP || {});`, attaching to
  `window.MP` (e.g. `MP.schema`, `MP.ganttView`), and must be added to `index.html`'s `<script>`
  list in dependency order. `<script type="module">` is blocked by CORS under `file://`. See
  [docs/architecture.md](docs/architecture.md#why-no-modules-no-framework-no-build) for why.
- **No IndexedDB, no persisted directory handle.** The user re-picks the data folder every app
  open — expected/spec'd, not a bug. See [docs/deployment.md](docs/deployment.md#no-persisted-connection).
- Target browsers are **Chrome/Edge only** (File System Access API); no Firefox/Safari support.

If a future task reconsiders adding a local dev server, these constraints could be relaxed — but
treat that as an explicit scope change to confirm with the user, never assume it.

## Data model & UI language

One JSON file per project under `projects/`, plus `manifest.json` and `team-resources.json` at the
data folder root. Full schema, business rules (milestones, completion, team/resource cascades),
conflict detection, and legacy migration: [docs/database.md](docs/database.md) and
[docs/glossary.md](docs/glossary.md).

All user-facing text and every persisted JSON field name/mirroring identifier is **English** (a
deliberate one-time sweep, see [docs/glossary.md](docs/glossary.md) intro) — the only exceptions
are code comments (stay in Italian, written by/for the maintainer) and local scratch variables that
don't literally mirror a data-model field. New UI text and new field names must follow this.

## Architecture

Layers (low → high): `js/data/` (persistence, no UI) → `js/state/store.js` (pub/sub state) →
`js/model/` (pure derivations, no I/O/DOM) → `js/ui/` (rendering + events) → `js/app.js` (entry
point). Full breakdown, state machine, render flow, and "where to look for a given change":
[docs/architecture.md](docs/architecture.md).

- New team/color: **no code change** — it's user-editable data in `team-resources.json`.
- Any write in response to a user action must go through `MP.saveCoordinator`, never
  `MP.repository.save*` directly, or conflict detection is silently skipped. An action that writes
  **two** project files at once (cross-project baseline/task drag) uses
  `MP.saveCoordinator.saveProjects(state, [dest, src])` — conflict-checks both before writing
  either, returns `false` if a prompt is cancelled (caller must then roll back its in-memory
  change); still no on-disk transaction. See [docs/database.md](docs/database.md#conflict-detection).
- New field on the week-entry/task/project shape: start in `js/data/schema.js`, thread through
  `repository.js`, then the `js/ui/` renderer(s). A field *rename* also needs a
  `js/data/legacy-migration.js` step and a `SCHEMA_VERSION` bump.

## Running / testing

No build/dev server: open [index.html](index.html) directly in Chrome/Edge. Sample data lives in
[sample-data/](sample-data/) — point the folder picker there.

There **is** an automated Jest suite under [`unit/`](unit/), covering `js/data/` and `js/model/`
(pure logic, no I/O/DOM). `js/ui/` has no general test convention — verify by running the app —
**except** near-pure `js/ui/crud/` logic that only mutates dataset objects then delegates to
stubbable `MP.saveCoordinator`/`MP.store` (see `unit/ui/baseline-move.test.js`,
`unit/ui/task-move.test.js`). Run `npm install` once, then `npm test`. **A change to
`js/data/schema.js` or `js/model/` should come with a matching test** — see
[docs/architecture.md#testing](docs/architecture.md#testing) for the harness details, the
headless-Chrome console-error check, and the one-off scratch-script pattern.

[spike-fsa/index.html](spike-fsa/index.html) is a standalone, unrelated throwaway page for testing
File System Access permission persistence — not part of the app's code path.
