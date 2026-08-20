# opencode-status-tracker

Real-time status bar for the [OpenCode](https://opencode.ai) sidebar footer: cache hit rate, token usage, cost, latency, and model info — refreshed live via `message.updated` events (no polling).

## Features

- **Cache hit rate** for the last request and the whole session
- **Token usage**: input, output, reasoning (per request and cumulative)
- **Cost** per request and cumulative session cost
- **Latency** of the last response
- **Model name** of the last request
- 3-line compact layout, color-coded via your active theme
- Event-driven, zero-polling real-time updates

## Installation

### One-liner (recommended)

```bash
opencode plugin opencode-status-tracker
```

OpenCode downloads the package from npm, registers it in `tui.json`, and is
ready after restart.

### Via config

Add the plugin to your `tui.json` (OpenCode auto-installs it from npm at startup):

```json
{
  "$schema": "https://opencode.ai/config/tui.json",
  "plugin": ["opencode-status-tracker"]
}
```

### From a local checkout

```json
{
  "plugin": ["./opencode-status-tracker/src/tui.tsx"]
}
```

Restart OpenCode and open the sidebar (`Ctrl+X B`) to see the footer.

## Output

```
✓  deepseek-v4-flash · 4.2s · $0.003
last: in 12.0k · out 1.2k · hit 86% · rd 10.0k · wr 2.0k
📊 total: 8 req · in 70.0k · out 9.0k · hit 78% · $0.28
```

- `hit` = cache hit rate = `cache.read / (input + cache.read)`
- `rd` / `wr` = cache read / write tokens
- Token units auto-scale: `k` / `m` / `b`

## Development

```bash
npm install
npm run build     # esbuild -> dist/
npm run typecheck # tsc --noEmit
```

## Requirements

- OpenCode >= 1.4.3 (sidebar footer slot)
- Peer deps: `@opencode-ai/plugin`, `@opentui/core`, `@opentui/solid`, `solid-js`

## License

MIT
