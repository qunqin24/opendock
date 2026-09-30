# @oktis-works/telos-sdd-tui

**TUI Plugin for Telos SDD** - Provides native TUI commands for `/sdd viz`, `/sdd status`, `/sdd tasks`, and other SDD operations without invoking the LLM.

## Features

- **Native TUI commands** - All `/sdd` subcommands run in the TUI process, no LLM invocation
- **Dashboard management** - Start/stop/status the SDD Knowledge Graph dashboard with native dialogs
- **Task board** - View and manage Kanban tasks from the TUI
- **Status panel** - Quick access to SDD enforcement status, dashboard URL, graph stats
- **Zero LLM overhead** - Commands execute deterministically via server plugin API

## Installation

### Option 1: Via OpenCode CLI (recommended)

```bash
opencode plugin add @oktis-works/telos-sdd-tui
```

This installs the plugin automatically in your OpenCode.

### Option 2: Via npm

```bash
npm install -g @oktis-works/telos-sdd-tui
```

Then add it to your `opencode.json`:

```json
{
  "plugins": ["@oktis-works/telos-sdd-tui"]
}
```

## Quick Start

### 1. Add to your `opencode.json`

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@oktis-works/telos-sdd-tui"
  ]
}
```

### 2. Ensure server plugin is installed

The TUI plugin communicates with the **Telos SDD server plugin** (`@oktis-works/telos-sdd-graph`). Make sure it's in your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "@oktis-works/telos-sdd-tui",
    "@oktis-works/telos-sdd-graph"
  ]
}
```

### 3. Restart OpenCode TUI

```bash
opencode
```

## Commands

| Command | Description |
|---------|-------------|
| `/sdd` or `/sdd panel` | Show the SDD command panel |
| `/sdd on` | Enable SDD enforcement |
| `/sdd off` | Disable SDD enforcement |
| `/sdd status` | Show SDD status (enforcement, dashboard, graph stats) |
| `/sdd renew` | Renew the active workflow window |
| `/sdd cache_reset` | Clear all caches |
| `/sdd viz` | Start the Knowledge Graph dashboard |
| `/sdd viz stop` | Stop the dashboard |
| `/sdd viz status` | Show dashboard status |
| `/sdd tasks` | List tasks on the Kanban board |
| `/sdd tasks board` | Open task board (opens dashboard Kanban) |
| `/sdd tasks integrate` | Show pending AI integration tasks |
| `/sdd tasks change <TASK-ID> [--approve]` | Open SDD Change for a task |
| `/sdd acceptance <REQ-ID>` | Show acceptance criteria for requirement |
| `/sdd guide <NODE-ID> <text>` | Register human guidance for a node |

## How It Works

```
┌─────────────────────────┐     HTTP/WS      ┌──────────────────────────────┐
│   TUI Process           │ ◄──────────────► │   Server Process             │
│                         │                  │                              │
│  @oktis-works/telos-sdd-tui │              │  @oktis-works/telos-sdd-graph│
│  (this plugin)          │  ctx.client      │                              │
│                         │  .session.command│  - command.transform         │
│  - keymap commands      │                  │  - runSddCommand()           │
│  - ui.dialog.show()     │                  │  - startSharedDashboard()    │
│  - ui.toast.show()      │                  │                              │
└─────────────────────────┘                  └──────────────────────────────┘
```

The TUI plugin registers commands via `ctx.keymap.registerLayer()`. When invoked, they call the server plugin's `/sdd` command through `ctx.client.session.command()` and display results using native TUI dialogs (`ctx.ui.dialog.show()`) and toasts (`ctx.ui.toast.show()`).

**No LLM is ever invoked** for these commands - they are purely deterministic.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run typecheck

# Run tests
npm test

# Watch mode
npm run dev
```

## Architecture

```
src/
├── index.tsx                 # Plugin entry point
├── commands/
│   ├── register.ts           # Keymap command registration
│   └── index.ts
├── ui/
│   ├── dashboard-dialog.tsx  # Dashboard URL dialog
│   ├── task-board-dialog.tsx # Kanban task board dialog
│   ├── status-dialog.tsx     # Generic status dialog
│   ├── panel-dialog.tsx      # Command panel dialog
│   └── index.ts
├── utils/
│   ├── api.ts                # Server communication
│   ├── debug.ts              # Debug logging
│   └── index.ts
```

## Publishing

```bash
# Build and publish
npm run build
npm publish --access public
```

## Requirements

- Node.js >= 20
- OpenCode >= 0.20 (V2 plugin API)
- `@oktis-works/telos-sdd-graph` server plugin installed

## License

MIT © Telos Team
