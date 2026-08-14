# opencode-token-usage-footer

[English](README.md) | [简体中文](README.zh-CN.md)

A responsive OpenCode TUI footer that shows token volume, cache hit rate, input,
output, reasoning, cache usage, cost, and descendant session count.

## Requirements

- OpenCode 1.18.5 or newer
- OpenCode TUI

## Install

Add the npm package to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-token-usage-footer"]
}
```

If other TUI plugins are already configured, append this package to the
existing `plugin` array. Restart OpenCode after changing the configuration.

## Display

The footer adapts to terminal width:

- Compact: total token volume and cache hit rate
- Medium: input, output, and cost
- Wide: reasoning, cache read/write, and session count

Usage includes the current session and all descendant or subagent sessions.
The footer refreshes after relevant OpenCode events and polls every two seconds
while a session is open.

## Privacy

The plugin only reads session statistics through the local OpenCode TUI API. It
does not send data to an external service and does not require credentials.

## Development

```sh
npm install
npm run typecheck
npm pack --dry-run
```

## License

MIT
