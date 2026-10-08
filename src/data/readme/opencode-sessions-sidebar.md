English | [简体中文](./README.zh-CN.md)

# opencode-sessions-sidebar

![Sessions sidebar panel](docs/screenshot.png)

OpenCode TUI plugin that displays the current project's active sessions list in the sidebar.

Requires **OpenCode 2.x** (the v2 plugin API). OpenCode 1.x users should stay on `0.1.x`.

## Features

- **Sessions list**: Shows up to 10 most recently updated sessions for the current project (configurable)
- **Click to switch**: Click any session in the list to navigate to it instantly
- **Current session indicator**: The active session is marked with a `•` dot in the theme's success color (same as connected MCP servers)
- **Running indicator**: Sessions currently generating show a braille spinner animation
- **Project-scoped**: Only shows sessions belonging to the current session's directory
- **Root sessions only**: Subagent (child) sessions are hidden, matching the built-in session list
- **Live list**: Loads from the server and reloads on `session.created` / `session.renamed` / `session.deleted`
- **Collapsible panel**: Click the header to collapse/expand; the header shows the session count; state persists across restarts
- **Slash command**: `/sessions-count` sets the maximum number of sessions to display
- **Native look**: Borderless panel styled like the built-in MCP sidebar block, using theme colors directly; session titles take one truncated line

## Install

```bash
opencode plugin add opencode-sessions-sidebar
```

This installs the package and registers it in `~/.config/opencode/opencode.json`.

Manual alternative — add it to the `plugins` array yourself:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-sessions-sidebar"]
}
```

Restart OpenCode, enter any session, and the Sessions panel appears in the sidebar.

## Slash command

| Command | Description |
|---------|-------------|
| `/sessions-count` | Set the maximum number of sessions to display (1-100) |

The same action is available from the command palette (`Ctrl + P`) as `Sessions: Set Max Count`.

## Development

```bash
npm install
npm run build      # tsc + esbuild bundle of src/index.tsx -> dist/tui.js
npm run typecheck
```

A local checkout can be loaded without publishing. The TUI resolves `tui` relative to the plugin directory, so expose the bundle as `<dir>/tui.js`:

```bash
npm run build
mkdir -p local && cp dist/tui.js local/tui.js
```

```jsonc
{
  "plugins": ["/absolute/path/to/local"]
}
```

## License

MIT
