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
must be written in English too. This does **not** extend to: JSON field names in the data model
(`sigla`, `nome`, `settimane`, `codice`, `versione`, `progetti`, etc. — kept in Italian for
historical reasons, see [docs/glossary.md](docs/glossary.md)), internal state/variable identifiers
(`state.ui.vistaCorrente`, `mostraArchiviati`, `carico-risorse`, …), or code comments (this
codebase's comments stay in Italian, written by/for the maintainer). Only what a user actually
reads on screen needs to be English.

## Running / testing

There is no build, dev server, or automated test suite in this repo. To run the app: open
[index.html](index.html) directly in Chrome or Edge (`file://` path). Sample data for manual
testing lives in [sample-data/](sample-data/) (a full dataset: `manifest.json`,
`team-risorse.json`, `progetti/*.json`) — point the app's folder picker at that directory.

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
`weavo-vX.Y.zip` via `git archive` scoped to `index.html css js sample-data` (so untracked/gitignored
content like `sample-data/backup/` can never end up in it), and (3) creates a GitHub Release with
that zip attached via `softprops/action-gh-release`. `docs/`, `README.md`, `requirements/`,
`scripts/`, and `spike-fsa/` are deliberately excluded from the zip — they're dev-facing, not
needed to run the app. Per-release steps are manual and undocumented in code: bump `APP_VERSION`,
commit, then `git tag -a vX.Y -m vX.Y && git push origin vX.Y`. Never reuse/force-push an existing
tag to fix a bad release — delete it (local + remote) and the GitHub Release, then re-tag.

### Excel import script (dev-time only, not part of the app runtime)

[scripts/import-excel/](scripts/import-excel/) is a one-shot Node script (uses `exceljs`, needs
`npm install`) that converts the "Master Plan" sheet of `requirements/Master plan software.xlsx`
into the `manifest.json` / `team-risorse.json` / `progetti/*.json` structure (current team/risorse
model — see below). Run with `--dry-run` first and review the report before writing real output.
See [scripts/import-excel/README.md](scripts/import-excel/README.md) for the full set of parsing
heuristics (column layout, baseline carry-over, color→team mapping, milestone detection, valid
sigla format, never-allocated-resource exclusion) — these were reverse-engineered from the real
spreadsheet, not assumed, so re-derive from the actual file rather than guessing if the heuristics
need adjusting. Since the sheet has no explicit sigla→team column, each resource's team is inferred
by majority vote over the colors of the cells it appears in; sigle that tie or have no color signal
at all make the script stop **without writing anything** until resolved via a local, gitignored
`team-overrides.json` (real personnel data, never committed — see the README for its shape). A
companion script, `scripts/import-excel/analyze-output.js`, re-runs `js/model/validation.js`'s
orphan/mismatch checks against an already-written data folder (via a Node `vm` sandbox, no browser
needed) — useful after any import or hand-edit, not just right after running `import.js`. The
script's own default output folder, `import-output/` at repo root, is gitignored (may contain a
full real copy of project data).

## Data model

One JSON file per project under `progetti/`, plus two shared files at the data folder root:
`manifest.json` (project index + global week range `settimane.prima`/`settimane.ultima`) and
`team-risorse.json` (the team/resource anagraphics, see below).

### Team/risorse model

A **team** (`dev`/`vv`/`devops`/`run`/`build`/... — dynamic, not an enum in code) is the only
grouping entity, with a color and a name. A **resource** (sigla + full name) always belongs to
exactly **one** team — this is a real 1-team-to-N-resources relationship, not a loose tag:
resources are nested inside their team in `team-risorse.json`, never listed independently.

```json
{ "team": [ { "codice": "dev", "nome": "Development", "colore": "#00B050", "risorse": [ { "sigla": "LC", "nome": "Luca Cozzi" } ] } ] }
```

