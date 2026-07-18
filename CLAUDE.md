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
(`initials`, `name`, `weeks`, `code`, `version`, `projects`, `archived`, `completed`, etc. — see
[docs/glossary.md](docs/glossary.md)) and every internal identifier that directly mirrors one
(`state.ui.currentView`, `showArchived`, the view code `'resource-load'`, exported function names
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

### Versioned release packaging (GitHub Actions)

[.github/workflows/release.yml](.github/workflows/release.yml) publishes a downloadable, versioned
zip for end users who just want to run the app (not clone the repo): pushing a git tag `vX.Y`
triggers the workflow, which (1) fails the build if `APP_VERSION` in
[js/ui/common/app-header.js](js/ui/common/app-header.js) doesn't match the pushed tag, (2) builds
`weavo-vX.Y.zip` via `git archive` scoped to `index.html favicon.svg css js sample-data` (so untracked/gitignored
content like `sample-data/backup/` can never end up in it), and (3) creates a GitHub Release with
that zip attached via `softprops/action-gh-release`. `docs/`, `README.md`, `requirements/`,
`scripts/`, and `spike-fsa/` are deliberately excluded from the zip — they're dev-facing, not
needed to run the app. Per-release steps are manual and undocumented in code: bump `APP_VERSION`,
commit, then `git tag -a vX.Y -m vX.Y && git push origin vX.Y`. Never reuse/force-push an existing
tag to fix a bad release — delete it (local + remote) and the GitHub Release, then re-tag.

### Excel import script (dev-time only, not part of the app runtime)

[scripts/import-excel/](scripts/import-excel/) is a one-shot Node script (uses `exceljs`, needs
`npm install`) that converts the "Master Plan" sheet of `requirements/Master plan software.xlsx`
into the `manifest.json` / `team-resources.json` / `projects/*.json` structure (current
team/resources model — see below). Run with `--dry-run` first and review the report before
writing real output. See [scripts/import-excel/README.md](scripts/import-excel/README.md) for the
full set of parsing heuristics (column layout, baseline carry-over, color→team mapping, milestone
detection, valid initials format, never-allocated-resource exclusion) — these were
reverse-engineered from the real spreadsheet, not assumed, so re-derive from the actual file
rather than guessing if the heuristics need adjusting. Since the sheet has no explicit
initials→team column, each resource's team is inferred by majority vote over the colors of the
cells it appears in; initials that tie or have no color signal at all make the script stop
**without writing anything** until resolved via a local, gitignored `team-overrides.json` (real
personnel data, never committed — see the README for its shape; this override file deliberately
keeps the old Italian field names `codice`/`nome`/`colore`, since it's an external, unversioned
input the import script translates internally, not part of the app's own persisted data — see the
README's "Come viene assegnato il team a ogni risorsa" for the reasoning). A companion script,
`scripts/import-excel/analyze-output.js`, re-runs `js/model/validation.js`'s orphan/mismatch
checks against an already-written data folder (via a Node `vm` sandbox, no browser needed) —
useful after any import or hand-edit, not just right after running `import.js`. The script's own
default output folder, `import-output/` at repo root, is gitignored (may contain a full real copy
of project data).

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
{ "teams": [ { "code": "dev", "name": "Development", "color": "#00B050", "resources": [ { "initials": "LC", "name": "Luca Cozzi" } ] } ] }
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
  both present together, or if `milestone: true` is set — never a partial state like
  `{team: "dev", resources: []}`. Always construct these via `MP.schema.createWeekEntry(...)`.
- `team` codes and resource `initials` referenced by a task but missing from
  `team-resources.json` are **orphan references**
  (`MP.validation.findOrphanTeam`/`findOrphanResources`); a resource allocated under a `team`
  different from the one it currently belongs to is a **mismatch**
  (`MP.validation.findTeamMismatches`, non-`completed` tasks only). Both are surfaced as
  non-blocking warnings (badge on the cell + line in the warnings panel), never silently
  dropped or auto-corrected.
- A task marked `completed: true` is excluded from overallocation counting *and* from mismatch
  detection (its weeks no longer count as active commitment) but its data is not deleted or
  auto-corrected — closed tasks are never touched by team/resource changes, including the
  bulk-regularization-on-move and cascade-delete-on-deletion flows described above.

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
- Read-only view: the "i" icon rendered by `gantt-row.js` immediately before the project name
  (only on the row where the name itself is shown) opens `MP.modal.showProjectCard`, listing name,
  archived status, baseline/task counts, and all 5 referent fields with the two initials
  references resolved to a name. No "Edit" action inside it by design — editing stays solely in
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
  regardless of `manifest.schemaVersion`. The Excel import script
  (`scripts/import-excel/import.js`) always writes the new shape with all 5 fields empty — it no
  longer captures the old free-text referents from column A; those are filled in by hand in the
  app after import.

### Legacy data migration

Every field name described above is a deliberate, one-time rename from an earlier Italian-named
schema (`nome`, `sigla`, `settimane`, `codice`, `versione`, `risorse`, `archiviato`/`archiviata`,
`concluso`, the file `team-risorse.json`, the directory `progetti/`). Because real data folders on
a shared OneDrive/network location can't be migrated by hand, `manifest.schemaVersion` (bumped to
`2` for this rename) gates an automatic, one-time upgrade: `MP.legacyMigration.migrateIfNeeded`
([js/data/legacy-migration.js](js/data/legacy-migration.js)), called as the first step of
`repository.loadDataset`, checks the version on every folder connect. If it's missing or below
`MP.schema.SCHEMA_VERSION`, the folder is legacy: old-shaped files are read (following
`manifest.progetti`, the old field name, since the manifest itself hasn't been transformed yet),
transformed in memory to the current shape via the module's pure `transformManifest`/
`transformTeamResources`/`transformProject` functions, and written under the current names
(`team-resources.json`, `projects/`) — `manifest.json` is written **last**, so it doubles as the
commit point: an interrupted migration just retries from scratch on the next connect, no partial
state to reconcile. The old `team-risorse.json` file and `progetti/` directory are removed only
after the new files are fully written. A folder already on the current `schemaVersion` is detected
cheaply (one small JSON parse) and skips migration entirely.

This mechanism deliberately has **no dedicated pre-migration backup and no crash-recovery
bookkeeping** — data in this app is not treated as irreplaceable: real data can be regenerated via
the Excel import script, and the app already has its own manual/automatic backup feature
(`MP.repository.createBackup`, see `docs/deployment.md` "Backups") a user can run before opening
an old folder with a new app version, or fall back to OneDrive's own version history. Keep the
migration's own legacy path literals (`'team-risorse.json'`, `'progetti'`) hardcoded, never sourced
from `MP.schema.PATHS` — after this refactor those constants point at the *new* names, and a
legacy folder by definition doesn't have those yet.

`scripts/import-excel/`'s own output already targets the current schema directly (it doesn't go
through the migration module for that) but reuses `legacy-migration.js`'s pure transform functions
where useful for one-off data conversions (see that script's own history/comments) — the
orchestration half (`migrateIfNeeded`, the actual disk I/O) is app-only.

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
     its own.
   - `save-coordinator.js`: the **only** place that should perform a write in response to a user
     edit. Wraps `repository` saves with reread-before-write conflict detection (§6.4 of spec):
     rereads the file from disk immediately before writing, and if it differs from the last text
     this session knows about, prompts via `MP.modal.confirmConflict` before overwriting.
   - `slug.js`: kebab-case ASCII slug generation for project filenames, with collision
     suffixing — shared between the app and the Excel import script's own copy of the algorithm.
2. **`js/state/store.js`** — minimal in-memory state container + pub/sub (`getState`/`setState`/
   `subscribe`), no framework. `state.status` drives which top-level view `js/app.js` renders:
   `init | unsupported | not-connected | loading | ready | error`. `state.dataset` (present when
   `ready`) holds `{ manifest, teamResources, projects: Map<file, {data, rawText}>, warnings }`
   plus `*Meta` entries used by save-coordinator for conflict checks. `state.ui.currentView`
   (`gantt | resource-load | milestones | team-resources`) picks the page `js/app.js` renders below
   the top bar. `state.ui.autoBackupOnExit` (default `false`) is the only `ui.*` flag persisted
   across sessions — seeded from and written through `localStorage['mp.autoBackupOnExit']` via the
   store's own `setAutoBackupOnExit(value)` (not `setState` directly, so the flag and its
   `localStorage` copy can't drift), read once at module load since `store.js` loads before every
   other script that touches it. Toggled from `toolbar.js`'s hamburger menu; consumed by
   `app.js`'s `pagehide` listener — see below.
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
   `countUpcomingBaselines` filters those same rows to `settimana >= getTodayIso()` — a simple ISO
   string compare, valid since both sides are `YYYY-MM-DD` — and feeds the "upcoming baselines"
   count in the shared `dataset-header.js`, so gantt/resource-load users see it without opening
   the Milestones page). `week-utils.js` also exports `getTodayIso()` (today's date, recomputed
   from the browser clock on every call, never persisted) alongside the pre-existing
   `getCurrentWeekIso()` (the Monday of the week containing today) — `countUpcomingBaselines` uses
   the former since a release date is a specific day, not a week-column highlight.
   `week-shift.js` is a small, self-contained pure module for the "shift" feature (see
   `gantt/` below): `canShiftWeeks(dataset, task, weeks, direction)` is the ammissibility
   predicate (blocks on `task.completed`, on the shift crossing `manifest.weeks.first`/
   `last`, or on the one destination week that falls outside the selected block already
   holding a non-empty entry in *this* task — reused both to enable/disable the shift menu
   items and as a safety re-check before mutating) and `shiftWeeksData(task, weeks, direction)`
   is the mutation, which snapshots every entry in `weeks` before deleting any of them so the
   write pass is never order-dependent — this preserves each cell's own content when shifting a
   multi-week block (a "translate", not a normalize-to-one-value bulk edit, see below).
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
     docs/deployment.md "Backups"; project creation is reachable
     from every page, not just the gantt one, so after a successful create it switches
     `state.ui.currentView` to `gantt` so the result is visible; "Change data folder…" (after a
     `window.confirm`) resets `state` to `{ status: 'not-connected', dirHandle: null, dataset: null }`
     — no dedicated disconnect logic in `app.js`, it just reuses the existing `not-connected` screen
     and its "Select data folder" button/picker flow, since releasing the handle and re-running
     `connectToDirectory` needs no special-casing — plus `renderPageTitle`, a small label next to
     the hamburger showing the current view's name, sourced from the same `VIEWS` list used to
     build the menu so the two never drift apart: `gantt` → "Master Plan", `resource-load` →
     "Resource load", `milestones` → "Milestones", `team-resources` → "Team & resources" (the
     internal `state.ui.currentView` codes are the same English words as the displayed `label`
     for every view except `gantt`, which stays a short internal code rather than "Master Plan");
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
     archived/completed toggles (the "+ New project" button that used to live here moved to
     the hamburger menu, see `toolbar.js` above), and by the milestones page for its
     "Total releases in period" counter), `app-header.js` (static brand header — logo, "Weavo" title,
     version, copyright — rendered once into `#app-header` from `app.js`'s `bootstrap()`,
     outside the `state.status` render cycle since its content never changes; present on every
     screen including `not-connected`/`unsupported`/`error`, not just the `ready` views).
   - `crud/`: one file per entity (`project-crud.js`, `baseline-crud.js`, `task-crud.js`,
     `resource-crud.js`, `team-crud.js`). Each is create/rename/delete/reorder (+ `toggleCompleted`
     for tasks, `toggleArchived` for projects/baselines, `recolorTeam`/`moveResource` for
     team/resources) directly against the in-memory dataset, persisted via
     `MP.saveCoordinator`/`MP.repository`, then triggers re-render. `project-crud.js`'s
     `createProject`/`editReferents` open `MP.modal.promptProjectForm` themselves when not given a
     preset value (same "modal call lives inside the CRUD function" pattern as the rest of this
     file), see "Project team/referents" above for the field shape.
   - `gantt/`: the main view. `gantt-view.js` builds the compact grid (CSS Grid + `position:
     sticky` for frozen first 3 columns and frozen header row — deliberately not a heavyweight
     gantt library, per spec §9) and exports `buildRows` (dataset → visible task rows, honoring
     `showArchived`/`showCompleted`) so `dataset-header.js` can compute the same row count
     shown in both pages. Archiving isn't only project-level: a baseline can independently be
     archived too (`baseline.archived`, toggled via the same "⋮" menu on the baseline row,
     `MP.baselineCrud.toggleArchived`) — `buildRows` filters `progetto.baseline` down to
     non-archived ones (unless `showArchived` is on) *before* deciding whether the project
     needs a "— no baseline —" placeholder row, so a project whose only baselines are all
     archived still gets a reachable placeholder row instead of disappearing entirely. A
     project's own `archived` still wins first — an archived project hides regardless of its
     baselines' individual flags. `MP.milestones.computeBaselineMilestones` applies the same
     per-baseline filter (same `showArchived` flag, no separate toggle), so an archived
     baseline's release also drops out of the milestones page and the header's "upcoming
     baselines" count. Archiving a baseline never touches its tasks/data — same
     no-destructive-auto-correction principle as project archiving and task `completed`.
     `gantt-row.js` renders one task row; `gantt-cell.js` renders one
     week×task cell (double click opens `cell-popover.js` for that single cell, resetting any
     pending range selection first; a cell whose resource(s) are overallocated gets a native
     `title` tooltip built from `MP.overallocation.findAllocations`, listing per resource the
     other project/baseline/task it's allocated to that same week — same
     `projectName`/`baselineVersion`/`taskName` shape the resource-load heat cells already use in
     `resource-load-view.js`, so the wording matches across both views); `cell-popover.js` is the
     editing popover (team-first, then multi-select resources restricted to that team, then
     milestone flag — milestone only in single-cell mode, see below — autosave on close,
     non-blocking double-allocation warning); a task admits only **one** milestone week, and all
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
     `cell-selection.js` is the click/shift-click range-selection controller, confined to one
     task row at a time (module-singleton state, highlighted via a CSS class rather than the app
     store, since it doesn't need to survive a full re-render) — a shift-click extends the range
     from the last plain-clicked cell ("anchor") and immediately opens `cell-popover.js` in bulk
     mode (`weeksRange`), which applies the same team+resources to every selected week in one
     save (no milestone in bulk mode — see `requirements/backlog.md` on why milestone stays a
     single-cell/single-baseline concept); after a successful save (single-cell or bulk),
     `gantt-view.js` records the saved task+week(s) in a module-level `lastEdited` (with a
     timer that clears it after ~2.5s, triggering one more re-render to fade it out) and threads
     it down through `renderTaskRow`/`renderWeekCell` so the just-saved cell(s) get a
     `cell-just-edited` CSS highlight after the full re-render — needed because `js/app.js`'s
     `render()` rebuilds the entire DOM tree from scratch on every `MP.store.setState()`, which
     would otherwise silently drop any highlight applied to the old (now-discarded) elements.

     **Shift feature** (move an allocation, or a whole selected block of them, one week
     back/forward): deliberately **not** part of `cell-popover.js` — a first version put shift
     arrows inside that same popover and reopened it (seeded from the anchor week) after each
     shift so it could "stay open, repositioned"; closing that reopened popover without touching
     anything still ran the existing autosave-on-close bulk path, silently overwriting the whole
     range with the anchor week's single value and destroying the very per-cell heterogeneity the
     shift had just preserved. The fix was architectural, not a patch: shift now lives entirely
     outside the allocation popover, with its own selection state, so the two can never touch the
     same data. Right-click (`contextmenu`, `gantt-cell.js`) on a week cell opens a
     `MP.contextMenu` menu (reused as-is, see `common/` above) with two actions — "shift one week
     back/forward" — built by `gantt-view.js`'s `openShiftMenu`, which computes both directions'
     `MP.weekShift.canShiftWeeks` up front to grey out (with a tooltip reason) whichever direction
     isn't allowed, and prepends a `header: true` "N weeks selected" line so the user can tell
     whether the click landed on a lone cell or an active multi-week selection. `handleCellsShift`
     does the actual mutation (`MP.weekShift.shiftWeeksData`) + baseline-milestone resync (reuses
     `syncBaselineMilestone` for any shifted week that carried `milestone: true`) + save, then —
     mirroring the `lastEdited` re-render problem above — re-finds the destination cell's div via
     `gantt-cell.js`'s `getCellDiv(task, settimana)` (a `WeakMap<task, Map<settimana, div>>`
     rebuilt on every `renderWeekCell` call) and reopens `openShiftMenu` there, so repeated shifts
     in the same direction don't require re-right-clicking each time. A **multi-week** shift
     selection is Ctrl+click (`cell-shift-selection.js`, a module-singleton anchor+range tracker
     structurally identical to `cell-selection.js` but with completely separate state and its own
     `cell-shift-selected` highlight class), never the plain click/shift-click of `cell-selection.js`
     — the two selections are independent on purpose and are never active "for the same reason" at
     once, reinforcing that shift and bulk-allocate remain unrelated features that happen to share
     the same grid.

     **Task drag&drop** (reposition a task, including across baselines of the same project):
     `js/ui/gantt/task-drag.js`, a module-singleton drag controller (same pattern as
     `cell-selection.js`/`cell-shift-selection.js` — private state outside the store, since no
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
     sourceBaseline, task, targetBaseline, targetIndex)` — a general splice-remove-then-insert
     (unlike `moveTask`'s adjacent-swap-or-append used by the "⋮" menu's ↑/↓ actions, which is
     unchanged and still the keyboard/no-drag fallback), reusing the same `persistProject` →
     `MP.saveCoordinator.saveProject` + `MP.store.setState({})` path as every other task mutation.
     If the dragged task's week carried `milestone: true`, it is **not** resynced against the
     destination baseline's milestone (same non-auto-correction principle as elsewhere) — any
     resulting disagreement is only surfaced passively via `MP.milestones.computeBaselineMilestones`'s
     existing `inconsistent` marker on the Milestones page, and self-heals the next time a
     milestone in that baseline is touched through `cell-popover.js`.

     `legend.js` renders the color legend dynamically from
     `team-resources.json`, read-only, no navigation affordance of its own — reaching the
     team/resources page is via the `toolbar.js` hamburger menu only, on every page, not a
     per-view "manage" button.
   - `resource-load/resource-load-view.js`: per-resource per-week allocation count (replaces the
     original spreadsheet's `COUNTIF` formulas), header shared with the gantt page (see
     `dataset-header.js` above). Resources are grouped by team (a full-width group-header row per
     team, plus a team-colored bar on the initials column — colors always read from
     `team-resources.json`, nothing hardcoded), and each week cell is heat-colored by allocation
     count (green = 1, yellow = 2, red > 2) via the `load-1`/`load-2`/`load-3plus` CSS classes —
     its own separate legend, appended after the shared header — read-only, no navigation
     affordance of its own.
   - `team-resources/team-resources-view.js`: the dedicated CRUD page for teams and their
     resources (create/rename/recolor/delete team; create/rename/move/delete resource within a
     team) — the only place in the UI where `team-resources.json` is edited.
   - `milestones/milestones-view.js`: read-only report on the density of baseline release
     milestones across the calendar, one row per baseline (fixed columns "Project"/"Baseline"
     only — no per-task row, since `MP.milestones.computeBaselineMilestones` already collapses
     each baseline to its single effective release week) instead of the gantt's per-task rows;
     same week columns/range as gantt and resource-load (`MP.weekUtils.getWeeksInRange`) and the
     same shared `dataset-header.js`, filtered by the same `state.ui.showArchived` flag (no
     dedicated toggle on this page, so its row set always matches the project count shown in the
     shared header). A row whose baseline has inconsistent milestone dates across its tasks gets a
     `row-inconsistent` amber marker (never auto-corrected, same non-blocking-warning principle as
     team mismatches). Below the grid — inside the same `.gantt-scroll` so it scrolls horizontally
     in sync without any dedicated sync code — a bar-chart row (`.milestone-histogram`) of releases
     per week, outside the `.gantt-grid` itself because CSS Grid's `grid-auto-rows: 24px` is too
     short for readable bars. The total release count feeds the "Total releases in period"
     counter passed as `dataset-header.js`'s extra element (distinct from the header's own
     "upcoming baselines" count, which is scoped to today-and-later rather than the whole period).
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
