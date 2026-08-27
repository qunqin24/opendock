# opencode-notify-crossx

Cross-platform desktop notifications for [opencode](https://opencode.ai) — get pinged when your run finishes or when input is needed.

Focus-aware: only pings when opencode is not the frontmost window, so you are not spammed while watching.

| Platform | Visual | Sound (off by default) | Focus check |
|----------|--------|------------------------|-------------|
| WSL (Windows) | PowerShell `Windows.UI.Notifications` toast | `SystemSounds` | `GetForegroundWindow` |
| macOS | `osascript` display notification | `afplay` | `System Events` frontmost |
| Linux | `notify-send` via libnotify | `paplay` | `xdotool` |

No sound by default — visual toast only. Set `sound: true` in code to re-enable.

## Install

```bash
npm i -g opencode-notify-crossx
# or for local install
npm i opencode-notify-crossx
```

Add to your opencode config:

`~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-notify-crossx"]
}
```

Or project-level `.opencode/opencode.json`:

```json
{
  "plugin": ["opencode-notify-crossx"]
}
```

Restart opencode.

## What triggers a ping

- `session.idle` → Run finished
- `session.error` → Run failed
- `permission.updated` / `permission.ask` → Input needed

Debounced per session/permission to avoid spam.

## Focus-aware

Only notifies when the terminal is not focused. If opencode is the frontmost window (Windows Terminal, VS Code, etc.), the ping is suppressed and logged as `suppressed (focused)`.

To notify even when focused, edit `index.js`:

```js
const CONFIG = {
  onlyWhenUnfocused: false, // always ping
  sound: false,
}
```

## Sound

Off by default per user request. To enable:

```js
const CONFIG = {
  sound: true,
}
```

## Local development (single-file plugin)

The same code also works as a single-file local plugin at `~/.config/opencode/plugins/notify.js` — no npm needed. See `index.js` source.

## How it works

- `isWsl()` checks `/proc/version` for `microsoft`/`wsl`
- `isTerminalFocused()` checks foreground window title via PowerShell on WSL/Windows, AppleScript on macOS, `xdotool` on Linux
- `sendDesktop()` tries `osascript` → PowerShell toast → `notify-send` in order
- `notify()` respects `CONFIG.onlyWhenUnfocused` and `CONFIG.sound`

## License

MIT

## Author

Davis Dey — first open source contribution, built live with opencode
