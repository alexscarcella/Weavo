# Weavo

A serverless, file-based weekly resource allocation planner, rendered as a compact gantt grid.

## What it is

Weavo replaces a spreadsheet-driven way of tracking who's allocated to what, week by week,
across a portfolio of projects. It models:

- **Projects**, each with one or more **baselines** (releases/versions).
- Each baseline made of **tasks**.
- Each task with a per-week allocation: a **team** and the **resources** from that team working
  on it that week, plus an optional milestone flag.

Allocation is intentionally **boolean** — a resource is either on a task in a given week, or
not. No percentages, no fractional effort.

Teams and their resources are plain data, not hardcoded: colors, names, and membership are all
edited from within the app and rendered dynamically everywhere (legend, popovers, filters).

## Why it's different

- **No backend, no build step, no bundler, no `npm install`** to run it. It's plain HTML/CSS/JS.
- Data lives in **human-readable, hand-editable JSON files** inside a folder you choose — not a
  database, not a server.
- The app talks to that folder directly through the browser's File System Access API: open
  `index.html`, pick a folder, and you're working with real files on disk.

## Requirements

- **Chrome or Edge** (desktop). The File System Access API isn't supported in Firefox or Safari,
  so they're out of scope for now.
- No persistence of the folder selection across browser sessions — you re-pick the data folder
  every time you open the app. That's a platform limitation (there's no reliable way to persist
  a directory handle from a `file://` origin), not a missing feature.

## Getting started

