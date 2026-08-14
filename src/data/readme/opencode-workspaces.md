# opencode-workspaces

> TUI workspace management for [OpenCode](https://opencode.ai) — switch between git worktrees without leaving your terminal.

[![npm](https://img.shields.io/npm/v/opencode-workspaces)](https://www.npmjs.com/package/opencode-workspaces)
[![CI](https://github.com/stephengolub/opencode-workspaces/actions/workflows/ci.yml/badge.svg)](https://github.com/stephengolub/opencode-workspaces/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What it does

`opencode-workspaces` brings the desktop app's workspace sidebar to the OpenCode TUI. It lets you:

- **View** all your git worktrees from any TUI screen
- **Create** new sandboxes (git worktrees on new branches) without leaving the TUI
- **Switch** between workspaces in-session — sessions stay in the current tab
- **Scope sessions** to a workspace so tool calls run in the right directory
- **Rename, reset, and delete** sandbox workspaces with keyboard-driven dialogs
- **Browse sessions** across workspaces with a filterable picker

## Installation

Add to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-workspaces"]
}
```

Or with `opencode plugin add`:

```sh
opencode plugin add opencode-workspaces
```

## Usage

### Enable workspaces

Workspaces are opt-in. Press `ctrl+p` to open the command palette and search for **"Enable workspaces"**, or type `/ws` in any prompt.

### Slash commands

| Command | Alias | Action |
|---------|-------|--------|
| `/ws` | `/workspace` | Open workspace menu (sub-picker) |
| `/ws-new` | `/wsn` | Create a new workspace |
| `/ws-switch` | `/wss` | Switch to a different workspace |
| `/ws-session` | `/wsc` | New session in current workspace |
| `/ws-sessions` | `/wsl` | Browse sessions across workspaces |
| `/workspaces` | `/wsm` | Full-screen workspace manager |

### Keyboard shortcuts (in the workspace manager)

| Key | Action |
|-----|--------|
| `j` / `↓` | Select next workspace |
| `k` / `↑` | Select previous workspace |
| `n` | New workspace |
| `r` | Rename selected workspace |
| `R` | Reset selected workspace to default branch |
| `d` | Delete selected workspace |
| `Esc` | Go back to home |

### Home screen

When workspaces are enabled, a dashboard appears below the prompt showing:
- A list of your workspaces with session counts and status indicators
- Clickable actions: `+ new`, `⎇ switch`, `≡ manage`
- A badge showing the currently active workspace

### Sidebar (in session view)

The sidebar shows all workspaces with session counts. The workspace that owns the current session is highlighted with a `▸` prefix.

## Configuration

Workspaces uses persistent KV storage (namespaced under `workspace_tui:`):

| Key | Type | Description |
|-----|------|-------------|
| `workspace_tui:enabled` | boolean | Whether workspaces feature is active |
| `workspace_tui:current` | string | Currently selected workspace ID |
| `workspace_tui:names` | object | Custom display names per workspace ID |

## Requirements

- OpenCode ≥ 1.0.0
- Git repository with worktree support

## How workspace switching works

When you switch workspaces, sessions created in that workspace are automatically scoped to its directory. The backend routes all session tool calls (file reads, shell commands, etc.) through the workspace's git worktree. Sessions remember their workspace — you don't need to re-select after reopening.

For new sessions, if the current workspace is a sandbox, `createSession` passes `workspaceID` so the server auto-routes all operations through that worktree.

## Development

```sh
git clone https://github.com/stephengolub/opencode-workspaces
cd opencode-workspaces
npm install
npm run lint      # type check
npm test          # run 82 tests
npm run build     # emit dist/
```

To use the local plugin in your TUI:

```json
{
  "plugin": ["/path/to/opencode-workspaces/src/index.tsx"]
}
```

## License

MIT © [Stephen Golub](https://github.com/stephengolub)
