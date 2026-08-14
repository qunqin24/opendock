# opencode-bark-notify

Focus-aware [Bark](https://github.com/Finb/Bark) push notifications for [OpenCode](https://opencode.ai).

Get **detailed agent messages** on your iPhone when you step away from your computer. When you're at the terminal, notifications are suppressed — no spam.

## Features

- **Focus-aware** — Suppresses notifications when your terminal is the frontmost app
- **Detailed content** — Sends the agent's actual last message, not just "task completed"
- **Category badges** — iOS subtitle shows what happened: ✅ Responded / 🔐 Wait for Permission / ❓ Input Needed
- **Session-aware** — Includes the session title in every notification
- **Zero dependencies** — Pure TypeScript, runs on Bun

## Prerequisites

- [Bark](https://apps.apple.com/app/id1403753865) app installed on iOS
- Your Bark device key (found in the Bark app homepage, e.g. `BrHXXCACzphzrB63kNJMFF`)

## Install

### Option 1: With config (recommended)

Add to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    ["@jack-yang/opencode-bark-notify", {
      "barkKey": "YOUR_BARK_DEVICE_KEY"
    }]
  ]
}
```

### Option 2: With env var

Add to your `~/.zshrc`:

```bash
export BARK_KEY="YOUR_BARK_DEVICE_KEY"
```

Then in `opencode.json`:

```json
{
  "plugin": ["@jack-yang/opencode-bark-notify"]
}
```

Restart OpenCode.

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `barkKey` | string | *(env: `BARK_KEY`)* | Bark device key (**required**) |
| `barkUrl` | string | `https://api.day.app` | Bark server URL (for self-hosted) |
| `level` | string | `timeSensitive` | iOS notification level |
| `group` | string | `opencode` | iOS notification group |
| `terminals` | string[] | `["Ghostty", "Terminal", "iTerm2", ...]` | Terminal app names for focus detection |

### Example with all options

```json
{
  "plugin": [
    ["@jack-yang/opencode-bark-notify", {
      "barkKey": "YOUR_KEY",
      "barkUrl": "https://your-bark-server.com",
      "level": "active",
      "group": "my-agent",
      "terminals": ["Ghostty", "WezTerm"]
    }]
  ]
}
```

## How focus detection works

On macOS, the plugin uses `osascript` to check if a terminal app is the frontmost application. If it is, notifications are suppressed — you're already looking at the terminal. If you've switched to another app or stepped away, notifications fire.

On non-macOS, focus detection is disabled (notifications always fire).

## Notification types

| Event | Badge | Body |
|-------|-------|------|
| Session complete | **✅ Responded** | Agent's last message (up to 500 chars) |
| Permission request | **🔐 Wait for Permission** | Permission type + patterns |
| Question | **❓ Input Needed** | The question text |

## Pairing with desktop notifications

This plugin complements [@mohak34/opencode-notifier](https://github.com/mohak34/opencode-notifier) (desktop notifications). Use both together:

- **Desktop** (osascript/sound/bell) → when at computer but in another app
- **Bark** (iPhone push) → when away from computer entirely

Both independently check focus, so there's no conflict.

## License

MIT
