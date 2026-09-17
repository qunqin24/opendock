# opencode-subagent-cost

[![npm version](https://img.shields.io/npm/v/opencode-subagent-cost)](https://www.npmjs.com/package/opencode-subagent-cost)
[![GitHub release](https://img.shields.io/github/v/release/ansgarm/opencode-subagent-cost)](https://github.com/ansgarm/opencode-subagent-cost/releases)
[![CI](https://github.com/ansgarm/opencode-subagent-cost/actions/workflows/ci.yml/badge.svg)](https://github.com/ansgarm/opencode-subagent-cost/actions/workflows/ci.yml)

An OpenCode TUI plugin that shows the cost of the main session and all of its transitive subagents as one total. It works around [anomalyco/opencode#11027](https://github.com/anomalyco/opencode/issues/11027).

## What it does

The plugin adds the whole session tree's cost to the right side of the OpenCode prompt. The total includes the current session, its child sessions, and any deeper descendants.

When subagents have spent money, the prompt displays:

```text
$0.01 + $0.09 subagents = $0.10
```

The same whole-tree total is shown while viewing a subagent, so navigating into a child session does not make the reported run cost change.

![OpenCode prompt showing the total cost of a session and its subagents](docs/screenshot.png)

## Install locally

Build the plugin:

```sh
bun install
bun run build
```

Add its TUI entrypoint to the project `.opencode/tui.json` or global `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["file:///absolute/path/to/opencode-subagent-cost/dist/tui.js"]
}
```

Quit and restart OpenCode after changing `tui.json`.

## Install from npm

Install the package through OpenCode:

```sh
opencode plugin --global opencode-subagent-cost
```

See the package on [npm](https://www.npmjs.com/package/opencode-subagent-cost) or the latest [GitHub release](https://github.com/ansgarm/opencode-subagent-cost/releases/latest).

The package exposes only a TUI plugin. It does not mutate stored session costs or provider billing data.

## Troubleshooting

Restart OpenCode after changing `tui.json` or installing the plugin. If the cost is not shown, confirm that the plugin entrypoint is enabled and that the session has a non-zero cost.

## Compatibility

- OpenCode 1.18.31 or newer
- The new TUI plugin API
- Bun for local development

## Development

Install dependencies and run the type checks and tests:

```sh
bun install
bun run check
```

Build the distributable files:

```sh
bun run build
```

The package contains only `dist`, `README.md`, and `LICENSE` when packed for npm.

## License

[MIT](LICENSE)
