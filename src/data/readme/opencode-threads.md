English | [简体中文](./README.zh-CN.md)

# opencode-threads

OpenCode TUI plugin that lists the current project's sessions in the sidebar, with subagent child sessions nested under the session that spawned them.

Requires **OpenCode 2.x** (the v2 plugin API).

Forked from [Mangome/opencode-sessions-sidebar](https://github.com/Mangome/opencode-sessions-sidebar). See [Differences from upstream](#differences-from-upstream).

## Features

- **Sessions list**: shows up to 10 most recently updated sessions for the current project (configurable)
- **Subagent sessions**: child sessions hang under their parent, collapsed by default, opened with `├` / `└` connectors and dimmed so they read as children rather than siblings
- **Click to switch**: click any session to navigate to it instantly
- **Current session indicator**: the active session is marked with a `•` dot in the theme's success color
- **Running indicator**: sessions currently generating show a braille spinner animation, including child sessions
- **Project-scoped**: only shows sessions belonging to the current session's directory
- **Live list**: loads from the server and reloads on `session.created` / `session.renamed` / `session.deleted`
- **Collapsible panel**: click the header to collapse/expand; the header shows the session count; state persists across restarts
- **Slash command**: `/sessions-count` sets the maximum number of sessions to display
- **Native look**: borderless panel styled like the built-in MCP sidebar block, using theme colors directly

## Install

```bash
opencode plugin add opencode-threads
```

Manual alternative — add it to the `plugins` array yourself:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencode-threads"]
}
```

Restart OpenCode, enter any session, and the panel appears in the sidebar.

## Usage

Subagent sessions are hidden until you expand their parent. The session you are currently viewing is always visible: if you enter a child session, its parent is expanded automatically and promoted into the visible range.

Clicking the `├` / `└` connector only toggles expansion — clicking anywhere else on the row switches to that session.

## Slash command

| Command | Description |
|---------|-------------|
| `/sessions-count` | Set the maximum number of sessions to display (1-100) |

The same action is available from the command palette (`Ctrl + P`) as `Sessions: Set Max Count`.

## Differences from upstream

Upstream deliberately hides subagent sessions, matching the built-in session list. That leaves no way to see which child session you are in, or what a parent session delegated.

This fork keeps the list equally quiet by default — children are collapsed — but lets you expand them, and always reveals the parent of the session you are viewing.

Implementation notes:

- sessions are fetched in one request and grouped locally by `parentID`, instead of one request per parent
- the fetch limit is raised to 500 because the response includes child sessions; raising it only extends how far back the list reaches
- expansion state lives under its own storage key, so it does not collide with the panel state

## Development

```bash
npm install
npm run build      # tsc + esbuild bundle of src/index.tsx -> dist/tui.js
npm run typecheck
```

A local checkout can be loaded without publishing — point the config at the directory:

```jsonc
{
  "plugins": ["/absolute/path/to/opencode-threads"]
}
```

## License

MIT. Original work Copyright (c) 2026 Mangome; modifications Copyright (c) 2026 whoisay.