**Just want to run it?** Download the latest `weavo-vX.Y.zip` from the
[Releases page](https://github.com/alexscarcella/Weavo/releases), unzip it, and open
`index.html`. It already includes a `sample-data/` folder so you can try the app immediately.
(The repo is private, so this only works for accounts that already have access to it.)

Prefer working from source (e.g. to track `main` or contribute)?

1. Clone this repository.
2. Open `index.html` directly in Chrome or Edge — no server, no install step.
3. When prompted, pick a data folder. To try the app without setting up your own data, point it
   at the bundled [`sample-data/`](sample-data/) folder, which ships with a full example dataset.

## Guide for non-technical users (first install, setup, and daily use)

This section assumes no technical background: it explains how to install the app, set up the
data folder for the first time, and use it day to day. The app's interface is in English, so the
on-screen labels quoted below (menu items, buttons) are the exact text you'll see.

### How it works, in short

- It's not a program you install, and there's no server behind it: it's a single web page
  (`index.html`) that runs in your browser.
- There's no "database" sitting somewhere on a server: all the data — projects, baselines,
  tasks, weekly allocations, teams and resources — is stored as plain text files (JSON) inside a
  folder you choose, typically a folder shared via a cloud-sync service (OneDrive, Dropbox, Google
  Drive, …) or a company network path. **The folder is the database.**
- On opening, the app asks which folder to use. From then on, every change you make (assigning a
  resource to a task, creating a project, moving a resource between teams…) is written
  immediately to one of the files in that folder — there's no separate "Save" button, it saves
  itself on every edit.
- Several people can work on the same shared folder (via OneDrive, Dropbox, a network share, or
  any similar mechanism), but not in real time
  like an online document: if a colleague saves a change to the same file while you still have it
  open, the app notices and asks for confirmation before overwriting, so no one's change is ever
  silently lost.

### 1. Installation

1. Download the latest `weavo-vX.Y.zip` package from the
   [Releases page](https://github.com/alexscarcella/Weavo/releases) (you need an account with
   access to the repository, which is private).
2. Extract the zip into any folder on your PC (e.g. `Documents\Weavo`). This folder contains only
   the **application**, not your data.
3. No installer is needed and you don't need administrator rights: it's just a set of
   HTML/CSS/JavaScript files.
4. To upgrade to a newer version later, repeat the same steps with the new zip. Your data doesn't
   live inside this folder, so updating the application never touches your data.

### 2. Requirements

- **Google Chrome or Microsoft Edge**, up to date. The app does not work in Firefox or Safari.
- A **shared folder** that everyone who needs to collaborate can read and write to — typically a
  folder shared via a cloud-sync service (OneDrive, Dropbox, Google Drive, …), or a company
  network path. No server or database to install or configure.

### 3. Set up the data folder (one-time setup)

Pick one of two paths:

**A. Start from the sample data (recommended to get comfortable first)**
Copy the entire [`sample-data/`](sample-data/) folder, included in the downloaded zip, into the
shared location you want to use, and rename it as you like. It already contains sample projects,
teams and resources — handy for exploring the app before putting real data in it, and as a
starting point to clear out and adapt later.

**B. Start from an empty data folder**
Create an empty shared folder containing:

- a `manifest.json` file with this minimal content:

  ```json
  {
    "schemaVersion": 2,
    "weeks": { "first": "2026-01-05", "last": "2026-12-28" },
    "projects": []
  }
  ```

  (`first`/`last` are two Monday dates that bound the planning date range; you can extend it
  later from within the app itself, using the buttons at the edges of the grid, without ever
  touching this file by hand again)
- a `team-resources.json` file with this minimal content:

  ```json
  { "teams": [] }
  ```

- an empty subfolder called `projects`

From there on, teams, resources and projects are all created from within the app — no more
hand-written JSON needed. See [`docs/database.md`](docs/database.md) for the full file structure.

### 4. Open the app and connect it to the data folder

1. In the folder where you extracted the zip, double-click `index.html`: it opens in your default
   browser (which must be Chrome or Edge).
2. On the first screen, click **"Select data folder"** and pick the shared folder you set up in
   step 3.
3. The browser may ask you to confirm access to that folder: confirm it.
4. **Important:** this choice is *not* remembered by the browser between app openings — that's a
   limitation of the underlying technology (see "Requirements" above), not a flaw in the app.
   Every time you open `index.html` you'll need to re-select the folder; the app does show the
   name of the last folder used on that PC as a reminder (technical details in
   [`docs/deployment.md`](docs/deployment.md#no-persisted-connection)).
5. Practical tip: create a desktop shortcut to `index.html`, so opening the app only takes a
   double-click plus the folder selection.

### 5. Daily use

- The **☰** menu in the top-left corner is the entry point for every function: switching pages
  ("Master Plan" / "Resource load" / "Milestones" / "Team & resources"), creating a new project
  ("**+ New project**"), running a backup ("**💾 Backup**"), and closing the current data folder to
  pick another one ("**Change data folder…**").
- **Create a project:** ☰ menu → *"+ New project"* → fill in the name and, optionally, the
  project's referents.
- **Add a baseline/release to a project:** click the "⋮" icon on the project's row →
  *"+ New baseline"*.
- **Add a task to a baseline:** same "⋮" menu on the baseline's row → *"+ New task"*.
- **Reorder a task, or move it to a different baseline:** drag it by the handle (⠿) next to its
  name and drop it on another row — above or below to position it there, including a row that
  belongs to a different baseline of the same project.
- **Allocate a resource to a task for a given week:** double-click the corresponding cell in the
  grid. A popup opens: pick the team first, then the resources belonging to that team, and
  optionally check *"Delivery milestone"* if that week is the baseline's release date. The popup
  saves itself when closed — there's no "Confirm" button.
- **Select several weeks at once:** click the first cell, then shift-click the last one on the
  same row, to apply the same allocation to the whole range in a single save.
- **Shift an allocation by one week:** right-click the cell and pick *"Shift one week back"* or
  *"Shift one week forward"* — this moves the allocation, it doesn't open the editor, so it never
  overwrites what's in the cell. To shift several weeks together while keeping each cell's own
  content, first Ctrl+click two cells on the same row to select the range (the menu's top line
  confirms how many weeks are selected), then right-click inside it. Shifting is blocked — with a
  tooltip explaining why — if the destination already has an allocation, the task is marked
  completed, or you'd go past the first/last week of the sheet.
- **Need a reminder of how any of this works?** Click the **"?"** button in the top-right corner
  of the top bar for a short built-in guide covering editing, clearing, and shifting allocations.
- **Manage teams and resources** (create/rename/recolor a team; create/rename/move/delete a
  resource): ☰ menu → *"Team & resources"*.
- The **"Resource load"** (who's over-allocated, with traffic-light colors) and **"Milestones"**
  (release calendar) pages are read-only: they're for checking, not editing. The header shared by
  every page also shows a running count of upcoming baselines (release milestones due from today
  onward), so you don't need to open the Milestones page just to see how many are coming up.
- The **Milestones** page opens with a scrollable list of upcoming releases grouped by month
  (above the release-density chart and calendar), with a **"Copy"** button that puts the list on
  your clipboard as plain text — handy for pasting into an email or a text file.
- **Switch to a different data folder:** ☰ menu → *"Change data folder…"* → confirm. This closes
  the current folder (no data is touched) and takes you back to the folder-selection screen, where
  you pick a different one with the usual button.
- Cells showing a warning symbol (`?`, `!`, `⚠`) flag "orphan" references (a team or resource
  mentioned but no longer present under *"Team & resources"*) or a resource allocated twice in the
  same week across different projects — these don't block your work, but are worth checking.

### 6. Backups

- Backups are **not automatic**: you have to trigger one by hand from ☰ menu → **💾 Backup**.
- Each backup creates a new `backup/YYYYMMDD_HHMMSS/` subfolder (backup date and time) inside the
  same data folder, containing a copy of every file at that moment (`manifest.json`,
  `team-resources.json`, and every project).
- **Tip:** run a backup before any large or risky change — e.g. before moving many resources
  between teams, before a data import, or simply before a long working session.
- **Restoring a backup is a manual operation:** the app has no "Restore" button. You need to copy
  the files from the chosen backup subfolder (`backup/YYYYMMDD_HHMMSS/`) over the current files in
  the data folder (`manifest.json`, `team-resources.json`, the contents of `projects/`), overwriting
  them. Do this with the app closed for every user, to avoid write conflicts during the copy.
- If the data folder lives on a cloud-sync service, you likely also have an additional,
  independent safety net beyond these manual backups — most of them keep their own per-file
  version history (e.g. OneDrive's "Version history", Dropbox's "Version history", Google Drive's
  "Manage versions") — but don't rely on that alone: still use the app's backup function before
  risky operations, since it restores the
  whole dataset in one shot rather than file by file.

### 7. FAQ / things to know

- **"I closed and reopened the app and it's asking for the folder again"** — expected, see step
  4: it's a browser limitation when the app is opened as a plain file, not a malfunction.
- **"A colleague was working at the same time and the app is warning me about a conflict"** —
  someone saved a change to the same file after you had it open. The warning lists what actually
  changed (which tasks/weeks, or which project/team/resource), so you can tell at a glance whether
  it overlaps with your own edit. Only confirm if you're sure you want to overwrite their change;
  otherwise cancel, reload the page (re-selecting the folder), and reapply your change on top of
  the more recent one.
- **"I want a heads-up before I even start editing, not just when I try to save"** — turn on ☰ menu
  → *"Notify me of changes on disk"* (off by default). While it's on, coming back to the app's
  browser tab checks whether anything changed on disk since you loaded it and shows a brief
  notification if so — it never blocks you and never overwrites anything, it's just an early
  warning. It can't tell you *who* made the change, only *what* file.
- **"The app won't open, or errors right away"** — check that you're using an up-to-date Chrome or
  Edge; Firefox and Safari are not supported.
- The JSON files inside the data folder are plain, readable text and can even be hand-edited with
  a text editor in an emergency — but this is discouraged unless necessary: a formatting mistake
  can make the file unreadable to the app.

## Data model

```
<data-folder>/
  manifest.json         # project index + global week range
  team-resources.json   # teams and the resources that belong to each one
  projects/
    <project-slug>.json
```

Everything is saved back to disk as plain, indented JSON, so you can inspect or hand-edit it at
any time — nothing is hidden in a database or a proprietary format.

## Project layout

```
index.html      entry point
css/             styles
js/data/         persistence: data shape, File System Access wrapper, save coordinator
js/state/        a minimal in-memory store (pub/sub, no framework)
js/model/        pure derivations: week arithmetic, overallocation, data validation
js/ui/           rendering: the gantt view, team/resource management, popovers, toolbars
sample-data/     a full example dataset to try the app with
```

## Development

There's no build step or test runner by design — it's plain classic-script JavaScript (a global
`window` namespace, no ES modules, no TypeScript, no framework), which is what lets it run
straight from a `file://` URL with zero setup.

Deeper documentation lives in [`docs/`](docs/):

- [`docs/architecture.md`](docs/architecture.md) — layers, load order, render/state flow
- [`docs/api.md`](docs/api.md) — the internal module contract (there's no network API)
- [`docs/database.md`](docs/database.md) — the JSON data model and how writes/conflicts work
- [`docs/deployment.md`](docs/deployment.md) — how to run/share it (there's nothing to "deploy")
- [`docs/security.md`](docs/security.md) — the trust model and known limitations
- [`docs/glossary.md`](docs/glossary.md) — terms used across the code and the data files

## Status

Early-stage personal project — expect rough edges.
