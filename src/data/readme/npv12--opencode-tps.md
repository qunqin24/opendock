# @npv12/opencode-tps

OpenCode TUI plugin that displays live TPS (tokens per second), average TPS, and average TTFT (time to first token) in the session prompt.

## Features

- Live streaming TPS display in the session prompt
- Average TPS across the session
- Average time to first token (TTFT)
- Updates in real-time as tokens stream

## Installation

```bash
opencode plugin add @npv12/opencode-tps
```

Or add to your `opencode.json`:

```json
{
  "plugins": {
    "@npv12/opencode-tps": {}
  }
}
```

## Attribution

This plugin is adapted from [Tarquinen's oc-tps plugin](https://github.com/Tarquinen/oc-tps) repository.

## License

MIT
