![screenshot](screenshot.png)

# opencode-simple-notify

Desktop notification plugin for [OpenCode](https://opencode.ai).

Sends native desktop notifications when:
- **Session completes** — shows project name, elapsed time, and your last message as preview
- **Session errors** — alerts when something goes wrong
- **Permission requested** — notifies when OpenCode needs approval
- **Waiting for input** — notifies when OpenCode asks you a question / presents choices

## Platform Support

| Platform | Method | Requirements |
|----------|--------|-------------|
| Linux (Wayland/X11) | `dbus-send` (freedesktop Notifications) | A notification daemon (dunst, mako, swaync, fnott, etc.) |
| macOS | `osascript` | None (built-in) |

## Install

### From npm

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-simple-notify"]
}
```

### From local file

Copy `index.js` to your plugin directory:

```bash
# Global
cp index.js ~/.config/opencode/plugins/notify.js

# Project-level
cp index.js .opencode/plugins/notify.js
```

## Notification Examples

```
┌─────────────────────────────────────┐
│  my-project done (2m35s)            │
│  帮我写一个排序函数                    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  OpenCode needs approval            │
│  Permission: bash                   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  OpenCode waiting                   │
│  选择发布方式                         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  my-project error                   │
│  session encountered an error       │
└─────────────────────────────────────┘
```

## License

MIT
