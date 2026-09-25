# opencode-auto-rename-keybind

OpenCode 2 introduces auto-rename for sessions based on their conversation, but it doesn't expose that action as a configurable keyboard shortcut. Its built-in rename shortcut opens the manual rename dialog instead.

This plugin adds a configurable keyboard shortcut for OpenCode 2's auto-rename.

## Installation

Requires **OpenCode 2's CLI**. Add this to your `cli.json` to use **Ctrl+R**. The `session.rename` setting disables OpenCode's built-in manual rename shortcut, which otherwise uses the same key:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "keybinds": {
    "session.rename": "none"
  },
  "plugins": [
    {
      "package": "opencode-auto-rename-keybind",
      "options": {
        "keybind": "ctrl+r"
      }
    }
  ]
}
```

Press **Ctrl+R** to auto-rename the current session. The shortcut is inactive while a dialog is open.

## Configuration

`options.keybind` is required and must be a non-empty shortcut string supported by OpenCode, such as `ctrl+r` or `ctrl+shift+r`. If you choose a different shortcut, you can keep OpenCode's manual rename binding.

Configure the shortcut through the plugin's options, not as a custom entry under `keybinds`.

## License

[MIT](LICENSE)
