# opencode-compaction-meter

**Is OpenCode compacting over and over without making progress?** This TUI plugin shows, live while you work, how many times the session has compacted, how much work got done in each cycle, how much room the current cycle started with, and whether the last summary was cut off.

OpenCode has no built-in counter for this. The data exists (every compaction is an assistant message flagged as a summary, with token usage), but the TUI never shows it, so a session stuck in a compaction loop just looks slow.

## What you see

Prompt row, right side:

```
compact 3! · 5 tools · 59k room
```

Sidebar, under the built-in Context block:

```
Compaction
3 compactions · 4m ago · overflow
tools/cycle … 4! 3 5 3 17 2 · now 13
restart 22,510 / 82k · 73% room
summary 2,068 !
```

A toast fires when a compaction completes, with the cycle's tool count and the summary size.

## Reading it

- **compactions** – completed compactions in this session. `!` after the count means the last summary hit the output cap and its tail was cut off, which usually loses the "next steps" section.
- **overflow / manual** – what triggered the last one. `overflow` means the provider rejected the request as too large first, so a whole call was wasted before compaction ran. Nothing shown means the normal preflight check.
- **tools/cycle** – tool calls between one compaction and the next, oldest on the left, as many as fit on one line. `41 38 35` is healthy. `2 3 4 1 2` is compaction thrash: each cycle compacts again before real work happens. The line turns the warning colour when the last two cycles both had fewer than five tool calls.
- **now** – tool calls since the last compaction.
- **restart** – prompt size of the first turn after the last compaction, against the usable window (see below) and the room that leaves. Turns warning colour under 20% room. That is the number that tells you whether your compaction settings leave enough space to work.
- **summary** – tokens in the last summary. `!` when truncated.

On terminals narrower than 120 columns, where OpenCode hides the sidebar, the prompt row shrinks to `compact 3! · 59k`, and under 80 columns to `↻3!`. It never wraps.

## Install

```sh
opencode plugin opencode-compaction-meter -g
```

That installs the package into your global OpenCode config and adds it to `tui.json`. Drop `-g` to install it for the current project only. Restart OpenCode afterwards; plugins load at startup.

### Without npm

TUI plugins are not auto-discovered, so a file install needs both steps:

```sh
mkdir -p ~/.config/opencode/tui-plugins
curl -fsSL https://raw.githubusercontent.com/tannerbruhn/opencode-compaction-meter/main/src/tui.tsx \
  -o ~/.config/opencode/tui-plugins/compaction-meter.tsx
```

Then add it to `~/.config/opencode/tui.json` (create the file if it does not exist):

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./tui-plugins/compaction-meter.tsx"]
}
```

Do not put the file in `~/.config/opencode/plugin/`. That directory is auto-discovered for *server* plugins and will try to load it the wrong way.

Nothing renders until the session has compacted at least once, so open a session that already has, or wait for the first one.

## Options

```json
"plugin": [["opencode-compaction-meter", { "badge": "◆" }]]
```

- `badge` – glyph in front of the count on narrow terminals. Default `↻`. Use `◆` for fonts without the Arrows block, or a Nerd Font icon such as `""`.

## How the numbers are computed

Everything comes from the TUI's own session state plus one fetch of the full message history per session (the TUI store only syncs the newest 100 messages).

- A compaction is an assistant message with `summary: true` and a finish reason. `finish: "length"` marks it truncated.
- The compaction request is the user message the summary replies to; its `compaction` part carries the `auto` and `overflow` flags.
- **Usable window** mirrors OpenCode's own overflow check: the model's context limit minus its output limit, or, for models that declare a separate input limit, that limit minus `compaction.reserved`. Compaction fires when a turn's total tokens reach this number.
- **Restart** is `input + cache.read + cache.write` of the first non-summary assistant turn after the compaction.
- **Tools per cycle** counts tool parts on assistant messages between consecutive summaries.

The summary's own input size is deliberately not shown. OpenCode keeps a verbatim tail of recent turns and summarises only the older head, with old tool outputs already pruned, so that number is much smaller than the live context and mostly noise.

## Development

`npm install` then `npm run build` compiles `src/tui.tsx` to `dist/tui.js` with the same Solid transform OpenCode applies to file plugins. The npm package ships that build because OpenCode's transform deliberately skips anything under `node_modules`; the file install above uses the `.tsx` source directly and is transformed by OpenCode at load time.

## Requirements

- OpenCode 1.18.18 or newer (the TUI plugin API with render slots).
- A terminal font with `↻`, or set `badge`.

Tested on OpenCode 1.18.26 with llama.cpp-served models and the default TUI theme.

## License

MIT
