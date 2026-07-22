# Glossary

Terms as used throughout the code, the data files, and the other docs in this folder. The JSON
field names match the English terms below one-to-one (e.g. `completed`, `initials`) —
code comments stay in Italian (written by/for the maintainer), but the persisted data model and
every identifier that mirrors it are English.

### Allocation
The fact that a specific **resource** is assigned to a specific **task** in a specific **week**.
Always **boolean** — either allocated or not, never a percentage or fraction of a week.

### Baseline
A **project**'s release/version line (e.g. `"1.0"`, `"2.0"`). A project has one or more baselines;
each baseline owns its own list of **tasks**. In the JSON, the field is `version`. Can
independently be marked **completed** (`completed: true`, checkbox to the left of the version,
confirmed before marking — same "no destructive auto-correction" principle as
[completed task](#completed-task-completed)) — hidden from the gantt/milestones views unless the
"Show completed projects/baselines" toggle is on, but never deleted or rewritten.

### Completed task (`completed`)
A task-level flag (`completed: true`) marking a task as finished. Completed tasks are excluded
from **overallocation** counting and from **team mismatch** detection, but their week data is kept
as-is. Projects and baselines share the same `completed` field/concept (checkbox in the row) but,
unlike tasks, marking either one hides it by default and asks for confirmation first — see
[Baseline](#baseline) and [Project](#project). Completing a project/baseline is purely a
visibility change: it does **not** exclude its tasks from overallocation/team-mismatch checks
(only an individual task's own `completed` flag does that).

### Completed week (`completed` on a week entry)
A finer-grained, per-week `completed: true` set on a single **week entry**, independent of
task-level [Completed task](#completed-task-completed) — it marks that one week of an otherwise
active task is finished, without closing the whole task. Gets the same treatment as a completed
task but scoped to that week: excluded from **overallocation** and **team mismatch**, rendered
with the same grey cell background, and not eligible for the one-week shift action. `team`/
`resources` on that week are preserved, not cleared, and the flag is reversible. Set via a
checkbox in the cell's editing popover, for a single cell or a multi-week selection alike.

### Conflict detection
The reread-before-write check performed by `MP.saveCoordinator` before every save: it compares
the file currently on disk against the last version this session knows about, and — showing a
summary of what actually changed (`MP.conflictDiff`) — asks for confirmation before overwriting if
they differ. A separate, opt-in soft check (`MP.remoteCheck`, "Notify me of changes on disk" in the
☰ menu) gives the same kind of heads-up outside the save path, triggered when the tab regains
focus rather than by a timer. See [database.md](database.md#conflict-detection).

### Dataset
The whole in-memory picture of the data folder once loaded: `{ manifest, teamResources, projects,
warnings }` plus bookkeeping used for conflict detection. Held in `state.dataset` once the app
reaches the `ready` status.

### File System Access API
The browser API (`showDirectoryPicker`, `FileSystemDirectoryHandle`, etc.) Weavo uses to read and
write the data folder directly from the browser, with no server in between. Chromium-only (Chrome,
Edge). See [security.md](security.md#browser-requirement).

### Initials
The short unique code identifying a **resource** (e.g. `"AB"`). Used as the key almost everywhere
a resource is referenced, instead of the full name. The JSON field is `initials`.

### Legacy data migration
The one-time, automatic upgrade of a data folder still using the schema that predates this
document (Italian field names, `team-risorse.json`, `progetti/`), triggered on connect by
`MP.legacyMigration.migrateIfNeeded` based on `manifest.schemaVersion`. See
[database.md](database.md#legacy-data-migration).

### Manifest
`manifest.json` — the top-level index: the list of projects (file path + name) and the global
week range (`weeks.first`/`weeks.last`). See [database.md](database.md).

### Milestone
A flag (`milestone: true`) on a specific week entry within a task, meaning that week is a
deadline/checkpoint. Stored per task-per-week in the schema, but the gantt UI enforces it as a
baseline-wide concept: setting it on one task propagates it to every other non-`completed` task of
the same baseline (same week), and only one milestone week exists per baseline at a time. See
[database.md](database.md).

### Orphan reference
A `team` code or resource `initials` value used in a task's week entry, or in a project's
`referents.solutionAnalyst`/`referents.vvReference`, that no longer exists in
`team-resources.json` — typically left behind after a team or resource was renamed or deleted.
Detected by `MP.validation.findOrphanTeam`/`findOrphanResources`/`findOrphanProjectReferents` and
surfaced as a non-blocking warning, never auto-corrected.

### Overallocation
The situation where the same resource (`initials`) is allocated to more than one task in the same
week, across any project. Computed by `MP.overallocation.buildAllocationIndex` and highlighted in
the gantt and resource-load views; completed tasks — and individually
[completed weeks](#completed-week-completed-on-a-week-entry) within an otherwise-active task —
don't count toward it.

### Project
The top-level planning unit (`projects/<slug>.json`), containing one or more **baselines**. Has a
name, a `referents` object (project manager/engineer, solution analyst/V&V reference, free-text
notes — see `MP.schema.normalizeProjectReferents` for the legacy-plain-string self-heal), and an
`archived` flag.

### Resource
An individual (`{ initials, name }`) who belongs to exactly one **team**, nested inside it in
`team-resources.json`. `initials` is a short code, unique across the whole dataset, used to
reference the resource from task week entries.

### Task
A unit of work inside a **baseline**, with a name, a `completed` flag, and a map of ISO week →
week entry (`weeks`).

### Team
The single grouping entity for resources (e.g. "Development", "QA"). Has a `code` (stable
technical key), a display `name`, a `color`, and a nested list of **resources**. Nothing about
team names/colors is hardcoded in the app — see [database.md](database.md#team-resourcesjson).

### Team mismatch
A week entry where the allocated resource's `team` no longer matches the team it currently
belongs to in `team-resources.json` — typically left behind after moving a resource to a different
team. Detected by `MP.validation.findTeamMismatches` (non-completed tasks and non-completed weeks
only) and surfaced as a non-blocking warning; the user resolves it by hand.

### Week entry
The value at `task.weeks[iso]` for a given ISO Monday date: an allocation
(`{ team, resources }`), a milestone (`{ milestone: true }`), a per-week
[completed](#completed-week-completed-on-a-week-entry) flag (`{ completed: true }`), any
combination of the three together, or absent entirely. Never a partial state like a `team` with no
`resources`. Always constructed through `MP.schema.createWeekEntry(...)`.
