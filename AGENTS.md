# AGENTS.md

Weavo ("Master Plan") is a client-side, server-less web app: a weekly resource-allocation gantt
that replaces an Excel spreadsheet. It persists as human-readable JSON files in a shared folder
opened via the browser File System Access API. No backend, no build step, no npm install to run.

**Read `CLAUDE.md` (same repo) for the full, verified instruction set** — this file is the
compact summary of what an agent is most likely to get wrong. Authoritative spec:
`requirements/master-plan-webapp_spec_v0.1.md` (local-only). `requirements/backlog.md` holds
unimplemented ideas — do NOT implement any backlog item without first resolving its open
questions. `docs/` is public-facing documentation; prefer it over `requirements/` for anything
that will be committed.

## Hard constraints (verified, non-negotiable)

- **No build step / no bundler / no TypeScript / no ES modules.** Plain classic scripts loaded by
  `index.html` in strict dependency order. Every JS file is an IIFE attaching to the global
  namespace: `(function (MP) { ... })(window.MP = window.MP || {});`. A new file must follow this
  exact pattern and be inserted at the right point in `index.html`'s `<script>` list.
- **No IndexedDB** under `file://` (never fires callbacks — verified). The directory handle can
  never persist across sessions; the user re-picks the data folder every launch. This is
  spec'd, expected behavior — not a bug to fix.
- **Chrome/Edge only** (File System Access API dependency). No Firefox/Safari support.
- **No test convention for `js/ui/`** (no jsdom in this stack). Verify UI changes by running the
  app or the headless-Chrome check below, never via Jest.

## Commands

```
npm install   # once, installs Jest
npm test      # runs only unit/**/*.test.js (covers js/data + js/model)
```

`jest.config.js` restricts `testMatch` to `unit/`. Run `npm test` before finishing any change to
`js/data/` or `js/model/`, and add/update a matching test under `unit/` as part of the change
(its folder layout mirrors `js/` 1:1). There is no linter, typechecker, or formatter config.

The shared fixture `unit/helpers/load-mp.js` stubs `global.window.MP` so classic-script IIFE
modules can be `require()`d under Node with zero mocking; when a module depends on others, load
each one first in the same order `index.html` uses.

Headless smoke check for console errors after opening the page — native Windows path and an
explicit `--user-data-dir` are required (Git-Bash style paths resolve wrong):
```
chrome.exe --headless=new --disable-gpu --no-sandbox --user-data-dir=<writable dir> --enable-logging=stderr --v=1 --virtual-time-budget=3000 --dump-dom "file:///<abs path to index.html>"
```
then grep stderr for `CONSOLE`.

## Conventions

- **UI text is English**, and every persisted JSON field name / internal identifier is English
  too (post-migration; no Italian carve-out remains in the data model). **Code comments stay
  Italian** — written by/for the maintainer, keep them so. Local scratch variables may be Italian;
  identifiers that mirror a data-model field must not be.
- **Teams/resources are dynamic data** in `team-resources.json`; nothing about teams or colors is
  hardcoded. They're edited ONLY on the `js/ui/team-resources/` page; the gantt legend and
  resource-load ("Workload") views are read-only.
- **Every user-edit write must go through `MP.saveCoordinator`** (reread-before-write conflict
  detection), never `MP.repository.save*` directly. Any new "did this file change on disk?" probe
  should reuse `MP.repository.readTextFileOrNull`.
- A task/week with `completed: true` is "closed data": never touched by team/resource cascade
  operations, shifts, or milestone sync.
- Milestones are 3 ordered types (`taskDeadline` < `readyForUat` < `uat`, all rendered red); `uat`
  weeks can never carry a resource allocation; a task's present milestone dates must be strictly
  increasing. This ordering check (`js/model/milestone-rules.js`) is the codebase's one hard
  block: `window.alert(reason)` + abort, no auto-correction.

## Local-only paths — never commit, never `git add -f`

`requirements/`, `sample-data/backup/`, `.claude/`, `scripts/import-excel/`, `import-output/`
(the Excel-import script's output) — plus `node_modules/`. `git status`/`git log` won't reflect
these; check the filesystem directly. `graphify-out/` IS committed (generated knowledge graph;
only `cost.json` is ignored). The Excel import (`/excel-import` skill) overwrites
`import-output/` with no backup — never `sample-data/`, which stays the fictional demo dataset.

## Releases

Push tag `vX.Y` → `.github/workflows/release.yml` zips `index.html favicon.svg css js
sample-data` and publishes a GitHub Release. The workflow **fails if `APP_VERSION` in
`js/ui/common/app-header.js` doesn't equal the tag**. To release: bump `APP_VERSION`, commit,
tag, push. Never force-push or re-tag an existing tag to fix a bad release — delete it (local +
remote) and the GitHub Release, then re-tag.

## Common-change pointers

- New field on the week-entry/task/project shape: start in `js/data/schema.js` (factories +
  `isWeekEntryEmpty`), thread through `repository.js`, then the relevant `ui/` renderer. If it's
  a rename of an existing field, also update `js/data/legacy-migration.js`'s transforms and bump
  `SCHEMA_VERSION` (currently 4).
- `requirements/` spec predates the team/resources merge and still describes old Italian field
  names (`risorse.json`, `progetti/`, `team` as free text) — trust the code over spec §4.5/§4.7.
- `docs/` is scrubbed of org/project-specific detail; don't add deployment-specifics to it.
