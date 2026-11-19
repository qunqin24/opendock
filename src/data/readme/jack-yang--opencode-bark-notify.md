# opencode-bark-notify

[Bark](https://github.com/Finb/Bark) push notifications for [OpenCode](https://opencode.ai).

Get **detailed agent messages** on your iPhone: task finished, permission needed, or a question waiting for you.

## Features

- **Detailed content** — Sends the agent's actual last message, not just "task completed"
- **Category badges** — iOS subtitle shows what happened: ✅ Responded / 🔐 Wait for Permission / ❓ Input Needed / ❌ Error
- **Markdown replies** — Headings, lists and code blocks keep their formatting
- **Auto-dismiss** — Answer a permission or question on the computer and its notification disappears from the phone
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
| `expireAfter` | string \| number | *(permanent)* | Auto-delete notifications after this long, e.g. `"5m"`, `"30m"`, `"1h"`, `"24h"`, `"2d"`, `"90s"`. A bare number means minutes. `"permanent"` / `0` / unset = never delete |
| `markdown` | boolean | `true` | Send the reply as Markdown (Bark's [`markdown`](https://github.com/Finb/Bark/blob/master/docs/en-us/params.md#markdown) parameter) so its formatting is kept. A short plain-text `body` is still sent for older Bark versions |
| `autoDismiss` | boolean | `true` | Delete 🔐 / ❓ notifications from the phone once answered in opencode (Bark's [`id`](https://github.com/Finb/Bark/blob/master/docs/en-us/params.md#id) + [`delete`](https://github.com/Finb/Bark/blob/master/docs/en-us/params.md#delete)). Requires **Background App Refresh** for Bark in iOS settings |

> `expireAfter` maps to Bark's [`ttl`](https://github.com/Finb/Bark/blob/master/docs/en-us/params.md#ttl) parameter: when it expires, Bark deletes the history entry and removes the notification from Notification Center. It only applies to pushes saved to Bark's history (on by default).

### Example with all options

```json
{
  "plugin": [
    ["@jack-yang/opencode-bark-notify", {
      "barkKey": "YOUR_KEY",
      "barkUrl": "https://your-bark-server.com",
      "level": "active",
      "group": "my-agent",
      "expireAfter": "1h",
      "markdown": true,
      "autoDismiss": true
    }]
  ]
}
```

## Notification types

| Event | Badge | Body |
|-------|-------|------|
| Session complete | **✅ Responded** | The agent's last reply (up to 500 chars) |
| Permission request | **🔐 Wait for Permission** | Permission type + patterns |
| Question | **❓ Input Needed** | The question text |
| Session failed | **❌ Error** | The error message (sent instead of ✅; cancelling is not an error) |

## Pairing with desktop notifications

This plugin complements [@mohak34/opencode-notifier](https://github.com/mohak34/opencode-notifier) (desktop notifications). Use both together:

- **Desktop** (osascript/sound/bell) → on the computer
- **Bark** (iPhone push) → on your phone

This plugin always sends; if you want desktop notifications only when the terminal is in the background, set `suppressWhenFocused` in opencode-notifier.

## License

MIT
