# 🔔 opencode-sound-alert

> An [OpenCode](https://opencode.ai) plugin that plays pleasant Windows notification sounds whenever the AI is waiting for your input — so you can stay focused on other things and come back when it's your turn.

[![npm version](https://img.shields.io/npm/v/opencode-sound-alert)](https://www.npmjs.com/package/opencode-sound-alert)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows%2010%2F11-blue)](https://github.com/erielmiquilino/opencode-sound-alert)

---

## Why

When OpenCode is running a long task, it's easy to miss the moment it finishes and needs your attention. This plugin listens to OpenCode's event bus and plays a soft notification sound — similar to GitHub Copilot's tone — so you always know when to look back at the terminal.

## Sounds

Uses native Windows WAV files via `System.Media.SoundPlayer`. No third-party dependencies.

| Event               | Sound file                          | When it plays                                      |
|---------------------|-------------------------------------|----------------------------------------------------|
| `session.idle`      | `Windows Notify System Generic.wav` | AI finished a task or asked a question             |
| `permission.asked`  | `Windows Notify Messaging.wav`      | AI needs your approval to run an action            |
| `session.error`     | `Windows Notify.wav`                | Something went wrong in the session                |

Falls back to a dual-tone `[console]::beep` (ding-dong) if WAV playback is unavailable.

---

## Requirements

- **OpenCode** >= 1.4
- **Windows 10 or 11**
- **PowerShell** (built-in on Windows)
- **Bun** >= 1.0 (OpenCode's runtime)

---

## Installation

### Option 1 — Manual (recommended for now)

Copy `src/index.ts` into your OpenCode global plugins directory:

```powershell
# Run this in the repository root
Copy-Item src\index.ts "$env:USERPROFILE\.config\opencode\plugins\opencode-sound-alert.ts"
```

Restart OpenCode. That's it — plugins in `~/.config/opencode/plugins/` are loaded automatically.

### Option 2 — npm / bun (once published)

```bash
bun add -g opencode-sound-alert
# or
npm install -g opencode-sound-alert
```

Then add it to your `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-sound-alert"]
}
```

---

## Verifying the Installation

Inside OpenCode, run:

```
/status
```

You should see `opencode-sound-alert` listed under active plugins.

---

## Customizing Sounds

Edit the `WAV_FILE_MAP` in `src/index.ts`:

```ts
const WAV_FILE_MAP: Record<SoundType, string> = {
  idle:       "Windows Notify System Generic.wav",
  permission: "Windows Notify Messaging.wav",
  error:      "Windows Notify.wav",
};
```

Any `.wav` file in `%WINDIR%\Media\` works. Popular options:

| File | Character |
|------|-----------|
| `Windows Notify System Generic.wav` | Soft ding-dong (default idle) |
| `Windows Notify Messaging.wav` | Friendly ping |
| `Windows Notify Calendar.wav` | Clean reminder tone |
| `chimes.wav` | Classic chimes |
| `tada.wav` | Upbeat celebration |

---

## Testing Sounds Without Restarting OpenCode

```powershell
$play = { param($f) (New-Object Media.SoundPlayer "$env:WINDIR\Media\$f").PlaySync() }
& $play "Windows Notify System Generic.wav"
Start-Sleep -Milliseconds 600
& $play "Windows Notify Messaging.wav"
Start-Sleep -Milliseconds 600
& $play "Windows Notify.wav"
```

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Particularly interested in:
- 🍎 **macOS support** via `afplay`
- 🐧 **Linux support** via `paplay` / `aplay`
- 🔊 **Custom sound files** bundled with the package

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

---

## License

[MIT](LICENSE)
