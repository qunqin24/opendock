# opencode-event-shell-exec

OpenCode plugin that executes shell commands when configured events are triggered.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "plugin": ["@dragonwize/opencode-event-shell-exec"]
}
```

## Configuration

Create an `opencode-event-shell-exec.json` file in either (or both) of these locations:

| Location | Path | Scope |
|---|---|---|
| Global | `~/.config/opencode/opencode-event-shell-exec.json` | All projects |
| Project | `<project-root>/opencode-event-shell-exec.json` | Single project |

Both files are optional. When both exist, command arrays for the same event pattern are **concatenated** (global first, project second).

### Config format

The config file is a JSON object mapping **event patterns** to **arrays of commands**:

```json
{
  "session.idle": [
    "notify-send 'OpenCode session completed!'"
  ],
  "session.*": [
    "echo '[{event.type}] at $(date)' >> /tmp/opencode-sessions.log"
  ],
  "*": [
    "echo '{event.type}' >> /tmp/opencode-all-events.log"
  ]
}
```

### Event patterns

| Pattern | Matches |
|---|---|
| `session.idle` | Only the `session.idle` event |
| `session.*` | Any event starting with `session.` (`session.idle`, `session.created`, etc.) |
| `*` | Every event |

When multiple patterns match an event, all matching groups run in **parallel**. Commands within each group run **sequentially**.

### Available events

- `command.executed`
- `file.edited`, `file.watcher.updated`
- `installation.updated`
- `lsp.client.diagnostics`, `lsp.updated`
- `message.created`, `message.updated`, `message.part.updated`
- `permission.requested`, `permission.replied`
- `server.session.updated`
- `session.created`, `session.idle`, `session.compacted`, `session.deleted`, `session.error`, `session.updated`
- `todo.updated`
- `tool.execute.before`, `tool.execute.after`
- `tui.file.open`

### Command entries

Each command in the array can be either a **string** or an **object**:

**String** (simple):
```json
"echo 'hello world'"
```

**Object** (advanced):
```json
{
  "command": "echo 'hello world'",
  "cwd": "/tmp",
  "env": { "LOG_LEVEL": "debug" },
  "timeout": 5000
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `command` | `string` | Yes | The shell command to execute |
| `cwd` | `string` | No | Working directory for the command |
| `env` | `object` | No | Extra environment variables (merged with `process.env`) |
| `timeout` | `number` | No | Timeout in milliseconds; command is killed if exceeded |

### Interpolation

**Environment variables** are substituted at config-load time:

```json
{
  "session.idle": ["{env:NOTIFY_COMMAND} 'Session done!'"]
}
```

**Event data** is substituted at execution time:

```json
{
  "*": ["echo 'Event: {event.type}' >> /tmp/events.log"]
}
```

| Token | Replaced with |
|---|---|
| `{env:VAR_NAME}` | Value of environment variable (empty string if unset) |
| `{event.type}` | The event type string (e.g. `session.idle`) |
| `{event.properties.xxx}` | Dot-path into the event object |
| `{event}` | JSON-stringified entire event object |

### Execution

Commands run via [Bun's shell API](https://bun.sh/docs/runtime/shell), which is cross-platform and prevents shell injection by default. Commands are run with `.nothrow().quiet()` so failures are logged (via `client.app.log`) rather than thrown.

### Example config

See [`opencode-event-shell-exec.example.json`](./opencode-event-shell-exec.example.json) for a full example.

## Development

```bash
bun install
bun test
bun run typecheck
```

## License

MIT
