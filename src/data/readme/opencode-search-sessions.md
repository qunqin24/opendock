# opencode-search-sessions

Incremental full-text search for OpenCode session history.

`opencode-search-sessions` builds a local SQLite FTS5 index of your session content and adds a fast TUI search command. It searches prompts, replies, summaries, and optionally tool input — across all projects and subagent sessions.

![npm](https://img.shields.io/npm/v/opencode-search-sessions)
![license](https://img.shields.io/badge/license-MIT-blue)

## Why

OpenCode's built-in session picker searches **titles only**. This plugin indexes the actual conversation content:

- user prompts and queued prompts
- assistant replies
- compaction summaries
- synthetic and skill messages
- tool inputs (optional; enabled by default)

It does **not** re-index everything on every launch. It tracks changes at three levels:

1. **Session** — skip sessions whose `time.updated` has not changed.
2. **Message** — hash each message and skip unchanged messages.
3. **Part** — hash each text part and only upsert changed parts.

## Requirements

- OpenCode **V2** (tested with `2.0.26`)
- Linux or macOS
- Windows via WSL
- Bun is bundled with OpenCode; no separate Bun install is required for users

## Install

### npm (recommended)

```bash
opencode plugin add opencode-search-sessions
```

Restart OpenCode. The TUI component loads automatically.

Or add it manually to your global or project `opencode.json`:

```json
{
  "plugins": ["opencode-search-sessions"]
}
```

Use **`plugins`** (plural) — that is the V2 field.

### CLI-only / remote server

Add it to `cli.json` instead:

```json
{
  "plugins": ["opencode-search-sessions"]
}
```

With options:

```json
{
  "plugins": [
    {
      "package": "opencode-search-sessions",
      "options": {
        "includeToolInput": true,
        "includeToolOutput": false,
        "includeShell": false,
        "includeReasoning": false,
        "includeSystem": false,
        "includeSubagents": true
      }
    }
  ]
}
```

### From GitHub

```bash
opencode plugin add github:RFV/opencode-search-sessions
```

### Local development

Clone the repo, then point OpenCode at the absolute path:

```json
{
  "plugins": ["/absolute/path/to/opencode-search-sessions"]
}
```

Restart the TUI after changing the config.

## Demo

```text
Ctrl+X F
> keybinds

Sessions matching “keybinds”
  Opencode session search options...   36 matches · just now
  ...
```

## Usage

| Action | Shortcut |
|---|---|
| Search session content | `Ctrl+X F` |
| Slash command | `/search-sessions keybinds` |
| Short alias | `/find keybinds` |
| Search with a prompt | `Ctrl+X F`, then type a query |

Results are grouped by session. Each row shows the best matching snippet, the number of matches, the project, and the last update time. Press **Enter** to open that session.

Examples:

```text
/search-sessions keybinds
/search-sessions "exact phrase"
/search-sessions fts5 sqlite
/search-sessions keyb
```

Query behavior:

- multiple words are combined with `AND`
- quoted text is treated as a phrase
- bare words use prefix matching (`keyb` finds `keybinds`)
- matching is case-insensitive
- FTS operators typed by the user are treated as literal text

The result opens the session, not the exact message. Use OpenCode's message navigation to move within it.

## Maintenance commands

Open the command palette with `Ctrl+P` and search for:

- **Session search index stats** — counts, index size, last scan/write
- **Sync session search index** — check for changed sessions now
- **Rebuild session search index** — delete and rebuild the local index

The same actions are available from the command palette only; they are not slash commands.

## Configuration

All options are optional.

| Option | Default | Description |
|---|---:|---|
| `includeToolInput` | `true` | Index tool arguments/input |
| `includeToolOutput` | `false` | Index tool output/results |
| `includeShell` | `false` | Index shell commands and output |
| `includeReasoning` | `false` | Index assistant reasoning blocks |
| `includeSystem` | `false` | Index system messages |
| `includeSubagents` | `true` | Include child/subagent sessions |
| `debounceMs` | `750` | Delay before reconciling a changed session |
| `syncIntervalMs` | `300000` | Background metadata scan interval (0 disables) |
| `maxResults` | `30` | Maximum session results shown |
| `keybind` | `<leader>f` | Search keybinding (`Ctrl+X F` with default leader) |
| `dbPath` | XDG data path | Override the index database path |

`includeToolInput` can capture file contents, commands, and other sensitive data. Set it to `false` if that is not acceptable.

After changing indexing options, restart OpenCode and run **Rebuild session search index** from `Ctrl+P` so existing history is reindexed with the new scope.

## What gets indexed

By default:

- user prompts, including queued prompts
- assistant text
- compaction summaries and recent context
- synthetic and skill messages
- tool inputs
- subagent sessions

Not indexed by default:

- tool outputs
- shell commands/output
- reasoning blocks
- system messages

Per-part text is capped at 100,000 characters. File content in tool results is referenced by path, not indexed as a blob.

## How it works

The index lives at:

```text
~/.local/share/opencode/session-search/index.sqlite
```

If `XDG_DATA_HOME` is set, the path is under that directory instead. Override it with `dbPath` or `OPENCODE_SESSION_SEARCH_DB`.

The plugin:

- lists all sessions through the OpenCode client
- skips unchanged sessions by `time.updated`
- fetches changed sessions' messages in pages
- compares per-message and per-part hashes
- updates only changed rows in SQLite and FTS5
- listens to durable OpenCode events for live updates
- catches up on startup and after an event-stream reconnect
- optionally runs a lightweight session-list scan every 5 minutes

A first build of ~50 sessions / ~6,600 messages takes a few seconds on a local machine. Later launches skip unchanged sessions; only the active session is typically touched.

The index is derived data. Deleting it is always safe.

## Privacy and data

This plugin reads your local OpenCode session history and stores a text index locally.

- Index directory: `0700`
- Main database: `0600`
- No telemetry and no external network requests
- The plugin only talks to your configured OpenCode server
- Tool input indexing is enabled by default; disable it if your tool calls contain secrets
- Logs contain counts and session/message IDs, never message text

Delete the index at any time:

```bash
rm -rf ~/.local/share/opencode/session-search
```

If you use a remote OpenCode server, the index is built from that server's session data. Review your remote setup accordingly.

## Troubleshooting

### The plugin does not load

- Confirm OpenCode V2 and that the config uses `plugins` (plural).
- If you added it to `cli.json`, it will not appear in `opencode plugin list` (that list is for server plugins).
- Restart the TUI after changing the config.
- Check the OpenCode log at `~/.local/share/opencode/log/opencode.log` for plugin errors.

### No results

- Wait for the first index build to finish.
- Run **Sync session search index** from `Ctrl+P`.
- Check that the content type is enabled (tool output, shell, and reasoning are off by default).
- Try a simpler query; quoted phrases must match exactly.

### FTS5 / index open failed

The plugin needs SQLite FTS5 in Bun. Bun 1.4.x includes it. If the log reports `index open failed`, include the error when reporting an issue.

### The index is stale after an OpenCode update

Run **Rebuild session search index** from `Ctrl+P`, or delete the index directory and restart.

### Database is locked

Close other TUI instances using the same index, or wait a moment. The plugin uses WAL and a 5-second busy timeout.

### Logs

```text
/tmp/opencode/session-search.log
```

## Development

Install Bun if you do not already have it:

```bash
curl -fsSL https://bun.sh/install | bash
```

Then:

```bash
git clone https://github.com/RFV/opencode-search-sessions.git
cd opencode-search-sessions
bun install
bun test
bun run typecheck
```

The test suite covers extraction, FTS5 search, part updates/deletes, incremental indexer behavior, queued prompts, and subagent filtering.

To load the local checkout, add its absolute path to `opencode.json` or `cli.json` and restart the TUI.

## Related projects

- **OpenCode built-in session picker** — searches session titles only.
- **[opencode-session-search](https://github.com/arthurtyukayev/opencode-session-search)** — a V1 tool-based plugin that runs on-demand `LIKE` queries over a limited recent window. It is not a TUI search command and does not build an incremental index.
- **opencode-search-sessions** (this project) — V2 TUI plugin with an incremental SQLite FTS5 index over full session history.

## Compatibility

- OpenCode V2 (`@opencode/plugin`), tested with `2.0.26`
- Bun 1.4.x
- Linux, macOS, WSL

This is an early `0.1.x` release. The index schema is versioned and will rebuild automatically when it changes.

## License

MIT
