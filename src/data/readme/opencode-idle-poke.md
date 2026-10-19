English | [中文](README-zh.md)

[![npm](https://img.shields.io/npm/v/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)
[![downloads](https://img.shields.io/npm/dm/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)
[![license](https://img.shields.io/npm/l/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)

# opencode-idle-poke

An OpenCode plugin that proactively sends you a message when you have been silent for a while, with a configurable interval, per-session on/off markers, and an optional adaptive interval. It is not usable in one-shot CLI mode.

OpenCode V2 introduces major changes compared to V1, so starting with 1.0.0 this plugin has been adjusted accordingly:

- Rewritten to target the OpenCode V2 API.
- Improved default prompts: a poke after an interrupted generation no longer continues the unfinished output; when given a vague instruction about the plugin, the model first asks for clarification instead of merely claiming the setting took effect.
- The adaptive interval no longer supports configuring an agent or a tool blacklist. The temporary session uses OpenCode's free model by default (overridable via `predictor.model`).

## Features

- **Proactive re-engagement** - after a configurable period of silence, the model injects a short check-in 
- **Configurable interval** - change the interval at any time, in conversation or via configuration
- **Per-session controls** - turn pokes on or off for a single session with a marker
- **Optional adaptive interval** - let the plugin estimate conversation complexity and adjust the interval for the next poke (simple ≈ 3 min, medium ≈ 10 min, complex ≈ 30 min)
- **Safe by default** - the default poke template asks the model not to read or modify files or run commands or tools
- **Restart-aware** - after a restart the model is notified that poke settings were reset to defaults, so it does not trust stale markers from the conversation history

## Installation

Add the plugin to the `plugin` array in `opencode.json` (or `opencode.jsonc`). Always include a version tag (a pinned version such as `@1.0.0`, or `@latest`):

```jsonc
{
  "plugin": ["opencode-idle-poke@latest"]
}
```

## Quick start

1. Add the plugin entry above, restart OpenCode, and send a message.
2. Stay silent for about 60 seconds.
3. The model will send you a message.

## Usage

Control pokes directly in the conversation: ask the model, and it will put the marker on the first line of its reply.

| Ask the model to... | Marker |
| --- | --- |
| Stop poking | `[Poke Off]` |
| Resume poking | `[Poke On]` |
| Change the interval | `[Remind: 5 minutes]` — number + unit (s/m/h or seconds/minutes/hours; an omitted unit defaults to seconds). Valid range: 20 seconds to 24 hours. |
| Turn the adaptive interval off (this session) | `[Predictor Off]` |
| Turn the adaptive interval on (this session) | `[Predictor On]` |

### Session switching

Pokes only target the session where you most recently sent a message.

- When you switch to another conversation and send a message there, timers in all other sessions are cleared, and pokes follow your latest active conversation from then on.
- A new conversation will not poke you until you have sent your first real message in it.

## Configuration

See the full reference in the packaged [`opencode-idle-poke-config.md`](opencode-idle-poke-config.md). Configuration priority (first match wins):

1. Plugin options in the `plugin` array entry
2. `~/.config/opencode/opencode-idle-poke.json` (create it manually, the plugin will not create it for you)
3. Built-in defaults

## Known limitations

- Markers are matched against whole lines exactly; the plugin scans the first 5 lines of a reply, and the protocol asks the model to put the marker on the first line.
- A vague phrasing may produce no marker. The protocol asks the model to clarify rather than fake success, but a 100% trigger rate is not guaranteed.
- Poke settings are runtime state; after a restart they reset to defaults (the model is notified of this).
- The idle timer keeps running while you type in an external editor, so a poke can arrive mid-work; adjust the interval or turn pokes off if this bothers you.
- During a rapid tab switch, a single poke may land in the previous session.
- Language adaptation is untested. The default templates ask the model to reply in the user's language, but the plugin itself has only been tested with English and Chinese; the interval marker supports English and Chinese only.
- Not usable in one-shot CLI mode (`opencode run "..."`): the process exits as soon as the session goes idle, so the idle timer never fires and no poke is sent.
- An adaptive-interval evaluation affects the next poke. The current poke still uses the previous interval.

## Development

```bash
npm run build       # compile dist/
npm run typecheck   # TypeScript type check (includes plugin source)
npm test            # run the vitest suite
```

`prepublishOnly` builds the package before publishing.

## License

MIT
