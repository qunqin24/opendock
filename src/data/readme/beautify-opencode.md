# beautify-opencode

A skin for the [OpenCode](https://opencode.ai) TUI that makes what is **already
on screen** look like [btop](https://github.com/aristocratos/btop): rounded
boxes with the title set into the top border, square meter bars, a gradient logo.

It **adds nothing**. No new panels, gauges or widgets. It only restyles what
OpenCode and your other plugins already draw, and every colour comes from your
active theme. Switch themes and the skin follows.

<p align="center"><img src="https://raw.githubusercontent.com/rbferreira/beautify-opencode/main/docs/img/hero.png" alt="OpenCode session with beautify-opencode: sidebar sections drawn as btop-style boxes with titles in the border and square meter bars" width="900"></p>

<p align="center"><sub>Rendered by the plugin itself on OpenTUI, with a theme captured from a live OpenCode session (see <a href="#development">Development</a>).</sub></p>

## What it restyles

- **Cards.** Bordered boxes get rounded corners and a border tinted with
  their own title colour. The header row moves into the top border, btop
  style, with the version label on the right. Clicks on the border row still
  reach the original header, so collapse toggles keep working.
- **Sidebar sections.** The host's *Context* and *MCP* sections, and plugin
  sections such as Checklist-to-Goal, get boxed the same way, even though they
  draw no border of their own.
- **Bars.** Magic-context's segmented token bar and any block-character text
  bar (Checklist-to-Goal, recomp progress…) are repainted as btop meter cells.
- **Logo.** The home logo gets a vertical gradient built from a theme colour
  ramp.

<p align="center"><img src="https://raw.githubusercontent.com/rbferreira/beautify-opencode/main/docs/img/before-after.png" alt="The same sidebar, stock on the left and with beautify-opencode on the right" width="640"></p>

Everything is matched heuristically and defensively. A node that does not
match exactly is left alone, so if OpenCode or a plugin changes its layout,
the result is "looks stock", never a broken screen. Disabling the plugin
restores every node it touched.

## Installation

Requires OpenCode 2.x (the V2 TUI). Add it to the `plugins` array in
`~/.config/opencode/cli.json`:

```jsonc
{
  "plugins": [
    "beautify-opencode"
  ]
}
```

With options:

```jsonc
{
  "plugins": [
    { "package": "beautify-opencode", "options": { "logoHue": "blue" } }
  ]
}
```

To run it from a local checkout, put the directory path in `package`
(`"C:/path/to/beautify-opencode"`). The TUI hot-reloads the plugin when its
files change.

## Options

<p align="center"><img src="https://raw.githubusercontent.com/rbferreira/beautify-opencode/main/docs/img/palettes.png" alt="The three palettes side by side: neon, btop and theme" width="900"></p>

<p align="center"><img src="https://raw.githubusercontent.com/rbferreira/beautify-opencode/main/docs/img/logo.png" alt="The home logo stock and with three gradients: theme accent, theme blue and aurora" width="680"></p>

| Option          | Default      | What it does |
|-----------------|--------------|--------------|
| `palette`       | `"neon"`     | `"neon"`: btop look with theme colours (box frames cycle through the theme's hues, white titles). `"btop"`: btop's exact default colours. `"theme"`: softer, frames tinted by each card's title. |
| `cards`         | `true`       | Rounded, unified, compact card borders. |
| `cardTitles`    | `true`       | Move each card's header into its top border. |
| `boxBars`       | `true`       | Repaint magic-context's segmented token bar. |
| `textBars`      | `true`       | Repaint block-character text bars as meters. |
| `barStyle`      | `"btop"`     | `"btop"` (square cells) or `"glossy"` (a smooth pill). |
| `meterGradient` | `"progress"` | `"progress"` (green ramp) or `"usage"` (green → yellow → red). |
| `logo`          | `true`       | Gradient on the home logo. |
| `logoGradient`  | `"theme"`    | `"theme"`, a named gradient (`gelo`, `aurora`, `lavanda`, `brasa`, `btop`), or your own stops: `["#cfefff", "#5aa9ff"]`. |
| `logoHue`       | `"accent"`   | Theme ramp used by `logoGradient: "theme"`: `accent`, `interactive`, `blue`, `purple`, `cyan`, `green`… |
| `scanMs`        | `300`        | Backstop scan interval on idle screens. |

## How it works

OpenCode's TUI is an [OpenTUI](https://github.com/sst/opentui) renderable
tree. The plugin keeps no slots of its own. It walks `renderer.root` and
patches the nodes it recognises:

- Style changes (border, padding, margins) are applied in a lifecycle pass
  that runs before each frame's layout, so the stock look never shows for a
  frame.
- Titles and bars are painted in a post-process step after the frame is
  drawn. Sidebar sections keep their title row visible and get a box without
  a top edge; the post-process paints the top border, title included, over
  that row. Layout is
  never changed, so a section that rebuilds itself every second (as
  Checklist-to-Goal does) cannot make the screen jump.
- Original properties are stored on each node, and `stop()` puts them back.
  On hot reload the newest instance wins and older ones go inert.

## Development

There is no build step: `src/` is plain JavaScript. The tests render a
replica of the sidebar and logo with OpenTUI and write an HTML preview. They
need Bun; OpenCode's own binary can act as Bun:

```sh
BUN_BE_BUN=1 opencode test/preview.mjs preview.html
BUN_BE_BUN=1 opencode test/logo.mjs logo.html
```

The README images come from `docs/shots.mjs`, which renders these replicas
with the real skin and a theme captured from a live TUI:

```sh
BUN_BE_BUN=1 opencode docs/shots.mjs   # then screenshot docs/shots.html
```

Debug: create an empty `.debug` file next to `package.json`. The live tree
and bar diagnostics are then written to `.debug-out/` every 5 seconds.

## License

MIT
