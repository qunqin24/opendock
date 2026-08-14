English | [简体中文](./README.zh-CN.md)

# opencode-sessions-sidebar

<img width="539" height="196" alt="image" src="https://github.com/user-attachments/assets/2515b538-f134-4dc4-888c-969f302a2044" />

OpenCode TUI plugin that displays the current project's active sessions list in the sidebar.

## Features

- **Sessions list**: Shows up to 10 most recently updated sessions for the current project (configurable)
- **Click to switch**: Click any session in the list to navigate to it instantly
- **Current session indicator**: The active session is marked with a `▶` prefix
- **Running indicator**: Sessions currently generating show a braille spinner animation
- **Project-scoped**: Only shows sessions belonging to the current project directory
- **Real-time updates**: List refreshes automatically on `session.created` / `session.updated` / `session.deleted` events
- **Collapsible panel**: Click the header to collapse/expand; state persists across restarts
- **Slash commands**: `/sessions-refresh` and `/sessions-count` for runtime configuration
- **Theme adaptive**: Colors auto-desaturate from the current theme for a muted look

## Install

### Method 1: OpenCode command palette (recommended)

In OpenCode, press `Ctrl + P`, search for `install plugin`, and enter:

```
opencode-sessions-sidebar@latest
```

### Method 2: Manual install

```bash
npm install -g opencode-sessions-sidebar@latest
```

Then create or edit `~/.config/opencode/tui.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-sessions-sidebar@latest"]
}
```

### Restart OpenCode

Enter any session and the Sessions panel will appear in the sidebar.

## Slash commands

| Command | Description |
|---------|-------------|
| `/sessions-refresh` | Manually refresh the sessions list |
| `/sessions-count` | Set the maximum number of sessions to display (1-100) |

## License

MIT
