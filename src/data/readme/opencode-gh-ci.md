# opencode-gh-ci

GitHub Actions CI status in the [OpenCode](https://opencode.ai) sidebar with live elapsed timers.

![opencode-gh-ci demo](https://raw.githubusercontent.com/antoinejeannot/opencode-gh-ci/assets/assets/demo.gif)

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-gh-ci"]
}
```

Requires `gh` CLI authenticated with access to the repository.

## Options

Pass options as a tuple in the plugin array:

```json
{
  "plugin": [
    ["opencode-gh-ci", {
      ...options
    }]
  ]
}
```

### Display

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `detail` | `string \| object` | `"jobs"` | Detail level (see below) |
| `max_name_length` | `number` | `24` | Max characters for workflow/job names before truncation |
| `right_align_elapsed` | `boolean` | `true` | Right-align elapsed time in the sidebar |

### Detail levels

```json
// One-liner with status summary and global icon, no toggle
"detail": "overall"

// Workflow names with colored dots, collapsible
"detail": "workflows"

// Full job details with elapsed timers (default)
"detail": "jobs"

// Object form with per-level options
"detail": { "jobs": { "collapse_single_workflow": true } }
```

When `collapse_single_workflow` is `true` (default) and only one workflow remains after filtering, the workflow header is hidden and jobs are shown directly under the CI header.

### Filtering

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hide.workflows` | `string[]` | `[]` | Regex patterns to hide matching workflow names |
| `hide.jobs` | `string[]` | `[]` | Regex patterns to hide matching job names |

Patterns are case-insensitive. Example:

```json
"hide": {
  "workflows": ["^trivy", "^Automatic Dependency"],
  "jobs": ["^Check OSS"]
}
```

### Polling & events

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `server_poll_ms` | `number` | `10000` | How often the server polls the GitHub API |
| `tui_poll_ms` | `number` | `5000` | How often the TUI reads the cache file |
| `debounce_ms` | `number` | `10000` | Global debounce across polls and events |
| `refresh_on_events` | `boolean \| string[]` | `true` | Events that trigger a refresh |
| `push_window_ms` | `number` | `60000` | Time window to group runs from the same push |
| `max_runs` | `number` | `10` | Max runs to fetch from `gh run list` |

`refresh_on_events` accepts:
- `true` — all events (default): `chat.message`, `tool.execute.before`, `tool.execute.after`, `command.execute.before`, `shell.env`
- `false` — poll only, no event-triggered refresh
- `string[]` — specific events, e.g. `["chat.message"]`

### Other

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Disable the plugin entirely |

## Full example

```json
{
  "plugin": [
    ["opencode-gh-ci", {
      "server_poll_ms": 15000,
      "tui_poll_ms": 3000,
      "debounce_ms": 10000,
      "max_name_length": 20,
      "right_align_elapsed": true,
      "refresh_on_events": true,
      "hide": {
        "workflows": ["^trivy"],
        "jobs": ["^Check OSS"]
      },
      "detail": { "jobs": { "collapse_single_workflow": true } }
    }]
  ]
}
```

## Architecture

```
server.ts  ── poll gh CLI ──▶  /tmp/opencode-gh-ci/<uuid>/ci.json
                                          ▲
tui.tsx    ── read cache ─────────────────┘
```

- **server.ts** — polls `gh run list` + `gh api` for workflow runs and jobs, writes to a per-session cache file
- **tui.tsx** — reads the cache, renders the sidebar with SolidJS
- **shared.ts** — types, options parsing, registry, display helpers

Each OpenCode session gets its own random cache directory. A registry file tracks active sessions by PID. On startup, orphaned sessions from dead processes are cleaned up automatically.

## License

MIT
