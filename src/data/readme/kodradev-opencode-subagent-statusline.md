# Kodradev OpenCode Subagent Statusline

A terminal plugin for **OpenCode V2** that shows subagent status, execution time, and token usage in the sidebar of the current session. It does not create subagents or add tools to the model.

```text
Subagents
● 1 running · ✓ 2 done · × 0 error

● Review authentication
  ◷ 00:30 · 12.2k tok
✓ Review components
  ◷ 00:20 · 13.8k tok
```

## Installation

Requires **OpenCode >=2.0.23 and <3**.

Add the package to your project's `opencode.jsonc`, keeping any existing plugins:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["kodradev-opencode-subagent-statusline"]
}
```

For all projects, add it to `~/.config/opencode/cli.json` instead:

```jsonc
{
  "plugins": ["kodradev-opencode-subagent-statusline"]
}
```

Restart OpenCode and show the sidebar. Use only one of these configuration files; OpenCode loads the package automatically.

## How it works

- The **Subagents** panel appears at the top of the sidebar when the current session has child sessions, including nested descendants.
- Status updates arrive through OpenCode events: `running`, `pending`, `done`, `error`, or `interrupted`. Running subagents appear first and are never hidden by the row limit.
- Each row shows accumulated execution time and token usage. Time excludes pauses between executions; `--:--` means timing history is loading or unavailable. Tokens include input, output, reasoning, and cache usage for that subagent, not its descendants or current context size.
- Click a title to open that subagent's session. Click `+N more` to expand the list or `Show fewer` to collapse it.
- The panel follows the active theme and stays hidden when there are no subagents, unless loading fails. Click the retry message if it cannot load them.

## Options

Use the object form in your chosen configuration file:

```jsonc
{
  "plugins": [
    {
      "package": "kodradev-opencode-subagent-statusline",
      "options": {
        "maxItems": 3,
        "showTokens": true
      }
    }
  ]
}
```

| Option | Default | Description |
| --- | --- | --- |
| `maxItems` | `3` | Initial row limit, clamped to 1–50. All running subagents remain visible. |
| `showTokens` | `true` | Show token usage next to execution time. |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, development, and pull request guidelines.

## License

[MIT](LICENSE).
