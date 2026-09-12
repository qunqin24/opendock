# opencode-cd

OpenCode TUI plugin that moves the current session to another existing
directory without losing its conversation. Moving between projects preserves
the conversation in a verified replacement session.

## Features

- Command palette entry: `Change session directory`.
- Slash commands: `/session-cd` and `/cd-session`.
- Keyboard shortcut: `Ctrl+Shift+D`.
- Absolute paths, home paths (`~`), and paths relative to the current session.
- Existing directories are checked before the move.
- Uncommitted Git changes remain in the source directory.
- The model receives a synthetic reminder about the new directory.
- Cross-project moves use a verified export/import flow and then remove the
  source session.
- Cross-project moves include child sessions and rebuild their parent links.
- The destination project's OpenCode config becomes active after the move; if
  OpenCode cannot confirm the reload, the plugin tells you to restart it.
- The source session is removed only after the replacement session passes
  verification.

## Setup

Install the plugin from npm:

```sh
opencode plugin opencode-cd@0.1.0 --global
```

You can also install the development version directly from GitHub:

```sh
opencode plugin opencode-cd@git+https://github.com/artempavlov/opencode-cd.git#main --global
```

For local development, install dependencies with `bun install` and add the
plugin file to the global OpenCode TUI configuration in
`~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "file:///path/to/opencode-cd/session-directory.ts"
  ]
}
```

Restart OpenCode after changing the configuration.

## Requirements

- OpenCode 1.18.0 or newer.
- Bun and the OpenCode CLI for cross-project moves.

Same-project moves use OpenCode's native session move API. Cross-project moves
use `opencode import`; uncommitted files remain in the source directory and
are never copied by this plugin.

## License

MIT. See [LICENSE](LICENSE).
