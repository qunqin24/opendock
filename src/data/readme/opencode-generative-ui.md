# opencode-generative-ui

OpenCode plugin that recreates Claude-style generative UI widgets with two custom tools:

- `visualize_read_me`
- `show_widget`

The plugin renders HTML fragments and raw SVG in a native macOS window using [Glimpse](https://github.com/hazat/glimpse).

This project is an OpenCode-focused extraction and adaptation of the original [`Michaelliv/pi-generative-ui`](https://github.com/Michaelliv/pi-generative-ui) work for `pi`. The original repo did the reverse-engineering work and established the shape of the widget tools and guideline set.

The runtime now uses the same `morphdom` shell-update approach as the `pi` implementation: Glimpse loads a stable shell document, widget content is injected via `win.send()`, and DOM updates are diffed into place instead of replacing the whole page.

## What it does

When OpenCode decides a response should be visual, the plugin can:

1. Load Claude-style widget design guidance with `visualize_read_me`
2. Render the resulting widget with `show_widget`
3. Return any `window.glimpse.send(data)` interaction payload back to the model

Typical use cases:

- interactive explainers
- charts and dashboards
- SVG diagrams
- mockups
- calculators

Widget windows include built-in viewport controls:

- pinch or `Cmd/Ctrl + wheel` to zoom
- middle-mouse drag to pan
- `Space + drag` to pan with a regular mouse or trackpad
- keyboard shortcuts: `+`, `-`, `0`, `F`, and arrow keys

## Install

### From npm in OpenCode

OpenCode does not auto-discover this repo or install it just because it exists on GitHub.

For npm installation, all of the following must be true:

1. This package has been published to npm
2. The package name is listed in your OpenCode config
3. OpenCode is restarted so it can install the plugin

After publishing, add the package name to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-generative-ui"]
}
```

OpenCode installs npm plugins listed in `opencode.json` automatically with Bun on startup.

You do not need to run `npm install` or `bun install` inside the repo where you want to use the plugin. Just add the plugin name to your OpenCode config and restart OpenCode.

You can add it either:

1. Globally in `~/.config/opencode/opencode.json`
2. Per project in `opencode.json`

Example global config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-generative-ui"]
}
```

You can verify that OpenCode resolved the plugin with:

```bash
opencode debug config
```

If the package is installed correctly, you should see `opencode-generative-ui` in the resolved `plugin` list.

### Runtime requirements

- macOS
- Bun
- OpenCode
- a working Swift/Xcode toolchain for `glimpseui`

This plugin opens widget windows through [Glimpse](https://github.com/hazat/glimpse), which builds a small native Swift binary during install.

If `glimpseui` fails to build, update your Xcode Command Line Tools or full Xcode install, then rerun:

```bash
bun pm trust glimpseui
```

Depending on how OpenCode installed the plugin, you may need to run that in the OpenCode cache/config directory rather than inside your app repo.

### Local plugin development

If you are developing this plugin itself, install dependencies in this plugin repo:

```bash
bun install
```

If Bun blocks the native build:

```bash
bun pm trust glimpseui
```

### Use from a local checkout before publishing

Clone this repo, then copy the plugin entry file into your OpenCode plugin directory if you want to run it before publishing to npm.

For project-local use today:

1. Copy `src/index.ts` to `.opencode/plugins/generative-ui.ts`
2. Copy `src/lib/` into `.opencode/plugins/lib/`
3. Copy `glimpseui.d.ts` into `.opencode/`
4. Copy this `package.json` into `.opencode/package.json` or merge the dependencies into your existing one
5. Run `bun install`
6. If Bun blocks lifecycle scripts, run `bun pm trust glimpseui`

## Development

Install dependencies in this repo:

```bash
bun install
```

Typecheck:

```bash
bun run typecheck
```

Build publishable output:

```bash
bun run build
```

## Current limitation

This plugin now uses `morphdom` for in-window DOM updates, but it still does not reproduce pi's token-by-token widget streaming. OpenCode does not currently expose the same tool-argument delta hooks, so widgets still render when the tool executes rather than progressively during argument streaming.

## Credits

- Original reverse-engineering and `pi` implementation: [`Michaelliv/pi-generative-ui`](https://github.com/Michaelliv/pi-generative-ui)
- Native widget window runtime: [Glimpse](https://github.com/hazat/glimpse)

## License

MIT
