# opencode-glance

[中文](./README.zh.md) · English

A glanceable status bar for OpenCode v2, in both the terminal and Desktop:

```
◷ 7 turns 135 steps · 126 tok/s        ▤ 16.2M tok · 94% cached        ◔ 18%
```

One package ships a **GUI** and a **TUI** part with the same metrics:

| Metric | Definition |
| --- | --- |
| Turns / steps | User messages / assistant messages in the session (steps can count tool calls instead) |
| tok/s | `Σ(output + reasoning) / Σ(step end - step start)` over completed steps; live estimation while streaming |
| Total tokens | `input + output + reasoning + cache.read + cache.write` across the session family |
| Cache hit | `cache.read / (input + cache.read + cache.write)` |
| Context | Last assistant step's token total / model `limit.context`, matching OpenCode's built-in indicator |

## Install

From npm:

```bash
opencode plugin add opencode-glance
```

Or add it to the global config directly:

```jsonc
// ~/.config/opencode/opencode.jsonc
{
  "plugins": ["opencode-glance"]
}
```

From a local checkout or GitHub:

```jsonc
{
  "plugins": ["file:///absolute/path/to/opencode-glance"]
}
```

The server part is loaded from `opencode.json(c)`, which also makes the TUI part available. TUI-only options must be written in `cli.json` because the server inventory does not carry options for TUI parts:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    {
      "package": "opencode-glance",
      "options": { "locale": "auto", "rate": "auto" }
    },
    "-opencode.sidebar.context"
  ]
}
```

`-opencode.sidebar.context` hides the built-in Context block in the TUI so the bar becomes its replacement. On Desktop the built-in Context indicator cannot be removed by third-party plugins; the bar is additive.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `show` | `true` | Show the bar at startup; toggle it from the command palette |
| `steps` | `"assistant"` | `"assistant"` counts assistant messages; `"tool"` counts tool calls |
| `rate` | `"auto"` | `"auto"`: live estimate while streaming, last exact step while idle. `"average"`: session average. `"last"`: last exact step |
| `icons` | `true` | TUI icons (`◷ ▤ ◔`) |
| `locale` | `"auto"` | TUI locale; `auto` follows the system language. GUI follows the app language |

## i18n

Locales: `en`, `zh`, `zht`, `ja`, `ko`, `de`, `fr`, `es`, `pt`, `it`. Unsupported locales fall back to English. Turns and steps use `Intl.PluralRules` for correct plurals. Add a new catalog in `src/i18n/index.ts` and append it to `locales`.

The GUI follows the OpenCode Desktop/Web language. The TUI uses the system language by default and can be pinned with the `locale` option in `cli.json`.

## Development

```bash
npm install
npm run typecheck
npm test           # unit tests for the metric functions
npm run build      # build the GUI bundle
npm run dev        # vite build --watch
```

`dist/gui-experimental.cjs` is committed so a clone works with `file://` without building. Rebuild it after changing GUI code; CI fails when the committed bundle differs from a fresh build.

## Live speed

OpenCode writes `tokens` only when a step ends, so an exact per-token rate is not exposed to plugins. `rate: "auto"` estimates tokens from streamed characters (CJK = 1 token, other characters = 1/4) once per second and prefixes the value with `~`. While a tool runs, the bar shows the tool and elapsed time instead of a meaningless speed.

## Limitations

- The GUI part uses the experimental `./gui-experimental` API and may need updates when OpenCode changes.
- The TUI bar uses `session.composer.top`. Do not `replace` the whole `sidebar.content` slot; it also holds todo, MCP, and limit blocks.

## License

MIT.
