# Changelog

All notable changes to Master Plan are documented in this file.

## [Unreleased] — 2026-08-06

### Added

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
- **Gantt grid columns** — the Baseline column (`col-2`) widened from 117px to 234px (Task,
  `col-3`, shifts right accordingly) so longer baseline/version labels no longer truncate.

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
