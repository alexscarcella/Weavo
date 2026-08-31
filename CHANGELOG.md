# Changelog

All notable changes to Master Plan are documented in this file.

## [Unreleased] — 2026-08-06

### Added

- **Multi-project filter on the gantt view** — a "Projects: N of M" button in the header toolbar
  opens a checkbox panel (with Select all / Clear) that restricts the grid to a chosen subset of
  projects. Session-only (`state.ui.projectFilter`, an array of project file paths; empty / all
  checked = show everything), never persisted; applied by `MP.ganttView.buildRows` and scoped to
  the gantt grid only (Workload and Milestones ignore it). The panel batches its edits and only
  triggers a re-render on close, so the full-rebuild render doesn't fight the open panel. Hidden
  projects are automatically neither a source nor a target for baseline/task drag; the project
  `↑/↓` menu action (`MP.projectCrud.moveProject`) now skips over hidden projects so it still
  moves the row past them instead of looking like a no-op. New module
  [js/ui/gantt/project-filter.js](js/ui/gantt/project-filter.js) (`MP.projectFilter`).
- **Cross-project drag & drop for baselines and tasks** — the ⠿ handle now moves a baseline to
  a *different* project, and a task to any baseline including one in another project (previously
  both were locked to a single project). Drop targets on every project's rows now accept the
  drag; a project with no baselines yet accepts a dropped baseline on its "— no baseline —"
  placeholder row. A cross-project **task** move still adopts the destination baseline's
  `readyForUat`/`uat` dates and is blocked (with an alert, before any change) if that would break
  the `taskDeadline < readyForUat < uat` ordering. A cross-project **baseline** move whose BL
  team is inherited (`baseline.team === null`) snapshots the source project's effective team onto
  the baseline, so it keeps the team it visibly had instead of silently re-inheriting the
  destination's. Persistence for the two-file case goes through the new
  `MP.saveCoordinator.saveProjects(state, files)`, which conflict-checks both files before
  writing either and lets the move roll back in memory if a conflict prompt is cancelled; there
  is no on-disk transaction, so the write order is destination-first (a hard mid-write failure
  then leaves a recoverable duplicate, never a loss). `MP.baselineCrud.moveBaselineToPosition`
  and `MP.taskCrud.moveTaskToPosition` gained a `targetFile` parameter; new specs
  `unit/ui/baseline-move.test.js`, `unit/ui/task-move.test.js`, `unit/data/save-coordinator.test.js`
  (the first `unit/ui/` and `unit/data/save-coordinator` coverage).
