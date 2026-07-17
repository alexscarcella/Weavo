# Glossary

Terms as used throughout the code, the data files, and the other docs in this folder. Several of
these come straight from `js/data/schema.js`'s field names (kept in Italian in the JSON itself
for historical reasons — see the note at the top of that file) even though this documentation and
the UI-facing English data are in English.

### Allocation
The fact that a specific **resource** is assigned to a specific **task** in a specific **week**.
Always **boolean** — either allocated or not, never a percentage or fraction of a week.

### Archived project (`archiviato`)
A project-level flag (`archiviato: true`) marking a project as no longer active. Archiving never
deletes or rewrites its data — see [database.md](database.md#progettislugjson).

### Baseline
A **project**'s release/version line (e.g. `"1.0"`, `"2.0"`). A project has one or more baselines;
each baseline owns its own list of **tasks**. In the JSON, the field is `versione`.

### Completed task (`concluso`)
A task-level flag (`concluso: true`) marking a task as finished. Completed tasks are excluded from
**overallocation** counting and from **team mismatch** detection, but their week data is kept
as-is.

### Conflict detection
The reread-before-write check performed by `MP.saveCoordinator` before every save: it compares
the file currently on disk against the last version this session knows about, and asks for
confirmation before overwriting if they differ. See
[database.md](database.md#conflict-detection).

### Dataset
The whole in-memory picture of the data folder once loaded: `{ manifest, teamRisorsa, progetti,
warnings }` plus bookkeeping used for conflict detection. Held in `state.dataset` once the app
reaches the `ready` status.

### File System Access API
The browser API (`showDirectoryPicker`, `FileSystemDirectoryHandle`, etc.) Weavo uses to read and
write the data folder directly from the browser, with no server in between. Chromium-only (Chrome,
Edge). See [security.md](security.md#browser-requirement).

### Manifest
`manifest.json` — the top-level index: the list of projects (file path + name) and the global
week range (`settimane.prima`/`settimane.ultima`). See [database.md](database.md).

### Milestone
A flag (`milestone: true`) on a specific week entry within a task, meaning that week is a
deadline/checkpoint. Stored per task-per-week in the schema, but the gantt UI enforces it as a
baseline-wide concept: setting it on one task propagates it to every other non-`concluso` task of
the same baseline (same week), and only one milestone week exists per baseline at a time. See
[database.md](database.md).

### Orphan reference
A `team` code or resource `sigla` used in a task's week entry that no longer exists in
`team-risorse.json` — typically left behind after a team or resource was renamed or deleted.
Detected by `MP.validation.findOrphanTeam`/`findOrphanRisorse` and surfaced as a non-blocking
warning, never auto-corrected.

### Overallocation
The situation where the same resource (`sigla`) is allocated to more than one task in the same
week, across any project. Computed by `MP.overallocation.buildAllocationIndex` and highlighted in
the gantt and resource-load views; completed tasks don't count toward it.

### Project
The top-level planning unit (`progetti/<slug>.json`), containing one or more **baselines**. Has a
name, an optional free-text `team` field (historically a project-lead/contact string, unrelated
to the team/resource anagraphics below), and an `archiviato` flag.

### Resource
An individual (`{ sigla, nome }`) who belongs to exactly one **team**, nested inside it in
`team-risorse.json`. `sigla` is a short code, unique across the whole dataset, used to reference
the resource from task week entries.

### `sigla`
The short unique code identifying a **resource** (e.g. initials). Used as the key almost
everywhere a resource is referenced, instead of the full name.

### Task
A unit of work inside a **baseline**, with a name, a `concluso` flag, and a map of ISO week →
week entry (`settimane`).

### Team
The single grouping entity for resources (e.g. "Development", "QA"). Has a `codice` (stable
technical key), a display `nome`, a `colore`, and a nested list of **resources**. Nothing about
team names/colors is hardcoded in the app — see [database.md](database.md#team-risorsejson).

### Team mismatch
A week entry where the allocated resource's `team` no longer matches the team it currently
belongs to in `team-risorse.json` — typically left behind after moving a resource to a different
team. Detected by `MP.validation.findTeamMismatches` (non-completed tasks only) and surfaced as a
non-blocking warning; the user resolves it by hand.

### Week entry
The value at `task.settimane[iso]` for a given ISO Monday date: either an allocation
(`{ team, risorse }`), a milestone (`{ milestone: true }`), both together, or absent entirely.
Never a partial state like a `team` with no `risorse`. Always constructed through
`MP.schema.createWeekEntry(...)`.
