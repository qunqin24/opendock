# opencode-memory-statusline

OpenCode **v1 TUI** plugin that summarises the
[local-memory-mcp](https://github.com/vheins/local-memory-mcp) daemon for the
**current repository** — in the session sidebar, and in the bottom status bar
when the sidebar is collapsed.

```
▼ Memory 0.51.0
─ vibe-coding-premium
27 mem
● 3 backlog · 0 pending
● 0 in-progress
```

When the terminal is too narrow for the sidebar (OpenCode hides it at
`width <= 120`), the same numbers move to the bottom status bar:

```
● 3 backlog · 0 pending · 0 in-progress  vibe-coding-premium
```

## Install

Register the plugin path in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "/home/vheins/.config/opencode/plugins/opencode-memory-statusline"
  ]
}
```

`tui.json` is the **v1** TUI config file — v1 does not read `cli.json`.
Plugins that only contribute TUI slots must **not** be listed in
`opencode.json` (the server config rejects a plugin without `server()`).

## Data source

Reads the daemon HTTP API directly (no MCP round-trip, so it works even
before any session has touched a memory tool):

| Endpoint | Used for |
| --- | --- |
| `GET /api/health` | daemon version (shown next to the header) |
| `GET /api/repos` | repo-scoped memories + task pipeline (one aggregated row per repo) |

Only the **current repository** is shown. The scope is the session directory
name first, then the git remote (`git -C <dir> remote get-url origin`); the
first candidate that actually has a row in the database wins, exact match
only. Task counters are limited to the workflow states that matter for a live
queue: **backlog**, **pending** and **in-progress**.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `LOCAL_MEMORY_API` | `http://127.0.0.1:3456` | daemon base URL |
| `LOCAL_MEMORY_REPO` | from session dir / git remote | force repo scope |

Refresh interval: 15s. Clicking the `▼ Memory` header collapses the section.

## Layout notes

The sidebar is only 42 columns wide, so the task pipeline is split across two
short rows (`● N backlog · N pending` / `● N in-progress`) instead of one long
line that would wrap and get clipped at the bottom of the sidebar.

## Requirements

- OpenCode `>= 1.18.0` (v1 TUI slot API:
  `api.slots.register({ slots: { sidebar_content, app_bottom } })`)
- local-memory-mcp daemon running with its dashboard HTTP API enabled on the
  same port as `/mcp`

## License

MIT
