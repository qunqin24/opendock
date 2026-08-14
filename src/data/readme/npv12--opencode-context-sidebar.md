# @npv12/opencode-context-sidebar

OpenCode TUI sidebar plugin that displays context window usage, token counts, and session cost as a progress bar.

## Features

- Visual progress bar showing context window usage percentage
- Color-coded bar (accent → warning → error as usage increases)
- Displays token count, context window limit, and session cost
- Updates in real-time as the conversation progresses

## Installation

```bash
opencode plugin add @npv12/opencode-context-sidebar
```

Or add to your `opencode.json`:

```json
{
  "plugins": {
    "@npv12/opencode-context-sidebar": {}
  }
}
```

## Attribution

This plugin is adapted from [streetturtle's context-progress plugin](https://github.com/streetturtle/opencode-better-sidebar/blob/main/plugins/context-progress/index.ts) in the [opencode-better-sidebar](https://github.com/streetturtle/opencode-better-sidebar) repository.

## License

MIT
