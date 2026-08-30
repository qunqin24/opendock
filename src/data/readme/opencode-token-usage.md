# opencode-token-usage

An OpenCode plugin that tracks per-session token usage and displays it in the sidebar.

<!-- ![Token Usage sidebar screenshot](https://raw.githubusercontent.com/ahmadmcer/opencode-token-usage/main/screenshot.png) -->

## Features

- Tracks **input**, **output**, **reasoning**, **cache read**, and **cache write** tokens per session
- Calculates **cache hit rate** as a percentage
- Displays total **cost** per session
- Updates in real-time as you chat (refreshes every 2 seconds)
- Persists data across sessions in `~/.opencode/token-usage.json`
- Prevents duplicate accounting when an assistant message is updated more than once
- Safely supports concurrent OpenCode processes and bounded data retention
- Shows clean values when no session is active

## Installation

### 1. Register the server plugin

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-token-usage"]
}
```

### 2. Register the TUI plugin

OpenCode v1.18.25 and newer installs npm plugins automatically. Add the same
package name to `tui.json`; do not use the `opencode-token-usage/tui` subpath or
copy a file into your local plugin directory.

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["opencode-token-usage"]
}
```

To pin a release, use an npm version spec such as
`"opencode-token-usage@1.0.5"` in both plugin arrays.

The package publishes compiled JavaScript entrypoints for OpenCode's npm
loader. TypeScript sources are kept in the repository for development only.

### 3. Restart OpenCode

Quit and restart OpenCode after changing either configuration file. The
**Token Usage** section will appear in the right sidebar of any active session.

## How it works

### Server plugin

Listens for `message.updated` events on completed assistant messages and accumulates token data per session ID into `~/.opencode/token-usage.json`. Message IDs are used to ignore duplicate updates. Writes use a lock, a process-specific temporary file, and an atomic rename so concurrent processes do not overwrite each other's data. The store retains the 1,000 most recently updated sessions and 5,000 recent message IDs.

The server accepts both the current session-total format and the legacy `entries` format, so existing data is migrated when it is read.

### TUI plugin

Polls the current route every 2 seconds and reads the shared data file, mutating the sidebar's text nodes imperatively -- SolidJS signal reactivity does not re-render inside this slot system, so an accessor-function child only paints once. Parsed data is cached until the file modification time changes.

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
      "cost": 0,
      "updatedAt": 1750000000000
    }
  },
  "recentKeys": ["ses_xxx:msg_xxx"]
}
```

Older files without `updatedAt` or `recentKeys` remain supported. `recentKeys` is internal deduplication metadata.

## License

MIT
