# opencode-session-motion

[中文](README.zh-CN.md)

Animated, state-driven border for the **message input box** (composer) in OpenCode Desktop, with eight effects, custom palettes, shadow controls, and a native settings page.

## Features

- Follows the session state: idle, working, waiting, done, error
- Eight border effects: flow, rainbow, pulse, dashed, scan, comet, neon, ripple
- Per-state colors, plus a colorful mode that cycles through a custom palette
- Palette presets: default, neon, sunset, ice, forest, candy, and a custom palette
- Shadow controls: enable, size, strength, follow border color, custom color
- Adjustable speed, thickness, and direction
- Settings persist per window; respects `prefers-reduced-motion`
- `/motion-preview` command to preview any state

## Install

```bash
opencode plugin add opencode-session-motion
```

Or add it manually to your global `~/.config/opencode/opencode.json(c)`:

```jsonc
{
  "plugins": ["opencode-session-motion"]
}
```

After installing, open **Settings → Composer motion**, or press `Ctrl+K` and search for "motion" / "输入框".

## States

| State | Trigger |
| --- | --- |
| idle | no task running |
| working | `session.status` is busy |
| waiting | waiting for a permission, a question form, or a retry |
| done | a turn completed; briefly celebrates |
| error | a turn failed or was interrupted |

## Effects

- **Flow** — a gradient band runs around the border.
- **Rainbow** — a full multi-color gradient rotates.
- **Pulse** — fades from colorless to full color and back, with an inner glow.
- **Dashed** — dashes travel around the border.
- **Scan** — a bright point with a very short tail sweeps the border.
- **Comet** — a bright point with a long fading tail.
- **Neon** — a solid border with glow and irregular flicker.
- **Ripple** — rounded ripples expand outward from the composer edge.

All effects share the state colors, speed, thickness, and strength settings.

## Settings

| Setting | Values |
| --- | --- |
| Enable border | on / off |
| Flow when idle | on / off |
| Speed | slow / normal / fast |
| Clockwise | on / off |
| Effect | flow / rainbow / pulse / dashed / scan / comet / neon / ripple |
| Thickness | thin / normal / bold (1–3px) |
| Strength | subtle / normal / strong |
| Shadow | enable, size, strength, follow border color, custom color |
| Colors | per-state color picker: working, waiting, done, error |
| Colorful | cycle through the custom palette |
| Color cycle | slow / normal / fast |
| Palette preset | custom / default / neon / sunset / ice / forest / candy |
| Custom palette | comma-separated CSS colors |

## Preview

To preview a state directly, run one of these in the composer:

```
/motion-preview waiting
/motion-preview done
/motion-preview error
```

`working` and `idle` are accepted too. Each state stays for five seconds, then returns to the real state.

## Notes

- Desktop / web windows only (GUI part). The TUI does not show it.
- Requires OpenCode 2.2 or newer.
- The plugin locates the composer through its `contenteditable` container, so it depends on the host DOM and may need an update after a major OpenCode release.
- When Shadow is off, no effect adds a glow or drop shadow from the plugin.

## License

MIT