- All CRUD for teams and resources is centralized in the dedicated page
  [js/ui/team-risorse/team-risorse-view.js](js/ui/team-risorse/team-risorse-view.js)
  (`js/ui/crud/team-crud.js` + `js/ui/crud/resource-crud.js`). The gantt legend
  ([js/ui/gantt/legend.js](js/ui/gantt/legend.js)) and the resource-load view
  ([js/ui/resource-load/resource-load-view.js](js/ui/resource-load/resource-load-view.js)) are
  **read-only** — don't add editing affordances back there. Navigation to the team/risorse page
  is via the hamburger menu ([js/ui/common/toolbar.js](js/ui/common/toolbar.js)) only; neither
  view duplicates it with its own "manage" button (removed as redundant).
- A team can have zero resources; deleting a team with resources still assigned is **blocked**
  (`MP.teamCrud.deleteTeam`) — the user must move or delete its resources first.
- Moving a resource to a different team (`MP.resourceCrud.moveResource`) does **assisted bulk
  regularization**: before persisting, it scans every non-`concluso` week entry referencing the
  resource (`MP.validation.findResourceAllocations`) and, for cells where the move leaves every
  allocated sigla belonging to a single team ("unambiguous"), rewrites that cell's `team` to
  match — after a confirmation showing how many cells will be updated — so the cell's rendered
  color (driven by `entry.team`, see `gantt-cell.js`) follows the resource automatically. Cells
  where the move leaves resources spanning more than one team ("ambiguous", e.g. a cell with two
  resources independently moved to different teams) are left untouched and keep being surfaced
  by `MP.validation.findTeamMismatches` (see below) for manual fix-up in the cell popover.
  Deleting a resource (`MP.resourceCrud.deleteResource`) similarly cascades: it removes the
  sigla from every non-`concluso` week entry's `risorse` (clearing `team` too if `risorse`
  becomes empty, preserving `milestone: true` if set) before removing the resource from
  `team-risorse.json`, showing a copyable plain-text summary of the affected allocations first
  and requiring explicit confirmation. `concluso` task allocations are never touched by either
  flow (see below) and become orphan references once the resource is gone. Project-level
  `solutionAnalyst`/`vvReference` sigla references are never touched by either flow either — see
  "Project team/referents" below.
- A week entry's `team` field must match the team of every sigla in its `risorse` array in
  principle, but this isn't enforced at write time for pre-existing data — only flagged. The
  cell popover ([js/ui/gantt/cell-popover.js](js/ui/gantt/cell-popover.js)) enforces it going
  forward: you pick a team first, then only resources belonging to that team are selectable.

Key rules (see [js/data/schema.js](js/data/schema.js) and spec §4 for full detail — note the spec
predates the team/risorse merge and still describes the old two-file `risorse.json` +
`tipi-risorsa.json` split; trust the code over §4.5/§4.7 there):
- **Nothing about teams/colors is hardcoded in app code** — everything renders dynamically from
  `team-risorse.json` (legend, popover options). `SEED_TEAM` in `schema.js` is only a proposed
  starting point for a brand-new empty dataset, not a constraint.
- Allocation model is **boolean** — a resource is either allocated to a task in a given week or
  not; no percentages/fractions.
- A week entry (`task.settimane[iso]`) is only meaningful if `team` + non-empty `risorse` are
  both present together, or if `milestone: true` is set — never a partial state like
  `{team: "dev", risorse: []}`. Always construct these via `MP.schema.createWeekEntry(...)`.
- `team` codes and resource `sigla`s referenced by a task but missing from `team-risorse.json`
  are **orphan references** (`MP.validation.findOrphanTeam`/`findOrphanRisorse`); a resource
  allocated under a `team` different from the one it currently belongs to is a **mismatch**
  (`MP.validation.findTeamMismatches`, non-concluso tasks only). Both are surfaced as
  non-blocking warnings (badge on the cell + line in the warnings panel), never silently
  dropped or auto-corrected.
- A task marked `concluso: true` is excluded from overallocation counting *and* from mismatch
  detection (its weeks no longer count as active commitment) but its data is not deleted or
  auto-corrected — closed tasks are never touched by team/resource changes, including the
  bulk-regularization-on-move and cascade-delete-on-deletion flows described above.

### Project team/referents

Each project's `team` field (`progetti/<slug>.json`) is a structured object, not free text:

```json
{ "projectManager": "", "projectEngineer": "", "solutionAnalyst": "", "vvReference": "", "note": "" }
```

