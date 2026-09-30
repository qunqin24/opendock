# opencode-stats-for-nerds

OpenCode TUI plugin that shows token usage, context window, generation speed, cost, and file changes in the sidebar after each response.

## Install

```bash
opencode plugin opencode-stats-for-nerds
```

Restart OpenCode. A **Stats for Nerds** panel appears in the right sidebar.

## What it shows

```
▼ Stats for Nerds
  Tokens       13.4k in · 1.2k out · 2.0k thinking
  Cached       3.8k read · 2.7k write
  Context      23.2k / 200k (11%)
  ────────────────
  Cost         $0.0070
  Gen Time     2m 14s
  TTFT         1.35s
  Speed        42.3 tok/s
  ────────────────
  Changes      +234 -56 · 5 files
  Model        claude-sonnet-4
```

Click the header to collapse/expand.

### Stats reference

| Stat | Scope | Description |
|------|-------|-------------|
| **Tokens** | Cumulative | Input, output, and thinking tokens across all turns |
| **Cached** | Cumulative | Prompt cache hits (read = reused, write = newly cached) |
| **Context** | Current | Context window used vs model limit, with percentage |
| **Cost** | Cumulative | Total session cost at provider rates |
| **Gen Time** | Cumulative | Total time the model spent generating |
| **Think Time** | Cumulative | Total time the model spent reasoning (off by default) |
| **TTFT** | Last response | Time-to-first-token |
| **Speed** | Last response | Output tokens per second |
| **Activity** | Cumulative | Tool-call steps and invocations (off by default) |
| **Changes** | Session | File additions, deletions, and count |
| **Model** | Last response | Model ID |

## Configuration

Disable any stat via `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["opencode-stats-for-nerds", {
      "show": {
        "cache": false,
        "activity": true,
        "model": false
      }
    }]
  ]
}
```

All options default to `true` except `thinkTime` and `activity`.

| Key | Default | Controls |
|-----|---------|----------|
| `tokens` | `true` | Input/output/thinking row |
| `cache` | `true` | Cache read/write row |
| `context` | `true` | Context window used / limit (%) |
| `cost` | `true` | Session cost |
| `genTime` | `true` | Total generation time |
| `thinkTime` | `false` | Total reasoning time |
| `ttft` | `true` | Time-to-first-token |
| `speed` | `true` | Tokens per second |
| `activity` | `false` | Steps and tool calls |
| `changes` | `true` | File additions/deletions |
| `model` | `true` | Model name |

## Requirements

- [OpenCode](https://opencode.ai) v1.17+

## License

MIT
