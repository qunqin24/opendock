# opencode-plugin-context

An OpenCode **TUI plugin** that replaces the built-in sidebar context block with a
colored, segmented bar of the current session's **context-window usage**.

The whole bar is the model's context window. Colors show what's using it —
**cached** prompt, **prompt** (uncached input incl. cache writes), **thinking**
(reasoning tokens), **output**, and the model's **reserved output** headroom —
plus the numbers you already track: total tokens used and money spent.

```
Context
━━━━━━━━━━━━━━━━━ 69%
138k / 200k tokens
$0.04 spent
▍c40k ▍p90k ▍t5k ▍o3k ▍r5k ▍f57k
```

One color-coded legend row follows the bar — `▍` marker in the segment's color,
then a muted letter + count. Colors follow the active theme:

| Segment            | Legend | Theme color | Default look          |
| ------------------ | ------ | ----------- | --------------------- |
| cached input       | `c`    | `success`   | green                 |
| prompt (uncached input, incl. cache writes) | `p` | `accent` | blue      |
| thinking (reasoning tokens) | `t`    | `warning`   | amber                 |
| output             | `o`    | `info`      | cyan                  |
| reserved output    | `r`    | `textMuted` | grey                  |
| free space         | `f`    | `text`      | white / default text  |

The bar spans the whole context window and fills the sidebar column: colored
cells for each segment in that order, then `free` fills the remainder with the
default text color so the bar always reaches full width. A very small segment
may not fill a single bar cell (e.g. 137 tokens in a 200k window is 0.07% of
the bar) — its exact count is always visible in the legend. Percent is colored
like the usage plugin: green `<50%`, amber `50–74%`, orange `75–99%`, red `100%`.

## Requirements

- OpenCode `>= 1.18.0`

## Install

From npm:

```sh
opencode plugin opencode-plugin-context --global --force
```

The command installs the plugin **and registers it in
`~/.config/opencode/tui.json`** — no manual `plugin` entry needed.

Then disable the built-in block it replaces (it renders above yours) by adding
to `~/.config/opencode/tui.json`:

```jsonc
{
  "plugin_enabled": { "internal:sidebar-context": false }
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

Then register it in `~/.config/opencode/tui.json` and restart OpenCode:

```jsonc
{
  "plugin_enabled": { "internal:sidebar-context": false },
  "plugin": [["./context/tui.js", {}]]
}
```

> The plugin must NOT live in the auto-discovered `~/.config/opencode/plugins/`
> directory — that is scanned for **server** plugins, and opencode rejects this
> TUI-only module there. TUI plugins are only loaded via `tui.json`.

## How it works

- Renders into the `sidebar_content` slot (order `60`) via `@opentui/solid`.
- Reads the latest resolved assistant turn's token buckets
  (`tokens.input/output/reasoning/cache.{read,write}`) and the model's
  `limit.context` / `limit.output` from `api.state.provider` — the same source
  the built-in block uses.
- **used** = input + output + reasoning + cache.read + cache.write (opencode's
  own total). Segments are never double-counted; `cache.write` folds into
  `prompt`, and **reserved output** shrinks as actual output grows.
- Cost comes from `session.cost`, falling back to summing assistant `cost`.
- Repaints on `message.*` / `session.*` events plus a 2-second self-heal timer.

## What it deliberately does *not* show

The plugin API exposes only aggregate token buckets — not how the prompt splits
into system instructions vs tool definitions vs user messages the way GitHub
Copilot's context meter does. Splitting those would mean guessing from character
counts, so this bar shows the real buckets opencode tracks instead.

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