# opencode-free-usage-monitor

OpenCode TUI sidebar plugin that displays free model API usage (count, limit, countdown to next reset) in real-time.

## Features

- Monitors requests to free-tier models (Big Pickle, DeepSeek-V4-Flash-Free, Qwen3.6 Plus Free, Nemotron 3 Super Free)
- Displays current/total usage with a progress bar
- Session-specific request count
- Countdown timer to next available request
- Retry-after countdown when rate-limited
- Persistent usage tracking across sessions via KV storage

## Installation

Add to your `opencode.json` or `tui.json` plugin array:

```json
{
  "plugin": ["opencode-free-usage-monitor"]
}
```

## License

MIT
