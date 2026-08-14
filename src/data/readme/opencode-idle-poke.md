English | [中文](README-zh.md)

[![npm](https://img.shields.io/npm/v/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)
[![downloads](https://img.shields.io/npm/dm/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)
[![license](https://img.shields.io/npm/l/opencode-idle-poke)](https://www.npmjs.com/package/opencode-idle-poke)

# opencode-idle-poke

An OpenCode plugin that proactively sends you a message when you have been silent for a while, with a configurable interval, per-session on/off markers, and an optional adaptive interval. It is not usable in one-shot CLI mode.

## Features

- **Proactive re-engagement** - after a configurable period of silence, the model injects a short reminder and asks whether there is anything worth continuing with
- **Configurable interval** - change the interval at any time, in conversation or via configuration
- **Per-session controls** - turn pokes on or off for a single session with a marker
- **Optional adaptive interval** - let the plugin estimate conversation complexity and adjust the interval for the next poke (simple ≈ 3 min, medium ≈ 10 min, complex ≈ 30 min)
- **Safe by default** - the default poke template asks the model not to read or modify files or run commands or tools; pokes follow the agent you are currently using
- **Restart-aware** - after a restart the model is notified that poke settings were reset to defaults, so it does not trust stale markers from the conversation history

## Installation

Add the plugin to the `plugin` array in `opencode.json` (or `opencode.jsonc`). Always include a version tag (a pinned version such as `@0.1.3`, or `@latest`):

```jsonc
{
  "plugin": ["opencode-idle-poke@0.1.3"]
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
| Change the interval | `[Remind: 5 minutes]` — number + unit (s/m/h or seconds/minutes/hours; an omitted unit defaults to seconds). Valid range: 20 seconds to 24 hours. Chinese form: `〔提醒间隔=5分钟〕` |
| Turn the adaptive interval off (this session) | `[Predictor Off]` |
| Turn the adaptive interval on (this session) | `[Predictor On]` |

### Session switching

Pokes only target the session where you most recently sent a message.

- When you switch to another conversation and send a message there, timers in all other sessions are cleared, and pokes follow your latest active conversation from then on.
- A new conversation will not poke you until you have sent your first real message in it.

This is by design: an old conversation stopping pokes, or a fresh one not poking you until you send your first message, is not a bug.

## Configuration

See the full reference in the packaged [`opencode-idle-poke-config.md`](opencode-idle-poke-config.md). Configuration priority (first match wins):

1. Plugin options in the `plugin` array entry
2. `~/.config/opencode/opencode-idle-poke.json` (create it manually; the plugin will not create it for you)
3. Built-in defaults

## Known limitations

- Markers are matched against whole lines exactly; the plugin scans the first few lines of a reply, and the protocol asks the model to put the marker on the first line.
- Poke settings are runtime state; after a restart they reset to defaults (the model is notified of this).
- The idle timer keeps running while you type in an external editor, so a poke can arrive mid-work; adjust the interval or turn pokes off if this bothers you.
- During a rapid tab switch, a single poke may land in the previous session.
- Language adaptation is untested. The default templates ask the model to reply in the user's language, but the plugin itself has only been tested with English and Chinese; the interval marker supports English and Chinese only.
- Not usable in one-shot CLI mode (`opencode run "..."`): the process exits as soon as the session goes idle, so the idle timer never fires and no poke is sent.

## Development

```bash
npm run build       # compile dist/
npm run typecheck   # TypeScript type check (includes plugin source)
npm test            # run the vitest suite
```

`prepublishOnly` builds the package before publishing.

## License

MIT
