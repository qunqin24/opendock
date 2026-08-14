# OpenCode Hyprland Notifier Plugin

Desktop notifications for OpenCode via `notify-send`. Get notified when OpenCode needs input, finishes processing, or completes tasks.

[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![OpenCode](https://img.shields.io/badge/OpenCode-plugin-brightgreen)](https://opencode.ai/docs/plugins/)

## What It Does

Sends a single desktop notification when:
- **Idle** - OpenCode finishes and waits for your input (e.g., after printing output)
- **Permission** - OpenCode needs approval for an action
- **Session/Task Complete** - A session or task finishes

Only one idle notification is sent until you interact again, preventing notification spam.

## Installation

**Option 1: Copy directly**
```bash
git clone https://github.com/lprior-repo/opencode-hypr-notifier.git
cp opencode-hypr-notifier/src/hypr-notifier.ts ~/.config/opencode/plugin/
```

**Option 2: npm**

Add to `opencode.json`:
```json
{
  "plugin": ["opencode-hypr-notifier"]
}
```

## Requirements

- `notify-send` (Debian: `apt install libnotify-bin`, Arch: `pacman -S libnotify`)
- A notification daemon (dunst, mako, swaync, etc.)
- OpenCode 1.0+

## Configuration

Optional. Create `~/.config/opencode/opencode-hyprland.json`:

```json
{
  "notification": true,
  "timeout": 15000,
  "transient": false,
  "urgency": {
    "permission": "critical",
    "session": "normal",
    "idle": "normal"
  },
  "messages": {
    "permission": "OpenCode Needs Your Attention",
    "session": "OpenCode Session Idle",
    "idle": "OpenCode Waiting for Input"
  },
  "icons": {
    "permission": "dialog-password",
    "session": "emblem-ok-symbolic",
    "idle": "dialog-information"
  }
}
```

| Option | Default | Description |
|--------|---------|-------------|
| `notification` | `true` | Enable/disable notifications |
| `timeout` | `15000` | Display time (ms) |
| `transient` | `false` | Don't persist in history |
| `urgency.*` | varies | `"low"`, `"normal"`, `"critical"` |
| `messages.*` | varies | Notification title |
| `icons.*` | varies | Icon name |

## Events

| Event | When | Default Urgency |
|-------|------|-----------------|
| `session.idle` | OpenCode waiting for input | Normal |
| `permission.updated` | Needs user approval | Critical |
| `session.complete` | Session finishes | Normal |
| `task.complete` | Task finishes | Normal |

## License

MIT
