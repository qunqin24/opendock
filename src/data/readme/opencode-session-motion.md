# opencode-session-motion

[中文](README.zh-CN.md)

Animated, state-driven border for the **message input box** in OpenCode Desktop, with seven effects, custom palettes, shadow controls, and a native settings page.

## Preview

Working state with the default settings: flow effect, 2px border, `#004cff`.

**Dark theme**

![Working state with the default settings in the dark theme](https://raw.githubusercontent.com/zekiimii/opencode-session-motion/main/assets/working-dark.gif)

**Light theme**

![Working state with the default settings in the light theme](https://raw.githubusercontent.com/zekiimii/opencode-session-motion/main/assets/working-light.gif)

### Color by tok/s

Optional: with Color by tok/s on, the border follows output speed on the Cool ramp (default cap 100 tok/s). Color changes travel from the leading edge to the tail.

**Dark theme**

![Color by tok/s on the Cool ramp in the dark theme](https://raw.githubusercontent.com/zekiimii/opencode-session-motion/main/assets/tps-cool-dark.gif)

**Light theme**

![Color by tok/s on the Cool ramp in the light theme](https://raw.githubusercontent.com/zekiimii/opencode-session-motion/main/assets/tps-cool-light.gif)

## Features

- Follows the session state: idle, working, waiting, done, error
- Seven border effects: flow, rainbow, pulse, dashed, scan, comet, neon
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
- **Pulse** — breathes between a dim and full border, with an inner glow.
- **Dashed** — dashes travel around the border.
- **Scan** — a bright point with a very short tail sweeps the border.
- **Comet** — a bright point with a long fading tail.
- **Neon** — a solid border with glow and irregular flicker.

All effects share the state colors, speed, thickness, and strength settings.

## Settings

| Setting | Values |
| --- | --- |
| Enable border | on / off |
| Flow when idle | on / off |
| Speed | slow / normal / fast |
| Clockwise | on / off |
| Effect | flow / rainbow / pulse / dashed / scan / comet / neon |
| Thickness | thin / normal / bold (scales with the composer width) |
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
- When Shadow is off, effects do not add a drop shadow; Pulse keeps its own faint inner glow.
- While enabled, the composer's 0.5px edge rim is recreated as an inner rim: it stays visible normally and is masked out where the animated arc passes.

## Versions

### 1.1.0 (2026-11-23)

- Added Color by tok/s: the working border color follows output speed.
- Four ramps: Cool (default), Speedometer, Full spectrum, Blue to pink.
- Configurable speed cap from 20 to 600 tok/s (default 100).
- Smooths bursty output: holds the last rate for 2.5s, then eases down over about 3s.
- The tok/s color sweeps from the leading edge to the trailing edge instead of switching the whole border at once.
- The border thickness scales slightly with the composer width to keep its visual weight in large windows.
- The flow animation rotates a composited gradient layer instead of repainting the gradient every frame.
- A slight edge softening pass reduces jagged corners on 1x displays.
- Replaces the composer's 0.5px edge rim with an inner rim that is masked out where the animation passes.
- Pulse loops continuously, keeps a dim border at its lowest point, and brings its own faint inner glow.
- Neon flicker loops continuously.
- Added a Reset settings button.
- The Reset button has press feedback and shows a confirmation toast.
- Moved the Shadow section to the end of settings.
- Settings use native controls and update immediately.
- Fixed the legacy default palette showing as Custom.
- The LICENSE holder and package author are zekiimii.

### 1.0.0 (2026-11-21)

- First public release: seven effects, per-state colors, palette presets, colorful mode, shadow controls, and a settings page.
- `/motion-preview` command for previewing any state.

## License

MIT
