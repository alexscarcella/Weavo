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

1. Clone this repository.
2. Open `index.html` directly in Chrome or Edge — no server, no install step.
3. When prompted, pick a data folder. To try the app without setting up your own data, point it
   at the bundled [`sample-data/`](sample-data/) folder, which ships with a full example dataset.

## Data model

```
<data-folder>/
  manifest.json        # project index + global week range
  team-risorse.json    # teams and the resources that belong to each one
  progetti/
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
