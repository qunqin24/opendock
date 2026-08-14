# OpenCodeUsage

An OpenCode plugin that surfaces local usage statistics (sessions, messages, tokens, cost, model/tool breakdown) and reserves a hook for cloud plan/remaining-quota information once OpenCode exposes a public API for it.

## Install

Add the plugin to your OpenCode config (`opencode.json` or `~/.config/opencode/opencode.json`):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-usage-stats"]
}
```

OpenCode will install the npm package automatically on startup.

## Use

The plugin provides both a TUI sidebar panel and a slash command.

### TUI sidebar

When OpenCode starts, a small **Usage** panel appears in the right sidebar showing the current session's live stats:

- Messages
- Cost
- Tokens
- Top model

It updates automatically as new assistant messages arrive.

### Slash command

Run the slash command in any session:

```
/usage
```

Or ask the agent:

```
Show my OpenCode usage
```

This returns a markdown summary of all sessions, messages, tokens, cost, model/tool breakdown.

## Configuration

```json
{
  "plugin": ["opencode-usage-stats"],
  "opencode-usage-stats": {
    "enableCloudApi": false,
    "cloudApiUrl": "https://console.opencode.ai/api/usage",
    "apiKey": ""
  }
}
```

- `enableCloudApi`: When `true`, the plugin attempts to fetch cloud plan/usage data. Currently this is a placeholder because OpenCode does not expose a public usage API.
- `cloudApiUrl`: Reserved URL for the future cloud usage endpoint.
- `apiKey`: Reserved API key for the future cloud usage endpoint.

## Data sources

- **C-1 (enabled by default)**: Aggregates local usage by reading the running OpenCode session list via the OpenCode SDK (`client.session.list()` / `client.session.messages()`).
- **C-2 (placeholder)**: Will call the configured cloud usage API when OpenCode releases a public endpoint. Until then, it is disabled and the plugin reports the limitation.

## Repository

https://github.com/QianYuan1437/OpenUsage

## License

MIT
