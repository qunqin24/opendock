# opencode-thinking-meter

**When a local reasoning model stops mid-thought, opencode shows you nothing.** The response just ends, short and useless, and the next turn starts. This plugin counts those turns, says which setting cut them — the per-response output cap, or the context window filling up — and shows what the thinking is costing per turn and after which tool.

It is not another token panel. Half a dozen plugins already show tokens, cost, cache hit rate and TPS in the sidebar, and one of them ([`@mtayfur/opencode-cache-view`](https://github.com/mtayfur/opencode-plugins)) even estimates reasoning tokens. None of them look at *finish reasons*, which is where the expensive failure hides.

On my own sessions, over three that had any cutoffs at all: **21 responses finished on `length`, 18 of them with the model still thinking**, and those turns account for a quarter of every output token generated. That is what this measures.

## What you see

Under the sidebar's Context block, headerless, so it reads as three more lines of it:

```
Context
14,231 tokens
34% used
$0.00 spent

11 cut off · 77k lost
10 mid-thought · cap 7 · wall 4
think 39s · ~2.1k per turn
room 1.8k · turns want ~2.1k
```

The last line is the useful one, and it only appears when it is a problem: the room left for a response, against what a turn of thinking has actually been taking. The prompt gets longer every turn, so that number only falls — it tells you a cutoff is coming before it happens.

Prompt row, right side: `cut 11 · 77k`, or `✂11` under 80 columns. A toast fires when a cutoff happens live, naming the cause.

`/thinking` opens the whole picture:

```
  cut off       11 turns · 10 mid-thought
  cause         output cap 7 · context wall 4
  lost          76,598 tokens · 19m
  thinking      45m over 69 turns · ~2,117 tokens each

  after prompt  42× · 41s · ~2.3k each
  after read    14× · 52s · ~2.7k each
  after edit    8× · 5s · ~243 each
  after bash    2× · 47s · ~2.7k each
  after grep    2× · 1s · ~33 each
  after write   1× · 1m · ~5.6k each

  room left     15,002 of 33k (observed)
  a turn wants  ~2,066 tokens of it
```

Thinking is attributed to whatever the model had just seen — your prompt, or the result of a specific tool. Reads costing more thought than edits is the sort of thing you can act on; a single global average is not.

## The two causes

Both make a response end with `finish: "length"`, and they want opposite fixes:

- **output cap** — the response hit the per-response token limit. The generation stops at a round number (`8192`, `16384`). Fix it by raising `limit.output` for the model, or `num_predict` on the ollama side.
- **context wall** — prompt and response together filled the window, so the real cap was whatever the prompt left over. Total tokens land on a 4k boundary rather than on a round output number, and the cap shrinks every turn as the prompt grows. Fix it by compacting sooner, pruning harder, or raising `num_ctx`.

The second is the one worth knowing about, and it is invisible over ollama's OpenAI-compatible route: `num_ctx` is not a concept in that API, so the value in your opencode config never reaches the server and the catalog's context number is fiction. This plugin learns the real window by watching where responses actually die, and says `(observed)` when it is using that instead of the catalog.

## Counting thinking without reasoning tokens

`tokens.reasoning` was zero on every one of the 331 assistant messages I checked. That is not a bug: Anthropic folds extended thinking into `output_tokens` and reports no separate count (opencode's own `packages/llm/src/schema/events.ts` documents it), and llama.cpp and ollama report none either.

So thinking is measured in **seconds** (from each reasoning part's own start and end times, always available) and in **characters at 4 per token**, and the estimate is only used when the provider is silent — if a provider does report reasoning tokens, that number wins and the parts are scaled to it.

Cost in dollars appears in the report only when the model has a price. Local models are free, which is exactly why the interesting unit here is time and room, not money.

## Install

```sh
opencode plugin opencode-thinking-meter -g
```

That installs the package into your global OpenCode config and adds it to `tui.json`. Drop `-g` for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

TUI plugins are not auto-discovered, so a file install needs both steps:

```sh
mkdir -p ~/.config/opencode/tui-plugins
curl -fsSL https://raw.githubusercontent.com/tannerbruhn/opencode-thinking-meter/main/src/tui.tsx \
  -o ~/.config/opencode/tui-plugins/thinking-meter.tsx
curl -fsSL https://raw.githubusercontent.com/tannerbruhn/opencode-thinking-meter/main/src/analyse.js \
  -o ~/.config/opencode/tui-plugins/analyse.js
```

Then add it to `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/thinking-meter.tsx"]
}
```

Do not put the files in `~/.config/opencode/plugin/`. That directory is auto-discovered for *server* plugins and will load them the wrong way.

## Options

```json
"plugin": [["opencode-thinking-meter", { "place": "block", "warn": 2 }]]
```

| Option | Default | Meaning |
|---|---|---|
| `place` | `"context"` | Headerless, directly under the Context block. `"block"` gives it its own **Thinking** heading, below the compaction meter. |
| `warn` | `1.5` | Show the room line when what is left is under this many turns' worth of thinking. |
| `badge` | `"✂"` | Glyph in front of the count on terminals under 80 columns. |
| `toast` | `true` | Toast when a cutoff happens. |

## Status

`node --test test/` covers it: 15 tests, including a replay over three of my real sessions with every string stripped out (`test/session.json` — token counts, finish reasons, part types, tool names, reasoning lengths and durations only, under synthetic ids, with timestamps rebased to the start of each session). The replay pins the numbers this plugin exists to produce: 21 cutoffs, 18 mid-thought, 14 attributed to the context wall and 7 to the output cap, none unattributed. The sidebar lines are asserted to fit 37 columns.

What the tests do not cover is how it looks in a terminal, which needs a real one. The sidebar placement in particular: opencode puts a blank line between sidebar slots, so "headerless, under Context" means one line of gap, not a seamless continuation of that block.

## License

MIT
