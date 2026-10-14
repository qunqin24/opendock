# opencode-session-changes

[![CI](https://github.com/kdbsoft/opencode-session-changes/actions/workflows/ci.yml/badge.svg)](https://github.com/kdbsoft/opencode-session-changes/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-session-changes)](https://www.npmjs.com/package/opencode-session-changes)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Show changed files with per-file `+additions` / `-deletions` in the
[OpenCode](https://opencode.ai) session sidebar — a live `git diff --stat` for
whatever the agent (or you) changed.

```
 Context
 107,338 tokens
 54% used

 Changes                         +4 -4
 …/indexing.twig                 +4 -4
```

## Features

- Per-file added/removed line counts, colored with the current OpenCode theme.
- Three scopes: the whole session (default), the current turn, or the VCS
  working tree.
- Live updates while the agent works — driven by server events with a 250 ms
  debounce, no polling.
- Totals in the header, long paths shortened, and a `max` cap so the sidebar
  stays readable.
- Pure CLI/TUI plugin: renders in the terminal and works against local and
  remote servers.

## Requirements

- OpenCode v2 (the CLI/TUI).
- A Git worktree for file snapshots.
- For `scope: "session"` / `"turn"`: snapshots enabled (default). These read the
  same snapshot data `/undo` uses.
- For `scope: "working"`: any Git repository.

## Install

### A. npm (recommended)

```bash
opencode plugin add opencode-session-changes
```

Pin a version with `opencode-session-changes@1.0.0`; `opencode plugin check` and
`opencode plugin update` keep it fresh.

### B. From GitHub

```bash
opencode plugin add github:kdbsoft/opencode-session-changes
```

Both `plugin add` forms install the package and register it globally. Reload or
restart the TUI afterwards.

### C. Clone into the plugins directory

```bash
git clone https://github.com/kdbsoft/opencode-session-changes.git \
  ~/.config/opencode/plugins/session-changes
```

OpenCode discovers directories under `~/.config/opencode/plugins/` (and
`.opencode/plugins/`) automatically; the plugin hot-reloads on file changes.

### D. CLI-only via `cli.json`

Clone the repository somewhere and reference it from
`~/.config/opencode/cli.json`. This keeps the plugin active even when the TUI is
connected to a remote server, and lets you pass options:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    { "package": "./plugins/session-changes", "options": { "scope": "session", "max": 30 } }
  ]
}
```

## Configuration

Options are passed through the plugin entry in `cli.json`:

```json
{
  "plugins": [
    { "package": "./plugins/session-changes", "options": { "scope": "working", "max": 15 } }
  ]
}
```

| Option  | Values                                 | Default     | Description                                                            |
| ------- | -------------------------------------- | ----------- | ---------------------------------------------------------------------- |
| `scope` | `"session"` \| `"turn"` \| `"working"` | `"session"` | Which changes to list (see below).                                     |
| `max`   | number > 0                             | `30`        | Maximum number of files rendered; the rest collapses into `… N more`. |

### Scopes

- **`session`** — every file changed since the first prompt of the session. It
  diffs from the earliest recorded snapshot of the session, so the list keeps
  everything the session produced across turns.
- **`turn`** — only the current (latest) turn, resetting when you send a new
  prompt.
- **`working`** — the Git working tree, `git status`-style. Unlike the two
  snapshot scopes this also includes edits made outside OpenCode, and it keeps
  working after commits.

## How it works

- The plugin claims the `sidebar.content` slot via `context.ui.slot({ append: ... })`
  and renders the list in the session sidebar.
- Data comes from the OpenCode client:
  - `session` / `turn`: `client.session.diff({ sessionID, from, context: 0 })`;
    for `session` scope `from` is the first user message of the session.
  - `working`: `client.vcs.status()`.
- Refresh triggers: server events (`filesystem.changed`,
  `session.step.ended`, `session.tool.*`, `session.revert.*`, `session.status`,
  ...) debounced by 250 ms, plus session switches and the first user message
  arriving.
- `index.ts` is an intentionally empty server plugin: it makes OpenCode discover
  the directory and advertise the plugin's `tui` entrypoint to the CLI.

## Development

```bash
npm install
npm run typecheck
```

Edit `tui.tsx` while OpenCode is running and the plugin hot-reloads — no restart
needed.

## License

[MIT](LICENSE)
