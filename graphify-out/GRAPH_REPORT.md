# Graph Report - .  (2026-07-22)

## Corpus Check
- 67 files · ~53,869 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 291 nodes · 440 edges · 39 communities (38 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Allocation Popover Formatting
- File System Access Layer
- Legacy Schema Migration
- Dataset Schema Factories
- Gantt View Orchestration
- ISO Week Utilities
- Milestones Report View
- App Bootstrap & Render
- Repository Save/Load
- Orphan & Mismatch Validation
- Project CRUD
- Cell Allocation Popover
- Toolbar Hamburger Menu
- Baseline CRUD
- Resource CRUD
- Baseline Drag & Drop
- Task Drag & Drop
- Save Conflict Diffing
- Task CRUD
- Team CRUD
- Cell Range Selection
- App State Store
- Workload Heat View
- Week Edge Controls
- Sample Manifest Data
- Save Coordinator
- Context Menu Widget
- Gantt Legend
- Team & Resources Page
- Baseline Milestone Derivation
- Gantt Week Cell
- Gantt Task Row

## God Nodes (most connected - your core abstractions)
1. `escapeHtml()` - 9 edges
2. `renderAllocationsCard()` - 9 edges
3. `buildAllocationsHtml()` - 7 edges
4. `persistProject()` - 7 edges
5. `render()` - 6 edges
6. `getFileHandle()` - 6 edges
7. `migrateV1ToV3()` - 6 edges
8. `forEachWeekEntry()` - 6 edges
9. `persist()` - 6 edges
10. `persistProject()` - 6 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (39 total, 1 thin omitted)

### Community 0 - "Allocation Popover Formatting"
Cohesion: 0.21
Nodes (17): buildAllocationsHtml(), buildAllocationsText(), confirmConflict(), confirmWithReport(), copyAllocationsToClipboard(), escapeHtml(), formatMonthLabel(), formatRowBodyHtml() (+9 more)

### Community 1 - "File System Access Layer"
Cohesion: 0.19
Nodes (9): ensurePermission(), fileExists(), getFileHandle(), queryPermissionSilently(), readTextFile(), removeFile(), resolveDirHandle(), splitPath() (+1 more)

### Community 2 - "Legacy Schema Migration"
Cohesion: 0.29
Nodes (13): legacyToNewProjectPath(), migrateIfNeeded(), migrateV1ToV3(), migrateV2ToV3(), renameArchivedToCompletedBaseline(), renameArchivedToCompletedProject(), transformBaseline(), transformManifest() (+5 more)

### Community 3 - "Dataset Schema Factories"
Cohesion: 0.16
Nodes (4): createProjectReferents(), existingInitials(), flattenResources(), normalizeProjectReferents()

### Community 4 - "Gantt View Orchestration"
Cohesion: 0.31
Nodes (13): buildRows(), clearBaselineMilestone(), clearOtherMilestones(), handleBulkCellsSaved(), handleCellSaved(), handleCellsShift(), headerCell(), markLastEdited() (+5 more)

### Community 5 - "ISO Week Utilities"
Cohesion: 0.36
Nodes (9): addDays(), addWeeks(), formatWeekLabel(), getCurrentWeekIso(), getTodayIso(), getWeeksInRange(), isMonday(), toDate() (+1 more)

### Community 6 - "Milestones Report View"
Cohesion: 0.38
Nodes (10): buildClipboardText(), copyMilestoneListToClipboard(), fixedCell(), formatMilestoneLine(), formatMonthLabel(), formatReadableDate(), headerCell(), renderHistogram() (+2 more)

### Community 7 - "App Bootstrap & Render"
Cohesion: 0.36
Nodes (8): connectToDirectory(), escapeHtml(), render(), renderError(), renderMessage(), renderNotConnected(), renderReady(), renderUnsupported()

### Community 8 - "Repository Save/Load"
Cohesion: 0.28
Nodes (3): backupTimestamp(), createBackup(), pad2()

### Community 9 - "Orphan & Mismatch Validation"
Cohesion: 0.39
Nodes (7): findOrphanResources(), findOrphanTeam(), findResourceAllocations(), findTeamMismatches(), forEachWeekEntry(), groupResourceTaskAllocations(), groupTeamTaskAllocations()

### Community 10 - "Project CRUD"
Cohesion: 0.39
Nodes (8): createProject(), deleteProject(), editReferents(), existingSlugs(), moveProject(), persist(), renameProject(), toggleCompleted()

### Community 11 - "Cell Allocation Popover"
Cohesion: 0.50
Nodes (7): closeExisting(), commitAndClose(), detachGlobalListeners(), handleKeydown(), handleOutsideClick(), openPopover(), positionPopover()

### Community 12 - "Toolbar Hamburger Menu"
Cohesion: 0.39
Nodes (5): buildActions(), changeDataFolder(), createProject(), renderHamburgerMenu(), runBackup()

### Community 13 - "Baseline CRUD"
Cohesion: 0.46
Nodes (7): createBaseline(), deleteBaseline(), moveBaselineToPosition(), persistProject(), renameBaseline(), shiftBaseline(), toggleCompleted()

### Community 14 - "Resource CRUD"
Cohesion: 0.39
Nodes (6): buildDeletionReport(), createResource(), deleteResource(), persist(), promptTeamCode(), renameResource()

### Community 15 - "Baseline Drag & Drop"
Cohesion: 0.43
Nodes (6): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset()

### Community 16 - "Task Drag & Drop"
Cohesion: 0.43
Nodes (6): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset()

### Community 17 - "Save Conflict Diffing"
Cohesion: 0.52
Nodes (6): diffWeeks(), flattenTasks(), summarize(), summarizeManifest(), summarizeProject(), summarizeTeamResources()

### Community 18 - "Task CRUD"
Cohesion: 0.52
Nodes (6): createTask(), deleteTask(), moveTaskToPosition(), persistProject(), renameTask(), toggleCompleted()

### Community 19 - "Team CRUD"
Cohesion: 0.52
Nodes (6): createTeam(), deleteTeam(), existingCodici(), persist(), recolorTeam(), renameTeam()

### Community 20 - "Cell Range Selection"
Cohesion: 0.57
Nodes (6): clearHighlight(), getRangeForAction(), handleCellClick(), relocate(), reset(), setAnchor()

### Community 21 - "App State Store"
Cohesion: 0.47
Nodes (3): setAutoBackupOnExit(), setNotifyOnRemoteChanges(), setState()

### Community 22 - "Workload Heat View"
Cohesion: 0.60
Nodes (5): fixedCell(), headerCell(), loadClass(), renderResourceLoadView(), teamHeaderRow()

### Community 23 - "Week Edge Controls"
Cohesion: 0.53
Nodes (5): handleAddWeek(), handleRemoveWeek(), persistManifest(), renderAddWeekButton(), renderRemoveWeekButton()

### Community 24 - "Sample Manifest Data"
Cohesion: 0.33
Nodes (5): projects, schemaVersion, weeks, first, last

### Community 25 - "Save Coordinator"
Cohesion: 0.70
Nodes (4): saveManifest(), saveProject(), saveTeamResources(), withConflictCheck()

### Community 27 - "Context Menu Widget"
Cohesion: 0.80
Nodes (4): closeExisting(), createMenuButton(), onOutsideClick(), openMenu()

### Community 28 - "Gantt Legend"
Cohesion: 0.80
Nodes (4): badgeItem(), renderLegend(), staticItem(), swatch()

### Community 29 - "Team & Resources Page"
Cohesion: 0.70
Nodes (4): renderResourceRow(), renderTeamCard(), renderTeamResourcesView(), swatch()

### Community 30 - "Baseline Milestone Derivation"
Cohesion: 0.83
Nodes (3): computeBaselineMilestones(), computeUpcomingMilestonesByMonth(), countUpcomingBaselines()

### Community 33 - "Gantt Task Row"
Cohesion: 0.83
Nodes (3): fixedCell(), formatTeamTooltip(), renderTaskRow()

## Knowledge Gaps
- **4 isolated node(s):** `schemaVersion`, `first`, `last`, `projects`
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 4 inferred relationships involving `render()` (e.g. with `renderError()` and `renderNotConnected()`) actually correct?**
  _`render()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `schemaVersion`, `first`, `last` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._