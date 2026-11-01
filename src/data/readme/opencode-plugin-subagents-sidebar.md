# OpenCode Subagents Sidebar

[![CI](https://github.com/andy-takker/opencode-plugin-subagents-sidebar/actions/workflows/ci.yml/badge.svg)](https://github.com/andy-takker/opencode-plugin-subagents-sidebar/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/andy-takker/opencode-plugin-subagents-sidebar)](https://github.com/andy-takker/opencode-plugin-subagents-sidebar/releases/latest)
[![MIT license](https://img.shields.io/github/license/andy-takker/opencode-plugin-subagents-sidebar)](LICENSE)
[![OpenCode V2](https://img.shields.io/badge/OpenCode-V2%202.2.5-18181b)](docs/compatibility.md)

**A live subagent monitor for the OpenCode terminal UI.** Track parallel AI agents,
nested tasks and execution status in a collapsible sidebar. Click any task to
open its session without losing sight of the rest of the session tree.

[Installation](#installation) · [Features](#features) ·
[Compatibility](docs/compatibility.md) · [Contributing](CONTRIBUTING.md) ·
[Report a bug](https://github.com/andy-takker/opencode-plugin-subagents-sidebar/issues/new?template=bug_report.yml)

**GitHub release: [v0.2.1](https://github.com/andy-takker/opencode-plugin-subagents-sidebar/releases/tag/v0.2.1).**
See [installation](#installation) for archive and npm distribution details.

## Demo

![Subagents Sidebar v0.2.0 in Warp: attention counts, nested tree, Active filter, durations and searchable keyboard chooser](https://raw.githubusercontent.com/andy-takker/opencode-plugin-subagents-sidebar/main/docs/assets/demo.gif)

Captured in **Warp** using the actual plugin components and **demonstration data**,
not a live agent execution. Time-compressed captures show attention counts, the
nested tree, Active with ancestor context, and the keyboard chooser/search.
The recording is cropped; no private conversations or real task data are included.

## Features

Collapsed by default; click the arrow or header to expand the list:

```text
▶ Subagents · 5 · 2 running
```

Expanded example:

```text
▼ Subagents · 1
[All (1)] Active (0)
Research API       Done 3m37s
```

- Counts keep updating while collapsed. The expanded/collapsed choice survives
  navigation for this plugin context; restarting OpenCode or reloading the plugin resets it.
- Branches containing Running/Waiting tasks appear first; finished tasks stay visible.
- Navigating into a child keeps the same tree. Switching roots changes the list.
- Restores existing tasks, follows lifecycle events, and uses your current theme.
- Text statuses: `Waiting`, `Running`, `Done`, `Error`, `Interrupted`, `Idle`, `Unknown`.
  Idle does not imply success.

### Active/All filter

A filter appears beneath the expanded header:

```text
▼ Subagents · 5
All (5) [Active (2)]
Research API         Running
Review changes       Running
```

Click **All** to show the complete history (the default), or **Active** to show
`Running` and `Waiting` tasks, plus their ancestors for context. Brackets mark the
selected mode. The header always counts all subagents; Active counts only active
tasks. Additional inactive ancestors are marked `·`, use muted titles and are
counted separately on a `+ N context (·)` line. They keep their real status and
remain clickable. Finished tasks disappear from Active unless needed as an
ancestor, and remain accessible through All. No active tasks shows `No active subagents`;
a completely empty tree shows `No subagents` in either mode.

Filtering is local and never pauses synchronization, including while collapsed.
The choice survives session/root navigation and sidebar remounts in the same
plugin context; restarting OpenCode or reloading the plugin resets it to All.

### Nested task tree

Parents precede their children, with connectors like the `tree` utility:

```text
Research       Done     3m37s
├─ API         Running    42s
│  └─ Tests    Waiting  1m05s
└─ Docs        Done       25s
```

Among siblings, branches containing any Running/Waiting task come first, then
creation time and session ID break ties. Each subtree stays together; an inactive
parent can therefore precede its active descendants. Direct children of the
current root have no connector, and the current root itself is not a row.

Active retains each necessary ancestor once, hides inactive sibling branches and
redraws connectors for the filtered tree. Its visible row count is the active
count plus the separate context count. A finished parent with no active descendant
disappears from Active. Filtering remains local and preserves click targets.

Connectors occupy at most six columns. At depths beyond two nested levels, `…`
replaces the earlier path (`…  └─`); it does not mean nodes were omitted. Status
and duration columns remain aligned while long task names truncate. Navigating
into a child retains the same root tree.

### Attention and errors

`Waiting` means the server confirms an unanswered permission request or form for
that subagent. It takes precedence over Running and previous terminal outcomes;
Running also overrides a previous error. Idle alone never means waiting or stuck.
Waiting and Running both give their branch priority in the tree ordering.

When attention is needed, the collapsed section adds a compact summary:

```text
▶ Subagents · 3
1 running 1 waiting 1 error
```

Each subagent contributes to at most one of these counts, even with several
pending requests. Counts describe the whole tree regardless of the filter.
Summary items wrap as whole labels on narrow sidebars. Errors remain in All;
Active contains Running and Waiting. Click a row to open the host session and
respond there. The plugin never answers forms or grants permissions.

Replies/cancellations refresh the state; Waiting clears when no request remains.
Reconnect restores pending requests from the server. A new execution clears a
previous Error, but a currently pending request still takes priority. A failed or
unsupported pending-request read shows the load error and Retry rather than
claiming there is nothing to attend to.

### Execution duration

Expanded rows show the elapsed time of the **latest execution**, for example
`Running 42s`, `Waiting 3m12s`, or `Done 1h05m`. Waiting inside an execution counts
toward elapsed time; this is not CPU time or a separate waiting-time counter.
A completed execution freezes its duration, including when a pending request
keeps the row in Waiting. A new execution starts a new timer.

The server's `time.busy` supplies the start and `time.idle` the completed end.
Session creation/update times are never substituted. Missing, inconsistent or
future timestamps show `—`; duration alone never means a task is stuck.
Reopening the list, navigating and reconnecting derive time from server metadata
rather than the time the sidebar was opened. A server restart that starts a new
execution also resets its duration.

Formatting uses whole seconds below an hour, whole minutes below a day, then
whole hours (`2d03h`); durations of 1,000 days or more display `999d+`.
One local clock updates once per second only while the expanded, ready list
contains an ongoing execution. It stops on collapse, load error, completion or
unmount and makes no server requests. Visible rows share status and duration
column widths: statuses align left, durations align right, and long titles
truncate.

### Keyboard navigation

Run `/subagents`, or choose **Open subagent** in OpenCode's command palette.
No default keyboard shortcut is installed. The command is available in a
session, including when the sidebar is hidden or collapsed.

- Type to search task titles (case-insensitive substring matching).
- Use **↑/↓** to select, **Enter** to open, and **Esc** to cancel.
- The chooser includes the entire current root's descendant tree, regardless
  of the sidebar's Active/All filter. It shows bounded tree connectors, live
  statuses, and execution durations; searching may hide a matching task's parent.
- Loading, empty trees, no matches, and request failures have distinct messages.
  Press Enter to retry a load failure. Sessions are rechecked before navigation;
  a failed check keeps the chooser open. If a selected task disappears, use the
  arrows or search to choose another task rather than opening its replacement.
- Events refresh the open chooser. If the list changes during the final read,
  select again. Changing the originating session or replacing/closing the dialog
  cancels pending navigation and releases its subscriptions and local clock.

## Installation

Tested with **OpenCode V2 2.2.5**. CI runs on Linux and macOS; see the
[compatibility record](docs/compatibility.md) for host verification and limits.

### GitHub release

Download `opencode-plugin-subagents-sidebar-0.2.1.tgz` from the GitHub release,
extract it to a permanent directory, and add the absolute path of the extracted
`package` directory to `cli.json` as shown below. OpenCode supplies the runtime;
the release archive does not need a separate dependency installation.

### Source checkout

Clone this repository and install development dependencies with Bun 1.3.13:

```sh
git clone --branch v0.2.1 https://github.com/andy-takker/opencode-plugin-subagents-sidebar.git
cd opencode-plugin-subagents-sidebar
bun install --frozen-lockfile
bun run check
bun run package:check
pwd
```

### Enable the plugin

Back up `~/.config/opencode/cli.json` (or `$XDG_CONFIG_HOME/opencode/cli.json`).
Append the **absolute path to the extracted `package` directory or source checkout**
to its existing `plugins` array. Replace the example path with your own:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": ["/absolute/path/to/opencode-plugin-subagents-sidebar"],
  "session": { "sidebar": "auto" }
}
```

Preserve your other plugins and settings. OpenCode watches this file; use
`/reload` if needed. Open a session and widen the terminal enough for OpenCode's
sidebar to appear. Expand `Subagents` to see the list, or `No subagents` when empty.

### npm installation

Check [npm](https://www.npmjs.com/package/opencode-plugin-subagents-sidebar) for
registry availability; GitHub releases and npm publications are separate steps.
When `0.2.1` is available, add `"opencode-plugin-subagents-sidebar@0.2.1"` to the
same `cli.json` array instead of the local path. Do not add both entries.
If it is not available in the registry yet, use the GitHub archive above.
This is a TUI-only plugin; it does not go in the server's `opencode.json`.

Version 0.2.0's raw TSX fails when installed by npm name in OpenCode 2.2.5
(`Cannot find package 'react'`). Use 0.2.1's precompiled package; installing React
is not a workaround. The same host-owned Solid/OpenTUI runtime is used.

## Update or disable

For a local checkout, update its branch, run `bun install --frozen-lockfile`, then
`bun run check` (which rebuilds `dist/tui.js`) and `/reload`. For npm, change the pinned version in `cli.json`
after reading its release notes. Remove this plugin's array entry to disable it;
session history is retained by OpenCode.

For a release archive, extract the new version into a new permanent directory,
update the plugin path in `cli.json`, and use `/reload`. For a tagged checkout,
fetch tags and switch to the desired release tag before running the checks.

## Troubleshooting

- No sidebar: check `session.sidebar`, terminal width, and that a session is open.
- `Error` in the header: expand it and click `Retry`; check your connected server is reachable.
- No section: verify the package path and inspect
  `~/.local/share/opencode/log/opencode.log` for plugin loading errors.
- Include OpenCode version, OS, installation method and reproduction steps in an
  [issue](https://github.com/andy-takker/opencode-plugin-subagents-sidebar/issues).
  Remove private task names, paths and credentials from logs.

The plugin reads session metadata and pending-request lists through OpenCode's authenticated client; it
does not read messages, modify sessions, poll the server on a timer, or send telemetry.

## Development

```sh
bun install --frozen-lockfile
bun run build          # compile plugin code; runtime packages remain external
bun run check          # types, lint, formatting, tests
bun run package:check  # inspect actual npm archive and internal imports
bun run format        # apply formatting
```

See [CONTRIBUTING](CONTRIBUTING.md), [architecture](docs/architecture.md),
[release process](docs/releases.md), [changelog](CHANGELOG.md) and
[security policy](SECURITY.md). MIT licensed.
