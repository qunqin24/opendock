# opencode-ghostty-notify

An [OpenCode](https://opencode.ai) plugin that plays a system sound when your session goes idle. Perfect for Ghostty terminal users who want an audio notification when OpenCode finishes a long-running task.

## Features

- 🔔 Plays terminal bell (`\a`) — works in any terminal including Ghostty
- 🎵 Plays macOS Glass sound effect (macOS only, fails silently elsewhere)
- ⚡ Zero configuration — just install and go
- 🎯 Triggers on `session.idle` event

## Installation

```bash
npm install -g opencode-ghostty-notify
```

## Usage

Add to your OpenCode configuration (`.opencode/config.json`):

```json
{
  "plugins": [
    "opencode-ghostty-notify"
  ]
}
```

## How it works

When OpenCode detects that a session has gone idle (all tasks completed), this plugin:

1. Sends a terminal bell character (`\a`) — visible as a notification dot in Ghostty's dock icon
2. Plays the macOS "Glass" sound effect (if on macOS)

## Platform support

| Platform | Terminal Bell | Glass Sound |
|----------|---------------|-------------|
| macOS    | ✅            | ✅          |
| Linux    | ✅            | ❌ (silent) |
| Windows  | ✅            | ❌ (silent) |

## Requirements

- OpenCode CLI >= 1.0.0
- Node.js >= 18

## License

MIT

## Related

- [OpenCode Plugins](https://docs.opencode.ai/plugins)
- [Ghostty Terminal](https://ghostty.org)
