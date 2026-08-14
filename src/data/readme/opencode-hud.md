# OpenCode HUD Plugin

A plugin for [OpenCode](https://opencode.ai) that displays token streaming metrics at the end of each conversation.

> [!Warning] 
  This plugin is still in developping. Maybe not available. 🐛

## Metrics Displayed

| Metric | Description |
|--------|-------------|
| ⚡ Avg TPS | Average tokens per second (includes reasoning tokens) |
| TTFT | Time To First Token — latency from request to first response token |
| Total tokens | Cumulative token count from API (output + reasoning) |
| Elapsed time | Wall-clock time since the first token |

**Example toast:**
```
⚡ 42.5 t/s  TTFT 312ms  [639 tok / 15.0s]
```

## Installation

### From npm

Add the plugin to your `.opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-hud@latest"]
}
```

### Local Development

This plugin auto-loads when you run `opencode` from this directory, because it lives in `.opencode/plugins/`.

## Configuration

Create a config file at `~/.config/opencode/opencode-hud.json`:

```json
{
  "enableLogging": true,
  "logFilePath": ".opencode/hud-debug.log"
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enableLogging` | boolean | `false` | Enable debug logging |
| `logFilePath` | string | `.opencode/hud-debug.log` | Path to log file |

## Development

```bash
# Install dependencies (Bun required)
bun install

# Run tests
bun test

# Type-check
bun run typecheck

# Build
bun run build
```

## Project Structure

```
opencode-hud/
├── .opencode/
│   ├── opencode.json          # OpenCode project config
│   └── plugins/
│       └── hud.ts             # Plugin entry (auto-loaded by OpenCode)
├── src/
│   ├── index.ts               # Plugin main entry — event handlers
│   ├── config.ts              # Configuration management
│   ├── logger.ts              # Configurable logging
│   ├── types.ts               # TypeScript interfaces
│   ├── metrics.ts             # Token estimation, duration formatting
│   └── display.ts             # Toast formatting and emission
├── tests/
│   ├── metrics.test.ts        # Unit tests
│   └── integration.test.ts    # Event flow tests
├── dist/                      # Build output
├── package.json
└── tsconfig.json
```

## Architecture

The plugin listens to OpenCode events and displays metrics when a conversation ends (`session.idle`).

**Event Flow:**
1. `message.updated` (user) → Record request start time
2. `message.updated` (assistant) → Store message with tokens info
3. `message.part.updated` → Track first token time, count tokens
4. `session.idle` → Calculate metrics and show toast

**Token Counting:**
- Primary: Uses API-provided `tokens.output + tokens.reasoning`
- Fallback: Estimates from text length (`length / 3`)

**Key Design Decisions:**
- `requestStartTime` set on user message to capture full TTFT
- `streamingStartTime` set on first assistant token (lazy init)
- Token count includes reasoning tokens for accurate TPS
- Uses `performance.now()` for high-precision timing
