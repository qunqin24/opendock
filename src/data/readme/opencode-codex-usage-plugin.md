# opencode-codex-usage-plugin

Show your Codex usage and reset times directly in the OpenCode sidebar.

<p align="center">
  <img src="https://raw.githubusercontent.com/zaniluca/opencode-codex-usage-plugin/main/assets/demo.gif" alt="opencode-codex-usage-plugin demo" width="80%">
</p>

This plugin reads Codex usage from Codex App or the Codex CLI and renders the current 5-hour and weekly limits inside OpenCode, so you can keep an eye on quota without leaving the TUI.

## Install

Use OpenCode's native plugin installer:

```sh
opencode plugin opencode-codex-usage-plugin@latest --global
```

This installs the plugin and updates your global OpenCode TUI config automatically.

Alternatively, add the plugin manually to your OpenCode TUI config (`~/.config/opencode/tui.json`):

```jsonc
// tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-codex-usage-plugin@latest"]
}
```

Restart OpenCode after changing the config.

> [!IMPORTANT]
> This is a TUI plugin, so configure it in `tui.json`, not in `opencode.json`.
> The `plugin` field in `opencode.json` is for server/runtime plugins and will not load this sidebar plugin.

## Requirements

Install either **Codex App** or the **Codex CLI**. The plugin looks for Codex in common locations and on your `PATH`.

If your Codex command lives somewhere else, set `OPENCODE_CODEX_USAGE_COMMAND` in your shell config:

```sh
# ~/.zshrc or ~/.bashrc
export OPENCODE_CODEX_USAGE_COMMAND="/path/to/codex"
```

Then reload your shell config or open a new terminal before starting OpenCode.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub. To get started fork the repo, install the dependencies and in your OpenCode TUI config add the local path to the output of the plugin like so:

```jsonc
// tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///Users/<your_username>/path/to/your-clone/opencode-codex-usage-plugin/dist/tui.js"]
}
```

The plugin logic is made with [Effect](https://github.com/Effect-TS/effect). There is no particular reason I chose it, it was simply an excuse to try it out.
