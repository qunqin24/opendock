# opencode-tps-plugin

[中文文档](./README.zh-CN.md)

Real-time AI generation speed and token throughput monitor for [OpenCode](https://opencode.ai). Displays live **tokens-per-second (TPS)** metrics directly in the OpenCode TUI status bar while the model generates output.

## Screenshot

![OpenCode TUI showing the TPS monitor](./docs/screenshot-use.png)

> Illustrative output from an OpenCode session; values vary by model and session.

## Features

- **Real-time TPS display** — instant speed, rolling average, token count, and elapsed time in the prompt status bar
- **Color-coded speed indicators** — green (fast), yellow (medium), red (slow) based on configurable thresholds
- **Tool execution awareness** — shows "TOOL" indicator during tool calls, automatically deducts tool wait time from generation speed calculation
- **Sub-agent tracking** — traces parent-child session relationships and rolls up metrics to root session
- **EMA smoothing** — exponential moving average with adaptive half-life to suppress noisy spikes
- **CJK-aware token estimation** — treats each CJK character as 1 token for more accurate counting
- **Multiple estimation algorithms** — `general` (chars/4), `program` (chars/3), `prose` (words/0.75)
- **Flexible configuration** — JSON config files, environment variables, or code overrides

## Installation

```bash
npm install opencode-tps-plugin
```

Add the plugin to your `tui.json`:

```jsonc
{
  "plugin": [
    // ... your existing plugins
    "opencode-tps-plugin"
  ]
}
```

## How It Works

The plugin renders a `ThroughputGauge` component in the `session_prompt_right` slot using SolidJS. It listens to `message.part.delta`, `message.part.updated`, `message.updated`, and `session.idle` events to track token generation in real time, showing live TPS, average speed, total tokens, and elapsed time with color theming.

## Configuration

Configuration is resolved in the following priority order (highest wins):

1. Code overrides (passed programmatically)
2. Environment variables (`TPS_PLUGIN_*`)
3. User config: `~/.config/opencode/tps-plugin.json`
4. Project config: `.opencode/tps-plugin.json`
5. Built-in defaults

> **Note:** display toggles (`showAvg`, `showRate`, `showTokens`, `showTimer`) are JSON/defaults only and have no environment variable override.

### Config File Example

```json
{
  "enabled": true,
  "refreshIntervalMs": 50,
  "samplingWindowMs": 1000,
  "showAvg": true,
  "showRate": true,
  "showTokens": true,
  "showTimer": true,
  "tokenMode": "general",
  "useColors": true,
  "slowRate": 10,
  "fastRate": 50
}
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `TPS_PLUGIN_ENABLED` | Enable/disable the plugin | `true` |
| `TPS_PLUGIN_REFRESH_INTERVAL_MS` | Minimum ms between UI updates | `50` |
| `TPS_PLUGIN_SAMPLING_WINDOW_MS` | Sliding window for speed calculation | `1000` |
| `TPS_PLUGIN_TOKEN_MODE` | Token estimation mode (`general`, `program`, `prose`) | `general` |
| `TPS_PLUGIN_USE_COLORS` | Enable speed-based color coding | `true` |
| `TPS_PLUGIN_SLOW_RATE` | TPS below this is red | `10` |
| `TPS_PLUGIN_FAST_RATE` | TPS above this is green | `50` |

## Requirements

- [OpenCode](https://opencode.ai) `>=1.15.13`
- Node.js 18+

## Development

```bash
# Install dependencies
bun install

# Type check
bun run typecheck

# Build
bun run build
```

## License

[MIT](./LICENSE)
