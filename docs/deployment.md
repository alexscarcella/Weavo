# Deployment

## There's nothing to build or host

Weavo has no build step and no server process, so "deploying" it means exactly one thing: making
the static files (`index.html`, `css/`, `js/`) available somewhere a browser can open them. There
is no compilation, no bundling, no environment-specific config, and no CI/CD pipeline required to
ship a change — the files in the repository are exactly what runs.

## Recommended setup

The app and its data are two separate things that both need to be reachable, but not from the
same place:

1. **App files** — clone or copy `index.html`, `css/`, and `js/` anywhere. Since there's no build
   step, "updating" the app for everyone is just replacing those files (e.g. a `git pull` on a
   shared location, or re-copying them).
2. **Data folder** — a separate folder containing `manifest.json`, `team-risorse.json`, and
   `progetti/*.json`. This is what each user points the in-app folder picker at. For a team to
   collaborate on the same plan, this folder needs to live somewhere all of them can read and
   write — a network share or a synced folder from any cloud-sync client (OneDrive, Dropbox,
   Google Drive, etc.) all work, since the app only needs regular filesystem read/write access to
   it, nothing cloud-provider-specific.

Nothing about the app cares whether it's opened via a `file://` path or served over `http(s)://`
by a plain static file server — both work identically, as long as the browser is Chromium-based
(see [security.md](security.md#browser-requirement)).

## No persisted connection

Every time the app is opened, the user has to re-pick the data folder — there is no way to
remember that choice across page loads. This is a platform limitation, not a missing feature: a
`FileSystemDirectoryHandle` can't be stored in `localStorage`, and `indexedDB.open()` never
resolves when the page is opened from a `file://` origin (verified, not assumed). Don't treat a
"remember my folder" feature request as a quick fix — it would require reconsidering the
`file://`-only distribution model entirely (e.g. running a local dev server), which is a real
scope change, not a bug fix.

`js/data/fs-access.js`'s `pickDirectory()` passes a stable `id` to `showDirectoryPicker()`,
which per spec should make Chrome/Edge remember, per browser profile, the last folder chosen
with that `id` and reopen the native dialog already navigated there. **Verified empirically
(July 2026) that this does not happen under `file://`** — even reloading the page within the
same browser session (no restart needed) is enough to reset the dialog to its default location.
Same likely root cause as the IndexedDB failure above: `file://` pages don't get a stable,
persistent storage origin. The option is left in place (harmless, spec-correct, might start
working if the app were ever served from a non-`file://` origin) but must not be presented to
the user as reducing clicks — it doesn't, today.

The one mitigation that *does* work: `js/app.js` saves the *name* of the last successfully
connected folder (a plain string, not the handle) to `localStorage` and shows it as a "last
used" hint next to the picker button — purely informational, to help recognize the right folder
among similarly-named ones. It doesn't save any clicks either, but at least reduces the chance
of picking the wrong folder. It also can't be shared team-wide: each user's OneDrive/network
path can differ, so this only ever helps one user on one machine, not a cross-user "recent
folders" list. The hint can only ever show the folder's own name (`handle.name`), never its
absolute filesystem path — the File System Access API never exposes that, by platform design
(sandboxing), regardless of `file://` vs. a served origin. There's no way around this from JS.

Bottom line: there is currently **no way to reduce the number of clicks** in the folder-picker
flow while staying on pure `file://` distribution. Actually cutting clicks (e.g. real
cross-session handle persistence via IndexedDB, or a working `id`-remembered location) would
require serving the app from a real origin (`http(s)://`, even a trivial local static server)
instead of opening `index.html` directly — an explicit scope change per `CLAUDE.md`, not
something to assume.

## Backups

Backups are **manual, not automatic**: the toolbar exposes an action that snapshots
`manifest.json`, `team-risorse.json`, and every file under `progetti/` into a timestamped
`backup/<YYYYMMDD>_<HHMMSS>/` subfolder of the data folder (`MP.repository.createBackup`). There
is no scheduled or on-every-write backup — if you want one before a risky bulk edit, trigger it
from the menu first.

## Environments

There's only one environment. There's no staging/production split, no feature flags, and no
environment variables — the same static files behave the same way regardless of where they're
opened from.
