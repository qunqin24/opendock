# opencode-buddy

Six tiny pixel companions for OpenCode Desktop. They float over your session, react to what the agent is doing, and grow from real work. Built-in pets are 48×48 pixel art; Codex pet packs work too.

![Six built-in pets](assets/buddy-pets.png)

![Buddy overlay with stats and actions](assets/buddy-desktop.png)

## Install

Requires OpenCode 2.2.6+.

```bash
npm install -g @mark_future_ai/opencode-buddy
```

The postinstall adds the plugin to `~/.config/opencode/opencode.json`. If that file contains comments, add it yourself:

```jsonc
{
  "plugins": ["@mark_future_ai/opencode-buddy"]
}
```

Reload OpenCode Desktop.

## Use

- Drag the pet anywhere; the position is remembered.
- Click for stats; right-click to feed, play, rest, rename, or switch.
- Hide from the right-click menu. Bring it back with `/buddy-pet` in the composer, or `Cmd+K` / `Ctrl+K` → **Toggle floating pet**.
- **Built-in** has the six presets; **Pets** has custom packs.

Presets: **Quack** (duck), **Miso** (cat), **Ember** (dragon), **Lumi** (axolotl), **Bolt** (robot), **Boo** (ghost).

## Custom pets

Drop a Codex-format pack in `~/.codex/pets/<id>/` or `~/.config/opencode-buddy/pets/<id>/`:

- `pet.json`
- `spritesheet.webp` — 8×9 atlas, 192×208 px cells, up to 5 MB

```json
{
  "id": "my-pet",
  "displayName": "My Pet",
  "spriteVersionNumber": 2,
  "spritesheetPath": "spritesheet.webp"
}
```

Then right-click the pet → **Pets**.

## Uninstall

```bash
npm uninstall -g @mark_future_ai/opencode-buddy
```

Remove `"@mark_future_ai/opencode-buddy"` from `opencode.json`. Delete `~/.config/opencode-buddy/` to remove buddies and pet preferences; `~/.codex/pets/` is never modified.

## License

MIT
