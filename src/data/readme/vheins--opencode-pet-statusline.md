# opencode-pet-statusline

An animated **Tamagotchi-style pixel pet** for the OpenCode **v1 TUI** sidebar.

```
▼ Pet Nyatchi
    ████    ████
  * ████████████*
████    ██    ██████
  ████  ████  ████
  ████        ████
    ████████████
    ██        ██
· idle
```

The pet lives in the sidebar and reacts to what your background subagents are
doing. Each project keeps the same companion: the sprite is picked
deterministically from the repository path, so it is stable across restarts.

## Moods

| Mood | When | Animation |
| --- | --- | --- |
| `sleeping` | no subagents running, nothing recent | `z Z z *` bubble floats over the head |
| `processing` | at least one subagent running | arms wave, a `*` spark trails |
| `completed` | work finished, nothing running | sparkles on both sides |
| `failed` | a subagent errored | alert sparks, slump |

Sprites are ported from [review-agent](https://github.com/vheins) —
`packages/backend/src/tui/sprites`: **51** hand-drawn 8×8 bitmaps, 5 moods
each, 4 animation frames per mood.

## Resolution

Each bitmap cell is drawn as *N* characters wide, with *N* chosen from the
sidebar width so the pet always fits without wrapping:

```
usable  = sidebar_width - 6      (sidebar is 42 columns)
scale   = clamp(1, floor(usable / 8), 2)
```

Terminal cells are about twice as tall as they are wide, so `scale = 2` makes
the 8×8 art look square. Narrow terminals fall back to `scale = 1`.

## Install

Register the plugin path in `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "/home/vheins/.config/opencode/plugins/opencode-pet-statusline"
  ]
}
```

`tui.json` is the **v1** TUI config file — v1 does not read `cli.json`.
A plugin that only contributes TUI slots must **not** be listed in
`opencode.json` (the server config rejects a plugin without `server()`).

Sidebar order: Context `100`, Subagents `150`, MCP `200`, Memory `250`,
**Pet `260`**, LSP `300`, Todo `400`, Files `500`.

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PET_SCALE` | auto (`1`–`2`) | force the horizontal scale |
| `PET_SEED` | session directory | force which sprite is used |
| `PET_SIDEBAR_WIDTH` | `42` | sidebar width used for the auto scale |

Animation runs at 160 ms per tick; each mood holds its frame for 3–6 ticks.
Click the `▼ Pet` header to collapse the section.

## Requirements

- OpenCode `>= 1.18.0` (v1 TUI slot API:
  `api.slots.register({ slots: { sidebar_content } })`)
- Optional: the subagent monitor
  ([opencode-asynchronous-agent](https://github.com/vheins/opencode-asynchronous-agent))
  writes the state file the pet reads to decide its mood. Without it the pet
  stays `sleeping`.

## License

MIT. Sprite bitmaps are ported from review-agent (same author).