- **Month-boundary separator line** — the gantt, Workload, and Milestones grids now draw a
  dashed grey vertical line (`.month-boundary`) on the first week column of every calendar month,
  a lightweight orientation aid alongside the existing solid blue "today" line
  (`current-week-line`); when both would land on the same column, "today" wins.
  (`js/model/week-utils.js`'s `isMonthBoundary`, applied in `gantt-view.js`,
  `resource-load-view.js`, and `milestones-view.js`, plus a matching badge/border on the
  Milestones grid's histogram cells.)

### Changed

- **Week-removal confirmation** (`week-controls.js`'s `handleRemoveWeek`) — deleting a
  non-empty week from the head of the sheet now opens a copyable report
  (`MP.modal.confirmWithReport`) splitting affected allocations into "ACTIVE (still binding)" and
  "Completed/closed (no longer binding)" sections, instead of a flat list capped at 10 items
  inside a plain `window.confirm`. `MP.weekUtils.findAllocationsInWeeks` now returns a `completed`
  flag per allocation (true if the project, baseline, task, or that single week is already
  closed) to drive the split. `MP.modal.confirmWithReport` gained two optional params,
  `boxClass`/`rows`, to size this particular report's dialog without affecting its other caller.
- **Gantt grid columns** — the Project/Team column (`col-1`) widened from 170px to 255px and the
  Baseline column (`col-2`) from 117px to 351px (Task, `col-3`, shifts right accordingly) so
  longer project names and baseline/version labels no longer truncate. `col-1` and
  `ms-col-baseline` are shared with the Milestones grid, so its Project column widens to match.
  Each width lives in two places kept in sync: the inline `grid-template-columns` in
  `gantt-view.js` / `milestones-view.js` and the `.col-1`/`.col-2`/`.col-3`/`.ms-col-baseline`
  rules in `styles.css` (whose cumulative `left` sticky offsets shift too).

### Fixed

- **Cell-edit popovers off-screen or overlapping near page edges** — right-clicking an already
  allocated week cell near the bottom/top/left/right of the viewport (e.g. the last row after
  scrolling all the way down) could open the allocation popover and the shift menu clipped outside
  the page or overlapping each other, since each positioned itself independently — the shift menu
  in particular used hardcoded height/width guesses instead of measuring the rendered box, and
  never clamped its left edge. New shared module
  [js/ui/common/floating-position.js](js/ui/common/floating-position.js) (`positionSingle`/
  `positionStack`) measures each box's real rendered size and treats the popover + shift menu as
  one non-overlapping stack that flips above/below the cell based on actual available space, while
  keeping their DOM/save logic fully separate (they were split in the first place to fix a
  data-overwrite bug — see `docs/architecture.md`'s "hard-won lessons"). Both boxes are switched to
  `position: fixed` *before* being measured, not after — a box with no explicit CSS `width` (like
  `.context-menu`, which only sets `min-width`) stretches to fill its container while still in
  normal flow, and only shrinks to its real content width once taken out of flow; measuring too
  early was an intermediate regression caught during manual testing, pinning the shift menu to the
  viewport's left edge. `js/ui/common/context-menu.js` and `js/ui/gantt/cell-popover.js` now
  delegate to the shared module; `.context-menu` gained the same `max-height`/`overflow-y`
  viewport safety net `.cell-popover` already had.

## 2026-08-05

### Added — 3-type milestone model

Milestones move from a single boolean flag per week to three mutually-exclusive, ordered
deadline types (`MP.schema.MILESTONE_TYPES`):

- **Task deadline** (`taskDeadline`) — an internal deadline scoped to one task, never shared.
- **Ready for UAT** (`readyForUat`) — baseline-wide, propagated to every non-completed task of
  the same baseline (same behavior the old single flag had).
- **UAT** (`uat`) — also baseline-wide/propagated, and now additionally blocks resource
  assignment on that week: `MP.schema.createWeekEntry` silently drops any `team`/`resources`
  passed alongside a `uat` milestone, and the cell popover disables the Team/Resources controls
  once "UAT" is selected.

A task can now carry up to 3 milestone weeks at once (one per type), and whichever of the three
are present must be strictly increasing — Task deadline < Ready for UAT < UAT, never on the same
week. This ordering is a genuine hard block (`window.alert` + abort, no partial mutation), checked
through one new shared, pure module,
[js/model/milestone-rules.js](js/model/milestone-rules.js) (`MP.milestoneRules`), reused by every
write path that can move a milestone week instead of duplicating the rule:

- the cell popover save (`gantt-view.js`'s `handleCellSaved`);
- the per-cell ◀/▶ shift (`week-shift.js`'s `canShiftWeeks`, now baseline-aware);
- the whole-baseline shift (`week-shift.js`'s `canShiftBaseline`, via a new second per-task pass,
  `checkTaskOrderingAfterShift`, needed because a stationary completed milestone week doesn't
  translate with the rest of the task);
- dragging a task to a **different** baseline (`MP.taskCrud.moveTaskToPosition`) — previously this
  path never touched milestones at all; it now adopts the destination baseline's current
  `readyForUat`/`uat` dates onto the moved task (keeping its own `taskDeadline`) and blocks the
  move if that would violate the ordering.

Converting one shared type into another on the same week (e.g. Ready for UAT → UAT via the
popover radio group) is handled as an in-place simulation so it isn't mistaken for two types
landing on one week.

### Changed

- **Popover UI** (`cell-popover.js`) — the old single "Delivery milestone" checkbox is replaced by
  a 4-option radio group (None / Task deadline / Ready for UAT / UAT), single-cell mode only.
  Picking UAT clears and disables Team/Resources with a red hint line; picking a shared type shows
  a non-blocking note listing how many other tasks in the baseline will also update.
- **Gantt cell rendering** (`gantt-cell.js`, `css/styles.css`) — all three types stay red (fixed
  requirement) but are differentiated by border weight and a small corner badge: Task deadline
  (2px inset border, ◆ badge), Ready for UAT (4px inset border, same badge style), UAT (2px border
  **plus solid red cell background**, white badge on red). New CSS classes
  `.gantt-cell.milestone-task-deadline/-ready-for-uat/-uat` and `.badge-milestone-*` replace the
  single `.gantt-cell.milestone`/badge pair.
- **Legend** (`legend.js`) — one swatch per type instead of a single "Milestone" entry.
- **Milestones page** (`milestones-view.js`, `js/model/milestones.js`) — `computeBaselineMilestones`
  now returns independent `readyForUat`/`uat` sub-results per baseline row (`taskDeadline` stays
  out of this aggregate by design); the page shows two total rows ("Total releases in period: N
  Ready for UAT, M UAT"), a two-segment stacked histogram per week, and list/grid items colored to
  tell the two series apart (dark red `#b71c1c` for UAT vs. red `#d32f2f` for Ready for UAT).
  `countUpcomingBaselines` and `computeUpcomingMilestonesByMonth` are similarly type-split.
- **Header info line** (`dataset-header.js`) — "N upcoming baselines" becomes
  "Upcoming: N Ready for UAT, M UAT".
- **Schema** (`js/data/schema.js`) — `entry.milestone` is now a type string instead of `true`;
  `SCHEMA_VERSION` bumped **3 → 4**.
- **Legacy migration** (`js/data/legacy-migration.js`) — new v3 → v4 step
  (`applyMilestoneTypeMigration`) rewrites every `milestone: true` to `milestone: 'readyForUat'`
  across all project files on connect, `manifest.json` written last as the commit point (same
  pattern as the earlier v1/v2 steps).
- **Sample data** — every `"milestone": true` across `sample-data/projects/*.json` updated to
  `"milestone": "readyForUat"` to match the new schema.

### Docs

- `README.md`, `docs/api.md`, `docs/glossary.md`, `docs/architecture.md`, `docs/database.md`, and
  `CLAUDE.md` updated to describe the 3-type model, the new `MP.milestoneRules` module, and the
  schema v4 migration step.
- `README.md` also documents the Jest unit-test workflow (`npm install` / `npm test`,
  `unit/` mirroring `js/`) and the VS Code Jest extension integration.

### Other

- `index.html`: `js/model/milestone-rules.js` added to the script load order, right after
  `week-utils.js` and before `week-shift.js` (its dependency).
- `graphify-out/cache/`: incremental graph cache bookkeeping updated (no content changes to
  `graph.json`/`GRAPH_REPORT.md`).
