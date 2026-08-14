# opencode-tui-plugin-workflows

An [OpenCode](https://opencode.ai) TUI sidebar plugin that shows the active
[Responsible Vibe MCP](https://mrsimpson.github.io/responsible-vibe-mcp/) workflow
phase and workflow name while your agent is running.

## What it does

When the workflows MCP is active, the sidebar displays the current phase and
workflow name, updating automatically whenever the agent calls a workflows tool:

![Plugin screenshot](docs/plugin.png)

## Requirements

- [OpenCode](https://opencode.ai) >= 1.3.4
- [Responsible Vibe MCP](https://mrsimpson.github.io/responsible-vibe-mcp/) configured in your project

## Installation

> [!IMPORTANT]
> This is a **TUI plugin** — it must be added to `tui.json`, not `opencode.json`.

Add the plugin to your `.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-tui-plugin-workflows"]
}
```

OpenCode installs the package automatically via Bun on next startup. No separate
`npm install` required.

## License

[MIT](./LICENSE)
