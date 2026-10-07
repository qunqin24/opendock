# nano-context-opencode

A `nano-context` style **noodle bar** for the OpenCode V2 session sidebar.

Turns OpenCode's plain "45,554 tokens / 5% used" readout into a segmented bar
showing *where* the context window went, with the token counts and the cache hit
rate underneath.

```text
Context
█████████████████████████░░░░░░░░░░░░░░░░░
window  319.8k / 1.00M (32%)
in                 16.1k
out                33.7k
cache          28.79M     100% hit
think              9.6k ~est
total            28.85M          $0.03
```

Two totals, never on the same line: `window` is what the model's context window
holds right now; `total` is the sum of every step in the session, and the rows
above it add up to it. See [`scope`](#scope-turn-vs-session) — they differ by
orders of magnitude.

| Segment | Meaning                                  | Color       |
| ------- | ---------------------------------------- | ----------- |
| `in`    | uncached prompt tokens                    | `interactive` |
| `cache` | cache read + cache write tokens           | `accent`    |
| `think` | reasoning tokens                          | `warning`   |
| `out`   | visible output tokens                     | `success`   |
| `free`  | remainder of the model's context window   | `text.muted` |

At a 1M window, small buckets are thinner than one cell, so they are not drawn
on the bar — but every count is still listed. The bar only omits a segment that
would round to zero width.

## Install

This is a terminal-only (TUI) plugin. In OpenCode V2 it belongs in **`cli.json`**,
not `opencode.jsonc` — the latter is the server-side plugin list, and pointing it
at a TUI module makes the server fail to load the plugin.

```jsonc
// ~/.config/opencode/cli.json
{
  "$schema": "https://opencode.ai/v2/cli.json",
  "plugins": [
    {
      "package": "@etsuya/nano-context-opencode",
      "options": {
        "barWidth": "auto",
        "scope": "session"
      }
    }
  ]
}
```

Then restart OpenCode, or run `opencode reload`.

The published package ships precompiled JavaScript under `dist/` rather than
building at install time. OpenCode only runs its Solid JSX transform on plugin
files outside `node_modules`, so a git/npm install of raw `.tsx` would compile
with Bun's default JSX and every reactive expression in the meter would freeze
at its initial value. Runtime imports stay bare and OpenCode rewrites them to
its own modules.

### Installing from a checkout

`package` may also be a **directory**, which is what you want while working on
the plugin itself. The terminal entry re-exports `dist/tui.js`, so after
editing `src/` run the compile step before reloading:

```sh
npm install
npm run compile
```

```jsonc
{
  "plugins": [
    { "package": "D:/path/to/nano-context-opencode" }
  ]
}
```

OpenCode resolves a local plugin's terminal entry by path — it looks for
`<plugin-dir>/tui` — and ignores `package.json` `exports` for path-based plugins.
Pointing at a single file, or omitting `tui.ts` from the package root, is
silently skipped: the plugin installs, loads nothing, and renders no bar.

### Keep only this bar

The plugin renders *alongside* OpenCode's built-in Context block, not instead of
it. To drop the built-in one, use `Ctrl+P` → **Plugins**, or add the disable
directive:

```jsonc
{
  "plugins": [
    { "package": "D:/path/to/nano-context-opencode" },
    "-opencode.sidebar.context"
  ]
}
```

## Options

All options go in the object form of the `plugins` entry.

| Option              | Type                        | Default     | Description                                                                            |
| ------------------- | --------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `label`             | string                      | `"Context"` | Header text. Pass `""` to hide the header row.                                         |
| `barWidth`          | `"auto"` or number          | `"auto"`    | `"auto"` measures the sidebar and fills it; a number pins an exact cell count (8–200).   |
| `scope`             | `"turn"` or `"session"`     | `"turn"`    | What the **rows** report. The window bar is always the current step.                    |
| `showReasoning`     | boolean                     | `true`      | Draw the `think` segment. When `false`, reasoning folds into `out`.                      |
| `showTotal`         | boolean                     | `true`      | Draw the `used / limit (n%)` line.                                                       |
| `showCost`          | boolean                     | `true`      | Draw session cost on the total line.                                                     |
| `estimateStreaming` | boolean                     | `true`      | Estimate output tokens from text while a reply is still streaming.                       |
| `estimateReasoning` | boolean                     | `false`     | When the provider reports `reasoning: 0`, estimate it from stored reasoning blocks. The row is marked `~est`. |
| `debug`             | boolean                     | `false`     | Write load and data diagnostics to `.diagnostic.log` beside the plugin.                  |

## `scope`: turn vs session

`scope` changes the numbers under the bar, **not** the bar itself.

- **`turn`** (default) — the newest step. `in + out + cache + think` sums exactly
  to the `used / limit` line, because both describe the same request.
- **`session`** — every assistant step in the session, summed. A
  `session · all steps` label appears so the scope is never ambiguous.

The bar and the `used / limit (n%)` line always describe the **current context
window**, in both modes. That is not a limitation to work around: the window only
holds one step's prompt, so a session total is the wrong number to compare against
`model.limit.context`. A 70-step session can accumulate several million tokens —
many times the window — which is a useful spend number and a meaningless occupancy
number.

Cost is always the session total, in both modes.

## How the numbers are computed

Everything comes from the tokens OpenCode already records on assistant messages.
Nothing is re-tokenized.

```ts
message.tokens = {
  input, output, reasoning,
  cache: { read, write },
}
```

- `in` = `tokens.input`
- `cache` = `tokens.cache.read + tokens.cache.write`
- `think` = `tokens.reasoning`
- `out` = `tokens.output` (plus a streaming estimate, see below)
- `used` = the sum of the four, matching the built-in sidebar's arithmetic
- `free` = `model.limit.context - used`, resolved from the message's model ref
  (`message.model.providerID` / `message.model.id`) against
  `data.location.model.list()`
- **cache hit rate** = `cache.read / (input + cache.read + cache.write)` — the
  share of the *prompt* served from cache

### Caching is input-only

There is no cached output. Prompt caching stores the *prefix* the provider will
re-send next turn, so both cache counters describe the prompt:

- `cache.read` — prefix served from an existing cache entry
- `cache.write` — prefix written into the cache this turn

The `cache` row is the sum; `hit` is the read share of the prompt.

### Three deliberate choices

**`used` sums the buckets.** OpenCode records per-bucket usage, so the sum is the
definition rather than a guess.

**Output is estimated while streaming.** OpenCode records usage only after a step
completes, so until `time.completed` is set the plugin approximates output from
the text accumulated so far, at ~4 characters per token. The estimate is replaced
by the exact figure as soon as it lands. Set `estimateStreaming: false` for
strictly recorded numbers.

**Reasoning is estimated only when the provider reports none.** Some providers
leave `tokens.reasoning` at 0 and fold thinking into `output`. Set
`estimateReasoning: true` to derive it from the turn's stored reasoning blocks;
the row is then marked `~est`, so an estimate is never mistaken for a measurement.

### What is *not* broken down

OpenCode reports `input` as a single aggregate covering the system prompt, tool
schemas, and message history. It is not split per source, so unlike upstream
`nano-context` this bar has no `sys` segment. The four segments here are the ones
OpenCode genuinely records.

## Layout

```text
tui.ts          terminal entrypoint — MUST sit at the package root
index.ts        server entrypoint (no-op; the plugin is TUI-only)
src/tui.tsx     Solid/OpenTUI view and reactive state
src/bar.ts      pure layout + formatting (unit tested)
src/server.ts   server stub re-exported by index.ts
```

`Host.resolve` looks for `<plugin-dir>/tui`, so the terminal entrypoint cannot
live in `src/`.

## Development

```sh
npm install
npm run typecheck
npm test
```

`barWidth: "auto"` measures the sidebar at runtime and subscribes to
`LayoutEvents.RESIZED`, so the bar follows terminal resizes without polling.

## Compatibility

Built against OpenCode `2.0.18` (`@opencode/plugin@^2.0.18`). The TUI plugin API
is beta; entrypoints and slot paths can change between releases. The sidebar slot
this plugin claims is `sidebar.content`.

## License

MIT
