# opencode-cd

OpenCode TUI plugin that moves the current session to another existing
directory without losing its conversation. Moving between projects preserves
the conversation in a verified replacement session.

## Why this exists

An OpenCode session is tied to its working directory and project. During a
task, you may need to continue working in another directory, switch to a
worktree, or move from one project to another. Without this plugin, the usual
workaround is to start a new session and manually restore the context.

`opencode-cd` lets you keep the current conversation while changing the
directory used by the session. This preserves the decisions, investigation,
and session history that have already accumulated.

For moves within the same OpenCode project, the plugin uses OpenCode's native
session move API. For moves to another project, it creates a verified
replacement session, transfers the conversation and child sessions, and
removes the original only after the destination has been checked.

This plugin moves the session context, not the files on disk. Uncommitted
changes remain in the source directory and are never copied automatically.

### Typical use case

You start a session in a repository and investigate a problem. Later, you
realize that the work belongs in another repository or a different worktree.
Instead of opening a new session and explaining the entire context again, use
`/session-cd` or `Ctrl+Shift+D` to continue the same conversation in the
destination directory.

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
