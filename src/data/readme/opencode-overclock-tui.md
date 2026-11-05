# opencode-overclock-tui

An OpenCode TUI plugin that raises the terminal UI render loop frame rate. OpenCode ships with a 60 fps render loop; this plugin requests a higher rate (default **180 fps**) on the renderer it is given and restores the previous values when unloaded.

## What it does and does not do

- Animations repaint at up to the configured rate: working spinners, streaming text, tab indicators, and the repaint after each scroll step.
- It does **not** change how scrolling feels. Scrolling is driven by input events (one discrete step per wheel event); the render loop rate does not interpolate those steps.
- The real rate is capped by the terminal emulator and the display refresh. On a 60 Hz display the difference is small; on a 120/180 Hz display with a GPU-accelerated terminal it is visible in animations. Higher rates use more CPU.

## Requirements

- OpenCode 2.x (V2). The plugin uses the V2 TUI plugin API (`context.renderer`).
- Tested with OpenCode 2.2.5 and the bundled OpenTUI `@opentui/core` 0.8.x.
- Not compatible with OpenCode 1.x (V1 plugin API).

## Install

Add the package to the CLI-only plugin list in `~/.config/opencode/cli.json` (a package with only a TUI part goes in `cli.json`, not `opencode.json`):

```json
{
  "plugins": ["opencode-overclock-tui"]
}
```

Restart OpenCode after adding it (plugins load at startup). Check `/plugins` for load errors.
The plugin id shown in `/plugins` is `overclock`.

## Configure

Use the object form to pass options:

```json
{
  "plugins": [
    { "package": "opencode-overclock-tui", "options": { "fps": 120 } }
  ]
}
```

- `fps` (number, optional, default `180`): requested `targetFps` and `maxFps`. Values are floored, capped at `240`, and fall back to the default when not a positive number.
- Lower it (120 or 60) on slower displays or when battery and CPU use matter.

## How it works

`setup(context)` sets `context.renderer.maxFps` and `context.renderer.targetFps`, and returns a cleanup that restores the values that were in place before. The plugin has no server part.

## Uninstall

Remove the entry from `cli.json` and restart OpenCode.

## Development

```bash
npm install
npm run build   # tsc -> dist/
npm test        # smoke test against dist/
```

## License

MIT
