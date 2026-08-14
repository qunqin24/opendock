# TaskSync

**Human-in-the-loop feedback for AI coding agents.** Pause your agent mid-task, give it new directions, attach screenshots, and keep it on track — without restarting the conversation.

**Reply from anywhere.** Enable Remote Mode and get Telegram notifications when your agent needs input. Tap a quick-reply button or type a response from your phone — the agent picks up instantly.

## Quick Start

```bash
npx tasksync-mcp-http
```

Server starts on port 3011 (MCP) and 3456 (web UI). Open `http://localhost:3456` to see the feedback dashboard.

## OpenCode Plugin (Recommended)

The **[opencode-tasksync](https://www.npmjs.com/package/opencode-tasksync)** plugin is the best way to use TaskSync. Add one line to your OpenCode config:

```json
{
  "plugin": ["opencode-tasksync"]
}
```

**What the plugin gives you that raw MCP can't:**

- **Zero-config agent behavior** — A `daemon` agent is injected automatically with the complete feedback loop protocol. No prompt pasting, no manual setup.
- **Augment any agent** — Add feedback loops to your existing `coder`, `ask`, `build` agents with one config line. They start calling `get_feedback` between tasks.
- **Unbreakable connections** — SSE transport with 30s keepalives and automatic reconnection (exponential backoff up to 15s). Server restarts, network blips — the agent never notices.
- **Native image support** — Attached images appear directly in the LLM conversation via OpenCode's `tool.execute.after` hook. No temp files, no workarounds.
- **Remote Mode** *(OpenCode exclusive)* — The plugin captures the agent's latest response and forwards it to Telegram. You see what the agent is asking and can reply without touching your laptop.
- **FYI status updates** — When the agent works for 30+ seconds without asking for feedback, you get a status update on Telegram so you know it's still making progress.

**How the plugin makes this possible:** It hooks into OpenCode's event system — `experimental.text.complete` for capturing agent context, `tool.execute.after` for native image injection, and the config hook for automatic agent/prompt injection. The SSE connection lives inside the tool's `execute()` function, which is a regular async function that can do anything before returning a string. All of this happens transparently — agents just call `get_feedback` and get back your response.

See the **[OpenCode Plugin Guide](docs/OPENCODE_PLUGIN.md)** for configuration, agent augmentation, and remote mode setup.

## MCP Server (Universal)

For **VS Code Copilot, Claude Desktop**, or any MCP-compatible client — connect directly to the MCP endpoint.

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "tasksync": {
      "url": "http://localhost:3011/mcp"
    }
  }
}
```

Or for OpenCode in MCP mode (`opencode.json`):

```json
{
  "mcp": {
    "tasksync": {
      "type": "remote",
      "url": "http://localhost:3011/mcp"
    }
  }
}
```

MCP gives you the `tasksync_get_feedback` tool with full image support (`ImageContent` blocks). You'll need to provide the daemon agent prompt manually — see `prompts/` for ready-to-use templates.

## How It Works

1. Agent calls `get_feedback` and blocks
2. You see the waiting session in the web UI at `http://localhost:3456`
3. Type your feedback, attach images if needed, and submit
4. Agent receives your response and continues working
5. Repeat — the agent stays in a feedback loop until you tell it to stop

## Feedback UI

The web dashboard at `http://localhost:3456` provides:

- **Multi-session support** — Route feedback to different agent sessions
- **Image attachments** — Paste, drag-drop, or file-pick images
- **Markdown toolbar** — Bold, italic, code, lists, headings with keyboard shortcuts
- **Live status** — See which sessions are waiting, idle, or have queued feedback
- **Desktop notifications** — Get alerted when an agent is waiting
- **Remote mode toggle** — Enable/disable Telegram notifications per session
- **Session management** — Rename, prune stale, delete sessions

See **[Feedback UI Guide](docs/FEEDBACK_UI_GUIDE.md)** for details.

## Remote Mode (Telegram)

Get notified on Telegram when agents are waiting for feedback, and reply directly from your phone.

### Setup

1. Create a Telegram bot via [@BotFather](https://t.me/botfather) and copy the token
2. Set the token:
   ```bash
   # .env file (recommended)
   TASKSYNC_TELEGRAM_BOT_TOKEN=your-bot-token-here

   # or CLI flag
   npx tasksync-mcp-http --telegram-token=your-bot-token-here
   ```
3. Start the server, then send `/start` to your bot in Telegram
4. Enable remote mode per session via the web UI toggle

When an agent calls `get_feedback`, you'll receive a Telegram message with the agent's question and quick-reply buttons (Approve / Reject / Continue / Stop / Pause). Reply with text or tap a button — the feedback goes straight to the agent.

> **One bot per server.** Telegram only allows one process to poll for updates per bot token. If you run multiple TaskSync servers, create a separate bot for each via [@BotFather](https://t.me/botfather).

## CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--port=<n>` | `3011` | MCP Streamable HTTP port |
| `--ui-port=<n>` | `3456` | Feedback UI port |
| `--telegram-token=<tok>` | — | Telegram bot token for remote notifications |
| `--heartbeat` | off | Enable legacy `[WAITING]` timeout mode |
| `--timeout=<ms>` | `3600000` | Wait timeout (only with `--heartbeat`) |
| `--no-ui` | off | Disable embedded feedback UI |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `TASKSYNC_TELEGRAM_BOT_TOKEN` | Telegram bot token (alternative to CLI flag) |
| `TASKSYNC_TELEGRAM_CHAT_IDS` | Pre-authorized Telegram chat IDs (comma-separated) |
| `TASKSYNC_LOG_LEVEL` | `debug`, `info`, `warn`, `error` (default: `info`) |
| `TASKSYNC_LOG_FILE` | Path to log file (default: stderr) |

A `.env` file in the project root is loaded automatically. See `.env.example` for all options.

## Updating

### Server

```bash
npm install -g tasksync-mcp-http@latest
```

If you run via `npx`, just restart — `npx` fetches the latest version automatically.

### OpenCode Plugin

OpenCode caches npm plugins locally in `~/.cache/opencode/`. Restarting OpenCode does **not** fetch the latest version — it reuses the cache. To update:

```bash
rm -rf ~/.cache/opencode/packages/opencode-tasksync@latest
```

Then restart OpenCode. It will re-install the latest version on startup.

## Building from Source

```bash
git clone https://github.com/vikrant82/tasksync-mcp.git
cd tasksync-mcp
npm install && npm run build
node dist/index.js
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Current module map and Excalidraw architecture diagram
- [OpenCode Plugin Guide](docs/OPENCODE_PLUGIN.md) — Plugin setup, configuration, agent augmentation, remote mode
- [API Specification](docs/API_SPEC.md) — MCP tools, HTTP endpoints, REST API
- [Session Workflow](docs/SESSION_WORKFLOW.md) — Session lifecycle and routing
- [Feedback UI Guide](docs/FEEDBACK_UI_GUIDE.md) — Web UI features and controls
- [Examples](docs/examples/) — Curl commands, client configs, multi-session flows

## License

MIT
