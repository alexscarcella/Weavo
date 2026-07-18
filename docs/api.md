# API

*Optional doc — included because the app has an internal module contract worth documenting,
even though it has no network API.*

## There is no network API

Weavo makes **zero network requests**. There's no REST/GraphQL endpoint, no backend process, and
nothing to authenticate against — the entire "backend" is the local filesystem, reached through
the browser's File System Access API (see [database.md](database.md) and
[security.md](security.md)). If you're looking for an OpenAPI spec or a set of HTTP routes, they
don't exist in this project.

## The internal module contract

What *does* exist is a stable contract between the plain-script modules described in
[architecture.md](architecture.md): each file attaches a namespaced object to `window.MP`, and
every other module calls into it by name rather than through an import graph. That surface is
the closest thing this app has to an "API," and it's what a new UI file or a new automated check
(see the Node `vm`-sandbox technique in the top-level `CLAUDE.md`) would call.

| Namespace | File | Responsibility |
|---|---|---|
| `MP.schema` | `js/data/schema.js` | Canonical shapes, factories (`createProject`, `createProjectReferents`, `createBaseline`, `createTask`, `createWeekEntry`), the legacy-referents self-heal `normalizeProjectReferents`, lookup helpers (`findTeamByCode`, `findResourceEntry`, `flattenResources`, `existingInitials`) |
| `MP.fsAccess` | `js/data/fs-access.js` | Low-level File System Access API wrapper: pick a directory, check/request permission, read/write/list/remove files and directories |
| `MP.legacyMigration` | `js/data/legacy-migration.js` | `migrateIfNeeded(dirHandle)` — one-time upgrade of a pre-existing data folder still on an older `schemaVersion`; pure transform functions (`transformManifest`, `transformTeamResources`, `transformProject`) reused by `scripts/import-excel/`'s own tooling. See [database.md](database.md#legacy-data-migration) |
| `MP.repository` | `js/data/repository.js` | `loadDataset(dirHandle)` (runs `MP.legacyMigration.migrateIfNeeded` first), raw `saveProject`/`saveManifest`/`saveTeamResources`, `createBackup` |
| `MP.saveCoordinator` | `js/data/save-coordinator.js` | `saveProject`/`saveManifest`/`saveTeamResources` with reread-before-write conflict detection — the only entry point user-triggered writes should use |
| `MP.slug` | `js/data/slug.js` | `slugify`, `uniqueSlug` — filename generation for new projects |
| `MP.store` | `js/state/store.js` | `getState`, `setState`, `subscribe`, `setAutoBackupOnExit` (persists `state.ui.autoBackupOnExit` to `localStorage`) |
| `MP.weekUtils` | `js/model/week-utils.js` | Monday-based ISO week arithmetic: `toIso`, `addWeeks`, `getWeeksInRange`, `formatWeekLabel`, `getTodayIso`, `getCurrentWeekIso`, `findAllocationsInWeeks` |
| `MP.overallocation` | `js/model/overallocation.js` | `buildAllocationIndex`, `findAllocations`, `findOverallocatedKeys` — cross-project initials×week index |
| `MP.validation` | `js/model/validation.js` | `findOrphanTeam`, `findOrphanResources`, `findTeamMismatches`, `findOrphanProjectReferents` — non-blocking data-consistency warnings |
| `MP.milestones` | `js/model/milestones.js` | `computeBaselineMilestones` (per-baseline effective release week, feeds the Milestones page), `countUpcomingBaselines` (release week ≥ today, feeds the "upcoming baselines" count in `MP.datasetHeader`) |
| `MP.weekShift` | `js/model/week-shift.js` | `canShiftWeeks` (ammissibility predicate — completed task, past the week range, or destination already occupied), `shiftWeeksData` (the mutation) — one week/range shifted one week back or forward, feeds the gantt view's shift feature |
| `MP.modal`, `MP.toast`, `MP.contextMenu`, `MP.toolbar`, `MP.datasetHeader` | `js/ui/common/*.js` | Generic UI building blocks shared across views — `MP.datasetHeader.renderDatasetHeader` is the info-line + color-legend header shared by the gantt and resource-load pages; `MP.modal.promptProjectForm`/`showProjectCard` are the project-referents edit form and read-only info card, `MP.modal.showHelpGuide` a static in-app guide to the gantt interactions (opened by the "?" button `MP.toolbar.renderHelpButton` renders in the top bar); `MP.contextMenu.openMenu` actions support `disabled`/`header` entries (a greyed-out non-clickable item, and a plain informational text row) on top of the plain clickable ones; `MP.toolbar` also hosts the "+ New project", "💾 Backup", "Backup on exit" toggle (auto-runs the backup on tab/window close, best-effort — see `docs/deployment.md`), and "Change data folder…" menu actions (the last one resets `state` to `not-connected`, releasing `dirHandle`/`dataset` so the user can pick a different folder without a page reload) |
| `MP.projectCrud`, `MP.baselineCrud`, `MP.taskCrud`, `MP.resourceCrud`, `MP.teamCrud` | `js/ui/crud/*.js` | Create/rename/delete/reorder operations against the in-memory dataset, persisted via `MP.saveCoordinator` |
| `MP.ganttView`, `MP.ganttRow`, `MP.ganttCell`, `MP.cellPopover`, `MP.cellSelection`, `MP.cellShiftSelection`, `MP.taskDrag`, `MP.legend` | `js/ui/gantt/*.js` | The main grid view — `MP.cellSelection` (click/shift-click) drives the bulk-allocation popover, `MP.cellShiftSelection` (Ctrl+click) is a separate, independent range selection feeding only the shift feature's right-click menu, `MP.taskDrag` drives dragging a task's row handle onto another row to reposition it (including across baselines of the same project, via `MP.taskCrud.moveTaskToPosition`) — all three keep fully separate module state, never shared |
| `MP.resourceLoadView`, `MP.teamResourcesView`, `MP.weekControls` | `js/ui/*/*.js` | Secondary views |

### Conventions

- Every module is loaded as a classic script and reads/writes `window.MP` directly — there's no
  export/import syntax, so **load order in `index.html` is part of the contract**: a module can
  only reference a namespace that was attached by an earlier `<script>` tag.
- Functions that touch disk are `async` and return promises; everything in `js/model/` is a
  synchronous, side-effect-free function of its arguments.
- Nothing in `js/model/` or `js/ui/` calls `MP.fsAccess` or `MP.repository` directly for
  user-triggered writes — that always goes through `MP.saveCoordinator` (see
  [architecture.md](architecture.md#where-to-look-for-a-given-change)).
