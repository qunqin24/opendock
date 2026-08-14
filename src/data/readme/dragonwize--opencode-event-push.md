# opencode-event-push

An [OpenCode](https://opencode.ai) plugin that forwards a configurable set of events to one or more URLs via HTTP POST.

Use it to integrate OpenCode with webhooks, logging pipelines, monitoring systems, or any custom backend.

## Installation

Add the plugin to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@dragonwize/opencode-event-push"]
}
```

OpenCode installs the package automatically at startup using Bun. The package lands in:

```
~/.cache/opencode/node_modules/opencode-event-push/
```

## Configuration

The plugin reads `opencode-event-push.json` from two locations and **merges** them, mirroring how OpenCode itself handles its own config files:

| Location | Purpose |
|---|---|
| `~/.config/opencode/opencode-event-push.json` | Global config — applies to every project |
| `opencode-event-push.json` in the project root | Project config — applies only to that project |

Both files are optional. When both exist their `targets` arrays are concatenated — global targets come first, project targets are appended after them. This follows OpenCode's "merge, not replace" convention.

To get started with the global config, copy the bundled example and edit it:

```sh
cp ~/.cache/opencode/node_modules/@dragonwize/opencode-event-push/event-push.example.json \
   ~/.config/opencode/opencode-event-push.json
```

Then open the file and replace the placeholder URLs, events, and credentials.

### Config schema

```json
{
  "targets": [
    {
      "url": "https://your-endpoint.example.com/events",
      "events": ["session.idle", "session.error"],
      "retry": {
        "attempts": 3,
        "delayMs": 500
      },
      "headers": {
        "Authorization": "Bearer {env:MY_WEBHOOK_TOKEN}"
      }
    }
  ]
}
```

#### `targets` (required)

An array of target objects. Each target is independent — it gets its own URL, event filter, retry policy, and headers.

| Field | Required | Default | Description |
|---|---|---|---|
| `url` | yes | — | URL to `POST` events to |
| `events` | no | all events | Allowlist of event types to forward to this target. Omit or leave empty to receive all events. |
| `retry.attempts` | no | `3` | Maximum number of attempts (including the first try) |
| `retry.delayMs` | no | `500` | Base delay in ms between retries. Uses exponential backoff: `delayMs * 2^attempt` |
| `headers` | no | `{}` | Extra HTTP headers sent with every request to this target |

### Environment variable substitution

Any string value in either config file supports `{env:VAR_NAME}` substitution, matching the syntax OpenCode uses in its own `opencode.json`. The variable is replaced at startup with the value of the corresponding environment variable. If the variable is not set it is replaced with an empty string.

```json
{
  "targets": [
    {
      "url": "{env:WEBHOOK_URL}",
      "headers": {
        "Authorization": "Bearer {env:WEBHOOK_TOKEN}",
        "X-API-Key": "{env:API_KEY}"
      }
    }
  ]
}
```

This works in both the global config and the project config.

### Multiple targets

Each target filters and delivers events independently. One slow or failing target does not block the others — all targets for a given event are pushed in parallel.

```json
{
  "targets": [
    {
      "url": "https://webhook.example.com/opencode",
      "events": ["session.created", "session.idle", "session.error"],
      "headers": { "Authorization": "Bearer secret1" }
    },
    {
      "url": "https://logging.example.com/ingest",
      "events": ["tool.execute.after", "file.edited"],
      "headers": { "X-API-Key": "secret2" }
    },
    {
      "url": "https://catch-all.example.com/events"
    }
  ]
}
```

## Available events

Any event from the OpenCode plugin API can be forwarded. Common ones:

**Session:** `session.created` `session.updated` `session.deleted` `session.idle` `session.error` `session.status` `session.compacted` `session.diff`

**Message:** `message.updated` `message.removed` `message.part.updated` `message.part.removed`

**Tool:** `tool.execute.before` `tool.execute.after`

**File:** `file.edited` `file.watcher.updated`

**Permission:** `permission.asked` `permission.replied`

**Other:** `command.executed` `server.connected` `todo.updated` `lsp.updated` `lsp.client.diagnostics` `installation.updated` `tui.prompt.append` `tui.command.execute` `tui.toast.show` `shell.env`

## Payload format

Each event is POSTed as JSON with `Content-Type: application/json`. The payload is the raw event object from OpenCode, e.g.:

```json
{
  "type": "session.idle",
  "sessionID": "abc123",
  "properties": { ... }
}
```

## Testing

A test server is included that accepts incoming events and prints them live to the terminal with color-coded output.

### Start the test server

```sh
bun run test-server.ts
```

By default it listens on port `34567`. Pass an alternative port as the first argument:

```sh
bun run test-server.ts 9000
```

### Point the plugin at it

Add a target to your `~/.config/opencode/opencode-event-push.json` (the catch-all form with no `events` filter is most useful for testing):

```json
{
  "targets": [
    { "url": "http://localhost:34567" }
  ]
}
```

Then start OpenCode normally. Events will appear in the test server terminal as they fire.

### Send a test event manually

You can also POST events directly with `curl` to verify the server is running before starting OpenCode:

```sh
curl -X POST http://localhost:34567 \
  -H "Content-Type: application/json" \
  -d '{"type":"session.idle","sessionID":"test","properties":{"title":"hello"}}'
```

### Sample output

```
opencode-event-push test server
Listening on http://localhost:34567
Waiting for events…

────────────────────────────────────────────────────────────
[2026-02-27 10:00:01.234]  #1  session.idle
  sessionID="abc123"  properties={"title":"My session"}
  {
    "type": "session.idle",
    "sessionID": "abc123",
    "properties": {
      "title": "My session"
    }
  }
```

Event types are color-coded by namespace: `session.*` (cyan), `tool.*` (yellow), `message.*` (magenta), `file.*` (green), `permission.*` (red).

## Error handling

On a failed request the plugin retries with exponential backoff (500ms, 1000ms, 2000ms, …). After exhausting all attempts it logs a `warn`-level message via OpenCode's structured log — it does not throw or block the session in any way.

## Local plugin usage

If you prefer to use this as a local file plugin rather than via npm, drop `src/index.ts` into `.opencode/plugins/`. The global config is still read from `~/.config/opencode/opencode-event-push.json` and the project config from `opencode-event-push.json` in the project root.

## License

MIT
