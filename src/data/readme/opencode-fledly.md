# opencode-fledly

[Fledly](https://fledly.app) for [OpenCode](https://opencode.ai): ask your coding agent which new iPhone apps are making money right now, which app ideas the market already proves, and where your own app ranks in App Store search.

The plugin adds the hosted Fledly MCP server (`https://fledly.app/mcp`) and a skill that tells the agent which tool answers which question. No API key: you sign in with your Fledly account the first time a tool runs. A free account works.

## Install

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

Restart OpenCode. The first Fledly tool call opens the sign-in page; you can also sign in ahead of time with `opencode mcp auth fledly`. `opencode mcp list` shows the connection, `opencode mcp logout fledly` signs out.

## Without the plugin

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

Tools, data coverage and privacy: https://fledly.app/docs/mcp/. Support: hello@fledly.app.
