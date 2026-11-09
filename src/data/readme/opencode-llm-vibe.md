# opencode-llm-vibe

[![npm version](https://img.shields.io/npm/v/opencode-llm-vibe)](https://www.npmjs.com/package/opencode-llm-vibe)
[![CI](https://github.com/evgenyzh/opencode-llm-vibe/actions/workflows/ci.yml/badge.svg)](https://github.com/evgenyzh/opencode-llm-vibe/actions/workflows/ci.yml)

A mood side-channel for OpenCode V2. The model calls the direct `vibe` tool, and
the TUI turns its mood into an animated sidebar visualization. Choose from five
styles, including Conway's Game of Life, rising embers, and an illustrative
neural network. Open `/vibe` to control visibility and set a default or
per-session style.

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
opencode plugin add opencode-llm-vibe@0.2.1
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

Open **Vibe settings** with `/vibe` or `Ctrl+P` → **Vibe settings**. The menu
shows or hides the sidebar animation and chooses the style for this session or
the default style. Hiding keeps the current mood; restarting the TUI loses it
because live-only mood is not restored from session history. Visibility is
temporary for the current TUI and is not saved.

In version 0.2, `/vibe` opens the settings menu rather than toggling visibility
immediately. Select **Hide vibe** or **Show vibe** in that menu.

Available styles:

| Style | Appearance |
| --- | --- |
| Morph | Smooth flowing blobs (default) |
| Life | Conway's Game of Life with fading trails and reseeding on extinction or cycles |
| Reaction–diffusion | Growing organic patterns from a Gray–Scott simulation |
| Embers | Drifting, glowing sparks |
| Neural | Continuous branching impulses through a dense token/model grid |

The default applies to sessions without an override and starts as Morph. To
remove a session override, select **Use default** under **Style for this
session**. The default and overrides are saved in OpenCode's TUI storage,
survive restarts, and synchronize across TUI instances. They are local TUI
preferences, not server-side session data. Switching styles does not change the
current mood or add model requests. Simulations pause when hidden or another
style is selected. Resizing preserves the simulation: Life keeps the
visible cells (cells outside a smaller viewport are cropped), diffusion is
resampled, embers are repositioned proportionally, and Neural remaps its live
activations while retaining its tick clock.

## What it looks like

- Sidebar: measures its own width, fills it (24 columns by default, up to 64),
  and keeps a landscape aspect. The blob is sampled with a virtual margin so it
  does not touch the edges.
- Morph is a moving gradient/blob field with low-frequency noise. Life,
  Reaction–diffusion, Embers and Neural provide alternative animated fields.
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
  Morph applies a 1.5× activity multiplier and a nonlinear energy-to-blob-speed
  curve; the other styles keep the listed tempo. The renderer runs at 15 FPS.
- In the alternative styles, energy influences Life's generation rate,
  reaction–diffusion parameters, the number of embers or Neural's input probability;
  context fill affects reseeding, pattern parameters, particle count or Neural's
  input probability respectively. Neural uses whole terminal glyphs
  across the available area above the mood caption, without labels or arrows.
  Wider slots add model layers; taller slots add cells and token positions.
  All columns, including input and output, use a fixed two-cell step; any leftover
  cell stays at the edge rather than creating a gap. On every tick, each input
  token independently has a chance to fire. Impulses branch or merge while moving one layer per tick; every branch
  continues to the output, and individual neurons fade behind it. Conditional
  transition weights determine the strength of each arrival; simultaneous
  arrivals add up, capped at one. Color intensity reflects that strength.
  Connections remain part of the simulation but are not drawn. Output tokens
  light only when a branch reaches them. There is no whole-column wave or pass
  reset. Only the model uses mood colors; input and output stay neutral. In idle,
  new input stops and existing branches reach the output and fade. These weights
  are illustrative, not model telemetry. All styles share the caption and theme
  background.
- In Embers, individual sparks use different parts of the mood palette while
  fading independently of their color.
- In Neural, newly emitted impulses pick colors from the current mood palette; existing
  impulses retain their earlier color. A neuron eases toward the weighted mix of
  arriving colors, so the new color travels with activity rather than recoloring
  the whole grid at once. Untouched cells keep their color, including in idle;
  resize preserves the evolving colors and impulses.
- In Morph, mood changes morph over ~1.5 s. The field's energy is interpolated and the
  palette is blended, so the same blobs migrate to the new state instead of
  crossfading. If a new `vibe` call arrives mid-morph, the next transition
  starts from the currently rendered field and palette instead of snapping back
  to the previous target.

The field styles use half blocks (`▀`): `fg` is the top pixel and `bg` is the bottom
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
  │  measured width + selected animation + terminal render
  ▼
animated rectangle
```

- Server part: `src/index.ts`, `src/tool.ts`, `src/prompt.ts`, `src/rpc.ts`.
- TUI part: `src/tui.tsx`, `src/square.tsx`, `src/dimensions.ts`,
  `src/activity.ts`, `src/context-usage.ts`, `src/motion.ts`, `src/morph.ts`,
  `src/field.ts`, `src/simulation.ts`, `src/neural.ts`, `src/neural-render.ts`,
  `src/styles.ts`, `src/render.ts`.
- Shared protocol: `src/mood.ts`, `src/rpc.ts`.

Mood and simulation state live only in TUI memory: there is no server-side mood
storage, history scan, or auto-clear. The TUI stores only style preferences in
OpenCode's durable local storage. Context fill comes from `session.step.ended`
tokens plus the selected model's context limit and is not persisted. An RPC
event missed while the TUI is disconnected is intentionally not recovered; the
slot stays blank until the next `vibe` call.

## Troubleshooting

- **The sidebar slot is empty.** No mood has been set in this session yet, or
  the TUI missed the live RPC event. The next `vibe` call fixes it. State is not
  restored after a TUI restart.
- **The plugin is not loaded.** Run `opencode plugin list`, then `/reload` in
  the TUI. Server logs are in `~/.local/share/opencode/log/opencode.log`;
  filter `role=server` for the plugin and `role=cli` for the TUI.
- **The rectangle is hidden.** Open `/vibe` and select **Show vibe**.
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
