# Graph Report - .  (2026-07-22)

## Corpus Check
- 23 files · ~55,469 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 374 nodes · 570 edges · 52 communities (41 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.69)
- Token cost: 170,466 input · 0 output

## Community Hubs (Navigation)
- App Constraints & Docs
- Modal Dialogs & Reports
- File System Access Wrapper
- Legacy Schema Migration
- Data Schema Factories
- Gantt View Save Logic
- Gantt Editing Module Contract
- ISO Week Arithmetic
- Milestones Page View
- App Entry Point
- Repository Load & Save
- Data Consistency Validation
- Project CRUD
- Cell Allocation Popover
- Hamburger Toolbar Menu
- Baseline CRUD
- Resource CRUD
- Baseline Drag & Drop
- Task Drag & Drop
- Save Conflict Diff
- Task CRUD
- Team CRUD
- Cell Range Selection
- App State Store
- Workload View
- Week Range Controls
- Manifest Schema
- Save Coordinator
- Context Menu Widget
- Gantt Color Legend
- Team/Resources CRUD View
- Baseline Milestone Derivation
- Gantt Cell Rendering
- Gantt Row Rendering
- Shared Header Namespaces
- Gantt Cell Namespace
- Gantt Row Namespace
- Legend Namespace
- Resource CRUD Namespace
- Workload View Namespace
- Slug Namespace
- Team CRUD Namespace
- Team/Resources View Namespace
- Toast Namespace
- Week Controls Namespace

## God Nodes (most connected - your core abstractions)
1. `escapeHtml()` - 9 edges
2. `renderAllocationsCard()` - 9 edges
3. `buildAllocationsHtml()` - 7 edges
4. `persistProject()` - 7 edges
5. `render()` - 6 edges
6. `getFileHandle()` - 6 edges
7. `migrateV1ToV3()` - 6 edges
8. `persist()` - 6 edges
9. `persistProject()` - 6 edges
10. `forEachWeekEntry()` - 6 edges

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

### Community 0 - "App Constraints & Docs"
Cohesion: 0.07
Nodes (49): Chrome/Edge-only target browsers, graphify knowledge-graph tooling, No build step / no bundler / no TypeScript, No ES modules (classic-script IIFE pattern), No IndexedDB under file://, Single-scrollbar page layout, English-only UI language sweep, MP.appHeader (+41 more)

### Community 1 - "Modal Dialogs & Reports"
Cohesion: 0.21
Nodes (17): buildAllocationsHtml(), buildAllocationsText(), confirmConflict(), confirmWithReport(), copyAllocationsToClipboard(), escapeHtml(), formatMonthLabel(), formatRowBodyHtml() (+9 more)

### Community 2 - "File System Access Wrapper"
Cohesion: 0.19
Nodes (9): ensurePermission(), fileExists(), getFileHandle(), queryPermissionSilently(), readTextFile(), removeFile(), resolveDirHandle(), splitPath() (+1 more)

### Community 3 - "Legacy Schema Migration"
Cohesion: 0.29
Nodes (13): legacyToNewProjectPath(), migrateIfNeeded(), migrateV1ToV3(), migrateV2ToV3(), renameArchivedToCompletedBaseline(), renameArchivedToCompletedProject(), transformBaseline(), transformManifest() (+5 more)

### Community 4 - "Data Schema Factories"
Cohesion: 0.16
Nodes (4): createProjectReferents(), existingInitials(), flattenResources(), normalizeProjectReferents()

### Community 5 - "Gantt View Save Logic"
Cohesion: 0.31
Nodes (13): buildRows(), clearBaselineMilestone(), clearOtherMilestones(), handleBulkCellsSaved(), handleCellSaved(), handleCellsShift(), headerCell(), markLastEdited() (+5 more)

### Community 6 - "Gantt Editing Module Contract"
Cohesion: 0.19
Nodes (13): Shift feature kept out of cell-popover save path, MP.baselineCrud, MP.cellPopover, MP.cellSelection, MP.ganttView, MP.modal, MP.projectCrud, MP.saveCoordinator (+5 more)

### Community 7 - "ISO Week Arithmetic"
Cohesion: 0.36
Nodes (9): addDays(), addWeeks(), formatWeekLabel(), getCurrentWeekIso(), getTodayIso(), getWeeksInRange(), isMonday(), toDate() (+1 more)

### Community 8 - "Milestones Page View"
Cohesion: 0.38
Nodes (10): buildClipboardText(), copyMilestoneListToClipboard(), fixedCell(), formatMilestoneLine(), formatMonthLabel(), formatReadableDate(), headerCell(), renderHistogram() (+2 more)

### Community 9 - "App Entry Point"
Cohesion: 0.36
Nodes (8): connectToDirectory(), escapeHtml(), render(), renderError(), renderMessage(), renderNotConnected(), renderReady(), renderUnsupported()

### Community 10 - "Repository Load & Save"
Cohesion: 0.28
Nodes (3): backupTimestamp(), createBackup(), pad2()

