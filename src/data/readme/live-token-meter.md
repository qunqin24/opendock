# tps-oc2 — live TPS in the OpenCode 2.0 prompt footer

A [TUI plugin](https://opencode.ai/v2/docs/build/plugins) for the OpenCode 2.0
CLI that shows **live tokens-per-second** in the footer line below the input,
right beside the context indicator.

While the model streams, the footer shows a live estimate; when the step
finishes, it shows the exact average from the provider's token accounting.

```
┌────────────────────────────────────────────────────────────┐
│ ...                                         30.5K (3%)     │
│  33.3 tok/s · total 15k tok                  ctrl+p ...    │   ← streaming
│                                                             │
│ ...                                         30.5K (3%)     │
│  ✓ 200 tok/s · 15k tok · total 15k tok       ctrl+p ...    │   ← last step
└────────────────────────────────────────────────────────────┘
```

## How it works

Built against the OpenCode 2.0 TUI plugin API (`@opencode-ai/plugin/tui`,
`define({ id, setup })`):

- Registers the `prompt.footer.end` slot (the footer line below the input,
  next to the context indicator) via `context.ui.slot`.
- Subscribes to the server event stream with `context.data.on`:
  - `session.step.started` — start the timing window
  - `session.text.delta` / `session.reasoning.delta` — live estimate from
    character deltas (`chars / charsPerToken`, default 4)
  - `session.step.ended` — exact `tokens.output + tokens.reasoning` divided
    by the step duration
  - `session.step.failed` — error state
- Per-session reactive state lives in a solid-js store via
  `context.storage.memory`, so the slot re-renders on every delta.
- The session-wide token total is summed from `context.data.session.message.list`.

## Install

The `opencode2` TUI reads `~/.config/opencode/cli.json` (the legacy
`tui.json` is migrated into it once, on first start). Add a `plugins` entry:

```jsonc
{
  "plugins": [
    { "package": "tps-oc2", "options": { "charsPerToken": 4, "showTotals": true } }
  ]
}
```

For local development, point `package` at the **entry file** — the TUI host
resolves file plugins as plain paths (no `exports` map), so give it a file,
not a directory:

```jsonc
{
  "plugins": [
    { "package": "/absolute/path/to/tps-oc2/src/index.tsx", "options": { "charsPerToken": 4 } }
  ]
}
```

A directory spec is also supported if the repo provides a `tui/` entry point
(one is shipped at `tui/index.ts`).

## Options

| Option          | Default | Description                                        |
| --------------- | ------- | -------------------------------------------------- |
| `enabled`       | `true`  | Set to `false` to disable the plugin.              |
| `charsPerToken` | `4`     | Chars per token for the live estimate. Tune per provider (Anthropic ≈ 4, OpenAI ≈ 4.2). |
| `showTotals`    | `true`  | Show the session-wide cumulative token count.      |

## Development

```sh
bun install
bun run typecheck   # tsc --noEmit
bun test            # bun:test unit + wiring + loader tests
```

To test against a live TUI: add the plugin to `cli.json` (see Install), open a
session, and start a prompt — the footer below the input shows the live
readout next to the context indicator.

## Notes

- The live value is an **estimate** (chars / `charsPerToken`); the settled
  value after each step is exact (provider usage accounting).
- Each open session is tracked independently via its `sessionID`.
- Pinned to the `@opencode-ai/plugin@0.0.0-next-17055` API (matches the
  `opencode2` `next` binary). The TUI plugin API is beta and may change —
  bump the pinned versions when you upgrade opencode2.
