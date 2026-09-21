# opencode-plugin-context

An OpenCode **TUI plugin** that replaces the built-in sidebar context block with a
colored, segmented bar of the current session's **context-window usage**.

The whole bar is the model's context window. By default it shows the real
provider-reported buckets — **cached** prompt, **prompt** (uncached input incl.
cache writes), **thinking** (reasoning tokens), **output**, and the model's
**reserved output** headroom — plus the numbers you already track: total tokens
used and money spent.

```
Context
━━━━━━━━━━━━━━━━━ 69%
138K / 200K tokens
$0.04 spent
62.4 TPS · avg 48.1 · 23s
```


One color-coded legend row follows the bar — `▍` marker in the segment's color,
then a muted letter + count. Colors follow the active theme:

| Segment            | Legend | Theme color | Default look          |
| ------------------ | ------ | ----------- | --------------------- |
| cached input       | `c`    | `success`   | green                 |
| prompt (uncached input, incl. cache writes) | `p` | `accent` | blue |
| thinking (reasoning tokens) | `t`    | `warning`   | amber                 |
| output             | `o`    | `info`      | cyan                  |
| reserved output    | `r`    | `textMuted` | grey                  |
| free space         | `f`    | `text`      | white / default text  |

With `estimate: true` the `prompt` bucket is split into **user** input, **tool**
calls + results (incl. MCP) and **system** (the remainder), shown as two legend
rows (used buckets, then reserved/free):

```
Context
━━━━━━━━━━━━━━━━━ 69%
▍c40K ▍u25K ▍m15K ▍s70K ▍t5K ▍o3K
▍r6K ▍f62K
138K / 200K tokens
$0.04 spent
```

| Segment            | Legend | Theme color | Default look          |
| ------------------ | ------ | ----------- | --------------------- |
| cached input       | `c`    | `success`   | green                 |
| user input (est.)  | `u`    | `info`      | cyan                  |
| tool calls + results (est., incl. MCP) | `m` | `accent` | blue |
| system prompt + tool definitions (rest) | `s` | `warning` | amber |
| thinking (reasoning tokens) | `t`    | `secondary` | purple               |
| output             | `o`    | `text`      | white                 |
| reserved output    | `r`    | `textMuted` | grey                  |
| free space         | `f`    | `borderSubtle` | faint               |

`u`/`m` are **estimates** — opencode's own chars/4 heuristic
(`Token.estimate`, used for compaction) applied to the visible message parts.
`c`/`s`/`t`/`o` are the real provider-reported buckets. `s` is the remainder of
the prompt bucket after `u` + `m` (the actual system prompt and tool definitions
aren't exposed by opencode's plugin API).

The bar spans the whole context window and fills the sidebar column: colored
cells for each segment in that order, then `free` fills the remainder so the bar
always reaches full width. A very small segment may not fill a single bar cell
(e.g. 137 tokens in a 200K window is 0.07% of the bar) — its exact count is
always visible in the legend. Percent is colored like the usage plugin: green
`<50%`, amber `50–74%`, orange `75–99%`, red `100%`.

## Throughput (TPS)

While the assistant streams, a live tokens-per-second line is appended below the
totals:

```
62.4 TPS · avg 48.1 · 23s
```

- **instant** — smoothed rate over a 1s rolling window, colored by speed: red
  `<10`, amber `10–49`, green `≥50`. Shown only while tokens are arriving.
- **avg** — tokens / active generation span (first → last token), so idle time
  doesn't drag it down. Shown once the stream goes quiet.
- **elapsed** — active generation span.

Counts come from `session.text.delta` / `session.reasoning.delta`, estimated with
the same chars/4 heuristic used elsewhere (sub-token deltas are carried over), so
it tracks the live stream rather than the provider's final totals.

## Configuration

All options are optional. Plugin entry in `~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": [
    "-opencode.sidebar.context",
    {
      "package": "opencode-plugin-context",
      "options": { "estimate": true, "exclude": ["system", "cached"] }
    }
  ]
}
```

| Option     | Default | Description                                                |
| ---------- | ------- | ---------------------------------------------------------- |
| `estimate` | `false` | split the prompt into `u`/`m`/`s` using char-count estimates. `true` replaces the single `p` (prompt) bucket with the estimated user/tool/system bars |
| `exclude`  | `[]`    | segment ids to drop from the bar + legend: `cached`, `user`, `tools`, `system`, `prompt`, `think`, `out`, `reserved`, `free` |

Excluded segments are removed from the visualization only; the tokens/cost and
percent lines still report the real totals.

## Requirements

- OpenCode `>= 2.0.0`

This plugin uses the OpenCode **V2** TUI plugin API (a `{ id, setup }` TUI
module + the `sidebar.content` slot). It does not load on OpenCode 1.x.

## Install

From npm:

```sh
opencode plugin add opencode-plugin-context
```

The command installs the plugin **and registers it in
`~/.config/opencode/cli.json`** — no manual entry needed.

Then disable the built-in context block it replaces (the built-in id is
`opencode.sidebar.context`); in `~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": ["-opencode.sidebar.context"]
}
```

Restart OpenCode.

## Local development

```sh
git clone https://github.com/lhw/opencode-plugin-context
cd opencode-plugin-context
npm install
npm run dev:install   # builds dist/tui.js and copies it into ~/.config/opencode/context/
```

Then register the directory in `~/.config/opencode/cli.json` and restart
OpenCode:

```jsonc
{
  "plugins": ["-opencode.sidebar.context", "./context"]
}
```

> The plugin must NOT live in the auto-discovered `~/.config/opencode/plugins/`
> directory — that is scanned for **server** plugins, and opencode rejects this
> TUI-only module there. CLI/TUI plugins are loaded via
> `~/.config/opencode/cli.json`.

## How it works

- Exports an OpenCode **V2** TUI module (`{ id, setup }`) and claims the
  `sidebar.content` slot, rendering with `@opentui/solid`.
- Reads the latest resolved assistant turn's token buckets
  (`tokens.input/output/reasoning/cache.{read,write}`) from
  `data.session.message.list()` and the model's `limit.context` / `limit.output`
  from `data.location.model.list()` — the same source the built-in block uses.
- **used** = input + output + reasoning + cache.read + cache.write (opencode's
  own total). Segments are never double-counted; `cache.write` folds into the
  prompt bucket, and **reserved output** shrinks as actual output grows.
- With `estimate: true`, the prompt bucket is split into `u`/`m`/`s` from
  visible message content; `s` is the remainder.
- Cost comes from `data.session.cost(sessionID)`.
- Repaints reactively on subscription-store changes plus `session.text.delta` /
  `session.reasoning.delta` (for the live TPS line), throttled to ~20 fps.

## What it deliberately does *not* show

The real system prompt and tool definitions are built server-side and are **not**
exposed through opencode's plugin API — only the aggregate token buckets and the
visible message parts are. The `u`/`m` split is therefore estimated from visible
parts (chars/4, the same heuristic opencode itself uses for compaction), `s` is
the remainder, and neither is a true token count the way GitHub Copilot's
context meter reports it. The `c`/`s`/`t`/`o`/`r` buckets come straight from the
provider's reported usage.

## Development

```sh
npm run typecheck    # tsc --noEmit
npm test             # pure-math self-checks (node, no deps)
npm run build        # esbuild → dist/tui.js
npm run dev:install  # build + install into ~/.config/opencode/context/
npm publish          # runs typecheck + build + test first
```

## License

MIT