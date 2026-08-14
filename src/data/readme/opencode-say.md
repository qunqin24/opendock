# opencode-say

[![npm](https://img.shields.io/npm/v/opencode-say)](https://www.npmjs.com/package/opencode-say)

Text-to-speech plugin for [OpenCode](https://opencode.ai) - hear AI responses spoken aloud.

Uses macOS `say` command for text-to-speech. Perfect for hands-free coding with dictation software.

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-say"]
}
```

Or install globally in `~/.config/opencode/opencode.json`.

## Usage

### Toggle Speech Mode

Create a `/say` command by adding `.opencode/command/say.md`:

```markdown
---
description: Toggle speech mode on/off
---

Use the `say_toggle` tool to toggle speech mode.
```

Then type `/say` in OpenCode to toggle speech on/off.

### Available Tools

The plugin exposes three tools that the AI can use:

| Tool | Description |
|------|-------------|
| `say_toggle` | Toggle speech mode on/off |
| `say_config` | Configure voice, rate, and max length |
| `say_status` | Check current settings |

### Configuration

Settings are stored in `.opencode/say-settings.json`:

```json
{
  "enabled": true,
  "voice": "Samantha",
  "rate": 180,
  "maxLength": 500
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `false` | Whether speech is enabled |
| `voice` | string | system default | macOS voice name |
| `rate` | number | system default | Words per minute |
| `maxLength` | number | `500` | Max characters before truncating |

### Available Voices

List available voices:

```bash
say -v '?'
```

Common high-quality voices:
- `Samantha` - American female
- `Daniel` - British male
- `Karen` - Australian female
- `Moira` - Irish female

## Requirements

- macOS (uses the `say` command)
- OpenCode v1.2.0+

## License

MIT
