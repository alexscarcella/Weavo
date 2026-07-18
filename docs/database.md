# Database

## There is no database

Weavo stores everything as plain, indented JSON files on disk, read and written directly through
the browser's [File System Access
API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API). There's no SQL,
no IndexedDB, no embedded key-value store. This is a deliberate constraint, not a stopgap:
`indexedDB.open()` never fires `onsuccess`/`onerror` when the page is opened from a `file://`
origin in Chromium (verified empirically), which rules it out as a caching layer too. The
filesystem *is* the database.

## Layout

```
<data-folder>/
  manifest.json          # project index + global week range
  team-resources.json    # teams and the resources that belong to each one
  projects/
    <project-slug>.json   # one file per project
  backup/
    <YYYYMMDD>_<HHMMSS>/   # point-in-time snapshots, created on demand (see deployment.md)
```

## Schema

### `manifest.json`

```json
{
  "schemaVersion": 2,
  "weeks": { "first": "2025-11-24", "last": "2027-01-11" },
  "projects": [
    { "file": "projects/example-project.json", "name": "Example Project" }
  ]
}
```

`weeks.first`/`last` bound the global week range shown across every view — every ISO date
used anywhere in the dataset must be a Monday within this range.

### `team-resources.json`

```json
{
  "teams": [
    {
      "code": "dev",
      "name": "Development",
      "color": "#00B050",
      "resources": [{ "initials": "AB", "name": "A. Bishop" }]
    }
  ]
}
```

A **team** is the only grouping entity. A **resource** always belongs to exactly one team — it's
nested inside it, never listed independently. Resource `initials` values are unique across the
*entire* dataset, not just within a team. Nothing about team names or colors is hardcoded in the
app: everything (legend, edit popovers, filters) renders dynamically from this file.

### `projects/<slug>.json`

```json
{
  "name": "Example Project",
  "referents": {
    "projectManager": "",
    "projectEngineer": "",
    "solutionAnalyst": "",
    "vvReference": "",
    "note": ""
  },
  "archived": false,
  "baseline": [
    {
      "version": "1.0",
      "archived": false,
      "task": [
        {
          "name": "Integration Testing",
          "completed": false,
          "weeks": {
            "2026-01-05": { "team": "dev", "resources": ["AB"] },
            "2026-01-12": { "milestone": true }
          }
        }
      ]
    }
  ]
}
```

- A **project** has one or more **baselines** (releases/versions); a baseline has **tasks**.
- `project.referents` holds the project's referents/team info: `projectManager` and
  `projectEngineer` are free text; `solutionAnalyst`/`vvReference` hold a resource `initials`
  value (or `''` if unassigned) picked from any team in `team-resources.json`, resolved to a name
  on demand rather than denormalized; `note` is free multi-line text. Edited as a whole via a
  dedicated form (project row's "⋮" menu → "Project team…"); a read-only summary card
  (project row's "i" icon) shows the resolved values alongside the project's baseline/task counts
  and archived status. A resource `initials` value referenced here that no longer exists in
  `team-resources.json` is an **orphan reference**, flagged the same non-blocking way as the
  orphan team/resource references below.
- Allocation is **boolean**, per task per week — a resource is either on a task that week, or it
  isn't. There's no percentage/fractional-effort field anywhere in the schema.
- A week entry (`task.weeks[iso]`) is only meaningful with `team` + non-empty `resources`
  together, or with `milestone: true` set — never a partial state like `{ "team": "dev",
  "resources": [] }`. Entries are always built through `MP.schema.createWeekEntry(...)` to enforce
  this.
- A task admits only **one** milestone week, and all tasks of the same baseline share a single
  milestone deadline: setting `milestone: true` on one task's week propagates it (same week) to
  every other non-`completed` task of that baseline, clearing it from any other week on all of
  them (last one set wins, never two milestones in the same baseline); unsetting it removes it
  from the others too. Enforced in the gantt UI when saving a cell (`gantt-view.js`), not in the
  schema itself — the flag stays duplicated per `task.weeks[iso]` rather than living on
  `baseline` directly.
- `completed: true` marks a task as finished: it's excluded from overallocation counting and from
  team-mismatch detection, but its data is never deleted or rewritten automatically.
- `archived: true` marks a whole project as archived — same principle, no destructive
  auto-correction. A baseline can independently be archived too (`baseline.archived: true`,
  same "row ⋮ menu" affordance) — archiving a baseline never touches its tasks or their data,
  it only hides that baseline from the gantt/milestones views (and from the milestones-based
  "upcoming baselines" count) unless the shared "Show archived" toggle is on. A project's own
  `archived` flag still takes precedence: archiving the project hides all of its baselines
  regardless of their individual `archived` value.

## Conflict detection

There's no locking and no real-time sync between concurrent users — two people can have the same
folder open at once. Instead, every write goes through `MP.saveCoordinator`
(`js/data/save-coordinator.js`), which:

1. Rereads the target file from disk immediately before writing.
2. Compares it against the text this session last read or wrote for that file.
3. If they differ, prompts the user to confirm before overwriting (rather than silently
   discarding someone else's concurrent change).

This is a reread-before-write check, not a merge — the user resolves the conflict by choosing to
overwrite or to cancel and reconcile by hand.

## Legacy data migration

`schemaVersion` in `manifest.json` gates a one-time, automatic upgrade of pre-existing data. Every
version prior to this one used Italian JSON field names (`nome`, `sigla`, `settimane`, `codice`,
`versione`, `risorse`, `archiviato`, `concluso`, …), the file `team-risorse.json`, and the
directory `progetti/`. `js/data/legacy-migration.js` (`MP.legacyMigration.migrateIfNeeded`, called
as the first step of `repository.loadDataset`) checks `manifest.schemaVersion` on every folder
connect: if it's missing or below the current version, the folder is treated as legacy data and
converted in place — old-shaped files are read, transformed in memory to the current shape, and
written under the current names (`team-resources.json`, `projects/`); the old `team-risorse.json`
file and `progetti/` directory are then removed. `manifest.json` is written last, so it acts as
the commit point: an interrupted migration simply retries from scratch on the next connect, with
no partial state to reconcile. A folder already on the current `schemaVersion` is detected cheaply
(one small JSON parse) and the migration is skipped entirely. This mechanism intentionally has no
dedicated backup step or crash-recovery bookkeeping — see [glossary.md](glossary.md) and
`js/data/legacy-migration.js`'s own comments for the reasoning: the data is not treated as
irreplaceable (it can be regenerated from the Excel import script, or restored from the app's own
manual/automatic backup feature).

Beyond this one-time legacy upgrade, there is no other migration tooling: a future schema change
means updating `js/data/schema.js` and every reader of the changed shape in the same pass. The
`project.referents` legacy-string self-heal (`MP.schema.normalizeProjectReferents`, called from
`repository.loadDataset`) predates and is orthogonal to the shape migration above — it upgrades a
legacy free-text `referents` value in memory on load regardless of `schemaVersion`, rewriting the
file to the structured shape the next time that project is saved.

## Referential integrity is advisory, not enforced

`team` codes and resource `initials` values referenced by a task but missing from
`team-resources.json` are **orphan references**; a resource allocated under a `team` different
from the one it currently belongs to is a **team mismatch** (see
[glossary.md](glossary.md#orphan-reference) and [glossary.md](glossary.md#team-mismatch)). The
same orphan-reference treatment applies to a project's `referents.solutionAnalyst`/
`referents.vvReference` initials if the resource they point to no longer exists. All of these are
detected by `js/model/validation.js` and surfaced as non-blocking warnings — never silently
dropped or auto-corrected, and never treated as fatal errors.
