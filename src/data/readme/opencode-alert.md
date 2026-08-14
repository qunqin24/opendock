# opencode-alert

OS notifications for OpenCode. Alerts you when your agent needs attention — permission requests, questions, errors — so you don't have to watch the terminal.

## How It Works

The plugin watches OpenCode events and sends native terminal notifications:

- **Permission needed** — the agent wants to run a command that requires approval
- **Question asked** — the agent is waiting for your answer
- **Error** — something went wrong
- **Cancelled** — the session was aborted
- **Subagent done** — a delegated task completed (optional)
- **Session idle** — the agent stopped and is waiting for input (optional)

Notifications are suppressed when your terminal is already focused — no interruptions when you're already looking at the output.

## Install

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugin": ["opencode-alert"]
}
```

Restart OpenCode. Works immediately with sensible defaults — no configuration needed.

## Supported Terminals

The plugin auto-detects your terminal and routes notifications through the correct protocol:

| Terminal | Notification | Protocol |
|----------|:------------:|----------|
| **Ghostty** | ✓ | OSC 777 |
| **WezTerm** | ✓ | OSC 777 |
| **iTerm2** | ✓ | OSC 9 |
| **Kitty** | ✓ | OSC 99 |
| **Windows Terminal** | ✓ | PowerShell toast |
| **rxvt-unicode** | ✓ | OSC 777 |
| **foot** | ✓ | OSC 777 |
| **tmux** (inside a supported terminal) | ✓* | Passthrough + OSC |
| Terminal.app | ✗ | — |
| Alacritty | ✗ | — |
| Hyper | ✗ | — |

\* tmux requires passthrough enabled:

```tmux
set -g allow-passthrough on
```

### How protocol detection works

Detection is environment-variable based (most reliable across SSH, tmux, nested shells):

1. `WT_SESSION` → Windows toast
2. `KITTY_WINDOW_ID` → OSC 99
3. `TERM_PROGRAM=iTerm.app` or `ITERM_SESSION_ID` → OSC 9
4. Everything else → OSC 777

If your terminal isn't detected or doesn't support OSC notifications, the plugin writes the escape sequence silently — no crash, no visible garbage, just no notification.

### Focus suppression

When the terminal is focused, notifications are suppressed — you're already looking at the output. Focus detection works on:

- **macOS** — AppleScript (checks frontmost app via System Events)
- **Linux (X11)** — xdotool + procfs

On Wayland, focus detection is not yet supported — notifications will always send.

Set `"terminal": "ghostty"` (or any terminal name) in config to override auto-detection if it fails.

## Configuration

A default config file is created automatically on first run at `~/.config/opencode/opencode-alert.json`. Edit it to customise:

```json
{
  "sounds": {
    "idle": "/System/Library/Sounds/Tink.aiff",
    "permission": "/System/Library/Sounds/Glass.aiff",
    "question": "/System/Library/Sounds/Glass.aiff",
    "error": "/System/Library/Sounds/Basso.aiff"
  },
  "quietHours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  },
  "notifyChildSessions": false,
  "terminal": null,
  "notifyOnIdle": true,
  "suppressWhenFocused": true,
  "soundCommand": null
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sounds.idle` | string | `"/System/Library/Sounds/Tink.aiff"` | macOS sound for idle/completed. Set to `""` to disable. |
| `sounds.permission` | string | `"/System/Library/Sounds/Glass.aiff"` | macOS sound for permission requests. |
| `sounds.question` | string | `"/System/Library/Sounds/Glass.aiff"` | macOS sound for questions. |
| `sounds.error` | string | `"/System/Library/Sounds/Basso.aiff"` | macOS sound for errors. |
| `soundCommand` | string \| null | `null` | Shell command to run alongside built-in sounds (any platform). |
| `quietHours.enabled` | boolean | `false` | Suppress all notifications during quiet hours. |
| `quietHours.start` | string | `"22:00"` | Quiet hours start (HH:MM). |
| `quietHours.end` | string | `"08:00"` | Quiet hours end (HH:MM). |
| `notifyChildSessions` | boolean | `false` | Notify when subagent tasks complete. |
| `terminal` | string \| null | `null` | Override terminal detection. |
| `notifyOnIdle` | boolean | `true` | Notify when agent stops without requesting input. |
| `suppressWhenFocused` | boolean | `true` | Skip notifications when terminal is focused. |

### Sounds

The `sounds.*` options are **macOS only** — they run via `afplay` and expect a path to a `.aiff` file. Set any sound to `""` to disable it. No-op on other platforms.

The `soundCommand` option runs a shell command alongside the built-in sounds on **any platform**. Useful for Linux/Windows or custom audio:

```bash
# Linux — play a freedesktop sound
"soundCommand": "paplay /usr/share/sounds/freedesktop/stereo/complete.oga"

# macOS — custom sound
"soundCommand": "afplay ~/Library/Sounds/Custom.aiff"

# Windows — system beep
"soundCommand": "powershell -NoProfile -Command \"[console]::beep(880,180)\""
```

You can also set it via environment variable: `OPENCODE_ALERT_SOUND_CMD`. Config file takes precedence.

## Notification Behaviour

**Debounce:** When a specific event fires (permission, error, question), the plugin marks that session. If a generic `session.idle` fires within 3 seconds for the same session, the idle notification is suppressed. This prevents duplicate "completed" notifications after permission prompts.

**Quiet hours:** Supports overnight spans (e.g., 22:00–08:00). All notifications are suppressed during quiet hours.

**tmux:** OSC sequences are wrapped in DCS passthrough (`\ePtmux;...\e\\`) when `$TMUX` is set. The plugin also resolves the tmux client's real TTY to write to the correct terminal.

## What's OSC 777/9/99?

OSC = Operating System Command, part of ANSI escape sequences. Terminals use these for things beyond text formatting — changing titles, colours, clipboard, and notifications.

- **OSC 777** — originated in rxvt-unicode for notifications. Adopted by Ghostty and WezTerm.
- **OSC 9** — iTerm2's notification protocol.
- **OSC 99** — Kitty's notification protocol, more extensible with title/body parts.

## Known Limitations

- **Terminal.app, Alacritty, Hyper** — no OSC notification support. Notifications are silently dropped.
- **tmux** — requires `set -g allow-passthrough on` in your tmux config.
- **zellij / screen** — not yet supported for OSC passthrough.
- **Wayland (Linux)** — focus detection doesn't work yet. Notifications always send, which is harmless.

## License

MIT
