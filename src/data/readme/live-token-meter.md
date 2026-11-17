# live-token-meter — live TPS in the OpenCode 2.0 prompt footer

[![npm](https://img.shields.io/npm/v/live-token-meter)](https://www.npmjs.com/package/live-token-meter)
[![MIT License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A [CLI plugin](https://opencode.ai/v2/docs/build/plugins/cli) for OpenCode 2.0
CLI that shows **live tokens-per-second** in the footer line below the input,
right beside the context indicator.

While text, reasoning, or tool-call arguments stream, the footer shows an
estimated tokens-per-second (TPS) rate. After a text response finishes, it
shows an output-token average based on the provider's usage report.

```
┌────────────────────────────────────────────────────────────┐
│ ...                                         30.5K (3%)     │
│  ~33.3 tok/s · total 15k tok                 ctrl+p ...    │   ← streaming
                                                             │
│ ...                                         30.5K (3%)     │
│  ✓ 200 tok/s · 15k tok · total 15k tok       ctrl+p ...    │   ← last step
└────────────────────────────────────────────────────────────┘
```

## Requirements

- OpenCode 2.0.12. The plugin targets `@opencode/plugin@2.0.12` and the
  OpenTUI 0.5.10 / Solid 1.9.15 versions used by that CLI release.
- Bun to build from source. Checks run with Bun 1.3.14.

## During a response

| Activity | Example footer |
| --- | --- |
| Waiting for the first stream event, or retrying | `Waiting for response…` |
| Reasoning text streams | `~45.0 tok/s · thinking` |
| Visible text streams | `~56.0 tok/s` |
| Tool-call arguments stream | `~38.0 tok/s · tool call` |
| Tools execute | `Running tools…` |
| The stream ends and the step completes | `Finishing step…` |
| Text response completes | `✓ 56.0 tok/s · 610 tok · total 6.7k tok` |
| The user stops the response | `Interrupted` |

`~` marks a character-based estimate. Each stream kind has its own character
count and clock within the step. Its live average starts at its first delta,
so provider wait does not lower the estimate. The denominator is at least one
second to limit spikes from the first chunk.

Before the first delta of a kind arrives, the footer shows `Thinking…`,
`Receiving text…`, or `Generating tool call…`. Reasoning speed is available
only when the provider sends reasoning text deltas. Hiding reasoning in the
CLI does not disable those events. A provider that sends no reasoning text
does not supply enough data for a live reasoning estimate.

The completed rate uses **output tokens only**, excluding reasoning. It
includes provider wait from request start to stream end, so it can differ
from a live estimate. `total` also excludes reasoning and sums output tokens
from assistant messages currently loaded in the CLI's cache.

## Install

### From npm (recommended)

OpenCode installs npm plugin packages into an isolated cache. Add the package
to `~/.config/opencode/cli.json`:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    {
      "package": "live-token-meter",
      "options": { "charsPerToken": 4, "showTotals": true },
    },
  ],
}
```

Or use a string entry in `cli.json`:

```jsonc
{
  "plugins": ["live-token-meter"],
}
```

You can pin a version:

```jsonc
{
  "plugins": ["live-token-meter@0.1.0"],
}
```

Restart the OpenCode CLI. Send a prompt to see the meter below the input.

### From source (local development)

Run `bun install` in the repository. Point `package` at the **repository
directory**. OpenCode 2.0.12 loads its `tui/index.ts` entry point:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/live-token-meter",
      "options": { "charsPerToken": 4 },
    },
  ],
}
```

OpenCode 2.0.12 skips direct file paths in this configuration, including
`src/index.tsx`. Use the directory path shown above.

## Options

| Option          | Default | Description                                                                             |
| --------------- | ------- | --------------------------------------------------------------------------------------- |
| `enabled`       | `true`  | Set to `false` to disable the plugin.                                                   |
| `charsPerToken` | `4`     | Characters per estimated token for text, reasoning, and tool-call arguments. Accuracy depends on the model and content. |
| `showTotals`    | `true`  | Show output-token totals from cached assistant messages. |

## How it works

Built against the OpenCode 2.0.12 CLI plugin API (`@opencode/plugin/tui`,
`define({ id, setup })`):

- Registers the `prompt.footer.status` slot via `context.ui.slot`.
- Subscribes to the server event stream with `context.data.on`:
  - `session.execution.started` / `session.retry.scheduled` — show the waiting state
  - `session.step.started` — reset counters and record request-start `started`
  - `session.text.delta`, `session.reasoning.delta`, and
    `session.tool.input.delta` — update the estimate for the active stream kind
  - Part-start/end and tool events — update activity labels, including parallel tools
  - `session.step.streamed` — record provider response-body end before tool settlement
  - `session.step.ended` — divide `tokens.output` by the request-to-stream-end window
  - `session.step.failed` / `session.execution.interrupted` — clear live activity
- Completed rates use `stop`/`length` finishes with positive output tokens and
  a window of at least 250 ms. Other finishes show the output-token count.
  If the stream-end event is missing, the calculation falls back to step completion.
- Per-session reactive state lives in a solid-js store via
  `context.storage.memory`, so the slot re-renders on every delta.
- The displayed total sums `tokens.output` from
  `context.data.session.message.list`.

OpenCode's `session.tps` setting controls the completed rate in assistant
footers. This plugin adds live estimates and activity labels to the prompt footer.

## Development

```sh
bun install
bun run typecheck   # tsc --noEmit
bun run build       # bundle the TUI plugin into dist/ (what gets published)
bun run test        # tracker, event wiring, and source/bundle render tests
```

To test against a live TUI: add the plugin to `cli.json` (see Install), open a
session, and start a prompt — the footer below the input shows the live
readout next to the context indicator.

## Publishing

```sh
bun run prepublishOnly   # typecheck + build + test
npm publish
```

The package manifest follows the plugin packaging contract:

- `exports["."]` and `exports["./tui"]` both resolve to the bundled
  `dist/tui.js` — the host loads the TUI entry directly, no TSX at runtime.
- `oc-plugin: ["tui"]` marks the package as a TUI plugin.
- `@opencode/plugin` is a runtime dependency. OpenTUI and Solid are peer
  dependencies so the plugin uses the host's rendering runtime.

## Notes

- Live estimates use received characters, not token counts from the provider.
  Encrypted or undisclosed reasoning cannot be measured this way.
- The completed output-token rate uses provider usage accounting. Tool-call
  finishes and sub-250ms windows show token counts without a rate.
- Each open session is tracked independently via its `sessionID`.
- The package pins the OpenCode API to 2.0.12. Check API and theme changes
  when updating the dependencies.

## License

MIT
