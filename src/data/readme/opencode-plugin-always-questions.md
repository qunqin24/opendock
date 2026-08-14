# opencode-plugin-always-questions

An [OpenCode](https://opencode.ai) plugin that ensures the AI always asks for your next steps after completing any task by appending a fixed directive suffix to the system prompt and every user message.

## What it does

After the AI finishes any task, it is required to call the built-in `questions` tool to present context-aware options for what to do next, rather than simply ending the response with a passive "let me know if you need anything."

### Mechanism

The plugin hooks into two experimental transform events:

| Hook | Effect |
|------|--------|
| `experimental.chat.system.transform` | Appends a mandatory behavior directive to the system prompt |
| `experimental.chat.messages.transform` | Appends a per-message reminder to the last user message before it reaches the LLM |

Both hooks are invisible in the TUI — the user does not see the injected text, but the model always receives it.

## Installation

### Option 1: npm (global or project)

Add to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-plugin-always-questions"]
}
```

OpenCode will install the package automatically via Bun at startup.

### Option 2: Local plugin file

Copy `index.js` (or `index.ts`) to your plugin directory:

- **Project-level:** `.opencode/plugins/always-questions.js`
- **Global:** `~/.config/opencode/plugins/always-questions.js`

Files in these directories are loaded automatically — no config entry needed.

## Configuration

The plugin currently has no configuration options. The injected suffix text is defined as constants in `index.ts`:

- `SYSTEM_SUFFIX` — directive added to the system prompt once per session
- `MESSAGE_SUFFIX` — reminder added to each user message

To customize, clone the repo and edit these constants before building.

## Building from source

```bash
bun install
bun build index.ts --outfile index.js --target bun --format esm
```

## Requirements

- OpenCode with plugin support
- Bun runtime (used internally by OpenCode)

## Notes

- This plugin uses experimental OpenCode APIs (`experimental.chat.system.transform` and `experimental.chat.messages.transform`) which may change in future versions.
- The injected text counts toward the model's context window. The total overhead is approximately 200 tokens per session (system suffix, added once) plus ~30 tokens per user message.

## License

MIT
