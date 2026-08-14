# opencode-rename-chat

OpenCode plugin that lets you rename chat sessions from within the conversation.

## Why?

OpenCode auto-generates chat titles using a small model, but conversations evolve. What starts as "fix login bug" becomes "refactor auth middleware + write tests." The auto-title sticks with the first topic forever.

This plugin registers a `rename_chat` tool that the AI (or you) can call to update the session title at any point — keeping your session list readable and accurate.

Bonus: you can embed status markers like `[DONE]`, `[REVIEW]`, `[WIP]` in titles.

## Install

### npm (global)

```bash
npm install -g opencode-rename-chat
```

Then add to your opencode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": ["opencode-rename-chat"]
}
```

### Manual (drop-in file)

Copy `rename-chat.ts` to `~/.config/opencode/plugins/rename-chat.ts` and restart opencode.

## Usage

Just say it:

> "rename this chat to CDIS: fix facility audit history [DONE]"

Or the AI will call the tool automatically when you ask to rename.

The tool can also be invoked directly: `rename_chat` with argument `name`.

## How it works

Calls opencode's internal REST API at `PATCH /session/{id}` with the new title. No external services, no telemetry. Runs entirely within your opencode instance.

## License

MIT