- `projectManager`/`projectEngineer`/`note` are free text (`note` multi-line). `solutionAnalyst`/
  `vvReference` hold a resource **sigla** (or `''`), selectable from any resource of any team in
  `team-risorse.json` — no role/team restriction — and resolved to a display name on demand via
  `MP.schema.findResourceEntry`, never denormalized into the stored value.
- Built via `MP.schema.createProjectTeamInfo(...)`. Edited as a whole (not field-by-field) through
  `MP.modal.promptProjectForm`, a dedicated multi-field modal (text/textarea/`<select>` with
  per-team `<optgroup>`s) — used both for project creation (`MP.projectCrud.createProject`, which
  now opens this form for the name *and* all team fields in one step, since the button that used
  to live in the gantt toolbar moved into the hamburger menu — see `toolbar.js` below) and for the
  existing "Project team…" row-menu edit action (`MP.projectCrud.editTeam`, `project-crud.js`).
- Read-only view: the "i" icon rendered by `gantt-row.js` immediately before the project name
  (only on the row where the name itself is shown) opens `MP.modal.showProjectCard`, listing name,
  archived status, baseline/task counts, and all 5 team fields with the two sigla references
  resolved to a name. No "Edit" action inside it by design — editing stays solely in the "Project
  team…" row-menu entry, so there's exactly one write path for this field.
- A `solutionAnalyst`/`vvReference` sigla that no longer exists in `team-risorse.json` is an
  **orphan reference**, same non-blocking-warning treatment as the task-level ones —
  `MP.validation.findOrphanProjectRiferimenti`, surfaced in the gantt warnings panel.
- Legacy data: before this field was structured, `team` was a free-text string. Loading a project
  whose `team` is still a string (`repository.loadDataset`, via `MP.schema.normalizeProjectTeam`)
  migrates it in memory — the old text becomes `team.note`, the other 4 fields start empty — and
  the file is rewritten in the new shape the next time that project is saved (lazy "self-heal on
  touch", same principle as the baseline-milestone self-heal above; no batch migration script).
  The Excel import script (`scripts/import-excel/import.js`) always writes the new shape with all
  5 fields empty — it no longer captures the old free-text referents from column A; those are
  filled in by hand in the app after import.

## Architecture

Load order in [index.html](index.html) reflects the dependency chain; a new file must be
inserted at the right point in that list. Layers, low → high:

1. **`js/data/`** — persistence primitives and dataset shape.
   - `schema.js`: canonical shape of every JSON file + factory/validity helpers (no I/O).
   - `fs-access.js`: thin wrapper over the browser File System Access API (permissions,
     read/write text file, list dir) — no application logic. `pickDirectory()` passes a stable
     `id` to `showDirectoryPicker()`; per spec this should make Chrome/Edge reopen the dialog at
     the last-used folder, but **verified empirically that it does not under `file://`** (fails
     even on a same-session page reload, no browser restart needed) — same likely cause as the
     IndexedDB limitation below (no stable storage origin for `file://` pages). Left in place as
     harmless/spec-correct but must not be presented to the user as reducing clicks. See
     docs/deployment.md "No persisted connection" for the full writeup and why a real
     cross-session/cross-user "recent folders" feature is still out of scope.
   - `repository.js`: composes `fs-access` into whole-dataset load (`loadDataset`) and raw
     per-file save/backup operations, with no conflict checking of its own.
   - `save-coordinator.js`: the **only** place that should perform a write in response to a user
     edit. Wraps `repository` saves with reread-before-write conflict detection (§6.4 of spec):
     rereads the file from disk immediately before writing, and if it differs from the last text
     this session knows about, prompts via `MP.modal.confirmConflict` before overwriting.
   - `slug.js`: kebab-case ASCII slug generation for project filenames, with collision
     suffixing — shared between the app and the Excel import script's own copy of the algorithm.
2. **`js/state/store.js`** — minimal in-memory state container + pub/sub (`getState`/`setState`/
   `subscribe`), no framework. `state.status` drives which top-level view `js/app.js` renders:
   `init | unsupported | not-connected | loading | ready | error`. `state.dataset` (present when
   `ready`) holds `{ manifest, teamRisorsa, progetti: Map<file, {data, rawText}>, warnings }`
   plus `*Meta` entries used by save-coordinator for conflict checks. `state.ui.vistaCorrente`
   (`gantt | carico-risorse | milestones | team-risorse`) picks the page `js/app.js` renders below
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
   never persisted/stored), `overallocation.js` (cross-project sigla×week allocation index, used
   both by the cell popover warning and the gantt/resource-load highlighting), `validation.js`
   (orphan `team`/`sigla` detection, plus `findTeamMismatches` for
   resources allocated under a team they no longer belong to), `milestones.js`
   (`computeBaselineMilestones`: for each baseline, derives the single "effective" release week
   from the (possibly duplicated/inconsistent) `milestone: true` flags across its tasks — the mode
   across all tasks that have one set, reading concluso tasks too since this is read-only
   derivation, not the write-side sync in `gantt-view.js`; flags a baseline `inconsistent` if its
   tasks disagree on the week, without correcting the underlying data — feeds the milestones page;
   `countUpcomingBaselines` filters those same rows to `settimana >= getTodayIso()` — a simple ISO
   string compare, valid since both sides are `YYYY-MM-DD` — and feeds the "upcoming baselines"
   count in the shared `dataset-header.js`, so gantt/carico-risorse users see it without opening
   the Milestones page). `week-utils.js` also exports `getTodayIso()` (today's date, recomputed
   from the browser clock on every call, never persisted) alongside the pre-existing
   `getCurrentWeekIso()` (the Monday of the week containing today) — `countUpcomingBaselines` uses
   the former since a release date is a specific day, not a week-column highlight.
