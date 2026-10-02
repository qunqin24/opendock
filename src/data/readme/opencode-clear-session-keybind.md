# opencode-clear-session-keybind

A configurable keyboard shortcut for OpenCode V2's built-in `/clear` command. It closes the current session tab and returns to a fresh prompt, keeping your selected agent and model. The saved session is not deleted.

## Installation

Requires the OpenCode V2 CLI. Add this to your `cli.json` to use **leader+C**. Disabling the default compaction shortcut frees that key:

```json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "keybinds": {
    "session.compact": "none"
  },
  "plugins": [
    {
      "options": {
        "keybind": "<leader>c"
      },
      "package": "opencode-clear-session-keybind"
    }
  ]
}
```

## Configuration

`options.keybind` is required and has no default. Set it to a non-empty shortcut string supported by OpenCode, such as `<leader>c` or `ctrl+l`. If you choose a different shortcut, you can keep OpenCode's compaction binding.

Configure the shortcut through the plugin's options. OpenCode does not accept `session.clear` under `keybinds`.

## License

[MIT](LICENSE)
