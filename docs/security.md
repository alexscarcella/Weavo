# Security

*Optional doc — included because the trust model here is unusual enough to be worth writing
down explicitly, even for a small client-only tool.*

## Threat model in one sentence

Weavo has no network surface and no server to attack; its entire security posture reduces to
**who can read and write the shared data folder**, which is a filesystem/network-share access
problem the app deliberately delegates rather than tries to solve itself.

## No network calls at all

The app makes zero outbound requests — no analytics, no CDN-hosted dependencies, no fonts loaded
over HTTP, nothing (verified: no `http(s)://` reference anywhere in `index.html` or
`css/styles.css`). Every script it runs is one of the files in `js/`, loaded from the same origin
it's opened from. There's no supply-chain surface from third-party JavaScript because there is no
third-party JavaScript.

## No authentication, by design

There's no login, no user accounts, and no per-user permission model inside the app. Anyone who
can open the data folder in read/write mode through the browser's File System Access API can see
and change everything in it — access control is entirely delegated to whatever mechanism grants
that filesystem access (network share permissions, cloud-sync folder sharing settings, OS file
permissions). If that's too coarse for a given deployment, it needs to be solved at the folder/share
level, not in the app.

## Browser requirement

The File System Access API is only available in Chromium-based browsers (Chrome, Edge). This
isn't a compatibility gap to fix — Firefox and Safari are explicitly out of scope (see
[architecture.md](architecture.md)). A permission grant (`queryPermission`/`requestPermission` in
`js/data/fs-access.js`) must originate from a direct user gesture (e.g. a click), which the
browser enforces; the app can't silently regain filesystem access without one.

## Data at rest

Everything is stored as plaintext, human-readable JSON — there is no encryption at rest and none
is planned, since the app assumes the underlying storage location (network share, synced folder)
already has whatever access control the deployment needs. Don't put anything in this dataset that
the people with access to that folder shouldn't be able to read directly by opening the file.

## Known limitation: unescaped user-supplied strings in a few render paths

Most of `js/ui/` renders user-entered strings (project names, task names, team/resource names)
via `textContent`, which is safe against HTML/script injection. A few spots build DOM via
`innerHTML` template literals that interpolate those same user-supplied strings without escaping
— notably the gantt view's warnings panel (`js/ui/gantt/gantt-view.js`, the list built from
`MP.validation`/`MP.overallocation` messages, which embed project/task names) and parts of the
cell popover (`js/ui/gantt/cell-popover.js`). In the intended deployment — a small set of trusted
collaborators editing a shared plan — this is a low-severity, accepted limitation rather than an
active vulnerability, but it means a project or task named with an HTML/script payload (e.g.
`<img src=x onerror=...>`) would execute in every other viewer's browser tab when that warning
renders. If this app is ever exposed to a less-trusted set of editors, escaping those interpolations
(or switching them to DOM-building calls) should be done before that change in trust model, not
after.

`js/ui/common/modal.js`'s project-team form/card (`promptProjectForm`, `showProjectCard`) are the
one exception: they do escape every user-supplied string (project name, PM/PE/note text, resolved
resource names) via a local `escapeHtml` helper before interpolating into `innerHTML`, since
`note` is free multi-line text most likely to contain characters that look like markup. New
`innerHTML`-based UI should follow that pattern rather than the older unescaped one above.

## What's explicitly out of scope

- Multi-user real-time collaboration/locking, and any form of user presence signal ("who else has
  this folder open right now") — see [database.md](database.md#conflict-detection) for what
  conflict handling actually exists (reread-before-write, plus an opt-in soft notification of
  changes on disk; neither is a lock, and neither can identify *who* changed something).
- Audit logging of who changed what — the filesystem/network share's own history (if any) is the
  only record.
- Data validation as a security boundary — `js/model/validation.js` catches data-consistency
  issues (orphan references, team mismatches) for correctness, not as input sanitization.
