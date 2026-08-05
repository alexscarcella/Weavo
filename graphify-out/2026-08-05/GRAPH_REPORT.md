# Graph Report - Weavo - Master Plan  (2026-07-30)

## Corpus Check
- 72 files · ~56,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 434 nodes · 732 edges · 45 communities (27 shown, 18 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `427c0129`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Project docs (docs/, README)
- CLAUDE.md architecture concepts
- modal.js
- app.js
- cell-selection.js
- week-shift.js / baseline-crud.js
- validation.js
- schema.js
- fs-access.js
- task-crud.js
- legacy-migration.js
- overallocation.js / gantt-cell.js
- store.js
- conflict-diff.js
- milestones.js / dataset-header.js
- week-utils.js
- cell-popover.js
- project-crud.js
- team-crud.js
- week-controls.js
- sample-data/manifest.json
- context-menu.js
- legend.js
- team-resources-view.js
- docs/api.md (dataset-header, milestones)
- spike-fsa/index.html
- docs/api.md (baseline-crud)
- docs/api.md (gantt-cell)
- docs/api.md (gantt-row)
- docs/api.md (legend)
- docs/api.md (project-crud)
- docs/api.md (resource-crud)
- docs/api.md (resource-load-view)
- docs/api.md (slug)
- docs/api.md (team-crud)
- docs/api.md (team-resources-view)
- docs/api.md (toast)
- docs/api.md (week-controls)
- docs/api.md (week-shift)
- docs/api.md (week-utils)
- schema.js PATHS
- schema.js SEED_TEAM
- load-mp.js
- package.json

## God Nodes (most connected - your core abstractions)
1. `CLAUDE.md — Master Plan project guidance` - 82 edges
2. `openModal()` - 12 edges
3. `wireModalDismiss()` - 11 edges
4. `escapeHtml()` - 11 edges
5. `renderAllocationsCard()` - 11 edges
6. `migrateIfNeeded()` - 9 edges
7. `renderMilestoneListCard()` - 9 edges
8. `render()` - 7 edges
9. `buildAllocationsHtml()` - 7 edges
10. `persistProject()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Single-scrollbar page layout design` --rationale_for--> `render()`  [EXTRACTED]
  CLAUDE.md → js/app.js
- `transformProject()` --shares_data_with--> `projects/<slug>.json schema (baseline/task/week)`  [EXTRACTED]
  js/data/legacy-migration.js → CLAUDE.md
- `transformTeamResources()` --shares_data_with--> `team-resources.json schema (teams[].resources[])`  [EXTRACTED]
  js/data/legacy-migration.js → CLAUDE.md
- `transformManifest()` --shares_data_with--> `manifest.json schema (project index, week range, schemaVersion)`  [EXTRACTED]
  js/data/legacy-migration.js → CLAUDE.md
- `Shift feature kept out of popover save path (avoids overwrite bug)` --rationale_for--> `openShiftMenu()`  [EXTRACTED]
  CLAUDE.md → js/ui/gantt/gantt-view.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Save-time and remote-change conflict detection flow** — js_data_save_coordinator, js_data_conflict_diff, js_data_repository_readtextfileornull, js_data_remote_check [EXTRACTED 1.00]
- **Per-cell/range week shift interaction flow** — js_model_week_shift, js_ui_gantt_gantt_view_openshiftmenu, js_ui_gantt_gantt_view_handlecellsshift, js_ui_gantt_cell_popover_whenidle, js_ui_crud_baseline_crud_shiftbaseline [EXTRACTED 0.90]
- **Module-singleton UI state controllers (outside the store)** — js_ui_gantt_cell_selection, js_ui_gantt_task_drag, js_ui_gantt_baseline_drag [INFERRED 0.85]
- **docs/ documentation suite** — readme_document, docs_architecture_document, docs_api_document, docs_database_document, docs_deployment_document, docs_security_document, docs_glossary_document [EXTRACTED 1.00]
- **Conflict detection and remote-change notification mechanism** — docs_database_conflictdetection, docs_database_mp_conflictdiff, docs_database_mp_remotecheck, docs_api_mp_savecoordinator [EXTRACTED 1.00]

## Communities (45 total, 18 thin omitted)

### Community 0 - "Project docs (docs/, README)"
Cohesion: 0.07
Nodes (44): MP.cellPopover, MP.cellSelection, MP.contextMenu, MP.fsAccess, MP.ganttView, MP.legacyMigration, MP.modal, MP.overallocation (+36 more)

### Community 1 - "CLAUDE.md architecture concepts"
Cohesion: 0.05
Nodes (39): CLAUDE.md — Master Plan project guidance, Baseline drag & drop reorder, Boolean (allocated / not allocated) allocation model, Task-level completed semantics (excluded from overallocation/mismatch), English-only UI language and data-model field names sweep, File System Access API dependency (Chrome/Edge only), graphify codebase knowledge graph tool, Master Plan (Weavo) client-side web app (+31 more)

### Community 2 - "modal.js"
Cohesion: 0.20
Nodes (28): buildAllocationsHtml(), buildAllocationsText(), buildMilestoneClipboardText(), confirmConflict(), confirmWithReport(), copyAllocationsToClipboard(), copyMilestoneListToClipboard(), escapeHtml() (+20 more)

### Community 3 - "app.js"
Cohesion: 0.12
Nodes (16): No IndexedDB — never fires onsuccess/onerror under file://, Single-scrollbar page layout design, bootstrap(), connectToDirectory(), escapeHtml(), render(), renderError(), renderMessage() (+8 more)

### Community 4 - "cell-selection.js"
Cohesion: 0.16
Nodes (21): Baseline milestone sync across all tasks (single deadline invariant), Shift feature kept out of popover save path (avoids overwrite bug), clearHighlight(), getRangeForAction(), handleCellClick(), relocate(), reset(), setAnchor() (+13 more)

### Community 5 - "week-shift.js / baseline-crud.js"
Cohesion: 0.15
Nodes (16): canShiftBaseline(), shiftBaselineData(), shiftWeeksData(), createBaseline(), deleteBaseline(), moveBaselineToPosition(), persistProject(), renameBaseline() (+8 more)

### Community 6 - "validation.js"
Cohesion: 0.17
Nodes (18): Assisted bulk regularization on resource move, Orphan team/resource/project-referent references, Team mismatch detection (entry.team vs resource's current team), findOrphanProjectReferents(), findOrphanResources(), findOrphanTeam(), findResourceAllocations(), findTeamMismatches() (+10 more)

### Community 7 - "schema.js"
Cohesion: 0.13
Nodes (8): Project referents structured field (PM/PE/solutionAnalyst/vvReference/note), loadDataset(), createProjectReferents(), createWeekEntry(), existingInitials(), flattenResources(), normalizeProjectReferents(), projects/<slug>.json schema (baseline/task/week)

### Community 8 - "fs-access.js"
Cohesion: 0.19
Nodes (9): ensurePermission(), fileExists(), getFileHandle(), queryPermissionSilently(), readTextFile(), removeFile(), resolveDirHandle(), splitPath() (+1 more)

### Community 9 - "task-crud.js"
Cohesion: 0.22
Nodes (13): createTask(), deleteTask(), moveTaskToPosition(), persistProject(), renameTask(), setTaskNote(), toggleCompleted(), clearIndicator() (+5 more)

### Community 10 - "legacy-migration.js"
Cohesion: 0.30
Nodes (14): Legacy data migration (Italian-named schema to current), legacyToNewProjectPath(), migrateIfNeeded(), migrateV1ToV3(), migrateV2ToV3(), renameArchivedToCompletedBaseline(), renameArchivedToCompletedProject(), transformBaseline() (+6 more)

### Community 11 - "overallocation.js / gantt-cell.js"
Cohesion: 0.20
Nodes (9): findAllocations(), getCellDiv(), registerCell(), renderWeekCell(), fixedCell(), headerCell(), loadClass(), renderResourceLoadView() (+1 more)

### Community 12 - "store.js"
Cohesion: 0.22
Nodes (8): setAutoBackupOnExit(), setNotifyOnRemoteChanges(), setState(), buildActions(), changeDataFolder(), createProject(), renderHamburgerMenu(), runBackup()

### Community 13 - "conflict-diff.js"
Cohesion: 0.26
Nodes (11): Reread-before-write save conflict detection (spec §6.4), diffWeeks(), flattenTasks(), summarize(), summarizeManifest(), summarizeProject(), summarizeTeamResources(), saveManifest() (+3 more)

### Community 14 - "milestones.js / dataset-header.js"
Cohesion: 0.39
Nodes (7): computeBaselineMilestones(), computeUpcomingMilestonesByMonth(), countUpcomingBaselines(), fixedCell(), headerCell(), renderHistogram(), renderMilestonesView()

### Community 15 - "week-utils.js"
Cohesion: 0.36
Nodes (9): addDays(), addWeeks(), formatWeekLabel(), getCurrentWeekIso(), getTodayIso(), getWeeksInRange(), isMonday(), toDate() (+1 more)

### Community 16 - "cell-popover.js"
Cohesion: 0.42
Nodes (9): Week-level completed semantics (per-cell, orthogonal to milestone), closeExisting(), commitAndClose(), detachGlobalListeners(), handleKeydown(), handleOutsideClick(), openPopover(), positionPopover() (+1 more)

### Community 17 - "project-crud.js"
Cohesion: 0.36
Nodes (9): promptProjectForm(), createProject(), deleteProject(), editReferents(), existingSlugs(), moveProject(), persist(), renameProject() (+1 more)

### Community 18 - "team-crud.js"
Cohesion: 0.43
Nodes (7): 1-team-to-N-resources relationship model, createTeam(), deleteTeam(), existingCodici(), persist(), recolorTeam(), renameTeam()

### Community 19 - "week-controls.js"
Cohesion: 0.53
Nodes (5): handleAddWeek(), handleRemoveWeek(), persistManifest(), renderAddWeekButton(), renderRemoveWeekButton()

### Community 20 - "sample-data/manifest.json"
Cohesion: 0.33
Nodes (5): projects, schemaVersion, weeks, first, last

### Community 21 - "context-menu.js"
Cohesion: 0.80
Nodes (4): closeExisting(), createMenuButton(), onOutsideClick(), openMenu()

### Community 22 - "legend.js"
Cohesion: 0.80
Nodes (4): badgeItem(), renderLegend(), staticItem(), swatch()

### Community 23 - "team-resources-view.js"
Cohesion: 0.70
Nodes (4): renderResourceRow(), renderTeamCard(), renderTeamResourcesView(), swatch()

### Community 42 - "load-mp.js"
Cohesion: 0.27
Nodes (5): { loadMP }, loadMP(), path, { loadMP }, { loadMP }

### Community 43 - "package.json"
Cohesion: 0.25
Nodes (7): jest, devDependencies, jest, name, private, scripts, test

## Knowledge Gaps
- **57 isolated node(s):** `name`, `private`, `jest`, `test`, `schemaVersion` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — Master Plan project guidance` connect `CLAUDE.md architecture concepts` to `modal.js`, `app.js`, `cell-selection.js`, `week-shift.js / baseline-crud.js`, `validation.js`, `schema.js`, `fs-access.js`, `task-crud.js`, `legacy-migration.js`, `overallocation.js / gantt-cell.js`, `store.js`, `conflict-diff.js`, `milestones.js / dataset-header.js`, `week-utils.js`, `cell-popover.js`, `project-crud.js`, `team-crud.js`, `week-controls.js`, `context-menu.js`, `legend.js`, `team-resources-view.js`?**
  _High betweenness centrality (0.754) - this node is a cross-community bridge._
- **What connects `name`, `private`, `jest` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project docs (docs/, README)` be split into smaller, more focused modules?**
  _Cohesion score 0.07137254901960784 - nodes in this community are weakly interconnected._
- **Should `CLAUDE.md architecture concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.05353535353535353 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Should `schema.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1323529411764706 - nodes in this community are weakly interconnected._