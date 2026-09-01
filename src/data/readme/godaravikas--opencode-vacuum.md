# opencode-vacuum

![opencode-vacuum](docs/images/opencode-vacuum.png)

[![npm](https://img.shields.io/npm/v/@godaravikas/opencode-vacuum)](https://www.npmjs.com/package/@godaravikas/opencode-vacuum)
[![npm downloads](https://img.shields.io/npm/dm/@godaravikas/opencode-vacuum)](https://www.npmjs.com/package/@godaravikas/opencode-vacuum)
[![Tests](https://img.shields.io/github/actions/workflow/status/godaravikas/opencode-vacuum/ci.yml?label=tests)](https://github.com/godaravikas/opencode-vacuum/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Supercharge [OpenCode](https://opencode.ai) session management with global session discovery, intuitive keyboard and mouse multi-selection, and effortless bulk deletion.

## Requirements

**OpenCode >= v1.18.16**

## Installation

> **Important:** This is a **TUI plugin**. It must be added to `tui.json`, not `opencode.json`.

Create or edit `~/.config/opencode/tui.json` (global):

```json
{
  "plugin": ["@godaravikas/opencode-vacuum"]
}
```

OpenCode installs it automatically via Bun at startup. Restart OpenCode and the `/vacuum` command is available immediately.

## Usage

Type `/vacuum` in the TUI prompt, or search for **"Manage and delete sessions"** in the command palette (`Ctrl+P`).

### Key bindings

| Key | Action |
|-----|--------|
| `↑` / `k` | Move cursor up |
| `↓` / `j` | Move cursor down |
| `Space` | Toggle selection |
| `Ctrl+A` | Select all / deselect all |
| `f` | Filter by project |
| `r` | Retry loading sessions |
| `d` / `Delete` | Delete selected sessions (with confirmation) |
| `Esc` / `q` | Close without deleting (Return to opencode) |

## Preview

Session manager screen — current project filter active, two sessions selected:

```text
 Session Manager — 3 sessions · ~/examples/my-api
 ─────────────────────────────────────────────────────────────────────────────────
     Session                      Project                             Updated
 ─────────────────────────────────────────────────────────────────────────────────
 [x] Fix auth bug in middleware  /Users/dev/examples/my-api           Aug 11
 [x] Refactor JWT token handler  /Users/dev/examples/my-api           Aug 10
 [ ] Add rate limiting to API    /Users/dev/examples/my-api           Aug 9
 ─────────────────────────────────────────────────────────────────────────────────
 2 selected  ↑↓/jk move · Space select · Ctrl+A all · f filter · d delete · Esc close
```

Confirmation dialog when selected sessions does not include subagents:

```text
 ┌──────────────────────────────────────┐
 │  Delete 2 sessions?                  │
 │  2 sessions will be deleted.         │
 │  This cannot be undone.              │
 │                                      │
 │           < Cancel >  < Confirm >    │
 └──────────────────────────────────────┘
```

Confirmation dialog when selected sessions include subagents:

```text
 ┌──────────────────────────────────────────────────┐
 │  Delete 2 sessions and their subagents?          │
 │  5 sessions will be deleted.                     │
 │  This cannot be undone.                          │
 │                                                  │
 │                 < Cancel >  < Confirm >          │
 └──────────────────────────────────────────────────┘
```

Project filter picker:

```text
 ┌ Filter by project ─────────────────────────────────┐
 │ > All sessions       5 sessions across 3 projects  │
 │   ~/examples/my-api                  (current)     │
 │   ~/examples/frontend                              │
 │   ~/examples/backend/server                        │
 └────────────────────────────────────────────────────┘
```

## How it works

- Opens to the **current project** sessions by default. Press `f` to switch to all projects or pick a specific one.
- Sessions are listed globally across all projects — fetched via the OpenCode SDK, read only direct database access.
- A confirmation dialog is shown before any deletion executes.
- When all sessions in a filtered view are deleted, automatically falls back to showing all sessions.

## How to upgrade

Clear the plugin cache and OpenCode will fetch the latest version automatically on next startup:

```bash
rm -rf ~/.cache/opencode/packages/@godaravikas
```

## Contributing

Source code: [github.com/godaravikas/opencode-vacuum](https://github.com/godaravikas/opencode-vacuum)

Issues and pull requests are welcome.

## License

MIT — see [LICENSE](./LICENSE)

---
