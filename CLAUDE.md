# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Master Plan is a client-side, server-less web app that replaces an Excel-based weekly resource
allocation gantt (projects → baseline/release → task, with dev/V&V resources allocated per
week). It persists data as human-readable/editable JSON files in a shared network/OneDrive
folder, opened directly via the browser's File System Access API — no backend, no build step,
no npm install required to run it.

The authoritative spec is [requirements/master-plan-webapp_spec_v0.1.md](requirements/master-plan-webapp_spec_v0.1.md)
(local-only, gitignored — see below). Unimplemented/future requirements needing more design are
tracked in [requirements/backlog.md](requirements/backlog.md) — don't implement anything from
there without first resolving the open questions listed.

[docs/](docs/) holds the public-facing, GitHub-tracked documentation (architecture, API surface,
deployment, data model, security, glossary) — read it alongside this file before starting work;
it's kept scrubbed of anything specific to any one deployment/organization, so prefer it over
`requirements/` when writing anything that will be committed.

## Local-only files (not pushed to GitHub)

`requirements/` (the spec, the backlog, and the real source spreadsheet) and `sample-data/backup/`
exist on disk but are excluded via `.gitignore` — the former because it's internal planning
material and the source spreadsheet contains real project data, the latter because it's backups
of a real data folder. `.claude/` is excluded too, since local permission settings end up with
machine-specific absolute paths in them. Don't assume `git status`/`git log` reflect these; check
the filesystem directly, and never `git add -f` anything under these paths.

