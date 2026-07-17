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
  team-risorse.json       # teams and the resources that belong to each one
  progetti/
    <project-slug>.json   # one file per project
  backup/
    <YYYYMMDD>_<HHMMSS>/   # point-in-time snapshots, created on demand (see deployment.md)
```

## Schema

### `manifest.json`

```json
{
  "schemaVersion": 1,
  "settimane": { "prima": "2025-11-24", "ultima": "2027-01-11" },
  "progetti": [
    { "file": "progetti/example-project.json", "nome": "Example Project" }
  ]
}
```

`settimane.prima`/`ultima` bound the global week range shown across every view — every ISO date
used anywhere in the dataset must be a Monday within this range.

### `team-risorse.json`

```json
{
  "team": [
    {
      "codice": "dev",
      "nome": "Development",
      "colore": "#00B050",
      "risorse": [{ "sigla": "AB", "nome": "A. Bishop" }]
    }
  ]
}
```

A **team** is the only grouping entity. A **resource** always belongs to exactly one team — it's
nested inside it, never listed independently. Resource `sigla` values are unique across the
*entire* dataset, not just within a team. Nothing about team names or colors is hardcoded in the
app: everything (legend, edit popovers, filters) renders dynamically from this file.

### `progetti/<slug>.json`

```json
{
  "nome": "Example Project",
  "team": "",
  "archiviato": false,
  "baseline": [
    {
      "versione": "1.0",
      "task": [
        {
          "nome": "Integration Testing",
          "concluso": false,
          "settimane": {
            "2026-01-05": { "team": "dev", "risorse": ["AB"] },
            "2026-01-12": { "milestone": true }
          }
        }
      ]
    }
  ]
}
```

- A **project** has one or more **baselines** (releases/versions); a baseline has **tasks**.
- Allocation is **boolean**, per task per week — a resource is either on a task that week, or it
  isn't. There's no percentage/fractional-effort field anywhere in the schema.
- A week entry (`task.settimane[iso]`) is only meaningful with `team` + non-empty `risorse`
  together, or with `milestone: true` set — never a partial state like `{ "team": "dev",
  "risorse": [] }`. Entries are always built through `MP.schema.createWeekEntry(...)` to enforce
  this.
- `concluso: true` marks a task as finished: it's excluded from overallocation counting and from
  team-mismatch detection, but its data is never deleted or rewritten automatically.
- `archiviato: true` marks a whole project as archived — same principle, no destructive
  auto-correction.

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

## No migrations

`schemaVersion` exists in `manifest.json` for forward compatibility, but there is currently only
one version and no migration tooling. A schema change today means updating
`js/data/schema.js` and every reader of the changed shape in the same pass — there's no automatic
upgrade path for existing data files yet.

## Referential integrity is advisory, not enforced

`team` codes and resource `sigla` values referenced by a task but missing from
`team-risorse.json` are **orphan references**; a resource allocated under a `team` different from
the one it currently belongs to is a **team mismatch** (see
[glossary.md](glossary.md#orphan-reference) and [glossary.md](glossary.md#team-mismatch)). Both
are detected by `js/model/validation.js` and surfaced as non-blocking warnings — never silently
dropped or auto-corrected, and never treated as fatal errors.
