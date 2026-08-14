# opencode-notification-macos

Native macOS notifications and sounds for [OpenCode](https://opencode.ai) - zero external dependencies.

[![npm version](https://badge.fury.io/js/opencode-notification-macos.svg)](https://www.npmjs.com/package/opencode-notification-macos)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

🔔 **Native macOS Notifications** - Uses `osascript` for system notifications  
🔊 **System Sounds** - Uses `afplay` with all 14 built-in macOS sounds  
⚙️ **Configurable** - Per-event sound customization  
📁 **Dual Config** - Global + project-level configuration  
🎯 **Zero Dependencies** - No external libraries, just native macOS commands  

## Installation

### For AI Agents (Automated Setup)

If you're an AI agent setting this up for a user, run these commands:

```bash
# 1. Install the plugin globally
npm install -g opencode-notification-macos

# 2. Configure default sounds interactively
npx opencode-notification-macos config

# 3. Add to OpenCode configuration
cat >> ~/.config/opencode/opencode.jsonc << 'EOF'
{
  "plugin": [
    "opencode-notification-macos"
  ]
}
EOF
```

### Manual Installation

```bash
npm install -g opencode-notification-macos
```

Then add to your `~/.config/opencode/opencode.jsonc`:

```json
{
  "plugin": [
    "opencode-notification-macos"
  ]
}
```

## Configuration

### Interactive Configuration (Recommended)

```bash
# Configure sounds interactively
npx opencode-notification-macos config

# List available sounds
npx opencode-notification-macos list

# Preview a sound
npx opencode-notification-macos preview

# Show current configuration
npx opencode-notification-macos show

# Reset to defaults
npx opencode-notification-macos reset
```

### Configuration Files

The plugin supports two configuration locations (project config overrides global):

**Global** (applies to all projects):
```
~/.config/opencode/opencode-notification-macos.json
```

**Project** (applies to specific project):
```
.opencode/notification.json
```

### Configuration Format

```json
{
  "sound": true,
  "notification": true,
  "showProjectName": true,
  "events": {
    "complete": { "sound": true, "notification": true },
    "error": { "sound": true, "notification": true },
    "question": { "sound": true, "notification": true },
    "permission": { "sound": true, "notification": true },
    "subagent_complete": { "sound": false, "notification": false }
  },
  "messages": {
    "complete": "✅ Task completed",
    "error": "❌ Error occurred",
    "question": "❓ OpenCode needs your input",
    "permission": "🔐 Permission required",
    "subagent_complete": "Subagent finished"
  },
  "sounds": {
    "complete": "Glass",
    "error": "Basso",
    "question": "Ping",
    "permission": "Tink",
    "subagent_complete": "Pop"
  }
}
```

### Available Sounds

All 14 macOS system sounds are available:

- `Basso` - Low alert sound
- `Blow` - Airy whoosh
- `Bottle` - Cork pop
- `Frog` - Frog croak
- `Funk` - Funk guitar riff
- `Glass` - Glass tap (default for completion)
- `Hero` - Heroic fanfare
- `Morse` - Morse code beeps
- `Ping` - Simple ping (default for questions)
- `Pop` - Pop sound
- `Purr` - Cat purr
- `Sosumi` - Classic Mac sound
- `Submarine` - Sonar ping
- `Tink` - Light bell (default for permissions)

## Events

The plugin triggers on these OpenCode events:

| Event | Description | Default Sound |
|-------|-------------|---------------|
| `complete` | Main task finished | Glass |
| `error` | An error occurred | Basso |
| `question` | OpenCode needs input | Ping |
| `permission` | Permission required | Tink |
| `subagent_complete` | Background task finished | Pop |

## AI Agent Setup Instructions

If you are an AI assistant reading this to set up the plugin for a user, follow these exact steps:

### Step 1: Check Prerequisites

```bash
# Verify macOS
sw_vers -productName

# Verify OpenCode is installed
which opencode
```

### Step 2: Install Plugin

```bash
npm install -g opencode-notification-macos
```

### Step 3: Create Configuration

Option A - Interactive (recommended):
```bash
npx opencode-notification-macos config
```

Option B - Create config file directly:
```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/opencode-notification-macos.json << 'EOF'
{
  "sound": true,
  "notification": true,
  "showProjectName": true,
  "sounds": {
    "complete": "Glass",
    "error": "Basso",
    "question": "Ping",
    "permission": "Tink",
    "subagent_complete": "Pop"
  }
}
EOF
```

### Step 4: Update OpenCode Config

```bash
# Read current config
cat ~/.config/opencode/opencode.jsonc

# Add plugin to the plugin array
# If opencode.jsonc exists, add "opencode-notification-macos" to the plugin array
# If it doesn't exist, create it with the plugin
```

### Step 5: Test

```bash
# Test sound
npx opencode-notification-macos preview

# Test with OpenCode
opencode "say hello and wait for my response"
```

## Troubleshooting

### No sound playing?

1. Check system volume:
   ```bash
   afplay /System/Library/Sounds/Glass.aiff
   ```

2. Check notification permissions:
   - System Settings → Notifications → Script Editor
   - Ensure notifications are enabled

3. Verify config:
   ```bash
   npx opencode-notification-macos show
   ```

### Plugin not loading?

1. Check OpenCode config syntax:
   ```bash
   cat ~/.config/opencode/opencode.jsonc
   ```

2. Clear OpenCode cache:
   ```bash
   rm -rf ~/.cache/opencode
   ```

3. Restart OpenCode

### Permission denied errors?

The plugin uses `osascript` for notifications. Grant permissions:
- System Settings → Privacy & Security → Automation
- Ensure your terminal has permission to control System Events

## Development

```bash
# Clone repository
git clone https://github.com/evanstinger/opencode-notification-macos.git
cd opencode-notification-macos

# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```

## How It Works

This plugin replaces external notification libraries with native macOS commands:

- **Sounds**: Uses `afplay` (built into macOS) to play system sounds from `/System/Library/Sounds/`
- **Notifications**: Uses `osascript` (AppleScript) to display native macOS notifications
- **Zero Dependencies**: No npm packages required for core functionality

## License

MIT © [Evan Stinger](https://github.com/evanstinger)

## Contributing

Contributions welcome! Please read the [contributing guide](CONTRIBUTING.md) first.

## Related

- [OpenCode](https://opencode.ai) - The AI coding agent
- [@mohak34/opencode-notifier](https://www.npmjs.com/package/@mohak34/opencode-notifier) - Cross-platform notifier (uses node-notifier)
