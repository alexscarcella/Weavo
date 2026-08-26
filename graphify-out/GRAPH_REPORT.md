# Graph Report - Weavo - Master Plan  (2026-08-26)

## Corpus Check
- 77 files · ~59,337 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 516 nodes · 857 edges · 52 communities (32 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b47b58e5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- docs/glossary.md
- CLAUDE.md — Master Plan project guidance
- modal.js
- app.js
- gantt-view.js
- baseline-crud.js
- validation.js
- schema.js
- fs-access.js
- task-drag.js
- legacy-migration.js
- resource-load-view.js
- toolbar.js
- save-coordinator.js
- milestones-view.js
- week-utils.js
- cell-popover.js
- project-crud.js
- Weavo
- week-controls.js
- manifest.json
- legend.js
- team-resources-view.js
- MP.datasetHeader
- spike-fsa/index.html (FSA permission spike)
- MP.baselineCrud
- MP.ganttCell
- MP.ganttRow
- MP.legend
- MP.projectCrud
- MP.resourceCrud
- MP.resourceLoadView
- MP.slug
- MP.teamCrud
- MP.teamResourcesView
- MP.toast
- MP.weekControls
- MP.weekShift
- MP.weekUtils
- MP.schema.PATHS
- SEED_TEAM (starting point for new empty dataset)
- load-mp.js
- package.json
- task-crud.js
- milestone-rules.js
- 2026-08-05
- week-drag.js
- week-shift.test.js
- week-utils.test.js
- AGENTS.md
- team-crud.js

## God Nodes (most connected - your core abstractions)
1. `CLAUDE.md — Master Plan project guidance` - 82 edges
2. `escapeHtml()` - 16 edges
3. `openModal()` - 15 edges
4. `wireModalDismiss()` - 14 edges
5. `renderAllocationsCard()` - 11 edges
6. `persistProject()` - 10 edges
7. `migrateIfNeeded()` - 10 edges
8. `Weavo` - 10 edges
9. `renderMilestoneListCard()` - 9 edges
10. `Guide for non-technical users (first install, setup, and daily use)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Shift feature kept out of popover save path (avoids overwrite bug)` --rationale_for--> `openShiftMenu()`  [EXTRACTED]
  CLAUDE.md → js/ui/gantt/gantt-view.js
- `transformManifest()` --shares_data_with--> `manifest.json schema (project index, week range, schemaVersion)`  [EXTRACTED]
  js/data/legacy-migration.js → CLAUDE.md
- `transformProject()` --shares_data_with--> `projects/<slug>.json schema (baseline/task/week)`  [EXTRACTED]
  js/data/legacy-migration.js → CLAUDE.md
- `Single-scrollbar page layout design` --rationale_for--> `render()`  [EXTRACTED]
  CLAUDE.md → js/app.js
- `normalizeProjectReferents()` --references--> `Project referents structured field (PM/PE/solutionAnalyst/vvReference/note)`  [EXTRACTED]
  js/data/schema.js → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Per-cell/range week shift interaction flow** — js_model_week_shift, js_ui_gantt_gantt_view_openshiftmenu, js_ui_gantt_gantt_view_handlecellsshift, js_ui_gantt_cell_popover_whenidle, js_ui_crud_baseline_crud_shiftbaseline [EXTRACTED 0.90]
- **Conflict detection and remote-change notification mechanism** — docs_database_conflictdetection, docs_database_mp_conflictdiff, docs_database_mp_remotecheck, docs_api_mp_savecoordinator [EXTRACTED 1.00]
- **Save-time and remote-change conflict detection flow** — js_data_save_coordinator, js_data_conflict_diff, js_data_repository_readtextfileornull, js_data_remote_check [EXTRACTED 1.00]
- **Module-singleton UI state controllers (outside the store)** — js_ui_gantt_cell_selection, js_ui_gantt_task_drag, js_ui_gantt_baseline_drag [INFERRED 0.85]

## Communities (52 total, 20 thin omitted)

### Community 0 - "docs/glossary.md"
Cohesion: 0.07
Nodes (44): MP.cellPopover, MP.cellSelection, MP.contextMenu, MP.fsAccess, MP.ganttView, MP.legacyMigration, MP.modal, MP.overallocation (+36 more)

### Community 1 - "CLAUDE.md — Master Plan project guidance"
Cohesion: 0.05
Nodes (41): CLAUDE.md — Master Plan project guidance, Baseline drag & drop reorder, Boolean (allocated / not allocated) allocation model, Task-level completed semantics (excluded from overallocation/mismatch), File System Access API dependency (Chrome/Edge only), graphify codebase knowledge graph tool, Master Plan (Weavo) client-side web app, Module-singleton UI state pattern (outside the store) (+33 more)

### Community 2 - "modal.js"
Cohesion: 0.17
Nodes (35): buildAllocationsHtml(), buildAllocationsText(), buildMilestoneClipboardText(), cardHeader(), confirmConflict(), confirmWithReport(), copyAllocationsToClipboard(), copyMilestoneListToClipboard() (+27 more)

### Community 3 - "app.js"
Cohesion: 0.12
Nodes (16): No IndexedDB — never fires onsuccess/onerror under file://, Single-scrollbar page layout design, bootstrap(), connectToDirectory(), escapeHtml(), render(), renderError(), renderMessage() (+8 more)

### Community 4 - "gantt-view.js"
Cohesion: 0.23
Nodes (18): Baseline milestone sync across all tasks (single deadline invariant), Shift feature kept out of popover save path (avoids overwrite bug), applyWeeksShift(), buildRows(), clearBaselineMilestone(), clearOtherMilestones(), handleBulkCellsSaved(), handleCellSaved() (+10 more)

### Community 5 - "baseline-crud.js"
Cohesion: 0.20
Nodes (15): canShiftBaseline(), canShiftWeeks(), findMaxShift(), shiftBaselineData(), shiftWeeksData(), createBaseline(), deleteBaseline(), moveBaselineToPosition() (+7 more)

### Community 6 - "validation.js"
Cohesion: 0.17
Nodes (18): Assisted bulk regularization on resource move, Orphan team/resource/project-referent references, Team mismatch detection (entry.team vs resource's current team), findOrphanProjectReferents(), findOrphanResources(), findOrphanTeam(), findResourceAllocations(), findTeamMismatches() (+10 more)

### Community 7 - "schema.js"
Cohesion: 0.12
Nodes (10): Project referents structured field (PM/PE/solutionAnalyst/vvReference/note), loadDataset(), createProjectReferents(), createWeekEntry(), existingInitials(), flattenResources(), normalizeBaselineTeam(), normalizeProjectReferents() (+2 more)

### Community 8 - "fs-access.js"
Cohesion: 0.19
Nodes (9): ensurePermission(), fileExists(), getFileHandle(), queryPermissionSilently(), readTextFile(), removeFile(), resolveDirHandle(), splitPath() (+1 more)

### Community 9 - "task-drag.js"
Cohesion: 0.15
Nodes (18): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset(), clearHighlight(), getRangeForAction() (+10 more)

### Community 10 - "legacy-migration.js"
Cohesion: 0.22
Nodes (19): English-only UI language and data-model field names sweep, Legacy data migration (Italian-named schema to current), applyMilestoneTypeMigration(), legacyToNewProjectPath(), migrateIfNeeded(), migrateV1ToV4(), migrateV2ToV4(), migrateV3ToV4() (+11 more)

### Community 11 - "resource-load-view.js"
Cohesion: 0.20
Nodes (9): findAllocations(), getCellDiv(), registerCell(), renderWeekCell(), fixedCell(), headerCell(), loadClass(), renderResourceLoadView() (+1 more)

### Community 12 - "toolbar.js"
Cohesion: 0.22
Nodes (8): setAutoBackupOnExit(), setNotifyOnRemoteChanges(), setState(), buildActions(), changeDataFolder(), createProject(), renderHamburgerMenu(), runBackup()

### Community 13 - "save-coordinator.js"
Cohesion: 0.26
Nodes (11): Reread-before-write save conflict detection (spec §6.4), diffWeeks(), flattenTasks(), summarize(), summarizeManifest(), summarizeProject(), summarizeTeamResources(), saveManifest() (+3 more)

### Community 14 - "milestones-view.js"
Cohesion: 0.24
Nodes (10): computeBaselineMilestones(), computeSeries(), computeUpcomingMilestonesByMonth(), countUpcomingBaselines(), buildMilestoneTooltip(), fixedCell(), headerCell(), renderHistogram() (+2 more)

### Community 15 - "week-utils.js"
Cohesion: 0.32
Nodes (11): addDays(), addWeeks(), formatWeekLabel(), getCurrentWeekIso(), getTodayIso(), getWeeksInRange(), isMonday(), isMonthBoundary() (+3 more)

### Community 16 - "cell-popover.js"
Cohesion: 0.42
Nodes (9): Week-level completed semantics (per-cell, orthogonal to milestone), closeExisting(), commitAndClose(), detachGlobalListeners(), handleKeydown(), handleOutsideClick(), openPopover(), positionPopover() (+1 more)

### Community 17 - "project-crud.js"
Cohesion: 0.39
Nodes (8): createProject(), deleteProject(), editReferents(), existingSlugs(), moveProject(), persist(), renameProject(), toggleCompleted()

### Community 18 - "Weavo"
Cohesion: 0.11
Nodes (18): 1. Installation, 2. Requirements, 3. Set up the data folder (one-time setup), 4. Open the app and connect it to the data folder, 5. Daily use, 6. Backups, 7. FAQ / things to know, Data model (+10 more)

### Community 19 - "week-controls.js"
Cohesion: 0.48
Nodes (6): buildRemovalReport(), handleAddWeek(), handleRemoveWeek(), persistManifest(), renderAddWeekButton(), renderRemoveWeekButton()

### Community 20 - "manifest.json"
Cohesion: 0.33
Nodes (5): projects, schemaVersion, weeks, first, last

### Community 22 - "legend.js"
Cohesion: 0.80
Nodes (4): badgeItem(), renderLegend(), staticItem(), swatch()

### Community 23 - "team-resources-view.js"
Cohesion: 0.70
Nodes (4): renderResourceRow(), renderTeamCard(), renderTeamResourcesView(), swatch()

### Community 42 - "load-mp.js"
Cohesion: 0.29
Nodes (4): { loadMP }, loadMP(), path, { loadMP }

### Community 43 - "package.json"
Cohesion: 0.25
Nodes (7): jest, devDependencies, jest, name, private, scripts, test

### Community 45 - "task-crud.js"
Cohesion: 0.38
Nodes (9): applyAdoptedSharedDates(), createTask(), deleteTask(), findBaselineSharedMilestoneDates(), moveTaskToPosition(), persistProject(), renameTask(), setTaskNote() (+1 more)

### Community 46 - "milestone-rules.js"
Cohesion: 0.61
Nodes (7): applyTentativeChange(), checkBaselineChange(), checkChange(), checkOrdering(), checkTaskChange(), checkTaskOrderingAfterShift(), collectTaskMilestoneDates()

### Community 47 - "2026-08-05"
Cohesion: 0.20
Nodes (9): 2026-08-05, Added, Added — 3-type milestone model, Changed, Changed, Changelog, Docs, Other (+1 more)

### Community 48 - "week-drag.js"
Cohesion: 0.48
Nodes (5): clearTargetClasses(), handleDragEnd(), handleDragOver(), handleDrop(), reset()

### Community 51 - "AGENTS.md"
Cohesion: 0.25
Nodes (6): Commands, Common-change pointers, Conventions, Hard constraints (verified, non-negotiable), Local-only paths — never commit, never `git add -f`, Releases

### Community 52 - "team-crud.js"
Cohesion: 0.43
Nodes (7): 1-team-to-N-resources relationship model, createTeam(), deleteTeam(), existingCodici(), persist(), recolorTeam(), renameTeam()

## Knowledge Gaps
- **86 isolated node(s):** `{ loadMP }`, `1. Installation`, `2. Requirements`, `3. Set up the data folder (one-time setup)`, `4. Open the app and connect it to the data folder` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md — Master Plan project guidance` connect `CLAUDE.md — Master Plan project guidance` to `modal.js`, `app.js`, `gantt-view.js`, `baseline-crud.js`, `validation.js`, `schema.js`, `fs-access.js`, `task-drag.js`, `legacy-migration.js`, `resource-load-view.js`, `toolbar.js`, `save-coordinator.js`, `milestones-view.js`, `week-utils.js`, `cell-popover.js`, `project-crud.js`, `week-controls.js`, `legend.js`, `team-resources-view.js`, `task-crud.js`, `team-crud.js`?**
  _High betweenness centrality (0.607) - this node is a cross-community bridge._
- **What connects `{ loadMP }`, `1. Installation`, `2. Requirements` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `docs/glossary.md` be split into smaller, more focused modules?**
  _Cohesion score 0.06938775510204082 - nodes in this community are weakly interconnected._
- **Should `CLAUDE.md — Master Plan project guidance` be split into smaller, more focused modules?**
  _Cohesion score 0.05230496453900709 - nodes in this community are weakly interconnected._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Should `schema.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12105263157894737 - nodes in this community are weakly interconnected._
- **Should `Weavo` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._