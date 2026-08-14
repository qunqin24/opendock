# opencode-timings

A tiny [OpenCode](https://opencode.ai) **TUI sidebar** plugin that shows
per-session timing — how much wall-clock the session has taken and how much of
that was actually spent waiting on the model.

It renders into the same right-hand sidebar as the Quota / MCP / LSP / Todo /
Files panels, reading the session's messages directly from the TUI's reactive
state. Nothing is ever injected into the message stream, so there is **zero
context-window pollution**.

![The Timing panel in OpenCode's sidebar — api/wall 34%, api 19s · wall 56s, turns 5 · avg 4s, slowest 6s — sitting between the built-in Quota and LSP sections](https://raw.githubusercontent.com/foae/opencode-timings/main/opencode-timings-screenshot.png)

```
Timing
api/wall ██████░░ 78%
api 31s · wall 40s
turns 4 · avg 8s
slowest 19s
tok/s avg 43 · last 51
tok in 1.2M · out 45k
per-turn ▄█▂▂
speed ▂▄█▆
```

Every row names itself, so there are no unlabeled numbers or glyphs to decode.

## Metrics

| Row        | Meaning |
|------------|---------|
| `api/wall` | How much of wall-clock was actual model inference, as a bar gauge and percent. |
| `api`      | Total assistant inference time — the sum of `time.completed − time.created` over every completed assistant message. |
| `wall`     | Span from the first to the last message timestamp. Includes the time you spend reading/typing between turns, so `api` is always a fraction of it. |
| `turns`    | Number of completed assistant messages, plus the average per-turn duration. |
| `slowest`  | The single slowest assistant message. |
| `tok/s`    | Generation speed: tokens the model generated (output + reasoning) over `api` time — `avg` across the session, `last` for the most recent turn. |
| `tok in` / `out` | Total tokens the model read (input + cache read/write) vs generated (output + reasoning), across completed turns. |
| `per-turn` | Sparkline of each recent turn's duration. |
| `speed`    | Sparkline of each recent turn's tok/s. |

The panel is always shown; before the first turn its values read zero.

A note on honesty: no metric reads the clock — everything derives from message
timestamps, so idling between turns (or leaving a session open) moves only
`wall` and the `api/wall` ratio, which exist precisely to show that contrast.
The one thing timestamps can't separate is time *inside* a turn: a turn's span
(`completed − created`) includes tool execution and any wait on you (permission
prompts, questions), so on such turns `api` reads high and `tok/s` reads low —
it's the *effective* speed you experienced, not the model's raw decode speed.

## Install

Add it to the `plugin` array of the **TUI** config that OpenCode loads
(`~/.config/opencode/tui.json` or `tui.jsonc`) — this is a TUI plugin, so it
belongs in `tui.json`, not `opencode.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["@foae/opencode-timings@latest"]
}
```

OpenCode installs the plugin and its dependencies with Bun at startup. Restart
OpenCode and open the session sidebar to see the `Timing` panel.

You can also pin a version, e.g. `@foae/opencode-timings@0.1.2`.

## Configuration

Pass options using the tuple form (`[spec, options]`) in `tui.json`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    ["@foae/opencode-timings@latest", {
      "mode": "fancy",
      "fields": {
        "ratio": true, "api": true, "wall": true, "turns": true, "avg": true, "slow": true,
        "tps": true, "lastTps": true, "tokIn": true, "tokOut": true,
        "sparkline": true, "speedline": true
      }
    }]
  ]
}
```

| Option   | Values | Default | Meaning |
|----------|--------|---------|---------|
| `mode`   | `"fancy"` \| `"simple"` | `"fancy"` | `fancy` draws the gauge bar on the `api/wall` row and adds the two sparklines; `simple` is the same rows without the bar or sparklines. |
| `fields` | object of booleans | all `true` | Each toggles exactly one value: `ratio` (the `api/wall` gauge + percent), `api`, `wall`, `turns`, `avg`, `slow`, `tps` (session-average tok/s), `lastTps` (latest turn's tok/s), `tokIn`, `tokOut`, `sparkline` (per-turn durations), `speedline` (per-turn tok/s) — the last two are fancy-only. Values that share a line drop out individually. |

With no options (a plain `"@foae/opencode-timings@latest"` string), it defaults to `fancy` mode with all fields shown.

## Requirements

- OpenCode `1.15.x` or newer (uses the TUI slot plugin API).

## Development

Built and run with [Bun](https://bun.sh).

- `src/timing.ts` — pure timing math, formatting, and config parsing (no JSX), unit-tested.
- `src/tui.tsx` — the SolidJS sidebar component and the slot registration.

```sh
bun install
bun run typecheck   # tsc --noEmit
bun test            # unit tests for the pure logic in src/timing.ts
bun run build       # compile src/ to dist/ with babel-preset-solid
```

The package ships `dist/tui.js`, pre-compiled with `babel-preset-solid`
(universal renderer, `moduleName: "@opentui/solid"`). Shipping raw `.tsx` no
longer works: OpenCode installs plugins under a `node_modules` path, and since
`@opentui/solid` 0.4.x the host's Solid JSX transform skips `node_modules`, so
raw JSX gets compiled by Bun's plain (non-reactive) JSX runtime and the panel
renders once and never updates. The compiled output imports bare
`@opentui/solid` / `solid-js` specifiers, which the host maps onto its own
shared runtime instances.

`opentui`, `solid-js`, and the OpenCode plugin/SDK are **peer dependencies** — at runtime they come from the OpenCode host so the plugin shares its renderer; the `devDependencies` mirror them for local typecheck and tests.

## License

MIT — see [LICENSE](./LICENSE).
