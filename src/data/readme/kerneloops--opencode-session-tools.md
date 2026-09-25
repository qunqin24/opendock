# opencode-session-tools

Session tools for [OpenCode](https://opencode.ai) **v2**, as two local plugins:

- **`opencode-meta`**
  - `opencode_meta`: bounded, read-only session metadata (a session, its parent and children, message and tool statistics, recent sessions, tool usage).
  - `send_message`: cross-session messaging, in the style of Claude Code's. One session sends plain text to another by ID or title; by default the target receives it at its next step boundary, marked as coming from a peer (not from its user, and never an approval), with the address to reply to.
- **`opencode-recall-lite`**
  - `recall` / `recall_get`: search earlier sessions across projects, and read one back.
  - A short system reminder to search history before answering questions about it.

Both plugins use only OpenCode v2's public plugin API. They share a small session index, kept in plugin storage, which is built from session events.

## Install

From npm, as one plugin: add it to the `plugins` list in your OpenCode v2 `opencode.json`, and OpenCode installs it:

```json
{ "plugins": [{ "package": "@kerneloops/opencode-session-tools" }] }
```

Or, as two local plugins, copy both directories into your OpenCode v2 config directory's `plugins/`, for example `~/.config/opencode/plugins/`:

```sh
cp -r plugins/opencode-meta plugins/opencode-recall-lite ~/.config/opencode/plugins/
```

OpenCode v2 loads every directory under `plugins/`. Keep the two side by side: `opencode-meta` imports the session index from `../opencode-recall-lite`.

Optionally, allow the tools without a permission prompt in `opencode.json`:

```json
{ "permission": { "opencode_meta": "allow", "send_message": "allow", "recall": "allow", "recall_get": "allow" } }
```

## Limits

- The index only covers sessions seen since the plugins first ran. Plugins get live events, not history. Tools can still address any session directly by ID.
- `recall` ranks by term matches in titles and transcripts; it is not semantic search.
- `send_message` finds a session by title only among indexed sessions. An ambiguous title returns the candidates, so pass the ID.

See each plugin's README for details and options.

## Tests

```sh
cd plugins/opencode-meta && bun test
cd plugins/opencode-recall-lite && bun test
```

## Acknowledgements

- `opencode-recall-lite` builds on [opencode-session-recall](https://github.com/rmk40/opencode-session-recall) by maelos (MIT), which we used with OpenCode v1. It takes that plugin's idea, its `recall` / `recall_get` tool names and its `[recall-nudge]` system reminder, and reimplements a much smaller version on the v2 plugin API. It shares no code with it. For OpenCode v1, use the original: it is far more capable.
- `send_message` follows the design of [Claude Code's cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging). See also [opencode-agent-messaging](https://github.com/TheArctesian/opencode-agent-messaging), an implementation for OpenCode v1.

## Licence

MIT
