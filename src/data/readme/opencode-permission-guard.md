# opencode-permission-guard

[![CI](https://github.com/StuartGa/opencode-permission-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/StuartGa/opencode-permission-guard/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/opencode-permission-guard)](https://www.npmjs.com/package/opencode-permission-guard)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Monitors OpenCode for permission errors (EACCES, EPERM, "Permission denied", "Access denied") and sends native OS notifications so you never miss a file access issue.

## Features

- **Native OS notifications** — macOS Notification Center and Linux notify-send
- **Focus detection** — skips notifications when your terminal is the active window (macOS)
- **10-second cooldown** — prevents notification spam from repeated errors
- **Configurable** — customize messages, sounds, patterns, and behavior via JSON config
- **i18n** — English and Spanish notification messages (auto-detected from `$LANG`)
- **Two install methods** — npm OpenCode plugin (native) or shell wrapper (standalone)

---

## Installation

### Option 1: OpenCode Plugin (recommended)

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-permission-guard"]
}
```

If the package isn't on npm yet, place `src/` in `.opencode/plugins/`:

```bash
mkdir -p .opencode/plugins/permission-guard
cp src/*.ts .opencode/plugins/permission-guard/
```

Restart your OpenCode session. The plugin loads automatically at startup.

### Option 2: Shell Wrapper

Source the wrapper in your shell config:

```bash
# zsh
echo "source $(pwd)/shell/opencode-guard.zsh" >> ~/.zshrc
source ~/.zshrc
```

The wrapper intercepts `opencode` calls, captures stderr, and fires a notification if permission errors are detected after the command exits.

To bypass the wrapper temporarily:

```bash
opencode --no-monitor [args...]
```

To uninstall:

```bash
opencode_permission_guard_uninstall
```

---

## Configuration (Plugin)

Create `~/.config/opencode/permission-guard.json` to customize behavior:

```json
{
  "enabled": true,
  "cooldownMs": 15000,
  "notification": {
    "title": {
      "en": "OpenCode Permission Guard",
      "es": "OpenCode Detenido"
    },
    "body": {
      "en": "Permission denied — check read/write access",
      "es": "Se requieren permisos de lectura/escritura"
    },
    "sound": "Basso"
  },
  "patterns": [
    "permission denied",
    "eacces",
    "eperm",
    "access denied"
  ],
  "focusDetection": true
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `enabled` | `true` | Enable/disable the plugin |
| `cooldownMs` | `10000` | Minimum ms between notifications |
| `notification.title` | `{en, es}` | Notification title per locale |
| `notification.body` | `{en, es}` | Notification body per locale |
| `notification.sound` | `"Basso"` | macOS alert sound name |
| `patterns` | `[...]` | Regex patterns to detect (case-insensitive) |
| `focusDetection` | `true` | Skip notification when terminal is frontmost (macOS) |

**Available macOS sounds:** Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink

---

## How It Works

```
opencode executes a tool (read, write, bash, edit...)
    │
    ▼
┌──────────────────────────┐
│ Plugin hooks into:        │
│ • tool.execute.after      │  ← tool output scanned for patterns
│ • session.error           │  ← session errors scanned
│ • permission.asked        │  ← proactive notification
│                           │
│ Shell wrapper:            │
│ • captures stderr via tee │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Focus detection?          │
│ (macOS: skip if terminal  │
│  is frontmost app)        │
└──────────┬───────────────┘
           │ not focused / disabled
           ▼
┌──────────────────────────┐
│ Cooldown check            │
│ (skip if within 10s of    │
│  last notification)       │
└──────────┬───────────────┘
           │ cooldown clear
           ▼
┌──────────────────────────┐
│ OS Notification           │
│ "⚠️ OpenCode Detenido"    │
│ + sound alert (Basso)     │
└──────────────────────────┘
```

## Detected Patterns

| Pattern | Example error output |
|---------|---------------------|
| `Permission denied` | `Error: Permission denied (os error 13)` |
| `EACCES` | `EACCES: permission denied, open '/etc/shadow'` |
| `EPERM` | `EPERM: operation not permitted, lstat '/root'` |
| `Access denied` | `Access denied to /private/etc` |

## Development

```bash
bun install          # Install dev dependencies
bun run typecheck    # TypeScript strict type checking
```

## FAQ

**Does this add context bloat to OpenCode sessions?**
No. The plugin is event-driven — no tools are added to conversations, no prompts are injected.

**Will I get spammed with notifications?**
No. The cooldown limits to one notification per 10 seconds (configurable). Focus detection on macOS suppresses notifications when your terminal is the active window.

**How do I disable it temporarily?**
Set `"enabled": false` in `~/.config/opencode/permission-guard.json`, or remove `"opencode-permission-guard"` from your `opencode.json` plugin list.

## License

MIT
