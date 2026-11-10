# Fledly for AI agents

[Fledly](https://fledly.app) is iOS App Store market data for indie developers: young apps that already earn money, app ideas scored from market data, top charts, App Store keyword research and daily rank tracking. This repo connects your AI agent to Fledly's hosted MCP server (`https://fledly.app/mcp`) and adds a skill that tells the agent which Fledly tool answers which question.

Sign in with your Fledly account the first time a tool runs. A free account works, and there is no API key to paste.

## Install

| You use | Install |
| --- | --- |
| Claude.ai, Claude Desktop | Settings > Connectors: add Fledly from the directory, or add a custom connector with `https://fledly.app/mcp` |
| Claude Code | `claude mcp add --transport http fledly https://fledly.app/mcp`, or the plugin: `/plugin marketplace add synthentica/fledly`, then `/plugin install fledly@fledly` |
| Cursor | Add the server to `~/.cursor/mcp.json` (below) |
| Hermes Agent | `hermes plugins install synthentica/fledly --no-enable`, then `hermes plugins enable fledly` |
| OpenCode | `opencode plugin opencode-fledly` |
| Any agent with skills (Cursor, Codex, Claude Code and others) | `npx skills add synthentica/fledly` (the skill only; add the MCP server too) |
| ChatGPT and other MCP clients | Add a remote MCP server or connector with `https://fledly.app/mcp` |

### Cursor

`~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "fledly": { "url": "https://fledly.app/mcp" }
  }
}
```

Open Cursor Settings > MCP and sign in to Fledly when Cursor asks.

### Hermes Agent

You need Hermes Agent 0.21.6 or newer and Node.js 20 or newer with `npx` on your `PATH`.

```bash
hermes plugins install synthentica/fledly --no-enable
hermes plugins enable fledly
```

Start a new session. The first time the server starts, your browser opens the Fledly sign-in page; sign in and approve. The token is kept and refreshed, so you sign in once. If the tools don't show up after you sign in, run `/reload-mcp`.

The Hermes package is `plugin.json`, `mcp.json` and the skill in `skills/fledly/`. It ships no code of its own. Before you install, know that:

- `mcp.json` runs the pinned `mcp-remote@0.15.2` through `npx`, which downloads it from npm on first use. It opens a local callback port for the sign-in and stores the OAuth tokens in `~/.mcp-auth`.
- Every tool call goes to `fledly.app` and acts on your own Fledly account. The server decides the tool set at runtime, so the pinned commit doesn't cover it.
- `track_app`, `track_keywords`, `untrack_keyword`, `track_competitor`, `untrack_competitor` and `save_idea` change your tracked apps, searches, competitors and saved ideas. The other tools only read. Nothing spends money.
- The package sends no telemetry.

Without the plugin, add the server to `~/.hermes/config.yaml` and Hermes signs in with its own OAuth client:

```yaml
mcp_servers:
  fledly:
    url: "https://fledly.app/mcp"
    auth: oauth
```

### OpenCode

```sh
opencode plugin opencode-fledly
```

or add it to `opencode.json` (project) or `~/.config/opencode/opencode.json` (global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-fledly"]
}
```

Restart OpenCode. The first Fledly tool call opens the sign-in page; you can also sign in ahead of time with `opencode mcp auth fledly`. `opencode mcp list` shows the connection, `opencode mcp logout fledly` signs out. Without the plugin:

```json
{
  "mcp": {
    "fledly": { "type": "remote", "url": "https://fledly.app/mcp" }
  }
}
```

## Try

- "Which iPhone apps released this year already earn over $50k a month in the US?"
- "Show Fledly's top proven app ideas I could build alone, and the apps that prove each one."
- "Where does my app rank for 'gym log' in the US, and which searches should I target next?"
- "Check my title, subtitle and keyword field against Apple's limits and build a better keyword field."
- "What did my competitors change in their App Store listings this week?"

## What's in this repo

| Path | For |
| --- | --- |
| `skills/fledly/SKILL.md` | The skill, shared by every client |
| `plugin.json`, `mcp.json` | Agent Plugins v1 package (Hermes Agent, Cursor) |
| `.mcp.json`, `.claude-plugin/` | Claude Code plugin and marketplace |
| `index.js`, `package.json` | The `opencode-fledly` npm package for OpenCode |

Tools, data coverage and privacy: https://fledly.app/docs/mcp/. Support: hello@fledly.app.

## License

MIT
