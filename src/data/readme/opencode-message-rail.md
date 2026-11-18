# opencode-message-rail

English | [简体中文](README.zh.md)

A right-edge message rail for the [OpenCode](https://opencode.ai) TUI: one tick per user
turn, chevrons for previous/next, a dwell-hover preview card, and click-to-jump.

[![CI](https://github.com/maxvalla/opencode-message-rail/actions/workflows/ci.yml/badge.svg)](https://github.com/maxvalla/opencode-message-rail/actions/workflows/ci.yml)

Requires OpenCode **≥ 2.3.2** (TUI plugin API 2.3.2) and OpenTUI **≥ 0.8.4**.

## Install

```bash
opencode plugin opencode-message-rail -g    # global config (~/.config/opencode)
opencode plugin opencode-message-rail       # this project only
```

The command installs the package into OpenCode's plugin cache and registers it in the TUI
config — `~/.config/opencode/tui.json` for `-g`, `.opencode/tui.json` otherwise:

```json
{
  "plugin": ["opencode-message-rail"]
}
```

Restart the TUI afterwards.

From a checkout instead of the registry:

```bash
git clone https://github.com/maxvalla/opencode-message-rail.git
cd opencode-message-rail
npm install                        # installs deps and builds dist/
opencode plugin "$PWD" -g          # registers the directory
```

`npm install` is not optional: the repository ships sources, and `prepare` builds `dist/`.

`opencode plugin github:maxvalla/opencode-message-rail` does **not** work on OpenCode 2.3.2:
the installer blocks the package's `prepare` script, so no `dist/` is produced.

## Keys

| Key | Action |
| --- | --- |
| `Alt+R` | Toggle the rail (persisted across restarts) |
| `Alt+[` / `Alt+]` | Previous / next turn |
| Click a tick | Jump to that turn |
| Click `↑` / `↓` | Jump to the turn above / below the viewport top |
| Wheel over the rail | Scroll the transcript (no click required) |
| `/rail` | Toggle from the prompt |

## Configuration

Options live under the plugin's `options` object:

```json
{
  "plugins": [
    {
      "name": "opencode-message-rail",
      "options": { "enabled": true, "wheelLines": 3, "dwellMs": 120 }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Start with the rail shown (still togglable with `Alt+R`) |
| `wheelLines` | `3` | Transcript lines per wheel notch over the rail (clamped to 1–5) |
| `dwellMs` | `120` | Hover dwell before the preview card opens |
| `debugFile` | `""` | Write a JSON state snapshot here for troubleshooting — see Privacy |

## How it works

- The rail occupies the transcript column's right padding (2 columns), positioned from the
  scrollbox's own `screenX`/`width` and its parent's rect — never from the renderer width.
- Four capability tiers degrade instead of failing: `0` no session, `1` probe failed,
  `2` turn order known but positions unknown (even spacing), `3` exact anchoring.
- All host reads are wrapped: a shape change disables the rail, never the TUI. Three errors
  inside 10 s lock it out for 30 s.
- Jumps escalate: direct scroll → expand window → replay host navigation → paginate history.
  A toast appears only after every rung fails.
- Pointer input has two sources feeding one sink: native JSX handlers on the overlay and a
  raw SGR parser on `renderer.stdin` (the host consumes mouse input before plugins see it).
  The first native event that resolves to a real rail row retires the SGR parser;
  `debugFile`'s `pointerSource` reports which path won.

## Compatibility

| | |
| --- | --- |
| OpenCode | ≥ 2.3.2; verified interactively on 2.3.2 (macOS) |
| OpenTUI | ≥ 0.8.4 (native-backed `ScrollBox`) |
| Terminal | needs ≥ 44 columns for the rail and its gutter; narrower terminals shrink the card |
| Platform | macOS and Linux; Windows terminals are untested |

Versions are pinned to the floor the host guarantees, not to the newest release, and every
newer host capability is duck-typed — a build without `afterLayout` or
`scrollChildIntoView` falls back to the previous, verified path.

## Troubleshooting

**No rail at all.** Check `tier` in `debugFile`: `0` means you are not on a session route,
`1` means the transcript scrollbox could not be found or read. If a second plugin claims
`session.composer.top`, the two overlays may overlap.

**Rail appears but ticks never highlight the current turn** (`tier` stuck at `2`) — the
mounted rows do not carry message ids. The rail still works; it just cannot show which turn
you are in.

**`pointerSource` is `"sgr"`.** That build still consumes mouse input before plugins see it,
so clicks are routed from the raw stdin sequence. Everything works; it is the fallback.

**Hover card opens in the wrong place.** Please open an issue with the debug snapshot — the
card anchors to the rail row the tick was painted on, so a mismatch means the layout changed.

**`opencode plugin github:…` fails with `git dep preparation failed`.** Expected on 2.3.2 —
the installer blocks the package's `prepare`, so `dist/` is never built. Install from source
as described above.

**`Alt+R` clashes with another plugin.** Set `enabled: false` in the options instead of
toggling, or rebind via the command palette command ids `message-rail.toggle`,
`message-rail.prev`, `message-rail.next`.

## Privacy

The plugin makes **no network requests**. It reads the current session's message list (ids,
timestamps and text — the text is what the hover card shows) from the host's local cache.

`debugFile` writes a JSON snapshot on a timer, and that snapshot **contains message text**
(the card's rendered lines are not included, but ids and geometry are, and the turn list is).
Use it for troubleshooting only, point it at a scratch path, and delete the file afterwards.

## Development

```bash
npm install      # also builds dist/ via prepare
npm run typecheck
npm test
npm run build
```

Tests need [Bun](https://bun.sh) (`bun test`). They run with `--conditions=browser`: solid-js's
`node` export condition resolves to its SSR build, where `createMemo` never invalidates, and
the controller tests would assert against a frozen view. `src/geom.test.ts` covers the pure
geometry; `src/controller.test.ts` drives the real controller against a fake host and needs no
terminal.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the module map and the invariants that must hold.

## License

MIT © maxvalla
