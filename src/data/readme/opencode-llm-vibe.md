# opencode-llm-vibe

[![npm version](https://img.shields.io/npm/v/opencode-llm-vibe)](https://www.npmjs.com/package/opencode-llm-vibe)
[![CI](https://github.com/evgenyzh/opencode-llm-vibe/actions/workflows/ci.yml/badge.svg)](https://github.com/evgenyzh/opencode-llm-vibe/actions/workflows/ci.yml)

A mood side-channel for OpenCode V2. The model calls the direct `vibe` tool, and
the TUI draws an animated pseudo-graphic blob in the sidebar.

![llm-vibe sidebar with a deep focus mood](https://raw.githubusercontent.com/evgenyzh/opencode-llm-vibe/main/assets/llm-vibe.png)

*`deep focus` in the OpenCode sidebar.*

## Install

Requires OpenCode 2.2+ and Node.js 22+.

```sh
opencode plugin add opencode-llm-vibe
```

One entry loads both the server and TUI parts. Check the result with
`opencode plugin list`, and run `/reload` if the sidebar does not appear.

To pin a version:

```sh
opencode plugin add opencode-llm-vibe@0.1.1
```

Manual configuration is also supported:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-llm-vibe"]
}
```

For local development, point at the package directory in the project config or
in the global `~/.config/opencode/opencode.json`:

```jsonc
{
  "plugins": ["/home/me/Projects/llm-vibe"]
}
```

Then build the package and start OpenCode:

```bash
npm install
npm run build
opencode
```

Putting only the TUI part in `cli.json` is not enough: the server part provides
the prompt instruction, the `vibe` tool, and the RPC event.

## Usage

The model calls `vibe` with a preset or explicit colors:

```json
{
  "preset": "calm",
  "words": "calm",
  "energy": 0.4,
  "glyph": "✦"
}
```

```json
{
  "colors": ["#112244", "#4b3f72", "#ff8844"],
  "words": "calm",
  "energy": 0.4,
  "glyph": "✦"
}
```

- `preset` — `calm`, `focus`, `warm`, `alert`, `angry`, `playful`, or `tired`.
- `colors` — 1–4 hex colors, darkest first, hottest last. Explicit colors
  override a preset.
- `words` — short mood words shown inside the lower part of the rectangle.
- `energy` — `0..1`; controls motion and turbulence.
- `glyph` — optional short pseudo-graphic accent.

| Preset | Palette |
| --- | --- |
| `calm` | deep teal → mint |
| `focus` | navy → blue → amber |
| `warm` | wine → coral → peach |
| `alert` | dark red → red → yellow |
| `angry` | near-black → blood red → orange |
| `playful` | violet → magenta → cyan |
| `tired` | slate → gray-blue |

The prompt makes `vibe` part of every turn: at the very start, before any other
tool, then when the activity or findings change, and once more before the final
answer. 2–4 calls per turn is typical; the first and last are mandatory. The
last call wins and there is no history. To remove the mood, the model calls:

```json
{ "clear": true }
```

`clear` is a flag in the same tool, not a separate tool. The tool always returns
`ok` and never echoes the mood back, so the model does not pay for a copy of its
own input.

`/vibe` toggles the rectangle in the sidebar. Hiding it or restarting the TUI
does not change the mood; the state is live-only and is not restored from
session history.

## What it looks like

- Sidebar: measures its own width, fills it (24 columns by default, up to 64),
  and keeps a landscape aspect. The blob is sampled with a virtual margin so it
  does not touch the edges.
- The image is a moving gradient/blob field with low-frequency noise.
- Blob identity is pinned per session: `words` and `glyph` change the caption,
  not the blob layout.
- Blob radius follows context-window fill: 0.8× when nearly empty, 1.25× when
  full. The level is eased over ~1 s, so it grows and shrinks smoothly,
  including after compaction.
- Empty pixels fade into the TUI theme background; there is no vignette or
  visible rectangle around the image.
- Words are rendered on the theme background at the bottom; image pixels remain
  on both sides.
- With no mood, nothing is drawn: the slot is just the theme background.
- Animation tempo follows live activity: idle 0.5×, waiting 0.9×, thinking
  1.7×, writing 2.1×, tool 2.6×, with a ~300 ms ease between speeds. The model
  does not need to call the tool for this; the TUI listens to session events.
  The renderer runs at 15 FPS.
- Mood changes morph over ~1.5 s. The field's energy is interpolated and the
  palette is blended, so the same blobs migrate to the new state instead of
  crossfading. If a new `vibe` call arrives mid-morph, the next transition
  starts from the currently rendered field and palette instead of snapping back
  to the previous target.

The renderer uses half blocks (`▀`): `fg` is the top pixel and `bg` is the bottom
pixel, with 24-bit color.

## Overhead

The plugin adds a small fixed instruction and tool schema to every model request:
**~135 input tokens** in the last measurement. The current mandatory-side-channel
wording is slightly longer, so re-measure if the exact budget matters. A direct
`vibe` call adds roughly 30–50 tokens plus one extra model request that re-reads
the current context.

The full table, caveats, and reduction notes are in
[`SPEC.md`](https://github.com/evgenyzh/opencode-llm-vibe/blob/main/SPEC.md#9-токенный-бюджет)
§9.

## How it works

```text
model
  │  vibe({ colors, words, energy, glyph, clear })
  ▼
server tool
  │  parse + normalize
  │  emit rpc.llm-vibe.updated { sessionID, mood | null }
  │  return { content: "ok" }
  ▼
TUI RPC subscription
  │  in-memory Record<sessionID, Mood | null>
  ▼
sidebar.content
  │  measured width + scalar field + half-block render
  ▼
animated rectangle
```

- Server part: `src/index.ts`, `src/tool.ts`, `src/prompt.ts`, `src/rpc.ts`.
- TUI part: `src/tui.tsx`, `src/square.tsx`, `src/dimensions.ts`,
  `src/activity.ts`, `src/context-usage.ts`, `src/motion.ts`, `src/morph.ts`,
  `src/field.ts`, `src/render.ts`.
- Shared protocol: `src/mood.ts`, `src/rpc.ts`.

There is no server-side storage, database, file cache, `ctx.storage`, history
scan, or auto-clear. The TUI keeps only in-memory maps. Context fill comes from
`session.step.ended` tokens plus the selected model's context limit and is not
persisted. An RPC event missed while the TUI is disconnected is intentionally
not recovered; the slot stays blank until the next `vibe` call.

## Troubleshooting

- **The sidebar slot is empty.** No mood has been set in this session yet, or
  the TUI missed the live RPC event. The next `vibe` call fixes it. State is not
  restored after a TUI restart.
- **The plugin is not loaded.** Run `opencode plugin list`, then `/reload` in
  the TUI. Server logs are in `~/.local/share/opencode/log/opencode.log`;
  filter `role=server` for the plugin and `role=cli` for the TUI.
- **The rectangle is hidden.** Run `/vibe` to toggle it back on.
- **No colors.** OpenCode needs a true-color terminal; the renderer uses 24-bit
  half-block cells.

## Development

Requirements: Node.js >= 22, npm, OpenCode V2 (tested with 2.2.5).

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run check        # typecheck -> test -> build -> npm pack --dry-run
```

`npm ci` needs `.npmrc` with `legacy-peer-deps=true` because npm 10.9.8 fails to
resolve optional peers of `@opencode/plugin`.

For TUI testing without a GUI, run a standalone OpenCode in tmux and capture the
pane:

```bash
tmux new-session -d -s vibe -x 140 -y 45 -c /path/to/project "opencode --standalone"
tmux send-keys -t vibe "Say hi." Enter
tmux capture-pane -p -e -t vibe -S -100
```

The `-e` flag keeps ANSI colors, which is useful for checking the rectangle.

## License

MIT
