# Session Explorer

A session launcher for **OpenCode V2** — a fork of
[`ypxcs/opencode-session-history`](https://github.com/ypxcs/opencode-session-history)
that keeps the original terminal (TUI) history panel and adds a global Desktop
entry point: a titlebar button and a command that open a searchable dialog over
**every project and every archived session**, even from the home screen with no
session open.

Package: `opencode-session-explorer-desktop` · plugin id: `session-explorer` ·
repository: [wyattdave/opencode-session-explorer](https://github.com/wyattdave/opencode-session-explorer).

## What this fork adds

- **Global Desktop launcher.** A persistent titlebar button (`Sessions`) and the
  command **Session Explorer: Open** (`Ctrl+Shift+H` on Windows/Linux,
  `Cmd+Shift+H` on macOS). Both work on a cold-start home screen, with a draft,
  or with sessions open, and both call the same opener (no stacked dialogs, no
  DOM injection).
- **Native modal.** Built from `ctx.dialogs.open` + `ctx.ui`, large and
  responsive, search field focused on open, keyboard navigation, Enter to open,
  Escape to close, labelled listbox semantics for screen readers.
- **Complete metadata index.** Every root session on every connected server,
  archived and unarchived, fetched with cursor pagination (no fixed history cap)
  and searched client-side across title, project, directory, subpath, session ID
  and server name. No transcripts are read and no sessions are created just to
  enumerate them.
- **Filters and sorting.** Project dropdown with counts (including projects that
  only have archived sessions), All / Unarchived / Archived, sort by last
  updated / created / title with stable tie-breakers, and optional collapsible
  grouping by project.
- **Archive workflow.** Archive and restore from the row menu through the
  supported SDK mutation, verified by reading the session back. Running sessions
  cannot be archived. There is no delete action.
- **Safe navigation.** A row opens the session on its original server in a new
  focused tab, or focuses its existing tab. Archived sessions open directly on
  hosts that support it; otherwise the menu offers **Restore and open** (never a
  silent unarchive). A session whose working directory is confirmed missing asks
  before opening; an unknown directory state is never reported as missing.

The TUI and server entries are the upstream ones: same panel, same options and
defaults. `limit` only caps the TUI panel and never the Desktop list.

## Installation

Requires **OpenCode V2**. Desktop support was tested with OpenCode Desktop
**2.3.2** on Windows 11 (see [Version support](#version-support)).

The package is published to npm as `opencode-session-explorer-desktop` and ships
a prebuilt `dist/`, so consumers never run a build step.

### From npm

```sh
opencode plugin add opencode-session-explorer-desktop
```

Or add it to `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-session-explorer-desktop"]
}
```

Restart OpenCode Desktop.

### From a tarball or checkout

Useful before a release or when testing local changes.

```sh
# Somewhere outside the source tree, e.g. the plugins folder:
mkdir -p ~/.config/opencode/plugins/opencode-session-explorer
cd ~/.config/opencode/plugins/opencode-session-explorer
npm install /path/to/opencode-session-explorer-desktop-0.2.0.tgz
```

Then add the installed package to `~/.config/opencode/opencode.jsonc`, merging it
with the entries already there:

```jsonc
{
  "plugins": [
    "C:/Users/you/.config/opencode/plugins/opencode-session-explorer/node_modules/opencode-session-explorer-desktop"
  ]
}
```

Restart OpenCode Desktop. `opencode plugin list` should show it:

```text
ID                VERSION  SOURCE
session-explorer  local    C:/Users/you/.config/opencode/plugins/opencode-session-explorer/node_modules/opencode-session-explorer-desktop
```

`opencode api plugin.list` additionally reports `state: active` and
`features: { server: true, tui: true, gui: true }`.

A checkout also works during development:

```jsonc
{ "plugins": ["C:/path/to/opencode-session-explorer"] }
```

> Git URL installs (`github:...`) fail on some V2 builds before the download
> finishes; prefer a local path or a tarball. Do not install the upstream
> package and this fork side by side — both register a history panel.

To uninstall, remove the `plugins` entry (or the folder) and restart. Removing
the plugin only removes its button, command and panel; it does not touch
sessions.

## Usage

### Opening the explorer

- Click the **Sessions** button in the titlebar (bottom-left, beside the status
  area). It is present on the home screen too.
- Press `Ctrl+Shift+H` (`Cmd+Shift+H` on macOS), or run **Session Explorer:
  Open** from the command palette / command menu.

The dialog opens with the search field focused. Escape closes it and returns
focus to where it was.

### Keyboard

| Key | Action |
| --- | --- |
| `↓` from the search field | Move into the results |
| `↑` / `↓` | Move between results |
| `Home` / `End` | First / last result |
| `Enter` | Open the highlighted session |
| `Esc` | Close the menu, then the dialog |

### Searching and filtering

- The search box matches title, project name, project directory, subpath,
  session ID and server name, case-insensitively. Typing is debounced, and the
  search runs over the complete in-memory index, so old archived sessions are
  found too.
- **Project** lists every project, with the number of matching sessions. Projects
  that only contain archived sessions stay in the list.
- **Session state** switches All / Unarchived / Archived. Archived results never
  depend on the unarchived page being loaded.
- **Sort by** offers Last updated (default), Created and Title. Ties break by
  session ID, so the order is stable.
- **Group by project** adds collapsible section headers with total counts; turn
  it off for the flat list.
- **Reset filters** returns project, state, sort, grouping and the search text to
  their defaults.
- Results load 200 rows at a time with **Show more**; there is no overall cap.

### Rows

Each row shows the title (`Untitled session` when blank), project, archived and
running badges, a directory-missing badge, the relative update time, and the
full directory in a tooltip. The row's `Open` action and the menu (`Archive`,
`Restore and open`, `Restore`, `Copy session ID`) never open the row by
accident.

- **Open** focuses the session's existing tab, or opens a new focused tab.
- **Archive** is disabled while the session is running.
- **Restore** puts an archived session back in the unarchived list.
- A confirmed-missing working directory triggers an **Open anyway** confirmation
  before the tab opens.

### Preferences

The project selection, archive filter, sort and grouping are stored in the
plugin's global store and restored on the next launch. A saved project that no
longer exists falls back to All projects. The search text is never stored, and
no transcripts, credentials or metadata caches are written to disk.

## Terminal (TUI) panel

The upstream sidebar panel is unchanged: it lists sessions newest-first, opens
one in the existing tab or a new tab, warns before opening a session whose
directory is gone, and refreshes from session lifecycle events. It is also shown
on the CLI home screen when the terminal is wide enough.

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | `number` | `100` | Maximum number of sessions included in the panel list. Does not affect the Desktop explorer. |
| `maxVisibleSessions` | `number` | `3` | Sessions visible before the list scrolls. |
| `truncateSessionTitles` | `boolean` | `true` | Keep titles on one line with `...`. Set to `false` to word-wrap them. |
| `showMetrics` | `boolean` | `true` | Show the "Xm ago · $Y.YY" line under the title. |
| `showAllProjects` | `boolean` | `true` | When true, list sessions from every project. When false, only the current project's sessions are shown. |

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    {
      "package": "C:/GitHub/opencode-archive-manager",
      "options": {
        "limit": 100,
        "maxVisibleSessions": 3,
        "truncateSessionTitles": true,
        "showMetrics": true,
        "showAllProjects": true
      }
    }
  ]
}
```

> OpenCode passes a plugin's config `options` to its *server* half but not to its
> *TUI* half, which receives `{}` for a plugin declared in `opencode.json(c)`.
> The TUI reads the values back over the plugin's own `settings` RPC, so the
> table above still works from `opencode.json(c)`. Wrong-typed values are
> ignored rather than coerced.

For "open in a new tab" in the TUI, enable session tabs in `cli.json`:

```jsonc
{ "tabs": { "mode": "on" } }
```

## Version support

| Component | Version |
| --- | --- |
| Minimum and maximum tested host | OpenCode Desktop **2.3.2** (Windows 11, 2304×1536) |
| `@opencode/plugin` (host API used by the GUI entry) | 2.3.2 |
| `@opencode/client` | 2.3.2 |
| TUI peers | `@opentui/core` 0.9.3, `@opentui/solid` 0.9.3, `solid-js` 1.9.17 |

The Desktop plugin API is experimental: the GUI entry is published as
`./gui-experimental` and the host loads it as a prebuilt CJS bundle. Other host
versions have not been tested. On a host that marks the server incompatible, the
dialog lists it as incompatible and keeps working for compatible servers; it
never shows a failure as an empty archive.

## Troubleshooting

- **No Sessions button.** Check `opencode plugin list` for `session-explorer`
  with `features.gui: true`. A missing `gui` feature means the host did not load
  `./gui-experimental`; a plugin error is also logged to
  `~/.local/share/opencode/log/opencode.log`.
- **"Connecting to the local server…" does not clear.** The dialog opened before
  the host listed its servers. It refreshes automatically once a server appears;
  otherwise use **Try again**.
- **Shortcut does nothing.** Another command may own `Ctrl+Shift+H`; reassign it
  in the host keybindings for the command id `session-explorer.open`.
- **An archived session opened but stayed archived.** That is the host's direct
  open path, and it preserves the archive. Use **Restore** in the row menu when
  you want it back in the unarchived list.
- **The dialog says the directory is missing.** The server reported that path as
  gone. Open anyway keeps the session but leaves the directory alone.
- **Manage the plugin in Desktop.** Settings → Extensions → Plugins shows the
  loaded plugin; reload after changing the config.

## Development

```sh
npm install          # or: bun install
npm run build        # Vite GUI bundle + the babel server/TUI build
npm run typecheck    # tsc --noEmit
npm test             # packaging/contract suite + pure explorer suite
npm run dev          # rebuild the GUI bundle on change
```

`npm run build` runs `vite build` (GUI → `dist/gui-experimental.cjs`) and then
`scripts/build.ts` (server/TUI → `dist/*.js`, `.cjs` preserved). `dist/` is
committed on purpose: package installs get no build step.

### Why the entries are prebuilt

OpenCode compiles plugin JSX through OpenTUI's Bun plugin, but that plugin skips
anything under `node_modules`, which is where package installs land. Bun's own
JSX transform then targets `@opentui/solid/jsx-runtime`, a static runtime: props
become plain values, and a signal read happens once at mount, leaving the panel
stale. `bun run build` therefore precompiles `src/**` with the transform OpenCode
would have applied (`babel-preset-solid`, `moduleName: "@opentui/solid"`,
`generate: "universal"`), and the compiled entry imports `@opentui/solid` and
`solid-js` by bare name so the host rewrites them to its own runtime.

The Desktop bundle is built with the official preset:

```ts
import { defineConfig } from "vite"
import { gui } from "@opencode/plugin/gui/vite"

export default defineConfig({ plugins: [gui()] })
```

### Releasing

```sh
npm run typecheck
npm test
npm pack --dry-run   # inspect what the tarball will contain
npm publish          # requires npm credentials and the owner's approval
```

`prepublishOnly` re-runs the build, the typecheck and the tests. Commit `dist/`
before tagging: consumers never build.

## Limitations

- Only the built-in local server was available while testing. The code keys
  records by `(serverId, sessionId)` and isolates per-server errors, but a real
  two-server setup, an incompatible server, a dropped event stream and a
  disconnected server were not exercised in the app.
- The Desktop dialog was checked in the host's dark theme and in a 1000×1000
  window. Light theme and very small windows were not visually verified.
- The TUI panel was validated by the upstream test suite and the type/build
  checks; it was not driven interactively in a terminal during this round.
- Only the host versions listed above were tested; releases are cut by the
  repository owner.

## Upstream credit

Forked from
[`ypxcs/opencode-session-history`](https://github.com/ypxcs/opencode-session-history)
at commit `2d61f0cd5205ef673fb547a3a5e7b454796c026b` (v0.1.5). The TUI panel,
server entry, missing-directory RPC and their tests come from that project; the
Desktop GUI entry is new here. Both are MIT licensed — see [LICENSE](LICENSE).

## License

MIT. Copyright (c) the upstream authors and the Session Explorer contributors.
