# opencode-session-manager

OpenCode plugin for querying, reading, summarizing, and opening local OpenCode
session history.

## Features

- List sessions as a table or JSON.
- Summarize a session with message counts and the latest prompt/response.
- Read session messages with optional tool/message parts.
- Ask a running OpenCode TUI to open a specific session.

## Installation

Install as a remote OpenCode plugin after the package is published to npm:

```bash
opencode plugin @ratteeth1/opencode-session-manager@latest
```

For global installation:

```bash
opencode plugin @ratteeth1/opencode-session-manager@latest --global
```

OpenCode resolves the plugin through the package `./server` export.

## Tools

### `session_list`

Lists sessions from the current OpenCode instance.

Arguments:

- `format`: `"table"` or `"json"`
- `limit`: maximum number of sessions
- `search`: optional title/id search string

### `session_summary`

Summarizes one session.

Arguments:

- `sessionID`: OpenCode session id such as `ses_...`
- `maxMessages`: maximum number of messages to inspect

### `session_read`

Reads one session.

Arguments:

- `sessionID`: OpenCode session id such as `ses_...`
- `limit`: maximum number of messages to render
- `includeParts`: include message/tool parts when available

### `session_open`

Requests the current OpenCode TUI to select a session.

Arguments:

- `sessionID`: OpenCode session id such as `ses_...`

## License

MIT