`graphify-out/` (the `/graphify` knowledge-graph build of this repo — see "Codebase knowledge
graph (graphify)" under "Running / testing") is the one generated-output directory that **is**
version-controlled, not excluded: `graph.json`/`graph.html`/`GRAPH_REPORT.md`/`manifest.json` are
committed so the graph travels with the repo instead of requiring every clone to rebuild it, with
a `merge=graphify` driver on `graph.json` in `.gitattributes` to handle merge conflicts on that
generated file sanely. Only `graphify-out/cost.json` (local cumulative token-cost bookkeeping) is
gitignored.

## Hard constraints (non-negotiable, verified empirically)

- **No build step, no bundler, no TypeScript.** The app is plain HTML/CSS/JS copied as static
  files into the shared folder; opening `index.html` must just work. Any change must remain
  runnable this way.
- **No ES modules.** `<script type="module">` is blocked by CORS when `index.html` is opened via
  `file://` (verified with headless Chrome). Every JS file is a classic script using the IIFE
  pattern `(function (MP) { ... })(window.MP = window.MP || {});`, attaching itself to a
  namespace on the global `window.MP` object (e.g. `MP.schema`, `MP.fsAccess`, `MP.ganttView`).
  New files must follow this exact pattern and be added to `index.html`'s `<script>` list in
  dependency order (see that list for the current load order).
- **No IndexedDB.** `indexedDB.open()` never fires `onsuccess`/`onerror` under `file://` in
  Chrome (opaque/partitioned origin) — verified, not a missing optimization. `localStorage`
  works under `file://` but can't store a `FileSystemDirectoryHandle`. Consequence: **the
  directory handle cannot persist across sessions** — the user re-picks the data folder every
  time the app is opened. This is expected/spec'd behavior, not a bug to fix.
- Target browsers are **Chrome/Edge** only (File System Access API dependency); no
  Firefox/Safari support is in scope.

If a future task reconsiders adding a local dev server, these constraints could be relaxed
(real ES modules, IndexedDB) — but treat that as an explicit scope change to confirm with the
user, never assume it.

## UI language

All user-facing text (button/menu labels, headings, tooltips, `window.alert`/`confirm`/`prompt`
messages, placeholder/hint text) is **English** — the app targets an English-speaking user. This
was a deliberate one-time sweep (July 2026) of every string rendered to the screen; new UI text
must be written in English too.

A later refactoring pass extended this to the data model itself: every persisted JSON field name
(`initials`, `name`, `weeks`, `code`, `version`, `projects`, `completed`, etc. — see
[docs/glossary.md](docs/glossary.md)) and every internal identifier that directly mirrors one
(`state.ui.currentView`, `showCompletedProjects`, the view code `'resource-load'`, exported function names
like `findOrphanResources`, …) is English too — there's no carve-out left for Italian anywhere in
the persisted data or in the code paths that construct/read it. The only remaining exceptions are
**code comments** (this codebase's comments stay in Italian, written by/for the maintainer) and
**local scratch variables that don't literally mirror a data-model field** (e.g. `progetto`,
`righe`, `cartella`, `dettagli` as loop/local names) — same treatment as comments, not part of
"what a user reads on screen" nor of the persisted schema. Data written before this pass used the
old Italian field names and file/directory names (`team-risorse.json`, `progetti/`); see "Legacy
data migration" below for how it's upgraded automatically.

## Running / testing

There is no build, dev server, or automated test suite in this repo. To run the app: open
[index.html](index.html) directly in Chrome or Edge (`file://` path). Sample data for manual
testing lives in [sample-data/](sample-data/) (a full dataset: `manifest.json`,
`team-resources.json`, `projects/*.json`) — point the app's folder picker at that directory.

For quick non-interactive checks (no real directory handle available headlessly, since
`showDirectoryPicker()` needs a user gesture), load the plain-script modules into a Node `vm`
sandbox with a stubbed `window`/`document` and call their exported `MP.*` functions directly
against JSON read from `sample-data/` — this exercises the real `schema.js`/`validation.js`/etc.
logic without a browser. Combine with the headless-Chrome check below for script-loading/console
errors.

To verify a change headlessly (e.g. checking for console errors after opening the page), use
headless Chrome with an explicit `--user-data-dir` and a native Windows path:
```
chrome.exe --headless=new --disable-gpu --no-sandbox --user-data-dir=<writable dir> --enable-logging=stderr --v=1 --virtual-time-budget=3000 --dump-dom "file:///<absolute Windows path>"
```
then grep the stderr output for `CONSOLE` to see `console.log`/errors from the page. A Git-Bash
style path (`/tmp/...`) resolves incorrectly — always use a native Windows path.

[spike-fsa/index.html](spike-fsa/index.html) is a standalone throwaway test page (not part of the
app) for manually checking whether File System Access API directory permissions survive a
browser/PC restart on a real network/OneDrive folder — unrelated to the main app's code path.

### Codebase knowledge graph (graphify)

`graphify-out/` (committed — see "Local-only files" above for the one exception, `cost.json`)
holds a `/graphify` knowledge-graph build of this repo: `graph.json` (nodes/edges), `graph.html`
(interactive viewer), `GRAPH_REPORT.md` (community/god-node/audit summary), plus a `manifest.json`
used for incremental `--update` runs. It's a dev-exploration aid, not part of the
shipped app — nothing under `js/`/`css/`/`index.html` reads it. Rebuild it with `/graphify .`
(full rebuild) or `/graphify . --update` (incremental); query an existing graph with
`/graphify query "<question>"` instead of re-deriving structure by hand. Since docs/papers/images
need an LLM pass (Gemini if `GEMINI_API_KEY`/`GOOGLE_API_KEY` is set, otherwise Claude Code
subagents dispatched via the Agent tool), a run can legitimately skip that pass if subagent
dispatch is unavailable/declined in a given session — the resulting graph then only covers code
structure (AST-derived), which is still useful for navigating `js/` but won't surface
doc-to-code or narrative relationships; rerun semantic extraction later to fill that in.

### Versioned release packaging (GitHub Actions)

[.github/workflows/release.yml](.github/workflows/release.yml) publishes a downloadable, versioned
zip for end users who just want to run the app (not clone the repo): pushing a git tag `vX.Y`
triggers the workflow, which (1) fails the build if `APP_VERSION` in
[js/ui/common/app-header.js](js/ui/common/app-header.js) doesn't match the pushed tag, (2) builds
`weavo-vX.Y.zip` via `git archive` scoped to `index.html favicon.svg css js sample-data` (so untracked/gitignored
content like `sample-data/backup/` can never end up in it), and (3) creates a GitHub Release with
that zip attached via `softprops/action-gh-release`. `docs/`, `README.md`, `requirements/`, and
`spike-fsa/` are deliberately excluded from the zip — they're dev-facing, not needed to run the
app. Per-release steps are manual and undocumented in code: bump `APP_VERSION`, commit, then
`git tag -a vX.Y -m vX.Y && git push origin vX.Y`. Never reuse/force-push an existing tag to fix
a bad release — delete it (local + remote) and the GitHub Release, then re-tag.

## Data model

One JSON file per project under `projects/`, plus two shared files at the data folder root:
`manifest.json` (project index + global week range `weeks.first`/`weeks.last`) and
`team-resources.json` (the team/resource anagraphics, see below).

### Team/resources model

A **team** (`dev`/`vv`/`devops`/`run`/`build`/... — dynamic, not an enum in code) is the only
grouping entity, with a color and a name. A **resource** (initials + full name) always belongs to
exactly **one** team — this is a real 1-team-to-N-resources relationship, not a loose tag:
resources are nested inside their team in `team-resources.json`, never listed independently.

```json
{ "teams": [ { "code": "dev", "name": "Development", "color": "#00B050", "resources": [ { "initials": "LC", "name": "Luca Ciazzi" } ] } ] }
```

- All CRUD for teams and resources is centralized in the dedicated page
  [js/ui/team-resources/team-resources-view.js](js/ui/team-resources/team-resources-view.js)
  (`js/ui/crud/team-crud.js` + `js/ui/crud/resource-crud.js`). The gantt legend
  ([js/ui/gantt/legend.js](js/ui/gantt/legend.js)) and the resource-load view
  ([js/ui/resource-load/resource-load-view.js](js/ui/resource-load/resource-load-view.js)) are
  **read-only** — don't add editing affordances back there. Navigation to the team/resources page
  is via the hamburger menu ([js/ui/common/toolbar.js](js/ui/common/toolbar.js)) only; neither
  view duplicates it with its own "manage" button (removed as redundant).
- A team can have zero resources; deleting a team with resources still assigned is **blocked**
  (`MP.teamCrud.deleteTeam`) — the user must move or delete its resources first.
- Moving a resource to a different team (`MP.resourceCrud.moveResource`) does **assisted bulk
  regularization**: before persisting, it scans every non-`completed` week entry referencing the
  resource (`MP.validation.findResourceAllocations`) and, for cells where the move leaves every
  allocated resource belonging to a single team ("unambiguous"), rewrites that cell's `team` to
  match — after a confirmation showing how many cells will be updated — so the cell's rendered
  color (driven by `entry.team`, see `gantt-cell.js`) follows the resource automatically. Cells
  where the move leaves resources spanning more than one team ("ambiguous", e.g. a cell with two
  resources independently moved to different teams) are left untouched and keep being surfaced
  by `MP.validation.findTeamMismatches` (see below) for manual fix-up in the cell popover.
  Deleting a resource (`MP.resourceCrud.deleteResource`) similarly cascades: it removes the
  resource's initials from every non-`completed` week entry's `resources` (clearing `team` too if
  `resources` becomes empty, preserving `milestone: true` if set) before removing the resource
  from `team-resources.json`, showing a copyable plain-text summary of the affected allocations
  first and requiring explicit confirmation. `completed` task allocations are never touched by
  either flow (see below) and become orphan references once the resource is gone. Project-level
  `solutionAnalyst`/`vvReference` initials references are never touched by either flow either —
  see "Project team/referents" below.
- A week entry's `team` field must match the team of every resource in its `resources` array in
  principle, but this isn't enforced at write time for pre-existing data — only flagged. The
  cell popover ([js/ui/gantt/cell-popover.js](js/ui/gantt/cell-popover.js)) enforces it going
  forward: you pick a team first, then only resources belonging to that team are selectable.

Key rules (see [js/data/schema.js](js/data/schema.js) and spec §4 for full detail — note the spec
predates the team/resources merge and still describes the old two-file `risorse.json` +
`tipi-risorsa.json` split, plus the old Italian field names throughout; trust the code over
§4.5/§4.7 there):
- **Nothing about teams/colors is hardcoded in app code** — everything renders dynamically from
  `team-resources.json` (legend, popover options). `SEED_TEAM` in `schema.js` is only a proposed
  starting point for a brand-new empty dataset, not a constraint.
- Allocation model is **boolean** — a resource is either allocated to a task in a given week or
  not; no percentages/fractions.
- A week entry (`task.weeks[iso]`) is only meaningful if `team` + non-empty `resources` are
  both present together, or if `milestone: true` is set, or if `completed: true` is set (see
  below) — never a partial state like `{team: "dev", resources: []}`. Always construct these via
  `MP.schema.createWeekEntry(...)`.
- `team` codes and resource `initials` referenced by a task but missing from
  `team-resources.json` are **orphan references**
  (`MP.validation.findOrphanTeam`/`findOrphanResources`); a resource allocated under a `team`
  different from the one it currently belongs to is a **mismatch**
  (`MP.validation.findTeamMismatches`, non-`completed` tasks and non-`completed` weeks only —
  see below). Both are surfaced as non-blocking warnings (badge on the cell + line in the
  warnings panel), never silently dropped or auto-corrected.
- A task marked `completed: true` is excluded from overallocation counting *and* from mismatch
  detection (its weeks no longer count as active commitment) but its data is not deleted or
  auto-corrected — closed tasks are never touched by team/resource changes, including the
  bulk-regularization-on-move and cascade-delete-on-deletion flows described above.
- A single week entry can *also* carry `completed: true`, independent of `milestone` and
  orthogonal to task-level `completed` above: it records that one week of an otherwise-active
  task has been finished, without closing the whole task (a task can freely mix completed and
  active weeks). Set via a "Completed" checkbox in `cell-popover.js`
  ([js/ui/gantt/cell-popover.js](js/ui/gantt/cell-popover.js)), available in **both** single-cell
  and bulk (multi-week range) mode — unlike `milestone`, which stays single-cell-only — where bulk
  mode applies the same anchor-cell normalization already used for `team`/`resources` (all
  selected weeks end up with the anchor week's `completed` value). A completed week gets the
  exact same treatment as a completed task, just scoped to that one cell instead of the whole
  task: excluded from `MP.overallocation.buildAllocationIndex` and
  `MP.validation.findTeamMismatches`, rendered with the identical `#d9d9d9` grey background
  (`gantt-cell.js`'s `weekCompleted = task.completed || entry.completed`) which also suppresses
  the overallocation/mismatch badges on that cell (orphan-team/orphan-resource badges still show
  regardless, same as for a completed task). `MP.weekShift.canShiftWeeks` blocks the ◀/▶ shift menu
  on any selected week that's completed, and a whole-baseline shift
  (`MP.weekShift.canShiftBaseline`/`shiftBaselineData`) leaves a completed week fixed at its
  original position instead of translating it with the rest of the task — see the `week-shift.js`
  entry below for how a resulting collision is handled. Fully reversible (unchecking the box
  clears the flag) and never destructive — the week's `team`/`resources` are preserved, not
  cleared, while `completed: true` is set.

### Project team/referents

Each project's `referents` field (`projects/<slug>.json`) is a structured object, not free text:

```json
{ "projectManager": "", "projectEngineer": "", "solutionAnalyst": "", "vvReference": "", "note": "" }
```

- `projectManager`/`projectEngineer`/`note` are free text (`note` multi-line). `solutionAnalyst`/
  `vvReference` hold a resource **initials** value (or `''`), selectable from any resource of any
  team in `team-resources.json` — no role/team restriction — and resolved to a display name on
  demand via `MP.schema.findResourceEntry`, never denormalized into the stored value.
- Built via `MP.schema.createProjectReferents(...)`. Edited as a whole (not field-by-field)
  through `MP.modal.promptProjectForm`, a dedicated multi-field modal (text/textarea/`<select>`
  with per-team `<optgroup>`s) — used both for project creation (`MP.projectCrud.createProject`,
  which now opens this form for the name *and* all referent fields in one step, since the button
  that used to live in the gantt toolbar moved into the hamburger menu — see `toolbar.js` below)
  and for the existing "Project team…" row-menu edit action (`MP.projectCrud.editReferents`,
  `project-crud.js`).
- Read-only view: the "i" icon rendered by `gantt-row.js` before the project name (before the
  completed checkbox, only on the row where the name itself is shown) opens
  `MP.modal.showProjectCard`, listing name, completed status, baseline/task counts, and all 5
  referent fields with the two initials references resolved to a name. No "Edit" action inside it
  by design — editing stays solely in
  the "Project team…" row-menu entry, so there's exactly one write path for this field.
- A `solutionAnalyst`/`vvReference` initials value that no longer exists in `team-resources.json`
  is an **orphan reference**, same non-blocking-warning treatment as the task-level ones —
  `MP.validation.findOrphanProjectReferents`, surfaced in the gantt warnings panel.
- Legacy data: before this field was structured, `referents` (then still named `team`) was a
  free-text string. Loading a project whose `referents` is still a string
  (`repository.loadDataset`, via `MP.schema.normalizeProjectReferents`) migrates it in memory —
  the old text becomes `referents.note`, the other 4 fields start empty — and the file is
  rewritten in the new shape the next time that project is saved (lazy "self-heal on touch", same
  principle as the baseline-milestone self-heal above; no batch migration script). This self-heal
  is orthogonal to, and predates, the whole-schema legacy migration described next — it runs
  regardless of `manifest.schemaVersion`.

### Legacy data migration

Every field name described above is a deliberate, one-time rename from an earlier Italian-named
schema (`nome`, `sigla`, `settimane`, `codice`, `versione`, `risorse`, `archiviato`/`archiviata`,
`concluso`, the file `team-risorse.json`, the directory `progetti/`), plus a later, narrower rename
of `archived` → `completed` on `project`/`baseline` — done to unify that concept with task-level
`completed` (checkbox in the row, not a menu action; see "Where to make common changes" and
`gantt-row.js` below). Because real data folders on a shared OneDrive/network location can't be
migrated by hand, `manifest.schemaVersion` gates automatic, one-time upgrades:
`MP.legacyMigration.migrateIfNeeded` ([js/data/legacy-migration.js](js/data/legacy-migration.js)),
called as the first step of `repository.loadDataset`, checks the version on every folder connect
and dispatches to one of two incremental transforms based on what it finds (both converge on the
current `SCHEMA_VERSION`, currently `3`):

- **v1 (or missing) → current**: the folder is legacy Italian-named data — old-shaped files are
  read (following `manifest.progetti`, the old field name, since the manifest itself hasn't been
  transformed yet), transformed in memory via the module's pure `transformManifest`/
  `transformTeamResources`/`transformProject` functions (which now also emit `completed` instead of
  `archiviato`/`archiviata`, so a v1 folder lands directly on the current shape in one pass), and
  written under the current names (`team-resources.json`, `projects/`) — `manifest.json` is written
  **last**, so it doubles as the commit point: an interrupted migration just retries from scratch
  on the next connect, no partial state to reconcile. The old `team-risorse.json` file and
  `progetti/` directory are removed only after the new files are fully written.
- **v2 → current**: the folder is already English-named (current `PATHS`, no file/directory
  renaming needed) but still has `archived` instead of `completed` on project/baseline —
  `renameArchivedToCompletedProject`/`renameArchivedToCompletedBaseline` do a narrower rewrite of
  just the project files, `manifest.json` written last as the commit point, same as above.
  `team-resources.json` is untouched by this step.

A folder already on the current `schemaVersion` is detected cheaply (one small JSON parse) and
skips migration entirely.

This mechanism deliberately has **no dedicated pre-migration backup and no crash-recovery
bookkeeping** — data in this app is not treated as irreplaceable: the app already has its own
manual/automatic backup feature (`MP.repository.createBackup`, see `docs/deployment.md`
"Backups") a user can run before opening an old folder with a new app version, or fall back to
OneDrive's own version history. Keep the v1-migration's own legacy path literals
(`'team-risorse.json'`, `'progetti'`) hardcoded, never sourced from `MP.schema.PATHS` — after this
refactor those constants point at the *new* names, and a legacy folder by definition doesn't have
those yet.

## Architecture

Load order in [index.html](index.html) reflects the dependency chain; a new file must be
inserted at the right point in that list. Layers, low → high:

1. **`js/data/`** — persistence primitives and dataset shape.
   - `schema.js`: canonical shape of every JSON file + factory/validity helpers (no I/O).
   - `fs-access.js`: thin wrapper over the browser File System Access API (permissions,
     read/write text file, list/remove files and directories) — no application logic.
     `pickDirectory()` passes a stable `id` to `showDirectoryPicker()`; per spec this should make
     Chrome/Edge reopen the dialog at the last-used folder, but **verified empirically that it
     does not under `file://`** (fails even on a same-session page reload, no browser restart
     needed) — same likely cause as the IndexedDB limitation below (no stable storage origin for
     `file://` pages). Left in place as harmless/spec-correct but must not be presented to the
     user as reducing clicks. See docs/deployment.md "No persisted connection" for the full
     writeup and why a real cross-session/cross-user "recent folders" feature is still out of
     scope.
   - `legacy-migration.js`: one-time, automatic upgrade of a data folder still on an older
     `schemaVersion` — see "Legacy data migration" above. Split into pure transform functions (no
     I/O) and an orchestration function (`migrateIfNeeded`, the only I/O, invoked from
     `repository.loadDataset`).
   - `repository.js`: composes `fs-access` (and, first, `legacy-migration`) into whole-dataset
     load (`loadDataset`) and raw per-file save/backup operations, with no conflict checking of
     its own. Also exports `readTextFileOrNull(dirHandle, path)`, a tolerant reread (returns
     `null` instead of throwing if the file no longer exists) factored out so `save-coordinator.js`
     and `remote-check.js` share the exact same "reread and compare to the known `rawText`"
     primitive instead of each reimplementing the try/catch.
   - `save-coordinator.js`: the **only** place that should perform a write in response to a user
     edit. Wraps `repository` saves with reread-before-write conflict detection (§6.4 of spec):
     rereads the file from disk immediately before writing, and if it differs from the last text
     this session knows about, computes a human-readable diff via `MP.conflictDiff.summarize`
     (see below) and prompts via `MP.modal.confirmConflict({ label, path, diffLines })` before
     overwriting.
   - `conflict-diff.js`: pure, read-only structural diff between two raw-text versions of the same
     file, used only to populate the save-conflict modal above with **what** changed instead of
     just *that* it changed. Parses both JSON texts and dispatches on `path`: for a project file,
     diffs at task/week granularity (`"<iso> added/cleared/changed"`, new/removed tasks — matched
     by a `baselineVersion::taskName` key since the schema has no stable task id, so a rename shows
     up as one task removed and a different one added, not as a dedicated "renamed" line —
     `completed` toggles); for `manifest.json`, added/removed projects and week-range changes; for
     `team-resources.json`, added/removed/renamed/recolored teams and added/removed/renamed
     resources (matched by `code`/`initials`, the stable keys). Falls back to a generic
     "unable to summarize" line on any parse error, and caps output at 20 lines (`+N more` trailer)
     so a massively diverged file doesn't blow up the modal.
   - `remote-check.js`: passive, **event-driven** (never a timer) check for changes on disk outside
     the save path — `findChangedFiles(state)` rereads every file the session knows about
     (manifest, team-resources, every loaded project) via `readTextFileOrNull` and returns the ones
     whose disk text differs from the known `rawText`, with no modal and no mutation of that
     `rawText` (so save-coordinator's own check at actual save time is untouched). Invoked from
     `app.js`'s `visibilitychange` listener, gated by `state.ui.notifyOnRemoteChanges` (see
     `store.js` below) — see [docs/database.md](docs/database.md#conflict-detection) for the full
     picture of how this fits alongside the save-time reread-before-write check.
   - `slug.js`: kebab-case ASCII slug generation for project filenames, with collision
     suffixing — shared between the app and the Excel import script's own copy of the algorithm.
2. **`js/state/store.js`** — minimal in-memory state container + pub/sub (`getState`/`setState`/
   `subscribe`), no framework. `state.status` drives which top-level view `js/app.js` renders:
   `init | unsupported | not-connected | loading | ready | error`. `state.dataset` (present when
   `ready`) holds `{ manifest, teamResources, projects: Map<file, {data, rawText}>, warnings }`
   plus `*Meta` entries used by save-coordinator for conflict checks. `state.ui.currentView`
   (`gantt | resource-load | milestones | team-resources`) picks the page `js/app.js` renders below
   the top bar. `state.ui.autoBackupOnExit` and `state.ui.notifyOnRemoteChanges` (both default
   `false`) are the only `ui.*` flags persisted across sessions — each seeded from and written
   through its own `localStorage` key (`mp.autoBackupOnExit`, `mp.notifyOnRemoteChanges`) via the
   store's own `setAutoBackupOnExit(value)`/`setNotifyOnRemoteChanges(value)` (not `setState`
   directly, so the flag and its `localStorage` copy can't drift), read once at module load since
   `store.js` loads before every other script that touches it. Both toggled from `toolbar.js`'s
   hamburger menu; `autoBackupOnExit` is consumed by `app.js`'s `pagehide` listener,
   `notifyOnRemoteChanges` by its `visibilitychange` listener — see below.
3. **`js/model/`** — pure derivations over an in-memory dataset, no I/O, no DOM:
   `week-utils.js` (ISO week arithmetic, Monday-based; `getCurrentWeekIso()` returns the Monday of
   the real-world current week — used by both the gantt and resource-load views to highlight
   today's column header, class `current-week`, and to draw a bold left-border "today" line down
   the whole column, class `current-week-line`, computed from the browser's local clock so it's
   never persisted/stored), `overallocation.js` (cross-project initials×week allocation index,
   used both by the cell popover warning and the gantt/resource-load highlighting),
   `validation.js` (orphan `team`/`initials` detection, plus `findTeamMismatches` for resources
   allocated under a team they no longer belong to), `milestones.js`
   (`computeBaselineMilestones`: for each baseline, derives the single "effective" release week
   from the (possibly duplicated/inconsistent) `milestone: true` flags across its tasks — the mode
   across all tasks that have one set, reading completed tasks too since this is read-only
   derivation, not the write-side sync in `gantt-view.js`; flags a baseline `inconsistent` if its
   tasks disagree on the week, without correcting the underlying data — feeds the milestones page;
   each row also carries `distinctDates` (every distinct ISO week found with `milestone: true`
   across the baseline's tasks, sorted — not just the "winning" one), used by the function below to
   surface the other dates of an inconsistent baseline rather than silently picking one.
   `countUpcomingBaselines` filters those same rows to `settimana >= getTodayIso()` — a simple ISO
   string compare, valid since both sides are `YYYY-MM-DD` — and feeds the "upcoming baselines"
   count in the shared `dataset-header.js`, so gantt/resource-load users see it without opening
   the Milestones page. `computeUpcomingMilestonesByMonth(dataset, showCompletedProjects)` is the pure
   derivation behind the Milestones page's copyable list (see below): filters to the same
   `settimana >= getTodayIso()` upcoming rows, then — for an `inconsistent` baseline — picks the
   *most recent* of `distinctDates` as `displayDate` (deliberately different from
   `computeBaselineMilestones`'s own "most frequent, earliest on tie" pick, which stays unchanged
   for the grid/histogram/upcoming-count) and keeps the rest as `otherDates`; groups rows by
   calendar month (`YYYY-MM` of `displayDate`), sorted ascending, rows within a month sorted by
   date then project name. Returns plain data (no formatted strings, no DOM) — date/month display
   formatting is the UI layer's job, kept out of this pure-derivation module). `week-utils.js` also
   exports `getTodayIso()` (today's date, recomputed from the browser clock on every call, never
   persisted) alongside the pre-existing `getCurrentWeekIso()` (the Monday of the week containing
   today) — `countUpcomingBaselines` uses the former since a release date is a specific day, not a
   week-column highlight.
   `week-shift.js` is a small, self-contained pure module for the "shift" feature (see
   `gantt/` below): `canShiftWeeks(dataset, task, weeks, direction)` is the ammissibility
   predicate (blocks on `task.completed`, on any *source* week in the selected range itself
   carrying `completed: true` — per-week completion, see the Key rules section above, is "closed
   data" just like a completed task and is never moved — on the shift crossing
   `manifest.weeks.first`/`last`, or on the one destination week that falls outside the selected
   block already holding a non-empty entry in *this* task — reused both to enable/disable the
   shift menu items and as a safety re-check before mutating) and `shiftWeeksData(task, weeks,
   direction)` is the mutation, which snapshots every entry in `weeks` before deleting any of them
   so the write pass is never order-dependent — this preserves each cell's own content when
   shifting a multi-week block (a "translate", not a normalize-to-one-value bulk edit, see below).
   The same module also exports `canShiftBaseline(dataset, baseline, deltaWeeks)`/
   `shiftBaselineData(baseline, deltaWeeks)` for a coarser-grained operation: shifting an
   entire baseline (every non-`completed` task's every non-empty week, milestones included)
   by an arbitrary signed number of weeks in one go, entered by the user as a single free-form
   number (not limited to ±1 like the per-cell shift above). A week entry with `completed: true`
   is treated as **stationary** — never translated, same "closed data never touched" principle as
   the per-cell shift above — so among the *moving* (non-completed) weeks of a task the resulting
   key→entry mapping is still injective by construction (no two moving source weeks can collide
   with each other), but a moving week can still collide with a *stationary* completed week that
   happens to already sit at its destination iso; `canShiftBaseline` detects this explicitly per
   task (comparing each moving target against that task's own set of stationary/completed isos)
   and blocks the whole operation with a reason naming the task/weeks involved, rather than
   silently clobbering the stationary week. `completed` tasks are skipped entirely (left
   untouched, same non-auto-correction principle used everywhere else) and reported via
   `skippedCompletedCount`; individual stationary/completed weeks left in place inside an
   otherwise-active task are reported separately via `skippedCompletedWeeksCount` — both feed the
   `MP.baselineCrud.shiftBaseline` confirmation prompt so the user knows what was left untouched.
   Milestones need no dedicated re-sync (unlike `syncBaselineMilestone` in `gantt-view.js`, which
   *propagates* a milestone across a baseline's tasks): here every moving task moves by the same
   delta, so a milestone already shared across tasks stays shared after the shift — the only
   edge case is a milestone that lived solely on a `completed` task or on a stationary completed
   week, which then diverges from the (now-shifted) rest of the baseline; this simply shows up as
   `inconsistent` on the Milestones page like any other pre-existing disagreement, self-healing
   the next time a milestone in that baseline is touched via the popover. If shifting would push
   even one *moving* week outside `manifest.weeks.first`/`last`, the whole operation is blocked
   (no partial shift, no auto-extension of the manifest range) — `MP.baselineCrud.shiftBaseline`
   (see `crud/` below) surfaces the reason via `window.alert`.
4. **`js/ui/`** — rendering + event wiring, organized by concern:
   - `common/`: generic building blocks reused across views — `modal.js` (blocking dialogs:
     `confirmConflict` for save conflicts, `promptText`/`promptColor` single-field prompts, plus
     the project-referents form/card pair described above — `promptProjectForm` and
     `showProjectCard` — kept as bespoke functions rather than a generic form-builder since
     they're the only multi-field use case so far; `showHelpGuide` is the odd one out — no
     promise/result to resolve, just a static read-only panel — opened by the "?" button described
     below, with a short section-by-section walkthrough of the gantt interactions: single/bulk
     cell editing, clearing an allocation, the shift feature, milestones, row actions, and the
     warning badges), `toast.js` (non-blocking notifications), `context-menu.js` (the
     "⋮" action menu used by every CRUD row action — also reused as-is by the shift feature's
     right-click menu, see `gantt/` below; an action entry supports `disabled: true` (+ `title`
     tooltip explaining why, same convention as native disabled controls) to render a non-
     clickable greyed-out item instead of omitting it, and `header: true` to render a plain
     non-interactive text row — e.g. "N weeks selected" — instead of a button, both generic
     additions with no CRUD-menu-specific assumptions baked in), `toolbar.js` (top-bar hamburger menu — the
     single entry point for view switching / backup / "+ New project" / "Change data folder…",
     reuses `context-menu` rather than duplicating open/close logic; next to "💾 Backup" sits a
     "Backup on exit" toggle (`state.ui.autoBackupOnExit`, same ✓-prefix convention as the
     view-switch rows above it) that, when on, makes `app.js`'s `pagehide` listener call
     `MP.repository.createBackup` automatically on tab/window close — best-effort only, since a
     browser doesn't guarantee async work finishes once a page is actually unloading, see
     docs/deployment.md "Backups"; right below it, a second toggle, "Notify me of changes on disk"
     (`state.ui.notifyOnRemoteChanges`, same ✓-prefix/`setState`-avoiding convention), gates
     `app.js`'s `visibilitychange`-driven soft remote-change check — see
     [docs/database.md](docs/database.md#conflict-detection); project creation is reachable
     from every page, not just the gantt one, so after a successful create it switches
     `state.ui.currentView` to `gantt` so the result is visible; "Change data folder…" (after a
     `window.confirm`) resets `state` to `{ status: 'not-connected', dirHandle: null, dataset: null }`
     — no dedicated disconnect logic in `app.js`, it just reuses the existing `not-connected` screen
     and its "Select data folder" button/picker flow, since releasing the handle and re-running
     `connectToDirectory` needs no special-casing — plus `renderPageTitle`, a small label next to
     the hamburger showing the current view's name, sourced from the same `VIEWS` list used to
     build the menu so the two never drift apart: `gantt` → "Master Plan", `resource-load` →
     "Workload", `milestones` → "Milestones", `team-resources` → "Team & resources" (the
     internal `state.ui.currentView` codes are the same English words as the displayed `label`
     for every view except `gantt` — a short internal code rather than "Master Plan" — and
     `resource-load`, kept as the pre-existing internal id/filename even though the label shown
     to users is now "Workload", to avoid a wider rename across the module's file/folder name,
     CSS classes, and every code comment referencing it);
     `.page-title`'s font-size is
     tuned in CSS to make its box the same height as `.hamburger-btn` next to it, since it has no
     padding/border of its own to match the button's box with; `renderHelpButton` is the round "?"
     button pushed to the far right of the top bar via `margin-left: auto` on `.help-btn` (the only
     item in the flex row that needs it — everything else stays left-aligned), global like the
     hamburger menu and unrelated to `currentView` — its one job is `MP.modal.showHelpGuide()`),
     `dataset-header.js` (the
     header shared by the gantt, resource-load, and milestones pages: a `.gantt-toolbar` info
     line — connected folder name (`state.dirHandle.name`; the File System Access API never
     exposes an absolute filesystem path, see Hard Constraints/`app.js` — this is the closest
     available proxy for "which data folder is this") + week range + task-row count + project
     count + upcoming-baseline count (`MP.milestones.countUpcomingBaselines`, release week ≥ today —
     see `milestones.js` above), computed via `MP.ganttView.buildRows` so all pages report the exact
     same numbers — plus the team-color legend from `legend.js`; takes
     an optional extra element to append to the info line, used by the gantt page for its
     completed toggles (the "+ New project" button that used to live here moved to
     the hamburger menu, see `toolbar.js` above), and by the milestones page for its
     "Total releases in period" counter), `app-header.js` (static brand header — logo, "Weavo" title,
     version, copyright — rendered once into `#app-header` from `app.js`'s `bootstrap()`,
     outside the `state.status` render cycle since its content never changes; present on every
     screen including `not-connected`/`unsupported`/`error`, not just the `ready` views).
   - `crud/`: one file per entity (`project-crud.js`, `baseline-crud.js`, `task-crud.js`,
     `resource-crud.js`, `team-crud.js`). Each is create/rename/delete/reorder (+ `toggleCompleted`
     for tasks/baselines/projects — task's fires with no confirmation, baseline's/project's
     confirms only when marking as completed, not when reactivating — `recolorTeam`/`moveResource`
     for team/resources) directly against the in-memory dataset, persisted via
     `MP.saveCoordinator`/`MP.repository`, then triggers re-render. `project-crud.js`'s
     `createProject`/`editReferents` open `MP.modal.promptProjectForm` themselves when not given a
     preset value (same "modal call lives inside the CRUD function" pattern as the rest of this
     file), see "Project team/referents" above for the field shape. `baseline-crud.js`'s
     `shiftBaseline(state, file, baseline, deltaInput)` is the user-facing entry point for the
     whole-baseline shift described above (`MP.weekShift.canShiftBaseline`/`shiftBaselineData`,
     `js/model/week-shift.js`): a single `window.prompt` for a signed integer number of weeks
     (`deltaInput` bypasses it, used by tests), validated as a non-zero whole number, then
     `canShiftBaseline` either rejects with `window.alert(check.reason)` or feeds a
     `window.confirm` summary (weeks, direction, tasks/allocations affected, completed tasks and
     completed weeks left untouched) before mutating and persisting — reachable from the baseline row's "⋮" menu
     (`gantt-row.js`, "Shift baseline…", next to "Rename baseline"). The "Rename project"/
     "Rename baseline" menus no longer carry an Archive/Reactivate entry — that's now the
     checkbox to the left of the name (col1 for project, col2 for baseline), mirroring the
     pre-existing task checkbox in col3, see below.
   - `gantt/`: the main view. `gantt-view.js` builds the compact grid (CSS Grid + `position:
     sticky` for frozen first 3 columns and frozen header row — deliberately not a heavyweight
     gantt library, per spec §9) and exports `buildRows` (dataset → visible task rows, honoring
     `showCompletedProjects`/`showCompleted`) so `dataset-header.js` can compute the same row count
     shown in both pages. Completing isn't only project-level: a baseline can independently be
     completed too (`baseline.completed`, toggled via the checkbox in col2, confirmed only when
     marking as completed — `MP.baselineCrud.toggleCompleted`) — `buildRows` filters
     `progetto.baseline` down to non-completed ones (unless `showCompletedProjects` is on) *before*
     deciding whether the project needs a "— no baseline —" placeholder row, so a project whose
     only baselines are all completed still gets a reachable placeholder row instead of
     disappearing entirely. A project's own `completed` still wins first — a completed project
     hides regardless of its baselines' individual flags. `MP.milestones.computeBaselineMilestones`
     applies the same per-baseline filter (same `showCompletedProjects` flag, no separate toggle),
     so a completed baseline's release also drops out of the milestones page and the header's
     "upcoming baselines" count. Completing a baseline never touches its tasks/data, and does
     **not** exclude them from overallocation/team-mismatch checks either (unlike task-level
     `completed`) — same no-destructive-auto-correction principle as project completion, purely a
     visibility change. `gantt-row.js` renders one task row; `gantt-cell.js` renders one
     week×task cell (double click is disabled — every action goes through right-click, see
     below; `weekCompleted = task.completed || entry.completed` drives the `#d9d9d9` grey
     background and, further down, suppresses the overallocation/mismatch checks below for that
     cell — see "Key rules" above for the per-week `completed` flag itself; a cell whose
     resource(s) are overallocated gets a native
     `title` tooltip built from `MP.overallocation.findAllocations`, listing per resource the
     other project/baseline/task it's allocated to that same week — same
     `projectName`/`baselineVersion`/`taskName` shape the resource-load heat cells already use in
     `resource-load-view.js`, so the wording matches across both views); `cell-popover.js` is the
     editing popover (team-first — each `<option>`, and the closed control itself once a team is
     picked, gets its background tinted with that team's `color` via inline `style`, functional
     since the app targets Chrome/Edge only, so the team stays visually identifiable without
     reopening the dropdown — then multi-select resources restricted to that team and sorted
     alphabetically by `name` (`localeCompare`, computed on a copy so `team.resources`'s stored
     order in `team-resources.json` is never mutated), then a "Completed" checkbox — single-cell
     **and** bulk mode alike, see "Key rules" above — then the milestone flag — milestone only in
     single-cell mode, see below — autosave on close, non-blocking double-allocation warning),
     opened only from the right-click handler
     (`gantt-view.js`'s `openCellContextMenu`, see `cell-selection.js` below), never from a plain
     click; a task admits only **one** milestone week, and all
     tasks of the same baseline share a single milestone: `gantt-view.js`'s `handleCellSaved`
     calls `syncBaselineMilestone` when a saved entry has `milestone: true` — it clears the flag
     from every other week of every non-`completed` task in `baseline.task` (including the edited
     task itself) and sets it on the new week for all of them, preserving any existing
     `team`/`resources` on that week rather than overwriting it; unchecking the milestone
     (`clearBaselineMilestone`) is symmetric, removing it from the other tasks that had inherited
     it too — otherwise the "shared deadline" invariant would silently drift. `completed` tasks
     are skipped in both directions (same "closed tasks are never auto-touched" principle as
     team-mismatch handling above). This still uses the existing per-cell `cell-popover.js` as the
     only UI — no dedicated baseline-deadline popover — and the field stays duplicated on each
     `task.weeks[iso]` rather than moving to `baseline` itself; pre-existing datasets with
     inconsistent milestones across a baseline's tasks are **not** migrated automatically — they
     self-heal only the next time any task in that baseline has its milestone touched via the
     popover. This resolves the "Milestone unica per baseline" item in
     `requirements/backlog.md`, which should be removed/marked done there.
     `cell-selection.js` is the **single** range-selection controller for the whole grid,
     confined to one task row at a time (module-singleton state, highlighted via the
     `cell-selected` CSS class rather than the app store, since it doesn't need to survive a full
     re-render). A plain click sets a lone-cell anchor; a shift-click on the same row extends the
     range from that anchor — both are **highlight-only**, no popup opens on click. Every actual
     action is triggered by **right-click** instead: `gantt-cell.js`'s `contextmenu` listener
     calls `MP.cellSelection.getRangeForAction` (resolves to the current selection's weeks if the
     clicked cell falls inside it, otherwise re-anchors the selection to just that lone cell —
     Excel-style "right-click outside the selection replaces it") and hands the resulting week
     array to `gantt-view.js`'s `openCellContextMenu`, which:
     - always opens `cell-popover.js` **below** the cell (single-cell mode for a lone week,
       bulk mode — same team+resources+`completed` applied to every selected week, no milestone
       field, see `requirements/backlog.md` on why milestone stays a single-cell/single-baseline
       concept — for a multi-week range);
     - additionally opens the shift menu (see below) **above** the cell, at the same time, but
       only if at least one week in the range already has an allocation (`MP.schema.isWeekEntryEmpty`
       checked per week) — an empty range has nothing to shift.

     After a successful save (single-cell or bulk), `gantt-view.js` records the saved task+week(s)
     in a module-level `lastEdited` (with a timer that clears it after ~2.5s, triggering one more
     re-render to fade it out) and threads it down through `renderTaskRow`/`renderWeekCell` so the
     just-saved cell(s) get a `cell-just-edited` CSS highlight after the full re-render — needed
     because `js/app.js`'s `render()` rebuilds the entire DOM tree from scratch on every
     `MP.store.setState()`, which would otherwise silently drop any highlight applied to the old
     (now-discarded) elements.

     **Shift feature** (move an allocation, or a whole selected block of them, one week
     back/forward): still deliberately **not** part of `cell-popover.js`'s own save path — an
     early version put shift arrows inside that same popover and reopened it (seeded from the
     anchor week) after each shift so it could "stay open, repositioned"; closing that reopened
     popover without touching anything still ran the existing autosave-on-close bulk path,
     silently overwriting the whole range with the anchor week's single value and destroying the
     very per-cell heterogeneity the shift had just preserved. The fix was architectural, not a
     patch: shift's own mutation (`MP.weekShift.shiftWeeksData`) never goes through
     `createWeekEntry`/the popover's save path, so the two can never overwrite each other's data —
     this holds even now that both panels can be visible at once (see below), since "shown
     together" only affects *when* each one's save runs, never *which* function mutates
     `task.weeks`. `gantt-view.js`'s `openShiftMenu` builds a `MP.contextMenu` menu (reused as-is,
     see `common/` above, opened with `placement: 'above'` so it renders above the cell instead of
     the default below) with two actions — "shift one week back/forward" — computing both
     directions' `MP.weekShift.canShiftWeeks` up front to grey out (with a tooltip reason)
     whichever direction isn't allowed, and prepending a `header: true` "N weeks selected" line so
     the user can tell whether the click landed on a lone cell or an active multi-week selection.
     Because the shift menu can be showing above an allocation popover that still has unsaved
     edits pending below it, each shift action first `await`s `MP.cellPopover.whenIdle()` — a
     promise the popover keeps updated to whatever save is currently in flight (or already
     resolved) — before running `handleCellsShift`, so a pending edit is always committed first
     and the shift never runs against stale data or races the popover's own save on the same file.
     `handleCellsShift` does the actual mutation + baseline-milestone resync (reuses
     `syncBaselineMilestone` for any shifted week that carried `milestone: true`) + save, then —
     mirroring the `lastEdited` re-render problem above — re-finds the destination cell's div via
     `gantt-cell.js`'s `getCellDiv(task, settimana)` (a `WeakMap<task, Map<settimana, div>>`
     rebuilt on every `renderWeekCell` call), calls `MP.cellSelection.relocate` to move the
     selection there, and reopens **only** `openShiftMenu` at that position (not the allocation
     popover) so repeated shifts in the same direction don't require re-right-clicking each time.

     **Task drag&drop** (reposition a task, including across baselines of the same project):
     `js/ui/gantt/task-drag.js`, a module-singleton drag controller (same pattern as
     `cell-selection.js` — private state outside the store, since no
     `setState` fires mid-drag so the DOM is never rebuilt out from under an in-progress gesture).
     There is no DOM element representing "a row" (the grid is one flat sequence of sibling
     `.gantt-cell`s, see `gantt-view.js`'s row-cell-appending loop and the per-cell
     `row-project-start`/`row-baseline-start` classes above), so the drag handle (`⠿`,
     `.task-drag-handle`, hover-reveal like `.row-menu-btn`) lives inside `col3`
     (`gantt-row.js`), and the drop-insertion indicator (`.drag-target-before`/
     `.drag-target-after`, an inset box-shadow border) is applied to that row's 3 fixed columns
     only — always present (including on a baseline's empty "— no task —" placeholder row, a
     valid drop target) and sticky-left, so visible regardless of horizontal scroll, without
     needing a registry of every cell in a row. Native HTML5 drag events
     (`dragstart`/`dragover`/`dragleave`/`drop`/`dragend`) — no library, per the no-build-step
     constraint. `handleDragOver` compares the hovered row's `file` against the dragged task's
     source `file` and sets `dropEffect = 'none'` (no indicator) when they differ, so a task can
     never be dropped into a different project — only across baselines of the *same* project, or
     reordered within one. The mutation is `MP.taskCrud.moveTaskToPosition(state, file,
     sourceBaseline, task, targetBaseline, targetIndex)` — a general splice-remove-then-insert,
     reusing the same `persistProject` → `MP.saveCoordinator.saveProject` + `MP.store.setState({})`
     path as every other task mutation. Drag&drop is the **only** way to reorder tasks — unlike
     projects (`gantt-row.js`'s "⋮" menu still has ↑/↓ for those), the task-level ↑/↓
     menu entries and `MP.taskCrud.moveTask` were removed as redundant once drag&drop covered the
     same ground (including the cross-baseline case ↑/↓ used to handle via adjacent-swap-or-append).
     If the dragged task's week carried `milestone: true`, it is **not** resynced against the
     destination baseline's milestone (same non-auto-correction principle as elsewhere) — any
     resulting disagreement is only surfaced passively via `MP.milestones.computeBaselineMilestones`'s
     existing `inconsistent` marker on the Milestones page, and self-heals the next time a
     milestone in that baseline is touched through `cell-popover.js`.

     **Baseline drag&drop** (reorder a project's baselines): `js/ui/gantt/baseline-drag.js`
     mirrors `task-drag.js`'s module-singleton pattern, simplified since a baseline only ever
     moves within one array (`progetto.baseline`) — no source/target distinction like tasks have,
     and no cross-project moves are possible at all (a baseline never leaves its project; the
     `file` mismatch check still guards against dropping onto a different project's row). The
     drag **handle** only lives on the single row where `showBaseline` is true — the row that
     shows the baseline's `version`/"⋮" menu in `col2` — since that's the one row that always
     exists and is the natural "grab point" for the whole block. The drop **target**, however, is
     every row belonging to that baseline (task rows and the "— no task —" placeholder included,
     same condition as task-drag's own drop wiring) — restricting it to the name row alone was
     tried first and turned out to break the common case of dragging a baseline to the very end of
     a multi-task baseline's block: the name row sits at the *top* of the block, so "drop after
     the last baseline" would have required hovering the lower half of a row far from where the
     block visually ends. Position (before/after) is computed from whichever row/half is under the
     cursor, same midpoint check as task-drag, but always means "before/after this baseline as a
     whole," never "before/after this specific task" — dragging a baseline is a single block move,
     never an interleave into another baseline's tasks. The handle (reuses the `.task-drag-handle`
     CSS class as-is — the styling is generic, not task-specific) sits in `col2` before the
     version text; the drop-target listeners are attached to every one of the baseline's rows'
     3 fixed columns alongside (not instead of) the task-drag listeners already there — the two
     coexist without conflict because each module keeps its own private `dragging` singleton and
     every handler no-ops when its own state is null, so a baseline-drag gesture leaves `taskDrag`'s
     handlers inert and vice versa.
     The mutation is `MP.baselineCrud.moveBaselineToPosition(state, file, baseline, targetIndex)`,
     operating on the raw unfiltered `progetto.baseline` array by object reference (same
     splice-remove-then-insert shape as `moveTaskToPosition`, safe regardless of `showCompletedProjects`
     filtering baseline visibility for display). Drag&drop is now the **only** way to reorder
     baselines — the "↑"/"↓" `col2` menu entries and the old swap-based
     `MP.baselineCrud.moveBaseline` were removed as redundant, same precedent as the task-level
     removal above.

     `legend.js` renders the color legend dynamically from
     `team-resources.json`, read-only, no navigation affordance of its own — reaching the
     team/resources page is via the `toolbar.js` hamburger menu only, on every page, not a
     per-view "manage" button.
   - `resource-load/resource-load-view.js`: per-resource per-week allocation count (replaces the
     original spreadsheet's `COUNTIF` formulas), displayed to the user as "Workload" (see
     `toolbar.js` above — the internal id/filename stayed `resource-load`), header shared with
     the gantt page (see `dataset-header.js` above). Resources are grouped by team (a full-width
     group-header row per team, plus a team-colored bar on the initials column — colors always
     read from `team-resources.json`, nothing hardcoded), and each week cell is heat-colored by
     allocation count (green = 1, yellow = 2, red > 2) via the `load-1`/`load-2`/`load-3plus` CSS
     classes — its own separate legend, appended after the shared header — read-only, no
     navigation affordance of its own. Its two fixed columns use dedicated CSS classes
     (`rl-col-initials` 70px, `rl-col-name` 220px, css/styles.css) rather than the gantt page's
     `col-1`/`col-2` — those are sized for project-name/baseline-version and reusing them here
     both under-sized the resource name column and, since this view's own
     `grid-template-columns` declared different track widths than what `col-1`/`col-2` render at
     (a `position: sticky` element's own CSS `width` — not its grid track size — governs what's
     painted, so a mismatch between the two doesn't error, it just misaligns silently), caused a
     ~20px silent overlap with the first week column, hidden behind the sticky column's
     background. Found by rendering the grid in isolation in headless Chrome and reading
     `getBoundingClientRect()` on every cell — not obvious from the CSS/JS alone.
   - `team-resources/team-resources-view.js`: the dedicated CRUD page for teams and their
     resources (create/rename/recolor/delete team; create/rename/move/delete resource within a
     team) — the only place in the UI where `team-resources.json` is edited.
   - `milestones/milestones-view.js`: read-only report on the density of baseline release
     milestones across the calendar. Renders, top to bottom, three independent sections sharing
     one page: a copyable upcoming-releases list, a bar-chart histogram, and the full-period
     calendar grid (in that order — the list is scoped to upcoming-only, the other two stay
     scoped to the whole dataset period, so the three can show different row counts by design).
     - The **list** (`renderMilestoneList`, backed by `MP.milestones.computeUpcomingMilestonesByMonth`,
       so only future releases, grouped by calendar month) is a plain `<h4>`/`<ul>` per month, one
       `<li>` per baseline formatted as `"<day Mon year> — <project> — <baseline version>"` (plus
       `" (other dates: …)"` when the baseline's milestone is `inconsistent`, using the *most
       recent* of the tasks' distinct dates as the shown one — see `distinctDates` on
       `js/model/milestones.js` above). A "Copy" button (disabled when the list is empty) builds
       the same text as plain lines (`"- "` bullets, month names as their own line, blank line
       between months) and calls `navigator.clipboard.writeText` — the first use of the Clipboard
       API in this codebase; wrapped in try/catch with a `MP.toast.showToast` success/error message,
       same non-blocking feedback pattern as the Backup action in `toolbar.js`. Date/month display
       formatting (`formatReadableDate`, `formatMonthLabel`, via `toLocaleDateString`) lives only in
       this UI module, not in the pure `js/model/milestones.js` derivation. Its container
       (`.milestone-list-section`, css/styles.css) is capped at `max-height: 220px` with its own
       `overflow-y: auto` and a `position: sticky` header — deliberately bounded rather than
       `flex: 0 0 auto`-to-content, otherwise a long list of upcoming milestones would grow past the
       page's available height and squeeze `.gantt-scroll` (the histogram+grid below) down to
       nothing, breaking the single-page-scrollbar layout described under `js/app.js` below (found
       empirically: an unbounded list section pushed the grid off-screen with no way to reach it).
     - The **grid** is one row per baseline (fixed columns "Project"/"Baseline" only — no per-task
       row, since `MP.milestones.computeBaselineMilestones` already collapses each baseline to its
       single effective release week) instead of the gantt's per-task rows; same week columns/range
       as gantt and resource-load (`MP.weekUtils.getWeeksInRange`) and the same shared
       `dataset-header.js`, filtered by the same `state.ui.showCompletedProjects` flag (no dedicated toggle
       on this page, so its row set always matches the project count shown in the shared header). A
       row whose baseline has inconsistent milestone dates across its tasks gets a `row-inconsistent`
       amber marker (never auto-corrected, same non-blocking-warning principle as team mismatches).
     - The **histogram** — inside the same `.gantt-scroll` as the grid so it scrolls horizontally in
       sync without any dedicated sync code, placed *before* the grid in DOM order — is a bar-chart
       row (`.milestone-histogram`) of releases per week, outside the `.gantt-grid` itself because
       CSS Grid's `grid-auto-rows: 24px` is too short for readable bars.
     - The total release count (whole period) feeds the "Total releases in period" counter passed
       as `dataset-header.js`'s extra element (distinct from the header's own "upcoming baselines"
       count, which is scoped to today-and-later rather than the whole period — same scope as the
       list above, but computed independently via `countUpcomingBaselines` for the header vs.
       `computeUpcomingMilestonesByMonth` for the list, since the header only needs a count).
   - `weeks/week-controls.js`: exports two standalone edge-button renderers (no combined control
     bar, no count input). `gantt-view.js` places them **inside the weeks grid itself**, in an
     extra row above the column-label row (`.gantt-cell.week-edge-row`, class `has-week-edge-row`
     on the grid shifts the real header row's sticky `top` down by one row-height to make room) —
     Excel-style table-resize handles that cost one row of *vertical* space rather than any
     *horizontal* space, so the visible week count in the scrollable area is never reduced. The
     grid gains **two extra 46px tracks** beyond the real `weeks.length` ones
     (`repeat(weeks.length + 2, 46px)`), one immediately before the first week and one immediately
     after the last — dedicated to these buttons, never overlapping a real week column.
     `gantt-row.js`/`gantt-cell.js` know nothing about this: they still return exactly
     `3 + weeks.length` cells per row; `gantt-view.js` alone inserts a blank filler cell before and
     after each row's real cells (mirroring that row's `row-project-start`/`row-baseline-start`/
     `row-baseline-alt` classes for a clean border) to keep every row's cell count matching the
     grid's column count. `renderRemoveWeekButton` sits in the dedicated track right before the
     first week — **not** sticky-left, so it scrolls away with the rest of the weeks track as soon
     as the user scrolls right, unlike the 3 real frozen columns to its left (whose row-1 corner
     cells are blank filler, frozen on both axes like the header row's corner, never containing a
     button); it removes `manifest.weeks.first` (head, past) after an always-shown explicit
     `window.confirm`, with allocation detail in the message when the week being removed isn't
     empty. `renderAddWeekButton` sits in the dedicated track right after the last week — also not
     sticky, so it only scrolls into view once the user has scrolled all the way past the real
     last week — and extends `manifest.weeks.last` by one week (tail, future) with no
     confirmation needed. Always exactly one week per click; never trims from the tail or adds at
     the head.
5. **`js/app.js`** — entry point. Subscribes to the store, maps `state.status` to a render
   function, and owns the initial directory-picker flow (`connectToDirectory`). No persistence of
   the picked handle across sessions is possible (see Hard Constraints above) — this is expected.
   Also registers a single module-level `pagehide` listener (not inside `render()`, so it's
   attached once): when `state.ui.autoBackupOnExit` is on and the app is `ready` with a connected
   `dirHandle`, it fires `MP.repository.createBackup` fire-and-forget — the listener can't `await`
   it, since nothing can delay the browser tearing down the page, so this is best-effort only (see
   docs/deployment.md "Backups"). A module-level `backupOnExitInFlight` flag guards against
   `pagehide` firing again (e.g. bfcache entry) while a backup from the same exit is still running.
   A second module-level listener, on `visibilitychange`, drives the soft remote-change
   notification (see [docs/database.md](docs/database.md#conflict-detection)) — deliberately
   event-driven (fires only when the tab becomes visible again) rather than a `setInterval`, with a
   60s module-level cooldown
   (`lastRemoteCheckAt`) so rapid alt-tabbing can't refire it back-to-back; gated by
   `state.ui.notifyOnRemoteChanges` (default off), calls `MP.remoteCheck.findChangedFiles` and, if
   anything differs, shows a `MP.toast` — no auto-reload, no forced action.
   Because `render()` does `appEl.innerHTML = ''` and rebuilds the whole tree on every state
   change, it explicitly saves the `.gantt-scroll` container's `scrollLeft`/`scrollTop` (a class
   shared by the gantt, resource-load, and milestones pages) before clearing and restores it on
   the freshly
   rendered element afterward — otherwise every cell edit (which calls `setState({})` to
   re-notify subscribers after mutating the in-memory dataset) would snap the grid back to
   scroll position 0,0, hiding whatever cell the user just edited if they were scrolled away from
   the top-left. See also the `lastEdited` highlight mechanism in `gantt-view.js` above, which
   solves the companion problem of visually losing track of the edited cell.

   **Single-scrollbar page layout** (css/styles.css): `html body` is a `height: 100%` flex column
   with `overflow: hidden`, so the outer document itself never scrolls. `#app` (flex: 1 1 auto,
   `min-height: 0`) is the fallback scroll container for non-grid content (`.connect-panel`,
   `.error-panel`, `.team-resources-page`, etc. — these just overflow `#app` normally if too tall).
   For the three grid pages, `.app-ready` (the wrapper `app.js`'s `renderReady` builds around
   `top-bar` + the page) and `.gantt-page` are themselves `flex: 1 1 auto; min-height: 0` flex
   columns, so they're stretched to fill `#app` exactly rather than growing with their content;
   `.gantt-toolbar`/`.legend`/`.warnings`/`.top-bar` are pinned `flex: 0 0 auto` so only
   `.gantt-scroll` (also `flex: 1 1 auto; min-height: 0`, in place of the old
   `max-height: calc(100vh - 220px)` magic number) absorbs the remaining space and produces the
   grid's own — and only — scrollbar, both vertically and horizontally.

### Where to make common changes

- New team, new color: **do not touch code** — it's user-editable data in `team-resources.json`,
  managed through the dedicated team/resources page. If a task references how the app *renders*
  teams, check it reads from `dataset.teamResources` rather than assuming a fixed list.
- New field on the week-entry / task / project shape: start in `js/data/schema.js` (factories +
  `isWeekEntryEmpty`), then thread through `repository.js` save/load, then the relevant `ui/`
  renderer(s). If the change is itself a rename of an existing field, also update
  `js/data/legacy-migration.js`'s transform functions and bump `SCHEMA_VERSION`.
- Any code path that writes a project/manifest/team-resources file in response to a user action
  must go through `MP.saveCoordinator`, not call `MP.repository.save*` directly — that's what
  gives conflict detection.
- Any code path that needs to compare a file's on-disk content against what this session knows
  (a new conflict check, a new soft "did this change" probe, …) should reuse
  `MP.repository.readTextFileOrNull(dirHandle, path)` rather than reimplementing the try/catch —
  see `save-coordinator.js` and `remote-check.js` for the two existing consumers.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
