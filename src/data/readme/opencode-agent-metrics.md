# opencode-agent-metrics

[![npm version](https://img.shields.io/npm/v/opencode-agent-metrics.svg)](https://www.npmjs.com/package/opencode-agent-metrics)
[![CI](https://github.com/LynnGuo666/opencode-agent-metrics/actions/workflows/ci.yml/badge.svg)](https://github.com/LynnGuo666/opencode-agent-metrics/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/opencode-agent-metrics.svg)](./LICENSE)

> Session observability HUD for OpenCode Desktop.

`opencode-agent-metrics` is an **Agent Runtime Observability** plugin. It keeps latency, throughput, cache efficiency, token usage, and SubAgent activity visible above the composer, so you can understand how a session is running without leaving the conversation.

The plugin adds three compact composer pills for:

- Session duration
- Generation speed
- Cache hit rate

The pills sit in the status row above the composer, near the model and reasoning controls. Each pill opens its own concise detail menu.

## Install

Requires OpenCode Desktop V2.4.2 or newer.

```sh
opencode plugin add opencode-agent-metrics
```

Or add it to your global `opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-agent-metrics"]
}
```

You can also install directly from GitHub:

```sh
opencode plugin add github:LynnGuo666/opencode-agent-metrics
```

## Features

- Cumulative session duration, split into main Agent, SubAgent, and current-turn time
- Cumulative and current-turn generation speed
- Cumulative cache hit rate with one decimal place
- Compact `K` / `M` / `B` token formatting
- SubAgent count and duration
- Compaction count
- Full server-side history loading, including messages removed by compaction
- Loading percentage while history is being read
- Native icons, running-state colors, and subtle animations
- No Emoji UI

While a session is running, duration and speed show the current-turn value first, with the cumulative value in parentheses:

```text
12.4s (1m 03s)
~86 tok/s (72 tok/s)
```

The duration and speed icons turn orange while any session in the family is running.

## Metric definitions

- **Duration**: `main Agent completed time + SubAgent completed time + current turn time`
- **Speed**: `(output + reasoning tokens) / streaming time`
- **Cache hit rate**: `cache.read / (input + cache.read + cache.write)`
- **Total tokens**: `input + output + reasoning + cache.read + cache.write`

Historical duration before the plugin loaded is estimated from Assistant message timestamps. New executions are measured from live OpenCode events. The plugin merges both sources without double counting.

Completed compaction usage is included in token and cost totals, but is excluded from streaming-speed calculations because compaction messages do not expose streaming timing.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```

`npm test` builds the self-contained `gui-experimental.cjs` bundle, tests the metric reducers, and evaluates the bundle with a mocked Desktop host.

For live GUI rebuilds:

```sh
npm run watch
```

## License

MIT
