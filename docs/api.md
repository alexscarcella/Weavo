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
| `MP.schema` | `js/data/schema.js` | Canonical shapes, factories (`createProject`, `createProjectTeamInfo`, `createBaseline`, `createTask`, `createWeekEntry`), the legacy-data migration `normalizeProjectTeam`, lookup helpers (`findTeamByCodice`, `findResourceEntry`, `flattenRisorse`, `existingSigle`) |
| `MP.fsAccess` | `js/data/fs-access.js` | Low-level File System Access API wrapper: pick a directory, check/request permission, read/write/list/remove files |
| `MP.repository` | `js/data/repository.js` | `loadDataset(dirHandle)`, raw `saveProject`/`saveManifest`/`saveTeamRisorsa`, `createBackup` |
| `MP.saveCoordinator` | `js/data/save-coordinator.js` | `saveProject`/`saveManifest`/`saveTeamRisorsa` with reread-before-write conflict detection — the only entry point user-triggered writes should use |
| `MP.slug` | `js/data/slug.js` | `slugify`, `uniqueSlug` — filename generation for new projects |
| `MP.store` | `js/state/store.js` | `getState`, `setState`, `subscribe` |
| `MP.weekUtils` | `js/model/week-utils.js` | Monday-based ISO week arithmetic: `toIso`, `addWeeks`, `getWeeksInRange`, `formatWeekLabel`, `getTodayIso`, `getCurrentWeekIso`, `findAllocationsInWeeks` |
| `MP.overallocation` | `js/model/overallocation.js` | `buildAllocationIndex`, `findAllocations`, `findOverallocatedKeys` — cross-project sigla×week index |
| `MP.validation` | `js/model/validation.js` | `findOrphanTeam`, `findOrphanRisorse`, `findTeamMismatches`, `findOrphanProjectRiferimenti` — non-blocking data-consistency warnings |
| `MP.milestones` | `js/model/milestones.js` | `computeBaselineMilestones` (per-baseline effective release week, feeds the Milestones page), `countUpcomingBaselines` (release week ≥ today, feeds the "upcoming baselines" count in `MP.datasetHeader`) |
| `MP.modal`, `MP.toast`, `MP.contextMenu`, `MP.toolbar`, `MP.datasetHeader` | `js/ui/common/*.js` | Generic UI building blocks shared across views — `MP.datasetHeader.renderDatasetHeader` is the info-line + color-legend header shared by the gantt and resource-load pages; `MP.modal.promptProjectForm`/`showProjectCard` are the project-team edit form and read-only info card; `MP.toolbar` also hosts the "+ New project", "💾 Backup", and "Change data folder…" menu actions (the last one resets `state` to `not-connected`, releasing `dirHandle`/`dataset` so the user can pick a different folder without a page reload) |
| `MP.projectCrud`, `MP.baselineCrud`, `MP.taskCrud`, `MP.resourceCrud`, `MP.teamCrud` | `js/ui/crud/*.js` | Create/rename/delete/reorder operations against the in-memory dataset, persisted via `MP.saveCoordinator` |
| `MP.ganttView`, `MP.ganttRow`, `MP.ganttCell`, `MP.cellPopover`, `MP.cellSelection`, `MP.legend` | `js/ui/gantt/*.js` | The main grid view |
| `MP.resourceLoadView`, `MP.teamRisorsaView`, `MP.weekControls` | `js/ui/*/*.js` | Secondary views |

### Conventions

- Every module is loaded as a classic script and reads/writes `window.MP` directly — there's no
  export/import syntax, so **load order in `index.html` is part of the contract**: a module can
  only reference a namespace that was attached by an earlier `<script>` tag.
- Functions that touch disk are `async` and return promises; everything in `js/model/` is a
  synchronous, side-effect-free function of its arguments.
- Nothing in `js/model/` or `js/ui/` calls `MP.fsAccess` or `MP.repository` directly for
  user-triggered writes — that always goes through `MP.saveCoordinator` (see
  [architecture.md](architecture.md#where-to-look-for-a-given-change)).
