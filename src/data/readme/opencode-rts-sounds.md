# opencode-rts-sounds

RTS sound effects plugin for [OpenCode](https://opencode.ai). Plays iconic voice lines from StarCraft, Warcraft III, and Command & Conquer: Red Alert when things happen in your coding session.

## Install

Add `opencode-rts-sounds` to the `plugin` array in your OpenCode config file.

The config file is at `~/.config/opencode/opencode.json` (global) or `opencode.json` (project-level).

```json
{
  "plugin": ["opencode-rts-sounds"]
}
```

OpenCode installs npm plugins automatically at startup. No other steps needed.

### From source

```bash
git clone https://github.com/spartandingo/opencode-rts-sounds.git
cp -r opencode-rts-sounds/index.js opencode-rts-sounds/themes ~/.config/opencode/plugins/
```

## Themes

Six built-in themes are available:

| Theme | Game | Faction |
|---|---|---|
| `starcraft` (default) | StarCraft | Terran SCV + Protoss Advisor |
| `protoss-zealot` | StarCraft | Protoss Zealot + Advisor |
| `warcraft-human` | Warcraft III | Human Peasant |
| `warcraft-orc` | Warcraft III | Orc Peon |
| `redalert-allied` | C&C Red Alert 3 | Allied EVA |
| `redalert-soviet` | C&C Red Alert 3 | Soviet EVA |

### Set theme via config file

Create `~/.config/opencode/sounds/config.json`:

```json
{
  "theme": "protoss-zealot"
}
```

### Set theme via environment variable

```bash
export OPENCODE_RTS_THEME=redalert-soviet
```

The environment variable overrides the config file.

### Switch theme with slash command

Use the `/rts-theme` command inside OpenCode:

```
/rts-theme warcraft-orc
```

Run `/rts-theme` without an argument to see available themes.

### Switch theme via AI

Ask the AI to switch themes naturally — it has access to an `rts_set_theme` tool:

```
switch to the red alert soviet theme
```

Both methods take effect immediately without restarting OpenCode.

## Mute / Unmute

### Toggle with slash command

Use the `/mute` command inside OpenCode to toggle sounds on or off:

```
/mute
```

A toast notification confirms the new state. When unmuting, a confirmation sound plays.

### Toggle via AI

Ask the AI naturally — it has access to an `rts_mute_toggle` tool:

```
mute the sounds
```

Mute state persists across sessions (stored in `~/.config/opencode/sounds/config.json`).

## Events

### StarCraft (Terran)

| Event | Sound |
|---|---|
| `session.created` | "SCV good to go, sir" |
| `session.idle` | "Yes sir" / "Affirmative" |
| `session.compacted` | **"You must construct additional pylons!"** |
| `session.error` | "Not enough minerals" / "Insufficient vespene gas" |
| `permission.asked` | "Whaddya want?" |

### StarCraft (Protoss Zealot)

| Event | Sound |
|---|---|
| `session.created` | **"My life for Aiur!"** |
| `session.idle` | Zealot acknowledgments |
| `session.compacted` | **"You must construct additional pylons!"** |
| `session.error` | "Not enough minerals" / "Insufficient vespene gas" |
| `permission.asked` | Zealot "what" responses |

### Warcraft III (Human / Orc)

| Event | Sound |
|---|---|
| `session.created` | "Ready to work" |
| `session.idle` | "Job's done!" / "Work complete" |
| `session.compacted` | "We need more food" |
| `session.error` | "Not enough gold" / "Not enough lumber" |
| `permission.asked` | "Yes me lord?" / "What is it?" |

### Red Alert 3 (Allied / Soviet)

| Event | Sound |
|---|---|
| `session.created` | "Building" |
| `session.idle` | "Construction complete" |
| `session.compacted` | "Insufficient funds" / "Low power" |
| `session.error` | "Cannot deploy here" |
| `permission.asked` | "On hold" / "Select unit" |

## Custom Themes

Create your own theme by adding a JSON file to `~/.config/opencode/sounds/themes/`.

### Example: custom theme with downloadable sounds

Create `~/.config/opencode/sounds/themes/my-theme.json`:

```json
{
  "name": "my-theme",
  "label": "My Custom Theme",
  "soundPacks": {
    "my-sounds": {
      "url": "https://example.com/sounds.zip",
      "files": {
        "path/inside/zip/ready.wav": "ready.wav",
        "path/inside/zip/done.wav": "done.wav",
        "path/inside/zip/error.wav": "error.wav",
        "path/inside/zip/waiting.wav": "waiting.wav"
      }
    }
  },
  "eventSounds": {
    "session.created": ["ready.wav"],
    "session.idle": ["done.wav"],
    "session.compacted": ["error.wav"],
    "session.error": ["error.wav"],
    "permission.asked": ["waiting.wav"]
  }
}
```

### Example: custom theme with local sound files

If you already have sound files, skip `soundPacks` and place your `.wav` files directly in `~/.config/opencode/sounds/<theme-name>/`:

```json
{
  "name": "my-local-theme",
  "label": "My Local Theme",
  "eventSounds": {
    "session.created": ["startup.wav"],
    "session.idle": ["complete.wav"],
    "session.compacted": ["warning.wav"],
    "session.error": ["error.wav"],
    "permission.asked": ["question.wav"]
  }
}
```

Then place your files in `~/.config/opencode/sounds/my-local-theme/`.

### Theme format reference

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Theme identifier (used as directory name and config key) |
| `label` | string | no | Human-readable display name |
| `soundPacks` | object | no | ZIP archives to download (omit for local-only themes) |
| `soundPacks.*.url` | string | yes | Download URL for the ZIP archive |
| `soundPacks.*.files` | object | yes | Map of `"path/in/zip.wav": "local-filename.wav"` |
| `eventSounds` | object | yes | Map of OpenCode event types to arrays of sound filenames |

Custom themes with the same name as a built-in theme will override it.

## How it works

Sound files are downloaded automatically on first run from [The Sounds Resource](https://www.sounds-resource.com/) and cached in `~/.config/opencode/sounds/<theme-name>/`. No sound files are distributed with this package. Switching themes downloads a new set of sounds.

Audio playback uses `child_process.spawn` with platform-native commands -- no additional dependencies required.

## Platform support

| Platform | Audio command | Status |
|---|---|---|
| macOS | `afplay` (built-in) | Tested |
| Linux | `paplay` (PulseAudio) | Should work |

## Migrating from opencode-starcraft

Replace `opencode-starcraft` with `opencode-rts-sounds` in your config. The StarCraft theme is the default, so it works identically out of the box.

## Credits

- Sound files from their respective games via [The Sounds Resource](https://www.sounds-resource.com/)
- StarCraft is a trademark of Blizzard Entertainment, Inc.
- Warcraft is a trademark of Blizzard Entertainment, Inc.
- Command & Conquer is a trademark of Electronic Arts Inc.
- Sounds are downloaded on demand and not distributed with this package

## License

MIT