### Community 11 - "Data Consistency Validation"
Cohesion: 0.39
Nodes (7): findOrphanResources(), findOrphanTeam(), findResourceAllocations(), findTeamMismatches(), forEachWeekEntry(), groupResourceTaskAllocations(), groupTeamTaskAllocations()

### Community 12 - "Project CRUD"
Cohesion: 0.39
Nodes (8): createProject(), deleteProject(), editReferents(), existingSlugs(), moveProject(), persist(), renameProject(), toggleCompleted()

### Community 13 - "Cell Allocation Popover"
Cohesion: 0.50
Nodes (7): closeExisting(), commitAndClose(), detachGlobalListeners(), handleKeydown(), handleOutsideClick(), openPopover(), positionPopover()

### Community 14 - "Hamburger Toolbar Menu"
Cohesion: 0.39
Nodes (5): buildActions(), changeDataFolder(), createProject(), renderHamburgerMenu(), runBackup()

### Community 15 - "Baseline CRUD"
Cohesion: 0.46
Nodes (7): createBaseline(), deleteBaseline(), moveBaselineToPosition(), persistProject(), renameBaseline(), shiftBaseline(), toggleCompleted()

### Community 16 - "Resource CRUD"
Cohesion: 0.39
Nodes (6): buildDeletionReport(), createResource(), deleteResource(), persist(), promptTeamCode(), renameResource()

### Community 17 - "Baseline Drag & Drop"
Cohesion: 0.43
Nodes (6): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset()

### Community 18 - "Task Drag & Drop"
Cohesion: 0.43
Nodes (6): clearIndicator(), handleDragEnd(), handleDragLeave(), handleDragOver(), handleDrop(), reset()

### Community 19 - "Save Conflict Diff"
Cohesion: 0.52
Nodes (6): diffWeeks(), flattenTasks(), summarize(), summarizeManifest(), summarizeProject(), summarizeTeamResources()

### Community 20 - "Task CRUD"
Cohesion: 0.52
Nodes (6): createTask(), deleteTask(), moveTaskToPosition(), persistProject(), renameTask(), toggleCompleted()

### Community 21 - "Team CRUD"
Cohesion: 0.52
Nodes (6): createTeam(), deleteTeam(), existingCodici(), persist(), recolorTeam(), renameTeam()

### Community 22 - "Cell Range Selection"
Cohesion: 0.57
Nodes (6): clearHighlight(), getRangeForAction(), handleCellClick(), relocate(), reset(), setAnchor()

### Community 23 - "App State Store"
Cohesion: 0.47
Nodes (3): setAutoBackupOnExit(), setNotifyOnRemoteChanges(), setState()

### Community 24 - "Workload View"
Cohesion: 0.60
Nodes (5): fixedCell(), headerCell(), loadClass(), renderResourceLoadView(), teamHeaderRow()

### Community 25 - "Week Range Controls"
Cohesion: 0.53
Nodes (5): handleAddWeek(), handleRemoveWeek(), persistManifest(), renderAddWeekButton(), renderRemoveWeekButton()

### Community 26 - "Manifest Schema"
Cohesion: 0.33
Nodes (5): projects, schemaVersion, weeks, first, last

### Community 27 - "Save Coordinator"
Cohesion: 0.70
Nodes (4): saveManifest(), saveProject(), saveTeamResources(), withConflictCheck()

### Community 29 - "Context Menu Widget"
Cohesion: 0.80
Nodes (4): closeExisting(), createMenuButton(), onOutsideClick(), openMenu()

### Community 30 - "Gantt Color Legend"
Cohesion: 0.80
Nodes (4): badgeItem(), renderLegend(), staticItem(), swatch()

### Community 31 - "Team/Resources CRUD View"
Cohesion: 0.70
Nodes (4): renderResourceRow(), renderTeamCard(), renderTeamResourcesView(), swatch()

### Community 32 - "Baseline Milestone Derivation"
Cohesion: 0.83
Nodes (3): computeBaselineMilestones(), computeUpcomingMilestonesByMonth(), countUpcomingBaselines()

### Community 35 - "Gantt Row Rendering"
Cohesion: 0.83
Nodes (3): fixedCell(), formatTeamTooltip(), renderTaskRow()

### Community 36 - "Shared Header Namespaces"
Cohesion: 0.67
Nodes (3): MP.datasetHeader, MP.milestones, MP.weekUtils

## Knowledge Gaps
- **27 isolated node(s):** `schemaVersion`, `first`, `last`, `projects`, `FSA directory-permission persistence test protocol` (+22 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Known limitation: unescaped user-supplied strings` connect `Gantt Editing Module Contract` to `App Constraints & Docs`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `Shift feature kept out of cell-popover save path` connect `Gantt Editing Module Contract` to `App Constraints & Docs`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `render()` (e.g. with `renderError()` and `renderNotConnected()`) actually correct?**
  _`render()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `schemaVersion`, `first`, `last` to the rest of the system?**
  _27 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Constraints & Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.06829573934837092 - nodes in this community are weakly interconnected._