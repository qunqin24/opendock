# Fledly for AI agents

[Fledly](https://fledly.app) is iOS App Store market data for indie developers: young apps that already earn money, app ideas scored from market data, top charts, App Store keyword research and daily rank tracking. This repo connects your AI agent to Fledly's hosted MCP server (`https://fledly.app/mcp`) and adds skills: one that tells the agent which Fledly tool answers which question, and twelve workflow skills (ASO audit, keyword research, metadata rewrite and more) that walk through the tool calls step by step.

Sign in with your Fledly account the first time a tool runs. A free account works, and there is no API key to paste.

## Install

| You use | Install |
| --- | --- |
| Claude.ai, Claude Desktop | Settings > Connectors: add Fledly from the directory, or add a custom connector with `https://fledly.app/mcp` |
| Claude Code | `claude mcp add --transport http fledly https://fledly.app/mcp`, or the plugin: `/plugin marketplace add synthentica/fledly`, then `/plugin install fledly@fledly` |
| Cursor | Install Fledly from the Cursor Marketplace, or add the server to `~/.cursor/mcp.json` (below) |
| Gemini CLI | `gemini extensions install https://github.com/synthentica/fledly`, then run `/mcp auth fledly` in Gemini CLI to sign in |
| Hermes Agent | `hermes plugins install synthentica/fledly --no-enable`, then `hermes plugins enable fledly` |
| OpenCode | `opencode plugin opencode-fledly` |
| Any agent with skills (Cursor, Codex, Claude Code and others) | `npx skills add synthentica/fledly` (the skills only; add the MCP server too) |
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

The Hermes package is `plugin.json`, `mcp.json` and the skills in `skills/`. It ships no code of its own. Before you install, know that:

- `mcp.json` runs the pinned `mcp-remote@0.15.2` through `npx`, which downloads it from npm on first use. It opens a local callback port for the sign-in and stores the OAuth tokens in `~/.mcp-auth`.
- Every tool call goes to `fledly.app` and acts on your own Fledly account. The server decides the tool set at runtime, so the pinned commit doesn't cover it.
- `track_app`, `track_keywords`, `untrack_keyword`, `track_competitor`, `untrack_competitor`, `save_idea`, `save_my_profile` and `mark_tip_done` change your tracked apps, searches, competitors, saved ideas, profile and tip status. The other tools only read. Nothing spends money.
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

## Skills

| Skill | Use it for |
| --- | --- |
| `fledly` | Which Fledly tool answers which question (the umbrella skill) |
| `fledly-aso-audit` | A scored review of your App Store listing and the fixes in order of impact |
| `fledly-keyword-research` | Which searches to target, how crowded each is, where you rank |
| `fledly-metadata-rewrite` | Title, subtitle and 100-byte keyword field within Apple's limits |
| `fledly-competitor-watch` | What competitors changed, where they outrank you, words they use that you don't |
| `fledly-app-idea-validation` | Build, consider or skip: young earners, prices, complaints and red flags for an idea |
| `fledly-launch-plan` | First listing, target searches and a launch-week checklist for a new app |
| `fledly-localization` | Which languages each App Store indexes and extra keyword fields from cross-localization |
| `fledly-weekly-review` | Monday check-in: what moved, what competitors did, what to do this week |
| `fledly-subscription-pricing` | What the niche charges and which pricing model earns |
| `fledly-market-pulse` | Top charts, new apps that earn and hot categories in one store |
| `fledly-my-numbers` | Your own App Store Connect downloads and proceeds and RevenueCat MRR, next to your listing changes (Pro, Studio) |
| `fledly-ai-visibility` | Whether ChatGPT, Claude and Gemini recommend your app, and which sources they cite (Pro, Studio) |

Revenue figures in every skill are Fledly estimates from chart positions, and the skills tell the agent to say so.

## Try

- "Which iPhone apps released this year already earn over $50k a month in the US?"
- "Show Fledly's top proven app ideas I could build alone, and the apps that prove each one."
- "Where does my app rank for 'gym log' in the US, and which searches should I target next?"
- "Check my title, subtitle and keyword field against Apple's limits and build a better keyword field."
- "What did my competitors change in their App Store listings this week?"

## What's in this repo

| Path | For |
| --- | --- |
| `skills/` | The skills, shared by every client |
| `plugin.json`, `mcp.json` | Agent Plugins v1 package (Hermes Agent) |
| `.cursor-plugin/`, `cursor-mcp.json` | Cursor Marketplace plugin (skill + hosted MCP server) |
| `claude/`, `.claude-plugin/marketplace.json` | Claude Code plugin (copy of the skills + hosted MCP server) and its marketplace |
| `.mcp.json` | Project MCP config for clients that read it from the repo root |
| `index.js`, `package.json` | The `opencode-fledly` npm package for OpenCode |
| `gemini-extension.json` | Gemini CLI extension (skill + hosted MCP server) |

Tools, data coverage and privacy: https://fledly.app/docs/mcp/. Support: hello@fledly.app.

## License

MIT
