# OpenCode Wololo Notifications

[![npm](https://img.shields.io/npm/v/@jfrz38/opencode-wololo-notifications)](https://www.npmjs.com/package/@jfrz38/opencode-wololo-notifications)
[![Build](https://img.shields.io/github/actions/workflow/status/jfrz38/opencode-wololo-notifications/build.yml)](https://github.com/jfrz38/opencode-wololo-notifications/actions/workflows/build.yml)
[![Source license: MIT](https://img.shields.io/badge/source%20license-MIT-blue)](https://github.com/jfrz38/opencode-wololo-notifications/blob/main/LICENSE)
[![NPM Downloads](https://img.shields.io/npm/dm/@jfrz38/opencode-wololo-notifications)](https://www.npmjs.com/package/@jfrz38/opencode-wololo-notifications)

Get audible feedback from OpenCode with recognizable Age of Empires II sounds instead of watching the terminal for every update.

The plugin can notify you when a session becomes idle, a session fails, OpenCode asks for permission, or OpenCode asks you a question. It includes four bundled `.wav` fallback sounds, so it works without downloading extra assets, and lets you replace them with your own local audio files.

By default, only `session.idle` is enabled and plays `wololo.wav`. You can opt into the other supported events and configure individual sounds or reusable profiles.

## Why?

- Hear when OpenCode is ready for your next instruction while working in another window.
- Distinguish completed work, errors, permission requests, and questions by sound.
- Use the bundled Age of Empires II sounds or map events to your own audio files.

## Installation

Install via CLI:

```bash
opencode plugin @jfrz38/opencode-wololo-notifications@latest --global 
```

Or add the scoped npm package name to `opencode.json`. OpenCode installs configured npm plugins when it starts:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@jfrz38/opencode-wololo-notifications"]
}
```

## Configuration

OpenCode validates `opencode.json` strictly. Use the plugin tuple form when passing options:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {}
    ]
  ]
}
```

With no plugin options, only `session.idle` is enabled and uses the bundled `wololo.wav` fallback. Restart OpenCode after changing the plugin build or configuration.

To use your own sound files, pass a `soundsDir` and event map:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {
        "soundsDir": "~/.config/opencode/wololo/sounds",
        "enabledEvents": ["session.idle", "session.error", "permission.asked", "question.asked"],
        "events": {
          "session.idle": "housed.wav",
          "permission.asked": "villager-select.wav",
          "question.asked": "custom-question.wav",
          "session.error": "alarm.wav"
        }
      }
    ]
  ]
}
```

Put your own sound files in:

```txt
~/.config/opencode/wololo/sounds/
```

You can also omit `soundsDir` and use absolute paths directly in `events`:

```json
{
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {
        "enabledEvents": ["session.idle"],
        "events": {
          "session.idle": "/home/you/sounds/housed.wav"
        }
      }
    ]
  ]
}
```

Relative entries such as `"housed.wav"` are resolved from `soundsDir`; absolute entries are used as-is.

## Profiles

`profiles` lets you define named groups of event-to-sound mappings. `defaultProfile` selects which profile is active.

Profiles do not enable events by themselves. An event still needs to match `enabledEvents`, and it can still be blocked by `disabledEvents`.

```json
{
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {
        "soundsDir": "~/.config/opencode/wololo/sounds",
        "defaultProfile": "spanish",
        "enabledEvents": ["session.idle", "permission.asked"],
        "events": {
          "session.idle": "default.wav"
        },
        "profiles": {
          "spanish": {
            "session.idle": "santiago.wav",
            "permission.asked": "mandato.wav"
          },
          "portuguese": {
            "session.idle": "as-vosas-ordes.wav",
            "permission.asked": "sim.wav"
          }
        }
      }
    ]
  ]
}
```

To disable profile-specific mappings, omit `defaultProfile` or remove it. The plugin will then use the flat `events` map, if present, before falling back to bundled sounds.

Event filtering and sound resolution happen in this order:

```txt
enabledEvents match > disabledEvents veto > active profile file > flat events file > bundled fallback
```

## Options

| Option | Default | Description |
|---|---:|---|
| `enabled` | `true` | Enables or disables playback when the plugin starts. |
| `soundsDir` | `~/.config/opencode/wololo/sounds` | Base directory for relative sound files. |
| `debug` | `false` | Enables all `[wololo]` diagnostics, including playback warnings. |
| `cooldownMs` | `1000` | Global cooldown between sounds. |
| `defaultProfile` | unset | Active profile name from `profiles`. Omit it to disable profile-specific mappings. |
| `events` | `{}` | Flat event-to-file map. |
| `profiles` | `{}` | Named event-to-file maps. Only the profile selected by `defaultProfile` is used. |
| `enabledEvents` | `["session.idle"]` | Event keys or wildcard patterns allowed to play sounds. An explicit empty array disables all event sounds. |
| `disabledEvents` | `[]` | Event keys or wildcard patterns that must never play sounds. |

Bundled fallback sounds are used when an enabled event has no custom sound, or when a configured relative/absolute custom file does not exist. Entries in `events` and `profiles` select files but do not enable events.

## Enabled Events

When `enabledEvents` is omitted, only `session.idle` can play. Set an explicit empty array to silence all event notifications:

```json
{
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {
        "enabledEvents": []
      }
    ]
  ]
}
```

To opt into additional bundled or custom sounds, list their event keys:

```json
{
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {
        "enabledEvents": [
          "session.idle",
          "session.error",
          "permission.asked",
          "question.asked"
        ]
      }
    ]
  ]
}
```

Patterns support the same `*` wildcards as `disabledEvents`. For example, `session.*` enables both session events. Only the four documented event keys are emitted by the plugin.

## Disabled Events

Use `disabledEvents` as a final veto for events otherwise allowed by `enabledEvents`.

```json
{
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      {
        "disabledEvents": ["session.error"]
      }
    ]
  ]
}
```

Patterns support `*` wildcards:

| Pattern | Effect |
|---|---|
| `session.error` | Disables only session errors. |
| `session.*` | Disables both session events. |
| `*.asked` | Disables permission and question prompts. |
| `*` | Disables every event sound. |

At least one pattern must match the event key in `enabledEvents`, and any matching pattern in `disabledEvents` suppresses the sound.

Environment fallbacks are also supported:

```txt
OPENCODE_WOLOLO_SOUNDS_DIR
OPENCODE_WOLOLO_PROFILE
OPENCODE_WOLOLO_DEBUG
```

## Supported Events

Except for the default `session.idle`, these events must be selected through `enabledEvents` before they can play.

| Event key | Description | Bundled fallback |
|---|---|---|
| `session.idle` | Session became idle. Useful as "task finished". | `wololo.wav` |
| `session.error` | Session error. | `under_attack.wav` |
| `permission.asked` | OpenCode is asking for permission. | `ally.wav` |
| `question.asked` | OpenCode is asking the user a question. | `spawn.wav` |

## Audio Support

Bundled sounds use `.wav`, which is the portable format supported by the plugin. Custom formats depend on the codecs accepted by the selected system player and are not guaranteed across platforms.

macOS uses `afplay`; supported custom codecs depend on `afplay`.

Linux tries `paplay`, `aplay`, `mpv`, then `ffplay`; each backend determines which codecs it accepts.

Windows uses PowerShell `Media.SoundPlayer` for `.wav`. Non-`.wav` files are best-effort through `ffplay` if it is available in `PATH`. For maximum compatibility on Windows, use `.wav` files.

Playback is asynchronous relative to OpenCode hooks. While one sound is playing, additional sounds are skipped. If a player candidate has not exited after 10 seconds, the plugin requests its termination before trying the next candidate.

## Troubleshooting

- Windows custom sounds should be `.wav` files for native playback.
- Linux needs one of `paplay`, `aplay`, `mpv`, or `ffplay` for audio output.
- macOS uses the built-in `afplay` command.
- If you change plugin files or config, restart OpenCode because plugins are loaded at startup.
- Enable `debug` to see event resolution and playback warnings. All plugin diagnostics are silent when `debug` is disabled.

## Note About `session.idle`

`session.idle` is used as the default "task finished" signal, but depending on OpenCode internals it may mean that the agent finished a turn and is waiting for more input, not necessarily that a whole high-level task is complete.

## Debugging

Enable debug mode to see plugin decisions:

```json
{
  "plugin": [
    [
      "@jfrz38/opencode-wololo-notifications",
      { "debug": true }
    ]
  ]
}
```

Example output:

```txt
[wololo] event=session.idle profile=spanish sound=/path/to/housed.wav
[wololo] audio player ffplay timed out after 10000ms
```

## Development

The project is currently tested against `@opencode-ai/plugin` 1.17.7. Run the complete validation pipeline with:

```bash
pnpm run verify
```

This runs ESLint, TypeScript typechecking, unit tests, and a clean build. Install dependencies with `pnpm install --frozen-lockfile` before the first run. Restart OpenCode after rebuilding or changing plugin configuration.

## Legal notice

The MIT License applies to the source code and project documentation authored for this project. It does not grant rights to the bundled audio files in `sounds/`.

Age of Empires II © Microsoft Corporation. `opencode-wololo-notifications` was created under Microsoft's "Game Content Usage Rules" using assets from Age of Empires II, and it is not endorsed by or affiliated with Microsoft.

Use and distribution of the bundled audio remain subject to Microsoft's Game Content Usage Rules and any third-party rights that may apply. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Age of Empires and related marks are trademarks of Microsoft.
This project is not affiliated with, endorsed by, or sponsored by Microsoft.

For Microsoft/Xbox game content, see [Microsoft's Game Content Usage Rules](https://www.xbox.com/en-US/developers/rules).
