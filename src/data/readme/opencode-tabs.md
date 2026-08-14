# opencode-tabs

[![NPM Version](https://img.shields.io/npm/v/opencode-tabs)](https://www.npmjs.com/package/opencode-tabs)
![GitHub License](https://img.shields.io/github/license/Minhir/opencode-tabs)

Session tabs for the OpenCode TUI.

- **Quick navigation** - Switch between sessions with a single click.
- **Session status** - See which sessions are busy or need attention.

<img src="media/demo.gif" width="630" alt="OpenCode tabs demo">

## Install

For the current project:

```sh
opencode plugin opencode-tabs
```

Or globally:

```sh
opencode plugin opencode-tabs --global
```

Or, add the package directly to `.opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-tabs"]
}
```

Restart OpenCode after the installation.

## Keyboard navigation

The `Next tab`, `Previous tab`, and `Close tab` commands are available in the
command palette. They have no keybindings by default. To open a new tab, use
OpenCode's built-in `New session` command. Check the
[OpenCode keybinds documentation](https://opencode.ai/docs/keybinds/).

To enable keyboard navigation, configure the plugin with options:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    [
      "opencode-tabs",
      {
        "keybinds": {
          "next": "<leader>]",
          "previous": "<leader>[",
          "close": "<leader>w"
        }
      }
    ]
  ]
}
```

Restart OpenCode after changing the configuration.
