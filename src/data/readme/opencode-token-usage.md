# opencode-token-usage

An OpenCode plugin that tracks per-session token usage and displays it in the sidebar.

<!-- ![Token Usage sidebar screenshot](https://raw.githubusercontent.com/ahmadmcer/opencode-token-usage/main/screenshot.png) -->

## Features

- Tracks **input**, **output**, **reasoning**, **cache read**, and **cache write** tokens per session
- Calculates **cache hit rate** as a percentage
- Displays total **cost** per session
- Updates in real-time as you chat
- Persists data across sessions in `~/.opencode/token-usage.json`
- Shows clean values when no session is active

## Installation

### 1. Install npm package

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-token-usage"]
}
```

### 2. Register TUI sidebar plugin

Add to your `~/.config/opencode/tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-token-usage/tui"]
}
```

### 3. Restart OpenCode

The **Token Usage** section will appear in the right sidebar of any active session.

## How it works

### Server plugin

Listens for `message.updated` events on completed assistant messages and accumulates token data per session ID into `~/.opencode/token-usage.json`.

### TUI plugin

Polls the current route every 500ms and reads the shared data file to display reactive token counts in the sidebar.

## Data file

Stored at `~/.opencode/token-usage.json`:

```json
{
  "sessions": {
    "ses_xxx": {
      "input": 8475,
      "output": 26,
      "reasoning": 0,
      "cacheRead": 8192,
      "cacheWrite": 0,
      "cost": 0
    }
  }
}
```

## License

MIT
