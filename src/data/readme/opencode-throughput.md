# opencode-throughput

Real-time LLM performance monitoring plugin for [OpenCode](https://opencode.ai). Tracks latency, throughput, token usage, and cost per model with toast notifications and JSONL logging.

## Features

- **TTFT** (Time To First Token) — measures how fast the model starts generating
- **TPS** (Tokens Per Second) — generation throughput during streaming
- **Total Latency** — end-to-end request time
- **Token Usage** — input, output, reasoning, cache read/write
- **Cost Tracking** — per-request and cumulative cost
- **Toast Notifications** — real-time performance summary after each LLM response
- **JSONL Logging** — persistent logs at `~/.opencode/throughput.jsonl`
- **Benchmark Tool** — query historical stats on demand from the AI agent

## Installation

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-throughput"]
}
```

OpenCode will automatically install the plugin from npm at startup.

## Usage

Once installed, the plugin runs automatically:

1. **After each LLM response**, a toast notification appears with metrics:

   ```
   claude-sonnet-4 | 2.1s TTFT | 58.3 tok/s | 4.2s | ↑1.2k ↓892
   ```

2. **Logs are written** to `~/.opencode/throughput.jsonl` (one JSON object per line)

3. **Query benchmarks** — ask the AI agent to use the `benchmark` tool:

   > "Show me the benchmark stats for claude"
   > "Compare model performance"
   > "Show the last 10 requests"

## Benchmark Tool Args

| Arg | Type | Description |
|-----|------|-------------|
| `model` | string (optional) | Filter by model name (partial match) |
| `last` | number (optional) | Only show the last N entries |

## Log Format

Each line in `~/.opencode/throughput.jsonl`:

```json
{
  "ts": "2026-03-21T10:00:00.000Z",
  "model": "anthropic/claude-sonnet-4",
  "providerID": "anthropic",
  "modelID": "claude-sonnet-4",
  "sessionID": "abc123",
  "messageID": "def456",
  "ttft_ms": 2100,
  "tps": 58.3,
  "latency_ms": 4200,
  "inputTokens": 1200,
  "outputTokens": 892,
  "reasoningTokens": 0,
  "cacheReadTokens": 500,
  "cacheWriteTokens": 200,
  "cost": 0.0234,
  "finish": "stop"
}
```

## How It Works

The plugin hooks into OpenCode's event system:

- `message.updated` — captures `AssistantMessage.time.completed`, `tokens`, and `cost`
- `message.part.updated` — captures the first `TextPart.time.start` for TTFT calculation

## Development

### Local development

```json
{
  "plugin": ["file:///absolute/path/to/opencode-throughput/src/index.ts"]
}
```

### Build

```bash
bun install
bun run build
```

### Publish

```bash
npm publish --access public
```

## License

MIT