4. **`js/ui/`** — rendering + event wiring, organized by concern:
   - `common/`: generic building blocks reused across views — `modal.js` (blocking dialogs:
     `confirmConflict` for save conflicts, `promptText`/`promptColor` single-field prompts, plus
     the project-team form/card pair described above — `promptProjectForm` and `showProjectCard`
     — kept as bespoke functions rather than a generic form-builder since they're the only
     multi-field use case so far), `toast.js` (non-blocking notifications), `context-menu.js` (the
     "⋮" action menu used by every CRUD row action), `toolbar.js` (top-bar hamburger menu — the
     single entry point for view switching / backup / "+ New project" / "Change data folder…",
     reuses `context-menu` rather than duplicating open/close logic; next to "💾 Backup" sits a
     "Backup on exit" toggle (`state.ui.autoBackupOnExit`, same ✓-prefix convention as the
     view-switch rows above it) that, when on, makes `app.js`'s `pagehide` listener call
     `MP.repository.createBackup` automatically on tab/window close — best-effort only, since a
     browser doesn't guarantee async work finishes once a page is actually unloading, see
     docs/deployment.md "Backups"; project creation is reachable
     from every page, not just the gantt one, so after a successful create it switches
     `state.ui.vistaCorrente` to `gantt` so the result is visible; "Change data folder…" (after a
     `window.confirm`) resets `state` to `{ status: 'not-connected', dirHandle: null, dataset: null }`
     — no dedicated disconnect logic in `app.js`, it just reuses the existing `not-connected` screen
     and its "Select data folder" button/picker flow, since releasing the handle and re-running
     `connectToDirectory` needs no special-casing — plus `renderPageTitle`, a small label next to
     the hamburger showing the current view's name, sourced from the same `VIEWS` list used to
     build the menu so the two never drift apart: `gantt` → "Master Plan", `carico-risorse` →
     "Resource load", `milestones` → "Milestones", `team-risorse` → "Team & resources" (internal
     `state.ui.vistaCorrente` codes stay the original Italian identifiers — only the displayed
     `label` is English, see "UI language" above); `.page-title`'s font-size is
     tuned in CSS to make its box the same height as `.hamburger-btn` next to it, since it has no
     padding/border of its own to match the button's box with), `dataset-header.js` (the
     header shared by the gantt, resource-load, and milestones pages: a `.gantt-toolbar` info
     line — connected folder name (`state.dirHandle.name`; the File System Access API never
     exposes an absolute filesystem path, see Hard Constraints/`app.js` — this is the closest
     available proxy for "which data folder is this") + week range + task-row count + project
     count + upcoming-baseline count (`MP.milestones.countUpcomingBaselines`, release week ≥ today —
     see `milestones.js` above), computed via `MP.ganttView.buildRows` so all pages report the exact
     same numbers — plus the team-color legend from `legend.js`; takes
     an optional extra element to append to the info line, used by the gantt page for its
     archiviati/conclusi toggles (the "+ New project" button that used to live here moved to
     the hamburger menu, see `toolbar.js` above), and by the milestones page for its
     "Total releases in period" counter), `app-header.js` (static brand header — logo, "Weavo" title,
     version, copyright — rendered once into `#app-header` from `app.js`'s `bootstrap()`,
     outside the `state.status` render cycle since its content never changes; present on every
     screen including `not-connected`/`unsupported`/`error`, not just the `ready` views).
   - `crud/`: one file per entity (`project-crud.js`, `baseline-crud.js`, `task-crud.js`,
     `resource-crud.js`, `team-crud.js`). Each is create/rename/delete/reorder (+ `toggleConcluso`
     for tasks, `recolorTeam`/`moveResource` for team/risorse) directly against the in-memory
     dataset, persisted via `MP.saveCoordinator`/`MP.repository`, then triggers re-render.
     `project-crud.js`'s `createProject`/`editTeam` open `MP.modal.promptProjectForm` themselves
     when not given a preset value (same "modal call lives inside the CRUD function" pattern as
     the rest of this file), see "Project team/referents" above for the field shape.
   - `gantt/`: the main view. `gantt-view.js` builds the compact grid (CSS Grid + `position:
     sticky` for frozen first 3 columns and frozen header row — deliberately not a heavyweight
     gantt library, per spec §9) and exports `buildRows` (dataset → visible task rows, honoring
     `mostraArchiviati`/`mostraConclusi`) so `dataset-header.js` can compute the same row count
     shown in both pages; `gantt-row.js` renders one task row; `gantt-cell.js` renders one
     week×task cell (double click opens `cell-popover.js` for that single cell, resetting any
     pending range selection first; a cell whose resource(s) are overallocated gets a native
     `title` tooltip built from `MP.overallocation.findAllocations`, listing per sigla the other
     project/baseline/task it's allocated to that same week — same `progettoNome`/`baselineVersione`/
     `taskNome` shape the carico-risorse heat cells already use in `resource-load-view.js`, so the
     wording matches across both views); `cell-popover.js` is the editing popover (team-first, then
     multi-select resources restricted to that team, then milestone flag — milestone only in
     single-cell mode, see below — autosave on close, non-blocking double-allocation warning);
     a task admits only **one** milestone week, and all tasks of the same baseline share a single
     milestone: `gantt-view.js`'s `handleCellSaved` calls `syncBaselineMilestone` when a saved
     entry has `milestone: true` — it clears the flag from every other week of every non-`concluso`
     task in `baseline.task` (including the edited task itself) and sets it on the new week for
     all of them, preserving any existing `team`/`risorse` on that week rather than overwriting it;
     unchecking the milestone (`clearBaselineMilestone`) is symmetric, removing it from the other
     tasks that had inherited it too — otherwise the "shared deadline" invariant would silently
     drift. `concluso` tasks are skipped in both directions (same "closed tasks are never
     auto-touched" principle as team-mismatch handling above). This still uses the existing
     per-cell `cell-popover.js` as the only UI — no dedicated baseline-deadline popover — and the
     field stays duplicated on each `task.settimane[iso]` rather than moving to `baseline` itself;
     pre-existing datasets with inconsistent milestones across a baseline's tasks are **not**
     migrated automatically — they self-heal only the next time any task in that baseline has its
     milestone touched via the popover. This resolves the "Milestone unica per baseline" item in
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
     would otherwise silently drop any highlight applied to the old (now-discarded) elements;
     `legend.js` renders the color legend dynamically from
     `team-risorse.json`, read-only, no navigation affordance of its own — reaching the
     team/risorse page is via the `toolbar.js` hamburger menu only, on every page, not a
     per-view "manage" button.
   - `resource-load/resource-load-view.js`: per-resource per-week allocation count (replaces the
     original spreadsheet's `COUNTIF` formulas), header shared with the gantt page (see
     `dataset-header.js` above). Resources are grouped by team (a full-width group-header row per
     team, plus a team-colored bar on the sigla column — colors always read from
     `team-risorse.json`, nothing hardcoded), and each week cell is heat-colored by allocation
     count (green = 1, yellow = 2, red > 2) via the `load-1`/`load-2`/`load-3plus` CSS classes —
     its own separate legend, appended after the shared header — read-only, no navigation
     affordance of its own.
   - `team-risorse/team-risorse-view.js`: the dedicated CRUD page for teams and their resources
     (create/rename/recolor/delete team; create/rename/move/delete resource within a team) — the
     only place in the UI where `team-risorse.json` is edited.
   - `milestones/milestones-view.js`: read-only report on the density of baseline release
     milestones across the calendar, one row per baseline (fixed columns "Project"/"Baseline"
     only — no per-task row, since `MP.milestones.computeBaselineMilestones` already collapses
     each baseline to its single effective release week) instead of the gantt's per-task rows;
     same week columns/range as gantt and carico-risorse (`MP.weekUtils.getWeeksInRange`) and the
     same shared `dataset-header.js`, filtered by the same `state.ui.mostraArchiviati` flag (no
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
     button); it removes `manifest.settimane.prima` (head, past) after an always-shown explicit
     `window.confirm`, with allocation detail in the message when the week being removed isn't
     empty. `renderAddWeekButton` sits in the dedicated track right after the last week — also not
     sticky, so it only scrolls into view once the user has scrolled all the way past the real
     last week — and extends `manifest.settimane.ultima` by one week (tail, future) with no
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
   shared by the gantt, carico-risorse, and milestones pages) before clearing and restores it on
   the freshly
   rendered element afterward — otherwise every cell edit (which calls `setState({})` to
   re-notify subscribers after mutating the in-memory dataset) would snap the grid back to
   scroll position 0,0, hiding whatever cell the user just edited if they were scrolled away from
   the top-left. See also the `lastEdited` highlight mechanism in `gantt-view.js` above, which
   solves the companion problem of visually losing track of the edited cell.

   **Single-scrollbar page layout** (css/styles.css): `html body` is a `height: 100%` flex column
   with `overflow: hidden`, so the outer document itself never scrolls. `#app` (flex: 1 1 auto,
   `min-height: 0`) is the fallback scroll container for non-grid content (`.connect-panel`,
   `.error-panel`, `.team-risorse-page`, etc. — these just overflow `#app` normally if too tall).
   For the three grid pages, `.app-ready` (the wrapper `app.js`'s `renderReady` builds around
   `top-bar` + the page) and `.gantt-page` are themselves `flex: 1 1 auto; min-height: 0` flex
   columns, so they're stretched to fill `#app` exactly rather than growing with their content;
   `.gantt-toolbar`/`.legend`/`.warnings`/`.top-bar` are pinned `flex: 0 0 auto` so only
   `.gantt-scroll` (also `flex: 1 1 auto; min-height: 0`, in place of the old
   `max-height: calc(100vh - 220px)` magic number) absorbs the remaining space and produces the
   grid's own — and only — scrollbar, both vertically and horizontally.

### Where to make common changes

- New team, new color: **do not touch code** — it's user-editable data in `team-risorse.json`,
  managed through the dedicated team/risorse page. If a task references how the app *renders*
  teams, check it reads from `dataset.teamRisorsa` rather than assuming a fixed list.
- New field on the week-entry / task / project shape: start in `js/data/schema.js` (factories +
  `isWeekEntryEmpty`), then thread through `repository.js` save/load, then the relevant `ui/`
  renderer(s).
- Any code path that writes a project/manifest/team-risorse file in response to a user action
  must go through `MP.saveCoordinator`, not call `MP.repository.save*` directly — that's what
  gives conflict detection.
