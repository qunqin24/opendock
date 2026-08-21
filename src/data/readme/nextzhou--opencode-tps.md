# opencode-tps

An OpenCode TUI plugin that displays request-level session and per-model tokens-per-second (TPS) metrics in the sidebar.

## Features

- Weighted throughput across all model requests in the session
- Separate metrics by provider, model, and variant
- Output and reasoning token accounting
- Time to first token included
- Tool execution and inter-request waiting excluded
- Historical session estimates after restart
- No telemetry or network requests

## Requirements

- OpenCode `>=1.18.0 <2`

## Installation

Install the plugin globally from npm:

```bash
opencode plugin @nextzhou/opencode-tps -g
```

Start or restart OpenCode, then press `Ctrl+X`, followed by lowercase `b`, to open the sidebar. This is the default `sidebar_toggle` keybinding and may differ if you customized `tui.json`.

### Upgrade

Replace an existing installation with the latest published version:

```bash
opencode plugin @nextzhou/opencode-tps -g --force
```

### Load a Local Checkout

For local development, add the project directory to the `plugin` array in your global `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["/absolute/path/to/opencode-tps"]
}
```

## Metric

The plugin calculates weighted throughput by aggregating tokens and request durations. It never averages individual request TPS values:

```text
TPS = sum(output tokens + reasoning tokens) / sum(model request durations)
```

A request duration begins at `session.next.step.started` and ends at the latest text, reasoning, or tool-input end event for that model request. This includes request startup and time to first token. Step completion and tool-result timestamps are deliberately not used, so tool execution and waiting between model requests are excluded.

When precise stream events are unavailable for an older message, the plugin estimates its request window from the assistant message creation timestamp through the final persisted text or reasoning part. Pure tool-call historical steps without those timestamps are omitted.

## Development

Development requires Bun `1.3.14`.

```bash
bun install --frozen-lockfile
bun run check
bun run pack:check
```

Individual commands:

```bash
bun run format
bun run lint
bun run typecheck
bun test
bun run build
```

## Project Structure

```text
src/tui.ts                  OpenCode event adapter and sidebar renderer
src/session-tps-state.ts    Framework-independent TPS tracking and aggregation
tests/                      Behavior tests
docs/requirements.md        Product scope and metric contract
docs/releasing.md           npm release process
```

## License

[MIT](LICENSE)
