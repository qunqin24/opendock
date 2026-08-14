# opencode-cmem

OpenCode plugin for [claude-mem](https://github.com/thedotmack/claude-mem) — share persistent memory between Claude Code and OpenCode.

Both tools connect to the same worker (port 37777) and SQLite database (`~/.claude-mem/claude-mem.db`). Observations captured in Claude Code are searchable in OpenCode, and vice versa.

## Prerequisites

- [claude-mem](https://github.com/thedotmack/claude-mem) installed via Claude Code marketplace
- Worker running: `claude-mem worker start` (or `cd ~/.claude/plugins/marketplaces/thedotmack && npm run worker:start`)
- Verify: `curl http://127.0.0.1:37777/api/health`

## Install

### Option A: Local plugin (quickest)

```bash
npm run local:install
# or manually:
cp src/index.ts ~/.config/opencode/plugins/claude-mem.ts
```

Restart OpenCode. Done.

### Option B: npm plugin

```bash
bun install -g opencode-cmem
```

Then add the plugin to your OpenCode config (`opencode.json` in your project root):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-cmem"]
}
```

Restart OpenCode. The plugin will automatically connect to the claude-mem worker on `http://127.0.0.1:37777`.

## How it works

```
  ┌──────────────┐         ┌──────────────┐
  │  Claude Code  │         │   OpenCode   │
  │  (claude-mem  │         │  (opencode-  │
  │   hooks)      │         │   cmem)      │
  └──────┬───────┘         └──────┬───────┘
         │                        │
         │  POST /observations    │
         │  GET  /context/inject  │
         │  POST /summarize       │
         ▼                        ▼
  ┌──────────────────────────────────────┐
  │       claude-mem Worker :37777       │
  │       (localhost HTTP API)           │
  └──────────────┬───────────────────────┘
                 │
                 ▼
  ┌──────────────────────────────────────┐
  │  ~/.claude-mem/claude-mem.db (SQLite)│
  │  shared memory — both tools read &   │
  │  write to the same database          │
  └──────────────────────────────────────┘
```

Both Claude Code and OpenCode talk to the same worker over HTTP. The worker writes everything into a single SQLite database, so observations from one tool are immediately searchable in the other.

## Hook lifecycle

| Stage | Claude-mem hook | OpenCode hook | Worker API |
|---|---|---|---|
| 1. SessionStart | context-hook.js | `session.created` + `session.compacting` | `GET /api/context/inject` |
| 2. UserPrompt | new-hook.js | `chat.message` | tracks for summary |
| 3. PostToolUse | save-hook.js | `tool.execute.after` | `POST /api/sessions/observations` |
| 4. Stop | summary-hook.js | `session.idle` | `POST /api/sessions/summarize` |
| 5. SessionEnd | cleanup-hook.js | `session.idle` | `POST /api/sessions/complete` |

## LLM tools

| Tool | Description |
|---|---|
| `claude_mem_search` | Search past observations (with filters for type, date, concepts, files) |
| `claude_mem_get_observations` | Fetch full observation details by IDs |
| `claude_mem_timeline` | Recent session timeline (supports anchor-based view) |
| `claude_mem_save` | Manually save a memory |
| `claude_mem_status` | Worker health + stats |

## Config

| Env variable | Default | Description |
|---|---|---|
| `CLAUDE_MEM_WORKER_PORT` | `37777` | Worker API port |
| `CLAUDE_MEM_WORKER_URL` | `http://127.0.0.1:37777` | Full worker URL (overrides port) |
| `CLAUDE_MEM_LOG_LEVEL` | `info` | Log level: `error`, `warn`, `info`, `debug` |

## Development

```bash
bun install
bun test
bun run build
```

## Verify it works

1. Start the worker: `claude-mem worker start`
2. Install the plugin: `npm run local:install`
3. Restart OpenCode and do some work
4. Open `http://localhost:37777` — you should see observations from OpenCode sessions
5. In Claude Code, search for those observations — they should appear

## API reference

Based on [claude-mem Platform Integration Guide](https://docs.claude-mem.ai/platform-integration).

## Disclaimer

This project is not built by the OpenCode team and is not affiliated with Anomaly or the OpenCode project in any way.

## License

MIT
