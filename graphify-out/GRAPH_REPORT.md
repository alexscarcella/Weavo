# Graph Report - Weavo - Master Plan  (2026-07-27)

## Corpus Check
- 63 files · ~55,532 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 374 nodes · 571 edges · 52 communities (41 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `61d3a171`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- docs/glossary.md
- modal.js
- fs-access.js
- legacy-migration.js
- schema.js
- gantt-view.js
- MP.cellPopover
- week-utils.js
- milestones-view.js
- app.js
- repository.js
- validation.js
- project-crud.js
- cell-popover.js
- toolbar.js
- baseline-crud.js
- resource-crud.js
- baseline-drag.js
- task-drag.js
- conflict-diff.js
- task-crud.js
- team-crud.js
- cell-selection.js
- store.js
- resource-load-view.js
- week-controls.js
- manifest.json
- save-coordinator.js
- context-menu.js
- legend.js
- team-resources-view.js
- milestones.js
- gantt-cell.js
- gantt-row.js
- MP.milestones
- MP.ganttCell
- MP.ganttRow
- MP.legend
- MP.resourceCrud
- MP.resourceLoadView
- MP.slug
- MP.teamCrud
- MP.teamResourcesView
- MP.toast
- MP.weekControls

## God Nodes (most connected - your core abstractions)
1. `escapeHtml()` - 10 edges
2. `renderAllocationsCard()` - 9 edges
3. `buildAllocationsHtml()` - 7 edges
4. `renderMilestoneListCard()` - 7 edges
5. `persistProject()` - 7 edges
6. `render()` - 6 edges
7. `getFileHandle()` - 6 edges
8. `migrateV1ToV3()` - 6 edges
9. `forEachWeekEntry()` - 6 edges
10. `formatMonthLabel()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Single-scrollbar page layout` --semantically_similar_to--> `Full-DOM-rebuild render flow`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/architecture.md
- `No IndexedDB under file://` --conceptually_related_to--> `spike-fsa/index.html (FSA permission spike)`  [INFERRED]
  CLAUDE.md → spike-fsa/index.html
- `spike-fsa/index.html (FSA permission spike)` --conceptually_related_to--> `No persisted directory-handle connection`  [INFERRED]
  spike-fsa/index.html → docs/deployment.md
- `MP.appHeader` --shares_data_with--> `APP_VERSION constant (js/ui/common/app-header.js)`  [INFERRED]
  docs/api.md → .github/workflows/release.yml
- `Versioned release packaging (tag-triggered zip release)` --shares_data_with--> `index.html (entry point)`  [EXTRACTED]
  .github/workflows/release.yml → index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **file:// hard constraints (no build/ES modules/IndexedDB, Chrome/Edge only)** — claude_nobuildstep, claude_noesmodules, claude_noindexeddb, claude_chromeedgeonly [INFERRED 0.90]
- **docs/ documentation suite** — readme_document, docs_architecture_document, docs_api_document, docs_database_document, docs_deployment_document, docs_security_document, docs_glossary_document [EXTRACTED 1.00]
- **Conflict detection and remote-change notification mechanism** — docs_database_conflictdetection, docs_database_mp_conflictdiff, docs_database_mp_remotecheck, docs_api_mp_savecoordinator [EXTRACTED 1.00]

## Communities (52 total, 11 thin omitted)

### Community 0 - "docs/glossary.md"
Cohesion: 0.07
Nodes (49): Chrome/Edge-only target browsers, graphify knowledge-graph tooling, No build step / no bundler / no TypeScript, No ES modules (classic-script IIFE pattern), No IndexedDB under file://, Single-scrollbar page layout, English-only UI language sweep, MP.appHeader (+41 more)

### Community 1 - "modal.js"
Cohesion: 0.17
Nodes (23): buildAllocationsHtml(), buildAllocationsText(), buildMilestoneClipboardText(), confirmConflict(), confirmWithReport(), copyAllocationsToClipboard(), copyMilestoneListToClipboard(), escapeHtml() (+15 more)

### Community 2 - "fs-access.js"
Cohesion: 0.19
Nodes (9): ensurePermission(), fileExists(), getFileHandle(), queryPermissionSilently(), readTextFile(), removeFile(), resolveDirHandle(), splitPath() (+1 more)

### Community 3 - "legacy-migration.js"
Cohesion: 0.29
Nodes (13): legacyToNewProjectPath(), migrateIfNeeded(), migrateV1ToV3(), migrateV2ToV3(), renameArchivedToCompletedBaseline(), renameArchivedToCompletedProject(), transformBaseline(), transformManifest() (+5 more)

### Community 4 - "schema.js"
Cohesion: 0.16
Nodes (4): createProjectReferents(), existingInitials(), flattenResources(), normalizeProjectReferents()

### Community 5 - "gantt-view.js"
Cohesion: 0.31
Nodes (13): buildRows(), clearBaselineMilestone(), clearOtherMilestones(), handleBulkCellsSaved(), handleCellSaved(), handleCellsShift(), headerCell(), markLastEdited() (+5 more)

### Community 6 - "MP.cellPopover"
Cohesion: 0.19
Nodes (13): Shift feature kept out of cell-popover save path, MP.baselineCrud, MP.cellPopover, MP.cellSelection, MP.ganttView, MP.modal, MP.projectCrud, MP.saveCoordinator (+5 more)

### Community 7 - "week-utils.js"
Cohesion: 0.36
Nodes (9): addDays(), addWeeks(), formatWeekLabel(), getCurrentWeekIso(), getTodayIso(), getWeeksInRange(), isMonday(), toDate() (+1 more)

### Community 8 - "milestones-view.js"
Cohesion: 0.70
Nodes (4): fixedCell(), headerCell(), renderHistogram(), renderMilestonesView()

### Community 9 - "app.js"
Cohesion: 0.36
Nodes (8): connectToDirectory(), escapeHtml(), render(), renderError(), renderMessage(), renderNotConnected(), renderReady(), renderUnsupported()

### Community 10 - "repository.js"
Cohesion: 0.28
Nodes (3): backupTimestamp(), createBackup(), pad2()

### Community 11 - "validation.js"
Cohesion: 0.39
Nodes (7): findOrphanResources(), findOrphanTeam(), findResourceAllocations(), findTeamMismatches(), forEachWeekEntry(), groupResourceTaskAllocations(), groupTeamTaskAllocations()

### Community 12 - "project-crud.js"
Cohesion: 0.39
Nodes (8): createProject(), deleteProject(), editReferents(), existingSlugs(), moveProject(), persist(), renameProject(), toggleCompleted()

### Community 13 - "cell-popover.js"
Cohesion: 0.50
Nodes (7): closeExisting(), commitAndClose(), detachGlobalListeners(), handleKeydown(), handleOutsideClick(), openPopover(), positionPopover()

### Community 14 - "toolbar.js"
Cohesion: 0.39
Nodes (5): buildActions(), changeDataFolder(), createProject(), renderHamburgerMenu(), runBackup()

### Community 15 - "baseline-crud.js"
Cohesion: 0.46
Nodes (7): createBaseline(), deleteBaseline(), moveBaselineToPosition(), persistProject(), renameBaseline(), shiftBaseline(), toggleCompleted()

### Community 16 - "resource-crud.js"
Cohesion: 0.39
Nodes (6): buildDeletionReport(), createResource(), deleteResource(), persist(), promptTeamCode(), renameResource()

### Community 17 - "baseline-drag.js"
Cohesion: 0.43
Nodes (6): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset()

### Community 18 - "task-drag.js"
Cohesion: 0.43
Nodes (6): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset()

### Community 19 - "conflict-diff.js"
Cohesion: 0.52
Nodes (6): diffWeeks(), flattenTasks(), summarize(), summarizeManifest(), summarizeProject(), summarizeTeamResources()

### Community 20 - "task-crud.js"
Cohesion: 0.52
Nodes (6): createTask(), deleteTask(), moveTaskToPosition(), persistProject(), renameTask(), toggleCompleted()

### Community 21 - "team-crud.js"
Cohesion: 0.52
Nodes (6): createTeam(), deleteTeam(), existingCodici(), persist(), recolorTeam(), renameTeam()

### Community 22 - "cell-selection.js"
Cohesion: 0.57
Nodes (6): clearHighlight(), getRangeForAction(), handleCellClick(), relocate(), reset(), setAnchor()

### Community 23 - "store.js"
Cohesion: 0.47
Nodes (3): setAutoBackupOnExit(), setNotifyOnRemoteChanges(), setState()

### Community 24 - "resource-load-view.js"
Cohesion: 0.60
Nodes (5): fixedCell(), headerCell(), loadClass(), renderResourceLoadView(), teamHeaderRow()

### Community 25 - "week-controls.js"
Cohesion: 0.53
Nodes (5): handleAddWeek(), handleRemoveWeek(), persistManifest(), renderAddWeekButton(), renderRemoveWeekButton()

### Community 26 - "manifest.json"
Cohesion: 0.33
Nodes (5): projects, schemaVersion, weeks, first, last

### Community 27 - "save-coordinator.js"
Cohesion: 0.70
Nodes (4): saveManifest(), saveProject(), saveTeamResources(), withConflictCheck()

### Community 29 - "context-menu.js"
Cohesion: 0.80
Nodes (4): closeExisting(), createMenuButton(), onOutsideClick(), openMenu()

### Community 30 - "legend.js"
Cohesion: 0.80
Nodes (4): badgeItem(), renderLegend(), staticItem(), swatch()

### Community 31 - "team-resources-view.js"
Cohesion: 0.70
Nodes (4): renderResourceRow(), renderTeamCard(), renderTeamResourcesView(), swatch()

### Community 32 - "milestones.js"
Cohesion: 0.83
Nodes (3): computeBaselineMilestones(), computeUpcomingMilestonesByMonth(), countUpcomingBaselines()

### Community 35 - "gantt-row.js"
Cohesion: 0.83
Nodes (3): fixedCell(), formatTeamTooltip(), renderTaskRow()

### Community 36 - "MP.milestones"
Cohesion: 0.67
Nodes (3): MP.datasetHeader, MP.milestones, MP.weekUtils

## Knowledge Gaps
- **27 isolated node(s):** `schemaVersion`, `first`, `last`, `projects`, `FSA directory-permission persistence test protocol` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Known limitation: unescaped user-supplied strings` connect `MP.cellPopover` to `docs/glossary.md`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Shift feature kept out of cell-popover save path` connect `MP.cellPopover` to `docs/glossary.md`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `schemaVersion`, `first`, `last` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `docs/glossary.md` be split into smaller, more focused modules?**
  _Cohesion score 0.06829573934837092 - nodes in this community are weakly interconnected._