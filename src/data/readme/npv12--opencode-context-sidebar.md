# @npv12/opencode-context-sidebar

OpenCode **V2** TUI sidebar plugin that displays context window usage, token counts, and session cost as a progress bar.

Rendered as the first element of the sidebar at all times — the plugin prepends to `sidebar.content`, so it sits above every section the host appends.

## Features

- Visual progress bar showing context window usage percentage
- Color-coded bar (success → warning → error as usage increases)
- Displays token count, context window limit, and session cost
- Mirrors the host's context math: last assistant step after the most recent compaction, respecting reverts
- Updates in real-time via the reactive V2 data layer

## Installation

```bash
opencode2 plugin add @npv12/opencode-context-sidebar
```

Or add to your `cli.json`:

```json
{
  "plugins": ["@npv12/opencode-context-sidebar/tui"]
}
```

Requires OpenCode `0.0.0-beta-17963` or compatible. Not compatible with V1.

To avoid duplicating the built-in Context section, disable it:

```json
{
  "plugins": ["@npv12/opencode-context-sidebar/tui", "-opencode.sidebar.context"]
}
```

## Attribution

This plugin is adapted from [streetturtle's context-progress plugin](https://github.com/streetturtle/opencode-better-sidebar/blob/main/plugins/context-progress/index.ts) in the [opencode-better-sidebar](https://github.com/streetturtle/opencode-better-sidebar) repository.

## License

MIT
