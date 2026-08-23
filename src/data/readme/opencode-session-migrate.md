# opencode-session-migrate

A [opencode](https://opencode.ai) TUI plugin to migrate sessions between projects and rescue orphaned sessions.

## Features

- List sessions across **all** projects, not just the current one.
- Detect orphaned sessions (directory no longer exists on disk, or a global session whose directory lives inside a known project worktree).
- Migrate a session to another project, worktree, or your home directory.
- Migrate child (forked) sessions along with the parent.

## Requirements

- opencode `>=1.18.0` (TUI plugin API)

## Installation

### npm

```sh
opencode plugin -g opencode-session-migrate
```

Or add it to your `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-session-migrate"]
}
```

### Local path

Point directly at the plugin file:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["/path/to/opencode-session-migrate/src/index.tsx", { "keybind": "ctrl+o" }]
  ]
}
```

Restart opencode after changing your config.

## Usage

- Press `ctrl+o` anywhere, or run `/migrate` (or find "Migrate sessions" in the command palette).
- Pick a session, then a destination: the current project, your home directory, or any other project.

## Options

| Option    | Type    | Default    | Description                                              |
|-----------|---------|------------|----------------------------------------------------------|
| `enabled` | boolean | `true`     | Set to `false` to disable the plugin.                    |
| `keybind` | string  | `"ctrl+o"` | Key binding that opens the migrate dialog.               |
| `debug`   | boolean | `false`    | Write debug logs to `/tmp/opencode-session-migrate.log`. |

## How it works

- Orphans are detected client-side by checking whether each session's `directory` still exists on disk, or whether a global session's directory lives inside a known project worktree.
- Migration updates `project_id` and `directory` (and clears `path`/`workspace_id`) directly in the opencode SQLite database, including child sessions.

## Limitations

- Migration writes straight to the database, bypassing opencode's event system. The built-in session list may stay stale until a resync or restart; the plugin re-lists correctly on its own.
- The `ctrl+o` hint does not appear in the built-in session list footer (the plugin API does not allow extending it). Use the command palette or `/migrate` if you forget the binding.

## License

MIT
