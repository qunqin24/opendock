# opencode-firmware-quota

OpenCode plugin for monitoring your [Firmware](https://firmware.ai) API quota usage.

## Features

- **`firmware_quota` tool** - AI can check your quota on demand
- **Auto-show on session start** - See your quota when starting a new session
- **Low quota warnings** - Get notified when usage exceeds 75% or 90%

## Installation

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-firmware-quota"]
}
```

## Configuration

Connect your Firmware account using the `/connect` command in OpenCode:

```
/connect
```

Search for **Firmware** and enter your API key from [app.firmware.ai](https://app.firmware.ai).

OpenCode handles secure storage of your API key. This plugin only accesses it to make direct requests to Firmware's quota API endpoint—nothing else. The code is [open-source](https://github.com/alnandr/opencode-firmware-quota) and can be reviewed to verify this.

## Usage

### AI Tool

Ask the AI to check your quota:

```
Check my Firmware quota
```

The AI will use the `firmware_quota` tool and display your current usage.

### Automatic Notifications

- **Session start**: Quota is displayed when you start a new session
- **Low quota (75%+)**: Warning notification shown
- **Critical quota (90%+)**: Error notification shown

## Optional: /usage Slash Command

If you prefer a slash command, you can create a custom command file. Note that this will go through the AI (uses tokens).

Create `~/.config/opencode/commands/usage.md`:

```markdown
---
description: Check Firmware API quota
---
Check my Firmware quota using the firmware_quota tool and show me the result.
```

Then use `/usage` in OpenCode to trigger it.

## License

MIT
