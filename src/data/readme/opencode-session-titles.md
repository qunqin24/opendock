# opencode-session-titles

Renames the OpenCode session every few replies, using a title generated from the
conversation itself.

A new session starts on a placeholder title and keeps it forever. This plugin
asks the session model for a short title on the first reply and then every N
replies after that, so the tab list and the tab bar stay readable.

## Install

```bash
opencode plugin add opencode-session-titles
```

Restart the TUI afterwards: CLI plugins are loaded by the client process.

From a clone (development):

```bash
git clone https://github.com/LeonVeganMan/opencode-session-titles
cd opencode-session-titles
# the clone must live outside ~/.config/opencode/plugins if you installed from npm,
# otherwise OpenCode loads the same plugin twice
```

## Configuration

Optional file at `~/.config/opencode/opencode-session-titles.json`. Missing keys keep
their default, and the file is read once at startup.

```json
{
  "every": 10,
  "first": true,
  "maxLength": 40,
  "language": "en",
}
```

| Key | Default | Meaning |
|-----|---------|---------|
| `every` | `10` | Rename after this many assistant replies. |
| `first` | `true` | Also rename on the first reply, so the session is never left with the placeholder. |
| `maxLength` | `40` | Hard cap for the generated title. |
| `language` | `en` | Language asked for the title: a code (`en`, `it`) or a name. |

## How it works

- It listens for `session.execution.succeeded`, so the count is assistant replies,
  not user messages.
- The title comes from `POST /api/session/{id}/generate`: OpenCode builds the
  prompt from the session context and runs it on the session model. No transcript
  is sent by the plugin, no temporary session is created.
- The answer is cleaned (quotes, `Title:` prefix, trailing punctuation) and
  written with `PATCH /api/session/{id}`.
- A failed or empty generation leaves the previous title alone.

The title is generated with a one-shot request that carries only the last few messages, so a long session never resends its whole context (~2000 characters instead of megabytes).

## Development

```bash
bun test
```

`tui.ts` has no JSX, so the package needs no OpenTUI peer dependencies: it only
imports `@opencode/plugin/tui`, which the host resolves at runtime.

## License

MIT

## Manual rename

`alt+t` (or `/title`) renames the current session immediately, from inside the TUI:

- `alt+t`, or `/title` — asks the model for a title from the conversation and applies it
- `/title my short name` — uses the text as it is, no model call

No command file is needed: the slash command ships with the plugin.
