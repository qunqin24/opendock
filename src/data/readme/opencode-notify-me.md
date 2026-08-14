# OpenCode Notify Me

[![npm version](https://badge.fury.io/js/opencode-notify-me.svg)](https://www.npmjs.com/package/opencode-notify-me)

Sound and toast notifications for [OpenCode](https://opencode.ai). Know when the AI finishes, needs you, or hits an error — without staring at your terminal.

## Why

You delegate a task and switch to another window. Now you're checking back every 30 seconds. Did it finish? Did it error? Is it waiting for permission?

This plugin solves that:

- **Stay focused** — Work in other apps. A sound + toast arrives when the AI needs you.
- **Three states** — Success (task done), Attention (input needed), Error (something broke).
- **Cross-platform** — Works on macOS, Linux, and Windows.
- **Custom sounds** — Use your own MP3s or fall back to system sounds.

## Installation

```bash
npm i opencode-notify-me
```

Add to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-notify-me"]
}
```

OpenCode auto-installs on startup. No manual steps needed.

## Configuration

Create `~/.config/opencode/alert.json`:

```json
{
  "soundEnabled": true,
  "toastEnabled": true,
  "sounds": {
    "success": "~/.config/opencode/sounds/success.mp3",
    "attention": "~/.config/opencode/sounds/attention.mp3",
    "error": "~/.config/opencode/sounds/error.mp3"
  }
}
```

Or use env vars (take precedence):
- `OPENCODE_ALERT_DISABLE_SOUND=1`
- `OPENCODE_ALERT_DISABLE_TOAST=1`
- `OPENCODE_ALERT_DISABLE_ALL=1`

## Platform Support

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| Custom MP3 sounds | Yes (`afplay`) | Yes (`paplay`/`ffplay`) | Yes (WMP COM / `ffplay`) |
| System sound fallback | Yes | Yes | Yes |
| Toast notifications | Yes (`osascript`) | Yes (`notify-send`) | Yes (PowerShell) |

## License

MIT © 2026 Lucas Malizia
