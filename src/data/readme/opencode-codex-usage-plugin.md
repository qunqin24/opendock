# opencode-codex-usage-plugin

Show your Codex usage and reset times directly in the OpenCode sidebar.

<p align="center">
  <img src="https://raw.githubusercontent.com/zaniluca/opencode-codex-usage-plugin/main/assets/demo.gif" alt="opencode-codex-usage-plugin demo" width="80%">
</p>

This plugin reads Codex usage from the ChatGPT app or the Codex CLI and renders the current 5-hour and weekly limits inside OpenCode, so you can keep an eye on quota without leaving the TUI.

## Install

Use OpenCode's native plugin installer:

```sh
opencode plugin add opencode-codex-usage-plugin@latest
```

This installs the plugin and updates your global OpenCode TUI config automatically.

Alternatively, add the plugin manually to your OpenCode config (`~/.config/opencode/opencode.jsonc`):

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-codex-usage-plugin@latest"],
}
```

Restart OpenCode after changing the config.

The package is a TUI-only OpenCode v2 plugin that renders the usage in the sidebar and prompt status area.

## Requirements

Install either the **ChatGPT app**, which bundles Codex, or the **Codex CLI**. The plugin looks for Codex in common locations and on your `PATH`.

The plugin reads usage through Codex's shared app-server daemon, so every OpenCode window reuses the same Codex process. If the daemon is not running, the plugin starts it with `codex app-server daemon start`; the first start installs it under `~/.codex` and can take a while, and the daemon keeps running after OpenCode exits. If the daemon cannot start, each OpenCode window runs its own `codex app-server` instead.

If your Codex command lives somewhere else, set `OPENCODE_CODEX_USAGE_COMMAND` in your shell config:

```sh
# ~/.zshrc or ~/.bashrc
export OPENCODE_CODEX_USAGE_COMMAND="/path/to/codex"
```

Then reload your shell config or open a new terminal before starting OpenCode.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub. To get started, fork the repo, install the dependencies, build it, and add the local output to your OpenCode config:

```jsonc
// opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["file:///Users/<your_username>/path/to/your-clone/opencode-codex-usage-plugin"],
}
```

The plugin logic is made with [Effect](https://github.com/Effect-TS/effect). There is no particular reason I chose it, it was simply an excuse to try it out.
